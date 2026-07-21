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
    className: "bg-gray-100 text-gray-600",
  },
  uploaded: {
    label: "Đã tải lên",
    className: "bg-yellow-100 text-yellow-700",
  },
  processing: {
    label: "Đang xử lý",
    className: "bg-purple-100 text-purple-700",
  },
  review: {
    label: "Đang xét duyệt",
    className: "bg-orange-100 text-orange-700",
  },
  approved: {
    label: "Đã duyệt",
    className: "bg-green-100 text-green-700",
  },
  archived: {
    label: "Đã lưu trữ",
    className: "bg-gray-100 text-gray-500",
  },
  ready: {
    label: "Sẵn sàng",
    className: "bg-blue-100 text-blue-700",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}

interface SensitivityLevelBadgeProps {
  level: number;
  className?: string;
}

const sensitivityLevelConfig = {
  1: { label: "Công khai", className: "bg-green-100 text-green-700" },
  2: { label: "Nội bộ",   className: "bg-blue-100 text-blue-700" },
  3: { label: "Hạn chế",  className: "bg-yellow-100 text-yellow-700" },
  4: { label: "Mật",      className: "bg-orange-100 text-orange-700" },
  5: { label: "Tuyệt mật",className: "bg-red-100 text-red-700" },
};

export function SensitivityLevelBadge({
  level,
  className,
}: SensitivityLevelBadgeProps) {
  const config = sensitivityLevelConfig[level];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
        config?.className ?? "bg-gray-100 text-gray-600",
        className,
      )}
    >
      {config?.label ?? level}
    </span>
  );
}
