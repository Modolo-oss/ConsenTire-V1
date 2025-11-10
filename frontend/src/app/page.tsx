'use client'

import Link from 'next/link'
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CheckBadgeIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  GlobeAltIcon,
  SparklesIcon,
  UserIcon,
  BuildingOfficeIcon,
  ScaleIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline'

const heroHighlights = [
  {
    label: 'Valid ZK proofs anchored',
    value: '48K',
    detail: '+18% QoQ'
  },
  {
    label: 'Revocations executed instantly',
    value: '7.2K',
    detail: 'Across 112 jurisdictions'
  },
  {
    label: 'Compliance uptime',
    value: '99.995%',
    detail: 'HGTP-backed observability'
  }
]

const featureShowcase = [
  {
    title: 'Privacy orchestration',
    description:
      'Encrypted workflows, adaptive consent tokens, and consent proofs streamed to any downstream system in milliseconds.',
    icon: ShieldCheckIcon,
    accent: 'from-violet-500/40 to-purple-500/5'
  },
  {
    title: 'Composable governance',
    description:
      'El Paca token staking with quadratic voting, proposal automation, and attestations anchored to Hypergraph.',
    icon: SparklesIcon,
    accent: 'from-amber-500/40 to-orange-500/5'
  },
  {
    title: 'Seamless integrations',
    description:
      'SDKs and webhooks for CRM, CDP, marketing clouds, and custom nodes with deterministic schema contracts.',
    icon: GlobeAltIcon,
    accent: 'from-sky-500/40 to-cyan-500/5'
  }
]

const architectureFlow = [
  {
    title: 'Experience layer',
    copy: 'Next.js dashboard, compliance cockpit, and API gateway with secure sessions and 1-click revocation.',
    metrics: ['Adaptive UI states', 'Realtime Supabase streaming', 'Role-aware navigation']
  },
  {
    title: 'Metagraph intelligence',
    copy: 'Scala L0 consent engine coordinating zero-knowledge proofs, governance tallies, and lifecycle policies.',
    metrics: ['Stateful consent graph', 'Groth16 verification', 'El Paca quadratic voting']
  },
  {
    title: 'Immutable ledger',
    copy: 'Constellation Hypergraph anchoring consent hashes, audit merkle proofs, and compliance attestations.',
    metrics: ['HGTP anchoring', 'Atomic revocation updates', 'Cross-chain attest API']
  }
]

const stakeholderTypes = [
  {
    type: 'user',
    title: 'Individual User',
    subtitle: 'Protect your personal data',
    description: 'Take control of your privacy rights. Grant, monitor, and revoke consent across all organizations with confidence.',
    icon: UserIcon,
    benefits: ['Personal consent dashboard', 'One-click revocation', 'Privacy rights tools'],
    cta: 'Start as Individual',
    href: '/register?type=user&source=homepage'
  },
  {
    type: 'organization',
    title: 'Organization',
    subtitle: 'Manage data compliance',
    description: 'Automate GDPR compliance while building customer trust. Streamline consent management and demonstrate accountability.',
    icon: BuildingOfficeIcon,
    benefits: ['Automated compliance', 'Audit-ready reports', 'API integrations'],
    cta: 'Register Company',
    href: '/register?type=organization&source=homepage'
  },
  {
    type: 'regulator',
    title: 'Regulator/Auditor',
    subtitle: 'Monitor compliance',
    description: 'Access transparent compliance data, audit organizations, and ensure regulatory standards across industries.',
    icon: ScaleIcon,
    benefits: ['Real-time monitoring', 'Compliance analytics', 'Audit tools'],
    cta: 'View Compliance',
    href: '/compliance?access=public&source=homepage'
  }
]

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05060A] text-slate-100">
      <BackgroundTexture />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#05060A]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/60 to-sky-500/60 shadow-[0_8px_30px_rgba(90,97,255,0.35)]">
              <CheckBadgeIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">consentire</p>
              <p className="text-lg font-semibold text-white">GDPR consent, perfected.</p>
            </div>
          </div>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
            <Link className="transition hover:text-white" href="/dashboard">
              Dashboard
            </Link>
            <Link className="transition hover:text-white" href="/compliance">
              Compliance Hub
            </Link>
          </nav>

          <Link
            href="/login"
            className="group flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(32,40,72,0.45)] backdrop-blur"
          >
            Launch App
            <ArrowUpRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        <HeroSection />
        <StakeholderSelection />
        <Highlights />
        <FeatureShowcase />
        <ArchitectureSection />
        <FinalCTA />
      </main>

      <footer className="border-t border-white/10 bg-black/30 py-8 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} consentire • Built for Constellation x LegalTech Hackathon</p>
          <div className="flex items-center gap-4 text-xs uppercase tracking-[0.3em]">
            <span>Zero-Knowledge</span>
            <span>HGTP Native</span>
            <span>Privacy by Design</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function BackgroundTexture() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-20 top-[-180px] h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.65)_0%,_rgba(5,6,10,0)_65%)] blur-3xl" />
      <div className="absolute right-[-120px] top-[-80px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.55)_0%,_rgba(5,6,10,0)_70%)] blur-3xl" />
      <div className="absolute inset-x-0 bottom-[-220px] h-[520px] bg-[radial-gradient(circle,_rgba(236,72,153,0.25)_0%,_rgba(5,6,10,0)_70%)] blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.1)_0%,_rgba(10,10,12,0)_55%)]" />
    </div>
  )
}

