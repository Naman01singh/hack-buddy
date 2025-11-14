import React, { useEffect, useRef, useState } from "react";
import { Moon, Sun, Menu, X, Sparkles, User, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const SimpleNavbar: React.FC = () => {
    const navigate = useNavigate();
    const [isDark, setIsDark] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [active, setActive] = useState<string>("home");
    const [user, setUser] = useState<any>(null);
    const sectionsRef = useRef<Record<string, HTMLElement | null>>({});

    useEffect(() => {
        // Initialize the `isDark` state from localStorage or system preference.
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

        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };

        window.addEventListener("scroll", handleScroll);
        return () => {
            window.removeEventListener("scroll", handleScroll);
            subscription?.unsubscribe();
        };
    }, []);

    useEffect(() => {
        // map section ids to elements
        const ids = ["features", "about", "faq"];
        ids.forEach((id) => {
            sectionsRef.current[id] = document.getElementById(id) || null;
        });

        const onScroll = () => {
            const scrollPos = window.scrollY + 120; // header offset
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
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/");
    };

    const handleNavClick = (href: string) => {
        if (href === "/") {
            if (window.location.pathname !== "/") {
                window.location.href = "/";
            } else {
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
            return;
        }

        if (href.startsWith("#")) {
            const id = href.slice(1);
            if (window.location.pathname === "/") {
                const element = document.getElementById(id);
                if (element) element.scrollIntoView({ behavior: "smooth" });
            } else {
                // go to homepage with hash so on-load effect can scroll
                window.location.href = `/#${id}`;
            }
        }
    };

    const navLinks: Array<{ label: string; href: string; id?: string }> = [
        { label: "Home", href: "/", id: "home" },
        { label: "Features", href: "#features", id: "features" },
        { label: "About", href: "#about", id: "about" },
        { label: "FAQ", href: "#faq", id: "faq" },
    ];

    return (
        <nav
            className={`sticky top-0 z-50 transition-all duration-300 backdrop-blur-sm ${scrolled ? "bg-background/95 shadow-sm border-b border-border/30" : "bg-background/60"
                }`}
        >
            <div className="container mx-auto px-4 md:px-8">
                <div className="flex h-16 items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-accent/10">
                            <Sparkles className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <span className="text-lg font-semibold text-foreground">Hack-Buddy</span>
                    </Link>

                    {/* Desktop nav */}
                    <div className="hidden md:flex items-center gap-6">
                        {navLinks.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleNavClick(link.href);
                                }}
                                className={`relative px-2 py-1 text-sm font-medium transition-colors duration-150 ${active === (link.id || "")
                                        ? "text-foreground font-semibold"
                                        : "text-foreground/70 hover:text-foreground"
                                    }`}
                            >
                                {link.label}
                                <span
                                    className={`absolute left-0 -bottom-1 h-0.5 bg-primary transition-all duration-200 ${active === (link.id || "") ? "w-full" : "w-0"
                                        }`}
                                />
                            </a>
                        ))}
                    </div>

                    {/* right side: Sign In / Profile + Logout + mobile menu */}
                    <div className="flex items-center gap-3">
                        {user ? (
                            <>
                                {/* User logged in: show profile icon and logout */}
                                <Link
                                    to="/profile"
                                    className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-primary/20 hover:bg-primary/30 transition-colors"
                                    title="View Profile"
                                >
                                    <User className="h-5 w-5 text-primary" />
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-red-500/20 hover:bg-red-500/30 transition-colors"
                                    title="Logout"
                                    aria-label="Logout"
                                >
                                    <LogOut className="h-5 w-5 text-red-500" />
                                </button>
                            </>
                        ) : (
                            <>
                                {/* User not logged in: show Sign In button */}
                                <a
                                    href="/auth"
                                    className="hidden md:inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md shadow-sm hover:brightness-95"
                                >
                                    Sign In
                                </a>
                            </>
                        )}
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="md:hidden p-2 rounded-lg hover:bg-accent/20 transition-colors"
                            aria-label="Toggle menu"
                        >
                            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                {/* mobile menu */}
                {isOpen && (
                    <div className="md:hidden border-t border-border/20 py-3 space-y-1 bg-background/60">
                        {navLinks.map((link, idx) => (
                            <a
                                key={link.href}
                                href={link.href}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleNavClick(link.href);
                                    setIsOpen(false);
                                }}
                                className={`block px-4 py-2 text-sm font-medium transition-colors ${active === (link.id || "") ? "text-foreground font-semibold" : "text-foreground/80"
                                    }`}
                                style={{ animationDelay: `${idx * 30}ms` }}
                            >
                                {link.label}
                            </a>
                        ))}

                        <div className="px-4 pt-3 space-y-2 border-t border-border/20">
                            {user ? (
                                <>
                                    <Link
                                        to="/profile"
                                        onClick={() => setIsOpen(false)}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-primary/20 rounded-md transition-colors"
                                    >
                                        <User className="h-4 w-4" />
                                        View Profile
                                    </Link>
                                    <button
                                        onClick={() => {
                                            handleLogout();
                                            setIsOpen(false);
                                        }}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-500/20 rounded-md transition-colors"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <a
                                    href="/auth"
                                    onClick={() => setIsOpen(false)}
                                    className="w-full block text-center px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md shadow-sm"
                                >
                                    Sign In
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};
