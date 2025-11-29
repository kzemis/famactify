import { useNavigate } from "react-router-dom";
import { Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";

const AppHeader = () => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        <span 
          className="text-2xl font-bold text-primary cursor-pointer"
          onClick={() => navigate("/")}
        >
          FamActify
        </span>
        
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/pitch-deck")}
            className="hover:text-primary"
            aria-label="View Pitch Deck"
          >
            <Presentation className="h-5 w-5" />
          </Button>
          <Button variant="outline" onClick={() => navigate("/community")}>
            Contribute
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
