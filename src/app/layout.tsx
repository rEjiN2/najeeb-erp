import type { Metadata } from "next";
import { Geist_Mono, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/components/shared/theme-provider";
import { AuthProvider } from "@/features/auth/auth-context";
import { getServerSession } from "@/features/auth/session";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ALA Dates",
  description: "Dates trading ERP",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider initialSession={session}>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
