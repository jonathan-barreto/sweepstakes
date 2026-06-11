# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Supabase backend project** for the Sweepstakes application. It uses PostgreSQL for the database and Supabase Edge Functions (Deno) for serverless APIs. The project emphasizes security, data normalization, and strict adherence to Supabase best practices.

## Tech Stack

- **Database**: PostgreSQL 17 (via Supabase)
- **Edge Functions**: Deno 2
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime (enabled)
- **Storage**: Supabase Storage (50MiB file limit)
- **Local Dev**: Supabase CLI with local database, email testing (Inbucket), and Studio

## Development Workflow

### Starting Local Development

```bash
# Start the local Supabase stack
supabase start

# Watch for changes and auto-reload edge functions
# (Deno hot reload enabled via edge_runtime.policy = "per_worker")
```

The following services are available locally:
- **API**: `http://127.0.0.1:54321`
- **Studio**: `http://127.0.0.1:54323` (database browser and auth management)
- **Email Testing**: `http://127.0.0.1:54324` (Inbucket - view test emails)
- **PostgreSQL**: `localhost:54322`
- **Edge Function Debugger**: `localhost:8083` (Chrome inspector)

### Creating Database Migrations

```bash
# Create a new migration
supabase migration new add_users_table

# Edit the generated file in supabase/migrations/[timestamp]_add_users_table.sql
# Then test locally:
supabase db reset

# View migration status
supabase migration list
```

**Follow the migration pattern** defined in `.windsurf/skills/migration/SKILL.md`:
- Include `created_at` and `updated_at` with `timestamptz not null default now()`
- Create indexes on foreign keys and frequently queried columns
- **Always enable RLS** with `alter table [table] enable row level security;`
- Add `updated_at` triggers using the reusable `update_updated_at_column()` function
- Use `uuid` primary keys with `gen_random_uuid()`
- Use `references auth.users(id) on delete cascade` for user foreign keys

⚠️ **Important**: RLS must be enabled for security, but NEVER create RLS policies automatically—they're business logic the developer defines.

### Creating Edge Functions

```bash
# Create a new edge function
supabase functions new my-function

# Edit supabase/functions/my-function/index.ts
# Test locally (auto-reloads via hot reload policy)
# The function is available at http://127.0.0.1:54321/functions/v1/my-function
```

**Follow the Edge Function template** from `.windsurf/skills/edge-functions/SKILL.md`:
- Validate input with TypeScript types
- Normalize data before processing (`.trim().toLowerCase()` for emails, etc.)
- Use try/catch with proper error logging
- Return generic error messages to users; log detailed errors internally
- Configure CORS headers
- Verify JWT authentication with `getUser()` from `@supabase/supabase-js`

## Critical Rules

### Security & Data Protection

1. **Never expose sensitive keys**
   - Never log `SUPABASE_SERVICE_ROLE_KEY` in responses
   - Always use generic error messages to users ("An error occurred")
   - Log detailed errors internally only

2. **Always normalize data before validation**
   - Email: `.trim().toLowerCase()`
   - Text fields: `.trim()`
   - State codes: `.trim().toUpperCase()`
   - This prevents UNIQUE constraint violations and duplicate records

3. **Row Level Security (RLS)**
   - ✅ Always enable RLS: `alter table [table] enable row level security;`
   - ❌ Never create policies automatically
   - Policies are business logic—let the developer define them

### Deployment & File Creation

⚠️ **CRITICAL RULE**: **ALWAYS use Supabase CLI to create migrations and edge functions. NEVER create directories or files manually.**

- ❌ **Never use Supabase MCP tools** for creating migrations or deploying functions
- ❌ **Never use Bash `mkdir`** to create function directories
- ❌ **Never create files directly** in `supabase/functions/` or `supabase/migrations/`
- ❌ **Never run** `supabase db push` or `supabase functions deploy`
- ✅ **ALWAYS use Supabase CLI commands**:
  - `supabase migration new migration_name` — Create new migrations
  - `supabase functions new function-name` — Create new edge functions
- ✅ **Exception**: Only manually create/edit files if explicitly requested in the prompt (e.g., "directly edit the file without using CLI")
- ✅ **Deployment is manual** — Developer runs `supabase functions deploy` from their local environment

