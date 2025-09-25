"use client";

import { useTransition } from 'react';
import { signIn } from 'next-auth/react';
import { Github } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function SignInButtons() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleProviderSignIn = (provider: string) => {
    startTransition(async () => {
      try {
        await signIn(provider, { callbackUrl: '/hub' });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Sign-in failed',
          description: error?.message ?? 'Unable to start authentication. Please try again.',
        });
      }
    });
  };

  return (
    <div className="grid gap-3">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => handleProviderSignIn('github')}
        disabled={isPending}
      >
        <Github className="mr-2 h-4 w-4" />
        Continue with GitHub
      </Button>
    </div>
  );
}
