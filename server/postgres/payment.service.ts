import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  Environment,
  SignedDataVerifier,
  type JWSTransactionDecodedPayload,
} from "@apple/app-store-server-library";
import type { PoolClient } from "pg";
import { getBackendConfig } from "./env";
import { query, withTransaction } from "./db";
import { HttpError } from "./errors";
import type { PaymentVerifyReceiptPayload } from "./validation";

type AppleEnvironment = "sandbox" | "production";
type OrderStatus = "success" | "failed" | "refunded";
type MembershipStatus = "active" | "expired" | "revoked";

interface AppleInAppItem {
  product_id?: string;
  transaction_id?: string;
  original_transaction_id?: string;
  purchase_date_ms?: string;
  expires_date_ms?: string;
  cancellation_date_ms?: string;
}

interface AppleVerifyReceiptResponse {
  status: number;
  environment?: string;
  receipt?: {
    in_app?: AppleInAppItem[];
    bundle_id?: string;
    application_version?: string;
  };
  latest_receipt_info?: AppleInAppItem[];
  latest_receipt?: string;
  pending_renewal_info?: unknown[];
  is_retryable?: boolean;
}

interface SelectedPurchase {
  productId: string;
  transactionId: string;
  originalTransactionId: string | null;
  purchaseDate: string;
  expiresAt: string | null;
  cancelledAt: string | null;
}

interface OrderRow {
  id: string;
  product_id: string;
  payment_status: string;
  paid_at: string | null;
  failed_at: string | null;
}

interface MembershipRow {
  id: string;
  product_id: string;
  status: string;
  entitlements: Record<string, unknown>;
  started_at: string;
  expires_at: string | null;
}

const sha256Hex = (value: string) => createHash("sha256").update(value).digest("hex");

const json = (value: unknown) => JSON.stringify(value ?? {});

const parsePemCertificates = (content: Buffer | string) => {
  const text = Buffer.isBuffer(content) ? content.toString("utf8") : content;
  const blocks = text.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g);
  if (!blocks) return [];
  return blocks.map((block) =>
    Buffer.from(
      block
        .replace(/-----BEGIN CERTIFICATE-----/g, "")
        .replace(/-----END CERTIFICATE-----/g, "")
        .replace(/\s/g, ""),
      "base64"
    )
  );
};

const loadAppleRootCertificates = () => {
  const config = getBackendConfig();
  const certificates: Buffer[] = [];
  if (config.appleRootCertificatesPem) {
    certificates.push(...parsePemCertificates(config.appleRootCertificatesPem));
  }
  for (const certPath of config.appleRootCertificatePaths) {
    const content = readFileSync(certPath);
    const parsedPem = parsePemCertificates(content);
    certificates.push(...(parsedPem.length ? parsedPem : [content]));
  }
  if (!certificates.length) {
    throw new HttpError(503, "Apple root certificates are not configured for signed transaction verification");
  }
  return certificates;
};

const toAppleServerEnvironment = () =>
  getBackendConfig().appleIapEnv === "production" ? Environment.PRODUCTION : Environment.SANDBOX;

let signedDataVerifierCache: SignedDataVerifier | null = null;

const getSignedDataVerifier = () => {
  if (signedDataVerifierCache) return signedDataVerifierCache;
  const config = getBackendConfig();
  signedDataVerifierCache = new SignedDataVerifier(
    loadAppleRootCertificates(),
    config.appleSignedDataOnlineChecks,
    toAppleServerEnvironment(),
    config.appleBundleId,
    config.appleIapEnv === "production" ? config.appleAppAppleId : undefined
  );
  return signedDataVerifierCache;
};

const parseAppleDate = (value?: string) => {
  const ms = Number(value || "");
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return new Date(ms).toISOString();
};

const parseAppleMsDate = (value?: number) => {
  if (!value || !Number.isFinite(value)) return null;
  return new Date(value).toISOString();
};

const normalizeAppleEnvironment = (value?: string): AppleEnvironment =>
  /sandbox/i.test(value || "") ? "sandbox" : "production";

