import { Suspense } from "react";
import { supabase, Problem, Tag } from "@/lib/supabase";
import {
  TIER_INFO,
  PAGE_SIZE_OPTIONS,
  DATE_FILTER_OPTIONS,
} from "@/lib/constants";
import ProblemCard from "@/components/ProblemCard";
import ProblemListFilter from "@/components/ProblemListFilter";

export const revalidate = 3600;

type Props = {
  searchParams: Promise<{
    page?: string;
    tier?: string;
    lang?: string;
    size?: string;
    date?: string;
    tags?: string;
    q?: string;
  }>;
};

async function getPopularTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from("tags")
    .select("id, key, display_name_ko, display_name_en, problem_count")
    .eq("is_meta", false)
    .order("problem_count", { ascending: false })
    .limit(30);

  if (error) {
    console.error("Failed to fetch tags:", error?.message);
    return [];
  }
  return (data as Tag[]) || [];
}

async function getProblemIdsByTags(
  tagKeys: string[],
  allTags: Tag[],
): Promise<string[] | null> {
  if (tagKeys.length === 0) return null;

  const tagIds = allTags
    .filter((t) => tagKeys.includes(t.key))
    .map((t) => t.id);

  if (tagIds.length === 0) return [];

  const { data, error } = await supabase
    .from("problem_tags")
    .select("problem_id")
    .in("tag_id", tagIds)
    .limit(2000);

  if (error) {
    console.error("Failed to fetch problem_tags:", error?.message);
    return [];
  }

  const ids = [
    ...new Set((data || []).map((r: { problem_id: string }) => r.problem_id)),
  ];
  return ids;
}

async function getProblems(params: {
  page: number;
  tier: string;
  lang: string;
  size: number;
  date: string;
  tagProblemIds: string[] | null;
  q: string;
}): Promise<{ problems: Problem[]; totalCount: number }> {
  let query = supabase
    .from("problems")
    .select(
      "id, external_id, title_ko, title_en, tier, accepted_user_count, languages, url",
      { count: "exact" },
    )
    .eq("is_solvable", true);

  if (params.tier !== "all") {
    const tierInfo = TIER_INFO[params.tier];
    if (tierInfo) {
      query = query
        .gte("tier", tierInfo.range[0])
        .lte("tier", tierInfo.range[1]);
    }
  }

  if (params.lang !== "all") {
    query = query.contains("languages", [params.lang]);
  }

  const allowedDays = DATE_FILTER_OPTIONS.map((o) => o.value).filter(
    (v) => v !== "all",
  );
  if (allowedDays.includes(params.date)) {
    const days = Number(params.date);
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const since = new Date(Date.now() - days * MS_PER_DAY).toISOString();
    query = query.gte("created_at", since);
  }

  // Tag filter
  if (params.tagProblemIds !== null) {
    if (params.tagProblemIds.length === 0) {
      return { problems: [], totalCount: 0 };
    }
    query = query.in("id", params.tagProblemIds);
  }

  // Search filter (allowlist: letters, numbers, spaces only)
  if (params.q) {
    const term = params.q
      .trim()
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .slice(0, 100);
    if (/^\d+$/.test(term)) {
      query = query.eq("external_id", Number(term));
    } else if (term.length > 0) {
      // Escape LIKE wildcards as defence in depth
      const safeTerm = term.replace(/%/g, "\\%").replace(/_/g, "\\_");
      query = query.or(
        `title_ko.ilike.%${safeTerm}%,title_en.ilike.%${safeTerm}%`,
      );
    }
  }

  const from = (params.page - 1) * params.size;
  const to = from + params.size - 1;

  const { data, error, count } = await query
    .order("tier", { ascending: true })
    .order("external_id", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("Failed to fetch problems:", error?.message);
    return { problems: [], totalCount: 0 };
  }

  return {
    problems: (data as Problem[]) || [],
    totalCount: count || 0,
  };
}

async function getAvailableLanguages(): Promise<string[]> {
  const { data, error } = await supabase
    .from("problems")
    .select("languages")
    .eq("is_solvable", true)
    .limit(50000);

  if (error) {
    console.error("Failed to fetch languages:", error?.message);
    return [];
  }

  const langSet = new Set<string>();
  for (const row of data || []) {
    for (const lang of row.languages || []) {
      langSet.add(lang);
    }
  }

  const priority = ["ko", "en", "ja"];
  return [...langSet].sort((a, b) => {
    const ai = priority.indexOf(a);
    const bi = priority.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });
}

async function ProblemsContent({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.min(Math.max(1, Number(params.page) || 1), 1000);
  const tier = params.tier || "all";
  const lang = params.lang || "all";
  const date = params.date || "all";
  const size = PAGE_SIZE_OPTIONS.includes(Number(params.size))
    ? Number(params.size)
    : 20;
  const selectedTagKeys = params.tags
    ? params.tags.split(",").filter(Boolean).slice(0, 10)
    : [];
  const q = params.q || "";

  const [popularTags, availableLanguages] = await Promise.all([
    getPopularTags(),
    getAvailableLanguages(),
  ]);

  const tagProblemIds = await getProblemIdsByTags(selectedTagKeys, popularTags);

  const { problems: initialProblems, totalCount } = await getProblems({
    page,
    tier,
    lang,
    size,
    date,
    tagProblemIds,
    q,
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / size));
  const safePage = Math.min(page, totalPages);
  const problems =
    safePage === page
      ? initialProblems
      : (
          await getProblems({
            page: safePage,
            tier,
            lang,
            size,
            date,
            tagProblemIds,
            q,
          })
        ).problems;

  return (
    <>
      <ProblemListFilter
        totalCount={totalCount}
        availableLanguages={availableLanguages}
        popularTags={popularTags}
      />

      {problems.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No problems found matching the filters.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {problems.map((problem, idx) => (
            <ProblemCard
              key={problem.id}
              id={problem.id}
              order={(safePage - 1) * size + idx + 1}
              title={problem.title_ko || problem.title_en}
              tier={problem.tier}
              url={problem.url}
              externalId={problem.external_id}
              acceptedCount={problem.accepted_user_count}
              languages={problem.languages || []}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default function ProblemsPage(props: Props) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Problem Collection
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Browse all collected algorithm problems
        </p>
      </div>

      <Suspense
        fallback={
          <div className="text-center py-16 text-gray-400">Loading...</div>
        }
      >
        <ProblemsContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
