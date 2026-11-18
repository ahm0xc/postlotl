import {
  Buildings,
  ChartLineUp,
  Check,
  Flag,
  GearSix,
  House,
  Plus,
  Pulse,
  Robot,
  SignOut,
  SquaresFour,
  Users,
  VideoCamera,
} from "@phosphor-icons/react/dist/ssr";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useMatchRoute, useNavigate, useParams } from "@tanstack/react-router";
import type { ComponentType } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownContent,
  DropdownLabel,
  DropdownMenu,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { MenuItem } from "@/components/ui/menu-item";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { IconComponent } from "@/lib/icon-context";
import { authClient } from "~/lib/auth-client";
import { createProject, listMyProjects } from "~/server/projects";

import { CreateProjectDialog } from "./create-project-dialog";
import { ThemeToggle } from "./theme-toggle";

type PhosphorGlyph = ComponentType<{
  size?: number;
  weight?: "light" | "regular";
  className?: string;
}>;

function asIcon(Icon: PhosphorGlyph): IconComponent {
  return function AppIcon({ size, strokeWidth, className }) {
    return (
      <Icon
        className={className}
        size={size}
        weight={strokeWidth !== undefined && strokeWidth >= 1.75 ? "regular" : "light"}
      />
    );
  };
}

function avatarUrl(userId: string) {
  return `https://api.dicebear.com/10.x/clay/svg?topProbability=0&patternProbability=0&seed=${encodeURIComponent(userId)}`;
}

const navigationItems = [
  { label: "Home", icon: asIcon(House), to: "/project/$projectSlug" },
  { label: "Activity", icon: asIcon(Pulse), to: "/project/$projectSlug/activity" },
  { label: "People", icon: asIcon(Users), to: "/project/$projectSlug/people" },
  { label: "Feature flags", icon: asIcon(Flag), to: "/project/$projectSlug/feature-flags" },
  { label: "Web analytics", icon: asIcon(ChartLineUp), to: "/project/$projectSlug/web-analytics" },
  { label: "AI observability", icon: asIcon(Robot), to: "/project/$projectSlug/ai-observability" },
  { label: "Replay vision", icon: asIcon(VideoCamera), to: "/project/$projectSlug/replay-vision" },
] satisfies { label: string; icon: IconComponent; to: string }[];

const cubeIcon = asIcon(Buildings);
const plusIcon = asIcon(Plus);
const checkIcon = asIcon(Check);
const signOutIcon = asIcon(SignOut);
const settingsIcon = asIcon(GearSix);
const projectsIcon = asIcon(SquaresFour);

export function AppSidebar() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const { projectSlug } = useParams({ from: "/_dashboard/project/$projectSlug" });
  const { setOpenMobile } = useSidebar();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => listMyProjects(),
  });

  const currentProject = projects.find((project) => project.slug === projectSlug) ?? projects[0];

  function closeMobileSidebar() {
    setOpenMobile(false);
  }

  function openProject(slug: string) {
    closeMobileSidebar();
    return navigate({ to: "/project/$projectSlug", params: { projectSlug: slug } });
  }

  async function handleCreateProject(name: string) {
    const project = await createProject({ data: { name } });
    await queryClient.invalidateQueries({ queryKey: ["projects"] });
    setCreateOpen(false);
    await openProject(project.slug);
  }

  async function handleSignOut() {
    closeMobileSidebar();
    await authClient.signOut();
    await navigate({ to: "/sign-in" });
  }

  const user = session?.user;

  return (
    <>
      <Sidebar rail={false}>
        <SidebarHeader>
          <div className="flex items-center gap-1 p-1">
            <DropdownMenu>
              <DropdownTrigger
                render={
                  <Button
                    className="min-w-0 flex-1 justify-start"
                    variant="ghost"
                    leadingIcon={cubeIcon}
                  >
                    {currentProject?.name ?? "No project"}
                  </Button>
                }
              />
              <DropdownContent align="start" sideOffset={6}>
                <DropdownLabel>Projects</DropdownLabel>
                {projects.map((project, index) => (
                  <MenuItem
                    key={project.id}
                    checked={project.slug === currentProject?.slug}
                    icon={project.slug === currentProject?.slug ? checkIcon : undefined}
                    index={index}
                    label={project.name}
                    onSelect={() => openProject(project.slug)}
                  />
                ))}
                <DropdownSeparator />
                <MenuItem
                  icon={plusIcon}
                  index={projects.length}
                  label="Create new project"
                  onSelect={() => {
                    closeMobileSidebar();
                    setCreateOpen(true);
                  }}
                />
                <MenuItem
                  icon={projectsIcon}
                  index={projects.length + 1}
                  label="All projects"
                  onSelect={() => {
                    closeMobileSidebar();
                    void navigate({ to: "/projects" });
                  }}
                />
              </DropdownContent>
            </DropdownMenu>
            <ThemeToggle />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Project</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      icon={item.icon}
                      isActive={
                        matchRoute({ to: item.to, params: { projectSlug }, fuzzy: false }) !== false
                      }
                      onClick={closeMobileSidebar}
                      render={<Link params={{ projectSlug }} to={item.to} />}
                    >
                      {item.label}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                icon={settingsIcon}
                isActive={
                  matchRoute({
                    to: "/project/$projectSlug/settings",
                    params: { projectSlug },
                    fuzzy: false,
                  }) !== false
                }
                onClick={closeMobileSidebar}
                render={<Link params={{ projectSlug }} to="/project/$projectSlug/settings" />}
              >
                Settings
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          {user && (
            <DropdownMenu>
              <DropdownTrigger
                render={
                  <Button className="w-full justify-start pl-2" variant="ghost">
                    <span className="flex min-w-0 items-center gap-2">
                      <img
                        alt=""
                        className="size-6 shrink-0 rounded-full"
                        src={avatarUrl(user.id)}
                      />
                      <span className="truncate">{user.name || user.email}</span>
                    </span>
                  </Button>
                }
              />
              <DropdownContent align="start" side="top" sideOffset={6}>
                <DropdownLabel>{user.email}</DropdownLabel>
                <DropdownSeparator />
                <MenuItem
                  icon={signOutIcon}
                  index={0}
                  label="Sign out"
                  onSelect={() => void handleSignOut()}
                />
              </DropdownContent>
            </DropdownMenu>
          )}
        </SidebarFooter>
      </Sidebar>
      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreateProject}
      />
    </>
  );
}
