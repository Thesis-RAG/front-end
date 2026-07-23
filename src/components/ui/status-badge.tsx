import { cn } from "@/lib/utils";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { DocumentStatus } from "@/types";

interface StatusBadgeProps {
  status: DocumentStatus;
  className?: string;
}

const statusConfig: Record<
  DocumentStatus,
  { label: string; variant: BadgeProps["variant"] }
> = {
  draft: {
    label: "Bản nháp",
    variant: "secondary",
  },
  uploaded: {
    label: "Đã tải lên",
    variant: "warning",
  },
  processing: {
    label: "Đang xử lý",
    variant: "info",
  },
  review: {
    label: "Đang xét duyệt",
    variant: "warning",
  },
  approved: {
    label: "Đã duyệt",
    variant: "success",
  },
  archived: {
    label: "Đã lưu trữ",
    variant: "outline",
  },
  ready: {
    label: "Sẵn sàng",
    variant: "info",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    variant: "secondary" as const,
  };

  return (
    <Badge variant={config.variant} className={cn("font-medium", className)}>
      {config.label}
    </Badge>
  );
}

interface SensitivityLevelBadgeProps {
  level: number;
  className?: string;
}

const sensitivityLevelConfig = {
  1: { label: "Công khai", variant: "success" as const },
  2: { label: "Nội bộ", variant: "info" as const },
  3: { label: "Hạn chế", variant: "warning" as const },
  4: { label: "Mật", variant: "warning" as const },
  5: { label: "Tuyệt mật", variant: "destructive" as const },
};

export function SensitivityLevelBadge({
  level,
  className,
}: SensitivityLevelBadgeProps) {
  const config = sensitivityLevelConfig[level];

  return (
    <Badge
      variant={config?.variant ?? "secondary"}
      className={cn("font-medium", className)}
    >
      {config?.label ?? level}
    </Badge>
  );
}
