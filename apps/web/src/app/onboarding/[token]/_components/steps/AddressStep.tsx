'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface AddressData {
  current: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  permanent: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  sameAsCurrent: boolean;
}

interface AddressStepProps {
  data: AddressData;
  onChange: (data: AddressData) => void;
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
];

const COUNTRIES = ['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Other'];

export default function AddressStep({ data, onChange }: AddressStepProps) {
  const handleCurrentChange = (field: keyof AddressData['current'], value: string) => {
    const newData = {
      ...data,
      current: { ...data.current, [field]: value },
    };
    // If same as current is checked, update permanent as well
    if (data.sameAsCurrent) {
      newData.permanent = { ...newData.current };
    }
    onChange(newData);
  };

  const handlePermanentChange = (field: keyof AddressData['permanent'], value: string) => {
    onChange({
      ...data,
      permanent: { ...data.permanent, [field]: value },
    });
  };

  const handleSameAsCurrent = (checked: boolean) => {
    onChange({
      ...data,
      sameAsCurrent: checked,
      permanent: checked ? { ...data.current } : data.permanent,
    });
  };

  return (
    <div className="space-y-6">
      {/* Current Address */}
      <div>
        <h3 className="text-sm font-medium mb-4">Current Address</h3>
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currentStreet">Street Address <span className="text-red-500">*</span></Label>
            <Input
              id="currentStreet"
              value={data.current.street}
              onChange={(e) => handleCurrentChange('street', e.target.value)}
              placeholder="House No., Street, Area"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentCity">City <span className="text-red-500">*</span></Label>
              <Input
                id="currentCity"
                value={data.current.city}
                onChange={(e) => handleCurrentChange('city', e.target.value)}
                placeholder="Enter city"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentState">State <span className="text-red-500">*</span></Label>
              {data.current.country === 'India' ? (
                <Select value={data.current.state} onValueChange={(value) => handleCurrentChange('state', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="currentState"
                  value={data.current.state}
                  onChange={(e) => handleCurrentChange('state', e.target.value)}
                  placeholder="Enter state/province"
                  required
                />
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentPostalCode">Postal Code <span className="text-red-500">*</span></Label>
              <Input
                id="currentPostalCode"
                value={data.current.postalCode}
                onChange={(e) => handleCurrentChange('postalCode', e.target.value.replace(/\D/g, ''))}
                placeholder="Enter postal code"
                maxLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentCountry">Country <span className="text-red-500">*</span></Label>
              <Select value={data.current.country} onValueChange={(value) => handleCurrentChange('country', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Permanent Address */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">Permanent Address</h3>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sameAsCurrent"
              checked={data.sameAsCurrent}
              onCheckedChange={handleSameAsCurrent}
            />
            <Label htmlFor="sameAsCurrent" className="text-sm cursor-pointer">
              Same as current address
            </Label>
          </div>
        </div>
        
        {!data.sameAsCurrent && (
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="permanentStreet">Street Address <span className="text-red-500">*</span></Label>
              <Input
                id="permanentStreet"
                value={data.permanent.street}
                onChange={(e) => handlePermanentChange('street', e.target.value)}
                placeholder="House No., Street, Area"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="permanentCity">City <span className="text-red-500">*</span></Label>
                <Input
                  id="permanentCity"
                  value={data.permanent.city}
                  onChange={(e) => handlePermanentChange('city', e.target.value)}
                  placeholder="Enter city"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="permanentState">State <span className="text-red-500">*</span></Label>
                {data.permanent.country === 'India' ? (
                  <Select value={data.permanent.state} onValueChange={(value) => handlePermanentChange('state', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="permanentState"
                    value={data.permanent.state}
                    onChange={(e) => handlePermanentChange('state', e.target.value)}
                    placeholder="Enter state/province"
                    required
                  />
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="permanentPostalCode">Postal Code <span className="text-red-500">*</span></Label>
                <Input
                  id="permanentPostalCode"
                  value={data.permanent.postalCode}
                  onChange={(e) => handlePermanentChange('postalCode', e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter postal code"
                  maxLength={6}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="permanentCountry">Country <span className="text-red-500">*</span></Label>
                <Select value={data.permanent.country} onValueChange={(value) => handlePermanentChange('country', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {data.sameAsCurrent && (
          <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
            Permanent address will be the same as current address.
          </div>
        )}
      </div>
    </div>
  );
}
