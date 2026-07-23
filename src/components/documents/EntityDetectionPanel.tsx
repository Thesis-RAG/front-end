import { AlertCircle, Check, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ENTITY_ACTION_STYLES } from "@/components/documents/EntityActionSelect";
import { cn } from "@/lib/utils";
import type { EntityActionConfig, EntityPreview, EntityAction } from "@/services/documents.api";

const actionIcons: Record<EntityAction, typeof Check> = {
  block: ShieldAlert,
  full: Eye,
  mask: EyeOff,
};

/** Read-only preview. Policy changes belong in the centralized Rules screen. */
export function EntityDetectionPanel({
  preview,
  loading = false,
}: {
  preview: EntityPreview | null;
  actions?: EntityActionConfig[];
  onChange?: (actions: EntityActionConfig[]) => void;
  loading?: boolean;
  unitOptions?: unknown[];
  roleOptions?: unknown[];
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-5 text-sm text-muted-foreground">
          <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Đang phân tích toàn bộ tài liệu...
        </CardContent>
      </Card>
    );
  }

  if (!preview) return null;

  const counts = preview.entities.reduce<Record<string, number>>((result, entity) => {
    result[entity.label] = (result[entity.label] ?? 0) + 1;
    return result;
  }, {});

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Kết quả phát hiện và rule áp dụng</CardTitle>
        <CardDescription>
          {preview.policy_profile} · {preview.policy_version}. Action được resolve tự động từ màn hình Rules.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{preview.confirmed_labels.length} label</Badge>
          <Badge variant="outline">Block: {preview.action_summary.block ?? 0}</Badge>
          <Badge variant="outline">Mask: {preview.action_summary.mask ?? 0}</Badge>
          <Badge variant="outline">Full: {preview.action_summary.full ?? 0}</Badge>
        </div>
        {preview.entity_types.length === 0 ? (
          <Alert>
            <AlertCircle className="size-4" />
            <AlertTitle>Không phát hiện entity</AlertTitle>
            <AlertDescription>Tài liệu vẫn có thể được upload và xử lý bình thường.</AlertDescription>
          </Alert>
        ) : (
          <div className="flex flex-col gap-2">
            {preview.entity_types.map((entityType) => {
              const rule = preview.applied_rules.find((item) => item.entity_key === entityType);
              const action = rule?.action ?? "full";
              const Icon = actionIcons[action];
              return (
                <div key={entityType} className="rounded-xl border bg-muted/20 p-3.5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Icon className={cn("size-4 shrink-0", ENTITY_ACTION_STYLES[action].icon)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold">{rule?.display_name ?? entityType}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {counts[entityType] ?? 0} lần phát hiện
                        </Badge>
                        <Badge variant={action === "block" ? "destructive" : "outline"} className="text-[10px]">
                          {action.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {preview.entities.filter((entity) => entity.label === entityType).slice(0, 3).map((entity) => entity.text).join(" · ")}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          Preview chỉ để xem kết quả. Thay đổi entity/action/scope trong màn hình Rules.
        </p>
      </CardContent>
    </Card>
  );
}
