# CSV import format

MissionGrid accepts **header rows** (first line = column names). Headers are matched case-insensitively.

## Required columns

| Column | Aliases | Description |
|--------|---------|-------------|
| `name` | `title`, `business_name` | Stop or venue name |
| `address` | `street` | Street address line |

## Coordinates

| Column | Aliases | Description |
|--------|---------|-------------|
| `lat` | `latitude` | Decimal degrees |
| `lng` | `longitude`, `lon` | Decimal degrees |

You may omit `lat` / `lng` if you use **Geocode missing coordinates** in the Admin import UI (requires a Google Maps API key with Geocoding enabled). The wizard can geocode during cloud setup as well.

## Optional columns

| Column | Aliases | Description |
|--------|---------|-------------|
| `city` | | City |
| `state` | | State or province (two-letter codes are uppercased) |
| `postal_code` | `zip`, `postalcode` | ZIP / postal code |
| `category` | | Free-form tag |
| `notes` | `comment` | Shown to volunteers when relevant |

## Duplicates

Rows with the same normalized **name + address + postal code** are flagged as duplicates in the preview. By default, duplicates are **not** imported unless you check **Include duplicate rows**.

## Example

See [`sample-locations.csv`](./sample-locations.csv).
