/** Tab 3: global rules that apply across all domains. */
import type { CreateRulePayload, DomainRule } from "@/types/policy";
import { RulesSection } from "./RulesSection";

interface GlobalRulesTabProps {
  globalRules: DomainRule[];
  loading: boolean;
  onCreateRule: (payload: CreateRulePayload) => Promise<void>;
  onUpdateRule: (ruleId: string, payload: CreateRulePayload) => Promise<void>;
  onDeleteRule: (ruleId: string) => Promise<void>;
  onToggleRule: (ruleId: string, active: boolean) => Promise<void>;
  lockedRoles?: string[];
}

export function GlobalRulesTab({
  globalRules,
  loading,
  onCreateRule,
  onUpdateRule,
  onDeleteRule,
  onToggleRule,
  lockedRoles,
}: GlobalRulesTabProps) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col mt-0 p-6 space-y-4 overflow-y-auto scrollbar-thin">
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[12px] text-blue-700">
        Luật toàn cục áp dụng cho <strong>tất cả</strong> miền và chunks, bất
        kể phân loại miền.
      </div>
      <RulesSection
        rules={globalRules}
        loading={loading}
        onCreateRule={onCreateRule}
        onUpdateRule={onUpdateRule}
        onDeleteRule={onDeleteRule}
        onToggleRule={onToggleRule}
        lockedRoles={lockedRoles}
      />
    </div>
  );
}
