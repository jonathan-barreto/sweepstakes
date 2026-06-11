---
name: migration
description: Creates PostgreSQL/Supabase database migrations following best practices for tables, indexes, RLS enablement, and triggers. Use when creating new tables or modifying database schema.
---

# PostgreSQL/Supabase Migration Standard

This skill guides you through creating production-ready database migrations for Supabase projects.

## When to Use This Skill

- Creating new database tables
- Adding indexes for performance optimization
- Enabling Row Level Security (RLS)
- Setting up automatic timestamp triggers
- Modifying existing table schemas

## Migration Creation Process

### Step 1: Create Migration File

Use Supabase CLI to generate a new migration:
```bash
supabase migration new [descriptive_name]
```

### Step 2: Define Table Structure

**Column Definitions:**
- No blank lines between column definitions
- Use `timestamptz` for all timestamps with `default now()`
- Always include `created_at` and `updated_at` fields
- Use proper foreign key constraints with `on delete cascade` when referencing `auth.users`

**Example:**
```sql
create table table_name (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Step 3: Add Indexes for Performance

**Indexing Strategy:**
- Index foreign keys for better join performance (except primary keys - they're auto-indexed)
- Index frequently queried columns (e.g., email, status)
- Use composite indexes for multi-column queries
- Use partial indexes with `where` clause when appropriate

**Example:**
```sql
create index idx_table_user_id on table_name(user_id);
create index idx_table_email on table_name(email);
create index idx_table_location on table_name(state, city) where state is not null;
```

**⚠️ Important:** Do NOT create index on primary key `id` - it's redundant.

### Step 4: Enable Row Level Security

**Always enable RLS for security:**
```sql
-- Enable Row Level Security
alter table table_name enable row level security;
```

**⚠️ Critical:** NEVER create RLS policies unless explicitly requested. Policies are business logic that the developer will define based on specific requirements.

### Step 5: Add Updated_At Trigger

**Create reusable function (if it doesn't exist):**
```sql
-- Function to automatically update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
```

**Add trigger to table:**
```sql
-- Trigger to call the function before any update
create trigger update_table_name_updated_at
  before update on table_name
  for each row
  execute function update_updated_at_column();
```

## Complete Migration Template

```sql
-- Table creation
create table table_name (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes (skip id - it's auto-indexed as primary key)
create index idx_table_name_user_id on table_name(user_id);
create index idx_table_name_email on table_name(email);
create index idx_table_name_status on table_name(status);

-- Enable Row Level Security
alter table table_name enable row level security;

-- Updated_at trigger function (create once, reuse for all tables)
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for this table
create trigger update_table_name_updated_at
  before update on table_name
  for each row
  execute function update_updated_at_column();
```

## Key Principles

✅ **DO:**
- Use `timestamptz not null default now()` for timestamps
- Index foreign keys (except primary keys)
- Enable RLS on all tables
- Create `updated_at` triggers
- Use descriptive migration names

❌ **DON'T:**
- Add blank lines between columns
- Index primary key `id` (redundant)
- Create RLS policies automatically
- Add excessive comments
- Use `timestamp` instead of `timestamptz`

## Common Patterns

### User-Owned Resources
```sql
create table user_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- other fields
);
create index idx_user_resources_user_id on user_resources(user_id);
```

### Lookup Tables
```sql
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  -- other fields
);
create index idx_categories_name on categories(name);
```

### Junction Tables (Many-to-Many)
```sql
create table user_groups (
  user_id uuid not null references users(id) on delete cascade,
  group_id uuid not null references groups(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (user_id, group_id)
);
create index idx_user_groups_group_id on user_groups(group_id);
```
