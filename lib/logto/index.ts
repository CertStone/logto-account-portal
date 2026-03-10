/**
 * Logto 模块统一导出
 *
 * @example
 * ```typescript
 * import { getLogtoContext, signIn, getAccountInfo } from "@/lib/logto";
 * ```
 */

// Client
export {
  getLogtoContext,
  signIn,
  signOut,
  handleSignIn,
  getAccessTokenRSC,
  getAuthHeaders,
} from "./client";

// Account API
export {
  // Account Info
  getAccountInfo,
  updateAccountInfo,
  updateProfileInfo,
  // Verification
  verifyPassword,
  sendVerificationCode,
  verifyCode,
  // Password
  updatePassword,
  // Email & Phone
  updatePrimaryEmail,
  removePrimaryEmail,
  updatePrimaryPhone,
  removePrimaryPhone,
  // MFA
  generateTotpSecret,
  bindMfaFactor,
  getMfaVerifications,
  deleteMfaVerification,
  generateBackupCodes,
  getBackupCodes,
} from "./account-api";

// Management API
export {
  // Password (Management)
  setPassword,
  verifyPasswordManagement,
  // Social
  getAllIdentities,
  getSocialConnectors,
  getSocialConnectorByTarget,
  getSocialIdentities,
  createSocialVerification,
  verifySocialVerification,
  addSocialIdentity,
  removeSocialIdentity,
  // Login History
  getUserLoginHistory,
  // Account Deletion
  deleteUserAccount,
} from "./management-api";

// Types
export type {
  SocialIdentityData,
  SSOIdentityData,
  AllIdentitiesResponse,
  AccountInfo,
  MfaVerification,
  BackupCodeStatus,
  LoginHistoryRecord,
  SocialConnector,
  VerificationResponse,
  VerificationCodeResponse,
  TotpSecretResponse,
  BackupCodesResponse,
  BackupCodesStatusResponse,
} from "./types";

// Config
export { logtoConfig, validateLogtoConfig } from "./config";

// Error types
export { LogtoApiError } from "./fetch-with-auth";
