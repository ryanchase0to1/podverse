#!/usr/bin/env node
/**
 * Create the Supabase Storage buckets that Podchat Studio needs.
 *
 * `supabase db dump` only covers the `public` schema, so these buckets are absent from
 * supabase-schema.sql and have to be created separately. Without them, episode processing
 * fails at the transcribe step with "Bucket not found".
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the environment, falling back to
 * packages/webapp/.env.local. Safe to re-run: existing buckets are left untouched.
 *
 *   node scripts/create-storage-buckets.mjs [--dry-run]
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ENV_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env.local');

/**
 * Both upload helpers in packages/utils/src/storage.ts return getPublicUrl(), which only
 * resolves for public buckets, so all four are created public. Note this means anyone can
 * read an object if they know its path, and audio/transcript/summary paths are built from
 * sequential integer ids -- so treat everything stored here as world-readable.
 *
 * No per-bucket size or MIME limits: audio files are large and the project-wide limit
 * already applies.
 */
const BUCKETS = [
  { id: 'audio', usedFor: 'episode audio, uploaded before transcription' },
  { id: 'transcripts', usedFor: 'generated transcripts' },
  { id: 'summaries', usedFor: 'generated episode summaries' },
  { id: 'covers', usedFor: 'podcast and episode cover images' },
];

/** Minimal KEY=VALUE parser, so this script needs no dependencies. */
function parseEnvFile(path) {
  const values = {};
  if (!existsSync(path)) {
    return values;
  }
  for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const separator = line.indexOf('=');
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const fileEnv = parseEnvFile(ENV_PATH);
const supabaseUrl = (process.env.SUPABASE_URL || fileEnv.SUPABASE_URL || '').replace(/\/$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY || '';
const dryRun = process.argv.includes('--dry-run');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.');
  console.error(`Set them in the environment or in ${ENV_PATH}.`);
  console.error('The service role key is required: bucket creation is not permitted with the anon key.');
  process.exit(1);
}

function storageApi(path, init = {}) {
  return fetch(`${supabaseUrl}/storage/v1${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      'content-type': 'application/json',
      ...init.headers,
    },
  });
}

async function describeFailure(response) {
  const body = await response.text();
  return `HTTP ${response.status}${body ? ` - ${body}` : ''}`;
}

console.log(`Supabase project: ${supabaseUrl}`);
if (dryRun) {
  console.log('Dry run: no buckets will be created.');
}
console.log('');

const listResponse = await storageApi('/bucket');
if (!listResponse.ok) {
  console.error(`Could not list buckets: ${await describeFailure(listResponse)}`);
  process.exit(1);
}

const existing = new Map((await listResponse.json()).map((bucket) => [bucket.id, bucket]));
let created = 0;
let present = 0;
let failed = 0;

for (const { id, usedFor } of BUCKETS) {
  const found = existing.get(id);

  if (found) {
    // A private bucket would break getPublicUrl(), so surface it rather than leaving
    // uploads that succeed while every URL they return fails to load.
    const warning = found.public ? '' : '   WARNING: not public, stored URLs will not resolve';
    console.log(`  exists    ${id}${warning}`);
    present++;
    continue;
  }

  if (dryRun) {
    console.log(`  would create  ${id}  (${usedFor})`);
    continue;
  }

  const createResponse = await storageApi('/bucket', {
    method: 'POST',
    body: JSON.stringify({ id, name: id, public: true }),
  });

  if (createResponse.ok) {
    console.log(`  created   ${id}  (${usedFor})`);
    created++;
  } else {
    console.error(`  FAILED    ${id}: ${await describeFailure(createResponse)}`);
    failed++;
  }
}

console.log(dryRun ? '\nDry run complete.' : `\nDone. ${created} created, ${present} already present, ${failed} failed.`);
process.exit(failed > 0 ? 1 : 0);
