import { useState, useEffect, FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Trophy, Globe, Plus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface Hackathon {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  is_virtual: boolean;
  prize_pool: string;
  website_url: string;
  registration_deadline: string;
  created_by?: string | null;
}

type HackathonFormState = {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  is_virtual: boolean;
  prize_pool: string;
  website_url: string;
  registration_deadline: string;
};

const createInitialFormState = (): HackathonFormState => ({
  title: "",
  description: "",
  start_date: "",
  end_date: "",
  location: "",
  is_virtual: false,
  prize_pool: "",
  website_url: "",
  registration_deadline: "",
});

const Hackathons = () => {
  const [user, setUser] = useState<any>(null);
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creatorToastShown, setCreatorToastShown] = useState(false);
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingHackathon, setEditingHackathon] = useState<Hackathon | null>(null);
  const [formData, setFormData] = useState<HackathonFormState>(createInitialFormState);

  const resetForm = () => setFormData(createInitialFormState());
  const handleCreateDialogChange = (open: boolean) => {
    setDialogOpen(open);
    resetForm();
  };
  const resetEditState = () => {
    setEditDialogOpen(false);
    setEditingHackathon(null);
    resetForm();
  };
  const handleEditDialogChange = (open: boolean) => {
    if (!open) {
      resetEditState();
    } else {
      setEditDialogOpen(true);
    }
  };

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
    fetchHackathons();
  }, []);

  useEffect(() => {
    if (user && !creatorToastShown) {
      const hasCreatedHackathon = hackathons.some(
        (hackathon) => hackathon.created_by === user.id
      );

      if (hasCreatedHackathon) {
        toast.info("Your hackathon is live and visible to everyone!");
        setCreatorToastShown(true);
      }
    }
  }, [user, hackathons, creatorToastShown]);

  useEffect(() => {
    const loadCreatorNames = async () => {
      const missingIds = Array.from(
        new Set(
          hackathons
            .map((hackathon) => hackathon.created_by)
            .filter((id): id is string => !!id && !(id in creatorNames))
        )
      );

      if (missingIds.length === 0) {
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", missingIds);

      if (error || !data) {
        return;
      }

      setCreatorNames((prev) => {
        const updated = { ...prev };
        data.forEach((profile: { id: string; full_name: string | null }) => {
          updated[profile.id] = profile.full_name || "Hack-Buddy member";
        });
        return updated;
      });
    };

    loadCreatorNames();
  }, [hackathons, creatorNames]);

  const formatDateForInput = (value: string | null | undefined) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return format(date, "yyyy-MM-dd'T'HH:mm");
  };

  const openEditDialog = (hackathon: Hackathon) => {
    setEditingHackathon(hackathon);
    setFormData({
      title: hackathon.title,
      description: hackathon.description,
      start_date: formatDateForInput(hackathon.start_date),
      end_date: formatDateForInput(hackathon.end_date),
      location: hackathon.location || "",
      is_virtual: Boolean(hackathon.is_virtual),
      prize_pool: hackathon.prize_pool || "",
      website_url: hackathon.website_url || "",
      registration_deadline: formatDateForInput(hackathon.registration_deadline),
    });
    setEditDialogOpen(true);
  };

  const HackathonForm = ({
    onSubmit,
    submitLabel,
    onCancel,
  }: {
    onSubmit: (e: FormEvent<HTMLFormElement>) => void;
    submitLabel: string;
    onCancel: () => void;
  }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          required
          value={formData.title}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, title: e.target.value }))
          }
          placeholder="Hackathon title"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          required
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          placeholder="Describe your hackathon"
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">Start Date *</Label>
          <Input
            id="start_date"
            type="datetime-local"
            required
            value={formData.start_date}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, start_date: e.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_date">End Date *</Label>
          <Input
            id="end_date"
            type="datetime-local"
            required
            value={formData.end_date}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, end_date: e.target.value }))
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="registration_deadline">Registration Deadline</Label>
        <Input
          id="registration_deadline"
          type="datetime-local"
          value={formData.registration_deadline}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              registration_deadline: e.target.value,
            }))
          }
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="is_virtual"
          checked={formData.is_virtual}
          onCheckedChange={(checked) =>
            setFormData((prev) => ({
              ...prev,
              is_virtual: checked,
              location: checked ? "" : prev.location,
            }))
          }
        />
        <Label htmlFor="is_virtual">Virtual Event</Label>
      </div>

      {!formData.is_virtual && (
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, location: e.target.value }))
            }
            placeholder="Event location"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="prize_pool">Prize Pool</Label>
        <Input
          id="prize_pool"
          value={formData.prize_pool}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, prize_pool: e.target.value }))
          }
          placeholder="e.g., $10,000 in prizes"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="website_url">Website URL</Label>
        <Input
          id="website_url"
          type="url"
          value={formData.website_url}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, website_url: e.target.value }))
          }
          placeholder="https://example.com"
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1">
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );

  const fetchHackathons = async () => {
    try {
      const { data, error } = await supabase
        .from("hackathons")
        .select("*")
        .order("start_date", { ascending: true });

      if (error) throw error;
      setHackathons((data as Hackathon[]) || []);
    } catch (error: any) {
      toast.error("Failed to load hackathons");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (hackathonId: string) => {
    if (!user) {
      toast.error("Please login to register for a hackathon");
      return;
    }

    try {
      const { error } = await supabase.from("hackathon_registrations").insert({
        hackathon_id: hackathonId,
        user_id: user.id,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("You're already registered for this hackathon");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Successfully registered for the hackathon!");
    } catch (error: any) {
      toast.error(error.message || "Failed to register");
    }
  };

  const handleCreateHackathon = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please login to create a hackathon");
      return;
    }

    try {
      const { error } = await supabase.from("hackathons").insert({
        title: formData.title.trim(),
        description: formData.description.trim(),
        start_date: formData.start_date,
        end_date: formData.end_date,
        location: formData.is_virtual
          ? null
          : formData.location.trim() || null,
        is_virtual: formData.is_virtual,
        prize_pool: formData.prize_pool.trim() || null,
        website_url: formData.website_url.trim() || null,
        registration_deadline: formData.registration_deadline || null,
        created_by: user.id,
      });

      if (error) throw error;

      toast.success("Hackathon created successfully!");
      setCreatorToastShown(false);
      handleCreateDialogChange(false);
      fetchHackathons();
    } catch (error: any) {
      toast.error(error.message || "Failed to create hackathon");
    }
  };

  const handleUpdateHackathon = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user || !editingHackathon) {
      toast.error("Unable to update hackathon");
      return;
    }

    if (editingHackathon.created_by && editingHackathon.created_by !== user.id) {
      toast.error("You can only update hackathons you created");
      return;
    }

    try {
      const { error } = await supabase
        .from("hackathons")
        .update({
          title: formData.title.trim(),
          description: formData.description.trim(),
          start_date: formData.start_date,
          end_date: formData.end_date,
          location: formData.is_virtual
            ? null
            : formData.location.trim() || null,
          is_virtual: formData.is_virtual,
          prize_pool: formData.prize_pool.trim() || null,
          website_url: formData.website_url.trim() || null,
          registration_deadline: formData.registration_deadline || null,
        })
        .eq("id", editingHackathon.id);

      if (error) throw error;

      toast.success("Hackathon updated successfully!");
      resetEditState();
      fetchHackathons();
    } catch (error: any) {
      toast.error(error.message || "Failed to update hackathon");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
              Upcoming Hackathons
            </h1>
            <p className="text-muted-foreground">
              Discover and register for exciting hackathon events
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={handleCreateDialogChange}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Hackathon
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Hackathon</DialogTitle>
              </DialogHeader>
              <HackathonForm
                onSubmit={handleCreateHackathon}
                submitLabel="Create Hackathon"
                onCancel={() => handleCreateDialogChange(false)}
              />
            </DialogContent>
          </Dialog>
          <Dialog open={editDialogOpen} onOpenChange={handleEditDialogChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Update Hackathon</DialogTitle>
              </DialogHeader>
              <HackathonForm
                onSubmit={handleUpdateHackathon}
                submitLabel="Update Hackathon"
                onCancel={resetEditState}
              />
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {hackathons.map((hackathon) => (
              <Card key={hackathon.id} className="hover:shadow-glow-cyan transition-all">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl">{hackathon.title}</CardTitle>
                      {user && hackathon.created_by === user.id && (
                        <Badge variant="outline" className="mt-2">
                          Created by you
                        </Badge>
                      )}
                    </div>
                    {hackathon.is_virtual && (
                      <Badge variant="secondary">
                        <Globe className="h-3 w-3 mr-1" />
                        Virtual
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {hackathon.description}
                  </p>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(hackathon.start_date), "MMM dd")} -{" "}
                        {format(new Date(hackathon.end_date), "MMM dd, yyyy")}
                      </span>
                    </div>

                    {hackathon.location && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{hackathon.location}</span>
                      </div>
                    )}

                    {hackathon.prize_pool && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Trophy className="h-4 w-4" />
                        <span>{hackathon.prize_pool}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 flex-wrap">
                    <Button className="flex-1" onClick={() => handleRegister(hackathon.id)}>
                      Register
                    </Button>
                    {hackathon.website_url && (
                      <Button variant="outline" asChild>
                        <a href={hackathon.website_url} target="_blank" rel="noopener noreferrer">
                          Visit Website
                        </a>
                      </Button>
                    )}
                    {user && hackathon.created_by === user.id && (
                      <Button variant="outline" onClick={() => openEditDialog(hackathon)}>
                        Update
                      </Button>
                    )}
                  </div>
                  {hackathon.created_by && (
                    <p className="text-xs text-muted-foreground">
                      Added by {creatorNames[hackathon.created_by] || "Hack-Buddy member"}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && hackathons.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No upcoming hackathons. Check back soon!
          </div>
        )}
      </div>
    </div>
  );
};

export default Hackathons;
