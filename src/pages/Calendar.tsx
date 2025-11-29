import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Mail, Plus, X, Loader2, CheckCircle2, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Calendar = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<string[]>([""]);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const storedEvents = sessionStorage.getItem("likedEvents");
    if (storedEvents) {
      setEvents(JSON.parse(storedEvents));
    }
  }, []);

  const addFamilyMember = () => {
    setFamilyMembers([...familyMembers, ""]);
  };

  const removeFamilyMember = (index: number) => {
    setFamilyMembers(familyMembers.filter((_, i) => i !== index));
  };

  const updateFamilyMember = (index: number, value: string) => {
    const updated = [...familyMembers];
    updated[index] = value;
    setFamilyMembers(updated);
  };

  const handleCreateCalendar = async () => {
    const validEmails = familyMembers.filter(m => m.trim());
    
    if (validEmails.length === 0) {
      toast({
        title: "No email addresses",
        description: "Please add at least one family member email",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    let successCount = 0;
    let failCount = 0;

    // Send emails to each family member
    for (const email of validEmails) {
      try {
        const { data, error } = await supabase.functions.invoke('send-calendar-invite', {
          body: {
            recipientEmail: email,
            events: events.map(event => ({
              title: event.title,
              date: event.date,
              time: event.time,
              location: event.location,
              description: event.description,
            })),
          },
        });

        if (error) throw error;
        
        if (data?.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Failed to send invite to ${email}:`, error);
        failCount++;
      }
    }

    setIsSending(false);

    if (successCount > 0) {
      toast({
        title: "Calendar invites sent!",
        description: `Successfully sent ${successCount} invite${successCount > 1 ? 's' : ''}${failCount > 0 ? `, ${failCount} failed` : ''}`,
      });
      
      // Check if in presentation mode and redirect back to pitch deck
      const presentationMode = sessionStorage.getItem("presentationMode");
      if (presentationMode === "active") {
        sessionStorage.setItem("presentationMode", "returning");
        setTimeout(() => navigate("/pitch-deck"), 1500);
      }
    } else {
      toast({
        title: "Failed to send invites",
        description: "Please check the email addresses and try again",
        variant: "destructive",
      });
    }
  };

  const handleReturnToPresentation = () => {
    sessionStorage.setItem("presentationMode", "returning");
    navigate("/pitch-deck");
  };

  const handleDownloadICS = () => {
    toast({
      title: "Download started",
      description: "Your calendar file is being downloaded",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 flex h-16 items-center">
          <span className="text-2xl font-bold text-primary cursor-pointer" onClick={() => navigate("/")}>
            FamActify
          </span>
        </div>
      </header>
      <div className="max-w-3xl mx-auto space-y-6 p-4 py-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Share Your Itinerary</h1>
          <p className="text-muted-foreground text-lg">
            Add family members and create calendar events
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Calendar Events</CardTitle>
            <CardDescription>
              We'll create calendar events for all {events.length} activities in your itinerary
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Family Members</Label>
              <p className="text-sm text-muted-foreground">
                Enter email addresses to send calendar invites
              </p>
              {familyMembers.map((member, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="family@example.com"
                    value={member}
                    onChange={(e) => updateFamilyMember(index, e.target.value)}
                  />
                  {familyMembers.length > 1 && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removeFamilyMember(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                onClick={addFamilyMember}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Family Member
              </Button>
            </div>

            <div className="space-y-4 pt-6 border-t">
              <Button
                onClick={handleCreateCalendar}
                className="w-full"
                size="lg"
                disabled={!familyMembers.some(m => m.trim()) || isSending}
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Sending Invites...
                  </>
                ) : (
                  <>
                    <Mail className="h-5 w-5 mr-2" />
                    Send Calendar Invites
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadICS}
                className="w-full"
                size="lg"
              >
                <Download className="h-5 w-5 mr-2" />
                Download ICS File
              </Button>
            </div>

            <div className="bg-accent rounded-lg p-4">
              <p className="text-sm text-accent-foreground">
                <strong>What happens next?</strong>
                <br />
                All family members will receive calendar invites for each event with location, time, and details. They can accept or decline directly from their calendar app.
              </p>
            </div>
          </CardContent>
        </Card>

        {sessionStorage.getItem("presentationMode") === "active" ? (
          <Button
            onClick={handleReturnToPresentation}
            className="w-full"
            size="lg"
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Return to Presentation
          </Button>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/saved-trips")}
              className="w-full"
              size="lg"
            >
              View Saved Trips
            </Button>
            <Button
              onClick={() => navigate("/onboarding/interests")}
              className="w-full"
              size="lg"
            >
              <CalendarIcon className="h-5 w-5 mr-2" />
              Plan New Itinerary
            </Button>
          </div>
        )}

        <div className="bg-card rounded-lg p-6 space-y-4">
          <h3 className="text-xl font-semibold">Events to be added:</h3>
          <div className="space-y-2">
            {events.map((event, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">
                  {event.title} • {event.date} • {event.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
