import { Save, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SettingsPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Settings"
        description="Configuration and Options"
        breadcrumbs={[{ label: 'Settings' }]}
        actions={
          <Button className="gap-2">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* RAG Settings */}
          <Card>
            <CardHeader>
              <CardTitle>RAG Configuration</CardTitle>
              <CardDescription>Configure retrieval and generation settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="topK">Top K Results</Label>
                  <Input id="topK" type="number" defaultValue={5} />
                  <p className="text-xs text-muted-foreground">
                    Number of documents to retrieve for each query
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="similarityThreshold">Similarity Threshold</Label>
                  <Input id="similarityThreshold" type="number" step="0.1" defaultValue={0.7} />
                  <p className="text-xs text-muted-foreground">
                    Minimum similarity score (0.0 - 1.0)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="embeddingModel">Embedding Model</Label>
                <Select defaultValue="text-embedding-3-small">
                  <SelectTrigger id="embeddingModel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text-embedding-3-small">text-embedding-3-small</SelectItem>
                    <SelectItem value="text-embedding-3-large">text-embedding-3-large</SelectItem>
                    <SelectItem value="text-embedding-ada-002">text-embedding-ada-002</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Hybrid Search</Label>
                  <p className="text-xs text-muted-foreground">
                    Combine keyword and semantic search
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Document Processing */}
          <Card>
            <CardHeader>
              <CardTitle>Document Processing</CardTitle>
              <CardDescription>Configure ingestion and indexing settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="chunkSize">Chunk Size</Label>
                  <Input id="chunkSize" type="number" defaultValue={512} />
                  <p className="text-xs text-muted-foreground">Maximum tokens per chunk</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chunkOverlap">Chunk Overlap</Label>
                  <Input id="chunkOverlap" type="number" defaultValue={50} />
                  <p className="text-xs text-muted-foreground">Overlap tokens between chunks</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-reindex on Update</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically reindex when documents are updated
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Extract Metadata</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically extract metadata from documents
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Access Control */}
          <Card>
            <CardHeader>
              <CardTitle>Access Control</CardTitle>
              <CardDescription>Configure security and access policies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Approved-Only Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Only show approved documents in search and chat
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Governance Note</AlertTitle>
                <AlertDescription>
                  Approved-Only mode ensures users only see content that has been reviewed and
                  approved by Knowledge Managers. This is recommended for production environments.
                </AlertDescription>
              </Alert>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Audit All Queries</Label>
                  <p className="text-xs text-muted-foreground">
                    Log all user queries for compliance
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                <Input id="sessionTimeout" type="number" defaultValue={60} />
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Configure system notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email on Document Approval</Label>
                  <p className="text-xs text-muted-foreground">
                    Notify document owners when their documents are approved
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email on Document Rejection</Label>
                  <p className="text-xs text-muted-foreground">
                    Notify document owners when their documents are rejected
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Weekly Feedback Digest</Label>
                  <p className="text-xs text-muted-foreground">
                    Send weekly summary of user feedback to KMs
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
