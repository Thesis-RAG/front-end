/**
 * PolicyPage: manage policy domains, entity types, and domain rules.
 * Split into components under src/components/policy/ to keep this file concise.
 */
import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, ListChecks, FolderOpen, Package } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type {
  CreateRulePayload,
  DomainRule,
  EntityTypeItem,
  PolicyDomain,
  PolicyDomainSummary,
} from "@/types/policy";
import {
  fetchDomains,
  fetchDomain,
  updateDomain,
  deleteDomain,
  suggestEntityTypes,
  addEntityType,
  deleteEntityType,
  fetchDomainRules,
  createDomainRule,
  updateRule,
  deleteRule,
} from "@/services/policy.api";
import { fetchOrgUnits, fetchPositions } from "@/services/org_units.api";
import { DomainList } from "@/components/policy/DomainList";
import { DomainDetail } from "@/components/policy/DomainDetail";
import { DomainRulesTab } from "@/components/policy/DomainRulesTab";
import { CreateDomainDialog } from "@/components/policy/CreateDomainDialog";
import { AddEntityDialog } from "@/components/policy/AddEntityDialog";

export default function PolicyPage() {
  const { token } = useAuth();

  // ── Domain list ───────────────────────────────────────────────────────────
  const [domains, setDomains] = useState<PolicyDomainSummary[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(false);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<PolicyDomain | null>(null);
  const [domainDetailLoading, setDomainDetailLoading] = useState(false);

  // ── Dialog open flags ─────────────────────────────────────────────────────
  const [createDomainOpen, setCreateDomainOpen] = useState(false);
  const [addEntityOpen, setAddEntityOpen] = useState(false);

  // ── Locked roles: positions of OU "Công ty" always included in every rule ──
  const [lockedRoles, setLockedRoles] = useState<string[]>([]);

  useEffect(() => {
    if (!token) return;
    Promise.all([fetchOrgUnits(token), fetchPositions(token)])
      .then(([ous, pos]) => {
        const companyOu = ous.find((o) => o.parent_id === null);
        if (!companyOu) return;
        const names = pos
          .filter((p) => p.ou_id === companyOu.id)
          .map((p) => p.name);
        setLockedRoles(names);
      })
      .catch(() => {});
  }, [token]);

  // ── Active tab ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("domains");

  // ── Rules ─────────────────────────────────────────────────────────────────
  const [domainRules, setDomainRules] = useState<DomainRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesDomainId, setRulesDomainId] = useState<string>("");

  // ── Load domains ──────────────────────────────────────────────────────────
  const loadDomains = useCallback(async () => {
    if (!token) return;
    setDomainsLoading(true);
    try {
      const data = await fetchDomains(token);
      setDomains(data);
    } catch (err) {
      toast({
        title: "Lỗi tải domains",
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setDomainsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadDomains();
  }, [loadDomains]);

  // ── Load domain detail when selection changes ─────────────────────────────
  useEffect(() => {
    if (!token || !selectedDomainId) {
      setSelectedDomain(null);
      return;
    }
    setDomainDetailLoading(true);
    fetchDomain(token, selectedDomainId)
      .then(setSelectedDomain)
      .catch((err) =>
        toast({ title: "Lỗi", description: String(err), variant: "destructive" }),
      )
      .finally(() => setDomainDetailLoading(false));
  }, [token, selectedDomainId]);

  // ── Load domain rules when the Tab 2 selection changes ───────────────────
  useEffect(() => {
    if (!token || !rulesDomainId) {
      setDomainRules([]);
      return;
    }
    setRulesLoading(true);
    fetchDomainRules(token, rulesDomainId)
      .then(setDomainRules)
      .catch(() => {})
      .finally(() => setRulesLoading(false));
  }, [token, rulesDomainId]);

  // ── Domain handlers ───────────────────────────────────────────────────────
  async function handleToggleDomain(domain: PolicyDomainSummary) {
    if (!token) return;
    try {
      await updateDomain(token, domain.id, { is_active: !domain.is_active });
      await loadDomains();
      if (selectedDomainId === domain.id) {
        const updated = await fetchDomain(token, domain.id);
        setSelectedDomain(updated);
      }
    } catch (err) {
      toast({ title: "Lỗi", description: String(err), variant: "destructive" });
    }
  }

  async function handleDeleteDomain(domain: PolicyDomainSummary) {
    if (!token) return;
    if (
      !confirm(
        `Xóa domain "${domain.name}"? Tất cả rules và entity types sẽ bị xóa theo.`,
      )
    )
      return;
    try {
      await deleteDomain(token, domain.id);
      toast({ title: "Đã xóa domain", description: domain.name });
      if (selectedDomainId === domain.id) setSelectedDomainId(null);
      await loadDomains();
    } catch (err) {
      toast({ title: "Lỗi xóa", description: String(err), variant: "destructive" });
    }
  }

  async function handleDeleteEntityType(et: EntityTypeItem) {
    if (!token || !selectedDomainId) return;
    try {
      await deleteEntityType(token, selectedDomainId, et.id);
      const updated = await fetchDomain(token, selectedDomainId);
      setSelectedDomain(updated);
    } catch (err) {
      toast({
        title: "Lỗi xóa entity type",
        description: String(err),
        variant: "destructive",
      });
    }
  }

  async function handleSuggestForExisting() {
    if (!token || !selectedDomain) return;
    try {
      const res = await suggestEntityTypes(
        token,
        selectedDomain.name,
        selectedDomain.description ?? undefined,
      );
      const newItems = res.entity_types.filter(
        (s) =>
          !selectedDomain.entity_types.some(
            (e) => e.entity_type === s.entity_type,
          ),
      );
      if (newItems.length === 0) {
        toast({
          title: "Không có gợi ý mới",
          description: "Tất cả entity types đã có trong domain.",
        });
        return;
      }
      await addEntityType(token, selectedDomain.id, {
        entity_type: newItems[0].entity_type,
      });
      // Bulk-add remaining suggestions.
      if (newItems.length > 1) {
        const { addEntityTypesBulk } = await import("@/services/policy.api");
        await addEntityTypesBulk(token, selectedDomain.id, newItems.slice(1));
      }
      toast({
        title: "Đã thêm gợi ý LLM",
        description: `${newItems.length} entity type(s) mới.`,
      });
      const updated = await fetchDomain(token, selectedDomain.id);
      setSelectedDomain(updated);
    } catch (err) {
      toast({ title: "Lỗi gợi ý", description: String(err), variant: "destructive" });
    }
  }

  // ── Domain rules handlers ─────────────────────────────────────────────────
  async function handleCreateDomainRule(payload: CreateRulePayload) {
    if (!token || !rulesDomainId) return;
    const rule = await createDomainRule(token, rulesDomainId, payload);
    setDomainRules((prev) => [...prev, rule]);
    toast({ title: "Đã tạo rule", description: rule.name });
  }
  async function handleUpdateDomainRule(ruleId: string, payload: CreateRulePayload) {
    if (!token) return;
    const rule = await updateRule(token, ruleId, payload);
    setDomainRules((prev) => prev.map((r) => (r.id === ruleId ? rule : r)));
    toast({ title: "Đã cập nhật rule", description: rule.name });
  }
  async function handleDeleteDomainRule(ruleId: string) {
    if (!token) return;
    await deleteRule(token, ruleId);
    setDomainRules((prev) => prev.filter((r) => r.id !== ruleId));
    toast({ title: "Đã xóa luật" });
  }
  async function handleToggleDomainRule(ruleId: string, active: boolean) {
    if (!token) return;
    const rule = await updateRule(token, ruleId, { is_active: active });
    setDomainRules((prev) => prev.map((r) => (r.id === ruleId ? rule : r)));
    toast({ title: active ? "Rule đã bật" : "Rule đã tắt", description: rule.name });
  }

  const totalEntities = domains.reduce((s, d) => s + d.entity_type_count, 0);
  const totalDomainRules = domains.reduce((s, d) => s + d.rule_count, 0);


  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Cấu hình phân quyền"
        description="Quản lý miền, loại thực thể và luật cho Policy-Contract Agent."
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-thin">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col overflow-visible">
          {/* Tab nav bar — at top */}
          <div className="border-b border-border px-6 shrink-0">
            <TabsList className="mt-2">
              <TabsTrigger value="domains" className="gap-2 text-[12.5px]">
                <ShieldCheck className="h-4 w-4" /> Miền
              </TabsTrigger>
              <TabsTrigger value="rules" className="gap-2 text-[12.5px]">
                <ListChecks className="h-4 w-4" /> Luật theo miền
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Stat cards — domains tab only ── */}
          {activeTab !== "rules" && (
            <div className="grid grid-cols-1 gap-4 px-6 pt-4 pb-2 shrink-0 sm:grid-cols-3">
              {[
                { label: "Tổng miền dữ liệu",   value: domains.length,   icon: FolderOpen, bg: "bg-blue-50 dark:bg-blue-950/40",   iconCls: "text-blue-600"   },
                { label: "Tổng thực thể",         value: totalEntities,    icon: Package,    bg: "bg-green-50 dark:bg-green-950/40",  iconCls: "text-green-600"  },
                { label: "Tổng luật theo miền",   value: totalDomainRules, icon: ListChecks, bg: "bg-purple-50 dark:bg-purple-950/40",iconCls: "text-purple-600" },
              ].map(({ label, value, icon: Icon, bg, iconCls }) => (
                <div key={label} className="rounded-xl border border-border bg-card p-5 flex items-start gap-4 shadow-sm">
                  <div className={`h-11 w-11 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-5 w-5 ${iconCls}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] text-muted-foreground font-medium">{label}</p>
                    <p className="text-2xl font-bold text-foreground mt-0.5">
                      {domainsLoading ? "—" : value.toLocaleString("vi-VN")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Tab 1: Domains ───────────────────────────────────────────── */}
          <TabsContent
            value="domains"
            className="mt-0 flex min-h-[520px] flex-1 flex-col overflow-hidden md:min-h-[560px]"
            style={{ display: activeTab === "domains" ? "flex" : "none" }}
          >
            <div
              className="flex min-h-0 flex-1 gap-5 px-6 pt-4 pb-6"
              style={{ display: activeTab === "domains" ? "flex" : "none" }}
            >
              <DomainList
                domains={domains}
                loading={domainsLoading}
                selectedDomainId={selectedDomainId}
                onSelectDomain={setSelectedDomainId}
                onCreateClick={() => setCreateDomainOpen(true)}
              />
              <DomainDetail
                selectedDomainId={selectedDomainId}
                selectedDomain={selectedDomain}
                loading={domainDetailLoading}
                domains={domains}
                onToggleDomain={handleToggleDomain}
                onDeleteDomain={handleDeleteDomain}
                onDeleteEntityType={handleDeleteEntityType}
                onSuggestForExisting={handleSuggestForExisting}
                onAddEntityClick={() => setAddEntityOpen(true)}
              />
            </div>
          </TabsContent>

          {/* ── Tab 2: Rules by domain ────────────────────────────────────── */}
          <TabsContent
            value="rules"
            className="mt-0 flex min-h-[520px] flex-1 flex-col overflow-hidden md:min-h-[560px]"
            style={{ display: activeTab === "rules" ? "flex" : "none" }}
          >
            <div
              className="flex min-h-0 flex-1"
              style={{ display: activeTab === "rules" ? "flex" : "none" }}
            >
              <DomainRulesTab
                domains={domains}
                rulesDomainId={rulesDomainId}
                setRulesDomainId={setRulesDomainId}
                domainRules={domainRules}
                rulesLoading={rulesLoading}
                selectedDomain={selectedDomain}
                onCreateRule={handleCreateDomainRule}
                onUpdateRule={handleUpdateDomainRule}
                onDeleteRule={handleDeleteDomainRule}
                onToggleRule={handleToggleDomainRule}
                lockedRoles={lockedRoles}
              />
            </div>
          </TabsContent>

        </Tabs>
      </div>

      <CreateDomainDialog
        open={createDomainOpen}
        onClose={() => setCreateDomainOpen(false)}
        token={token}
        onCreated={async (domain) => {
          await loadDomains();
          setSelectedDomainId(domain.id);
        }}
      />

      <AddEntityDialog
        open={addEntityOpen}
        onClose={() => setAddEntityOpen(false)}
        selectedDomainId={selectedDomainId}
        token={token}
        onAdded={setSelectedDomain}
      />
    </div>
  );
}
