import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/pages/DashboardPage";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Tender Management System" },
      {
        name: "description",
        content: "Track tender counts, statuses and upcoming submission deadlines at a glance.",
      },
      { property: "og:title", content: "Dashboard · Tender Management System" },
      {
        property: "og:description",
        content: "Track tender counts, statuses and upcoming submission deadlines at a glance.",
      },
    ],
  }),
  component: DashboardPage,
});
