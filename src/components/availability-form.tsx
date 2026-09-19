"use client";

import { FormEvent, useState } from "react";
import type { BestTimeResult } from "@/lib/domain/types";

export function AvailabilityForm({ sessionId }: { sessionId: string }) {
  const [result, setResult] = useState<BestTimeResult | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setResult(null);
    setSaved(false);
    const form = new FormData(event.currentTarget);

    try {
      const start = new Date(`${form.get("date")}T${form.get("start")}:00`);
      const end = new Date(`${form.get("date")}T${form.get("end")}:00`);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
        throw new Error("Choose an end time later than the start time.");
      }
      const payload = {
        slots: [
          {
            start: start.toISOString(),
            end: end.toISOString(),
          },
        ],
      };
      const save = await fetch(`/api/sessions/${sessionId}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const saveBody = await save.json().catch(() => null);
      if (!save.ok) throw new Error(saveBody?.error ?? "Could not save availability. Please try again.");
      setSaved(true);

      const response = await fetch(`/api/sessions/${sessionId}/best-time`);
      const bestTime = await response.json();
      if (response.status === 404) return;
      if (!response.ok) throw new Error("Your availability was saved, but matching could not finish. Please try again.");
      setResult(bestTime.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid two">
      <form className="card" onSubmit={submit}>
        <p className="eyebrow">Your schedule</p>
        <h2>Add an available window</h2>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="date">Date</label>
            <input id="date" name="date" type="date" defaultValue="2026-09-22" required />
          </div>
          <div className="field">
            <label htmlFor="start">From</label>
            <input id="start" name="start" type="time" defaultValue="19:00" required />
          </div>
          <div className="field">
            <label htmlFor="end">Until</label>
            <input id="end" name="end" type="time" defaultValue="22:00" required />
          </div>
        </div>
        {saved && <p className="notice" role="status" style={{ marginTop: "1rem" }}>Your availability has been saved.</p>}
        {error && <p className="error" role="alert" style={{ marginTop: "1rem" }}>{error}</p>}
        <button disabled={pending} style={{ marginTop: "1rem" }} type="submit">
          {pending ? "Calculating..." : "Save and calculate best time"}
        </button>
      </form>

      <section className="card">
        <p className="eyebrow">Shared availability</p>
        <h2>{result ? "Best match found" : saved ? "Waiting for a shared time" : "Ready to coordinate"}</h2>
        {result ? (
          <>
            <strong style={{ display: "block", fontFamily: "Georgia, serif", fontSize: "2rem", margin: "1rem 0 0.4rem" }}>
              {new Date(result.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </strong>
            <p className="subtle">
              {new Date(result.start).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
              {" · "}{result.availableCount} of {result.totalCount} students available
            </p>
            <div className="policy-box">The time was calculated deterministically from submitted windows.</div>
          </>
        ) : (
          <p className="subtle">{saved ? "No time meets the minimum group size yet. Your schedule is saved; other members can add or update their availability." : "Add your window and StudySync will calculate the earliest time that works for the most people."}</p>
        )}
      </section>
    </div>
  );
}
