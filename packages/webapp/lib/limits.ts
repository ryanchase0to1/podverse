import { Plan, PodcastWithEpisodes, isReady } from 'podverse-utils';

export interface PodcastLimit {
  totalPodcasts: number;
  leftOnPlan: number;
}

export interface EpisodeLimit {
  plan: Plan;
  totalEpisodes: number;
  processedEpisodes: number;
  unprocessedEpisodes: number;
  maxEpisodesPerPodcast: number;
  leftOnPlan: number;
  numToProcess: number;
}

/** Derive episode plan limits from an already-loaded podcast (avoids podcast_stats). */
export function computeEpisodeLimit(
  podcast: Pick<PodcastWithEpisodes, 'Episodes'>,
  plan: Plan,
): EpisodeLimit {
  const total = podcast.Episodes.length;
  const processed = podcast.Episodes.filter(isReady).length;
  const unprocessed = total - processed;
  const leftOnPlan = plan.maxEpisodesPerPodcast ? Math.max(0, plan.maxEpisodesPerPodcast - processed) : Infinity;
  const numToProcess = Math.min(unprocessed, leftOnPlan);

  return {
    plan,
    totalEpisodes: total,
    processedEpisodes: processed,
    unprocessedEpisodes: unprocessed,
    maxEpisodesPerPodcast: plan.maxEpisodesPerPodcast || Infinity,
    leftOnPlan,
    numToProcess,
  };
}
