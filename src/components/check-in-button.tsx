"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function CheckInButton({ sessionId, startsAt, checkedInAt }: {
  sessionId: string; startsAt: string; checkedInAt?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<string>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function update() {
      clearTimeout(timer);
      const remaining = Date.parse(startsAt) - Date.now();
      setOpen(remaining <= 0);
      if (remaining > 0) timer = setTimeout(update, Math.min(remaining, 60_000));
    }
    update();
    window.addEventListener("focus", update);
    return () => { clearTimeout(timer); window.removeEventListener("focus", update); };
  }, [startsAt]);

  async function checkIn() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/sessions/${sessionId}/check-in`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not check in. Please try again.");
      setSavedAt(result.checkedInAt);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not check in. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (checkedInAt || savedAt) return <span className="pill" role="status">✓ Checked in</span>;
  if (!open) return null;
  return <div>
    <button className="button" type="button" disabled={pending} onClick={checkIn}>
      {pending ? "Checking in…" : "Check in"}
    </button>
    {error && <p className="subtle" role="alert">{error}</p>}
  </div>;
}
