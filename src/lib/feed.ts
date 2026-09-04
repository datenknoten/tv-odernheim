import type { CollectionEntry } from "astro:content";
import { getCollection } from "astro:content";

export type FeedItem =
  | { kind: "news"; date: string; entry: CollectionEntry<"news"> }
  | { kind: "event"; date: string; entry: CollectionEntry<"events"> };

export async function getFeed(): Promise<FeedItem[]> {
  const [news, events] = await Promise.all([getCollection("news"), getCollection("events")]);
  const items: FeedItem[] = [
    ...news.map((entry) => ({ kind: "news" as const, date: entry.data.date, entry })),
    ...events.map((entry) => ({ kind: "event" as const, date: entry.data.date, entry })),
  ];
  items.sort((a, b) => b.date.localeCompare(a.date));
  return items;
}

export function feedItemHref(item: FeedItem): string {
  return item.kind === "news" ? `/news/${item.entry.id}` : `/termine/${item.entry.id}`;
}
