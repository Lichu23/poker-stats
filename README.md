# PokerStats — Know Your Leaks

PokerStats is a free web app that analyzes your PokerStars hand history and shows you exactly where you're losing money — by position, by street, and separated from variance.

## Views

### Summary
Your overall performance at a glance. Shows whether you're winning or losing, your win rate (BB/100), VPIP, PFR, and Aggression Factor. A profit chart displays your cumulative result over time, and key insights highlight the most important leaks in your game.

### Preflop
Breaks down your preflop tendencies — VPIP, PFR, 3-Bet %, and PFR/VPIP ratio — compared to 6-max cash game benchmarks. Shows your win rate by position (BTN, CO, MP, UTG, BB, SB) so you can see exactly which positions are costing you money.

### Postflop
Focuses on your behavior after the flop. Shows Aggression Factor, C-Bet %, Fold to C-Bet %, WTSD (went to showdown), and W$SD (won at showdown) — each with a benchmark range so you know if your number is a leak or not.

### Luck
Separates skill from variance. Shows your all-in EV vs actual results, bad beats (you were ahead and lost), suckouts (you were behind and won), and coolers. Tells you whether you're running above or below expectation.

### Sessions
Lists all your sessions ordered by date with duration, hands played, net result in BB, and BB/100 per session. Lets you identify patterns — whether you perform better in short sessions, or lose more late in long ones.

### Hands
Browses your last 50 hands with position, hole cards, board, and result. Flags all-in hands and showdowns so you can quickly find the most important hands in your history.

## How to use it

1. Export your hands from PokerStars: **More → Hand History → Export** → save the `.txt` file
2. Create an account or try the demo (no sign up needed)
3. Upload the file — drag and drop or tap to browse
4. Stats appear automatically once the file is processed

## Tech Stack

- **Frontend**: Next.js 16 (App Router) · TypeScript · Tailwind CSS · Recharts
- **Backend**: Next.js API Routes · Custom PokerStars `.txt` parser
- **Database**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **Deployment**: Vercel

## Supported formats

- PokerStars cash game hand histories (`.txt`)
- Hold'em No Limit, Pot Limit, Fixed Limit
- English hand histories only

## Privacy

Your data is private and only accessible to you. Opponent usernames are not stored.
