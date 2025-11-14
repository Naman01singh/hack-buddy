import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Github, Linkedin, MessageCircle, GraduationCap, Calendar, Code } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UserProfile {
    id: string;
    full_name: string;
    bio: string | null;
    skills: string[] | null;
    tech_stack: string[] | null;
    college: string | null;
    year: string | null;
    github_url: string | null;
    linkedin_url: string | null;
    email: string | null;
    avatar_url: string | null;
}

interface UserProfileModalProps {
    userId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const UserProfileModal = ({ userId, open, onOpenChange }: UserProfileModalProps) => {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user);
        };
        getUser();
    }, []);

    useEffect(() => {
        if (open && userId) {
            fetchProfile();
        }
    }, [open, userId]);

    const fetchProfile = async () => {
        if (!userId) return;

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .single();

            if (error) throw error;
            setProfile(data);
        } catch (error) {
            console.error("Error fetching profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleChat = () => {
        if (!userId || !user) return;
        onOpenChange(false);
        navigate(`/chat/personal/${userId}`);
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    if (!profile && !loading) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>User Profile</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="text-center py-8">Loading profile...</div>
                ) : profile ? (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-start gap-4">
                            <Avatar className="h-20 w-20">
                                <AvatarFallback className="text-2xl">
                                    {profile.full_name ? getInitials(profile.full_name) : "?"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold">{profile.full_name}</h2>
                                {profile.email && (
                                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                                )}
                                {user && user.id !== profile.id && (
                                    <Button onClick={handleChat} className="mt-2" size="sm">
                                        <MessageCircle className="h-4 w-4 mr-2" />
                                        Chat
                                    </Button>
                                )}
                            </div>
                        </div>

                        <Separator />

                        {/* Bio */}
                        {profile.bio && (
                            <div>
                                <h3 className="font-semibold mb-2">About</h3>
                                <p className="text-muted-foreground">{profile.bio}</p>
                            </div>
                        )}

                        {/* College & Year */}
                        {(profile.college || profile.year) && (
                            <div className="grid grid-cols-2 gap-4">
                                {profile.college && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                            <h3 className="font-semibold text-sm">College</h3>
                                        </div>
                                        <p className="text-muted-foreground">{profile.college}</p>
                                    </div>
                                )}
                                {profile.year && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <h3 className="font-semibold text-sm">Year</h3>
                                        </div>
                                        <p className="text-muted-foreground">{profile.year}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Skills */}
                        {profile.skills && profile.skills.length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-2">Skills</h3>
                                <div className="flex flex-wrap gap-2">
                                    {profile.skills.map((skill, idx) => (
                                        <Badge key={idx} variant="secondary">
                                            {skill}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tech Stack */}
                        {profile.tech_stack && profile.tech_stack.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Code className="h-4 w-4 text-muted-foreground" />
                                    <h3 className="font-semibold">Tech Stack</h3>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {profile.tech_stack.map((tech, idx) => (
                                        <Badge key={idx} variant="outline">
                                            {tech}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Social Links */}
                        {(profile.github_url || profile.linkedin_url) && (
                            <div>
                                <h3 className="font-semibold mb-2">Links</h3>
                                <div className="flex gap-2">
                                    {profile.github_url && (
                                        <Button variant="outline" size="sm" asChild>
                                            <a
                                                href={profile.github_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <Github className="h-4 w-4 mr-2" />
                                                GitHub
                                            </a>
                                        </Button>
                                    )}
                                    {profile.linkedin_url && (
                                        <Button variant="outline" size="sm" asChild>
                                            <a
                                                href={profile.linkedin_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <Linkedin className="h-4 w-4 mr-2" />
                                                LinkedIn
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        Profile not found
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

