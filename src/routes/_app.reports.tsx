import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { ReportsPage } from "@/pages/ReportsPage";

function ReportsRouteGuard() {
  const { role, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && role !== "SUPER_ADMIN") {
      toast.error("Access Restricted", {
        description: "Only Super Admins can access Reports.",
      });
      navigate({ to: "/dashboard" });
    }
  }, [role, isLoading, navigate]);

  if (isLoading || role !== "SUPER_ADMIN") {
    return null;
  }

  return <ReportsPage />;
}

export const Route = createFileRoute("/_app/reports")({
  head: () => ({
    meta: [
      { title: "Reports · Tender Management System" },
      {
        name: "description",
        content: "Summaries of tender status, source, monthly volume and total tender value.",
      },
      { property: "og:title", content: "Reports · Tender Management System" },
      {
        property: "og:description",
        content: "Summaries of tender status, source, monthly volume and total tender value.",
      },
    ],
  }),
  component: ReportsRouteGuard,
});
