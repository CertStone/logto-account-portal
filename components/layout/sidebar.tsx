"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  mainNavItems,
  auxiliaryNavItems,
  isNavItemActive,
  getNavLabel,
} from "@/config/navigation";
import { ChevronRight, LayoutGrid, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslations } from "@/lib/i18n/client";

interface SidebarProps {
  user?: {
    name?: string;
    username?: string;
    email?: string;
    avatar?: string;
  };
  portalEnabled?: boolean;
}

export function Sidebar({ user, portalEnabled = true }: SidebarProps) {
  const pathname = usePathname();
  const { t, language } = useTranslations();
  const visibleAuxiliaryNavItems = portalEnabled ? auxiliaryNavItems : [];

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r bg-card md:flex">
      {/* Header */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <LayoutGrid className="h-5 w-5" />
          <span>{t("meta.appTitle")}</span>
        </Link>
      </div>

      {/* User Card */}
      <div className="p-4">
        <div className="rounded-lg border bg-background p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {user?.avatar && (
                <AvatarImage src={user.avatar} alt={user?.name || user?.username || t("common.user")} />
              )}
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold text-white">
                {user?.name?.charAt(0) || user?.username?.charAt(0) || <User className="h-5 w-5" />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {user?.name || user?.username || t("common.user")}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email || t("common.emailNotSet")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3">
        {mainNavItems.map((item) => {
          const isActive = isNavItemActive(item.href, pathname);
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3",
                  isActive && "font-medium"
                )}
              >
                <item.icon className="h-4 w-4" />
                {getNavLabel(item, language)}
              </Button>
            </Link>
          );
        })}
      </nav>

      <Separator className="mx-3 w-auto" />

      {/* Portal Link */}
      <div className="p-3">
        {visibleAuxiliaryNavItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button variant="outline" className="w-full justify-start gap-3">
              <item.icon className="h-4 w-4" />
              {getNavLabel(item, language)}
              <ChevronRight className="ml-auto h-4 w-4" />
            </Button>
          </Link>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t p-4">
        <a
          href="https://github.com/CertStone/logto-account-portal"
          target="_blank"
          rel="noreferrer"
          className="block text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("meta.footer")}
        </a>
      </div>
    </aside>
  );
}
