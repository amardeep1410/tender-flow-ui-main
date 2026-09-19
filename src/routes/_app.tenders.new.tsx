import { createFileRoute } from "@tanstack/react-router";
import { AddTenderPage } from "@/pages/AddTenderPage";

export const Route = createFileRoute("/_app/tenders/new")({
  head: () => ({
    meta: [
      { title: "Add Tender · Tender Management System" },
      {
        name: "description",
        content: "Capture tender details, financials, key dates and supporting documents.",
      },
      { property: "og:title", content: "Add Tender · Tender Management System" },
      {
        property: "og:description",
        content: "Capture tender details, financials, key dates and supporting documents.",
      },
    ],
  }),
  component: AddTenderPage,
});
