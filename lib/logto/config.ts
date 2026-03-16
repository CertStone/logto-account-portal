/**
 * Logto 配置
 */

import { LogtoNextConfig } from "@logto/next";

/**
 * Logto SDK 配置
 */
export const logtoConfig: LogtoNextConfig = {
  endpoint: process.env.LOGTO_ENDPOINT!,
  appId: process.env.LOGTO_APP_ID!,
  appSecret: process.env.LOGTO_APP_SECRET!,
  baseUrl:
    process.env.NODE_ENV === "production"
      ? process.env.BASE_URL_PROD!
      : process.env.BASE_URL_DEV!,
  cookieSecret: process.env.LOGTO_COOKIE_SECRET!,
  cookieSecure: process.env.NODE_ENV === "production",
  scopes: [
    "openid",
    "profile",
    "email",
    "phone",
    "custom_data",
    "identities",
  ],
};

/**
 * Management API (M2M) 配置
 */
export const managementAPIConfig = {
  clientId: process.env.LOGTO_M2M_CLIENT_ID!,
  clientSecret: process.env.LOGTO_M2M_CLIENT_SECRET!,
  logtoEndpoint: process.env.LOGTO_ENDPOINT!,
};

/**
 * 验证必要的环境变量
 */
export function validateLogtoConfig(): void {
  const required = [
    "LOGTO_ENDPOINT",
    "LOGTO_APP_ID",
    "LOGTO_APP_SECRET",
    "LOGTO_COOKIE_SECRET",
    process.env.NODE_ENV === "production" ? "BASE_URL_PROD" : "BASE_URL_DEV",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required Logto environment variables: ${missing.join(", ")}`);
  }
}
