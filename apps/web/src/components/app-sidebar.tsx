import {
  ChartLineUpIcon,
  EnvelopeSimpleIcon,
  FlagIcon,
  GearSixIcon,
  HouseIcon,
  PlusIcon,
  PulseIcon,
  RobotIcon,
  UserPlusIcon,
  UsersIcon,
  VideoCameraIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Avatar, AvatarFallback } from "@repo/ui/components/avatar";
import {
  DashboardShellSidebar,
  DashboardShellSidebarHeader,
} from "@repo/ui/components/dashboard-shell";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuTrigger,
} from "@repo/ui/components/menu";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuButtonText,
  SidebarMenuButtonTitle,
  SidebarMenuChevron,
  SidebarMenuItem,
  useSidebar,
} from "@repo/ui/components/sidebar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useMatchRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";

import { authClient } from "~/lib/auth-client";
import { useSwitchOrganization } from "~/lib/organization";
import { createProject, listProjects } from "~/server/projects";

import { CreateProjectDialog } from "./create-project-dialog";

const navigationItems = [
  { label: "Home", icon: HouseIcon, to: "/project/$projectSlug" },
  { label: "Activity", icon: PulseIcon, to: "/project/$projectSlug/activity" },
  { label: "People", icon: UsersIcon, to: "/project/$projectSlug/people" },
  { label: "Feature flags", icon: FlagIcon, to: "/project/$projectSlug/feature-flags" },
  { label: "Web analytics", icon: ChartLineUpIcon, to: "/project/$projectSlug/web-analytics" },
  { label: "AI observability", icon: RobotIcon, to: "/project/$projectSlug/ai-observability" },
  { label: "Replay vision", icon: VideoCameraIcon, to: "/project/$projectSlug/replay-vision" },
] as const;

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function AppSidebar() {
  const { isMobile } = useSidebar();
  const queryClient = useQueryClient();
  const { data: organizations } = authClient.useListOrganizations();
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const switchOrganization = useSwitchOrganization();
  const { projectSlug } = useParams({ from: "/_app/project/$projectSlug" });
  const [createOpen, setCreateOpen] = useState(false);
  const organizationId = activeOrganization?.id;

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", organizationId],
    queryFn: () => listProjects({ data: { organizationId: organizationId ?? "" } }),
    enabled: organizationId !== undefined,
  });

  const currentProject = projects.find((project) => project.slug === projectSlug) ?? projects[0];

  function openProject(slug: string) {
    return navigate({ to: "/project/$projectSlug", params: { projectSlug: slug } });
  }

  async function handleCreateProject(name: string) {
    if (!organizationId) throw new Error("No active organization");
    const project = await createProject({ data: { organizationId, name } });
    await queryClient.invalidateQueries({ queryKey: ["projects", organizationId] });
    setCreateOpen(false);
    await openProject(project.slug);
  }

  return (
    <DashboardShellSidebar collapsible="none">
      <DashboardShellSidebarHeader className="h-auto py-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <Menu>
              <MenuTrigger
                aria-label="Project menu"
                render={<SidebarMenuButton size="xl" type="button" />}
              >
                <Avatar aria-hidden="true" shape="square" size="sm">
                  <AvatarFallback>{initialsOf(currentProject?.name ?? "P")}</AvatarFallback>
                </Avatar>
                <SidebarMenuButtonText>
                  <SidebarMenuButtonTitle>
                    {currentProject?.name ?? "No project"}
                  </SidebarMenuButtonTitle>
                </SidebarMenuButtonText>
                <SidebarMenuChevron variant="switcher" />
              </MenuTrigger>
              <MenuPopup
                align="start"
                side={isMobile ? "top" : "inline-end"}
                sideOffset={8}
                width="at-least-trigger"
              >
                <MenuSub>
                  <MenuSubTrigger>
                    <Avatar aria-hidden="true" shape="square" size="xs">
                      <AvatarFallback>{initialsOf(currentProject?.name ?? "P")}</AvatarFallback>
                    </Avatar>
                    {currentProject?.name ?? "No project"}
                  </MenuSubTrigger>
                  <MenuSubPopup>
                    <MenuRadioGroup
                      value={currentProject?.slug}
                      onValueChange={(value) => openProject(String(value))}
                    >
                      {projects.map((project) => (
                        <MenuRadioItem
                          disabled={project.slug === currentProject?.slug}
                          key={project.id}
                          value={project.slug}
                        >
                          <Avatar aria-hidden="true" shape="square" size="xs">
                            <AvatarFallback>{initialsOf(project.name)}</AvatarFallback>
                          </Avatar>
                          {project.name}
                        </MenuRadioItem>
                      ))}
                    </MenuRadioGroup>
                  </MenuSubPopup>
                </MenuSub>
                <MenuItem>
                  <UserPlusIcon aria-hidden="true" />
                  Invite member
                </MenuItem>
                <MenuItem>
                  <GearSixIcon aria-hidden="true" />
                  Project settings
                </MenuItem>
                <MenuSeparator />
                <MenuItem onClick={() => setCreateOpen(true)}>
                  <PlusIcon aria-hidden="true" />
                  Create new project
                </MenuItem>
                <MenuSeparator />
                <MenuGroup>
                  <MenuGroupLabel>Organizations</MenuGroupLabel>
                  <MenuSub>
                    <MenuSubTrigger>
                      <Avatar aria-hidden="true" shape="square" size="xs">
                        <AvatarFallback>
                          {initialsOf(activeOrganization?.name ?? "O")}
                        </AvatarFallback>
                      </Avatar>
                      {activeOrganization?.name ?? "No organization"}
                    </MenuSubTrigger>
                    <MenuSubPopup>
                      <MenuRadioGroup
                        value={activeOrganization?.id}
                        onValueChange={(value) => switchOrganization(String(value))}
                      >
                        {(organizations ?? []).map((organization) => (
                          <MenuRadioItem key={organization.id} value={organization.id}>
                            <Avatar aria-hidden="true" shape="square" size="xs">
                              <AvatarFallback>{initialsOf(organization.name)}</AvatarFallback>
                            </Avatar>
                            {organization.name}
                          </MenuRadioItem>
                        ))}
                      </MenuRadioGroup>
                    </MenuSubPopup>
                  </MenuSub>
                  <MenuItem>
                    <EnvelopeSimpleIcon aria-hidden="true" />
                    Invite to organization
                  </MenuItem>
                  <MenuItem>
                    <GearSixIcon aria-hidden="true" />
                    Organization settings
                  </MenuItem>
                </MenuGroup>
              </MenuPopup>
            </Menu>
          </SidebarMenuItem>
        </SidebarMenu>
      </DashboardShellSidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    active={
                      matchRoute({ to: item.to, params: { projectSlug }, fuzzy: false }) !== false
                    }
                    render={<Link params={{ projectSlug }} to={item.to} />}
                  >
                    <item.icon aria-hidden="true" />
                    {item.label}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreateProject}
      />
    </DashboardShellSidebar>
  );
}
