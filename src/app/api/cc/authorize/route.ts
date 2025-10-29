import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

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

    // Validate required env vars
    const clientId = process.env.CC_CLIENT_ID;
    const authBase = process.env.CC_AUTH_BASE;
    const redirectUri = process.env.CC_REDIRECT_URI;
    const scopes = process.env.CC_SCOPES;

    if (!clientId || !authBase || !redirectUri || !scopes) {
      console.error('Missing Constant Contact OAuth configuration');
      return NextResponse.json(
        { error: 'Server configuration error - missing OAuth credentials' },
        { status: 500 }
      );
    }

    // Generate state for CSRF protection
    const state = randomBytes(32).toString('hex');

    // Build authorization URL
    const authUrl = new URL(`${authBase}/v1/authorize`);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', state);

    // Store state in a cookie for validation in callback
    // In production, consider using encrypted session storage
    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set('cc_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error initiating Constant Contact OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate authorization' },
      { status: 500 }
    );
  }
}
