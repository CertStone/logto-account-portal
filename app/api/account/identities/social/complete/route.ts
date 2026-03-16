import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  addSocialIdentity,
  getLogtoContext,
  getSocialConnectorByTarget,
  LogtoApiError,
  verifySocialVerification,
} from "@/lib/logto";
import { SocialCompleteSchema } from "@/lib/schemas";
import { isFeatureEnabled } from "@/config/features";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const SOCIAL_BINDING_COOKIE_PREFIX = "social_binding_";
const SOCIAL_BINDING_TTL_SECONDS = 10 * 60;

interface SocialBindingSessionData {
  state?: string;
  verificationRecordId?: string;
  socialVerificationRecordId?: string;
  redirectUri?: string;
}

function getCookieName(target: string): string {
  return `${SOCIAL_BINDING_COOKIE_PREFIX}${encodeURIComponent(target)}`;
}

function tryParseCookieValue(
  raw: string | undefined
): SocialBindingSessionData | undefined {
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as SocialBindingSessionData;

    return parsed;
  } catch {
    return undefined;
  }
}

function persistSocialBindingSession(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  target: string,
  sessionData: SocialBindingSessionData
): void {
  cookieStore.set(getCookieName(target), JSON.stringify(sessionData), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SOCIAL_BINDING_TTL_SECONDS,
  });
}

function getErrorStatusCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const candidate = (error as { statusCode?: unknown }).statusCode;
  return typeof candidate === "number" ? candidate : undefined;
}

function isReAuthenticationRequired(errorMessage: string, statusCode?: number): boolean {
  if (statusCode !== 401) {
    return false;
  }

  return /re-authenticate|permission\s+denied/i.test(errorMessage);
}

function normalizeConnectorData(
  connectorData: Record<string, unknown>
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(connectorData)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value) && value.length === 1) {
      normalized[key] = value[0];
      continue;
    }

    normalized[key] = value;
  }

  return normalized;
}

function extractConnectorGeneralCode(error: unknown): string | undefined {
  if (!(error instanceof LogtoApiError)) {
    return undefined;
  }

  const detail = error.upstreamDetail;
  if (typeof detail !== "object" || detail === null) {
    return undefined;
  }

  const connectorErrorCode = (detail as { code?: unknown }).code;
  return typeof connectorErrorCode === "string" ? connectorErrorCode : undefined;
}

export async function POST(request: Request) {
  try {
    const { isAuthenticated } = await getLogtoContext();

    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isFeatureEnabled("socialIdentities")) {
      return NextResponse.json(
        { error: "社交身份功能未启用" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parseResult = SocialCompleteSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "无效的请求参数" },
        { status: 400 }
      );
    }

    const {
      target,
      state,
      connectorData,
      identityVerificationId,
    } = parseResult.data;

    const connector = getSocialConnectorByTarget(target);
    if (!connector) {
      return NextResponse.json(
        { error: `不支持的社交连接器: ${target}` },
        { status: 404 }
      );
    }

    const cookieStore = await cookies();
    const cookieName = getCookieName(target);
    const sessionData = tryParseCookieValue(cookieStore.get(cookieName)?.value);

    if (!sessionData?.state || !sessionData?.verificationRecordId) {
      return NextResponse.json(
        { error: "社交连接会话不存在或已过期，请重试" },
        { status: 400 }
      );
    }

    if (sessionData.state !== state) {
      logger.warn("Social binding state mismatch", {
        target,
        expectedState: sessionData.state,
        actualState: state,
      });

      cookieStore.delete(cookieName);

      return NextResponse.json(
        { error: "状态校验失败，请重试" },
        { status: 400 }
      );
    }

    const verifiedRecordId =
      sessionData.socialVerificationRecordId ??
      (
        await verifySocialVerification(
          sessionData.verificationRecordId,
          {
            ...normalizeConnectorData(connectorData),
            redirectUri:
              sessionData.redirectUri ??
              `${new URL(request.url).origin}/dashboard/connections/social/callback?target=${encodeURIComponent(target)}`,
          }
        )
      ).verificationRecordId;

    try {
      await addSocialIdentity(
        verifiedRecordId,
        identityVerificationId
      );
    } catch (addError) {
      const addErrorStatusCode = getErrorStatusCode(addError);
      const addErrorMessage = addError instanceof Error ? addError.message : "Unknown error";

      if (isReAuthenticationRequired(addErrorMessage, addErrorStatusCode)) {
        persistSocialBindingSession(cookieStore, target, {
          state: sessionData.state,
          verificationRecordId: sessionData.verificationRecordId,
          socialVerificationRecordId: verifiedRecordId,
          redirectUri: sessionData.redirectUri,
        });

        return NextResponse.json(
          {
            error: "当前操作需要重新验证身份，请输入密码后重试",
            code: "verification_record.permission_denied",
          },
          { status: 401 }
        );
      }

      throw addError;
    }

    cookieStore.delete(cookieName);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Complete social binding error:", error);

    const statusCode = getErrorStatusCode(error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("identity_already_in_use")) {
      return NextResponse.json(
        { error: "该社交账号已绑定到其他账户" },
        { status: 422 }
      );
    }

    if (isReAuthenticationRequired(errorMessage, statusCode)) {
      return NextResponse.json(
        {
          error: "当前操作需要重新验证身份，请输入密码后重试",
          code: "verification_record.permission_denied",
        },
        { status: 401 }
      );
    }

    const connectorGeneralCode = extractConnectorGeneralCode(error);
    if (statusCode === 400 && connectorGeneralCode === "connector.general") {
      return NextResponse.json(
        {
          error:
            "QQ 回调参数校验失败，请确认 QQ 互联中配置的网站回调域与当前应用回调地址一致，并重试。",
          code: "connector.general",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode ?? 500 }
    );
  }
}
