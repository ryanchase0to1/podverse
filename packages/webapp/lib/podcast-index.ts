import { createHash } from 'crypto';

export type PodcastSearchResult = {
  id: number;
  title: string;
  author: string;
  url: string;
  image: string | null;
  episodeCount: number | null;
};

/** Search Podcast Index and return shows with their RSS feed URLs. */
export async function searchPodcastIndex(query: string): Promise<PodcastSearchResult[]> {
  const apiKey = process.env.PODCAST_INDEX_API_KEY;
  const apiSecret = process.env.PODCAST_INDEX_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error('Podcast search is not configured. Add PODCAST_INDEX_API_KEY and PODCAST_INDEX_API_SECRET.');
  }

  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const apiHeaderTime = Math.floor(Date.now() / 1000).toString();
  const authorization = createHash('sha1').update(`${apiKey}${apiSecret}${apiHeaderTime}`).digest('hex');
  const endpoint = new URL('https://api.podcastindex.org/api/1.0/search/byterm');
  endpoint.searchParams.set('q', trimmed);

  const response = await fetch(endpoint, {
    headers: {
      'User-Agent': 'PodchatStudio/1.0',
      'X-Auth-Key': apiKey,
      'X-Auth-Date': apiHeaderTime,
      Authorization: authorization,
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    const detail = (await response.text()).replace(/\s+/g, ' ').trim();
    throw new Error(detail || `Podcast search failed (${response.status})`);
  }

  const data = (await response.json()) as {
    status?: string | boolean;
    description?: string;
    feeds?: Array<{
      id?: number;
      title?: string;
      author?: string;
      ownerName?: string;
      url?: string;
      artwork?: string;
      image?: string;
      episodeCount?: number;
    }>;
  };
  if (data.status !== 'true' && data.status !== true) {
    throw new Error(data.description || 'Podcast search failed');
  }

  return (data.feeds ?? [])
    .filter((feed) => Boolean(feed.url && feed.title && feed.id))
    .slice(0, 8)
    .map((feed) => ({
      id: feed.id as number,
      title: feed.title as string,
      author: feed.author || feed.ownerName || '',
      url: feed.url as string,
      image: feed.artwork || feed.image || null,
      episodeCount: typeof feed.episodeCount === 'number' ? feed.episodeCount : null,
    }));
}
