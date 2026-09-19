import { useEffect, useState, type ReactNode } from "react";
import { Bell, Loader2, Menu } from "lucide-react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { AppSidebarNav } from "@/layouts/AppSidebarNav";
import { useAuth } from "@/hooks/use-auth";

const TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  tenders: "Tenders",
  new: "Add Tender",
  reports: "Reports",
  profile: "Profile",
};

function useCrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((segment, index) => ({
    label: TITLES[segment] ?? decodeURIComponent(segment),
    href: "/" + segments.slice(0, index + 1).join("/"),
    last: index === segments.length - 1,
  }));
}

function TopHeader({ mobileNav }: { mobileNav: ReactNode }) {
  const crumbs = useCrumbs();
  const { profile, role, user } = useAuth();

  const displayName = profile?.name || user?.email?.split("@")[0] || "User";
  const displayRole = role === "SUPER_ADMIN" ? "Super Admin" : "Tender User";
  const initial = (displayName.charAt(0) || "U").toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/85 backdrop-blur">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {mobileNav}
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">
              {crumbs.at(-1)?.label ?? "Dashboard"}
            </h2>
            <nav
              aria-label="Breadcrumb"
              className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              {crumbs.map((crumb) => (
                <span key={crumb.href} className="flex items-center gap-1.5">
                  <span className={crumb.last ? "truncate text-foreground" : "truncate"}>
                    {crumb.label}
                  </span>
                  {crumb.last ? null : <span aria-hidden>/</span>}
                </span>
              ))}
            </nav>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <Badge
            variant={role === "SUPER_ADMIN" ? "default" : "secondary"}
            className="hidden text-xs font-semibold sm:inline-flex"
          >
            {displayRole}
          </Badge>
          <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
            <Bell className="size-4" />
            <span className="absolute top-2 right-2 size-1.5 rounded-full bg-primary" aria-hidden />
          </Button>
          <Link
            to="/profile"
            aria-label="Open profile"
            className="grid size-9 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-85"
          >
            {initial}
          </Link>
        </div>
      </div>
    </header>
  );
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate({ to: "/" });
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 border-r border-sidebar-border lg:block">
        <AppSidebarNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader
          mobileNav={
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open navigation"
                >
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[264px] p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <AppSidebarNav onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
          }
        />
        <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-6 px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
