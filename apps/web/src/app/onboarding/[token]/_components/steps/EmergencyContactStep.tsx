'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PhoneInput } from '@/components/ui/phone-input';
import { User, Heart } from 'lucide-react';

interface EmergencyContactData {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  address?: string;
}

interface EmergencyContactStepProps {
  data: EmergencyContactData;
  onChange: (data: EmergencyContactData) => void;
}

const RELATIONSHIPS = [
  'Father', 'Mother', 'Spouse', 'Brother', 'Sister',
  'Son', 'Daughter', 'Friend', 'Guardian', 'Other',
];

export default function EmergencyContactStep({ data, onChange }: EmergencyContactStepProps) {
  const handleChange = (field: keyof EmergencyContactData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Heart className="h-5 w-5 text-amber-500 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">Important</h4>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Please provide details of a person we can contact in case of an emergency. 
              This person should be aware that they are listed as your emergency contact.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contactName">Contact Person Name <span className="text-red-500">*</span></Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="contactName"
              value={data.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter full name"
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="relationship">Relationship <span className="text-red-500">*</span></Label>
            <Select value={data.relationship} onValueChange={(value) => handleChange('relationship', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map((rel) => (
                  <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
            <PhoneInput
              value={data.phone}
              onChange={(value) => handleChange('phone', value)}
              placeholder="Enter phone number"
              defaultCountry="IN"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address (Optional)</Label>
          <Input
            id="email"
            type="email"
            value={data.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="Enter email address"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address (Optional)</Label>
          <Textarea
            id="address"
            value={data.address || ''}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="Enter the contact person's address"
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Provide the address if different from your current address
          </p>
        </div>
      </div>
    </div>
  );
}
