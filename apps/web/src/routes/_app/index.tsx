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
    <div>
      <p>Signed in as {user.email}</p>
      <button type="button" onClick={signOut}>
        Sign out
      </button>
    </div>
  );
}
