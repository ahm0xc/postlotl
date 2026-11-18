import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/project/$projectSlug/ai-observability")({
  component: AiObservabilityPage,
});

function AiObservabilityPage() {
  return null;
}
