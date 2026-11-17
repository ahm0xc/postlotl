"use client";

import * as React from "react";

/*
 * Toolbar overflow (rulebook T12; Lukas, 13 November 2026, lab "Header mit
 * Überlauf": Recommended). The actions that do not fit leave from the end
 * into a More actions menu, as Primer's ActionBar and Fluent's Overflow move
 * them.
 *
 * The layout decides first, before any script runs: the parts that may leave
 * stand in a row that wraps, in a box one row tall that clips every line after
 * the first (design-rework.css, "Toolbar overflow"). A server-rendered page so
 * paints the actions that fit from its first frame, and where the browser has
 * scroll-driven animations, the clipped lines also show the More actions
 * button before hydration.
 *
 * The script then plans the row as the lab did (planToolbarOverflow): from the
 * widths of all its parts, which stay laid out on the clipped lines while they
 * are hidden, so a font that loads or a text size that changes reflows them
 * and the next plan reads their new widths; nothing stored goes stale. The
 * room is what the row may take while the parts beside the toolbar stand at
 * their least, a header's title at its floor, so the title gives up its room
 * before any action leaves. The plan caps the row at the actions that show,
 * which gives the room they leave back to the title, and the script reads the
 * row again and hides what the layout clipped: a part that left keeps its
 * place in the layout, hidden from the keyboard and from assistive
 * technology, and the menu lists it and runs it.
 */

/** A part of the row that may leave, as the layout placed it. */
export type ToolbarOverflowUnit = {
  /** It stands on a line after the first, or runs past the row's end. */
  clipped: boolean;
  /** A ToolbarSeparator, which leaves with the part after it. */
  separator: boolean;
};

/** The width of the first `count` parts of the row with the gaps between them. */
export function toolbarOverflowRowWidth(
  widths: readonly number[],
  gap: number,
  count: number,
): number {
  if (count <= 0) return 0;
  let total = gap * (count - 1);
  for (let index = 0; index < count; index += 1) total += widths[index] ?? 0;
  return total;
}

/** The step a plan takes: how many parts of the row show, and whether the toolbar takes a row of its own. */
export type ToolbarOverflowPlan = { ownRow: boolean; visible: number };

/**
 * How many parts of the row show, from its start (the lab's planner). Every
 * part shows where the row fits the room. Otherwise parts leave from the end
 * until the ones that stay fit with the More actions button after them, and
 * a separator that would end the row leaves with the part after it. Where
 * even the button does not fit, the toolbar takes a row of its own
 * (`ownRowAllowed`, a toolbar in a row that does not wrap) and every part
 * leaves, so the actions that show only ever become fewer as the room
 * shrinks. `room` is the width of the row and the button together, the gap
 * between them included.
 */
export function planToolbarOverflow({
  gap,
  ownRowAllowed = false,
  room,
  separators = [],
  trigger,
  widths,
}: {
  gap: number;
  ownRowAllowed?: boolean;
  room: number;
  separators?: readonly boolean[];
  trigger: number;
  widths: readonly number[];
}): ToolbarOverflowPlan {
  const slack = 0.5;
  const count = widths.length;
  if (toolbarOverflowRowWidth(widths, gap, count) <= room + slack)
    return { ownRow: false, visible: count };
  if (ownRowAllowed && trigger > room + slack)
    return { ownRow: true, visible: 0 };
  let visible = count - 1;
  while (
    visible > 0 &&
    toolbarOverflowRowWidth(widths, gap, visible) + gap + trigger > room + slack
  )
    visible -= 1;
  while (visible > 0 && separators[visible - 1]) visible -= 1;
  return { ownRow: false, visible };
}

/**
 * The parts that leave for the menu, by their place in the row: those past
 * the plan's count and those the layout clipped. The parts leave from the
 * end, so once a part has left, every part after it has left too, and a
 * separator stays only between two parts that stay. With `ownRow`, every
 * part leaves.
 */
export function toolbarOverflowHidden(
  units: readonly ToolbarOverflowUnit[],
  ownRow = false,
): boolean[] {
  if (ownRow) return units.map(() => true);
  const first = units.findIndex((unit) => unit.clipped);
  const hidden = units.map((_, index) => first !== -1 && index >= first);
  for (let index = units.length - 1; index >= 0; index -= 1) {
    if (!units[index]?.separator || hidden[index]) continue;
    const next = hidden[index + 1];
    if (next === undefined || next) hidden[index] = true;
  }
  return hidden;
}

