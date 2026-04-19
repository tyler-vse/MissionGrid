/**
 * Pre-flight checklist items shown before an admin starts the Supabase-backed
 * setup wizard. Items describe access or assets an all-volunteer organization
 * commonly needs in place so the person driving the launch does not have to
 * stop midway and chase down a Workspace admin, treasurer, or board member.
 *
 * For access items we also ship two email templates the admin can copy/paste:
 *   - "walkthrough": the helper does the work on the admin's behalf.
 *   - "grant":       the helper grants the admin the permissions needed so
 *                    the admin can finish the task themselves.
 */

import { APP_CONFIG } from '@/config/app.config'

export type PreflightKind = 'access' | 'asset'

export type DelegationMode = 'walkthrough' | 'grant'

export interface PreflightDelegationContext {
  appOrigin: string
  appName: string
  orgName: string
  requesterName: string
  requesterEmail: string
}

export interface DelegationEmail {
  subject: string
  body: string
}

export interface PreflightDelegation {
  /** Short label for who typically holds this access. */
  recipientRole: string
  /** One-line summary of what we ask this person to do. */
  ask: string
  /** "Walk them through it" template — helper executes the task. */
  walkthrough: (ctx: PreflightDelegationContext) => DelegationEmail
  /**
   * "Grant me access" template — helper elevates the requester so they can
   * complete the task themselves. `null` means this option is not meaningful
   * for this item (e.g. board sign-off cannot be "granted").
   */
  grant: ((ctx: PreflightDelegationContext) => DelegationEmail) | null
}

export interface PreflightItemConfig {
  id: string
  title: string
  /** One-line subtitle shown next to the title, before the card is expanded. */
  subtitle: string
  /** Long-form explanation, surfaced when the item is expanded. */
  detail: string
  kind: PreflightKind
  /** Required items block the "Continue" button until resolved. */
  required: boolean
  /** Estimated time to resolve once the right person is in the loop. */
  estimatedTime: string
  /** Only populated for `kind: 'access'` items. */
  delegation?: PreflightDelegation
}

/* ---------- helpers ---------------------------------------------------- */

function signOff(ctx: PreflightDelegationContext): string {
  const who = ctx.requesterName.trim() || 'A fellow volunteer'
  const contact = ctx.requesterEmail.trim() ? ` (${ctx.requesterEmail.trim()})` : ''
  return `Thanks so much,\n${who}${contact}`
}

function intro(ctx: PreflightDelegationContext, purpose: string): string {
  const who = ctx.requesterName.trim() || 'a fellow volunteer'
  const org = ctx.orgName.trim() || 'our volunteer team'
  return `Hi,\n\nI'm ${who} helping ${org} launch a new field-coordination tool called ${ctx.appName}. ${purpose}`
}

/* ---------- items ------------------------------------------------------ */

