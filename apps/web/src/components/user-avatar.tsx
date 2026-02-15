'use client';

import { cn, getAvatarColor, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserAvatarProps {
  id: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

export function UserAvatar({
  id,
  firstName,
  lastName,
  avatar,
  size = 'md',
  className,
}: UserAvatarProps) {
  // Use getAvatarColor from utils.ts for consistent colors across the app
  const fullName = `${firstName || ''} ${lastName || ''}`.trim();
  const avatarColor = getAvatarColor(id || fullName);
  const initials = getInitials(fullName) || '?';

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {avatar && <AvatarImage src={avatar} alt={`${firstName} ${lastName}`} />}
      <AvatarFallback className={cn(avatarColor.className, 'font-semibold')}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
