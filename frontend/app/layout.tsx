import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NoteJam - AI Study Workspaces",
  description: "Turn lectures into notes, flashcards, mind maps, cheat sheets, audio, and lecture chat.",
};

import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
        <body suppressHydrationWarning>{children}</body>
      </html>
    </ClerkProvider>
  );
}
