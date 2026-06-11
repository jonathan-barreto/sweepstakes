---
trigger: always_on
---

# Supabase Code Quality Rules

## 📝 TypeScript Standards

**Edge Functions:**
- ✅ Always use TypeScript interfaces for request/response types
- ✅ Organize code in clear sections (Types, Config, Helpers, Server)
- ✅ Use descriptive variable names
- ❌ Never use `any` type without good reason

## 🗄️ Database Standards

**Migrations:**
- ✅ Use `timestamptz not null default now()` for timestamps
- ✅ Always include `created_at` and `updated_at`
- ✅ Index foreign keys (except primary keys)
- ❌ Never add blank lines between column definitions
- ❌ Never index primary key `id` (redundant)

## 📦 Response Format

**ALWAYS use consistent structure:**
```typescript
// Success
{ success: true, message: "...", data?: {...} }

// Error
{ success: false, message: "..." }
```

## 🔍 Error Handling

**ALWAYS:**
- ✅ Log errors with context: `logError("context", error, { userId, email })`
- ✅ Return generic messages to users
- ✅ Handle specific Postgres error codes (23505, 23503, 23502)
- ❌ Never expose internal error messages
