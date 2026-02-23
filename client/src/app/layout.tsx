/**
 * ===========================================
 * ROOT LAYOUT - NEXT.JS APP ROUTER
 * ===========================================
 * 
 * This is the root layout that wraps all pages in the application.
 * 
 * DEFENSE NOTES:
 * 
 * WHAT IS layout.tsx?
 * - Defines shared UI for a route segment and its children
 * - Persists across page navigations (doesn't re-render)
 * - Perfect for: navigation bars, footers, providers
 * 
 * WHY IS IT A SERVER COMPONENT?
 * - By default, all components in /app are Server Components
 * - Server Components run on the server, reducing client JS bundle
 * - We don't need "use client" because we're not using hooks or events
 * 
 * WHAT HAPPENS IF THIS IS REMOVED?
 * - App won't render at all
 * - <html> and <body> tags are required for the page to load
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import Navbar from "@/components/Navbar";

// ===========================================
// FONT CONFIGURATION
// ===========================================

/**
 * Font Loading with next/font
 * 
 * DEFENSE EXPLANATION:
 * - next/font automatically optimizes fonts
 * - Fonts are self-hosted (no external requests)
 * - variable: creates CSS variable for the font
 * - subsets: only loads needed character sets
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ===========================================
// METADATA
// ===========================================

/**
 * Page Metadata
 * 
 * DEFENSE EXPLANATION:
 * - Metadata API replaces <Head> component from Pages Router
 * - Automatically generates <title>, <meta> tags
 * - Can be overridden in child layouts/pages
 */
export const metadata: Metadata = {
  title: {
    default: "Afeka Hiking Trails 2026",
    template: "%s | Afeka Hiking Trails",
  },
  description: "Plan your hiking and cycling adventures with AI-powered route suggestions",
  keywords: ["hiking", "cycling", "trails", "route planning", "outdoor", "adventure"],
};

// ===========================================
// ROOT LAYOUT COMPONENT
// ===========================================

/**
 * RootLayout Component
 * 
 * DEFENSE EXPLANATION:
 * 
 * WHY Readonly<{ children: React.ReactNode }>?
 * - Readonly prevents accidental mutation of props
 * - React.ReactNode accepts any valid React child
 * - TypeScript ensures type safety
 * 
 * LAYOUT STRUCTURE:
 * - <html>: Root element with language attribute
 * - <body>: Contains all visible content
 * - {children}: Where child routes/pages are rendered
 * 
 * @param children - Page content to render inside the layout
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        {/* 
          Navigation Bar
          DEFENSE: Navbar is in layout so it persists across all pages
          This avoids re-rendering on navigation
        */}
        <Navbar />
        
        {/* 
          Main Content Area
          DEFENSE: flex-1 makes main fill remaining space
          This pushes footer to bottom if we add one
        */}
        <main className="flex-1">
          {children}
        </main>
        
        {/* Footer */}
        <footer className="bg-gray-100 dark:bg-gray-800 py-6 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-gray-500 text-sm">
              © 2026 Afeka Hiking Trails. Web Development Course Project.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
