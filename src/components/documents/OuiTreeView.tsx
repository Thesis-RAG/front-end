/** OuiTreeView: hierarchical org-unit document browser with expand/collapse nodes. */
import { useState, useMemo } from "react";
import { Building2, ChevronRight, FileText, Network } from "lucide-react";
import { OrgUnit, OrgUnitInstance } from "@/services/org_units.api";
import { DocumentRead } from "@/types/documents";
import { DocumentStatus } from "@/types";
import { SensitivityBadge } from "./SensitivityBadge";
import { StatusBadge } from "@/components/ui/status-badge";

export interface OuiNode {
  oui: OrgUnitInstance;
  children: OuiNode[];
  docs: DocumentRead[];
}

// Build a tree of OuiNodes from a flat list of OUIs and documents.
export function buildOuiTree(
  ouis: OrgUnitInstance[],
  docs: DocumentRead[],
): OuiNode[] {
  const nodeMap = new Map<string, OuiNode>();
  for (const oui of ouis) {
    nodeMap.set(oui.id, {
      oui,
      children: [],
      docs: docs.filter((d) => d.oui_ids.includes(oui.id)),
    });
  }
  const roots: OuiNode[] = [];
  for (const oui of ouis) {
    const node = nodeMap.get(oui.id)!;
    if (oui.parent_oui_ids.length === 0) {
      roots.push(node);
    } else {
      let placed = false;
      for (const parentId of oui.parent_oui_ids) {
        const parent = nodeMap.get(parentId);
        if (parent) {
          parent.children.push(node);
          placed = true;
        }
      }
      if (!placed) roots.push(node);
    }
  }
  return roots;
}

// Count total documents in a node's subtree.
function countAllDocs(node: OuiNode): number {
  return (
    node.docs.length +
    node.children.reduce((s, c) => s + countAllDocs(c), 0)
  );
}

// Recursive tree node with expand/collapse.
export function OuiTreeNode({
  node,
  orgUnits,
  depth,
  onView,
}: {
  node: OuiNode;
  orgUnits: OrgUnit[];
  depth: number;
  onView: (doc: DocumentRead) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const ou = orgUnits.find((u) => u.id === node.oui.ou_id);
  const totalDocs = countAllDocs(node);
  const hasChildren = node.children.length > 0 || node.docs.length > 0;

  return (
    <div className={depth > 0 ? "ml-5 border-l border-border/60" : ""}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors"
      >
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-150 ${expanded ? "rotate-90" : ""} ${!hasChildren ? "opacity-0" : ""}`}
        />
        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="font-medium text-sm">{node.oui.name}</span>
        {ou && (
          <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
            {ou.name}
          </span>
        )}
        {totalDocs > 0 && (
          <span className="ml-auto text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">
            {totalDocs}
          </span>
        )}
      </button>

      {expanded && (
        <div>
          {node.children.map((child) => (
            <OuiTreeNode
              key={child.oui.id}
              node={child}
              orgUnits={orgUnits}
              depth={depth + 1}
              onView={onView}
            />
          ))}
          {node.docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-2.5 pl-10 pr-3 py-1.5 hover:bg-muted/30 transition-colors"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <button
                onClick={() => onView(doc)}
                className="text-sm text-foreground hover:text-primary transition-colors flex-1 text-left line-clamp-1"
              >
                {doc.title}
              </button>
              <SensitivityBadge level={doc.sensitivity} />
              <StatusBadge status={doc.status as DocumentStatus} />
            </div>
          ))}
          {node.docs.length === 0 && node.children.length === 0 && (
            <p className="pl-10 py-1.5 text-xs text-muted-foreground">
              Không có tài liệu
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Top-level tree view wrapping all root OUI nodes and unassigned documents.
export function TreeView({
  documents,
  orgUnits,
  orgUnitInstances,
  onView,
}: {
  documents: DocumentRead[];
  orgUnits: OrgUnit[];
  orgUnitInstances: OrgUnitInstance[];
  onView: (doc: DocumentRead) => void;
}) {
  const roots = useMemo(
    () => buildOuiTree(orgUnitInstances, documents),
    [orgUnitInstances, documents],
  );

  const unassigned = useMemo(
    () => documents.filter((d) => d.oui_ids.length === 0),
    [documents],
  );

  if (roots.length === 0 && unassigned.length === 0) {
    return (
      <div className="flex flex-col items-center text-muted-foreground gap-2 py-16">
        <Network className="h-12 w-12 text-muted" />
        <p className="text-sm">Chưa có cơ cấu tổ chức</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden divide-y divide-border/50">
      {roots.map((node) => (
        <OuiTreeNode
          key={node.oui.id}
          node={node}
          orgUnits={orgUnits}
          depth={0}
          onView={onView}
        />
      ))}
      {unassigned.length > 0 && (
        <div>
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4 shrink-0" />
            <span className="font-medium">Chưa phân loại</span>
            <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full">
              {unassigned.length}
            </span>
          </div>
          {unassigned.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-2.5 pl-10 pr-3 py-1.5 hover:bg-muted/30 transition-colors"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <button
                onClick={() => onView(doc)}
                className="text-sm text-foreground hover:text-primary transition-colors flex-1 text-left line-clamp-1"
              >
                {doc.title}
              </button>
              <SensitivityBadge level={doc.sensitivity} />
              <StatusBadge status={doc.status as DocumentStatus} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
