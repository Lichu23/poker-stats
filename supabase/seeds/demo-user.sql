-- ============================================================
-- Demo User Seed Data
-- Profile: Losing player, main leak = SB position (-13 BB/100)
-- 847 hands · -3.2 BB/100 · NL10 ($0.05/$0.10) · 8 sessions
-- ============================================================
-- BEFORE RUNNING:
--   1. Go to Supabase dashboard → Authentication → Users
--   2. Click "Add user" → Email: demo@pokerstats.app · Password: Demo1234!
--   3. Copy the new user's UUID
--   4. Replace 'REPLACE_WITH_DEMO_USER_ID' below with that UUID
--   5. Paste this entire script into Supabase → SQL Editor → Run
-- ============================================================

DO $$
DECLARE
  v_uid uuid := 'e5034882-8c08-4e1d-886a-68310987b974';

  -- Session IDs
  s1 uuid := gen_random_uuid();
  s2 uuid := gen_random_uuid();
  s3 uuid := gen_random_uuid();
  s4 uuid := gen_random_uuid();
  s5 uuid := gen_random_uuid();
  s6 uuid := gen_random_uuid();
  s7 uuid := gen_random_uuid();
  s8 uuid := gen_random_uuid();

  -- Loop variables
  v_i         int;
  v_local_i   int;
  v_pos       text;
  v_session_id   uuid;
  v_session_start timestamptz;
  v_played_at    timestamptz;
  v_result    numeric;
  v_rake      numeric;
  v_hole_cards text;
  v_board      text;
  v_went_sd    boolean;
  v_won_sd     boolean;
  v_is_allin   boolean;
  v_actions    jsonb;

  -- Position frequency (10-slot cycle → BTN 30%, CO 20%, MP 10%, UTG 10%, BB 20%, SB 10%)
  pos_arr text[] := ARRAY['BTN','BTN','BTN','CO','CO','MP','UTG','BB','BB','SB'];

  -- Hole card presets (30 combos, cycling)
  hands_arr text[] := ARRAY[
    'Ah Kh','Ks Qd','Jh Td','9s 8s','As Js','Qh Jh','7d 7c','Ad 5d',
    '6s 6h','Kh Jd','Ts 9h','8c 7c','Ac 4c','5h 4h','Qd Tc','2s 2d',
    'Ah Qd','Kd Jh','Jd 9d','As 6s','Th 9d','8h 7h','Ad 3s','Qs Jd',
    'Kc Tc','6d 5d','Ah 2h','4s 3s','9c 8h','Jc Ts'
  ];

  -- Board presets (16 combos, cycling)
  board_arr text[] := ARRAY[
    'Jc 7h 2d Kc 5s','Ah 9d 3c Th 8s','Ks 6c 2h Jd 4c','Qh Tc 4d 8c As',
    '7d 5s 2c Kh 9h','Ad Jh 6d 2s Tc','9c 8h 3s Qd 7c','Kd Qc Jh 2d 5h',
    'Th 6d 2h As 8c','Jd 9s 4c Kh 2d','Qs Jd 8h 3c 6s','Ac 7h 5d Jc 9s',
    '6c 5h 2s Kd Tc','8d 7c 3h Qh 4s','Kc Js 9d 2h 6d','Ah Th 4c 8s Jd'
  ];

