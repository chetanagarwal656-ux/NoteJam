import type { Metadata } from "next";
import { Kalam } from "next/font/google";
import "./globals.css";

const kalam = Kalam({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-kalam",
});

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
      <html lang="en" suppressHydrationWarning className={`${kalam.variable}`}>
        <body suppressHydrationWarning>{children}</body>
      </html>
    </ClerkProvider>
  );
}
