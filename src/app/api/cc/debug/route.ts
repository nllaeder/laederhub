import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { integrationTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Debug endpoint to check token status
 * GET /api/cc/debug
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in first' },
        { status: 401 }
      );
    }

    const [tokenRecord] = await db
      .select()
      .from(integrationTokens)
      .where(eq(integrationTokens.userId, session.user.id))
      .limit(1);

    if (!tokenRecord) {
      return NextResponse.json({
        connected: false,
        message: 'No token found in database',
      });
    }

    const now = new Date();
    const isExpired = tokenRecord.expiresAt && tokenRecord.expiresAt <= now;
    const expiresIn = tokenRecord.expiresAt
      ? Math.floor((tokenRecord.expiresAt.getTime() - now.getTime()) / 1000 / 60)
      : null;

    return NextResponse.json({
      connected: true,
      hasAccessToken: !!tokenRecord.accessToken,
      hasRefreshToken: !!tokenRecord.refreshToken,
      isExpired,
      expiresAt: tokenRecord.expiresAt,
      expiresInMinutes: expiresIn,
      provider: tokenRecord.provider,
      scope: tokenRecord.scope,
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
