import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";

const ConfirmAttendance = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  const tripId = searchParams.get("tripId");
  const email = searchParams.get("email");

  useEffect(() => {
    const confirmAttendance = async () => {
      if (!tripId || !email) {
        setStatus("error");
        setMessage("Invalid confirmation link. Missing trip ID or email.");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("confirm-attendance", {
          body: { tripId, email },
        });

        if (error) throw error;

        if (data?.success) {
          setStatus("success");
          setMessage("Thank you for confirming! The organizer has been notified.");
        } else {
          setStatus("error");
          setMessage(data?.error || "Failed to confirm attendance.");
        }
      } catch (error: any) {
        console.error("Error confirming attendance:", error);
        setStatus("error");
        setMessage(error.message || "An error occurred while confirming your attendance.");
      }
    };

    confirmAttendance();
  }, [tripId, email]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex flex-col">
      <AppHeader />
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="pt-12 pb-8 text-center">
            {status === "loading" && (
              <>
                <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin mb-4" />
                <h2 className="text-2xl font-bold mb-2">Confirming Attendance</h2>
                <p className="text-muted-foreground">Please wait...</p>
              </>
            )}

            {status === "success" && (
              <>
                <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Confirmed!</h2>
                <p className="text-muted-foreground mb-6">{message}</p>
                <Button onClick={() => navigate("/")} className="w-full">
                  Return to Home
                </Button>
              </>
            )}

            {status === "error" && (
              <>
                <XCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
                <h2 className="text-2xl font-bold mb-2">Confirmation Failed</h2>
                <p className="text-muted-foreground mb-6">{message}</p>
                <Button onClick={() => navigate("/")} variant="outline" className="w-full">
                  Return to Home
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default ConfirmAttendance;
