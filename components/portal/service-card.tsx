"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import type { Service } from "@/config/types";
import { useTranslations } from "@/lib/i18n/client";
import { resolveIconSource } from "@/lib/icon-resolver";
import { IconImageFallback } from "@/components/shared/icon-image-fallback";

type ServiceStatus = "unknown" | "online" | "offline" | "checking";

interface ServiceHealth {
  status: ServiceStatus;
  latency?: number;
  lastChecked?: Date;
}

interface ServiceCardProps {
  service: Service;
  health?: ServiceHealth;
}

export function ServiceCard({ service, health }: ServiceCardProps) {
  const { t } = useTranslations();

  const resolvedIcon = resolveIconSource(service.icon);

  // Status indicator
  const renderStatus = () => {
    if (!service.ping) return null;

    switch (health?.status) {
      case "online":
        return (
          <Badge variant="default" className="gap-1 bg-green-500 hover:bg-green-600">
            <CheckCircle className="h-3 w-3" />
            {health.latency && health.latency < 1000
              ? `${health.latency}ms`
              : t("service.status.normal")}
          </Badge>
        );
      case "offline":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            {t("service.status.offline")}
          </Badge>
        );
      case "checking":
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t("service.status.checking")}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            {t("service.status.unknown")}
          </Badge>
        );
    }
  };

  return (
    <a
      href={service.href}
      target="_blank"
      rel="noopener noreferrer"
      className="block h-full"
    >
      <Card className="group h-full cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-600/10 text-blue-600 transition-colors group-hover:from-blue-500/20 group-hover:to-purple-600/20 dark:text-blue-400">
              {resolvedIcon ? (
                <IconImageFallback
                  src={resolvedIcon}
                  alt={`${service.name} icon`}
                  className="h-6 w-6 rounded-sm object-contain"
                  fallback={<Globe className="h-6 w-6" />}
                />
              ) : null}
              {!resolvedIcon ? <Globe className="h-6 w-6" /> : null}
            </div>
            <div className="flex gap-1">
              {service.isNew && (
                <Badge variant="secondary" className="text-xs">
                  New
                </Badge>
              )}
              {service.isPopular && (
                <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-xs text-white">
                  {t("portal.popular")}
                </Badge>
              )}
              {renderStatus()}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <h3 className="min-h-7 line-clamp-1 text-lg font-semibold">{service.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {service.description}
          </p>
        </CardContent>
      </Card>
    </a>
  );
}
