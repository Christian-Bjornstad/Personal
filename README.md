# Restplass Travel Alerts

This project is a simple, production-leaning Node.js + TypeScript alert system for Restplass travel searches. It reads two local OpenAPI files, runs saved searches once per execution, normalizes package holiday and flight-only results into one internal model, compares them with the previous run, and sends Discord notifications only when meaningful changes happen.

The local OpenAPI specs are the single source of truth for:

- which endpoint is called
- which query parameters are allowed
- which response shape is expected
- whether auth exists

The current Restplass specs in this repository do not declare any API authentication requirement, so the app does not send API credentials.

## Supported local spec filenames

The loader supports these charter spec filenames:

- `specs/api_search.json`
- `api_search.json`
- `specs:api_search.json`

The loader supports these flight spec filenames:

- `specs/api_search_flights.json`
- `specs/api_search (1).json`
- `api_search_flights.json`
- `api_search (1).json`
- `specs:api_search_flights.json`
- `specs:api_search (1).json`

The repository includes the provided files under `specs/` for convenience:

- [api_search.json](/Users/christian/Desktop/Ferie/specs/api_search.json)
- [api_search_flights.json](/Users/christian/Desktop/Ferie/specs/api_search_flights.json)

## What the app does

1. Loads the two local OpenAPI specs from disk.
2. Inspects the real server URL, GET path, query params, and response schema.
3. Loads saved searches from [saved-searches.json](/Users/christian/Desktop/Ferie/config/saved-searches.json).
4. Runs every enabled search against either the charter API or the flights API.
5. Normalizes both APIs into a shared `NormalizedOffer` model.
6. Compares the latest run with [last-results.json](/Users/christian/Desktop/Ferie/data/last-results.json).
7. Sends Discord alerts only for:
   - new offers
   - price drops that meet the configured NOK or percent threshold
   - rating improvements when configured
8. Writes updated state back to `data/last-results.json`.

## Project structure

```text
.
├─ specs/
│  ├─ api_search.json
│  └─ api_search_flights.json
├─ config/
│  ├─ saved-searches.json
│  └─ defaults.json
├─ data/
│  └─ last-results.json
├─ src/
│  ├─ index.ts
│  ├─ scheduler.ts
│  ├─ config.ts
│  ├─ openapi/
│  │  ├─ loader.ts
│  │  └─ inspector.ts
│  ├─ clients/
│  │  ├─ charter-client.ts
│  │  └─ flights-client.ts
│  ├─ models/
│  │  ├─ saved-search.ts
│  │  ├─ normalized-offer.ts
│  │  └─ state.ts
│  ├─ services/
│  │  ├─ search-runner.ts
│  │  ├─ normalizer.ts
│  │  ├─ diff-engine.ts
│  │  ├─ discord.ts
│  │  └─ persistence.ts
│  ├─ utils/
│  │  ├─ dates.ts
│  │  ├─ logger.ts
│  │  └─ query.ts
│  └─ types/
│     └─ openapi.ts
├─ .github/
│  └─ workflows/
│     └─ daily-travel-alerts.yml
├─ package.json
├─ tsconfig.json
├─ .env.example
└─ README.md
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Discord webhook

Copy `.env.example` to `.env` and set:

```bash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### 3. Review or edit saved searches

Saved searches live in [saved-searches.json](/Users/christian/Desktop/Ferie/config/saved-searches.json).

Rules:

- `type` must be `charter` or `flights`
- `params` must use the exact query parameter names defined in the relevant OpenAPI spec
- array params must stay arrays, for example `fields` and `features`
- notification thresholds are configured per search under `notify_on`

Example supported search styles already included:

- cheap sun holiday
- city trip
- all inclusive family trip
- direct flight only
- flexible 1-week flight trip

### 4. Run locally

Development mode:

```bash
npm run dev
```

Build and run compiled output:

```bash
npm run build
npm run once
```

## How the OpenAPI specs are used

The application does not invent or blindly trust hand-written query shapes.

- `src/openapi/loader.ts` finds the local JSON files
- `src/openapi/inspector.ts` extracts the real GET operation, server URL, path, allowed query params, and response schema
- `src/utils/query.ts` validates outgoing params against the inspected OpenAPI parameter definitions before the HTTP request is sent
- the clients only send parameters that exist in the inspected spec

## State persistence

State is stored in [last-results.json](/Users/christian/Desktop/Ferie/data/last-results.json).

This file contains the last seen offers per search, including the stable ID, latest price, first seen time, and last seen time. On each successful run:

1. the app compares current normalized offers with the previous state
2. it decides which alerts matter
3. it writes the new state back to `data/last-results.json`

This is important for GitHub Actions because it prevents the same deals from being announced every day as if they were new.

## Stable ID behavior

Flights use `offer_id` when present.

Charter results do not expose a dedicated unique ID in the current spec, so the app derives a deterministic stable ID from stable hotel/trip fields. The implementation intentionally excludes price from the charter stable ID so price drops can be detected across runs.

## Discord notifications

Notifications use the booking URL from the API field named `url`.

Each alert includes:

- saved search name
- offer title
- total price
- price per person when present
- departure and return dates when present
- rating when present
- supplier when present
- booking URL

If there are no relevant changes, nothing is sent.

## GitHub Actions

The workflow at [daily-travel-alerts.yml](/Users/christian/Desktop/Ferie/.github/workflows/daily-travel-alerts.yml) supports:

- scheduled daily runs at 06:00 UTC
- manual runs with `workflow_dispatch`
- Node.js 20
- writing updated state back to the repository

### GitHub setup

1. Push this repository to GitHub.
2. Add a repository secret named `DISCORD_WEBHOOK_URL`.
3. Make sure Actions has permission to write contents if you want automatic commits of `data/last-results.json`.

## Renaming the second spec file

If your second Restplass file arrives as `api_search (1).json`, you can either:

- keep that filename, because the loader supports it
- rename it to `api_search_flights.json`

Both are supported.

## Assumptions

- The OpenAPI `servers[0].url` currently contains the full request URL, and the code preserves that.
- The current specs expose no auth or API key requirement.
- Charter rating alerts are based on `guest_rating`, because that is the rating-like response field present in the current charter spec.

# Personal
