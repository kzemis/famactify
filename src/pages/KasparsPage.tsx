import { ExternalLink, Instagram, Linkedin, Globe, MapPin, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Small reusable pieces ─────────────────────────────────────────────────────

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold', className)}>
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">{children}</p>
  );
}

function LinkCard({ href, emoji, title, subtitle }: { href: string; emoji: string; title: string; subtitle: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3 p-4 rounded-2xl border bg-card tap-highlight active:scale-[0.98] transition-transform group">
      <span className="text-2xl shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
      </div>
      <ArrowUpRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
    </a>
  );
}

function TimelineItem({ year, label, sub }: { year: string; label: string; sub?: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
        <div className="w-px flex-1 bg-border mt-1" />
      </div>
      <div className="pb-5">
        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{year}</span>
        <p className="text-sm font-semibold leading-tight mt-0.5">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function KasparsPage() {
  return (
    <div className="min-h-[100dvh] bg-background" style={{ paddingTop: 'env(safe-area-inset-top)' }}>

      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/8 via-background to-accent/30 px-6 pt-12 pb-10">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary/5 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-accent/40 translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        {/* Avatar */}
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary to-pink-400 flex items-center justify-center mb-5 shadow-lg">
          <span className="text-3xl">🧑‍💻</span>
        </div>

        <h1 className="text-3xl font-black tracking-tight leading-tight">
          Kaspars<br />Zemitis
        </h1>
        <p className="text-base text-muted-foreground mt-2 leading-relaxed max-w-xs">
          A farm kid from Latvia who ended up building software, teaching dance, and chasing ideas around the world.
        </p>

        {/* Identity chips */}
        <div className="flex flex-wrap gap-2 mt-5">
          <Chip className="bg-primary/10 text-primary">🇱🇻 Latvian</Chip>
          <Chip className="bg-pink-100 text-pink-700">🕺 Dancer</Chip>
          <Chip className="bg-blue-100 text-blue-700">💻 Builder</Chip>
          <Chip className="bg-emerald-100 text-emerald-700">🌍 Community</Chip>
          <Chip className="bg-orange-100 text-orange-700">📍 Bay Area</Chip>
        </div>
      </div>

      <div className="px-5 py-8 space-y-12 max-w-lg mx-auto pb-16">

        {/* ── The story ── */}
        <section>
          <SectionLabel>The story</SectionLabel>
          <div>
            <TimelineItem year="Childhood" label="Grew up on a farm in Latvia" sub="Learned early: things break, you fix them. Animals don't care about your deadlines." />
            <TimelineItem year="2012" label="First dance class" sub="Brazilian Zouk. Hated it for 3 months. Then couldn't stop." />
            <TimelineItem year="2016–24" label="Became a software engineer & data platform lead" sub="Built data pipelines, teams, and products. Eventually became Head of Product at Twigex." />
            <TimelineItem year="2023" label="Started FamActify" sub="Mini-MBA at Stockholm School of Economics. The idea: help families actually do things together, not just scroll." />
            <TimelineItem year="2024" label="Became a dance instructor" sub="Organized masterclasses. Discovered that teaching is its own art form." />
            <TimelineItem year="2025" label="Board member, NGO in Latvia" sub='"With World Experience in Latvia" — helping people who come home after years abroad feel less alone.' />
            <TimelineItem year="Apr 2026" label="Berkeley Executive Education" sub="One week on-site at Haas. Product Management program. Left wanting to stay." />
            <TimelineItem year="Now" label="Extending the Bay Area chapter" sub="Building, dancing, exploring. Looking for housing 1–5 months." />
          </div>
        </section>

        {/* ── What I build ── */}
        <section>
          <SectionLabel>What I build</SectionLabel>
          <div className="space-y-3">
            <div className="rounded-2xl border bg-card p-5">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl">🏗️</span>
                <div>
                  <h3 className="font-bold">Cospace / Twigex</h3>
                  <p className="text-xs text-muted-foreground">Head of Product · Full-time</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A self-hosted platform for critical infrastructure organizations — file drive, team chat, collaboration, and a full data analytics stack. One platform instead of Microsoft 365 + Slack + Databricks. Deployed on the customer's own infrastructure, fully air-gapped.
              </p>
              <a href="https://www.linkedin.com/pulse/llm-ization-from-individual-prompting-organizational-thinking-qfngf/" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-3 text-xs text-primary font-semibold">
                My thinking on AI & orgs <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>

            <div className="rounded-2xl border bg-card p-5">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl">👨‍👩‍👧‍👦</span>
                <div>
                  <h3 className="font-bold">FamActify</h3>
                  <p className="text-xs text-muted-foreground">Founder · Side project</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                An app to help families with kids discover and plan activities that actually matter. Started at SSE Riga, shaped at Berkeley. The thesis: phones are stealing family time — let's use them to reclaim it instead.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <a href="https://famactify.app/" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary font-semibold">
                  famactify.app <ArrowUpRight className="w-3 h-3" />
                </a>
                <span className="text-muted-foreground text-xs">·</span>
                <a href="https://www.linkedin.com/posts/kasparszemitis_a-kid-from-a-farm-in-latvia30-years-ago-activity-7454418966720028673-GgnG" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary font-semibold">
                  Berkeley post <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── On the dance floor ── */}
        <section>
          <SectionLabel>On the dance floor</SectionLabel>
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-sm leading-relaxed mb-4">
              8 years of Brazilian Zouk. Started because a friend dragged me. Stayed because connection through movement turned out to be one of the most honest things I know how to do.
            </p>
            <p className="text-sm leading-relaxed mb-4">
              I teach now. Specialties: <span className="font-semibold">counterbalances and spins</span>. I especially love working with beginners — watching someone go from "I have no rhythm" to actually feeling the music is something I never get tired of.
            </p>
            <div className="space-y-2">
              <a href="https://www.instagram.com/reel/DJo5mjNs5dj/" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary font-semibold tap-highlight">
                <Instagram className="w-4 h-4" /> Counterbalances & spins reel
              </a>
              <a href="https://www.instagram.com/p/DDT6MdwCzdq/" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary font-semibold tap-highlight">
                <Instagram className="w-4 h-4" /> Dance & life
              </a>
              <a href="https://www.linkedin.com/pulse/my-soft-skills-development-journey-kaspars-zemitis-60wwf/" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary font-semibold tap-highlight">
                <Linkedin className="w-4 h-4" /> What teaching dance taught me about people
              </a>
            </div>
          </div>
        </section>

        {/* ── Community ── */}
        <section>
          <SectionLabel>Community work</SectionLabel>
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">🌍</span>
              <div>
                <h3 className="font-bold">"With World Experience in Latvia"</h3>
                <p className="text-xs text-muted-foreground">Board member · NGO</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              We help Latvians who've lived abroad come home without feeling lost. New country — even if it's your own — is hard. We know that feeling. So we build community, organize events, and when needed, talk to government.
            </p>
            <a href="https://www.linkedin.com/posts/ar-pasaules-pieredzi-latvija_m%C5%ABsu-jaunais-valdes-loceklis-kaspars-zemitis-ugcPost-7315335393388781568-3BnL" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary font-semibold">
              That time we ended up in the Prime Minister's cabinet <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </section>

        {/* ── The whole person ── */}
        <section>
          <SectionLabel>The whole person</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            {[
              { emoji: '🚜', title: 'Farm kid', sub: 'Still knows how to fix things' },
              { emoji: '🏊', title: 'Ex-triathlete', sub: 'The discipline stayed' },
              { emoji: '🎓', title: 'Ex-lecturer', sub: 'Loved the teaching part' },
              { emoji: '👶', title: 'Proud uncle', sub: 'Best role I have' },
              { emoji: '🐄', title: 'Animal person', sub: 'Grew up with them' },
              { emoji: '🌙', title: 'Early to bed', sub: 'Not the loud-music type' },
            ].map(({ emoji, title, sub }) => (
              <div key={title} className="rounded-2xl border bg-card p-4 flex flex-col gap-1">
                <span className="text-2xl">{emoji}</span>
                <p className="text-sm font-semibold leading-tight">{title}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
            ))}
          </div>
          <a href="https://www.instagram.com/reel/DHAYZCriJbO/" target="_blank" rel="noopener noreferrer"
            className="mt-3 flex items-center gap-2 text-sm text-primary font-semibold tap-highlight">
            <Instagram className="w-4 h-4" /> Uncle life in action
          </a>
        </section>

        {/* ── Currently in the Bay ── */}
        <section>
          <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/40 border border-primary/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-primary">Currently in the Bay Area</span>
            </div>
            <p className="text-sm leading-relaxed mb-4">
              After a week at Berkeley Executive Education I decided to extend my stay — 1 to 5 months. Looking for a room or short-term housing. Happy to talk.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Also: my one-bedroom apartment in Riga ("Duntes Zīles", Sky & More building) is available for exchange or rental while I'm here.
            </p>
          </div>
        </section>

        {/* ── Links ── */}
        <section>
          <SectionLabel>Find me</SectionLabel>
          <div className="space-y-2">
            <LinkCard href="https://www.linkedin.com/in/kasparszemitis/" emoji="💼" title="LinkedIn" subtitle="linkedin.com/in/kasparszemitis" />
            <LinkCard href="https://famactify.app/" emoji="👨‍👩‍👧‍👦" title="FamActify" subtitle="famactify.app" />
            <LinkCard href="https://www.instagram.com/reel/DJo5mjNs5dj/" emoji="🕺" title="Dance reel" subtitle="instagram.com" />
            <LinkCard href="https://www.linkedin.com/pulse/llm-ization-from-individual-prompting-organizational-thinking-qfngf/" emoji="🤖" title="My AI article" subtitle="LLM-ization of organizations" />
            <LinkCard href="https://www.linkedin.com/pulse/my-soft-skills-development-journey-kaspars-zemitis-60wwf/" emoji="📖" title="My soft skills article" subtitle="What dance taught me about people" />
          </div>
        </section>

        {/* ── Footer ── */}
        <div className="text-center pt-4">
          <p className="text-xs text-muted-foreground">Made with ❤️ using FamActify</p>
          <a href="/activities" className="text-xs text-primary font-semibold mt-1 block tap-highlight">Try FamActify →</a>
        </div>

      </div>
    </div>
  );
}
