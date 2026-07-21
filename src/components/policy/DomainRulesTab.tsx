/** Tab Luật theo miền: 3-column layout — domain sidebar | rule list | rule detail. */
import { useState, useMemo, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import {
  Search, Plus, ShieldCheck, Loader2, Database, Lock,
  MoreHorizontal, ShieldX, Settings2, Fingerprint, Trash2, Copy,
  LayoutList, Shield, List, Activity, Power, Zap,
  ChevronRight, Users, Pause, Play, X,
  Info, BarChart2, Download, ArrowLeftRight, FileText, EyeOff, MessageSquare,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  SelectGroup, SelectLabel,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  CreateRulePayload, DomainRule, EntityTypeItem,
  PolicyDomain, PolicyDomainSummary, RuleConditions, RuleContract,
} from "@/types/policy";
import { SensitivityBadge } from "./SensitivityBadge";
import { RuleDialog } from "./RuleDialog";
import {
  initialFormFromRule, type RuleFormState,
  VIOLATION_ACTION_GROUPS, VIOLATION_ACTION_COLOR, VIOLATION_ACTION_OPTIONS,
  MAX_DETAIL_OPTIONS, NUMERIC_OPTIONS, VALID_MAX_DETAIL,
  DEFAULT_INTENT_OPTIONS, INTENT_LABEL, SENSITIVITY_OPTIONS, SENSITIVITY_VI,
  USER_LEVEL_OPTIONS, csvToArray, arrayToCsv,
} from "./constants";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { fetchPositions } from "@/services/org_units.api";

// ── Violation action display ──────────────────────────────────────────────────
const ACTION_STYLE: Record<string, { bg: string; iconCls: string; Icon: React.ElementType }> = {
  block:       { bg: "bg-red-100",    iconCls: "text-red-600",    Icon: ShieldX },
  conditional: { bg: "bg-purple-100", iconCls: "text-purple-600", Icon: Settings2 },
  watermark:   { bg: "bg-blue-100",   iconCls: "text-blue-600",   Icon: Fingerprint },
  allow:       { bg: "bg-green-100",  iconCls: "text-green-600",  Icon: ShieldCheck },
};
const DEFAULT_ACTION_STYLE = { bg: "bg-gray-100", iconCls: "text-gray-500", Icon: Shield };

const VIOLATION_LABEL: Record<string, string> = {
  block: "Chặn hoàn toàn", conditional: "Áp dụng điều kiện",
  watermark: "Cho phép với watermark", allow: "Cho phép tất cả",
};

const ACTION_DESC: Record<string, string> = {
  block: "Ngăn không cho hiển thị dữ liệu",
  conditional: "Lọc và biến đổi nội dung trả về",
  watermark: "Cho phép nhưng thêm dấu watermark",
  allow: "Trả về dữ liệu đầy đủ",
};

const LLM_RESULT: Record<string, string> = {
  block: "Không trả về dữ liệu",
  conditional: "Trả về dữ liệu đã lọc",
  watermark: "Trả về có watermark",
  allow: "Trả về đầy đủ",
};

const DOMAIN_COLORS = [
  { bg: "bg-blue-100",   iconCls: "text-blue-600"   },
  { bg: "bg-green-100",  iconCls: "text-green-600"  },
  { bg: "bg-purple-100", iconCls: "text-purple-600" },
  { bg: "bg-orange-100", iconCls: "text-orange-500" },
  { bg: "bg-rose-100",   iconCls: "text-rose-600"   },
];

const PAGE_SIZE = 10;

// ── Props ─────────────────────────────────────────────────────────────────────
interface DomainRulesTabProps {
  domains: PolicyDomainSummary[];
  rulesDomainId: string;
  setRulesDomainId: (id: string) => void;
  domainRules: DomainRule[];
  rulesLoading: boolean;
  selectedDomain: PolicyDomain | null;
  onCreateRule: (payload: CreateRulePayload) => Promise<void>;
  onUpdateRule: (ruleId: string, payload: CreateRulePayload) => Promise<void>;
  onDeleteRule: (ruleId: string) => Promise<void>;
  onToggleRule: (ruleId: string, active: boolean) => Promise<void>;
  lockedRoles?: string[];
}

// ── Position suggestions ──────────────────────────────────────────────────────
const POSITION_SUGGESTIONS = [
  "Chủ tịch", "Giám đốc", "Phó giám đốc", "Tổng giám đốc",
  "Giám đốc điều hành", "Giám đốc tài chính", "Giám đốc kỹ thuật",
  "Trưởng phòng", "Phó phòng", "Trưởng nhóm",
  "Admin", "Quản trị viên", "Nhân viên", "Chuyên viên",
  "Kế toán", "Kỹ sư", "Lập trình viên", "Kiểm thử viên",
  "Tư vấn", "Thực tập sinh", "Khách", "Đối tác",
];

// ── Role tag input with autocomplete ─────────────────────────────────────────
function RoleTagInput({
  value, onChange, lockedValues = [], placeholder, suggestions,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  lockedValues?: string[];
  placeholder?: string;
  suggestions: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const extras = value.filter(r => !lockedValues.includes(r));
  const filtered = suggestions.filter(
    s => !value.includes(s) && s.toLowerCase().includes(query.toLowerCase())
  );

  function add(role: string) {
    const r = role.trim();
    if (r && !value.includes(r)) onChange([...value, r]);
    setQuery("");
    inputRef.current?.focus();
  }

  function remove(role: string) {
    onChange(value.filter(v => v !== role));
  }

  return (
    <div className="relative">
      <div
        className="min-h-9 flex flex-wrap gap-1.5 p-2 rounded-md border border-input bg-background cursor-text focus-within:ring-1 focus-within:ring-border focus-within:border-muted-foreground/50 transition-colors"
        onClick={() => { inputRef.current?.focus(); setOpen(true); }}
      >
        {lockedValues.map(r => (
          <span key={r} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-muted border font-medium text-muted-foreground shrink-0">
            <Lock className="h-2.5 w-2.5" />{r}
          </span>
        ))}
        {extras.map(r => (
          <span key={r} className="group flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] bg-primary text-primary-foreground font-medium shrink-0">
            {r}
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); remove(r); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={e => {
            if (e.key === "Enter" && query.trim()) { e.preventDefault(); add(query.trim()); }
            if (e.key === "Backspace" && !query && extras.length) remove(extras[extras.length - 1]);
          }}
          placeholder={extras.length === 0 && lockedValues.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[80px] bg-transparent text-[11px] outline-none placeholder:text-muted-foreground py-0.5"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-44 overflow-y-auto">
          {filtered.map(s => (
            <button
              key={s}
              type="button"
              onMouseDown={e => { e.preventDefault(); add(s); }}
              className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-muted transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Intent icon map ───────────────────────────────────────────────────────────
const INTENT_META: Record<string, { Icon: React.ElementType; color: string }> = {
  lookup:    { Icon: Search,         color: "text-blue-600" },
  aggregate: { Icon: BarChart2,      color: "text-orange-600" },
  export:    { Icon: Download,       color: "text-green-600" },
  compare:   { Icon: ArrowLeftRight, color: "text-purple-600" },
  summarize: { Icon: FileText,       color: "text-amber-600" },
};

// ── Conditions section (Tab 2) ────────────────────────────────────────────────
function ConditionsSection({
  form, setForm, domainEntityTypes = [], lockedRoles = [],
}: {
  form: RuleFormState;
  setForm: Dispatch<SetStateAction<RuleFormState | null>>;
  domainEntityTypes?: EntityTypeItem[];
  lockedRoles?: string[];
}) {
  const { token } = useAuth();
  const [organizationRoles, setOrganizationRoles] = useState<string[]>([]);
  const [roleOpen, setRoleOpen]     = useState(false);
  const [roleQuery, setRoleQuery]   = useState("");
  const [blockedOpen, setBlockedOpen]   = useState(false);
  const [blockedQuery, setBlockedQuery] = useState("");
  const [showCustomIntent, setShowCustomIntent] = useState(false);
  const [customIntent, setCustomIntent] = useState("");

  useEffect(() => {
    if (!token) return;
    fetchPositions(token)
      .then((items) => setOrganizationRoles(Array.from(new Set(items.map((item) => item.name).filter(Boolean)))))
      .catch(() => setOrganizationRoles([]));
  }, [token]);

  function setC<K extends keyof RuleConditions>(key: K, val: RuleConditions[K]) {
    setForm(f => f ? { ...f, conditions: { ...f.conditions, [key]: val } } : f);
  }

  const extras = form.conditions.applicable_roles.filter(r => !lockedRoles.includes(r));
  const allIntents = Array.from(new Set([...DEFAULT_INTENT_OPTIONS, ...form.conditions.applicable_intents]));

  const availableRoles = Array.from(new Set([
    ...organizationRoles,
    ...POSITION_SUGGESTIONS,
    ...form.conditions.applicable_roles,
    ...form.conditions.blocked_roles,
  ]));
  const roleSuggestions = availableRoles.filter(
    s => !form.conditions.applicable_roles.includes(s) && !form.conditions.blocked_roles.includes(s) && s.toLowerCase().includes(roleQuery.toLowerCase())
  );
  const blockedSuggestions = availableRoles.filter(
    s => !form.conditions.blocked_roles.includes(s) && !form.conditions.applicable_roles.includes(s) && s.toLowerCase().includes(blockedQuery.toLowerCase())
  );

  function addRole(role: string, mode: "exempt" | "force") {
    const value = role.trim();
    if (!value) return;
    setForm((current) => {
      if (!current) return current;
      if (mode === "exempt") {
        return {
          ...current,
          conditions: {
            ...current.conditions,
            applicable_roles: current.conditions.applicable_roles.includes(value)
              ? current.conditions.applicable_roles
              : [...current.conditions.applicable_roles, value],
            blocked_roles: current.conditions.blocked_roles.filter((item) => item !== value),
          },
        };
      }
      return {
        ...current,
        conditions: {
          ...current.conditions,
          blocked_roles: current.conditions.blocked_roles.includes(value)
            ? current.conditions.blocked_roles
            : [...current.conditions.blocked_roles, value],
          applicable_roles: current.conditions.applicable_roles.filter((item) => item !== value),
        },
      };
    });
  }

  function addCustomIntent() {
    const v = customIntent.trim();
    if (!v || form.conditions.applicable_intents.includes(v)) return;
    setC("applicable_intents", [...form.conditions.applicable_intents, v]);
    setCustomIntent("");
    setShowCustomIntent(false);
  }

  return (
    <div className="p-5 space-y-4">

      {/* ── Sensitivity + User level ── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-2">
          <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
            Độ nhạy tài liệu tối thiểu <Info className="h-3 w-3" />
          </Label>
          <Select value={form.conditions.min_sensitivity ?? "none"} onValueChange={v => setC("min_sensitivity", v === "none" ? null : v)}>
            <SelectTrigger className="text-[12px]">
              <div className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Không giới hạn" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-[12px]">Không giới hạn</SelectItem>
              {SENSITIVITY_OPTIONS.map(s => (
                <SelectItem key={s} value={s} className="text-[12px]">{SENSITIVITY_VI[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-2">
          <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
            Cấp độ tối thiểu của người dùng <Info className="h-3 w-3" />
          </Label>
          <Select value={form.conditions.min_user_level?.toString() ?? "none"} onValueChange={v => setC("min_user_level", v === "none" ? null : Number(v))}>
            <SelectTrigger className="text-[12px]">
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                <SelectValue placeholder="Không giới hạn" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-[12px]">Không giới hạn</SelectItem>
              {USER_LEVEL_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value.toString()} className="text-[12px]">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Roles ── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Allowed roles */}
        <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-2.5">
          <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
            Vai trò được miễn áp dụng <Info className="h-3 w-3" />
          </Label>
          {lockedRoles.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {lockedRoles.map(r => (
                <span key={r} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-muted border border-border font-medium text-muted-foreground">
                  <Users className="h-3 w-3" />{r} <Lock className="h-2.5 w-2.5" />
                </span>
              ))}
            </div>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => setRoleOpen(o => !o)}
              className="w-full border border-dashed border-blue-400 rounded-lg py-2 text-[11px] text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1"
            >
              <Plus className="h-3 w-3" /> Thêm vai trò
            </button>
            {roleOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => { setRoleOpen(false); setRoleQuery(""); }} />
                <div className="absolute z-50 top-full mt-1 w-full rounded-lg border border-border bg-popover shadow-md overflow-hidden">
                  <div className="p-2 border-b border-border">
                    <Input autoFocus value={roleQuery} onChange={e => setRoleQuery(e.target.value)}
                      placeholder="Tìm vị trí..." className="h-7 text-[11px]"
                      onKeyDown={e => {
                        if (e.key === "Escape") { setRoleOpen(false); setRoleQuery(""); }
                        if (e.key === "Enter" && roleQuery.trim()) {
                          const r = roleQuery.trim();
                          addRole(r, "exempt");
                          setRoleQuery(""); setRoleOpen(false);
                        }
                      }}
                    />
                  </div>
                  <div className="max-h-36 overflow-y-auto">
                    {roleSuggestions.length === 0
                      ? <p className="px-3 py-2 text-[11px] text-muted-foreground">Không tìm thấy</p>
                      : roleSuggestions.map(s => (
                        <button key={s} type="button"
                          onClick={() => { addRole(s, "exempt"); setRoleQuery(""); setRoleOpen(false); }}
                          className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-muted transition-colors"
                        >{s}</button>
                      ))
                    }
                  </div>
                </div>
              </>
            )}
          </div>
          {extras.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {extras.map(r => (
                <span key={r} className="group flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-[11px] bg-background border border-border text-foreground font-medium">
                  {r}
                  <button type="button" onClick={() => setC("applicable_roles", form.conditions.applicable_roles.filter(v => v !== r))}>
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Blocked roles */}
        <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-2.5">
          <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
            Bắt buộc áp dụng cho vai trò <Info className="h-3 w-3" />
          </Label>
          {form.conditions.blocked_roles.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {form.conditions.blocked_roles.map(r => (
                <span key={r} className="group flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-[11px] bg-red-50 border border-red-200 text-red-700 font-medium">
                  {r}
                  <button type="button" onClick={() => setC("blocked_roles", form.conditions.blocked_roles.filter(v => v !== r))}>
                    <X className="h-3 w-3 text-red-400 hover:text-red-700 transition-colors" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => setBlockedOpen(o => !o)}
              className="w-full border border-dashed border-red-200 rounded-lg py-2 text-[11px] text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
            >
              <Plus className="h-3 w-3" /> Thêm vai trò bị chặn
            </button>
            {blockedOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => { setBlockedOpen(false); setBlockedQuery(""); }} />
                <div className="absolute z-50 top-full mt-1 w-full rounded-lg border border-border bg-popover shadow-md overflow-hidden">
                  <div className="p-2 border-b border-border">
                    <Input autoFocus value={blockedQuery} onChange={e => setBlockedQuery(e.target.value)}
                      placeholder="Tìm vị trí..." className="h-7 text-[11px]"
                      onKeyDown={e => {
                        if (e.key === "Escape") { setBlockedOpen(false); setBlockedQuery(""); }
                        if (e.key === "Enter" && blockedQuery.trim()) {
                          const r = blockedQuery.trim();
                          addRole(r, "force");
                          setBlockedQuery(""); setBlockedOpen(false);
                        }
                      }}
                    />
                  </div>
                  <div className="max-h-36 overflow-y-auto">
                    {blockedSuggestions.length === 0
                      ? <p className="px-3 py-2 text-[11px] text-muted-foreground">Không tìm thấy</p>
                      : blockedSuggestions.map(s => (
                        <button key={s} type="button"
                          onClick={() => { addRole(s, "force"); setBlockedQuery(""); setBlockedOpen(false); }}
                          className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-muted transition-colors"
                        >{s}</button>
                      ))
                    }
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Intent types ── */}
      <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
        <Label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          Loại truy vấn áp dụng
          <span className="text-muted-foreground/60 font-normal">(mặc định = tất cả)</span>
          <Info className="h-3 w-3" />
        </Label>
        <div className="flex flex-wrap gap-2">
          {allIntents.map(intent => {
            const checked = form.conditions.applicable_intents.includes(intent);
            const meta = INTENT_META[intent];
            const IconComp = meta?.Icon ?? Shield;
            return (
              <button
                key={intent}
                type="button"
                onClick={() => {
                  const arr = checked
                    ? form.conditions.applicable_intents.filter(i => i !== intent)
                    : [...form.conditions.applicable_intents, intent];
                  setC("applicable_intents", arr);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] font-medium transition-all ${
                  checked
                    ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/30"
                }`}
              >
                <IconComp className={`h-3.5 w-3.5 ${checked && meta ? meta.color : "text-muted-foreground"}`} />
                {INTENT_LABEL[intent] ?? intent}
                {checked && <ShieldCheck className="h-3 w-3 text-blue-500" />}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setShowCustomIntent(v => !v)}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-dashed border-border text-[11px] text-muted-foreground hover:bg-muted/30 transition-colors"
          >
            <Plus className="h-3 w-3" /> Thêm loại
          </button>
        </div>
        {showCustomIntent && (
          <div className="flex gap-2">
            <Input
              autoFocus
              placeholder="Nhập loại truy vấn tùy chỉnh..."
              value={customIntent}
              onChange={e => setCustomIntent(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomIntent(); } if (e.key === "Escape") setShowCustomIntent(false); }}
              className="text-[11px] h-8 flex-1"
            />
            <button type="button" onClick={addCustomIntent}
              className="px-3 h-8 rounded-md border border-primary/40 text-[11px] text-primary hover:bg-primary/5 transition-colors">
              + Thêm
            </button>
          </div>
        )}
      </div>

      {/* ── Cross-dept toggle ── */}
      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/10 p-4">
        <Switch checked={form.conditions.cross_dept_only} onCheckedChange={v => setC("cross_dept_only", v)} className="mt-0.5 shrink-0" />
        <div>
          <p className="text-[12.5px] font-medium">Tài liệu ở cấp tổ chức cao hơn người dùng</p>
          <p className="text-[10.5px] text-muted-foreground mt-0.5">Kích hoạt khi tài liệu thuộc đơn vị lớn hơn của vị trí người dùng</p>
        </div>
      </div>
    </div>
  );
}

// ── Contract section (Tab 3) ──────────────────────────────────────────────────
const CONTRACT_ACTIONS = [
  { value: "block",       label: "Chặn hoàn toàn",         desc: "Từ chối truy cập và không hiển thị dữ liệu.",               Icon: ShieldX,    iconBg: "bg-red-100",    iconCls: "text-red-600" },
  { value: "conditional", label: "Áp dụng điều kiện",     desc: "Áp dụng các điều kiện che hoặc xử lý dữ liệu theo quy tắc.", Icon: Settings2,  iconBg: "bg-purple-100", iconCls: "text-purple-600" },
  { value: "watermark",   label: "Cho phép với watermark", desc: "Cho phép hiển thị nhưng thêm dấu watermark bảo mật.",        Icon: Fingerprint, iconBg: "bg-amber-100", iconCls: "text-amber-600" },
  { value: "allow",       label: "Cho phép tất cả",        desc: "Trả về toàn bộ dữ liệu không giới hạn.",                    Icon: ShieldCheck, iconBg: "bg-green-100", iconCls: "text-green-600" },
];

function ContractSection({
  form, setForm,
}: {
  form: RuleFormState;
  setForm: Dispatch<SetStateAction<RuleFormState | null>>;
}) {
  const [customMaxDetail, setCustomMaxDetail] = useState(
    !MAX_DETAIL_OPTIONS.some(o => o.value === form.contract.max_detail)
  );
  const [customNumeric, setCustomNumeric] = useState(
    !NUMERIC_OPTIONS.some(o => o.value === form.contract.numeric_granularity)
  );

  function setK<K extends keyof RuleContract>(key: K, val: RuleContract[K]) {
    setForm(f => f ? { ...f, contract: { ...f.contract, [key]: val } } : f);
  }

  return (
    <div className="p-5 space-y-5">
      {/* ── Action cards ── */}
      <div>
        <Label className="text-[12px] font-semibold flex items-center gap-1.5 mb-3">
          Hành động khi vi phạm <span className="text-destructive">*</span>
          <Info className="h-3.5 w-3.5 text-muted-foreground font-normal" />
        </Label>
        <div className="grid grid-cols-4 gap-3">
          {CONTRACT_ACTIONS.map(a => {
            const selected = form.contract.violation_action === a.value;
            return (
              <button
                key={a.value}
                type="button"
                onClick={() => {
                  setK("violation_action", a.value);
                  if (a.value === "conditional" && !VALID_MAX_DETAIL.includes(form.contract.max_detail)) {
                    setK("max_detail", "generalize");
                  }
                }}
                className={`flex flex-col items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  selected ? "border-blue-500 bg-blue-50/40" : "border-border bg-card hover:bg-muted/20"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center ${a.iconBg}`}>
                    <a.Icon className={`h-4 w-4 ${a.iconCls}`} />
                  </div>
                  <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selected ? "border-blue-500" : "border-muted-foreground/30"
                  }`}>
                    {selected && <div className="h-2 w-2 rounded-full bg-blue-500" />}
                  </div>
                </div>
                <div>
                  <p className="text-[12px] font-semibold leading-tight">{a.label}</p>
                  <p className="text-[10.5px] text-muted-foreground mt-1 leading-snug">{a.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Chi tiết hành động — chỉ hiện khi conditional ── */}
      {form.contract.violation_action === "conditional" && (
        <div className="space-y-3">
          <p className="text-[12px] font-semibold">Chi tiết hành động</p>
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-4 py-2.5">
            <Info className="h-4 w-4 text-blue-500 shrink-0" />
            <p className="text-[11px] text-blue-700">Thiết lập mức độ và cách thức dữ liệu sẽ được xử lý khi quy tắc bị vi phạm.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* max_detail */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] text-muted-foreground">Mức trả lời chi tiết</Label>
                <button type="button"
                  onClick={() => { if (!customMaxDetail) { setK("max_detail", ""); setCustomMaxDetail(true); } else { setK("max_detail", "generalize"); setCustomMaxDetail(false); } }}
                  className="text-[10px] text-blue-600 hover:underline"
                >
                  {customMaxDetail ? "← Danh sách" : "Tự nhập..."}
                </button>
              </div>
              {customMaxDetail ? (
                <Input autoFocus placeholder="Nhập chế độ tuỳ chỉnh..." value={form.contract.max_detail}
                  onChange={e => setK("max_detail", e.target.value)} className="text-[12px] placeholder:text-[11px]" />
              ) : (
                <Select value={form.contract.max_detail} onValueChange={v => setK("max_detail", v)}>
                  <SelectTrigger className="text-[12px]">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {MAX_DETAIL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-[12px]">{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* numeric_granularity — không áp dụng cho redact (che toàn bộ) */}
            {form.contract.max_detail !== "redact" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] text-muted-foreground">Độ chính xác số liệu</Label>
                <button type="button"
                  onClick={() => { if (!customNumeric) { setK("numeric_granularity", ""); setCustomNumeric(true); } else { setK("numeric_granularity", "aggregated"); setCustomNumeric(false); } }}
                  className="text-[10px] text-blue-600 hover:underline"
                >
                  {customNumeric ? "← Danh sách" : "Tự nhập..."}
                </button>
              </div>
              {customNumeric ? (
                <Input placeholder="Nhập độ chính xác tuỳ chỉnh..." value={form.contract.numeric_granularity}
                  onChange={e => setK("numeric_granularity", e.target.value)} className="text-[12px] placeholder:text-[11px]" />
              ) : (
                <Select value={form.contract.numeric_granularity} onValueChange={v => setK("numeric_granularity", v)}>
                  <SelectTrigger className="text-[12px]">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {NUMERIC_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-[12px]">{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function DomainRulesTab({
  domains,
  rulesDomainId,
  setRulesDomainId,
  domainRules,
  rulesLoading,
  selectedDomain,
  onCreateRule,
  onUpdateRule,
  onDeleteRule,
  onToggleRule,
  lockedRoles = [],
}: DomainRulesTabProps) {
  const [domainSearch, setDomainSearch] = useState("");
  const [ruleSearch, setRuleSearch] = useState("");
  const [sortBy, setSortBy] = useState("priority");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<RuleFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTab, setDetailTab] = useState("overview");

  // Sync form when selected rule changes
  useEffect(() => {
    const rule = domainRules.find(r => r.id === selectedRuleId) ?? null;
    setEditForm(rule ? initialFormFromRule(rule) : null);
  }, [selectedRuleId, domainRules]);

  // Reset on domain change
  useEffect(() => { setCurrentPage(1); setSelectedRuleId(null); setRuleSearch(""); setDetailTab("overview"); }, [rulesDomainId]);
  useEffect(() => { setCurrentPage(1); }, [ruleSearch, sortBy]);

  // ── Filtered domains ───────────────────────────────────────────────────────
  const filteredDomains = useMemo(() => {
    const q = domainSearch.trim().toLowerCase();
    return q ? domains.filter(d => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q)) : domains;
  }, [domains, domainSearch]);

  // ── Filtered + sorted rules ────────────────────────────────────────────────
  const filteredRules = useMemo(() => {
    const q = ruleSearch.trim().toLowerCase();
    const list = q
      ? domainRules.filter(r => r.name.toLowerCase().includes(q) || r.rule_code.toLowerCase().includes(q))
      : [...domainRules];
    if (sortBy === "priority") list.sort((a, b) => b.priority - a.priority);
    else if (sortBy === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else list.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return list;
  }, [domainRules, ruleSearch, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredRules.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRules = filteredRules.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Stats
  const activeCount   = domainRules.filter(r => r.is_active).length;
  const inactiveCount = domainRules.filter(r => !r.is_active).length;
  const highPriCount  = domainRules.filter(r => r.priority >= 80).length;
  const pct = (n: number) => domainRules.length ? `${Math.round(n / domainRules.length * 100)}% tổng luật` : "0% tổng luật";

  const selectedRule = domainRules.find(r => r.id === selectedRuleId) ?? null;
  const domainEntityTypes = selectedDomain?.id === rulesDomainId ? selectedDomain.entity_types : [];

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!selectedRuleId || !editForm) return;
    setSaving(true);
    try {
      await onUpdateRule(selectedRuleId, {
        rule_code: editForm.rule_code,
        name: editForm.name,
        priority: editForm.priority,
        mandatory: editForm.mandatory,
        audit_log: editForm.audit_log,
        conditions: {
          ...editForm.conditions,
          applicable_roles: Array.from(new Set([...(lockedRoles ?? []), ...editForm.conditions.applicable_roles])),
          blocked_roles: editForm.conditions.blocked_roles.filter(
            (role) => !(lockedRoles ?? []).includes(role) && !editForm.conditions.applicable_roles.includes(role),
          ),
        },
        contract: editForm.contract,
      });
      toast({ title: "Đã lưu thay đổi", variant: "success" as any });
    } catch (err) {
      toast({ title: "Lỗi khi lưu", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    const rule = domainRules.find(r => r.id === selectedRuleId) ?? null;
    setEditForm(rule ? initialFormFromRule(rule) : null);
  }

  async function handleDelete(ruleId: string) {
    const rule = domainRules.find(r => r.id === ruleId);
    if (!rule || !confirm(`Xóa rule "${rule.name}"?`)) return;
    await onDeleteRule(ruleId);
    if (selectedRuleId === ruleId) setSelectedRuleId(null);
  }

  async function handleDuplicate(rule: DomainRule) {
    try {
      await onCreateRule({
        rule_code: rule.rule_code + "_copy",
        name: rule.name + " (bản sao)",
        priority: rule.priority,
        mandatory: rule.mandatory,
        audit_log: rule.audit_log,
        conditions: rule.conditions_json,
        contract: rule.contract_json,
      });
      toast({ title: "Đã nhân bản rule" });
    } catch (err) {
      toast({ title: "Lỗi", description: String(err), variant: "destructive" });
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-[680px] gap-5 px-6 pt-4 pb-6">

      {/* ═══ Column 1: Domain selector — full height ══════════════════════════ */}
      <div className="w-80 shrink-0 flex flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-4 pt-7 pb-4 flex items-center justify-between shrink-0">
          <h2 className="text-[14px] font-semibold">Miền dữ liệu</h2>
          <LayoutList className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="px-3 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={domainSearch}
              onChange={e => setDomainSearch(e.target.value)}
              placeholder="Tìm miền..."
              className="h-8 pl-7 text-[11px] placeholder:text-[11px]"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 scrollbar-thin">
          {filteredDomains.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground text-center">
              <ShieldCheck className="h-7 w-7" />
              <p className="text-xs">Không tìm thấy miền</p>
            </div>
          ) : filteredDomains.map((d, idx) => {
            const col = DOMAIN_COLORS[idx % DOMAIN_COLORS.length];
            const isSelected = rulesDomainId === d.id;
            return (
              <div
                key={d.id}
                onClick={() => setRulesDomainId(d.id)}
                className={`relative flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-colors ${
                  isSelected ? "border-primary/40 bg-primary/5" : "border-border/60 bg-card hover:border-border hover:bg-muted/20"
                }`}
              >
                {!d.is_active && <Lock className="absolute top-2 right-2 h-3 w-3 text-red-400" strokeWidth={2.5} />}
                <div className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center ${col.bg}`}>
                  <Database className={`h-4 w-4 ${col.iconCls}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold leading-tight truncate">{d.name}</p>
                    <SensitivityBadge level={d.base_sensitivity} className="shrink-0 ml-auto" />
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{d.code}</p>
                  <p className="text-[10.5px] text-muted-foreground mt-1.5">
                    {d.entity_type_count} thực thể<span className="mx-1.5 text-border">·</span>{d.rule_count} luật
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ Right area: stats + (rule list | detail) ════════════════════════ */}
      <div className="flex-1 flex flex-col gap-4 min-w-0 min-h-0">

        {/* 5 stat cards — spans full width of right area */}
        <div className="grid grid-cols-4 gap-4 shrink-0">
          {[
            { label: "Tổng luật",      value: domainRules.length, Icon: List,     bg: "bg-blue-50 dark:bg-blue-950/40",   iconCls: "text-blue-600",  sub: rulesDomainId ? "trong miền đã chọn" : "chọn miền để xem" },
            { label: "Đang bật",       value: activeCount,         Icon: Activity, bg: "bg-green-50 dark:bg-green-950/40", iconCls: "text-green-600", sub: pct(activeCount) },
            { label: "Đang tắt",       value: inactiveCount,       Icon: Power,    bg: "bg-gray-100 dark:bg-gray-800",     iconCls: "text-gray-500",  sub: pct(inactiveCount) },
            { label: "Độ ưu tiên cao",value: highPriCount,        Icon: Zap,      bg: "bg-red-50 dark:bg-red-950/40",     iconCls: "text-red-500",   sub: "≥ 80" },
          ].map(({ label, value, Icon, bg, iconCls, sub }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4 flex items-start gap-3 shadow-sm">
              <div className={`h-10 w-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`h-5 w-5 ${iconCls}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[11.5px] text-muted-foreground font-medium leading-tight">{label}</p>
                <p className="text-[22px] font-bold text-foreground leading-tight">{value}</p>
                <p className="text-[10.5px] text-muted-foreground mt-0.5 truncate">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Rule list + Detail row */}
        <div className="flex-1 flex gap-4 min-h-0">

        {/* ── Rule list ── */}
        <div className="w-[380px] shrink-0 flex flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {!rulesDomainId ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium">Chọn miền để xem luật</p>
          </div>
        ) : (
          <>
            {/* Header + search/sort */}
            <div className="px-3 pt-3 pb-2 border-b border-border/40 shrink-0 space-y-2">
              <div className="flex mb-5 items-center justify-between">
                <h3 className="text-[12.5px] font-semibold">Danh sách luật</h3>
                <Button size="sm" className="h-7 text-[11px] bg-primary text-primary-foreground hover:bg-primary/90 gap-1 px-2.5" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-3 w-3" /> Tạo luật mới
                </Button>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={ruleSearch}
                    onChange={e => setRuleSearch(e.target.value)}
                    placeholder="Tìm luật..."
                    className="h-7 pl-7 text-[11px] placeholder:text-[11px]"
                  />
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-7 w-32 text-[11px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="priority" className="text-[11px]">Độ ưu tiên</SelectItem>
                    <SelectItem value="name" className="text-[11px]">Tên</SelectItem>
                    <SelectItem value="updated" className="text-[11px]">Cập nhật</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Rule cards */}
            <div className="flex-1 overflow-y-auto">
              {rulesLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-sm">Đang tải...</span>
                </div>
              ) : paginatedRules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-2">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium">Chưa có luật nào</p>
                  <p className="text-xs mt-1 text-muted-foreground/70">Nhấn "Tạo rule mới" để bắt đầu.</p>
                </div>
              ) : paginatedRules.map(rule => {
                const va = rule.contract_json?.violation_action ?? "conditional";
                const astyle = ACTION_STYLE[va] ?? DEFAULT_ACTION_STYLE;
                const ActionIcon = astyle.Icon;
                const isSelected = selectedRuleId === rule.id;
                return (
                  <div
                    key={rule.id}
                    onClick={() => setSelectedRuleId(isSelected ? null : rule.id)}
                    className={`flex items-start gap-3 px-3 py-3 border-b border-border/40 cursor-pointer transition-colors ${
                      isSelected ? "bg-primary/5" : !rule.is_active ? "opacity-60 hover:bg-muted/20" : "hover:bg-muted/20"
                    }`}
                  >
                    <div className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center ${astyle.bg}`}>
                      <ActionIcon className={`h-4 w-4 ${astyle.iconCls}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-[12px] font-semibold leading-tight">{rule.name}</p>
                        <span className={`shrink-0 text-[9.5px] font-semibold px-1.5 py-[2px] rounded-md ${rule.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {rule.is_active ? "Đang bật" : "Đang tắt"}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{rule.rule_code}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                        <span>Ưu tiên: <span className="font-semibold text-foreground">{rule.priority}</span></span>
                        <span className="text-border">·</span>
                        <span>{new Date(rule.updated_at).toLocaleDateString("vi-VN")}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <Switch checked={rule.is_active} onCheckedChange={v => onToggleRule(rule.id, v)} className="scale-[0.7]" />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDuplicate(rule)}>
                            <Copy className="mr-2 h-3.5 w-3.5" /> Nhân bản
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDelete(rule.id)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-border/40 shrink-0">
              <p className="text-[10px] text-muted-foreground">
                Hiển thị {filteredRules.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredRules.length)} trong {filteredRules.length} luật
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-6 w-6 text-[11px]" disabled={safePage === 1} onClick={() => setCurrentPage(p => p - 1)}>‹</Button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                    <Button key={p} variant="outline" size="icon" className={`h-6 w-6 text-[11px] ${p === safePage ? "bg-primary text-primary-foreground border-primary" : ""}`} onClick={() => setCurrentPage(p)}>{p}</Button>
                  ))}
                  <Button variant="outline" size="icon" className="h-6 w-6 text-[11px]" disabled={safePage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>›</Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

        {/* ── Rule detail ── */}
        <div className="flex-1 flex flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden min-w-0">
        {!selectedRule || !editForm ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground select-none">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium">Chọn luật để xem chi tiết</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-4 border-b border-border/60 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[15px] font-bold truncate">{selectedRule.name}</h3>
                    <span className={`text-[10.5px] font-semibold px-2 py-[3px] rounded-md ${selectedRule.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {selectedRule.is_active ? "Đang bật" : "Đang tắt"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {selectedRule.rule_code} · Cập nhật: {new Date(selectedRule.updated_at).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1.5 px-2.5" onClick={() => handleDuplicate(selectedRule)}>
                    <Copy className="h-3 w-3" /> Nhân bản
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1.5 px-2.5 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => handleDelete(selectedRule.id)}>
                    <Trash2 className="h-3 w-3" /> Xóa
                  </Button>
                </div>
              </div>
            </div>

            {/* 3 Tabs */}
            <Tabs value={detailTab} onValueChange={setDetailTab} className="flex-1 flex flex-col overflow-hidden">
              <div className="border-b border-border/60 px-5 shrink-0">
                <TabsList className="mt-1 h-9">
                  <TabsTrigger value="overview" className="text-[12px]">Tổng quan</TabsTrigger>
                  <TabsTrigger value="conditions" className="text-[12px]">Điều kiện kích hoạt</TabsTrigger>
                  <TabsTrigger value="contract" className="text-[12px]">Hành động (Contract)</TabsTrigger>
                </TabsList>
              </div>

              {/* Tab 1: Tổng quan */}
              <TabsContent value="overview" className="flex-1 overflow-y-auto mt-0">
                {(() => {
                  const va = selectedRule.contract_json?.violation_action ?? "conditional";
                  const astyle = ACTION_STYLE[va] ?? DEFAULT_ACTION_STYLE;
                  const ActionIcon = astyle.Icon;
                  const actionLabel = VIOLATION_LABEL[va] ?? va;
                  const actionDesc = ACTION_DESC[va] ?? "";
                  const domainInfo = domains.find(d => d.id === rulesDomainId);
                  const domainIdx = domains.findIndex(d => d.id === rulesDomainId);
                  const domainColor = DOMAIN_COLORS[domainIdx % DOMAIN_COLORS.length] ?? DOMAIN_COLORS[0];
                  return (
                    <div className="p-5 space-y-4">
                      {/* ── Row 1: 2 columns ── */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Left: Thông tin chung */}
                        <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
                          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/70">Thông tin chung</p>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Mã quy tắc</Label>
                            <Input value={editForm.rule_code} disabled className="h-10 text-xs font-mono bg-muted/40 text-muted-foreground" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Tên quy tắc <span className="text-destructive">*</span></Label>
                            <Input
                              value={editForm.name}
                              onChange={e => setEditForm(f => f ? { ...f, name: e.target.value } : f)}
                              className="h-10 text-xs"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-[11px] text-muted-foreground">Độ ưu tiên</Label>
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number" min={0} max={100}
                                  value={editForm.priority}
                                  onChange={e => setEditForm(f => f ? { ...f, priority: Math.min(100, Math.max(0, Number(e.target.value))) } : f)}
                                  className="text-[12px] h-6 w-14 text-center px-1"
                                />
                                <span className="text-[11px] text-muted-foreground">/100</span>
                              </div>
                            </div>
                            <input
                              type="range" min={0} max={100}
                              value={editForm.priority}
                              onChange={e => setEditForm(f => f ? { ...f, priority: Number(e.target.value) } : f)}
                              className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-foreground"
                              style={{ background: `linear-gradient(to right, hsl(var(--foreground)) ${editForm.priority}%, hsl(var(--muted)) ${editForm.priority}%)` }}
                            />
                            <p className="text-[10px] text-muted-foreground">
                              {editForm.priority >= 80 ? "Ưu tiên cao" : editForm.priority >= 50 ? "Ưu tiên trung bình" : "Ưu tiên thấp"}
                            </p>
                          </div>
                        </div>

                        {/* Right: Hành động + Trạng thái stacked */}
                        <div className="space-y-3">
                          {/* Hành động card */}
                          <div className="rounded-xl border border-border bg-muted/10 p-4">
                            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">Hành động</p>
                            <div className="flex items-start gap-3">
                              <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${astyle.bg}`}>
                                <ActionIcon className={`h-5 w-5 ${astyle.iconCls}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold leading-tight">{actionLabel}</p>
                                <p className="text-[10.5px] text-muted-foreground mt-0.5">{actionDesc}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setDetailTab("contract")}
                              className="mt-2.5 text-[11px] text-primary hover:underline"
                            >
                              Thay đổi hành động →
                            </button>
                          </div>

                          {/* Trạng thái card */}
                          <div className="rounded-xl border border-border bg-muted/10 p-4">
                            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">Trạng thái</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`h-2.5 w-2.5 rounded-full ${selectedRule.is_active ? "bg-green-500" : "bg-gray-400"}`} />
                                <span className="text-[13px] font-semibold">{selectedRule.is_active ? "Đang bật" : "Đang tắt"}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => onToggleRule(selectedRule.id, !selectedRule.is_active)}
                                className="text-[11px] text-primary hover:underline"
                              >
                                {selectedRule.is_active ? "Tạm dừng luật" : "Kích hoạt rule"}
                              </button>
                            </div>
                            <div className="mt-2.5 pt-2.5 border-t border-border/40 grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-[10px] text-muted-foreground mb-0.5">Bắt buộc</p>
                                <div className="flex items-center gap-1.5">
                                  <Switch checked={editForm.mandatory} onCheckedChange={v => setEditForm(f => f ? { ...f, mandatory: v } : f)} className="scale-[0.7] origin-left" />
                                  <span className="text-[11px] text-muted-foreground">{editForm.mandatory ? "Có" : "Không"}</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground mb-0.5">Ghi nhật ký</p>
                                <div className="flex items-center gap-1.5">
                                  <Switch checked={editForm.audit_log} onCheckedChange={v => setEditForm(f => f ? { ...f, audit_log: v } : f)} className="scale-[0.7] origin-left" />
                                  <span className="text-[11px] text-muted-foreground">{editForm.audit_log ? "Có" : "Không"}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ── Luật áp dụng cho ── */}
                      <div className="rounded-xl border border-border bg-muted/10 p-4">
                        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">Luật áp dụng cho</p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 cursor-default transition-colors">
                            <div className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${domainColor.bg}`}>
                              <Database className={`h-3.5 w-3.5 ${domainColor.iconCls}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-semibold">{domainInfo?.name ?? "—"}</p>
                              <p className="text-[10px] font-mono text-muted-foreground">{domainInfo?.code ?? ""}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 cursor-default transition-colors">
                            <div className="h-8 w-8 shrink-0 rounded-lg bg-violet-100 flex items-center justify-center">
                              <Users className="h-3.5 w-3.5 text-violet-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-semibold">Loại thực thể</p>
                              <p className="text-[10px] text-muted-foreground">{domainInfo?.entity_type_count ?? domainEntityTypes.length} loại thực thể trong miền</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })()}
              </TabsContent>

              {/* Tab 2: Điều kiện */}
              <TabsContent value="conditions" className="flex-1 overflow-y-auto p-5 mt-0">
                <ConditionsSection
                  form={editForm}
                  setForm={setEditForm}
                  domainEntityTypes={domainEntityTypes}
                  lockedRoles={lockedRoles}
                />
              </TabsContent>

              {/* Tab 3: Contract */}
              <TabsContent value="contract" className="flex-1 overflow-y-auto p-5 mt-0">
                <ContractSection form={editForm} setForm={setEditForm} />
              </TabsContent>
            </Tabs>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border/60 flex items-center justify-end gap-2 shrink-0">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleCancel}>Hủy</Button>
              <Button size="sm" className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSave} disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </>
        )}
        </div>{/* end rule detail */}

        </div>{/* end rule list + detail row */}

      </div>{/* end right area */}

      {/* Create rule dialog */}
      <RuleDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={onCreateRule}
        initial={null}
        domainEntityTypes={domainEntityTypes}
        lockedRoles={lockedRoles}
      />
    </div>
  );
}
