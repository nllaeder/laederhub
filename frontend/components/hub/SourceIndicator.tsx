import type { Source } from '@shared/schemas';
import { CheckCircle2, Clock3, XCircle, Database, Mail, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const sources: Source[] = [
  { name: 'Primary Database', status: 'connected', Icon: Database },
  { name: 'Email Marketing', status: 'pending', Icon: Mail },
  { name: 'Web Analytics', status: 'error', Icon: BarChart2 },
];

function StatusIcon({ status }: { status: Source['status'] }) {
  switch (status) {
    case 'connected':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'pending':
      return <Clock3 className="h-4 w-4 text-yellow-500 animate-spin" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
  }
}

export function SourceIndicator() {
  return (
    <div className="flex h-12 items-center justify-center gap-6 border-b bg-card px-4 md:px-6 shrink-0">
      <TooltipProvider delayDuration={0}>
        {sources.map((source) => (
          <Tooltip key={source.name}>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 cursor-default">
                <source.Icon className="h-5 w-5 text-muted-foreground" />
                <StatusIcon status={source.status} />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="capitalize">{source.name}: {source.status}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
}
