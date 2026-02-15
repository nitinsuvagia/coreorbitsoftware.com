/**
 * Avatar utility for generating initials and background colors
 */

// Predefined color palette for consistent and aesthetically pleasing avatars
const AVATAR_COLORS = [
  'bg-red-500',
  'bg-pink-500',
  'bg-purple-500',
  'bg-indigo-500',
  'bg-blue-500',
  'bg-cyan-500',
  'bg-teal-500',
  'bg-green-500',
  'bg-emerald-500',
  'bg-lime-500',
  'bg-yellow-500',
  'bg-amber-500',
  'bg-orange-500',
  'bg-rose-500',
  'bg-fuchsia-500',
  'bg-violet-500',
];

/**
 * Get initials from a name
 */
export function getInitials(firstName?: string, lastName?: string): string {
  const first = firstName?.charAt(0).toUpperCase() || '';
  const last = lastName?.charAt(0).toUpperCase() || '';
  return (first + last) || '?';
}

/**
 * Generate a consistent color for a user based on their ID
 */
export function getUserAvatarColor(id: string): string {
  // Create a hash from the ID string
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use the hash to select a color
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

/**
 * Generate initials with background color
 */
export interface AvatarConfig {
  initials: string;
  bgColor: string;
}

export function generateAvatarConfig(
  id: string,
  firstName?: string,
  lastName?: string
): AvatarConfig {
  return {
    initials: getInitials(firstName, lastName),
    bgColor: getUserAvatarColor(id),
  };
}

/**
 * Get text color based on background brightness
 */
export function getContrastTextColor(bgClass: string): string {
  // Light colors that need dark text
  const lightBgColors = ['bg-yellow-500', 'bg-amber-500', 'bg-lime-500', 'bg-cyan-500'];
  return lightBgColors.includes(bgClass) ? 'text-gray-900' : 'text-white';
}
