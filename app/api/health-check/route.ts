import { NextResponse } from "next/server";
import { serviceCategories, services } from "@/config/services";
import { HealthCheckQuerySchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

function isExpectedNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const anyError = error as Error & { code?: string; cause?: unknown };
  const code = anyError.code;
  const causeCode =
    typeof anyError.cause === "object" && anyError.cause && "code" in anyError.cause
      ? String((anyError.cause as { code?: string }).code)
      : undefined;

  const normalizedMessage = error.message.toLowerCase();
  const expectedCodes = new Set(["ENOTFOUND", "EAI_AGAIN", "ETIMEDOUT", "ECONNREFUSED", "ECONNRESET"]);

  if ((code && expectedCodes.has(code)) || (causeCode && expectedCodes.has(causeCode))) {
    return true;
  }

  return normalizedMessage.includes("fetch failed") || normalizedMessage.includes("network");
}

/**
 * 健康检查代理
 * GET /api/health-check?groupName=公开服务&serviceName=Gotify%20推送
 *
 * 仅允许基于配置中的服务名进行探测，避免用户控制目标 URL
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parseResult = HealthCheckQuerySchema.safeParse({
    groupName: searchParams.get("groupName"),
    serviceName: searchParams.get("serviceName"),
  });

  if (!parseResult.success) {
    return NextResponse.json({ error: "缺少或无效的 groupName/serviceName 参数" }, { status: 400 });
  }

  const { groupName, serviceName } = parseResult.data;
  const category = serviceCategories.find((item) => item.name === groupName);

  if (!category) {
    return NextResponse.json({ error: "未找到对应服务分组" }, { status: 404 });
  }

  const service = services.find(
    (item) => item.category === category.id && item.name === serviceName
  );

  if (!service) {
    return NextResponse.json({ error: "未找到对应服务" }, { status: 404 });
  }

  const targetUrl = service.ping || service.href;

  try {
    const parsedTarget = new URL(targetUrl);
    if (!["http:", "https:"].includes(parsedTarget.protocol)) {
      return NextResponse.json({ error: "目标服务地址协议不受支持" }, { status: 400 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const startTime = Date.now();
    const response = await fetch(parsedTarget.toString(), {
      method: "HEAD",
      signal: controller.signal,
      // 不跟随重定向，只检查是否可达
      redirect: "manual",
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    // 2xx 和 3xx 都认为是在线的
    const isOnline = response.status < 400;

    return NextResponse.json({
      groupName,
      serviceName,
      serviceId: service.id,
      status: isOnline ? "online" : "offline",
      statusCode: response.status,
      latency,
    });
  } catch (error) {
    if (!isExpectedNetworkError(error)) {
      logger.debug("Health check failed unexpectedly", {
        serviceId: service.id,
        groupName,
        serviceName,
        error,
      });
    }

    // 超时或网络错误
    return NextResponse.json(
      {
        status: "offline",
        error: error instanceof Error ? error.name : "Unknown error",
      },
      { status: 503 }
    );
  }
}
