import { useNavigate } from "react-router-dom";
import { User, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { useLanguage } from "@/i18n/LanguageContext";
import ProfileSwitcher from "@/components/ProfileSwitcher";

interface AppHeaderProps {
  hidden?: boolean; // scroll-hide support — caller controls visibility
}

const AppHeader = ({ hidden = false }: AppHeaderProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [proposalCount, setProposalCount] = useState(0);

  useEffect(() => {
    const refreshProposals = () => {
      const proposals = JSON.parse(localStorage.getItem('famactify-kid-proposals') || '[]');
      setProposalCount(proposals.filter((p: any) => p.status === 'pending').length);
    };
    refreshProposals();
    window.addEventListener('storage', refreshProposals);
    return () => window.removeEventListener('storage', refreshProposals);
  }, []);

  useEffect(() => {
    // Get current user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/");
      toast({
        title: "Signed out",
        description: "You have been signed out successfully",
      });
    }
  };

  return (
    <header className={cn(
      'sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
      'transition-transform duration-300 ease-in-out',
      hidden ? '-translate-y-full' : 'translate-y-0',
    )}>
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        {/* Brand */}
        <span
          className="text-2xl font-bold text-primary cursor-pointer select-none"
          onClick={() => navigate("/")}
        >
          FamActify
        </span>

        {/* Right side controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Activities */}
          <Button variant="default" onClick={() => navigate('/activities')} size="icon" className="sm:w-auto sm:px-4">
            <Map className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Activities</span>
          </Button>

          {/* Kid proposals — goes straight to plan view */}
          {proposalCount > 0 && (
            <button
              onClick={() => navigate('/activities?view=plan')}
              className="relative flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
              title="Kids' wishlist — open in plan"
            >
              💌
              <span className="hidden sm:inline">Kids wish</span>
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                {proposalCount}
              </span>
            </button>
          )}

          {/* Family profile switcher — Netflix-style */}
          <ProfileSwitcher />

          {/* Merged region + language picker */}
          <LocaleSwitcher />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name || user.email} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.user_metadata?.full_name || "User"}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  {t.header.profileSettings}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/saved-trips")}>
                  {t.header.savedTrips}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  {t.common.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="sm:px-4"
              onClick={() => navigate("/auth")}
            >
              <User className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t.common.signIn}</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
