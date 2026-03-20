import { useState } from 'react';
import { Search, Download, Filter, ExternalLink, CheckCircle, AlertTriangle, ShieldX, Copy, Check } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockAuditLogs, mockJobs } from '@/data/mockData';
import { AuditLogEntry, Job } from '@/types';
import { cn } from '@/lib/utils';

export default function AuditPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Audit & Jobs"
        description="Query and processing monitoring"
        breadcrumbs={[{ label: 'Audit & Jobs' }]}
      />

      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="queries" className="h-full flex flex-col">
          <div className="border-b border-border px-6">
            <TabsList className="mt-2">
              <TabsTrigger value="queries">Query Logs</TabsTrigger>
              <TabsTrigger value="jobs">Job Monitor</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="queries" className="flex-1 p-6 mt-0">
            <QueryLogsTab />
          </TabsContent>

          <TabsContent value="jobs" className="flex-1 p-6 mt-0">
            <JobsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function QueryLogsTab() {
  const [logs] = useState<AuditLogEntry[]>(mockAuditLogs);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.traceId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const copyTraceId = (traceId: string) => {
    navigator.clipboard.writeText(traceId);
    setCopiedId(traceId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-status-approved" />;
      case 'no-answer':
        return <AlertTriangle className="h-4 w-4 text-status-draft" />;
      case 'no-permission':
        return <ShieldX className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'success':
        return 'Success';
      case 'no-answer':
        return 'No Answer';
      case 'no-permission':
        return 'No Permission';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search queries, users, trace IDs..."
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="no-answer">No Answer</SelectItem>
            <SelectItem value="no-permission">No Permission</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead className="w-[30%]">Query</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Docs</TableHead>
              <TableHead>Citations</TableHead>
              <TableHead>Latency</TableHead>
              <TableHead>Trace ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {formatDate(log.timestamp)}
                </TableCell>
                <TableCell className="font-medium">{log.userName}</TableCell>
                <TableCell className="max-w-[300px] truncate" title={log.query}>
                  {log.query}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {getStatusIcon(log.status)}
                    <span className="text-sm">{getStatusLabel(log.status)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">{log.documentsRetrieved}</TableCell>
                <TableCell className="text-center">{log.citations}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {log.latencyMs}ms
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {log.traceId.slice(0, 12)}...
                    </code>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyTraceId(log.traceId)}
                        >
                          {copiedId === log.traceId ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy trace ID</TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function JobsTab() {
  const [jobs] = useState<Job[]>(mockJobs);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const getStatusBadge = (status: Job['status']) => {
    const config = {
      queued: { className: 'bg-muted text-muted-foreground', label: 'Queued' },
      running: { className: 'bg-primary/15 text-primary animate-pulse', label: 'Running' },
      succeeded: { className: 'bg-status-approved/15 text-status-approved', label: 'Succeeded' },
      failed: { className: 'bg-destructive/15 text-destructive', label: 'Failed' },
    };
    const { className, label } = config[status];
    return <Badge className={cn('font-normal', className)}>{label}</Badge>;
  };

  const getTypeBadge = (type: Job['type']) => {
    const labels: Record<Job['type'], string> = {
      ingestion: 'Ingestion',
      indexing: 'Indexing',
      embedding: 'Embedding',
      cleanup: 'Cleanup',
    };
    return (
      <Badge variant="outline" className="font-normal">
        {labels[type]}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {['queued', 'running', 'succeeded', 'failed'].map((status) => {
          const count = jobs.filter((j) => j.status === status).length;
          return (
            <div key={status} className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground capitalize">{status}</p>
              <p className="mt-1 text-2xl font-semibold">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Document</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Retries</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Ended</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{job.id}</code>
                </TableCell>
                <TableCell>{getTypeBadge(job.type)}</TableCell>
                <TableCell>
                  {job.documentId && (
                    <div className="text-sm">
                      <code className="text-xs">{job.documentId.slice(0, 8)}...</code>
                      {job.versionId && (
                        <span className="text-muted-foreground ml-1">({job.versionId})</span>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>{getStatusBadge(job.status)}</TableCell>
                <TableCell className="text-center">{job.retryCount}</TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {formatDate(job.startedAt)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {formatDate(job.endedAt)}
                </TableCell>
                <TableCell>
                  {job.status === 'failed' && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm">
                          Retry
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-medium">Error:</p>
                        <p className="text-xs">{job.error}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {job.status === 'running' && (
                    <Button variant="outline" size="sm">
                      Cancel
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
