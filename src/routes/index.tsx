import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/pages/LoginPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in · Tender Management System" },
      {
        name: "description",
        content:
          "Sign in to the internal Tender Management System to track tenders, deadlines and submissions.",
      },
      { property: "og:title", content: "Sign in · Tender Management System" },
      {
        property: "og:description",
        content: "Internal workspace for tracking tenders, deadlines and submissions.",
      },
    ],
  }),
  component: LoginPage,
});
