/**
 * Creates 12 Clerk users for seed data (3 planners + 9 couples).
 * Deletes old seed users first if they exist, then creates fresh ones.
 * Prints the user IDs ready to paste into seed.sql.
 *
 * Usage:
 *   npx tsx scripts/create-seed-users.ts
 *
 * Requires CLERK_SECRET_KEY in .env.local
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Read CLERK_SECRET_KEY from .env.local
function getClerkKey(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(__dirname, '..', '.env.local');
  const content = readFileSync(envPath, 'utf-8');
  const match = content.match(/^CLERK_SECRET_KEY=(.+)$/m);
  if (!match) {
    console.error('Missing CLERK_SECRET_KEY in .env.local');
    process.exit(1);
  }
  return match[1].trim();
}

const CLERK_SECRET_KEY = getClerkKey();

const BASE_EMAIL = 'wengland09';

const USERS = [
  { label: 'v_planner1', suffix: 'seed-planner1', firstName: 'Sarah',  lastName: 'Mitchell' },
  { label: 'v_planner2', suffix: 'seed-planner2', firstName: 'David',  lastName: 'Chen' },
  { label: 'v_planner3', suffix: 'seed-planner3', firstName: 'Olivia', lastName: 'Ramirez' },
  { label: 'v_couple1',  suffix: 'seed-couple1',  firstName: 'Emma',   lastName: 'Anderson' },
  { label: 'v_couple2',  suffix: 'seed-couple2',  firstName: 'Priya',  lastName: 'Patel' },
  { label: 'v_couple3',  suffix: 'seed-couple3',  firstName: 'Megan',  lastName: 'Tyler' },
  { label: 'v_couple4',  suffix: 'seed-couple4',  firstName: 'Aisha',  lastName: 'Johnson' },
  { label: 'v_couple5',  suffix: 'seed-couple5',  firstName: 'Sophie', lastName: 'Murphy' },
  { label: 'v_couple6',  suffix: 'seed-couple6',  firstName: 'Hannah', lastName: 'Davis' },
  { label: 'v_couple7',  suffix: 'seed-couple7',  firstName: 'Chloe',  lastName: 'Bennett' },
  { label: 'v_couple8',  suffix: 'seed-couple8',  firstName: 'Lily',   lastName: 'Carter' },
  { label: 'v_couple9',  suffix: 'seed-couple9',  firstName: 'Zara',   lastName: 'Hughes' },
];

async function clerkFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return res;
}

async function deleteOldSeedUsers() {
  // List all users and find ones with seed emails
  const emails = USERS.map(u => `${BASE_EMAIL}+${u.suffix}@gmail.com`);
  // Also check old example.com emails
  const oldEmails = USERS.map(u => `${u.suffix}@seedtest-wedledger.example.com`);
  const allEmails = new Set([...emails, ...oldEmails]);

  // Clerk API: list users by email (paginated)
  for (const email of allEmails) {
    const res = await clerkFetch(`/users?email_address=${encodeURIComponent(email)}`);
    if (!res.ok) continue;
    const users = await res.json();
    for (const user of users) {
      console.log(`  Deleting old user: ${user.id} (${email})`);
      await clerkFetch(`/users/${user.id}`, { method: 'DELETE' });
    }
  }
}

async function createUser(user: typeof USERS[number]): Promise<string> {
  const email = `${BASE_EMAIL}+${user.suffix}@gmail.com`;
  const res = await clerkFetch('/users', {
    method: 'POST',
    body: JSON.stringify({
      email_address: [email],
      first_name: user.firstName,
      last_name: user.lastName,
      password: 'SeedPassword123!',
      skip_password_checks: true,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to create ${user.label}: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return data.id;
}

async function main() {
  console.log('Cleaning up old seed users...\n');
  await deleteOldSeedUsers();

  console.log('\nCreating 12 Clerk users...\n');

  const results: { label: string; id: string }[] = [];

  for (const user of USERS) {
    try {
      const id = await createUser(user);
      results.push({ label: user.label, id });
      console.log(`  ${user.label} => ${id}  (${BASE_EMAIL}+${user.suffix}@gmail.com)`);
    } catch (err) {
      console.error(`  ${user.label} => ERROR: ${err}`);
    }
  }

  console.log('\n-- Paste these into seed.sql:\n');
  for (const r of results) {
    console.log(`  ${r.label} TEXT := '${r.id}';`);
  }
}

main();
