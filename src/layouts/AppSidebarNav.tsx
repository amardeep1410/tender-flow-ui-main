import { Link, useNavigate } from "@tanstack/react-router";
import { BarChart3, FileText, LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { to: "/tenders", label: "Tenders", icon: FileText, adminOnly: false },
  { to: "/reports", label: "Reports", icon: BarChart3, adminOnly: true },
  { to: "/profile", label: "Profile", icon: UserRound, adminOnly: false },
] as const;

export function AppSidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const { profile, role, user, signOut } = useAuth();

  const displayName = profile?.name || user?.email?.split("@")[0] || "User";
  const displayRole = role === "SUPER_ADMIN" ? "Super Admin" : "Tender User";
  const initial = (displayName.charAt(0) || "U").toUpperCase();

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || role === "SUPER_ADMIN");

  async function handleLogout() {
    await signOut();
    toast.success("Signed out", { description: "You have been safely signed out." });
    navigate({ to: "/" });
  }

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
        <BrandMark />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-sidebar-foreground">Tender Management</p>
          <p className="truncate text-xs text-muted-foreground">Internal workspace</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Main navigation">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            activeOptions={{ exact: item.to === "/dashboard" }}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground data-[status=active]:font-semibold"
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{displayRole}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="mt-1 w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
