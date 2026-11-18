import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/project/$projectSlug/replay-vision")({
  component: ReplayVisionPage,
});

function ReplayVisionPage() {
  return null;
}
