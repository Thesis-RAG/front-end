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
    label: "Bản nháp",
    className: "bg-status-draft/15 text-status-draft border-status-draft/30",
  },
  uploaded: {
    label: "Đã tải lên",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  processing: {                                    
    label: "Đang xử lý",
    className: "bg-purple-100 text-purple-700 border-purple-200",
  },
  review: {
    label: "Đang xét duyệt",
    className: "bg-status-review/15 text-status-review border-status-review/30",
  },
  approved: {
    label: "Đã duyệt",
    className:
      "bg-status-approved/15 text-status-approved border-status-approved/30",
  },
  archived: {
    label: "Đã lưu trữ",
    className:
      "bg-status-archived/15 text-status-archived border-status-archived/30",
  },
  ready: {
    className: "bg-blue-100 text-blue-700 border-blue-200",
    label: "Sẵn sàng",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600 border-gray-200",
  };

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
    label: "Công khai",
    className:
      "bg-sensitivity_level-public/15 text-sensitivity_level-public border-sensitivity_level-public/30",
  },
  internal: {
    label: "Nội bộ",
    className:
      "bg-sensitivity_level-internal/15 text-sensitivity_level-internal border-sensitivity_level-internal/30",
  },
  confidential: {
    label: "Hạn chế",

    className:
      "bg-sensitivity_level-confidential/15 text-sensitivity_level-confidential border-sensitivity_level-confidential/30",
  },
  restricted: {
    label: "Mật",
    className:
      "bg-sensitivity_level-restricted/15 text-sensitivity_level-restricted border-sensitivity_level-restricted/30",
  },
  top_secret: {
    label: "Tuyệt mật",
    className:
      "bg-sensitivity_level-top_secret/15 text-sensitivity_level-top_secret border-sensitivity_level-top_secret/30",
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
