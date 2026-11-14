/**
 * The 15 categories of the S-Bank data, grouped in a human way.
 * Single source of truth: the system prompt (src/lib/ai/prompts.ts) and the database logic (Alex) both import this file.
 * Names are exactly as in the data.
 *
 * Challenge baskets: 1 = mandatory and regular, 2 = mandatory and irregular, 3 = everyday.
 */

export type CategoryGroupId = "income" | "moves" | "invest" | "fixed" | "daily" | "fun" | "surprise";

export interface CategoryGroup {
  id: CategoryGroupId;
  label: string; // what the user sees
  emoji: string;
  categories: string[];
  basket?: 1 | 2 | 3; // not set for income and moves
  isSpending: boolean;
  // can the agent suggest cutting here? "warn" = allowed, but only after an
  // explicit warning and the user's explicit yes to a direct confirmation question
  canCut: "no" | "a_little" | "yes" | "warn";
  hint: string; // one line for the system prompt
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: "income",
    label: "Money in",
    emoji: "💶",
    categories: ["Salary", "Other Income"],
    isSpending: false,
    canCut: "no",
    hint: "Money coming in. Not spending.",
  },
  {
    id: "moves",
    label: "Moves between your own pockets",
    emoji: "🔁",
    categories: ["Salary Sweep", "Invest Withdraw"],
    isSpending: false,
    canCut: "no",
    hint: "Money moved to savings or another account, or withdrawn from investments. NOT spending. Never count it as spending, and never suggest changing it.",
  },
  {
    id: "invest",
    label: "Your investments",
    emoji: "🏦",
    categories: ["Invest Deposit"],
    isSpending: false,
    canCut: "warn",
    hint:
      "Money you've been putting into investments each month. NOT spending. It can act as a " +
      "piggy bank for this goal if the user reduces how much they invest, but this is different " +
      "from cutting spending: it means touching their investments. Only suggest this after Fun and " +
      "treats (and a little of Daily life) have already been considered, and only after you clearly " +
      "warn the user and ask directly, for example: \"This would mean using your investment deposits " +
      "as a piggy bank for this goal instead of investing that money. Are you sure you want to do " +
      "that?\" Only include it in a plan after the user gives an explicit yes to that question.",
  },
  {
    id: "fixed",
    label: "Fixed bills",
    emoji: "🏠",
    categories: ["Housing", "Utilities"],
    basket: 1,
    isSpending: true,
    canCut: "no",
    hint: "Rent or mortgage and utilities. Regular and hard to change. Do not suggest cutting these.",
  },
  {
    id: "daily",
    label: "Daily life",
    emoji: "🛒",
    categories: ["Groceries", "Transportation"],
    basket: 3,
    isSpending: true,
    canCut: "a_little",
    hint: "Food at home and getting around. Needed, but a little flexible. Suggest only small changes here.",
  },
  {
    id: "fun",
    label: "Fun and treats",
    emoji: "🎉",
    categories: ["Restaurants", "Entertainment", "Lifestyle", "Travel"],
    basket: 3,
    isSpending: true,
    canCut: "yes",
    hint: "Eating out, entertainment, lifestyle and travel. The first place to cut, because it hurts the least.",
  },
  {
    id: "surprise",
    label: "Surprises",
    emoji: "⚡",
    categories: ["Health", "Home & Tech"],
    basket: 2,
    isSpending: true,
    canCut: "no",
    hint: "Irregular costs (a doctor, a broken laptop, a washing machine). They are hard to predict. Do not tell the user to cut them. Suggest a small reserve.",
  },
];

/** Categories that can have a monthly limit in a plan (`save_plan` -> `categories`). */
export const LIMIT_CATEGORIES: string[] = CATEGORY_GROUPS.filter((g) => g.canCut !== "no").flatMap((g) => g.categories);

/** Categories that are NOT spending. */
export const NOT_SPENDING: string[] = CATEGORY_GROUPS.filter((g) => !g.isSpending).flatMap((g) => g.categories);

export function groupOf(category: string): CategoryGroup | undefined {
  return CATEGORY_GROUPS.find((g) => g.categories.includes(category));
}

/** The text block for the system prompt. Built from the table above, so it never drifts. */
export function categoryGuideForPrompt(): string {
  const lines = CATEGORY_GROUPS.map((g) => `- ${g.emoji} ${g.label} (${g.categories.join(", ")}): ${g.hint}`);
  return `SPENDING CATEGORIES (use these groups, and these exact category names):
${lines.join("\n")}

Rules for categories:
- "Fun and treats", "Daily life", and "Your investments" (with the warning below) can get a
  monthly limit in save_plan. Use only these category names as keys: ${LIMIT_CATEGORIES.join(", ")}.
- When the user needs to save more, look at "Fun and treats" first, then a little at "Daily life".
  Never "Fixed bills" or "Surprises".
- "Your investments" (Invest Deposit) is a special case: only suggest reducing it as a last resort,
  after Fun and treats and Daily life, and only after you clearly warn the user that this means
  using their investment transfers as a piggy bank for this goal, then get an explicit yes to a
  direct confirmation question. Never add or change an Invest Deposit entry without that explicit yes.
- "Moves between your own pockets" (Salary Sweep, Invest Withdraw) and "Money in" are never spending
  and are never a piggy bank option.
- Talk about groups in simple words ("fun and treats", "daily life"). Say the exact category (for example Restaurants) only when it helps.`;
}
