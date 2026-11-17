"use client";

import { CSPProvider } from "@base-ui/react/csp-provider";
import * as React from "react";
import { useUIMotionPreset } from "../motion/motion-provider";
import { cn } from "../utils/cn";

export type ControlSize = "sm" | "md" | "lg" | "xl";
export type Density = "compact" | "default";
export type Radius = "none" | "sm" | "md" | "lg" | "xl";

export interface UIConfig {
  controlSize: ControlSize;
  density: Density;
  hairline: boolean;
  radius: Radius;
}

export interface UIProviderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  controlSize?: ControlSize;
  "data-theme"?: "dark" | "light";
  density?: Density;
  /**
   * Whether the edges, rims and dividers of every kit component inside, and of
   * the overlays they open, draw the kit's hairline: 0.5 px on 2x and denser
   * screens and 1 px below them. `false` draws them 1 px wide in the colours
   * of a 1x screen on every screen (`data-hairline="false"` on the provider
   * and its portal scopes, design-rework.css). An inner provider without it
   * keeps the outer provider's. Default `true`.
   */
  hairline?: boolean;
  /**
   * The nonce of a Content Security Policy that allows inline scripts and
   * styles only with a nonce. The kit renders no inline script or style; the
   * provider hands the nonce to React Aria, which adds a style at run time,
   * through a `<meta property="csp-nonce">` in the head, and to Base UI's
   * `CSPProvider` for any inline element Base UI renders. An inner provider
   * without one keeps the outer provider's.
   */
  nonce?: string | undefined;
  /**
   * The corner radius of every kit component inside: the base `--radius` and
   * the role radii derived from it (design-rework.css). `md` is the kit's
   * default, also without a provider.
   */
  radius?: Radius;
}

export const uiUIDefaults = {
  controlSize: "sm",
  density: "default",
  hairline: true,
  radius: "md",
} as const satisfies UIConfig;

/** The base `--radius` of each provider radius, as the kit's stylesheet sets it. */
export const uiRadiusValues = {
  none: "0rem",
  sm: "0.5rem",
  md: "0.625rem",
  lg: "0.875rem",
  xl: "1.25rem",
} as const satisfies Record<Radius, string>;

const UIContext = React.createContext<UIConfig | null>(null);
const NonceContext = React.createContext<string | undefined>(
  undefined,
);
const UIThemeContext = React.createContext<
  "dark" | "light" | undefined
>(undefined);

export function resolveControlSize<T extends string>(
  size: T | null | undefined,
  contextSize: ControlSize,
): T | ControlSize {
  return size ?? contextSize;
}

export function resolveDensity<T extends string>(
  density: T | null | undefined,
  contextDensity: Density,
): T | Density {
  return density ?? contextDensity;
}

export function resolveRadius<T extends string>(
  radius: T | null | undefined,
  contextRadius: Radius,
): T | Radius {
  return radius ?? contextRadius;
}

export function useUI(): UIConfig {
  return React.useContext(UIContext) ?? uiUIDefaults;
}

export function useResolvedControlSize<T extends string>(
  size: T | null | undefined,
): T | ControlSize {
  const context = useUI();
  return resolveControlSize(size, context.controlSize);
}

/**
 * The control sizes from the smallest, 32, 36, 40, 44 and 48 px; only a part
 * that is xs at the default uses xs.
 */
const controlSizeSteps = ["xs", "sm", "md", "lg", "xl"] as const;

/**
 * The size of a part designed for the default control size, at another control
 * size: it keeps its steps from the default within the scale. A part that is
 * md at the default sm is lg at md and xl at lg (Lukas, 13 October 2026; the
 * default moved from lg to sm and the sizes to 4 px steps on 30
 * October 2026). Patterns size their parts this way, so they keep their
 * proportions at every control size and look as designed at the default.
 */
export function resolveRelativeControlSize(
  sizeAtDefault: ControlSize,
  controlSize: ControlSize,
): ControlSize;
export function resolveRelativeControlSize(
  sizeAtDefault: "xs" | ControlSize,
  controlSize: ControlSize,
): "xs" | ControlSize;
export function resolveRelativeControlSize(
  sizeAtDefault: "xs" | ControlSize,
  controlSize: ControlSize,
): "xs" | ControlSize {
  const step =
    controlSizeSteps.indexOf(controlSize) +
    controlSizeSteps.indexOf(sizeAtDefault) -
    controlSizeSteps.indexOf(uiUIDefaults.controlSize);
  const lowest = sizeAtDefault === "xs" ? 0 : 1;
  return controlSizeSteps[
    Math.min(controlSizeSteps.length - 1, Math.max(lowest, step))
  ]!;
}

