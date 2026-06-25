import { query, withTransaction } from "./db";
import { HttpError } from "./errors";
import type { UserBindingsPayload, UserProfilePayload, UserSettingsPayload } from "./validation";

interface UserRow {
  id: string;
  auth_provider: string;
  openid: string | null;
  unionid: string | null;
  apple_sub: string | null;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ProfileRow {
  id: string;
  user_id: string;
  name: string;
  gender: string;
  birth_date: string;
  birth_time: string | null;
  birth_place: string | null;
  derived_ai_foundation: Record<string, unknown>;
  profile_snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface MembershipRow {
  id: string;
  product_id: string;
  status: string;
  entitlements: Record<string, unknown>;
  started_at: string;
  expires_at: string | null;
}

interface PreferenceRow {
  settings: Record<string, unknown>;
  bindings: Record<string, unknown>;
  share_count: number;
  updated_at: string;
}

const mapUser = (row: UserRow) => ({
  id: row.id,
  authProvider: row.auth_provider,
  displayName: row.display_name,
  email: row.email,
  phone: row.phone,
  avatarUrl: row.avatar_url,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapProfile = (row?: ProfileRow) => {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    gender: row.gender,
    birthDate: row.birth_date,
    birthTime: row.birth_time,
    birthPlace: row.birth_place,
    derivedAiFoundation: row.derived_ai_foundation || {},
    profileSnapshot: row.profile_snapshot || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

const defaultPreferences = () => ({
  settings: {
    notifications: true,
    language: "中文 / EN",
  },
  bindings: {
    phone: null,
    wechat: false,
  },
  shareCount: 0,
  updatedAt: null as string | null,
});

const mapPreferences = (row?: PreferenceRow) => {
  if (!row) return defaultPreferences();
  return {
    settings: {
      ...defaultPreferences().settings,
      ...(row.settings || {}),
    },
    bindings: {
      ...defaultPreferences().bindings,
      ...(row.bindings || {}),
    },
    shareCount: row.share_count || 0,
    updatedAt: row.updated_at,
  };
};

export class UserService {
  async getMe(userId: string) {
    const user = await this.getUser(userId);
    const [profile, membership, preferences] = await Promise.all([
      this.getProfile(userId),
      this.getActiveMembership(userId),
      this.getPreferences(userId),
    ]);

    return {
      ok: true,
      authenticated: true,
      user: mapUser(user),
      profile: mapProfile(profile || undefined),
      membership: mapMembership(membership || undefined),
      settings: mapPreferences(preferences || undefined),
    };
  }

  async getProfile(userId: string) {
    const result = await query<ProfileRow>(
      `
        SELECT
          id,
          user_id,
          name,
          gender,
          birth_date::text,
          to_char(birth_time, 'HH24:MI') AS birth_time,
          birth_place,
          derived_ai_foundation,
          profile_snapshot,
          created_at::text,
          updated_at::text
        FROM user_profiles
        WHERE user_id = $1
      `,
      [userId]
    );
    return result.rows[0] || null;
  }

  async upsertProfile(userId: string, payload: UserProfilePayload) {
    await this.getUser(userId);
    const profileSnapshot = {
      name: payload.name,
      gender: payload.gender,
      birthDate: payload.birthDate,
      birthTime: payload.birthTime,
      birthPlace: payload.birthPlace,
    };

    const result = await query<ProfileRow>(
      `
        INSERT INTO user_profiles (
          user_id,
          name,
          gender,
          birth_date,
          birth_time,
          birth_place,
          derived_ai_foundation,
          profile_snapshot
        )
        VALUES ($1, $2, $3, $4::date, $5::time, $6, $7::jsonb, $8::jsonb)
        ON CONFLICT (user_id)
        DO UPDATE SET
          name = EXCLUDED.name,
          gender = EXCLUDED.gender,
          birth_date = EXCLUDED.birth_date,
          birth_time = EXCLUDED.birth_time,
          birth_place = EXCLUDED.birth_place,
          derived_ai_foundation = EXCLUDED.derived_ai_foundation,
          profile_snapshot = EXCLUDED.profile_snapshot
        RETURNING
          id,
          user_id,
          name,
          gender,
          birth_date::text,
          to_char(birth_time, 'HH24:MI') AS birth_time,
          birth_place,
          derived_ai_foundation,
          profile_snapshot,
          created_at::text,
          updated_at::text
      `,
      [
        userId,
        payload.name,
        payload.gender,
        payload.birthDate,
        payload.birthTime || null,
        payload.birthPlace || null,
        JSON.stringify(payload.derivedAiFoundation || {}),
        JSON.stringify(profileSnapshot),
      ]
    );

    await query(
      `
        INSERT INTO audit_events (user_id, event_type, metadata)
        VALUES ($1, 'profile.upserted', $2::jsonb)
      `,
      [userId, JSON.stringify({ hasDerivedAiFoundation: Object.keys(payload.derivedAiFoundation || {}).length > 0 })]
    );

    return {
      ok: true,
      profile: mapProfile(result.rows[0]),
    };
  }

  async getPreferences(userId: string) {
    await this.getUser(userId);
    const result = await query<PreferenceRow>(
      `
        SELECT
          settings,
          bindings,
          share_count,
          updated_at::text
        FROM user_preferences
        WHERE user_id = $1
      `,
      [userId]
    );
    return result.rows[0] || null;
  }

  async saveSettings(userId: string, settings: UserSettingsPayload) {
    await this.getUser(userId);
    const result = await query<PreferenceRow>(
      `
        INSERT INTO user_preferences (user_id, settings)
        VALUES ($1, $2::jsonb)
        ON CONFLICT (user_id)
        DO UPDATE SET settings = EXCLUDED.settings
        RETURNING settings, bindings, share_count, updated_at::text
      `,
      [userId, JSON.stringify(settings)]
    );
    await this.audit(userId, "preferences.settings_saved", { keys: Object.keys(settings) });
    return { ok: true, settings: mapPreferences(result.rows[0]) };
  }

  async saveBindings(userId: string, bindings: UserBindingsPayload) {
    await this.getUser(userId);
    const result = await query<PreferenceRow>(
      `
        INSERT INTO user_preferences (user_id, bindings)
        VALUES ($1, $2::jsonb)
        ON CONFLICT (user_id)
        DO UPDATE SET bindings = EXCLUDED.bindings
        RETURNING settings, bindings, share_count, updated_at::text
      `,
      [userId, JSON.stringify(bindings)]
    );
    await this.audit(userId, "preferences.bindings_saved", {
      hasPhone: Boolean(bindings.phone),
      wechat: bindings.wechat,
    });
    return { ok: true, settings: mapPreferences(result.rows[0]) };
  }

  async saveShareCount(userId: string, shareCount: number) {
    await this.getUser(userId);
    const result = await query<PreferenceRow>(
      `
        INSERT INTO user_preferences (user_id, share_count)
        VALUES ($1, $2)
        ON CONFLICT (user_id)
        DO UPDATE SET share_count = EXCLUDED.share_count
        RETURNING settings, bindings, share_count, updated_at::text
      `,
      [userId, shareCount]
    );
    return { ok: true, settings: mapPreferences(result.rows[0]) };
  }

  async deleteAccount(userId: string) {
    await withTransaction(async (client) => {
      const userResult = await client.query<{ id: string }>(
        `
          UPDATE users
          SET status = 'deleted', deleted_at = now(), updated_at = now()
          WHERE id = $1 AND deleted_at IS NULL
          RETURNING id
        `,
        [userId]
      );
      if (!userResult.rows[0]) throw new HttpError(404, "User not found");

      const revokedIdentities = await client.query<{ id: string; provider: string }>(
        `
          UPDATE user_auth_identities
          SET status = 'revoked', revoked_at = now(), is_primary = false
          WHERE user_id = $1 AND status = 'active' AND revoked_at IS NULL
          RETURNING id, provider
        `,
        [userId]
      );
      for (const identity of revokedIdentities.rows) {
        await client.query(
          `
            INSERT INTO audit_events (user_id, event_type, metadata)
            VALUES (
              $1,
              'auth.identity_revoked',
              jsonb_build_object(
                'identityId', $2::text,
                'provider', $3::text,
                'reason', 'account_deleted'
              )
            )
          `,
          [userId, identity.id, identity.provider]
        );
      }

      await client.query(
        "UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL",
        [userId]
      );
      await client.query(
        `
          INSERT INTO audit_events (user_id, event_type, metadata)
          VALUES ($1, 'account.deleted', jsonb_build_object('revokedIdentityCount', $2::int))
        `,
        [userId, revokedIdentities.rows.length]
      );
    });
    return { ok: true, authenticated: false };
  }

  private async getUser(userId: string) {
    const result = await query<UserRow>(
      `
        SELECT
          id,
          auth_provider,
          openid,
          unionid,
          apple_sub,
          display_name,
          email,
          phone,
          avatar_url,
          status,
          created_at::text,
          updated_at::text
        FROM users
        WHERE id = $1 AND deleted_at IS NULL AND status = 'active'
      `,
      [userId]
    );
    const user = result.rows[0];
    if (!user) throw new HttpError(404, "User not found");
    return user;
  }

  private async getActiveMembership(userId: string) {
    const result = await query<MembershipRow>(
      `
        SELECT
          id,
          product_id,
          status,
          entitlements,
          started_at::text,
          expires_at::text
        FROM memberships
        WHERE user_id = $1
          AND status = 'active'
          AND (expires_at IS NULL OR expires_at > now())
        ORDER BY started_at DESC
        LIMIT 1
      `,
      [userId]
    );
    return result.rows[0] || null;
  }

  private async audit(userId: string, eventType: string, metadata: Record<string, unknown>) {
    await query(
      `
        INSERT INTO audit_events (user_id, event_type, metadata)
        VALUES ($1, $2, $3::jsonb)
      `,
      [userId, eventType, JSON.stringify(metadata)]
    );
  }
}
