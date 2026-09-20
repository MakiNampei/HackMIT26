"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useSyncExternalStore } from "react";
import type { Course } from "@/lib/domain/types";

type Props = { courses: Course[]; initial?: { date?: string; courseId?: string; title?: string; topic?: string; type?: string; sourceName?: string; rules?: string } };
const subscribe = () => () => {};
export function CreateSessionForm(props: Props) {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  return ready ? <SessionEditor {...props} /> : <p role="status">Loading session form…</p>;
}
function SessionEditor({ courses, initial }: Props) {
  const [today] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const form = new FormData(event.currentTarget);
    const date = String(form.get("date"));
    const start = String(form.get("start"));
    const end = String(form.get("end"));
    const startDate = new Date(`${date}T${start}:00`);
    const endDate = new Date(`${date}T${end}:00`);
    if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || endDate <= startDate) {
      setError("Choose a valid date and an end time later than the start."); setPending(false); return;
    }
    if (endDate.getTime() - startDate.getTime() < Number(form.get("durationMinutes")) * 60000) {
      setError("Your available window must be at least as long as the session duration."); setPending(false); return;
    }
    const payload = {
      courseId: form.get("courseId"),
      type: form.get("type"),
      title: form.get("title"),
      topic: form.get("topic"),
      minPeople: Number(form.get("minPeople")),
      maxPeople: Number(form.get("maxPeople")),
      durationMinutes: Number(form.get("durationMinutes")),
      proposedSlots: [
        {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      ],
    };

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not create session");
      router.push(`/sessions/${result.navigationId ?? result.data.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="card form-card" onSubmit={submit}>
      {initial?.sourceName && <div className="notice" style={{ marginBottom: "1rem" }}><strong>Draft from {initial.sourceName}</strong><p>{initial.rules}</p><small>Review the original document and confirm your plan. This is not instructor approval.</small></div>}
      <p className="subtle">Choose a date and available time window in {Intl.DateTimeFormat().resolvedOptions().timeZone}. The group’s final time will be matched within this window.</p>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="courseId">Course</label>
          <select id="courseId" name="courseId" defaultValue={initial?.courseId} required>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
            ))}
          </select>
          <Link className="subtle" href="/courses">+ Add a course or upload materials</Link>
        </div>
        <div className="field">
          <label htmlFor="type">Session type</label>
          <select id="type" name="type" defaultValue={initial?.type ?? "assignment"}>
            <option value="study">Study</option>
            <option value="exam_review">Exam review</option>
            <option value="assignment">Assignment</option>
          </select>
        </div>
        <div className="field full">
          <label htmlFor="title">Session title</label>
          <input id="title" name="title" defaultValue={initial?.title ?? ""} placeholder="e.g. Midterm review group" required />
        </div>
        <div className="field full">
          <label htmlFor="topic">What do you want to work on?</label>
          <textarea id="topic" name="topic" defaultValue={initial?.topic ?? ""} placeholder="What would you like to study together?" required />
        </div>
        <div className="field">
          <label htmlFor="minPeople">Minimum students</label>
          <input id="minPeople" name="minPeople" type="number" min="2" max="12" defaultValue="2" />
        </div>
        <div className="field">
          <label htmlFor="maxPeople">Maximum students</label>
          <input id="maxPeople" name="maxPeople" type="number" min="2" max="20" defaultValue="5" />
        </div>
        <div className="field">
          <label htmlFor="durationMinutes">Duration</label>
          <select id="durationMinutes" name="durationMinutes" defaultValue="90">
            <option value="60">60 minutes</option>
            <option value="90">90 minutes</option>
            <option value="120">120 minutes</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="date">Session date</label>
          <input id="date" name="date" type="date" defaultValue={initial?.date ?? today} required />
        </div>
        <div className="field">
          <label htmlFor="start">Window start time</label>
          <input id="start" name="start" type="time" defaultValue="18:00" required />
        </div>
        <div className="field">
          <label htmlFor="end">Window end time</label>
          <input id="end" name="end" type="time" defaultValue="22:00" required />
        </div>
      </div>
      <div className="notice" style={{ marginTop: "1rem" }}>
        Assignment sessions will require a source-backed collaboration-policy check before confirmation.
      </div>
      {error && <p className="error" role="alert" style={{ marginTop: "1rem" }}>{error}</p>}
      <div className="row-between" style={{ marginTop: "1.25rem" }}>
        <span className="subtle" style={{ fontSize: "0.8rem" }}>Your account is used securely</span>
        <button disabled={pending} type="submit">{pending ? "Creating..." : "Create session"}</button>
      </div>
    </form>
  );
}
