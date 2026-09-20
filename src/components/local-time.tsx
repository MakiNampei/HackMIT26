"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
export function LocalTime({ start, end }: { start: string; end?: string }) {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  if (!ready) return <time dateTime={start}>Loading local time…</time>;
  const formatter = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  return <span><time dateTime={start}>{formatter.format(new Date(start))}</time>{end && <> – <time dateTime={end}>{formatter.format(new Date(end))}</time></>}</span>;
}
