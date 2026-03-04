'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';
import { CheckCircle2, XCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      position="top-right"
      expand={true}
      richColors
      closeButton
      icons={{
        success: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        error: <XCircle className="h-5 w-5 text-red-500" />,
        warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
        info: <Info className="h-5 w-5 text-blue-500" />,
        loading: <Loader2 className="h-5 w-5 animate-spin text-primary" />,
      }}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-lg group-[.toaster]:p-4',
          title: 'group-[.toast]:font-semibold group-[.toast]:text-sm',
          description: 'group-[.toast]:text-muted-foreground group-[.toast]:text-xs',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-md group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:text-xs group-[.toast]:font-medium',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-md group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:text-xs',
          closeButton:
            'group-[.toast]:bg-background group-[.toast]:border-border group-[.toast]:text-muted-foreground group-[.toast]:hover:bg-muted',
          success:
            'group-[.toaster]:border-green-200 group-[.toaster]:bg-green-50 dark:group-[.toaster]:border-green-900 dark:group-[.toaster]:bg-green-950',
          error:
            'group-[.toaster]:border-red-200 group-[.toaster]:bg-red-50 dark:group-[.toaster]:border-red-900 dark:group-[.toaster]:bg-red-950',
          warning:
            'group-[.toaster]:border-amber-200 group-[.toaster]:bg-amber-50 dark:group-[.toaster]:border-amber-900 dark:group-[.toaster]:bg-amber-950',
          info:
            'group-[.toaster]:border-blue-200 group-[.toaster]:bg-blue-50 dark:group-[.toaster]:border-blue-900 dark:group-[.toaster]:bg-blue-950',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
