import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Manage your local system design and architecture projects in Drawzware.',
  robots: {
    index: false,
    follow: true,
  },
  alternates: null,
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
