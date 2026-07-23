import { Eye, EyeOff, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EntityAction } from "@/services/documents.api";
import { ENTITY_ACTION_LABEL } from "@/services/entity-policy.api";

const ACTION_ICONS: Record<EntityAction, typeof Eye> = {
  block: ShieldAlert,
  full: Eye,
  mask: EyeOff,
};

export const ENTITY_ACTION_STYLES: Record<EntityAction, { trigger: string; item: string; icon: string }> = {
  block: {
    trigger: "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15",
    item: "text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive",
    icon: "text-destructive",
  },
  full: {
    trigger: "border-success/40 bg-success/10 text-success hover:bg-success/15",
    item: "text-success data-[highlighted]:bg-success/10 data-[highlighted]:text-success",
    icon: "text-success",
  },
  mask: {
    trigger: "border-warning/50 bg-warning/10 text-warning hover:bg-warning/15",
    item: "text-warning data-[highlighted]:bg-warning/10 data-[highlighted]:text-warning",
    icon: "text-warning",
  },
};

export function EntityActionSelect({
  value,
  onValueChange,
  className,
}: {
  value: EntityAction;
  onValueChange: (value: EntityAction) => void;
  className?: string;
}) {
  const SelectedIcon = ACTION_ICONS[value];

  return (
    <Select value={value} onValueChange={(next) => onValueChange(next as EntityAction)}>
      <SelectTrigger className={cn("text-xs", ENTITY_ACTION_STYLES[value].trigger, className)}>
        <span className="flex min-w-0 items-center gap-2">
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {(Object.keys(ENTITY_ACTION_LABEL) as EntityAction[]).map((action) => {
            const ActionIcon = ACTION_ICONS[action];
            return (
              <SelectItem key={action} value={action} className={ENTITY_ACTION_STYLES[action].item}>
                <span className="flex items-center gap-2">
                  <ActionIcon className={cn("size-3.5 shrink-0", ENTITY_ACTION_STYLES[action].icon)} aria-hidden="true" />
                  <span>{ENTITY_ACTION_LABEL[action]}</span>
                </span>
              </SelectItem>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