BEGIN

  -- ============================================================
  -- 1. SESSIONS
  -- Net results: -8.5, +12.3, -15.2, +7.1, -5.4, +18.1, -20.3, -15.1 = -27.0 BB
  -- Cumulative:  -8.5,  +3.8, -11.4, -4.3, -9.7,  +8.4, -11.9, -27.0
  -- ============================================================
  INSERT INTO sessions (id, user_id, started_at, ended_at, hands_played, net_result_bb, stakes, vpip, pfr, aggression_factor, created_at)
  VALUES
    (s1, v_uid, now()-interval'21 days',             now()-interval'21 days'+interval'2h10m',  105,  -8.5, '$0.05/$0.10', 29, 20, 2.0, now()-interval'21 days'),
    (s2, v_uid, now()-interval'17 days',             now()-interval'17 days'+interval'2h30m',  120, +12.3, '$0.05/$0.10', 27, 18, 2.2, now()-interval'17 days'),
    (s3, v_uid, now()-interval'14 days',             now()-interval'14 days'+interval'1h55m',   98, -15.2, '$0.05/$0.10', 30, 21, 1.9, now()-interval'14 days'),
    (s4, v_uid, now()-interval'12 days',             now()-interval'12 days'+interval'2h20m',  115,  +7.1, '$0.05/$0.10', 26, 18, 2.3, now()-interval'12 days'),
    (s5, v_uid, now()-interval'8 days',              now()-interval'8 days' +interval'2h00m',  102,  -5.4, '$0.05/$0.10', 28, 19, 2.0, now()-interval'8 days'),
    (s6, v_uid, now()-interval'5 days',              now()-interval'5 days' +interval'2h15m',  110, +18.1, '$0.05/$0.10', 27, 20, 2.4, now()-interval'5 days'),
    (s7, v_uid, now()-interval'2 days',              now()-interval'2 days' +interval'1h50m',   95, -20.3, '$0.05/$0.10', 29, 19, 1.8, now()-interval'2 days'),
    (s8, v_uid, now()-interval'1 day'+interval'3h',  now()-interval'1 day' +interval'5h05m',   102, -15.1, '$0.05/$0.10', 28, 20, 2.1, now()-interval'1 day'+interval'3h');

  -- ============================================================
  -- 2. HANDS  (847 total, spread across 8 sessions)
  -- Session ranges:
  --   s1:  1–105    s2: 106–225   s3: 226–323   s4: 324–438
  --   s5: 439–540   s6: 541–650   s7: 651–745   s8: 746–847
  -- ============================================================
  FOR v_i IN 1..847 LOOP

    -- Session assignment + start time
    IF    v_i <= 105 THEN v_session_id := s1; v_session_start := now()-interval'21 days';            v_local_i := v_i;
    ELSIF v_i <= 225 THEN v_session_id := s2; v_session_start := now()-interval'17 days';            v_local_i := v_i - 105;
    ELSIF v_i <= 323 THEN v_session_id := s3; v_session_start := now()-interval'14 days';            v_local_i := v_i - 225;
    ELSIF v_i <= 438 THEN v_session_id := s4; v_session_start := now()-interval'12 days';            v_local_i := v_i - 323;
    ELSIF v_i <= 540 THEN v_session_id := s5; v_session_start := now()-interval'8 days';             v_local_i := v_i - 438;
    ELSIF v_i <= 650 THEN v_session_id := s6; v_session_start := now()-interval'5 days';             v_local_i := v_i - 540;
    ELSIF v_i <= 745 THEN v_session_id := s7; v_session_start := now()-interval'2 days';             v_local_i := v_i - 650;
    ELSE                  v_session_id := s8; v_session_start := now()-interval'1 day'+interval'3h'; v_local_i := v_i - 745;
    END IF;

    -- Timestamp: ~75 seconds per hand within session
    v_played_at := v_session_start + (v_local_i * interval'75 seconds');

    -- Position: cycle through frequency array
    v_pos := pos_arr[((v_i - 1) % 10) + 1];

    -- Result: base variation (cycles every 24 hands) + per-session offset
    -- Base cycle sum per 24 hands ≈ -0.5 BB → -0.021 BB/hand
    v_result := CASE (v_i % 24)
      WHEN 0  THEN  20.0
      WHEN 1  THEN -18.0
      WHEN 2  THEN   8.0
      WHEN 3  THEN  -9.0
      WHEN 4  THEN   4.0
      WHEN 5  THEN  -4.0
      WHEN 6  THEN   2.5
      WHEN 7  THEN  -2.5
      WHEN 8  THEN   1.5
      WHEN 9  THEN  -1.5
      WHEN 10 THEN  -1.0
      WHEN 11 THEN  -0.5
      ELSE           0.0   -- 12 folds → 0 BB
    END
    -- Per-session offset to hit session net targets
    + CASE
        WHEN v_i <= 105 THEN -0.06   -- s1 target: -8.5 BB
        WHEN v_i <= 225 THEN  0.12   -- s2 target: +12.3 BB
        WHEN v_i <= 323 THEN -0.13   -- s3 target: -15.2 BB
        WHEN v_i <= 438 THEN  0.08   -- s4 target:  +7.1 BB
        WHEN v_i <= 540 THEN -0.03   -- s5 target:  -5.4 BB
        WHEN v_i <= 650 THEN  0.19   -- s6 target: +18.1 BB
        WHEN v_i <= 745 THEN -0.19   -- s7 target: -20.3 BB
        ELSE                  -0.13  -- s8 target: -15.1 BB
      END;

    -- All-in hands: every 33rd hand
    v_is_allin := (v_i % 33 = 0);

    -- Override result for all-in hands (big swings for drama)
    IF v_is_allin THEN
      v_result := CASE (v_i % 66)
        WHEN  0 THEN -22.0   -- bad beat: was ahead, lost a big pot
        WHEN 33 THEN  24.0   -- hero wins a big all-in
        ELSE -22.0
      END;
    END IF;

    -- Showdown: ~24% of hands
    v_went_sd := (v_i % 4 = 1) OR v_is_allin;
    v_won_sd  := v_went_sd AND (v_result > 0);

    -- Rake: paid on ~25% of hands (only when pot is played)
    v_rake := CASE WHEN (v_i % 4 = 0) AND (v_result <> 0) THEN 0.2 ELSE 0 END;

    -- Hole cards (cycle through 30 presets)
    v_hole_cards := hands_arr[((v_i - 1) % 30) + 1];

    -- Board: ~70% of hands see a board (folded preflop = no board)
    v_board := CASE
      WHEN (v_i % 10) < 3 THEN NULL
      ELSE board_arr[((v_i - 1) % 16) + 1]
    END;

    -- Actions (simplified but representative)
    v_actions := CASE
      WHEN v_board IS NULL THEN
        '[{"street":"preflop","action":"fold","amount":0}]'::jsonb
      WHEN v_is_allin THEN
        '[{"street":"preflop","action":"raise","amount":0.3},{"street":"flop","action":"raise","amount":2.0},{"street":"flop","action":"allin","amount":10.0}]'::jsonb
      WHEN v_went_sd THEN
        '[{"street":"preflop","action":"call","amount":0.1},{"street":"flop","action":"call","amount":0.3},{"street":"river","action":"call","amount":0.6}]'::jsonb
      WHEN v_pos IN ('BTN','CO') AND (v_i % 3 = 0) THEN
        '[{"street":"preflop","action":"raise","amount":0.3},{"street":"flop","action":"bet","amount":0.6}]'::jsonb
      WHEN v_pos IN ('SB','BB') AND (v_i % 5 = 0) THEN
        '[{"street":"preflop","action":"call","amount":0.1},{"street":"flop","action":"fold","amount":0}]'::jsonb
      ELSE
        '[{"street":"preflop","action":"call","amount":0.1},{"street":"flop","action":"check","amount":0}]'::jsonb
    END;

    INSERT INTO hands (
      user_id, hand_id, session_id,
      game_type, limit_type, stakes, table_size,
      position, hole_cards, board, actions,
      result_bb, rake, is_all_in,
      went_to_showdown, won_at_showdown,
      played_at
    ) VALUES (
      v_uid,
      'DEMO' || lpad(v_i::text, 9, '0'),
      v_session_id,
      'HOLDEM', 'NL', '$0.05/$0.10', 6,
      v_pos, v_hole_cards, v_board, v_actions,
      round(v_result::numeric, 1),
      v_rake,
      v_is_allin,
      v_went_sd,
      v_won_sd,
      v_played_at
    );

  END LOOP;

  -- ============================================================
  -- 3. USER STATS (pre-aggregated — this is what the dashboard reads)
  -- ============================================================
  INSERT INTO user_stats (
    user_id,
    total_hands,
    vpip, pfr, three_bet_pct,
    aggression_factor,
    cbet_pct, fold_to_cbet_pct,
    wtsd, wsd,
    bb_per_100, net_result_bb, rake_paid_bb,
    last_calculated_at
  ) VALUES (
    v_uid,
    847,
    28.0,   -- vpip:            slightly loose
    19.0,   -- pfr:             decent aggression
    6.2,    -- three_bet_pct:   reasonable
    2.1,    -- aggression_factor: healthy
    58.0,   -- cbet_pct:        good
    57.0,   -- fold_to_cbet_pct: TOO HIGH — main leak shown in Key Insights
    24.0,   -- wtsd:            slightly low
    54.0,   -- wsd:             decent (wins when reaching showdown)
    -3.2,   -- bb_per_100:      losing player
    -27.0,  -- net_result_bb
    3.8,    -- rake_paid_bb
    now()
  );

  -- ============================================================
  -- 4. UPLOAD RECORD (so Sessions/upload history tab shows something)
  -- ============================================================
  INSERT INTO uploads (user_id, filename, file_size, hands_parsed, status, created_at)
  VALUES (v_uid, 'HH20260321_NL10_sessions.txt', 537216, 847, 'completed', now()-interval'21 days');

  RAISE NOTICE 'Demo seed complete — 847 hands inserted for user %', v_uid;

END $$;
