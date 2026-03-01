# Project: Agora — Decentralized Event Platform

## What we're building
A Luma-style event platform where events and RSVPs are stored on Arkiv 
(decentralized database), not on centralized servers. 
Users connect with their wallet instead of email.

## Stack
- Next.js 14 (App Router)
- Arkiv SDK @arkiv-network/sdk v0.6.0
- RainbowKit (wallet connect)
- Tailwind CSS
- Vercel (deploy)

## Arkiv Network (Kaolin Testnet)
- Chain ID: 60138453025
- RPC: https://kaolin.hoodi.arkiv.network/rpc
- WebSocket: wss://kaolin.hoodi.arkiv.network/rpc/ws

## Arkiv Core Concepts
- Data is stored as Entities with JSON payload, attributes, and expiration
- walletClient = read/write (needs connected wallet)
- publicClient = read only (no wallet needed)
- Query syntax: type = "event" && organizer = "0x..."
- ALWAYS import from @arkiv-network/sdk, never from viem directly

## Data Schema

### Event Entity
payload: { title, description, date, location, capacity, organizer }
attributes: [
  { key: "type", value: "event" },
  { key: "organizer", value: "0x..." },
  { key: "date", value: timestamp }
]
expiresIn: ExpirationTime.fromDays(365)

### RSVP Entity
payload: { eventId, attendee, confirmedAt }
attributes: [
  { key: "type", value: "rsvp" },
  { key: "eventId", value: "entityKey-del-evento" }
]
expiresIn: ExpirationTime.fromDays(365)

## Safety Rules
- ALWAYS add null guards to functions receiving async data
- ALWAYS use optional chaining (?.) and nullish coalescing (?? '')
- NEVER create nested folders
- NEVER put files outside the project root
```

---

## Paso 4 — Los 6 prompts (de a uno)

Abrí el chat de Cursor y mandá cada prompt. **Esperá a que funcione antes de mandar el siguiente.**

---

### Prompt 1 — Setup de RainbowKit
```
Read CONTEXT.md before starting.

Set up RainbowKit and Wagmi in this Next.js 14 App Router project.

1. Create app/providers.tsx with WagmiConfig and RainbowKitProvider.
   Configure a custom chain for Arkiv Kaolin testnet:
   - Chain ID: 60138453025
   - RPC URL: https://kaolin.hoodi.arkiv.network/rpc
   - Chain name: "Arkiv Kaolin"
   - Native currency: { name: "Ether", symbol: "ETH", decimals: 18 }

2. Update app/layout.tsx to wrap everything with the Providers component.

3. Create app/components/Navbar.tsx with:
   - The app name "Agora" on the left
   - A ConnectButton from RainbowKit on the right
   - Clean Tailwind styling

4. Import Navbar in layout.tsx so it appears on every page.

IMPORTANT:
- Do not create nested folders
- Add 'use client' directive to any component using hooks or RainbowKit
- Make sure it compiles without TypeScript errors
```

✅ **Verificá:** `npm run dev` → abrí localhost:3000 → aparece el navbar con el botón Connect Wallet

---

### Prompt 2 — Cliente de Arkiv
```
Read CONTEXT.md before starting.

Create lib/arkiv.ts that sets up the Arkiv clients and TypeScript types.

1. Export a publicClient using createPublicClient from @arkiv-network/sdk:
   - chain: kaolin (from @arkiv-network/sdk/chains)
   - transport: http() pointing to https://kaolin.hoodi.arkiv.network/rpc

2. Export TypeScript types:

type ArkivEvent = {
  entityKey: string
  title: string
  description: string
  date: string
  location: string
  capacity: number
  organizer: string
}

type ArkivRSVP = {
  entityKey: string
  eventId: string
  attendee: string
  confirmedAt: string
}

3. Export a helper function parseEvent(entity): ArkivEvent that safely 
   parses an Arkiv entity into an ArkivEvent, using optional chaining 
   and fallback values for every field.

4. Export a helper function parseRSVP(entity): ArkivRSVP that does 
   the same for RSVPs.

IMPORTANT:
- Import only from @arkiv-network/sdk, @arkiv-network/sdk/chains, 
  @arkiv-network/sdk/utils
- No TypeScript errors
```

✅ **Verificá:** que no haya errores rojos en `lib/arkiv.ts`

---

### Prompt 3 — Crear evento
```
Read CONTEXT.md before starting.

Create app/create-event/page.tsx — a form to create a new event on Arkiv.

