# Plant Care

AI-assisted plant care: identify a plant from a photo, diagnose issues and get treatment suggestions, and track watering/fertilizing/misting.

- **Framework**: Next.js (App Router, TypeScript), deployable to Vercel.
- **Backend**: Firebase — Auth (Google sign-in), Firestore, Storage.
- **AI**: OpenAI `gpt-4o-mini` vision, called server-side only, gated by a shared daily token budget tracker.
- **Testing**: Vitest + React Testing Library (unit/component), Playwright (E2E against the Firebase Local Emulator Suite, with OpenAI mocked).

## One-time setup

These steps can't be automated — they require your own Firebase and OpenAI accounts.

1. **Create a Firebase project** at [console.firebase.google.com](https://console.firebase.google.com).
   - **Authentication** → Sign-in method → enable **Google**.
   - **Firestore Database** → create in production mode.
   - **Storage** → create a default bucket.
2. **Get the web app config**: Project Settings → General → Your apps → add a web app → copy the config values into `.env.local` (copy `.env.local.example` first).
3. **Get a service account key** (used server-side only, to verify Firebase ID tokens before calling OpenAI): Project Settings → Service Accounts → Generate new private key. Paste the entire downloaded JSON as a single-line string into `FIREBASE_SERVICE_ACCOUNT_KEY`.
4. **Deploy the security rules**:
   ```bash
   npm install -g firebase-tools   # if not already installed
   firebase login
   firebase use --add               # link this directory to your Firebase project
   firebase deploy --only firestore:rules,storage:rules
   ```
5. **Get an OpenAI API key** at [platform.openai.com](https://platform.openai.com) and set `OPENAI_API_KEY` in `.env.local`.
6. **On Vercel**: set every var from `.env.local.example` in the project's Environment Variables settings before deploying.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Testing

```bash
npm test              # unit + component tests (Vitest)
npm run test:watch    # watch mode
npm run lint
npm run build          # type-check + production build
```

### End-to-end tests

```bash
npx playwright install chromium   # one-time
npm run test:e2e
```

This spins up the Firebase Local Emulator Suite (Auth/Firestore/Storage) and a production build of the app, signs in through the Auth emulator's fake Google IDP popup (no real Google account needed), and exercises the full flow: add a plant (including a HEIC photo, converted client-side), log and delete a care event, run a diagnosis, and delete the plant. OpenAI is fully mocked (`OPENAI_MOCK=true`, set automatically by `playwright.config.ts`) — no real API calls, no cost, no shared token-budget usage.

Requires the `firebase` CLI (`npm install -g firebase-tools`) to be on `PATH`; no real Firebase project or OpenAI key is needed to run E2E tests.

## Architecture notes

- **Auth is client-side only** (`AuthProvider` + `AuthGuard`, no SSR session middleware) — protected pages briefly render nothing while Firebase resolves the signed-in user client-side.
- **Firestore/Storage writes happen client-side**, under the security rules in `firestore.rules` / `storage.rules`. The `/api/identify` and `/api/diagnose` routes only proxy the OpenAI call (after verifying the caller's Firebase ID token) — they never touch Firestore/Storage directly.
- **Token budget**: this app checks/reports against a shared daily token-usage tracker (`src/lib/tokenTracker.ts`) before/after every OpenAI call. The budget is shared across other apps using the same tracker, not scoped to this app alone.
- **Reminders are dashboard-only** in this version (overdue/OK/not-tracked badges, sorted most-overdue-first). Email/push notifications are an intentional fast-follow, not built yet.
