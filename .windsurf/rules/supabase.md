---
trigger: always_on
---

# Supabase Development - Master Rules

This project follows strict Supabase development patterns. All rules are organized by concern:

## 📋 Rule Categories

1. **Deployment Rules** (`supabase-deployment.md`)
   - CLI usage (NEVER use MCP tools)
   - Manual deployment only
   - Local development workflow

2. **Security Rules** (`supabase-security.md`)
   - RLS enablement (no auto-policies)
   - API key protection
   - Data normalization requirements

3. **Code Quality Rules** (`supabase-code-quality.md`)
   - TypeScript standards
   - Database standards
   - Response format
   - Error handling

## 🎯 Quick Reference

**Creating Resources:**
- Migrations: `supabase migration new [name]` → Use `migration` skill
- Edge Functions: `supabase functions new [name]` → Use `edge-functions` skill

**Workflows Available:**
- `/create-auth-endpoint` - Complete auth endpoint creation
- `/create-database-table` - Complete table creation with all best practices

**Core Principles:**
1. ⛔ NEVER use Supabase MCP tools for creation
2. ⛔ NEVER auto-deploy (manual only)
3. ✅ ALWAYS normalize data before validation
4. ✅ ALWAYS enable RLS (no auto-policies)
5. ✅ ALWAYS use generic error messages

## � Resources

**Skills:**
- `@migration` - Database migration patterns
- `@edge-functions` - Edge Function patterns

**Workflows:**
- `/create-auth-endpoint` - Step-by-step auth endpoint creation
- `/create-database-table` - Step-by-step table creation

**See individual rule files for detailed patterns and examples.**
