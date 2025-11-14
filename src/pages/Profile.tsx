import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    bio: "",
    skills: "",
    tech_stack: "",
    college: "",
    year: "",
    github_url: "",
    linkedin_url: "",
    looking_for_team: false,
  });

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const currentUser = session.user;

      if (!currentUser.email_confirmed_at) {
        await supabase
          .from("profiles")
          .update({ looking_for_team: false })
          .eq("id", currentUser.id);
        toast.error("Please verify your email before accessing your profile");
        navigate("/auth");
        return;
      }

      setUser(currentUser);
      fetchProfile(currentUser);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        navigate("/auth");
        return;
      }

      const currentUser = session.user;

      if (!currentUser.email_confirmed_at) {
        await supabase
          .from("profiles")
          .update({ looking_for_team: false })
          .eq("id", currentUser.id);
        toast.error("Please verify your email before accessing your profile");
        navigate("/auth");
        return;
      }

      setUser(currentUser);
      fetchProfile(currentUser);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (currentUser: any) => {
    const userId = currentUser.id;
    try {
      const { data, error, status } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error && status !== 406) {
        throw error;
      }

      let profileData = data;

      if (!profileData) {
        const { data: insertData, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            email: currentUser.email,
            full_name: "",
            bio: "",
            skills: [],
            github_url: "",
            linkedin_url: "",
            looking_for_team: false,
          })
          .select("*")
          .single();

        if (insertError) throw insertError;
        profileData = insertData;
      }

      setProfile({
        full_name: profileData.full_name || "",
        bio: profileData.bio || "",
        skills: profileData.skills?.join(", ") || "",
        tech_stack: (profileData as any).tech_stack?.join(", ") || "",
        college: (profileData as any).college || "",
        year: (profileData as any).year || "",
        github_url: profileData.github_url || "",
        linkedin_url: profileData.linkedin_url || "",
        looking_for_team: profileData.looking_for_team ?? false,
      });
    } catch (error: any) {
      toast.error("Failed to load profile");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!user.email_confirmed_at) {
      toast.error("Please verify your email before updating your profile");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          bio: profile.bio,
          skills: profile.skills.split(",").map((s) => s.trim()).filter(Boolean),
          tech_stack: profile.tech_stack.split(",").map((s) => s.trim()).filter(Boolean),
          college: profile.college || null,
          year: profile.year || null,
          github_url: profile.github_url,
          linkedin_url: profile.linkedin_url,
          looking_for_team: profile.looking_for_team,
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="shadow-glow-cyan">
          <CardHeader>
            <CardTitle className="text-3xl bg-gradient-primary bg-clip-text text-transparent">
              Your Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills">Skills (comma-separated)</Label>
                <Input
                  id="skills"
                  value={profile.skills}
                  onChange={(e) => setProfile({ ...profile, skills: e.target.value })}
                  placeholder="React, Python, Machine Learning"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tech_stack">Tech Stack (comma-separated)</Label>
                <Input
                  id="tech_stack"
                  value={profile.tech_stack}
                  onChange={(e) => setProfile({ ...profile, tech_stack: e.target.value })}
                  placeholder="React, Node.js, PostgreSQL, TypeScript"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="college">College</Label>
                  <Input
                    id="college"
                    value={profile.college}
                    onChange={(e) => setProfile({ ...profile, college: e.target.value })}
                    placeholder="Your College Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    value={profile.year}
                    onChange={(e) => setProfile({ ...profile, year: e.target.value })}
                    placeholder="1st, 2nd, 3rd, 4th, etc."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="github_url">GitHub URL</Label>
                <Input
                  id="github_url"
                  type="url"
                  value={profile.github_url}
                  onChange={(e) => setProfile({ ...profile, github_url: e.target.value })}
                  placeholder="https://github.com/username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                <Input
                  id="linkedin_url"
                  type="url"
                  value={profile.linkedin_url}
                  onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/username"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="looking_for_team">Looking for a team</Label>
                <Switch
                  id="looking_for_team"
                  checked={profile.looking_for_team}
                  onCheckedChange={(checked) =>
                    setProfile({ ...profile, looking_for_team: checked })
                  }
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving..." : "Save Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
