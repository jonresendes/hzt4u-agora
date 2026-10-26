# Agora — HZT4U Review Arena

A classroom review game for HZT4U (Philosophy: Questions & Theories). Four games, four units, 700 questions written
only from the course slide decks. Works in any browser, installs as an app on phones/tablets/laptops, and runs offline
after the first load.

## Deploy on Netlify (2 minutes)

**Drag-and-drop (simplest)**
1. Sign in at https://app.netlify.com → *Add new site* → *Deploy manually*.
2. Drag the **whole `hzt4u-arena` folder** (the one containing `index.html`) onto the drop zone.
3. Netlify gives you a URL like `https://something.netlify.app`. Rename it under *Site configuration → Change site name*
   (e.g. `hzt4u-agora`). Share that link with students.

**Git-based (for updates)**
- Push this folder to a GitHub repo and connect it in Netlify (*Import an existing project*). Build command: *none*;
  publish directory: `.` (already set in `netlify.toml`). Every push redeploys.

> Netlify serves over HTTPS automatically, which is required for the install-as-app feature and offline mode.

## Installing it as an app on devices

Once it's on Netlify, every device can install it from the browser — no app store needed:

| Device | How |
|---|---|
| **Android (Chrome/Edge)** | Open the site → tap the **Install** button in Agora's top bar (or browser menu → *Install app* / *Add to Home screen*). |
| **iPhone / iPad (Safari)** | Open the site → Share button → **Add to Home Screen**. (Safari doesn't show an install button; this is the Apple way.) |
| **Windows / Mac / Chromebook (Chrome/Edge)** | Click the install icon in the address bar, or Agora's **Install** button. It opens in its own window like a desktop app. |
| **Smartboard / projector PC** | Install in Chrome as above, then use **Head-to-Head → Projector mode** for large type. |

After install it launches full-screen, keeps working without Wi-Fi, and updates itself when you redeploy.

## Using it in class

- **Solo mode** — students play on their own devices; scores, badges and accolades are saved per *profile* on that device.
- **Head-to-Head mode** — 2–4 teams on one projected screen. Teams take turns (Jeopardy, Wheel, Millionaire) or buzz in
  with on-screen buttons / keys **1–4** (Lightning Round). Name a team after a saved profile and that profile earns the
  badges.
- **Difficulty** — Remedial, Level 1–4 (roughly tracks expected grade bands), or **Mixed** (Jeopardy rows and the
  Millionaire ladder climb from Remedial to Level 4).
- **Topics** — Vocabulary · Philosophers · Theories · Concepts · Arguments · Modern Connections. Toggle any mix.
- **All Units — Exam Study** draws from every unit at once.
- **Timed questions** — optional; faster correct answers earn a bonus. Timer length is adjustable.
- **No repeats** — each unit/level/topic selection tracks which questions have been shown on that device. Nothing repeats
  until the whole selection is exhausted; then it quietly starts a fresh cycle (and awards the *Full Cycle* accolade).
  *Reset "seen" questions* on the setup screen forces a fresh cycle.

### Games
| Game | Shape | Head-to-head twist |
|---|---|---|
| **Jeopardy** | 5 categories × 5 values, 2 Daily Doubles with wagers, wrong = −value | Steals after a wrong answer; correct steal takes control |
| **Wheel of Wisdom** | 5 puzzles (terms/names/theories), consonants, buy vowels, Bankrupt / Lose a Turn, type to solve | Turn passes on a miss; only the solver banks the round |
| **Who Wants to Be a Philosopher King?** | 15 rungs to 1,000,000; 50:50, Ask the Class, Swap; safe havens at 5 and 10; walk away | Teams alternate on their own ladders |
| **Lightning Round** | 90 s (timed) or 20 questions; streak multiplier | Question shows without options; first to buzz answers, −100 if wrong, others may buzz |

### Badges & accolades
- **Badges** are per unit and carry that unit's colour and emblem (Column · Lantern · Constellation · Scales):
  Initiate, Scholar (70%+), Sage (70%+ at Level 4), Grand Master (all four games), Completionist (seen every question),
  Swift Mind (10 fast correct answers in a timed game).
- **Accolades** are cross-unit achievements (First Steps, Flawless, Hot Streak, Philosopher King, Wheel Wizard,
  Double Down, Lightning Rod, Exam Ready, Purist, Speed Demon, Polymath, Marathon, Rivalry, Full Cycle, Laureate).
- The **Leaderboard** (trophy icon) records top scores with names, filterable by game and unit.
- Profiles, scores and progress live in the browser on each device. Use **Profile → Export data** to back up or move
  a class tablet's data; **Import** restores it.

## Editing the questions

Questions live in `data/unit1.js` … `data/unit4.js` and `data/remedial.js`. Each entry:

```js
{u:1, l:6, t:"Arguments", d:3, q:"Question text…", a:"Correct answer", x:["Wrong 1","Wrong 2","Wrong 3"]}
```
- `u` unit (1–4) · `l` lesson number · `t` topic (one of the six topic names exactly)
- `d` difficulty: `0` Remedial, `1`–`4` Levels · `a` must not appear in `x`
- Short answers (letters only, ≤30 characters) automatically become Wheel of Wisdom puzzles.

After editing, bump `VERSION` in `sw.js` (e.g. `agora-v1.0.1`) so installed copies pick up the change, then redeploy.
`question-bank.csv` is a spreadsheet view of the whole bank for proofreading.

## Files
```
index.html            app shell
css/style.css         theme (unit colours are CSS variables at the top)
js/core.js            question pool engine, profiles, scoring, badges
js/games.js           the four games + results screen
js/app.js             screens: home, setup, game select, leaderboard, badges
data/*.js             question bank
manifest.webmanifest  install metadata · sw.js  offline cache · icons/  app icons
netlify.toml          headers for Netlify
```