/**
 * The entries of the More actions menu: the places of the parts that left, in
 * their order, with a separator only between two parts that give rows, never
 * at the start, at the end or twice in a row.
 */
export function toolbarOverflowMenu(
  units: readonly Pick<ToolbarOverflowUnit, "separator">[],
  hidden: readonly boolean[],
): number[] {
  const entries: number[] = [];
  let pending = -1;
  units.forEach((unit, index) => {
    if (!hidden[index]) return;
    if (unit.separator) {
      if (entries.length > 0) pending = index;
      return;
    }
    if (pending !== -1) entries.push(pending);
    pending = -1;
    entries.push(index);
  });
  return entries;
}

/**
 * The least width a neighbour of the toolbar keeps in its row: a part that
 * grows from a basis, such as DashboardShellHeaderTitle, gives up what it grew
 * and keeps its basis, or its content where that is narrower; every other part
 * keeps the width it has.
 */
export function toolbarNeighbourMinimum({
  basis,
  content,
  grows,
  width,
}: {
  basis: number | null;
  content: number;
  grows: boolean;
  width: number;
}): number {
  return grows && basis !== null ? Math.min(basis, content) : width;
}

/**
 * The room of the overflow box: the width the toolbar's row leaves it once
 * the neighbours of the toolbar stand at their least (`neighbours`, with the
 * row's `gap` between every two parts) and the toolbar's parts that keep
 * their place (`pinned`, with the toolbar's `toolbarGap`) have theirs, within
 * the toolbar's own `maximum` width.
 */
export function toolbarOverflowRoom({
  available,
  gap = 0,
  maximum = Number.POSITIVE_INFINITY,
  neighbours = [],
  pinned = [],
  toolbarGap,
}: {
  available: number;
  gap?: number;
  maximum?: number;
  neighbours?: readonly number[];
  pinned?: readonly number[];
  toolbarGap: number;
}): number {
  const sum = (widths: readonly number[]) =>
    widths.reduce((total, width) => total + width, 0);
  const toolbar = Math.min(
    available - sum(neighbours) - gap * neighbours.length,
    maximum,
  );
  return toolbar - sum(pinned) - toolbarGap * pinned.length;
}

/** What a ToolbarButton or ToolbarLink in the overflow row gives its menu row. */
export type ToolbarOverflowEntry = {
  /** The item's children: its icon and its words. */
  children: React.ReactNode;
  /** An icon-only item (`shape="square"`), whose row adds its `aria-label`. */
  square: boolean;
};

/** Whether children hold words of their own, not only an icon. */
function hasText(node: React.ReactNode): boolean {
  if (typeof node === "string") return node.trim() !== "";
  if (typeof node === "number" || typeof node === "bigint") return true;
  if (Array.isArray(node)) return node.some(hasText);
  if (React.isValidElement(node) && node.type === React.Fragment)
    return hasText((node.props as { children?: React.ReactNode }).children);
  return false;
}

/** What the menu row of an item that left shows and does. */
export type ToolbarOverflowRowModel = {
  /** Pressed, for a toggle's check row. */
  checked: boolean;
  /** The item's icon and words: its children, and an icon-only item's `aria-label` after its icon. */
  content: React.ReactNode;
  disabled: boolean;
  /** The link of a link row. */
  href: string | null;
  /** `check` for a toggle, `link` for a link, `action` for every other item. */
  kind: "action" | "check" | "link";
  rel: string | null;
  target: string | null;
};

/** The parts of an element that a menu row reads. */
export type ToolbarOverflowRowElement = Pick<
  Element,
  "getAttribute" | "hasAttribute" | "matches" | "tagName"
>;

/**
 * The menu row of an item that left (rulebook I8: the row starts with the
 * item's icon), read from its element and its children: a toggle
 * (`aria-pressed`) is a check row, a link (`href`) a link row and every other
 * item an action row, disabled where the item is. A trigger of a popup
 * (`aria-haspopup`) has no row; it keeps its place with `pinned`.
 */
