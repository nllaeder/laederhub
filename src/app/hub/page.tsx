import { SourceIndicator } from '@/components/hub/SourceIndicator';
import { ChatPanel } from '@/components/hub/ChatPanel';

export default function HubPage() {
  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <SourceIndicator />
      <div className="flex-1 overflow-hidden">
        <ChatPanel />
      </div>
    </main>
  );
}