function HeroSection() {
  return (
    <section className="relative mx-auto flex max-w-6xl flex-col gap-16 px-6 pb-12 pt-20 lg:flex-row lg:items-center lg:justify-between lg:pt-28">
      <div className="relative z-10 max-w-xl space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.45em] text-slate-200">
          Privacy-first consent management
        </div>
        <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
          GDPR compliance <span className="bg-gradient-to-r from-sky-400 via-violet-500 to-pink-400 bg-clip-text text-transparent">made simple</span>
        </h1>
        <p className="text-lg text-slate-300">
          Take control of your data privacy. Grant, monitor, and revoke consent with confidence.
          Zero-knowledge proofs ensure your personal data stays private while maintaining full compliance.
        </p>

        <div className="flex flex-col items-start gap-3 sm:flex-row">
          <Link
            href="/register"
            className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_25px_60px_rgba(79,70,229,0.45)] transition-transform duration-300 hover:scale-[1.02]"
          >
            Choose Your Path
            <ArrowRightIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/compliance"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
          >
            View Compliance Data
          </Link>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-slate-300">
          <span className="inline-flex items-center gap-2">
            <LockClosedIcon className="h-4 w-4 text-emerald-300" />
            Privacy by design
          </span>
          <span className="inline-flex items-center gap-2">
            <ChartBarIcon className="h-4 w-4 text-sky-300" />
            GDPR compliant
          </span>
          <span className="inline-flex items-center gap-2">
            <ShieldCheckIcon className="h-4 w-4 text-violet-300" />
            Zero-knowledge proofs
          </span>
        </div>
      </div>

      <div className="relative flex w-full max-w-lg flex-col gap-5 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_40px_120px_rgba(12,22,48,0.45)] backdrop-blur lg:translate-y-6">
        <span className="text-xs uppercase tracking-[0.45em] text-slate-400">Platform benefits</span>
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium text-white">For Individuals</p>
            <p className="text-xs text-slate-300 mt-1">Take control of your data privacy rights</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium text-white">For Organizations</p>
            <p className="text-xs text-slate-300 mt-1">Automate GDPR compliance</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium text-white">For Regulators</p>
            <p className="text-xs text-slate-300 mt-1">Monitor compliance transparently</p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-white/10 to-white/0 p-6">
          <p className="text-sm text-slate-200">
            "GDPR compliance doesn't have to be complicated. consentire makes privacy rights accessible to everyone."
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.3em] text-slate-400">Privacy experts</p>
        </div>
      </div>
    </section>
  )
}

function StakeholderSelection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-12 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Choose your path</p>
        <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
          Who are you?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300">
          Select your role to get started with personalized tools and features designed for your needs.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {stakeholderTypes.map((stakeholder) => (
          <div
            key={stakeholder.type}
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-[0_35px_70px_rgba(8,15,35,0.45)] transition hover:border-white/30"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-purple-500/5 opacity-0 transition group-hover:opacity-100" />
            <div className="relative">
              <stakeholder.icon className="h-12 w-12 text-white/70" />
              <h3 className="mt-6 text-2xl font-semibold text-white">{stakeholder.title}</h3>
              <p className="mt-2 text-sm font-medium text-violet-300">{stakeholder.subtitle}</p>
              <p className="mt-4 text-sm leading-relaxed text-slate-200">{stakeholder.description}</p>

              <ul className="mt-6 space-y-2">
                {stakeholder.benefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckBadgeIcon className="h-4 w-4 text-emerald-400" />
                    {benefit}
                  </li>
                ))}
              </ul>

              <Link
                href={stakeholder.href}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                {stakeholder.cta}
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-slate-400">
          Not sure which path is right for you?{' '}
          <Link href="/register" className="text-violet-300 hover:text-violet-200">
            Take our quiz to find out →
          </Link>
        </p>
      </div>
    </section>
  )
}

