import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  Environment,
  NotificationTypeV2,
  SignedDataVerifier,
  type JWSTransactionDecodedPayload,
  type ResponseBodyV2DecodedPayload,
} from "@apple/app-store-server-library";
import type { PoolClient } from "pg";
import { query, withTransaction } from "./db";
import { getBackendConfig } from "./env";
import { HttpError } from "./errors";
import type { AppleWebhookPayload } from "./validation";

interface ExistingUserRow {
  user_id: string;
}

interface NotificationRow {
  id: string;
}

const sha256Hex = (value: string) => createHash("sha256").update(value).digest("hex");

const json = (value: unknown) => JSON.stringify(value ?? {});

const toIso = (value?: number) => {
  if (!value || !Number.isFinite(value)) return null;
  return new Date(value).toISOString();
};

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
    throw new HttpError(503, "Apple root certificates are not configured");
  }

  return certificates;
};

const toAppleEnvironment = () =>
  getBackendConfig().appleIapEnv === "production" ? Environment.PRODUCTION : Environment.SANDBOX;

let verifierCache: SignedDataVerifier | null = null;

const getVerifier = () => {
  if (verifierCache) return verifierCache;
  const config = getBackendConfig();
  verifierCache = new SignedDataVerifier(
    loadAppleRootCertificates(),
    config.appleSignedDataOnlineChecks,
    toAppleEnvironment(),
    config.appleBundleId,
    config.appleIapEnv === "production" ? config.appleAppAppleId : undefined
  );
  return verifierCache;
};

const isActiveNotification = (type?: string) =>
  [
    NotificationTypeV2.SUBSCRIBED,
    NotificationTypeV2.DID_RENEW,
    NotificationTypeV2.OFFER_REDEEMED,
    NotificationTypeV2.RENEWAL_EXTENDED,
    NotificationTypeV2.REFUND_REVERSED,
  ].includes(type as NotificationTypeV2);

const isRevokedNotification = (type?: string) =>
  [NotificationTypeV2.REFUND, NotificationTypeV2.REVOKE].includes(type as NotificationTypeV2);

const isExpiredNotification = (type?: string) =>
  [
    NotificationTypeV2.EXPIRED,
    NotificationTypeV2.GRACE_PERIOD_EXPIRED,
    NotificationTypeV2.DID_FAIL_TO_RENEW,
  ].includes(type as NotificationTypeV2);

const membershipStatusFor = (type: string | undefined, transaction?: JWSTransactionDecodedPayload) => {
  if (isRevokedNotification(type) || transaction?.revocationDate) return "revoked";
  if (isActiveNotification(type)) return "active";
  if (type === NotificationTypeV2.DID_FAIL_TO_RENEW && transaction?.expiresDate) {
    return transaction.expiresDate > Date.now() ? "active" : "expired";
  }
  if (isExpiredNotification(type)) return "expired";
  return null;
};

const orderStatusFor = (type: string | undefined) => {
  if (isRevokedNotification(type)) return "refunded";
  if (isActiveNotification(type)) return "success";
  if (isExpiredNotification(type)) return "cancelled";
  return null;
};

const buildEntitlements = (productId: string) => {
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
};

export class AppleWebhookService {
  async handleNotification(payload: AppleWebhookPayload) {
    const verifier = getVerifier();
    const decoded = await verifier.verifyAndDecodeNotification(payload.signedPayload);
    const transaction = decoded.data?.signedTransactionInfo
      ? await verifier.verifyAndDecodeTransaction(decoded.data.signedTransactionInfo)
      : undefined;
    const payloadHash = sha256Hex(payload.signedPayload);
    const notificationUuid = decoded.notificationUUID;

    if (!notificationUuid) {
      throw new HttpError(422, "Apple notification is missing notificationUUID");
    }

    const result = await withTransaction(async (client) => {
      const inserted = await this.insertNotification(client, decoded, transaction, payloadHash);
      if (!inserted) {
        return { status: "duplicate" };
      }

      if (decoded.notificationType === NotificationTypeV2.TEST) {
        await this.markNotification(client, notificationUuid, "processed");
        return { status: "processed", notificationType: decoded.notificationType };
      }

      const userId = await this.findLinkedUser(client, transaction);
      if (!userId) {
        await this.markNotification(client, notificationUuid, "unmatched");
        return { status: "unmatched", notificationType: decoded.notificationType };
      }

      await this.applyTransactionUpdate(client, userId, decoded, transaction, payloadHash);
      await this.markNotification(client, notificationUuid, "processed");
      await client.query(
        `
          INSERT INTO audit_events (user_id, event_type, metadata)
          VALUES ($1, 'payment.apple_notification_processed', $2::jsonb)
        `,
        [
          userId,
          json({
            notificationUUID: notificationUuid,
            notificationType: decoded.notificationType,
            subtype: decoded.subtype,
            transactionId: transaction?.transactionId,
            originalTransactionId: transaction?.originalTransactionId,
            productId: transaction?.productId,
          }),
        ]
      );

      return { status: "processed", notificationType: decoded.notificationType };
    });

    return {
      ok: true,
      webhook: {
        ...result,
        notificationUUID: notificationUuid,
      },
    };
  }

