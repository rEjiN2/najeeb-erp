export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col items-start justify-center gap-1">
      <h1 className="font-heading text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground text-sm">
        This screen isn&apos;t built yet.
      </p>
    </div>
  );
}