export const PREFLIGHT_ITEMS: PreflightItemConfig[] = [
  {
    id: 'google-cloud-project',
    title: 'Google Cloud project with Maps APIs enabled',
    subtitle:
      'Needed for the map, address autocomplete, and turning addresses into coordinates.',
    detail:
      "MissionGrid needs a Google Cloud project with the Maps JavaScript, Places, and Geocoding APIs turned on, plus an API key restricted to this app's domain. If your org already has a Google Workspace, this usually means getting Project Owner (or at least Editor) on a new or existing Cloud project.",
    kind: 'access',
    required: true,
    estimatedTime: '~10 minutes',
    delegation: {
      recipientRole: 'Google Workspace / Cloud admin',
      ask: 'Create a Cloud project and API key, or grant me access to do it.',
      walkthrough: (ctx) => ({
        subject: `Quick Google Cloud setup for ${ctx.orgName || 'our team'} on ${ctx.appName}`,
        body: [
          intro(
            ctx,
            "I need a Google Cloud API key so volunteers get a working map and address search. The setup below takes about 10 minutes and stays inside Google's monthly free credit (small nonprofits typically spend $0/month).",
          ),
          '',
          'Step-by-step (every link jumps straight to the right page):',
          '',
          '1. Open https://console.cloud.google.com/ and sign in with the account that should own this.',
          '2. At the top of the page, open the project dropdown and click "New project". Name it something like "' +
            (ctx.orgName || 'Volunteer Org') +
            ' - ' +
            ctx.appName +
            '".',
          '3. Link a billing account: https://console.cloud.google.com/billing',
          "   (A card is required even to stay on the free tier. If the org doesn't have a Cloud billing account yet, the treasurer can set one up with a nonprofit card.)",
          '4. Enable these three APIs — open each link and click the blue "Enable" button:',
          '   - Maps JavaScript API: https://console.cloud.google.com/apis/library/maps-backend.googleapis.com',
          '   - Places API:          https://console.cloud.google.com/apis/library/places-backend.googleapis.com',
          '   - Geocoding API:       https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com',
          '5. Create a key: https://console.cloud.google.com/apis/credentials',
          '   Click "+ Create credentials" → "API key". Copy the key.',
          '6. Click the key you just made, then under "Application restrictions" pick "HTTP referrers" and paste these two lines into the allowed referrers list:',
          `     ${ctx.appOrigin}/*`,
          '     http://localhost:5173/*',
          '   Under "API restrictions", restrict it to the three APIs from step 4.',
          '7. Send the key back to me by replying to this email (please send it directly to me, not to a list).',
          '',
          "That's it — as soon as I have the key I can finish the rest of the setup without bothering you again.",
          '',
          signOff(ctx),
        ].join('\n'),
      }),
      grant: (ctx) => ({
        subject: `Please add me as Owner on a Google Cloud project for ${ctx.appName}`,
        body: [
          intro(
            ctx,
            "I can run through the Google Cloud setup myself in about 10 minutes — I just need Project Owner (or Editor + Service Account Admin) on a Cloud project so I can enable APIs and create an API key.",
          ),
          '',
          'What to do (takes about 2 minutes):',
          '',
          '1. Open https://console.cloud.google.com/ and sign in.',
          '2. Either create a new project named "' +
            (ctx.orgName || 'Volunteer Org') +
            ' - ' +
            ctx.appName +
            '" (project dropdown → New project) or pick an existing one that can use billing.',
          '3. Make sure a billing account is linked: https://console.cloud.google.com/billing',
          '4. Open IAM: https://console.cloud.google.com/iam-admin/iam',
          '5. Click "+ Grant access", add my Google account below, and assign the "Owner" role.',
          '',
          `My Google account: ${ctx.requesterEmail.trim() || '[your Google email]'}`,
          '',
          "Once you've done that, just reply with the project name and I'll take it from there — no further ask.",
          '',
          signOff(ctx),
        ].join('\n'),
      }),
    },
  },
  {
    id: 'billing-method',
    title: 'A billing method the Google Cloud project can use',
    subtitle:
      'Google requires a card on file even though nonprofit usage is normally $0.',
    detail:
      "Google Maps Platform offers a monthly free credit (currently ~$200) that covers small canvassing campaigns several times over. But Google won't activate the APIs until a billing account with a valid payment method is attached. If you're not the person who holds the org's card, this is usually the step that stalls launches.",
    kind: 'access',
    required: true,
    estimatedTime: '~5 minutes',
    delegation: {
      recipientRole: 'Treasurer / card holder',
      ask: 'Add a card to the Google Cloud billing account for this project.',
      walkthrough: (ctx) => ({
        subject: `Adding a payment method to Google Cloud for ${ctx.appName}`,
        body: [
          intro(
            ctx,
            "Google Cloud needs a card on file before it will turn on Maps. Nonprofit canvassing usage almost always stays inside Google's monthly free credit (recently $200/month), so the card is effectively a formality — but without it nothing works.",
          ),
          '',
          'How to add it (about 5 minutes):',
          '',
          '1. Open https://console.cloud.google.com/billing and sign in.',
          '2. If a billing account already exists for the org, open it. Otherwise click "Create account" and follow the prompts.',
          '3. In the billing account, go to "Payment method" and click "Add payment method".',
          '4. Enter the card details. Save.',
          '5. Back on the Billing overview, click "Link a project" and select the project named "' +
            (ctx.orgName || 'Volunteer Org') +
            ' - ' +
            ctx.appName +
            '" (or whatever the Cloud admin named it).',
          '',
          "Optional but recommended: set a budget alert at $25 so you're notified before any real charges ever occur.",
          '',
          'Reply to let me know once the card is attached and I can pick up from there.',
          '',
          signOff(ctx),
        ].join('\n'),
      }),
      grant: (ctx) => ({
        subject: `Need to add me to the Google Cloud billing account for ${ctx.appName}`,
        body: [
          intro(
            ctx,
            "I can attach the payment method to the Cloud project myself if I'm added to the billing account — that way I don't need to handle the card details or go back and forth.",
          ),
          '',
          'What to do:',
          '',
          '1. Open https://console.cloud.google.com/billing and pick the org billing account.',
          '2. Open "Account management" in the left nav.',
          '3. Click "+ Add members", paste my Google account below, and assign the role "Billing Account Administrator".',
          '',
          `My Google account: ${ctx.requesterEmail.trim() || '[your Google email]'}`,
          '',
          "Once I'm added I'll link the project and double-check that we stay on the free tier. A budget alert at $25/month is built in so you'll hear from Google the moment anything unexpected happens.",
          '',
          signOff(ctx),
        ].join('\n'),
      }),
    },
  },
  {
    id: 'domain-redirect',
    title: "Permission to add this app's URL to approved redirects",
    subtitle:
      "Only needed if you'll host on your org's custom domain or have an IT/webmaster gatekeeper.",
    detail:
      "MissionGrid runs entirely in the browser and ships sign-in magic links via Supabase. As long as you're fine hosting on the default URL you're running this on now, there is nothing to do. If your webmaster controls a custom domain (e.g. app.yourorg.org) and you want to point it at MissionGrid, they'll need to add a DNS record.",
    kind: 'access',
    required: false,
    estimatedTime: '~10 minutes',
    delegation: {
      recipientRole: 'Webmaster / IT contact',
      ask: "Point a subdomain at the MissionGrid app, or confirm we don't need to.",
      walkthrough: (ctx) => ({
        subject: `Quick DNS ask for ${ctx.appName} (${ctx.orgName || 'volunteer team'})`,
        body: [
          intro(
            ctx,
            `We want volunteers to reach ${ctx.appName} at a subdomain on our site (something like app.${(ctx.orgName || 'yourorg').toLowerCase().replace(/[^a-z0-9]+/g, '')}.org) instead of the default URL.`,
          ),
          '',
          'If that sounds fine, here is what I need from you:',
          '',
          `1. Pick a subdomain (my suggestion: app.${(ctx.orgName || 'yourorg').toLowerCase().replace(/[^a-z0-9]+/g, '')}.org).`,
          '2. Create a CNAME record in our DNS pointing that subdomain at the host shown in the app\'s current URL:',
          `     ${ctx.appOrigin}`,
          '3. Reply with the final subdomain once DNS is live so I can add it to the app\'s allowed sign-in redirects.',
          '',
          "If we don't have a custom domain to use, just reply \"use the default\" and I'll proceed with the URL shown above.",
          '',
          signOff(ctx),
        ].join('\n'),
      }),
      grant: null,
    },
  },
  {
    id: 'volunteer-roster',
    title: 'Volunteer roster ready to invite',
    subtitle:
      "Names, emails, and/or phone numbers of the people you'll send the invite link to.",
    detail:
      "Setup produces a single invite link. You paste it into email, Signal, WhatsApp, group chats, wherever. Having a committed roster ready — even 5-10 people for a pilot — means volunteers can start claiming turf the day you finish setup instead of weeks later.",
    kind: 'asset',
    required: false,
    estimatedTime: '~15 minutes',
  },
  {
    id: 'location-list',
    title: 'Your list of locations or addresses',
    subtitle: 'The places volunteers will actually visit, in a CSV or spreadsheet.',
    detail:
      "You'll upload this during setup. Minimum columns: a name and an address (or latitude/longitude). If you only have addresses, MissionGrid will geocode them using your Google Maps key. A template and sample rows are offered on the CSV step, so you don't have to format anything from scratch.",
    kind: 'asset',
    required: false,
    estimatedTime: '~30 minutes',
  },
  {
    id: 'service-area',
    title: 'Agreement on the service area',
    subtitle:
      'A clear center point and roughly how far out volunteers should cover.',
    detail:
      "Before setup, agree with your coordinators on (a) the rough center of the campaign (an intersection, a church, a ward office) and (b) how far outward it reaches (half a mile? five kilometers?). You can adjust later, but having this settled avoids redoing the territory mid-launch.",
    kind: 'asset',
    required: false,
    estimatedTime: '~10 minutes',
  },
  {
    id: 'board-signoff',
    title: 'Campaign lead or board sign-off',
    subtitle:
      'A quick yes from the people who said to run this — heads off surprises after invites go out.',
    detail:
      "Many volunteer orgs require a board chair or lead coordinator to bless any new tool before it touches the volunteer list. This is a no-code item, but forgetting it is a classic source of last-minute delays. Five minutes in an email now is cheaper than pausing a campaign after invites are sent.",
    kind: 'access',
    required: false,
    estimatedTime: '~5 minutes',
    delegation: {
      recipientRole: 'Campaign lead / board chair',
      ask: "Sign off that we're rolling MissionGrid out to volunteers.",
      walkthrough: (ctx) => ({
        subject: `Heads-up: rolling out ${ctx.appName} to ${ctx.orgName || 'our volunteers'}`,
        body: [
          intro(
            ctx,
            `Before I send invites to the volunteer list, I wanted to give you a short summary and get a thumbs-up.`,
          ),
          '',
          `What ${ctx.appName} is:`,
          '- A lightweight web app for coordinating door-to-door / location-based volunteer work so people don\'t double up on the same addresses.',
          '- Runs in any modern browser — no install required.',
          '- Data lives in our own Supabase project; Maps data comes from our own Google Cloud project. No vendor sees volunteer contact info.',
          '',
          'What the rollout looks like:',
          '- I finish setup and get one invite link.',
          '- I send that link to our volunteer roster.',
          '- Volunteers sign in with their email (no password to remember), claim a location, and check it off when done.',
          '',
          `What I need from you:`,
          `- A reply saying "go ahead" (or any concerns to address first).`,
          "- If you'd like a 10-minute walkthrough before invites go out, let me know a time that works.",
          '',
          signOff(ctx),
        ].join('\n'),
      }),
      grant: null,
    },
  },
]

export const APP_NAME = APP_CONFIG.name
