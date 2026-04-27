import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/30 bg-background">
      <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <Link to="/" className="text-lg font-bold text-primary hover:opacity-80 transition-opacity">
          FamActify
        </Link>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <span>© {currentYear} FamActify</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
