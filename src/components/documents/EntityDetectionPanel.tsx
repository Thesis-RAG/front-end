import { AlertCircle, Check, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EntityActionSelect, ENTITY_ACTION_STYLES } from "@/components/documents/EntityActionSelect";
import { EntityScopePicker, type EntityScopeOption } from "@/components/documents/EntityScopePicker";
import type { EntityAction, EntityActionConfig, EntityPreview } from "@/services/documents.api";

const actionIcons: Record<EntityAction, typeof Check> = {
  block: ShieldAlert,
  full: Eye,
  mask: EyeOff,
};

export function EntityDetectionPanel({
  preview,
  actions,
  onChange,
  loading = false,
  unitOptions = [],
  roleOptions = [],
}: {
  preview: EntityPreview | null;
  actions: EntityActionConfig[];
  onChange: (actions: EntityActionConfig[]) => void;
  loading?: boolean;
  unitOptions?: EntityScopeOption[];
  roleOptions?: EntityScopeOption[];
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-5 text-sm text-muted-foreground">
          <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Đang phân tích thực thể trong toàn văn bản...
        </CardContent>
      </Card>
    );
  }

  if (!preview) return null;

  const counts = preview.entities.reduce<Record<string, number>>((result, entity) => {
    result[entity.label] = (result[entity.label] ?? 0) + 1;
    return result;
  }, {});

  const setAction = (entityType: string, action: EntityAction) => {
    const existing = actions.find((item) => item.entity_type === entityType);
    if (existing) {
      onChange(actions.map((item) => item.entity_type === entityType ? { ...item, action } : item));
      return;
    }
    onChange([...actions, {
      entity_type: entityType,
      label: entityType,
      action,
      source: "gliner",
      enabled: true,
      scope_oui_ids: [],
      scope_position_ids: [],
    }]);
  };

  const setScope = (
    entityType: string,
    field: "scope_oui_ids" | "scope_position_ids",
    values: string[],
  ) => {
    onChange(actions.map((item) => item.entity_type === entityType ? { ...item, [field]: values } : item));
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Phát hiện và cấu hình thực thể</CardTitle>
        <CardDescription>
          GLiNER quét toàn bộ nội dung. Hành động được áp dụng trên từng span thực thể, có thể giới hạn theo đơn vị và vai trò.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {preview.entity_types.length === 0 ? (
          <Alert>
            <AlertCircle className="size-4" />
            <AlertTitle>Không phát hiện thực thể</AlertTitle>
            <AlertDescription>File vẫn có thể được upload và cấu hình lại sau.</AlertDescription>
          </Alert>
        ) : (
          <div className="flex flex-col gap-2">
            {preview.entity_types.map((entityType) => {
              const config = actions.find((item) => item.entity_type === entityType);
              const action = config?.action ?? "full";
              const Icon = actionIcons[action];
              return (
                <div key={entityType} className="rounded-xl border bg-muted/20 p-3.5">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <Icon className={cn("size-4 shrink-0", ENTITY_ACTION_STYLES[action].icon)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold">{entityType}</span>
                          <Badge variant="secondary" className="text-[10px]">{counts[entityType] ?? 0} lần phát hiện</Badge>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {preview.entities.filter((entity) => entity.label === entityType).slice(0, 3).map((entity) => entity.text).join(" · ")}
                        </p>
                      </div>
                      <EntityActionSelect
                        value={action}
                        onValueChange={(value) => setAction(entityType, value)}
                        className="w-full sm:w-[190px] sm:shrink-0"
                      />
                    </div>
                    <div className="rounded-lg border border-dashed bg-background/70 p-2.5">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-foreground">Phạm vi áp dụng</span>
                        <span className="text-[10px] text-muted-foreground">Bỏ trống = tất cả</span>
                      </div>
                      <EntityScopePicker
                        unitOptions={unitOptions}
                        roleOptions={roleOptions}
                        scopeOuiIds={config?.scope_oui_ids ?? []}
                        scopePositionIds={config?.scope_position_ids ?? []}
                        onScopeOuiIdsChange={(values) => setScope(entityType, "scope_oui_ids", values)}
                        onScopePositionIdsChange={(values) => setScope(entityType, "scope_position_ids", values)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          <strong>Chặn</strong> sẽ khóa citation chứa entity và yêu cầu quyền xem; <strong>Che</strong> chỉ thay thế đúng span thực thể.
        </p>
      </CardContent>
    </Card>
  );
}
