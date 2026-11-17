import type Anthropic from "@anthropic-ai/sdk";

export interface TurnUsage {
  calls: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

// TODO: verify on the Anthropic pricing page ✅
const INPUT_PRICE_PER_MTOK = 3;
// TODO: verify on the Anthropic pricing page ✅
const OUTPUT_PRICE_PER_MTOK = 15;
// TODO: verify on the Anthropic pricing page ✅
const CACHE_READ_PRICE_PER_MTOK = 0.3;
// TODO: verify on the Anthropic pricing page ✅
const CACHE_WRITE_PRICE_PER_MTOK = 3.75;

export function createTurnUsage(): TurnUsage {
  return { calls: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
}

export function addUsage(acc: TurnUsage, usage: Anthropic.Messages.Usage): void {
  acc.calls += 1;
  acc.input += usage.input_tokens;
  acc.output += usage.output_tokens;
  acc.cacheRead += usage.cache_read_input_tokens ?? 0;
  acc.cacheWrite += usage.cache_creation_input_tokens ?? 0;
}

export function estimateCost(acc: TurnUsage): number {
  return (
    (acc.input * INPUT_PRICE_PER_MTOK +
      acc.output * OUTPUT_PRICE_PER_MTOK +
      acc.cacheRead * CACHE_READ_PRICE_PER_MTOK +
      acc.cacheWrite * CACHE_WRITE_PRICE_PER_MTOK) /
    1_000_000
  );
}

export function formatTurnUsage(label: string, acc: TurnUsage): string {
  const cost = estimateCost(acc).toFixed(3);
  return `[usage] customer=${label} calls=${acc.calls} in=${acc.input} out=${acc.output} cache_read=${acc.cacheRead} cache_write=${acc.cacheWrite} est=$${cost}`;
}
