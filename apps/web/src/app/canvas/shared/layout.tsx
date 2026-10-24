import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shared Design",
  description: "Open a system design someone shared with you and save your own copy.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function SharedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
