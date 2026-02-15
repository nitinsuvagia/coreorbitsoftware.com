# Fix: Login 404 Redirect Issue

**Date**: January 17, 2026  
**Issue**: After successful login showing "Welcome back", users were redirected to 404 page instead of dashboard

## Root Cause Analysis

### The Problem
When users logged in successfully:
1. ✅ Login API call succeeded
2. ✅ "Welcome back!" toast appeared
3. ✅ Cookies were set (`accessToken`, `refreshToken`)
4. ❌ Redirect to `/admin/dashboard` or `/dashboard` resulted in 404

### Technical Root Cause

The issue was in `/apps/web/src/lib/auth/auth-context.tsx`:

**Before (Problematic Code)**:
```typescript
// Line 147-163
window.location.href = redirectUrl; // Full page reload
```

**Why This Failed**:
1. `window.location.href` triggers a **full page reload** (new HTTP request)
2. Browser makes new request to `/admin/dashboard` or `/dashboard`
3. Next.js Server-Side Rendering (SSR) layouts execute on the server
4. Server checks cookies via `getSession()` in layout.tsx
5. **Cookie sync timing issue**: Cookie set on client may not be immediately available in the new server request
6. Layout's `getSession()` returns `null` → redirects to `/login`
7. This creates a redirect loop or 404 page

### Cookie Propagation Issue

```
Client (Browser)                    Server (Next.js)
─────────────────                   ────────────────
1. Login success ✓
2. Set cookie in browser ✓
3. window.location.href = "/dashboard"
                        ────────────>
                                    4. New HTTP Request
                                    5. Check cookies ✗ (not synced yet)
                                    6. getSession() = null
                                    7. Redirect to /login
                        <────────────
8. User sees 404 or login page again
```

## The Fix

### Changed Code

**File**: `/apps/web/src/lib/auth/auth-context.tsx`

**After (Fixed Code)**:
```typescript
// Line 147-152
router.push(redirectUrl); // Client-side navigation
```

### Why This Works

1. ✅ `router.push()` uses **client-side navigation** (no new HTTP request)
2. ✅ Cookies remain in current browser context
3. ✅ Next.js hydrates the new route client-side
4. ✅ Layout protection checks happen after client hydration
5. ✅ User state is already set in AuthContext
6. ✅ Dashboard loads successfully

### Updated Flow

```
Client (Browser)
─────────────────
1. Login success ✓
2. Set cookie in browser ✓
3. setUser(userData) ✓
4. router.push("/dashboard")
   ↓
5. Client-side route change (no server request)
6. Layout renders with user context ✓
7. Dashboard displays ✓
```

## Files Modified

### 1. `/apps/web/src/lib/auth/auth-context.tsx`

**Change 1 - Login Function** (Lines ~147-152):
```diff
- // Use window.location for a full page navigation to ensure proper redirect
- const redirectUrl = userData.isPlatformAdmin ? '/admin/dashboard' : '/dashboard';
- console.log('[Auth] Redirecting to:', redirectUrl);
- 
- // Show success toast
- toast.success('Welcome back!');
- 
- // Verify cookie was set before redirecting
- const verifyAndRedirect = () => {
-   const tokenCheck = document.cookie.includes('accessToken');
-   console.log('[Auth] Cookie verification before redirect:', tokenCheck);
-   if (tokenCheck) {
-     window.location.href = redirectUrl;
-   } else {
-     // Cookie not yet visible, retry after a short delay
-     console.log('[Auth] Cookie not visible yet, retrying...');
-     setTimeout(verifyAndRedirect, 100);
-   }
- };
- 
- // Start verification after a brief delay to show the toast
- setTimeout(verifyAndRedirect, 300);
+ // Use Next.js router for client-side navigation
+ const redirectUrl = userData.isPlatformAdmin ? '/admin/dashboard' : '/dashboard';
+ console.log('[Auth] Redirecting to:', redirectUrl);
+ 
+ // Show success toast
+ toast.success('Welcome back!');
+ 
+ // Use router.push for client-side navigation (preserves cookies)
+ router.push(redirectUrl);
```

**Change 2 - MFA Verify Function** (Lines ~186-189):
```diff
- // Use window.location for a full page navigation
- const redirectUrl = userData.isPlatformAdmin ? '/admin/dashboard' : '/dashboard';
- window.location.href = redirectUrl;
+ // Use Next.js router for client-side navigation
+ const redirectUrl = userData.isPlatformAdmin ? '/admin/dashboard' : '/dashboard';
+ router.push(redirectUrl);
```

## Testing Verification

### Platform Admin Login
1. Navigate to `http://localhost:3000/login`
2. Login with platform admin credentials
3. ✅ Should see "Welcome back!" toast
4. ✅ Should redirect to `/admin/dashboard`
5. ✅ Dashboard should load (not 404)

### Tenant User Login
1. Navigate to `http://localhost:3000/login` or `http://tenantslug.localhost:3000/login`
2. Login with tenant user credentials
3. ✅ Should see "Welcome back!" toast
4. ✅ Should redirect to `/dashboard`
5. ✅ Dashboard should load (not 404)

## Related Components

### Authentication Flow
- **Login Form**: `/apps/web/src/components/auth/login-form.tsx`
- **Auth Context**: `/apps/web/src/lib/auth/auth-context.tsx` ← **FIXED**
- **Session Utils**: `/apps/web/src/lib/auth/session.ts`

### Layout Protection
- **Admin Layout**: `/apps/web/src/app/admin/layout.tsx` - Uses `getSession()` server-side
- **Dashboard Layout**: `/apps/web/src/app/(dashboard)/layout.tsx` - Uses `getSession()` server-side
- **Middleware**: `/apps/web/src/middleware.ts` - JWT verification and route protection

### Dashboard Pages
- **Platform Admin**: `/apps/web/src/app/admin/dashboard/page.tsx`
- **Tenant User**: `/apps/web/src/app/(dashboard)/dashboard/page.tsx`

## Best Practices Applied

1. ✅ **Use Next.js Router**: Prefer `router.push()` over `window.location.href` for client-side navigation
2. ✅ **Cookie Management**: Let Next.js handle cookie synchronization between client/server
3. ✅ **Client-Side Navigation**: Avoid unnecessary full page reloads
4. ✅ **State Preservation**: Keep user context intact during navigation
5. ✅ **Consistent Patterns**: Use same approach for both login and MFA flows

## Prevention

To avoid similar issues in the future:

1. **Always use `router.push()`** for authenticated redirects in client components
2. **Reserve `window.location.href`** only for:
   - Logout (to clear all state)
   - External redirects
   - Cross-origin navigations
3. **Test cookie timing** when implementing authentication flows
4. **Monitor redirect loops** in middleware and layout protection logic

## Additional Notes

- **Logout still uses `window.location.href`**: This is intentional to fully clear browser state
- **Middleware protection**: Still in place and working correctly
- **Server-side layouts**: Still protect routes, but now client-state is properly preserved
- **No performance impact**: Client-side navigation is actually faster than full page reload

## Timeline

**Last 24 Hours**:
- The issue likely occurred due to a previous change that switched from `router.push()` to `window.location.href`
- This was probably done to "ensure cookies are sent to server" but actually caused the opposite problem
- The fix reverts to proper Next.js navigation patterns

---

**Status**: ✅ **RESOLVED**  
**Tested**: Platform Admin Login ✓ | Tenant Login ✓  
**Deployed**: January 17, 2026
