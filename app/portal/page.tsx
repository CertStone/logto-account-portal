"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ServiceCard } from "@/components/portal/service-card";
import { Search, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePublicConfig } from "@/hooks/use-public-config";
import type { Service, ServiceCategory } from "@/config/types";
import Link from "next/link";

// 服务状态类型
type ServiceStatus = "unknown" | "online" | "offline" | "checking";

interface ServiceHealth {
  status: ServiceStatus;
  latency?: number;
  lastChecked?: Date;
}

export default function PortalPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceHealth, setServiceHealth] = useState<Record<string, ServiceHealth>>({});
  const { data: runtimeConfig, loading: configLoading } = usePublicConfig();

  const runtimeServices = useMemo<Service[]>(
    () => runtimeConfig?.services ?? [],
    [runtimeConfig]
  );
  const runtimeCategories = useMemo<ServiceCategory[]>(
    () => runtimeConfig?.serviceCategories ?? [],
    [runtimeConfig]
  );

  const categoryNameById = useMemo(
    () => new Map(runtimeCategories.map((category) => [category.id, category.name])),
    [runtimeCategories]
  );

  // 按分类组织服务
  const servicesByCategory = useMemo(() => {
    return runtimeCategories
      .map((category) => ({
        ...category,
        services: runtimeServices.filter((s) => s.category === category.id),
      }))
      .filter((c) => c.services.length > 0);
  }, [runtimeCategories, runtimeServices]);

  // 根据搜索过滤服务
  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return runtimeServices;

    const query = searchQuery.toLowerCase();
    return runtimeServices.filter((s) => {
      const categoryName = categoryNameById.get(s.category) ?? s.category;
      return (
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        categoryName.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, runtimeServices, categoryNameById]);

  // 检查单个服务状态
  const checkServiceHealth = useCallback(async (serviceId: string, groupName: string, serviceName: string) => {
    setServiceHealth((prev) => ({
      ...prev,
      [serviceId]: { status: "checking" },
    }));

    const startTime = Date.now();
    try {
      // 使用 fetch 检查服务状态，设置较短的超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `/api/health-check?groupName=${encodeURIComponent(groupName)}&serviceName=${encodeURIComponent(serviceName)}`,
        {
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      if (response.ok) {
        setServiceHealth((prev) => ({
          ...prev,
          [serviceId]: { status: "online", latency, lastChecked: new Date() },
        }));
      } else {
        setServiceHealth((prev) => ({
          ...prev,
          [serviceId]: { status: "offline", latency, lastChecked: new Date() },
        }));
      }
    } catch {
      setServiceHealth((prev) => ({
        ...prev,
        [serviceId]: { status: "offline", lastChecked: new Date() },
      }));
    }
  }, []);

  // 检查所有服务状态
  const checkAllServices = useCallback(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setServiceHealth((prev) => {
        const next = { ...prev };
        runtimeServices.forEach((service) => {
          next[service.id] = {
            status: "offline",
            lastChecked: new Date(),
          };
        });
        return next;
      });
      return;
    }

    runtimeServices.forEach((service) => {
      const groupName = categoryNameById.get(service.category);
      if (groupName) {
        checkServiceHealth(service.id, groupName, service.name);
      }
    });
  }, [runtimeServices, categoryNameById, checkServiceHealth]);

  // 页面加载时检查服务状态
  useEffect(() => {
    if (runtimeServices.length === 0) {
      return;
    }

    checkAllServices();
    // 每 60 秒自动刷新一次
    const interval = setInterval(checkAllServices, 60000);
    return () => clearInterval(interval);
  }, [checkAllServices, runtimeServices]);

  useEffect(() => {
    const onOnline = () => checkAllServices();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [checkAllServices]);

  const hasSearch = searchQuery.trim().length > 0;
  const hasPopular = runtimeServices.some((s) => s.isPopular);

  if (configLoading && !runtimeConfig) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载服务配置中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">服务门户</h1>
        <p className="mt-2 text-muted-foreground">
          一站式访问您所有的工作和生活服务
        </p>
        <div className="mt-4">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">进入账户中心</Button>
          </Link>
        </div>

        {/* Search */}
        <div className="mx-auto mt-6 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索服务..."
              className="pl-9 pr-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {hasSearch && (
            <p className="mt-2 text-sm text-muted-foreground">
              找到 {filteredServices.length} 个服务
            </p>
          )}
        </div>
      </div>

      {/* Search Results */}
      {hasSearch ? (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">搜索结果</h2>
            <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
              清除搜索
            </Button>
          </div>
          {filteredServices.length > 0 ? (
            <div className="grid items-stretch gap-4 lg:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  health={serviceHealth[service.id]}
                />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">没有找到匹配的服务</p>
            </Card>
          )}
        </div>
      ) : (
        <>
          {/* Featured Services */}
          {hasPopular && (
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                  热门
                </Badge>
                <h2 className="text-lg font-semibold">常用服务</h2>
              </div>
              <div className="grid items-stretch gap-4 lg:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {runtimeServices
                  .filter((s) => s.isPopular)
                  .map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      health={serviceHealth[service.id]}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Services by Category */}
          {servicesByCategory.map((category) => (
            <div key={category.id}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <span className="text-sm font-medium">{category.name[0]}</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{category.name}</h2>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
              </div>
              <div className="grid items-stretch gap-4 lg:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {category.services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    health={serviceHealth[service.id]}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* All Services */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">全部服务</h2>
              <Button variant="ghost" size="sm" onClick={checkAllServices}>
                刷新状态
              </Button>
            </div>
            <div className="grid items-stretch gap-4 lg:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {runtimeServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  health={serviceHealth[service.id]}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Footer Info */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">关于服务门户</CardTitle>
          <CardDescription>
            服务门户汇集了所有接入 Logto 身份认证的服务
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            所有服务均使用统一的身份认证，无需重复登录。如果您需要访问新的服务，请联系管理员添加。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
