import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertCircle, Bookmark, Calendar, Check, CheckCircle2, ChevronRight,
  Edit3, Lightbulb, List, Mail, MapPin, Monitor, Plus, Search,
  Share2, Sparkles, Star, Users, BadgeCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-family.jpg";
import Footer from "@/components/Footer";
import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

function openProfileSwitcher() {
  window.dispatchEvent(new CustomEvent("famactify:open-profile-switcher"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------------------------------------------------------------------------
// Visual mocks
// ---------------------------------------------------------------------------

const ActivityCardsVisual = () => (
  <div className="grid grid-cols-3 gap-2 select-none">
    {([
      { grad: "from-rose-300 to-pink-400", name: "Children's Fairyland", desc: "Storybook theme park on Lake Merritt", price: "Up to $20", tags: ["outdoor", "park"], ages: "0–2, 3–5, 6–8 yrs", added: false },
      { grad: "from-amber-300 to-orange-400", name: "Monday Evening Storytime", desc: "Family Storytime for ages 2–5 at Central Library", price: "Free", tags: ["indoor", "arts"], ages: "0–2, 3–5, 6–8 yrs", added: true },
      { grad: "from-emerald-400 to-green-500", name: "Chess at Central", desc: "Big screen for online chess or puzzles", price: "Free", tags: ["indoor", "educational"], ages: "6–8, 9–12, 13+ yrs", added: false },
    ] as const).map((c) => (
      <div key={c.name} className="rounded-xl overflow-hidden border bg-white shadow-sm flex flex-col">
        <div className={`h-20 bg-gradient-to-br ${c.grad}`} />
        <div className="p-2 flex flex-col flex-1">
          <div className="text-[10px] font-bold leading-tight mb-1">{c.name}</div>
          <div className="text-[9px] text-muted-foreground mb-1 line-clamp-2">{c.desc}</div>
          <div className="text-[9px] text-muted-foreground mb-1">€ {c.price}</div>
          <div className="flex flex-wrap gap-0.5 mb-1">
            {c.tags.map((t) => <span key={t} className="text-[8px] px-1 py-0.5 rounded-full bg-muted text-muted-foreground">{t}</span>)}
          </div>
          <div className="text-[9px] text-muted-foreground mb-1.5">{c.ages}</div>
          <div className="mt-auto">
            {c.added
              ? <div className="py-1 rounded-lg bg-primary text-primary-foreground text-center text-[9px] font-semibold cursor-default">In plan</div>
              : <div className="py-1 rounded-lg border text-center text-[9px] text-muted-foreground cursor-default">+ Add to plan</div>}
          </div>
        </div>
      </div>
    ))}
  </div>
);

const FiltersVisual = () => (
  <div className="rounded-2xl shadow-xl border bg-background p-5 select-none">
    <div className="text-sm font-bold mb-4">Filters</div>
    {([
      { label: "CATEGORY", pills: ["All", "Sport", "Education", "Culture", "Nature", "Social", "Fun"], active: "All" },
      { label: "AGE GROUP", pills: ["All Ages", "0–2 yrs", "3–5 yrs", "6–8 yrs", "9–12 yrs", "13+ yrs"], active: "All Ages" },
      { label: "BUDGET", pills: ["Any", "Free", "Under $10", "Under $20"], active: "Any" },
      { label: "INVOLVEMENT", pills: ["Any", "Active Together", "Watch from Side", "Drop & Go"], active: "Any" },
      { label: "WHEN", pills: ["Anytime", "Going Now", "Later Today", "Tomorrow", "This Weekend"], active: "Anytime" },
      { label: "HOW LONG?", pills: ["Any length", "Under 1h", "1–2 hours", "2–4 hours", "Full day"], active: "Any length" },
      { label: "ENVIRONMENT", pills: ["Rain suitable", "Indoor only", "Upcoming events only"], active: null },
      { label: "ACCESSIBILITY", pills: ["Wheelchair", "Stroller friendly", "Sensory friendly", "Transit accessible", "Fenced area"], active: null },
    ] as const).map((f) => (
      <div key={f.label} className="mb-3">
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">{f.label}</div>
        <div className="flex flex-wrap gap-1.5">
          {f.pills.map((p) => (
            <div key={p} className={`px-2.5 py-1 rounded-full text-[11px] border cursor-default ${p === f.active ? "bg-primary text-primary-foreground border-primary font-semibold" : "bg-background text-foreground border-border"}`}>
              {p}
            </div>
          ))}
        </div>
      </div>
    ))}
    <div className="pt-2 border-t">
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">NEARBY</div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] cursor-default">
          <MapPin className="w-3 h-3" /> Use my location
        </div>
        <span className="text-[10px] text-muted-foreground">Get location first, then pick a distance</span>
      </div>
    </div>
  </div>
);

const PlanViewVisual = () => (
  <div className="rounded-2xl overflow-hidden shadow-xl border bg-background select-none">
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30 text-xs text-muted-foreground">
      <span className="px-2 py-0.5 rounded-full bg-muted">Grid</span>
      <span className="px-2 py-0.5 rounded-full bg-muted">Map</span>
      <span className="px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground font-semibold flex items-center gap-1">Plan <span className="bg-white/30 rounded-full w-4 h-4 flex items-center justify-center">4</span></span>
    </div>
    <div className="flex" style={{ height: 320 }}>
      <div className="w-[45%] border-r flex flex-col">
        <div className="px-4 pt-3 pb-2 border-b">
          <div className="text-sm font-bold mb-1.5">My Plan</div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>Start <strong className="text-foreground">10:00</strong></span>
            <span>Finish by <strong className="text-foreground">18:00</strong></span>
          </div>
        </div>
        <div className="px-3 py-2 bg-rose-50 border-b border-rose-100">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
              Kids' Wishlist <span className="bg-rose-500 text-white rounded-full w-4 h-4 text-[9px] flex items-center justify-center">2</span>
            </div>
            <span className="text-[9px] text-rose-400 cursor-default">Clear all</span>
          </div>
          {["Tilden Regional Park – Little Farm", "Presidio Tunnel Tops"].map((name) => (
            <div key={name} className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded bg-muted shrink-0" />
              <span className="text-[10px] flex-1 truncate">{name}</span>
              <div className="px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground text-[9px] font-semibold cursor-default">+ Add</div>
            </div>
          ))}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="text-[11px] text-muted-foreground mb-2">Tap + to add kids' picks above</div>
          <div className="px-3 py-1.5 rounded-full border text-[11px] cursor-default">Browse activities</div>
        </div>
      </div>
      <div className="flex-1 relative" style={{ background: "linear-gradient(135deg, #e8f5e9 0%, #e3f2fd 60%, #e8eaf6 100%)" }}>
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(to right,#9ccc6533 1px,transparent 1px),linear-gradient(to bottom,#9ccc6533 1px,transparent 1px)", backgroundSize: "36px 36px" }} />
        <div className="absolute rounded-full bg-blue-200/70" style={{ top: "10%", left: "20%", width: "55%", height: "45%" }} />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 220 320" preserveAspectRatio="none">
          <path d="M 80 260 Q 130 210 100 160 L 150 100 L 180 70" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="7,5" fill="none" opacity="0.8" />
        </svg>
        {([
          { top: "75%", left: "35%", n: "1", label: "Exploratorium" },
          { top: "28%", left: "65%", n: "2", label: "Tilden…" },
          { top: "45%", left: "40%", n: "3", label: "Bay Area…" },
          { top: "18%", left: "78%", n: "4", label: "Berkeley…" },
        ] as const).map((p) => (
          <div key={p.n} className="absolute" style={{ top: p.top, left: p.left, transform: "translate(-50%,-50%)" }}>
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md border border-white">{p.n}</div>
            <div className="mt-0.5 bg-white text-[8px] px-1 py-0.5 rounded shadow whitespace-nowrap">{p.label}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const SavedPlansVisual = () => (
  <div className="rounded-2xl overflow-hidden shadow-xl border bg-background p-4 select-none">
    <div className="flex items-center justify-between mb-4">
      <div>
        <div className="text-base font-bold">Saved Plans</div>
        <div className="text-[11px] text-muted-foreground">Your planned family days</div>
      </div>
      <div className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold flex items-center gap-1 cursor-default">
        <MapPin className="w-3 h-3" /> New plan
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      {([
        { name: "This Sunday", date: "Apr 27 · 2 stops", stops: ["Presidio Tunnel Tops", "Exploratorium"], times: ["10:00–11:30", "11:30–14:00"], colors: ["from-green-400 to-teal-500", "from-slate-400 to-slate-600"] },
        { name: "Next Saturday", date: "May 3 · 3 stops", stops: ["Bay Area Discovery Museum", "Berkeley Adventure Playground", "Tilden Merry-Go-Round"], times: ["10:00–12:00", "12:00–13:30", "13:30–14:30"], colors: ["from-amber-400 to-orange-500", "from-purple-400 to-pink-500"] },
      ] as const).map((trip) => (
        <div key={trip.name} className="rounded-xl overflow-hidden border bg-card">
          <div className="h-14 grid" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
            {trip.colors.map((g, i) => <div key={i} className={`bg-gradient-to-br ${g}`} />)}
          </div>
          <div className="p-2.5">
            <div className="font-bold text-[12px]">{trip.name}</div>
            <div className="text-[10px] text-muted-foreground mb-1.5">{trip.date}</div>
            {trip.stops.map((s, i) => (
              <div key={i} className="flex items-center gap-1 text-[10px] mb-0.5">
                <span className="w-3 h-3 rounded-full bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <span className="truncate flex-1">{s}</span>
                <span className="text-muted-foreground shrink-0 font-mono">{trip.times[i]}</span>
              </div>
            ))}
            <div className="mt-2 py-1 rounded-lg bg-primary text-primary-foreground text-center text-[10px] font-semibold cursor-default">Open in planner</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const EmailCalendarVisual = () => (
  <div className="grid md:grid-cols-2 gap-4 select-none">
    <div className="rounded-2xl overflow-hidden shadow-xl border bg-white">
      <div className="h-14 bg-gradient-to-r from-indigo-400 to-purple-500 flex flex-col items-center justify-center">
        <div className="text-white font-bold text-sm">FamActify</div>
        <div className="text-white/80 text-[10px]">Your Family Activity Calendar</div>
      </div>
      <div className="p-3">
        <div className="text-sm font-bold mb-0.5">Hi there!</div>
        <div className="text-[11px] text-primary font-semibold mb-0.5">Next Saturday</div>
        <div className="text-[10px] text-muted-foreground mb-2">You've been invited to join a family activity plan!</div>
        {["Bay Area Discovery Museum", "Berkeley Adventure Playground", "Tilden Merry-Go-Round"].map((name, i) => (
          <div key={i} className="border rounded-lg p-1.5 mb-1 bg-gray-50">
            <div className="text-[11px] font-semibold">{name}</div>
            <div className="text-[10px] text-muted-foreground">{["10:00–12:00", "12:00–13:30", "13:30–14:30"][i]}</div>
          </div>
        ))}
        <div className="mt-2 p-1.5 rounded-lg bg-green-50 border border-green-100 text-[10px] text-green-700">
          Add these to your calendar app to get reminders!
        </div>
        <div className="mt-2 py-1.5 rounded-xl bg-indigo-500 text-white text-center text-[11px] font-semibold cursor-default">Confirm I'm Going</div>
      </div>
    </div>
    <div className="rounded-2xl overflow-hidden shadow-xl border bg-white p-3">
      <div className="text-[10px] text-muted-foreground mb-1">Tomorrow · 10:00 – 12:00 (GMT-7)</div>
      <div className="text-base font-bold mb-2">Bay Area Discovery Museum</div>
      <div className="flex items-start gap-1.5 mb-3 text-[11px] text-muted-foreground">
        <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
        <span>557 McReynolds Road, Sausalito, CA 94965</span>
      </div>
      <div className="text-[10px] font-semibold text-muted-foreground mb-1">On your Google Calendar</div>
      <div className="flex items-start gap-1.5 mb-4 text-[10px] text-muted-foreground bg-blue-50 rounded-lg p-2">
        <Calendar className="w-3 h-3 shrink-0 mt-0.5" />
        <span>FamActify — Organiser · Invite sent</span>
      </div>
      <div className="flex gap-1.5">
        {["Yes", "No", "Maybe", "Directions"].map((label) => (
          <div key={label} className={`flex-1 py-1.5 rounded-full text-center text-[10px] font-medium cursor-default ${label === "Directions" ? "bg-slate-200 text-slate-600" : "bg-slate-700 text-white"}`}>{label}</div>
        ))}
      </div>
    </div>
  </div>
);

const FamilyProfilesMock = () => (
  <div className="rounded-2xl shadow-xl border bg-background p-4 w-full max-w-xs mx-auto select-none">
    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Who's using FamActify?</div>
    {([
      { name: "Parent", sub: "Parent / Adult", emoji: "👨‍👩‍👧", bg: "bg-primary", active: true },
      { name: "Sofia", sub: "Parent / Adult", emoji: "👩", bg: "bg-rose-400", active: false },
      { name: "Sofia 2", sub: "Kid (6+)", emoji: "🦁", bg: "bg-blue-400", active: false },
      { name: "Tomsy", sub: "Little Explorer", emoji: "🦊", bg: "bg-orange-400", active: false },
    ] as const).map((p) => (
      <div key={p.name} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 ${p.active ? "bg-primary/10" : "bg-muted/30"}`}>
        <div className={`w-9 h-9 rounded-full ${p.bg} flex items-center justify-center text-lg shrink-0`}>{p.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className={`font-semibold text-sm ${p.active ? "text-primary" : ""}`}>{p.name}</div>
          <div className="text-[11px] text-muted-foreground">{p.sub}</div>
        </div>
        {p.active && <Check className="w-4 h-4 text-primary shrink-0" />}
      </div>
    ))}
    <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground cursor-default">
      <Plus className="w-4 h-4" /> Add family member
    </div>
  </div>
);

const LittleExplorerMock = () => (
  <div className="rounded-2xl shadow-xl border bg-amber-50 p-4 h-60 select-none">
    <div className="text-center mb-2">
      <div className="text-[11px] font-bold text-foreground uppercase tracking-wide">Tomsy's Adventure</div>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {([
        { emoji: "🏖️", name: "Beach day" },
        { emoji: "🦁", name: "Zoo trip" },
        { emoji: "🎨", name: "Art class" },
        { emoji: "🛝", name: "Playground" },
      ] as const).map((item) => (
        <div key={item.name} className="p-2.5 rounded-2xl border-2 border-amber-200 bg-white/80 flex flex-col items-center gap-1.5">
          <span className="text-3xl">{item.emoji}</span>
          <span className="text-[11px] font-medium text-center">{item.name}</span>
          <div className="w-7 h-7 rounded-full border-2 border-muted bg-muted/30 flex items-center justify-center text-muted-foreground">
            <Star className="w-3.5 h-3.5" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const Kid6PlusMock = () => (
  <div className="rounded-2xl shadow-xl border bg-background p-4 h-60 select-none">
    <div className="flex items-center justify-between mb-3">
      <div className="text-sm font-bold">Sofia's plan</div>
      <div className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">2 added</div>
    </div>
    <div className="space-y-2 mb-3">
      {([
        { name: "Science Museum", emoji: "🔬", added: true },
        { name: "City Park", emoji: "🌿", added: true },
        { name: "Indoor Climbing", emoji: "🧗", added: false },
      ] as const).map((item) => (
        <div key={item.name} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border ${item.added ? "bg-primary/5 border-primary/20" : "bg-muted/20 border-border"}`}>
          <span>{item.emoji}</span>
          <span className="text-sm flex-1">{item.name}</span>
          {item.added ? <Check className="w-3.5 h-3.5 text-primary" /> : <span className="text-[11px] text-muted-foreground">+</span>}
        </div>
      ))}
    </div>
    <div className="flex justify-center">
      <div className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-md cursor-default">Send to parent</div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Reusable section badge
// ---------------------------------------------------------------------------

const Badge = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
    {icon}
    {label}
  </div>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const MOBILE_SLIDES = 4;

const Landing = () => {
  const navigate = useNavigate();
  const [kidProposalCount, setKidProposalCount] = useState(0);
  const [activeSlide, setActiveSlide] = useState(0);
  const slidesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refresh = () => {
      const proposals = JSON.parse(localStorage.getItem("famactify-kid-proposals") || "[]");
      setKidProposalCount(proposals.filter((p: any) => p.status === "pending").length);
    };
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  const handleSlidesScroll = () => {
    if (!slidesRef.current) return;
    const { scrollLeft, offsetWidth } = slidesRef.current;
    setActiveSlide(Math.round(scrollLeft / offsetWidth));
  };

  const goSlide = (i: number) => {
    if (!slidesRef.current) return;
    slidesRef.current.scrollTo({ left: i * slidesRef.current.offsetWidth, behavior: 'smooth' });
  };

  return (
    <div className="bg-background">

      {/* ═══════════════════════════════════════════════════
          MOBILE — horizontal swipe carousel (full app home)
      ═══════════════════════════════════════════════════ */}
      <div className="md:hidden flex flex-col bg-background" style={{ height: '100dvh' }}>
        {/* Slides */}
        <div
          ref={slidesRef}
          onScroll={handleSlidesScroll}
          className="flex-1 flex overflow-x-auto snap-x snap-mandatory scroll-smooth overflow-y-hidden"
          style={{ scrollbarWidth: 'none' }}
        >
          {/* ── Slide 1: Hero — what is FamActify ── */}
          <div className="snap-center snap-always shrink-0 w-full flex flex-col justify-center px-6 gap-5 overflow-y-auto"
               style={{ paddingTop: 'calc(env(safe-area-inset-top) + 24px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 100px)' }}>
            <div className="text-2xl font-black text-primary tracking-tight">FamActify</div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium w-fit">
              <Sparkles className="w-3 h-3" /> Public Beta · Free to use
            </div>
            <h1 className="text-4xl font-black leading-tight tracking-tight">
              Turn screen time{" "}
              <span className="text-primary">into family time</span>
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              Every parent knows that Friday feeling — no plan, another weekend disappears into screens.
              FamActify helps you plan the perfect family day in minutes.
            </p>
            <img src={heroImage} alt="Family activities" className="rounded-3xl shadow-xl w-full object-cover" style={{ height: 220 }} />
            <p className="text-center text-xs text-muted-foreground pt-2">Swipe to see what's inside →</p>
          </div>

          {/* ── Slide 2: Activities tab — what you can do there ── */}
          <div className="snap-center snap-always shrink-0 w-full flex flex-col justify-center px-6 gap-5 overflow-y-auto"
               style={{ paddingTop: 'calc(env(safe-area-inset-top) + 24px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 100px)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Search className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tab 1</p>
                <h2 className="text-2xl font-black leading-tight">Activities</h2>
              </div>
            </div>
            <p className="text-base text-muted-foreground leading-relaxed">
              1,400+ family-friendly activities near you. Filter by what matters today.
            </p>
            <div className="space-y-3">
              {([
                { Icon: Search, head: "Smart filters", body: "Age, budget, weather, accessibility, timing." },
                { Icon: MapPin, head: "Map view + GPS", body: "See activities near you. Locate me with one tap." },
                { Icon: Sparkles, head: "Mood suggestions", body: "Not sure? Answer 4 questions, get matched." },
              ] as const).map(({ Icon, head, body }) => (
                <div key={head} className="flex gap-3 items-start">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{head}</p>
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5">{body}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center pt-2">Tap <span className="font-semibold text-foreground">Activities</span> below to start →</p>
          </div>

          {/* ── Slide 3: Plan + Trips ── */}
          <div className="snap-center snap-always shrink-0 w-full flex flex-col justify-center px-6 gap-5 overflow-y-auto"
               style={{ paddingTop: 'calc(env(safe-area-inset-top) + 24px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 100px)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Calendar className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tabs 2 & 3</p>
                <h2 className="text-2xl font-black leading-tight">Plan & Trips</h2>
              </div>
            </div>
            <p className="text-base text-muted-foreground leading-relaxed">
              Build the day, share with the family, save it for next time.
            </p>
            <div className="space-y-3">
              {([
                { Icon: Plus, head: "Add to plan", body: "Tap + on any activity to drop it into today's plan." },
                { Icon: Calendar, head: "Timeline & start time", body: "Set start, see the schedule fill in. Reorder with a tap." },
                { Icon: Share2, head: "Share & save", body: "Share with family, save trips to repeat or remix later." },
              ] as const).map(({ Icon, head, body }) => (
                <div key={head} className="flex gap-3 items-start">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{head}</p>
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Slide 4: Mode + Get started ── */}
          <div className="snap-center snap-always shrink-0 w-full flex flex-col justify-center px-6 gap-5 overflow-y-auto"
               style={{ paddingTop: 'calc(env(safe-area-inset-top) + 24px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 100px)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Sparkles className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tab 4</p>
                <h2 className="text-2xl font-black leading-tight">Mode</h2>
              </div>
            </div>
            <p className="text-base text-muted-foreground leading-relaxed">
              Switch between adult, kid, and little-explorer views. Each gets a UI tuned for them — kids' picks flow into your plan automatically.
            </p>
            <ActivityCardsVisual />
            <div className="pt-2 space-y-3">
              <Button size="lg" onClick={() => navigate("/auth")}
                className="w-full rounded-2xl py-5 text-base font-semibold shadow-lg">
                Create account
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                No account needed to browse — just tap any tab below to start.
              </p>
            </div>
          </div>
        </div>

        {/* Dots — sit above the fixed tab bar */}
        <div className="flex justify-center gap-2 py-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 72px)' }}>
          {Array.from({ length: MOBILE_SLIDES }).map((_, i) => (
            <button
              key={i}
              onClick={() => goSlide(i)}
              className={`rounded-full transition-all duration-200 ${
                activeSlide === i ? 'w-6 h-2 bg-primary' : 'w-2 h-2 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          DESKTOP — scroll layout (no top nav, just bottom tabs)
      ═══════════════════════════════════════════════════ */}
      <div className="hidden md:block">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container relative mx-auto px-4 py-8 md:py-16">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-16 items-start">

            {/* Left — copy */}
            <div className="space-y-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                <Sparkles className="w-3.5 h-3.5" /> Public Beta · Free to use
              </div>

              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Turn screen time{" "}
                <span className="text-primary">into family time</span>
              </h1>

              <p className="text-xl font-semibold text-foreground max-w-xl">
                Busy parents: plan family activities that match everyone's interests.
              </p>

              <p className="text-base text-muted-foreground max-w-xl leading-relaxed">
                Every parent knows that Friday feeling — no plan, and another weekend disappears
                into screens. FamActify gives you a ready activity plan matched to your kids' ages,
                lets them browse and pick what excites them, and makes the weekend actually happen.
              </p>

              {/* Buttons always in one row */}
              <div className="flex flex-row gap-3">
                <Button
                  size="lg"
                  onClick={() => navigate("/activities")}
                  className="text-base px-6 py-5 rounded-2xl shadow-lg hover:shadow-xl transition-all flex-1 sm:flex-none"
                >
                  <Search className="w-4 h-4 mr-2" /> Browse
                </Button>
                <div className="relative flex-1 sm:flex-none">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => scrollTo("kid-mode-section")}
                    className="text-base px-6 py-5 rounded-2xl w-full"
                  >
                    <Users className="w-4 h-4 mr-2" /> Kid mode
                  </Button>
                  {kidProposalCount > 0 && (
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                      {kidProposalCount}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right — always visible (stacks below on mobile) */}
            <div className="flex flex-col gap-4">
              <img
                src={heroImage}
                alt="Happy family enjoying activities together"
                className="rounded-3xl shadow-2xl w-full object-cover"
                style={{ height: 240 }}
              />
              <ActivityCardsVisual />
            </div>
          </div>
        </div>
      </section>

      {/* ── Story strip ── */}
      <section className="py-10 border-y bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            {([
              { Icon: Monitor, iconCls: "text-slate-500 bg-slate-100", head: "Another unplanned weekend", body: "Friday arrives with no plan. Kids end up on screens. Parents feel the guilt." },
              { Icon: Sparkles, iconCls: "text-primary bg-primary/10", head: "FamActify to the rescue", body: "Discover activities near you, let kids pick their favourites, build a plan in minutes." },
              { Icon: CheckCircle2, iconCls: "text-green-600 bg-green-50", head: "Saturday sorted", body: "Screens off, family out. Kids chose it — so they're actually excited to go." },
            ] as const).map((s) => (
              <div key={s.head} className="space-y-3">
                <div className={`w-12 h-12 rounded-2xl ${s.iconCls} flex items-center justify-center mx-auto`}>
                  <s.Icon className="w-6 h-6" />
                </div>
                <div className="font-semibold text-sm">{s.head}</div>
                <div className="text-sm text-muted-foreground leading-relaxed">{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Discover ── bg-background */}
      <section className="py-14 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div className="space-y-5 lg:sticky lg:top-20">
              <Badge icon={<Search className="w-3.5 h-3.5" />} label="Discover" />
              <h2 className="text-3xl font-bold leading-snug">Find the right activity for your family — instantly</h2>
              <p className="text-muted-foreground leading-relaxed">
                Filter by age, budget, category, duration, weather-proofing,
                wheelchair access, stroller-friendliness and more.
                Over 1,400 community-added activities and counting.
              </p>
              <ul className="space-y-2 text-sm">
                {["Age groups from 0–2 yrs to 13+ yrs", "Budget filters from Free to Under $20", "Weather, accessibility & timing filters", "Nearby radius using your location"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <Button variant="outline" onClick={() => navigate("/activities")} className="gap-1">
                Browse activities <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <FiltersVisual />
          </div>
        </div>
      </section>

      {/* ── Plan ── bg-muted/30 */}
      <section className="py-14 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-5xl space-y-8">
          <div className="space-y-4 max-w-xl">
            <Badge icon={<Calendar className="w-3.5 h-3.5" />} label="Plan" />
            <h2 className="text-3xl font-bold leading-snug">Build your day plan — see the route on a map</h2>
            <p className="text-muted-foreground leading-relaxed">
              Add activities, set a start time and watch the timeline fill in.
              Kids' wishlist picks sit at the top — add them with one tap.
              The route map updates live.
            </p>
            <Button variant="outline" onClick={() => navigate("/activities")} className="gap-1">
              Start planning <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <PlanViewVisual />
        </div>
      </section>

      {/* ── Saved plans ── bg-background */}
      <section className="py-14 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="order-2 lg:order-1">
              <SavedPlansVisual />
            </div>
            <div className="order-1 lg:order-2 space-y-5">
              <Badge icon={<Bookmark className="w-3.5 h-3.5" />} label="Saved plans" />
              <h2 className="text-3xl font-bold leading-snug">Save a plan, open it again anytime</h2>
              <p className="text-muted-foreground leading-relaxed">
                Every plan is stored in your library. Pick it back up, edit it,
                or re-open it in the planner — great for recurring weekend favourites.
              </p>
              <ul className="space-y-2 text-sm">
                {["All plans in one place", "Re-open any plan in the planner with one tap", "Share a saved plan with anyone"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <Button variant="outline" onClick={() => navigate("/saved-trips")} className="gap-1">
                View saved plans <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Share ── bg-muted/30 */}
      <section className="py-14 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-5xl space-y-10">
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div className="space-y-5">
              <Badge icon={<Share2 className="w-3.5 h-3.5" />} label="Share" />
              <h2 className="text-3xl font-bold leading-snug">Share the plan — it lands in their inbox and calendar</h2>
              <p className="text-muted-foreground leading-relaxed">
                One tap to WhatsApp or Telegram. Or email a formatted plan — it arrives with
                times, locations and a button that adds each activity straight to Google Calendar.
              </p>
              <ul className="space-y-2 text-sm">
                {["WhatsApp, Telegram, or a shareable link", "Nicely formatted email with all details", "Lands in Google / Apple Calendar automatically"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-xl border bg-background p-4 select-none">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-bold">Share plan</div>
                  <div className="text-xs text-muted-foreground">Saturday family day</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-green-50 border border-green-100">
                  <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">W</div>
                  <span className="text-[10px] text-green-700 font-medium">WhatsApp</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-sky-50 border border-sky-100">
                  <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center text-white text-xs font-bold">T</div>
                  <span className="text-[10px] text-sky-600 font-medium">Telegram</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-muted border">
                  <div className="w-7 h-7 flex items-center justify-center text-muted-foreground"><Share2 className="w-4 h-4" /></div>
                  <span className="text-[10px] text-muted-foreground font-medium">Copy link</span>
                </div>
              </div>
              <div className="border-t pt-3">
                <div className="text-xs font-semibold mb-2 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Send by email
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 h-8 rounded-md border bg-background text-[11px] px-2 flex items-center text-muted-foreground">grandma@example.com</div>
                  <div className="px-3 h-8 rounded-md bg-primary text-primary-foreground text-xs flex items-center font-medium cursor-default">Send</div>
                </div>
              </div>
            </div>
          </div>
          <EmailCalendarVisual />
        </div>
      </section>

      {/* ── Contribute ── bg-background */}
      <section className="py-14 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-5">
              <Badge icon={<Edit3 className="w-3.5 h-3.5" />} label="Contribute" />
              <h2 className="text-3xl font-bold leading-snug">Know a great spot? Add it for everyone</h2>
              <p className="text-muted-foreground leading-relaxed">
                FamActify grows through families sharing what they know.
                Add a park, museum, class or event — help other families discover it.
              </p>
              <ul className="space-y-2 text-sm">
                {["Simple form — takes about 2 minutes", "Pin it on the map for accurate directions", "Your contribution is credited to you"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <Button variant="outline" onClick={() => navigate("/contribute")} className="gap-1">
                <Edit3 className="w-4 h-4" /> Add an activity <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-xl border bg-background p-5 flex flex-col select-none" style={{ height: 260 }}>
              <div className="text-sm font-bold mb-4">Add a new activity</div>
              <div className="space-y-3 flex-1">
                {[
                  { label: "Name", val: "Riverside Adventure Playground" },
                  { label: "Category", val: "Outdoors · Ages 3–12" },
                  { label: "Address", val: "Oak St, near the river bridge" },
                ].map((f) => (
                  <div key={f.label}>
                    <div className="text-[10px] text-muted-foreground mb-1">{f.label}</div>
                    <div className="h-8 rounded-md border bg-muted/30 px-2.5 flex items-center text-sm">{f.val}</div>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t flex justify-end">
                <div className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium cursor-default">Submit</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Kid mode ── bg-muted/30 */}
      <section id="kid-mode-section" className="py-14 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-14">
            <Badge icon={<Users className="w-3.5 h-3.5" />} label="Kid mode" />
            <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-3">The whole family can use FamActify</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Create a profile for each family member. Kids get their own view tailored to their age —
              no accounts, no sign-ups.
            </p>
          </div>

          {/* Step 1 */}
          <div className="grid lg:grid-cols-2 gap-10 items-center mb-20">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">1</div>
                <h3 className="text-xl font-bold">Add your kids as family members</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed pl-11">
                Open the profile menu in the top bar. Add a profile for each child —
                name, emoji and age group. Takes 30 seconds.
              </p>
              <ul className="pl-11 space-y-1.5 text-sm">
                {["Parent / Adult — full access", "Kid (6+) — browse, plan & send to parent", "Little Explorer (under 6) — big colourful cards"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <div className="pl-11">
                <Button variant="outline" onClick={openProfileSwitcher} className="gap-1">
                  <Plus className="w-4 h-4" /> Add a family member
                </Button>
              </div>
            </div>
            <FamilyProfilesMock />
          </div>

          {/* Step 2 */}
          <div className="mb-20">
            <div className="flex items-center gap-3 mb-8 justify-center">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">2</div>
              <h3 className="text-xl font-bold">Switch to a kid profile — hand them the device</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-sm">Little Explorer · under 6</div>
                    <div className="text-xs text-muted-foreground">Big cards, tap to wish for it</div>
                  </div>
                </div>
                <LittleExplorerMock />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <div className="font-semibold text-sm">Kid (6+) · full planner</div>
                    <div className="text-xs text-muted-foreground">Browse, build a plan, send to parent</div>
                  </div>
                </div>
                <Kid6PlusMock />
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="order-2 lg:order-1">
              <div className="rounded-2xl shadow-xl border bg-background p-5 max-w-sm mx-auto select-none">
                <div className="text-sm font-bold mb-4 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" /> New plan from Sofia!
                </div>
                <div className="space-y-2 mb-4">
                  {["Science Museum", "City Park"].map((item) => (
                    <div key={item} className="flex items-center gap-2.5 px-3 py-2 rounded-xl border bg-primary/5 border-primary/20">
                      <span className="text-sm flex-1">{item}</span>
                      <Check className="w-3.5 h-3.5 text-primary" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="px-3 py-2 rounded-xl border text-center text-sm text-muted-foreground cursor-default">Edit plan</div>
                  <div className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-center text-sm font-medium cursor-default">Accept</div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">3</div>
                <h3 className="text-xl font-bold">Kid sends the plan — you review it</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed pl-11">
                When they're happy, they tap "Send to parent." You get a link —
                open it, see their picks, and load it into your planner in one tap.
              </p>
              <ul className="pl-11 space-y-1.5 text-sm">
                {["No app needed to view the link", "Edit, add or remove activities before accepting", "Share the final plan with the whole family"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Roadmap ── bg-background */}
      <section className="py-12 bg-background border-t">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-8">
            <Badge icon={<Sparkles className="w-3.5 h-3.5" />} label="Roadmap" />
            <h2 className="text-2xl font-bold mt-4">What's coming next</h2>
            <p className="text-muted-foreground text-sm mt-1">We're building fast.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {([
              { Icon: Mail, title: "Weekly Saturday plan", desc: "Subscribe and get a curated family plan every Friday." },
              { Icon: Lightbulb, title: "Smart mood suggestions", desc: "Answer 3 quick questions, get a matched activity suggestion." },
              { Icon: List, title: "Curated lists", desc: "Best rainy day ideas, free outdoor spots and more." },
              { Icon: BadgeCheck, title: "Venue approval badge", desc: "Verified venues get a badge so you know the info is current." },
            ] as const).map((item, i) => (
              <Card key={i} className="p-4 flex flex-col gap-2.5 border-dashed opacity-75 hover:opacity-100 transition-opacity">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <item.Icon className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-sm">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                <div className="mt-auto pt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Coming soon</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-14 bg-primary/5 border-t">
        <div className="container mx-auto px-4 text-center max-w-lg">
          <h2 className="text-2xl font-bold mb-3">Plan your family's next great day</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            Free to use. No account needed to browse. Use tech to get off screens.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={() => navigate("/activities")} className="rounded-2xl px-8">
              <Search className="w-4 h-4 mr-2" /> Browse activities
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/contribute")} className="rounded-2xl px-8">
              <Edit3 className="w-4 h-4 mr-2" /> Add an activity
            </Button>
          </div>
        </div>
      </section>

      {/* ── Disclaimer ── */}
      <section className="pb-8">
        <div className="container mx-auto px-4">
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border bg-muted/50 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground/70" />
            <p>
              <strong className="text-foreground">Note:</strong>{" "}
              Activity information is contributed by community members. FamActify does not guarantee accuracy or timeliness.
              Always verify details directly with the venue before visiting.
            </p>
          </div>
        </div>
      </section>

      <Footer />
      </div>{/* end desktop md:block */}
    </div>
  );
};

export default Landing;
