import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import type { ProblemDetail, RecommendationSummary } from "@/lib/supabase";
import DifficultyBadge from "@/components/DifficultyBadge";
import TagChip from "@/components/TagChip";
import { LANGUAGE_LABELS, getTierInfo, safeExternalUrl } from "@/lib/constants";

export const revalidate = 3600;

type Props = {
  params: Promise<{ id: string }>;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getProblem = cache(async (id: string): Promise<ProblemDetail | null> => {
  if (!UUID_RE.test(id)) return null;

  const { data, error } = await supabase
    .from("problems")
    .select(
      `*, problem_tags(tag_id, tags(id, key, display_name_ko, display_name_en, problem_count))`,
    )
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as ProblemDetail;
});

async function getRecommendationHistory(
  problemId: string,
): Promise<RecommendationSummary[]> {
  const { data, error } = await supabase
    .from("daily_recommendations")
    .select("id, recommended_date, strategy, reason")
    .eq("problem_id", problemId)
    .order("recommended_date", { ascending: false })
    .limit(10);

  if (error) return [];
  return (data as RecommendationSummary[]) || [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const problem = await getProblem(id);
  if (!problem) return { title: "Problem Not Found" };

  const title =
    problem.title_ko || problem.title_en || `Problem #${problem.external_id}`;
  const tierInfo = getTierInfo(problem.tier);

  return {
    title: `${title} - ${tierInfo.label}`,
    description: `Algorithm problem #${problem.external_id} (${tierInfo.label}) - ${problem.accepted_user_count.toLocaleString()} users solved`,
  };
}

export default async function ProblemDetailPage({ params }: Props) {
  const { id } = await params;
  const problem = await getProblem(id);
  if (!problem) notFound();

  const recommendations = await getRecommendationHistory(id);
  const tierInfo = getTierInfo(problem.tier);
  const title =
    problem.title_ko || problem.title_en || `Problem #${problem.external_id}`;
  const tags = problem.problem_tags?.map((pt) => pt.tags).filter(Boolean) || [];

  return (
    <div>
      <Link
        href="/problems"
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-500 mb-6"
      >
        &larr; Back to Problems
      </Link>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <DifficultyBadge tier={problem.tier} />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {title}
            </h1>
            <span className="text-sm text-gray-400">
              #{problem.external_id}
            </span>
          </div>
        </div>

        {/* External Links */}
        <div className="flex gap-3 mb-6">
          <a
            href={safeExternalUrl(problem.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            Solve on BOJ
          </a>
          <a
            href={`https://solved.ac/search?query=${problem.external_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            View on solved.ac
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {problem.accepted_user_count.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Accepted
            </div>
          </div>
          <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {problem.average_tries?.toFixed(2) ?? "-"}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Avg Tries
            </div>
          </div>
          <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <div
              className="text-lg font-bold"
              style={{ color: tierInfo.color }}
            >
              {tierInfo.label}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Tier</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {problem.is_solvable ? "Yes" : "No"}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Solvable
            </div>
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Tags
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Link key={tag.id} href={`/problems?tags=${tag.key}`}>
                  <TagChip
                    name={tag.display_name_en || tag.key}
                    count={tag.problem_count}
                  />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Languages */}
        {problem.languages && problem.languages.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Languages
            </h2>
            <div className="flex flex-wrap gap-2">
              {problem.languages.map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600"
                >
                  {LANGUAGE_LABELS[lang] || lang.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recommendation History */}
        {recommendations.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Recommendation History
            </h2>
            <div className="space-y-2">
              {recommendations.map((rec) => (
                <Link
                  key={rec.id}
                  href={`/history?date=${rec.recommended_date}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {rec.recommended_date}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {rec.strategy}
                    {rec.reason && ` - ${rec.reason}`}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
