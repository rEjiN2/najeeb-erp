import {
  BarChart3,
  Boxes,
  Database,
  LayoutDashboard,
  Receipt,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavLeaf {
  title: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title: string;
  icon: LucideIcon;
  children: NavLeaf[];
}

export type NavEntry = NavLeaf | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

export const NAV_ITEMS: NavEntry[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    title: "Accounting & Inventory",
    icon: Boxes,
    children: [
      {
        title: "Masters",
        href: "/accounting-inventory/masters",
        icon: Database,
      },
      {
        title: "Transactions",
        href: "/accounting-inventory/transactions",
        icon: Receipt,
      },
      {
        title: "Reports",
        href: "/accounting-inventory/reports",
        icon: BarChart3,
      },
    ],
  },
  { title: "Administration", href: "/administration", icon: Settings },
];

export const FLAT_NAV_ITEMS: NavLeaf[] = NAV_ITEMS.flatMap((entry) =>
  isNavGroup(entry) ? entry.children : [entry],
);
