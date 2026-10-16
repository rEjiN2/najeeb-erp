import {
  Banknote,
  BarChart3,
  Boxes,
  Building,
  Building2,
  Database,
  HandCoins,
  IdCard,
  LayoutDashboard,
  MapPin,
  Receipt,
  Settings,
  Tags,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavLeaf {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Shown only to users holding this permission. The page checks it too. */
  permission?: string;
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
            title: "Accounts",
            href: "/accounting-inventory/masters/accounts",
            icon: Wallet,
          },
          {
            title: "Customers",
            href: "/accounting-inventory/masters/customers",
            icon: Building,
          },
          {
            title: "Suppliers",
            href: "/accounting-inventory/masters/suppliers",
            icon: Truck,
          },
          {
            title: "Cashiers",
            href: "/accounting-inventory/masters/cashiers",
            icon: IdCard,
          },
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
            title: "Cash Receipts",
            href: "/accounting-inventory/transactions/cash-receipts",
            icon: HandCoins,
          },
          {
            title: "Cash Payments",
            href: "/accounting-inventory/transactions/cash-payments",
            icon: Banknote,
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
  {
    title: "Administration",
    icon: Settings,
    children: [
      {
        title: "Company Profile",
        href: "/administration/company-profile",
        icon: Building2,
        permission: "company:manage",
      },
    ],
  },
];

/**
 * The menu as this user may see it: leaves needing a permission they lack
 * are dropped, and so are groups left with nothing in them.
 */
export function visibleNavItems(
  entries: NavEntry[],
  permissions: readonly string[],
): NavEntry[] {
  return entries.flatMap((entry): NavEntry[] => {
    if (isNavGroup(entry)) {
      const children = visibleNavItems(entry.children, permissions);
      return children.length > 0 ? [{ ...entry, children }] : [];
    }
    return !entry.permission || permissions.includes(entry.permission)
      ? [entry]
      : [];
  });
}

function flatten(entries: NavEntry[]): NavLeaf[] {
  return entries.flatMap((entry) =>
    isNavGroup(entry) ? flatten(entry.children) : [entry],
  );
}

/** A leaf stays highlighted on its sub-routes too (e.g. a record's /edit page). */
export function isActivePath(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** True if `pathname` matches any leaf nested anywhere under `entries`. */
export function containsActivePath(
  entries: NavEntry[],
  pathname: string,
): boolean {
  return entries.some((entry) =>
    isNavGroup(entry)
      ? containsActivePath(entry.children, pathname)
      : isActivePath(entry.href, pathname),
  );
}

export function flattenNav(entries: NavEntry[]): NavLeaf[] {
  return flatten(entries);
}
