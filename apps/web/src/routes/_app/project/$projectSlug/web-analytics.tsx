import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/project/$projectSlug/web-analytics")({
  component: WebAnalyticsPage,
});

function WebAnalyticsPage() {
  return <h1 className="text-2xl font-semibold">Web analytics</h1>;
}
