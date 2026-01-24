/**
 * ===========================================
 * NAVIGATION BAR COMPONENT
 * ===========================================
 * 
 * Client component for the main navigation bar.
 * 
 * DEFENSE NOTES:
 * 
 * WHY "use client"?
 * - We use useState and useEffect for:
 *   - Mobile menu toggle
 *   - Checking authentication status
 *   - Handling logout
 * - These require client-side JavaScript
 * 
 * WHAT HAPPENS IF "use client" IS REMOVED?
 * - Build error: hooks cannot be used in Server Components
 * - useState, useEffect are client-only hooks
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { logout, getAccessToken, verifyToken, User } from "@/lib/auth";

// ===========================================
// NAVIGATION COMPONENT
// ===========================================

export default function Navbar() {
  // Current route path for active link styling
  const pathname = usePathname();
  
  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // User authentication state
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Check authentication on mount
   * 
   * DEFENSE EXPLANATION:
   * - useEffect runs after component mounts (client-side)
   * - We verify token with the auth server
   * - If valid, store user info in state
   */
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAccessToken();
      
      if (token) {
        const userData = await verifyToken();
        setUser(userData);
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, [pathname]); // Re-check when route changes

  /**
   * Handle Logout
   * 
   * Clears tokens and redirects to home page.
   */
  const handleLogout = async () => {
    await logout();
    setUser(null);
    window.location.href = "/";
  };

  /**
   * Navigation Links Configuration
   */
  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/planning", label: "Plan Route", protected: true },
    { href: "/history", label: "My Routes", protected: true },
  ];

  /**
   * Check if link is active
   */
  const isActiveLink = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link 
              href="/" 
              className="flex items-center space-x-2 text-xl font-bold text-primary"
            >
              {/* Mountain/Hiking Icon */}
              <svg 
                className="w-8 h-8" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M5 3l7 9 7-9M5 21l7-9 7 9M12 12l-7 9h14l-7-9z" 
                />
              </svg>
              <span className="hidden sm:inline">Afeka Hiking Trails</span>
              <span className="sm:hidden">AHT</span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-4">
            {navLinks.map((link) => {
              // Hide protected links if not authenticated
              if (link.protected && !user && !isLoading) {
                return null;
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActiveLink(link.href)
                      ? "bg-primary text-white"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            {/* Auth Buttons */}
            <div className="flex items-center space-x-2 ml-4">
              {isLoading ? (
                <div className="w-20 h-8 bg-gray-200 animate-pulse rounded" />
              ) : user ? (
                <>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Hi, {user.username}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="btn btn-outline text-sm"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn btn-secondary text-sm">
                    Login
                  </Link>
                  <Link href="/register" className="btn btn-primary text-sm">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                // X Icon
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                // Hamburger Icon
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-t">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navLinks.map((link) => {
              if (link.protected && !user && !isLoading) {
                return null;
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActiveLink(link.href)
                      ? "bg-primary text-white"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            {/* Mobile Auth Buttons */}
            <div className="pt-4 border-t mt-4">
              {user ? (
                <>
                  <p className="px-3 py-2 text-sm text-gray-600">
                    Logged in as {user.username}
                  </p>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-red-600 hover:bg-gray-100 rounded-md"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="space-y-2 px-3">
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full btn btn-secondary text-center"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full btn btn-primary text-center"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
