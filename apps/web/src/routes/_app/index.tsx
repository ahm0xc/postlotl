import { Button } from "@repo/ui/components/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@repo/ui/components/card";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/_app/")({ component: Home });

function Home() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  async function signOut() {
    await authClient.signOut();
    await navigate({ to: "/login" });
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
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
