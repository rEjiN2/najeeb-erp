import { MapPin, Tags } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Masters | ALA Dates",
};

const MASTER_LINKS = [
  {
    href: "/accounting-inventory/masters/locations",
    title: "Locations",
    description: "Branches, warehouses, stores and vans.",
    icon: MapPin,
  },
  {
    href: "/accounting-inventory/masters/product-groups",
    title: "Product Groups",
    description: "How products are grouped and nested.",
    icon: Tags,
  },
];

export default function MastersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Masters</h1>
        <p className="text-muted-foreground text-sm">
          Reference data the rest of the system is built on.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {MASTER_LINKS.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <span className="bg-accent text-accent-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="size-5" />
                </span>
                <div>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
