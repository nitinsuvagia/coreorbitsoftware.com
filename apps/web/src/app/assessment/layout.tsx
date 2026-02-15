import { Toaster } from 'sonner';
import { AssessmentBrandingLoader } from './_components/AssessmentBrandingLoader';

export const metadata = {
  title: 'Online Assessment',
  description: 'Complete your assessment',
};

export default function AssessmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white light" data-theme="light">
      <AssessmentBrandingLoader />
      {children}
      <Toaster position="top-right" richColors />
    </div>
  );
}
