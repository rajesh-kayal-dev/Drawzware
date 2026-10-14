import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your Drawzware settings and canvas preferences.',
  robots: {
    index: false,
    follow: true,
  },
  alternates: null,
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
