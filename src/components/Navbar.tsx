import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { Code2, LogOut, User, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface NavbarProps {
  user: any;
}

export const Navbar = ({ user }: NavbarProps) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2 text-xl font-bold">
            <Code2 className="h-6 w-6 text-primary" />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Hack-Buddy
            </span>
          </NavLink>

          <div className="flex items-center gap-6">
            {user ? (
              <>
                <NavLink
                  to="/teammates"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  activeClassName="text-primary"
                >
                  Find Teammates
                </NavLink>
                <NavLink
                  to="/teams"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  activeClassName="text-primary"
                >
                  Teams
                </NavLink>
                <NavLink
                  to="/hackathons"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  activeClassName="text-primary"
                >
                  Hackathons
                </NavLink>
                <NavLink
                  to="/chat"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  activeClassName="text-primary"
                >
                  <MessageCircle className="h-4 w-4" />
                </NavLink>
                <NavLink
                  to="/profile"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  activeClassName="text-primary"
                >
                  <User className="h-4 w-4" />
                </NavLink>
                <Button onClick={handleLogout} variant="outline" size="sm">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <NavLink to="/auth" className="text-sm font-medium">
                  <Button>Sign In</Button>
                </NavLink>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
