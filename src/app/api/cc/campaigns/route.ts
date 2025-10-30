import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { createCCClient } from '@/lib/constantcontact/client';

/**
 * Test endpoint to fetch all campaigns and their stats
 * GET /api/cc/campaigns
 */
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

    // Create CC client
    const client = await createCCClient(session.user.id);
    if (!client) {
      return NextResponse.json(
        {
          error: 'No Constant Contact connection found. Please authorize first.',
        },
        { status: 404 }
      );
    }

    console.log('Fetching campaigns for user:', session.user.id);

    // Fetch all campaigns
    const campaigns = await client.fetchAllCampaigns();

    console.log(`Fetched ${campaigns.length} campaigns`);

    // Filter to only campaigns that have been sent
    const sentCampaigns = campaigns.filter(
      (c) => c.current_status === 'DONE' && c.sent_at
    );

    console.log(`${sentCampaigns.length} campaigns have been sent`);

    // Fetch stats for sent campaigns (limit to first 10 for testing)
    const campaignsToAnalyze = sentCampaigns.slice(0, 10);
    const campaignIds = campaignsToAnalyze.map((c) => c.campaign_id);

    console.log(`Fetching stats for ${campaignIds.length} campaigns...`);

    const stats = await client.fetchAllCampaignStats(campaignIds);

    console.log(`Fetched stats for ${stats.length} campaigns`);

    // Combine campaigns with their stats
    const campaignsWithStats = campaignsToAnalyze.map((campaign) => {
      const campaignStat = stats.find(
        (s) => s.campaign_id === campaign.campaign_id
      );
      return {
        id: campaign.campaign_id,
        name: campaign.name,
        subject: campaign.subject,
        sent_at: campaign.sent_at,
        status: campaign.current_status,
        stats: campaignStat?.stats || null,
      };
    });

    return NextResponse.json({
      success: true,
      summary: {
        total_campaigns: campaigns.length,
        sent_campaigns: sentCampaigns.length,
        analyzed: campaignsWithStats.length,
      },
      campaigns: campaignsWithStats,
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
