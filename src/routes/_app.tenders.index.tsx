import { createFileRoute } from "@tanstack/react-router";
import { TenderListPage } from "@/pages/TenderListPage";

export const Route = createFileRoute("/_app/tenders/")({
  head: () => ({
    meta: [
      { title: "Tenders · Tender Management System" },
      {
        name: "description",
        content:
          "Search, filter and manage every tracked tender with statuses, values and deadlines.",
      },
      { property: "og:title", content: "Tenders · Tender Management System" },
      {
        property: "og:description",
        content:
          "Search, filter and manage every tracked tender with statuses, values and deadlines.",
      },
    ],
  }),
  component: TenderListPage,
});
