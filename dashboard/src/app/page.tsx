import { supabase, DailyRecommendation } from "@/lib/supabase";
import RecommendationList from "@/components/RecommendationList";

export const revalidate = 3600;

async function getTodayRecommendations(): Promise<DailyRecommendation[]> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("daily_recommendations")
    .select("*, problems(*)")
    .eq("recommended_date", today)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Failed to fetch recommendations:", error);
    return [];
  }

  return (data as DailyRecommendation[]) || [];
}

export default async function Home() {
  const recommendations = await getTodayRecommendations();
  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Today&apos;s Algorithm Problems
        </h1>
        <p className="text-gray-500 dark:text-gray-400">{today}</p>
      </div>

      {recommendations.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No recommendations for today yet.</p>
          <p className="text-sm">
            Run{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
              python -m crawler.main recommend
            </code>{" "}
            to generate them.
          </p>
        </div>
      ) : (
        <RecommendationList recommendations={recommendations} />
      )}
    </div>
  );
}
