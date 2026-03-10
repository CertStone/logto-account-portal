/**
 * Logto Account API 封装
 * 用户自服务操作（需要用户 Access Token）
 */

import { logger } from "@/lib/logger";
import { logtoConfig } from "./config";
import { getAccessTokenRSC } from "./client";
import { fetchJsonWithAuth, fetchVoidWithAuth } from "./fetch-with-auth";
import type {
  AccountInfo,
  VerificationResponse,
  VerificationCodeResponse,
  MfaVerification,
  TotpSecretResponse,
  BackupCodesResponse,
  BackupCodesStatusResponse,
} from "./types";

const API_BASE = () => logtoConfig.endpoint;

/**
 * 获取账户信息
 */
export async function getAccountInfo(): Promise<AccountInfo> {
  const accessToken = await getAccessTokenRSC();
  return fetchJsonWithAuth<AccountInfo>({
    url: `${API_BASE()}/api/my-account`,
    accessToken,
    operationName: "获取账户信息",
  });
}

/**
 * 更新账户基本信息
 */
export async function updateAccountInfo(data: {
  username?: string;
  name?: string;
  avatar?: string | null;
  customData?: Record<string, unknown>;
}): Promise<AccountInfo> {
  // 过滤处理数据
  const filteredData: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      if (key === "username") {
        const trimmedValue = value.trim();
        if (trimmedValue) filteredData[key] = trimmedValue;
      } else {
        filteredData[key] = value;
      }
    } else if (value !== undefined) {
      filteredData[key] = value;
    }
  }

  logger.devLog("Updating account", { fields: Object.keys(filteredData) });

  const accessToken = await getAccessTokenRSC();
  return fetchJsonWithAuth<AccountInfo>({
    url: `${API_BASE()}/api/my-account`,
    accessToken,
    method: "PATCH",
    body: filteredData,
    operationName: "更新账户信息",
  });
}

/**
 * 更新详细资料
 */
export async function updateProfileInfo(data: {
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
}): Promise<AccountInfo> {
  const filteredData: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      filteredData[key] = value;
    }
  }

  logger.devLog("Updating profile", { fields: Object.keys(filteredData) });

  const accessToken = await getAccessTokenRSC();
  return fetchJsonWithAuth<AccountInfo>({
    url: `${API_BASE()}/api/my-account/profile`,
    accessToken,
    method: "PATCH",
    body: filteredData,
    operationName: "更新个人资料",
  });
}

// ============ Verification ============

/**
 * 验证密码
 */
export async function verifyPassword(password: string): Promise<VerificationResponse> {
  const accessToken = await getAccessTokenRSC();
  return fetchJsonWithAuth<VerificationResponse>({
    url: `${API_BASE()}/api/verifications/password`,
    accessToken,
    method: "POST",
    body: { password },
    operationName: "密码验证",
  });
}

/**
 * 发送验证码
 */
export async function sendVerificationCode(
  type: "email" | "phone",
  value: string
): Promise<VerificationCodeResponse> {
  const accessToken = await getAccessTokenRSC();
  return fetchJsonWithAuth<VerificationCodeResponse>({
    url: `${API_BASE()}/api/verifications/verification-code`,
    accessToken,
    method: "POST",
    body: { identifier: { type, value } },
    operationName: "发送验证码",
  });
}

/**
 * 验证验证码
 */
export async function verifyCode(
  type: "email" | "phone",
  value: string,
  verificationId: string,
  code: string
): Promise<VerificationResponse> {
  const accessToken = await getAccessTokenRSC();
  return fetchJsonWithAuth<VerificationResponse>({
    url: `${API_BASE()}/api/verifications/verification-code/verify`,
    accessToken,
    method: "POST",
    body: { identifier: { type, value }, verificationId, code },
    operationName: "验证码验证",
  });
}

// ============ Password ============

/**
 * 更新密码
 */
export async function updatePassword(
  newPassword: string,
  verificationRecordId: string
): Promise<void> {
  const accessToken = await getAccessTokenRSC();
  await fetchVoidWithAuth({
    url: `${API_BASE()}/api/my-account/password`,
    accessToken,
    method: "POST",
    body: { password: newPassword },
    headers: { "logto-verification-id": verificationRecordId },
    operationName: "密码更新",
  });
}

// ============ Email & Phone ============

/**
 * 更新主邮箱
 */
export async function updatePrimaryEmail(
  email: string,
  identityVerificationId: string,
  newEmailVerificationId: string
): Promise<void> {
  const accessToken = await getAccessTokenRSC();
  await fetchVoidWithAuth({
    url: `${API_BASE()}/api/my-account/primary-email`,
    accessToken,
    method: "PATCH",
    body: { email, newIdentifierVerificationRecordId: newEmailVerificationId },
    headers: { "logto-verification-id": identityVerificationId },
    operationName: "邮箱更新",
  });
}

