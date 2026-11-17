import { Button } from "@repo/ui/components/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@repo/ui/components/card";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

import { authClient } from "~/lib/auth-client";
import { useSwitchOrganization } from "~/lib/organization";
import { getDefaultProjectSlug } from "~/server/projects";

export const Route = createFileRoute("/_app/")({
  beforeLoad: async () => {
    const projectSlug = await getDefaultProjectSlug();
    if (projectSlug) throw redirect({ to: "/project/$projectSlug", params: { projectSlug } });
  },
  component: Home,
});

function Home() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const { data: organizations } = authClient.useListOrganizations();
  const { data: activeOrganization } = authClient.useActiveOrganization();

  async function signOut() {
    await authClient.signOut();
    await navigate({ to: "/login" });
  }

  const switchOrganization = useSwitchOrganization();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>Choose an organization to continue.</CardDescription>
        </CardHeader>
        <CardPanel>
          <Select
            value={activeOrganization?.id ?? null}
            onValueChange={(value) => switchOrganization(String(value))}
          >
            <SelectTrigger aria-label="Organization">
              <SelectValue placeholder="Select organization" />
            </SelectTrigger>
            <SelectPopup>
              {(organizations ?? []).map((organization) => (
                <SelectItem key={organization.id} value={organization.id}>
                  {organization.name}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </CardPanel>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Signed in as {user.email}</CardDescription>
        </CardHeader>
        <CardPanel>
          <Button variant="outline" onClick={signOut}>
            Sign out
          </Button>
        </CardPanel>
      </Card>
    </main>
  );
}
