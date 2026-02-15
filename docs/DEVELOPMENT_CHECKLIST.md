# Development Checklist - OMS Project

## 🚨 Critical Issues Learned & How to Avoid Them

This document captures lessons learned from debugging sessions to prevent repeated iterations on similar problems.

---

## 1. Database & Prisma Schema Changes

### Problem Pattern
When adding new fields/models to the schema, changes don't reflect in the running services because:
1. Prisma client in `@oms/database` package is stale
2. Schema pushed to wrong database
3. Services have cached Prisma clients in memory

### ✅ Checklist for Schema Changes

```bash
# Step 1: Identify which schema to modify
# - Master schema: packages/database/prisma/master/schema.prisma (tenants, settings, subscriptions)
# - Tenant schema: packages/database/prisma/tenant/schema.prisma (employees, leaves, etc.)

# Step 2: After modifying schema, regenerate Prisma client
cd packages/database
npx prisma generate --schema=prisma/tenant/schema.prisma   # For tenant changes
npx prisma generate --schema=prisma/master/schema.prisma   # For master changes

# Step 3: Push to the CORRECT database
# ⚠️ CRITICAL: Check the database name in tenants table first!
docker exec -it oms-postgres psql -U postgres -d oms_master -c "SELECT slug, database_name FROM tenants;"

# Push to correct tenant database (note: database name might differ from slug!)
# Example: slug="softqube" but database_name="oms_tenant_softqube"
TENANT_DATABASE_URL="postgresql://postgres:password@localhost:5432/oms_tenant_softqube" \
  npx prisma db push --schema=prisma/tenant/schema.prisma

# Step 4: Rebuild the @oms/database package
npm run build

# Step 5: Restart ALL services to clear cached Prisma clients
pm2 restart all
```

### 🔴 Common Mistakes to Avoid
| Mistake | Correct Approach |
|---------|------------------|
| Pushing to `oms_softqube` | Push to `oms_tenant_softqube` (check `tenants.database_name`) |
| Only regenerating Prisma, not rebuilding package | Always run `npm run build` after `prisma generate` |
| Restarting only one service | Restart ALL services with `pm2 restart all` |
| Using wrong env var (`DATABASE_URL`) | Use `TENANT_DATABASE_URL` for tenant schema |

---

## 2. Prisma Client Import Sources

### Problem Pattern
The code imports Prisma clients from different sources, and they can get out of sync:

```typescript
// ❌ These might have different generated clients:
import { getMasterPrisma } from '@oms/database';           // Package client
import { getTenantPrismaBySlug } from '@oms/tenant-db-manager';  // Manager client
```

### ✅ Key Understanding
```
@oms/database
├── prisma/master/schema.prisma  → node_modules/.prisma/master-client
├── prisma/tenant/schema.prisma  → node_modules/.prisma/tenant-client
└── src/index.ts                 → Exports both clients

@oms/tenant-db-manager
└── Uses @oms/database's tenant client internally
```

### ✅ When Schema Changes, Rebuild in Order
```bash
# 1. Generate Prisma clients
cd packages/database
npx prisma generate --schema=prisma/tenant/schema.prisma
npx prisma generate --schema=prisma/master/schema.prisma

# 2. Rebuild database package
npm run build

# 3. Rebuild tenant-db-manager (uses database package)
cd ../tenant-db-manager
npm run build  # May fail on DTS, but CJS/ESM build is sufficient

# 4. Restart services
pm2 restart all
```

---

## 3. Field Naming Conventions

### Problem Pattern
Mismatched field names between code and schema cause runtime errors:
- `reportingTo` vs `reportingManager` 
- `approverId` vs `approvedBy`
- `isActive` vs `status`

### ✅ Before Using Any Field, Verify in Schema
```bash
# Check available fields on a model
grep -A 50 "model Employee {" packages/database/prisma/tenant/schema.prisma

# Check relation names
grep "relation" packages/database/prisma/tenant/schema.prisma | grep -i employee
```

### ✅ Common Field Mapping Reference
| Expected (Code) | Actual (Schema) | Notes |
|-----------------|-----------------|-------|
| `reportingTo` | `reportingManager` | Self-relation on Employee |
| `reportingToId` | `reportingManagerId` | Foreign key |
| `approverId` | `approvedBy` | String field, not relation |
| `status === 'active'` | `status === 'ACTIVE'` | Case matters! |
| `userId` (UUID) | `id` (can be non-UUID) | Check actual data format |

---

## 4. Validation Schema vs Database Schema

### Problem Pattern
Zod validation schemas don't match actual data format:
```typescript
// ❌ Schema requires UUID
employeeId: z.string().uuid()

// But database has:
// emp-001, emp-002, emp-003 (NOT UUIDs!)
```

### ✅ Before Writing Validation
```bash
# Check actual data format in database
docker exec -it oms-postgres psql -U postgres -d oms_tenant_softqube \
  -c "SELECT id FROM employees LIMIT 3;"

# If IDs are like "emp-001", use:
employeeId: z.string().min(1)  // NOT .uuid()
```

