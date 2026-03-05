# Agora

**The decentralized event platform for Web3 communities.**

Agora is a crypto-native event platform built on [Arkiv](https://arkiv.network) — where events and communities live on-chain, owned by their creators forever.

🌐 **Live:** [agora-xyz.vercel.app](https://agora-xyz.vercel.app)
📦 **Repo:** [github.com/barolivera/agora](https://github.com/barolivera/agora)

## Why Agora?

Event platforms like Luma and Eventbrite are centralized and siloed. Agora puts events and communities on-chain via Arkiv:

- **Community-curated events** — Events must belong to a community. Community leaders approve submissions, keeping quality high without being permissioned.
- **On-chain RSVPs & attendance** — Verifiable, permanent, and composable. Your attendance history becomes part of your on-chain identity.
- **AI-powered import** — Paste a Luma link and our AI agent auto-fills event details, categorizes, and suggests relevant communities.
- **Wallet-native identity** — No passwords. Your wallet is your profile.

## Arkiv Integration

All data is stored as Arkiv entities with wallet-based ownership. No traditional database.

### Entity Types (7)

| Entity | Description | Expiration |
|--------|-------------|------------|
| Event | Community events with metadata | Event date + 30 days |
| Community | Groups that curate events | 365 days (renewable) |
| Profile | User identity and preferences | 365 days (renewable) |
| RSVP | Event registration | Event date + 30 days |
| Waitlist | Overflow registration | Event date + 30 days |
| Attendance | Verified check-in record | 3650 days (10 years) |
| Subscription | Community membership | 365 days |

### Relationships
- Profile → Event (organizer creates events)
- Community → Event (events belong to communities)
- Event → RSVP, Waitlist, Attendance (cascading lifecycle)
- Community → Subscription (membership)
- Profile → Subscription (subscriber)

### Queryable Attributes
10+ queryable attributes used for filtering: type, eventId, organizer, status, community, slug, subscriber, communitySlug, address, attendee.

## Features

### For Attendees
- Browse and discover crypto events
- RSVP on-chain with your wallet
- QR ticket generation for check-in
- Profile with event history and communities

### For Organizers
- Create events with on-chain storage
- Import events from Luma with AI enrichment
- Manage communities with subscriber lists
- Scan QR codes to verify attendance
- Event approval system for community submissions

### For Communities
- Community pages with events and calendar
- Approve/reject event submissions from members
- Subscriber management
- Custom branding (cover photo, avatar, social links)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 + TypeScript |
| Styling | Tailwind CSS |
| On-chain storage | Arkiv SDK (Kaolin testnet) |
| Wallet | wagmi + viem |
| AI Agent | Anthropic Claude API |
| QR System | qrcode + jsQR |
| Fonts | Kode Mono + Geist |
| Deploy | Vercel |

## Getting Started

### Prerequisites
- Node.js 18+
- A Web3 wallet (Rabby, MetaMask, etc.)

### Installation
```bash
git clone https://github.com/barolivera/agora.git
cd agora
npm install
```

### Environment Variables
Create `.env.local`:
```
ANTHROPIC_API_KEY=your_key_here
```

### Development
```bash
npm run dev
```
Open http://localhost:3000

## Architecture
```
app/
├── events/          # Event discovery & search
├── event/           # Individual event page
├── create-event/    # Event creation + Luma import
├── community/       # Community pages
├── my-communities/  # Community directory
├── profile/         # User profile
├── components/      # Shared components
└── api/             # API routes (import, AI enrichment)
lib/
├── arkiv.ts         # Arkiv SDK integration
├── ai/              # AI enrichment logic
└── types/           # TypeScript types
```

## Built for
**Arkiv Web3 Database Builders Challenge — March 2026**

Built with ❤️ by [@barolivera](https://github.com/barolivera)