const appleStatusMessage = (status: number) => {
  const messages: Record<number, string> = {
    0: "Receipt is valid",
    21002: "Receipt data is malformed",
    21003: "Receipt could not be authenticated",
    21004: "Shared secret does not match",
    21005: "Apple receipt server is unavailable",
    21006: "Subscription receipt is valid but expired",
    21007: "Sandbox receipt sent to production",
    21008: "Production receipt sent to sandbox",
    21010: "User account cannot be found or was deleted",
  };
  return messages[status] || "Apple receipt verification failed";
};

const redactAppleResponse = (response: AppleVerifyReceiptResponse, receiptHash: string) => {
  const { latest_receipt: _latestReceipt, ...safe } = response;
  return {
    ...safe,
    latest_receipt_hash: response.latest_receipt ? sha256Hex(response.latest_receipt) : undefined,
    submitted_receipt_hash: receiptHash,
  };
};

const mapMembership = (row?: MembershipRow) => {
  if (!row) return null;
  return {
    id: row.id,
    productId: row.product_id,
    status: row.status,
    entitlements: row.entitlements || {},
    startedAt: row.started_at,
    expiresAt: row.expires_at,
  };
};

export class PaymentService {
  async verifyReceipt(userId: string, payload: PaymentVerifyReceiptPayload) {
    const config = getBackendConfig();

    if (config.appleIapProductIds.length && payload.productId) {
      this.ensureProductIsAllowed(payload.productId);
    }

    if (config.paymentsMode !== "live") {
      if (config.nodeEnv === "production") {
        throw new HttpError(503, "Payments must run in live mode in production");
      }
      return this.persistMockPurchase(userId, payload);
    }

    if (payload.signedTransactionInfo) {
      return this.verifySignedTransaction(userId, payload);
    }

    if (!payload.receiptData) {
      throw new HttpError(422, "Apple receipt data is required in live payment mode");
    }

    const receiptHash = sha256Hex(payload.receiptData);
    const verification = await this.verifyWithAppleFallback(payload.receiptData, payload.environment);
    const appleStatus = verification.response.status;

    if (![0, 21006].includes(appleStatus)) {
      await this.persistFailedAttempt(userId, payload, {
        receiptHash,
        environment: verification.environment,
        appleStatus,
        appleResponse: verification.response,
      });
      throw new HttpError(402, "Apple receipt verification failed", {
        appleStatus,
        message: appleStatusMessage(appleStatus),
      });
    }

    const purchase = this.selectPurchase(verification.response, payload);
    if (!purchase) {
      await this.persistFailedAttempt(userId, payload, {
        receiptHash,
        environment: verification.environment,
        appleStatus,
        appleResponse: verification.response,
      });
      throw new HttpError(422, "Verified Apple receipt does not contain the requested purchase");
    }

    this.ensureProductIsAllowed(purchase.productId);

    const persisted = await this.persistPurchase(userId, purchase, {
      receiptHash,
      environment: verification.environment,
      rawReceipt: redactAppleResponse(verification.response, receiptHash),
    });

    return {
      ok: true,
      payment: {
        verified: true,
        orderId: persisted.order.id,
        status: persisted.order.payment_status,
        productId: purchase.productId,
        transactionId: purchase.transactionId,
        originalTransactionId: purchase.originalTransactionId,
        environment: verification.environment,
        expiresAt: purchase.expiresAt,
        active: persisted.membership?.status === "active",
      },
      membership: mapMembership(persisted.membership || undefined),
    };
  }

  private async verifyWithAppleFallback(
    receiptData: string,
    requestedEnvironment: PaymentVerifyReceiptPayload["environment"]
  ) {
    const config = getBackendConfig();
    const initialEnvironment =
      requestedEnvironment === "auto" ? config.appleIapEnv : requestedEnvironment;
    const first = await this.verifyWithApple(receiptData, initialEnvironment);

    if (first.response.status === 21007 && initialEnvironment !== "sandbox") {
      return this.verifyWithApple(receiptData, "sandbox");
    }
    if (first.response.status === 21008 && initialEnvironment !== "production") {
      return this.verifyWithApple(receiptData, "production");
    }
    return first;
  }

