# Project: Dates Trading ERP — Frontend

Rebuild of a client's existing ERP ("atACC") for a UAE dates trading business,
replacing a poorly-designed legacy system. Multi-branch, multi-location stock.

## Stack

- Next.js (App Router) + TypeScript, strict mode
- Tailwind CSS + a component library (shadcn/ui unless told otherwise)
- Data fetching: server components / route handlers first; client state only
  where interactivity requires it
- Charts: recharts or similar

## Business context

- Core inventory item type: dates (sold by weight and by unit, several package
  sizes per product)
- Bundling (combining multiple date products into a gift-pack/kit) is a core,
  frequently-used feature — treat its screens as first-class, not an
  afterthought
- Stock locations form a tree: Branch → Warehouse → {Store, Van, Van...}.
  Branch and Warehouse are organizational; Store and Van are where physical
  stock actually sits. Today: one Warehouse with one Store + two Vans. More
  Branches (each with their own Vans) are coming later — don't hard-code the
  current shape.
- Parties = customers (Debtors). Suppliers = vendors (Creditors). Kept as
  separate master screens but structurally near-identical.

## Design bar

- This must look and feel like a modern, well-designed SaaS product — not a
  copy of the legacy ERP's dense Windows-forms look. Generous whitespace,
  clear typography hierarchy, real empty/loading states, no unstyled browser
  defaults.
- Two reusable screen patterns everything else will be built from:
  1. Master pattern: list (filter, search, pagination) + add/edit form
     (side panel or dedicated route) + delete confirm
  2. Transaction/Voucher pattern: header fields + editable line-item grid +
     totals footer + Save/Print/Delete actions
- Build every screen against these two patterns. If a screen doesn't fit
  either, flag it before building.

## Ground truth

- Field-level detail for each screen lives in the uploaded Functional
  Specification and Clarification Questions documents — ask me to paste the
  relevant section rather than guessing field names, validation rules, or
  business logic.
- If a business rule is ambiguous or marked "Clarification Required" in that
  spec, stop and ask instead of assuming.

## Next.js version note

This project is on a newer Next.js major (App Router) — see @AGENTS.md for
version-specific agent rules auto-maintained by `next dev`. Check
`node_modules/next/dist/docs/` for anything that looks unfamiliar before
assuming legacy Next.js behavior.