/**
 * 移除主邮箱
 */
export async function removePrimaryEmail(verificationRecordId: string): Promise<void> {
  const accessToken = await getAccessTokenRSC();
  await fetchVoidWithAuth({
    url: `${API_BASE()}/api/my-account/primary-email`,
    accessToken,
    method: "DELETE",
    headers: { "logto-verification-id": verificationRecordId },
    operationName: "邮箱移除",
  });
}

/**
 * 更新主手机
 */
export async function updatePrimaryPhone(
  phone: string,
  identityVerificationId: string,
  newPhoneVerificationId: string
): Promise<void> {
  const accessToken = await getAccessTokenRSC();
  await fetchVoidWithAuth({
    url: `${API_BASE()}/api/my-account/primary-phone`,
    accessToken,
    method: "PATCH",
    body: { phone, newIdentifierVerificationRecordId: newPhoneVerificationId },
    headers: { "logto-verification-id": identityVerificationId },
    operationName: "手机号更新",
  });
}

/**
 * 移除主手机
 */
export async function removePrimaryPhone(verificationRecordId: string): Promise<void> {
  const accessToken = await getAccessTokenRSC();
  await fetchVoidWithAuth({
    url: `${API_BASE()}/api/my-account/primary-phone`,
    accessToken,
    method: "DELETE",
    headers: { "logto-verification-id": verificationRecordId },
    operationName: "手机号移除",
  });
}

// ============ MFA ============

/**
 * 生成 TOTP 密钥
 */
export async function generateTotpSecret(): Promise<TotpSecretResponse> {
  const accessToken = await getAccessTokenRSC();
  return fetchJsonWithAuth<TotpSecretResponse>({
    url: `${API_BASE()}/api/my-account/mfa-verifications/totp-secret/generate`,
    accessToken,
    method: "POST",
    operationName: "TOTP 密钥生成",
  });
}

/**
 * 绑定 MFA 因子
 */
export async function bindMfaFactor(
  type: "Totp" | "WebAuthn" | "BackupCode",
  verificationRecordId: string,
  secret?: string,
  codes?: string[]
): Promise<void> {
  const accessToken = await getAccessTokenRSC();

  const body: Record<string, unknown> = { type };
  if (secret) body.secret = secret;
  if (codes) body.codes = codes;
  if (type !== "BackupCode") {
    body.newIdentifierVerificationRecordId = verificationRecordId;
  }

  await fetchVoidWithAuth({
    url: `${API_BASE()}/api/my-account/mfa-verifications`,
    accessToken,
    method: "POST",
    body,
    headers: { "logto-verification-id": verificationRecordId },
    operationName: "MFA 因子绑定",
  });
}

/**
 * 获取所有 MFA 验证因子
 */
export async function getMfaVerifications(): Promise<MfaVerification[]> {
  const accessToken = await getAccessTokenRSC();
  return fetchJsonWithAuth<MfaVerification[]>({
    url: `${API_BASE()}/api/my-account/mfa-verifications`,
    accessToken,
    operationName: "获取 MFA 验证因子",
  });
}

/**
 * 删除 MFA 验证因子
 */
export async function deleteMfaVerification(
  verificationId: string,
  identityVerificationId: string
): Promise<void> {
  const accessToken = await getAccessTokenRSC();
  await fetchVoidWithAuth({
    url: `${API_BASE()}/api/my-account/mfa-verifications/${verificationId}`,
    accessToken,
    method: "DELETE",
    headers: { "logto-verification-id": identityVerificationId },
    operationName: "MFA 验证因子删除",
  });
}

/**
 * 生成备份码
 */
export async function generateBackupCodes(): Promise<BackupCodesResponse> {
  const accessToken = await getAccessTokenRSC();
  return fetchJsonWithAuth<BackupCodesResponse>({
    url: `${API_BASE()}/api/my-account/mfa-verifications/backup-codes/generate`,
    accessToken,
    method: "POST",
    operationName: "备份码生成",
  });
}

/**
 * 查看备份码状态
 */
export async function getBackupCodes(): Promise<BackupCodesStatusResponse> {
  const accessToken = await getAccessTokenRSC();
  return fetchJsonWithAuth<BackupCodesStatusResponse>({
    url: `${API_BASE()}/api/my-account/mfa-verifications/backup-codes`,
    accessToken,
    operationName: "获取备份码",
  });
}
