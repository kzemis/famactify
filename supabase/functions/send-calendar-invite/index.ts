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

    // Send email using Resend API directly
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: "FamActify <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: "You're invited! Family Itinerary from FamActify",
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
