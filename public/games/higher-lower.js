// =====================================================================
// GAME: HIGHER OR LOWER (card deck)  -- same contract as slots / auction
// PS1 / PSX lo-fi themed background.
// ---------------------------------------------------------------------
// PLAY IN THE p5.js WEB EDITOR: paste this whole file into sketch.js and
// press Play. On-screen buttons stand in for the phone.
// Keys: Enter = start, H = higher, L = lower, C = cash out.
//
// IN THE PROJECT: host sets window.GAME_HOST = true, then calls
//   window.Games.higherLower.create(containerEl, config, bridge)
// =====================================================================

(function () {
  const THEME = { ink: [214, 224, 222], dim: [120, 140, 142], warn: [230, 80, 90], good: [120, 220, 140], accent: [90, 200, 190] };

  const DEFAULTS = {
    currency: "CREDITS",
    startBalance: 0,
    gameDurationMs: 60000,
    basePot: 10,
    potGrowth: 1.6,
    defaultAccuracy: 0.6,        // how often the PRE-HIGHLIGHTED guess has the better odds
    socialProofMisleadRate: 0.4, // on "obvious" rounds, how often the crowd points the wrong way
    obviousThreshold: 0.72,
    idleTimeoutMs: 30000,
    thresholds: { riskHigh: 6, riskMed: 3, defaultHigh: 0.7, defaultMed: 0.4 },
    messages: {
      correct: ["CORRECT! KEEP THE STREAK ALIVE!", "YES! IT'S GROWING!", "YOU'RE ON FIRE!", "DON'T STOP NOW!"],
      wrong: ["SO CLOSE! TRY AGAIN!", "ALMOST HAD IT!", "THE NEXT CARD IS YOURS!"],
      cashTempt: "CASH OUT NOW, OR DOUBLE IT?",
    },
  };

  const PROFILE_RULES = {
    startBalance: 0,
    socialProofBySusceptibility: { HIGH: 0.45, MEDIUM: 0.4, LOW: 0.3 },
  };
  function configFromProfile(profile) {
    const pr = profile || {}, R = PROFILE_RULES, c = {};
    c.startBalance = R.startBalance;
    if (R.socialProofBySusceptibility[pr.susceptibility] !== undefined) c.socialProofMisleadRate = R.socialProofBySusceptibility[pr.susceptibility];
    c.appliedProfile = { susceptibility: pr.susceptibility || null };
    return c;
  }

  const RANKS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]; // index = value 1..13
  const SUITS = ["spade", "heart", "diamond", "club"];
  const W = 1024, H = 768;
  function merge(a, b) { const o = Array.isArray(a) ? a.slice() : { ...a }; for (const k in b || {}) o[k] = b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) ? merge(a[k] || {}, b[k]) : b[k]; return o; }
  function level(v, hi, med) { if (v === null || v === undefined) return "UNKNOWN"; return v >= hi ? "HIGH" : v >= med ? "MEDIUM" : "LOW"; }
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const drawCard = () => ({ rank: 1 + Math.floor(Math.random() * 13), suit: pick(SUITS) });

  function create(container, userConfig, bridge) {
    const cfg = merge(DEFAULTS, userConfig || {});
    const instanceApi = {};
    let instance;

    const sketch = (p) => {
      let scaleF = 1, offX = 0, offY = 0;
      let state = "rules";
      let bank = cfg.startBalance;
      let card = null, nextC = null, pot = 0, streak = 0;
      let defaultGuess = null, socialProof = null, roundObvious = false;
      let message = "", revealAt = 0, lastCorrect = null, shownAt = 0;
      let rulesShownAt = Date.now(), rulesReadMs = null, playStartedAt = null, lastInputAt = Date.now();
      let ended = false, endReason = null;
      const log = { rounds: [], cashOuts: 0, maxStreak: 0 };

      const emit = (t, d) => bridge && bridge.emit && bridge.emit(t, { ...d, t: Date.now() });
      const controls = (list, locked) => bridge && bridge.setControls && bridge.setControls(list, { locked: !!locked });
      const timeLeftMs = () => playStartedAt ? Math.max(0, cfg.gameDurationMs - (Date.now() - playStartedAt)) : cfg.gameDurationMs;
      const pHigher = (n) => (13 - n) / 13;   // next rank uniform 1..13; tie counts as a loss

      function newRound() {
        const pH = pHigher(card.rank), betterGuess = pH >= (1 - pH) ? "higher" : "lower", betterP = Math.max(pH, 1 - pH);
        roundObvious = betterP >= cfg.obviousThreshold;
        defaultGuess = Math.random() < cfg.defaultAccuracy ? betterGuess : (betterGuess === "higher" ? "lower" : "higher");
        const mislead = roundObvious && Math.random() < cfg.socialProofMisleadRate;
        const crowdGuess = mislead ? (betterGuess === "higher" ? "lower" : "higher") : betterGuess;
        const crowdPct = mislead ? 62 + Math.floor(Math.random() * 18) : 58 + Math.floor(Math.random() * 30);
        socialProof = { guess: crowdGuess, pct: crowdPct, misleading: mislead };
        shownAt = Date.now();
        guessingControls();
        emit("round", { card: card.rank, pot, streak, pHigher: +pH.toFixed(2), betterGuess, obvious: roundObvious, defaultGuess, socialProof });
      }
      function guessingControls() {
        controls([
          { id: "higher", label: "HIGHER", primary: defaultGuess === "higher" },
          { id: "lower", label: "LOWER", primary: defaultGuess === "lower" },
          ...(streak > 0 ? [{ id: "cash_out", label: `CASH OUT ${Math.round(pot)}` }] : []),
        ], false);
      }
      function guess(choice) {
        const latency = Date.now() - shownAt;
        nextC = drawCard();
        const correct = choice === "higher" ? nextC.rank > card.rank : nextC.rank < card.rank; // tie = loss
        const followedDefault = choice === defaultGuess, followedCrowd = choice === socialProof.guess;
        log.rounds.push({ card: card.rank, next: nextC.rank, choice, correct, latencyMs: latency, followedDefault, followedCrowd, obvious: roundObvious, crowdMisleading: socialProof.misleading, streakBefore: streak });
        emit("guess", { choice, next: nextC.rank, correct, followedDefault, followedCrowd, crowdMisleading: socialProof.misleading, decisionMs: latency });
        lastCorrect = correct; state = "reveal"; revealAt = Date.now(); controls([], true);
        if (correct) { streak++; log.maxStreak = Math.max(log.maxStreak, streak); pot = streak === 1 ? cfg.basePot : Math.round(pot * cfg.potGrowth); message = pick(cfg.messages.correct); }
        else { message = pick(cfg.messages.wrong); pot = 0; streak = 0; }
      }
      function afterReveal() {
        card = nextC;
        if (timeLeftMs() <= 0) return finish("time_up");
        state = "guessing"; message = streak > 0 ? cfg.messages.cashTempt : "HIGHER OR LOWER?"; newRound();
      }
      function cashOut() {
        bank += Math.round(pot); log.cashOuts++;
        emit("cash_out", { amount: Math.round(pot), atStreak: streak, bank });
        message = `BANKED ${Math.round(pot)}! PLAY ON?`; pot = 0; streak = 0; state = "guessing"; newRound();
      }
      function handle(a) {
        if (ended) return; lastInputAt = Date.now();
        if (state === "rules") { if (a === "start") return start(); return; }
        if (state === "guessing") { if (a === "higher" || a === "lower") return guess(a); if (a === "cash_out" && streak > 0) return cashOut(); }
      }
      if (bridge && bridge.onInput) bridge.onInput(handle);
      function start() {
        rulesReadMs = Date.now() - rulesShownAt; playStartedAt = Date.now(); card = drawCard();
        state = "guessing"; message = "HIGHER OR LOWER?";
        emit("game_start", { rulesReadMs, durationMs: cfg.gameDurationMs, startCard: card.rank, appliedProfile: cfg.appliedProfile || null });
        newRound();
      }
      function summary(reason) {
        const t = cfg.thresholds, r = log.rounds;
        const defaultRate = r.length ? r.filter((x) => x.followedDefault).length / r.length : null;
        const mis = r.filter((x) => x.crowdMisleading); const badFollow = mis.filter((x) => x.followedCrowd).length;
        return {
          game: "higherLower", endReason: reason, rulesReadMs,
          rounds: r.length, correct: r.filter((x) => x.correct).length, maxStreak: log.maxStreak, cashOuts: log.cashOuts, finalBank: bank, everCashedOut: log.cashOuts > 0,
          defaultFollowRate: defaultRate, crowdMisleadingRounds: mis.length, followedMisleadingCrowd: badFollow, followedMisleadingCrowdRate: mis.length ? badFollow / mis.length : null,
          appliedProfile: cfg.appliedProfile || null,
          traits: {
            RISK_TOLERANCE: level(log.maxStreak, t.riskHigh, t.riskMed),
            DEFAULT_ACCEPTANCE: level(defaultRate, t.defaultHigh, t.defaultMed),
            SOCIAL_PROOF: mis.length ? (badFollow / mis.length >= 0.5 ? "FOLLOWS CROWD" : "RESISTS CROWD") : "NOT TESTED",
            GREED: log.cashOuts === 0 && r.length > 2 ? "HIGH (NEVER CASHED OUT)" : log.cashOuts > 0 ? "MANAGED" : "UNKNOWN",
          },
        };
      }
      function finish(reason) { if (ended || state === "over") return; endReason = reason; state = "over"; controls([], true); setTimeout(() => { ended = true; const s = summary(reason); emit("game_end", s); if (bridge && bridge.onEnd) bridge.onEnd(s); }, 5000); }
      instanceApi.end = (r) => { if (ended) return; ended = true; state = "over"; endReason = r; const s = summary(r); emit("game_end", s); if (bridge && bridge.onEnd) bridge.onEnd(s); };
      instanceApi.getSummary = () => summary(ended ? endReason : "in_progress");

      // ---------- p5 ----------
      p.setup = () => { const c = p.createCanvas(container.clientWidth || W, container.clientHeight || H); c.parent(container); p.textFont("monospace"); fit(); controls([{ id: "start", label: "START", primary: true }], false); emit("rules_shown", {}); };
      function fit() { scaleF = Math.min(p.width / W, p.height / H); offX = (p.width - W * scaleF) / 2; offY = (p.height - H * scaleF) / 2; }
      p.windowResized = () => { p.resizeCanvas(container.clientWidth || W, container.clientHeight || H); fit(); };
      const ink = () => p.fill(THEME.ink[0], THEME.ink[1], THEME.ink[2]);
      const dim = () => p.fill(THEME.dim[0], THEME.dim[1], THEME.dim[2]);

      p.draw = () => {
        p.background(8); p.push(); p.translate(offX, offY); p.scale(scaleF); drawBg();
        if (state === "rules") { drawRules(); drawTest(); p.pop(); return; }
        if (!ended && state === "guessing") { if (timeLeftMs() <= 0) return finish("time_up"); if (Date.now() - lastInputAt > cfg.idleTimeoutMs) return finish("idle"); }
        if (state === "reveal" && Date.now() - revealAt > 1400) afterReveal();

        // header
        p.noStroke(); p.textSize(26); ink(); p.textAlign(p.LEFT, p.CENTER); p.text(`BANK: ${bank}`, 60, 48);
        const secs = Math.ceil(timeLeftMs() / 1000);
        p.textAlign(p.RIGHT, p.CENTER); if (secs <= 10) p.fill(THEME.warn[0], THEME.warn[1], THEME.warn[2]); else ink(); p.text(`0:${String(secs).padStart(2, "0")}`, W - 60, 48);
        p.textAlign(p.CENTER, p.CENTER); ink(); p.text(streak > 0 ? `STREAK ${streak} - POT ${Math.round(pot)}` : "", W / 2, 48);

        // cards
        drawPlayingCard(card, W / 2, 250, 1);
        if (state === "reveal") drawPlayingCard(nextC, W / 2 + 230, 250, 0.8, lastCorrect);

        if (state === "guessing" && socialProof) {
          p.noStroke(); dim(); p.textAlign(p.CENTER, p.CENTER); p.textSize(20);
          p.text(`${socialProof.pct}% OF PLAYERS GUESSED ${socialProof.guess.toUpperCase()}`, W / 2, 470);
          if (defaultGuess) { p.fill(THEME.accent[0], THEME.accent[1], THEME.accent[2]); p.textSize(16); p.text(`RECOMMENDED: ${defaultGuess.toUpperCase()}`, W / 2, 500); }
        }
        p.noStroke(); ink(); p.textAlign(p.CENTER, p.CENTER); p.textSize(26); p.text(message, W / 2, 560);
        if (state === "over") drawOver();
        drawTest(); p.pop();
      };

      // ----- PS1 background -----
      function drawBg() {
        const ctx = p.drawingContext;
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0c1018"); g.addColorStop(0.6, "#111826"); g.addColorStop(1, "#0a0e16"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        const t = p.millis() / 4000;
        p.push(); p.translate(W / 2, H / 2 + 40); p.rotate(Math.sin(t) * 0.25);
        p.noFill(); p.stroke(THEME.accent[0], THEME.accent[1], THEME.accent[2], 26); p.strokeWeight(1.5);
        const s = 150 + 20 * Math.sin(t * 1.7);
        for (let i = 0; i < 5; i++) { const r = s + i * 70; p.beginShape(); for (let a = 0; a < 6; a++) { const ang = a * Math.PI / 3 + i * 0.3 + t; p.vertex(Math.cos(ang) * r, Math.sin(ang) * r * 0.5); } p.endShape(p.CLOSE); }
        p.pop();
        p.noStroke(); p.fill(255, 255, 255, 8); for (let x = 0; x < W; x += 16) for (let y = 0; y < H; y += 16) if ((x / 16 + y / 16) % 2 === 0) p.rect(x, y, 2, 2);
        p.stroke(0, 0, 0, 40); p.strokeWeight(1); for (let y = 0; y < H; y += 3) p.line(0, y, W, y); p.noStroke();
        const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.85); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.55)"); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
        const on = Math.floor(p.millis() / 600) % 2 === 0; p.fill(on ? 230 : 90, on ? 60 : 40, on ? 70 : 45); p.circle(42, H - 40, 12); dim(); p.textAlign(p.LEFT, p.CENTER); p.textSize(14); p.text("REC", 58, H - 40);
      }

      function drawPlayingCard(cd, cx, cy, sc, correct) {
        if (!cd) return;
        const w = 180 * sc, h = 250 * sc; p.push(); p.translate(cx, cy);
        p.noStroke(); p.fill(0, 0, 0, 80); p.rect(-w / 2 + 6, -h / 2 + 8, w, h, 14);           // shadow
        p.fill(correct === undefined ? 248 : correct ? p.color(230, 248, 233) : p.color(250, 230, 230));
        p.stroke(correct === undefined ? 180 : correct ? p.color(70, 160, 90) : p.color(200, 70, 70)); p.strokeWeight(2); p.rect(-w / 2, -h / 2, w, h, 14);
        const red = cd.suit === "heart" || cd.suit === "diamond";
        const col = red ? [200, 40, 50] : [25, 25, 30];
        p.noStroke(); p.fill(col[0], col[1], col[2]);
        p.textAlign(p.LEFT, p.TOP); p.textSize(26 * sc); p.text(RANKS[cd.rank], -w / 2 + 12, -h / 2 + 10);
        p.textAlign(p.RIGHT, p.BOTTOM); p.text(RANKS[cd.rank], w / 2 - 12, h / 2 - 10);
        drawSuit(cd.suit, 0, 6 * sc, 46 * sc, col);
        p.pop();
      }
      function drawSuit(suit, x, y, r, col) {
        p.push(); p.translate(x, y); p.noStroke(); p.fill(col[0], col[1], col[2]);
        if (suit === "diamond") p.quad(0, -r, r * 0.7, 0, 0, r, -r * 0.7, 0);
        else if (suit === "heart") { p.circle(-r * 0.4, -r * 0.2, r * 0.9); p.circle(r * 0.4, -r * 0.2, r * 0.9); p.triangle(-r * 0.8, 0, r * 0.8, 0, 0, r); }
        else if (suit === "spade") { p.circle(-r * 0.4, 0, r * 0.9); p.circle(r * 0.4, 0, r * 0.9); p.triangle(-r * 0.8, r * 0.2, r * 0.8, r * 0.2, 0, -r); p.rect(-r * 0.12, r * 0.1, r * 0.24, r * 0.7); }
        else { p.circle(0, -r * 0.4, r * 0.8); p.circle(-r * 0.4, r * 0.2, r * 0.8); p.circle(r * 0.4, r * 0.2, r * 0.8); p.rect(-r * 0.12, r * 0.1, r * 0.24, r * 0.7); }
        p.pop();
      }

      function drawRules() {
        p.noStroke(); ink(); p.textAlign(p.CENTER, p.CENTER); p.textSize(40); p.text("HIGHER OR LOWER", W / 2, 90);
        p.textSize(24); p.text("HOW TO PLAY", W / 2, 150);
        const lines = ["A playing card is shown.", "Guess if the NEXT card is HIGHER or LOWER by rank.", "(Aces low, Kings high. A tie loses.)", "Each correct guess grows your POT.", "CASH OUT any time... one wrong guess loses it all.", `You have ${Math.round(cfg.gameDurationMs / 1000)} seconds.`];
        p.textSize(23); lines.forEach((l, i) => p.text(l, W / 2, 215 + i * 44));
        p.fill(THEME.warn[0], THEME.warn[1], THEME.warn[2]); p.textSize(26); p.text("PRESS START TO PLAY", W / 2, 560);
      }
      function drawOver() {
        p.fill(0, 0, 0, 170); p.noStroke(); p.rect(0, 0, W, H);
        p.fill(250); p.stroke(80); p.strokeWeight(2); p.rect(262, 220, 500, 300, 10);
        p.noStroke(); p.fill(20); p.textAlign(p.CENTER, p.CENTER);
        p.textSize(38); p.text(endReason === "time_up" ? "TIME'S UP!" : "GAME OVER", W / 2, 280);
        p.textSize(26); p.text(`BANKED: ${bank} ${cfg.currency}`, W / 2, 345);
        p.textSize(22); p.text(`BEST STREAK: ${log.maxStreak}`, W / 2, 395);
        p.text(log.cashOuts === 0 ? "YOU NEVER CASHED OUT." : `CASHED OUT ${log.cashOuts} TIMES.`, W / 2, 435);
      }

      let testButtons = null;
      instanceApi.setTestButtons = (b) => { testButtons = b; };
      function drawTest() {
        if (!testButtons || !testButtons.list.length) return;
        const n = testButtons.list.length, bw = 210, gap = 20, total = n * bw + (n - 1) * gap; let x = (W - total) / 2; testButtons.rects = [];
        for (const b of testButtons.list) {
          p.stroke(60); p.strokeWeight(2); p.fill(testButtons.locked ? 60 : b.primary ? p.color(THEME.accent[0], THEME.accent[1], THEME.accent[2]) : 245); p.rect(x, 650, bw, 70, 8);
          p.noStroke(); p.fill(testButtons.locked ? 120 : b.primary ? 10 : 20); p.textSize(20); p.textAlign(p.CENTER, p.CENTER); p.text(b.label, x + bw / 2, 685);
          testButtons.rects.push({ id: b.id, x, y: 650, w: bw, h: 70 }); x += bw + gap;
        }
      }
      p.mousePressed = () => {
        if (!testButtons || testButtons.locked || !testButtons.rects) return;
        const mx = (p.mouseX - offX) / scaleF, my = (p.mouseY - offY) / scaleF;
        for (const r of testButtons.rects) if (mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h) return handle(r.id);
      };
      p.keyPressed = () => { let a = { h: "higher", l: "lower", c: "cash_out" }[p.key]; if (p.key === "Enter" || p.key === " ") a = state === "rules" ? "start" : null; if (a) handle(a); };
    };

    instance = new p5(sketch, container);
    return { end: (r) => instanceApi.end && instanceApi.end(r || "host_ended"), getSummary: () => instanceApi.getSummary && instanceApi.getSummary(), setTestButtons: (b) => instanceApi.setTestButtons && instanceApi.setTestButtons(b), destroy: () => { try { instance.remove(); } catch (e) {} } };
  }

  window.Games = window.Games || {};
  window.Games.higherLower = { meta: { id: "higherLower", title: "HIGHER OR LOWER", behaviors: ["risk", "default_acceptance", "social_proof", "greed"] }, defaults: DEFAULTS, profileRules: PROFILE_RULES, configFromProfile, create };

  if (!window.GAME_HOST) {
    window.addEventListener("load", () => {
      const holder = document.createElement("div"); holder.style.width = "100vw"; holder.style.height = "100vh"; document.body.style.margin = "0"; document.body.appendChild(holder);
      let handler = null, game = null, pending = null;
      const bridge = { onInput: (fn) => (handler = fn), emit: (type, data) => console.log("EVENT", type, JSON.stringify(data)), setControls: (list, opts) => { pending = { list, locked: opts.locked }; if (game) game.setTestButtons(pending); }, onEnd: (s) => console.log("SUMMARY", JSON.stringify(s, null, 2)) };
      const TEST_PROFILE = { susceptibility: "HIGH" };
      game = create(holder, configFromProfile(TEST_PROFILE), bridge);
      if (pending) game.setTestButtons(pending);
      window._game = game; window._send = (a) => handler && handler(a);
    });
  }
})();
