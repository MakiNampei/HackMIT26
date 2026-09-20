"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function JoinButton({ sessionId, isMember = false }: { sessionId: string; isMember?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "pending" | "done" | "error">("idle");

  const [error, setError] = useState("");

  async function updateMembership() {
    setError("");
    setState("pending");
    try {
      const response = await fetch(`/api/sessions/${sessionId}/${isMember ? "leave" : "join"}`, {
        method: "POST",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Membership update failed. Please try again.");
      }
      setState("done");
      if (isMember) router.push("/dashboard");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Membership update failed. Please try again.");
      setState("error");
    }
  }

  return (
    <div>
      <button className={isMember ? "button secondary" : undefined} disabled={state === "pending" || state === "done"} onClick={updateMembership} type="button">
        {state === "pending" ? (isMember ? "Leaving..." : "Joining...") : state === "done" ? (isMember ? "Left session" : "Joined") : isMember ? "Leave session" : "Join session"}
      </button>
      {state === "error" && <p role="alert" className="subtle">{error}</p>}
    </div>
  );
}
