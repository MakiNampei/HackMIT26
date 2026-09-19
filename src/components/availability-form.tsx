"use client";

import { FormEvent, useState } from "react";
import type { BestTimeResult } from "@/lib/domain/types";

export function AvailabilityForm({ sessionId }: { sessionId: string }) {
  const [result, setResult] = useState<BestTimeResult | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      const payload = {
        slots: [
          {
            start: new Date(`${form.get("date")}T${form.get("start")}:00`).toISOString(),
            end: new Date(`${form.get("date")}T${form.get("end")}:00`).toISOString(),
          },
        ],
      };
      const save = await fetch(`/api/sessions/${sessionId}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!save.ok) throw new Error("Could not save availability");

      const response = await fetch(`/api/sessions/${sessionId}/best-time`);
      const bestTime = await response.json();
      if (!response.ok) throw new Error(bestTime.error ?? "No common time found");
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
        {error && <p className="error" role="alert" style={{ marginTop: "1rem" }}>{error}</p>}
        <button disabled={pending} style={{ marginTop: "1rem" }} type="submit">
          {pending ? "Calculating..." : "Save and calculate best time"}
        </button>
      </form>

      <section className="card">
        <p className="eyebrow">Shared availability</p>
        <h2>{result ? "Best match found" : "Ready to coordinate"}</h2>
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
          <p className="subtle">Add your window and StudySync will calculate the earliest time that works for the most people.</p>
        )}
      </section>
    </div>
  );
}
