import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/project/$projectSlug/people")({
  component: PeoplePage,
});

function PeoplePage() {
  return <h1 className="text-2xl font-semibold">People</h1>;
}
