# Screenshots

Preview images referenced from the root [`README.md`](../../README.md) and embedded inside the landing page at `/`.

## Current captures

| File | Screen | Captured from |
|---|---|---|
| `landing-hero.png` | `/` — marketing landing page | Dev server on `localhost` |
| `volunteer-home.png` | `/volunteer` — Start My Shift | Sample-data mode |
| `shift-view.png` | `/shift` — route stops with Navigate / Claim / Complete | Sample-data mode (30-minute shift) |
| `locations-list.png` | `/locations` — Places list with status filters | Sample-data mode |
| `progress.png` | `/progress` — thermometer + service-area breakdown | Sample-data mode |

## Refreshing captures

1. `npm run dev`, then open the URL Vite prints (usually `http://localhost:5173`).
2. Click **Try sample data** in the setup wizard to hydrate a ~60-stop demo org without any external services.
3. Walk through each screen and capture at either:
   - **Mobile frame** — 390x844 (iPhone 14) or 430x900 (iPhone 14 Pro Max). Good for `/volunteer`, `/shift`, `/locations`, `/progress`.
   - **Desktop frame** — 1280 wide or more. Good for `/` (landing) and future admin screens.
4. Save as a PNG into this folder using the filenames above so existing README references keep working.

## Still on the wishlist

These are not yet captured and are tracked as follow-ups:

| File | Screen |
|---|---|
| `admin-overview.png` | `/admin` — overview and recent activity (requires Supabase-connected admin session) |
| `admin-review.png` | `/admin/review` — suggested places queue |
| `locations-map.png` | `/locations` with the **Map** tab selected (requires a Google Maps key) |

Drop the PNGs in this folder and they'll slot into the README automatically.
