"use client";

import * as React from "react";

import { englishMessages, type MessageCatalog } from "./messages";

/**
 * The kit's texts that the components read: the English defaults, or those of
 * the nearest LocaleProvider merged over them.
 */
export const MessagesContext =
  React.createContext<MessageCatalog>(englishMessages);

/**
 * The texts of one component, such as `useUIMessages("datePicker")`:
 * the provider's messages over the English defaults. A prop of the component
 * still wins for its own instance.
 */
export function useUIMessages<
  Group extends keyof MessageCatalog,
>(group: Group): MessageCatalog[Group] {
  return React.useContext(MessagesContext)[group];
}

/** The keys of a group whose message is plain text, not a function. */
type TextKey<Group extends keyof MessageCatalog> = {
  [
    Key in keyof MessageCatalog[Group]
  ]: MessageCatalog[Group][Key] extends string ? Key : never;
}[keyof MessageCatalog[Group]];

/**
 * One text of the kit for a Server Component: the small client leaf that
 * reads the provider's messages, so the component around it stays
 * server-rendered (Spinner, Stepper and Timeline). Server rendering reads the
 * provider too when the application renders it above, as in the root layout,
 * so the server and the browser write the same text. `before` and `after`
 * frame a text that is not empty, such as the parentheses of a status.
 */
export function KitText<Group extends keyof MessageCatalog>({
  after = "",
  before = "",
  group,
  name,
}: {
  after?: string | undefined;
  before?: string | undefined;
  group: Group;
  name: TextKey<Group>;
}): string {
  const text = useUIMessages(group)[name] as string;
  return text ? `${before}${text}${after}` : "";
}

/**
 * The locale of the nearest LocaleProvider, and undefined outside
 * one. The parts that write numbers take it when they have no `locale` of
 * their own, and otherwise their fixed default, en-US.
 */
export const LocaleContext = React.createContext<string | undefined>(
  undefined,
);

/**
 * The locale a part writes its numbers in: its own `locale`, else the nearest
 * provider's, else `fallback`. Each is a fixed value, never the browser's
 * language, so the server and the browser write the same text.
 */
export function useFormatLocale<Locale>(
  own: Locale | undefined,
  fallback: Locale,
): Locale | string {
  const provided = React.useContext(LocaleContext);
  return own ?? provided ?? fallback;
}