function Highlights() {
  const badges = ['Verified GDPR Article 7 & 13', 'ISO 27001 ready', 'Modular SDKs', 'Privacy UX toolkit']

  return (
    <section className="mx-auto mt-8 max-w-6xl px-6">
      <div className="flex flex-wrap items-center justify-center gap-3 rounded-full border border-white/10 bg-white/5 px-6 py-4 text-xs uppercase tracking-[0.4em] text-slate-300">
        {badges.map((badge) => (
          <span key={badge} className="whitespace-nowrap">
            {badge}
          </span>
        ))}
      </div>
    </section>
  )
}

function FeatureShowcase() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-12 flex flex-col gap-4 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Product system</p>
        <h2 className="text-3xl font-semibold text-white sm:text-4xl">Crafted for the teams that ship privacy-forward experiences</h2>
        <p className="mx-auto max-w-3xl text-base text-slate-300">
          From dynamic consent journeys to cross-chain attestations, consentire delivers the building blocks to move from
          compliance overhead to a programmable privacy advantage.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {featureShowcase.map((feature) => (
          <div
            key={feature.title}
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-[0_35px_70px_rgba(8,15,35,0.45)] transition hover:border-white/30"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-0 transition group-hover:opacity-100`} />
            <feature.icon className="relative h-10 w-10 text-white/70" />
            <h3 className="relative mt-6 text-2xl font-semibold text-white">{feature.title}</h3>
            <p className="relative mt-4 text-sm leading-relaxed text-slate-200">{feature.description}</p>
            <div className="relative mt-8 inline-flex items-center gap-2 text-sm font-semibold text-white/80">
              Explore capabilities
              <ArrowUpRightIcon className="h-4 w-4" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function ArchitectureSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-24">
      <div className="mb-12 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-slate-400">
          <span className="h-px w-16 bg-white/20" />
          Architecture runbook
        </div>
        <h2 className="text-3xl font-semibold text-white sm:text-4xl">Three layers, one composable consent fabric</h2>
        <p className="max-w-3xl text-base text-slate-300">
          Compose zero-trust privacy workflows with our experience layer, metagraph intelligence, and immutable HGTP anchors.
          Each layer is modular, API-driven, and ready for enterprise scale.
        </p>
      </div>

      <div className="space-y-6">
        {architectureFlow.map((stage, idx) => (
          <div
            key={stage.title}
            className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-gradient-to-r from-white/10 via-white/5 to-white/0 p-8 backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Layer {idx + 1}</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">{stage.title}</h3>
              </div>
              <span className="text-sm font-semibold text-white/70">{stage.metrics[0]}</span>
            </div>
            <p className="max-w-3xl text-sm text-slate-200">{stage.copy}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-400">
              {stage.metrics.map((metric) => (
                <span key={metric} className="rounded-full border border-white/10 px-3 py-1">
                  {metric}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function FinalCTA() {
  return (
    <section className="relative mx-auto max-w-6xl overflow-hidden rounded-4xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent px-8 py-16 backdrop-blur-xl">
      <div className="absolute right-[-120px] top-[-60px] h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(56,189,248,0.35)_0%,_rgba(15,16,31,0)_70%)] blur-2xl" />
      <div className="absolute left-[-80px] bottom-[-80px] h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(168,85,247,0.35)_0%,_rgba(15,16,31,0)_70%)] blur-2xl" />

      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl space-y-6">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-300">Launch</p>
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">Your consent ledger deserves a cinematic experience</h2>
          <p className="text-sm text-slate-200">
            Deploy consentire in hours, not months. Use Supabase migrations, Docker blueprints, and our SDKs to orchestrate
            compliant consent experiences across every jurisdiction.
          </p>
        </div>

        <div className="flex flex-col gap-4 text-sm text-slate-200">
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Real-time compliance feed online
          </div>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-3 rounded-full bg-white/90 px-6 py-3 text-sm font-semibold text-black shadow-[0_25px_60px_rgba(255,255,255,0.45)] transition hover:bg-white"
          >
            Get Started Now
            <ArrowUpRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
