import { BriefcaseBusiness, Building2, Check, ChevronsUpDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type EntityScopeOption = {
  id: string;
  label: string;
  description?: string;
};

type ScopePickerProps = {
  label: string;
  emptyLabel: string;
  searchPlaceholder: string;
  options: EntityScopeOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  icon: LucideIcon;
};

function ScopePicker({
  label,
  emptyLabel,
  searchPlaceholder,
  options,
  selectedIds,
  onChange,
  icon: Icon,
}: ScopePickerProps) {
  const selected = new Set(selectedIds);

  const toggle = (id: string) => {
    onChange(selected.has(id)
      ? selectedIds.filter((value) => value !== id)
      : [...selectedIds, id]);
  };

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full justify-between gap-2 px-3 text-left text-xs font-normal"
          >
            <span className={cn("min-w-0 truncate", selectedIds.length === 0 && "text-muted-foreground")}>
              {selectedIds.length === 0 ? emptyLabel : `${selectedIds.length} đã chọn`}
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(340px,calc(100vw-2rem))] p-0">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>Không tìm thấy lựa chọn.</CommandEmpty>
              <CommandGroup heading={label}>
                {options.map((option) => {
                  const isSelected = selected.has(option.id);
                  return (
                    <CommandItem
                      key={option.id}
                      value={`${option.label} ${option.description ?? ""}`}
                      onSelect={() => toggle(option.id)}
                      className="gap-2 py-2"
                    >
                      <Checkbox
                        checked={isSelected}
                        tabIndex={-1}
                        aria-hidden="true"
                        className="pointer-events-none"
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-xs">{option.label}</span>
                        {option.description && (
                          <span className="truncate text-[10px] text-muted-foreground">
                            {option.description}
                          </span>
                        )}
                      </span>
                      {isSelected && <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
            {selectedIds.length > 0 && (
              <div className="border-t p-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full text-xs"
                  onClick={() => onChange([])}
                >
                  Bỏ chọn tất cả
                </Button>
              </div>
            )}
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function EntityScopePicker({
  unitOptions,
  roleOptions,
  scopeOuiIds,
  scopePositionIds,
  onScopeOuiIdsChange,
  onScopePositionIdsChange,
}: {
  unitOptions: EntityScopeOption[];
  roleOptions: EntityScopeOption[];
  scopeOuiIds: string[];
  scopePositionIds: string[];
  onScopeOuiIdsChange: (ids: string[]) => void;
  onScopePositionIdsChange: (ids: string[]) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <ScopePicker
        label="Đơn vị áp dụng"
        emptyLabel="Tất cả đơn vị"
        searchPlaceholder="Tìm đơn vị..."
        options={unitOptions}
        selectedIds={scopeOuiIds}
        onChange={onScopeOuiIdsChange}
        icon={Building2}
      />
      <ScopePicker
        label="Vai trò áp dụng"
        emptyLabel="Tất cả vai trò"
        searchPlaceholder="Tìm vai trò..."
        options={roleOptions}
        selectedIds={scopePositionIds}
        onChange={onScopePositionIdsChange}
        icon={BriefcaseBusiness}
      />
    </div>
  );
}
