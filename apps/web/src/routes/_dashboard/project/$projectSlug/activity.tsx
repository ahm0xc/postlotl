import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/project/$projectSlug/activity")({
  component: ActivityPage,
});

function ActivityPage() {
  return <h1 className="text-2xl font-semibold">Activity</h1>;
}