/** `resolveRelativeControlSize` at the provider's control size. */
export function useRelativeControlSize(
  sizeAtDefault: ControlSize,
): ControlSize;
export function useRelativeControlSize(
  sizeAtDefault: "xs" | ControlSize,
): "xs" | ControlSize;
export function useRelativeControlSize(
  sizeAtDefault: "xs" | ControlSize,
): "xs" | ControlSize {
  return resolveRelativeControlSize(
    sizeAtDefault,
    useUI().controlSize,
  );
}

/**
 * Gives the parts inside a control size without an element of their own: a
 * Button or a field in it, with no size of theirs, takes `controlSize`, as it
 * would inside a provider with that size. A part that sets its controls apart
 * from the page's, such as Empty, whose actions step with its size, wraps its
 * content in it. Density and radius stay the provider's.
 */
export function ControlSizeScope({
  children,
  controlSize,
}: {
  children: React.ReactNode;
  controlSize: ControlSize;
}): React.ReactElement {
  const parent = useUI();
  const value = React.useMemo<UIConfig>(
    () => ({ ...parent, controlSize }),
    [parent, controlSize],
  );
  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
}

/** The provider's CSP nonce, for a kit part that hands it to a library that adds an inline style. */
export function useUINonce(): string | undefined {
  return React.useContext(NonceContext);
}

export function useResolvedDensity<T extends string>(
  density: T | null | undefined,
): T | Density {
  const context = useUI();
  return resolveDensity(density, context.density);
}

export function useResolvedRadius<T extends string>(
  radius: T | null | undefined,
): T | Radius {
  const context = useUI();
  return resolveRadius(radius, context.radius);
}

// A provider and its portal scopes add no box of their own (`display:
// contents` in design-rework.css, so a policy that blocks style attributes
// leaves the layout alone). Their radius reaches the kit through data-radius:
// the stylesheet sets the base for it and derives every corner again on the
// scope, so a portal follows its provider. The hairline switch reaches it the
// same way, through data-hairline.
export function UIPortalScope({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const value = useUI();
  const theme = React.useContext(UIThemeContext);
  const motionPreset = useUIMotionPreset();

  return (
    <div
      data-control-size={value.controlSize}
      data-density={value.density}
      data-hairline={value.hairline ? "true" : "false"}
      data-radius={value.radius}
      className="sp-ui-portal-scope"
      data-slot="ui-portal-scope"
      data-sp-motion={motionPreset}
      data-theme={theme}
    >
      {children}
    </div>
  );
}

export function UIProvider({
  children,
  controlSize,
  density,
  hairline,
  nonce,
  radius,
  "data-theme": theme,
  ...props
}: UIProviderProps): React.ReactElement {
  const parent = useUI();
  const parentNonce = React.useContext(NonceContext);
  const parentTheme = React.useContext(UIThemeContext);
  const resolvedTheme =
    theme === "dark" || theme === "light" ? theme : parentTheme;
  // An empty nonce is none.
  const ownNonce = nonce || undefined;
  const resolvedNonce = ownNonce ?? parentNonce;
  const value = React.useMemo<UIConfig>(
    () => ({
      controlSize: controlSize ?? parent.controlSize,
      density: density ?? parent.density,
      hairline: hairline ?? parent.hairline,
      radius: radius ?? parent.radius,
    }),
    [
      controlSize,
      density,
      hairline,
      radius,
      parent.controlSize,
      parent.density,
      parent.hairline,
      parent.radius,
    ],
  );
  return (
    <UIContext.Provider value={value}>
      <UIThemeContext.Provider value={resolvedTheme}>
        <NonceContext.Provider value={resolvedNonce}>
          <div
            {...props}
            className={cn("sp-ui-provider", props.className)}
            data-control-size={value.controlSize}
            data-density={value.density}
            data-hairline={value.hairline ? "true" : "false"}
            data-radius={value.radius}
            data-slot="ui-provider"
            data-theme={theme}
          >
            {/* React Aria reads the nonce for the styles it adds at run time
                from this element, which React moves into the head; Vite's
                html.cspNonce uses the same convention. Browsers hide a nonce
                attribute once a policy applies, and React finds a hoisted meta
                by its other attributes, so hydration keeps it. Only the
                provider that brings a nonce renders it. */}
            {ownNonce && ownNonce !== parentNonce ? (
              <meta
                nonce={ownNonce}
                property="csp-nonce"
                suppressHydrationWarning
              />
            ) : null}
            {/* Base UI renders no <style> of its own: the kit stylesheet holds
                its scrollbar rules (design-rework.css). Any inline element it
                still renders takes the nonce. */}
            <CSPProvider disableStyleElements nonce={resolvedNonce}>
              {children}
            </CSPProvider>
          </div>
        </NonceContext.Provider>
      </UIThemeContext.Provider>
    </UIContext.Provider>
  );
}
