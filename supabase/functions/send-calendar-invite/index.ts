import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Note: Resend will be available after deployment
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CalendarEvent {
  title: string;
  date: string;
  time: string;
  location?: string;
  description?: string;
}

interface InviteRequest {
  recipientEmail: string;
  recipientName?: string;
  events: CalendarEvent[];
}

function generateICS(events: CalendarEvent[], recipientEmail: string): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FamActify//Calendar Invite//EN',
    'METHOD:REQUEST',
    'CALSCALE:GREGORIAN',
  ].join('\r\n');

  events.forEach((event, index) => {
    const eventId = `famactify-${Date.now()}-${index}@famactify.com`;
    
    // Parse time range (e.g., "10:00 - 18:00")
    const timeMatch = event.time.match(/(\d{2}):(\d{2})/);
    const startHour = timeMatch ? timeMatch[1] : '10';
    const startMinute = timeMatch ? timeMatch[2] : '00';
    
    // Create start and end times (default 2 hour duration)
    const startTime = `${startHour}${startMinute}00`;
    const endHour = String(parseInt(startHour) + 2).padStart(2, '0');
    const endTime = `${endHour}${startMinute}00`;
    
    // Parse the actual event date from the event object
    let eventDate: Date;
    if (event.date && event.date !== "Any day") {
      // Try to parse the date string
      eventDate = new Date(event.date);
      // If invalid, use tomorrow as fallback
      if (isNaN(eventDate.getTime())) {
        eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + 1);
      }
    } else {
      // Use tomorrow as default if no date specified
      eventDate = new Date();
      eventDate.setDate(eventDate.getDate() + 1);
    }
    const dateStr = eventDate.toISOString().split('T')[0].replace(/-/g, '');
    
    icsContent += '\r\n' + [
      'BEGIN:VEVENT',
      `UID:${eventId}`,
      `DTSTAMP:${timestamp}`,
      `DTSTART:${dateStr}T${startTime}`,
      `DTEND:${dateStr}T${endTime}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description || event.title}`,
      `LOCATION:${event.location || ''}`,
      `ORGANIZER;CN=FamActify:mailto:noreply@famactify.com`,
      `ATTENDEE;CN=${recipientEmail};RSVP=TRUE;PARTSTAT=NEEDS-ACTION:mailto:${recipientEmail}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT',
    ].join('\r\n');
  });

  icsContent += '\r\nEND:VCALENDAR';
  return icsContent;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipientEmail, recipientName, events }: InviteRequest = await req.json();

    console.log(`Sending calendar invite to ${recipientEmail} with ${events.length} events`);

    const eventsHtml = events.map(event => `
      <div style="margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 8px;">
        <h3 style="margin: 0 0 10px 0; color: #333;">${event.title}</h3>
        <p style="margin: 5px 0; color: #666;">
          <strong>Date:</strong> ${event.date}<br/>
          <strong>Time:</strong> ${event.time}
          ${event.location ? `<br/><strong>Location:</strong> ${event.location}` : ''}
        </p>
        ${event.description ? `<p style="margin: 10px 0 0 0; color: #555;">${event.description}</p>` : ''}
      </div>
    `).join('');

    // Generate ICS file
    const icsContent = generateICS(events, recipientEmail);
    // Properly encode UTF-8 string to base64
    const encoder = new TextEncoder();
    const icsBytes = encoder.encode(icsContent);
    const icsBase64 = btoa(String.fromCharCode(...icsBytes));

    // Send email using Resend API directly
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: "FamActify <noreply@notifications.famactify.app>",
        to: [recipientEmail],
        subject: "You're invited! Family Itinerary from FamActify",
        attachments: [
          {
            filename: 'family-itinerary.ics',
            content: icsBase64,
          },
        ],
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">FamActify</h1>
              <p style="color: white; margin: 10px 0 0 0;">Your Family Activity Calendar</p>
            </div>
            
            <div style="padding: 30px; background: white;">
              <h2 style="color: #333; margin-top: 0;">
                ${recipientName ? `Hi ${recipientName}!` : 'Hi there!'}
              </h2>
              
              <p style="color: #555; line-height: 1.6;">
                You've been invited to join a family activity itinerary! Here are the planned events:
              </p>

              ${eventsHtml}

              <div style="margin: 30px 0; padding: 20px; background: #e8f5e9; border-radius: 8px;">
                <p style="margin: 0; color: #2e7d32; font-weight: bold;">
                  💡 Tip: Add these events to your calendar app to get reminders!
                </p>
              </div>

              <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                Looking forward to spending quality time together!
              </p>
            </div>

            <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
              <p style="color: #888; font-size: 12px; margin: 0;">
                This invitation was sent via FamActify - Making family planning easier 😊
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    const emailData = await emailResponse.json();

    console.log("Email sent successfully:", emailData);

    return new Response(JSON.stringify({ 
      success: true,
      message: "Calendar invite sent successfully",
      emailId: emailData.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-calendar-invite function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
