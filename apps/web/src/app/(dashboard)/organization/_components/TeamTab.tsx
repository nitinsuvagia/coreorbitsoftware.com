'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  UserPlus,
  MoreHorizontal,
  Shield,
  Mail,
  Trash2,
  RefreshCw,
  Crown,
  Check,
} from 'lucide-react';
import type { TeamMember, InviteFormData } from '../types';

interface TeamTabProps {
  teamMembers: TeamMember[];
  loading: boolean;
  sendingInvite: boolean;
  inviteDialogOpen: boolean;
  editingMember: TeamMember | null;
  removeId: string | null;
  inviteForm: InviteFormData;
  onOpenInviteDialog: () => void;
  onCloseInviteDialog: () => void;
  onSendInvite: () => void;
  onUpdateMemberRole: (memberId: string, role: TeamMember['role']) => void;
  onRemoveMember: () => void;
  onResendInvite: (memberId: string) => void;
  onSetEditingMember: (member: TeamMember | null) => void;
  onSetRemoveId: (id: string | null) => void;
  onUpdateInviteForm: (field: keyof InviteFormData, value: string) => void;
}

function getRoleBadgeVariant(role: TeamMember['role']) {
  switch (role) {
    case 'OWNER': return 'default';
    case 'ADMIN': return 'secondary';
    case 'MANAGER': return 'outline';
    default: return 'outline';
  }
}

function getStatusBadgeColor(status: TeamMember['status']) {
  switch (status) {
    case 'ACTIVE': return 'bg-green-500';
    case 'PENDING': return 'bg-yellow-500';
    case 'SUSPENDED': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
}

export function TeamTab({
  teamMembers,
  loading,
  sendingInvite,
  inviteDialogOpen,
  editingMember,
  removeId,
  inviteForm,
  onOpenInviteDialog,
  onCloseInviteDialog,
  onSendInvite,
  onUpdateMemberRole,
  onRemoveMember,
  onResendInvite,
  onSetEditingMember,
  onSetRemoveId,
  onUpdateInviteForm,
}: TeamTabProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription>Manage your organization's team members and their roles</CardDescription>
            </div>
            <Button onClick={onOpenInviteDialog}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No team members yet</h3>
              <p className="text-muted-foreground mb-4">Invite your team to start collaborating</p>
              <Button onClick={onOpenInviteDialog}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>{getInitials(`${member.firstName} ${member.lastName}`)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.firstName} {member.lastName}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {member.role === 'OWNER' && <Crown className="h-4 w-4 text-yellow-500" />}
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          {member.role}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{member.department || '-'}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(member.status)}>
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(member.joinedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={member.role === 'OWNER'}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onSetEditingMember(member)}>
                            <Shield className="mr-2 h-4 w-4" />
                            Change Role
                          </DropdownMenuItem>
                          {member.status === 'PENDING' && (
                            <DropdownMenuItem onClick={() => onResendInvite(member.id)}>
                              <Mail className="mr-2 h-4 w-4" />
                              Resend Invite
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => onSetRemoveId(member.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invite Member Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={(open) => !open && onCloseInviteDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Email Address</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteForm.email}
                onChange={(e) => onUpdateInviteForm('email', e.target.value)}
                placeholder="colleague@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteRole">Role</Label>
              <Select 
                value={inviteForm.role} 
                onValueChange={(value) => onUpdateInviteForm('role', value)}
              >
                <SelectTrigger id="inviteRole">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin - Full access to all settings</SelectItem>
                  <SelectItem value="MANAGER">Manager - Can manage team members</SelectItem>
                  <SelectItem value="MEMBER">Member - Standard access</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {inviteForm.role === 'ADMIN' && 'Admins have full access to organization settings, billing, and team management.'}
                {inviteForm.role === 'MANAGER' && 'Managers can manage employees and approve requests within their scope.'}
                {inviteForm.role === 'MEMBER' && 'Members have standard access to the platform features.'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onCloseInviteDialog}>Cancel</Button>
            <Button onClick={onSendInvite} disabled={sendingInvite || !inviteForm.email}>
              {sendingInvite && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              <Mail className="mr-2 h-4 w-4" />
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Role Dialog */}
      <Dialog open={!!editingMember} onOpenChange={() => onSetEditingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Update role for {editingMember?.firstName} {editingMember?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarImage src={editingMember?.avatar} />
                <AvatarFallback>{editingMember ? getInitials(`${editingMember.firstName} ${editingMember.lastName}`) : ''}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{editingMember?.firstName} {editingMember?.lastName}</p>
                <p className="text-sm text-muted-foreground">{editingMember?.email}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Select New Role</Label>
              <div className="grid gap-2">
                {(['ADMIN', 'MANAGER', 'MEMBER'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => editingMember && onUpdateMemberRole(editingMember.id, role)}
                    className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted transition-colors ${
                      editingMember?.role === role ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                      <div className="text-left">
                        <p className="font-medium">{role}</p>
                        <p className="text-sm text-muted-foreground">
                          {role === 'ADMIN' && 'Full access to all settings'}
                          {role === 'MANAGER' && 'Can manage team members'}
                          {role === 'MEMBER' && 'Standard access'}
                        </p>
                      </div>
                    </div>
                    {editingMember?.role === role && <Check className="h-5 w-5 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!removeId} onOpenChange={() => onSetRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the team member from your organization. They will lose access to all organization resources immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onRemoveMember} className="bg-red-600 hover:bg-red-700">
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
