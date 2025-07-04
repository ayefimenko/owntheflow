import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProviderWrapper from '../components/AuthProviderWrapper';
import ClientErrorBoundary from '../components/ClientErrorBoundary';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Own The Flow - Understand systems. Lead smarter.",
  description: "AI-powered online learning platform for business professionals to understand technical systems, tools, and workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <ClientErrorBoundary>
          <AuthProviderWrapper>
            {children}
          </AuthProviderWrapper>
        </ClientErrorBoundary>
      </body>
    </html>
  );
}
