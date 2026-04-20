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

If your project was provisioned before the Phase 2 grant-reporting tables
existed (symptom: admin UI 404s on `/rest/v1/campaigns`), open the Supabase
SQL editor and run [`upgrade-campaigns.sql`](./upgrade-campaigns.sql). It is
fully idempotent — safe to paste in whole, safe to re-run — and adds the
`campaigns`, `shifts`, and `shift_members` tables, the late-bound FKs on
`location_history`, the shift/campaign RPCs, the permissive RLS policies, and
a `notify pgrst, 'reload schema'` at the end so PostgREST picks up the new
tables immediately.

`schema.sql` itself is also idempotent now (`create table if not exists`,
`drop policy if exists` + `create policy`, guarded `add constraint`), so
re-running the full file against an existing project is equally safe.

### Mid-shift suggested places (find more + drop-ins)

To enable the volunteer shift's **Find more places** flow and the **Log a
drop-in** form, run [`upgrade-suggested-places.sql`](./upgrade-suggested-places.sql).
It adds the `create_suggested_place` RPC, which inserts a new location with
`status='pending_review'` and `source='suggested'` so admins can review it in
the existing admin review queue. Also idempotent.

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
| `GET /rest/v1/campaigns … 404` when opening Admin → Campaigns | Project predates the grant-reporting tables. Run [`upgrade-campaigns.sql`](./upgrade-campaigns.sql) in the SQL editor. |
| Realtime not updating | Enable replication for `locations`. |
| `join_volunteer` fails | Ensure `org_invites` has a row for your `organization_id` and `token` (wizard creates this). |
| JWT errors | Double-check URL and anon key; no service role key in the client. |
