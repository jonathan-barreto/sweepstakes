---
name: edge-functions
description: Creates production-ready Supabase Edge Functions with proper data normalization, validation, error handling, and security. Use when implementing API endpoints for authentication, data operations, or business logic.
---

# Supabase Edge Functions - Production Standard

This skill guides you through creating secure, maintainable Edge Functions for Supabase projects.

## When to Use This Skill

- Creating authentication endpoints (register, login, logout)
- Building CRUD operations for database tables
- Implementing business logic APIs
- Setting up webhook handlers
- Creating authenticated user operations

## Critical Principles

Before writing any Edge Function, understand these core principles:

1. **Normalize → Validate → Process** (always in this order)
2. **Log internally, respond generically** (security first)
3. **Check before create** (efficiency and cost)
4. **Handle specific errors** (better UX)
5. **Use consistent response format** (predictability)

## Function Creation Process

### Step 1: Create Function File

Use Supabase CLI to generate a new Edge Function:
```bash
supabase functions new [function-name]
```

### Step 2: Set Up File Structure

Organize your function with clear sections:

```typescript
import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Types - Define request/response shapes
interface RequestType {
  field: string
}

// Environment & Config
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error("Server environment misconfigured.")
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Helpers
const jsonResponse = (data: any, status: number) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  })

const logError = (ctx: string, err: unknown, details?: any) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error(`[function-name] ${ctx}:`, message, details || "")
}

// Server
Deno.serve(async (req): Promise<Response> => {
  if (req.method !== "POST") {
    return jsonResponse({ success: false, message: "Method not allowed" }, 405)
  }

  try {
    // Your logic here
  } catch (err) {
    logError("Unhandled error", err)
    return jsonResponse({ success: false, message: "Internal server error" }, 500)
  }
})
```

### Step 3: Normalize Input Data (CRITICAL)

**⚠️ Most Important Rule:** Always normalize BEFORE validation.

**✅ CORRECT Pattern:**
```typescript
const body = await req.json()

// 1. Normalize FIRST
const email = body.email?.trim().toLowerCase()
const name = body.name?.trim()
const state = body.state?.trim().toUpperCase()

// 2. Then validate normalized data
const validation = validate(email || "", name || "", state || "")
```

**❌ WRONG Pattern:**
```typescript
const { email, name } = body
validate(email, name) // Validating raw data
// then trim later - TOO LATE!
```

**Why This Matters:**
- `"John"` ≠ `"John "` (trailing space)
- `"EMAIL@GMAIL.COM"` ≠ `"email@gmail.com"`
- Breaks UNIQUE constraints
- Causes login failures
- Creates duplicate records

### Step 4: Validate Normalized Data

**Keep validations simple and essential:**

```typescript
const validateInput = (email: string, password: string): { valid: boolean; error?: string } => {
  if (!email) {
    return { valid: false, error: "Email is required" }
  }
  
  if (!password || password.length < 6) {
    return { valid: false, error: "Password must be at least 6 characters" }
  }

  return { valid: true }
}
```

**Validation Guidelines:**

✅ **DO Validate:**
- Required fields
- Length constraints (based on database limits)
- Format for specific fields (e.g., state must be 2 chars)

❌ **DON'T Validate:**
- Email format (Supabase Auth handles this)
- Excessive type checks (TypeScript does this)
- Arbitrary limits not in database schema

### Step 5: Handle Errors Securely

**⚠️ Security Rule:** NEVER expose internal errors to users.

**❌ WRONG - Leaks Internal Info:**
```typescript
if (authError) {
  return jsonResponse({ success: false, message: authError.message }, 400)
}
```

**✅ CORRECT - Generic Message + Internal Logging:**
```typescript
if (authError) {
  logError("Auth failed", authError, { email })
  return jsonResponse({ success: false, message: "Unable to authenticate" }, 401)
}
```

**Why This Matters:**
- Prevents information leakage
- Stops email enumeration attacks
- Logs full details for debugging
- User gets helpful (but safe) message

**Always Include Context in Logs:**
```typescript
logError("Operation failed", error, { userId, email, operation: "create" })
```

### Step 6: Optimize Database Operations

**Check Before Create (Prevents Wasted Operations):**

```typescript
// ✅ Check if exists BEFORE creating user
const { data: existing } = await supabase
  .from("profiles")
  .select("id")
  .eq("email", email)
  .maybeSingle()

if (existing) {
  return jsonResponse({ success: false, message: "Email already registered" }, 400)
}

// Now safe to create
```

**Benefits:**
- Avoids creating then deleting auth users
- Saves API calls and costs
- Faster response time
- Better user experience

**Handle Specific Postgres Error Codes:**

