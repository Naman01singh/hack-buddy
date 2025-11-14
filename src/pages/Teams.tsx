import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Users, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Team {
  id: string;
  name: string;
  description: string;
  looking_for_members: boolean;
  required_skills: string[];
  max_members: number;
  leader_id: string;
  profiles: { full_name: string; email: string | null } | null;
}

const Teams = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    skills: "",
    maxMembers: 4,
  });

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

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("*, profiles(full_name, email)")
        .eq("looking_for_members", true);

      if (error) throw error;
      setTeams(data || []);
    } catch (error: any) {
      toast.error("Failed to load teams");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Ensure profile exists before creating team
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const { error: createProfileError } = await supabase.from("profiles").insert({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Anonymous User",
          email: user.email || null,
        });

        if (createProfileError) throw createProfileError;
      } else if (profileError) {
        throw profileError;
      }

      // Now create the team
      const { error } = await supabase.from("teams").insert({
        name: formData.name,
        description: formData.description,
        required_skills: formData.skills.split(",").map((s) => s.trim()).filter(Boolean),
        max_members: formData.maxMembers,
        leader_id: user.id,
      });

      if (error) throw error;
      toast.success("Team created successfully!");
      setOpen(false);
      setFormData({ name: "", description: "", skills: "", maxMembers: 4 });
      fetchTeams();
    } catch (error: any) {
      toast.error(error.message || "Failed to create team");
      console.error("Error creating team:", error);
    }
  };

  const handleRequestToJoin = (team: Team) => {
    if (!user) {
      toast.error("Please login to request to join a team");
      navigate("/auth");
      return;
    }
    // Navigate to team detail page
    navigate(`/teams/${team.id}`);
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!user) {
      toast.error("Please login to manage teams");
      return;
    }

    const team = teams.find((t) => t.id === teamId);
    if (!team || team.leader_id !== user.id) {
      toast.error("Only the team creator can delete this team");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this team? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase.from("teams").delete().eq("id", teamId);

      if (error) throw error;

      toast.success("Team deleted successfully");
      fetchTeams();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete team");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          {user && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Team
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create a New Team</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTeam} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Team Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="skills">Required Skills (comma-separated)</Label>
                    <Input
                      id="skills"
                      placeholder="React, Node.js, Python"
                      value={formData.skills}
                      onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxMembers">Max Members</Label>
                    <Input
                      id="maxMembers"
                      type="number"
                      min="2"
                      max="10"
                      value={formData.maxMembers}
                      onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) })}
                    />
                  </div>
                  <Button type="submit" className="w-full">Create Team</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <Card
                key={team.id}
                className="hover:border-primary transition-colors cursor-pointer"
                onClick={() => navigate(`/teams/${team.id}`)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    {team.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Led by {team.profiles?.full_name}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4" onClick={(e) => e.stopPropagation()}>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {team.description}
                  </p>

                  {team.required_skills && team.required_skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {team.required_skills.map((skill, idx) => (
                        <Badge key={idx} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
                    <span className="text-sm text-muted-foreground">
                      Max {team.max_members} members
                    </span>
                    <div className="flex gap-2">
                      {user && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/chat?team=${team.id}`)}
                        >
                          <MessageCircle className="h-4 w-4 mr-1" />
                          Chat
                        </Button>
                      )}
                      {team.leader_id === user?.id ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteTeam(team.id)}
                        >
                          Delete Team
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => handleRequestToJoin(team)}>
                          Request to Join
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && teams.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No teams available. Be the first to create one!
          </div>
        )}
      </div>
    </div>
  );
};

export default Teams;
