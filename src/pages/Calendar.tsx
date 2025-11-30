import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Mail, Plus, X, Loader2, CheckCircle2, Calendar as CalendarIcon, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Calendar = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<string[]>([""]);
  const [inviteTripName, setInviteTripName] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSavingTrip, setIsSavingTrip] = useState(false);
  const [showSaveTripDialog, setShowSaveTripDialog] = useState(false);
  const [tripName, setTripName] = useState("");
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const storedEvents = sessionStorage.getItem("likedEvents");
    if (storedEvents) {
      setEvents(JSON.parse(storedEvents));
    }

    // Check if user is logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
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

    // Get current saved trip ID from session if available
    const savedTripId = sessionStorage.getItem("currentTripId");

    // Send emails to each family member
    for (const email of validEmails) {
      try {
        const { data, error } = await supabase.functions.invoke('send-calendar-invite', {
          body: {
            recipientEmail: email,
            tripName: inviteTripName.trim() || undefined,
            tripId: savedTripId || undefined,
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
    try {
      // Generate ICS file content
      const icsContent = generateICS(events);
      
      // Create blob and download
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'famactify-itinerary.ics');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download complete",
        description: "Your calendar file has been downloaded",
      });
    } catch (error) {
      console.error("Failed to download ICS:", error);
      toast({
        title: "Download failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const generateICS = (events: any[]) => {
    const icsEvents = events.map(event => {
      // Parse date and time
      const dateStr = event.date;
      const timeStr = event.time;
      
      // Extract start time (e.g., "10:00 AM" from "10:00 AM - 11:00 AM")
      const startTime = timeStr.split('-')[0]?.trim() || '12:00 PM';
      const endTime = timeStr.split('-')[1]?.trim() || '1:00 PM';
      
      // Create date objects
      const startDateTime = parseDateTimeToICS(dateStr, startTime);
      const endDateTime = parseDateTimeToICS(dateStr, endTime);
      
      // Generate unique ID
      const uid = `${event.id || Math.random().toString(36).substring(7)}@famactify.app`;
      
      return `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${startDateTime}
DTEND:${endDateTime}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
LOCATION:${event.location || ''}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT`;
    }).join('\n');

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//FamActify//Family Activities Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
${icsEvents}
END:VCALENDAR`;
  };

  const parseDateTimeToICS = (dateStr: string, timeStr: string) => {
    try {
      // Parse date (e.g., "11/30/2025" or "2025-11-30")
      const dateParts = dateStr.includes('/') 
        ? dateStr.split('/') 
        : dateStr.split('-');
      
      let year, month, day;
      if (dateStr.includes('/')) {
        // Format: MM/DD/YYYY
        [month, day, year] = dateParts;
      } else {
        // Format: YYYY-MM-DD
        [year, month, day] = dateParts;
      }
      
      // Parse time (e.g., "10:00 AM")
      const timeParts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!timeParts) return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
      let hours = parseInt(timeParts[1]);
      const minutes = parseInt(timeParts[2]);
      const period = timeParts[3].toUpperCase();
      
      // Convert to 24-hour format
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      
      // Create date object
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hours, minutes);
      
      // Return in ICS format (YYYYMMDDTHHMMSSZ)
      return dateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    } catch (error) {
      console.error("Failed to parse date/time:", error);
      return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    }
  };

  const handleSaveTrip = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save your trip",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setTripName(inviteTripName.trim());
    setShowSaveTripDialog(true);
  };

  const confirmSaveTrip = async () => {
    if (!tripName.trim()) {
      toast({
        title: "Trip name required",
        description: "Please enter a name for your trip",
        variant: "destructive",
      });
      return;
    }

    setIsSavingTrip(true);

    try {
      const totalCost = events.reduce((sum, event) => {
        const price = parseFloat(event.price) || 0;
        return sum + price;
      }, 0);

      const { data, error } = await supabase
        .from("saved_trips")
        .insert({
          user_id: user.id,
          name: tripName,
          events: events,
          total_events: events.length,
          total_cost: totalCost,
          recipients: familyMembers.filter(email => email.trim() !== ""),
        })
        .select()
        .single();

      if (error) throw error;

      // Store the trip ID for calendar invites to reference
      if (data) {
        sessionStorage.setItem("currentTripId", data.id);
      }

      toast({
        title: "Trip saved!",
        description: "Your itinerary has been saved successfully",
      });

      setShowSaveTripDialog(false);
      setTripName("");
    } catch (error: any) {
      console.error("Failed to save trip:", error);
      toast({
        title: "Failed to save trip",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSavingTrip(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <AppHeader />
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
              <Label htmlFor="tripName" className="text-lg font-semibold">Trip Name (Optional)</Label>
              <Input
                id="tripName"
                type="text"
                placeholder="e.g., Weekend Family Adventure"
                value={inviteTripName}
                onChange={(e) => setInviteTripName(e.target.value)}
                maxLength={100}
              />
              <p className="text-sm text-muted-foreground">
                This name will appear in the email subject. If left empty, a default subject will be used.
              </p>
            </div>

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

              {user && events.length > 0 && (
                <Button
                  onClick={handleSaveTrip}
                  variant="secondary"
                  className="w-full"
                  size="lg"
                >
                  <Save className="h-5 w-5 mr-2" />
                  Save My Trip
                </Button>
              )}

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
          <Button
            onClick={() => navigate("/onboarding/interests")}
            className="w-full"
            size="lg"
          >
            <CalendarIcon className="h-5 w-5 mr-2" />
            Plan New Itinerary
          </Button>
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

        <Dialog open={showSaveTripDialog} onOpenChange={setShowSaveTripDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Your Trip</DialogTitle>
              <DialogDescription>
                Give your trip a name to save it for later
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tripName">Trip Name</Label>
                <Input
                  id="tripName"
                  placeholder="e.g., Family Weekend in Rīga"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      confirmSaveTrip();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowSaveTripDialog(false)}
                disabled={isSavingTrip}
              >
                Cancel
              </Button>
              <Button onClick={confirmSaveTrip} disabled={isSavingTrip}>
                {isSavingTrip ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Trip
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Calendar;
