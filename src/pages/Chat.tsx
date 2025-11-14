import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Chat } from "@/components/Chat";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Users } from "lucide-react";
import { toast } from "sonner";

interface Team {
  id: string;
  name: string;
  description: string | null;
  leader_id: string;
}

const ChatPage = () => {
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedTeamName, setSelectedTeamName] = useState<string>("");
  const [loading, setLoading] = useState(true);

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
    if (user) {
      fetchUserTeams();
    }
  }, [user]);

  useEffect(() => {
    // Check for team ID in URL query params
    const teamIdFromUrl = searchParams.get("team");
    if (teamIdFromUrl && teams.length > 0) {
      const team = teams.find((t) => t.id === teamIdFromUrl);
      if (team) {
        setSelectedTeamId(team.id);
        setSelectedTeamName(team.name);
      }
    }
  }, [searchParams, teams]);

  const fetchUserTeams = async () => {
    try {
      setLoading(true);
      // Get teams where user is a member or leader
      const { data: teamMembers, error: membersError } = await supabase
        .from("team_members")
        .select("team_id, teams(id, name, description, leader_id)")
        .eq("user_id", user.id);

      if (membersError) throw membersError;

      // Get teams where user is the leader
      const { data: leaderTeams, error: leaderError } = await supabase
        .from("teams")
        .select("id, name, description, leader_id")
        .eq("leader_id", user.id);

      if (leaderError) throw leaderError;

      // Combine and deduplicate teams
      const allTeams: Team[] = [];
      const teamIds = new Set<string>();

      if (teamMembers) {
        teamMembers.forEach((tm: any) => {
          if (tm.teams && !teamIds.has(tm.teams.id)) {
            allTeams.push(tm.teams);
            teamIds.add(tm.teams.id);
          }
        });
      }

      if (leaderTeams) {
        leaderTeams.forEach((team) => {
          if (!teamIds.has(team.id)) {
            allTeams.push(team);
            teamIds.add(team.id);
          }
        });
      }

      setTeams(allTeams);
    } catch (error: any) {
      toast.error("Failed to load teams");
      console.error("Error fetching teams:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTeamSelect = (teamId: string | null, teamName: string) => {
    setSelectedTeamId(teamId);
    setSelectedTeamName(teamName);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Chat
          </h1>
          <p className="text-muted-foreground">Connect with your team members in real-time</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Teams sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="teams">Teams</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="general" className="mt-0">
                    <Button
                      variant={selectedTeamId === null ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => handleTeamSelect(null, "")}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      General Chat
                    </Button>
                  </TabsContent>

                  <TabsContent value="teams" className="mt-0">
                    {loading ? (
                      <div className="text-sm text-muted-foreground py-4">Loading teams...</div>
                    ) : teams.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-4 text-center">
                        You're not part of any teams yet.
                        <br />
                        <a href="/teams" className="text-primary hover:underline">
                          Join a team
                        </a>
                      </div>
                    ) : (
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-2">
                          {teams.map((team) => (
                            <Button
                              key={team.id}
                              variant={selectedTeamId === team.id ? "default" : "outline"}
                              className="w-full justify-start"
                              onClick={() => handleTeamSelect(team.id, team.name)}
                            >
                              <Users className="h-4 w-4 mr-2" />
                              <span className="truncate">{team.name}</span>
                            </Button>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Chat area */}
          <div className="lg:col-span-3">
            <Chat teamId={selectedTeamId} teamName={selectedTeamName} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;

