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
  languages: string[] | null;
  url: string;
};

export type Tag = {
  id: string;
  key: string;
  display_name_ko: string | null;
  display_name_en: string | null;
  problem_count: number;
};

export type ProblemDetail = Problem & {
  average_tries: number | null;
  is_solvable: boolean;
  problem_tags: {
    tag_id: string;
    tags: Tag;
  }[];
};

export type RecommendationSummary = {
  id: string;
  recommended_date: string;
  strategy: string;
  reason: string | null;
};

export type DailyRecommendation = {
  id: string;
  recommended_date: string;
  strategy: string;
  reason: string;
  display_order: number;
  problems: Problem;
};
