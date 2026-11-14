import Anthropic from "@anthropic-ai/sdk";

// In-memory conversation history per customer, keyed by customerId.
// TODO: Alex - persist this in the `app.chat_messages` table instead.
const history = new Map<string, Anthropic.Messages.MessageParam[]>();

export function getHistory(customerId: string): Anthropic.Messages.MessageParam[] {
  return history.get(customerId) ?? [];
}

export function appendHistory(
  customerId: string,
  messages: Anthropic.Messages.MessageParam[]
): void {
  const existing = history.get(customerId) ?? [];
  history.set(customerId, [...existing, ...messages]);
}
