'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { LogoUpload, LogoUploadSkeleton } from '@/components/logo-upload';
import { Skeleton } from '@/components/ui/skeleton';

interface TenantFormData {
  name: string;
  slug: string;
  legalName: string;
  logo: string | null;
  reportLogo: string | null;
  email: string;
  phone: string;
  website: string;
  status: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

const statusOptions = [
  'PENDING',
  'TRIAL',
  'ACTIVE',
  'SUSPENDED',
  'INACTIVE',
  'TERMINATED',
];

export default function EditTenantPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<TenantFormData | null>(null);

  useEffect(() => {
    if (!tenantId) return;

    const fetchTenant = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get<any>(`/api/v1/platform/tenants/${tenantId}`);
        if (response.success && response.data) {
          const tenant = response.data;
          setFormData({
            name: tenant.name || '',
            slug: tenant.slug || '',
            legalName: tenant.legalName || '',
            logo: tenant.logo || null,
            reportLogo: tenant.reportLogo || null,
            email: tenant.email || '',
            phone: tenant.phone || '',
            website: tenant.website || '',
            status: tenant.status || 'PENDING',
            addressLine1: tenant.addressLine1 || '',
            addressLine2: tenant.addressLine2 || '',
            city: tenant.city || '',
            state: tenant.state || '',
            country: tenant.country || '',
            postalCode: tenant.postalCode || '',
          });
        } else {
          toast.error(response.error?.message || 'Failed to load tenant');
        }
      } catch (err) {
        console.error('Error loading tenant:', err);
        toast.error('Failed to load tenant');
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
  }, [tenantId]);

  const updateField = (field: keyof TenantFormData, value: string) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = async () => {
    if (!formData || !tenantId) return;

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        legalName: formData.legalName.trim() || undefined,
        logo: formData.logo,
        reportLogo: formData.reportLogo,
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        website: formData.website.trim() || undefined,
        status: formData.status,
        addressLine1: formData.addressLine1.trim() || undefined,
        addressLine2: formData.addressLine2.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        country: formData.country.trim() || undefined,
        postalCode: formData.postalCode.trim() || undefined,
      };

      const response = await apiClient.patch(`/api/v1/platform/tenants/${tenantId}`, payload);
      if (response.success) {
        toast.success('Tenant updated');
        router.push(`/admin/tenants/${tenantId}`);
      } else {
        toast.error(response.error?.message || 'Failed to update tenant');
      }
    } catch (err) {
      console.error('Error updating tenant:', err);
      toast.error('Failed to update tenant');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !formData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center pb-4 border-b">
              <LogoUploadSkeleton size="lg" shape="circle" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/tenants/${tenantId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Edit Tenant</h2>
          <p className="text-muted-foreground">Update organization details and status</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>Basic tenant profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Uploads */}
          <div className="grid gap-6 md:grid-cols-2 pb-4 border-b">
            {/* Thumbnail Logo */}
            <div className="flex flex-col items-center">
              <Label className="mb-2 text-center">Thumbnail Logo</Label>
              <p className="text-xs text-muted-foreground mb-3 text-center">Used in lists, avatars, and navigation</p>
              <LogoUpload
                value={formData.logo}
                onChange={(logo) => setFormData((prev) => prev ? { ...prev, logo } : prev)}
                name={formData.name || 'Organization'}
                shape="circle"
                size="lg"
              />
            </div>
            {/* Stationary Logo */}
            <div className="flex flex-col items-center">
              <Label className="mb-2 text-center">Stationary Logo</Label>
              <p className="text-xs text-muted-foreground mb-3 text-center">Full-size logo for stationery & documents (3:1 ratio)</p>
              <LogoUpload
                value={formData.reportLogo}
                onChange={(reportLogo) => setFormData((prev) => prev ? { ...prev, reportLogo } : prev)}
                name={formData.name || 'Organization'}
                shape="square"
                size="lg"
                aspectRatio={3}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="legalName">Legal Name</Label>
            <Input
              id="legalName"
              value={formData.legalName}
              onChange={(e) => updateField('legalName', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Tenant Slug</Label>
            <Input id="slug" value={formData.slug} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => updateField('status', value)}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>Primary communication channels</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <PhoneInput
              value={formData.phone}
              onChange={(value) => updateField('phone', value)}
              defaultCountry="IN"
              placeholder="Enter phone number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={formData.website}
              onChange={(e) => updateField('website', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
          <CardDescription>Organization location</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="addressLine1">Address Line 1</Label>
            <Input
              id="addressLine1"
              value={formData.addressLine1}
              onChange={(e) => updateField('addressLine1', e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="addressLine2">Address Line 2</Label>
            <Input
              id="addressLine2"
              value={formData.addressLine2}
              onChange={(e) => updateField('addressLine2', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => updateField('city', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={formData.state}
              onChange={(e) => updateField('state', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={formData.country}
              onChange={(e) => updateField('country', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postalCode">Postal Code</Label>
            <Input
              id="postalCode"
              value={formData.postalCode}
              onChange={(e) => updateField('postalCode', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href={`/admin/tenants/${tenantId}`}>Cancel</Link>
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
