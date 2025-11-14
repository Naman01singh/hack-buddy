import { useParams } from "react-router-dom";
import { PersonalChat } from "@/components/PersonalChat";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const PersonalChatPage = () => {
    const { userId } = useParams<{ userId: string }>();
    const [user, setUser] = useState<any>(null);

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

    if (!userId) {
        return (
            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-8">
                    <p className="text-muted-foreground">Invalid user ID</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <PersonalChat otherUserId={userId} />
            </div>
        </div>
    );
};

export default PersonalChatPage;

