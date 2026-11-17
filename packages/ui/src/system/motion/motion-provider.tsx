"use client";

import {
  createContext,
  type HTMLAttributes,
  type ReactNode,
  useContext,
  useRef,
} from "react";

import { cn } from "../utils/cn";
import { VisualScopeBoundary } from "../provider/visual-scope-context";

export type MotionPreset = "standard" | "reduced";

const MotionContext = createContext<MotionPreset | undefined>(
  undefined,
);

export type MotionProviderProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  preset: MotionPreset;
};

export function MotionProvider({
  children,
  className,
  preset,
  ...props
}: MotionProviderProps) {
  const scopeRef = useRef<HTMLDivElement>(null);

  return (
    <MotionContext.Provider value={preset}>
      <VisualScopeBoundary scopeRef={scopeRef}>
        <div
          {...props}
          className={cn("sp-motion-scope", className)}
          data-sp-motion={preset}
          data-sp-scope="motion"
          ref={scopeRef}
        >
          {children}
        </div>
      </VisualScopeBoundary>
    </MotionContext.Provider>
  );
}

export function useUIMotionPreset() {
  return useContext(MotionContext);
}
