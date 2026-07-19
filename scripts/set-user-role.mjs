#!/usr/bin/env node
// Sets a user's role custom claim (PENDING / USER / ADMIN). This has to run
// outside the app because the in-app admin page requires an existing ADMIN
// to call it — use this once to bootstrap the first admin.
//
// Usage:
//   node --env-file=.env.local scripts/set-user-role.mjs <email> <PENDING|USER|ADMIN>
//
// Against the emulator instead (no service account needed), export
// FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 and NEXT_PUBLIC_FIREBASE_PROJECT_ID first.

import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const ROLES = ["PENDING", "USER", "ADMIN", "SUPERADMIN"];
const [email, role] = process.argv.slice(2);

if (!email || !ROLES.includes(role)) {
  console.error(`Usage: node --env-file=.env.local scripts/set-user-role.mjs <email> <${ROLES.join("|")}>`);
  process.exit(1);
}

function loadApp() {
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    return initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-plant-care" });
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    console.error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set. Run with --env-file=.env.local, " +
        "or set FIREBASE_AUTH_EMULATOR_HOST to target the emulator instead."
    );
    process.exit(1);
  }
  return initializeApp({ credential: cert(JSON.parse(raw)) });
}

const auth = getAuth(loadApp());
const user = await auth.getUserByEmail(email);
await auth.setCustomUserClaims(user.uid, { role });

console.log(`${email} (${user.uid}) is now ${role}.`);
