import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { syncCampaigns } from '@/lib/constantcontact/sync';

/**
 * Sync campaigns from Constant Contact to database
 * GET /api/cc/sync
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

    console.log(`[sync] Starting campaign sync for user ${session.user.id}`);

    const result = await syncCampaigns(session.user.id);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Sync completed with errors',
          result,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${result.totalSynced} of ${result.totalFetched} campaigns`,
      result,
    });
  } catch (error) {
    console.error('[sync] Fatal error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
