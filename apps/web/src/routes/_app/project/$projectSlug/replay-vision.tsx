import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/project/$projectSlug/replay-vision")({
  component: ReplayVisionPage,
});

function ReplayVisionPage() {
  return <h1 className="text-2xl font-semibold">Replay vision</h1>;
}
