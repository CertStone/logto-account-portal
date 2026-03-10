import { NextResponse } from "next/server";
import { serviceCategories, services } from "@/config/services";
import { HealthCheckQuerySchema } from "@/lib/schemas";
import { getAllHealthSnapshots, getHealthSnapshot } from "@/lib/health-monitor";

/**
 * 健康检查代理
 * GET /api/health-check?groupName=公开服务&serviceName=Gotify%20推送
 * GET /api/health-check (返回所有缓存状态)
 *
 * 仅返回服务端定时探测缓存结果，不在请求路径中触发外部探测
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const hasSingleQuery = searchParams.has("groupName") || searchParams.has("serviceName");
  if (!hasSingleQuery) {
    const snapshots = await getAllHealthSnapshots();
    return NextResponse.json({ items: snapshots });
  }

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

  const snapshot = await getHealthSnapshot(service.id);
  if (!snapshot) {
    return NextResponse.json(
      {
        serviceId: service.id,
        groupName,
        serviceName,
        status: "unknown",
      },
      { status: 503 }
    );
  }

  const statusCode = snapshot.status === "online" ? 200 : 503;
  return NextResponse.json(snapshot, { status: statusCode });
}
