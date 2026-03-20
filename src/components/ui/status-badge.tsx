import { cn } from "@/lib/utils";
import { DocumentStatus, SensitivityLevel } from "@/types";

interface StatusBadgeProps {
  status: DocumentStatus;
  className?: string;
}

const statusConfig: Record<
  DocumentStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-status-draft/15 text-status-draft border-status-draft/30",
  },
  review: {
    label: "In Review",
    className: "bg-status-review/15 text-status-review border-status-review/30",
  },
  approved: {
    label: "Approved",
    className:
      "bg-status-approved/15 text-status-approved border-status-approved/30",
  },
  archived: {
    label: "Archived",
    className:
      "bg-status-archived/15 text-status-archived border-status-archived/30",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}

interface SensitivityLevelBadgeProps {
  level: SensitivityLevel;
  className?: string;
}

const sensitivityLevelConfig: Record<
  SensitivityLevel,
  { label: string; className: string }
> = {
  public: {
    label: "Public",
    className:
      "bg-sensitivity_level-public/15 text-sensitivity_level-public border-sensitivity_level-public/30",
  },
  internal: {
    label: "Internal",
    className:
      "bg-sensitivity_level-internal/15 text-sensitivity_level-internal border-sensitivity_level-internal/30",
  },
  confidential: {
    label: "Confidential",
    className:
      "bg-sensitivity_level-confidential/15 text-sensitivity_level-confidential border-sensitivity_level-confidential/30",
  },
};

export function SensitivityLevelBadge({
  level,
  className,
}: SensitivityLevelBadgeProps) {
  const config = sensitivityLevelConfig[level];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
