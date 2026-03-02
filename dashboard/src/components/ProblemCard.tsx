import DifficultyBadge from "./DifficultyBadge";
import { LANGUAGE_LABELS } from "@/lib/supabase";

type ProblemCardProps = {
  order: number;
  title: string;
  tier: number;
  url: string;
  externalId: number;
  acceptedCount: number;
  languages: string[];
  reason: string;
};

export default function ProblemCard({
  order,
  title,
  tier,
  url,
  externalId,
  acceptedCount,
  languages,
  reason,
}: ProblemCardProps) {
  return (
    <div className="flex items-start gap-4 p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-500">
        {order}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <DifficultyBadge tier={tier} />
          <span className="text-xs text-gray-400">#{externalId}</span>
          {languages.map((lang) => (
            <span
              key={lang}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600"
            >
              {LANGUAGE_LABELS[lang] || lang.toUpperCase()}
            </span>
          ))}
        </div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
        >
          {title || `Problem #${externalId}`}
        </a>

        <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>{acceptedCount.toLocaleString()} solved</span>
          {reason && (
            <span className="text-xs italic text-gray-400">{reason}</span>
          )}
        </div>
      </div>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
      >
        Solve
      </a>
    </div>
  );
}
