import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  User,
  Shield,
  Link2,
  Settings,
} from "lucide-react";

export interface NavItem {
  href: string;
  title: string;
  icon: LucideIcon;
}

export const mainNavItems: NavItem[] = [
  {
    href: "/dashboard",
    title: "概览",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/profile",
    title: "个人资料",
    icon: User,
  },
  {
    href: "/dashboard/security",
    title: "安全设置",
    icon: Shield,
  },
  {
    href: "/dashboard/connections",
    title: "社交连接",
    icon: Link2,
  },
  {
    href: "/dashboard/settings",
    title: "偏好设置",
    icon: Settings,
  },
];

export const auxiliaryNavItems: NavItem[] = [
  {
    href: "/portal",
    title: "服务门户",
    icon: LayoutDashboard,
  },
];

export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname.startsWith(href);
}
