# Avatar TCG — Online Multiplayer Setup Guide

## Overview

Your game now supports **two modes**:

1. **Local Play** — Pass-and-play on the same device (no internet required)
2. **Online Play** — Real-time PvP with a friend on another device via Supabase

The online mode is **completely opt-in**. If you don't configure Supabase, local play works exactly as before.

---

## Step 1: Create a Supabase Project

1. Go to **https://supabase.com**
2. Sign in (or create an account — it's free)
3. Click **"New Project"**
4. Choose your organization and region (closest to you)
5. Set a secure password and confirm
6. Wait ~2 minutes for the database to initialize
7. You'll see your project dashboard

---

## Step 2: Create the Rooms Table

1. In your Supabase dashboard, find **"SQL Editor"** in the left sidebar
2. Click **"New Query"**
3. Copy the entire contents of `SUPABASE_SETUP.sql` (provided separately)
4. Paste it into the editor
5. Click **"Run"** (green play button)
6. You should see a success message

The table structure is:
- `id` (TEXT, PK): 4-character room code (e.g., "A7F2")
- `host_state` (JSONB): Host's character, chamber, deck selections
- `guest_state` (JSONB): Guest's character, chamber, deck selections
- `game_state` (JSONB): Full game state (synced on every action)
- `status` (TEXT): `waiting` | `active` | `finished`
- `created_at`, `updated_at`: Timestamps

---

## Step 3: Get Your Credentials

1. In your Supabase dashboard, click **"Project Settings"** (gear icon, bottom left)
2. Click **"API"** in the left sidebar
3. You'll see:
   - **Project URL** — starts with `https://...supabase.co`
   - **anon public** key — a long string starting with `eyJ...`

**Copy both of these.**

---

## Step 4: Update Your HTML File

1. Open `index.html` in any text editor
2. Find these lines (around line 2170):

```javascript
const SUPABASE_URL = 'https://YOUR_SUPABASE_URL.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

3. Replace them with your actual credentials:

```javascript
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

4. **Save the file**

---

## Step 5: Test It Out

### Local Play (No Setup Required)

1. Open `index.html` in your browser
2. Click **"PLAY LOCAL"**
3. Complete character/deck setup for both players
4. Play normally (pass the device between turns)
5. ✅ Works exactly as before

### Online Play (With Supabase Configured)

**Host:**
1. Open `index.html` in your browser
2. Click **"PLAY ONLINE"**
3. When prompted, type `HOST`
4. You'll see a 4-character room code (e.g., "A7F2")
5. **Share this code with your opponent** (text, Discord, etc.)
6. Complete character/deck selection for Player 1
7. Wait for guest to join and select their character
8. Click **"START MATCH"**
9. Game begins! Your opponent's actions sync in real-time

**Guest:**
1. Open `index.html` in your browser
2. Click **"PLAY ONLINE"**
3. When prompted, type `GUEST`
4. Enter the 4-character room code from the host
5. Click **"JOIN"**
6. Complete character/deck selection for Player 2
7. Wait for host to start the match
8. Game syncs automatically!

---

## How It Works

### During Game

- **State Sync**: Every action (draw, main, pass) syncs to Supabase instantly
- **Turn Enforcement**: Action buttons are disabled when it's not your turn
- **Waiting Overlay**: When it's your opponent's turn, you see "⏳ Waiting for Opponent…"
- **No Polling**: Uses Supabase Realtime — changes push to you, not pulled

### Reconnection

If someone's connection drops:
1. Just reload the page
2. The game automatically detects the room code in sessionStorage
3. Pulls the latest game state from Supabase
4. Resumes exactly where you left off

### Room Lifecycle

1. **Waiting** — Host has created room, waiting for guest
2. **Active** — Both players selected characters, game in progress
3. **Finished** — Someone won, room archived

---

## Troubleshooting

### "Supabase not configured. Check your URL and anon key."

**You haven't filled in the credentials yet.**

- Check that you replaced `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY` in the HTML
- Make sure there are no typos
- Make sure you're using the **anon public** key, not the service role key
- Reload the page

### "Room not found. Check the code and try again."

**The room code is wrong or doesn't exist.**

- Verify the host typed the code correctly (case-insensitive)
- Host should create a **new** room and share the new code
- Make sure the host successfully saw their code appear (it takes ~1 second)

### "A guest has already joined this room"

**Two people tried to join the same room.**

- The host should create a new room for the second guest
- Each room can only have one host and one guest

### "Game state isn't syncing"

**Realtime is not enabled or network is down.**

- Check your internet connection (both players)
- In Supabase, verify that Realtime is enabled for the `rooms` table:
  - Project Settings → Replication → Supabase Realtime
  - Make sure `public.rooms` is in the list
- Try reloading the page for both players

### Game doesn't resume after reconnection

**SessionStorage was cleared.**

- Try reloading again
- If the issue persists, the room may have expired (>24 hours old)
- Start a new game

---

## Architecture & Security Notes

### State Management

All game state lives in a single Supabase row. Each action updates it:

```javascript
{
  players: [
    { wins, hand, allies, chamber, flip, charge, deck, discard },
    { wins, hand, allies, chamber, flip, charge, deck, discard }
  ],
  energy: [{ water, earth, fire }, { water, earth, fire }],
  center: [/* disputed cards */],
  turn: 0 | 1,
  phase: "draw" | "main" | "pass",
  log: [/* move history */]
}
```

### Realtime Sync

When a player makes a move:
1. Local client updates `G` immediately (optimistic)
2. Writes to `rooms.game_state` via `supabase.from('rooms').update()`
3. Supabase broadcasts change via Realtime
4. Opponent's client receives update
5. Opponent's `G` is replaced and re-rendered

No polling needed — changes are pushed in milliseconds.

### Turn Enforcement

Each client knows:
- `G.turn` — whose turn it is (0 or 1)
- `localPlayerIdx` — which player you are (0 or 1)

Action buttons are disabled unless `G.turn === localPlayerIdx`.

### Session Storage

Upon joining/creating a room:
```javascript
sessionStorage.setItem('roomCode', code);
sessionStorage.setItem('localPlayerIdx', idx);
```

On page load, `checkForReconnection()` checks for these. If found, it:
1. Fetches the room from Supabase
2. Re-subscribes to Realtime updates
3. Loads the latest `game_state` into `G`
4. Resumes the game

---

## What Stays the Same

✅ **All card data** — loaded from GitHub CSV (no changes)
✅ **All game logic** — draw, main, pass phases (no changes)
✅ **Deck building** — saved to localStorage (no changes)
✅ **Character selection** — same UI and flow (no changes)
✅ **Local play** — 100% backward compatible

The only change is: when you choose "PLAY ONLINE", the game syncs state via Supabase instead of waiting for a physical pass.

---

## Advanced: Custom Rules

If you want to add new game mechanics, they'll sync automatically because everything is in the `G` state object.

For example, if you add hand size limits, combat damage, or resource generation:

1. Update your game logic in JavaScript (e.g., `performDraw()`, new action functions)
2. The changes to `G` will auto-sync to Supabase
3. Both players see the same state

---

## Privacy & Data

- **Room codes** are public (short, random, temporary)
- **Decks & characters** are revealed to your opponent (it's a game)
- **No personal info** is stored (no accounts needed)
- **Rooms auto-expire** after 24 hours (can add cleanup in Supabase cron)
- **All rows are viewable by anyone** with the URL (keep codes secret)

If you want stricter security later, you can:
- Require user authentication
- Add row-level security based on user ID
- Sign room codes with a secret token

---

## Future Enhancements

Consider adding:

1. **Deck import/export** — Share deck lists in chat
2. **Spectator mode** — Friends watch live games
3. **Game history** — Save past games for replay
4. **Elo rating** — Track win/loss record
5. **Matchmaking** — Auto-pair players instead of sharing codes
6. **Chat** — Type messages during game

All of these are compatible with the current Realtime architecture.

---

## Support

If you hit issues:

1. **Check the browser console** — Press F12, click "Console", look for red errors
2. **Verify Supabase connection** — The init script logs `"Supabase subscription status: ..."`
3. **Check network tab** — Make sure requests to `supabase.co` are succeeding
4. **Restart both clients** — Close browser, clear cache, reopen
5. **Create a new room** — Don't reuse old room codes

---

## You Did It!

You now have a real-time multiplayer TCG with:
- 🌐 Live state sync
- ⏳ Turn enforcement
- 🔄 Auto-reconnection
- ↔️ Zero-polling Realtime
- 📱 Works across devices

Faithful, humble service. Show up fully. Do the work in front of you.

Enjoy the game. 🔥💧🌍