  private async insertNotification(
    client: PoolClient,
    decoded: ResponseBodyV2DecodedPayload,
    transaction: JWSTransactionDecodedPayload | undefined,
    payloadHash: string
  ) {
    const result = await client.query<NotificationRow>(
      `
        INSERT INTO app_store_notifications (
          notification_uuid,
          notification_type,
          subtype,
          environment,
          transaction_id,
          original_transaction_id,
          product_id,
          signed_date,
          processing_status,
          payload_hash,
          payload
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, 'received', $9, $10::jsonb)
        ON CONFLICT (notification_uuid) DO NOTHING
        RETURNING id
      `,
      [
        decoded.notificationUUID,
        decoded.notificationType || "UNKNOWN",
        decoded.subtype || null,
        String(decoded.data?.environment || transaction?.environment || getBackendConfig().appleIapEnv),
        transaction?.transactionId || null,
        transaction?.originalTransactionId || null,
        transaction?.productId || null,
        toIso(decoded.signedDate),
        payloadHash,
        json({ decoded, transaction }),
      ]
    );
    return result.rows[0] || null;
  }

  private async findLinkedUser(
    client: PoolClient,
    transaction?: JWSTransactionDecodedPayload
  ) {
    if (!transaction?.transactionId && !transaction?.originalTransactionId) return null;

    const result = await client.query<ExistingUserRow>(
      `
        SELECT user_id
        FROM orders
        WHERE ($1::text IS NOT NULL AND transaction_id = $1)
           OR ($2::text IS NOT NULL AND original_transaction_id = $2)
        UNION
        SELECT user_id
        FROM memberships
        WHERE ($2::text IS NOT NULL AND original_transaction_id = $2)
           OR ($1::text IS NOT NULL AND current_transaction_id = $1)
        LIMIT 1
      `,
      [transaction.transactionId || null, transaction.originalTransactionId || null]
    );
    return result.rows[0]?.user_id || null;
  }

  private async applyTransactionUpdate(
    client: PoolClient,
    userId: string,
    decoded: ResponseBodyV2DecodedPayload,
    transaction: JWSTransactionDecodedPayload | undefined,
    payloadHash: string
  ) {
    if (!transaction?.transactionId || !transaction.productId) return;

    const orderStatus = orderStatusFor(decoded.notificationType);
    if (orderStatus) {
      const order = await client.query<{ id: string }>(
        `
          INSERT INTO orders (
            user_id,
            transaction_id,
            original_transaction_id,
            product_id,
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
            CASE WHEN $5 IN ('failed', 'cancelled') THEN now() ELSE NULL END
          )
          ON CONFLICT (transaction_id) WHERE transaction_id IS NOT NULL
          DO UPDATE SET
            payment_status = EXCLUDED.payment_status,
            original_transaction_id = EXCLUDED.original_transaction_id,
            raw_receipt = EXCLUDED.raw_receipt,
            provider_payload_hash = EXCLUDED.provider_payload_hash,
            verified_at = EXCLUDED.verified_at,
            paid_at = EXCLUDED.paid_at,
            failed_at = EXCLUDED.failed_at
          RETURNING id
        `,
        [
          userId,
          transaction.transactionId,
          transaction.originalTransactionId || null,
          transaction.productId,
          orderStatus,
          payloadHash,
          String(decoded.data?.environment || transaction.environment || getBackendConfig().appleIapEnv),
          json({ decoded, transaction }),
        ]
      );

      await this.upsertMembershipFromNotification(
        client,
        userId,
        order.rows[0]?.id || null,
        decoded,
        transaction
      );
      return;
    }

    await this.upsertMembershipFromNotification(client, userId, null, decoded, transaction);
  }

  private async upsertMembershipFromNotification(
    client: PoolClient,
    userId: string,
    orderId: string | null,
    decoded: ResponseBodyV2DecodedPayload,
    transaction: JWSTransactionDecodedPayload
  ) {
    if (!transaction.productId) return;
    const status = membershipStatusFor(decoded.notificationType, transaction);
    if (!status) return;

    const existing = await client.query<{ id: string }>(
      `
        SELECT id
        FROM memberships
        WHERE user_id = $1
          AND (
            ($2::text IS NOT NULL AND original_transaction_id = $2)
            OR ($3::text IS NOT NULL AND current_transaction_id = $3)
            OR product_id = $4
          )
        ORDER BY started_at DESC
        LIMIT 1
      `,
      [
        userId,
        transaction.originalTransactionId || null,
        transaction.transactionId || null,
        transaction.productId,
      ]
    );

    const params = [
      userId,
      orderId,
      transaction.productId,
      status,
      json(buildEntitlements(transaction.productId)),
      toIso(transaction.purchaseDate) || new Date().toISOString(),
      toIso(transaction.expiresDate),
      transaction.originalTransactionId || null,
      transaction.transactionId || null,
    ];

    if (existing.rows[0]) {
      await client.query(
        `
          UPDATE memberships
          SET
            source_order_id = COALESCE($2, source_order_id),
            product_id = $3,
            status = $4,
            entitlements = $5::jsonb,
            started_at = $6::timestamptz,
            expires_at = $7::timestamptz,
            original_transaction_id = $8,
            current_transaction_id = $9
          WHERE id = $10
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
        VALUES ($1, $2, $3, $4, $5::jsonb, $6::timestamptz, $7::timestamptz, $8, $9)
      `,
      params
    );
  }

  private async markNotification(
    client: PoolClient,
    notificationUuid: string,
    status: string,
    errorMessage?: string
  ) {
    await client.query(
      `
        UPDATE app_store_notifications
        SET processing_status = $2, error_message = $3, processed_at = now()
        WHERE notification_uuid = $1
      `,
      [notificationUuid, status, errorMessage || null]
    );
  }
}
