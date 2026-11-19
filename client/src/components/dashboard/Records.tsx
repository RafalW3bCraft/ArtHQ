import { useEffect, useState, type ReactNode } from "react";
import { subscribeRecords, type CollectionName } from "@/lib/api";

type Results<T> = { items: T[]; state: "loading" | "ready" | "error" };
export function useRecords<T>(name: CollectionName, owner?: string) {
  const [result, setResult] = useState<Results<T>>({
    items: [],
    state: "loading",
  });
  useEffect(() => {
    setResult({ items: [], state: "loading" });
    return subscribeRecords<T>(
      name,
      owner,
      (items) => setResult({ items, state: "ready" }),
      () => setResult({ items: [], state: "error" }),
    );
  }, [name, owner]);
  return result;
}
export function Records<T extends { id: string }>({
  result,
  empty,
  children,
}: {
  result: Results<T>;
  empty: string;
  children: (row: T) => ReactNode;
}) {
  if (result.state === "loading") return <p role="status">Loading records…</p>;
  if (result.state === "error")
    return (
      <p role="alert" className="notice">
        These records couldn’t be loaded. Check your connection and{" "}
        <a href={location.href}>try again</a>.
      </p>
    );
  if (!result.items.length) return <p className="muted">{empty}</p>;
  return (
    <ul className="record-list">
      {result.items.map((row) => (
        <li key={row.id}>{children(row)}</li>
      ))}
    </ul>
  );
}
export function Submitted({ at }: { at: number }) {
  return (
    <time className="micro" dateTime={new Date(at).toISOString()}>
      {new Date(at).toLocaleDateString("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}
    </time>
  );
}
