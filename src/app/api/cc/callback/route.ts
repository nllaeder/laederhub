import { auth } from '@/auth';
import { db } from '@/db/client';
import { integrationTokens } from '@/db/schema';
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Ensure user is authenticated
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/api/auth/signin', request.url));
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth error from provider
    if (error) {
      console.error('OAuth error from Constant Contact:', error);
      return NextResponse.redirect(
        new URL(`/?error=cc_oauth_failed&reason=${error}`, request.url)
      );
    }

    // Validate code and state presence
    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing code or state parameter' },
        { status: 400 }
      );
    }

    // Validate state matches (CSRF protection)
    const storedState = request.cookies.get('cc_oauth_state')?.value;
    if (!storedState || storedState !== state) {
      console.error('State mismatch - possible CSRF attack');
      return NextResponse.json(
        { error: 'Invalid state parameter' },
        { status: 400 }
      );
    }

    // Validate required env vars
    const clientId = process.env.CC_CLIENT_ID;
    const clientSecret = process.env.CC_CLIENT_SECRET;
    const authBase = process.env.CC_AUTH_BASE;
    const redirectUri = process.env.CC_REDIRECT_URI;

    if (!clientId || !clientSecret || !authBase || !redirectUri) {
      console.error('Missing Constant Contact OAuth configuration');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Exchange code for tokens
    const tokenUrl = `${authBase}/v1/token`;
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', tokenResponse.status, errorText);
      return NextResponse.json(
        { error: 'Failed to exchange authorization code for tokens' },
        { status: 500 }
      );
    }

    const tokens: TokenResponse = await tokenResponse.json();

    // Calculate expiration timestamp
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Store tokens in database (upsert)
    await db
      .insert(integrationTokens)
      .values({
        userId: session.user.id,
        provider: 'constant_contact',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        scope: tokens.scope || process.env.CC_SCOPES || 'contact_data',
        tokenType: tokens.token_type,
      })
      .onConflictDoUpdate({
        target: integrationTokens.userId,
        set: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt,
          scope: tokens.scope || process.env.CC_SCOPES || 'contact_data',
          tokenType: tokens.token_type,
        },
      });

    // Clear state cookie
    const response = NextResponse.redirect(
      new URL('/?cc_connected=true', request.url)
    );
    response.cookies.delete('cc_oauth_state');

    return response;
  } catch (error) {
    console.error('Error in Constant Contact OAuth callback:', error);
    return NextResponse.json(
      { error: 'Internal server error during OAuth callback' },
      { status: 500 }
    );
  }
}
