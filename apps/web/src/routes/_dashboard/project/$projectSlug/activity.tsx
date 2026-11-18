import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/project/$projectSlug/activity")({
  component: ActivityPage,
});

function ActivityPage() {
  return null;
}
