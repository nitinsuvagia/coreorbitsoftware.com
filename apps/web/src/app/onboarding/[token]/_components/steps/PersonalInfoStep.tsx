'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface PersonalInfoData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  bloodGroup: string;
  maritalStatus: string;
  fatherName: string;
  motherName: string;
  spouseName?: string;
  panNumber?: string;
  aadharNumber?: string;
  passportNumber?: string;
  passportExpiry?: string;
}

interface PersonalInfoStepProps {
  data: PersonalInfoData;
  onChange: (data: PersonalInfoData) => void;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'];
const NATIONALITIES = ['Indian', 'American', 'British', 'Canadian', 'Australian', 'Other'];

export default function PersonalInfoStep({ data, onChange }: PersonalInfoStepProps) {
  const handleChange = (field: keyof PersonalInfoData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div>
        <h3 className="text-sm font-medium mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
            <Input
              id="firstName"
              value={data.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              placeholder="Enter first name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name <span className="text-red-500">*</span></Label>
            <Input
              id="lastName"
              value={data.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              placeholder="Enter last name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth <span className="text-red-500">*</span></Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={data.dateOfBirth}
              onChange={(e) => handleChange('dateOfBirth', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">Gender <span className="text-red-500">*</span></Label>
            <Select value={data.gender} onValueChange={(value) => handleChange('gender', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((gender) => (
                  <SelectItem key={gender} value={gender}>{gender}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nationality">Nationality <span className="text-red-500">*</span></Label>
            <Select value={data.nationality} onValueChange={(value) => handleChange('nationality', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select nationality" />
              </SelectTrigger>
              <SelectContent>
                {NATIONALITIES.map((nationality) => (
                  <SelectItem key={nationality} value={nationality}>{nationality}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bloodGroup">Blood Group <span className="text-red-500">*</span></Label>
            <Select value={data.bloodGroup} onValueChange={(value) => handleChange('bloodGroup', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select blood group" />
              </SelectTrigger>
              <SelectContent>
                {BLOOD_GROUPS.map((bg) => (
                  <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maritalStatus">Marital Status <span className="text-red-500">*</span></Label>
            <Select value={data.maritalStatus} onValueChange={(value) => handleChange('maritalStatus', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select marital status" />
              </SelectTrigger>
              <SelectContent>
                {MARITAL_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Family Info */}
      <div>
        <h3 className="text-sm font-medium mb-4">Family Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fatherName">Father&apos;s Name <span className="text-red-500">*</span></Label>
            <Input
              id="fatherName"
              value={data.fatherName}
              onChange={(e) => handleChange('fatherName', e.target.value)}
              placeholder="Enter father's name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="motherName">Mother&apos;s Name <span className="text-red-500">*</span></Label>
            <Input
              id="motherName"
              value={data.motherName}
              onChange={(e) => handleChange('motherName', e.target.value)}
              placeholder="Enter mother's name"
              required
            />
          </div>
          {data.maritalStatus === 'Married' && (
            <div className="space-y-2">
              <Label htmlFor="spouseName">Spouse Name</Label>
              <Input
                id="spouseName"
                value={data.spouseName || ''}
                onChange={(e) => handleChange('spouseName', e.target.value)}
                placeholder="Enter spouse name"
              />
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* ID Information */}
      <div>
        <h3 className="text-sm font-medium mb-4">Identification Documents</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="panNumber">PAN Number</Label>
            <Input
              id="panNumber"
              value={data.panNumber || ''}
              onChange={(e) => handleChange('panNumber', e.target.value.toUpperCase())}
              placeholder="ABCDE1234F"
              maxLength={10}
            />
            <p className="text-xs text-muted-foreground">10-character alphanumeric</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="aadharNumber">Aadhar Number</Label>
            <Input
              id="aadharNumber"
              value={data.aadharNumber || ''}
              onChange={(e) => handleChange('aadharNumber', e.target.value.replace(/\D/g, ''))}
              placeholder="1234 5678 9012"
              maxLength={12}
            />
            <p className="text-xs text-muted-foreground">12-digit number</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="passportNumber">Passport Number (if available)</Label>
            <Input
              id="passportNumber"
              value={data.passportNumber || ''}
              onChange={(e) => handleChange('passportNumber', e.target.value.toUpperCase())}
              placeholder="A1234567"
            />
          </div>
          {data.passportNumber && (
            <div className="space-y-2">
              <Label htmlFor="passportExpiry">Passport Expiry Date</Label>
              <Input
                id="passportExpiry"
                type="date"
                value={data.passportExpiry || ''}
                onChange={(e) => handleChange('passportExpiry', e.target.value)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
