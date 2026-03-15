"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  mainNavItems,
  auxiliaryNavItems,
  isNavItemActive,
  getNavLabel,
} from "@/config/navigation";
import {
  Menu,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
  LayoutGrid,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "@/lib/i18n/client";

interface NavbarProps {
  user?: {
    name?: string;
    username?: string;
    email?: string;
    avatar?: string;
  };
  onSignOut?: () => void;
  portalEnabled?: boolean;
}

export function Navbar({ user, onSignOut, portalEnabled = true }: NavbarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { t, language } = useTranslations();

  const visibleAuxiliaryNavItems = portalEnabled ? auxiliaryNavItems : [];
  const allNavItems = [...mainNavItems, ...visibleAuxiliaryNavItems];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 lg:px-8">
        {/* Left - Mobile Menu */}
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">{t("nav.menu")}</SheetTitle>
              <div className="flex h-16 items-center border-b px-6">
                <LayoutGrid className="h-5 w-5 mr-2" />
                <span className="font-semibold">{t("meta.appTitle")}</span>
              </div>
              <nav className="space-y-1 p-3">
                {allNavItems.map((item) => {
                  const isActive = isNavItemActive(item.href, pathname);
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn("w-full justify-start gap-3", isActive && "font-medium")}
                      >
                        <item.icon className="h-4 w-4" />
                        {getNavLabel(item, language)}
                      </Button>
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo - Desktop */}
          <Link href="/dashboard" className="hidden items-center gap-2 font-semibold md:flex">
            <LayoutGrid className="h-5 w-5" />
            <span>{t("meta.appTitle")}</span>
          </Link>

          {/* Logo - Mobile */}
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold md:hidden">
            <LayoutGrid className="h-5 w-5" />
          </Link>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">{t("common.toggleTheme")}</span>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 pl-2">
                <Avatar className="h-8 w-8">
                  {user?.avatar && (
                    <AvatarImage src={user.avatar} alt={user?.name || user?.username || t("common.user")} />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-bold text-white">
                    {user?.name?.charAt(0) || user?.username?.charAt(0) || t("common.userInitial")}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[100px] truncate sm:inline">
                  {user?.name || user?.username || t("common.user")}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user?.name || user?.username || t("common.user")}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {user?.email || t("common.emailNotSet")}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {mainNavItems.slice(1, 3).map((item) => (
                <Link key={item.href} href={item.href}>
                  <DropdownMenuItem>
                    <item.icon className="mr-2 h-4 w-4" />
                    {getNavLabel(item, language)}
                  </DropdownMenuItem>
                </Link>
              ))}
              {visibleAuxiliaryNavItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <DropdownMenuItem>
                    <item.icon className="mr-2 h-4 w-4" />
                    {getNavLabel(item, language)}
                  </DropdownMenuItem>
                </Link>
              ))}
              <DropdownMenuSeparator />
              {onSignOut && (
                <DropdownMenuItem onClick={onSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("nav.signOut")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