```typescript
if (error) {
  logError("Insert failed", error, { userId })
  
  // Handle specific errors for better UX
  if (error.code === "23505") { // UNIQUE constraint violation
    return jsonResponse({ success: false, message: "Email already registered" }, 400)
  }
  
  if (error.code === "23503") { // Foreign key violation
    return jsonResponse({ success: false, message: "Invalid reference" }, 400)
  }
  
  return jsonResponse({ success: false, message: "Operation failed" }, 400)
}
```

**Common Postgres Error Codes:**
- `23505`: UNIQUE violation
- `23503`: Foreign key violation
- `23502`: NOT NULL violation

### Step 7: Implement Authentication (When Needed)

**For endpoints that require authentication:**

```typescript
// 1. Extract token from Authorization header
const authHeader = req.headers.get("Authorization")
if (!authHeader) {
  return jsonResponse({ success: false, message: "Missing authorization header" }, 401)
}

const token = authHeader.replace(/^Bearer\s+/i, "")

// 2. Validate token and get user
const { data: { user }, error: authError } = await supabase.auth.getUser(token)

if (authError || !user) {
  logError("Auth validation failed", authError)
  return jsonResponse({ success: false, message: "Invalid or expired token" }, 401)
}

// 3. Use user.id for database operations
const { data } = await supabase
  .from("user_data")
  .select("*")
  .eq("user_id", user.id)
```

**Header Format:**
```
Authorization: Bearer <access_token_from_login>
```

### Step 8: Use Consistent Response Format

**Always return this structure:**

```typescript
// ✅ Success Response
return jsonResponse(
  {
    success: true,
    message: "Operation successful",
    data: { /* optional data */ }
  },
  200 // or 201 for created, 204 for no content
)

// ✅ Error Response
return jsonResponse(
  {
    success: false,
    message: "User-friendly error message"
  },
  400 // or 401, 404, 500, etc.
)
```

**HTTP Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad request (validation error)
- `401`: Unauthorized (auth required)
- `404`: Not found
- `405`: Method not allowed
- `500`: Internal server error

### Step 9: Choose the Right Supabase Key

**`SUPABASE_SERVICE_ROLE_KEY`** - Bypasses RLS:
- ✅ Creating users (register)
- ✅ Admin operations
- ✅ Server-side operations that need full access
- ⚠️ **NEVER expose this key to clients**

**`SUPABASE_ANON_KEY`** - Respects RLS:
- ✅ Login operations
- ✅ Public read operations
- ✅ Client-like behavior

**Example Usage:**
```typescript
// Register function - needs SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Login function - can use ANON_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
```

## Complete Example

See the `register` function in `supabase/functions/register/index.ts` for a full production-ready implementation that follows all these patterns.

## Best Practices Checklist

Before deploying any Edge Function, verify:

✅ **Data Handling:**
- [ ] Input data is normalized BEFORE validation
- [ ] Email is lowercased and trimmed
- [ ] Text fields are trimmed
- [ ] State codes are uppercased

✅ **Validation:**
- [ ] Only essential validations (no redundant checks)
- [ ] Validates normalized data, not raw input
- [ ] Returns clear, specific error messages

✅ **Security:**
- [ ] Never exposes internal error messages
- [ ] Logs all errors with context
- [ ] Uses generic user-facing messages
- [ ] Correct Supabase key for operation type

✅ **Database:**
- [ ] Checks for existing records before creating
- [ ] Handles specific Postgres error codes
- [ ] Includes rollback logic where needed
- [ ] Uses appropriate indexes

✅ **Response Format:**
- [ ] Consistent `{ success, message, data? }` structure
- [ ] Correct HTTP status codes
- [ ] Helpful messages for users

✅ **Code Quality:**
- [ ] Clear section organization
- [ ] Helper functions for reusable logic
- [ ] Proper TypeScript types
- [ ] Descriptive variable names

## Common Patterns

### Public Endpoint (No Auth)
```typescript
// register, login, public data
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
```

### Authenticated Endpoint
```typescript
// user profile, user data operations
const authHeader = req.headers.get("Authorization")
const token = authHeader.replace(/^Bearer\s+/i, "")
const { data: { user } } = await supabase.auth.getUser(token)
```

### Admin Operation
```typescript
// creating users, bypassing RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
```

## Quick Reference

| Pattern | When to Use |
|---------|-------------|
| Normalize → Validate → Process | **ALWAYS** - Every function |
| Check before create | Creating records that might exist |
| Generic error messages | **ALWAYS** - Never expose internals |
| Specific error codes | Better UX for known errors |
| Authorization header | Authenticated endpoints |
| SERVICE_ROLE_KEY | Admin ops, bypass RLS |
| ANON_KEY | Login, public reads |

## Related Files

- `supabase/functions/register/index.ts` - Complete register example
- `supabase/functions/login/index.ts` - Login with ANON_KEY
- `supabase/functions/user/index.ts` - Authenticated GET
- `supabase/functions/update-user/index.ts` - Authenticated PUT

---

**For complete, working examples, see the actual function files in `supabase/functions/`**
