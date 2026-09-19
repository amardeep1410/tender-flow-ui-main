import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/pages/ProfilePage";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({
    meta: [
      { title: "Profile · Tender Management System" },
      {
        name: "description",
        content: "Review your account details and update your password for the tender workspace.",
      },
      { property: "og:title", content: "Profile · Tender Management System" },
      {
        property: "og:description",
        content: "Review your account details and update your password for the tender workspace.",
      },
    ],
  }),
  component: ProfilePage,
});
