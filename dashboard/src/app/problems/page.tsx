import { Suspense } from "react";
import { supabase, Problem } from "@/lib/supabase";
import { TIER_INFO, PAGE_SIZE_OPTIONS } from "@/lib/constants";
import ProblemCard from "@/components/ProblemCard";
import ProblemListFilter from "@/components/ProblemListFilter";

export const revalidate = 3600;

type Props = {
  searchParams: Promise<{
    page?: string;
    tier?: string;
    lang?: string;
    size?: string;
  }>;
};

async function getProblems(params: {
  page: number;
  tier: string;
  lang: string;
  size: number;
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

  const from = (params.page - 1) * params.size;
  const to = from + params.size - 1;

  const { data, error, count } = await query
    .order("tier", { ascending: true })
    .order("external_id", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("Failed to fetch problems:", error);
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
    .eq("is_solvable", true);

  if (error) {
    console.error("Failed to fetch languages:", error);
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
  const size = PAGE_SIZE_OPTIONS.includes(Number(params.size))
    ? Number(params.size)
    : 20;

  const [{ problems: initialProblems, totalCount }, availableLanguages] =
    await Promise.all([
      getProblems({ page, tier, lang, size }),
      getAvailableLanguages(),
    ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / size));
  const safePage = Math.min(page, totalPages);
  const problems =
    safePage === page
      ? initialProblems
      : (await getProblems({ page: safePage, tier, lang, size })).problems;

  return (
    <>
      <ProblemListFilter
        totalCount={totalCount}
        availableLanguages={availableLanguages}
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
