import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSocialVerification, getLogtoContext, getSocialConnectorByTarget } from "@/lib/logto";
import { SocialStartSchema } from "@/lib/schemas";
import { isFeatureEnabled } from "@/config/features";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const SOCIAL_BINDING_COOKIE_PREFIX = "social_binding_";
const SOCIAL_BINDING_TTL_SECONDS = 10 * 60;
const AUTHORIZATION_URI_TTL_SECONDS = 5 * 60;

function getCookieName(target: string): string {
  return `${SOCIAL_BINDING_COOKIE_PREFIX}${encodeURIComponent(target)}`;
}

function getHeaderFirstValue(headers: Headers, key: string): string | undefined {
  const raw = headers.get(key);
  if (!raw) {
    return undefined;
  }

  const first = raw.split(",")[0]?.trim();
  return first || undefined;
}

function resolveAppOrigin(request: Request): string {
  // Priority 1: Explicit callback base URL
  const callbackBaseUrl = process.env.SOCIAL_BINDING_CALLBACK_BASE_URL;

  if (callbackBaseUrl) {
    try {
      return new URL(callbackBaseUrl).origin.replace(/\/$/, "");
    } catch {
      logger.warn("Invalid SOCIAL_BINDING_CALLBACK_BASE_URL, fallback to next source", {
        callbackBaseUrl,
      });
    }
  }

  // Priority 2 (production): Use BASE_URL / BASE_URL_PROD before trusting headers
  if (process.env.NODE_ENV === "production") {
    const prodBaseUrl = process.env.BASE_URL ?? process.env.BASE_URL_PROD;
    if (prodBaseUrl) {
      try {
        return new URL(prodBaseUrl).origin.replace(/\/$/, "");
      } catch {
        logger.warn("Invalid BASE_URL/BASE_URL_PROD value", { prodBaseUrl });
      }
    }
  }

  // Priority 3: Forwarded headers (warn in production)
  const forwardedHost =
    getHeaderFirstValue(request.headers, "x-forwarded-host") ??
    getHeaderFirstValue(request.headers, "host");

  if (forwardedHost) {
    if (process.env.NODE_ENV === "production") {
      logger.warn("Social redirect origin resolved from request headers in production. Set BASE_URL or SOCIAL_BINDING_CALLBACK_BASE_URL for safety.", { forwardedHost });
    }
    const forwardedProto = getHeaderFirstValue(request.headers, "x-forwarded-proto");
    const protocol = forwardedProto ?? (process.env.NODE_ENV === "production" ? "https" : "http");

    return `${protocol}://${forwardedHost}`.replace(/\/$/, "");
  }

  // Priority 4: Dev BASE_URL
  const devBaseUrl = process.env.BASE_URL_DEV;
  if (devBaseUrl) {
    try {
      return new URL(devBaseUrl).origin.replace(/\/$/, "");
    } catch {
      logger.warn("Invalid BASE_URL_DEV value, fallback to request origin", {
        devBaseUrl,
      });
    }
  }

  // Final fallback
  return new URL(request.url).origin.replace(/\/$/, "");
}

function isLocalhostOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function resolveRedirectUri(request: Request, target: string): string {
  const origin = resolveAppOrigin(request);

  if (isLocalhostOrigin(origin)) {
    logger.warn("Social redirect is using localhost origin", { origin, target });
  }

  return `${origin}/dashboard/connections/social/callback?target=${encodeURIComponent(target)}`;
}

function isRedirectUriConfigError(message: string): boolean {
  return /(invalid[_\s-]?redirect[_\s-]?uri|redirect[_\s-]?uri[^\n]*illegal)/i.test(message);
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
    const parseResult = SocialStartSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "无效的请求参数" },
        { status: 400 }
      );
    }

    const { target } = parseResult.data;
    const connector = getSocialConnectorByTarget(target);

    if (!connector) {
      return NextResponse.json(
        { error: `不支持的社交连接器: ${target}` },
        { status: 404 }
      );
    }

    if (!connector.connectorId) {
      return NextResponse.json(
        { error: `连接器 ${target} 未配置 connectorId` },
        { status: 400 }
      );
    }

    const state = crypto.randomUUID();
    const redirectUri = resolveRedirectUri(request, target);

    const verification = await createSocialVerification(
      connector.connectorId,
      state,
      redirectUri
    );

    const expiresAtMs = Number.parseInt(verification.expiresAt, 10);
    const now = Date.now();
    const expiresInSeconds = Number.isFinite(expiresAtMs)
      ? Math.max(1, Math.floor((expiresAtMs - now) / 1000))
      : SOCIAL_BINDING_TTL_SECONDS;

    const cookieStore = await cookies();
    cookieStore.set(getCookieName(target), JSON.stringify({
      state,
      verificationRecordId: verification.verificationRecordId,
      redirectUri,
    }), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.min(SOCIAL_BINDING_TTL_SECONDS, Math.max(AUTHORIZATION_URI_TTL_SECONDS, expiresInSeconds)),
    });

    return NextResponse.json({
      authorizationUri: verification.authorizationUri,
    });
  } catch (error) {
    logger.error("Start social binding error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (isRedirectUriConfigError(errorMessage)) {
      return NextResponse.json(
        {
          error: "redirect_uri 不合法。当前使用的是应用回调地址，请在第三方平台白名单中注册：{应用域名}/dashboard/connections/social/callback，并确保与实际协议/域名/端口完全一致。",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
