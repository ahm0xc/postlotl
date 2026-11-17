import {
  BuildingsIcon,
  ChartLineUpIcon,
  EnvelopeSimpleIcon,
  FlagIcon,
  FolderSimpleIcon,
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
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuButtonText,
  SidebarMenuButtonTitle,
  SidebarMenuChevron,
  SidebarMenuItem,
  useSidebar,
} from "@repo/ui/components/sidebar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { authClient } from "~/lib/auth-client";
import { createProject, listProjects } from "~/server/projects";

import { CreateProjectDialog } from "./create-project-dialog";

const navigationItems = [
  { label: "Home", icon: HouseIcon },
  { label: "Activity", icon: PulseIcon },
  { label: "People", icon: UsersIcon },
  { label: "Feature flags", icon: FlagIcon },
  { label: "Web analytics", icon: ChartLineUpIcon },
  { label: "AI observability", icon: RobotIcon },
  { label: "Replay vision", icon: VideoCameraIcon },
];

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
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const organizationId = activeOrganization?.id;

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", organizationId],
    queryFn: () => listProjects({ data: { organizationId: organizationId ?? "" } }),
    enabled: organizationId !== undefined,
  });

  const currentProject =
    projects.find((project) => project.id === selectedProjectId) ?? projects[0];

  async function switchOrganization(id: string) {
    await authClient.organization.setActive({ organizationId: id });
    setSelectedProjectId(undefined);
  }

  async function handleCreateProject(name: string) {
    if (!organizationId) throw new Error("No active organization");
    const project = await createProject({ data: { organizationId, name } });
    await queryClient.invalidateQueries({ queryKey: ["projects", organizationId] });
    setSelectedProjectId(project.id);
    setCreateOpen(false);
  }

  return (
    <DashboardShellSidebar>
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
                    <FolderSimpleIcon aria-hidden="true" />
                    Switch project
                  </MenuSubTrigger>
                  <MenuSubPopup>
                    <MenuRadioGroup
                      value={currentProject?.id}
                      onValueChange={(value) => setSelectedProjectId(String(value))}
                    >
                      {projects.map((project) => (
                        <MenuRadioItem
                          disabled={project.id === currentProject?.id}
                          key={project.id}
                          value={project.id}
                        >
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
                      <BuildingsIcon aria-hidden="true" />
                      Switch organization
                    </MenuSubTrigger>
                    <MenuSubPopup>
                      <MenuRadioGroup
                        value={activeOrganization?.id}
                        onValueChange={(value) => switchOrganization(String(value))}
                      >
                        {(organizations ?? []).map((organization) => (
                          <MenuRadioItem key={organization.id} value={organization.id}>
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
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item, index) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton active={index === 0}>
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
