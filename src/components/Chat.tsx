import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";

interface Message {
  id: string;
  sender_id: string;
  team_id: string | null;
  content: string;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface ChatProps {
  teamId?: string | null;
  teamName?: string;
}

export const Chat = ({ teamId = null, teamName }: ChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [teamNameFromDb, setTeamNameFromDb] = useState<string>("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get current user
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
    fetchMessages();
    if (teamId && !teamName) {
      fetchTeamName();
    }
  }, [teamId]);

  const fetchTeamName = async () => {
    if (!teamId) return;
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("name")
        .eq("id", teamId)
        .single();

      if (error) throw error;
      if (data) {
        setTeamNameFromDb(data.name);
      }
    } catch (error) {
      console.error("Error fetching team name:", error);
    }
  };

  useEffect(() => {
    // Set up real-time subscription
    const channel = supabase
      .channel(`messages:${teamId || 'general'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: teamId ? `team_id=eq.${teamId}` : 'team_id=is.null',
        },
        (payload) => {
          // Fetch the new message with profile data
          fetchNewMessage(payload.new.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("messages")
        .select("*, profiles(full_name, avatar_url)")
        .order("created_at", { ascending: false }) // Get most recent first
        .limit(100); // Load last 100 messages for history

      if (teamId) {
        query = query.eq("team_id", teamId);
      } else {
        query = query.is("team_id", null);
      }

      const { data, error } = await query;

      if (error) throw error;
      // Ensure no duplicates and reverse to show chronological order (oldest first)
      const uniqueMessages = Array.from(
        new Map((data || []).map((msg) => [msg.id, msg])).values()
      ).reverse(); // Reverse to show oldest first, newest last
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
      const { data, error } = await supabase
        .from("messages")
        .select("*, profiles(full_name, avatar_url)")
        .eq("id", messageId)
        .single();

      if (error) throw error;
      if (data) {
        // Check if message already exists to prevent duplicates
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
    if (!user || !newMessage.trim() || sending) return;

    try {
      setSending(true);
      
      // Ensure profile exists before sending message
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

      // Insert message into database (this will trigger real-time subscription)
      const { data: insertedMessage, error } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          team_id: teamId,
          content: newMessage.trim(),
        })
        .select("*, profiles(full_name, avatar_url)")
        .single();

      if (error) throw error;

      // Optimistically add message to UI immediately
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

  const isOwnMessage = (message: Message) => {
    return message.sender_id === user?.id;
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, "HH:mm");
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, "HH:mm")}`;
    } else {
      // For older messages, show date and time
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
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          {teamId ? `Team: ${teamName || teamNameFromDb || "Loading..."}` : "General Chat"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No messages yet. Be the first to say something!
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
                      {message.profiles?.full_name
                        ? getInitials(message.profiles.full_name)
                        : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`flex flex-col max-w-[70%] ${isOwnMessage(message) ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {message.profiles?.full_name || "Anonymous"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatMessageTime(message.created_at)}
                      </span>
                    </div>
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        isOwnMessage(message)
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

