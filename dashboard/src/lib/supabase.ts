import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Problem = {
  id: string;
  external_id: number;
  title_ko: string;
  title_en: string;
  tier: number;
  accepted_user_count: number;
  languages: string[];
  url: string;
};

export type DailyRecommendation = {
  id: string;
  recommended_date: string;
  strategy: string;
  reason: string;
  display_order: number;
  problems: Problem;
};

// Re-export constants for backward compatibility
export { LANGUAGE_LABELS, TIER_INFO, getTierInfo } from "./constants";
