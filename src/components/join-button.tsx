"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function JoinButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "pending" | "joined" | "error">("idle");

  async function join() {
    setState("pending");
    try {
    const response = await fetch(`/api/sessions/${sessionId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setState(response.ok ? "joined" : "error");
    if (response.ok) router.refresh();
    } catch { setState("error"); }
  }

  return (
    <button disabled={state === "pending" || state === "joined"} onClick={join} type="button">
      {state === "pending" ? "Joining..." : state === "joined" ? "Joined" : state === "error" ? "Try again" : "Join session"}
    </button>
  );
}
