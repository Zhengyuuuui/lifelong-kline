import { randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { getBackendConfig } from "./env";
import { query, withTransaction } from "./db";
import { HttpError } from "./errors";
import type { RequestMeta } from "./auth.service";

export const INVITE_DISCOUNT_ELIGIBILITY_TYPE = "invite_3_users_lifetime_discount";
export const INVITE_DISCOUNT_TYPE = "invite_3_users";
export const INVITE_DISCOUNT_PRODUCT_ID = "life_kline_lifetime_invite";
export const INVITE_DISCOUNT_AMOUNT_CENTS = 880;
export const INVITE_DISCOUNT_ORIGINAL_AMOUNT_CENTS = 1880;
export const INVITE_DISCOUNT_REQUIRED_COUNT = 3;

interface InviteCodeRow {
  id: string;
  user_id: string;
  code: string;
}

interface EligibilityRow {
  id: string;
  status: string;
  required_count: number;
  current_count: number;
  unlocked_at: string | null;
  reserved_order_id: string | null;
  consumed_order_id: string | null;
}

const normalizeIp = (value?: string | null) => {
  if (!value) return null;
  return value.split(",")[0]?.trim() || null;
};

export const normalizeInviteCode = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 32);

const generateInviteCode = () => randomBytes(6).toString("hex").toUpperCase();

const runQuery = async <T extends Record<string, unknown>>(
  client: PoolClient | undefined,
  text: string,
  values: unknown[] = []
) => client ? client.query<T>(text, values) : query<T>(text, values);

export class InviteService {
  async getMyInviteSummary(userId: string) {
    return withTransaction(async (client) => {
      const code = await this.getOrCreateCode(client, userId, {});
      const eligibility = await this.ensureEligibility(client, userId);
      const qualifiedCount = await this.countQualifiedReferrals(client, userId);
      const publicSiteUrl = getBackendConfig().publicSiteUrl || "https://人生说明书.com";
      return {
        ok: true,
        inviteCode: code.code,
        inviteUrl: `${publicSiteUrl.replace(/\/$/, "")}?invite=${code.code}`,
        qualifiedCount,
        requiredCount: eligibility.required_count,
        discountUnlocked: ["unlocked", "reserved"].includes(eligibility.status) &&
          qualifiedCount >= eligibility.required_count,
        eligibilityStatus: eligibility.status,
        canCreateDiscountOrder: eligibility.status === "unlocked" &&
          qualifiedCount >= eligibility.required_count &&
          !eligibility.consumed_order_id,
        discountProductId: INVITE_DISCOUNT_PRODUCT_ID,
        discountAmountCents: INVITE_DISCOUNT_AMOUNT_CENTS,
        originalAmountCents: INVITE_DISCOUNT_ORIGINAL_AMOUNT_CENTS,
      };
    });
  }

  async createOrGetCode(userId: string, meta: RequestMeta = {}) {
    return withTransaction(async (client) => {
      const code = await this.getOrCreateCode(client, userId, meta);
      return { ok: true, inviteCode: code.code };
    });
  }

  async recordReferralForNewUser(
    client: PoolClient,
    inviteeUserId: string,
    rawInviteCode: unknown,
    meta: RequestMeta = {}
  ) {
    const code = normalizeInviteCode(rawInviteCode);
    if (!code) return { recorded: false as const, reason: "missing_code" };

    const inviteCodeResult = await client.query<InviteCodeRow & {
      inviter_status: string;
      inviter_deleted_at: string | null;
    }>(
      `
        SELECT
          invite_codes.id,
          invite_codes.user_id,
          invite_codes.code,
          users.status AS inviter_status,
          users.deleted_at::text AS inviter_deleted_at
        FROM invite_codes
        JOIN users ON users.id = invite_codes.user_id
        WHERE invite_codes.code = $1 AND invite_codes.status = 'active'
        LIMIT 1
        FOR UPDATE OF invite_codes, users
      `,
      [code]
    );
    const inviteCode = inviteCodeResult.rows[0];
    if (!inviteCode || inviteCode.inviter_status !== "active" || inviteCode.inviter_deleted_at) {
      await this.audit(client, inviteeUserId, "invite.rejected", {
        reason: "invalid_code",
      }, meta);
      return { recorded: false as const, reason: "invalid_code" };
    }
    if (inviteCode.user_id === inviteeUserId) {
      await this.audit(client, inviteeUserId, "invite.rejected", {
        reason: "self_invite",
      }, meta);
      return { recorded: false as const, reason: "self_invite" };
    }

    const inserted = await client.query<{ id: string }>(
      `
        INSERT INTO invite_referrals (
          inviter_user_id,
          invitee_user_id,
          invite_code_id,
          status,
          qualified_at,
          metadata
        )
        VALUES ($1, $2, $3, 'qualified', now(), $4::jsonb)
        ON CONFLICT (invitee_user_id) DO NOTHING
        RETURNING id
      `,
      [
        inviteCode.user_id,
        inviteeUserId,
        inviteCode.id,
        JSON.stringify({ source: "phone_registration" }),
      ]
    );
    if (!inserted.rows[0]) {
      await this.audit(client, inviteeUserId, "invite.rejected", {
        reason: "invitee_already_counted",
      }, meta);
      return { recorded: false as const, reason: "invitee_already_counted" };
    }

    const qualifiedCount = await this.countQualifiedReferrals(client, inviteCode.user_id);
    const eligibility = await this.ensureEligibility(client, inviteCode.user_id);
    const unlocked = qualifiedCount >= eligibility.required_count;
    await client.query(
      `
        UPDATE user_discount_eligibilities
        SET
          current_count = $2,
          status = CASE
            WHEN status IN ('consumed', 'reserved', 'revoked') THEN status
            WHEN $3::boolean THEN 'unlocked'
            ELSE 'locked'
          END,
          unlocked_at = CASE
            WHEN unlocked_at IS NULL AND $3::boolean THEN now()
            ELSE unlocked_at
          END
        WHERE id = $1
      `,
      [eligibility.id, qualifiedCount, unlocked]
    );
    await this.audit(client, inviteCode.user_id, "invite.referral_qualified", {
      referralId: inserted.rows[0].id,
      inviteCodeId: inviteCode.id,
      qualifiedCount,
      requiredCount: eligibility.required_count,
      unlocked,
    }, meta);
    return { recorded: true as const, inviterUserId: inviteCode.user_id, qualifiedCount };
  }

