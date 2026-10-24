import "server-only";

import { ShieldX } from "lucide-react";
import { redirect } from "next/navigation";

import { MasterLoadError } from "@/components/master/master-states";
import { StatePanel } from "@/components/master/state-panel";
import { getProductGroups } from "@/features/product-groups/api";
import { canViewCost } from "@/features/products/api";
import type { ApiFailure, ApiResult } from "@/lib/api";

import {
  canViewStock,
  getProductRef,
  getStockHistory,
  getStockSummary,
  getVisibleStockLocations,
} from "./api";
import {
  STOCK_HISTORY_DESCRIPTION,
  STOCK_HISTORY_PATH,
  STOCK_HISTORY_TITLE,
  STOCK_SUMMARY_DESCRIPTION,
  STOCK_SUMMARY_PATH,
  STOCK_SUMMARY_TITLE,
} from "./constants";
import {
  parseHistoryFilters,
  parseSummaryFilters,
  toHistorySearch,
  toSummarySearch,
} from "./filters";
import { StockHistoryView } from "./stock-history-page";
import { StockSummaryView } from "./stock-summary-page";

type SearchParams = Record<string, string | string[] | undefined>;

function Heading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}

function Forbidden({ heading }: { heading: React.ReactNode }) {
  return (
    <div className="space-y-6">
      {heading}
      <StatePanel icon={ShieldX} title="You don't have permission">
        Stock needs the &ldquo;stock:read&rdquo; permission. Ask an
        administrator for access.
      </StatePanel>
    </div>
  );
}

function Failure({
  failure,
  heading,
  returnTo,
  subject,
}: {
  failure: ApiFailure;
  heading: React.ReactNode;
  returnTo: string;
  subject: string;
}) {
  if (failure.reason === "unauthorized") {
    redirect(`/login?${new URLSearchParams({ from: returnTo })}`);
  }
  return (
    <div className="space-y-6">
      {heading}
      <MasterLoadError
        reason={failure.reason}
        subject={subject}
        status={failure.status}
        messages={failure.messages}
      />
    </div>
  );
}

/** A filter's options: null (that filter disabled) when they failed. */
function optional<T>(result: ApiResult<T>, returnTo: string): T | null {
  if (result.ok) return result.data;
  if (result.reason === "unauthorized") {
    redirect(`/login?${new URLSearchParams({ from: returnTo })}`);
  }
  return null;
}

export async function StockSummaryRoute({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const heading = (
    <Heading
      title={STOCK_SUMMARY_TITLE}
      description={STOCK_SUMMARY_DESCRIPTION}
    />
  );
  if (!(await canViewStock())) return <Forbidden heading={heading} />;

  const filters = parseSummaryFilters(searchParams);
  const returnTo = `${STOCK_SUMMARY_PATH}${toSummarySearch(filters)}`;
  const [page, groups, locations, viewCost] = await Promise.all([
    getStockSummary(filters),
    getProductGroups(),
    getVisibleStockLocations(),
    canViewCost(),
  ]);
  if (!page.ok) {
    return (
      <Failure
        failure={page}
        heading={heading}
        returnTo={returnTo}
        subject="stock"
      />
    );
  }
  return (
    <StockSummaryView
      page={page.data}
      filters={filters}
      groups={optional(groups, returnTo)}
      locations={optional(locations, returnTo)}
      canViewCost={viewCost}
    />
  );
}

export async function StockHistoryRoute({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const heading = (
    <Heading
      title={STOCK_HISTORY_TITLE}
      description={STOCK_HISTORY_DESCRIPTION}
    />
  );
  if (!(await canViewStock())) return <Forbidden heading={heading} />;

  const filters = parseHistoryFilters(searchParams);
  const returnTo = `${STOCK_HISTORY_PATH}${toHistorySearch(filters)}`;
  const [history, product, locations] = await Promise.all([
    filters.productId ? getStockHistory(filters) : null,
    filters.productId ? getProductRef(filters.productId) : null,
    getVisibleStockLocations(),
  ]);
  for (const result of [history, product]) {
    if (result && !result.ok) {
      return (
        <Failure
          failure={result}
          heading={heading}
          returnTo={returnTo}
          subject="the stock history"
        />
      );
    }
  }
  return (
    <StockHistoryView
      filters={filters}
      history={history?.ok ? history.data : null}
      product={product?.ok ? product.data : null}
      locations={optional(locations, returnTo)}
    />
  );
}
