import { useEffect, useMemo, useState } from "react";
import { Building2, Eye, EyeOff, FileText, Save, ShieldAlert, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { EntityActionSelect, ENTITY_ACTION_STYLES } from "@/components/documents/EntityActionSelect";
import { EntityScopePicker, type EntityScopeOption } from "@/components/documents/EntityScopePicker";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchOrgUnits,
  fetchOrgUnitInstances,
  fetchPositions,
  type OrgUnit,
  type OrgUnitInstance,
  type Position,
} from "@/services/org_units.api";
import type { EntityActionConfig, EntityAction } from "@/services/documents.api";
import {
  fetchEntityConfigurations,
  updateEntityConfiguration,
  type EntityConfiguration,
} from "@/services/entity-policy.api";

const ACTION_ICONS: Record<EntityAction, typeof Eye> = {
  block: ShieldAlert,
  full: Eye,
  mask: EyeOff,
};

export default function PolicyPage() {
  const { token } = useAuth();
  const [configurations, setConfigurations] = useState<EntityConfiguration[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [actions, setActions] = useState<EntityActionConfig[]>([]);
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [orgUnitInstances, setOrgUnitInstances] = useState<OrgUnitInstance[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => configurations.find((item) => item.document_version_id === selectedVersionId) ?? null,
    [configurations, selectedVersionId],
  );

  const unitOptions = useMemo<EntityScopeOption[]>(
    () => orgUnitInstances.map((instance) => ({
      id: instance.id,
      label: instance.name,
      description: orgUnits.find((unit) => unit.id === instance.ou_id)?.name,
    })),
    [orgUnitInstances, orgUnits],
  );

  const roleOptions = useMemo<EntityScopeOption[]>(
    () => positions.map((position) => ({
      id: position.id,
      label: position.name,
      description: orgUnits.find((unit) => unit.id === position.ou_id)?.name,
    })),
    [positions, orgUnits],
  );

  useEffect(() => {
    Promise.all([
      fetchEntityConfigurations(token),
      fetchOrgUnits(token),
      fetchOrgUnitInstances(token),
      fetchPositions(token),
    ])
      .then(([items, units, instances, availablePositions]) => {
        setConfigurations(items);
        setSelectedVersionId(items[0]?.document_version_id ?? "");
        setOrgUnits(units);
        setOrgUnitInstances(instances);
        setPositions(availablePositions);
      })
      .catch((error) => toast({
        variant: "destructive",
        title: "Không thể tải cấu hình thực thể",
        description: String(error),
      }))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!selected) {
      setActions([]);
      return;
    }
    setActions(selected.actions.map((item) => ({
      entity_type: item.entity_type,
      label: item.label,
      action: item.action,
      source: item.source,
      enabled: item.enabled,
      scope_oui_ids: item.scope_oui_ids ?? [],
      scope_position_ids: item.scope_position_ids ?? [],
    })));
  }, [selected]);

  const setAction = (entityType: string, action: EntityAction) => {
    setActions((current) => current.map((item) => item.entity_type === entityType ? { ...item, action } : item));
  };

  const setScope = (
    entityType: string,
    field: "scope_oui_ids" | "scope_position_ids",
    values: string[],
  ) => {
    setActions((current) => current.map((item) => item.entity_type === entityType ? { ...item, [field]: values } : item));
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await updateEntityConfiguration(selected.document_version_id, actions, token);
      setConfigurations((current) => current.map((item) => item.document_version_id === updated.document_version_id ? updated : item));
      toast({ variant: "success", title: "Đã lưu cấu hình thực thể" });
    } catch (error) {
      toast({ variant: "destructive", title: "Lưu cấu hình thất bại", description: String(error) });
    } finally {
      setSaving(false);
    }
  };

  const actionCounts = useMemo(() => ({
    block: actions.filter((item) => item.action === "block").length,
    mask: actions.filter((item) => item.action === "mask").length,
    full: actions.filter((item) => item.action === "full").length,
    scoped: actions.filter((item) => (item.scope_oui_ids?.length ?? 0) > 0 || (item.scope_position_ids?.length ?? 0) > 0).length,
  }), [actions]);

  return (
    <div className="enterprise-page flex h-full min-h-0 flex-col">
      <PageHeader
        title="Cấu hình quyền thực thể"
        description="Thiết lập hành động và phạm vi áp dụng theo từng thực thể trong mỗi phiên bản tài liệu."
      />
      <div className="page-scroll flex flex-1 flex-col gap-6 p-4 sm:p-6">
        <Alert className="border-primary/20 bg-primary/5">
          <SlidersHorizontal className="size-4" />
          <AlertTitle>Kiểm soát theo từng giá trị dữ liệu</AlertTitle>
          <AlertDescription>
            Rule tác động trên từng span thực thể. Bạn có thể giới hạn rule theo đơn vị và vai trò; để trống phạm vi sẽ áp dụng cho tất cả người dùng.
          </AlertDescription>
        </Alert>

        {loading ? (
          <Card><CardContent className="py-10 text-sm text-muted-foreground">Đang tải cấu hình...</CardContent></Card>
        ) : configurations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <FileText className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Chưa có phiên bản tài liệu</p>
                <p className="mt-1 text-sm text-muted-foreground">Các file đã được ingest sẽ xuất hiện tại đây.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              <Card><CardContent className="flex items-center gap-3 p-4"><FileText className="size-4 text-primary" /><div><p className="text-xl font-semibold">{actions.length}</p><p className="text-xs text-muted-foreground">Thực thể</p></div></CardContent></Card>
              <Card><CardContent className="flex items-center gap-3 p-4"><ShieldAlert className="size-4 text-destructive" /><div><p className="text-xl font-semibold">{actionCounts.block}</p><p className="text-xs text-muted-foreground">Chặn</p></div></CardContent></Card>
              <Card><CardContent className="flex items-center gap-3 p-4"><EyeOff className="size-4 text-warning" /><div><p className="text-xl font-semibold">{actionCounts.mask}</p><p className="text-xs text-muted-foreground">Che</p></div></CardContent></Card>
              <Card><CardContent className="flex items-center gap-3 p-4"><Building2 className="size-4 text-info" /><div><p className="text-xl font-semibold">{actionCounts.scoped}</p><p className="text-xs text-muted-foreground">Có phạm vi</p></div></CardContent></Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-[290px_minmax(0,1fr)]">
              <Card className="h-fit">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Phiên bản tài liệu</CardTitle>
                  <CardDescription>Chọn file cần cấu hình.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {configurations.map((item) => (
                    <Button
                      key={item.document_version_id}
                      variant={selectedVersionId === item.document_version_id ? "secondary" : "ghost"}
                      className="h-auto justify-start px-3 py-2.5 text-left"
                      onClick={() => setSelectedVersionId(item.document_version_id)}
                    >
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="truncate text-sm font-medium">{item.document_title}</span>
                        <span className="truncate text-[11px] text-muted-foreground">v{item.version_no} · {item.file_name}</span>
                      </span>
                    </Button>
                  ))}
                </CardContent>
                <CardFooter className="border-t px-4 py-3 text-xs text-muted-foreground">
                  {configurations.length} phiên bản đang được quản lý
                </CardFooter>
              </Card>

              {selected && (
                <Card>
                  <CardHeader className="flex-row items-start justify-between gap-4 border-b space-y-0">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">{selected.document_title}</CardTitle>
                      <CardDescription className="mt-1 truncate">{selected.file_name} · phiên bản {selected.version_no}</CardDescription>
                    </div>
                    <Button onClick={save} disabled={saving} className="shrink-0">
                      <Save data-icon="inline-start" />
                      {saving ? "Đang lưu..." : "Lưu cấu hình"}
                    </Button>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 pt-5">
                    {actions.length === 0 ? (
                      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Không có entity được detect trong file này.</p>
                    ) : actions.map((item) => {
                      const Icon = ACTION_ICONS[item.action];
                      return (
                        <div key={item.entity_type} className="rounded-xl border bg-muted/20 p-4">
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                              <div className={"flex size-9 shrink-0 items-center justify-center rounded-lg " + ENTITY_ACTION_STYLES[item.action].trigger}>
                                <Icon className={"size-4 " + ENTITY_ACTION_STYLES[item.action].icon} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline" className="font-mono text-[11px]">{item.entity_type}</Badge>
                                  <span className="text-xs text-muted-foreground">{selected.actions.find((action) => action.entity_type === item.entity_type)?.detection_count ?? 0} lần phát hiện</span>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">Chọn hành động và đối tượng được áp dụng rule.</p>
                              </div>
                              <EntityActionSelect
                                value={item.action}
                                onValueChange={(value) => setAction(item.entity_type, value)}
                                className="w-full sm:w-[210px] sm:shrink-0"
                              />
                            </div>
                            <div className="rounded-lg border border-dashed bg-background/70 p-3">
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <span className="text-xs font-medium">Phạm vi áp dụng</span>
                                <span className="text-[10px] text-muted-foreground">Để trống để áp dụng toàn hệ thống</span>
                              </div>
                              <EntityScopePicker
                                unitOptions={unitOptions}
                                roleOptions={roleOptions}
                                scopeOuiIds={item.scope_oui_ids ?? []}
                                scopePositionIds={item.scope_position_ids ?? []}
                                onScopeOuiIdsChange={(values) => setScope(item.entity_type, "scope_oui_ids", values)}
                                onScopePositionIdsChange={(values) => setScope(item.entity_type, "scope_position_ids", values)}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
