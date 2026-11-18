import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/project/$projectSlug/feature-flags")({
  component: FeatureFlagsPage,
});

function FeatureFlagsPage() {
  return <h1 className="text-2xl font-semibold">Feature flags</h1>;
}
