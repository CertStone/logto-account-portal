import { serviceCategories, services } from "@/config/services";

export type ServiceHealthStatus = "unknown" | "online" | "offline";

export interface ServiceHealthSnapshot {
  serviceId: string;
  groupName: string;
  serviceName: string;
  status: ServiceHealthStatus;
  statusCode?: number;
  latency?: number;
  checkedAt: string;
  error?: string;
}

interface HealthMonitorState {
  snapshots: Record<string, ServiceHealthSnapshot>;
  intervalId?: NodeJS.Timeout;
  isRefreshing: boolean;
  initializedAt?: string;
}

const REFRESH_INTERVAL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 5_000;
/** Max concurrent health-check probes to avoid overwhelming the network */
const MAX_CONCURRENT_PROBES = 5;
const HEAD_FALLBACK_STATUS = new Set([405, 501]);

const state: HealthMonitorState = {
  snapshots: {},
  isRefreshing: false,
};

function getGroupName(categoryId: string): string {
  const category = serviceCategories.find((item) => item.id === categoryId);
  return category?.name ?? categoryId;
}

async function probeSingleService(serviceId: string): Promise<ServiceHealthSnapshot> {
  const service = services.find((item) => item.id === serviceId);
  if (!service) {
    throw new Error(`Service not found: ${serviceId}`);
  }

  const targetUrl = service.ping || service.href;
  const checkedAt = new Date().toISOString();
  const groupName = getGroupName(service.category);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const parsedTarget = new URL(targetUrl);
    if (!parsedTarget.protocol.startsWith("http")) {
      return {
        serviceId,
        groupName,
        serviceName: service.name,
        status: "offline",
        checkedAt,
        error: "Unsupported protocol",
      };
    }

    const startTime = Date.now();

    let response = await fetch(parsedTarget.toString(), {
      method: "HEAD",
      signal: controller.signal,
      redirect: "manual",
      cache: "no-store",
    });

    if (HEAD_FALLBACK_STATUS.has(response.status)) {
      response = await fetch(parsedTarget.toString(), {
        method: "GET",
        signal: controller.signal,
        redirect: "manual",
        cache: "no-store",
      });
    }

    return {
      serviceId,
      groupName,
      serviceName: service.name,
      // 可达性优先：收到响应且状态码 < 500 视为在线（401/403/404/405 等常见于受保护服务）
      status: response.status < 500 ? "online" : "offline",
      statusCode: response.status,
      latency: Date.now() - startTime,
      checkedAt,
    };
  } catch (error) {
    return {
      serviceId,
      groupName,
      serviceName: service.name,
      status: "offline",
      checkedAt,
      error: error instanceof Error ? error.name : "Unknown error",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function refreshAllServices(): Promise<void> {
  if (state.isRefreshing) {
    return;
  }

  state.isRefreshing = true;
  try {
    // Probe in batches to avoid overwhelming the network
    for (let i = 0; i < services.length; i += MAX_CONCURRENT_PROBES) {
      const batch = services.slice(i, i + MAX_CONCURRENT_PROBES);
      const snapshots = await Promise.all(
        batch.map((service) => probeSingleService(service.id))
      );
      for (const snapshot of snapshots) {
        state.snapshots[snapshot.serviceId] = snapshot;
      }
    }
  } finally {
    state.isRefreshing = false;
  }
}

function startScheduler(): void {
  if (state.intervalId) {
    return;
  }

  state.intervalId = setInterval(() => {
    void refreshAllServices();
  }, REFRESH_INTERVAL_MS);
}

/**
 * Lazily initialize the health monitor: run the first full probe, then start
 * the periodic scheduler. `initializedAt` is only set **after** the first
 * refresh succeeds so that a transient failure allows a retry on the next call.
 */
export async function ensureHealthMonitorStarted(): Promise<void> {
  if (!state.initializedAt) {
    await refreshAllServices();
    state.initializedAt = new Date().toISOString();
  }

  startScheduler();
}

export async function getHealthSnapshot(serviceId: string): Promise<ServiceHealthSnapshot | null> {
  await ensureHealthMonitorStarted();
  return state.snapshots[serviceId] ?? null;
}

export async function getAllHealthSnapshots(): Promise<ServiceHealthSnapshot[]> {
  await ensureHealthMonitorStarted();
  return Object.values(state.snapshots);
}
