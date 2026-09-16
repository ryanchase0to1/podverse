# Podverse - AI Superpowers for Podcasts

<img src="./packages/webapp/public/images/podverse-episode-screenshot.png" alt="drawing" width="400"/>

Podverse is a web app that brings AI superpowers to podcasts.

This project is meant as a demonstration of a full-stack webapp that leverages AI capabilities.

## Features

* Import a podcast by providing its RSS feed URL
* Automatic transcript generation using [Deepgram](https://deepgram.com) 
* Automatic AI-generated diarization and speaker identification
* Automatic AI-generated episode summaries
* LLM-powered chatbot with RAG
* Full-text search against podcast transcripts, metadata, and summaries

## Architecture

Podverse is an entirely serverless architecture. It is built using Next.js and can be deployed
using [Vercel](https://vercel.com). It uses [TailwindCSS](https://tailwindcss.com/) for styling
and [ShadCN](https://ui.shadcn.com/) for UI components.

It uses the following services:
* [Supabase](https://supabase.com) as the back-end database
* [Clerk](https://clerk.com) for authentication
* [Inngest](https://inngest.com) for background data processing
* [Deepgram](https://deepgram.com) for transcript generation
* [OpenAI](https://openai.com) models for LLMs
* [Stripe](https://stripe.com) for billing
* [Mailgun](https://mailgun.com) for sending emails

## Installation

1. Ensure you have `npm` and `yarn` installed.
1. Clone this repo
1. Run: `yarn` to install all package dependencies

## Environment setup

These instructions assume you will be deploying to Vercel. This is not strictly necessary
but will simplify configuration.

1. Create a Vercel project for your deployment.
1. Add the **Supabase** and **Inngest** integrations to your Vercel project. This should add the
various environment variables needed for Supabase, Inngest, and Postgres.
1. Create an [OpenAI](https://openai.com) API key and add it as the environment variable
`OPENAI_API_KEY` in your Vercel project's environment variables.
1. Create a [Deepgram](https://deepgram.com) API key and add it as the environment variable
`DEEPGRAM_API_KEY` in your Vercel project's environment variables. Also add the key identifier
as `DEEPGRAM_API_KEY_IDENTIFIER`.
1. Create a [Clerk](https://clerk.com) API key and add the environment variables
`CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to your Vercel project.
1. Create a [Mailgun](https://mailgun.com) API key and add the environment variables
`MAILGUN_DOMAIN` and `MAILGUN_API_KEY` to your Vercel project.

Optionally, if you want to enable billing, you can set up a [Stripe](https://stripe.com)
account, and set the environment variables `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
`STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET`.

## Supabase setup

The file `supabase-schema.sql` contains a dump of the Supabase schema for Podverse,
generated using `supabase db dump`. Once you have initialized your Supabase project,
you can restore it using:

```
$ psql -h YOUR_SUPABASE_DB_HOST -U YOUR_DB_USER -d YOUR_DB_NAME -f supabase-schema.sql
```

### Storage buckets

`supabase db dump` only covers the `public` schema, so Storage buckets are **not** included
in `supabase-schema.sql` and have to be created separately. Podverse uses four: `audio`,
`transcripts`, `summaries`, and `covers`. Without them, episode processing fails at the
transcription step with a `Bucket not found` error.

Once `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in `packages/webapp/.env.local`
(see [Local development](#local-development) below), run:

```
$ yarn workspace webapp create-buckets
```

The script is safe to re-run, and `--dry-run` reports what it would create without changing
anything. You can also create the buckets by hand in the Supabase dashboard under Storage.

All four are created **public**, because the upload helpers return `getPublicUrl()` and
those URLs are stored in the database and served directly. Anything in these buckets is
therefore readable by anyone who knows the object path, and audio, transcript, and summary
paths are built from sequential podcast and episode ids. Note in particular that marking a
podcast private protects its database rows through RLS but does not restrict its storage
objects.

## Local development

For local development, you will need to create the file `packages/webapp/.env.local`
containing the following values.

```
SUPABASE_URL=<Supabase URL>
SUPABASE_API_KEY=<Supabase API key>
SUPABASE_SERVICE_ROLE_KEY=<Supabase service role key>
NEXT_PUBLIC_SUPABASE_URL=<Supabase URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase anon key>

DEEPGRAM_API_KEY=<Deepgram API key>
DEEPGRAM_API_KEY_IDENTIFIER=<Deepgram API key identifier>

INNGEST_EVENT_KEY=<Inngest event key>
INNGEST_SIGN_KEY=<Inngest sign key>

OPENAI_API_KEY=<OpenAI key>

STRIPE_SECRET_KEY=<Stripe secret key>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<Stripe publishable key>

CLERK_SECRET_KEY=<Clerk secret key>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<Clerk publishable key>

DEVELOPMENT_SERVER_HOSTNAME=<public tunnel hostname, see Transcription callbacks below>
```

You can run the service locally using:

```
$ yarn workspace webapp dev
```

### Background processing

Background tasks (ingesting a podcast, transcribing and summarizing episodes) run as
[Inngest](https://inngest.com) functions, served from `/api/inngest`. Clicking **Process**
in the UI only sends an event -- nothing happens unless something is listening for it.

Locally that listener is the [Inngest dev server](https://www.inngest.com/docs/dev-server),
which you run alongside `yarn workspace webapp dev` in a separate terminal. Either of these
works, and they run the same thing:

```
$ yarn workspace webapp inngest-dev
```

```
$ npx inngest-cli@latest dev
```

The first is a workspace script that simply wraps the second. Prefer it if you want a single
source of truth: should the project ever pin a version or add flags such as `--port`, the
script changes in one place and these instructions stay correct. It also sits next to `dev`
in `packages/webapp/package.json`, so `yarn workspace webapp dev` and
`yarn workspace webapp inngest-dev` are easy to find together.

Prefer the second if you would rather see exactly what is being executed, or if you are
working outside this repo's directory tree, where the `yarn workspace` form needs the
workspace name to resolve. Be aware that `@latest` means npm resolves a possibly new version
of the CLI on every run, so behaviour can change between sessions without anything in the
repo changing. Both forms share that caveat, since the script wraps the same command.

The dev server listens on port 8288, discovers `http://localhost:3000/api/inngest`
automatically, and serves a dashboard at http://127.0.0.1:8288 where you can watch events
arrive and inspect each step of a run. This dashboard is the best place to find out why an episode failed. If
the dev server is not running, events are accepted but never executed, and episodes sit in
the pending state with no error to explain it.

**When deployed there is no equivalent process to run.** Inngest Cloud invokes your deployed
`/api/inngest` endpoint directly, so adding the Inngest integration to your Vercel project
(see [Environment setup](#environment-setup)) is all that is required.

### Transcription callbacks

Deepgram does not return transcripts synchronously. It calls back to
`https://$DEVELOPMENT_SERVER_HOSTNAME/api/episode/<id>/transcript`, so that host has to be
publicly reachable and forward to your dev server. Locally this means a tunnel -- for
example `tailscale serve`, `ngrok http 3000`, or:

```
$ cloudflared tunnel --url http://localhost:3000
```

Set the resulting hostname (no `https://` prefix) as `DEVELOPMENT_SERVER_HOSTNAME` in
`packages/webapp/.env.local`. Note that ad-hoc tunnel hostnames usually change every time
the tunnel restarts, so this value needs updating whenever that happens.

Without a working tunnel, transcription starts but the transcript never arrives: the run
waits at the `transcript-received` step and gives up an hour later. In production the
callback host comes from `VERCEL_PROJECT_PRODUCTION_URL` and no tunnel is needed.

## Help, support, and questions

Please [file an issue](https://github.com/mdwelsh/podverse/issues) if you have any problems
or need help!
