# TODO

## Set up a real Firebase project

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

## Ship the role-approval feature (commit `4b34731`)

- [ ] Deploy the updated Firestore/Storage rules to the live Firebase project:
      `firebase deploy --only firestore:rules,storage:rules`
- [ ] Seed your account as SUPERADMIN (requires `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env.local`):
      `npm run set-user-role -- jason@astrojason.com SUPERADMIN`
- [ ] Deploy the app itself: `npm run deploy` (builds and runs `vercel deploy --prod`)
- [ ] Sign in once for real and confirm you land on `/dashboard`, not the "Waiting for approval" screen
- [ ] Visit `/admin` and confirm the user list loads and you can approve a second test account
