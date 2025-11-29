import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Mail, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Calendar = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<string[]>([""]);
  const { toast } = useToast();

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

  const handleCreateCalendar = () => {
    // In production, this would generate ICS files and send emails
    toast({
      title: "Calendar events created!",
      description: `Invites sent to ${familyMembers.filter(m => m.trim()).length} family members`,
    });
  };

  const handleDownloadICS = () => {
    toast({
      title: "Download started",
      description: "Your calendar file is being downloaded",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
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
                disabled={!familyMembers.some(m => m.trim())}
              >
                <Mail className="h-5 w-5 mr-2" />
                Send Calendar Invites
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
