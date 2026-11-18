import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Banner, BannerDescription, BannerTitle } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "~/lib/auth-client";
import { acceptInvitation, getInvitationByToken } from "~/server/invitations";

export const Route = createFileRoute("/invite/$token")({
  loader: async ({ params }) => {
    const invitation = await getInvitationByToken({ data: { token: params.token } });
    if (!invitation) throw notFound();
    return invitation;
  },
  component: InvitePage,
});

function InvitePage() {
  const invitation = Route.useLoaderData();
  const { token } = Route.useParams();
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const unavailable = invitation.status !== "pending" || invitation.expired;
  const invitationPath = `/invite/${token}`;

  async function onAccept() {
    setPending(true);
    setError(null);

    try {
      const result = await acceptInvitation({ data: { token } });
      await navigate({
        to: "/project/$projectSlug",
        params: { projectSlug: result.projectSlug },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept invitation");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Join {invitation.projectName}</CardTitle>
          <CardDescription>
            {invitation.inviterName} invited {invitation.email} to collaborate as{" "}
            <Badge variant="dot" color="blue">
              {invitation.role}
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {unavailable ? (
            <Banner status="warning">
              <BannerTitle>This invitation is no longer available</BannerTitle>
              <BannerDescription>
                Ask an admin of the project for a new invite link.
              </BannerDescription>
            </Banner>
          ) : isPending ? null : session ? (
            <>
              <Button className="w-full" loading={pending} onClick={onAccept}>
                Accept invitation
              </Button>
              <p className="text-caption text-muted-foreground">
                Signed in as {session.user.email}
              </p>
            </>
          ) : (
            <>
              <Button className="w-full" asChild>
                <a href={`/sign-in?redirect=${encodeURIComponent(invitationPath)}`}>Sign in</a>
              </Button>
              <Button variant="secondary" className="w-full" asChild>
                <a href={`/sign-up?redirect=${encodeURIComponent(invitationPath)}`}>
                  Create an account
                </a>
              </Button>
            </>
          )}
          {error && (
            <Banner status="error">
              <BannerTitle>Could not accept invitation</BannerTitle>
              <BannerDescription>{error}</BannerDescription>
            </Banner>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
