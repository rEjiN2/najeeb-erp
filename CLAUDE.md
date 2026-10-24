# Ala Dates ERP: Frontend

Next.js (App Router) + TypeScript strict, pnpm, Tailwind + shadcn/ui,
recharts. UAE dates-trading ERP replacing legacy atACC. Backend: NestJS API
at API_BASE_URL (server-only env var).

## Token rules (always)

- Minimal diff. Smallest change that meets "Done when". No refactors, no
  extra docs/README/summary files, no unrelated cleanup.
- Read only files you need; check "Where things live" first. Do not re-read
  files already read in this session.
- Before building, find the shared component that already does it (Master
  pattern, Voucher pattern, Activity panel). Extend with a prop; do not copy.
- Do not guess field names or response shapes. Read the backend DTOs and
  controllers in sibling folder `Ala-Dates-Backend` (read-only, never edit it
  from here) or ask.
- Run typecheck/lint on touched files only, quietly. Never paste long logs.
- No new libraries without asking. No commits unless asked.
- Stop when "Done when" is met. Reply in 5 lines max: changed, checked,
  decisions needed.
- Blocked: ask one question. Otherwise decide, state the assumption in one
  line, continue.

## Where things live (verify on first use, then correct this section)

src/features/<domain>/ (api.ts typed server functions, components, types),
src/components/ (shared UI), src/lib/ (server-only API client, helpers),
AuthContext abstraction, (protected) route group with app shell, design
tokens in one file, shared Master pattern, Voucher pattern, Activity panel,
DemoDataBadge.

## Status (update after each step)

Built: login/shell, dashboard (cash card live, other widgets demo), locations,
product groups, accounts, customers/suppliers, cashiers, company profile, cash
receipts, cash payments, Users/Roles + scoped UI, change-password.
Built (untested end to end): Salesman Collections report (user-based),
Cash Handovers (balance-based: list/hand over/approve, pending badge,
receipts banner), cheque accounts on receipts, Company default cash/cheque
in hand accounts, Receipts (renamed; Payment Method selector, cheque
no/date/bank, method tabs), Cheques register (deposit/clear/return/undo,
CSV, dueSoon badge), dashboard pending-cheques line. Cheque on a receipt
needs no account (backend uses Company cheques in hand); salesmen hand
cheques over as documents (handover chequeIds). Cheque/bank receipts:
optional photo/slip, previewed before Save, uploaded after it
(features/vouchers/attachments.tsx); view page lists/adds/removes.
Handover: expenses paid from collected cash (account, paid from, amount,
note, bill reviewed before submit, uploaded after); shown on the handover.
Salesman bank receipts and cheques are ticked on the handover; approver
views each slip/photo there.
Removed: Staff/Cashiers master (Collected By is a user).
In progress: none.
Built (untested end to end): Products (group path picker, cost only with
products:view-cost, image via POST /products/:id/image after save) and
Units masters.
Built (untested end to end): Opening Balances (list/new/view/edit/cancel,
Dr/Cr grid, equity auto line, CSV import via /opening-balances/validate;
shared VoucherView with config.printable false).
Built (untested end to end): Stock Summary (expandable per-location rows,
value with products:view-cost) and Stock History (running balance, CSV)
in features/stock; Opening Stock (features/opening-stock, list/new/view/
edit/cancel, CSV import via /opening-stock/validate); Users "Assigned
locations" (allowedLocationIds, scoped roles); Company "Allow negative stock".
Planned: purchase, sales, bundling, reports.

## Conventions

- Data: fetch on the server through one typed function per feature
  (features/<x>/api.ts), forwarding the user's cookie. cache: "no-store" for
  lookups and live data. Every screen handles 401 (to login), 403 ("no
  permission"), loading skeleton, empty and error states. Never fall back to
  mock data; mock widgets carry the "Demo data" badge.
- Auth: backend sets httpOnly cookies. Never read, store or forward a token
  in client JS. /auth/me gives role, dataScope, permissions, linked staff,
  allowed cash accounts.
- Permissions: hide menu items and buttons the user lacks permission for
  (:read :create :edit :cancel per voucher, plus balances:view, users:manage,
  roles:manage, vouchers:select-collector, cash-handovers:approve,
  reports:salesman). The backend is the
  real guard; hiding is only for clarity.
- Scoped users (dataScope own, e.g. van salesman): Collected By is
  pre-filled and locked; Received Into lists only allowed cash accounts;
  balances/old-balance hidden when the API omits them; customer picker shows
  name and code. Receipt screens must work on a phone (~390px).
- People on vouchers: "Created By" is automatic from login. "Collected By"
  (receipt) / "Paid By" (payment) is a user dropdown from
  /users/lookup?for=receipt|payment (field collectedById / collectedBy
  {id,name}), defaulting to me; read-only text without
  vouchers:select-collector. Legacy rows: id null, show the name.
- Master pattern: list with search, filters, pagination + side panel form.
  Codes are generated by the backend, shown read-only. Show backend
  validation messages on the form. If delete is blocked, offer "Deactivate
  instead".
- Voucher pattern: list page (filters, sort, page in the URL query), then
  /new, /[id] (read-only), /[id]/edit. No Delete: Cancel with a required
  reason. View page: created/updated/cancelled meta strip + Activity panel
  (audit + comments). Print/download PDFs via a Next.js route handler that
  streams the backend response. Filters include Method (cash|bank) for
  receipts and payments.
- Account pickers: header "Received Into" / "Paid From" uses
  /accounts/lookup scope=company, types cash,wallet,bank, with type badges.
  Line pickers use scope=party plus expense/other as the screen needs; never
  cash/wallet/bank on lines.
- Dropdowns come from backend /lookup endpoints. Never hardcode business
  rules (e.g. allowed location parents); fetch them.
- Formatting: AED with 2 decimals; times in Asia/Dubai.
- Design: tokens in one place. Inputs 5px radius, about 36px high. Charcoal
  base, amber accent, no default shadcn blue, keep dark-mode variants. Do not
  restyle individual components.

## Business context

Dates trading: customers, suppliers, cash/bank/wallet accounts, location tree
(Branch > Warehouse / Store / Van, vans nest), product groups (Dates,
Packaging, Gift & Bundle), bundling is core. Van salesmen collect receipts
all day and settle cash with the office at night for approval.

## Not built, do not build unless asked

Journal Entry, Credit/Debit Note, Advance Allocation, Bank Reconciliation,
Contra Voucher.
