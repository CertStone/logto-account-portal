"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "@/lib/i18n/client";
import {
  Key,
  Shield,
  Smartphone,
  History,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Monitor,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { AccountInfo, LoginHistoryRecord, MfaVerification } from "@/lib/logto";
import type { FeaturesConfig } from "@/config/types";
import { isFeatureEnabled as isFeatureEnabledFromConfig } from "@/lib/config/feature-helpers";
import { usePublicConfig } from "@/hooks/use-public-config";
import { accountCenterUrls, getAccountCenterSuccessType, clearAccountCenterSuccessParam } from "@/lib/logto-account-ui";

// 只显示最近 7 天的登录记录，最多 10 条
const MAX_LOGIN_HISTORY_DAYS = 7;
const MAX_LOGIN_HISTORY_ITEMS = 10;

export default function SecurityPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: runtimeConfig, loading: configLoading } = usePublicConfig();
  const { t, language } = useTranslations();
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryRecord[]>([]);
  const [mfaVerifications, setMfaVerifications] = useState<MfaVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [totpRemovalDialog, setTotpRemovalDialog] = useState({
    open: false,
    password: "",
    removing: false,
  });

  const runtimeFeatures = runtimeConfig?.features;
  const logtoEndpoint = runtimeConfig?.logtoEndpoint ?? undefined;
  const passwordAccountCenterUrl = accountCenterUrls.password("/dashboard/security", logtoEndpoint) ?? undefined;
  const authenticatorAppUrl = accountCenterUrls.authenticatorApp("/dashboard/security", logtoEndpoint) ?? undefined;
  const addPasskeyUrl = accountCenterUrls.addPasskey("/dashboard/security", logtoEndpoint) ?? undefined;
  const managePasskeyUrl = accountCenterUrls.managePasskey("/dashboard/security", logtoEndpoint) ?? undefined;
  const generateBackupCodesUrl =
    accountCenterUrls.generateBackupCodes("/dashboard/security", logtoEndpoint) ?? undefined;
  const manageBackupCodesUrl =
    accountCenterUrls.manageBackupCodes("/dashboard/security", logtoEndpoint) ?? undefined;

  const isFeatureEnabled = useCallback(
    (featureKey: keyof FeaturesConfig, subFeatureKey?: string): boolean => {
      if (!runtimeFeatures) {
        return false;
      }

      return isFeatureEnabledFromConfig(runtimeFeatures, featureKey, subFeatureKey);
    },
    [runtimeFeatures]
  );

  const fetchData = useCallback(async () => {
    try {
      const shouldFetchMfa =
        isFeatureEnabled("mfa", "totp") ||
        isFeatureEnabled("mfa", "backupCodes") ||
        isFeatureEnabled("mfa", "webAuthn") ||
        isFeatureEnabled("passkey");

      const [accountRes, historyRes, mfaRes] = await Promise.all([
        fetch("/api/account-info"),
        isFeatureEnabled("sessions") ? fetch("/api/account/sessions") : Promise.resolve(null),
        shouldFetchMfa ? fetch("/api/account/mfa") : Promise.resolve(null),
      ]);

      if (!accountRes.ok) {
        if (accountRes.status === 401) {
          router.push("/");
          return;
        }
        throw new Error("Failed to fetch account info");
      }
      const accountData = await accountRes.json();
      setAccountInfo(accountData);

      if (historyRes && historyRes.ok) {
        const historyData = await historyRes.json();
        // 过滤最近 7 天的记录，最多 10 条
        const cutoffTime = Date.now() - MAX_LOGIN_HISTORY_DAYS * 24 * 60 * 60 * 1000;
        const filtered = historyData
          .filter((record: LoginHistoryRecord) => record.timestamp >= cutoffTime)
          .slice(0, MAX_LOGIN_HISTORY_ITEMS);
        setLoginHistory(filtered);
      }

      if (mfaRes && mfaRes.ok) {
        const mfaData = await mfaRes.json();
        setMfaVerifications(mfaData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, [router, isFeatureEnabled]);

  // 检查 Account Center 返回的成功提示
  useEffect(() => {
    const successType = getAccountCenterSuccessType();
    if (successType) {
      const messages: Record<string, string> = {
        password: t("toast.passwordChanged"),
        email: t("toast.emailUpdated"),
        phone: t("toast.phoneUpdated"),
        username: t("toast.usernameUpdated"),
        mfa: t("toast.mfaUpdated"),
      };
      toast({
        title: t("toast.updateSuccess"),
        description: messages[successType] || t("toast.securitySettingsUpdated"),
      });
      clearAccountCenterSuccessParam();
      // 刷新账户信息
      fetchData();
    }
  }, [fetchData, toast, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 格式化时间
  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return t("security.timeAgo.justNow");
    if (seconds < 3600) return t("security.timeAgo.minutesAgo", { count: String(Math.floor(seconds / 60)) });
    if (seconds < 86400) return t("security.timeAgo.hoursAgo", { count: String(Math.floor(seconds / 3600)) });
    return t("security.timeAgo.daysAgo", { count: String(Math.floor(seconds / 86400)) });
  };

  const formatDateTime = (timestamp: number) =>
    new Date(timestamp).toLocaleString(language === "zh" ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

  // 获取 MFA 状态
  // 注意：Logto API 返回的 type 字段可能是 "Totp", "WebAuthn", "BackupCode"
  // 但实际返回的值可能大小写不同，这里使用大小写不敏感的匹配
  const getMfaStatus = () => {
    const totpEnabled = mfaVerifications.some(v => 
      v.type?.toLowerCase() === "totp"
    );
    const webAuthnEnabled = mfaVerifications.some(v => 
      v.type?.toLowerCase() === "webauthn"
    );
    const backupCodeEnabled = mfaVerifications.some(v => 
      v.type?.toLowerCase() === "backupcode"
    );
    
    return {
      hasMfa: mfaVerifications.length > 0,
      totpEnabled,
      webAuthnEnabled,
      backupCodeEnabled,
      hasOtherMfaMethod: totpEnabled || webAuthnEnabled,
    };
  };

  const mfaStatus = getMfaStatus();
  const totpVerification = mfaVerifications.find((verification) =>
    verification.type?.toLowerCase() === "totp"
  );

  const handleRemoveTotp = async () => {
    if (!totpVerification?.id) {
      toast({
        variant: "destructive",
        title: t("security.mfa.removeFailTitle"),
        description: t("security.mfa.removeFailDesc"),
      });
      return;
    }

    if (!totpRemovalDialog.password.trim()) {
      toast({
        variant: "destructive",
        title: t("security.mfa.removeFailTitle"),
        description: t("security.mfa.removePasswordRequired"),
      });
      return;
    }

    setTotpRemovalDialog((prev) => ({ ...prev, removing: true }));

    try {
      const verifyRes = await fetch("/api/verifications/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: totpRemovalDialog.password }),
      });

      const verifyData = await verifyRes.json().catch(() => ({}));

      if (!verifyRes.ok || !verifyData.verificationRecordId) {
        throw new Error(verifyData.error || t("security.mfa.removeFailDesc"));
      }

      const deleteRes = await fetch(
        `/api/account/mfa/${encodeURIComponent(totpVerification.id)}`,
        {
          method: "DELETE",
          headers: {
            "logto-verification-id": verifyData.verificationRecordId as string,
          },
        }
      );

      const deleteData = await deleteRes.json().catch(() => ({}));

      if (!deleteRes.ok) {
        throw new Error(deleteData.error || t("security.mfa.removeFailDesc"));
      }

      toast({
        title: t("security.mfa.removeSuccessTitle"),
        description: t("security.mfa.removeSuccessDesc"),
      });

      setTotpRemovalDialog({
        open: false,
        password: "",
        removing: false,
      });

      await fetchData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("security.mfa.removeFailTitle"),
        description: error instanceof Error ? error.message : t("security.mfa.removeFailDesc"),
      });
      setTotpRemovalDialog((prev) => ({ ...prev, removing: false }));
    }
  };

  if (loading || (configLoading && !runtimeConfig)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("security.title")}</h1>
        <p className="text-muted-foreground">
          {t("security.description")}
        </p>
      </div>

      {/* Password Section - 跳转到 Logto Account Center */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{t("security.password.title")}</CardTitle>
          </div>
          <CardDescription>
            {t("security.password.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {accountInfo?.hasPassword ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              <div>
                <p className="font-medium">
                  {accountInfo?.hasPassword ? t("security.password.set") : t("security.password.notSet")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {accountInfo?.hasPassword
                    ? t("security.password.advice")
                    : t("security.password.setAdvice")}
                </p>
              </div>
            </div>
            {passwordAccountCenterUrl ? (
              <Button variant="outline" asChild>
                <a href={passwordAccountCenterUrl} target="_self">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {accountInfo?.hasPassword ? t("security.password.changePassword") : t("security.password.setPassword")}
                </a>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                {t("security.featureDisabled")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* MFA Section - 跳转到 Logto Account Center UI */}
      {isFeatureEnabled("mfa", "totp") || isFeatureEnabled("passkey") ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <CardTitle>{t("security.mfa.title")}</CardTitle>
            </div>
            <CardDescription>
              {mfaStatus.hasMfa 
                ? t("security.mfa.mfaSetCount", { count: String(mfaVerifications.length) })
                : t("security.mfa.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* TOTP */}
            {isFeatureEnabled("mfa", "totp") && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {mfaStatus.totpEnabled ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">{t("security.mfa.totp")}</p>
                      <p className="text-sm text-muted-foreground">
                        {mfaStatus.totpEnabled 
                          ? t("security.mfa.totpEnabled")
                          : t("security.mfa.totpDesc")}
                      </p>
                    </div>
                  </div>
                  {!mfaStatus.totpEnabled && authenticatorAppUrl ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={authenticatorAppUrl} target="_self">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {t("security.mfa.setup")}
                      </a>
                    </Button>
                  ) : mfaStatus.totpEnabled ? (
                    <Dialog
                      open={totpRemovalDialog.open}
                      onOpenChange={(open) => {
                        if (totpRemovalDialog.removing) {
                          return;
                        }

                        setTotpRemovalDialog((prev) => ({
                          ...prev,
                          open,
                          password: open ? prev.password : "",
                        }));
                      }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setTotpRemovalDialog((prev) => ({
                            ...prev,
                            open: true,
                            password: "",
                          }))
                        }
                        disabled={!totpVerification?.id}
                      >
                        {t("security.mfa.remove")}
                      </Button>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t("security.mfa.removeConfirmTitle")}</DialogTitle>
                          <DialogDescription>
                            {t("security.mfa.removeConfirmDesc")}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                          <p className="text-sm text-muted-foreground">
                            {t("security.mfa.removeWarning")}
                          </p>
                          <div className="space-y-2">
                            <Label htmlFor="totp-remove-password">
                              {t("security.mfa.removePasswordLabel")}
                            </Label>
                            <Input
                              id="totp-remove-password"
                              type="password"
                              autoComplete="current-password"
                              value={totpRemovalDialog.password}
                              onChange={(event) =>
                                setTotpRemovalDialog((prev) => ({
                                  ...prev,
                                  password: event.target.value,
                                }))
                              }
                              placeholder={t("security.mfa.removePasswordPlaceholder")}
                              disabled={totpRemovalDialog.removing}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            disabled={totpRemovalDialog.removing}
                            onClick={() =>
                              setTotpRemovalDialog({
                                open: false,
                                password: "",
                                removing: false,
                              })
                            }
                          >
                            {t("common.cancel")}
                          </Button>
                          <Button
                            variant="destructive"
                            disabled={totpRemovalDialog.removing}
                            onClick={handleRemoveTotp}
                          >
                            {totpRemovalDialog.removing ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            {t("security.mfa.remove")}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      {t("security.featureDisabled")}
                    </Button>
                  )}
                </div>
                <Separator />
              </>
            )}

            {/* Passkey */}
            {isFeatureEnabled("passkey") && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {mfaStatus.webAuthnEnabled ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Key className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">{t("security.mfa.passkey")}</p>
                      <p className="text-sm text-muted-foreground">
                        {mfaStatus.webAuthnEnabled
                          ? t("security.mfa.passkeyEnabled")
                          : t("security.mfa.passkeyDesc")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {addPasskeyUrl ? (
                      <Button variant="outline" size="sm" asChild>
                        <a href={addPasskeyUrl} target="_self">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          {mfaStatus.webAuthnEnabled ? t("common.add") : t("security.mfa.setup")}
                        </a>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        {t("security.featureDisabled")}
                      </Button>
                    )}
                    {mfaStatus.webAuthnEnabled && (
                      managePasskeyUrl ? (
                        <Button variant="outline" size="sm" asChild>
                          <a href={managePasskeyUrl} target="_self">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            {t("security.mfa.manage")}
                          </a>
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          {t("security.featureDisabled")}
                        </Button>
                      )
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Backup Codes */}
            {isFeatureEnabled("mfa", "backupCodes") && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {mfaStatus.backupCodeEnabled ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Key className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">{t("security.mfa.backupCodes")}</p>
                    <p className="text-sm text-muted-foreground">
                      {mfaStatus.backupCodeEnabled
                        ? t("security.mfa.backupCodesGenerated")
                        : mfaStatus.hasOtherMfaMethod
                          ? t("security.mfa.backupCodesDesc")
                          : t("security.mfa.requireOtherMfa")}
                    </p>
                  </div>
                </div>
                {mfaStatus.hasOtherMfaMethod ? (
                  <div className="flex items-center gap-2">
                    {generateBackupCodesUrl ? (
                      <Button variant="outline" size="sm" asChild>
                        <a href={generateBackupCodesUrl} target="_self">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          {mfaStatus.backupCodeEnabled ? t("security.mfa.regenerate") : t("security.mfa.generate")}
                        </a>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        {t("security.featureDisabled")}
                      </Button>
                    )}
                    {mfaStatus.backupCodeEnabled && (
                      manageBackupCodesUrl ? (
                        <Button variant="outline" size="sm" asChild>
                          <a href={manageBackupCodesUrl} target="_self">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            {t("security.mfa.manage")}
                          </a>
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          {t("security.featureDisabled")}
                        </Button>
                      )
                    )}
                  </div>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    {t("security.mfa.requireOtherMfa")}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <CardTitle>{t("security.twoFactorAuth")}</CardTitle>
            </div>
            <CardDescription>
              {t("security.mfa.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <Badge variant="secondary">{t("security.featureDisabled")}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Login History - 限制显示最近 7 天，最多 10 条 */}
      {isFeatureEnabled("sessions") ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              <CardTitle>{t("security.loginHistory.title")}</CardTitle>
            </div>
            <CardDescription>
              {t("security.loginHistory.descriptionWithParams", { days: String(MAX_LOGIN_HISTORY_DAYS), max: String(MAX_LOGIN_HISTORY_ITEMS) })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loginHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t("security.loginHistory.empty", { days: String(MAX_LOGIN_HISTORY_DAYS) })}
                </p>
              ) : (
                <>
                  {loginHistory.map((record) => (
                    <div
                      key={record.id}
                      className="rounded-lg border p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            <Monitor className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{record.applicationName}</p>
                            <p className="text-sm text-muted-foreground truncate">{t("security.loginHistory.event")}: {record.event}</p>
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>{formatDateTime(record.timestamp)}</p>
                          <p>{formatTimeAgo(record.timestamp)}</p>
                        </div>
                      </div>
                      {(record.ip || record.userAgent) && (
                        <div className="mt-3 text-xs text-muted-foreground space-y-1">
                          {record.ip && <p>IP: {record.ip}</p>}
                          {record.userAgent && <p className="truncate">{t("security.loginHistory.device")}: {record.userAgent}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                  {loginHistory.length >= MAX_LOGIN_HISTORY_ITEMS && (
                    <p className="text-center text-xs text-muted-foreground">
                      {t("security.loginHistory.onlyShowRecent", { count: String(MAX_LOGIN_HISTORY_ITEMS) })}
                    </p>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              <CardTitle>{t("security.loginHistory.title")}</CardTitle>
            </div>
            <CardDescription>
              {t("security.loginHistory.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <Badge variant="secondary">{t("security.featureDisabled")}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Tips */}
      <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-900/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <CardTitle className="text-yellow-800 dark:text-yellow-200">{t("security.tips.title")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
            <li>{t("security.tips.strongPassword")}</li>
            <li>{t("security.tips.enableMfa")}</li>
            <li>{t("security.tips.checkHistory")}</li>
            <li>{t("security.tips.publicDevice")}</li>
          </ul>
        </CardContent>
      </Card>

    </div>
  );
}
