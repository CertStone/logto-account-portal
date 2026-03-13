import { getLogtoContext, getAccountInfo, AccountInfo, getMfaVerifications, getSocialIdentities } from "@/lib/logto";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import {
  UserCircle,
  Shield,
  Link2,
  ArrowRight,
  Calendar,
  Mail,
  Smartphone,
  Key,
  Globe,
} from "lucide-react";
import { normalizeLocale, t as translate } from "@/lib/i18n";

export default async function DashboardPage() {
  const { isAuthenticated, claims } = await getLogtoContext();
  let accountInfo: AccountInfo | { error: string } | null = null;
  let mfaVerifications: { type?: string }[] = [];
  let socialIdentities: { socialIdentities: unknown[] } = { socialIdentities: [] };

  if (isAuthenticated) {
    try {
      [accountInfo, mfaVerifications, socialIdentities] = await Promise.all([
        getAccountInfo(),
        getMfaVerifications().catch(() => []),
        getSocialIdentities().catch(() => ({ socialIdentities: [] })),
      ]);
    } catch {
      accountInfo = { error: "获取账户信息失败" };
    }
  }

  const displayInfo = accountInfo && !("error" in accountInfo) ? accountInfo : null;
  const locale = normalizeLocale(displayInfo?.profile?.locale);
  const tt = (key: string, params?: Record<string, string>) => translate(key, locale, params);
  const displayName = displayInfo?.name || claims?.name || displayInfo?.username || claims?.username || tt("common.user");

  const formatDate = (date: string | number | Date): string =>
    new Date(date).toLocaleString(locale === "en" ? "en-US" : "zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatRelativeTime = (date: string | number | Date): string => {
    const now = new Date().getTime();
    const target = new Date(date).getTime();
    const seconds = Math.floor((now - target) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 30) {
      return formatDate(date);
    }

    if (days > 0) {
      return tt("security.timeAgo.daysAgo", { count: String(days) });
    }

    if (hours > 0) {
      return tt("security.timeAgo.hoursAgo", { count: String(hours) });
    }

    if (minutes > 0) {
      return tt("security.timeAgo.minutesAgo", { count: String(minutes) });
    }

    return tt("security.timeAgo.justNow");
  };

  const hasMfa = mfaVerifications.length > 0;
  const socialCount = socialIdentities.socialIdentities.length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">账户概览</h1>
        <p className="text-muted-foreground">
          {tt("dashboard.description")}
        </p>
      </div>

      {/* Welcome Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-white/20">
              {(displayInfo?.avatar || claims?.picture) && (
                <AvatarImage 
                  src={displayInfo?.avatar || claims?.picture || ""} 
                  alt={displayName}
                />
              )}
              <AvatarFallback className="bg-white/20 text-xl font-bold text-white">
                {displayName.charAt(0) || tt("common.userInitial")}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">
                {tt("dashboard.welcome")}，{displayName}
              </h2>
              <p className="text-white/80">
                {tt("dashboard.lastSignIn")}: {displayInfo?.lastSignInAt ? formatRelativeTime(displayInfo.lastSignInAt) : tt("service.status.unknown")}
              </p>
            </div>
          </div>
        </div>
        <CardContent className="p-6">
          <div className="grid gap-4 lg:gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{tt("dashboard.email")}</p>
                <p className="font-medium">{displayInfo?.primaryEmail || tt("profile.notSet")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{tt("dashboard.phone")}</p>
                <p className="font-medium">{displayInfo?.primaryPhone || tt("profile.notSet")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{tt("dashboard.password")}</p>
                <Badge variant={displayInfo?.hasPassword ? "default" : "secondary"}>
                  {displayInfo?.hasPassword ? tt("dashboard.passwordSet") : tt("dashboard.passwordNotSet")}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{tt("dashboard.registerTime")}</p>
                <p className="font-medium">
                  {displayInfo?.createdAt ? formatDate(displayInfo.createdAt).split(" ")[0] : "-"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid items-stretch gap-4 lg:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/profile" className="h-full">
          <Card className="group h-full cursor-pointer transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-900/30">
                <UserCircle className="h-5 w-5" />
              </div>
               <CardTitle className="pt-3">{tt("dashboard.quickActions.profile")}</CardTitle>
               <CardDescription>{tt("dashboard.quickActions.profileDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" size="sm" className="gap-1 px-0 group-hover:gap-2 transition-all">
                 {tt("common.next")} <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/security" className="h-full">
          <Card className="group h-full cursor-pointer transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 transition-colors group-hover:bg-green-600 group-hover:text-white dark:bg-green-900/30">
                <Shield className="h-5 w-5" />
              </div>
               <CardTitle className="pt-3">{tt("dashboard.quickActions.security")}</CardTitle>
               <CardDescription>{tt("dashboard.quickActions.securityDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" size="sm" className="gap-1 px-0 group-hover:gap-2 transition-all">
                 {tt("common.next")} <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/connections" className="h-full">
          <Card className="group h-full cursor-pointer transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 transition-colors group-hover:bg-purple-600 group-hover:text-white dark:bg-purple-900/30">
                <Link2 className="h-5 w-5" />
              </div>
               <CardTitle className="pt-3">{tt("dashboard.quickActions.connections")}</CardTitle>
               <CardDescription>{tt("dashboard.quickActions.connectionsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" size="sm" className="gap-1 px-0 group-hover:gap-2 transition-all">
                 {tt("common.next")} <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/portal" className="h-full">
          <Card className="group h-full cursor-pointer transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600 transition-colors group-hover:bg-orange-600 group-hover:text-white dark:bg-orange-900/30">
                <Globe className="h-5 w-5" />
              </div>
               <CardTitle className="pt-3">{tt("dashboard.quickActions.portal")}</CardTitle>
               <CardDescription>{tt("dashboard.quickActions.portalDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" size="sm" className="gap-1 px-0 group-hover:gap-2 transition-all">
                 {tt("dashboard.quickActions.portal")} <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Security Status */}
      <Card>
        <CardHeader>
          <CardTitle>{tt("dashboard.securityStatus.title")}</CardTitle>
          <CardDescription>{tt("security.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-muted-foreground" />
                <span>{tt("dashboard.securityStatus.loginPassword")}</span>
              </div>
              <Badge variant={displayInfo?.hasPassword ? "default" : "destructive"}>
                {displayInfo?.hasPassword ? tt("dashboard.passwordSet") : tt("dashboard.passwordNotSet")}
              </Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <span>{tt("dashboard.securityStatus.mfa")}</span>
              </div>
              <Link href="/dashboard/security">
                <Badge variant={hasMfa ? "default" : "secondary"} className="cursor-pointer hover:bg-primary/90">
                  {hasMfa ? tt("security.mfa.mfaSetCount", { count: String(mfaVerifications.length) }) : tt("dashboard.passwordNotSet")}
                </Badge>
              </Link>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link2 className="h-5 w-5 text-muted-foreground" />
                <span>{tt("dashboard.securityStatus.socialBinding")}</span>
              </div>
              <Link href="/dashboard/connections">
                <Badge variant={socialCount > 0 ? "default" : "secondary"} className="cursor-pointer hover:bg-primary/90">
                  {socialCount > 0 ? tt("connections.connectedBadge") : tt("profile.notSet")}
                </Badge>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