export function toolbarOverflowRowModel(
  element: ToolbarOverflowRowElement,
  entry: ToolbarOverflowEntry | undefined,
): ToolbarOverflowRowModel | null {
  if (!entry || element.hasAttribute("aria-haspopup")) return null;
  const label = element.getAttribute("aria-label");
  const href =
    element.tagName.toLowerCase() === "a" ? element.getAttribute("href") : null;
  return {
    checked: element.getAttribute("aria-pressed") === "true",
    content:
      label && (entry.square || !hasText(entry.children))
        ? [...React.Children.toArray(entry.children), label]
        : entry.children,
    disabled:
      element.matches(":disabled") ||
      element.getAttribute("aria-disabled") === "true",
    href,
    kind: element.hasAttribute("aria-pressed")
      ? "check"
      : href !== null
        ? "link"
        : "action",
    rel: element.getAttribute("rel"),
    target: element.getAttribute("target"),
  };
}

/** The parts of the row that left, and whether the toolbar took a row of its own. */
export type ToolbarOverflowSnapshot = {
  hidden: readonly HTMLElement[];
  ownRow: boolean;
};

const emptySnapshot: ToolbarOverflowSnapshot = { hidden: [], ownRow: false };

/**
 * The items of one overflow row and the parts that left it, for the menu. The
 * items register themselves with their element; the layout writes the parts
 * that left.
 */
