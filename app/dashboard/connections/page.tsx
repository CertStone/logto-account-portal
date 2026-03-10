"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Link2,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Globe,
} from "lucide-react";
import {
  FaGoogle,
  FaGithub,
  FaApple,
  FaDiscord,
  FaSlack,
  FaLinkedin,
  FaWeixin,
  FaQq,
} from "react-icons/fa";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "@/lib/i18n/client";

type SocialIdentity = {
  target: string;
  identity?: {
    details?: {
      name?: string;
      email?: string;
    };
  };
};

type Connector = {
  target: string;
  connectorId?: string;
  name: string;
  icon?: string;
  description?: string;
};

const iconStyleByKey: Record<string, string> = {
  google: "bg-white text-[#4285F4] shadow-sm",
  github: "bg-gray-900 text-white",
  apple: "bg-black text-white",
  discord: "bg-indigo-600 text-white",
  slack: "bg-[#4A154B] text-white",
  linkedin: "bg-[#0A66C2] text-white",
  wechat: "bg-[#07C160] text-white",
  qq: "bg-[#12B7F5] text-white",
};

function resolveConnectorVisual(icon: string | undefined) {
  switch ((icon || "").toLowerCase()) {
    case "google":
      return {
        className: iconStyleByKey.google,
        element: <FaGoogle className="h-6 w-6" />,
      };
    case "github":
      return {
        className: iconStyleByKey.github,
        element: <FaGithub className="h-6 w-6" />,
      };
    case "apple":
      return {
        className: iconStyleByKey.apple,
        element: <FaApple className="h-6 w-6" />,
      };
    case "discord":
      return {
        className: iconStyleByKey.discord,
        element: <FaDiscord className="h-6 w-6" />,
      };
    case "slack":
      return {
        className: iconStyleByKey.slack,
        element: <FaSlack className="h-6 w-6" />,
      };
    case "linkedin":
      return {
        className: iconStyleByKey.linkedin,
        element: <FaLinkedin className="h-6 w-6" />,
      };
    case "wechat":
      return {
        className: iconStyleByKey.wechat,
        element: <FaWeixin className="h-6 w-6" />,
      };
    case "qq":
      return {
        className: iconStyleByKey.qq,
        element: <FaQq className="h-6 w-6" />,
      };
    default:
      return {
        className: "bg-muted",
        element: <Globe className="h-6 w-6" />,
      };
  }
}