  private async verifySignedTransaction(userId: string, payload: PaymentVerifyReceiptPayload) {
    const verifier = getSignedDataVerifier();
    const transaction = await verifier.verifyAndDecodeTransaction(payload.signedTransactionInfo!);
    const purchase = this.purchaseFromSignedTransaction(transaction);

    if (!purchase) {
      throw new HttpError(422, "Apple signed transaction is missing purchase details");
    }
    if (payload.productId && purchase.productId !== payload.productId) {
      throw new HttpError(422, "Apple signed transaction product does not match the request");
    }
    if (payload.transactionId && purchase.transactionId !== payload.transactionId) {
      throw new HttpError(422, "Apple signed transaction id does not match the request");
    }

    this.ensureProductIsAllowed(purchase.productId);
    const receiptHash = sha256Hex(payload.signedTransactionInfo!);
    const environment = normalizeAppleEnvironment(String(transaction.environment || getBackendConfig().appleIapEnv));
    const persisted = await this.persistPurchase(userId, purchase, {
      receiptHash,
      environment,
      rawReceipt: {
        mode: "signed_transaction",
        submitted_signed_transaction_hash: receiptHash,
        transaction,
      },
    });

    return {
      ok: true,
      payment: {
        verified: true,
        verificationMode: "signed_transaction",
        orderId: persisted.order.id,
        status: persisted.order.payment_status,
        productId: purchase.productId,
        transactionId: purchase.transactionId,
        originalTransactionId: purchase.originalTransactionId,
        environment,
        expiresAt: purchase.expiresAt,
        active: persisted.membership?.status === "active",
      },
      membership: mapMembership(persisted.membership || undefined),
    };
  }

  private purchaseFromSignedTransaction(transaction: JWSTransactionDecodedPayload): SelectedPurchase | null {
    if (!transaction.productId || !transaction.transactionId) return null;
    return {
      productId: transaction.productId,
      transactionId: String(transaction.transactionId),
      originalTransactionId: transaction.originalTransactionId
        ? String(transaction.originalTransactionId)
        : null,
      purchaseDate: parseAppleMsDate(transaction.purchaseDate) || new Date().toISOString(),
      expiresAt: parseAppleMsDate(transaction.expiresDate),
      cancelledAt: parseAppleMsDate(transaction.revocationDate),
    };
  }

  private async verifyWithApple(receiptData: string, environment: AppleEnvironment) {
    const config = getBackendConfig();
    const url =
      environment === "sandbox"
        ? config.appleVerifyReceiptSandboxUrl
        : config.appleVerifyReceiptProductionUrl;
    const body: Record<string, unknown> = {
      "receipt-data": receiptData,
      "exclude-old-transactions": true,
    };
    if (config.appleSharedSecret) body.password = config.appleSharedSecret;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch((error) => {
      throw new HttpError(502, "Apple receipt verification network failed", {
        message: error instanceof Error ? error.message : "fetch_failed",
      });
    });

    const data = await response.json().catch(() => null) as AppleVerifyReceiptResponse | null;
    if (!response.ok || !data || typeof data.status !== "number") {
      throw new HttpError(502, "Apple receipt verification server returned an invalid response", {
        statusCode: response.status,
      });
    }

    return {
      environment: normalizeAppleEnvironment(data.environment || environment),
      response: data,
    };
  }

  private selectPurchase(
    response: AppleVerifyReceiptResponse,
    payload: PaymentVerifyReceiptPayload
  ): SelectedPurchase | null {
    const allItems = [
      ...(Array.isArray(response.latest_receipt_info) ? response.latest_receipt_info : []),
      ...(Array.isArray(response.receipt?.in_app) ? response.receipt!.in_app! : []),
    ];

    const matching = allItems
      .filter((item) => item.product_id && item.transaction_id)
      .filter((item) => !payload.productId || item.product_id === payload.productId)
      .filter((item) => !payload.transactionId || item.transaction_id === payload.transactionId)
      .sort((a, b) => {
        const aTime = Number(a.expires_date_ms || a.purchase_date_ms || 0);
        const bTime = Number(b.expires_date_ms || b.purchase_date_ms || 0);
        return bTime - aTime;
      });

    const item = matching[0];
    if (!item?.product_id || !item.transaction_id) return null;

    return {
      productId: item.product_id,
      transactionId: item.transaction_id,
      originalTransactionId: item.original_transaction_id || null,
      purchaseDate: parseAppleDate(item.purchase_date_ms) || new Date().toISOString(),
      expiresAt: parseAppleDate(item.expires_date_ms),
      cancelledAt: parseAppleDate(item.cancellation_date_ms),
    };
  }