Form fields: title (text), description (textarea), date (datetime-local), 
location (text), capacity (number)

On submit:
1. Get connected wallet with useAccount from wagmi
2. Get wallet client with useWalletClient from wagmi
3. Create an Arkiv walletClient using createWalletClient from @arkiv-network/sdk
4. Call walletClient.createEntity() with:
   - payload: jsonToPayload({ title, description, date, location, 
               capacity: Number(capacity), organizer: address })
   - contentType: 'application/json'
   - attributes: [
       { key: "type", value: "event" },
       { key: "organizer", value: address },
       { key: "date", value: new Date(date).getTime().toString() }
     ]
   - expiresIn: ExpirationTime.fromDays(365)
5. On success, redirect to /event/[entityKey] using Next.js router

States to handle:
- Show "Connect your wallet first" if not connected
- Show loading spinner while submitting
- Show error message if transaction fails
- Disable submit button while loading

IMPORTANT:
- 'use client' at the top
- Import ExpirationTime and jsonToPayload from @arkiv-network/sdk/utils
- Every variable that could be undefined must have a null guard
- No TypeScript errors
```

✅ **Verificá:** completá el formulario, firmá en MetaMask, que redirija a `/event/[algún-id]`

---

### Prompt 4 — Página del evento
```
Read CONTEXT.md before starting.

Create app/event/[id]/page.tsx — the public event page.

1. Get the event: fetch entity by ID from Arkiv using publicClient
   Parse it with parseEvent() from lib/arkiv.ts

2. Display: title, description, date (formatted), location, 
   organizer address (shortened: 0x1234...abcd), capacity

3. Get attendees: query Arkiv for entities where 
   type="rsvp" && eventId=[id]
   Show count vs capacity (e.g. "3 / 20 attending")
   List each attendee address (shortened)

4. RSVP button:
   - Label: "Confirm Attendance"
   - Requires connected wallet
   - On click: create RSVP entity with:
       payload: jsonToPayload({ eventId: id, attendee: address, 
                confirmedAt: new Date().toISOString() })
       attributes: [
         { key: "type", value: "rsvp" },
         { key: "eventId", value: id }
       ]
       expiresIn: ExpirationTime.fromDays(365)
   - After success: refresh attendee list
   - Disabled if: user already RSVPd OR event at capacity OR loading

5. Loading state while fetching event data

IMPORTANT:
- 'use client' at the top
- Use eq() from @arkiv-network/sdk/query for query filters
- Every async data access must use optional chaining (?.) and 
  null guards — NEVER call .slice() or any method on a value 
  that could be undefined
- No TypeScript errors
```

✅ **Verificá:** que se vean los datos del evento y que puedas hacer RSVP

---

### Prompt 5 — Mis eventos
```
Read CONTEXT.md before starting.

Create app/my-events/page.tsx — dashboard for the connected user.

1. Get address with useAccount from wagmi
2. Query Arkiv for entities where type="event" && organizer=[address]
3. For each event, also query attendee count (type="rsvp" && eventId=[entityKey])
4. Display events as cards with: title, date, location, attendee count
5. Each card links to /event/[entityKey]
6. Add a "+ Create Event" button linking to /create-event
7. Empty state: "You haven't created any events yet"
8. Not connected state: "Connect your wallet to see your events"
9. Loading state while fetching

Add a link to /my-events in the Navbar component.

IMPORTANT:
- 'use client' at the top  
- All data from Arkiv must be accessed with optional chaining
- No TypeScript errors
```

✅ **Verificá:** que aparezcan los eventos que creaste

---

### Prompt 6 — Homepage
```
Read CONTEXT.md before starting.

Replace the default app/page.tsx with a homepage for Agora.

1. Hero section:
   - Title: "Agora"
   - Subtitle: "Decentralized events for Web3 communities. 
     Your events, your data, no middleman."
   - CTA button: "Create your event" → /create-event

2. Recent events section:
   - Title: "Recent Events"
   - Query Arkiv publicClient for entities where type="event"
   - Show up to 6 events as cards
   - Each card: title, date (formatted), location, 
     organizer (shortened address)
   - Each card links to /event/[entityKey]
   - Empty state: "No events yet. Be the first to create one."
   - Loading skeleton while fetching

3. Clean design with Tailwind, should look like a real product

IMPORTANT:
- 'use client' at the top
- ALL functions that receive data from Arkiv must have null guards:
  if (!value) return fallback
- NEVER call .slice(), .map(), or any method on a value 
  that could be undefined or null
- No TypeScript errors
```