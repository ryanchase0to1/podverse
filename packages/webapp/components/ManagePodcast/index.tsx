import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';
import { GetPodcastWithEpisodes, PLANS } from 'podverse-utils';
import { auth } from '@clerk/nextjs/server';
import { EmbedPodcast } from '@/components/Embed';
import { buttonVariants } from '../ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getCurrentSubscription } from '@/lib/actions';
import { computeEpisodeLimit } from '@/lib/limits';
import { DeletePodcastDialog, ManagePodcastGeneral } from '../ManagePodcastGeneral';
import { PodcastHeader } from '@/components/PodcastHeader';
import { SuggestionsEditor } from '@/components/SuggestionsEditor';

export async function ManagePodcast({ podcastSlug }: { podcastSlug: string }) {
  try {
    const { userId } = auth();
    if (!userId) {
      throw new Error('Unauthorized');
    }
    const supabase = await getSupabaseClient();
    // Load podcast + subscription in parallel; derive limits from episodes already fetched
    // instead of re-running the global podcast_stats RPC.
    const [podcast, subscription] = await Promise.all([
      GetPodcastWithEpisodes(supabase, podcastSlug),
      getCurrentSubscription(),
    ]);
    if (podcast.owner !== userId) {
      throw new Error('Unauthorized');
    }
    const plan = subscription ? (PLANS[subscription.plan] ?? PLANS.free) : PLANS.free;
    const planLimit = computeEpisodeLimit(podcast, plan);

    return (
      <>
        <div className="mx-auto mt-8 flex w-full flex-col gap-4 px-2 md:w-4/5">
          <div className="flex flex-row items-center gap-2 font-mono text-2xl font-bold">Manage podcast</div>

          <PodcastHeader podcast={podcast} planLimit={planLimit} showManage={false} />

          <div className="w-fit">
            <Link className={buttonVariants({ variant: 'default' })} href={`/podcast/${podcast.slug}`}>
              View podcast
            </Link>
          </div>

          <Tabs defaultValue="general" className="w-90% mt-8" orientation="vertical">
            <div className="flex flex-row gap-4">
              <TabsList className="w-40% border-muted h-max flex-col items-start border bg-transparent">
                <TabsTrigger className="data-[state=active]:text-primary font-normal" value="general">
                  General settings
                </TabsTrigger>
                <TabsTrigger className="data-[state=active]:text-primary font-normal" value="suggestions">
                  Suggested questions
                </TabsTrigger>
                <TabsTrigger className="data-[state=active]:text-primary font-normal" value="embed">
                  Embed podcast
                </TabsTrigger>
                <div>&nbsp;</div> {/* Spacer */}
                <TabsTrigger className="data-[state=active]:text-primary font-normal" value="delete">
                  Delete podcast
                </TabsTrigger>
              </TabsList>
              <TabsContent className="w-60% border-muted my-0 border p-4" value="general">
                <ManagePodcastGeneral podcast={podcast} planLimit={planLimit} />
              </TabsContent>
              <TabsContent className="w-60% border-muted my-0 border p-4" value="suggestions">
                <SuggestionsEditor podcastId={podcast.id} />
              </TabsContent>
              <TabsContent className="w-60% border-muted my-0 border p-4" value="embed">
                <EmbedPodcast podcast={podcast} />
              </TabsContent>
              <TabsContent className="w-60% border-muted my-0 border p-4" value="delete">
                <div className="flex flex-col items-start gap-4">
                  <div>
                    Click the button below to delete the <span className="text-primary">{podcast.title}</span> podcast.
                  </div>
                  <DeletePodcastDialog podcast={podcast} />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </>
    );
  } catch (error) {
    console.error('Error fetching podcast:', error);
    return (
      <div className="mx-auto mt-8 flex w-full flex-col gap-4 px-2 font-mono md:w-4/5">
        <div>
          Failed to load podcast <span className="text-primary">{podcastSlug}</span>
        </div>
        {/* @ts-ignore */}
        <div>{error!.message}</div>
        <div>
          <Link className="text-primary font-mono underline" href="/">
            Go home
          </Link>
        </div>
      </div>
    );
  }
}
