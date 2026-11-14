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
    name: "save_plan",
    description:
      "Save the monthly budget plan. Call after user confirms they want to proceed.",
    input_schema: {
      type: "object" as const,
      properties: {
        monthly_savings: {
          type: "number",
          description: "Amount to save per month in EUR",
        },
        categories: {
          type: "object",
          description:
            "Monthly limits by category (e.g., {'dining': 100, 'shopping': 200})",
        },
      },
      required: ["monthly_savings", "categories"],
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
