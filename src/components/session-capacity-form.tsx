"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function SessionCapacityForm({ sessionId, minPeople, maxPeople, memberCount }: {
  sessionId: string; minPeople: number; maxPeople: number; memberCount: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minPeople: Number(form.get("minPeople")), maxPeople: Number(form.get("maxPeople")) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save group size");
      setMessage("Group size saved.");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save group size. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card">
      <p className="eyebrow">Creator settings</p>
      <h2>Group size</h2>
      <p className="subtle">{memberCount} students joined. Counts include the session creator when they are a member.</p>
      <form onSubmit={save} className="grid" style={{ marginTop: "1rem" }}>
        <div className="field">
          <label htmlFor="edit-min-people">Minimum students</label>
          <input id="edit-min-people" name="minPeople" type="number" min={2} max={12} step={1} defaultValue={minPeople} required disabled={pending} />
        </div>
        <div className="field">
          <label htmlFor="edit-max-people">Maximum students</label>
          <input id="edit-max-people" name="maxPeople" type="number" min={Math.max(2, memberCount)} max={20} step={1} defaultValue={maxPeople} required disabled={pending} />
        </div>
        <p className="subtle">Increasing the minimum resets time and room matching. A room that cannot fit the new maximum will be cleared.</p>
        <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save group size"}</button>
        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
      </form>
    </section>
  );
}
