"use client";

import { useState, useMemo } from "react";
import type { DailyRecommendation } from "@/lib/supabase";
import ProblemCard from "./ProblemCard";
import LanguageFilter from "./LanguageFilter";

type RecommendationListProps = {
  recommendations: DailyRecommendation[];
};

export default function RecommendationList({
  recommendations,
}: RecommendationListProps) {
  const [selectedLang, setSelectedLang] = useState<string | null>(null);

  const availableLanguages = useMemo(() => {
    const langSet = new Set<string>();
    for (const rec of recommendations) {
      for (const lang of rec.problems.languages || []) {
        langSet.add(lang);
      }
    }
    const sorted = [...langSet].sort((a, b) => {
      const priority = ["ko", "en", "ja"];
      const ai = priority.indexOf(a);
      const bi = priority.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
    return sorted;
  }, [recommendations]);

  const filtered = useMemo(() => {
    if (!selectedLang) return recommendations;
    return recommendations.filter((rec) =>
      (rec.problems.languages || []).includes(selectedLang),
    );
  }, [recommendations, selectedLang]);

  return (
    <div>
      <div className="mb-4">
        <LanguageFilter
          availableLanguages={availableLanguages}
          selected={selectedLang}
          onChange={setSelectedLang}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>No problems match the selected language filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((rec) => (
            <ProblemCard
              key={rec.id}
              id={rec.problems.id}
              order={rec.display_order + 1}
              title={rec.problems.title_ko}
              tier={rec.problems.tier}
              url={rec.problems.url}
              externalId={rec.problems.external_id}
              acceptedCount={rec.problems.accepted_user_count}
              languages={[...new Set(rec.problems.languages || [])]}
              reason={rec.reason}
            />
          ))}
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="mt-6 text-center text-xs text-gray-400">
          Strategy: {recommendations[0]?.strategy}
          {selectedLang &&
            filtered.length > 0 &&
            ` | Filtered: ${filtered.length}/${recommendations.length}`}
        </div>
      )}
    </div>
  );
}
