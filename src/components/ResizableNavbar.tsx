import React, { useEffect, useRef, useState } from "react";
import { Sparkles, User, LogOut, MessageCircle, Moon, Sun } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Navbar as ResizableNavbar,
  NavBody,
  NavItems,
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  NavbarButton,
} from "@/components/ui/resizable-navbar";

/**
 * ResizableNavbar component that integrates the resizable navbar UI
 * with authentication, navigation, and scroll detection functionality
 * from the original SimpleNavbar.
 */
export const ResizableNavbarComponent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState<string>("home");
  const [user, setUser] = useState<any>(null);
  const [visible, setVisible] = useState<boolean>(false);
  const [isDark, setIsDark] = useState<boolean>(false);
  const sectionsRef = useRef<Record<string, HTMLElement | null>>({});

  /**
   * Track scroll to determine if navbar is resized (visible state)
   */
  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 100);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Check initial state
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /**
   * Initialize theme, user session and scroll detection
   */
  useEffect(() => {
    // Initialize theme from localStorage or system preference
    const initTheme = () => {
      try {
        const stored = localStorage.getItem("theme");
        if (stored === "dark") {
          document.documentElement.classList.add("dark");
          setIsDark(true);
        } else if (stored === "light") {
          document.documentElement.classList.remove("dark");
          setIsDark(false);
        } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
          document.documentElement.classList.add("dark");
          setIsDark(true);
        } else {
          setIsDark(document.documentElement.classList.contains("dark"));
        }
      } catch (e) {
        setIsDark(document.documentElement.classList.contains("dark"));
      }
    };

    initTheme();

    // Get user session
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user);
    };
    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  /**
   * Track active section based on scroll position (only on home page)
   * and update active state based on current route
   */
  useEffect(() => {
    // Update active state based on current route
    const path = location.pathname;
    if (path === "/") {
      // On home page, track scroll position for sections
      const ids = ["features", "about", "faq"];
      ids.forEach((id) => {
        sectionsRef.current[id] = document.getElementById(id) || null;
      });

      const onScroll = () => {
        const scrollPos = window.scrollY + 120; // Header offset
        let found = "home";
        for (const id of ids) {
          const el = sectionsRef.current[id];
          if (el && el.offsetTop <= scrollPos) {
            found = id;
          }
        }
        setActive(found);
      };

      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      return () => window.removeEventListener("scroll", onScroll);
    } else {
      // On other pages, set active based on route
      const routeMap: Record<string, string> = {
        "/teammates": "teammates",
        "/teams": "teams",
        "/hackathons": "hackathons",
        "/chat": "chat",
        "/profile": "profile",
      };
      setActive(routeMap[path] || "home");
    }
  }, [location.pathname]);

  /**
   * Handle user logout
   */
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    
    if (newTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  /**
   * Handle navigation clicks with smooth scrolling support
   * Supports both regular routes and hash links for home page sections
   */
  const handleNavClick = (href: string) => {
    if (href === "/") {
      if (location.pathname !== "/") {
        navigate("/");
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    if (href.startsWith("#")) {
      // Hash link - for home page sections
      const id = href.slice(1);
      if (location.pathname === "/") {
        // Already on home page, scroll to section
        setTimeout(() => {
          const element = document.getElementById(id);
          if (element) {
            // Account for navbar height
            const yOffset = -80;
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: "smooth" });
          }
        }, 50);
      } else {
        // Navigate to home page with hash
        navigate(`/#${id}`);
      }
    } else {
      // Regular route navigation
      navigate(href);
    }
  };

  /**
   * Navigation links configuration
   * Different links shown based on user authentication state
   */
  const getNavLinks = (): Array<{ label: string; href: string; id?: string }> => {
    if (user) {
      // Logged in users see app navigation
      return [
        { label: "Home", href: "/", id: "home" },
        { label: "Teammates", href: "/teammates", id: "teammates" },
        { label: "Teams", href: "/teams", id: "teams" },
        { label: "Hackathons", href: "/hackathons", id: "hackathons" },
        { label: "Chat", href: "/chat", id: "chat" },
      ];
    } else {
      // Non-logged in users see marketing pages
      return [
        { label: "Home", href: "/", id: "home" },
        { label: "Features", href: "#features", id: "features" },
        { label: "About", href: "#about", id: "about" },
        { label: "FAQ", href: "#faq", id: "faq" },
      ];
    }
  };

  const navLinks = getNavLinks();

  // Convert navLinks to format expected by NavItems
  const navItems = navLinks.map((link) => ({
    name: link.label,
    link: link.href,
    id: link.id,
  }));

  return (
    <ResizableNavbar>
      {/* Desktop Navigation */}
      <NavBody>
        {/* Logo - changes color when navbar is resized */}
        <Link
          to="/"
          className={cn(
            "relative z-20 mr-4 flex items-center space-x-2 px-2 py-1 text-sm font-normal transition-colors",
            visible 
              ? isDark ? "text-white hover:text-neutral-200" : "text-neutral-900 hover:text-neutral-800"
              : isDark ? "text-neutral-200 hover:text-white" : "text-neutral-900 hover:text-neutral-800"
          )}
          onClick={(e) => {
            e.preventDefault();
            handleNavClick("/");
          }}
        >
          <div className="p-1.5 rounded-lg bg-muted">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <span className={cn(
            "font-medium transition-colors",
            visible 
              ? isDark ? "text-white" : "text-neutral-900"
              : isDark ? "text-neutral-200" : "text-neutral-900"
          )}>Hack-Buddy</span>
        </Link>

        {/* Navigation Items */}
        <NavItems
          items={navItems}
          activeId={active}
          visible={visible}
          onItemClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
            const target = e.currentTarget as HTMLAnchorElement;
            const href = target.getAttribute("href") || target.href;
            if (href) {
              // Extract pathname and hash from href
              try {
                const url = new URL(href, window.location.origin);
                const pathAndHash = url.pathname + url.hash;
                handleNavClick(pathAndHash);
              } catch {
                // If href is a hash link, use it directly
                handleNavClick(href);
              }
            }
          }}
        />

        {/* Right side actions */}
        <div className="relative z-20 flex items-center gap-3 ml-auto">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="h-5 w-5 text-foreground" />
            ) : (
              <Moon className="h-5 w-5 text-foreground" />
            )}
          </button>
          
          {user ? (
            <>
              {/* User logged in: show profile icon and logout */}
              <Link
                to="/profile"
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                title="View Profile"
              >
                <User className="h-5 w-5 text-primary" />
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="h-5 w-5 text-destructive" />
              </button>
            </>
          ) : (
            <>
              {/* User not logged in: show Sign In button */}
              <Link to="/auth">
                <NavbarButton variant="gradient" href="/auth">
                  Sign In
                </NavbarButton>
              </Link>
            </>
          )}
        </div>
      </NavBody>

      {/* Mobile Navigation */}
      <MobileNav>
        <MobileNavHeader>
          {/* Mobile Logo */}
          <Link
            to="/"
            className={cn(
              "flex items-center gap-2 px-2 py-1 text-sm font-medium transition-colors",
              isDark ? "text-neutral-200 hover:text-white" : "text-neutral-900 hover:text-neutral-800"
            )}
            onClick={(e) => {
              e.preventDefault();
              handleNavClick("/");
            }}
          >
            <div className="p-1.5 rounded-lg bg-muted">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span className={cn(
              "font-semibold transition-colors",
              isDark ? "text-neutral-200" : "text-neutral-900"
            )}>Hack-Buddy</span>
          </Link>

          {/* Mobile Menu Toggle */}
          <MobileNavToggle
            isOpen={isOpen}
            onClick={() => setIsOpen(!isOpen)}
          />
        </MobileNavHeader>

        {/* Mobile Menu */}
        <MobileNavMenu isOpen={isOpen} onClose={() => setIsOpen(false)}>
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick(link.href);
                setIsOpen(false);
              }}
              className={`block px-4 py-2 text-sm font-medium transition-colors ${
                active === (link.id || "")
                  ? "text-foreground font-semibold"
                  : "text-foreground/80"
              }`}
            >
              {link.label}
            </a>
          ))}

          {user && (
            <div className="px-4 pt-3 space-y-2 border-t border-border/20 mt-4">
              <Link
                to="/profile"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <User className="h-4 w-4" />
                View Profile
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-destructive hover:bg-muted rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
          {!user && (
            <div className="px-4 pt-3 border-t border-border/20 mt-4">
              <Link
                to="/auth"
                onClick={() => setIsOpen(false)}
                className="w-full block text-center px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/85 transition-colors"
              >
                Sign In
              </Link>
            </div>
          )}
        </MobileNavMenu>
      </MobileNav>
    </ResizableNavbar>
  );
};

