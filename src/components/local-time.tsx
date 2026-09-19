"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
export function LocalTime({ start }: { start: string }) {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  return <time dateTime={start}>{ready ? new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(start)) : "Loading local time…"}</time>;
}
