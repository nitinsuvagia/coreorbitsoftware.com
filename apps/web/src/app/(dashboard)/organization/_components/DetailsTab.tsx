'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Building2, RefreshCw, Save, ImageIcon } from 'lucide-react';
import { LogoUpload } from '@/components/logo-upload';
import type { Organization, OrgFormErrors } from '../types';

interface DetailsTabProps {
  org: Organization;
  orgForm: Partial<Organization>;
  orgErrors: OrgFormErrors;
  saving: boolean;
  onSave: () => void;
  onUpdateField: (field: keyof Organization, value: any) => void;
  onUpdateAddressField: (field: string, value: string) => void;
  onClearError: (field: keyof OrgFormErrors) => void;
}

export function DetailsTab({
  org,
  orgForm,
  orgErrors,
  saving,
  onSave,
  onUpdateField,
  onUpdateAddressField,
  onClearError,
}: DetailsTabProps) {
  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Organization Details
        </CardTitle>
        <CardDescription>Basic information about your organization</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Uploads */}
        <div className="grid gap-6 md:grid-cols-2 pb-6 border-b">
          {/* Thumbnail Logo */}
          <div className="flex flex-col items-center">
            <Label className="mb-2 text-center flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Thumbnail Logo
            </Label>
            <p className="text-xs text-muted-foreground mb-3 text-center">Used in navigation, lists & avatars</p>
            <LogoUpload
              value={orgForm.logo || null}
              onChange={(logo) => onUpdateField('logo', logo)}
              name={orgForm.name || 'Organization'}
              shape="circle"
              size="lg"
            />
          </div>
          {/* Stationary/Report Logo */}
          <div className="flex flex-col items-center">
            <Label className="mb-2 text-center flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Stationery Logo
            </Label>
            <p className="text-xs text-muted-foreground mb-3 text-center">Full-size logo for reports & documents (3:1 ratio)</p>
            <LogoUpload
              value={orgForm.reportLogo || null}
              onChange={(reportLogo) => onUpdateField('reportLogo', reportLogo)}
              name={orgForm.name || 'Organization'}
              shape="square"
              size="lg"
              aspectRatio={3}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="orgName">Organization Name <span className="text-red-500">*</span></Label>
            <Input
              id="orgName"
              value={orgForm.name || ''}
              onChange={(e) => {
                onUpdateField('name', e.target.value);
                if (orgErrors.name) onClearError('name');
              }}
              maxLength={100}
              className={orgErrors.name ? 'border-red-500 focus:ring-red-500' : ''}
            />
            {orgErrors.name && (
              <p className="text-sm text-red-500">{orgErrors.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="legalName">Legal Name</Label>
            <Input
              id="legalName"
              value={orgForm.legalName || ''}
              onChange={(e) => onUpdateField('legalName', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Contact Email</Label>
            <Input
              id="email"
              type="email"
              value={orgForm.email || ''}
              onChange={(e) => {
                onUpdateField('email', e.target.value);
                if (orgErrors.email) onClearError('email');
              }}
              className={orgErrors.email ? 'border-red-500 focus:ring-red-500' : ''}
            />
            {orgErrors.email && (
              <p className="text-sm text-red-500">{orgErrors.email}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={orgForm.phone || ''}
              onChange={(e) => onUpdateField('phone', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={orgForm.website || ''}
              onChange={(e) => {
                onUpdateField('website', e.target.value);
                if (orgErrors.website) onClearError('website');
              }}
              placeholder="https://example.com"
              className={orgErrors.website ? 'border-red-500 focus:ring-red-500' : ''}
            />
            {orgErrors.website && (
              <p className="text-sm text-red-500">{orgErrors.website}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="subdomain">Subdomain</Label>
            <div className="flex">
              <Input
                id="subdomain"
                value={org.slug}
                disabled
                className="rounded-r-none bg-muted"
              />
              <span className="inline-flex items-center px-3 bg-muted border border-l-0 rounded-r-md text-sm text-muted-foreground">
                .youroms.com
              </span>
            </div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="addressLine1">Address Line 1</Label>
            <Input
              id="addressLine1"
              value={orgForm.address?.line1 || ''}
              onChange={(e) => onUpdateAddressField('line1', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressLine2">Address Line 2</Label>
            <Input
              id="addressLine2"
              value={orgForm.address?.line2 || ''}
              onChange={(e) => onUpdateAddressField('line2', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={orgForm.address?.city || ''}
              onChange={(e) => onUpdateAddressField('city', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State/Province</Label>
            <Input
              id="state"
              value={orgForm.address?.state || ''}
              onChange={(e) => onUpdateAddressField('state', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={orgForm.address?.country || ''}
              onChange={(e) => onUpdateAddressField('country', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postalCode">Postal Code</Label>
            <Input
              id="postalCode"
              value={orgForm.address?.postalCode || ''}
              onChange={(e) => onUpdateAddressField('postalCode', e.target.value)}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onSave} disabled={saving}>
          {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </CardFooter>
    </Card>
    
    {/* Bottom spacing to prevent content touching screen bottom */}
    <div className="h-6" />
    </>
  );
}