export type ToolbarOverflowStore = {
  /** The entry of an item, by its element. */
  entry: (element: Element) => ToolbarOverflowEntry | undefined;
  getServerSnapshot: () => ToolbarOverflowSnapshot;
  getSnapshot: () => ToolbarOverflowSnapshot;
  /** The registered items inside a part, the part itself included, in their order. */
  itemsIn: (unit: Element) => HTMLElement[];
  /** A key for an element that stays the same while it lives. */
  keyOf: (element: Element) => string;
  register: (
    element: HTMLElement,
    entry: React.RefObject<ToolbarOverflowEntry>,
  ) => () => void;
  set: (next: ToolbarOverflowSnapshot) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createToolbarOverflowStore(): ToolbarOverflowStore {
  const items = new Map<HTMLElement, React.RefObject<ToolbarOverflowEntry>>();
  const keys = new WeakMap<Element, string>();
  const listeners = new Set<() => void>();
  let snapshot = emptySnapshot;
  let next = 0;
  return {
    entry: (element) => items.get(element as HTMLElement)?.current,
    getServerSnapshot: () => emptySnapshot,
    getSnapshot: () => snapshot,
    itemsIn: (unit) =>
      Array.from(items.keys())
        .filter((element) => unit === element || unit.contains(element))
        .sort((a, b) =>
          a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
            ? -1
            : 1,
        ),
    keyOf: (element) => {
      let key = keys.get(element);
      if (key === undefined) {
        next += 1;
        key = `overflow-${next}`;
        keys.set(element, key);
      }
      return key;
    },
    register: (element, entry) => {
      items.set(element, entry);
      return () => {
        if (items.get(element) === entry) items.delete(element);
      };
    },
    set: (value) => {
      if (
        value.ownRow === snapshot.ownRow &&
        value.hidden.length === snapshot.hidden.length &&
        value.hidden.every(
          (element, index) => element === snapshot.hidden[index],
        )
      )
        return;
      snapshot = value;
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** The store of the overflow row an item stands in, and null outside one. */
export const ToolbarOverflowContext: React.Context<ToolbarOverflowStore | null> =
  React.createContext<ToolbarOverflowStore | null>(null);

function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null): void {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as React.RefObject<T | null>).current = value;
}

/**
 * The ref of a ToolbarButton or ToolbarLink: in an overflow row it registers
 * the item with what its menu row shows, and it passes the element on to the
 * item's own ref. Outside one it is that ref.
 */
export function useToolbarOverflowItem<T extends HTMLElement>(
  children: React.ReactNode,
  square: boolean,
  ref: React.Ref<T> | undefined,
): React.Ref<T> | undefined {
  const store = React.useContext(ToolbarOverflowContext);
  const entry = React.useRef<ToolbarOverflowEntry>({ children, square });
  React.useLayoutEffect(() => {
    entry.current = { children, square };
  });
  const register = React.useCallback(
    (element: T | null) => {
      assignRef(ref, element);
      if (!element || !store) return;
      const unregister = store.register(element, entry);
      return () => {
        unregister();
        assignRef(ref, null);
      };
    },
    [ref, store],
  );
  return store ? register : ref;
}

const px = (value: string): number => Number.parseFloat(value) || 0;

function inFlow(element: Element): boolean {
  const style = getComputedStyle(element);
  return (
    style.display !== "none" &&
    style.position !== "absolute" &&
    style.position !== "fixed"
  );
}

/** The width of what an element holds, read from its laid-out content. */
function contentWidth(element: HTMLElement): number {
  const range = document.createRange();
  range.selectNodeContents(element);
  const style = getComputedStyle(element);
  return (
    range.getBoundingClientRect().width +
    px(style.paddingInlineStart) +
    px(style.paddingInlineEnd)
  );
}

/** The inner width of an element, without its padding. */
function innerWidth(element: HTMLElement): number {
  const style = getComputedStyle(element);
  return (
    element.clientWidth -
    px(style.paddingInlineStart) -
    px(style.paddingInlineEnd)
  );
}

/**
 * The width the overflow box may take (toolbarOverflowRoom), read from the
 * layout. In a row that does not wrap, the neighbours of the toolbar stand at
 * their least. A row that wraps on its own gives the toolbar a line of its
 * own, and a toolbar that is no part of a row takes the width of its
 * container; in both the toolbar takes no row of its own. `gives` says that a
 * neighbour grows, such as a header's title, and takes the room the actions
 * leave.
 */
function overflowRoom(
  root: HTMLElement,
  box: HTMLElement,
): { gives: boolean; ownRowAllowed: boolean; room: number } {
  const rootStyle = getComputedStyle(root);
  const pinned = Array.from(root.children)
    .filter((element) => element !== box && inFlow(element))
    .map((element) => element.getBoundingClientRect().width);
  const maximum =
    (Number.parseFloat(rootStyle.maxWidth) || Number.POSITIVE_INFINITY) -
    px(rootStyle.paddingInlineStart) -
    px(rootStyle.paddingInlineEnd);
  const toolbarGap = px(rootStyle.columnGap);
  const parent = root.parentElement;
  if (!parent)
    return {
      gives: false,
      ownRowAllowed: false,
      room: toolbarOverflowRoom({
        available: innerWidth(root),
        pinned,
        toolbarGap,
      }),
    };
  const style = getComputedStyle(parent);
  const row =
    style.display.includes("flex") && style.flexDirection.startsWith("row");
  // The toolbar's own row (data-overflow-wrap) is no row that wraps on its
  // own.
  if (
    !row ||
    (style.flexWrap !== "nowrap" && !root.hasAttribute("data-overflow-wrap"))
  )
    return {
      gives: false,
      ownRowAllowed: false,
      room: toolbarOverflowRoom({
        available: innerWidth(parent),
        maximum,
        pinned,
        toolbarGap,
      }),
    };
  const neighbours: number[] = [];
  let gives = false;
  for (const element of Array.from(parent.children)) {
    if (element === root || !(element instanceof HTMLElement)) continue;
    if (!inFlow(element)) continue;
    const own = getComputedStyle(element);
    const basis = own.flexBasis.endsWith("px") ? px(own.flexBasis) : null;
    const grows = px(own.flexGrow) > 0;
    gives ||= grows;
    neighbours.push(
      toolbarNeighbourMinimum({
        basis,
        content: grows && basis !== null ? contentWidth(element) : 0,
        grows,
        width: element.getBoundingClientRect().width,
      }),
    );
  }
  return {
    gives,
    ownRowAllowed: true,
    room: toolbarOverflowRoom({
      available: innerWidth(parent),
      gap: px(style.columnGap),
      maximum,
      neighbours,
      pinned,
      toolbarGap,
    }),
  };
}

/**
 * Which parts of the row the layout clipped: those on a line after the first,
 * and one that runs past the end of the row.
 */
function readClipped(
  container: HTMLElement,
  list: HTMLElement,
  units: readonly HTMLElement[],
): boolean[] {
  const style = getComputedStyle(container);
  const box = container.getBoundingClientRect();
  const firstLineEnd =
    box.top +
    px(style.borderTopWidth) +
    container.clientHeight -
    px(style.paddingBottom);
  const row = list.getBoundingClientRect();
  const rtl = getComputedStyle(list).direction === "rtl";
  return units.map((unit) => {
    const part = unit.getBoundingClientRect();
    if (part.top >= firstLineEnd - 0.5) return true;
    return rtl ? part.left < row.left - 0.5 : part.right > row.right + 0.5;
  });
}

/**
 * The items of a toolbar that carry its roving tab stop, those of a toolbar
 * inside it left out: every element with tabindex 0 or -1.
 */
export function toolbarItems(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>('[tabindex="0"], [tabindex="-1"]'),
  ).filter((item) => item.closest('[role="toolbar"]') === root);
}

/**
 * The selector of a part that is in the toolbar but not shown: a part of the
 * overflow row that left for the menu, and the More actions button while
 * nothing has left.
 */
export const toolbarOverflowHiddenSelector =
  "[data-overflowing], .sp-toolbar-overflow:not([data-has-overflow]) > .sp-toolbar-overflow-trigger";

/**
 * Keeps the focus and the single tab stop on parts that show. A focused part
 * that left hands the focus to the More actions button, which shows the part
 * now, and the button that goes away hands it to the last action of the row,
 * as the lab did. Without the focus in the toolbar, the tab stop moves off a
 * part that left to the first part that shows: Base UI checks its tab stop
 * only when its items change, and a part that left stays mounted, so Tab
 * would have skipped the toolbar.
 */
function keepFocus(
  root: HTMLElement,
  row: HTMLElement,
  slot: HTMLElement,
  active: HTMLElement | null,
  overflowing: boolean,
): void {
  const shown = (item: HTMLElement) =>
    !item.closest(toolbarOverflowHiddenSelector) && !item.matches(":disabled");
  const items = toolbarItems(root);
  if (active) {
    if (!active.closest(toolbarOverflowHiddenSelector)) return;
    const target = overflowing
      ? items.find((item) => slot.contains(item))
      : items.filter((item) => row.contains(item) && shown(item)).at(-1);
    target?.focus({ preventScroll: true });
    return;
  }
  const stop = items.find((item) => item.getAttribute("tabindex") === "0");
  if (!stop || shown(stop)) return;
  const next = items.find(shown);
  if (!next) return;
  stop.setAttribute("tabindex", "-1");
  next.setAttribute("tabindex", "0");
}

/**
 * Plans the overflow row after every layout that can change it and mirrors
 * it: the cap of the row (--sp-toolbar-overflow-cap), the parts that left
 * (`data-overflowing`), the More actions button (`data-has-overflow` on the
 * clipping box, "all" when no part shows) and a toolbar that takes a row of
 * its own (`data-overflow-wrap` on the toolbar). The script owns the button
 * from its first plan (`data-measured`), which ends the stylesheet's
 * scroll-driven guess.
 */
export function useToolbarOverflowLayout(
  containerRef: React.RefObject<HTMLElement | null>,
  listRef: React.RefObject<HTMLElement | null>,
  triggerRef: React.RefObject<HTMLElement | null>,
  store: ToolbarOverflowStore,
): void {
  React.useLayoutEffect(() => {
    const box = containerRef.current;
    const row = listRef.current;
    const slot = triggerRef.current;
    const root = box?.closest<HTMLElement>('[role="toolbar"]');
    if (!box || !row || !slot || !root) return;

    // The parts of the row, the spacer that holds its first line left out.
    const units = () =>
      Array.from(row.children).filter(
        (element): element is HTMLElement =>
          element instanceof HTMLElement &&
          !element.classList.contains("sp-toolbar-overflow-spacer"),
      );
    const showButton = (state: "all" | "some" | null) => {
      if (state === null) box.removeAttribute("data-has-overflow");
      else box.setAttribute("data-has-overflow", state === "all" ? "all" : "");
    };
    let frame = 0;
    const measure = () => {
      frame = 0;
      const parts = units();
      const separators = parts.map(
        (part) => part.getAttribute("role") === "separator",
      );
      const gap = px(getComputedStyle(row).columnGap);
      const { gives, ownRowAllowed, room } = overflowRoom(root, box);
      const plan = planToolbarOverflow({
        gap,
        ownRowAllowed,
        room,
        separators,
        trigger: slot.getBoundingClientRect().width,
        widths: parts.map((part) => part.getBoundingClientRect().width),
      });
      root.toggleAttribute("data-overflow-wrap", plan.ownRow);
      const all = plan.visible === 0 && parts.length > 0;
      // The cap gives the room the actions leave to a neighbour that grows,
      // such as a header's title. Without one the row keeps the room the
      // layout gave it, as before the script ran.
      if (!gives || plan.ownRow || plan.visible >= parts.length) {
        box.style.removeProperty("--sp-toolbar-overflow-cap");
      } else {
        // One pixel of slack keeps the last action that shows on the line.
        const width = toolbarOverflowRowWidth(
          parts.map((part) => part.getBoundingClientRect().width),
          gap,
          plan.visible,
        );
        box.style.setProperty(
          "--sp-toolbar-overflow-cap",
          `${plan.visible === 0 ? 0 : width + 1}px`,
        );
      }
      showButton(plan.visible < parts.length ? (all ? "all" : "some") : null);
      // The layout has the last word: a part it clipped leaves too, and the
      // button comes if the plan let every part show.
      let clipped = plan.ownRow
        ? parts.map(() => true)
        : readClipped(box, row, parts);
      if (clipped.some(Boolean) && !box.hasAttribute("data-has-overflow")) {
        showButton("some");
        clipped = readClipped(box, row, parts);
      }
      const hidden = toolbarOverflowHidden(
        parts.map((_, index) => ({
          clipped: (clipped[index] ?? false) || index >= plan.visible,
          separator: separators[index] ?? false,
        })),
        plan.ownRow,
      );
      const overflowing = hidden.some(Boolean);
      showButton(overflowing ? (hidden.every(Boolean) ? "all" : "some") : null);
      const current = document.activeElement;
      const active =
        current instanceof HTMLElement && root.contains(current)
          ? current
          : null;
      parts.forEach((part, index) =>
        part.toggleAttribute("data-overflowing", hidden[index] ?? false),
      );
      keepFocus(root, row, slot, active, overflowing);
      // The box clips; a focus that reached a clipped part before hydration
      // must not leave it scrolled.
      box.scrollTop = 0;
      box.scrollLeft = 0;
      store.set({
        hidden: parts.filter((_, index) => hidden[index]),
        ownRow: plan.ownRow,
      });
    };
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(measure);
    };
    // A tab stop that keepFocus moved stays the only one: once an item takes
    // the focus, Base UI moves its stop there, and a stop moved by hand goes
    // back to -1.
    const focusIn = (event: FocusEvent) => {
      const items = toolbarItems(root);
      if (!items.includes(event.target as HTMLElement)) return;
      for (const item of items)
        if (item !== event.target && item.getAttribute("tabindex") === "0")
          item.setAttribute("tabindex", "-1");
    };
    const scrolled = () => {
      box.scrollTop = 0;
      box.scrollLeft = 0;
    };
    root.addEventListener("focusin", focusIn);
    box.addEventListener("scroll", scrolled, { passive: true });
    box.setAttribute("data-measured", "");
    measure();

    // Every size the plan reads: the box, the row and its parts, the button,
    // the toolbar, and the row the toolbar stands in with its other parts.
    const resize =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(schedule);
    const observe = () => {
      if (!resize) return;
      resize.disconnect();
      for (const element of [box, row, slot, root, ...units()])
        resize.observe(element);
      for (const element of Array.from(root.children))
        if (element !== box) resize.observe(element);
      const parent = root.parentElement;
      if (parent) {
        resize.observe(parent);
        for (const element of Array.from(parent.children))
          if (element !== root) resize.observe(element);
      }
    };
    observe();
    const mutations =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(() => {
            observe();
            schedule();
          });
    mutations?.observe(row, { childList: true });
    return () => {
      cancelAnimationFrame(frame);
      resize?.disconnect();
      mutations?.disconnect();
      root.removeEventListener("focusin", focusIn);
      box.removeEventListener("scroll", scrolled);
      box.removeAttribute("data-measured");
      box.removeAttribute("data-has-overflow");
      box.style.removeProperty("--sp-toolbar-overflow-cap");
      root.removeAttribute("data-overflow-wrap");
      for (const part of units()) part.removeAttribute("data-overflowing");
    };
  }, [containerRef, listRef, triggerRef, store]);
}
