"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function pickConnectorData(searchParams: URLSearchParams): Record<string, unknown> {
  const connectorData: Record<string, unknown> = {};

  for (const [key, value] of searchParams.entries()) {
    if (
      key === "target" ||
      key === "state" ||
      key === "error" ||
      key === "error_description"
    ) {
      continue;
    }

    const existing = connectorData[key];

    if (existing === undefined) {
      connectorData[key] = value;
      continue;
    }

    connectorData[key] = Array.isArray(existing)
      ? [...existing, value]
      : [existing, value];
  }

  return connectorData;
}

export default function SocialCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const hasStartedRef = useRef(false);
  const [requiresReAuth, setRequiresReAuth] = useState(false);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const callbackPayload = useMemo(() => {
    const target = searchParams.get("target");
    const state = searchParams.get("state");
    const oauthError = searchParams.get("error");
    const oauthErrorDescription = searchParams.get("error_description");
    const connectorData = pickConnectorData(searchParams);

    return {
      target,
      state,
      oauthError,
      oauthErrorDescription,
      connectorData,
    };
  }, [searchParams]);

  const completeBinding = useCallback(async (identityVerificationId?: string) => {
    const { target, state, oauthError, oauthErrorDescription, connectorData } = callbackPayload;

    if (oauthError) {
      throw new Error(oauthErrorDescription || oauthError);
    }

    if (!target || !state) {
      throw new Error("缺少社交绑定回调参数");
    }

    if (Object.keys(connectorData).length === 0) {
      throw new Error("未获取到有效的社交授权数据");
    }

    const res = await fetch("/api/account/identities/social/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target,
        state,
        connectorData,
        identityVerificationId,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      return;
    }

    if (
      res.status === 401 &&
      (data.code === "verification_record.permission_denied" ||
        typeof data.error === "string" && /re-authenticate|重新验证|permission denied/i.test(data.error))
    ) {
      setRequiresReAuth(true);
      throw new Error("REAUTH_REQUIRED");
    }

    throw new Error(data.error || "社交绑定失败");
  }, [callbackPayload]);

  useEffect(() => {
    let active = true;

    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;

    const run = async () => {
      try {
        setSubmitting(true);
        await completeBinding();

        if (!active) return;

        toast({
          title: "绑定成功",
          description: "社交账号已成功绑定",
        });

        router.replace("/dashboard/connections?show_success=social");
      } catch (error) {
        if (!active) return;

        if (error instanceof Error && error.message === "REAUTH_REQUIRED") {
          setSubmitting(false);
          return;
        }

        toast({
          variant: "destructive",
          title: "绑定失败",
          description: error instanceof Error ? error.message : "未知错误",
        });

        router.replace("/dashboard/connections");
      } finally {
        if (active) {
          setSubmitting(false);
        }
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [completeBinding, router, toast]);

  const handleReAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!password.trim()) {
      toast({
        variant: "destructive",
        title: "验证失败",
        description: "请输入当前密码",
      });
      return;
    }

    setSubmitting(true);

    try {
      const verifyRes = await fetch("/api/verifications/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const verifyData = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok || !verifyData.verificationRecordId) {
        throw new Error(verifyData.error || "密码验证失败");
      }

      await completeBinding(verifyData.verificationRecordId as string);

      toast({
        title: "绑定成功",
        description: "社交账号已成功绑定",
      });

      router.replace("/dashboard/connections?show_success=social");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "绑定失败",
        description: error instanceof Error ? error.message : "未知错误",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (requiresReAuth) {
    return (
      <div className="flex items-center justify-center min-h-[360px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>需要身份验证</CardTitle>
            <CardDescription>
              绑定社交账号属于敏感操作，请输入当前密码后继续。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleReAuthSubmit}>
              <div className="space-y-2">
                <Label htmlFor="reauth-password">当前密码</Label>
                <Input
                  id="reauth-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.replace("/dashboard/connections")}
                  disabled={submitting}
                >
                  取消
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "验证中..." : "验证并继续绑定"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[320px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">
          {submitting ? "正在完成社交账号绑定..." : "准备中..."}
        </p>
      </div>
    </div>
  );
}
