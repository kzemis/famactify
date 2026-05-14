import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useAuthGate } from "@/hooks/use-auth-gate";

export default function AuthGate() {
  const navigate = useNavigate();
  const { pendingRequest, dismiss } = useAuthGate();

  const open = pendingRequest !== null;

  const handleSignIn = () => {
    if (!pendingRequest) return;
    const next = encodeURIComponent(pendingRequest.to);
    dismiss();
    navigate(`/auth?next=${next}`);
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && dismiss()}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <div className="flex justify-center mb-2">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="h-6 w-6 text-primary" />
              </div>
            </div>
            <DrawerTitle className="text-center text-xl">
              Sign in to {pendingRequest?.reason ?? "continue"}
            </DrawerTitle>
            <DrawerDescription className="text-center">
              You can keep browsing FamActify without an account — sign in only when you want to save and personalize.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="pt-2">
            <Button className="w-full min-h-[44px]" onClick={handleSignIn}>
              Sign in
            </Button>
            <Button variant="ghost" className="w-full min-h-[44px]" onClick={dismiss}>
              Maybe later
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
