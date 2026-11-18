import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/project/$projectSlug/people")({
  component: PeoplePage,
});

function PeoplePage() {
  return null;
}