**Example workflow:**
```bash
# ✅ CORRECT: Use CLI
supabase functions new get-participant
# Then edit supabase/functions/get-participant/index.ts

# ❌ WRONG: Manual creation
mkdir supabase/functions/get-participant
# (creates broken function structure)
```

### Code Quality

- Use TypeScript for type safety
- Return consistent JSON response format (see `.windsurf/rules/supabase-code-quality.md`)
- All timestamps must be `timestamptz` (not `timestamp`)
- All datetime fields must include `not null default now()`
- No blank lines between column definitions in migrations

## Architecture & Patterns

### Database Structure

The project uses a normalized PostgreSQL schema with:
- **User-owned resources**: Tables with `user_id` foreign keys to `auth.users(id)`
- **Junction tables** for many-to-many relationships with composite primary keys
- **Lookup tables** for enumerations (e.g., event statuses, categories)
- **Automatic timestamps** via triggers on every table

Example user-owned resource:
```sql
create table events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_events_user_id on events(user_id);
alter table events enable row level security;
```

### Edge Functions Structure

Functions use a standard 6-section pattern:
1. **Type definitions** — Request/response shapes with validation
2. **Helper functions** — Reusable logic (data validation, normalization, DB queries)
3. **Main handler** — Request processing and orchestration
4. **Error handling** — Try/catch with logging and generic user messages
5. **CORS configuration** — Proper headers for cross-origin requests
6. **JWT validation** — Ensure authenticated requests

## Tools & MCP Servers

### When to Use Supabase MCP Tools

The Supabase MCP server is available for **read operations only**:
- ✅ `list_tables` — View schema and columns
- ✅ `list_migrations` — View migration history
- ✅ `list_edge_functions` — List deployed functions
- ✅ `get_logs` — Debug API, auth, edge function issues
- ✅ `get_advisors` — Check for security/performance warnings
- ✅ `generate_typescript_types` — Auto-generate Supabase types

**Never use MCP tools for creation or deployment** — Always use Supabase CLI.

### Available Windsurf Skills & Workflows

**Skills (auto-invoked or @mention):**
- `@migration` — Create database migrations with tables, indexes, RLS, triggers
- `@edge-functions` — Create Edge Functions with proper validation and security

**Workflows (manual `/command`):**
- `/create-database-table` — Step-by-step table creation (9 steps)
- `/create-auth-endpoint` — Step-by-step auth endpoint creation (7 steps)

## Common Tasks

### View Database Schema

```bash
# In Supabase Studio
supabase start
# Then visit http://127.0.0.1:54323

# Or via CLI (list tables with columns)
supabase db list-tables --verbose
```

### Debug Issues

```bash
# View recent errors
supabase logs --service api
supabase logs --service edge-function
supabase logs --service auth

# Reset database to initial state
supabase db reset
```

### Test Edge Functions Locally

```bash
# Function auto-reloads on file changes
# Test with curl:
curl -X POST http://127.0.0.1:54321/functions/v1/my-function \
  -H "Content-Type: application/json" \
  -d '{"key":"value"}'

# Or in the inspector at localhost:8083
```

### Generate TypeScript Types

```bash
# Auto-generate types from current schema
supabase gen types typescript --local
```

This creates types for all tables and functions, useful for edge function development.

## Configuration Files

- **`supabase/config.toml`** — Local dev environment configuration (ports, database settings, auth, storage)
- **`.windsurf/rules/`** — Behavioral guidelines (always active)
  - `supabase.md` — Master rule with quick reference
  - `supabase-security.md` — RLS, API keys, data normalization
  - `supabase-deployment.md` — CLI usage, no auto-deploy
  - `supabase-code-quality.md` — TypeScript, error handling, response format
- **`.windsurf/skills/`** — Reusable task modules for migrations and edge functions
- **`.windsurf/workflows/`** — Multi-step guided processes

## References & Best Practices

See the Supabase documentation for detailed patterns:
- [Row Level Security (RLS)](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Securing Your Data](https://supabase.com/docs/guides/database/secure-data)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Database Linter & Security Advisors](https://supabase.com/docs/guides/database/database-linter)

Key security principles from Supabase 2026 guidelines:
- **Enable RLS by default** on all public schema tables
- **Rotate API keys** independently; use the new API key model instead of JWT-based anon/service_role keys
- **Test locally** with `supabase start` before deploying
- **Use Supabase Auth** instead of building custom authentication
- **Validate at boundaries** — User input, external APIs; trust internal code
