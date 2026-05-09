import { X, FolderKanban, Building2 } from "lucide-react";
import { Project } from "@/services/projects.api";
import { Department } from "@/services/departments.api";

interface ChatFilterProps {
  availableProjects: Project[];
  availableDepts: Department[];
  selectedProjectIds: string[];
  selectedDeptIds: string[];
  deptFilterOn: boolean;
  userRole: string;
  onToggleProject: (id: string) => void;
  onToggleDept: (id: string) => void;
  onToggleDeptFilter: () => void;
  onClose: () => void;
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? "bg-primary" : "bg-muted-foreground/30"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function ChatFilter({
  availableProjects,
  availableDepts,
  selectedProjectIds,
  selectedDeptIds,
  deptFilterOn,
  userRole,
  onToggleProject,
  onToggleDept,
  onToggleDeptFilter,
  onClose,
}: ChatFilterProps) {
  const isPrivileged = ["admin_auditor", "director"].includes(userRole);
  const activeProjectCount = selectedProjectIds.length;
  const activeDeptCount = selectedDeptIds.length;

  return (
    <div className="absolute bottom-full right-0 mb-3 w-[320px] rounded-xl border border-border bg-popover shadow-xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Bộ lọc tìm kiếm</span>
          {(activeProjectCount > 0 || deptFilterOn) && (
            <span className="text-[10px] font-medium bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
              Đang áp dụng {activeProjectCount + (deptFilterOn ? 1 : 0)} 
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Project filter */}
        <div>
          <div className="flex items-center gap-1.5 mb-2.5">
            <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">
              Dự án
            </span>
            {activeProjectCount > 0 && (
              <span className="text-[10px] text-primary font-medium ml-auto">
                {activeProjectCount} selected
              </span>
            )}
          </div>

          {availableProjects.length === 0 ? (
            <div className="flex items-center justify-center py-3 rounded-lg bg-muted/40 border border-dashed border-border">
              <span className="text-xs text-muted-foreground">
                Chưa có dự án khả dụng
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {availableProjects.map((p) => {
                const selected = selectedProjectIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => onToggleProject(p.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                      selected
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Department filter */}
        <div>
          <div className="flex items-center gap-1.5 mb-2.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">
              Phòng ban
            </span>
            <div className="ml-auto flex items-center gap-2">
              {deptFilterOn && (
                <span className="text-[10px] text-primary font-medium">
                  {isPrivileged
                    ? activeDeptCount > 0
                      ? `${activeDeptCount} selected`
                      : "Tất cả phòng ban"
                    : "Phòng ban của bạn"}
                </span>
              )}
              <Toggle checked={deptFilterOn} onChange={onToggleDeptFilter} />
            </div>
          </div>

          {deptFilterOn && (
            <div
              className={`transition-all duration-200 ${deptFilterOn ? "opacity-100" : "opacity-0"}`}
            >
              {!isPrivileged ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
                  <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-xs text-primary">
                    Chỉ hiển thị kết quả từ phòng ban của bạn
                  </span>
                </div>
              ) : availableDepts.length === 0 ? (
                <div className="flex items-center justify-center py-3 rounded-lg bg-muted/40 border border-dashed border-border">
                  <span className="text-xs text-muted-foreground">
                    Chưa có phòng ban khả dụng
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {availableDepts.map((d) => {
                    const selected = selectedDeptIds.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        onClick={() => onToggleDept(d.id)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                          selected
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                        }`}
                      >
                        {d.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer — clear all */}
      {(activeProjectCount > 0 || deptFilterOn) && (
        <div className="px-4 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {activeProjectCount + (deptFilterOn ? 1 : 0)} bộ lọc
            {activeProjectCount + (deptFilterOn ? 1 : 0) > 1 ? "s" : ""} hoạt động
          </span>
          <button
            onClick={() => {
              selectedProjectIds.forEach((id) => onToggleProject(id));
              if (deptFilterOn) onToggleDeptFilter();
            }}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          >
            <X className="h-3 w-3" />
            Xóa tất cả
          </button>
        </div>
      )}
    </div>
  );
}
