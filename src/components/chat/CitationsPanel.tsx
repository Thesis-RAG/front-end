import { X, FileText, ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Citation } from '@/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface CitationsPanelProps {
  citation: Citation | null;
  onClose: () => void;
}

export function CitationsPanel({ citation, onClose }: CitationsPanelProps) {
  const [copied, setCopied] = useState(false);

  if (!citation) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(`${citation.documentId}:${citation.versionId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full w-96 flex-col border-l border-border bg-card animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Source Document</span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        {/* Document info */}
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-foreground">{citation.documentTitle}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{citation.sectionPath}</p>
          </div>

          {/* IDs */}
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1">
              <span className="text-muted-foreground">Doc:</span>
              <code className="font-mono">{citation.documentId.slice(0, 8)}...</code>
            </div>
            <div className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1">
              <span className="text-muted-foreground">Ver:</span>
              <code className="font-mono">{citation.versionId.slice(0, 8)}...</code>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleCopyId}
            >
              {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
              Copy IDs
            </Button>
          </div>

          {/* Relevance score */}
          {citation.score && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Relevance:</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${citation.score * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium">{Math.round(citation.score * 100)}%</span>
            </div>
          )}

          {/* Snippet */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Highlighted Excerpt
            </p>
            <div className="citation-highlight rounded-md bg-citation-bg/50 p-3 text-sm leading-relaxed">
              {citation.snippet}
            </div>
          </div>

          {/* Context (mock) */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Surrounding Context
            </p>
            <div className="rounded-md border border-border p-3 text-sm text-muted-foreground leading-relaxed">
              <p className="mb-2 italic">
                [Paragraph before the excerpt would be shown here for context...]
              </p>
              <p className="border-l-2 border-primary pl-3 text-foreground not-italic">
                {citation.snippet}
              </p>
              <p className="mt-2 italic">
                [Paragraph after the excerpt would be shown here for context...]
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <Button className="w-full gap-2" variant="outline" asChild>
          <a href={`/documents/${citation.documentId}`} target="_blank" rel="noopener">
            <ExternalLink className="h-4 w-4" />
            Open Full Document
          </a>
        </Button>
      </div>
    </div>
  );
}
