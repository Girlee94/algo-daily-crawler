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

type SearchParams = Record<string, string | string[] | undefined>;

type Props = {
  searchParams: Promise<SearchParams>;
};

function firstParam(v?: string | string[]): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

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

async function resolveTagIds(tagKeys: string[]): Promise<string[] | null> {
  if (tagKeys.length === 0) return null;

  const { data, error } = await supabase
    .from("tags")
    .select("id")
    .in("key", tagKeys)
    .eq("is_meta", false);

  if (error) {
    throw new Error(`Failed to resolve tag ids: ${error.message}`);
  }

  return (data || []).map((t: { id: string }) => t.id);
}

async function getProblems(params: {
  page: number;
  tier: string;
  lang: string;
  size: number;
  date: string;
  tagIds: string[] | null;
  q: string;
}): Promise<{ problems: Problem[]; totalCount: number }> {
  // Use inner join when tag filtering to push filtering to DB in a single query
  const selectFields =
    params.tagIds && params.tagIds.length > 0
      ? "id, external_id, title_ko, title_en, tier, accepted_user_count, languages, url, problem_tags!inner(tag_id)"
      : "id, external_id, title_ko, title_en, tier, accepted_user_count, languages, url";

  let query = supabase
    .from("problems")
    .select(selectFields, { count: "exact" })
    .eq("is_solvable", true);

  // Tag filter via inner join (single DB query, no intermediate ID list)
  if (params.tagIds !== null) {
    if (params.tagIds.length === 0) {
      return { problems: [], totalCount: 0 };
    }
    query = query.in("problem_tags.tag_id", params.tagIds);
  }

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

  // Search filter (allowlist: letters, numbers, spaces only)
  if (params.q) {
    const term = params.q
      .trim()
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .slice(0, 100);
    if (/^\d+$/.test(term)) {
      query = query.eq("external_id", Number(term));
    } else if (term.length > 0) {
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
    throw new Error(`Failed to fetch problems: ${error.message}`);
  }

  return {
    problems: (data as unknown as Problem[]) || [],
    totalCount: count || 0,
  };
}

async function getAvailableLanguages(): Promise<string[]> {
  const langSet = new Set<string>();
  const PAGE = 1000;
  const MAX_PAGES = 100;
  let from = 0;
  let pageCount = 0;

  // Paginate to collect all distinct languages with safety limit
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (++pageCount > MAX_PAGES) {
      console.warn("getAvailableLanguages: hit max page limit");
      break;
    }
    const { data, error } = await supabase
      .from("problems")
      .select("languages")
      .eq("is_solvable", true)
      .range(from, from + PAGE - 1);

    if (error) {
      console.error("Failed to fetch languages:", error?.message);
      break;
    }

    for (const row of data || []) {
      for (const lang of row.languages || []) {
        langSet.add(lang);
      }
    }

    if (!data || data.length < PAGE) break;
    from += PAGE;
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
  const page = Math.min(
    Math.max(1, Number(firstParam(params.page)) || 1),
    1000,
  );
  const tier = firstParam(params.tier) || "all";
  const lang = firstParam(params.lang) || "all";
  const date = firstParam(params.date) || "all";
  const size = PAGE_SIZE_OPTIONS.includes(Number(firstParam(params.size)))
    ? Number(firstParam(params.size))
    : 20;
  const tagsRaw = firstParam(params.tags);
  const selectedTagKeys = tagsRaw
    ? [
        ...new Set(
          tagsRaw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ].slice(0, 10)
    : [];
  const q = firstParam(params.q) || "";

  const [popularTags, availableLanguages] = await Promise.all([
    getPopularTags(),
    getAvailableLanguages(),
  ]);

  const tagIds = await resolveTagIds(selectedTagKeys);

  const { problems: initialProblems, totalCount } = await getProblems({
    page,
    tier,
    lang,
    size,
    date,
    tagIds,
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
            tagIds,
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
