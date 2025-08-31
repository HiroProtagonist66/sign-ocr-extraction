import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Validation - Microsoft FTY02',
  description: 'Professional validation interface for reviewing and correcting extracted sign locations from datacenter floor plans',
  openGraph: {
    title: 'Sign Validation Interface',
    description: 'Review and correct extracted sign data with professional validation tools',
    type: 'website',
  },
};

export default function ValidationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}