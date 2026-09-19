"use client";

import { useState } from "react";

export function JoinButton({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<"idle" | "pending" | "joined" | "error">("idle");

  async function join() {
    setState("pending");
    const response = await fetch(`/api/sessions/${sessionId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user-maki" }),
    });
    setState(response.ok ? "joined" : "error");
  }

  return (
    <button disabled={state === "pending" || state === "joined"} onClick={join} type="button">
      {state === "pending" ? "Joining..." : state === "joined" ? "Joined" : state === "error" ? "Try again" : "Join session"}
    </button>
  );
}
