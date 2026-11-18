import Anthropic from "@anthropic-ai/sdk";

// In-memory conversation history per customer, keyed by customerId.
// TODO: Alex - persist this in the `app.chat_messages` table instead.
// Stored as turns (one entry per appendHistory call) so older turns can be
// compacted without touching the most recent one or splitting a
// tool_use/tool_result pair.
const history = new Map<string, Anthropic.Messages.MessageParam[][]>();

const MAX_TOOL_RESULT_CHARS = 1500;
const MAX_TURNS = 10;
const REMOVED_NOTICE =
  "[previous get_data result removed from history. Call get_data again if you need these numbers.]";

export function getHistory(customerId: string): Anthropic.Messages.MessageParam[] {
  const turns = history.get(customerId) ?? [];
  return turns.flat();
}

export function appendHistory(
  customerId: string,
  messages: Anthropic.Messages.MessageParam[]
): void {
  const turns = history.get(customerId) ?? [];
  turns.push(messages);

  for (let i = 0; i < turns.length - 1; i++) {
    turns[i] = compactTurn(turns[i]);
  }

  history.set(customerId, turns.slice(-MAX_TURNS));
}

function compactTurn(
  turn: Anthropic.Messages.MessageParam[]
): Anthropic.Messages.MessageParam[] {
  return turn.map((message) => {
    if (message.role !== "user" || !Array.isArray(message.content)) {
      return message;
    }
    return {
      ...message,
      content: message.content.map((block) => {
        if (
          typeof block !== "object" ||
          block === null ||
          !("type" in block) ||
          block.type !== "tool_result"
        ) {
          return block;
        }
        const toolResult = block as Anthropic.Messages.ToolResultBlockParam;
        const text =
          typeof toolResult.content === "string"
            ? toolResult.content
            : JSON.stringify(toolResult.content);
        if (text.length <= MAX_TOOL_RESULT_CHARS) {
          return block;
        }
        return { ...toolResult, content: REMOVED_NOTICE };
      }),
    };
  });
}
