import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

import { HubHeader } from '@/components/hub/Header';
import { authOptions } from '@/lib/auth';

interface HubLayoutProps {
  children: ReactNode;
}

export default async function HubLayout({ children }: HubLayoutProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <HubHeader />
      {children}
    </div>
  );
}
