"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface PeriodToggleProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
}

export function PeriodToggle<T extends string>({
  value,
  onChange,
  options,
}: PeriodToggleProps<T>) {
  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      value={[value]}
      onValueChange={(next) => {
        const [selected] = next;
        if (selected) onChange(selected as T);
      }}
    >
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
