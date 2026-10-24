import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Import",
  description: "Import architecture designs and system diagrams into Drawzware.",
  robots: { index: false, follow: true },
  alternates: null,
};

export default function ImportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