  private ensureProductIsAllowed(productId: string) {
    const configuredProducts = getBackendConfig().appleIapProductIds;
    if (configuredProducts.length && !configuredProducts.includes(productId)) {
      throw new HttpError(422, "Apple product id is not configured on the server", { productId });
    }
  }

  private async persistMockPurchase(userId: string, payload: PaymentVerifyReceiptPayload) {
    const config = getBackendConfig();
    const productId = payload.productId || config.appleIapProductIds[0] || "com.lifekline.lifetime";
    const purchase: SelectedPurchase = {
      productId,
      transactionId: payload.transactionId || `mock_${randomUUID()}`,
      originalTransactionId: null,
      purchaseDate: new Date().toISOString(),
      expiresAt: productId.toLowerCase().includes("month")
        ? new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString()
        : null,
      cancelledAt: null,
    };
    const receiptHash = sha256Hex(json({ userId, productId, transactionId: purchase.transactionId }));
    const persisted = await this.persistPurchase(userId, purchase, {
      receiptHash,
      environment: config.appleIapEnv,
      rawReceipt: {
        mode: "mock",
        mockSuccess: payload.mockSuccess,
        submitted_receipt_hash: receiptHash,
      },
    });

    return {
      ok: true,
      payment: {
        verified: true,
        orderId: persisted.order.id,
        status: persisted.order.payment_status,
        productId: purchase.productId,
        transactionId: purchase.transactionId,
        originalTransactionId: purchase.originalTransactionId,
        environment: config.appleIapEnv,
        expiresAt: purchase.expiresAt,
        active: persisted.membership?.status === "active",
        mode: "mock",
      },
      membership: mapMembership(persisted.membership || undefined),
    };
  }

  private async persistPurchase(
    userId: string,
    purchase: SelectedPurchase,
    meta: {
      receiptHash: string;
      environment: AppleEnvironment;
      rawReceipt: Record<string, unknown>;
    }
  ) {
    const isExpired = Boolean(purchase.expiresAt && Date.parse(purchase.expiresAt) <= Date.now());
    const orderStatus: OrderStatus = purchase.cancelledAt ? "refunded" : "success";
    const membershipStatus: MembershipStatus = purchase.cancelledAt
      ? "revoked"
      : isExpired
        ? "expired"
        : "active";

    return withTransaction(async (client) => {
      const order = await this.upsertOrder(client, userId, {
        transactionId: purchase.transactionId,
        originalTransactionId: purchase.originalTransactionId,
        productId: purchase.productId,
        paymentStatus: orderStatus,
        purchaseToken: meta.receiptHash,
        environment: meta.environment,
        rawReceipt: meta.rawReceipt,
      });

      const membership = await this.upsertMembership(client, userId, order.id, purchase, membershipStatus);
      await client.query(
        `
          INSERT INTO audit_events (user_id, event_type, metadata)
          VALUES ($1, 'payment.receipt_verified', $2::jsonb)
        `,
        [
          userId,
          json({
            orderId: order.id,
            productId: purchase.productId,
            transactionId: purchase.transactionId,
            status: order.payment_status,
            membershipStatus,
            environment: meta.environment,
          }),
        ]
      );

      return { order, membership };
    });
  }

