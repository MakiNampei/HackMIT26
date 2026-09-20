"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ConfirmSessionButton({ sessionId, start, end, roomId, isDemo }: { sessionId: string; start: string; end: string; roomId: string; isDemo?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function confirm() {
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/sessions/${sessionId}/confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ start, end, roomId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.push(`/sessions/${sessionId}/confirmed`); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Please try again."); }
    finally { setPending(false); }
  }
  return <div className="grid">
    <p className="subtle">Confirm the selected time and room for your group.{isDemo ? " This is a demo room; confirmation does not make a real reservation." : " This confirms your group’s plan, not an external room reservation."}</p>
    <button disabled={pending} onClick={confirm}>{pending ? "Confirming…" : "Confirm session"}</button>
    {error && <p className="error" role="alert">{error}</p>}
  </div>;
}
