import { auth } from '@clerk/nextjs/server';
import { NewPodcastDialog } from '@/components/NewPodcastDialog';
import Link from 'next/link';
import { EpisodeTable } from '@/components/EpisodeStatus';
import { Button } from '@/components/ui/button';
import { getCurrentSubscription, getEpisodes, getOwnedPodcasts } from '@/lib/actions';
import { PLANS } from 'podverse-utils';
import { PodcastLimit } from '@/lib/limits';

export default async function Page() {
  const { userId, protect } = auth();
  protect();
  if (!userId) {
    return null;
  }

  // Avoid podcast_stats here: the table only needs id/title for the filter, plus one page of episodes.
  const [podcasts, subscription, [episodes, rowCount]] = await Promise.all([
    getOwnedPodcasts(),
    getCurrentSubscription(),
    getEpisodes({
      owner: userId,
      offset: 0,
      limit: 10,
    }),
  ]);
  const plan = subscription ? (PLANS[subscription.plan] ?? PLANS.free) : PLANS.free;
  const podcastLimit: PodcastLimit = {
    totalPodcasts: podcasts.length,
    leftOnPlan: plan.maxPodcasts !== undefined ? Math.max(0, plan.maxPodcasts - podcasts.length) : Infinity,
  };

  return (
    <div className="mx-auto mt-8 flex w-full px-2 sm:w-4/5 flex-col gap-4">
      <div className="flex w-full flex-row justify-between">
        <div className="flex flex-col smflex-row gap-2 items-center">
          <div className="font-mono text-lg">Your episodes</div>
          <Link href="/dashboard">
            <Button variant="outline" className="text-sm">
              View podcasts
            </Button>
          </Link>
        </div>
        <NewPodcastDialog planLimit={podcastLimit} />
      </div>
      <div className="flex size-full flex-col gap-2 overflow-y-auto p-2 text-xs">
        <EpisodeTable
          initialPodcasts={podcasts}
          initialEpisodes={episodes}
          initialRowCount={rowCount}
        />
      </div>
    </div>
  );
}
