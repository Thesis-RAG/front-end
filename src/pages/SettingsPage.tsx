// src/pages/SettingsPage.tsx
import { useState } from "react";
import {
  Save,
  AlertTriangle,
  HardDrive,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { extractFolderId, listDriveFiles } from "@/services/drive.api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { ENV } from "@/config/env";

export default function SettingsPage() {
  const { toast } = useToast();
  const { token } = useAuth();

  // ── RAG settings state ───────────────────────────────────────────────
  const [topK, setTopK] = useState<number>(5);
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(0.0);
  const [ragSaving, setRagSaving] = useState(false);

  // ── Access control state ─────────────────────────────────────────────
  const [queryScopeMode, setQueryScopeMode] = useState<"full_db" | "branch_only">("full_db");
  const [accessSaving, setAccessSaving] = useState(false);

  // Load all settings on mount
  useState(() => {
    if (!token) return;
    fetch(`${ENV.API_BASE_URL}/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data["rag.top_k"] !== undefined) setTopK(Number(data["rag.top_k"]));
        if (data["rag.similarity_threshold"] !== undefined)
          setSimilarityThreshold(Number(data["rag.similarity_threshold"]));
        if (data["query_scope_mode"]) setQueryScopeMode(data["query_scope_mode"]);
      })
      .catch(() => {});
  });

  const handleSaveRag = async () => {
    if (!token) return;
    setRagSaving(true);
    try {
      await fetch(`${ENV.API_BASE_URL}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          "rag.top_k": topK,
          "rag.similarity_threshold": similarityThreshold,
        }),
      });
      toast({ title: "Đã lưu cấu hình RAG" });
    } catch {
      toast({ title: "Lỗi lưu cấu hình", variant: "destructive" });
    } finally {
      setRagSaving(false);
    }
  };

  const handleSaveAccess = async () => {
    if (!token) return;
    setAccessSaving(true);
    try {
      await fetch(`${ENV.API_BASE_URL}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query_scope_mode: queryScopeMode }),
      });
      toast({ title: "Đã lưu cấu hình kiểm soát truy cập" });
    } catch {
      toast({ title: "Lỗi lưu cấu hình", variant: "destructive" });
    } finally {
      setAccessSaving(false);
    }
  };

  // ── Drive state ──────────────────────────────────────────────────────
  const [driveFolderUrl, setDriveFolderUrl] = useState<string>(
    () => localStorage.getItem("drive_folder_url") ?? "",
  );
  const [driveVerifying, setDriveVerifying] = useState(false);
  const [driveStatus, setDriveStatus] = useState<"idle" | "ok" | "error">(() =>
    localStorage.getItem("drive_folder_url") ? "ok" : "idle",
  );
  const [driveFileCount, setDriveFileCount] = useState<number | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);

  const handleVerifyDrive = async () => {
    const folderId = extractFolderId(driveFolderUrl);
    if (!folderId) {
      setDriveStatus("error");
      setDriveError("Link không hợp lệ. Vui lòng kiểm tra lại.");
      return;
    }
    setDriveVerifying(true);
    setDriveStatus("idle");
    setDriveError(null);
    try {
      const files = await listDriveFiles(folderId);
      localStorage.setItem("drive_folder_url", driveFolderUrl.trim());
      setDriveStatus("ok");
      setDriveFileCount(files.length);
      toast({ title: `Kết nối thành công! Tìm thấy ${files.length} file.` });
    } catch (err: any) {
      setDriveStatus("error");
      setDriveError(err.message ?? "Không thể kết nối Drive.");
    } finally {
      setDriveVerifying(false);
    }
  };

  const handleClearDrive = () => {
    localStorage.removeItem("drive_folder_url");
    setDriveFolderUrl("");
    setDriveStatus("idle");
    setDriveFileCount(null);
    setDriveError(null);
    toast({ title: "Đã xóa cấu hình Drive." });
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Cài đặt"
        description="Quản lý cấu hình hệ thống và tích hợp"
        actions={
          <Button className="gap-2">
            <Save className="h-4 w-4" />
            Lưu thay đổi
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* ── Google Drive Integration ─────────────────────────────── */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div>
                  <CardTitle className="mb-2">Tích hợp Google Drive</CardTitle>
                  <CardDescription>
                    Kết nối thư mục Google Drive để đính kèm tệp vào cuộc trò
                    chuyện.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="driveFolderUrl">Link chia sẻ thư mục</Label>
                <div className="flex gap-2">
                  <Input
                    id="driveFolderUrl"
                    value={driveFolderUrl}
                    onChange={(e) => {
                      setDriveFolderUrl(e.target.value);
                      setDriveStatus("idle");
                    }}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className={cn(
                      "flex-1",
                      driveStatus === "ok" &&
                        "border-green-500 focus-visible:ring-green-500",
                      driveStatus === "error" &&
                        "border-destructive focus-visible:ring-destructive",
                    )}
                  />
                  <Button
                    variant="secondary"
                    onClick={handleVerifyDrive}
                    disabled={driveVerifying || !driveFolderUrl.trim()}
                    className="shrink-0"
                  >
                    {driveVerifying ? "Đang xác minh..." : "Xác minh"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Thư mục phải được chia sẻ với quyền{" "}
                  <span className="font-medium text-foreground">
                    "Bất kỳ ai có đường link đều có thể xem"
                  </span>{" "}
                  trong Google Drive.{" "}
                  <a
                    href="https://support.google.com/drive/answer/2494822"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-primary hover:underline"
                  >
                    Hướng dẫn
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>

              {/* Status */}
              {driveStatus === "ok" && (
                <div className="flex items-start gap-2 rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-green-700 dark:text-green-400">
                      Kết nối thành công
                    </p>
                    {driveFileCount !== null && (
                      <p className="text-xs text-green-600 dark:text-green-500">
                        Tìm thấy {driveFileCount} tệp trong thư mục. Bạn có thể
                        dùng biểu tượng <HardDrive className="inline h-3 w-3" />{" "}
                        trong chat để chọn tệp.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {driveStatus === "error" && driveError && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-destructive">
                      Lỗi kết nối
                    </p>
                    <p className="text-xs text-destructive/80">{driveError}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center">
                {driveStatus === "ok" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearDrive}
                    className="ml-auto text-white bg-red-500 hover:text-destructive text-xs"
                  >
                    Xóa cấu hình Drive
                  </Button>
                )}
              </div>

              {/* Env key note
              <Alert className="bg-muted/50 border-border">
                <AlertTriangle className="h-4 w-4 !text-yellow-600" />
                <AlertTitle className="text-yellow-600 text-xs">
                  Yêu cầu cấu hình
                </AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground">
                  Tạo API key tại{" "}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Google Cloud Console
                  </a>
                  , bật Google Drive API và giới hạn truy cập theo HTTP referrer
                  của ứng dụng.
                </AlertDescription>
              </Alert> */}
            </CardContent>
          </Card>

          {/* RAG Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Cấu hình RAG</CardTitle>
              <CardDescription>
                Cấu hình các thông số truy xuất và sinh văn bản
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="topK">Số kết quả Top-K</Label>
                  <Input
                    id="topK"
                    type="number"
                    min={1}
                    max={20}
                    value={topK}
                    onChange={(e) => setTopK(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Số lượng tài liệu được truy xuất cho mỗi câu hỏi
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="similarityThreshold">
                    Ngưỡng độ tương đồng
                  </Label>
                  <Input
                    id="similarityThreshold"
                    type="number"
                    step="0.05"
                    min={0}
                    max={1}
                    value={similarityThreshold}
                    onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Chunk có score thấp hơn ngưỡng này sẽ bị loại (0.0 = không lọc)
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={handleSaveRag} disabled={ragSaving}>
                  {ragSaving
                    ? <><Save className="mr-2 h-4 w-4 animate-spin" />Đang lưu...</>
                    : <><Save className="mr-2 h-4 w-4" />Lưu cấu hình RAG</>}
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="embeddingModel">Mô hình Embedding</Label>
                <Select defaultValue="text-embedding-3-small">
                  <SelectTrigger id="embeddingModel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text-embedding-3-small">
                      text-embedding-3-small
                    </SelectItem>
                    <SelectItem value="text-embedding-3-large">
                      text-embedding-3-large
                    </SelectItem>
                    <SelectItem value="text-embedding-ada-002">
                      text-embedding-ada-002
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Tìm kiếm Hybrid</Label>
                  <p className="text-xs text-muted-foreground">
                    Kết hợp tìm kiếm theo từ khóa và ngữ nghĩa
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Document Processing */}
          <Card>
            <CardHeader>
              <CardTitle>Xử lý tài liệu</CardTitle>
              <CardDescription>
                Cấu hình các thông số nhập liệu và lập chỉ mục
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="chunkSize">Kích thước chunk</Label>
                  <Input id="chunkSize" type="number" defaultValue={512} />
                  <p className="text-xs text-muted-foreground">
                    Số token tối đa mỗi chunk
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chunkOverlap">Độ chồng lấp chunk</Label>
                  <Input id="chunkOverlap" type="number" defaultValue={50} />
                  <p className="text-xs text-muted-foreground">
                    Số token chồng lấp giữa các chunk
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Tự động lập chỉ mục khi cập nhật</Label>
                  <p className="text-xs text-muted-foreground">
                    Tự động lập lại chỉ mục khi tài liệu được cập nhật
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Trích xuất siêu dữ liệu</Label>
                  <p className="text-xs text-muted-foreground">
                    Tự động trích xuất siêu dữ liệu từ tài liệu
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Access Control */}
          <Card>
            <CardHeader>
              <CardTitle>Kiểm soát truy cập</CardTitle>
              <CardDescription>
                Cấu hình chính sách bảo mật và phân quyền
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Query scope mode */}
              <div className="space-y-2">
                <div>
                  <Label>Phạm vi truy vấn RAG</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tập tài liệu được tìm kiếm khi người dùng đặt câu hỏi
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {(["full_db", "branch_only"] as const).map((mode) => (
                    <label
                      key={mode}
                      className={cn(
                        "flex items-start gap-3 rounded-lg border-2 px-4 py-3 cursor-pointer transition-colors",
                        queryScopeMode === mode
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/40"
                      )}
                    >
                      <input
                        type="radio"
                        name="queryScopeMode"
                        value={mode}
                        checked={queryScopeMode === mode}
                        onChange={() => setQueryScopeMode(mode)}
                        className="mt-0.5 accent-primary"
                      />
                      <div>
                        <p className="text-sm font-medium leading-none">
                          {mode === "full_db" ? "Toàn bộ hệ thống" : "Trong nhánh tổ chức"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1.5 leading-snug">
                          {mode === "full_db"
                            ? "Tìm kiếm tất cả tài liệu trong tổ chức."
                            : "Chỉ tìm kiếm tài liệu thuộc phạm vi của người dùng."}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleSaveAccess} disabled={accessSaving}>
                    {accessSaving ? "Đang lưu..." : <><Save className="mr-1.5 h-3.5 w-3.5" />Lưu</>}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Chế độ chỉ hiển thị tài liệu đã duyệt</Label>
                  <p className="text-xs text-muted-foreground">
                    Chỉ hiển thị tài liệu đã được phê duyệt trong tìm kiếm và
                    chat
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4 !text-yellow-600" />
                <AlertTitle className="text-yellow-600">
                  Lưu ý về quản trị
                </AlertTitle>
                <AlertDescription className="text-yellow-600">
                  Chế độ chỉ hiển thị tài liệu đã duyệt đảm bảo người dùng chỉ
                  thấy nội dung đã được Quản lý Tri thức xem xét và phê duyệt.
                  Khuyến nghị bật cho môi trường production.
                </AlertDescription>
              </Alert>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Ghi nhật ký tất cả truy vấn</Label>
                  <p className="text-xs text-muted-foreground">
                    Lưu lại toàn bộ truy vấn của người dùng phục vụ tuân thủ
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">
                  Thời gian hết phiên (phút)
                </Label>
                <Input id="sessionTimeout" type="number" defaultValue={60} />
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Thông báo</CardTitle>
              <CardDescription>Cấu hình thông báo hệ thống</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email khi tài liệu được duyệt</Label>
                  <p className="text-xs text-muted-foreground">
                    Thông báo cho chủ tài liệu khi tài liệu được phê duyệt
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email khi tài liệu bị từ chối</Label>
                  <p className="text-xs text-muted-foreground">
                    Thông báo cho chủ tài liệu khi tài liệu bị từ chối
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Tổng hợp phản hồi hàng tuần</Label>
                  <p className="text-xs text-muted-foreground">
                    Gửi tóm tắt phản hồi người dùng hàng tuần đến Quản lý Tri
                    thức
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
