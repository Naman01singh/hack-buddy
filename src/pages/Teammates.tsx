import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Github, Linkedin, Mail, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { UserProfileModal } from "@/components/UserProfileModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Profile {
  id: string;
  full_name: string;
  bio: string;
  skills: string[];
  github_url: string;
  linkedin_url: string;
  email: string;
  looking_for_team: boolean;
}

const Teammates = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [skillMatchEnabled, setSkillMatchEnabled] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;
      setUser(currentUser);

      if (!currentUser) {
        navigate("/auth");
        return;
      }

      if (!currentUser.email_confirmed_at) {
        await supabase
          .from("profiles")
          .update({ looking_for_team: false })
          .eq("id", currentUser.id);
        toast.error("Please verify your email to access teammates");
        navigate("/auth");
        return;
      }

      setIsEmailVerified(true);
      fetchProfiles();
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user;
      if (!currentUser) {
        navigate("/auth");
        return;
      }

      if (!currentUser.email_confirmed_at) {
        await supabase
          .from("profiles")
          .update({ looking_for_team: false })
          .eq("id", currentUser.id);
        toast.error("Please verify your email to access teammates");
        navigate("/auth");
        return;
      }

      setUser(currentUser);
      setIsEmailVerified(true);
      fetchProfiles();
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("looking_for_team", true);

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      toast.error("Failed to load profiles");
    } finally {
      setLoading(false);
    }
  };

  // Get all unique skills from profiles
  const allSkills = Array.from(
    new Set(profiles.flatMap((profile) => profile.skills || []))
  ).sort();

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill)
        ? prev.filter((s) => s !== skill)
        : [...prev, skill]
    );
  };

  const filteredProfiles = profiles.filter(
    (profile) =>
      profile.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.skills?.some((skill) =>
        skill.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  const sortedProfiles = skillMatchEnabled && selectedSkills.length > 0
    ? [...filteredProfiles].sort((a, b) => {
      const aMatches = a.skills?.filter((skill) =>
        selectedSkills.includes(skill)
      ).length || 0;
      const bMatches = b.skills?.filter((skill) =>
        selectedSkills.includes(skill)
      ).length || 0;
      return bMatches - aMatches;
    })
    : filteredProfiles;

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Find Your Teammates
          </h1>
          <p className="text-muted-foreground">
            Connect with talented developers looking for teams
          </p>
        </div>

        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by name or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={skillMatchEnabled ? "default" : "outline"}
              onClick={() => setSkillMatchEnabled(!skillMatchEnabled)}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {skillMatchEnabled ? "Skill Match: ON" : "Enable Skill Match"}
            </Button>

            {skillMatchEnabled && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Select Skills ({selectedSkills.length})
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 max-h-96 overflow-y-auto bg-background z-50">
                  <DropdownMenuLabel>Match Skills</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {allSkills.length === 0 ? (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      No skills available
                    </div>
                  ) : (
                    allSkills.map((skill) => (
                      <DropdownMenuCheckboxItem
                        key={skill}
                        checked={selectedSkills.includes(skill)}
                        onCheckedChange={() => handleSkillToggle(skill)}
                      >
                        {skill}
                      </DropdownMenuCheckboxItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedProfiles.map((profile) => (
              <Card
                key={profile.id}
                className="hover:shadow-glow-cyan transition-all cursor-pointer"
                onClick={() => {
                  setSelectedUserId(profile.id);
                  setProfileModalOpen(true);
                }}
              >
                <CardHeader>
                  <CardTitle className="text-xl">{profile.full_name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4" onClick={(e) => e.stopPropagation()}>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {profile.bio || "No bio available"}
                  </p>

                  {profile.skills && profile.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {profile.skills.slice(0, 5).map((skill, idx) => (
                        <Badge key={idx} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {profile.email && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={`mailto:${profile.email}`}>
                          <Mail className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {profile.github_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={profile.github_url} target="_blank" rel="noopener noreferrer">
                          <Github className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {profile.linkedin_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                          <Linkedin className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && sortedProfiles.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No teammates found. Try adjusting your search.
          </div>
        )}

        {/* User Profile Modal */}
        <UserProfileModal
          userId={selectedUserId}
          open={profileModalOpen}
          onOpenChange={setProfileModalOpen}
        />
      </div>
    </div>
  );
};

export default Teammates;
