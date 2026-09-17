export function SidebarSectionLabel({
  children,
  collapsed,
}: {
  children: string;
  collapsed: boolean;
}) {
  if (collapsed) return null;

  return (
    <p className="text-muted-foreground px-2 pb-1 text-xs font-medium tracking-wide uppercase">
      {children}
    </p>
  );
}
