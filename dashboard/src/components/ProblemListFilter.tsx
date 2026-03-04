"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  TIER_FILTER_OPTIONS,
  DATE_FILTER_OPTIONS,
  PAGE_SIZE_OPTIONS,
  LANGUAGE_LABELS,
} from "@/lib/constants";
import type { Tag } from "@/lib/supabase";
import TagChip from "./TagChip";
import SearchInput from "./SearchInput";

type ProblemListFilterProps = {
  totalCount: number;
  availableLanguages: string[];
  popularTags: Tag[];
};

export default function ProblemListFilter({
  totalCount,
  availableLanguages,
  popularTags,
}: ProblemListFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const validDateValues = new Set(DATE_FILTER_OPTIONS.map((opt) => opt.value));
  const currentTier = searchParams.get("tier") || "all";
  const currentLang = searchParams.get("lang") || "all";
  const rawDate = searchParams.get("date");
  const currentDate = rawDate && validDateValues.has(rawDate) ? rawDate : "all";
  const parsedSize = Number(searchParams.get("size"));
  const currentSize = PAGE_SIZE_OPTIONS.includes(parsedSize) ? parsedSize : 20;
  const parsedPage = Number(searchParams.get("page"));
  const currentPage =
    Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const currentTags = useMemo(
    () => searchParams.get("tags")?.split(",").filter(Boolean) || [],
    [searchParams],
  );
  const currentQ = searchParams.get("q") || "";

  const totalPages = Math.max(1, Math.ceil(totalCount / currentSize));

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === "all" || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      if (
        updates.tier ||
        updates.lang ||
        updates.size ||
        updates.date ||
        updates.tags !== undefined ||
        updates.q !== undefined
      ) {
        params.delete("page");
      }
      router.push(`/problems?${params.toString()}`);
    },
    [router, searchParams],
  );

  const toggleTag = useCallback(
    (tagKey: string) => {
      const newTags = currentTags.includes(tagKey)
        ? currentTags.filter((t) => t !== tagKey)
        : [...currentTags, tagKey];
      updateParams({ tags: newTags.join(",") });
    },
    [currentTags, updateParams],
  );

  return (
    <div className="space-y-4">
      <SearchInput
        value={currentQ}
        onChange={(val) => updateParams({ q: val })}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label
            htmlFor="tier-filter"
            className="text-sm text-gray-500 dark:text-gray-400"
          >
            Tier:
          </label>
          <select
            id="tier-filter"
            value={currentTier}
            onChange={(e) => updateParams({ tier: e.target.value })}
            className="px-3 py-1.5 rounded-lg text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
          >
            {TIER_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="lang-filter"
            className="text-sm text-gray-500 dark:text-gray-400"
          >
            Language:
          </label>
          <select
            id="lang-filter"
            value={currentLang}
            onChange={(e) => updateParams({ lang: e.target.value })}
            className="px-3 py-1.5 rounded-lg text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
          >
            <option value="all">All Languages</option>
            {availableLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {LANGUAGE_LABELS[lang] || lang.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="date-filter"
            className="text-sm text-gray-500 dark:text-gray-400"
          >
            Period:
          </label>
          <select
            id="date-filter"
            value={currentDate}
            onChange={(e) => updateParams({ date: e.target.value })}
            className="px-3 py-1.5 rounded-lg text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
          >
            {DATE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="size-filter"
            className="text-sm text-gray-500 dark:text-gray-400"
          >
            Show:
          </label>
          <select
            id="size-filter"
            value={currentSize}
            onChange={(e) => updateParams({ size: e.target.value })}
            className="px-3 py-1.5 rounded-lg text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>
        </div>

        <span className="text-sm text-gray-400 ml-auto">
          {totalCount} problems
        </span>
      </div>

      {popularTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-gray-400 dark:text-gray-500 self-center mr-1">
            Tags:
          </span>
          {popularTags.map((tag) => (
            <TagChip
              key={tag.id}
              name={tag.display_name_en || tag.key}
              count={tag.problem_count}
              selected={currentTags.includes(tag.key)}
              onClick={() => toggleTag(tag.key)}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-center gap-2"
        >
          <button
            type="button"
            aria-label="Go to previous page"
            disabled={currentPage <= 1}
            onClick={() => updateParams({ page: String(currentPage - 1) })}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Prev
          </button>

          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let page: number;
            if (totalPages <= 7) {
              page = i + 1;
            } else if (currentPage <= 4) {
              page = i + 1;
            } else if (currentPage >= totalPages - 3) {
              page = totalPages - 6 + i;
            } else {
              page = currentPage - 3 + i;
            }
            return (
              <button
                type="button"
                key={page}
                aria-label={`Go to page ${page}`}
                aria-current={page === currentPage ? "page" : undefined}
                onClick={() => updateParams({ page: String(page) })}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  page === currentPage
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {page}
              </button>
            );
          })}

          <button
            type="button"
            aria-label="Go to next page"
            disabled={currentPage >= totalPages}
            onClick={() => updateParams({ page: String(currentPage + 1) })}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
