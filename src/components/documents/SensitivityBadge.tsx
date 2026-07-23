/** SensitivityBadge: colored label for a document sensitivity level. */
import { cn } from "@/lib/utils";
import { SENSITIVITY_LEVEL, SENSITIVITY_COLOR } from "@/types";

export function SensitivityBadge({ level, className }: { level: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded text-xs font-medium",
        SENSITIVITY_COLOR[level] ?? "bg-gray-100 text-gray-700",
        className,
      )}
    >
      {SENSITIVITY_LEVEL[level] ?? level}
    </span>
  );
}
