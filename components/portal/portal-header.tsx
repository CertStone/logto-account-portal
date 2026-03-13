"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LayoutGrid } from "lucide-react";
import { useTranslations } from "@/lib/i18n/client";

interface PortalHeaderProps {
  accountCenterHref: string;
  signInAction?: () => Promise<void>;
}

export function PortalHeader({ accountCenterHref, signInAction }: PortalHeaderProps) {
  const { t } = useTranslations();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-2 font-semibold">
          <LayoutGrid className="h-5 w-5" />
          <span>{t("portal.title")}</span>
        </div>

        {signInAction ? (
          <form action={signInAction}>
            <Button variant="ghost" size="sm" type="submit">
              {t("portal.enterAccountCenter")}
            </Button>
          </form>
        ) : (
          <Link href={accountCenterHref}>
            <Button variant="ghost" size="sm">
              {t("portal.enterAccountCenter")}
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
