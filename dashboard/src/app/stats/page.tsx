import { supabase } from "@/lib/supabase";
import { TIER_INFO } from "@/lib/constants";
import TierDistributionChart from "@/components/charts/TierDistributionChart";
import TagDistributionChart from "@/components/charts/TagDistributionChart";
import RecommendationTrendChart from "@/components/charts/RecommendationTrendChart";

export const revalidate = 3600;

async function getStats() {
  const [problemsRes, tagsRes, recommendationsRes] = await Promise.all([
    supabase
      .from("problems")
      .select("id", { count: "exact", head: true })
      .eq("is_solvable", true),
    supabase
      .from("tags")
      .select("id", { count: "exact", head: true })
      .eq("is_meta", false),
    supabase
      .from("daily_recommendations")
      .select("id", { count: "exact", head: true }),
  ]);

  return {
    totalProblems: problemsRes.count || 0,
    totalTags: tagsRes.count || 0,
    totalRecommendations: recommendationsRes.count || 0,
  };
}

async function getTierDistribution() {
  // Query count per tier range using individual count queries (no row-level fetch)
  const results = await Promise.all(
    Object.entries(TIER_INFO).map(async ([, info]) => {
      const { count } = await supabase
        .from("problems")
        .select("id", { count: "exact", head: true })
        .eq("is_solvable", true)
        .gte("tier", info.range[0])
        .lte("tier", info.range[1]);
      return { name: info.name, count: count || 0, color: info.color };
    }),
  );
  return results;
}

async function getTagDistribution() {
  const { data, error } = await supabase
    .from("tags")
    .select("display_name_en, key, problem_count")
    .eq("is_meta", false)
    .order("problem_count", { ascending: false })
    .limit(15);

  if (error || !data) return [];

  return data.map((tag) => ({
    name: tag.display_name_en || tag.key,
    count: tag.problem_count,
  }));
}

async function getRecommendationTrend() {
  // Fetch most recent 10k rows (descending) then reverse for chronological display
  const { data, error } = await supabase
    .from("daily_recommendations")
    .select("recommended_date")
    .order("recommended_date", { ascending: false })
    .limit(10000);

  if (error || !data) return [];

  const counts: Record<string, number> = {};
  for (const row of data) {
    const date = row.recommended_date;
    counts[date] = (counts[date] || 0) + 1;
  }

  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

export default async function StatsPage() {
  const [stats, tierData, tagData, trendData] = await Promise.all([
    getStats(),
    getTierDistribution(),
    getTagDistribution(),
    getRecommendationTrend(),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Statistics
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Overview of collected problems and recommendations
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-center">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {stats.totalProblems.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Total Problems
          </div>
        </div>
        <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-center">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {stats.totalTags.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Total Tags
          </div>
        </div>
        <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-center">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {stats.totalRecommendations.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Total Recommendations
          </div>
        </div>
      </div>

      {/* Tier Distribution */}
      <div className="mb-8 p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Tier Distribution
        </h2>
        <TierDistributionChart data={tierData} />
      </div>

      {/* Tag Distribution */}
      <div className="mb-8 p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Top 15 Tags
        </h2>
        <TagDistributionChart data={tagData} />
      </div>

      {/* Recommendation Trend */}
      <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recommendation Trend
        </h2>
        <RecommendationTrendChart data={trendData} />
      </div>
    </div>
  );
}
