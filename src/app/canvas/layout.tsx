import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Canvas",
  description:
    "Design your system architecture visually — drag-and-drop services, databases, queues, and connect them with REST, gRPC, WebSocket, and more.",
  robots: {
    index: false,
    follow: true,
  },
  alternates: null,
};

export default function CanvasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
