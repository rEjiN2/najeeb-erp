export function SidebarSectionLabel({
  children,
  collapsed,
}: {
  children: string;
  collapsed: boolean;
}) {
  if (collapsed) {
    return <div className="bg-sidebar-border mx-3 mb-2 h-px" aria-hidden />;
  }

  return (
    <p className="text-sidebar-foreground/45 px-2.5 pb-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase">
      {children}
    </p>
  );
}
