'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { 
  Search, 
  User, 
  FileText, 
  Briefcase, 
  CheckSquare, 
  Calendar, 
  DollarSign,
  Clock,
  Settings,
  Home,
  Users,
  Loader2
} from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { apiClient } from '@/lib/api/client';

interface SearchResult {
  id: string;
  type: 'employee' | 'project' | 'task' | 'document' | 'leave' | 'attendance' | 'invoice';
  title: string;
  subtitle?: string;
  url: string;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
}

interface SearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const quickLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Employees', href: '/employees', icon: Users },
  { name: 'Projects', href: '/projects', icon: Briefcase },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Attendance', href: '/attendance', icon: Clock },
  { name: 'Leave Requests', href: '/leave', icon: Calendar },
  { name: 'Invoices', href: '/billing', icon: DollarSign },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const getIconForType = (type: SearchResult['type']) => {
  switch (type) {
    case 'employee':
      return User;
    case 'project':
      return Briefcase;
    case 'task':
      return CheckSquare;
    case 'document':
      return FileText;
    case 'leave':
      return Calendar;
    case 'attendance':
      return Clock;
    case 'invoice':
      return DollarSign;
    default:
      return Search;
  }
};

const getGroupLabel = (type: SearchResult['type']) => {
  switch (type) {
    case 'employee':
      return 'Employees';
    case 'project':
      return 'Projects';
    case 'task':
      return 'Tasks';
    case 'document':
      return 'Documents';
    case 'leave':
      return 'Leave Requests';
    case 'attendance':
      return 'Attendance';
    case 'invoice':
      return 'Invoices';
    default:
      return 'Results';
  }
};

export function SearchCommand({ open, onOpenChange }: SearchCommandProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const debouncedQuery = useDebounce(query, 300);

  // Search when query changes
  React.useEffect(() => {
    const search = async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await apiClient.get<SearchResponse>('/search', {
          params: { q: debouncedQuery, limit: 20 }
        });
        setResults(response.data?.results || []);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    search();
  }, [debouncedQuery]);

  const handleSelect = (url: string) => {
    onOpenChange(false);
    setQuery('');
    router.push(url);
  };

  // Group results by type
  const groupedResults = React.useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    results.forEach((result) => {
      if (!groups[result.type]) {
        groups[result.type] = [];
      }
      groups[result.type].push(result);
    });
    return groups;
  }, [results]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command className="rounded-lg border shadow-md">
        <CommandInput 
          placeholder="Search employees, projects, tasks, documents..." 
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isLoading ? (
            <div className="py-6 text-center text-sm">
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              <p className="mt-2 text-muted-foreground">Searching...</p>
            </div>
          ) : query.length > 0 ? (
            <>
              <CommandEmpty>No results found for "{query}"</CommandEmpty>
              
              {Object.entries(groupedResults).map(([type, items]) => (
                <CommandGroup key={type} heading={getGroupLabel(type as SearchResult['type'])}>
                  {items.map((result) => {
                    const Icon = getIconForType(result.type);
                    return (
                      <CommandItem
                        key={`${result.type}-${result.id}`}
                        value={`${result.type}-${result.title}`}
                        onSelect={() => handleSelect(result.url)}
                        className="cursor-pointer"
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        <div className="flex flex-col">
                          <span>{result.title}</span>
                          {result.subtitle && (
                            <span className="text-xs text-muted-foreground">
                              {result.subtitle}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </>
          ) : (
            <>
              <CommandEmpty>Start typing to search...</CommandEmpty>
              <CommandGroup heading="Quick Links">
                {quickLinks.map((link) => (
                  <CommandItem
                    key={link.href}
                    value={link.name}
                    onSelect={() => handleSelect(link.href)}
                    className="cursor-pointer"
                  >
                    <link.icon className="mr-2 h-4 w-4" />
                    <span>{link.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

export function SearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 relative w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
    >
      <Search className="mr-2 h-4 w-4" />
      <span className="hidden lg:inline-flex">Search...</span>
      <span className="inline-flex lg:hidden">Search</span>
      <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}