export default function ConnectionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslations();
  const [identities, setIdentities] = useState<{
    socialIdentities: SocialIdentity[];
    ssoIdentities: unknown[];
    availableConnectors: Connector[];
  }>({ socialIdentities: [], ssoIdentities: [], availableConnectors: [] });
  const [loading, setLoading] = useState(true);
  const [unlinkDialog, setUnlinkDialog] = useState<{
    open: boolean;
    target: string;
    name: string;
  }>({ open: false, target: "", name: "" });
  const [unlinking, setUnlinking] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/account/identities");
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || t("toast.loadErrorDesc"));
      }

      setIdentities({
        socialIdentities: data.socialIdentities || [],
        ssoIdentities: data.ssoIdentities || [],
        availableConnectors: data.availableConnectors || [],
      });
    } catch (error) {
      console.error("Failed to fetch social data:", error);
      toast({
        variant: "destructive",
        title: t("toast.loadError"),
        description: error instanceof Error ? error.message : t("toast.loadErrorDesc"),
      });
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (searchParams.get("show_success") === "social") {
      toast({
        title: t("connections.bindSuccess"),
        description: t("connections.bindSuccessDesc"),
      });

      const url = new URL(window.location.href);
      url.searchParams.delete("show_success");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, toast, t]);

  const handleConnectSocial = (target: string) => {
    router.push(`/dashboard/connections/social/${encodeURIComponent(target)}`);
  };

  const handleUnlinkSocial = async () => {
    // Capture name before clearing dialog state — the closure would still hold
    // the old value, but being explicit avoids subtle bugs if code is refactored.
    const nameToShow = unlinkDialog.name;
    setUnlinking(true);

    try {
      const res = await fetch(
        `/api/account/identities?target=${encodeURIComponent(unlinkDialog.target)}`,
        { method: "DELETE" }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || t("toast.unlinkError"));
      }

      setUnlinkDialog({ open: false, target: "", name: "" });
      await fetchData();

      toast({
        title: t("connections.unlinkSuccess"),
        description: t("connections.unlinkSuccessDesc", { name: nameToShow }),
      });
    } catch (error) {
      console.error("Unlink error:", error);
      setUnlinking(false);

      toast({
        variant: "destructive",
        title: t("toast.unlinkError"),
        description: error instanceof Error ? error.message : t("toast.unknownError"),
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  const connectedTargets = new Set(identities.socialIdentities.map((i) => i.target));
  const unconnectedConnectors = identities.availableConnectors.filter(
    (connector) => !connectedTargets.has(connector.target)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("connections.title")}</h1>
        <p className="text-muted-foreground">{t("connections.description")}</p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t("connections.note")}</AlertTitle>
        <AlertDescription>
          {t("connections.warning")}
        </AlertDescription>
      </Alert>

      {identities.socialIdentities.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <CardTitle>{t("connections.connected")}</CardTitle>
            </div>
            <CardDescription>{t("connections.connectedDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {identities.socialIdentities.map((identity, idx) => {
              const connector = identities.availableConnectors.find(
                (c) => c.target === identity.target
              );
              const connectorName = connector?.name || identity.target;
              const visual = resolveConnectorVisual(connector?.icon);

              return (
                <div key={`${identity.target}-${idx}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full ${visual.className}`}
                      >
                        {visual.element}
                      </div>
                      <div>
                        <p className="font-medium">{connectorName}</p>
                        {identity.identity?.details && (
                          <div className="text-sm text-muted-foreground">
                            <p>{identity.identity.details.name}</p>
                            <p>{identity.identity.details.email}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {t("connections.connectedBadge")}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setUnlinkDialog({
                            open: true,
                            target: identity.target,
                            name: connectorName,
                          })
                        }
                      >
                        {t("connections.unlink")}
                      </Button>
                    </div>
                  </div>
                  {idx < identities.socialIdentities.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {identities.availableConnectors.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle>{t("connections.available")}</CardTitle>
            </div>
            <CardDescription>{t("connections.availableDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {unconnectedConnectors.map((connector, idx) => {
              const visual = resolveConnectorVisual(connector.icon);

              return (
                <div key={connector.target}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full ${visual.className}`}
                      >
                        {visual.element}
                      </div>
                      <div>
                        <p className="font-medium">{connector.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {connector.description || t("connections.bindAccount", { name: connector.name })}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleConnectSocial(connector.target)}>
                      {t("connections.bind")}
                    </Button>
                  </div>
                  {idx < unconnectedConnectors.length - 1 && <Separator className="mt-4" />}
                </div>
              );
            })}

            {unconnectedConnectors.length === 0 && (
              <p className="text-center text-muted-foreground">{t("connections.allConnected")}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">{t("connections.about.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t("connections.about.quickLogin")}</span>
            </li>
            <li className="flex items-start gap-2">
              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t("connections.about.privacy")}</span>
            </li>
            <li className="flex items-start gap-2">
              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t("connections.about.control")}</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Dialog
        open={unlinkDialog.open}
        onOpenChange={(open) => {
          if (!unlinking) setUnlinkDialog((prev) => ({ ...prev, open }));
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("connections.confirmUnlink")}</DialogTitle>
            <DialogDescription>
              {t("connections.confirmUnlinkDesc", { name: unlinkDialog.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={unlinking}
              onClick={() => setUnlinkDialog({ open: false, target: "", name: "" })}
            >
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleUnlinkSocial} disabled={unlinking}>
              {unlinking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("connections.confirmUnlink")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
