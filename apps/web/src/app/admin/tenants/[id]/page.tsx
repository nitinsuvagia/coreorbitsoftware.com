'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { formatCurrency, formatDate, formatDateTime, formatStorageGB } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PhoneDisplay } from '@/components/ui/phone-input';
import { ArrowLeft, Building2, ExternalLink, User, Users, Globe, Database } from 'lucide-react';

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  reportLogo?: string | null;
  legalName?: string | null;
  status: string;
  email: string;
  phone?: string | null;
  website?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  trialEndsAt?: string | null;
  activatedAt?: string | null;
  suspendedAt?: string | null;
  terminatedAt?: string | null;
  createdAt?: string;
  databaseName?: string | null;
  databaseHost?: string | null;
  databasePort?: number | null;
  subscription?: {
    status?: string;
    billingCycle?: string;
    amount?: string | number;
    currency?: string;
    currentPeriodEnd?: string;
    trialEnd?: string;
    maxUsers?: number;
    maxStorage?: string | number;
    maxProjects?: number | null;
    plan?: {
      name?: string;
      slug?: string;
    };
  } | null;
  settings?: {
    timezone?: string;
    currency?: string;
    language?: string;
    moduleEmployee?: boolean;
    moduleAttendance?: boolean;
    moduleProject?: boolean;
    moduleTask?: boolean;
    moduleClient?: boolean;
    moduleAsset?: boolean;
    moduleHrPayroll?: boolean;
    moduleMeeting?: boolean;
    moduleRecruitment?: boolean;
    moduleResource?: boolean;
    moduleFile?: boolean;
  } | null;
  subdomains?: Array<{
    id: string;
    subdomain: string;
    isPrimary: boolean;
    status: string;
  }>;
  userCount?: number;
  employeeCount?: number;
  adminUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
    lastLoginAt?: string | null;
    createdAt?: string;
  } | null;
}

const moduleLabels = [
  { key: 'moduleEmployee', label: 'Employees' },
  { key: 'moduleAttendance', label: 'Attendance' },
  { key: 'moduleProject', label: 'Projects' },
  { key: 'moduleTask', label: 'Tasks' },
  { key: 'moduleClient', label: 'Clients' },
  { key: 'moduleAsset', label: 'Assets' },
  { key: 'moduleHrPayroll', label: 'HR & Payroll' },
  { key: 'moduleMeeting', label: 'Meetings' },
  { key: 'moduleRecruitment', label: 'Recruitment' },
  { key: 'moduleResource', label: 'Resource Mgmt' },
  { key: 'moduleFile', label: 'Files' },
];

