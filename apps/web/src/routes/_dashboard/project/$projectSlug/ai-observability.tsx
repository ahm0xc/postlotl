import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/project/$projectSlug/ai-observability")({
  component: AiObservabilityPage,
});

function AiObservabilityPage() {
  return <h1 className="text-2xl font-semibold">AI observability</h1>;
}
