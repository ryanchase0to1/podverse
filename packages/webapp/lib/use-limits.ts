'use client';

import { useEffect, useState } from 'react';
import { PodcastStat, Plan, PLANS } from 'podverse-utils';
import { getCurrentSubscription, getPodcastStats } from '@/lib/actions';
import { useAuth } from '@clerk/nextjs';
import { EpisodeLimit, PodcastLimit } from '@/lib/limits';

export function usePodcastLimit(enabled: boolean = true): PodcastLimit | null {
  const [stats, setStats] = useState<PodcastStat[] | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const { userId } = useAuth();

  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (stats === null) {
      getPodcastStats()
        .then((newStats) => {
          setStats(newStats.filter((p) => p.owner === userId));
        })
        .catch((e) => console.error(e));
    }
    if (plan === null) {
      getCurrentSubscription()
        .then((newSub) => {
          if (!newSub) {
            setPlan(PLANS.free);
          } else {
            setPlan(PLANS[newSub.plan]);
          }
        })
        .catch((e) => console.error(e));
    }
  }, [stats, plan, userId, enabled]);

  if (!enabled || !stats || !plan) {
    return null;
  }

  const total = stats.length;
  const leftOnPlan = plan.maxPodcasts !== undefined ? Math.max(0, plan.maxPodcasts - total) : Infinity;

  return {
    totalPodcasts: total,
    leftOnPlan,
  };
}

/** Returns the state of the user's ability to process episodes for the given podcast. */
export function useEpisodeLimit(podcastId: number): EpisodeLimit | null {
  const [stats, setStats] = useState<PodcastStat[] | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => {
    if (!stats) {
      getPodcastStats()
        .then((newStats) => {
          setStats(newStats);
        })
        .catch((e) => console.error(e));
    }
    if (!plan) {
      getCurrentSubscription()
        .then((newSub) => {
          if (!newSub) {
            setPlan(PLANS.free);
          } else {
            setPlan(PLANS[newSub.plan]);
          }
        })
        .catch((e) => console.error(e));
    }
  }, [stats, plan]);

  if (!stats || !plan) {
    return null;
  }

  const stat = stats.find((p) => p.id === podcastId);
  if (!stat) {
    console.error('No stats found for podcast', podcastId);
    return null;
  }

  const total = Number(stat.allepisodes) || 0;
  const processed = Number(stat.processed) || 0;
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
