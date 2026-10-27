import {
  ArrowRightLeft,
  Banknote,
  BarChart3,
  ClipboardList,
  Boxes,
  Building,
  Building2,
  Database,
  FileText,
  HandCoins,
  History,
  Landmark,
  LayoutDashboard,
  MapPin,
  Package,
  PackagePlus,
  PackageSearch,
  Ruler,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  Tags,
  Truck,
  Undo2,
  Users,
  Wallet,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import { PERMISSIONS } from "@/features/auth/permissions";

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
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: PERMISSIONS.DASHBOARD_VIEW,
  },
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
            permission: PERMISSIONS.ACCOUNTS_MANAGE,
          },
          {
            title: "Customers",
            href: "/accounting-inventory/masters/customers",
            icon: Building,
            permission: PERMISSIONS.PARTIES_MANAGE,
          },
          {
            title: "Suppliers",
            href: "/accounting-inventory/masters/suppliers",
            icon: Truck,
            permission: PERMISSIONS.PARTIES_MANAGE,
          },
          {
            title: "Locations",
            href: "/accounting-inventory/masters/locations",
            icon: MapPin,
            permission: PERMISSIONS.LOCATIONS_MANAGE,
          },
          {
            title: "Product Groups",
            href: "/accounting-inventory/masters/product-groups",
            icon: Tags,
            permission: PERMISSIONS.PRODUCT_GROUPS_MANAGE,
          },
          {
            title: "Products",
            href: "/accounting-inventory/masters/products",
            icon: Package,
            permission: PERMISSIONS.PRODUCTS_MANAGE,
          },
          {
            title: "Units",
            href: "/accounting-inventory/masters/units",
            icon: Ruler,
            permission: PERMISSIONS.UNITS_MANAGE,
          },
        ],
      },
      {
        title: "Transactions",
        icon: Receipt,
        children: [
          {
            title: "Receipts",
            href: "/accounting-inventory/transactions/cash-receipts",
            icon: HandCoins,
            permission: PERMISSIONS.CASH_RECEIPTS_READ,
          },
          {
            title: "Cash Payments",
            href: "/accounting-inventory/transactions/cash-payments",
            icon: Banknote,
            permission: PERMISSIONS.CASH_PAYMENTS_READ,
          },
          {
            title: "Cash Handovers",
            href: "/accounting-inventory/transactions/cash-handovers",
            icon: ArrowRightLeft,
            permission: PERMISSIONS.CASH_HANDOVERS_READ,
          },
          {
            title: "Opening Balances",
            href: "/accounting-inventory/transactions/opening-balances",
            icon: Landmark,
            permission: PERMISSIONS.OPENING_BALANCES_READ,
          },
          {
            title: "Purchase Invoices",
            href: "/accounting-inventory/transactions/purchase-invoices",
            icon: FileText,
            permission: PERMISSIONS.PURCHASE_INVOICES_READ,
          },
          {
            title: "Sales Invoices",
            href: "/accounting-inventory/transactions/sales-invoices",
            icon: Receipt,
            permission: PERMISSIONS.SALES_INVOICES_READ,
          },
          {
            title: "Purchase Returns",
            href: "/accounting-inventory/transactions/purchase-returns",
            icon: Undo2,
            permission: PERMISSIONS.PURCHASE_RETURNS_READ,
          },
          {
            title: "Sales Returns",
            href: "/accounting-inventory/transactions/sales-returns",
            icon: Undo2,
            permission: PERMISSIONS.SALES_RETURNS_READ,
          },
          {
            title: "Opening Stock",
            href: "/accounting-inventory/transactions/opening-stock",
            icon: PackagePlus,
            permission: PERMISSIONS.OPENING_STOCK_READ,
          },
          {
            title: "Cheques",
            href: "/accounting-inventory/transactions/cheques",
            icon: ScrollText,
            permission: PERMISSIONS.CHEQUES_READ,
          },
        ],
      },
      {
        title: "Inventory",
        icon: Warehouse,
        children: [
          {
            title: "Stock Summary",
            href: "/accounting-inventory/inventory/stock-summary",
            icon: PackageSearch,
            permission: PERMISSIONS.STOCK_READ,
          },
          {
            title: "Stock History",
            href: "/accounting-inventory/inventory/stock-history",
            icon: History,
            permission: PERMISSIONS.STOCK_READ,
          },
        ],
      },
      {
        title: "Reports",
        icon: BarChart3,
        children: [
          {
            title: "Salesman Collections",
            href: "/accounting-inventory/reports/salesman-collections",
            icon: ClipboardList,
            permission: PERMISSIONS.REPORTS_SALESMAN,
          },
        ],
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
        permission: PERMISSIONS.COMPANY_MANAGE,
      },
      {
        title: "Users",
        href: "/administration/users",
        icon: Users,
        permission: PERMISSIONS.USERS_MANAGE,
      },
      {
        title: "Roles",
        href: "/administration/roles",
        icon: ShieldCheck,
        permission: PERMISSIONS.ROLES_MANAGE,
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

/**
 * Where this user lands after signing in: the dashboard when they may see
 * it, else the first screen the menu offers them.
 */
export function homePath(permissions: readonly string[]): string {
  return (
    flatten(visibleNavItems(NAV_ITEMS, permissions))[0]?.href ?? "/dashboard"
  );
}

export function flattenNav(entries: NavEntry[]): NavLeaf[] {
  return flatten(entries);
}
