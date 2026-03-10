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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const startTime = Date.now();

    const response = await fetch(parsedTarget.toString(), {
      method: "HEAD",
      signal: controller.signal,
      redirect: "manual",
    });

    clearTimeout(timeoutId);

    return {
      serviceId,
      groupName,
      serviceName: service.name,
      status: response.status < 400 ? "online" : "offline",
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
  }
}

async function refreshAllServices(): Promise<void> {
  if (state.isRefreshing) {
    return;
  }

  state.isRefreshing = true;
  try {
    const snapshots = await Promise.all(services.map((service) => probeSingleService(service.id)));
    for (const snapshot of snapshots) {
      state.snapshots[snapshot.serviceId] = snapshot;
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

export async function ensureHealthMonitorStarted(): Promise<void> {
  if (!state.initializedAt) {
    state.initializedAt = new Date().toISOString();
    await refreshAllServices();
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