const getStatusVariant = (status?: string) => {
  switch ((status || '').toLowerCase()) {
    case 'active':
      return 'success';
    case 'trial':
    case 'trialing':
      return 'warning';
    case 'suspended':
    case 'terminated':
      return 'destructive';
    default:
      return 'secondary';
  }
};

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;

    const fetchTenant = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<TenantDetail>(`/api/v1/platform/tenants/${tenantId}`);
        if (response.success && response.data) {
          setTenant(response.data);
        } else {
          setError(response.error?.message || 'Failed to load tenant details');
        }
      } catch (err) {
        console.error('Error loading tenant details:', err);
        setError('Failed to load tenant details');
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
  }, [tenantId]);

  const portalUrl = tenant?.slug ? `http://${tenant.slug}.localhost:3000` : '';
  const enabledModules = useMemo(() => {
    if (!tenant?.settings) return [];
    return moduleLabels.filter((module) => (tenant.settings as any)[module.key]);
  }, [tenant?.settings]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-md" />
            {/* Logo Skeleton */}
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-9 w-16 mt-1" />
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Detail Cards Skeleton */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Organization Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-5 w-28" />
              </div>
              <Skeleton className="h-4 w-40 mt-1" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-36" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Contact Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-5 w-32" />
              </div>
              <Skeleton className="h-4 w-44 mt-1" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-40" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Subscription Card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-32 mt-1" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Admin User Card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-44 mt-1" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-32" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Enabled Modules Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48 mt-1" />
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-6 w-20 rounded-full" />
              ))}
            </CardContent>
          </Card>

          {/* Domains Card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-36 mt-1" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* System Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-4 w-40 mt-1" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Tenant not available</CardTitle>
            <CardDescription>{error || 'Unable to load tenant details.'}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const subscriptionAmount = tenant.subscription?.amount
    ? Number(tenant.subscription.amount)
    : null;
  const subscriptionStorage = tenant.subscription?.maxStorage
    ? Number(tenant.subscription.maxStorage)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {/* Organization Logo */}
          <Avatar className="h-16 w-16 border-2 border-background shadow-md">
            <AvatarImage src={tenant.logo || undefined} alt={tenant.name} />
            <AvatarFallback className="text-xl bg-primary/10 text-primary">
              {tenant.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight">{tenant.name}</h2>
              <Badge variant={getStatusVariant(tenant.status) as any}>
                {tenant.status.toLowerCase()}
              </Badge>
            </div>
            <p className="text-muted-foreground">{tenant.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/admin/tenants/${tenant.id}/edit`}>Edit Tenant</Link>
          </Button>
          <Button asChild>
            <a href={portalUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Portal
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Users</CardDescription>
            <CardTitle className="text-3xl">{tenant.userCount ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            Active accounts
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Employees</CardDescription>
            <CardTitle className="text-3xl">{tenant.employeeCount ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground flex items-center gap-2">
            <User className="h-4 w-4" />
            People in directory
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Plan</CardDescription>
            <CardTitle className="text-2xl">
              {tenant.subscription?.plan?.name || 'No Plan'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {tenant.subscription?.status ? tenant.subscription.status.toLowerCase() : 'Not subscribed'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Created</CardDescription>
            <CardTitle className="text-xl">
              {tenant.createdAt ? formatDate(tenant.createdAt) : 'N/A'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {tenant.activatedAt ? `Activated ${formatDate(tenant.activatedAt)}` : 'Not activated'}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Organization
            </CardTitle>
            <CardDescription>Core identity and status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Legal name</p>
              <p className="font-medium">{tenant.legalName || tenant.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status timeline</p>
              <p className="font-medium">
                {tenant.status.toLowerCase()}
                {tenant.trialEndsAt && ` · trial ends ${formatDate(tenant.trialEndsAt)}`}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Tenant URL</p>
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                {portalUrl}
              </a>
            </div>
            {/* Stationary Logo */}
            {tenant.reportLogo && (
              <div>
                <p className="text-muted-foreground mb-2">Stationary Logo</p>
                <div className="border rounded-lg p-2 bg-muted/30 inline-block">
                  <img 
                    src={tenant.reportLogo} 
                    alt={`${tenant.name} Stationary Logo`}
                    className="h-12 w-auto object-contain"
                    style={{ maxWidth: '180px' }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Contact & Address
            </CardTitle>
            <CardDescription>How to reach this tenant</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{tenant.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p className="font-medium">
                {tenant.phone ? <PhoneDisplay value={tenant.phone} /> : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Website</p>
              {tenant.website ? (
                <a
                  href={tenant.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  {tenant.website}
                </a>
              ) : (
                <p className="font-medium">N/A</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground">Address</p>
              <p className="font-medium">
                {[tenant.addressLine1, tenant.addressLine2, tenant.city, tenant.state, tenant.country, tenant.postalCode]
                  .filter(Boolean)
                  .join(', ') || 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Billing and limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium">{tenant.subscription?.plan?.name || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Billing cycle</span>
              <span className="font-medium">{tenant.subscription?.billingCycle || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">
                {subscriptionAmount ? formatCurrency(subscriptionAmount, tenant.subscription?.currency || 'USD') : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Max users</span>
              <span className="font-medium">{tenant.subscription?.maxUsers ?? 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Max storage</span>
              <span className="font-medium">{subscriptionStorage ? formatStorageGB(subscriptionStorage) : 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Current period end</span>
              <span className="font-medium">
                {tenant.subscription?.currentPeriodEnd ? formatDate(tenant.subscription.currentPeriodEnd) : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin User</CardTitle>
            <CardDescription>Primary tenant administrator</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {tenant.adminUser ? (
              <>
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">
                    {tenant.adminUser.firstName} {tenant.adminUser.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{tenant.adminUser.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={getStatusVariant(tenant.adminUser.status) as any}>
                    {tenant.adminUser.status.toLowerCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Last login</p>
                  <p className="font-medium">
                    {tenant.adminUser.lastLoginAt ? formatDateTime(tenant.adminUser.lastLoginAt) : 'N/A'}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No admin user found.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Enabled Modules</CardTitle>
            <CardDescription>Tenant feature access snapshot</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {enabledModules.length > 0 ? (
              enabledModules.map((module) => (
                <Badge key={module.key} variant="secondary">
                  {module.label}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No module configuration available.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Domains</CardTitle>
            <CardDescription>Subdomains and routing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {tenant.subdomains && tenant.subdomains.length > 0 ? (
              tenant.subdomains.map((subdomain) => (
                <div key={subdomain.id} className="flex items-center justify-between">
                  <span className="font-medium">{subdomain.subdomain}</span>
                  {subdomain.isPrimary ? (
                    <Badge variant="success">Primary</Badge>
                  ) : (
                    <Badge variant="outline">{subdomain.status.toLowerCase()}</Badge>
                  )}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No subdomains configured.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              System
            </CardTitle>
            <CardDescription>Database configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Database</span>
              <span className="font-medium">{tenant.databaseName || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Host</span>
              <span className="font-medium">{tenant.databaseHost || 'Default'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Port</span>
              <span className="font-medium">{tenant.databasePort ?? 'N/A'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