  async ensureEligibility(client: PoolClient, userId: string) {
    const result = await client.query<EligibilityRow>(
      `
        INSERT INTO user_discount_eligibilities (
          user_id,
          eligibility_type,
          status,
          required_count,
          current_count
        )
        VALUES ($1, $2, 'locked', $3, 0)
        ON CONFLICT (user_id, eligibility_type)
        DO UPDATE SET user_id = EXCLUDED.user_id
        RETURNING
          id,
          status,
          required_count,
          current_count,
          unlocked_at::text,
          reserved_order_id::text,
          consumed_order_id::text
      `,
      [userId, INVITE_DISCOUNT_ELIGIBILITY_TYPE, INVITE_DISCOUNT_REQUIRED_COUNT]
    );
    return result.rows[0];
  }

  async countQualifiedReferrals(client: PoolClient, userId: string) {
    const result = await client.query<{ count: string }>(
      `
        SELECT count(*)::text AS count
        FROM invite_referrals
        WHERE inviter_user_id = $1 AND status = 'qualified'
      `,
      [userId]
    );
    return Number(result.rows[0]?.count || 0);
  }

  private async getOrCreateCode(client: PoolClient, userId: string, meta: RequestMeta) {
    await client.query(
      "SELECT id FROM users WHERE id = $1 AND status = 'active' AND deleted_at IS NULL FOR UPDATE",
      [userId]
    );
    const existing = await client.query<InviteCodeRow>(
      `
        SELECT id, user_id, code
        FROM invite_codes
        WHERE user_id = $1 AND status = 'active'
        LIMIT 1
      `,
      [userId]
    );
    if (existing.rows[0]) {
      await this.audit(client, userId, "invite.code_reused", {
        inviteCodeId: existing.rows[0].id,
      }, meta);
      return existing.rows[0];
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateInviteCode();
      try {
        const inserted = await client.query<InviteCodeRow>(
          `
            INSERT INTO invite_codes (user_id, code, status)
            VALUES ($1, $2, 'active')
            RETURNING id, user_id, code
          `,
          [userId, code]
        );
        await this.audit(client, userId, "invite.code_created", {
          inviteCodeId: inserted.rows[0].id,
        }, meta);
        return inserted.rows[0];
      } catch (error) {
        if ((error as { code?: string }).code !== "23505" || attempt === 4) {
          throw error;
        }
      }
    }
    throw new HttpError(500, "Invite code generation failed");
  }

  async getEligibilityForUpdate(client: PoolClient, userId: string) {
    await this.ensureEligibility(client, userId);
    const result = await client.query<EligibilityRow>(
      `
        SELECT
          id,
          status,
          required_count,
          current_count,
          unlocked_at::text,
          reserved_order_id::text,
          consumed_order_id::text
        FROM user_discount_eligibilities
        WHERE user_id = $1 AND eligibility_type = $2
        FOR UPDATE
      `,
      [userId, INVITE_DISCOUNT_ELIGIBILITY_TYPE]
    );
    return result.rows[0];
  }

  async audit(
    client: PoolClient,
    userId: string | null,
    eventType: string,
    metadata: Record<string, unknown>,
    meta: RequestMeta = {}
  ) {
    await client.query(
      `
        INSERT INTO audit_events (user_id, event_type, metadata, ip_address, user_agent)
        VALUES ($1, $2, $3::jsonb, $4, $5)
      `,
      [
        userId,
        eventType,
        JSON.stringify(metadata),
        normalizeIp(meta.ipAddress),
        meta.userAgent || null,
      ]
    );
  }
}
