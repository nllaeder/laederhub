import { auth } from '@/auth';
import { db } from '@/db/client';
import { integrationTokens } from '@/db/schema';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

interface TokenRefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

async function refreshAccessToken(
  userId: string,
  refreshToken: string
): Promise<{ accessToken: string; expiresAt: Date } | null> {
  try {
    const clientId = process.env.CC_CLIENT_ID;
    const clientSecret = process.env.CC_CLIENT_SECRET;
    const authBase = process.env.CC_AUTH_BASE;

    if (!clientId || !clientSecret || !authBase) {
      console.error('Missing OAuth configuration for token refresh');
      return null;
    }

    const tokenUrl = `${authBase}/v1/token`;
    const tokenParams = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token refresh failed:', response.status, errorText);
      return null;
    }

    const tokens: TokenRefreshResponse = await response.json();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Update tokens in database
    await db
      .update(integrationTokens)
      .set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
      })
      .where(eq(integrationTokens.userId, userId));

    return {
      accessToken: tokens.access_token,
      expiresAt,
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return null;
  }
}

export async function GET() {
  try {
    // Ensure user is authenticated
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in first' },
        { status: 401 }
      );
    }

    // Retrieve stored tokens
    const [tokenRecord] = await db
      .select()
      .from(integrationTokens)
      .where(eq(integrationTokens.userId, session.user.id))
      .limit(1);

    if (!tokenRecord) {
      return NextResponse.json(
        { error: 'No Constant Contact connection found. Please authorize first.' },
        { status: 404 }
      );
    }

    let accessToken = tokenRecord.accessToken;
    const now = new Date();

    // Check if token is expired or about to expire (within 5 minutes)
    const expiryThreshold = new Date(now.getTime() + 5 * 60 * 1000);
    const isExpired = tokenRecord.expiresAt && tokenRecord.expiresAt <= expiryThreshold;

    if (isExpired && tokenRecord.refreshToken) {
      console.log('Access token expired or expiring soon, refreshing...');
      const refreshed = await refreshAccessToken(
        session.user.id,
        tokenRecord.refreshToken
      );

      if (!refreshed) {
        return NextResponse.json(
          {
            error: 'Failed to refresh access token. Please re-authorize.',
            needsReauth: true,
          },
          { status: 401 }
        );
      }

      accessToken = refreshed.accessToken;
    }

    // Make API request to Constant Contact
    const apiBase = process.env.CC_API_BASE;
    if (!apiBase) {
      return NextResponse.json(
        { error: 'Server configuration error - missing API base URL' },
        { status: 500 }
      );
    }

    const apiUrl = `${apiBase}/contacts?limit=5`;
    const apiResponse = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('Constant Contact API error:', apiResponse.status, errorText);

      // If 401, try refreshing token once
      if (apiResponse.status === 401 && tokenRecord.refreshToken) {
        console.log('Received 401, attempting token refresh...');
        const refreshed = await refreshAccessToken(
          session.user.id,
          tokenRecord.refreshToken
        );

        if (!refreshed) {
          return NextResponse.json(
            {
              error: 'Authentication failed. Please re-authorize.',
              needsReauth: true,
            },
            { status: 401 }
          );
        }

        // Retry with new token
        const retryResponse = await fetch(apiUrl, {
          headers: {
            Authorization: `Bearer ${refreshed.accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!retryResponse.ok) {
          const retryError = await retryResponse.text();
          console.error('Retry failed:', retryResponse.status, retryError);
          return NextResponse.json(
            { error: 'API request failed after token refresh' },
            { status: retryResponse.status }
          );
        }

        const retryData = await retryResponse.json();
        return NextResponse.json({
          success: true,
          data: retryData,
          refreshed: true,
        });
      }

      return NextResponse.json(
        { error: 'Constant Contact API request failed', details: errorText },
        { status: apiResponse.status }
      );
    }

    const data = await apiResponse.json();

    return NextResponse.json({
      success: true,
      data,
      refreshed: false,
    });
  } catch (error) {
    console.error('Error in Constant Contact ping:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
