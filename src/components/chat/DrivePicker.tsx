/** DrivePicker: modal file picker for a shared Google Drive folder with search, type filtering, and text extraction. */
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  HardDrive,
  X,
  Search,
  FileText,
  FileSpreadsheet,
  File,
  Loader2,
  AlertCircle,
  FolderOpen,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  DriveFile,
  listDriveFiles,
  downloadDriveFileText,
  getMimeLabel,
  isFileSupported,
  extractFolderId,
} from "@/services/drive.api";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface DrivePickerProps {
  onAttach: (text: string, name: string) => void;
  onClose: () => void;
}

// Return the appropriate Lucide icon component for a given MIME type.
function getMimeIcon(mimeType: string) {
  if (mimeType.includes("spreadsheet") || mimeType.includes("csv")) {
    return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
  }
  if (
    mimeType.includes("document") ||
    mimeType.includes("pdf") ||
    mimeType.includes("text")
  ) {
    return <FileText className="h-4 w-4 text-blue-500" />;
  }
  return <File className="h-4 w-4 text-muted-foreground" />;
}

// Convert a raw byte-count string to a human-readable size label (B / KB / MB).
function formatSize(size?: string): string {
  if (!size) return "";
  const bytes = parseInt(size, 10);
  if (isNaN(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Drive file picker modal: loads files from a shared Drive folder URL and passes extracted text to the parent.
export function DrivePicker({ onAttach, onClose }: DrivePickerProps) {
  const { toast } = useToast();
  const [folderUrl, setFolderUrl] = useState<string>(() => {
    return localStorage.getItem("drive_folder_url") ?? "";
  });
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load the file list on mount if a Drive folder URL was previously saved in localStorage.
  useEffect(() => {
    const saved = localStorage.getItem("drive_folder_url");
    if (saved) {
      loadFiles(saved);
    }
  }, []);

  // Close the picker when the user clicks outside the modal container.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Fetch files from the Drive folder identified by the given URL; updates loading/error state.
  const loadFiles = async (url: string) => {
    const folderId = extractFolderId(url);
    if (!folderId) {
      setError("Link Drive không hợp lệ. Vui lòng kiểm tra lại.");
      return;
    }
    setLoading(true);
    setError(null);
    setFiles([]);
    try {
      const result = await listDriveFiles(folderId);
      setFiles(result);
      if (result.length === 0) {
        setError("Folder trống hoặc không có file nào được phép xem.");
      }
    } catch (err: any) {
      setError(err.message ?? "Không thể tải danh sách file.");
    } finally {
      setLoading(false);
    }
  };

  // Persist the folder URL to localStorage and trigger a file list refresh.
  const handleLoadFromInput = () => {
    if (!folderUrl.trim()) return;
    localStorage.setItem("drive_folder_url", folderUrl.trim());
    loadFiles(folderUrl.trim());
  };

  // Download the selected Drive file as plain text and pass it to the parent via onAttach.
  const handleSelectFile = async (file: DriveFile) => {
    if (!isFileSupported(file)) {
      toast({
        title: "Định dạng không hỗ trợ",
        description: `File ${getMimeLabel(file.mimeType)} chưa được hỗ trợ đọc nội dung.`,
      });
      return;
    }

    setLoadingFileId(file.id);
    try {
      const text = await downloadDriveFileText(file);
      if (!text.trim()) {
        toast({ title: "File trống hoặc không đọc được nội dung." });
        return;
      }
      onAttach(text, file.name);
      onClose();
      toast({ title: `Đã đính kèm: ${file.name}` });
    } catch (err: any) {
      toast({
        title: "Không tải được file",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoadingFileId(null);
    }
  };

  // Client-side search filter applied on top of the loaded file list.
  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return createPortal(
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={containerRef}
        className={cn(
          "relative z-10 w-full max-w-md rounded-xl border border-border bg-background shadow-2xl",
          "flex flex-col max-h-[80vh]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <HardDrive className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Google Drive</p>
              <p className="text-xs text-muted-foreground">Choose file to attach</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Folder URL input */}
        <div className="border-b border-border p-3">
          <div className="flex gap-2">
            <Input
              value={folderUrl}
              onChange={(e) => setFolderUrl(e.target.value)}
              placeholder="Link Google Drive folder..."
              className="h-8 text-xs"
              onKeyDown={(e) => e.key === "Enter" && handleLoadFromInput()}
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={handleLoadFromInput}
              disabled={loading || !folderUrl.trim()}
              className="h-8 px-3 shrink-0 text-xs"
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <FolderOpen className="h-3 w-3 mr-1" />
                  Tải
                </>
              )}
            </Button>
          </div>
          {files.length > 0 && (
            <div className="mt-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search file..."
                  className="h-7 pl-7 text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* File list */}
        <ScrollArea className="flex-1 min-h-0">
          {error && (
            <div className="flex flex-col items-center gap-2 p-6 text-center">
              <AlertCircle className="h-8 w-8 text-destructive/70" />
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 p-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading files...</p>
            </div>
          )}

          {!loading && !error && files.length === 0 && (
            <div className="flex flex-col items-center gap-2 p-8 text-center">
              <HardDrive className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">
                Enter link Google Drive folder above to view files
              </p>
              <p className="text-xs text-muted-foreground/60">
                Folder must be shared with "Anyone with the link can view"
              </p>
            </div>
          )}

          {filteredFiles.length > 0 && (
            <div className="p-2 space-y-0.5">
              {filteredFiles.map((file) => {
                const supported = isFileSupported(file);
                const isLoadingThis = loadingFileId === file.id;
                return (
                  <button
                    key={file.id}
                    disabled={!supported || !!loadingFileId}
                    onClick={() => handleSelectFile(file)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      supported
                        ? "hover:bg-muted cursor-pointer"
                        : "opacity-40 cursor-not-allowed",
                      isLoadingThis && "bg-muted"
                    )}
                  >
                    <div className="shrink-0">
                      {isLoadingThis ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        getMimeIcon(file.mimeType)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(file.size)}
                        {file.modifiedTime && (
                          <>
                            {" · "}
                            {new Date(file.modifiedTime).toLocaleDateString("vi-VN")}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4"
                      >
                        {getMimeLabel(file.mimeType)}
                      </Badge>
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {supported && !isLoadingThis && (
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {files.length > 0 && (
          <div className="border-t border-border p-3">
            <p className="text-center text-xs text-muted-foreground">
              {filteredFiles.length} file
              {filteredFiles.length !== files.length && ` / ${files.length} tổng`}
              {" · "}Only supported files can be attached to chat.
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}