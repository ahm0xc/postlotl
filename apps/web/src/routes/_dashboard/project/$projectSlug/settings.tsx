import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, getRouteApi, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Banner, BannerDescription, BannerTitle } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import {
  assignableRoles,
  can,
  invitableRoles,
  type InvitableRole,
  type ProjectRole,
} from "~/lib/permissions";
import { inviteMember, listInvitations, revokeInvitation } from "~/server/invitations";
import { leaveProject, listMembers, removeMember, updateMemberRole } from "~/server/members";
import { deleteProject, transferOwnership, updateProject } from "~/server/projects";

export const Route = createFileRoute("/_dashboard/project/$projectSlug/settings")({
  component: SettingsPage,
});

const projectRoute = getRouteApi("/_dashboard/project/$projectSlug");

type Tab = "members" | "general";

function SettingsPage() {
  const { project, role } = projectRoute.useRouteContext();
  const [tab, setTab] = useState<Tab>("members");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-display font-medium">{project.name}</h1>
        <Badge variant="dot" color="blue">
          {role}
        </Badge>
      </div>
      <div className="flex gap-2">
        <Button
          variant={tab === "members" ? "secondary" : "ghost"}
          onClick={() => setTab("members")}
        >
          Members
        </Button>
        <Button
          variant={tab === "general" ? "secondary" : "ghost"}
          onClick={() => setTab("general")}
        >
          General
        </Button>
      </div>
      {tab === "members" ? <MembersTab slug={project.slug} role={role} /> : null}
      {tab === "general" ? (
        <GeneralTab slug={project.slug} name={project.name} role={role} />
      ) : null}
    </div>
  );
}

