/** SearchFilterDialog: modal for selecting OUI and sensitivity filters before triggering a new search. */
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SensitivityRank } from "@/types";
import { OrgUnit, OrgUnitInstance } from "@/services/org_units.api";
import { OuiFilterAccordion } from "./OuiFilterAccordion";

interface SearchFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgUnits: OrgUnit[];
  allowedOrgUnitInstances: OrgUnitInstance[];
  ouiFilter: string[];
  setOuiFilter: (ids: string[]) => void;
  sensitivityLevelFilter: SensitivityRank | "all";
  setSensitivityLevelFilter: (v: SensitivityRank | "all") => void;
  activeFiltersCount: number;
  clearFilters: () => void;
  onSearch: () => void;
}

export function SearchFilterDialog({
  open,
  onOpenChange,
  orgUnits,
  allowedOrgUnitInstances,
  ouiFilter,
  setOuiFilter,
  sensitivityLevelFilter,
  setSensitivityLevelFilter,
  activeFiltersCount,
  clearFilters,
  onSearch,
}: SearchFilterDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[16px]">Bộ lọc tìm kiếm</DialogTitle>
        </DialogHeader>
        <div className="mt-2 space-y-6">
          {/* Organizational unit filter */}
          <div>
            <label className="text-sm font-medium">Đơn vị tổ chức</label>
            <div className="mt-2">
              <OuiFilterAccordion
                orgUnits={orgUnits}
                orgUnitInstances={allowedOrgUnitInstances}
                selectedOuiIds={ouiFilter}
                onChange={setOuiFilter}
              />
            </div>
          </div>

          {/* Sensitivity level filter */}
          <div>
            <label className="text-sm font-medium">Mức độ nhạy cảm</label>
            <Select
              value={String(sensitivityLevelFilter)}
              onValueChange={(v) =>
                setSensitivityLevelFilter(
                  v === "all" ? "all" : (Number(v) as SensitivityRank),
                )
              }
            >
              <SelectTrigger className="mt-2 text-[12.5px]">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="1">Công khai</SelectItem>
                <SelectItem value="2">Nội bộ</SelectItem>
                <SelectItem value="3">Hạn chế</SelectItem>
                <SelectItem value="4">Mật</SelectItem>
                <SelectItem value="5">Tuyệt mật</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {activeFiltersCount > 0 && (
            <Button
              variant="outline"
              className="w-full bg-destructive/30 text-destructive hover:bg-destructive/20 hover:text-destructive transition-colors text-[12px]"
              onClick={clearFilters}
            >
              Xóa tất cả bộ lọc
            </Button>
          )}

          {/* Apply filters and re-run the search. */}
          <Button
            className="w-full text-[12px] bg-gray-900 hover:bg-gray-800 text-white"
            onClick={() => {
              onOpenChange(false);
              onSearch();
            }}
          >
            Áp dụng & Tìm kiếm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
