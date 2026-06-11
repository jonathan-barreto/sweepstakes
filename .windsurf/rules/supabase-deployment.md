---
trigger: always_on
---

# Supabase Deployment Rules

## ⛔ NEVER Use Supabase MCP Tools for Creation

**CRITICAL: You must NEVER use the following Supabase MCP tools:**
- ❌ `mcp1_apply_migration` - NEVER use this to create migrations
- ❌ `mcp1_deploy_edge_function` - NEVER use this to create/deploy functions
- ❌ Any other MCP tool that creates or modifies database schema or functions

## ✅ ALWAYS Use Supabase CLI

**For ALL database changes and functions:**
1. **Migrations**: Use `supabase migration new [name]` to create migration files
2. **Edge Functions**: Use `supabase functions new [name]` to create function files
3. **Local Development**: Use `supabase start`, `supabase db reset`, etc.

## 🚫 NEVER Auto-Deploy

**Deployment is ALWAYS manual and done by the developer:**
- ❌ NEVER run `supabase db push`
- ❌ NEVER run `supabase functions deploy`
- ❌ NEVER use any MCP deployment tools
- ✅ Only create the files locally
- ✅ Let the developer handle all deployments manually

## Workflow

1. **Create** using CLI: `supabase migration new [name]` or `supabase functions new [name]`
2. **Edit** the generated file
3. **Test locally** if needed
4. **Stop** - Developer will deploy manually

**Remember: Your job is to CREATE the files, NOT to deploy them.**
