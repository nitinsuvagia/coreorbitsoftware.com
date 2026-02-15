'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getInitials, getAvatarColor } from '@/lib/utils';
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
  Users,
  UserPlus,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  RefreshCw,
  Crown,
  Shield,
  Eye,
  Search,
  Building,
  ChevronRight,
  UserMinus,
} from 'lucide-react';
import { useTeams, TEAM_COLORS } from '../hooks/useTeams';
import type { Team, TeamGroupMember, TeamFormData } from '../types';

// Team role badge colors
function getTeamRoleBadge(role: 'LEAD' | 'MEMBER' | 'VIEWER') {
  switch (role) {
    case 'LEAD':
      return { variant: 'default' as const, icon: Crown, label: 'Lead' };
    case 'MEMBER':
      return { variant: 'secondary' as const, icon: Shield, label: 'Member' };
    case 'VIEWER':
      return { variant: 'outline' as const, icon: Eye, label: 'Viewer' };
  }
}

// Get team color class
function getTeamColorClass(color?: string) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    pink: 'bg-pink-500',
    teal: 'bg-teal-500',
    indigo: 'bg-indigo-500',
    yellow: 'bg-yellow-500',
  };
  return colorMap[color || 'blue'] || 'bg-blue-500';
}

export function TeamsTab() {
  const {
    teams,
    selectedTeam,
    teamMembers,
    availableEmployees,
    loading,
    loadingMembers,
    saving,
    teamDialogOpen,
    addMemberDialogOpen,
    deleteTeamId,
    removeMemberId,
    editingTeam,
    formData,
    errors,
    selectedEmployeeIds,
    memberRole,
    setSelectedTeam,
    openCreateTeamDialog,
    openEditTeamDialog,
    closeTeamDialog,
    openAddMemberDialog,
    closeAddMemberDialog,
    updateFormField,
    saveTeam,
    deleteTeam,
    setDeleteTeamId,
    addMembers,
    removeMember,
    setRemoveMemberId,
    updateMemberRole,
    toggleEmployeeSelection,
    setMemberRole,
  } = useTeams();

  const [searchQuery, setSearchQuery] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Filter teams by search
  const filteredTeams = useMemo(() => {
    if (!searchQuery) return teams;
    return teams.filter(team =>
      team.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [teams, searchQuery]);

  // Filter team members by search
  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery) return teamMembers;
    return teamMembers.filter(member =>
      `${member.employee.firstName} ${member.employee.lastName}`
        .toLowerCase()
        .includes(memberSearchQuery.toLowerCase()) ||
      member.employee.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
    );
  }, [teamMembers, memberSearchQuery]);

  // Filter available employees by search in add member dialog
  const [addMemberSearch, setAddMemberSearch] = useState('');
  const filteredAvailableEmployees = useMemo(() => {
    if (!addMemberSearch) return availableEmployees;
    return availableEmployees.filter(emp =>
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(addMemberSearch.toLowerCase()) ||
      emp.email.toLowerCase().includes(addMemberSearch.toLowerCase())
    );
  }, [availableEmployees, addMemberSearch]);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-3 h-full">
        {/* Teams List - Left Panel */}
        <Card className="md:col-span-1 flex flex-col min-h-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Teams
              </CardTitle>
              <Button size="sm" onClick={openCreateTeamDialog}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search teams..."
                className="pl-8 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              {filteredTeams.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No teams found</p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {filteredTeams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => setSelectedTeam(team)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-muted ${
                        selectedTeam?.id === team.id ? 'bg-muted border-l-4 border-primary' : ''
                      }`}
                    >
                      <div className={`h-10 w-10 rounded-lg ${getTeamColorClass(team.color)} flex items-center justify-center`}>
                        {team.isDefault ? (
                          <Building className="h-5 w-5 text-white" />
                        ) : (
                          <Users className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{team.name}</p>
                          {team.isDefault && (
                            <Badge variant="secondary" className="text-xs shrink-0">Default</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {team._count?.members || 0} members
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Team Details - Right Panel */}
        <Card className="md:col-span-2 flex flex-col min-h-0">
          {selectedTeam ? (
            <>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-lg ${getTeamColorClass(selectedTeam.color)} flex items-center justify-center`}>
                      {selectedTeam.isDefault ? (
                        <Building className="h-6 w-6 text-white" />
                      ) : (
                        <Users className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {selectedTeam.name}
                        {selectedTeam.isDefault && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {selectedTeam.description || (selectedTeam.isDefault
                          ? 'All employees are automatically added to this team'
                          : 'No description')}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={openAddMemberDialog}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Members
                    </Button>
                    {!selectedTeam.isDefault && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditTeamDialog(selectedTeam)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Team
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeleteTeamId(selectedTeam.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
                <div className="relative mt-3">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    className="pl-8"
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                {loadingMembers ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No members in this team</h3>
                    <p className="text-muted-foreground mb-4">
                      {selectedTeam.isDefault
                        ? 'New employees will be automatically added here'
                        : 'Add employees to this team to start collaborating'}
                    </p>
                    <Button onClick={openAddMemberDialog}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Members
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-full">
                    <div className="space-y-2">
                      {filteredMembers.map((member) => {
                        const roleBadge = getTeamRoleBadge(member.teamRole);
                        const RoleIcon = roleBadge.icon;
                        return (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={member.employee.avatar} />
                                <AvatarFallback>
                                  {getInitials(`${member.employee.firstName} ${member.employee.lastName}`)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {member.employee.firstName} {member.employee.lastName}
                                </p>
                                <p className="text-sm text-muted-foreground">{member.employee.email}</p>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  {member.employee.designation?.name && (
                                    <span>{member.employee.designation.name}</span>
                                  )}
                                  {member.employee.designation?.name && member.employee.department?.name && (
                                    <span>•</span>
                                  )}
                                  {member.employee.department?.name && (
                                    <span>{member.employee.department.name}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={roleBadge.variant} className="flex items-center gap-1">
                                <RoleIcon className="h-3 w-3" />
                                {roleBadge.label}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => updateMemberRole(member.id, 'LEAD')}
                                    disabled={member.teamRole === 'LEAD'}
                                  >
                                    <Crown className="mr-2 h-4 w-4" />
                                    Make Lead
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => updateMemberRole(member.id, 'MEMBER')}
                                    disabled={member.teamRole === 'MEMBER'}
                                  >
                                    <Shield className="mr-2 h-4 w-4" />
                                    Make Member
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => updateMemberRole(member.id, 'VIEWER')}
                                    disabled={member.teamRole === 'VIEWER'}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Make Viewer
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => setRemoveMemberId(member.id)}
                                  >
                                    <UserMinus className="mr-2 h-4 w-4" />
                                    Remove from Team
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-[500px]">
              <div className="text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a team to view members</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Create/Edit Team Dialog */}
      <Dialog open={teamDialogOpen} onOpenChange={(open) => !open && closeTeamDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? 'Edit Team' : 'Create New Team'}</DialogTitle>
            <DialogDescription>
              {editingTeam
                ? 'Update team details'
                : 'Create a new team to organize your employees'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name <span className="text-red-500">*</span></Label>
              <Input
                id="teamName"
                value={formData.name}
                onChange={(e) => updateFormField('name', e.target.value)}
                placeholder="e.g., Mobile App Team"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamDescription">Description</Label>
              <Textarea
                id="teamDescription"
                value={formData.description}
                onChange={(e) => updateFormField('description', e.target.value)}
                placeholder="What does this team work on?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Team Color</Label>
              <div className="flex flex-wrap gap-2">
                {TEAM_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => updateFormField('color', color.value)}
                    className={`h-8 w-8 rounded-full ${color.class} transition-all ${
                      formData.color === color.value
                        ? 'ring-2 ring-offset-2 ring-primary scale-110'
                        : 'hover:scale-105'
                    }`}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeTeamDialog}>Cancel</Button>
            <Button onClick={saveTeam} disabled={saving}>
              {saving && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              {editingTeam ? 'Update Team' : 'Create Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Members Dialog */}
      <Dialog open={addMemberDialogOpen} onOpenChange={(open) => !open && closeAddMemberDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Members to {selectedTeam?.name}</DialogTitle>
            <DialogDescription>
              Select employees to add to this team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Team Role</Label>
              <Select value={memberRole} onValueChange={(v) => setMemberRole(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEAD">
                    <span className="flex items-center gap-2">
                      <Crown className="h-4 w-4" />
                      Lead - Can manage team tasks and members
                    </span>
                  </SelectItem>
                  <SelectItem value="MEMBER">
                    <span className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Member - Regular team participant
                    </span>
                  </SelectItem>
                  <SelectItem value="VIEWER">
                    <span className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Viewer - Can only view team content
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Select Employees ({selectedEmployeeIds.length} selected)</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  className="pl-8"
                  value={addMemberSearch}
                  onChange={(e) => setAddMemberSearch(e.target.value)}
                />
              </div>
              <ScrollArea className="h-[250px] border rounded-lg">
                {filteredAvailableEmployees.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No employees available</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredAvailableEmployees.map((emp) => (
                      <label
                        key={emp.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors ${
                          selectedEmployeeIds.includes(emp.id) ? 'bg-muted' : ''
                        }`}
                      >
                        <Checkbox
                          checked={selectedEmployeeIds.includes(emp.id)}
                          onCheckedChange={() => toggleEmployeeSelection(emp.id)}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={emp.avatar} />
                          <AvatarFallback className={`${getAvatarColor((emp.email || '') + emp.firstName + emp.lastName).className} text-xs font-semibold`}>
                            {getInitials(`${emp.firstName} ${emp.lastName}`)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {emp.email}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAddMemberDialog}>Cancel</Button>
            <Button
              onClick={addMembers}
              disabled={saving || selectedEmployeeIds.length === 0}
            >
              {saving && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Add {selectedEmployeeIds.length} Member{selectedEmployeeIds.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Team Confirmation */}
      <AlertDialog open={!!deleteTeamId} onOpenChange={() => setDeleteTeamId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this team. All members will be removed from the team.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteTeam}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!removeMemberId} onOpenChange={() => setRemoveMemberId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the member from this team. They can be added back later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeMember}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Bottom spacing to prevent content touching screen bottom */}
      <div className="h-6" />
    </>
  );
}
