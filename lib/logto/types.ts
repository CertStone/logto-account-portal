/**
 * Logto 相关类型定义
 */

// ============ Social & SSO Identity Types ============

export interface SocialIdentityData {
  identity: {
    userId: string;
    details?: {
      id: string;
      name: string;
      email: string;
      avatar: string;
      rawData: {
        sub: string;
        name: string;
        email: string;
        picture: string;
        given_name: string;
        family_name: string;
        email_verified: boolean;
      };
    };
  };
  target: string;
  tokenSecret?: {
    tenantId: string;
    id: string;
    userId: string;
    type: string;
    metadata: Record<string, unknown>;
    target: string;
  };
}

export interface SSOIdentityData {
  ssoIdentity: {
    tenantId: string;
    id: string;
    userId: string;
    issuer: string;
    identityId: string;
    detail: Record<string, unknown>;
    createdAt: number;
    updatedAt: number;
    ssoConnectorId: string;
  };
  ssoConnectorId: string;
  tokenSecret?: {
    tenantId: string;
    id: string;
    userId: string;
    type: string;
    metadata: Record<string, unknown>;
    target: string;
  };
}

export interface AllIdentitiesResponse {
  socialIdentities: SocialIdentityData[];
  ssoIdentities: SSOIdentityData[];
}

// ============ Account Info Types ============

export interface AccountInfo {
  id: string;
  username: string;
  name: string;
  avatar: string;
  lastSignInAt: number;
  createdAt: number;
  updatedAt: number;
  profile: {
    familyName?: string;
    givenName?: string;
    middleName?: string;
    nickname?: string;
    preferredUsername?: string;
    profile?: string;
    website?: string;
    gender?: string;
    birthdate?: string;
    zoneinfo?: string;
    locale?: string;
  };
  applicationId: string;
  isSuspended: boolean;
  hasPassword: boolean;
  primaryEmail?: string;
  primaryPhone?: string;
}

// ============ MFA Types ============

export interface MfaVerification {
  id: string;
  type: "Totp" | "WebAuthn" | "BackupCode";
  name?: string;
  agent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackupCodeStatus {
  code: string;
  usedAt: string | null;
}

// ============ Login History Types ============

export interface LoginHistoryRecord {
  id: string;
  event: string;
  timestamp: number;
  applicationName: string;
  ip?: string;
  userAgent?: string;
}

// ============ Social Connector Types ============

export interface SocialConnector {
  target: string;
  connectorId?: string;
  name: string;
  icon?: string;
  description?: string;
}

// ============ API Response Types ============

export interface VerificationResponse {
  verificationRecordId: string;
  expiresAt: string;
}

export interface VerificationCodeResponse extends VerificationResponse {
  verificationId: string;
}

export interface TotpSecretResponse {
  secret: string;
}

export interface BackupCodesResponse {
  codes: string[];
}

export interface BackupCodesStatusResponse {
  codes: BackupCodeStatus[];
}
