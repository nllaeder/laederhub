import type { LucideIcon } from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface Source {
  name: string;
  status: 'connected' | 'pending' | 'error';
  Icon: LucideIcon;
}
