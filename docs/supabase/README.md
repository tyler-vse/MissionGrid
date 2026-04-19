# Supabase setup for MissionGrid

Branding and product copy live in [`src/config/app.config.ts`](../../src/config/app.config.ts).

## 1. Create a project

1. Go to [supabase.com](https://supabase.com) and create a **new project** (free tier is fine).
2. Wait for provisioning. Note **Project URL** and **anon public key** (Settings → API).

## 2. Run the schema

1. Open **SQL Editor** in the Supabase dashboard.
2. Paste the contents of [`schema.sql`](./schema.sql) and run it.
3. Optional: under **Database → Replication**, add `locations` and `location_history` to the `supabase_realtime` publication so volunteer devices receive live updates.

### Upgrading an existing project (campaigns + shifts + party join)

The grant-reporting tables (`campaigns`, `shifts`, `shift_members`) and the
`record_location_action` / `start_shift` / `end_shift` / `generate_party_token`
/ `join_shift_party` / `update_shift_party_size` RPCs ship in the same
`schema.sql`. Re-running the file on an existing project is idempotent for the
RPCs and trigger (they use `create or replace`), but the `create table`
statements will error if a table already exists. For an in-place upgrade, run
just the new `create table public.campaigns ...`, `public.shifts ...`,
`public.shift_members ...`, the `alter table public.volunteers add column if
not exists is_ephemeral ...`, the `alter table public.location_history add
column if not exists shift_id ...` / `acted_by_member_id ...` plus the two
late-bound FK `alter table` statements, then the `create or replace function`
blocks, then the new RLS rows. Man-hours = `shift duration × party_size`.

## 3. Authentication (admin signup in the wizard)

The setup wizard uses **email + password** for the first admin (`signUp` / `signIn`).

1. In Supabase: **Authentication → Providers → Email**, enable email/password.
2. For development, you can disable “Confirm email” so admins can sign in immediately.

Volunteers **do not** use Supabase Auth; they join via the invite link and `join_volunteer` RPC.

## 4. Paste keys into MissionGrid

1. Run the app and open **Setup**.
2. Enter **Supabase URL** and **anon key**, then **Test connection**.
3. Complete the wizard; keys are stored in the browser (`localStorage`), not in git.

> **Security:** The anon key is public by design. Protect data with RLS. The bundled schema uses **permissive** policies suitable when **each nonprofit uses its own Supabase project**. For multiple orgs in one database, replace policies with stricter rules and/or Edge Functions.

## 5. Invite link

After setup, the wizard shows an invite URL (`/join#mg-invite-v1...`). Share it with volunteers; it encodes the project URL, anon key, organization id, and invite token.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| “relation does not exist” | Run `schema.sql`. |
| “Could not find the table … in the schema cache” (PostgREST `PGRST205`) | Run `schema.sql` in the Supabase SQL editor. Wizard step 2 offers a one-click **Copy schema SQL** + **Open SQL Editor** helper. |
| Realtime not updating | Enable replication for `locations`. |
| `join_volunteer` fails | Ensure `org_invites` has a row for your `organization_id` and `token` (wizard creates this). |
| JWT errors | Double-check URL and anon key; no service role key in the client. |
