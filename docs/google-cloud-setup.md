# Google Cloud setup (Maps, Places, Geocoding)

MissionGrid uses **your** Google Cloud project and API keys. Nothing is hardcoded in the repo.

## 1. Create a project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or pick an existing one).

## 2. Enable APIs

Enable these APIs for the project:

- **Maps JavaScript API** — interactive map in the app  
- **Places API** — area search / autocomplete in Area tools  
- **Geocoding API** — optional address → coordinates for CSV import  

APIs & Services → Library → search each name → Enable.

## 3. Create an API key

1. APIs & Services → Credentials → Create credentials → API key.  
2. **Restrict the key** (recommended before sharing the app):
   - Application restriction: **HTTP referrers**  
   - Add your production domain(s) and `http://localhost:5173/*` for local dev.  
   - API restriction: restrict to the three APIs above.

## 4. Paste into MissionGrid

1. Open **Setup** (or Admin → link to setup).  
2. Enter the key in the **Google Maps** step and use **Test Google key**.  
3. The key is stored in the browser (`localStorage`), not in git.

## Billing

Google requires a billing account for Maps Platform, but there is a generous monthly credit suitable for small nonprofits. Monitor usage in Cloud Console.
