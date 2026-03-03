export const LANGUAGE_LABELS: Record<string, string> = {
  ko: "Korean",
  en: "English",
  ja: "Japanese",
  zh: "Chinese",
  ru: "Russian",
  bg: "Bulgarian",
  es: "Spanish",
  fr: "French",
  de: "German",
  vi: "Vietnamese",
};

export const TIER_INFO: Record<
  string,
  { name: string; color: string; range: [number, number] }
> = {
  bronze: { name: "Bronze", color: "#ad5600", range: [1, 5] },
  silver: { name: "Silver", color: "#435f7a", range: [6, 10] },
  gold: { name: "Gold", color: "#ec9a00", range: [11, 15] },
  platinum: { name: "Platinum", color: "#27e2a4", range: [16, 20] },
  diamond: { name: "Diamond", color: "#00b4fc", range: [21, 25] },
  ruby: { name: "Ruby", color: "#ff0062", range: [26, 30] },
};

export const TIER_FILTER_OPTIONS = [
  { value: "all", label: "All Tiers" },
  ...Object.entries(TIER_INFO).map(([value, info]) => ({
    value,
    label: `${info.name} (${info.range[0]}-${info.range[1]})`,
  })),
];

export const PAGE_SIZE_OPTIONS = [10, 20, 50];

export function getTierInfo(tier: number) {
  for (const [key, info] of Object.entries(TIER_INFO)) {
    if (tier >= info.range[0] && tier <= info.range[1]) {
      const level = tier - info.range[0] + 1;
      return { key, ...info, level, label: `${info.name} ${level}` };
    }
  }
  return {
    key: "unrated",
    name: "Unrated",
    color: "#666",
    range: [0, 0] as [number, number],
    level: 0,
    label: "Unrated",
  };
}
