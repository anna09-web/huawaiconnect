# HuaweiConnect

A full-stack web app that bridges your **Huawei Health** account with any external tool via a clean REST API. Connect once, then query your steps, heart rate, sleep, calories, activities, SpO2, and stress level from Grafana, n8n, or anywhere.

## Features

- **Huawei Health OAuth 2.0** — connect your account with one click
- **Auto-sync** — background cron job refreshes data every 30 minutes
- **Health Dashboard** — charts for steps, heart rate, sleep stages, calories, weekly overview
- **API Key Management** — named keys with optional expiry and revocation
- **Public REST API** — query all health metrics with date ranges and pagination
- **Built-in API docs** — interactive `/docs` page with copy-paste curl examples
- **Security** — API keys hashed with bcrypt, OAuth tokens encrypted at rest, rate limiting (100 req/hour)

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- PostgreSQL + Prisma ORM
- NextAuth.js v4
- Tailwind CSS + Radix UI components
- Recharts for visualizations

---

## Setup

### 1. Prerequisites

- Node.js 18+
- Docker (for local PostgreSQL) or a PostgreSQL instance

### 2. Clone & install

```bash
git clone https://github.com/yourorg/huaweiconnect
cd huaweiconnect
npm install
```

### 3. Environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values. Generate secrets:
```bash
openssl rand -base64 32   # for NEXTAUTH_SECRET and ENCRYPTION_SECRET
openssl rand -hex 32      # for CRON_SECRET
```

### 4. Start PostgreSQL

```bash
docker-compose up -d
```

### 5. Run database migrations

```bash
npx prisma migrate dev --name init
```

### 6. Seed with sample data (no real Huawei device needed)

```bash
npm run db:seed
```

This creates a `demo@example.com` user with 30 days of synthetic health data and a demo API key printed to the console.

### 7. Start the app

```bash
npm run dev
```

Open http://localhost:3000

---

## Getting Huawei OAuth Credentials

1. **Register** at https://developer.huawei.com

2. **Create a project** in AppGallery Connect → My Projects → New Project, add a Web app.

3. **Enable Health Kit** — go to APIs → Health Kit and apply for access.

4. **OAuth settings** — add redirect URI:
   - Local: `http://localhost:3000/api/huawei/callback`
   - Production: `https://yourdomain.com/api/huawei/callback`

5. **Copy credentials** to `.env`:
   ```
   HUAWEI_CLIENT_ID=your_app_id
   HUAWEI_CLIENT_SECRET=your_app_secret
   ```

Reference: https://developer.huawei.com/consumer/en/doc/auth-example-0000001054581058

---

## Background Sync (Cron)

The `/api/cron` endpoint syncs all connected users. Protect it with `CRON_SECRET`.

**Vercel Cron (vercel.json):**
```json
{
  "crons": [{ "path": "/api/cron", "schedule": "*/30 * * * *" }]
}
```
Set `x-cron-secret` header in Vercel dashboard.

**System cron:**
```bash
*/30 * * * * curl -H "x-cron-secret: $CRON_SECRET" https://yourapp.com/api/cron
```

---

## REST API

All endpoints require: `Authorization: Bearer hwh_yourapikey`

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/steps` | Daily step counts |
| GET | `/api/v1/heart-rate` | Heart rate measurements |
| GET | `/api/v1/sleep` | Sleep sessions with stages |
| GET | `/api/v1/calories` | Daily calorie burn |
| GET | `/api/v1/activities` | Workout sessions |
| GET | `/api/v1/summary/today` | All metrics for today |
| GET | `/api/v1/summary/week` | Weekly aggregated metrics |

### Common query parameters

| Param | Type | Description |
|-------|------|-------------|
| `from` | string | Start date (ISO 8601 or YYYY-MM-DD) |
| `to` | string | End date |
| `page` | number | Page number (default: 1) |
| `limit` | number | Per page (default: 100, max: 1000) |

### Rate limiting

- 100 requests per hour per API key
- Response headers: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Example curl calls

```bash
export API_KEY="hwh_yourapikey"
export BASE="https://yourapp.com"

# Today's summary
curl -H "Authorization: Bearer $API_KEY" "$BASE/api/v1/summary/today"

# Steps for January 2024
curl -H "Authorization: Bearer $API_KEY" \
  "$BASE/api/v1/steps?from=2024-01-01&to=2024-01-31"

# Heart rate last 7 days
curl -H "Authorization: Bearer $API_KEY" \
  "$BASE/api/v1/heart-rate?from=$(date -d '7 days ago' +%Y-%m-%d)"

# Sleep sessions
curl -H "Authorization: Bearer $API_KEY" \
  "$BASE/api/v1/sleep?from=2024-01-01&limit=10"

# This week's summary
curl -H "Authorization: Bearer $API_KEY" "$BASE/api/v1/summary/week"

# Recent activities (last 5)
curl -H "Authorization: Bearer $API_KEY" "$BASE/api/v1/activities?limit=5"
```

---

## Database Schema

```
User              - app accounts
HuaweiOAuthToken  - encrypted OAuth tokens per user
HealthDataPoint   - steps, heart_rate, calories, spo2, stress (type + value + timestamp)
SleepSession      - sleep sessions with stage breakdown
Activity          - workout sessions
ApiKey            - bcrypt-hashed keys with prefix, expiry, revocation
RateLimit         - sliding window counters per key
```

---

## Security

- API keys stored as **bcrypt hashes** (never plaintext)
- Huawei OAuth tokens **AES-encrypted** at rest
- Rate limiting: 100 requests/hour per API key
- CORS enabled for `/api/v1/*`
- Cron endpoint protected by `x-cron-secret` header

---

## License

MIT
