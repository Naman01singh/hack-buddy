import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Calendar, Search, Code2, ArrowRight, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  // If page is loaded with a hash (e.g. /#about), scroll to that section
  useEffect(() => {
    const handleHashScroll = () => {
      if (window.location.hash) {
        const id = window.location.hash.replace("#", "");
        // Wait for DOM to be ready
        setTimeout(() => {
          const el = document.getElementById(id);
          if (el) {
            // Account for navbar height with offset
            const yOffset = -80;
            const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: "smooth" });
          }
        }, 200);
      }
    };
    
    // Initial scroll on mount
    handleHashScroll();
    
    // Also listen for hash changes (when navigating from other pages)
    window.addEventListener("hashchange", handleHashScroll);
    
    return () => {
      window.removeEventListener("hashchange", handleHashScroll);
    };
  }, []);

  // Also handle hash when location changes (React Router navigation)
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          const yOffset = -80;
          const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      }, 300);
    }
  }, [location.hash]);

  const features = [
    {
      icon: Search,
      title: "Find Teammates",
      description: "Search for talented developers with the skills you need for your next hackathon project.",
    },
    {
      icon: Users,
      title: "Create Teams",
      description: "Build your dream team and collaborate on innovative hackathon projects together.",
    },
    {
      icon: Calendar,
      title: "Hackathon Calendar",
      description: "Stay updated with upcoming hackathons and never miss an opportunity to compete.",
    },
    {
      icon: Code2,
      title: "Skill Matching",
      description: "Get matched with team members based on complementary skills and interests.",
    },
  ];

  const faqItems = [
    {
      question: "How do I post my profile on Hack-Buddy?",
      answer: "Simply sign up with your email, fill in your skills, interests, and experience level. Your profile will be visible to other students looking for teammates within minutes.",
    },
    {
      question: "Is Hack-Buddy free to use?",
      answer: "Yes! Hack-Buddy is completely free. There are no hidden fees, premium subscriptions, or charges. We believe in making team formation accessible to everyone.",
    },
    {
      question: "How does the matching system work?",
      answer: "Our intelligent matching system analyzes your skills, interests, and project preferences to suggest compatible teammates. You can also browse all profiles and connect directly.",
    },
    {
      question: "Can I search for specific skills?",
      answer: "Absolutely! You can filter profiles by programming languages, frameworks, design skills, and more. Use our advanced search to find exactly the teammates you need.",
    },
    {
      question: "How do I know if someone is verified?",
      answer: "All users go through email verification. Verified profiles have a checkmark badge. We also track successful team formations to build trust in the community.",
    },
    {
      question: "What if I want to leave a team?",
      answer: "You can leave a team at any time through your team settings. You'll still be able to find other opportunities and join different teams.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">

        <div className="relative z-10 container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
            Thapar Hackathon Team Finder
          </h1>
          <p className="text-xl md:text-2xl text-foreground/90 mb-8 max-w-2xl mx-auto">
            Connect with talented developers, form winning teams, and dominate hackathons together.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            {user ? (
              <Button
                size="lg"
                onClick={() => navigate("/teammates")}
              >
                Find Teammates <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                >
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/hackathons")}
                >
                  View Hackathons
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 text-foreground">
            Everything You Need to Succeed
          </h2>
          <p className="text-muted-foreground text-lg">
            All the tools to find your perfect hackathon team in one place
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Card key={idx} className="hover:border-primary transition-colors border-border">
                <CardContent className="pt-6 text-center">
                  <div className="mb-4 inline-flex p-3 rounded-lg bg-muted">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold mb-4 text-foreground text-center">
            About Hack-Buddy
          </h2>
          <p className="text-muted-foreground text-lg text-center mb-12 max-w-3xl mx-auto">
            Hack-Buddy is a student-led platform designed to solve the challenge of finding the right teammates for hackathons.
            We connect passionate developers, designers, and builders to create winning teams.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <h3 className="text-2xl font-bold mb-3 text-cyan-600 dark:text-cyan-400">20+</h3>
                <p className="text-sm text-muted-foreground font-medium">
                  Students Connected
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Join our growing community of hackathon enthusiasts
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6">
                <h3 className="text-2xl font-bold mb-3 text-blue-600 dark:text-blue-400">5+</h3>
                <p className="text-sm text-muted-foreground font-medium">
                  Teams Formed
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Successful team formations and collaborations
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6">
                <h3 className="text-2xl font-bold mb-3 text-purple-600 dark:text-purple-400">0%</h3>
                <p className="text-sm text-muted-foreground font-medium">
                  Platform Fees
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Completely free for all students
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 bg-background rounded-lg p-8 border border-border/50">
            <h3 className="text-2xl font-semibold mb-4">Our Mission</h3>
            <p className="text-muted-foreground mb-4">
              We believe that great things happen when talented people come together. Hack-Buddy makes it easy for
              students to find teammates, collaborate effectively, and participate in hackathons without worrying about team formation.
            </p>
            <p className="text-muted-foreground">
              Whether you're a frontend expert, backend wizard, or creative designer, there's a team waiting for you.
              Start building, start learning, and start winning today!
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 text-foreground">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-lg">
            Get answers to common questions about Hack-Buddy
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          {faqItems.map((item, idx) => (
            <div
              key={idx}
              className="border border-border/50 rounded-lg overflow-hidden transition-all duration-200 hover:border-border"
            >
              <button
                onClick={() => setExpandedFAQ(expandedFAQ === idx ? null : idx)}
                className="w-full flex items-center justify-between p-6 hover:bg-accent/30 transition-colors text-left"
              >
                <h3 className="font-semibold text-foreground">{item.question}</h3>
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${expandedFAQ === idx ? "rotate-180" : ""
                    }`}
                />
              </button>
              {expandedFAQ === idx && (
                <div className="px-6 pb-6 pt-2 bg-accent/20 border-t border-border/30 animate-in fade-in">
                  <p className="text-muted-foreground">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Index;
