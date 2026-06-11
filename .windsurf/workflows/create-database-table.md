---
description: Create a complete database table with indexes, RLS, and triggers
---

# Create Database Table Workflow

This workflow guides you through creating a production-ready database table.

## Step 1: Create Migration File

```bash
supabase migration new create_[table_name]_table
```

## Step 2: Define Table Structure

Use the migration skill to create the table with:
- [ ] Primary key (uuid with default gen_random_uuid())
- [ ] Foreign keys with `on delete cascade`
- [ ] `created_at timestamptz not null default now()`
- [ ] `updated_at timestamptz not null default now()`
- [ ] All required columns with proper types
- [ ] No blank lines between columns

## Step 3: Add Indexes

Create indexes for:
- [ ] Foreign keys (except primary key)
- [ ] Frequently queried columns (email, status, etc.)
- [ ] Composite indexes for multi-column queries
- [ ] Partial indexes with WHERE clause when appropriate

**DO NOT index primary key `id` - it's redundant.**

## Step 4: Enable RLS

```sql
-- Enable Row Level Security
alter table [table_name] enable row level security;
```

**DO NOT create RLS policies unless explicitly requested.**

## Step 5: Add Updated_At Trigger

```sql
-- Trigger for this table
create trigger update_[table_name]_updated_at
  before update on [table_name]
  for each row
  execute function update_updated_at_column();
```

## Step 6: Review Migration

Check that the migration includes:
- [ ] Table creation with all columns
- [ ] Indexes (no redundant id index)
- [ ] RLS enabled
- [ ] Updated_at trigger
- [ ] No RLS policies (unless requested)

## Step 7: Test Locally

```bash
supabase db reset
```

This will:
1. Drop the local database
2. Recreate it
3. Run all migrations
4. Verify everything works

## Step 8: Check for Issues

```bash
supabase db lint
```

Fix any warnings or errors before proceeding.

## Step 9: Ready for Deployment

Migration created and tested. Developer will deploy manually using:
```bash
supabase db push
```

**DO NOT run this command automatically.**
