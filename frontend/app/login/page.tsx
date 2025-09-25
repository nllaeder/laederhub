import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { authOptions } from '@/lib/auth';
import { SignInButtons } from './sign-in-buttons';

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect('/hub');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Welcome back</CardTitle>
          <CardDescription>
            Choose a provider below to continue to your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <SignInButtons />
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          Need an account? Signing in will create one automatically.
          <Link href="/" className="ml-1 underline text-primary">
            Return home
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
