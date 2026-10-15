'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { Episode, PodcastWithEpisodes, PodcastWithEpisodesMetadata } from 'podverse-utils';
import { EpisodeStrip } from '../PodcastEpisodeList';
import { readPodcastFeed, importPodcast, searchPodcasts } from '@/lib/actions';
import { usePodcastLimit } from '@/lib/use-limits';
import { PodcastLimit } from '@/lib/limits';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import Image from 'next/image';

enum importStage {
  ENTER_URL,
  LOADING,
  VALIDATING,
  IMPORTING,
}

type PodcastSearchResult = Awaited<ReturnType<typeof searchPodcasts>>['results'][number];

export function NewPodcastDialog({ planLimit: planLimitProp }: { planLimit?: PodcastLimit }) {
  const [open, setOpen] = useState(false);
  const [rssUrl, setRssUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<importStage>(importStage.ENTER_URL);
  const [podcast, setPodcast] = useState<PodcastWithEpisodesMetadata | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PodcastSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchRequest = useRef(0);
  const planLimitFromHook = usePodcastLimit(planLimitProp === undefined);
  const planLimit = planLimitProp ?? planLimitFromHook;

  const resetDialogState = () => {
    setStage(importStage.ENTER_URL);
    setPodcast(null);
    setError(null);
    setRssUrl(null);
    setSearchQuery('');
    setSearchResults([]);
    setSearching(false);
    setSearchError(null);
  };

  useEffect(() => {
    if (stage !== importStage.ENTER_URL) {
      return;
    }
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    const requestId = ++searchRequest.current;
    setSearching(true);
    setSearchError(null);
    const handle = setTimeout(() => {
      searchPodcasts(query)
        .then((response) => {
          if (requestId !== searchRequest.current) {
            return;
          }
          setSearchResults(response.results);
          setSearchError(response.error);
          setSearching(false);
        })
        .catch(() => {
          if (requestId !== searchRequest.current) {
            return;
          }
          setSearchResults([]);
          setSearching(false);
          setSearchError('Podcast search failed');
        });
    }, 300);
    return () => clearTimeout(handle);
  }, [searchQuery, stage]);

  const onOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetDialogState();
    }
  };

  const loadFeed = (feedUrl: string) => {
    setError(null);
    setRssUrl(feedUrl);
    try {
      const url = new URL(feedUrl);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        setError('Please enter a valid URL');
        return;
      }
    } catch {
      setError('Please enter a valid URL');
      return;
    }
    setStage(importStage.LOADING);
    readPodcastFeed(feedUrl)
      .then((data) => {
        setPodcast(data);
        setStage(importStage.VALIDATING);
      })
      .catch((e) => {
        setStage(importStage.ENTER_URL);
        setError('Error reading podcast feed: ' + e.message);
      });
  };

  const onImportClicked = () => {
    if (!rssUrl) {
      setError('Please enter a valid URL');
      return;
    }
    loadFeed(rssUrl);
  };

  const onSelectResult = (result: PodcastSearchResult) => {
    setSearchResults([]);
    setSearchQuery(result.title);
    loadFeed(result.url);
  };

  const onConfirmClicked = async () => {
    if (!rssUrl || !podcast || stage === importStage.IMPORTING) {
      return;
    }
    setError(null);
    setStage(importStage.IMPORTING);
    try {
      await importPodcast(rssUrl);
      toast.success('Podcast imported successfully');
      setOpen(false);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(`Error importing podcast: ${message}`);
      toast.error(`Import failed: ${message}`);
      setStage(importStage.VALIDATING);
    }
  };

  const onCancelClicked = async () => {
    toast.info('Podcast import cancelled');
    setOpen(false);
  };

  if (!planLimit) {
    return null;
  }

  let upgradeMessage = (
    <div className="flex flex-row items-center gap-4">
      <ExclamationTriangleIcon className="text-primary size-20" />
      <div>
        You have already imported <span className="text-primary">{planLimit.totalPodcasts}</span> podcasts.{' '}
        <Link href="/pricing" className="text-primary underline">
          Upgrade your plan
        </Link>{' '}
        to import additional podcasts.
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button type="button" className={cn(buttonVariants({ variant: 'secondary' }), 'font-mono text-sm')}>
          Import podcast
        </button>
      </DialogTrigger>
      <DialogContent className="w-4/5 max-h-[800px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono">Import Podcast</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground flex flex-col gap-4 font-mono">
          {planLimit.leftOnPlan === 0 ? (
            upgradeMessage
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <Input
                  className="w-full"
                  placeholder="Search for a podcast"
                  value={searchQuery}
                  disabled={stage !== importStage.ENTER_URL}
                  onInput={(e) => {
                    setSearchQuery((e.target as HTMLInputElement).value);
                  }}
                />
                {searching && <div className="text-primary text-sm font-mono">Searching…</div>}
                {searchError && <div className="text-primary text-sm">{searchError}</div>}
                {stage === importStage.ENTER_URL && searchResults.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        className="hover:bg-muted flex flex-row items-center gap-3 rounded-md p-2 text-left"
                        onClick={() => onSelectResult(result)}
                      >
                        {result.image?.startsWith('https://') ? (
                          <Image src={result.image} alt="" width={40} height={40} className="size-10 rounded" />
                        ) : (
                          <div className="bg-muted size-10 rounded" />
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-sm">{result.title}</div>
                          <div className="text-muted-foreground truncate text-xs">
                            {result.author}
                            {result.episodeCount != null ? ` · ${result.episodeCount} episodes` : ''}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-row gap-2 items-center">
                <Input
                  className="w-full"
                  placeholder="https://example.com/rss"
                  value={rssUrl || ''}
                  disabled={stage !== importStage.ENTER_URL}
                  onInput={(e) => {
                    setRssUrl((e.target as HTMLInputElement).value);
                  }}
                />
                <Button onClick={onImportClicked} disabled={stage !== importStage.ENTER_URL} className="font-mono">
                  Import
                </Button>
              </div>
              {stage === importStage.ENTER_URL && (
                <div className="text-primary text-sm font-mono">
                  Search for a podcast, or paste the URL of its RSS feed.
                </div>
              )}
              {stage === importStage.LOADING && (
                <div className="text-primary text-sm font-mono">Loading podcast RSS feed...</div>
              )}
              <div>{error && <div className="text-primary">{error}</div>}</div>
              <div>{stage === importStage.LOADING && <Icons.spinner className="mx-auto h-6 w-6 animate-spin" />}</div>
              <div>
                {(stage === importStage.VALIDATING || stage === importStage.IMPORTING) && podcast && (
                  <PodcastPreview
                    podcast={podcast}
                    importing={stage === importStage.IMPORTING}
                    onConfirm={onConfirmClicked}
                    onCancel={onCancelClicked}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PodcastPreviewHeader({ podcast }: { podcast: PodcastWithEpisodesMetadata }) {
  return (
    <div className="flex w-full flex-row gap-4 overflow-hidden rounded-lg border bg-gray-700 p-4 font-mono text-white dark:bg-gray-700 dark:text-white">
      <div className="flex size-full flex-row gap-4">
        <div className="w-1/5">
          {podcast.imageUrl && <Image src={podcast.imageUrl} width={100} height={100} alt="Podcast thumbnail" />}
        </div>
        <div className="line-clamp-3 flex w-4/5 flex-col gap-4 truncate text-wrap">
          <div className="text-primary text-lg">{podcast.title}</div>
          {podcast.copyright && <div className="text-muted-foreground text-xs">{podcast.copyright}</div>}
        </div>
      </div>
    </div>
  );
}

function PodcastPreview({
  podcast,
  importing,
  onConfirm,
  onCancel,
}: {
  podcast: PodcastWithEpisodesMetadata;
  importing: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void | Promise<void>;
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="text-primary text-sm">Here&apos;s a preview of your podcast:</div>
      <PodcastPreviewHeader podcast={podcast} />
      <div className="text-primary text-sm">Newest episodes</div>
      {podcast.Episodes.slice(0, 3).map((episode) => (
        <EpisodeStrip key={episode.id} podcast={podcast as PodcastWithEpisodes} episode={episode as Episode} />
      ))}
      {importing && (
        <div className="text-primary flex items-center gap-2 text-sm">
          <Icons.spinner className="h-4 w-4 animate-spin" />
          Saving podcast to your account…
        </div>
      )}
      <div className="flex flex-row justify-end gap-2">
        <Button type="button" variant="default" disabled={importing} onClick={() => void onConfirm()}>
          Looks good
        </Button>
        <Button type="button" variant="secondary" disabled={importing} onClick={() => void onCancel()}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
