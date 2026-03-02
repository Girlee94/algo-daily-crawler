"use client";

import { LANGUAGE_LABELS } from "@/lib/supabase";

type LanguageFilterProps = {
  availableLanguages: string[];
  selected: string | null;
  onChange: (lang: string | null) => void;
};

export default function LanguageFilter({
  availableLanguages,
  selected,
  onChange,
}: LanguageFilterProps) {
  if (availableLanguages.length <= 1) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-gray-500 dark:text-gray-400 mr-1">
        Language:
      </span>
      <button
        onClick={() => onChange(null)}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
          selected === null
            ? "bg-blue-500 text-white"
            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
        }`}
      >
        All
      </button>
      {availableLanguages.map((lang) => (
        <button
          key={lang}
          onClick={() => onChange(lang)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            selected === lang
              ? "bg-blue-500 text-white"
              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
        >
          {LANGUAGE_LABELS[lang] || lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
