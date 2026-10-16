import {
  COMPANY_PROFILE_DESCRIPTION,
  COMPANY_PROFILE_TITLE,
} from "@/features/company/constants";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">
          {COMPANY_PROFILE_TITLE}
        </h1>
        <p className="text-muted-foreground text-sm">
          {COMPANY_PROFILE_DESCRIPTION}
        </p>
      </div>
      <div className="bg-muted h-40 animate-pulse rounded-xl" />
      <div className="bg-muted h-56 animate-pulse rounded-xl" />
      <div className="bg-muted h-56 animate-pulse rounded-xl" />
    </div>
  );
}
