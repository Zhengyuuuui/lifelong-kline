import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { getBackendConfig } from "./env";
import { HttpError } from "./errors";
import {
  INVITE_DISCOUNT_ELIGIBILITY_TYPE,
  INVITE_DISCOUNT_ORIGINAL_AMOUNT_CENTS,
  INVITE_DISCOUNT_PRODUCT_ID,
  INVITE_DISCOUNT_TYPE,
  InviteService,
} from "./invite.service";
import { query, withTransaction } from "./db";
import {
  amountCentsToTotalFee,
  buildXunhuHash,
  createMerchantOrderNo,
  createNonceStr,
  totalFeeToAmountCents,
  verifyXunhuHash,
  type XunhupayPayload,
} from "./xunhupay.sign";

type PayType = "wechat" | "alipay";
type ProductConfig = {
  productId: string;
  aliases: string[];
  amountCents: number;
  currency: "CNY";
  title: string;
  plan: "monthly" | "lifetime";
  durationDays: number | null;
  originalAmountCents?: number;
  discountType?: string;
};

type OrderStatus = "pending" | "success" | "failed" | "refunded" | "cancelled";

interface CreatePaymentPayload {
  productId?: unknown;
  payType?: unknown;
  [key: string]: unknown;
}

interface OrderRow {
  id: string;
  user_id: string;
  merchant_order_no: string | null;
  product_id: string;
  payment_status: OrderStatus;
  amount_cents: number | null;
  currency: string;
  paid_at: string | null;
  eligibility_id: string | null;
  discount_type: string | null;
}

interface MembershipRow {
  id: string;
  status: string;
  product_id: string;
  membership_product_id?: string;
  started_at: string;
  expires_at: string | null;
}

const XUNHUPAY_PROVIDER = "xunhupay";
const PAID_STATUS = "OD";
const NON_PAID_STATUSES = new Set(["CD", "RD", "UD"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PRODUCTS: ProductConfig[] = [
  {
    productId: "life_kline_monthly",
    aliases: ["life_kline_monthly_880", "com.lifekline.monthly"],
    amountCents: 880,
    currency: "CNY",
    title: "人生K线月度权限",
    plan: "monthly",
    durationDays: 31,
  },
  {
    productId: "life_kline_lifetime",
    aliases: ["life_kline_lifetime_1880", "com.lifekline.lifetime"],
    amountCents: 1880,
    currency: "CNY",
    title: "人生K线终身权限",
    plan: "lifetime",
    durationDays: null,
  },
  {
    productId: INVITE_DISCOUNT_PRODUCT_ID,
    aliases: ["life_kline_lifetime_invite_880"],
    amountCents: 880,
    currency: "CNY",
    title: "人生K线邀请专享终身会员",
    plan: "lifetime",
    durationDays: null,
    originalAmountCents: INVITE_DISCOUNT_ORIGINAL_AMOUNT_CENTS,
    discountType: INVITE_DISCOUNT_TYPE,
  },
];

const json = (value: unknown) => JSON.stringify(value ?? {});

const payloadHash = (payload: XunhupayPayload) => {
  const normalized = Object.keys(payload)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = payload[key];
      return acc;
    }, {});
  return createHash("sha256").update(json(normalized)).digest("hex");
};

const str = (value: unknown, max = 255) => String(value ?? "").trim().slice(0, max);

const productFor = (productId: string) =>
  PRODUCTS.find((product) => product.productId === productId || product.aliases.includes(productId));

const validateCreatePayload = (payload: CreatePaymentPayload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new HttpError(422, "Validation failed", { body: "Expected JSON object" });
  }

  const forbidden = [
    "amount",
    "amountCents",
    "amount_cents",
    "price",
    "currency",
    "totalFee",
    "total_fee",
  ].filter((key) => Object.prototype.hasOwnProperty.call(payload, key));
  if (forbidden.length) {
    throw new HttpError(422, "Frontend payment pricing fields are not accepted", { forbidden });
  }

  const productId = str(payload.productId || payload.product_id, 120);
  const payType = (str(payload.payType || payload.pay_type, 20) || "wechat") as PayType;
  const product = productFor(productId);
  const details: Record<string, string> = {};

  if (!product) details.productId = "Unsupported product id";
  if (!["wechat", "alipay"].includes(payType)) details.payType = "Expected wechat or alipay";
  if (Object.keys(details).length) throw new HttpError(422, "Validation failed", details);

  return { product: product!, payType };
};

