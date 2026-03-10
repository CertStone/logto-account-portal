"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ServiceCard } from "@/components/portal/service-card";
import { Search, Sparkles, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePublicConfig } from "@/hooks/use-public-config";
import type { Service, ServiceCategory } from "@/config/types";
import Link from "next/link";
import { useTranslations } from "@/lib/i18n/client";

// 服务状态类型
type ServiceStatus = "unknown" | "online" | "offline" | "checking";

interface ServiceHealth {
  status: ServiceStatus;
  latency?: number;
  lastChecked?: Date;
}

interface CachedHealthItem {
  serviceId: string;
  status: "unknown" | "online" | "offline";
  latency?: number;
  checkedAt: string;
}

export default function PortalPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceHealth, setServiceHealth] = useState<Record<string, ServiceHealth>>({});
  const { data: runtimeConfig, loading: configLoading, error: configError, refetch: refetchConfig } = usePublicConfig();
  const { t } = useTranslations();

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

  // 从服务端缓存读取服务状态
  const checkAllServices = useCallback(async () => {
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

    try {
      const response = await fetch("/api/health-check", { cache: "no-store" });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { items?: CachedHealthItem[] };
      const items = payload.items ?? [];

      const next: Record<string, ServiceHealth> = {};
      for (const item of items) {
        next[item.serviceId] = {
          status: item.status,
          latency: item.latency,
          lastChecked: item.checkedAt ? new Date(item.checkedAt) : undefined,
        };
      }

      setServiceHealth((prev) => ({ ...prev, ...next }));
    } catch {
      // 忽略缓存读取失败，保留现有状态
    }
  }, [runtimeServices]);

  // 页面加载时检查服务状态
  useEffect(() => {
    if (runtimeServices.length === 0) {
      return;
    }

    void checkAllServices();
    // 每 60 秒自动刷新一次
    const interval = setInterval(() => {
      void checkAllServices();
    }, 60000);
    return () => clearInterval(interval);
  }, [checkAllServices, runtimeServices]);

  useEffect(() => {
    const onOnline = () => {
      void checkAllServices();
    };
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
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (configError && !runtimeConfig) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
          <p className="font-medium">{t("toast.loadError")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {configError.message}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={refetchConfig}>
            {t("portal.retry")}
          </Button>
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
        <h1 className="text-3xl font-bold tracking-tight">{t("portal.title")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("portal.subtitle")}
        </p>
        <div className="mt-4">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">{t("portal.enterAccountCenter")}</Button>
          </Link>
        </div>

        {/* Search */}
        <div className="mx-auto mt-6 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("portal.searchPlaceholder")}
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
              {t("portal.searchResultCount", { count: String(filteredServices.length) })}
            </p>
          )}
        </div>
      </div>

      {/* Search Results */}
      {hasSearch ? (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("portal.searchResults")}</h2>
            <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
              {t("portal.clearSearch")}
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
              <p className="text-muted-foreground">{t("portal.noSearchResults")}</p>
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
                  {t("portal.popular")}
                </Badge>
                <h2 className="text-lg font-semibold">{t("portal.popularServices")}</h2>
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
              <h2 className="text-lg font-semibold">{t("portal.allServices")}</h2>
              <Button variant="ghost" size="sm" onClick={checkAllServices}>
                {t("portal.refreshStatus")}
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
          <CardTitle className="text-base">{t("portal.footerTitle")}</CardTitle>
          <CardDescription>
            {t("portal.footerDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("portal.footerContent")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
