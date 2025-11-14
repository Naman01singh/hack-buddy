import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Users, UserPlus, Check, X, MessageCircle, ArrowLeft, Bell, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Chat } from "@/components/Chat";
import { UserProfileModal } from "@/components/UserProfileModal";

interface Team {
    id: string;
    name: string;
    description: string | null;
    looking_for_members: boolean;
    required_skills: string[];
    max_members: number;
    leader_id: string;
    profiles: {
        full_name: string;
        email: string | null;
        avatar_url: string | null;
    } | null;
    hackathons: {
        title: string;
    } | null;
}

interface JoinRequest {
    id: string;
    team_id: string;
    user_id: string;
    status: "pending" | "accepted" | "rejected";
    message: string | null;
    created_at: string;
    profiles: {
        full_name: string;
        email: string | null;
        avatar_url: string | null;
        bio: string | null;
        skills: string[] | null;
    } | null;
}

interface TeamMember {
    id: string;
    user_id: string;
    joined_at: string;
    profiles: {
        full_name: string;
        email: string | null;
        avatar_url: string | null;
    } | null;
}

const TeamDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [team, setTeam] = useState<Team | null>(null);
    const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [requestMessage, setRequestMessage] = useState("");
    const [submittingRequest, setSubmittingRequest] = useState(false);
    const [hasPendingRequest, setHasPendingRequest] = useState(false);
    const [isMember, setIsMember] = useState(false);
    const [activeTab, setActiveTab] = useState<"info" | "chat">("info");
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [profileModalOpen, setProfileModalOpen] = useState(false);

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
        if (id) {
            fetchTeamData();
            checkUserStatus();
        }
    }, [id, user]);

    useEffect(() => {
        if (id) {
            // Set up real-time subscription for join requests
            const channel = supabase
                .channel(`team_join_requests:${id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'team_join_requests',
                        filter: `team_id=eq.${id}`,
                    },
                    (payload) => {
                        fetchJoinRequests();
                        checkUserStatus();

                        // Show toast notification for team leader when new request arrives
                        if (user && team && team.leader_id === user.id && payload.eventType === 'INSERT') {
                            toast.info("New join request received!", {
                                description: "Someone wants to join your team",
                            });
                        }
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [id, user, team]);

    const fetchTeamData = async () => {
        if (!id) return;

        try {
            setLoading(true);

            // Fetch team details
            const { data: teamData, error: teamError } = await supabase
                .from("teams")
                .select("*, profiles(full_name, email, avatar_url), hackathons(title)")
                .eq("id", id)
                .single();

            if (teamError) throw teamError;
            setTeam(teamData);

            // Fetch team members
            const { data: membersData, error: membersError } = await supabase
                .from("team_members")
                .select("*, profiles(full_name, email, avatar_url)")
                .eq("team_id", id)
                .order("joined_at", { ascending: true });

            if (membersError) throw membersError;
            setTeamMembers(membersData || []);

            // Always fetch join requests (will be filtered by RLS)
            await fetchJoinRequests();
        } catch (error: any) {
            toast.error("Failed to load team details");
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchJoinRequests = async () => {
        if (!id) return;

        try {
            // @ts-ignore - team_join_requests table not in types yet
            const { data, error } = await supabase
                .from("team_join_requests")
                .select("*, profiles(full_name, email, avatar_url, bio, skills)")
                .eq("team_id", id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setJoinRequests(data || []);

            // Show notification for team leader if there are new pending requests
            if (user && team && team.leader_id === user.id) {
                const pendingCount = (data || []).filter((r: JoinRequest) => r.status === "pending").length;
                if (pendingCount > 0) {
                    // You can add a toast here if needed, but we'll show it in the UI
                }
            }
        } catch (error) {
            console.error("Error fetching join requests:", error);
        }
    };

    const checkUserStatus = async () => {
        if (!id || !user) return;

        try {
            // Check if user is already a member
            const { data: memberData } = await supabase
                .from("team_members")
                .select("id")
                .eq("team_id", id)
                .eq("user_id", user.id)
                .single();

            setIsMember(!!memberData);

            // Check if user has a pending request
            // @ts-ignore - team_join_requests table not in types yet
            const { data: requestData } = await supabase
                .from("team_join_requests")
                .select("id, status")
                .eq("team_id", id)
                .eq("user_id", user.id)
                .eq("status", "pending")
                .single();

            setHasPendingRequest(!!requestData);
        } catch (error) {
            // No member or request found, which is fine
            setIsMember(false);
            setHasPendingRequest(false);
        }
    };

    const handleSubmitJoinRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !id || hasPendingRequest || isMember) return;

        try {
            setSubmittingRequest(true);

            // Ensure profile exists before creating join request
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

            // Now create the join request
            // @ts-ignore - team_join_requests table not in types yet
            const { error } = await supabase.from("team_join_requests").insert({
                team_id: id,
                user_id: user.id,
                message: requestMessage.trim() || null,
                status: "pending",
            });

            if (error) throw error;

            toast.success("Join request submitted!");
            setRequestMessage("");
            setHasPendingRequest(true);
            await fetchJoinRequests();
        } catch (error: any) {
            toast.error(error.message || "Failed to submit join request");
            console.error("Error submitting join request:", error);
        } finally {
            setSubmittingRequest(false);
        }
    };

    const handleAcceptRequest = async (requestId: string, userId: string) => {
        if (!id || !user || !team) return;

        // Double-check we're using the correct team ID
        const currentTeamId = id;
        if (!currentTeamId) {
            toast.error("Team ID is missing");
            return;
        }

        try {
            // Check if team has space
            const currentMemberCount = teamMembers.length + 1; // +1 for leader
            if (currentMemberCount >= team.max_members) {
                toast.error("Team is full!");
                return;
            }

            // Verify the request belongs to this team
            // @ts-ignore - team_join_requests table not in types yet
            const { data: requestData, error: requestCheckError } = await supabase
                .from("team_join_requests")
                .select("team_id")
                .eq("id", requestId)
                .single();

            if (requestCheckError) throw requestCheckError;

            if (requestData.team_id !== currentTeamId) {
                toast.error("Request does not belong to this team!");
                return;
            }

            // Check if user is already a member
            const { data: existingMember } = await supabase
                .from("team_members")
                .select("id")
                .eq("team_id", currentTeamId)
                .eq("user_id", userId)
                .single();

            if (existingMember) {
                toast.error("User is already a member of this team!");
                // Update request status anyway
                // @ts-ignore - team_join_requests table not in types yet
                await supabase
                    .from("team_join_requests")
                    .update({ status: "accepted" })
                    .eq("id", requestId);
                await fetchTeamData();
                await fetchJoinRequests();
                return;
            }

            // Update request status
            // @ts-ignore - team_join_requests table not in types yet
            const { error: updateError } = await supabase
                .from("team_join_requests")
                .update({ status: "accepted" })
                .eq("id", requestId)
                .eq("team_id", currentTeamId); // Extra safety check

            if (updateError) throw updateError;

            // Add user to team - explicitly use currentTeamId
            const { error: memberError } = await supabase.from("team_members").insert({
                team_id: currentTeamId,
                user_id: userId,
            });

            if (memberError) {
                // If adding member fails, revert request status
                // @ts-ignore - team_join_requests table not in types yet
                await supabase
                    .from("team_join_requests")
                    .update({ status: "pending" })
                    .eq("id", requestId);
                throw memberError;
            }

            toast.success("User added to team!");
            await fetchTeamData();
            await fetchJoinRequests();
        } catch (error: any) {
            toast.error(error.message || "Failed to accept request");
            console.error("Error accepting request:", error);
        }
    };

    const handleRejectRequest = async (requestId: string) => {
        if (!id || !user) return;

        try {
            // @ts-ignore - team_join_requests table not in types yet
            const { error } = await supabase
                .from("team_join_requests")
                .update({ status: "rejected" })
                .eq("id", requestId);

            if (error) throw error;

            toast.success("Request rejected");
            await fetchJoinRequests();
        } catch (error: any) {
            toast.error(error.message || "Failed to reject request");
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const isTeamLeader = user && team && team.leader_id === user.id;
    const canViewRequests = isTeamLeader || isMember;
    const pendingRequests = joinRequests.filter((r) => r.status === "pending");

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center py-12">Loading team details...</div>
                </div>
            </div>
        );
    }

    if (!team) {
        return (
            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center py-12">
                        <p className="text-muted-foreground mb-4">Team not found</p>
                        <Button onClick={() => navigate("/teams")}>Back to Teams</Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <Button
                    variant="ghost"
                    onClick={() => navigate("/teams")}
                    className="mb-4"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Teams
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Notification for Team Leader about Pending Requests */}
                        {isTeamLeader && pendingRequests.length > 0 && (
                            <Alert className="border-primary bg-primary/10">
                                <Bell className="h-4 w-4 text-primary" />
                                <AlertTitle className="text-primary font-semibold">
                                    {pendingRequests.length} Pending Join Request{pendingRequests.length > 1 ? 's' : ''}
                                </AlertTitle>
                                <AlertDescription>
                                    You have {pendingRequests.length} pending join request{pendingRequests.length > 1 ? 's' : ''} waiting for your review.
                                    Scroll down to see the requests in the sidebar.
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Team Preview Card for Team Leader */}
                        {isTeamLeader && (
                            <Card className="border-primary/20 bg-primary/5">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-5 w-5 text-primary" />
                                        Team Overview
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="text-center p-3 rounded-lg bg-background">
                                            <div className="text-2xl font-bold text-primary">
                                                {teamMembers.length + 1}
                                            </div>
                                            <div className="text-sm text-muted-foreground">Total Members</div>
                                        </div>
                                        <div className="text-center p-3 rounded-lg bg-background">
                                            <div className="text-2xl font-bold text-primary">
                                                {team.max_members}
                                            </div>
                                            <div className="text-sm text-muted-foreground">Max Capacity</div>
                                        </div>
                                        <div className="text-center p-3 rounded-lg bg-background">
                                            <div className="text-2xl font-bold text-red-500">
                                                {pendingRequests.length}
                                            </div>
                                            <div className="text-sm text-muted-foreground">Pending Requests</div>
                                        </div>
                                        <div className="text-center p-3 rounded-lg bg-background">
                                            <div className="text-2xl font-bold text-green-500">
                                                {team.max_members - (teamMembers.length + 1)}
                                            </div>
                                            <div className="text-sm text-muted-foreground">Spots Available</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Team Info */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-3xl flex items-center gap-2">
                                            <Users className="h-6 w-6 text-primary" />
                                            {team.name}
                                        </CardTitle>
                                        <CardDescription className="mt-2">
                                            Led by {team.profiles?.full_name}
                                            {team.hackathons && ` • ${team.hackathons.title}`}
                                        </CardDescription>
                                    </div>
                                    {team.looking_for_members && (
                                        <Badge variant="secondary">Looking for Members</Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {team.description && (
                                    <div>
                                        <h3 className="font-semibold mb-2">Description</h3>
                                        <p className="text-muted-foreground">{team.description}</p>
                                    </div>
                                )}

                                {team.required_skills && team.required_skills.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold mb-2">Required Skills</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {team.required_skills.map((skill, idx) => (
                                                <Badge key={idx} variant="secondary">
                                                    {skill}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span>
                                        {teamMembers.length + 1} / {team.max_members} members
                                    </span>
                                </div>

                                <Separator />

                                <div>
                                    <h3 className="font-semibold mb-3">Team Members</h3>
                                    <div className="space-y-2">
                                        {/* Team Leader */}
                                        <div
                                            className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                                            onClick={() => {
                                                setSelectedUserId(team.leader_id);
                                                setProfileModalOpen(true);
                                            }}
                                        >
                                            <Avatar>
                                                <AvatarFallback>
                                                    {team.profiles?.full_name
                                                        ? getInitials(team.profiles.full_name)
                                                        : "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <p className="font-medium">{team.profiles?.full_name}</p>
                                                <p className="text-sm text-muted-foreground">Team Leader</p>
                                            </div>
                                        </div>

                                        {/* Team Members */}
                                        {teamMembers.map((member) => (
                                            <div
                                                key={member.id}
                                                className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                                                onClick={() => {
                                                    setSelectedUserId(member.user_id);
                                                    setProfileModalOpen(true);
                                                }}
                                            >
                                                <Avatar>
                                                    <AvatarFallback>
                                                        {member.profiles?.full_name
                                                            ? getInitials(member.profiles.full_name)
                                                            : "?"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <p className="font-medium">{member.profiles?.full_name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Joined {format(new Date(member.joined_at), "MMM d, yyyy")}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Join Request Form or Status */}
                        {user && !isMember && !isTeamLeader && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Request to Join</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {hasPendingRequest ? (
                                        <div className="text-center py-4">
                                            <p className="text-muted-foreground">
                                                Your join request is pending. The team leader will review it soon.
                                            </p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubmitJoinRequest} className="space-y-4">
                                            <div>
                                                <Label htmlFor="message">Message (Optional)</Label>
                                                <Textarea
                                                    id="message"
                                                    placeholder="Tell the team leader why you'd like to join..."
                                                    value={requestMessage}
                                                    onChange={(e) => setRequestMessage(e.target.value)}
                                                    rows={4}
                                                />
                                            </div>
                                            <Button type="submit" disabled={submittingRequest} className="w-full">
                                                <UserPlus className="h-4 w-4 mr-2" />
                                                {submittingRequest ? "Submitting..." : "Submit Join Request"}
                                            </Button>
                                        </form>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {!user && (
                            <Card>
                                <CardContent className="py-6 text-center">
                                    <p className="text-muted-foreground mb-4">
                                        Please sign in to request to join this team
                                    </p>
                                    <Button onClick={() => navigate("/auth")}>Sign In</Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Join Requests (for team leader) */}
                        {isTeamLeader && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Bell className="h-5 w-5 text-primary" />
                                        Join Requests
                                        {pendingRequests.length > 0 && (
                                            <Badge variant="destructive" className="ml-auto">
                                                {pendingRequests.length}
                                            </Badge>
                                        )}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {pendingRequests.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">No pending requests</p>
                                        </div>
                                    ) : (
                                        <ScrollArea className="h-[400px]">
                                            <div className="space-y-4">
                                                {pendingRequests.map((request) => (
                                                    <div
                                                        key={request.id}
                                                        className="p-3 border rounded-lg space-y-2"
                                                    >
                                                        <div
                                                            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                                                            onClick={() => {
                                                                setSelectedUserId(request.user_id);
                                                                setProfileModalOpen(true);
                                                            }}
                                                        >
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarFallback>
                                                                    {request.profiles?.full_name
                                                                        ? getInitials(request.profiles.full_name)
                                                                        : "?"}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-1">
                                                                <p className="font-medium text-sm">
                                                                    {request.profiles?.full_name || "Anonymous"}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {format(new Date(request.created_at), "MMM d, HH:mm")}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {request.message && (
                                                            <p className="text-sm text-muted-foreground">{request.message}</p>
                                                        )}
                                                        {request.profiles?.skills && request.profiles.skills.length > 0 && (
                                                            <div className="flex flex-wrap gap-1">
                                                                {request.profiles.skills.slice(0, 3).map((skill, idx) => (
                                                                    <Badge key={idx} variant="outline" className="text-xs">
                                                                        {skill}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {isTeamLeader && (
                                                            <div className="flex gap-2 pt-2">
                                                                <Button
                                                                    size="sm"
                                                                    className="flex-1"
                                                                    onClick={() => handleAcceptRequest(request.id, request.user_id)}
                                                                >
                                                                    <Check className="h-3 w-3 mr-1" />
                                                                    Accept
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="flex-1"
                                                                    onClick={() => handleRejectRequest(request.id)}
                                                                >
                                                                    <X className="h-3 w-3 mr-1" />
                                                                    Reject
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Chat Section */}
                        {isMember && (
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <MessageCircle className="h-5 w-5 text-primary" />
                                        <CardTitle className="text-lg">Team Chat</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <Button
                                            variant={activeTab === "info" ? "default" : "outline"}
                                            className="w-full justify-start"
                                            onClick={() => setActiveTab("info")}
                                        >
                                            Team Info
                                        </Button>
                                        <Button
                                            variant={activeTab === "chat" ? "default" : "outline"}
                                            className="w-full justify-start"
                                            onClick={() => setActiveTab("chat")}
                                        >
                                            <MessageCircle className="h-4 w-4 mr-2" />
                                            Chat
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                {/* Chat View */}
                {isMember && activeTab === "chat" && (
                    <div className="mt-6">
                        <Chat teamId={id} teamName={team.name} />
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

export default TeamDetail;

