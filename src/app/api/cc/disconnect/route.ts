import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { integrationTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Disconnect Constant Contact integration
 * DELETE /api/cc/disconnect
 */
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in first' },
        { status: 401 }
      );
    }

    // Delete token from database
    await db
      .delete(integrationTokens)
      .where(eq(integrationTokens.userId, session.user.id));

    console.log('Disconnected Constant Contact for user:', session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Constant Contact disconnected successfully',
    });
  } catch (error) {
    console.error('Error disconnecting Constant Contact:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
