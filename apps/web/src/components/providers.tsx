"use client";

import type { ReactNode } from "react";

import { FluidProvider } from "@/lib/fluid-provider";
import { phosphorIcons } from "@/lib/icons-phosphor";

export function Providers({ children }: { children: ReactNode }) {
  return <FluidProvider icons={phosphorIcons}>{children}</FluidProvider>;
}
