import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/project/$projectSlug/web-analytics")({
  component: WebAnalyticsPage,
});

function WebAnalyticsPage() {
  return null;
}
