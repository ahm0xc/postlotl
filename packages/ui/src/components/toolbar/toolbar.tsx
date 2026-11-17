"use client";

import { Toolbar as ToolbarPrimitive } from "@base-ui/react/toolbar";
import * as React from "react";
import { useUIMessages } from "../../system/locale/messages-context";
import {
  type ControlSize,
  useResolvedControlSize,
} from "../../system/provider/ui-provider";
import { OverflowGlyph } from "../../system/styles/overflow-glyph";
import { cn, type WithStringClassName } from "../../system/utils/cn";
import { slotClass } from "../../system/utils/slot-class";
import { Button, type ButtonStandardProps } from "../button";
import { Input, type InputProps } from "../input";
import {
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuItem,
  MenuLinkItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "../menu";
import { Separator } from "../separator";
import {
  createToolbarOverflowStore,
  ToolbarOverflowContext,
  type ToolbarOverflowEntry,
  toolbarOverflowHiddenSelector,
  toolbarOverflowMenu,
  toolbarOverflowRowModel,
  type ToolbarOverflowStore,
  useToolbarOverflowItem,
  useToolbarOverflowLayout,
} from "./toolbar-overflow";

/** The size of the enclosing Toolbar, which its parts take by default. */
const ToolbarSizeContext = React.createContext<ControlSize | null>(
  null,
);

/** A part's own size, else the Toolbar's, else the provider's (S1). */
function useToolbarSize(
  size: ControlSize | undefined,
): ControlSize {
  const toolbarSize = React.useContext(ToolbarSizeContext);
  return useResolvedControlSize(size ?? toolbarSize);
}

// A field uses Home and End itself: a text field for its caret, a slider, a
// spin button or a select for its value.
const fieldSelector =
  'input, select, textarea, [role="slider"], [role="spinbutton"]';

// The parts an item may sit in that take it out of the keyboard's way: hidden
// from assistive technology, hidden, inert, or left for the More actions menu
// of an overflow row (and that menu's button while nothing has left).
const hiddenItemSelector = `[aria-hidden="true"], [hidden], [inert], ${toolbarOverflowHiddenSelector}`;

/**
 * Home and End move the focus to the toolbar's first and last item, as the
 * toolbar keyboard pattern has them beside the arrow keys (B12, 3 November
 * 2026); Base UI's toolbar moves by the arrow keys only. Its items are the
 * elements that carry its roving tab stop (tabindex 0 or -1) and belong to it
 * rather than to a toolbar inside it, less those a disabled attribute takes
 * out of the tab order and those hidden, such as the actions an overflow row
 * gave to its menu. A field in the toolbar keeps the two keys. The item takes
 * the tab stop as it takes the focus, so Tab returns to it.
 */
function focusToolbarEnd(event: React.KeyboardEvent<HTMLDivElement>): void {
  if (event.key !== "Home" && event.key !== "End") return;
  if (
    event.defaultPrevented ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  )
    return;
  const root = event.currentTarget;
  const target = event.target as HTMLElement;
  if (
    target.closest('[role="toolbar"]') !== root ||
    target.isContentEditable ||
    target.matches(fieldSelector)
  )
    return;
  const items = Array.from(
    root.querySelectorAll<HTMLElement>('[tabindex="0"], [tabindex="-1"]'),
  ).filter(
    (item) =>
      item.closest('[role="toolbar"]') === root &&
      !item.matches(":disabled") &&
      !item.closest(hiddenItemSelector),
  );
  const item = event.key === "Home" ? items[0] : items[items.length - 1];
  if (!item) return;
  event.preventDefault();
  if (item !== target) item.focus();
}

/**
 * Whether a child of an overflow Toolbar keeps its place: a part with
 * `pinned`, a ToolbarInput or a menu trigger, on the child itself or inside
 * the elements it wraps, such as a Tooltip around a ToolbarButton or a
 * ToolbarGroup around a field. Three levels are read, through `render` and
 * the children.
 */
function holdsItsPlace(node: React.ReactNode, depth = 0): boolean {
  if (!React.isValidElement(node)) return false;
  if (node.type === ToolbarInput || node.type === MenuTrigger) return true;
  const props = node.props as {
    children?: unknown;
    pinned?: unknown;
    render?: unknown;
  };
  if (props.pinned === true) return true;
  if (depth >= 3) return false;
  if (
    React.isValidElement(props.render) &&
    holdsItsPlace(props.render, depth + 1)
  )
    return true;
  if (typeof props.children === "function") return false;
  return React.Children.toArray(props.children as React.ReactNode).some(
    (child) => holdsItsPlace(child, depth + 1),
  );
}

/**
 * The children of an overflow Toolbar in three runs: the parts at the start
 * that keep their place, the parts that may leave, and the parts at the end
 * that keep their place. A ToolbarSeparator beside a run that stays stays
 * with it, so the More actions button comes before the separator of the
 * primary action.
 */
function overflowRuns(children: React.ReactNode): {
  end: React.ReactNode[];
  middle: React.ReactNode[];
  start: React.ReactNode[];
} {
  const nodes = React.Children.toArray(children);
  const stays = (node: React.ReactNode | undefined) =>
    holdsItsPlace(node) ||
    (React.isValidElement(node) && node.type === ToolbarSeparator);
  let start = 0;
  while (start < nodes.length && stays(nodes[start])) start += 1;
  let end = nodes.length;
  while (end > start && stays(nodes[end - 1])) end -= 1;
  return {
    end: nodes.slice(end),
    middle: nodes.slice(start, end),
    start: nodes.slice(0, start),
  };
}

/**
 * The row of an item that left (toolbarOverflowRowModel). A row runs the item
 * itself: a click on it is a click on the item, which stays mounted, so its
 * handlers, its state and a router's link all keep working.
 */
function ToolbarOverflowMenuRow({
  element,
  entry,
}: {
  element: HTMLElement;
  entry: ToolbarOverflowEntry | undefined;
}): React.ReactElement | null {
  const row = toolbarOverflowRowModel(element, entry);
  if (!row) return null;
  const activate = () => element.click();
  if (row.kind === "check")
    return (
      <MenuCheckboxItem
        checked={row.checked}
        disabled={row.disabled}
        onCheckedChange={activate}
      >
        {row.content}
      </MenuCheckboxItem>
    );
  if (row.kind === "link")
    return (
      <MenuLinkItem
        href={row.href ?? undefined}
        onClick={(event) => {
          // A plain click runs the link itself, so a router's handler on it
          // takes the navigation; a click for a new tab or window keeps the
          // row's own link.
          if (
            event.button !== 0 ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey
          )
            return;
          event.preventDefault();
          activate();
        }}
        rel={row.rel ?? undefined}
        target={row.target ?? undefined}
      >
        {row.content}
      </MenuLinkItem>
    );
  return (
    <MenuItem disabled={row.disabled} onClick={activate}>
      {row.content}
    </MenuItem>
  );
}

/**
 * The rows of the More actions menu, read from the parts that left while the
 * menu is open: a ToolbarGroup or another part with several items is a group
 * of rows, and a ToolbarSeparator between two parts that left is a separator.
 * A row follows its item's state, such as a toggle pressed by its row.
 */
function ToolbarOverflowRows({
  store,
}: {
  store: ToolbarOverflowStore;
}): React.ReactNode {
  const snapshot = React.useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const [, refresh] = React.useReducer((count: number) => count + 1, 0);
  React.useEffect(() => {
    if (typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(() => refresh());
    for (const unit of snapshot.hidden)
      observer.observe(unit, {
        attributeFilter: [
          "aria-disabled",
          "aria-label",
          "aria-pressed",
          "disabled",
          "href",
        ],
        attributes: true,
        subtree: true,
      });
    return () => observer.disconnect();
  }, [snapshot]);
  const units = snapshot.hidden.map((unit) => ({
    separator: unit.getAttribute("role") === "separator",
  }));
  return toolbarOverflowMenu(
    units,
    units.map(() => true),
  ).map((index) => {
    const unit = snapshot.hidden[index];
    if (!unit) return null;
    const key = store.keyOf(unit);
    if (units[index]?.separator) return <MenuSeparator key={key} />;
    const items = store.itemsIn(unit);
    if (items.length === 0) return null;
    const rows = items.map((item) => (
      <ToolbarOverflowMenuRow
        element={item}
        entry={store.entry(item)}
        key={store.keyOf(item)}
      />
    ));
    return items.length === 1 && items[0] === unit ? (
      rows[0]
    ) : (
      <MenuGroup
        aria-label={unit.getAttribute("aria-label") ?? undefined}
        key={key}
      >
        {rows}
      </MenuGroup>
    );
  });
}

/**
 * The part of an overflow Toolbar that may leave (Toolbar `overflow`): a row
 * that wraps, in a box one row tall that clips the lines after the first,
 * followed by the More actions button. See toolbar-overflow.ts.
 */
function ToolbarOverflowRow({
  children,
  label,
  size,
  trigger,
}: {
  children: React.ReactNode;
  label: string | undefined;
  size: ControlSize;
  trigger: React.ReactElement<ButtonStandardProps> | undefined;
}): React.ReactElement {
  const messages = useUIMessages("toolbar");
  const name = label ?? messages.overflow;
  const [store] = React.useState(createToolbarOverflowStore);
  const container = React.useRef<HTMLDivElement>(null);
  const list = React.useRef<HTMLDivElement>(null);
  const slot = React.useRef<HTMLSpanElement>(null);
  useToolbarOverflowLayout(container, list, slot, store);
  // The button is a square of the toolbar's size, as the Button an
  // application gives it with `overflowTrigger`, such as an outline one beside
  // outline actions.
  const button = trigger
    ? React.cloneElement(trigger, {
        shape: trigger.props.shape ?? "square",
        size: trigger.props.size ?? size,
      })
    : undefined;
  return (
    <div
      className="sp-toolbar-overflow"
      data-size={size}
      data-slot="toolbar-overflow"
      ref={container}
    >
      <div
        className="sp-toolbar-overflow-list"
        data-slot="toolbar-overflow-list"
        ref={list}
      >
        {/* Holds the first line, so even the first action can wrap away. */}
        <span
          aria-hidden="true"
          className="sp-toolbar-overflow-spacer"
          data-slot="toolbar-overflow-spacer"
        />
        <ToolbarOverflowContext.Provider value={store}>
          {children}
        </ToolbarOverflowContext.Provider>
      </div>
      <span
        className="sp-toolbar-overflow-trigger"
        data-slot="toolbar-overflow-trigger"
        ref={slot}
      >
        <Menu>
          <MenuTrigger
            aria-label={name}
            render={<ToolbarButton render={button} shape="square" />}
          >
            <OverflowGlyph />
          </MenuTrigger>
          <MenuPopup align="end" aria-label={name}>
            <ToolbarOverflowRows store={store} />
          </MenuPopup>
        </Menu>
      </span>
    </div>
  );
}

export function Toolbar({
  children,
  className,
  onKeyDown,
  overflow = false,
  overflowLabel,
  overflowTrigger,
  size,
  ...props
}: WithStringClassName<ToolbarPrimitive.Root.Props> & {
  /**
   * Gives the actions that do not fit a More actions menu: they leave from
   * the end, and their rows show their icon and their words. A ToolbarInput,
   * a menu trigger and a part with `pinned` keep their place at the start or
   * the end of the toolbar; the menu's button stands before the parts that
   * keep theirs at the end. Where even the button and those parts do not fit
   * beside the other parts of the row the toolbar stands in, every action is
   * in the menu, and a DashboardShellHeader gives its title a row of its own.
   * A horizontal toolbar only.
   */
  overflow?: boolean | undefined;
  /** The name of the More actions button and its menu: "More actions" by default (the `toolbar` messages). */
  overflowLabel?: string | undefined;
  /**
   * The Button the More actions button renders, such as
   * `<Button variant="outline" />` beside outline actions. It is a square of
   * the toolbar's size unless it names its own shape or size. The toolbar's
   * ghost icon Button by default.
   */
  overflowTrigger?: React.ReactElement<ButtonStandardProps> | undefined;
  /** The control size of the toolbar's buttons, links, groups and input. */
  size?: ControlSize | undefined;
}): React.ReactElement {
  const resolvedSize = useToolbarSize(size);
  const runs =
    overflow && props.orientation !== "vertical"
      ? overflowRuns(children)
      : null;
  const overflowing = runs !== null && runs.middle.length > 0;
  return (
    <ToolbarSizeContext.Provider value={resolvedSize}>
      <ToolbarPrimitive.Root
        className={cn(
          // A bare icon is the glyph of the Buttons beside it, the glyph
          // ladder's (I3), which the toolbar's size sets (design-rework.css).
          // An overflow toolbar keeps one row, its actions leave for the menu
          // instead of wrapping, and its parts share one gap with its row of
          // actions (--sp-toolbar-overflow-gap, 8 px).
          slotClass("toolbar", props),
          "relative flex items-center data-[orientation=vertical]:w-fit data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch [&>svg]:pointer-events-none [&>svg]:shrink-0 [&>svg:not([class*='opacity-'])]:opacity-80 [&>svg:not([class*='size-'])]:size-(--sp-rw-button-icon)",
          overflowing ? "gap-(--sp-toolbar-overflow-gap)" : "flex-wrap gap-2",
          className,
        )}
        data-overflow={overflowing ? "" : undefined}
        data-size={resolvedSize}
        data-slot="toolbar"
        {...props}
        onKeyDown={(event) => {
          // The consumer's handler runs first and can keep the keys with
          // preventDefault.
          onKeyDown?.(event);
          focusToolbarEnd(event);
        }}
      >
        {overflowing ? (
          <>
            {runs.start}
            <ToolbarOverflowRow
              label={overflowLabel}
              size={resolvedSize}
              trigger={overflowTrigger}
            >
              {runs.middle}
            </ToolbarOverflowRow>
            {runs.end}
          </>
        ) : (
          children
        )}
      </ToolbarPrimitive.Root>
    </ToolbarSizeContext.Provider>
  );
}
export function ToolbarButton({
  children,
  className,
  pinned,
  ref,
  render,
  shape,
  size,
  ...props
}: WithStringClassName<ToolbarPrimitive.Button.Props> & {
  /**
   * Keeps the item in place in an overflow Toolbar, as its primary action;
   * every other item may leave for the More actions menu.
   */
  pinned?: boolean | undefined;
  /**
   * `square` makes an icon-only item: the square of the toolbar's control size,
   * 36 px at the default sm, 40, 44 and 48 px above.
   */
  shape?: "default" | "square" | undefined;
  size?: ControlSize | undefined;
}): React.ReactElement {
  // `pinned` is read by the Toolbar from the element; the item ignores it.
  void pinned;
  const resolvedSize = useToolbarSize(size);
  const itemRef = useToolbarOverflowItem(children, shape === "square", ref);
  return (
    <ToolbarPrimitive.Button
      className={cn(slotClass("toolbar-button", props, render), className)}
      data-slot="toolbar-button"
      ref={itemRef}
      render={
        render ??
        ((toolbarProps, state) => (
          <Button
            {...(toolbarProps as ButtonStandardProps)}
            aria-disabled={state.disabled || undefined}
            disabled={state.disabled && !state.focusable}
            {...(shape === undefined ? {} : { shape })}
            size={resolvedSize}
            variant="ghost"
          />
        ))
      }
      {...props}
    >
      {children}
    </ToolbarPrimitive.Button>
  );
}
export function ToolbarLink({
  children,
  className,
  pinned,
  ref,
  render,
  size,
  ...props
}: WithStringClassName<ToolbarPrimitive.Link.Props> & {
  /** Keeps the link in place in an overflow Toolbar. */
  pinned?: boolean | undefined;
  size?: ControlSize | undefined;
}): React.ReactElement {
  void pinned;
  const resolvedSize = useToolbarSize(size);
  const itemRef = useToolbarOverflowItem(children, false, ref);
  return (
    <ToolbarPrimitive.Link
      className={cn(slotClass("toolbar-link", props), className)}
      data-slot="toolbar-link"
      ref={itemRef}
      render={
        typeof render === "function" ? (
          (toolbarProps, toolbarState) => (
            <Button
              {...(toolbarProps as unknown as ButtonStandardProps)}
              render={(buttonProps) =>
                render(
                  buttonProps as React.ComponentPropsWithRef<"a">,
                  toolbarState,
                )
              }
              size={resolvedSize}
              variant="ghost"
            />
          )
        ) : (
          <Button
            render={render ?? <a />}
            size={resolvedSize}
            variant="ghost"
          />
        )
      }
      {...props}
    >
      {children}
    </ToolbarPrimitive.Link>
  );
}
export function ToolbarInput({
  className,
  insetStart,
  insetEnd,
  render,
  ...props
}: WithStringClassName<ToolbarPrimitive.Input.Props> &
  Pick<InputProps, "insetStart" | "insetEnd">): React.ReactElement {
  const resolvedSize = useToolbarSize(undefined);
  return (
    <ToolbarPrimitive.Input
      className={cn(
        slotClass("toolbar-input", props),
        "min-w-0 flex-1",
        className,
      )}
      data-slot="toolbar-input"
      render={
        typeof render === "function" ? (
          (toolbarProps, toolbarState) => (
            <Input
              size={resolvedSize}
              {...(toolbarProps as InputProps)}
              insetStart={insetStart}
              insetEnd={insetEnd}
              render={(inputProps) => render(inputProps, toolbarState)}
            />
          )
        ) : (
          <Input
            insetStart={insetStart}
            insetEnd={insetEnd}
            render={render}
            size={resolvedSize}
          />
        )
      }
      {...props}
    />
  );
}
export function ToolbarGroup({
  className,
  pinned,
  size,
  ...props
}: WithStringClassName<ToolbarPrimitive.Group.Props> & {
  /**
   * Keeps the group in place in an overflow Toolbar; otherwise it leaves as
   * one part, its items a group of rows in the menu.
   */
  pinned?: boolean | undefined;
  size?: ControlSize | undefined;
}): React.ReactElement {
  void pinned;
  const resolvedSize = useToolbarSize(size);
  return (
    <ToolbarSizeContext.Provider value={resolvedSize}>
      <ToolbarPrimitive.Group
        className={cn(
          slotClass("toolbar-group", props),
          // A bare icon is the glyph ladder's, as in the toolbar.
          "flex min-w-0 items-center gap-1 [&>svg]:pointer-events-none [&>svg]:shrink-0 [&>svg:not([class*='opacity-'])]:opacity-80 [&>svg:not([class*='size-'])]:size-(--sp-rw-button-icon)",
          className,
        )}
        data-size={resolvedSize}
        data-slot="toolbar-group"
        {...props}
      />
    </ToolbarSizeContext.Provider>
  );
}
export function ToolbarSeparator({
  className,
  ...props
}: WithStringClassName<ToolbarPrimitive.Separator.Props>): React.ReactElement {
  return (
    <ToolbarPrimitive.Separator
      className={cn(
        slotClass("toolbar-separator", props),
        "data-[orientation=horizontal]:my-0.5",
        className,
      )}
      data-slot="toolbar-separator"
      render={<Separator />}
      {...props}
    />
  );
}
export { ToolbarPrimitive };
