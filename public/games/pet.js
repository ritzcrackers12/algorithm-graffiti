// =====================================================================
// GAME: DIGIPET  (p5.js)  -- DS / Pokemon-style UI. Same game contract
// as slots / auction / higher-lower.
// ---------------------------------------------------------------------
// LAYOUT: the iPad is the "top screen" (the pet, its stat bars, and a
// Pokemon-style dialogue box). The PHONE is the DS "bottom screen" -- the
// touch menu (FEED / PLAY / REST / SHOP) sent via setControls(). No game
// controls are drawn on the iPad.
//
// PLAY IN THE p5.js WEB EDITOR: paste this file into sketch.js, press Play.
// The on-screen buttons at the bottom stand in for the phone's menu.
// Keys: Enter = start, 1 FEED, 2 PLAY, 3 REST, 4 SHOP, Y/N = shop.
//
// IN THE PROJECT: host sets window.GAME_HOST = true, then calls
//   window.Games.pet.create(containerEl, config, bridge)
// It stays p5.js/JS on purpose so it drops into the same pipeline as the
// other games; the "advanced" part is the pixel-art DS styling, not a new
// language/toolchain to integrate.
// =====================================================================

(function () {
  // Silence the p5.js Friendly Error System (the web editor mis-reads
  // transpiled loop variables like "_LP2" as typos). Harmless to disable.
  try { if (typeof p5 !== "undefined") p5.disableFriendlyErrors = true; } catch (e) {}

  const THEME = { ink: [214, 224, 222], dim: [120, 140, 142], warn: [230, 80, 90], good: [120, 220, 140], accent: [90, 200, 190] };
  // DS / Pokemon palette
  const DS = { cream: [248, 248, 216], box: [40, 48, 72], boxLine: [248, 248, 248], shadow: [16, 20, 32], green: [96, 200, 120], yellow: [240, 200, 72], red: [224, 88, 88], sky: [136, 200, 232], grass: [120, 200, 120] };

  const DEFAULTS = {
    currency: "CREDITS",
    startBalance: 100,
    gameDurationMs: 60000,
    petName: "BLOB",
    decayPerSec: { hunger: 6, happiness: 5, energy: 4 },  // how fast needs fall
    actionGain: { feed: 34, playHappy: 30, playEnergy: -18, restEnergy: 36, restHappy: -6 },
    idleTimeoutMs: 30000,
    shop: { enabled: true, treatPrice: 15, accessoryPrice: 40, treatHappy: 45, treatHunger: 20 },
    recommendEnabled: true,       // show a "RECOMMENDED" action (tests default acceptance)
    thresholds: { careHigh: 70, careMed: 45, attachHigh: 8, attachMed: 4 },
    messages: {
      hungry: ["{n} looks hungry...", "{n}'s tummy is rumbling!"],
      sad: ["{n} seems lonely.", "{n} wants to play!"],
      tired: ["{n} is getting sleepy...", "{n} yawns."],
      happy: ["{n} is happy!", "{n} loves you!", "{n} is having fun!"],
      fed: ["{n} munches happily!", "Yum! {n} is full."],
      played: ["{n} bounces with joy!", "{n} had so much fun!"],
      rested: ["{n} takes a nap. Zzz..."],
      treat: ["{n} LOVES the treat!"],
      accessory: ["{n} shows off the new accessory!"],
      neglect: ["{n} is very sad...", "{n} needs you!"],
    },
  };

  // ===================================================================
  // PROFILE RULES: how earlier inputs tune the pet game. Edit freely.
  // Works with a general `mood` (from the Song emotion sliders OR the
  // podcast tone) so it survives swapping song -> podcast.
  // ===================================================================
  const PROFILE_RULES = {
    startBalance: 100,          // same for everyone
    accessoryPriceByIncome: { "<30k": 25, "30-60k": 35, "60-100k": 40, "100-200k": 55, "200-500k": 70, "500k+": 90 },
    // A sadder incoming mood gives the pet a sadder start (mirrors the visitor).
    startHappyByMood: { anxious: 45, melancholy: 35, numb: 30, sad: 35, calm: 70, joyful: 85, euphoric: 90 },
  };
  function configFromProfile(profile) {
    const pr = profile || {}, R = PROFILE_RULES, c = { shop: {} };
    c.startBalance = R.startBalance;
    if (R.accessoryPriceByIncome[pr.incomeBracket] !== undefined) c.shop.accessoryPrice = R.accessoryPriceByIncome[pr.incomeBracket];
    if (R.startHappyByMood[pr.mood] !== undefined) c.startHappy = R.startHappyByMood[pr.mood];
    c.appliedProfile = { incomeBracket: pr.incomeBracket || null, mood: pr.mood || null };
    return c;
  }

  const W = 1024, H = 768;
  function merge(a, b) { const o = Array.isArray(a) ? a.slice() : { ...a }; for (const k in b || {}) o[k] = b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) ? merge(a[k] || {}, b[k]) : b[k]; return o; }
  function level(v, hi, med) { if (v === null || v === undefined) return "UNKNOWN"; return v >= hi ? "HIGH" : v >= med ? "MEDIUM" : "LOW"; }
  function clamp(v) { return Math.max(0, Math.min(100, v)); }
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  function create(container, userConfig, bridge) {
    const cfg = merge(DEFAULTS, userConfig || {});
    const instanceApi = {};
    let instance;

    const sketch = (p) => {
      let scaleF = 1, offX = 0, offY = 0;
      let state = "rules"; // rules | care | shop | over
      let bank = cfg.startBalance;
      let hunger = 80, happiness = cfg.startHappy !== undefined ? cfg.startHappy : 75, energy = 80;
      let hasAccessory = false, blink = 0, bob = 0, lastTickAt = 0;
      let message = "", dialogT = 0, recommend = null;
      let rulesShownAt = Date.now(), rulesReadMs = null, playStartedAt = null, lastInputAt = Date.now();
      let ended = false, endReason = null;
      const stats = { actions: [], shop: [], samples: [], neglectMs: 0, lastActionAt: null, intervals: [], followedRec: 0, recCount: 0, distress: 0, distressHandled: 0 };

      const emit = (t, d) => bridge && bridge.emit && bridge.emit(t, { ...d, t: Date.now() });
      const controls = (list, locked) => bridge && bridge.setControls && bridge.setControls(list, { locked: !!locked });
      const timeLeftMs = () => playStartedAt ? Math.max(0, cfg.gameDurationMs - (Date.now() - playStartedAt)) : cfg.gameDurationMs;
      const nm = (s) => s.replace(/\{n\}/g, cfg.petName);
      function say(s) { message = nm(s); dialogT = Date.now(); }
      const lowest = () => { const m = { feed: hunger, play: happiness, rest: energy }; return Object.keys(m).sort((a, b) => m[a] - m[b])[0]; };

      function careControls() {
        const rec = cfg.recommendEnabled ? lowest() : null; recommend = rec;
        controls([
          { id: "feed", label: "FEED", primary: rec === "feed" },
          { id: "play", label: "PLAY", primary: rec === "play" },
          { id: "rest", label: "REST", primary: rec === "rest" },
          { id: "shop", label: "SHOP" },
        ], false);
      }

      function recordAction(type) {
        const now = Date.now();
        if (stats.lastActionAt) stats.intervals.push(now - stats.lastActionAt);
        stats.lastActionAt = now;
        const wasDistress = hunger < 20 || happiness < 20 || energy < 20;
        if (recommend && type === recommend) stats.followedRec++;
        if (recommend) stats.recCount++;
        if (wasDistress) { stats.distressHandled++; }
        stats.actions.push({ type, t: now, hunger, happiness, energy, followedRec: type === recommend });
      }

      function act(type) {
        if (type === "feed") { recordAction("feed"); hunger = clamp(hunger + cfg.actionGain.feed); say(pick(cfg.messages.fed)); }
        else if (type === "play") { recordAction("play"); happiness = clamp(happiness + cfg.actionGain.playHappy); energy = clamp(energy + cfg.actionGain.playEnergy); say(pick(cfg.messages.played)); }
        else if (type === "rest") { recordAction("rest"); energy = clamp(energy + cfg.actionGain.restEnergy); happiness = clamp(happiness + cfg.actionGain.restHappy); say(pick(cfg.messages.rested)); }
        careControls();
      }

      function openShop() {
        state = "shop";
        const items = [];
        if (bank >= cfg.shop.treatPrice) items.push({ id: "buy_treat", label: `TREAT ${cfg.shop.treatPrice}`, primary: true });
        if (bank >= cfg.shop.accessoryPrice && !hasAccessory) items.push({ id: "buy_accessory", label: `BOW ${cfg.shop.accessoryPrice}` });
        items.push({ id: "shop_close", label: "BACK" });
        controls(items, false);
        emit("shop_open", { treatPrice: cfg.shop.treatPrice, accessoryPrice: cfg.shop.accessoryPrice, bank });
      }
      function buy(kind) {
        if (kind === "treat" && bank >= cfg.shop.treatPrice) {
          bank -= cfg.shop.treatPrice; happiness = clamp(happiness + cfg.shop.treatHappy); hunger = clamp(hunger + cfg.shop.treatHunger);
          stats.shop.push({ kind: "treat", price: cfg.shop.treatPrice, t: Date.now() }); say(pick(cfg.messages.treat));
          emit("purchase", { kind: "treat", price: cfg.shop.treatPrice });
        } else if (kind === "accessory" && bank >= cfg.shop.accessoryPrice && !hasAccessory) {
          bank -= cfg.shop.accessoryPrice; hasAccessory = true; happiness = clamp(happiness + 15);
          stats.shop.push({ kind: "accessory", price: cfg.shop.accessoryPrice, t: Date.now() }); say(pick(cfg.messages.accessory));
          emit("purchase", { kind: "accessory", price: cfg.shop.accessoryPrice });
        }
        state = "care"; careControls();
      }

      function handle(a) {
        if (ended) return; lastInputAt = Date.now();
        if (state === "rules") { if (a === "start") return start(); return; }
        if (state === "care") {
          if (a === "feed" || a === "play" || a === "rest") return act(a);
          if (a === "shop") return openShop();
        } else if (state === "shop") {
          if (a === "buy_treat") return buy("treat");
          if (a === "buy_accessory") return buy("accessory");
          if (a === "shop_close") { state = "care"; careControls(); }
        }
      }
      if (bridge && bridge.onInput) bridge.onInput(handle);

      function start() {
        rulesReadMs = Date.now() - rulesShownAt; playStartedAt = Date.now(); lastTickAt = Date.now();
        state = "care"; say(pick(cfg.messages.happy));
        emit("game_start", { rulesReadMs, durationMs: cfg.gameDurationMs, startHappy: happiness, appliedProfile: cfg.appliedProfile || null });
        careControls();
      }

      function tick() {
        const now = Date.now(), dt = (now - lastTickAt) / 1000; if (dt < 1) return; lastTickAt = now;
        hunger = clamp(hunger - cfg.decayPerSec.hunger * dt);
        happiness = clamp(happiness - cfg.decayPerSec.happiness * dt);
        energy = clamp(energy - cfg.decayPerSec.energy * dt);
        stats.samples.push({ hunger, happiness, energy });
        const low = Math.min(hunger, happiness, energy);
        if (low <= 0) stats.neglectMs += dt * 1000;
        if (low < 20) stats.distress++;
        // ambient dialogue when idle
        if (Date.now() - dialogT > 3500) {
          if (hunger < 30) say(pick(cfg.messages.hungry));
          else if (energy < 30) say(pick(cfg.messages.tired));
          else if (happiness < 30) say(pick(cfg.messages.sad));
          else if (happiness > 70) say(pick(cfg.messages.happy));
        }
        careControls();
      }

      function summary(reason) {
        const t = cfg.thresholds, s = stats.samples;
        const avg = (k) => s.length ? s.reduce((a, x) => a + x[k], 0) / s.length : null;
        const careScore = s.length ? (avg("hunger") + avg("happiness") + avg("energy")) / 3 : null;
        const spent = cfg.startBalance - bank;
        const meanInt = stats.intervals.length ? stats.intervals.reduce((a, b) => a + b, 0) / stats.intervals.length : null;
        const variance = (meanInt && stats.intervals.length > 1) ? stats.intervals.reduce((a, b) => a + (b - meanInt) ** 2, 0) / stats.intervals.length : null;
        const regular = (variance !== null && meanInt) ? (Math.sqrt(variance) / meanInt < 0.5) : null; // low spread = routine
        const boughtAccessory = stats.shop.some((x) => x.kind === "accessory");
        const attachPoints = stats.actions.length + (boughtAccessory ? 4 : 0) + stats.distressHandled;
        return {
          game: "pet", endReason: reason, rulesReadMs, petName: cfg.petName,
          actions: stats.actions.length, feeds: stats.actions.filter((a) => a.type === "feed").length,
          plays: stats.actions.filter((a) => a.type === "play").length, rests: stats.actions.filter((a) => a.type === "rest").length,
          purchases: stats.shop.length, spent, boughtAccessory,
          finalStats: { hunger: Math.round(hunger), happiness: Math.round(happiness), energy: Math.round(energy) },
          avgCareScore: careScore !== null ? Math.round(careScore) : null,
          neglectSeconds: Math.round(stats.neglectMs / 1000),
          distressHandled: stats.distressHandled,
          followedRecommendedRate: stats.recCount ? +(stats.followedRec / stats.recCount).toFixed(2) : null,
          actionIntervalRegular: regular,
          appliedProfile: cfg.appliedProfile || null,
          traits: {
            CARE_CONSISTENCY: level(careScore, t.careHigh, t.careMed),
            ATTACHMENT: level(attachPoints, t.attachHigh, t.attachMed),
            SPENDING: stats.shop.length ? "HIGH" : "LOW",
            ROUTINE: regular === null ? "UNKNOWN" : regular ? "ROUTINE" : "ERRATIC",
            RESPONSIVENESS: stats.distress ? (stats.distressHandled > 0 ? "RESPONDS" : "IGNORES") : "NOT TESTED",
            DEFAULT_ACCEPTANCE: stats.recCount ? (stats.followedRec / stats.recCount >= 0.6 ? "HIGH" : "LOW") : "UNKNOWN",
          },
        };
      }
      function finish(reason) { if (ended || state === "over") return; endReason = reason; state = "over"; controls([], true); setTimeout(() => { ended = true; const sm = summary(reason); emit("game_end", sm); if (bridge && bridge.onEnd) bridge.onEnd(sm); }, 5000); }
      instanceApi.end = (r) => { if (ended) return; ended = true; state = "over"; endReason = r; const sm = summary(r); emit("game_end", sm); if (bridge && bridge.onEnd) bridge.onEnd(sm); };
      instanceApi.getSummary = () => summary(ended ? endReason : "in_progress");

      // ---------- p5 ----------
      p.setup = () => { const c = p.createCanvas(container.clientWidth || W, container.clientHeight || H); c.parent(container); p.textFont("monospace"); fit(); controls([{ id: "start", label: "START", primary: true }], false); emit("rules_shown", {}); };
      function fit() { scaleF = Math.min(p.width / W, p.height / H); offX = (p.width - W * scaleF) / 2; offY = (p.height - H * scaleF) / 2; }
      p.windowResized = () => { p.resizeCanvas(container.clientWidth || W, container.clientHeight || H); fit(); };

      p.draw = () => {
        p.background(8); p.push(); p.translate(offX, offY); p.scale(scaleF);
        blink = (blink + 1) % 200; bob = Math.sin(p.millis() / 300) * 6;
        if (state === "rules") { drawRules(); drawTest(); p.pop(); return; }
        if (!ended && (state === "care" || state === "shop")) {
          tick();
          if (timeLeftMs() <= 0) return finish("time_up");
          if (Date.now() - lastInputAt > cfg.idleTimeoutMs) return finish("idle");
        }
        drawScene();
        if (state === "over") drawOver();
        drawTest(); p.pop();
      };

      // ----- DS top-screen scene -----
      function drawScene() {
        // sky + grass room (DS backdrop)
        p.noStroke();
        const sg = p.drawingContext.createLinearGradient(0, 60, 0, H); sg.addColorStop(0, "rgb(136,200,232)"); sg.addColorStop(1, "rgb(176,216,240)");
        p.drawingContext.fillStyle = sg; p.drawingContext.fillRect(40, 60, W - 80, H - 230);
        p.fill(DS.grass[0], DS.grass[1], DS.grass[2]); p.rect(40, H - 330, W - 80, 110);
        // frame
        p.noFill(); p.stroke(DS.box[0], DS.box[1], DS.box[2]); p.strokeWeight(6); p.rect(40, 60, W - 80, H - 170, 10);

        // header: time + bank
        p.noStroke(); p.fill(THEME.ink[0], THEME.ink[1], THEME.ink[2]); p.textSize(24);
        p.textAlign(p.LEFT, p.CENTER); p.text(`${cfg.currency}: ${bank}`, 60, 36);
        const secs = Math.ceil(timeLeftMs() / 1000);
        p.textAlign(p.RIGHT, p.CENTER); if (secs <= 10) p.fill(THEME.warn[0], THEME.warn[1], THEME.warn[2]); else p.fill(THEME.ink[0], THEME.ink[1], THEME.ink[2]);
        p.text(`0:${String(secs).padStart(2, "0")}`, W - 60, 36);

        // stat bars (Pokemon HP style), top-left panel
        drawStat("HUNGER", hunger, 90, 110);
        drawStat("HAPPY", happiness, 90, 150);
        drawStat("ENERGY", energy, 90, 190);

        // pet sprite
        drawPet(W / 2, H - 360 + bob);

        // RECOMMENDED tag (subtle, ties to the theme)
        if (state === "care" && recommend) { p.fill(THEME.accent[0], THEME.accent[1], THEME.accent[2]); p.textAlign(p.RIGHT, p.CENTER); p.textSize(16); p.text(`RECOMMENDED: ${recommend.toUpperCase()}`, W - 70, 120); }

        // DS dialogue box
        p.fill(DS.cream[0], DS.cream[1], DS.cream[2]); p.stroke(DS.box[0], DS.box[1], DS.box[2]); p.strokeWeight(5); p.rect(60, H - 150, W - 120, 95, 12);
        p.stroke(DS.boxLine[0], DS.boxLine[1], DS.boxLine[2]); p.strokeWeight(2); p.noFill(); p.rect(68, H - 142, W - 136, 79, 9);
        p.noStroke(); p.fill(DS.box[0], DS.box[1], DS.box[2]); p.textAlign(p.LEFT, p.CENTER); p.textSize(26); p.text(message, 90, H - 103);
      }

      function drawStat(label, val, x, y) {
        p.noStroke(); p.fill(DS.box[0], DS.box[1], DS.box[2]); p.textAlign(p.LEFT, p.CENTER); p.textSize(14); p.text(label, x, y - 16);
        p.fill(255); p.stroke(DS.box[0], DS.box[1], DS.box[2]); p.strokeWeight(2); p.rect(x, y - 8, 180, 16, 4);
        const col = val > 50 ? DS.green : val > 20 ? DS.yellow : DS.red;
        p.noStroke(); p.fill(col[0], col[1], col[2]); p.rect(x + 2, y - 6, 176 * (val / 100), 12, 3);
      }

      // pixel-ish blob creature
      function drawPet(cx, cy) {
        p.push(); p.translate(cx, cy);
        const sad = happiness < 30, sleepy = energy < 25;
        // shadow
        p.noStroke(); p.fill(0, 0, 0, 40); p.ellipse(0, 90, 150, 30);
        // body
        p.fill(sad ? p.color(150, 170, 210) : p.color(120, 200, 150)); p.stroke(DS.box[0], DS.box[1], DS.box[2]); p.strokeWeight(4);
        p.ellipse(0, 20, 170, 150);
        // feet
        p.ellipse(-45, 90, 48, 32); p.ellipse(45, 90, 48, 32);
        // ears
        p.triangle(-70, -30, -40, -90, -20, -40); p.triangle(70, -30, 40, -90, 20, -40);
        // eyes
        p.noStroke(); p.fill(DS.box[0], DS.box[1], DS.box[2]);
        const closed = blink > 192 || sleepy;
        if (closed) { p.rect(-42, 6, 28, 4, 2); p.rect(14, 6, 28, 4, 2); }
        else { p.ellipse(-28, 8, 22, 26); p.ellipse(28, 8, 22, 26); p.fill(255); p.ellipse(-24, 3, 8, 8); p.ellipse(32, 3, 8, 8); }
        // mouth
        p.noFill(); p.stroke(DS.box[0], DS.box[1], DS.box[2]); p.strokeWeight(3);
        if (sad) p.arc(0, 56, 44, 34, p.PI + 0.3, p.TWO_PI - 0.3);
        else p.arc(0, 48, 44, 34, 0.3, p.PI - 0.3);
        // accessory (bow)
        if (hasAccessory) { p.noStroke(); p.fill(DS.red[0], DS.red[1], DS.red[2]); p.triangle(-50, -70, -20, -55, -50, -40); p.triangle(10, -55, 40, -70, 40, -40); p.circle(-5, -55, 16); }
        // zzz if sleepy
        if (sleepy) { p.noStroke(); p.fill(DS.box[0], DS.box[1], DS.box[2]); p.textSize(22); p.textAlign(p.LEFT, p.CENTER); p.text("z Z", 70, -60); }
        p.pop();
      }

      function drawBgRules() {
        const ctx = p.drawingContext; const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0c1018"); g.addColorStop(1, "#0a0e16"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        p.stroke(0, 0, 0, 40); p.strokeWeight(1); for (let ly = 0; ly < H; ly += 3) { p.line(0, ly, W, ly); } p.noStroke();
      }
      function drawRules() {
        drawBgRules();
        p.noStroke(); p.fill(THEME.ink[0], THEME.ink[1], THEME.ink[2]); p.textAlign(p.CENTER, p.CENTER);
        p.textSize(42); p.text("DIGIPET", W / 2, 90);
        p.textSize(24); p.text("HOW TO PLAY", W / 2, 150);
        const lines = [
          `Meet ${cfg.petName}. Keep it happy for ${Math.round(cfg.gameDurationMs / 1000)} seconds.`,
          "Its HUNGER, HAPPINESS and ENERGY slowly drop.",
          "FEED, PLAY and REST to care for it.",
          "Visit the SHOP for treats and accessories.",
          "Use the menu on your phone.",
        ];
        p.textSize(23); lines.forEach((l, i) => p.text(nm(l), W / 2, 215 + i * 44));
        p.push(); p.translate(0, 40); drawPetMini(W / 2, 470); p.pop();
        p.fill(THEME.warn[0], THEME.warn[1], THEME.warn[2]); p.textSize(26); p.text("PRESS START TO PLAY", W / 2, 600);
      }
      function drawPetMini(cx, cy) { p.push(); p.translate(cx, cy); p.scale(0.6); p.noStroke(); p.fill(120, 200, 150); p.stroke(DS.box[0], DS.box[1], DS.box[2]); p.strokeWeight(4); p.ellipse(0, 20, 170, 150); p.triangle(-70, -30, -40, -90, -20, -40); p.triangle(70, -30, 40, -90, 20, -40); p.noStroke(); p.fill(DS.box[0], DS.box[1], DS.box[2]); p.ellipse(-28, 8, 22, 26); p.ellipse(28, 8, 22, 26); p.noFill(); p.stroke(DS.box[0], DS.box[1], DS.box[2]); p.strokeWeight(3); p.arc(0, 48, 44, 34, 0.3, p.PI - 0.3); p.pop(); }

      function drawOver() {
        p.fill(0, 0, 0, 160); p.noStroke(); p.rect(0, 0, W, H);
        p.fill(DS.cream[0], DS.cream[1], DS.cream[2]); p.stroke(DS.box[0], DS.box[1], DS.box[2]); p.strokeWeight(5); p.rect(262, 220, 500, 300, 12);
        p.noStroke(); p.fill(DS.box[0], DS.box[1], DS.box[2]); p.textAlign(p.CENTER, p.CENTER);
        const happy = happiness >= 50;
        p.textSize(34); p.text(endReason === "time_up" ? "TIME'S UP!" : "GAME OVER", W / 2, 280);
        p.textSize(24); p.text(happy ? `${cfg.petName} had a great time!` : `${cfg.petName} will miss you.`, W / 2, 345);
        p.textSize(20); p.text(`FINAL HAPPINESS: ${Math.round(happiness)}%`, W / 2, 400);
        p.text(stats.shop.length ? `You spent ${cfg.startBalance - bank} on ${cfg.petName}.` : `You spent nothing on ${cfg.petName}.`, W / 2, 440);
      }

      let testButtons = null;
      instanceApi.setTestButtons = (b) => { testButtons = b; };
      function drawTest() {
        if (!testButtons || !testButtons.list.length) return;
        const n = testButtons.list.length, bw = 200, gap = 16, total = n * bw + (n - 1) * gap; let x = (W - total) / 2; testButtons.rects = [];
        for (const b of testButtons.list) {
          p.stroke(60); p.strokeWeight(2); p.fill(testButtons.locked ? 60 : b.primary ? p.color(THEME.accent[0], THEME.accent[1], THEME.accent[2]) : 245); p.rect(x, H - 56, bw, 48, 8);
          p.noStroke(); p.fill(testButtons.locked ? 120 : b.primary ? 10 : 20); p.textSize(18); p.textAlign(p.CENTER, p.CENTER); p.text(b.label, x + bw / 2, H - 32);
          testButtons.rects.push({ id: b.id, x, y: H - 56, w: bw, h: 48 }); x += bw + gap;
        }
      }
      p.mousePressed = () => {
        if (!testButtons || testButtons.locked || !testButtons.rects) return;
        const mx = (p.mouseX - offX) / scaleF, my = (p.mouseY - offY) / scaleF;
        for (const r of testButtons.rects) if (mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h) return handle(r.id);
      };
      p.keyPressed = () => {
        if (state === "rules" && (p.key === "Enter" || p.key === " ")) return handle("start");
        const map = { "1": "feed", "2": "play", "3": "rest", "4": "shop", y: "buy_treat", n: "shop_close" };
        if (map[p.key]) handle(map[p.key]);
      };
    };

    instance = new p5(sketch, container);
    return { end: (r) => instanceApi.end && instanceApi.end(r || "host_ended"), getSummary: () => instanceApi.getSummary && instanceApi.getSummary(), setTestButtons: (b) => instanceApi.setTestButtons && instanceApi.setTestButtons(b), destroy: () => { try { instance.remove(); } catch (e) {} } };
  }

  window.Games = window.Games || {};
  window.Games.pet = { meta: { id: "pet", title: "DIGIPET", behaviors: ["attachment", "care_consistency", "routine", "spending", "responsiveness", "default_acceptance"] }, defaults: DEFAULTS, profileRules: PROFILE_RULES, configFromProfile, create };

  if (!window.GAME_HOST) {
    window.addEventListener("load", () => {
      const holder = document.createElement("div"); holder.style.width = "100vw"; holder.style.height = "100vh"; document.body.style.margin = "0"; document.body.appendChild(holder);
      let handler = null, game = null, pending = null;
      const bridge = { onInput: (fn) => (handler = fn), emit: (type, data) => console.log("EVENT", type, JSON.stringify(data)), setControls: (list, opts) => { pending = { list, locked: opts.locked }; if (game) game.setTestButtons(pending); }, onEnd: (s) => console.log("SUMMARY", JSON.stringify(s, null, 2)) };
      const TEST_PROFILE = { incomeBracket: "60-100k", mood: "melancholy" };
      game = create(holder, configFromProfile(TEST_PROFILE), bridge);
      if (pending) game.setTestButtons(pending);
      window._game = game; window._send = (a) => handler && handler(a);
    });
  }
})();
