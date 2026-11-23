import { Tool } from "@anthropic-ai/sdk/resources/messages.js";

export const tools: Tool[] = [
  {
    name: "get_goal",
    description: "Get the user's current goal, progress, and plan",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "create_goal",
    description:
      "Create a new goal (e.g., Alps trip). Call after user describes their goal.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Goal name (e.g., 'Snowboarding trip to Alps')",
        },
        target_amount: {
          type: "number",
          description: "Target amount in EUR (e.g., 2000)",
        },
        target_date: {
          type: "string",
          description: "Target date in YYYY-MM-DD format",
        },
        reason: {
          type: "string",
          description: "Why this goal (optional)",
        },
      },
      required: ["name", "target_amount", "target_date"],
    },
  },
  {
    name: "get_data",
    description:
      "Get this customer's actual transactions and confirmed plans as a compact text table, not JSON: " +
      "'as_of=...', then 'actuals'/'plans' sections with one 'month,category,eur,n' line per row. " +
      "A 'types' section lists each category's transaction types once, and an optional 'plan_reasons' " +
      "section gives the reason for plan rows that have one. " +
      "Actuals stop at the database demo clock (as_of); plans include future months. " +
      "Transfers (Salary Sweep, Invest Deposit, Invest Withdraw) are excluded from both. " +
      "Use only returned category/type names and amounts; do not calculate new amounts.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "save_plan",
    description:
      "Replace this customer's complete plan with dated entries after explicit user confirmation. " +
      "Each entry needs a short user-facing reason, not private internal reasoning. " +
      "Copy amounts from user-confirmed values or tool results; never calculate or invent amounts.",
    input_schema: {
      type: "object" as const,
      properties: {
        entries_csv: {
          type: "string",
          minLength: 1,
          description:
            "One plan entry per line, no header line, 5 comma-separated fields: " +
            "plan_date,plan_timestamp,category,plan_amount_eur,reason. plan_date is " +
            "YYYY-MM-DD. plan_timestamp is a local YYYY-MM-DDTHH:mm:ss timestamp, without " +
            "timezone. category is from get_data. plan_amount_eur is a signed EUR decimal " +
            "with exactly two decimal places (e.g. -45.00), same sign convention as actuals. " +
            "reason is free text explaining why the user chose this entry and may contain " +
            "commas - only the first 4 commas on the line are field separators, everything " +
            "after the 4th comma is the reason. Example line: " +
            "2026-09-30,2026-09-30T12:00:00,Restaurants,-45.00,Cut dining out, save for the trip",
        },
      },
      required: ["entries_csv"],
      additionalProperties: false,
    },
  },
  {
    name: "detect_issues",
    description:
      "Check if there are any warnings or issues with the plan (unexpected spending, upcoming events)",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];
