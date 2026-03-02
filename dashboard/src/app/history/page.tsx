import { supabase, DailyRecommendation } from "@/lib/supabase";
import RecommendationList from "@/components/RecommendationList";
import Link from "next/link";

export const revalidate = 3600;

type Props = {
  searchParams: Promise<{ date?: string }>;
};

function isValidDateFormat(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date));
}

async function getRecommendations(
  date: string
): Promise<DailyRecommendation[]> {
  const { data, error } = await supabase
    .from("daily_recommendations")
    .select("*, problems(*)")
    .eq("recommended_date", date)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Failed to fetch recommendations:", error);
    return [];
  }

  return (data as DailyRecommendation[]) || [];
}

async function getAvailableDates(): Promise<string[]> {
  const { data, error } = await supabase
    .from("daily_recommendations")
    .select("recommended_date")
    .order("recommended_date", { ascending: false })
    .limit(30);

  if (error) return [];

  const uniqueDates = [
    ...new Set((data || []).map((d) => d.recommended_date)),
  ];
  return uniqueDates;
}

export default async function HistoryPage({ searchParams }: Props) {
  const params = await searchParams;
  const dates = await getAvailableDates();

  const requestedDate = params.date;
  const selectedDate =
    requestedDate && isValidDateFormat(requestedDate)
      ? requestedDate
      : dates[0] || "";

  const recommendations = selectedDate
    ? await getRecommendations(selectedDate)
    : [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Recommendation History
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Browse past daily recommendations
        </p>
      </div>

      {dates.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No recommendation history yet.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-8">
            {dates.map((d) => (
              <Link
                key={d}
                href={`/history?date=${d}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  d === selectedDate
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {new Date(d + "T00:00:00").toLocaleDateString("ko-KR", {
                  month: "short",
                  day: "numeric",
                })}
              </Link>
            ))}
          </div>

          {selectedDate && (
            <div>
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                  "ko-KR",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }
                )}
              </h2>
              <RecommendationList recommendations={recommendations} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
