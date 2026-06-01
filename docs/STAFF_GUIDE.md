# REALITY Social Game — Staff & Host Guide

*A guide for the people who run the games at REALITY (86 Mai Thúc Lân, Đà Nẵng).*

The app lives at **[app.realitydn.com](https://app.realitydn.com)**. It's a party-game mixer played on phones, in the room: a guest scans a QR, joins the night, finds another person, does the thing the game asks, scores a point. The big screen shows who's winning. You don't need to install anything — it runs in a browser, on any phone, in English, Tiếng Việt, Русский, or Українська.

This guide is for **staff and hosts** — the people behind the games, not the players. If you only ever play, you don't need this; just scan and go.

---

## 1. The two roles

There are exactly two kinds of staff access. Pick the one that matches what you do.

| Role | Who | Can do |
|---|---|---|
| **Admin** | Owners / floor leads (Donald, June) | Everything: create nights, start/switch/end any game, run the staff list, grant capabilities, end the night. |
| **Host** | Whoever runs games (e.g. Sam on Pub Quiz, Kayla on a games night) | Run a game they're handed — advance a quiz, manage the karaoke queue, run the photo game — and award bonus points. **Plus** whatever an admin grants them (see Capabilities below): typically "create sessions" and "start [their game]", so they can run their slot start-to-finish on their own. |

A host can do everything they need for their game without being an admin. An admin can also host any game themselves. When in doubt, ask to be added as a **host** — it's the lighter, safer grant.

### Capabilities — letting a host run their own night

A plain host can only take control of a game an admin started for them. To let a host run their slot solo — the way **Sam spins up Pub Quiz himself** — an admin grants them **capabilities** on the **Staff** page: tick **Create sessions** and **Start Pub Quiz Scoreboard** (and/or **Start Quiz Round**), then **Save capabilities**. From then on Sam signs in, taps **Host →** on the home screen to reach his own **Host** page, makes his own session, starts his quiz, runs it, and ends it — no admin needed, and no access to anything else (he never sees the admin area, staff management, or other people's sessions). Capabilities are per-game, so you hand out exactly what each person needs.

> The admin area (`/admin`) is admin-only — it's the management hub. Hosts get their own page at `/host`: their quiz packages, plus (if granted) **+ New session** and a list of their own sessions to run.

### Getting access

1. Open **[app.realitydn.com](https://app.realitydn.com)** and sign in with **Google** (top of the home page). Staff access is tied to a real Google account — guests can't be staff.
2. Ask an admin to add you. They'll go to **Admin → Staff**, type your email, pick **Host** or **Admin**, and hit **Add / update**. If you'll run your own slot, they also tick your **capabilities** there (e.g. *Create sessions*, *Start Pub Quiz Scoreboard*) and **Save**.
3. That's it. You can be added by email *before* you've ever signed in — the role waits for you. Next time you sign in, a **Host →** (or **Admin →**) link appears on the home screen into your console.

> If you try to open the console and it bounces you back to the home page, your account doesn't have a role yet (or you're signed in as a guest). Ping an admin.

---

## 2. The mental model: nights and games

Two words to keep straight:

- A **Session** is *one night* at REALITY. You create it when the games start and end it when they're done.
- A **Game** is *one round* inside that night — a round of Bingo, a Pub Quiz, a karaoke set. You can run several games back-to-back in a single session, and scores stack across the whole night.

So the shape of an evening is: **create the session → players join → start a game → end it → start another → … → end the session.** The big screen carries the leaderboard across all of it and finishes on a winners' splash.

---

## 3. Running the night (Admin, or a host with capabilities)

*Admins do this from **[/admin](https://app.realitydn.com/admin)**. A host granted "Create sessions" + "Start [game]" does the same from their **Host** page (`/host` → **+ New session**) — the steps below are identical, except a host only sees the games they're allowed to start, and there's no host picker (they host their own game automatically).*

### A. Open the session

1. Go to **[app.realitydn.com/admin](https://app.realitydn.com/admin)**.
2. Tap **+ New session**. It pre-fills tonight's name (e.g. `FRI · 30.05.26`) — keep it or rename it. Tap **Create**.

You're now on the session page. This is your control desk for the night.

### B. Get the two screens up

From the session page, two links open in new tabs:

- **Open big screen ↗** — put this on the TV / projector. It shows the live leaderboard and who's in the room, and automatically takes over the screen when a quiz, karaoke set, or photo game is running. Open it once and leave it.
- **Player link ↗** — this is the page guests land on. Turn it into a **QR code** (any free QR generator, pointed at the link) and put it on tables, the bar, the door. Guests scan → enter a display name (or sign in with Google) → they're in. They can keep trickling in all night; no need to wait for everyone.

### C. Start a game

On the session page, under **Game**, you'll see a button for each game.

- **Bingo, Target Hunt, Speed Pair** — one tap to start. These need no setup.
- **Disposable Camera** — set *Photos per player*, *Camera* (front / back / either), and *Votes per player*, pick a **Host**, then **Start**.
- **Quiz Round** — pick a **package** (the questions, written ahead of time — see §5), pick a **Host**, tick **Teams** if you want Pub Quiz team play, then **Start**.
- **Karaoke Queue** — pick a **Host**, then **Start**.

The **Host** picker decides who gets the live control panel for that game. Leave it on **Me / default** to run it yourself, or pick a staffer (e.g. Sam) to hand them the controls without making them an admin.

### D. While a game is running

- If the game is host-driven (Quiz, Karaoke, Disposable Camera), a **Host control →** button appears. That's the live panel — see §4. Hand the host that link, or open it yourself.
- To move to a different game, just start the next one. The button now reads **Switch to [game]** — it ends the current game (**scores are saved**) and starts the new one in the same night.
- **End game** finalizes the current game's scores and stops it, without starting anything new.

### E. End the night

When you're done, tap **End session**. This closes the night for everyone and flips the big screen to the **recap** — the final podium for the whole session. It can't be undone, so do it when the games are genuinely over.

---

## 4. Hosting a live game (Host)

When an admin hands you a game, open **Host control →** from the session page (or the link they send you). You'll only see controls for the game you've been given. Every panel has a **live badge** — green when it's syncing in real time, and it still updates within a few seconds even if the connection drops.

### Quiz Round (Pub Quiz)

You drive the room one question at a time:

1. **Start question 1 →** opens the first question. Players answer on their phones; the big screen shows the question and a live count of how many have answered. You can watch names light up as they lock in.
2. **Reveal answer ↓** closes the question, shows the correct answer on the big screen, and awards points (faster answers score more). You'll see the points each player just earned.
3. **Next question →** moves on. Repeat.
4. On the last question the button becomes **Finish round**. **End early** is there if you need to stop sooner — it'll warn you if players are mid-answer.

At the bottom, **Award bonus points (Top Pub Quiz)** lets you hand a winning team or player extra points off-script — see §6.

### Karaoke Queue

You're the queue master. Players submit one song each; you control the running order:

- **↑ / ↓** reorder. The top of the list (highlighted) is who's up now.
- **✎** edit a song title (fix a typo, clarify the version).
- **✓** mark a song **performed** — it moves to the history strip on the big screen.
- **×** delete a request.
- **Close queue** ends karaoke for the night.

**Award dare bonus (Top Karaoke)** hands out points for a dare or a standout performance.

### Disposable Camera

A three-phase photo game. You move it through the phases:

1. **Capturing** — players shoot photos on their phones (up to the per-player limit you set). You can delete any inappropriate shot from the grid during this phase. When enough are in, tap **Open voting →**.
2. **Voting** — capture closes; everyone votes for their favourites. You'll see ballots coming in. When you're ready, tap **Reveal results →** (it'll tell you if turnout is still low).
3. **Revealed** — the top photos take over the big screen as "Photographers of the Night," with names and vote counts. Tap **End game** to close it out.

**End early** is always available if you need to wrap up fast.

---

## 5. Writing a Pub Quiz (Host)

Quizzes are written ahead of time as **packages**, then slotted into a night. Do this from a laptop before the event, not live.

1. Go to **[app.realitydn.com/host](https://app.realitydn.com/host)** — the package library. Tap **+ New package**, name it (e.g. *Đà Nẵng Trivia*), **Create**.
2. In the editor, add questions. Five question types are available:
   - **Multiple choice** — with optional images per option.
   - **True / false.**
   - **Free text** — players type the answer; the app forgives case, accents, and small typos, and you can list several accepted answers.
   - **Ordering** — players drag items into the right order on their phones.
   - **Audio** — upload a clip (mp3, m4a, ogg, wav, webm); players hear it on their phones and the big screen plays it over the PA.
3. You can override **points** and the **timer** per question if you want some worth more or given longer.
4. Use **Solo Preview** to play through your own quiz and check it reads well — it doesn't touch any live session.
5. Remember to **Save** (there's a save bar; it warns you if you try to leave with unsaved changes).

On the night, an admin picks your package from the **Quiz Round** dropdown and hands you the host controls. Note: the questions are **snapshotted at start**, so editing or deleting the package mid-game won't disturb a running quiz — and any signed-in staffer can create and edit packages, so coordinate so you don't both edit the same one.

---

## 6. Bonus points

Both the Quiz and Karaoke host panels have an **award** control for off-script points — a Pub Quiz winner, a brave karaoke dare. Pick the player, set the points (5 is the default; you can go higher), tap **Award**. It lands on the leaderboard immediately, tagged with who gave it.

Disposable Camera does this automatically: the night's most-voted photographers earn **Paparazzi** points from the votes their shots received — you don't award those by hand.

---

## 7. The leaderboard

Anyone can open **[app.realitydn.com/leaderboard](https://app.realitydn.com/leaderboard)**. It has two sets of tabs:

- **Scope:** *Everything · Pub Quiz · Karaoke · Paparazzi* — filter to one kind of game or see the combined board.
- **Time:** *Tonight · This week · All-time.*

A few things worth knowing:
- **Guests** (people who joined with just a name) show up on **Tonight** — they were here — but not on the week / all-time boards, which are for signed-in regulars.
- **"Tonight"** rolls over at **2pm Đà Nẵng time**, so a night that runs past midnight still counts as one evening.
- Different games score differently: Bingo and the chase games give a point per success; the quiz rewards speed; karaoke gives no automatic points (only your dare bonuses); the photo game feeds the Paparazzi board.

---

## 8. The games at a glance

| Game | What players do | Competitive? | Needs a host? |
|---|---|---|---|
| **Bingo** | Get a 4×4 card of social prompts ("Has been to 5+ countries"). Find someone it's true for, tap the square, enter their 4-char code, they confirm. | Yes — point per square, bonus for first to a line. | No |
| **Target Hunt** | Everyone gets a secret target. Tag them (they confirm), inherit their target, chains converge. | Yes — point per tag. | No |
| **Speed Pair** | Auto-paired with someone; both tap "done"; re-paired with someone new. | Yes — point per meeting. | No |
| **Quiz Round** | Answer host-run trivia on their phones; faster = more points. Optional teams. | Yes | Yes |
| **Karaoke Queue** | Submit a song; host runs the running order. | No | Yes |
| **Disposable Camera** | Shoot a few photos, then vote on everyone's. | No (but feeds Paparazzi board) | Yes |

Every player has a **4-character code** on their own screen — that's what others type in to claim a Bingo square or confirm a tag. Tell guests where to find it if they look lost.

---

## 9. A few house notes

- **Languages.** Players (and you) can switch between English, Tiếng Việt, Русский, and Українська with the globe switcher. The non-English text is still being polished, so if something reads oddly, that's known — flag it to Donald.
- **Phones only, in the room.** The whole point is people meeting in the space. There's nothing to download; it's just a web page.
- **Keep the floor smooth.** The games are a layer *on top of* a normal night at REALITY — they shouldn't pull bartenders off drinks or turn into anything that gets in the way of service. If a game is creating friction on the floor, end it and move on.
- **If something looks stuck**, the screens refresh themselves every few seconds — give it a moment before reloading. A full browser refresh on the big screen or your control panel fixes almost everything; nobody loses their place or their score.
- **Scores are safe.** Switching or ending a game always saves its scores first. You can't lose points by moving between games.

---

## 10. Cheat sheet

| I want to… | Go to | Tap |
|---|---|---|
| Start the night | `/admin` | **+ New session** |
| Put the leaderboard on the TV | session page | **Open big screen ↗** |
| Let guests join | session page | **Player link ↗** → make a QR |
| Start a game | session page | the game's **Start** button |
| Hand a game to a host | session page | pick them in the **Host** droppicker before starting |
| Run my game live | session page | **Host control →** |
| Write a quiz | `/host` | **+ New package** |
| Give bonus points | host panel | **Award** |
| Add a staff member | `/admin/staff` | enter email, pick role, **Add / update** |
| End the night | session page | **End session** |

---

*Questions, or something not behaving? Tell Donald.*
