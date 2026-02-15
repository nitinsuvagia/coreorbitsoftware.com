'use client';

import { useEffect } from 'react';

interface TenantBranding {
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  faviconUrl?: string;
  tenantName?: string;
}

/**
 * Component that applies tenant branding to assessment pages
 * Reads branding from sessionStorage (set by the start page)
 * Also forces light theme for assessment pages (candidates are not authenticated)
 */
export function AssessmentBrandingLoader() {
  useEffect(() => {
    // Force light theme for assessment pages - remove dark class and add light
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    document.documentElement.style.colorScheme = 'light';
    
    // Set light mode CSS variables explicitly to ensure light theme
    document.documentElement.style.setProperty('--background', '0 0% 100%');
    document.documentElement.style.setProperty('--foreground', '0 0% 3.9%');
    document.documentElement.style.setProperty('--card', '0 0% 100%');
    document.documentElement.style.setProperty('--card-foreground', '0 0% 3.9%');
    document.documentElement.style.setProperty('--popover', '0 0% 100%');
    document.documentElement.style.setProperty('--popover-foreground', '0 0% 3.9%');
    document.documentElement.style.setProperty('--muted', '0 0% 96.1%');
    document.documentElement.style.setProperty('--muted-foreground', '0 0% 45.1%');
    document.documentElement.style.setProperty('--border', '0 0% 89.8%');
    document.documentElement.style.setProperty('--input', '0 0% 89.8%');
    
    // Try to load branding from sessionStorage
    const stored = sessionStorage.getItem('assessment-tenant-branding');
    if (stored) {
      try {
        const branding: TenantBranding = JSON.parse(stored);
        applyBranding(branding);
      } catch (e) {
        console.error('Failed to parse stored branding:', e);
      }
    }
  }, []);

  return null;
}

function applyBranding(branding: TenantBranding) {
  if (!branding.primaryColor) return;

  // Convert hex color to HSL for CSS variable
  const hexToHsl = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '221.2 83.2% 53.3%'; // Default blue
    
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };
  
  const primaryHsl = hexToHsl(branding.primaryColor);
  document.documentElement.style.setProperty('--primary', primaryHsl);
  
  // Also set accent color attribute for components that use it
  const colorMap: { [key: string]: string } = {
    '#3B82F6': 'blue',
    '#8B5CF6': 'purple', 
    '#22C55E': 'green',
    '#F97316': 'orange',
    '#EF4444': 'red',
    '#EC4899': 'pink',
    '#14B8A6': 'teal',
    '#6366F1': 'indigo',
  };
  const accentColor = colorMap[branding.primaryColor.toUpperCase()] || 'blue';
  document.documentElement.setAttribute('data-accent-color', accentColor);
}
