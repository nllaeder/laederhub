import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { integrationTokens, campaigns } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { DisconnectButton } from '@/components/DisconnectButton';

interface CCAccountInfo {
  email: string;
  first_name?: string;
  last_name?: string;
  organization_name?: string;
}

async function getConstantContactAccountInfo(accessToken: string): Promise<CCAccountInfo | null> {
  try {
    const apiBase = process.env.CC_API_BASE;
    if (!apiBase) return null;

    // Use the account details endpoint
    const response = await fetch(`${apiBase}/account/summary`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch CC account info:', response.status);
      // Try contacts endpoint as fallback to get account email
      const contactsResponse = await fetch(`${apiBase}/contacts?limit=1`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!contactsResponse.ok) {
        return null;
      }

      const contactsData = await contactsResponse.json();
      const firstContact = contactsData.contacts?.[0];

      if (firstContact) {
        return {
          email: firstContact.email_address?.address || 'Connected Account',
          first_name: firstContact.first_name,
          last_name: firstContact.last_name,
          organization_name: firstContact.company_name,
        };
      }

      return {
        email: 'Connected Account',
      };
    }

    const data = await response.json();
    return {
      email: data.email || data.contact_email || 'Connected Account',
      first_name: data.first_name,
      last_name: data.last_name,
      organization_name: data.organization_name || data.company_name,
    };
  } catch (error) {
    console.error('Error fetching CC account info:', error);
    return null;
  }
}

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

  // Check if token is expired or missing refresh token
  let isTokenValid = false;
  let needsReconnect = false;

  if (ccToken) {
    const now = new Date();
    const isExpired = ccToken.expiresAt && ccToken.expiresAt <= now;
    const hasRefreshToken = !!ccToken.refreshToken;

    isTokenValid = !isExpired && hasRefreshToken;
    needsReconnect = isExpired || !hasRefreshToken;
  }

  // Fetch CC account info if connected and token is valid
  let ccAccountInfo: CCAccountInfo | null = null;
  if (isConnected && ccToken && isTokenValid) {
    ccAccountInfo = await getConstantContactAccountInfo(ccToken.accessToken);
  }

  // Get campaign count from database
  const campaignCount = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.userId, session.user.id))
    .then(rows => rows.length);

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
            <div className="p-3 border rounded-md">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-medium">Constant Contact</p>
                  {!isConnected && (
                    <p className="text-xs text-gray-500">Not connected</p>
                  )}
                  {isConnected && isTokenValid && (
                    <p className="text-xs text-green-600">✓ Connected</p>
                  )}
                  {isConnected && needsReconnect && (
                    <p className="text-xs text-orange-600">⚠ Reconnection needed</p>
                  )}
                </div>
                {!isConnected || needsReconnect ? (
                  <Link
                    href="/api/cc/authorize"
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    {needsReconnect ? 'Reconnect' : 'Connect'}
                  </Link>
                ) : (
                  <div className="flex gap-2">
                    <Link
                      href="/api/cc/ping"
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Test API
                    </Link>
                    <Link
                      href="/api/cc/sync"
                      className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                      Sync Campaigns
                    </Link>
                  </div>
                )}
              </div>

              {needsReconnect && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  <p className="text-xs text-orange-600">
                    Your connection has expired or needs to be refreshed.
                  </p>
                  <DisconnectButton />
                </div>
              )}

              {isConnected && isTokenValid && ccAccountInfo && (
                <div className="mt-3 pt-3 border-t space-y-1">
                  <p className="text-xs font-medium text-gray-600">Account Details:</p>
                  {ccAccountInfo.organization_name && (
                    <p className="text-sm">
                      <span className="text-gray-500">Organization:</span>{' '}
                      {ccAccountInfo.organization_name}
                    </p>
                  )}
                  <p className="text-sm">
                    <span className="text-gray-500">Email:</span>{' '}
                    {ccAccountInfo.email}
                  </p>
                  {(ccAccountInfo.first_name || ccAccountInfo.last_name) && (
                    <p className="text-sm">
                      <span className="text-gray-500">Name:</span>{' '}
                      {[ccAccountInfo.first_name, ccAccountInfo.last_name]
                        .filter(Boolean)
                        .join(' ')}
                    </p>
                  )}
                </div>
              )}

              {isConnected && isTokenValid && !ccAccountInfo && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-400 italic">
                    Unable to fetch account details
                  </p>
                </div>
              )}

              {isConnected && isTokenValid && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  <p className="text-xs font-medium text-gray-600">
                    Campaigns in database: <span className="text-gray-900">{campaignCount}</span>
                  </p>
                  <DisconnectButton />
                </div>
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
