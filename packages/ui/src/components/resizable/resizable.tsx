"use client";

import * as React from "react";
import * as ResizablePrimitive from "react-resizable-panels";

import { useUIMessages } from "../../system/locale/messages-context";
import { splitterHandleClassName } from "../../system/styles/splitter-handle";
import { cn } from "../../system/utils/cn";
import { slotClass } from "../../system/utils/slot-class";

export type ResizablePanelGroupProps = ResizablePrimitive.GroupProps;
export type ResizablePanelProps = ResizablePrimitive.PanelProps;
export type ResizableHandleProps = ResizablePrimitive.SeparatorProps;

// The grab area of a handle under a mouse or a pen: the 8 px of the
// splitter handle's stylesheet (design-rework.css, "The splitter handle").
// A finger keeps the 20 px that react-resizable-panels gives it.
const handleTargetSize = { coarse: 20, fine: 8 } as const;

/**
 * Panels that people resize along one axis: side by side, the default
 * `orientation="horizontal"`, or one above the other with `"vertical"`. The
 * group fills its container, which sets its height, and react-resizable-panels
 * owns the layout, the pointer and the keys.
 */
export function ResizablePanelGroup({
  className,
  orientation = "horizontal",
  resizeTargetMinimumSize = handleTargetSize,
  ...props
}: ResizablePanelGroupProps): React.ReactElement {
  return (
    <ResizablePrimitive.Group
      className={cn(slotClass("resizable-panel-group", props), className)}
      data-orientation={orientation}
      data-slot="resizable-panel-group"
      orientation={orientation}
      resizeTargetMinimumSize={resizeTargetMinimumSize}
      {...props}
    />
  );
}

/**
 * One panel of a group. A number sets a size in pixels and a string without a
 * unit a percentage of the group, such as `defaultSize="30%"`. `className`
 * and `style` reach the panel's content box, which fills the panel; its
 * content scrolls when it is taller or wider than the panel. A panel resized
 * or collapsed to nothing takes its content out of the Tab order and the
 * accessibility tree until it opens again.
 */
export function ResizablePanel({
  children,
  className,
  onResize,
  style,
  ...props
}: ResizablePanelProps): React.ReactElement {
  const [empty, setEmpty] = React.useState(false);
  // react-resizable-panels gives its own className to an element inside the
  // panel and its attributes to the panel, so the slot and its class stand on
  // a content box of the kit's own (rulebook P6).
  return (
    <ResizablePrimitive.Panel
      {...props}
      onResize={(size, id, previous) => {
        onResize?.(size, id, previous);
        setEmpty(size.inPixels < 1);
      }}
    >
      <div
        className={cn(slotClass("resizable-panel"), "h-full", className)}
        data-slot="resizable-panel"
        inert={empty || undefined}
        style={style}
      >
        {children}
      </div>
    </ResizablePrimitive.Panel>
  );
}

/**
 * The handle between two panels (rulebook T13): a separator in the Tab order
 * with the size of the panel before it as its value. The arrow keys move it
 * by 5% of the group, Home and End to its limits, Enter collapses and
 * restores a collapsible panel before it, and a double click resets the
 * panel before it to its `defaultSize`, or the one after it when only that one
 * has a `defaultSize`. It is named by the `resizable.handle` message
 * unless it gets an `aria-label` or `aria-labelledby` of its own.
 */
export function ResizableHandle({
  className,
  ...props
}: ResizableHandleProps): React.ReactElement {
  const messages = useUIMessages("resizable");
  return (
    <ResizablePrimitive.Separator
      aria-label={props["aria-labelledby"] ? undefined : messages.handle}
      className={cn(
        slotClass("resizable-handle", props),
        splitterHandleClassName,
        className,
      )}
      data-slot="resizable-handle"
      {...props}
    />
  );
}
