type TagChipProps = {
  name: string;
  count?: number;
  selected?: boolean;
  onClick?: () => void;
};

export default function TagChip({
  name,
  count,
  selected,
  onClick,
}: TagChipProps) {
  const base =
    "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors";
  const interactive = onClick
    ? "cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900"
    : "";
  const selectedStyle = selected
    ? "bg-blue-500 text-white"
    : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";

  const Tag = onClick ? "button" : "span";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      aria-pressed={onClick ? selected : undefined}
      className={`${base} ${interactive} ${selectedStyle}`}
      onClick={onClick}
    >
      {name}
      {count !== undefined && (
        <span
          className={`text-[10px] ${selected ? "text-blue-200" : "text-gray-400 dark:text-gray-500"}`}
        >
          {count}
        </span>
      )}
    </Tag>
  );
}
