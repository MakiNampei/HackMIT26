"use client";

import type { Course } from "@/lib/domain/types";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function CreateGoalForm({ courses, defaultTargetDate }: { courses: Course[]; defaultTargetDate: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      courseId: form.get("courseId"),
      type: form.get("type"),
      title: form.get("title"),
      description: form.get("description"),
      targetDate: form.get("targetDate"),
      durationMinutes: Number(form.get("durationMinutes")),
    };

    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not create goal");
      router.push(`/goals/${result.data.id}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create goal");
      setPending(false);
    }
  }

  return <form className="card form-card" onSubmit={submit}>
    <p className="subtle">Start with the outcome. You can create the first group session right after saving.</p>
    <div className="form-grid">
      <div className="field full">
        <label htmlFor="title">What do you want to accomplish?</label>
        <input id="title" name="title" placeholder="e.g. Finish our CSE 330 final project" required minLength={3} maxLength={100} autoFocus />
      </div>
      <div className="field full">
        <label htmlFor="description">What would a successful result look like?</label>
        <textarea id="description" name="description" placeholder="e.g. A tested app that is ready to demo" required minLength={2} maxLength={500} />
      </div>
      <div className="field">
        <label htmlFor="courseId">Course</label>
        <select id="courseId" name="courseId" required>
          {courses.map((course) => <option key={course.id} value={course.id}>{course.code} - {course.name}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="type">Goal type</label>
        <select id="type" name="type" defaultValue="project">
          <option value="review">Review</option>
          <option value="preview">Preview</option>
          <option value="project">Project</option>
          <option value="homework">Homework</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="targetDate">Target date</label>
        <input id="targetDate" name="targetDate" type="date" defaultValue={defaultTargetDate} required />
      </div>
      <div className="field">
        <label htmlFor="durationMinutes">Typical session length</label>
        <select id="durationMinutes" name="durationMinutes" defaultValue="60">
          <option value="60">60 minutes</option>
          <option value="90">90 minutes</option>
          <option value="120">120 minutes</option>
        </select>
      </div>
    </div>
    {error && <p className="error" role="alert" style={{ marginTop: "1rem" }}>{error}</p>}
    <div className="row-between" style={{ marginTop: "1.25rem" }}>
      <span className="subtle" style={{ fontSize: "0.82rem" }}>You can change today&apos;s focus when you start a session.</span>
      <button type="submit" disabled={pending}>{pending ? "Creating…" : "Create goal"}</button>
    </div>
  </form>;
}
