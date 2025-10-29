import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { integrationTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/api/auth/signin');
  }

  // Check if user has connected Constant Contact
  const [ccToken] = await db
    .select()
    .from(integrationTokens)
    .where(eq(integrationTokens.userId, session.user.id))
    .limit(1);

  const isConnected = !!ccToken;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6 rounded-lg border p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Welcome to LaederHub</h1>

        <div className="space-y-2">
          <p className="text-sm text-gray-600">Signed in as:</p>
          <p className="font-medium">{session.user.name}</p>
          <p className="text-sm text-gray-500">{session.user.email}</p>
        </div>

        <div className="border-t pt-6 space-y-4">
          <h2 className="text-lg font-semibold">Integrations</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <p className="font-medium">Constant Contact</p>
                <p className="text-xs text-gray-500">
                  {isConnected ? 'Connected' : 'Not connected'}
                </p>
              </div>
              {isConnected ? (
                <Link
                  href="/api/cc/ping"
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Test API
                </Link>
              ) : (
                <Link
                  href="/api/cc/authorize"
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Connect
                </Link>
              )}
            </div>
          </div>
        </div>

        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="w-full rounded-md bg-gray-900 px-4 py-2 text-white hover:bg-gray-800"
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );
}
