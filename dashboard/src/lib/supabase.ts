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

export const TIER_INFO: Record<
  string,
  { name: string; color: string; range: [number, number] }
> = {
  bronze: { name: "Bronze", color: "#ad5600", range: [1, 5] },
  silver: { name: "Silver", color: "#435f7a", range: [6, 10] },
  gold: { name: "Gold", color: "#ec9a00", range: [11, 15] },
  platinum: { name: "Platinum", color: "#27e2a4", range: [16, 20] },
  diamond: { name: "Diamond", color: "#00b4fc", range: [21, 25] },
  ruby: { name: "Ruby", color: "#ff0062", range: [26, 30] },
};

export function getTierInfo(tier: number) {
  for (const [key, info] of Object.entries(TIER_INFO)) {
    if (tier >= info.range[0] && tier <= info.range[1]) {
      const level = tier - info.range[0] + 1;
      return { key, ...info, level, label: `${info.name} ${level}` };
    }
  }
  return { key: "unrated", name: "Unrated", color: "#666", range: [0, 0] as [number, number], level: 0, label: "Unrated" };
}