  private async upsertOrder(
    client: PoolClient,
    userId: string,
    input: {
      transactionId: string | null;
      originalTransactionId: string | null;
      productId: string;
      paymentStatus: OrderStatus;
      purchaseToken: string | null;
      environment: AppleEnvironment;
      rawReceipt: Record<string, unknown>;
    }
  ) {
    const result = await client.query<OrderRow>(
      `
        INSERT INTO orders (
          user_id,
          transaction_id,
          product_id,
          original_transaction_id,
          payment_provider,
          payment_status,
          purchase_token,
          environment,
          raw_receipt,
          provider_payload_hash,
          verified_at,
          paid_at,
          failed_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          'apple_iap',
          $5,
          $6,
          $7,
          $8::jsonb,
          $6,
          now(),
          CASE WHEN $5 IN ('success', 'refunded') THEN now() ELSE NULL END,
          CASE WHEN $5 = 'failed' THEN now() ELSE NULL END
        )
        ON CONFLICT (transaction_id) WHERE transaction_id IS NOT NULL
        DO UPDATE SET
          user_id = EXCLUDED.user_id,
          product_id = EXCLUDED.product_id,
          original_transaction_id = EXCLUDED.original_transaction_id,
          payment_status = EXCLUDED.payment_status,
          purchase_token = EXCLUDED.purchase_token,
          environment = EXCLUDED.environment,
          raw_receipt = EXCLUDED.raw_receipt,
          provider_payload_hash = EXCLUDED.provider_payload_hash,
          verified_at = EXCLUDED.verified_at,
          paid_at = EXCLUDED.paid_at,
          failed_at = EXCLUDED.failed_at
        RETURNING id, product_id, payment_status, paid_at::text, failed_at::text
      `,
      [
        userId,
        input.transactionId,
        input.productId,
        input.originalTransactionId,
        input.paymentStatus,
        input.purchaseToken,
        input.environment,
        json(input.rawReceipt),
      ]
    );
    return result.rows[0];
  }

  private async upsertMembership(
    client: PoolClient,
    userId: string,
    orderId: string,
    purchase: SelectedPurchase,
    status: MembershipStatus
  ) {
    const entitlements = this.buildEntitlements(purchase.productId);
    const existing = await client.query<{ id: string }>(
      "SELECT id FROM memberships WHERE source_order_id = $1 LIMIT 1",
      [orderId]
    );

    const params = [
      userId,
      orderId,
      purchase.productId,
      status,
      json(entitlements),
      purchase.purchaseDate,
      purchase.expiresAt,
    ];
    const sql = existing.rows[0]
      ? `
          UPDATE memberships
          SET
            product_id = $3,
            status = $4,
            entitlements = $5::jsonb,
            started_at = $6::timestamptz,
            expires_at = $7::timestamptz,
            original_transaction_id = $8,
            current_transaction_id = $9
          WHERE id = $10
          RETURNING id, product_id, status, entitlements, started_at::text, expires_at::text
        `
      : `
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
          VALUES ($1, $2, $3, $4, $5::jsonb, $6::timestamptz, $7::timestamptz, $8, $9)
          RETURNING id, product_id, status, entitlements, started_at::text, expires_at::text
        `;

    const result = await client.query<MembershipRow>(
      sql,
      existing.rows[0]
        ? [...params, purchase.originalTransactionId, purchase.transactionId, existing.rows[0].id]
        : [...params, purchase.originalTransactionId, purchase.transactionId]
    );
    return result.rows[0];
  }

  private buildEntitlements(productId: string) {
    const lower = productId.toLowerCase();
    const plan = lower.includes("year")
      ? "annual"
      : lower.includes("month")
        ? "monthly"
        : lower.includes("life")
          ? "lifetime"
          : "premium";

    return {
      plan,
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

  private async persistFailedAttempt(
    userId: string,
    payload: PaymentVerifyReceiptPayload,
    meta: {
      receiptHash: string;
      environment: AppleEnvironment;
      appleStatus: number;
      appleResponse: AppleVerifyReceiptResponse;
    }
  ) {
    await query(
      `
        INSERT INTO orders (
          user_id,
          transaction_id,
          product_id,
          payment_provider,
          payment_status,
          purchase_token,
          environment,
          raw_receipt,
          failed_at
        )
        VALUES ($1, $2, $3, 'apple_iap', 'failed', $4, $5, $6::jsonb, now())
        ON CONFLICT (transaction_id) WHERE transaction_id IS NOT NULL
        DO UPDATE SET
          payment_status = 'failed',
          purchase_token = EXCLUDED.purchase_token,
          environment = EXCLUDED.environment,
          raw_receipt = EXCLUDED.raw_receipt,
          failed_at = now()
      `,
      [
        userId,
        payload.transactionId || null,
        payload.productId || "unknown",
        meta.receiptHash,
        meta.environment,
        json({
          appleStatus: meta.appleStatus,
          message: appleStatusMessage(meta.appleStatus),
          ...redactAppleResponse(meta.appleResponse, meta.receiptHash),
        }),
      ]
    );
  }
}