### ✅ Validation Schema Checklist
- [ ] Check if ID fields are UUIDs or custom format
- [ ] Check if status fields are uppercase or lowercase
- [ ] Check if optional fields have defaults
- [ ] Check date format (ISO string vs Date object)

---

## 5. Date Format Handling

### Problem Pattern
Dates from API are ISO timestamps but compared as date strings:
```typescript
// API returns: "2026-01-26T00:00:00.000Z"
// Code compares: "2026-01-26"
// Result: No match!
```

### ✅ Always Normalize Dates for Comparison
```typescript
// ✅ Correct approach
function findHoliday(date: Date, holidays: Holiday[]): Holiday | undefined {
  const dateStr = format(date, 'yyyy-MM-dd');
  return holidays.find(h => {
    // Handle both ISO timestamps and date strings
    const holidayDateStr = h.date.includes('T') 
      ? format(parseISO(h.date), 'yyyy-MM-dd') 
      : h.date;
    return holidayDateStr === dateStr;
  });
}
```

---

## 6. Multi-Tenant Database Debugging

### Quick Reference: Which Database to Check?
```bash
# Master database (tenants, settings, subscriptions)
docker exec -it oms-postgres psql -U postgres -d oms_master

# Tenant database (employees, leaves, attendance)
# First, get the correct database name:
docker exec -it oms-postgres psql -U postgres -d oms_master \
  -c "SELECT slug, database_name FROM tenants WHERE slug='softqube';"
# Result: database_name = oms_tenant_softqube

# Then connect to tenant database:
docker exec -it oms-postgres psql -U postgres -d oms_tenant_softqube
```

### Common Database Queries
```sql
-- Check if table exists
\dt leave*

-- Check table structure
\d leave_types

-- Check data exists
SELECT COUNT(*) FROM leave_types;

-- Check tenant settings
SELECT weekly_working_hours FROM tenant_settings 
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'softqube');
```

---

## 7. Service Restart Patterns

### When to Restart What?

| Change Type | What to Restart |
|-------------|-----------------|
| Schema change | `pm2 restart all` (clears all cached clients) |
| Service code change | `pm2 restart <service-name>` |
| Package change (@oms/*) | `pm2 restart all` |
| Frontend change | `pm2 restart web-app` |
| Environment variable change | `pm2 restart all --update-env` |

### Debug Service Issues
```bash
# Check if service is healthy
curl -s http://localhost:3003/health

# Check service logs
pm2 logs attendance-service --lines 50 --nostream

# Test API directly (bypass gateway)
curl -s -H "x-tenant-id: softqube" -H "x-tenant-slug: softqube" \
  http://localhost:3003/api/v1/leaves/types
```

---

## 8. Pre-Implementation Checklist

Before implementing any new feature:

### Database Layer
- [ ] Identify if change is in master or tenant schema
- [ ] Check existing field names in schema (avoid assumptions)
- [ ] Check actual data format in database (UUIDs, enums, etc.)
- [ ] Plan database migration/push strategy

### API Layer
- [ ] Match validation schema to actual data format
- [ ] Use correct Prisma field names (verify in schema)
- [ ] Handle both uppercase and lowercase enum values
- [ ] Check relation names before using includes

### Frontend Layer
- [ ] Verify API response format
- [ ] Handle date format normalization
- [ ] Test with actual data from API

---

## 9. Quick Debug Commands

```bash
# Check all tables in tenant database
docker exec -it oms-postgres psql -U postgres -d oms_tenant_softqube -c "\dt"

# Check a specific table structure
docker exec -it oms-postgres psql -U postgres -d oms_tenant_softqube -c "\d employees"

# Check if Prisma schema matches database
cd packages/database
TENANT_DATABASE_URL="postgresql://postgres:password@localhost:5432/oms_tenant_softqube" \
  npx prisma db pull --schema=prisma/tenant/schema.prisma --print

# Regenerate and rebuild everything
cd packages/database && \
  npx prisma generate --schema=prisma/tenant/schema.prisma && \
  npx prisma generate --schema=prisma/master/schema.prisma && \
  npm run build && \
  pm2 restart all
```

---

## 10. Emergency Recovery

If everything is broken:

```bash
# 1. Stop all services
pm2 stop all

# 2. Kill any zombie processes
lsof -ti :3000 -ti :3001 -ti :3002 -ti :3003 | xargs kill -9 2>/dev/null

# 3. Regenerate all Prisma clients
cd packages/database
npx prisma generate --schema=prisma/tenant/schema.prisma
npx prisma generate --schema=prisma/master/schema.prisma

# 4. Rebuild all packages
npm run build

# 5. Restart services
pm2 restart all

# 6. Verify services are running
pm2 status
curl -s http://localhost:3000/health
```

---

*Last Updated: January 2026*
*Based on debugging sessions for Working Hours, Leave Types, and Leave Request features*
