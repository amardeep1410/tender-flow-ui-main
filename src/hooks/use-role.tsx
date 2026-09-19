import { type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { UserRole } from "@/types/tender";

export function RoleProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useRole() {
  const { role } = useAuth();
  return {
    role: (role === "SUPER_ADMIN" ? "super_admin" : "tender_user") as UserRole,
    setRole: () => {
      // Role is managed strictly by Supabase and RBAC in Credit 2
    },
  };
}
