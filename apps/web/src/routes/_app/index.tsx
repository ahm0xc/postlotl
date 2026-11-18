import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
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
  const options = organizations ?? [];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>Choose an organization to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <Field>
            <FieldLabel htmlFor="organization">Organization</FieldLabel>
            <Select
              value={activeOrganization?.id}
              onValueChange={(value) => switchOrganization(String(value))}
            >
              <SelectTrigger id="organization" placeholder="Select organization" />
              <SelectContent>
                {options.map((organization, index) => (
                  <SelectItem key={organization.id} index={index} value={organization.id}>
                    {organization.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Signed in as {user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="secondary" onClick={signOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
