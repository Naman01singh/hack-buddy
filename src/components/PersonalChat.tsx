import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, MessageCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import { useNavigate } from "react-router-dom";

interface PersonalMessage {
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    created_at: string;
    sender_profile: {
        full_name: string;
        avatar_url: string | null;
    } | null;
    receiver_profile: {
        full_name: string;
        avatar_url: string | null;
    } | null;
}

interface PersonalChatProps {
    otherUserId: string;
}

export const PersonalChat = ({ otherUserId }: PersonalChatProps) => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState<PersonalMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [user, setUser] = useState<any>(null);
    const [otherUser, setOtherUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

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
        if (otherUserId) {
            fetchOtherUser();
        }
    }, [otherUserId]);

    // Fetch messages when both user and otherUserId are available
    useEffect(() => {
        if (user && otherUserId) {
            fetchMessages();
        } else if (otherUserId && user === null) {
            // If user is explicitly null (not just undefined/loading), stop loading
            // This handles the case where user is not authenticated
            setLoading(false);
        }
    }, [user, otherUserId]);

    useEffect(() => {
        if (otherUserId && user) {
            // Set up real-time subscription
            const channel = supabase
                .channel(`personal_messages:${user.id}:${otherUserId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'personal_messages',
                        filter: `sender_id=eq.${otherUserId} AND receiver_id=eq.${user.id}`,
                    },
                    (payload) => {
                        fetchNewMessage(payload.new.id);
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [otherUserId, user]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchOtherUser = async () => {
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, full_name, avatar_url")
                .eq("id", otherUserId)
                .single();

            if (error) throw error;
            setOtherUser(data);
        } catch (error) {
            console.error("Error fetching other user:", error);
        }
    };

    const fetchMessages = async () => {
        if (!user || !otherUserId) return;

        try {
            setLoading(true);
            // @ts-ignore - personal_messages table not in types yet
            // Get messages where user is sender and otherUser is receiver, or vice versa
            const { data: data1, error: error1 } = await supabase
                .from("personal_messages")
                .select(`
          *,
          sender_profile:profiles!personal_messages_sender_id_fkey(id, full_name, avatar_url),
          receiver_profile:profiles!personal_messages_receiver_id_fkey(id, full_name, avatar_url)
        `)
                .eq("sender_id", user.id)
                .eq("receiver_id", otherUserId)
                .order("created_at", { ascending: false })
                .limit(100);

            // @ts-ignore
            const { data: data2, error: error2 } = await supabase
                .from("personal_messages")
                .select(`
          *,
          sender_profile:profiles!personal_messages_sender_id_fkey(id, full_name, avatar_url),
          receiver_profile:profiles!personal_messages_receiver_id_fkey(id, full_name, avatar_url)
        `)
                .eq("sender_id", otherUserId)
                .eq("receiver_id", user.id)
                .order("created_at", { ascending: false })
                .limit(100);

            const error = error1 || error2;
            const data = [...(data1 || []), ...(data2 || [])];

            if (error) throw error;
            // Reverse to show chronological order
            const uniqueMessages = Array.from(
                new Map((data || []).map((msg: any) => [msg.id, msg])).values()
            ).reverse();
            setMessages(uniqueMessages);
        } catch (error: any) {
            toast.error("Failed to load messages");
            console.error("Error fetching messages:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchNewMessage = async (messageId: string) => {
        try {
            // @ts-ignore - personal_messages table not in types yet
            const { data, error } = await supabase
                .from("personal_messages")
                .select(`
          *,
          sender_profile:profiles!personal_messages_sender_id_fkey(id, full_name, avatar_url),
          receiver_profile:profiles!personal_messages_receiver_id_fkey(id, full_name, avatar_url)
        `)
                .eq("id", messageId)
                .single();

            if (error) throw error;
            if (data) {
                setMessages((prev) => {
                    const exists = prev.some((msg) => msg.id === messageId);
                    if (exists) return prev;
                    return [...prev, data];
                });
            }
        } catch (error) {
            console.error("Error fetching new message:", error);
        }
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !otherUserId || !newMessage.trim() || sending) return;

        try {
            setSending(true);

            // Ensure profile exists
            const { data: profileData, error: profileError } = await supabase
                .from("profiles")
                .select("id")
                .eq("id", user.id)
                .single();

            if (profileError && profileError.code === 'PGRST116') {
                const { error: createProfileError } = await supabase.from("profiles").insert({
                    id: user.id,
                    full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Anonymous User",
                    email: user.email || null,
                });
                if (createProfileError) throw createProfileError;
            } else if (profileError) {
                throw profileError;
            }

            // Insert message
            // @ts-ignore - personal_messages table not in types yet
            const { data: insertedMessage, error } = await supabase
                .from("personal_messages")
                .insert({
                    sender_id: user.id,
                    receiver_id: otherUserId,
                    content: newMessage.trim(),
                })
                .select(`
          *,
          sender_profile:profiles!personal_messages_sender_id_fkey(id, full_name, avatar_url),
          receiver_profile:profiles!personal_messages_receiver_id_fkey(id, full_name, avatar_url)
        `)
                .single();

            if (error) throw error;

            if (insertedMessage) {
                setMessages((prev) => {
                    const exists = prev.some((msg) => msg.id === insertedMessage.id);
                    if (exists) return prev;
                    return [...prev, insertedMessage];
                });
            }

            setNewMessage("");
        } catch (error: any) {
            toast.error(error.message || "Failed to send message");
            console.error("Error sending message:", error);
        } finally {
            setSending(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const isOwnMessage = (message: PersonalMessage) => {
        return message.sender_id === user?.id;
    };

    const formatMessageTime = (dateString: string) => {
        const date = new Date(dateString);
        if (isToday(date)) {
            return format(date, "HH:mm");
        } else if (isYesterday(date)) {
            return `Yesterday ${format(date, "HH:mm")}`;
        } else {
            const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
            if (daysAgo < 7) {
                return format(date, "EEE HH:mm");
            } else {
                return format(date, "MMM d, HH:mm");
            }
        }
    };

    return (
        <Card className="flex flex-col h-[600px]">
            <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(-1)}
                        className="mr-auto"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Avatar className="h-8 w-8">
                        <AvatarFallback>
                            {otherUser?.full_name ? getInitials(otherUser.full_name) : "?"}
                        </AvatarFallback>
                    </Avatar>
                    <CardTitle className="flex-1">
                        {otherUser?.full_name || "Loading..."}
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 p-4">
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading messages...</div>
                    ) : messages.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No messages yet. Start the conversation!
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex gap-3 ${isOwnMessage(message) ? "flex-row-reverse" : ""}`}
                                >
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback>
                                            {isOwnMessage(message)
                                                ? (message.sender_profile?.full_name
                                                    ? getInitials(message.sender_profile.full_name)
                                                    : "?")
                                                : (message.receiver_profile?.full_name
                                                    ? getInitials(message.receiver_profile.full_name)
                                                    : "?")}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div
                                        className={`flex flex-col max-w-[70%] ${isOwnMessage(message) ? "items-end" : "items-start"}`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-medium">
                                                {isOwnMessage(message)
                                                    ? message.sender_profile?.full_name || "You"
                                                    : message.receiver_profile?.full_name || "Anonymous"}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {formatMessageTime(message.created_at)}
                                            </span>
                                        </div>
                                        <div
                                            className={`rounded-lg px-4 py-2 ${isOwnMessage(message)
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted"
                                                }`}
                                        >
                                            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </ScrollArea>
                {user ? (
                    <form onSubmit={sendMessage} className="border-t p-4">
                        <div className="flex gap-2">
                            <Input
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type your message..."
                                disabled={sending}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage(e);
                                    }
                                }}
                            />
                            <Button type="submit" disabled={!newMessage.trim() || sending}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="border-t p-4 text-center text-sm text-muted-foreground">
                        Please sign in to send messages
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

