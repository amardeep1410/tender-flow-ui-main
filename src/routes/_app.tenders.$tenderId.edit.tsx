import { createFileRoute } from "@tanstack/react-router";
import { EditTenderPage } from "@/pages/EditTenderPage";

export const Route = createFileRoute("/_app/tenders/$tenderId/edit")({
  head: () => ({
    meta: [
      { title: "Edit Tender · Tender Management System" },
      {
        name: "description",
        content: "Modify tender specifications, milestones and financials.",
      },
      { property: "og:title", content: "Edit Tender · Tender Management System" },
      {
        property: "og:description",
        content: "Modify tender specifications, milestones and financials.",
      },
    ],
  }),
  component: EditTenderPage,
});
