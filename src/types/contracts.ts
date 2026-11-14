export interface Goal {
  id: string;
  customer_id: string;
  name: string;
  target_amount: number;
  target_date: string;
  reason?: string;
  created_at: string;
}

export interface Progress {
  saved_amount: number;
  remaining_amount: number;
  percentage: number;
  on_track: boolean;
}

export interface Plan {
  monthly_savings: number;
  categories: Record<string, number>;
  created_at: string;
}

export interface Warning {
  type: "spending_over" | "upcoming_event" | "behind_plan";
  message: string;
  severity: "low" | "medium" | "high";
  suggested_action?: string;
}
