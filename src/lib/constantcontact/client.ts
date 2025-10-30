import { db } from '@/db/client';
import { integrationTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Constant Contact API Client
 * Handles authentication, token refresh, and API requests
 */

export interface CCCampaign {
  campaign_id: string;
  name: string;
  subject?: string;
  preheader?: string;
  from_name?: string;
  from_email?: string;
  reply_to_email?: string;
  current_status: 'DRAFT' | 'SCHEDULED' | 'EXECUTING' | 'DONE' | 'ERROR' | 'REMOVED';
  created_at: string;
  updated_at: string;
  sent_at?: string;
  type: string;
}

export interface CCCampaignStats {
  campaign_id: string;
  stats: {
    sends: number;
    opens: number;
    opens_unique: number;
    clicks: number;
    clicks_unique: number;
    bounces: number;
    forwards: number;
    optouts: number;
    abuse_reports: number;
    not_opened: number;
    click_rate?: number;
    open_rate?: number;
  };
}

export interface CCCampaignActivity {
  campaign_activity_id: string;
  role: string;
  contact_id: string;
  campaign_activity_type: 'EMAIL_SEND' | 'EMAIL_OPEN' | 'EMAIL_CLICK' | 'EMAIL_BOUNCE' | 'EMAIL_OPTOUT' | 'EMAIL_REPLY' | 'EMAIL_FORWARD';
  created_time: string;
}

interface TokenRefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export class ConstantContactClient {
  private accessToken: string;
  private userId: string;
  private apiBase: string;

  constructor(accessToken: string, userId: string) {
    this.accessToken = accessToken;
    this.userId = userId;
    this.apiBase = process.env.CC_API_BASE || 'https://api.cc.email/v3';
  }

  /**
   * Refresh the access token using refresh token from database
   */
  private async refreshAccessToken(): Promise<string | null> {
    try {
      const [tokenRecord] = await db
        .select()
        .from(integrationTokens)
        .where(eq(integrationTokens.userId, this.userId))
        .limit(1);

      if (!tokenRecord?.refreshToken) {
        console.error('No refresh token found for user');
        return null;
      }

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
        refresh_token: tokenRecord.refreshToken,
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
        .where(eq(integrationTokens.userId, this.userId));

      // Update instance token
      this.accessToken = tokens.access_token;

      return tokens.access_token;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      return null;
    }
  }

  /**
   * Make an authenticated request to the Constant Contact API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.apiBase}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Handle 401 by refreshing token and retrying once
    if (response.status === 401) {
      console.log('Received 401, attempting token refresh...');
      const newToken = await this.refreshAccessToken();

      if (!newToken) {
        throw new Error('Failed to refresh access token');
      }

      // Retry request with new token
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${newToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!retryResponse.ok) {
        const errorText = await retryResponse.text();
        throw new Error(
          `CC API error after refresh: ${retryResponse.status} - ${errorText}`
        );
      }

      return retryResponse.json();
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CC API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Fetch all campaigns with pagination
   */
  async fetchAllCampaigns(): Promise<CCCampaign[]> {
    const allCampaigns: CCCampaign[] = [];
    let hasMore = true;
    let limit = 50; // Max per page
    let offset = 0;

    while (hasMore) {
      const response = await this.request<{
        campaigns: CCCampaign[];
        _links?: { next?: { href: string } };
      }>(`/emails?limit=${limit}&offset=${offset}`);

      if (response.campaigns && response.campaigns.length > 0) {
        allCampaigns.push(...response.campaigns);
        offset += response.campaigns.length;

        // Check if there are more pages
        hasMore = !!response._links?.next;
      } else {
        hasMore = false;
      }

      // Safety limit to prevent infinite loops
      if (allCampaigns.length >= 10000) {
        console.warn('Reached safety limit of 10000 campaigns');
        break;
      }
    }

    return allCampaigns;
  }

  /**
   * Fetch campaign statistics
   */
  async fetchCampaignStats(campaignId: string): Promise<CCCampaignStats> {
    return this.request<CCCampaignStats>(
      `/reports/email_reports/${campaignId}`
    );
  }

  /**
   * Fetch all campaign stats in batch
   */
  async fetchAllCampaignStats(
    campaignIds: string[]
  ): Promise<CCCampaignStats[]> {
    const stats: CCCampaignStats[] = [];

    // Fetch stats for each campaign (API doesn't support batch fetching)
    for (const campaignId of campaignIds) {
      try {
        const campaignStats = await this.fetchCampaignStats(campaignId);
        stats.push(campaignStats);

        // Small delay to avoid rate limiting (5 requests/second limit)
        await new Promise((resolve) => setTimeout(resolve, 250));
      } catch (error) {
        console.error(`Failed to fetch stats for campaign ${campaignId}:`, error);
        // Continue with other campaigns
      }
    }

    return stats;
  }

  /**
   * Fetch campaign activities (opens, clicks, etc.)
   */
  async fetchCampaignActivities(
    campaignActivityId: string
  ): Promise<CCCampaignActivity[]> {
    const allActivities: CCCampaignActivity[] = [];
    let hasMore = true;
    let cursor: string | undefined;

    while (hasMore) {
      const endpoint = cursor
        ? `/reports/email_reports/${campaignActivityId}/tracking/clicks?cursor=${cursor}`
        : `/reports/email_reports/${campaignActivityId}/tracking/clicks`;

      const response = await this.request<{
        tracking_activities: CCCampaignActivity[];
        _links?: { next?: { href: string } };
      }>(endpoint);

      if (
        response.tracking_activities &&
        response.tracking_activities.length > 0
      ) {
        allActivities.push(...response.tracking_activities);

        // Extract cursor from next link if exists
        if (response._links?.next?.href) {
          const url = new URL(response._links.next.href);
          cursor = url.searchParams.get('cursor') || undefined;
          hasMore = !!cursor;
        } else {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    return allActivities;
  }
}

/**
 * Refresh token if expired
 */
async function refreshTokenIfNeeded(userId: string): Promise<string | null> {
  const [tokenRecord] = await db
    .select()
    .from(integrationTokens)
    .where(eq(integrationTokens.userId, userId))
    .limit(1);

  if (!tokenRecord?.refreshToken) {
    console.error('No refresh token found for user');
    return null;
  }

  // Check if token is expired or expiring soon (within 5 minutes)
  const now = new Date();
  const isExpired =
    tokenRecord.expiresAt && tokenRecord.expiresAt <= new Date(now.getTime() + 5 * 60 * 1000);

  if (!isExpired) {
    return tokenRecord.accessToken; // Token is still valid
  }

  console.log('Token expired or expiring soon, refreshing...');

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
    refresh_token: tokenRecord.refreshToken,
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

  console.log('Token refreshed successfully');

  return tokens.access_token;
}

/**
 * Create a Constant Contact client instance for a user
 */
export async function createCCClient(
  userId: string
): Promise<ConstantContactClient | null> {
  const [tokenRecord] = await db
    .select()
    .from(integrationTokens)
    .where(eq(integrationTokens.userId, userId))
    .limit(1);

  if (!tokenRecord) {
    console.error('No Constant Contact token found for user');
    return null;
  }

  // Refresh token if needed
  const accessToken = await refreshTokenIfNeeded(userId);

  if (!accessToken) {
    console.error('Failed to get valid access token');
    return null;
  }

  return new ConstantContactClient(accessToken, userId);
}
