import type { Goal, Progress, Warning } from "@/types/contracts";

const DEMO_CUSTOMER = "CUST00001";

export type StatusResponse = {
  goal: Goal | null;
  progress: Progress | null;
  warnings: Warning[];
  customerId: string;
};

export type ChatResponse = { reply: string };

function headers(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-customer-id": DEMO_CUSTOMER,
  };
}

export async function fetchStatus(): Promise<StatusResponse> {
  const res = await fetch("/api/status", { headers: headers() });
  if (!res.ok) throw new Error(`Status request failed (${res.status})`);
  return res.json();
}

export async function sendChat(text: string): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Chat request failed (${res.status})`);
  return res.json();
}
