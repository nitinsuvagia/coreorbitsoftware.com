# Database Migration Guide

This document explains how to properly manage database schema changes in the Office Management System.

## 📋 Table of Contents

1. [Quick Reference](#quick-reference)
2. [Migration Workflow](#migration-workflow)
3. [Commands](#commands)
4. [Best Practices](#best-practices)
5. [Common Scenarios](#common-scenarios)
6. [Troubleshooting](#troubleshooting)

## 🚀 Quick Reference

```bash
# Create a new migration (development)
./scripts/db-migrate.sh dev add_new_field

# Apply pending migrations (production/deploy)
./scripts/db-migrate.sh deploy

# Check migration status
./scripts/db-migrate.sh status

# Regenerate Prisma client only (no DB changes)
./scripts/db-migrate.sh generate
```

## 🔄 Migration Workflow

### Development Workflow

When you need to add, modify, or remove database fields:

1. **Update the Prisma Schema**
   ```bash
   # Edit the schema file(s)
   # packages/database/prisma/master/schema.prisma   (for platform-wide tables)
   # packages/database/prisma/tenant/schema.prisma   (for tenant-specific tables)
   ```

2. **Create a Migration**
   ```bash
   ./scripts/db-migrate.sh dev descriptive_migration_name
   ```
   This will:
   - Compare your schema with the database
   - Generate a SQL migration file
   - Apply the migration to your local database
   - Regenerate the Prisma client

3. **Commit the Migration**
   ```bash
   git add packages/database/prisma/*/migrations/
   git commit -m "Add migration: descriptive_migration_name"
   ```

### Production Deployment Workflow

When deploying to staging/production:

```bash
# Apply all pending migrations
./scripts/db-migrate.sh deploy
```

This command:
- Only applies existing migrations
- Never creates new migrations
- Is safe for production use

## 📝 Commands

### `dev [name]` - Create New Migration

Creates a new migration and applies it to your local database.

```bash
./scripts/db-migrate.sh dev add_user_avatar
```

**When to use:**
- Adding new tables
- Adding/removing columns
- Changing column types
- Adding indexes or constraints

### `deploy` - Apply Pending Migrations

Applies all pending migrations to the database.

```bash
./scripts/db-migrate.sh deploy
```

**When to use:**
- CI/CD pipelines
- Production deployments
- Syncing a new development environment

### `status` - Check Migration Status

Shows which migrations have been applied and which are pending.

```bash
./scripts/db-migrate.sh status
```

### `generate` - Regenerate Prisma Client

Regenerates the Prisma client without touching the database.

```bash
./scripts/db-migrate.sh generate
```

**When to use:**
- After pulling new migrations from git
- When TypeScript types are out of sync

### `push` - Sync Schema (Dev Only)

Syncs the schema to the database without creating a migration.

```bash
./scripts/db-migrate.sh push
```

⚠️ **Warning:** Only use in early development. Don't use in team environments.

### `reset` - Reset Database

Drops all tables and re-applies all migrations.

```bash
./scripts/db-migrate.sh reset
```

⚠️ **Danger:** This deletes all data!

## ✅ Best Practices

### 1. Always Use Migrations for Schema Changes

❌ **Don't:**
```bash
# Manual SQL changes
psql -c "ALTER TABLE users ADD COLUMN avatar VARCHAR(255)"
```

✅ **Do:**
```bash
# 1. Update schema.prisma
# 2. Create migration
./scripts/db-migrate.sh dev add_user_avatar
```

### 2. Use Descriptive Migration Names

❌ **Bad:** `update`, `fix`, `changes`

✅ **Good:** `add_user_avatar`, `remove_legacy_fields`, `add_project_status_index`

### 3. Review Generated SQL Before Committing

Always check the generated SQL in `prisma/*/migrations/*/migration.sql`:

```sql
-- Check for unexpected changes
-- Verify data preservation
-- Ensure indexes are created correctly
```

### 4. Handle Data Migrations Separately

For complex data transformations:

```sql
-- migration.sql
-- Add new column
ALTER TABLE users ADD COLUMN full_name VARCHAR(255);

-- Migrate data (in separate script if complex)
UPDATE users SET full_name = first_name || ' ' || last_name;
```

### 5. Test Migrations Before Deploying

```bash
# On a copy of production data
./scripts/db-migrate.sh deploy

# Verify application works
npm run test
```

### 6. Never Edit Applied Migrations

Once a migration is deployed:
- ❌ Don't modify the SQL
- ❌ Don't delete the migration
- ✅ Create a new migration to make changes

## 🎯 Common Scenarios

### Adding a New Field

1. Update `schema.prisma`:
   ```prisma
   model User {
     id        String   @id @default(cuid())
     email     String   @unique
     avatar    String?  // NEW FIELD
   }
   ```

2. Create migration:
   ```bash
   ./scripts/db-migrate.sh dev add_user_avatar
   ```

### Removing a Field

1. Remove from `schema.prisma`:
   ```diff
   model User {
     id        String   @id @default(cuid())
     email     String   @unique
   - legacyId  Int?
   }
   ```

2. Create migration:
   ```bash
   ./scripts/db-migrate.sh dev remove_legacy_user_id
   ```

### Renaming a Field

⚠️ Prisma doesn't support direct renames. Use two steps:

1. Add new field, migrate data
2. Remove old field

Or use `@map` to rename at database level:
```prisma
model User {
  fullName String @map("full_name")  // DB column is "full_name"
}
```

### Adding an Index

```prisma
model User {
  id    String @id
  email String
  
  @@index([email])
}
```

### Changing Field Type

1. Add new field with new type
2. Migrate data
3. Remove old field
4. Rename new field (if needed)

## 🔧 Troubleshooting

### "Migration failed to apply"

```bash
# Check the status
./scripts/db-migrate.sh status

# If stuck, you might need to manually resolve:
cd packages/database
npx prisma migrate resolve --applied "migration_name" --schema=prisma/master/schema.prisma
```

### "Schema drift detected"

The database doesn't match the expected state.

```bash
# In development - reset the database
./scripts/db-migrate.sh reset

# In production - create a baseline
cd packages/database
npx prisma migrate resolve --applied --schema=prisma/master/schema.prisma
```

### "Prisma types don't match database"

```bash
# Regenerate the Prisma client
./scripts/db-migrate.sh generate
```

### "Cannot drop table/column - data exists"

Add explicit handling in the migration SQL for data preservation or cleanup.

## 📁 File Structure

```
packages/database/
├── prisma/
│   ├── master/
│   │   ├── schema.prisma           # Master database schema
│   │   └── migrations/
│   │       ├── 20240115_initial/
│   │       │   └── migration.sql
│   │       └── 20240120_add_settings/
│   │           └── migration.sql
│   └── tenant/
│       ├── schema.prisma           # Tenant database schema
│       └── migrations/
│           └── ...
└── src/
    └── index.ts                    # Prisma client exports
```

## 🔗 Related Documentation

- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development setup
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