const parseGatewayResponse = (text: string, contentType: string) => {
  if (contentType.toLowerCase().includes("json")) {
    return JSON.parse(text) as Record<string, unknown>;
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const params = new URLSearchParams(text);
    return Array.from(params.entries()).reduce<Record<string, unknown>>((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  }
};

export class XunhupayService {
  private readonly inviteService = new InviteService();

  async createPaymentOrder(userId: string, rawPayload: CreatePaymentPayload) {
    const config = getBackendConfig();
    if (config.paymentsProvider !== XUNHUPAY_PROVIDER) {
      throw new HttpError(503, "Xunhupay is not enabled on this server");
    }

    const { product, payType } = validateCreatePayload(rawPayload);
    const merchantOrderNo = createMerchantOrderNo();
    const totalFee = amountCentsToTotalFee(product.amountCents);

    const order = product.productId === INVITE_DISCOUNT_PRODUCT_ID
      ? await this.insertInviteDiscountPendingOrder(userId, product, merchantOrderNo, payType)
      : await this.insertPendingOrder(userId, product, merchantOrderNo, payType);

    if (config.paymentsMode !== "live") {
      await this.storeGatewayResult(order.id, {
        mode: "mock",
        totalFee,
      });
      return {
        ok: true,
        orderId: order.id,
        merchantOrderNo,
        paymentProvider: XUNHUPAY_PROVIDER,
        paymentStatus: "pending",
        amountCents: product.amountCents,
        currency: product.currency,
        payUrl: `mock://xunhupay/pay/${merchantOrderNo}`,
        qrCodeUrl: `mock://xunhupay/qrcode/${merchantOrderNo}`,
      };
    }

    const xunhuRequest = this.buildCreateRequest(product, payType, merchantOrderNo, totalFee);
    const gatewayResult = await this.postToGateway(xunhuRequest);
    await this.storeGatewayResult(order.id, {
      mode: "live",
      response: this.redactGatewayResult(gatewayResult),
    });

    return {
      ok: true,
      orderId: order.id,
      merchantOrderNo,
      paymentProvider: XUNHUPAY_PROVIDER,
      paymentStatus: "pending",
      amountCents: product.amountCents,
      currency: product.currency,
      payUrl: str(gatewayResult.url, 2048) || null,
      qrCodeUrl: str(gatewayResult.url_qrcode, 2048) || null,
    };
  }

  async handleNotify(formPayload: XunhupayPayload) {
    const config = getBackendConfig();
    const hash = payloadHash(formPayload);
    const callbackId = await this.insertCallback(formPayload, hash);

    if (!verifyXunhuHash(formPayload, config.xunhupaySecret)) {
      await this.markCallback(callbackId, "signature_invalid", false, "Invalid Xunhupay signature");
      throw new HttpError(400, "Invalid Xunhupay signature");
    }

    const appid = str(formPayload.appid, 120);
    if (appid !== config.xunhupayAppId) {
      await this.markCallback(callbackId, "appid_mismatch", true, "Xunhupay appid mismatch");
      throw new HttpError(400, "Xunhupay appid mismatch");
    }

    const merchantOrderNo = str(formPayload.trade_order_id, 120);
    const status = str(formPayload.status, 20);
    if (!merchantOrderNo) {
      await this.markCallback(callbackId, "missing_order_no", true, "Missing trade_order_id");
      throw new HttpError(422, "Missing trade_order_id");
    }

    const result = await withTransaction(async (client) => {
      const order = await this.findOrderForUpdate(client, merchantOrderNo);
      if (!order) {
        await this.markCallback(callbackId, "order_not_found", true, "Order not found", client);
        return { error: new HttpError(404, "Order not found") };
      }

      await this.attachCallbackToOrder(callbackId, order.id, client);
      let notifyAmountCents: number;
      try {
        notifyAmountCents = totalFeeToAmountCents(formPayload.total_fee);
      } catch (error) {
        await this.markCallback(callbackId, "invalid_amount", true, "Invalid Xunhupay total_fee", client);
        return { error: new HttpError(400, "Invalid Xunhupay total_fee") };
      }
      if (notifyAmountCents !== Number(order.amount_cents)) {
        await this.markCallback(callbackId, "amount_mismatch", true, "Xunhupay amount mismatch", client);
        return { error: new HttpError(400, "Xunhupay amount mismatch") };
      }

      await this.recordVerifiedNotify(client, order, formPayload, hash);

      if (status !== PAID_STATUS) {
        const processingStatus = NON_PAID_STATUSES.has(status) ? `ignored_${status}` : "ignored_unknown_status";
        await this.markCallback(callbackId, processingStatus, true, undefined, client);
        await this.insertAuditEvent(client, order.user_id, "payment.xunhupay_notify_ignored", {
          orderId: order.id,
          merchantOrderNo,
          status,
        });
        return { status: "ignored", shouldRespondSuccess: true };
      }

      if (order.payment_status === "success") {
        await this.markCallback(callbackId, "duplicate_success", true, undefined, client);
        return { status: "duplicate", shouldRespondSuccess: true };
      }

      await this.markOrderPaid(client, order, formPayload, hash);
      await this.upsertMembership(client, order.user_id, order.id, order.product_id);
      await this.consumeInviteDiscountIfNeeded(client, order);
      await this.markCallback(callbackId, "processed", true, undefined, client);
      await this.insertAuditEvent(client, order.user_id, "payment.xunhupay_paid", {
        orderId: order.id,
        merchantOrderNo,
        providerTradeNo: str(formPayload.transaction_id, 160) || null,
        providerOrderId: str(formPayload.open_order_id, 160) || null,
      });

      return { status: "processed", shouldRespondSuccess: true };
    });

    if ("error" in result) {
      throw result.error;
    }
    return { ok: true, ...result };
  }

  async getOrderStatus(userId: string, orderId: string) {
    if (!UUID_RE.test(orderId)) {
      throw new HttpError(422, "Invalid order id");
    }

    const result = await query<OrderRow & MembershipRow & { membership_id: string | null }>(
      `
        SELECT
          o.id,
          o.user_id,
          o.merchant_order_no,
          o.product_id,
          o.payment_status,
          o.amount_cents,
          o.currency,
          o.paid_at::text,
          m.id AS membership_id,
          m.status,
          m.product_id AS membership_product_id,
          m.started_at::text,
          m.expires_at::text
        FROM orders o
        LEFT JOIN memberships m ON m.source_order_id = o.id
        WHERE o.id = $1::uuid
          AND o.user_id = $2::uuid
          AND o.payment_provider = $3
        LIMIT 1
      `,
      [orderId, userId, XUNHUPAY_PROVIDER]
    );
    const row = result.rows[0];
    if (!row) throw new HttpError(404, "Order not found");

    return {
      ok: true,
      orderId: row.id,
      merchantOrderNo: row.merchant_order_no,
      paymentProvider: XUNHUPAY_PROVIDER,
      paymentStatus: row.payment_status,
      amountCents: row.amount_cents,
      currency: row.currency,
      paidAt: row.paid_at,
      membership: row.membership_id
        ? {
            id: row.membership_id,
            status: row.status,
            productId: row.membership_product_id,
            startedAt: row.started_at,
            expiresAt: row.expires_at,
          }
        : null,
    };
  }

  private async insertPendingOrder(
    userId: string,
    product: ProductConfig,
    merchantOrderNo: string,
    payType: PayType,
    client?: PoolClient,
    discount?: {
      eligibilityId: string | null;
      originalAmountCents: number | null;
      discountType: string | null;
    }
  ) {
    const sql = `
        INSERT INTO orders (
          user_id,
          merchant_order_no,
          product_id,
          payment_provider,
          payment_status,
          environment,
          amount_cents,
          currency,
          raw_receipt,
          eligibility_id,
          original_amount_cents,
          discount_type
        )
        VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8::jsonb, $9::uuid, $10, $11)
        RETURNING
          id,
          user_id,
          merchant_order_no,
          product_id,
          payment_status,
          amount_cents,
          currency,
          paid_at::text,
          eligibility_id::text,
          discount_type
      `;
    const values = [
      userId,
      merchantOrderNo,
      product.productId,
      XUNHUPAY_PROVIDER,
      getBackendConfig().appEnv,
      product.amountCents,
      product.currency,
      json({
        create: {
          payType,
          title: product.title,
          amountCents: product.amountCents,
          originalAmountCents: discount?.originalAmountCents || undefined,
          discountType: discount?.discountType || undefined,
        },
      }),
      discount?.eligibilityId || null,
      discount?.originalAmountCents || null,
      discount?.discountType || null,
    ];
    const result = client
      ? await client.query<OrderRow>(sql, values)
      : await query<OrderRow>(sql, values);
    const auditSql = `
        INSERT INTO audit_events (user_id, event_type, metadata)
        VALUES ($1, 'payment.xunhupay_order_created', $2::jsonb)
      `;
    const auditValues = [
      userId,
      json({
        orderId: result.rows[0].id,
        merchantOrderNo,
        productId: product.productId,
        payType,
        discountType: discount?.discountType || undefined,
      }),
    ];
    if (client) {
      await client.query(auditSql, auditValues);
    } else {
      await query(auditSql, auditValues);
    }
    return result.rows[0];
  }

  private buildCreateRequest(
    product: ProductConfig,
    payType: PayType,
    merchantOrderNo: string,
    totalFee: string
  ) {
    const config = getBackendConfig();
    const payload: Record<string, string> = {
      version: "1.1",
      appid: config.xunhupayAppId,
      trade_order_id: merchantOrderNo,
      total_fee: totalFee,
      title: product.title,
      time: String(Math.floor(Date.now() / 1000)),
      notify_url: config.xunhupayNotifyUrl,
      return_url: config.xunhupayReturnUrl,
      callback_url: config.xunhupayCallbackUrl,
      nonce_str: createNonceStr(),
      type: payType,
    };
    return {
      ...payload,
      hash: buildXunhuHash(payload, config.xunhupaySecret),
    };
  }

  private async postToGateway(payload: Record<string, string>) {
    const config = getBackendConfig();
    const post = async (url: string) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(payload).toString(),
      });
      const text = await response.text();
      const parsed = parseGatewayResponse(text, response.headers.get("content-type") || "");
      if (!response.ok) {
        throw new HttpError(502, "Xunhupay gateway request failed", { statusCode: response.status });
      }
      return parsed;
    };

    let result: Record<string, unknown>;
    try {
      result = await post(config.xunhupayGateway);
    } catch (error) {
      if (!config.xunhupayGatewayBackup) throw error;
      result = await post(config.xunhupayGatewayBackup);
    }

    const errcode = str(result.errcode || result.err_code, 40);
    if (errcode && errcode !== "0") {
      throw new HttpError(502, "Xunhupay gateway returned an error", {
        errcode,
        errmsg: str(result.errmsg || result.message, 300),
      });
    }
    return result;
  }

  private redactGatewayResult(result: Record<string, unknown>) {
    const { hash: _hash, ...safe } = result;
    return safe;
  }

  private async storeGatewayResult(orderId: string, gateway: Record<string, unknown>) {
    await query(
      `
        UPDATE orders
        SET raw_receipt = raw_receipt || $2::jsonb
        WHERE id = $1::uuid
      `,
      [orderId, json({ gateway })]
    );
  }

  private async insertCallback(formPayload: XunhupayPayload, hash: string) {
    const result = await query<{ id: string }>(
      `
        INSERT INTO payment_callbacks (
          payment_provider,
          merchant_order_no,
          provider_trade_no,
          provider_order_id,
          provider_status,
          payload_hash,
          payload
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
        RETURNING id
      `,
      [
        XUNHUPAY_PROVIDER,
        str(formPayload.trade_order_id, 160) || null,
        str(formPayload.transaction_id, 160) || null,
        str(formPayload.open_order_id, 160) || null,
        str(formPayload.status, 40) || null,
        hash,
        json(formPayload),
      ]
    );
    return result.rows[0].id;
  }

  private async markCallback(
    callbackId: string,
    processingStatus: string,
    signatureValid: boolean,
    errorMessage?: string,
    client?: PoolClient
  ) {
    const sql = `
      UPDATE payment_callbacks
      SET
        signature_valid = $2,
        processing_status = $3,
        error_message = $4,
        processed_at = now()
      WHERE id = $1::uuid
    `;
    const values = [callbackId, signatureValid, processingStatus, errorMessage || null];
    if (client) {
      await client.query(sql, values);
      return;
    }
    await query(
      sql,
      values
    );
  }

  private async attachCallbackToOrder(callbackId: string, orderId: string, client?: PoolClient) {
    const sql = `
      UPDATE payment_callbacks
      SET order_id = $2::uuid
      WHERE id = $1::uuid
    `;
    const values = [callbackId, orderId];
    if (client) {
      await client.query(sql, values);
      return;
    }
    await query(sql, values);
  }

  private async findOrderForUpdate(client: PoolClient, merchantOrderNo: string) {
    const result = await client.query<OrderRow>(
      `
        SELECT id, user_id, merchant_order_no, product_id, payment_status, amount_cents, currency, paid_at::text
          , eligibility_id::text, discount_type
        FROM orders
        WHERE merchant_order_no = $1
          AND payment_provider = $2
        FOR UPDATE
      `,
      [merchantOrderNo, XUNHUPAY_PROVIDER]
    );
    return result.rows[0] || null;
  }

  private async insertInviteDiscountPendingOrder(
    userId: string,
    product: ProductConfig,
    merchantOrderNo: string,
    payType: PayType
  ) {
    return withTransaction(async (client) => {
      const eligibility = await this.inviteService.getEligibilityForUpdate(client, userId);
      const qualifiedCount = await this.inviteService.countQualifiedReferrals(client, userId);
      if (
        eligibility.status !== "unlocked" ||
        qualifiedCount < eligibility.required_count ||
        eligibility.consumed_order_id
      ) {
        throw new HttpError(403, "Invite discount is not unlocked");
      }

      const activeLifetime = await client.query<{ id: string }>(
        `
          SELECT id
          FROM memberships
          WHERE user_id = $1
            AND status = 'active'
            AND expires_at IS NULL
          LIMIT 1
        `,
        [userId]
      );
      if (activeLifetime.rows[0]) {
        throw new HttpError(403, "Invite discount is not available");
      }

      const successDiscount = await client.query<{ id: string }>(
        `
          SELECT id
          FROM orders
          WHERE user_id = $1
            AND payment_provider = $2
            AND product_id = $3
            AND payment_status = 'success'
          LIMIT 1
        `,
        [userId, XUNHUPAY_PROVIDER, INVITE_DISCOUNT_PRODUCT_ID]
      );
      if (successDiscount.rows[0]) {
        throw new HttpError(403, "Invite discount is not available");
      }

      const existingPending = await client.query<{ id: string }>(
        `
          SELECT id
          FROM orders
          WHERE eligibility_id = $1::uuid
            AND payment_status = 'pending'
            AND payment_provider = $2
          LIMIT 1
        `,
        [eligibility.id, XUNHUPAY_PROVIDER]
      );
      if (existingPending.rows[0]) {
        throw new HttpError(409, "Invite discount order already pending");
      }

      const order = await this.insertPendingOrder(
        userId,
        product,
        merchantOrderNo,
        payType,
        client,
        {
          eligibilityId: eligibility.id,
          originalAmountCents: product.originalAmountCents || null,
          discountType: product.discountType || null,
        }
      );
      await client.query(
        `
          UPDATE user_discount_eligibilities
          SET status = 'reserved', reserved_order_id = $2::uuid
          WHERE id = $1::uuid
        `,
        [eligibility.id, order.id]
      );
      await this.insertAuditEvent(client, userId, "invite.discount_order_created", {
        orderId: order.id,
        eligibilityId: eligibility.id,
        productId: product.productId,
      });
      await this.insertAuditEvent(client, userId, "invite.discount_reserved", {
        orderId: order.id,
        eligibilityId: eligibility.id,
      });
      return order;
    });
  }

  private async recordVerifiedNotify(
    client: PoolClient,
    order: OrderRow,
    formPayload: XunhupayPayload,
    hash: string
  ) {
    await client.query(
      `
        UPDATE orders
        SET
          provider_trade_no = COALESCE($2, provider_trade_no),
          provider_order_id = COALESCE($3, provider_order_id),
          provider_payload_hash = $4,
          verified_at = now(),
          notify_received_at = now(),
          raw_receipt = raw_receipt || $5::jsonb
        WHERE id = $1::uuid
      `,
      [
        order.id,
        str(formPayload.transaction_id, 160) || null,
        str(formPayload.open_order_id, 160) || null,
        hash,
        json({ notify: formPayload }),
      ]
    );
  }

  private async markOrderPaid(
    client: PoolClient,
    order: OrderRow,
    formPayload: XunhupayPayload,
    hash: string
  ) {
    await client.query(
      `
        UPDATE orders
        SET
          payment_status = 'success',
          provider_trade_no = COALESCE($2, provider_trade_no),
          provider_order_id = COALESCE($3, provider_order_id),
          provider_payload_hash = $4,
          verified_at = now(),
          notify_received_at = now(),
          paid_at = COALESCE(paid_at, now()),
          raw_receipt = raw_receipt || $5::jsonb
        WHERE id = $1::uuid
      `,
      [
        order.id,
        str(formPayload.transaction_id, 160) || null,
        str(formPayload.open_order_id, 160) || null,
        hash,
        json({ paidNotify: formPayload }),
      ]
    );
  }

  private buildEntitlements(productId: string) {
    const product = productFor(productId);
    return {
      plan: product?.plan || "premium",
      aiDailyLimit: getBackendConfig().aiMemberDailyLimit,
      features: {
        baziReport: true,
        lifeBook: true,
        lifeKline: true,
        smoothSailing: true,
        valuation: true,
        revenueForecast: true,
        aiAdvisor: true,
      },
    };
  }

  private async upsertMembership(client: PoolClient, userId: string, orderId: string, productId: string) {
    const product = productFor(productId);
    const startedAt = new Date();
    const expiresAt = product?.durationDays
      ? new Date(startedAt.getTime() + product.durationDays * 24 * 60 * 60 * 1000).toISOString()
      : null;
    const existing = await client.query<{ id: string }>(
      "SELECT id FROM memberships WHERE source_order_id = $1::uuid LIMIT 1",
      [orderId]
    );
    const params = [
      userId,
      orderId,
      productId,
      "active",
      json(this.buildEntitlements(productId)),
      startedAt.toISOString(),
      expiresAt,
      null,
      str(productId, 180),
    ];

    if (existing.rows[0]) {
      await client.query(
        `
          UPDATE memberships
          SET
            product_id = $3,
            status = $4,
            entitlements = $5::jsonb,
            started_at = $6::timestamptz,
            expires_at = $7::timestamptz,
            original_transaction_id = $8,
            current_transaction_id = $9
          WHERE id = $10::uuid
        `,
        [...params, existing.rows[0].id]
      );
      return;
    }

    await client.query(
      `
        INSERT INTO memberships (
          user_id,
          source_order_id,
          product_id,
          status,
          entitlements,
          started_at,
          expires_at,
          original_transaction_id,
          current_transaction_id
        )
        VALUES ($1, $2::uuid, $3, $4, $5::jsonb, $6::timestamptz, $7::timestamptz, $8, $9)
      `,
      params
    );
  }

  private async consumeInviteDiscountIfNeeded(client: PoolClient, order: OrderRow) {
    if (
      order.product_id !== INVITE_DISCOUNT_PRODUCT_ID ||
      order.discount_type !== INVITE_DISCOUNT_TYPE ||
      !order.eligibility_id
    ) {
      return;
    }
    const result = await client.query<{ id: string }>(
      `
        UPDATE user_discount_eligibilities
        SET status = 'consumed', consumed_order_id = $2::uuid
        WHERE id = $1::uuid
          AND status <> 'consumed'
        RETURNING id
      `,
      [order.eligibility_id, order.id]
    );
    if (result.rows[0]) {
      await this.insertAuditEvent(client, order.user_id, "invite.discount_consumed", {
        orderId: order.id,
        eligibilityId: order.eligibility_id,
      });
    }
  }

  private async insertAuditEvent(
    client: PoolClient,
    userId: string,
    eventType: string,
    metadata: Record<string, unknown>
  ) {
    await client.query(
      `
        INSERT INTO audit_events (user_id, event_type, metadata)
        VALUES ($1, $2, $3::jsonb)
      `,
      [userId, eventType, json(metadata)]
    );
  }
}
