"use client";

import { Button } from "@/components/ui/button";
import { useIcons } from "@/lib/icon-context";
import { useTheme, type ThemePreference } from "@/lib/theme";

const cycle: ThemePreference[] = ["system", "light", "dark"];

const labels: Record<ThemePreference, string> = {
  system: "System theme",
  light: "Light theme",
  dark: "Dark theme",
};

export function ThemeToggle() {
  const icons = useIcons();
  const { preference, setPreference } = useTheme();
  const TriggerIcon =
    preference === "system" ? icons.monitor : preference === "dark" ? icons.moon : icons.sun;

  const next = cycle[(cycle.indexOf(preference) + 1) % cycle.length];

  function cycleTheme() {
    setPreference(next);
  }

  return (
    <Button
      aria-label={`${labels[preference]}, switch to ${labels[next]}`}
      className="shrink-0"
      onClick={cycleTheme}
      size="icon"
      title={labels[preference]}
      variant="ghost"
    >
      <TriggerIcon size={16} strokeWidth={1.5} />
    </Button>
  );
}
