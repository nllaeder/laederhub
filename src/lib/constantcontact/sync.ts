import { db } from '@/db/client';
import { campaigns } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createCCClient } from './client';
import { randomBytes } from 'crypto';

export interface CampaignSyncResult {
  success: boolean;
  totalFetched: number;
  totalSynced: number;
  errors: string[];
}

/**
 * Sync campaigns from Constant Contact to database
 * @param userId - The user ID to sync campaigns for
 * @returns Sync result with counts and any errors
 */
export async function syncCampaigns(userId: string): Promise<CampaignSyncResult> {
  const result: CampaignSyncResult = {
    success: true,
    totalFetched: 0,
    totalSynced: 0,
    errors: [],
  };

  try {
    // Create CC client for this user
    const client = await createCCClient(userId);

    // Fetch all campaigns
    console.log(`[syncCampaigns] Fetching campaigns for user ${userId}`);
    const allCampaigns = await client.fetchAllCampaigns();
    result.totalFetched = allCampaigns.length;

    console.log(`[syncCampaigns] Found ${allCampaigns.length} campaigns`);

    // Filter for sent campaigns only (those with stats)
    const sentCampaigns = allCampaigns.filter(
      (c) => c.current_status === 'DONE' && c.sent_at
    );

    console.log(`[syncCampaigns] ${sentCampaigns.length} campaigns are sent/completed`);

    // Fetch stats for sent campaigns
    const campaignIds = sentCampaigns.map((c) => c.campaign_id);
    const stats = await client.fetchAllCampaignStats(campaignIds);

    console.log(`[syncCampaigns] Fetched stats for ${stats.length} campaigns`);

    // Create a map of campaign ID to stats
    const statsMap = new Map(
      stats.map((s) => [s.campaign_activity_id, s])
    );

    // Upsert campaigns to database
    for (const campaign of sentCampaigns) {
      try {
        const campaignStats = statsMap.get(campaign.campaign_id);

        // Calculate rates if stats available
        let openRate = null;
        let clickRate = null;

        if (campaignStats) {
          const sends = campaignStats.stats?.em_sends || 0;
          if (sends > 0) {
            const uniqueOpens = campaignStats.stats?.em_unique_opens || 0;
            const uniqueClicks = campaignStats.stats?.em_unique_clicks || 0;
            openRate = uniqueOpens / sends;
            clickRate = uniqueClicks / sends;
          }
        }

        // Check if campaign already exists
        const [existing] = await db
          .select()
          .from(campaigns)
          .where(
            and(
              eq(campaigns.userId, userId),
              eq(campaigns.ccCampaignId, campaign.campaign_id)
            )
          )
          .limit(1);

        const campaignData = {
          userId,
          ccCampaignId: campaign.campaign_id,
          name: campaign.name || 'Untitled Campaign',
          subject: campaign.subject || null,
          preheader: campaign.preheader || null,
          fromName: campaign.from_name || null,
          fromEmail: campaign.from_email || null,
          sentAt: campaign.sent_at ? new Date(campaign.sent_at) : null,
          status: campaign.current_status,
          sends: campaignStats?.stats?.em_sends || 0,
          opens: campaignStats?.stats?.em_opens || 0,
          opensUnique: campaignStats?.stats?.em_unique_opens || 0,
          clicks: campaignStats?.stats?.em_clicks || 0,
          clicksUnique: campaignStats?.stats?.em_unique_clicks || 0,
          bounces: campaignStats?.stats?.em_bounces || 0,
          optouts: campaignStats?.stats?.em_optouts || 0,
          openRate: openRate !== null ? openRate.toString() : null,
          clickRate: clickRate !== null ? clickRate.toString() : null,
          lastUpdatedAt: new Date(),
        };

        if (existing) {
          // Update existing campaign
          await db
            .update(campaigns)
            .set(campaignData)
            .where(eq(campaigns.id, existing.id));
        } else {
          // Insert new campaign
          await db.insert(campaigns).values({
            id: `camp_${randomBytes(16).toString('hex')}`,
            ...campaignData,
            firstSeenAt: new Date(),
          });
        }

        result.totalSynced++;
      } catch (error) {
        const errorMsg = `Failed to sync campaign ${campaign.campaign_id}: ${error}`;
        console.error(`[syncCampaigns] ${errorMsg}`);
        result.errors.push(errorMsg);
        result.success = false;
      }
    }

    console.log(`[syncCampaigns] Sync complete: ${result.totalSynced}/${result.totalFetched} synced`);

    return result;
  } catch (error) {
    console.error('[syncCampaigns] Fatal error:', error);
    result.success = false;
    result.errors.push(`Fatal error: ${error}`);
    return result;
  }
}

/**
 * Get campaign count from database
 */
export async function getCampaignCount(userId: string): Promise<number> {
  const result = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.userId, userId));

  return result.length;
}

/**
 * Get latest campaigns from database
 */
export async function getLatestCampaigns(userId: string, limit: number = 10) {
  return db
    .select()
    .from(campaigns)
    .where(eq(campaigns.userId, userId))
    .orderBy(campaigns.sentAt)
    .limit(limit);
}