function MembersTab({ slug, role }: { slug: string; role: ProjectRole }) {
  const queryClient = useQueryClient();
  const membersQuery = useQuery({
    queryKey: ["members", slug],
    queryFn: () => listMembers({ data: { slug } }),
  });
  const invitationsQuery = useQuery({
    queryKey: ["invitations", slug],
    queryFn: () => listInvitations({ data: { slug } }),
    enabled: can(role, "manage_members"),
  });

  const manageMembers = can(role, "manage_members");
  const manageableRoles = assignableRoles(role);
  const members = membersQuery.data ?? [];
  const invitations = invitationsQuery.data ?? [];

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["members", slug] });
    void queryClient.invalidateQueries({ queryKey: ["invitations", slug] });
  }

  const roleMutation = useMutation({
    mutationFn: (input: { userId: string; role: InvitableRole }) =>
      updateMemberRole({ data: { slug, ...input } }),
    onSuccess: refresh,
  });
  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeMember({ data: { slug, userId } }),
    onSuccess: refresh,
  });
  const revokeMutation = useMutation({
    mutationFn: (invitationId: string) => revokeInvitation({ data: { slug, invitationId } }),
    onSuccess: refresh,
  });

  const error =
    roleMutation.error ?? removeMutation.error ?? revokeMutation.error ?? membersQuery.error;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>Everyone with access to this project.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {members.map((member) => {
            const editable =
              manageMembers &&
              member.role !== "owner" &&
              (member.role !== "admin" || can(role, "manage_admins"));
            return (
              <div key={member.userId} className="flex items-center justify-between gap-3">
                <div className="grid">
                  <span className="text-body">{member.name}</span>
                  <span className="text-caption text-muted-foreground">{member.email}</span>
                </div>
                {editable ? (
                  <div className="flex items-center gap-2">
                    <Select
                      value={member.role}
                      onValueChange={(value) =>
                        roleMutation.mutate({
                          userId: member.userId,
                          role: value as InvitableRole,
                        })
                      }
                    >
                      <SelectTrigger className="w-32" />
                      <SelectContent>
                        {manageableRoles.map((option, optionIndex) => (
                          <SelectItem key={option} index={optionIndex} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="destructive"
                      size="compact"
                      loading={
                        removeMutation.isPending && removeMutation.variables === member.userId
                      }
                      onClick={() => removeMutation.mutate(member.userId)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <Badge variant="dot" color="gray">
                    {member.role}
                  </Badge>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {manageMembers ? (
        <InviteCard slug={slug} roles={manageableRoles} onInvited={refresh} />
      ) : null}

      {manageMembers && invitations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
            <CardDescription>Invitations that have not been accepted yet.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="flex items-center justify-between gap-3">
                <div className="grid">
                  <span className="text-body">{invitation.email}</span>
                  <span className="text-caption text-muted-foreground">
                    {invitation.role} · expires{" "}
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="compact"
                  loading={revokeMutation.isPending && revokeMutation.variables === invitation.id}
                  onClick={() => revokeMutation.mutate(invitation.id)}
                >
                  Revoke
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <Banner status="error">
          <BannerTitle>Something went wrong</BannerTitle>
          <BannerDescription>{error.message}</BannerDescription>
        </Banner>
      ) : null}
    </>
  );
}

function InviteCard({
  slug,
  roles,
  onInvited,
}: {
  slug: string;
  roles: InvitableRole[];
  onInvited: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableRole>(roles[0] ?? "viewer");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: () => inviteMember({ data: { slug, email, role } }),
    onSuccess: (result) => {
      const path = `/invite/${result.token}`;
      setInviteLink(`${window.location.origin}${path}`);
      setEmail("");
      setCopied(false);
      onInvited();
    },
  });

  async function copyLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite someone</CardTitle>
        <CardDescription>
          Invitations are single use and expire after 3 days. Share the link yourself.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="flex-1">
            <Field>
              <FieldLabel htmlFor="invite-email">Email</FieldLabel>
              <Input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
          </div>
          <Select value={role} onValueChange={(value) => setRole(value as InvitableRole)}>
            <SelectTrigger className="w-32" />
            <SelectContent>
              {invitableRoles
                .filter((option) => roles.includes(option))
                .map((option, index) => (
                  <SelectItem key={option} index={index} value={option}>
                    {option}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button type="submit" loading={mutation.isPending}>
            Create invite
          </Button>
        </form>

        {inviteLink ? (
          <div className="grid gap-2">
            <Input readOnly value={inviteLink} onFocus={(event) => event.target.select()} />
            <Button variant="secondary" size="compact" onClick={() => void copyLink()}>
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
        ) : null}

        {mutation.error ? (
          <Banner status="error">
            <BannerTitle>Could not create invitation</BannerTitle>
            <BannerDescription>{mutation.error.message}</BannerDescription>
          </Banner>
        ) : null}
      </CardContent>
    </Card>
  );
}

function GeneralTab({ slug, name, role }: { slug: string; name: string; role: ProjectRole }) {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [projectName, setProjectName] = useState(name);
  const [transferTo, setTransferTo] = useState<string>("");

  const membersQuery = useQuery({
    queryKey: ["members", slug],
    queryFn: () => listMembers({ data: { slug } }),
  });

  const renameMutation = useMutation({
    mutationFn: () => updateProject({ data: { slug, name: projectName } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
  const transferMutation = useMutation({
    mutationFn: () => transferOwnership({ data: { slug, userId: transferTo } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["members", slug] });
      await router.invalidate();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteProject({ data: { slug } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await navigate({ to: "/" });
    },
  });
  const leaveMutation = useMutation({
    mutationFn: () => leaveProject({ data: { slug } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await navigate({ to: "/" });
    },
  });

  const transferCandidates = (membersQuery.data ?? []).filter((member) => member.role !== "owner");

  const error =
    renameMutation.error ?? transferMutation.error ?? deleteMutation.error ?? leaveMutation.error;

  return (
    <>
      {can(role, "settings") ? (
        <Card>
          <CardHeader>
            <CardTitle>Project name</CardTitle>
            <CardDescription>The slug never changes once a project is created.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                renameMutation.mutate();
              }}
            >
              <div className="flex-1">
                <Field>
                  <FieldLabel htmlFor="project-name">Name</FieldLabel>
                  <Input
                    id="project-name"
                    value={projectName}
                    maxLength={100}
                    required
                    onChange={(event) => setProjectName(event.target.value)}
                  />
                </Field>
              </div>
              <Button type="submit" loading={renameMutation.isPending}>
                Save
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {can(role, "transfer_ownership") ? (
        <Card>
          <CardHeader>
            <CardTitle>Transfer ownership</CardTitle>
            <CardDescription>
              You become an admin and the selected member becomes the owner. Only one owner can
              exist.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Select value={transferTo} onValueChange={(value) => setTransferTo(String(value))}>
              <SelectTrigger placeholder="Select a member" />
              <SelectContent>
                {transferCandidates.map((member, index) => (
                  <SelectItem key={member.userId} index={index} value={member.userId}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="secondary"
              disabled={!transferTo}
              loading={transferMutation.isPending}
              onClick={() => transferMutation.mutate()}
            >
              Transfer ownership
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {can(role, "delete_project") ? (
        <Card>
          <CardHeader>
            <CardTitle>Delete project</CardTitle>
            <CardDescription>
              The project is archived and disappears from everyone&apos;s sidebar. Its slug stays
              reserved.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              Delete project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Leave project</CardTitle>
            <CardDescription>You will lose access until you are invited again.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              loading={leaveMutation.isPending}
              onClick={() => leaveMutation.mutate()}
            >
              Leave project
            </Button>
          </CardContent>
        </Card>
      )}

      {error ? (
        <Banner status="error">
          <BannerTitle>Something went wrong</BannerTitle>
          <BannerDescription>{error.message}</BannerDescription>
        </Banner>
      ) : null}
    </>
  );
}
