'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PhoneInput } from '@/components/ui/phone-input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, getAvatarColor } from '@/lib/utils';
import { Camera, Save, RefreshCw } from 'lucide-react';
import type { UserProfile } from '../types';

interface ProfileTabProps {
  profile: UserProfile | null;
  profileForm: Partial<UserProfile>;
  saving: boolean;
  avatarPreview: string | null;
  onUpdateProfileForm: (field: keyof UserProfile, value: UserProfile[keyof UserProfile]) => void;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveProfile: () => Promise<void>;
}

export function ProfileTab({
  profile,
  profileForm,
  saving,
  avatarPreview,
  onUpdateProfileForm,
  onAvatarChange,
  onSaveProfile,
}: ProfileTabProps) {
  return (
    <div className="space-y-4 h-fit">
      {/* Profile Information Card */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your personal information and profile picture
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarPreview || profile?.avatar} />
                <AvatarFallback className={`${getAvatarColor((profile?.email || '') + (profile?.firstName || '') + (profile?.lastName || '')).className} text-2xl font-semibold`}>
                  {profile ? getInitials(`${profile.firstName} ${profile.lastName}`) : 'U'}
                </AvatarFallback>
              </Avatar>
              <label 
                htmlFor="avatar-upload" 
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90"
              >
                <Camera className="h-4 w-4" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onAvatarChange}
                />
              </label>
            </div>
            <div>
              <p className="font-medium">{profile?.firstName} {profile?.lastName}</p>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG or GIF. Max 2MB.
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input 
                id="firstName" 
                value={profileForm.firstName || ''}
                onChange={(e) => onUpdateProfileForm('firstName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input 
                id="lastName" 
                value={profileForm.lastName || ''}
                onChange={(e) => onUpdateProfileForm('lastName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={profile?.email || ''} disabled />
              <p className="text-xs text-muted-foreground">Contact support to change email</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <PhoneInput
                value={profileForm.phone || ''}
                onChange={(value) => onUpdateProfileForm('phone', value)}
                defaultCountry="IN"
                placeholder="Enter phone number"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea 
                id="bio" 
                placeholder="Tell us about yourself..."
                value={profileForm.bio || ''}
                onChange={(e) => onUpdateProfileForm('bio', e.target.value)}
                rows={4}
                className="resize-none h-[120px]"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={onSaveProfile} disabled={saving}>
            {saving ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
