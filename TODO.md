## Setup / follow-up (manual — needs Jason)

### Set up a real Firebase project

`.firebaserc` currently only points at `demo-plant-care`, the fake project ID used by the
local emulators for tests — there's no real backend behind this app yet.

- [ ] Re-authenticate the Firebase CLI (current login token is expired): `firebase login --reauth`
- [ ] Confirm whether a real project already exists: `firebase projects:list`, or check
      https://console.firebase.google.com
- [ ] If none exists, create one: `firebase projects:create` (or via the console)
- [ ] Update `.firebaserc` to point `default` at the real project ID
- [ ] Enable Google sign-in in Authentication
- [ ] Set up Firestore and Storage in the new project
- [ ] Generate a service account key (Project Settings > Service Accounts) for
      `FIREBASE_SERVICE_ACCOUNT_KEY`
- [ ] Create `.env.local` from `.env.local.example` with the real
      `NEXT_PUBLIC_FIREBASE_*` web config, `FIREBASE_SERVICE_ACCOUNT_KEY`, and `OPENAI_API_KEY`
- [ ] Add the same env vars to the Vercel project so the production deploy has them

### Deploy to Vercel

The Vercel CLI is already authenticated as `astrojason`, but no project is linked yet.

- [ ] Run `npm run deploy` (runs `scripts/deploy.sh`: `npm ci`, `npm run build`, then
      `vercel deploy --prod`) — the first run will prompt to link or create the Vercel project
- [ ] In the Vercel project's Settings > Environment Variables, add the same values from
      `.env.local`: all `NEXT_PUBLIC_FIREBASE_*` vars, `FIREBASE_SERVICE_ACCOUNT_KEY`,
      `OPENAI_API_KEY`, and `OPENAI_VISION_MODEL`
- [ ] Re-run `npm run deploy` after adding env vars so the build picks them up
- [ ] Open the deployed URL and confirm the login page loads

### Ship the role-approval feature (commit `4b34731`)

- [ ] Deploy the updated Firestore/Storage rules to the live Firebase project:
      `firebase deploy --only firestore:rules,storage`
- [ ] Seed your account as SUPERADMIN (requires `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env.local`):
      `npm run set-user-role -- jason@astrojason.com SUPERADMIN`
- [ ] Sign in on the deployed app and confirm you land on `/dashboard`, not the
      "Waiting for approval" screen
- [ ] Visit `/admin` and confirm the user list loads and you can approve a second test account

## Bugs

- [ ] "Something looks wrong" diagnosis reported as not saving. Live-tested the full flow against the
      real Firebase project (upload → real OpenAI diagnosis → Save to plant → hard reload) twice and
      it persisted correctly both times, so this may already be resolved (possibly by the
      `382f381` OpenAI-structured-outputs fix) or may be intermittent / tied to a specific plant or
      photo. Needs repro steps from Jason (which plant, roughly when, any visible error) to pin down.

## Features

## Enhancements

- [ ] Nocturne redesign, web-width layouts (from `Plant Care app redesign.zip`, screen 7): the
      Today and Plants screens still render their mobile stacked layout at desktop width. The mock
      calls for a distinct wide layout — a 3-up grid for due cards, and a two-column split (a
      `.table` of all plants beside a "Latest diagnosis" card) — behind the shared sidebar shell
      that's already in place.
