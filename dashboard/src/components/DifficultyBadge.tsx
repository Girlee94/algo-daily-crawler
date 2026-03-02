import { getTierInfo } from "@/lib/constants";

export default function DifficultyBadge({ tier }: { tier: number }) {
  const info = getTierInfo(tier);

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
      style={{ backgroundColor: info.color }}
    >
      {info.label}
    </span>
  );
}
