import {
  FileText,
  FileSpreadsheet,
  FileImage,
  FileCode,
  Presentation,
  type LucideIcon,
} from "lucide-react";

export interface FileTypeStyle {
  bg: string;
  iconCls: string;
  Icon: LucideIcon;
}

const TYPE_MAP: Record<string, FileTypeStyle> = {
  pdf:  { bg: "bg-red-100",     iconCls: "text-red-600",     Icon: FileText        },
  doc:  { bg: "bg-blue-100",    iconCls: "text-blue-600",    Icon: FileText        },
  docx: { bg: "bg-blue-100",    iconCls: "text-blue-600",    Icon: FileText        },
  xls:  { bg: "bg-green-100",   iconCls: "text-green-600",   Icon: FileSpreadsheet },
  xlsx: { bg: "bg-green-100",   iconCls: "text-green-600",   Icon: FileSpreadsheet },
  csv:  { bg: "bg-emerald-100", iconCls: "text-emerald-600", Icon: FileSpreadsheet },
  ppt:  { bg: "bg-orange-100",  iconCls: "text-orange-600",  Icon: Presentation    },
  pptx: { bg: "bg-orange-100",  iconCls: "text-orange-600",  Icon: Presentation    },
  txt:  { bg: "bg-gray-100",    iconCls: "text-gray-600",    Icon: FileText        },
  md:   { bg: "bg-slate-100",   iconCls: "text-slate-600",   Icon: FileCode        },
  png:  { bg: "bg-purple-100",  iconCls: "text-purple-600",  Icon: FileImage       },
  jpg:  { bg: "bg-purple-100",  iconCls: "text-purple-600",  Icon: FileImage       },
  jpeg: { bg: "bg-purple-100",  iconCls: "text-purple-600",  Icon: FileImage       },
};

const FALLBACK: FileTypeStyle[] = [
  { bg: "bg-blue-100",   iconCls: "text-blue-600",   Icon: FileText        },
  { bg: "bg-green-100",  iconCls: "text-green-600",  Icon: FileSpreadsheet },
  { bg: "bg-orange-100", iconCls: "text-orange-600", Icon: FileText        },
  { bg: "bg-purple-100", iconCls: "text-purple-600", Icon: FileText        },
  { bg: "bg-teal-100",   iconCls: "text-teal-600",   Icon: FileText        },
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  return h;
}

/** Map a document_type (file extension or "general") to icon style. */
export function getFileTypeStyle(documentType: string, fallbackId = ""): FileTypeStyle {
  const ext = documentType.toLowerCase().replace(/^\./, "");
  if (TYPE_MAP[ext]) return TYPE_MAP[ext];
  return FALLBACK[hashStr(fallbackId || ext) % FALLBACK.length];
}

/** Extract lowercase extension from a filename. */
export function extFromFileName(fileName: string): string {
  const m = fileName.match(/\.([^.]+)$/);
  return m ? m[1].toLowerCase() : "general";
}
