import { createFileRoute } from "@tanstack/react-router";
import { TenderDetailsPage } from "@/pages/TenderDetailsPage";

export const Route = createFileRoute("/_app/tenders/$tenderId")({
  head: () => ({
    meta: [
      { title: "Tender details · Tender Management System" },
      {
        name: "description",
        content: "Full tender record: information, financials, dates, documents and history.",
      },
      { property: "og:title", content: "Tender details · Tender Management System" },
      {
        property: "og:description",
        content: "Full tender record: information, financials, dates, documents and history.",
      },
    ],
  }),
  component: TenderDetailsPage,
});
