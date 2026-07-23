import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EntityScopePicker, type EntityScopeOption } from "@/components/documents/EntityScopePicker";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { fetchOrgUnits, fetchOrgUnitInstances, fetchPositions, type OrgUnit, type OrgUnitInstance, type Position } from "@/services/org_units.api";
import {
  createPolicyRule,
  deletePolicyRule,
  fetchPolicyRules,
  type PolicyRule,
  type PolicyRulePayload,
  updatePolicyRule,
} from "@/services/entity-policy.api";

const EMPTY_FORM: PolicyRulePayload = {
  entity_key: "",
  display_name: "",
  group_name: "general",
  detection_source: "manual",
  action: "mask",
  enabled: true,
  scope_oui_ids: [],
  scope_position_ids: [],
  priority: 100,
  metadata_json: {},
};

const ACTION_LABELS = { block: "Block", mask: "Mask", full: "Full" } as const;

export default function PolicyPage() {
  const { token } = useAuth();
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [form, setForm] = useState<PolicyRulePayload>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [orgUnitInstances, setOrgUnitInstances] = useState<OrgUnitInstance[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  useEffect(() => {
    Promise.all([
      fetchPolicyRules(token),
      fetchOrgUnits(token),
      fetchOrgUnitInstances(token),
      fetchPositions(token),
    ])
      .then(([loadedRules, units, instances, availablePositions]) => {
        setRules(loadedRules);
        setOrgUnits(units);
        setOrgUnitInstances(instances);
        setPositions(availablePositions);
      })
      .catch((error) => toast({ variant: "destructive", title: "Không thể tải Rules", description: String(error) }))
      .finally(() => setLoading(false));
  }, [token]);

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

  const updateForm = <K extends keyof PolicyRulePayload>(key: K, value: PolicyRulePayload[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const edit = (rule: PolicyRule) => {
    setEditingId(rule.id);
    setForm({
      entity_key: rule.entity_key,
      display_name: rule.display_name,
      group_name: rule.group_name,
      detection_source: rule.detection_source,
      action: rule.action,
      enabled: rule.enabled,
      scope_oui_ids: rule.scope_oui_ids ?? [],
      scope_position_ids: rule.scope_position_ids ?? [],
      priority: rule.priority,
      metadata_json: rule.metadata_json ?? {},
    });
  };

  const reset = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const save = async () => {
    if (!form.entity_key.trim() || !form.display_name.trim()) {
      toast({ variant: "destructive", title: "Thiếu thông tin", description: "Entity key và tên hiển thị là bắt buộc." });
      return;
    }
    setSaving(true);
    try {
      const saved = editingId
        ? await updatePolicyRule(editingId, form, token)
        : await createPolicyRule(form, token);
      setRules((current) => editingId
        ? current.map((rule) => rule.id === saved.id ? saved : rule)
        : [...current, saved].sort((a, b) => a.priority - b.priority || a.entity_key.localeCompare(b.entity_key)));
      toast({ variant: "success", title: editingId ? "Đã cập nhật rule" : "Đã thêm rule" });
      reset();
    } catch (error) {
      toast({ variant: "destructive", title: "Lưu rule thất bại", description: String(error) });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (rule: PolicyRule) => {
    if (!window.confirm(`Xóa rule ${rule.entity_key}? Tài liệu cũ vẫn giữ snapshot.`)) return;
    try {
      await deletePolicyRule(rule.id, token);
      setRules((current) => current.filter((item) => item.id !== rule.id));
      if (editingId === rule.id) reset();
      toast({ variant: "success", title: "Đã xóa rule" });
    } catch (error) {
      toast({ variant: "destructive", title: "Xóa rule thất bại", description: String(error) });
    }
  };

  return (
    <div className="enterprise-page flex h-full min-h-0 flex-col">
      <PageHeader
        title="Rules"
        description="Quản lý tập trung label, action và phạm vi áp dụng cho các tài liệu upload sau này."
        actions={(
          <Button onClick={reset}>
            <Plus data-icon="inline-start" /> Thêm label
          </Button>
        )}
      />
      <div className="page-scroll flex flex-1 flex-col gap-6 p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4" /> Enterprise Secure</CardTitle>
            <CardDescription>
              Rule active là nguồn label duy nhất cho detection. Thay đổi chỉ áp dụng cho version upload mới; reprocess tài liệu cũ khi cần.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <p className="py-8 text-sm text-muted-foreground">Đang tải Rules...</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity key</TableHead>
                    <TableHead>Tên / nhóm</TableHead>
                    <TableHead>Detection</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Enabled</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-mono text-xs">{rule.entity_key}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{rule.display_name}</span>
                          <Badge variant="secondary" className="w-fit text-[10px]">{rule.group_name}</Badge>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{rule.detection_source}</Badge></TableCell>
                      <TableCell><Badge variant={rule.action === "block" ? "destructive" : "outline"}>{ACTION_LABELS[rule.action]}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {rule.scope_oui_ids.length || rule.scope_position_ids.length ? `${rule.scope_oui_ids.length + rule.scope_position_ids.length} scope` : "Toàn hệ thống"}
                      </TableCell>
                      <TableCell><Switch checked={rule.enabled} disabled aria-label={`${rule.entity_key} enabled`} /></TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => edit(rule)} aria-label={`Sửa ${rule.entity_key}`}><Pencil data-icon="inline-start" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => remove(rule)} aria-label={`Xóa ${rule.entity_key}`}><Trash2 data-icon="inline-start" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <CardFooter className="border-t text-xs text-muted-foreground">{rules.length} rule trong profile mặc định</CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editingId ? "Chỉnh sửa rule" : "Thêm label thủ công"}</CardTitle>
            <CardDescription>Label mới sẽ có hiệu lực cho các lần detect tiếp theo sau khi lưu.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-2"><Label htmlFor="entity-key">Entity key</Label><Input id="entity-key" value={form.entity_key} onChange={(event) => updateForm("entity_key", event.target.value)} placeholder="bonus" /></div>
              <div className="grid gap-2"><Label htmlFor="display-name">Tên hiển thị</Label><Input id="display-name" value={form.display_name} onChange={(event) => updateForm("display_name", event.target.value)} placeholder="Tiền thưởng" /></div>
              <div className="grid gap-2"><Label>Nhóm</Label><Input value={form.group_name} onChange={(event) => updateForm("group_name", event.target.value)} placeholder="hr_financial" /></div>
              <div className="grid gap-2"><Label>Priority</Label><Input type="number" min={0} value={form.priority} onChange={(event) => updateForm("priority", Number(event.target.value) || 0)} /></div>
              <div className="grid gap-2"><Label>Detection source</Label><Select value={form.detection_source} onValueChange={(value) => updateForm("detection_source", value as PolicyRulePayload["detection_source"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="gliner">GLiNER</SelectItem><SelectItem value="regex">Regex</SelectItem><SelectItem value="manual">Manual</SelectItem></SelectGroup></SelectContent></Select></div>
              <div className="grid gap-2"><Label>Action</Label><Select value={form.action} onValueChange={(value) => updateForm("action", value as PolicyRulePayload["action"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="block">Block</SelectItem><SelectItem value="mask">Mask</SelectItem><SelectItem value="full">Full</SelectItem></SelectGroup></SelectContent></Select></div>
              <div className="flex items-center gap-3 pt-7"><Switch checked={form.enabled} onCheckedChange={(checked) => updateForm("enabled", checked)} id="rule-enabled" /><Label htmlFor="rule-enabled">Enabled</Label></div>
            </div>
            <div className="rounded-lg border border-dashed p-3">
              <EntityScopePicker
                unitOptions={unitOptions}
                roleOptions={roleOptions}
                scopeOuiIds={form.scope_oui_ids}
                scopePositionIds={form.scope_position_ids}
                onScopeOuiIdsChange={(value) => updateForm("scope_oui_ids", value)}
                onScopePositionIdsChange={(value) => updateForm("scope_position_ids", value)}
              />
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2 border-t">
            {editingId && <Button variant="outline" onClick={reset}>Hủy</Button>}
            <Button onClick={save} disabled={saving}>
              <Save data-icon="inline-start" /> {saving ? "Đang lưu..." : "Lưu rule"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
