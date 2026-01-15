'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate, getInitials } from '@/lib/utils';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Shield,
  Bell,
  Clock,
  Camera,
  Save,
  RefreshCw,
  Key,
  Smartphone,
  LogOut,
  X,
} from 'lucide-react';
import { useProfile, useSecurity } from '../settings/hooks';

const mockSessions = [
  { id: '1', device: 'Chrome on macOS', location: 'San Francisco, CA', lastActive: 'Now', current: true },
  { id: '2', device: 'Safari on iPhone', location: 'San Francisco, CA', lastActive: '2 hours ago', current: false },
  { id: '3', device: 'Firefox on Windows', location: 'New York, NY', lastActive: '1 day ago', current: false },
];

const mockActivity = [
  { action: 'Updated task status', target: 'API Documentation', time: '10 minutes ago' },
  { action: 'Commented on', target: 'Dashboard Redesign', time: '2 hours ago' },
  { action: 'Completed task', target: 'Bug Fix #1234', time: '5 hours ago' },
  { action: 'Clocked in', target: '', time: 'Today at 9:00 AM' },
  { action: 'Requested leave', target: 'March 20-22', time: 'Yesterday' },
];

export default function ProfilePage() {
  const {
    profile,
    profileForm,
    loading,
    saving,
    avatarPreview,
    handleAvatarChange,
    updateProfileForm,
    saveProfile,
  } = useProfile();
  const {
    passwordForm,
    savingPassword,
    updatePasswordForm,
    changePassword,
  } = useSecurity();
  const [newSkill, setNewSkill] = useState('');

  const displayName = [profileForm.firstName, profileForm.lastName].filter(Boolean).join(' ').trim();
  const skills = profileForm.skills || [];

  const handleNameChange = (value: string) => {
    const parts = value.trim().split(/\s+/);
    const firstName = parts.shift() || '';
    const lastName = parts.join(' ');
    updateProfileForm('firstName', firstName);
    updateProfileForm('lastName', lastName);
  };

  const handleAddSkill = () => {
    const trimmed = newSkill.trim();
    if (!trimmed) return;
    if (!skills.includes(trimmed)) {
      updateProfileForm('skills', [...skills, trimmed]);
    }
    setNewSkill('');
  };

  const handleRemoveSkill = (skill: string) => {
    updateProfileForm('skills', skills.filter((item) => item !== skill));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">My Profile</h2>
            <p className="text-muted-foreground">
              View and manage your personal information
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Loading profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">My Profile</h2>
          <p className="text-muted-foreground">
            View and manage your personal information
          </p>
        </div>
      </div>

      {/* Profile Overview Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarPreview || profile?.avatar || ''} />
                <AvatarFallback className="text-2xl">
                  {displayName ? getInitials(displayName) : 'U'}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="profile-avatar-upload"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full border border-input bg-background flex items-center justify-center cursor-pointer hover:bg-accent"
              >
                <Camera className="h-4 w-4" />
                <input
                  id="profile-avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold">{displayName || profile?.email || 'User'}</h3>
                <Badge variant="success">Active</Badge>
              </div>
              <p className="text-muted-foreground">{profileForm.role || 'Employee'}</p>
              <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {profile?.email || ''}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {profileForm.phone || '-'}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {profileForm.location || '-'}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Briefcase className="h-4 w-4" />
                  {profileForm.department || '-'}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Joined {profileForm.joinDate ? formatDate(profileForm.joinDate) : '-'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Personal Info Tab */}
        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={displayName}
                    onChange={(e) => handleNameChange(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={profile?.email || ''} disabled />
                  <p className="text-xs text-muted-foreground">Contact IT to change email</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={profileForm.phone || ''}
                    onChange={(e) => updateProfileForm('phone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={profileForm.location || ''}
                    onChange={(e) => updateProfileForm('location', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profileForm.bio || ''}
                  onChange={(e) => updateProfileForm('bio', e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={saveProfile} disabled={saving}>
                {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skills & Expertise</CardTitle>
              <CardDescription>Your professional skills</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="flex items-center gap-2">
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="rounded-full p-0.5 hover:bg-muted"
                      aria-label={`Remove ${skill}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Add a skill"
                />
                <Button variant="outline" onClick={handleAddSkill}>
                  + Add Skill
                </Button>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={saveProfile} disabled={saving}>
                {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Skills
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Work Information</CardTitle>
              <CardDescription>Your employment details (read-only)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Employee ID</Label>
                  <p className="font-medium">{profileForm.employeeId || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Department</Label>
                  <p className="font-medium">{profileForm.department || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Role</Label>
                  <p className="font-medium">{profileForm.role || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Reports To</Label>
                  <p className="font-medium">{profileForm.manager || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>Update your password regularly</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => updatePasswordForm('currentPassword', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => updatePasswordForm('newPassword', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => updatePasswordForm('confirmPassword', e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={changePassword} disabled={savingPassword}>
                {savingPassword ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Update Password
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>Add extra security to your account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Authenticator App</p>
                  <p className="text-sm text-muted-foreground">Use an app like Google Authenticator</p>
                </div>
                <Badge variant="success">Enabled</Badge>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline">Manage 2FA</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>Manage your active login sessions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{session.device}</p>
                        {session.current && <Badge variant="success">Current</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {session.location} • {session.lastActive}
                      </p>
                    </div>
                  </div>
                  {!session.current && (
                    <Button variant="ghost" size="sm" className="text-red-500">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button variant="destructive">Sign Out All Other Sessions</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your recent actions and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockActivity.map((activity, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="h-2 w-2 mt-2 rounded-full bg-primary" />
                    <div className="flex-1">
                      <p>
                        <span className="font-medium">{activity.action}</span>
                        {activity.target && (
                          <span className="text-muted-foreground"> {activity.target}</span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
