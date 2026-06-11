# Windsurf Configuration - Supabase Project

This document explains how Skills, Rules, and Workflows are organized in this project.

## 📁 Structure Overview

```
.windsurf/
├── rules/                          # Behavioral guidelines (always active)
│   ├── supabase.md                # Master rule (references all others)
│   ├── supabase-deployment.md     # CLI usage, no auto-deploy
│   ├── supabase-security.md       # RLS, data normalization, API keys
│   └── supabase-code-quality.md   # TypeScript, DB, error handling standards
│
├── skills/                         # Reusable task modules
│   ├── migration/                 # Database migration creation
│   │   └── SKILL.md
│   └── edge-functions/            # Edge Function creation
│       └── SKILL.md
│
└── workflows/                      # Multi-step processes
    ├── create-auth-endpoint.md    # Complete auth endpoint creation
    └── create-database-table.md   # Complete table creation
```

## 🎯 When to Use Each

### Rules (Guardrails - Always Active)

**Use for:** Behavioral constraints that should ALWAYS apply

**Examples in this project:**
- `supabase-deployment.md` - NEVER use MCP tools, NEVER auto-deploy
- `supabase-security.md` - ALWAYS normalize data, ALWAYS enable RLS
- `supabase-code-quality.md` - Response format, error handling standards

**Trigger:** `always_on` - These rules are ALWAYS in Cascade's context

### Skills (Reusable Tasks - Invoked When Needed)

**Use for:** Specific, reusable tasks that can be applied in multiple contexts

**Examples in this project:**
- `@migration` - Creates database migrations with tables, indexes, RLS, triggers
- `@edge-functions` - Creates Edge Functions with proper validation, security, error handling

**Invocation:**
- Automatic: Cascade invokes when task matches description
- Manual: `@migration` or `@edge-functions` in chat

### Workflows (Multi-Step Processes - Manual Only)

**Use for:** Complete processes with multiple steps that you trigger explicitly

**Examples in this project:**
- `/create-auth-endpoint` - 7-step process for creating auth endpoints
- `/create-database-table` - 9-step process for creating database tables

**Invocation:** Manual only via `/workflow-name` slash command

## 📊 Comparison Table

| Feature | Rules | Skills | Workflows |
|---------|-------|--------|-----------|
| **Purpose** | Behavioral guidelines | Reusable tasks | Complete processes |
| **Activation** | Always active | Auto or @mention | Manual /command |
| **In Context?** | Yes (always) | No (only when invoked) | No (only when invoked) |
| **Best For** | Constraints, standards | Modular tasks | Multi-step procedures |
| **Example** | "Never auto-deploy" | "Create migration" | "Create auth endpoint" |

## 🚀 How to Use

### Creating a Migration

**Option 1 - Let Cascade decide:**
```
Create a table called 'events' with user_id, title, description, date, location
```
Cascade will automatically invoke the `migration` skill.

**Option 2 - Explicit:**
```
@migration create events table
```

**Option 3 - Full workflow:**
```
/create-database-table
```
Then follow the 9-step guided process.

### Creating an Edge Function

**Option 1 - Let Cascade decide:**
```
Create a register endpoint that creates users and profiles
```
Cascade will automatically invoke the `edge-functions` skill.

**Option 2 - Explicit:**
```
@edge-functions create register endpoint
```

**Option 3 - Full workflow:**
```
/create-auth-endpoint
```
Then follow the 7-step guided process.

## 🎓 Best Practices

### Rules
- ✅ Keep them focused on ONE concern
- ✅ Use `always_on` for critical constraints
- ✅ Reference other rules instead of duplicating
- ❌ Don't mix behavioral rules with code examples

### Skills
- ✅ Make them reusable and modular
- ✅ Write clear descriptions for auto-invocation
- ✅ Include "When to Use" section
- ✅ Provide step-by-step guidance
- ❌ Don't make them too specific to one use case

### Workflows
- ✅ Use for processes you run repeatedly
- ✅ Include checklists for each step
- ✅ Reference skills and rules
- ✅ Make them actionable (not just documentation)
- ❌ Don't use for simple one-step tasks

## 📝 Current Configuration

### Active Rules (Always On)
1. **supabase.md** - Master rule with quick reference
2. **supabase-deployment.md** - CLI usage, manual deployment
3. **supabase-security.md** - RLS, normalization, API keys
4. **supabase-code-quality.md** - Code standards

### Available Skills (Auto-Invoked)
1. **migration** - Database migration creation
2. **edge-functions** - Edge Function creation

### Available Workflows (Manual)
1. **/create-auth-endpoint** - Complete auth endpoint creation
2. **/create-database-table** - Complete table creation

## 🔄 Progressive Disclosure

Windsurf uses **progressive disclosure** to keep context lean:

- **Rules**: Always in context (small, focused)
- **Skills**: Only name + description shown until invoked
- **Workflows**: Only listed as available commands

This means you can have many skills without bloating Cascade's context window!

## 🎯 Summary

**Our architecture follows the principle:**

```
Rules = "How to behave"
Skills = "What you can do"
Workflows = "How to do it step-by-step"
```

**Example flow:**
1. You ask: "Create a login endpoint"
2. **Rules** ensure: No MCP tools, no auto-deploy, proper security
3. **Skill** provides: Edge Function template and patterns
4. **Workflow** (optional): Step-by-step guidance if you use `/create-auth-endpoint`

This separation keeps everything organized, maintainable, and efficient! 🚀
