/** Color-coded badge displaying the sensitivity level label. */
import { cn } from "@/lib/utils";
import { SENSITIVITY_LABEL } from "@/types/policy";

export function SensitivityBadge({ level, className }: { level: number; className?: string }) {
  const color =
    level <= 2
      ? "bg-blue-50 text-blue-800"
      : level === 3
        ? "bg-amber-50 text-amber-800"
        : level === 4
          ? "bg-orange-50 text-orange-800"
          : "bg-red-50 text-red-800";
  return (
    <span
      className={cn(
        "inline-flex items-center text-[9.5px] font-medium px-2 py-[3px] rounded-md",
        color,
        className,
      )}
    >
      {SENSITIVITY_LABEL[level]}
    </span>
  );
}
