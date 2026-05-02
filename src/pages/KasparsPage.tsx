import { Instagram, Linkedin, MapPin, ArrowUpRight, ExternalLink } from 'lucide-react';
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

function TimelineItem({ year, label, sub, highlight }: { year: string; label: string; sub?: string; highlight?: boolean }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={cn('w-2.5 h-2.5 rounded-full mt-1 shrink-0', highlight ? 'bg-primary scale-125' : 'bg-primary/50')} />
        <div className="w-px flex-1 bg-border mt-1" />
      </div>
      <div className="pb-5">
        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{year}</span>
        <p className={cn('text-sm leading-tight mt-0.5', highlight ? 'font-bold' : 'font-semibold')}>{label}</p>
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
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary/5 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-accent/40 translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary to-pink-400 flex items-center justify-center mb-5 shadow-lg">
          <span className="text-3xl">🧑‍💻</span>
        </div>

        <h1 className="text-3xl font-black tracking-tight leading-tight">
          Kaspars<br />Zemitis
        </h1>
        <p className="text-base text-muted-foreground mt-2 leading-relaxed max-w-sm">
          I believe the best moments in life are the ones we create on purpose — with our kids, with friends, with strangers who become friends on a dance floor.
          <span className="text-foreground font-medium"> That belief drives everything I do.</span>
        </p>

        <div className="flex flex-wrap gap-2 mt-5">
          <Chip className="bg-primary text-primary-foreground">👨‍👩‍👧‍👦 FamActify founder</Chip>
          <Chip className="bg-primary/10 text-primary">🇱🇻 Latvian</Chip>
          <Chip className="bg-pink-100 text-pink-700">🕺 Dancer</Chip>
          <Chip className="bg-blue-100 text-blue-700">💻 Builder</Chip>
          <Chip className="bg-orange-100 text-orange-700">📍 Bay Area</Chip>
        </div>
      </div>

      <div className="px-5 py-8 space-y-12 max-w-lg mx-auto pb-16">

        {/* ── FamActify spotlight ── */}
        <section>
          <SectionLabel>The project that started it all</SectionLabel>

          {/* Big hero card */}
          <div className="rounded-3xl overflow-hidden border shadow-sm">
            {/* Gradient header */}
            <div className="bg-gradient-to-br from-primary via-pink-500 to-accent/80 px-6 pt-7 pb-8 text-primary-foreground">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">👨‍👩‍👧‍👦</span>
                <div>
                  <h2 className="text-2xl font-black">FamActify</h2>
                  <p className="text-sm text-primary-foreground/80">famactify.app</p>
                </div>
              </div>
              <p className="text-base font-semibold leading-snug">
                "Phones are stealing family time.<br />Let's use them to reclaim it."
              </p>
            </div>

            {/* Body */}
            <div className="bg-card p-5 space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                I noticed something: families spend a lot of time <em>near</em> each other but not actually <em>with</em> each other. Everyone on their screen, no one quite present. Activities that could create real memories — they just never get organized.
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                So I started building FamActify — an app that helps parents discover, plan, and coordinate activities with their kids. Not just a list of things to do, but a tool that understands your family: how old your kids are, what they're into, how much time you have, what the weather's like.
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Started it during a mini-MBA at Stockholm School of Economics. Kept building through the Berkeley PM program — where lecturers got genuinely excited about it. Now actively developing it in the Bay Area, which feels like the right place to test this idea.
              </p>

              {/* Stats/highlights */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { label: 'Started', value: '2023' },
                  { label: 'Origin', value: 'SSE Riga' },
                  { label: 'Status', value: 'Building' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-muted/50 rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-bold mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex gap-2 pt-1">
                <a href="https://famactify.app/" target="_blank" rel="noopener noreferrer"
                  className="flex-1 h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1.5 tap-highlight active:scale-[0.98] transition-transform">
                  Try the app <ArrowUpRight className="w-4 h-4" />
                </a>
                <a href="https://www.linkedin.com/posts/kasparszemitis_a-kid-from-a-farm-in-latvia30-years-ago-activity-7454418966720028673-GgnG" target="_blank" rel="noopener noreferrer"
                  className="flex-1 h-11 rounded-2xl border border-border text-sm font-semibold flex items-center justify-center gap-1.5 tap-highlight active:scale-[0.98] transition-transform">
                  The story <Linkedin className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-3 px-4">
            You're actually on FamActify right now — this page lives at famactify.app/kaspars
          </p>
        </section>

        {/* ── The story ── */}
        <section>
          <SectionLabel>How I got here</SectionLabel>
          <div>
            <TimelineItem year="Childhood" label="Grew up on a farm in Latvia" sub="Things break, you fix them. That's still how I think." />
            <TimelineItem year="2012" label="First dance class" sub="Brazilian Zouk. Hated it for 3 months. Then couldn't stop." />
            <TimelineItem year="2016–24" label="Software engineer → Head of Product" sub="Built data pipelines, teams, products. Eventually Head of Product at Twigex." />
            <TimelineItem year="2023" label="Started FamActify at SSE Riga mini-MBA" sub="The question was: what would I build if I could build anything? Took one week to have the answer." highlight />
            <TimelineItem year="2024" label="Became a dance instructor" sub="Organized masterclasses. Discovered that teaching is its own art form." />
            <TimelineItem year="2025" label="Board member, NGO in Latvia" sub="Helping Latvians who come home after years abroad feel less alone." />
            <TimelineItem year="Apr 2026" label="Berkeley Executive Education" sub="One week on-site at Haas. Left wanting to stay." highlight />
            <TimelineItem year="Now" label="Bay Area — building, dancing, exploring" sub="Looking for housing 1–5 months." />
          </div>
        </section>

        {/* ── On the dance floor ── */}
        <section>
          <SectionLabel>On the dance floor</SectionLabel>
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-sm leading-relaxed mb-3">
              8 years of Brazilian Zouk. It turns out connection through movement is one of the most honest things I know how to do — and that connection is exactly what FamActify is about too.
            </p>
            <p className="text-sm leading-relaxed mb-4">
              I teach now. Specialties: <span className="font-semibold">counterbalances and spins</span>. I especially love working with beginners — watching someone go from "I have no rhythm" to actually feeling the music is something I never get tired of.
            </p>
            <div className="space-y-2.5">
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

        {/* ── Day job ── */}
        <section>
          <SectionLabel>Day job</SectionLabel>
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">🏗️</span>
              <div>
                <h3 className="font-bold">Cospace · Twigex</h3>
                <p className="text-xs text-muted-foreground">Head of Product · Full-time</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Self-hosted workspace platform for critical infrastructure organizations — file drive, chat, collaboration, and a full data analytics stack in one air-gapped deployment. No Microsoft 365, no Slack, no Databricks. One platform, on the customer's own infrastructure.
            </p>
            <a href="https://www.linkedin.com/pulse/llm-ization-from-individual-prompting-organizational-thinking-qfngf/" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-xs text-primary font-semibold">
              My thinking on AI & organizations <ArrowUpRight className="w-3 h-3" />
            </a>
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
              We help Latvians who've lived abroad come home without feeling lost. Same belief as FamActify, different context: people need community, connection, a soft landing. We build that — and when needed, we take it to government.
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
              After Berkeley Executive Education I decided to extend my stay — 1 to 5 months. Looking for a room or short-term housing. Happy to talk.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Also: my one-bedroom apartment in Riga ("Duntes Zīles", Sky & More building) is available for exchange or rental while I'm here.
            </p>
            <a href="https://group.merko.ee/en/project/duntes-ziles-residential-project/" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-xs text-primary font-semibold">
              See the Riga apartment <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </section>

        {/* ── Links ── */}
        <section>
          <SectionLabel>Find me</SectionLabel>
          <div className="space-y-2">
            <LinkCard href="https://famactify.app/" emoji="👨‍👩‍👧‍👦" title="FamActify" subtitle="The app — try it" />
            <LinkCard href="https://www.linkedin.com/in/kasparszemitis/" emoji="💼" title="LinkedIn" subtitle="linkedin.com/in/kasparszemitis" />
            <LinkCard href="https://www.instagram.com/reel/DJo5mjNs5dj/" emoji="🕺" title="Dance reel" subtitle="Counterbalances & spins" />
            <LinkCard href="https://www.linkedin.com/pulse/llm-ization-from-individual-prompting-organizational-thinking-qfngf/" emoji="🤖" title="My AI article" subtitle="LLM-ization of organizations" />
            <LinkCard href="https://www.linkedin.com/pulse/my-soft-skills-development-journey-kaspars-zemitis-60wwf/" emoji="📖" title="Dance & soft skills" subtitle="What movement taught me about people" />
          </div>
        </section>

        {/* ── Footer ── */}
        <div className="text-center pt-4 space-y-1">
          <p className="text-xs text-muted-foreground">You're on FamActify — an app for meaningful family moments</p>
          <a href="/activities" className="text-xs text-primary font-semibold tap-highlight">Explore activities →</a>
        </div>

      </div>
    </div>
  );
}
