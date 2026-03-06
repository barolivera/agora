// Run with: npm run seed (set SEED_PRIVATE_KEY in .env.local)
// Get your private key from Rabby: Settings → My Wallet → Export Private Key
// Make sure the wallet has testnet ETH from kaolin.hoodi.arkiv.network/faucet

import { createWalletClient, http } from '@arkiv-network/sdk';
import { privateKeyToAccount } from '@arkiv-network/sdk/accounts';
import { kaolin } from '@arkiv-network/sdk/chains';
import { jsonToPayload, ExpirationTime } from '@arkiv-network/sdk/utils';

const privateKey = process.env.SEED_PRIVATE_KEY;
if (!privateKey) {
  console.error('❌  SEED_PRIVATE_KEY environment variable is required');
  process.exit(1);
}

const account = privateKeyToAccount(privateKey as `0x${string}`);
const walletClient = createWalletClient({
  chain: kaolin,
  transport: http('https://kaolin.hoodi.arkiv.network/rpc'),
  account,
});

/** Mirror the expiry logic from lib/expiration.ts: event date + 30 days, minimum 1 day. */
function expiresInSeconds(dateStr: string): number {
  const eventDate = new Date(dateStr);
  const expiryDate = new Date(eventDate);
  expiryDate.setDate(expiryDate.getDate() + 30);
  const secs = Math.max(Math.floor((expiryDate.getTime() - Date.now()) / 1000), 86400);
  return secs % 2 === 0 ? secs : secs + 1;
}

// ── Communities ───────────────────────────────────────────────────────────────

const COMMUNITIES = [
  {
    slug: 'eth-argentina',
    name: 'ETH Argentina',
    description:
      'La comunidad de Ethereum en Argentina. Meetups, workshops y hackathons para builders locales.',
    twitter: '@ETHArgentina',
    discord: 'discord.gg/ethargentina',
  },
  {
    slug: 'shefi',
    name: 'SheFi',
    description:
      'Educating and onboarding women into crypto and DeFi. LATAM chapter.',
    twitter: '@ShefiOrg',
  },
] as const;

// ── Events ────────────────────────────────────────────────────────────────────

const EVENTS = [
  {
    title: 'ETH Argentina Meetup #12',
    description:
      'Meetup mensual de la comunidad de Ethereum Argentina. Charlas técnicas, networking y novedades del ecosistema. Esta edición: L2s y el futuro de Ethereum.',
    date: '2026-03-15T19:00',
    location: 'Espacio Bitcoin, Palermo, Buenos Aires',
    capacity: 80,
    community: 'eth-argentina',
  },
  {
    title: 'SheFi Study Group — Intro to DeFi',
    description:
      'Sesión de estudio para aprender los fundamentos de DeFi: AMMs, lending protocols y yield farming. Abierto a todos los niveles.',
    date: '2026-03-20T18:00',
    location: 'Online — Google Meet',
    capacity: 40,
    community: 'shefi',
  },
  {
    title: 'Arkiv Builders Night Buenos Aires',
    description:
      'Una noche para builders que están construyendo con Arkiv. Demo de proyectos, feedback de la comunidad y soporte técnico del equipo de Arkiv.',
    date: '2026-03-22T19:30',
    location: 'La Maquinista, San Telmo, Buenos Aires',
    capacity: 30,
    community: 'eth-argentina',
  },
  {
    title: 'Web3 Design Workshop: Building for Real Users',
    description:
      'Workshop práctico de diseño para Web3. Cómo abstraer la complejidad blockchain, crear onboarding intuitivo y diseñar para usuarios que no conocen crypto.',
    date: '2026-03-28T17:00',
    location: 'Online — Zoom',
    capacity: 50,
    community: 'shefi',
  },
  {
    title: 'Solidity Bootcamp LATAM — Sesión 1',
    description:
      'Primera sesión del bootcamp de Solidity para developers de LATAM. Desde cero hasta tu primer smart contract deployado en testnet. 8 semanas, totalmente gratuito.',
    date: '2026-04-05T15:00',
    location: 'Online — Discord',
    capacity: 100,
    community: 'eth-argentina',
  },
  {
    title: 'ETHGlobal Bangkok Watch Party Buenos Aires',
    description:
      'Watch party del hackathon ETHGlobal Bangkok. Seguimos los proyectos en vivo, votamos nuestros favoritos y celebramos con la comunidad local.',
    date: '2026-04-12T20:00',
    location: 'Crack, Villa Crespo, Buenos Aires',
    capacity: 60,
    community: 'eth-argentina',
  },
] as const;

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nSeeding Agora with wallet: ${account.address}\n`);

  for (const community of COMMUNITIES) {
    const { entityKey } = await walletClient.createEntity({
      payload: jsonToPayload({
        name: community.name,
        slug: community.slug,
        description: community.description,
        createdBy: account.address,
        updatedAt: new Date().toISOString(),
        ...('twitter' in community ? { twitter: community.twitter } : {}),
        ...('discord' in community ? { discord: community.discord } : {}),
      }),
      contentType: 'application/json',
      attributes: [
        { key: 'type', value: 'community' },
        { key: 'slug', value: community.slug },
        { key: 'createdBy', value: walletClient.account.address.toLowerCase() },
      ],
      expiresIn: ExpirationTime.fromDays(3650),
    });
    console.log(`Created community: ${community.name} — entityKey: ${entityKey}`);
  }

  console.log('');

  for (const event of EVENTS) {
    const dateEpochMs = new Date(event.date).getTime().toString();
    const { entityKey } = await walletClient.createEntity({
      payload: jsonToPayload({
        title: event.title,
        description: event.description,
        date: event.date,
        location: event.location,
        capacity: event.capacity,
        organizer: account.address,
        community: event.community,
        status: 'upcoming',
      }),
      contentType: 'application/json',
      attributes: [
        { key: 'type', value: 'event' },
        { key: 'organizer', value: account.address },
        { key: 'status', value: 'upcoming' },
        { key: 'date', value: dateEpochMs },
        { key: 'community', value: event.community },
      ],
      expiresIn: expiresInSeconds(event.date),
    });
    console.log(`Created: ${event.title} — entityKey: ${entityKey}`);
  }

  console.log('\n✅ Seed complete: 2 communities + 6 events created');
}

main().catch((err) => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});
