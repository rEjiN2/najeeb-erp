import {
  BarChart3,
  Boxes,
  Database,
  HandCoins,
  LayoutDashboard,
  MapPin,
  Receipt,
  Settings,
  Tags,
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
  children: NavEntry[];
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
        icon: Database,
        children: [
          {
            title: "Locations",
            href: "/accounting-inventory/masters/locations",
            icon: MapPin,
          },
          {
            title: "Product Groups",
            href: "/accounting-inventory/masters/product-groups",
            icon: Tags,
          },
        ],
      },
      {
        title: "Transactions",
        icon: Receipt,
        children: [
          {
            title: "Cash Receipt",
            href: "/accounting-inventory/transactions/cash-receipt",
            icon: HandCoins,
          },
        ],
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

function flatten(entries: NavEntry[]): NavLeaf[] {
  return entries.flatMap((entry) =>
    isNavGroup(entry) ? flatten(entry.children) : [entry],
  );
}

/** True if `pathname` matches any leaf nested anywhere under `entries`. */
export function containsActivePath(
  entries: NavEntry[],
  pathname: string,
): boolean {
  return entries.some((entry) =>
    isNavGroup(entry)
      ? containsActivePath(entry.children, pathname)
      : entry.href === pathname,
  );
}

export const FLAT_NAV_ITEMS: NavLeaf[] = flatten(NAV_ITEMS);
