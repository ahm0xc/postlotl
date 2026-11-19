"use client";

import { useRouterState } from "@tanstack/react-router";

import { SidebarTrigger } from "@/components/ui/sidebar";

const pageTitles: Record<string, string> = {
  "": "Home",
  activity: "Activity",
  people: "People",
  "feature-flags": "Feature flags",
  "web-analytics": "Web analytics",
  "ai-observability": "AI observability",
  "replay-vision": "Replay vision",
  settings: "Settings",
};

export function PageHeader() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const segment = pathname.split("/").filter(Boolean)[2] ?? "";
  const title = pageTitles[segment] ?? "";

  return (
    <header className="z-sticky bg-background/80 sticky top-0 flex h-14 shrink-0 items-center gap-3 px-4 backdrop-blur">
      <SidebarTrigger className="md:hidden" />
      <h1 className="text-subtitle truncate">{title}</h1>
    </header>
  );
}
