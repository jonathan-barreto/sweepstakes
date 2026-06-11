---
trigger: always_on
---

# Supabase Security Rules

## 🔒 Row Level Security (RLS)

**ALWAYS enable RLS, but NEVER create policies automatically:**
- ✅ Always include: `alter table [table_name] enable row level security;`
- ❌ NEVER create RLS policies unless explicitly requested in the prompt
- ✅ Only add policies if the user specifically asks for them

**Reason**: RLS should be enabled for security, but policies are business logic that the developer will define based on specific requirements.

## 🔐 API Keys

**NEVER expose sensitive keys:**
- ❌ Never log `SUPABASE_SERVICE_ROLE_KEY` in responses
- ❌ Never return internal error messages to users
- ✅ Always use generic error messages
- ✅ Log detailed errors internally only

## 🛡️ Data Normalization

**ALWAYS normalize data before validation:**
- ✅ Email: `trim().toLowerCase()`
- ✅ Text fields: `trim()`
- ✅ State codes: `trim().toUpperCase()`
- ❌ NEVER validate raw input data

**Why**: Prevents duplicate records, login failures, and UNIQUE constraint violations.
