---
description: Create a complete authentication endpoint (register/login/user/update)
---

# Create Authentication Endpoint Workflow

This workflow guides you through creating a complete authentication endpoint following all best practices.

## Step 1: Create the Edge Function

```bash
supabase functions new [function-name]
```

Choose the function type:
- `register` - User registration with profile creation
- `login` - User authentication
- `user` - Get authenticated user profile
- `update-user` - Update user profile

## Step 2: Set Up File Structure

Use the edge-functions skill to generate the base structure:
- Types (Request/Response interfaces)
- Environment & Config
- Helpers (jsonResponse, logError)
- Server (Deno.serve)

## Step 3: Implement Core Logic

**For Register:**
1. Normalize input (email lowercase, name trim)
2. Validate normalized data
3. Check if email exists
4. Create auth user
5. Create profile record
6. Handle rollback on error

**For Login:**
1. Normalize email
2. Validate credentials
3. Sign in with Supabase Auth
4. Return only tokens (no user data)

**For User (GET):**
1. Extract and validate token
2. Get user from auth
3. Fetch profile from database
4. Return profile data

**For Update-User (PUT):**
1. Extract and validate token
2. Normalize input fields
3. Validate update data
4. Update profile record

## Step 4: Add Security Measures

- [ ] Generic error messages (never expose internals)
- [ ] Proper logging with context
- [ ] Input normalization before validation
- [ ] Handle specific error codes (23505, 23503)

## Step 5: Test Locally

```bash
supabase functions serve [function-name]
```

Test with curl or Postman:
```bash
curl -X POST http://localhost:54321/functions/v1/[function-name] \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456","name":"Test"}'
```

## Step 6: Review Checklist

- [ ] Data normalized before validation
- [ ] Generic error messages
- [ ] Proper logging
- [ ] Consistent response format
- [ ] Correct Supabase key (SERVICE_ROLE vs ANON)
- [ ] No internal errors exposed

## Step 7: Ready for Deployment

File created and tested. Developer will deploy manually using:
```bash
supabase functions deploy [function-name]
```

**DO NOT run this command automatically.**
