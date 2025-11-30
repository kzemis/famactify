import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar, MapPin, Clock, Trash2, Plus, Loader2, Mail, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location?: string;
  description?: string;
  price?: string;
  image?: string;
}

interface EditTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  tripName: string;
  events: Event[];
  onSave: (tripId: string, updatedName: string, updatedEvents: Event[]) => Promise<void>;
}

export const EditTripDialog = ({
  open,
  onOpenChange,
  tripId,
  tripName,
  events,
  onSave,
}: EditTripDialogProps) => {
  const [editedName, setEditedName] = useState(tripName);
  const [editedEvents, setEditedEvents] = useState<Event[]>(events);
  const [newActivity, setNewActivity] = useState({ name: "", timeFrom: "", timeTo: "" });
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<string[]>([""]);
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const { toast } = useToast();

  const deleteEvent = (index: number) => {
    const updated = editedEvents.filter((_, idx) => idx !== index);
    setEditedEvents(updated);
    toast({
      title: "Activity removed",
      description: "The activity has been removed from this trip",
    });
  };

  const updateEventTime = (index: number, newTime: string) => {
    const updated = [...editedEvents];
    updated[index] = { ...updated[index], time: newTime };
    setEditedEvents(updated);
  };

  const addCustomActivity = () => {
    if (!newActivity.name.trim()) {
      toast({
        title: "Activity name required",
        description: "Please enter an activity name",
        variant: "destructive",
      });
      return;
    }

    if (!newActivity.timeFrom || !newActivity.timeTo) {
      toast({
        title: "Time required",
        description: "Please enter start and end times",
        variant: "destructive",
      });
      return;
    }

    const customEvent: Event = {
      id: `custom-${Date.now()}`,
      title: newActivity.name,
      date: editedEvents[0]?.date || new Date().toISOString().split('T')[0],
      time: `${newActivity.timeFrom} - ${newActivity.timeTo}`,
      location: "Custom Location",
      description: "Custom activity added by user",
      price: "€0",
    };

    setEditedEvents([...editedEvents, customEvent]);
    setNewActivity({ name: "", timeFrom: "", timeTo: "" });
    setIsAddingActivity(false);
    toast({
      title: "Activity added",
      description: "Custom activity has been added to your trip",
    });
  };

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

  const handleSendInvites = async () => {
    const validEmails = familyMembers.filter(m => m.trim());
    
    if (validEmails.length === 0) {
      toast({
        title: "No email addresses",
        description: "Please add at least one family member email",
        variant: "destructive",
      });
      return;
    }

    setIsSendingInvites(true);
    let successCount = 0;
    let failCount = 0;

    for (const email of validEmails) {
      try {
        const { data, error } = await supabase.functions.invoke('send-calendar-invite', {
          body: {
            recipientEmail: email,
            tripName: editedName.trim() || undefined,
            tripId: tripId,
            events: editedEvents.map(event => ({
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

    setIsSendingInvites(false);

    if (successCount > 0) {
      toast({
        title: "Calendar invites sent!",
        description: `Successfully sent ${successCount} invite${successCount > 1 ? 's' : ''}${failCount > 0 ? `, ${failCount} failed` : ''}`,
      });
    } else {
      toast({
        title: "Failed to send invites",
        description: "Please check the email addresses and try again",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!editedName.trim()) {
      toast({
        title: "Trip name required",
        description: "Please enter a trip name",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(tripId, editedName, editedEvents);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save trip:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Trip & Send Invites</DialogTitle>
          <DialogDescription>
            Modify your trip details and invite family members
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="tripName">Trip Name</Label>
            <Input
              id="tripName"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              placeholder="Enter trip name"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Activities ({editedEvents.length})</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingActivity(!isAddingActivity)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Activity
              </Button>
            </div>

            {isAddingActivity && (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Activity Name</Label>
                    <Input
                      placeholder="e.g., Lunch at Restaurant"
                      value={newActivity.name}
                      onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={newActivity.timeFrom}
                        onChange={(e) => setNewActivity({ ...newActivity, timeFrom: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={newActivity.timeTo}
                        onChange={(e) => setNewActivity({ ...newActivity, timeTo: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={addCustomActivity} className="flex-1">
                      Add Activity
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddingActivity(false);
                        setNewActivity({ name: "", timeFrom: "", timeTo: "" });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              {editedEvents.map((event, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <img
                        src={event.image || "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=300"}
                        alt={event.title}
                        className="w-20 h-20 rounded-lg object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=300";
                        }}
                      />
                      <div className="flex-1 space-y-2">
                        <h4 className="font-semibold">{event.title}</h4>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          {event.date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{event.date}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <Input
                              type="text"
                              value={event.time}
                              onChange={(e) => updateEventTime(index, e.target.value)}
                              className="h-6 w-32 text-xs"
                              placeholder="HH:MM - HH:MM"
                            />
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="text-xs">{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteEvent(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {editedEvents.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No activities in this trip. Add some activities to get started!
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <Separator className="my-6" />

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Send Calendar Invites</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Share this trip with family members via email
              </p>
            </div>

            <div className="space-y-4">
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

            <Button
              onClick={handleSendInvites}
              className="w-full"
              disabled={!familyMembers.some(m => m.trim()) || isSendingInvites}
            >
              {isSendingInvites ? (
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
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
