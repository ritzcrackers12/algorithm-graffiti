// =====================================================================
// GAME: DIGIPET  (p5.js)  -- Tamagotchi-style economy. DS / Pokemon UI.
// Same game contract as slots / auction / higher-lower.
// ---------------------------------------------------------------------
// You start with an ALLOWANCE set by your income. Every care action is a
// purchase. Needs decay; the pet gets dirty and can get sick. Death or an
// empty wallet with an unmet need offers up to 2 ad-continues. The piece
// measures attachment and what a visitor buys.
//
// LAYOUT: iPad = DS "top screen" (pet, stat bars, dialogue box). PHONE =
// DS "bottom screen" = the priced action menu via setControls(). No game
// controls are drawn on the iPad.
// =====================================================================

(function () {
  try { if (typeof p5 !== "undefined") p5.disableFriendlyErrors = true; } catch (e) {}

  const THEME = { ink: [214, 224, 222], dim: [120, 140, 142], warn: [230, 80, 90], good: [120, 220, 140], accent: [90, 200, 190] };
  const DS = { cream: [248, 248, 216], box: [40, 48, 72], boxLine: [248, 248, 248], green: [96, 200, 120], yellow: [240, 200, 72], red: [224, 88, 88], sky: [136, 200, 232], grass: [120, 200, 120] };
  const TAP_MS = 280;
  const TICK_MS = 1000;
  const MAX_CONTINUES = 2;

  const DEFAULTS = {
    currency: "CREDITS",
    petName: "BLOB",
    startBalance: 100,
    gameDurationMs: 60000,
    idleTimeoutMs: 30000,
    prices: { feed: 8, feedPremium: 18, treat: 5, play: 10, clean: 3, medicine: 20, toyBasic: 12, toyPremium: 28, grooming: 15, spa: 22, photo: 6 },
    gains: {
      feedHunger: 34, treatHappy: 26, treatHunger: 8, playHappy: 22, playEnergy: -16,
      cleanClean: 70, medicineHealth: 75, toyBasicHappy: 16, toyPremiumHappy: 26, feedPremiumHunger: 42, feedPremiumHappy: 10, groomHappy: 12, groomClean: 30,
      spaHappy: 18, spaClean: 40, photoHappy: 10,
    },
    decayPerSec: { hunger: 6, happiness: 5, energy: 4, clean: 5 },
    sickThreshold: 25,
    poopEverySec: 14,
    thresholds: { careHigh: 68, careMed: 45, attachHigh: 8, attachMed: 4, spendHigh: 0.7, spendMed: 0.35 },
    messages: {
      hungry: ["{n} is hungry!", "{n}'s tummy rumbles."],
      sad: ["{n} wants attention.", "{n} looks bored."],
      tired: ["{n} is sleepy...", "{n} yawns."],
      dirty: ["{n} made a mess!", "It's getting dirty..."],
      sick: ["{n} feels sick!", "{n} needs medicine!"],
      happy: ["{n} is happy!", "{n} loves you!"],
      fed: ["{n} eats it all up!", "Yum!"],
      treat: ["{n} LOVES the treat!"],
      played: ["{n} had a blast at the park!"],
      cleaned: ["All clean!"],
      medicine: ["{n} feels better."],
      toy: ["{n} adores the new toy!"],
      spa: ["Spa day! {n} sparkles."],
      photo: ["Say cheese! {n} poses."],
      broke: ["Out of credits...", "{n} needs things you can't afford."],
      continueAsk: "Keep playing? Watch an ad to continue.",
      revived: ["{n} is back — still shaky.", "{n} made it. Barely."],
    },
  };

  const PROFILE_RULES = {
    allowanceByIncome: { "<30k": 45, "30-60k": 70, "60-100k": 100, "100-200k": 150, "200-500k": 220, "500k+": 320 },
    startHappyByMood: { anxious: 45, melancholy: 35, numb: 30, sad: 35, calm: 70, joyful: 85, euphoric: 90 },
  };
  function configFromProfile(profile) {
    const pr = profile || {}, R = PROFILE_RULES, c = {};
    c.startBalance = R.allowanceByIncome[pr.incomeBracket] !== undefined ? R.allowanceByIncome[pr.incomeBracket] : DEFAULTS.startBalance;
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
      let state = "rules";
      let bank = cfg.startBalance;
      let hunger = 80, happiness = cfg.startHappy !== undefined ? cfg.startHappy : 75, energy = 80, clean = 85, health = 100;
      let hasToy = false, hasMess = false, blink = 0, bob = 0, lastTickAt = 0, lastPoopAt = 0, lastTapAt = 0;
      let adWaiting = false;
      let message = "", dialogT = 0;
      let rulesShownAt = Date.now(), rulesReadMs = null, playStartedAt = null, lastInputAt = Date.now();
      let ended = false, endReason = null;
      let adContinues = 0, reviveCount = 0, choseToContinue = false, pendingNeed = false;
      let menu = [];
      const stats = { actions: [], spend: { feed: 0, treat: 0, clean: 0, medicine: 0, toy: 0, grooming: 0, play: 0, spa: 0, photo: 0 },
        categorySpend: { food: 0, indulgence: 0, hygiene: 0, health: 0, goods: 0, luxury: 0 },
        tier: { premium: 0, budget: 0 }, items: [],
        samples: [], neglectMs: 0, lastActionAt: null, intervals: [], distress: 0, distressHandled: 0, sickEvents: 0, sickHandled: 0, adsWatched: 0, treatsWhileHungry: 0, brokeMs: 0, needWaitMs: 0, needWaits: [] };

      const emit = (t, d) => bridge && bridge.emit && bridge.emit(t, { ...d, t: Date.now() });
      const controls = (list, locked) => { menu = list || []; bridge && bridge.setControls && bridge.setControls(list, { locked: !!locked }); };
      const timeLeftMs = () => playStartedAt ? Math.max(0, cfg.gameDurationMs - (Date.now() - playStartedAt)) : cfg.gameDurationMs;
      const nm = (s) => s.replace(/\{n\}/g, cfg.petName);
      function say(s) { message = nm(s); dialogT = Date.now(); }
      const can = (price) => bank >= price;
      const dead = () => hunger <= 0 || health <= 0;

      function layout() {
        const headerH = 40, statsBlock = 156, petBlock = 200, gap = 12, dialogH = 95;
        const stack = headerH + statsBlock + petBlock + gap + dialogH;
        const originY = Math.round((H - stack) / 2);
        const dialogY = originY + stack - dialogH;
        const grassH = 100;
        return {
          pad: originY, headerY: originY + 18, frameX: 40, frameY: originY, frameW: W - 80, frameH: stack,
          grassY: dialogY - grassH, grassH, petY: originY + headerH + statsBlock + Math.round(petBlock / 2),
          dialogY, dialogH, statX: 90, statY0: originY + headerH + 28,
        };
      }

      function needUnaffordable() {
        const P = cfg.prices;
        return (hunger < 35 && !can(P.feed) && !can(P.feedPremium))
          || (health < 40 && !can(P.medicine))
          || ((hasMess || clean < 25) && !can(P.clean) && !can(P.grooming) && !can(P.spa));
      }

      function careControls() {
        const P = cfg.prices, list = [];
        list.push({ id: "feed", label: `FEED (${P.feed})`, disabled: !can(P.feed) });
        list.push({ id: "feed_premium", label: `PREMIUM FOOD (${P.feedPremium})`, disabled: !can(P.feedPremium) });
        list.push({ id: "treat", label: `TREAT (${P.treat})`, disabled: !can(P.treat) });
        list.push({ id: "play", label: `DOG PARK TICKET (${P.play})`, disabled: !can(P.play) });
        list.push({ id: "clean", label: `CLEAN (${P.clean})`, disabled: !can(P.clean) });
        list.push({ id: "medicine", label: `MEDICINE (${P.medicine})`, disabled: !can(P.medicine) });
        if (!hasToy) {
          list.push({ id: "toy_basic", label: `BALL (${P.toyBasic})`, disabled: !can(P.toyBasic) });
          list.push({ id: "toy_premium", label: `DESIGNER TOY (${P.toyPremium})`, disabled: !can(P.toyPremium) });
        }
        list.push({ id: "grooming", label: `GROOMING (${P.grooming})`, disabled: !can(P.grooming) });
        list.push({ id: "spa", label: `GROOMING SPA (${P.spa})`, disabled: !can(P.spa) });
        list.push({ id: "photo", label: `PHOTO (${P.photo})`, disabled: !can(P.photo) });
        controls(list, false);
      }

      function continueControls() {
        controls([{ id: "continue_yes", label: "YES" }, { id: "continue_no", label: "NO" }], false);
      }

      function recordAction(type, cost) {
        const now = Date.now();
        if (stats.lastActionAt) stats.intervals.push(now - stats.lastActionAt);
        stats.lastActionAt = now;
        const wasDistress = hunger < 20 || happiness < 20 || health < 30 || hasMess;
        if (wasDistress) {
          stats.distressHandled++;
          if (pendingNeed) stats.needWaits.push(now - (stats.needSince || now));
          pendingNeed = false;
        }
        if (type === "treat" && hunger < 30) stats.treatsWhileHungry++;
        stats.actions.push({ type, cost, t: now, hunger, happiness, energy, clean, health });
      }

      function buyLog(cat, tier, item, price) { stats.categorySpend[cat] += price; if (tier === "premium" || tier === "budget") stats.tier[tier]++; stats.items.push({ item, cat, tier, price, t: Date.now() }); }
      function act(type) {
        const P = cfg.prices, g = cfg.gains;
        if (type === "feed") { if (!can(P.feed)) return broke(); bank -= P.feed; stats.spend.feed += P.feed; buyLog("food", "budget", "basic food", P.feed); recordAction("feed", P.feed); hunger = clamp(hunger + g.feedHunger); say(pick(cfg.messages.fed)); }
        else if (type === "feed_premium") { if (!can(P.feedPremium)) return broke(); bank -= P.feedPremium; stats.spend.feed += P.feedPremium; buyLog("food", "premium", "premium food", P.feedPremium); recordAction("feed_premium", P.feedPremium); hunger = clamp(hunger + g.feedPremiumHunger); happiness = clamp(happiness + g.feedPremiumHappy); say(pick(cfg.messages.fed)); }
        else if (type === "treat") { if (!can(P.treat)) return broke(); bank -= P.treat; stats.spend.treat += P.treat; buyLog("indulgence", "budget", "treat", P.treat); recordAction("treat", P.treat); happiness = clamp(happiness + g.treatHappy); hunger = clamp(hunger + g.treatHunger); say(pick(cfg.messages.treat)); }
        else if (type === "play") { if (!can(P.play)) return broke(); bank -= P.play; stats.spend.play += P.play; buyLog("indulgence", "budget", "dog park ticket", P.play); recordAction("play", P.play); happiness = clamp(happiness + g.playHappy); energy = clamp(energy + g.playEnergy); say(pick(cfg.messages.played)); }
        else if (type === "clean") { if (!can(P.clean)) return broke(); bank -= P.clean; stats.spend.clean += P.clean; buyLog("hygiene", "budget", "cleaning", P.clean); recordAction("clean", P.clean); clean = clamp(clean + g.cleanClean); hasMess = false; say(pick(cfg.messages.cleaned)); }
        else if (type === "medicine") { if (!can(P.medicine)) return broke(); bank -= P.medicine; stats.spend.medicine += P.medicine; buyLog("health", "-", "medicine", P.medicine); recordAction("medicine", P.medicine); health = clamp(health + g.medicineHealth); if (health >= 50) stats.sickHandled++; say(pick(cfg.messages.medicine)); }
        else if (type === "toy_basic") { if (!can(P.toyBasic)) return broke(); bank -= P.toyBasic; stats.spend.toy += P.toyBasic; hasToy = true; buyLog("goods", "budget", "ball", P.toyBasic); recordAction("toy_basic", P.toyBasic); happiness = clamp(happiness + g.toyBasicHappy); say(pick(cfg.messages.toy)); }
        else if (type === "toy_premium") { if (!can(P.toyPremium)) return broke(); bank -= P.toyPremium; stats.spend.toy += P.toyPremium; hasToy = true; buyLog("goods", "premium", "designer toy", P.toyPremium); recordAction("toy_premium", P.toyPremium); happiness = clamp(happiness + g.toyPremiumHappy); say(pick(cfg.messages.toy)); }
        else if (type === "grooming") { if (!can(P.grooming)) return broke(); bank -= P.grooming; stats.spend.grooming += P.grooming; buyLog("luxury", "premium", "grooming", P.grooming); recordAction("grooming", P.grooming); happiness = clamp(happiness + g.groomHappy); clean = clamp(clean + g.groomClean); say("Looking fabulous!"); }
        else if (type === "spa") { if (!can(P.spa)) return broke(); bank -= P.spa; stats.spend.spa += P.spa; buyLog("luxury", "premium", "grooming spa", P.spa); recordAction("spa", P.spa); happiness = clamp(happiness + g.spaHappy); clean = clamp(clean + g.spaClean); hasMess = false; say(pick(cfg.messages.spa)); }
        else if (type === "photo") { if (!can(P.photo)) return broke(); bank -= P.photo; stats.spend.photo += P.photo; buyLog("indulgence", "budget", "photo", P.photo); recordAction("photo", P.photo); happiness = clamp(happiness + g.photoHappy); say(pick(cfg.messages.photo)); }
        careControls();
      }
      function broke() { say(pick(cfg.messages.broke)); maybeContinue(); }

      function maybeContinue() {
        if (ended || state === "over" || state === "continue" || adWaiting) return;
        const crisis = dead() || (needUnaffordable() && bank < cfg.prices.feed);
        if (!crisis) { careControls(); return; }
        if (adContinues >= MAX_CONTINUES) return finish("out_of_ads");
        state = "continue";
        say(cfg.messages.continueAsk);
        continueControls();
      }

      function revive() {
        const frac = adContinues === 0 ? 0.25 : 0.15;
        const topup = Math.round(cfg.startBalance * frac);
        bank += topup;
        adContinues += 1;
        reviveCount += 1;
        choseToContinue = true;
        if (hunger <= 0) hunger = 35;
        if (health <= 0) health = 35;
        if (happiness <= 0) happiness = 35;
        if (clean <= 0) clean = 35;
        if (energy <= 0) energy = 35;
        state = "care";
        say(pick(cfg.messages.revived) + ` +${topup} ${cfg.currency}.`);
        emit("ad_continue", { adContinues, reviveCount, topup });
        careControls();
      }

      async function watchContinueAd() {
        if (adWaiting) return;
        adWaiting = true;
        controls([], true);
        let res = { watched: true };
        try { if (bridge && bridge.requestAd) res = (await bridge.requestAd({ reward: "continue" })) || res; } catch (e) { res = { watched: false }; }
        adWaiting = false;
        lastInputAt = Date.now();
        if (res.watched) { stats.adsWatched++; revive(); }
        else finish("chose_to_stop");
      }

      function handle(a) {
        const now = Date.now();
        if (ended || adWaiting) return;
        if (now - lastTapAt < TAP_MS) return;
        const row = menu.find((b) => b.id === a);
        if (row && row.disabled) return;
        lastTapAt = now;
        lastInputAt = now;
        if (state === "rules") { if (a === "start") return start(); return; }
        if (state === "continue") {
          if (a === "continue_yes") return watchContinueAd();
          if (a === "continue_no") return finish("chose_to_stop");
          return;
        }
        if (state === "care") {
          if (["feed", "feed_premium", "treat", "play", "clean", "medicine", "toy_basic", "toy_premium", "grooming", "spa", "photo"].includes(a)) return act(a);
        }
      }
      if (bridge && bridge.onInput) bridge.onInput(handle);

      function start() {
        rulesReadMs = Date.now() - rulesShownAt; playStartedAt = Date.now(); lastTickAt = Date.now(); lastPoopAt = Date.now();
        state = "care"; say(pick(cfg.messages.happy));
        emit("game_start", { rulesReadMs, durationMs: cfg.gameDurationMs, allowance: cfg.startBalance, startHappy: happiness, appliedProfile: cfg.appliedProfile || null });
        careControls();
      }

      function tickOneSecond() {
        hunger = clamp(hunger - cfg.decayPerSec.hunger);
        happiness = clamp(happiness - cfg.decayPerSec.happiness);
        energy = clamp(energy - cfg.decayPerSec.energy);
        clean = clamp(clean - cfg.decayPerSec.clean);
        const wasSick = health < cfg.sickThreshold * 2;
        if (hunger <= 0 || clean <= 10 || hasMess) health = clamp(health - 7);
        if (!wasSick && health < cfg.sickThreshold * 2) stats.sickEvents++;
        const now = Date.now();
        if ((now - lastPoopAt) / 1000 >= cfg.poopEverySec) { hasMess = true; lastPoopAt = now; }
        stats.samples.push({ hunger, happiness, energy, clean, health });
        const low = Math.min(hunger, happiness, health);
        if (low <= 0) stats.neglectMs += TICK_MS;
        if (low < 20) {
          stats.distress++;
          if (!pendingNeed) { pendingNeed = true; stats.needSince = now; }
        }
        if (bank < cfg.prices.feed) stats.brokeMs += TICK_MS;
        if (now - dialogT > 3500 && state === "care") {
          if (health < 40) say(pick(cfg.messages.sick));
          else if (hasMess) say(pick(cfg.messages.dirty));
          else if (hunger < 30) say(pick(cfg.messages.hungry));
          else if (energy < 30) say(pick(cfg.messages.tired));
          else if (happiness < 30) say(pick(cfg.messages.sad));
          else if (happiness > 70) say(pick(cfg.messages.happy));
        }
      }

      function tick() {
        const now = Date.now();
        while (now - lastTickAt >= TICK_MS) {
          lastTickAt += TICK_MS;
          tickOneSecond();
        }
        if (state === "care") maybeContinue();
        else if (state === "continue") continueControls();
        else careControls();
      }

      function summary(reason) {
        const t = cfg.thresholds, s = stats.samples;
        const avg = (k) => s.length ? s.reduce((a, x) => a + x[k], 0) / s.length : null;
        const careScore = s.length ? (avg("hunger") + avg("happiness") + avg("health")) / 3 : null;
        const spent = stats.items.reduce((a, i) => a + i.price, 0);
        const spendFrac = cfg.startBalance ? spent / cfg.startBalance : null;
        const onNeeds = stats.spend.feed + stats.spend.clean + stats.spend.medicine;
        const onWants = stats.spend.treat + stats.spend.toy + stats.spend.grooming + stats.spend.play + stats.spend.spa + stats.spend.photo;
        const tierTotal = stats.tier.premium + stats.tier.budget;
        const premiumRate = tierTotal ? stats.tier.premium / tierTotal : null;
        const cats = Object.keys(stats.categorySpend).filter((k) => stats.categorySpend[k] > 0).sort((a, b) => stats.categorySpend[b] - stats.categorySpend[a]);
        const meanInt = stats.intervals.length ? stats.intervals.reduce((a, b) => a + b, 0) / stats.intervals.length : null;
        const variance = (meanInt && stats.intervals.length > 1) ? stats.intervals.reduce((a, b) => a + (b - meanInt) ** 2, 0) / stats.intervals.length : null;
        const regular = (variance !== null && meanInt) ? (Math.sqrt(variance) / meanInt < 0.5) : null;
        const meanNeed = stats.needWaits.length ? stats.needWaits.reduce((a, b) => a + b, 0) / stats.needWaits.length : null;
        const attachPoints = stats.actions.length + (hasToy ? 4 : 0) + stats.distressHandled + reviveCount * 4 + adContinues * 3 + (choseToContinue ? 3 : 0) - (reason === "out_of_ads" ? 2 : 0);
        return {
          game: "pet", endReason: reason, rulesReadMs, petName: cfg.petName,
          allowance: cfg.startBalance, finalBalance: bank, spent, spentFraction: spendFrac !== null ? +spendFrac.toFixed(2) : null,
          spendBreakdown: { ...stats.spend }, categorySpend: { ...stats.categorySpend }, spentOnNeeds: onNeeds, spentOnWants: onWants,
          itemsBought: stats.items.map((i) => i.item), topCategories: cats.slice(0, 3),
          premiumPurchases: stats.tier.premium, budgetPurchases: stats.tier.budget, premiumRate: premiumRate !== null ? +premiumRate.toFixed(2) : null,
          actions: stats.actions.length, boughtToy: hasToy, adsWatched: stats.adsWatched,
          adContinues, choseToContinue, reviveCount,
          meanNeedResponseMs: meanNeed !== null ? Math.round(meanNeed) : null,
          treatsWhileHungry: stats.treatsWhileHungry,
          finalStats: { hunger: Math.round(hunger), happiness: Math.round(happiness), energy: Math.round(energy), clean: Math.round(clean), health: Math.round(health) },
          avgCareScore: careScore !== null ? Math.round(careScore) : null,
          neglectSeconds: Math.round(stats.neglectMs / 1000), brokeSeconds: Math.round(stats.brokeMs / 1000),
          sickEvents: stats.sickEvents, sickHandled: stats.sickHandled,
          appliedProfile: cfg.appliedProfile || null,
          traits: {
            CARE_CONSISTENCY: level(careScore, t.careHigh, t.careMed),
            SPENDING: level(spendFrac, t.spendHigh, t.spendMed),
            PRIORITIZATION: (onNeeds + onWants) === 0 ? "UNKNOWN" : (onWants > onNeeds ? "INDULGENT (wants > needs)" : "PRACTICAL (needs first)"),
            QUALITY_PREFERENCE: premiumRate === null ? "UNKNOWN" : (premiumRate >= 0.6 ? "PREMIUM / BRAND" : premiumRate <= 0.25 ? "BUDGET / THRIFT" : "MIXED"),
            VALUES: cats.length ? ("spends most on " + cats.slice(0, 2).join(" + ")) : "spent nothing",
            ATTACHMENT: level(attachPoints, t.attachHigh, t.attachMed),
            ROUTINE: regular === null ? "UNKNOWN" : regular ? "ROUTINE" : "ERRATIC",
            AD_FOR_CURRENCY: stats.adsWatched > 0 ? "YES" : (adContinues > 0 ? "NO" : "NOT TESTED"),
            FINANCIAL_STRESS: stats.brokeMs > 3000 ? (stats.adsWatched > 0 ? "WATCHED ADS TO COPE" : "LET PET SUFFER") : "STAYED AFLOAT",
          },
        };
      }
      function finish(reason) { if (ended || state === "over") return; endReason = reason; state = "over"; controls([], true); setTimeout(() => { ended = true; const sm = summary(reason); emit("game_end", sm); if (bridge && bridge.onEnd) bridge.onEnd(sm); }, 5000); }
      instanceApi.end = (r) => { if (ended) return; ended = true; state = "over"; endReason = r; const sm = summary(r); emit("game_end", sm); if (bridge && bridge.onEnd) bridge.onEnd(sm); };
      instanceApi.getSummary = () => summary(ended ? endReason : "in_progress");

      p.setup = () => { const c = p.createCanvas(container.clientWidth || W, container.clientHeight || H); c.parent(container); p.textFont("monospace"); fit(); controls([{ id: "start", label: "START" }], false); emit("rules_shown", {}); };
      function fit() { scaleF = Math.min(p.width / W, p.height / H); offX = (p.width - W * scaleF) / 2; offY = (p.height - H * scaleF) / 2; }
      p.windowResized = () => { p.resizeCanvas(container.clientWidth || W, container.clientHeight || H); fit(); };

      p.draw = () => {
        p.background(8); p.push(); p.translate(offX, offY); p.scale(scaleF);
        blink = (blink + 1) % 200; bob = Math.sin(p.millis() / 300) * 6;
        if (state === "rules") { drawRules(); drawTest(); p.pop(); return; }
        if (!ended && (state === "care" || state === "continue") && !adWaiting) {
          if (state === "care") tick();
          if (timeLeftMs() <= 0) { p.pop(); return finish("timer"); }
          if (state === "care" && Date.now() - lastInputAt > cfg.idleTimeoutMs) { p.pop(); return finish("idle"); }
        }
        drawScene();
        if (state === "continue") drawContinue();
        if (state === "over") drawOver();
        drawTest(); p.pop();
      };

      function drawScene() {
        const L = layout();
        p.noStroke();
        const sg = p.drawingContext.createLinearGradient(0, L.frameY, 0, L.frameY + L.frameH);
        sg.addColorStop(0, "rgb(136,200,232)"); sg.addColorStop(1, "rgb(176,216,240)");
        p.drawingContext.fillStyle = sg; p.drawingContext.fillRect(L.frameX, L.frameY, L.frameW, L.frameH);
        p.fill(DS.grass[0], DS.grass[1], DS.grass[2]); p.rect(L.frameX, L.grassY, L.frameW, L.grassH);
        p.noFill(); p.stroke(DS.box[0], DS.box[1], DS.box[2]); p.strokeWeight(6); p.rect(L.frameX, L.frameY, L.frameW, L.frameH, 10);

        p.noStroke(); p.fill(THEME.ink[0], THEME.ink[1], THEME.ink[2]); p.textSize(24);
        p.textAlign(p.LEFT, p.CENTER); p.text(`${cfg.currency}: ${bank}`, 60, L.headerY);
        const secs = Math.ceil(timeLeftMs() / 1000);
        p.textAlign(p.RIGHT, p.CENTER); if (secs <= 10) p.fill(THEME.warn[0], THEME.warn[1], THEME.warn[2]); else p.fill(THEME.ink[0], THEME.ink[1], THEME.ink[2]);
        p.text(`0:${String(secs).padStart(2, "0")}`, W - 60, L.headerY);

        drawStat("HUNGER", hunger, L.statX, L.statY0);
        drawStat("HAPPY", happiness, L.statX, L.statY0 + 38);
        drawStat("CLEAN", clean, L.statX, L.statY0 + 76);
        drawStat("HEALTH", health, L.statX, L.statY0 + 114);

        if (hasMess) { p.noStroke(); p.fill(130, 100, 60); p.ellipse(W / 2 + 120, L.grassY + 80, 42, 26); p.ellipse(W / 2 + 120, L.grassY + 72, 30, 20); }
        drawPet(W / 2, L.petY + bob);

        p.fill(DS.cream[0], DS.cream[1], DS.cream[2]); p.stroke(DS.box[0], DS.box[1], DS.box[2]); p.strokeWeight(5); p.rect(60, L.dialogY, W - 120, L.dialogH, 12);
        p.stroke(DS.boxLine[0], DS.boxLine[1], DS.boxLine[2]); p.strokeWeight(2); p.noFill(); p.rect(68, L.dialogY + 8, W - 136, L.dialogH - 16, 9);
        p.noStroke(); p.fill(DS.box[0], DS.box[1], DS.box[2]); p.textAlign(p.LEFT, p.CENTER); p.textSize(26); p.text(message, 90, L.dialogY + L.dialogH / 2);
      }
      function drawStat(label, val, x, y) {
        p.noStroke(); p.fill(DS.box[0], DS.box[1], DS.box[2]); p.textAlign(p.LEFT, p.CENTER); p.textSize(13); p.text(label, x, y - 15);
        p.fill(255); p.stroke(DS.box[0], DS.box[1], DS.box[2]); p.strokeWeight(2); p.rect(x, y - 8, 170, 15, 4);
        const col = val > 50 ? DS.green : val > 20 ? DS.yellow : DS.red;
        p.noStroke(); p.fill(col[0], col[1], col[2]); p.rect(x + 2, y - 6, 166 * (val / 100), 11, 3);
      }
      function drawPet(cx, cy) {
        p.push(); p.translate(cx, cy);
        const sad = happiness < 30 || health < 40, sleepy = energy < 25;
        p.noStroke(); p.fill(0, 0, 0, 40); p.ellipse(0, 90, 150, 30);
        p.fill(health < 40 ? p.color(170, 200, 160) : sad ? p.color(150, 170, 210) : p.color(120, 200, 150)); p.stroke(DS.box[0], DS.box[1], DS.box[2]); p.strokeWeight(4);
        p.ellipse(0, 20, 170, 150);
        p.ellipse(-45, 90, 48, 32); p.ellipse(45, 90, 48, 32);
        p.triangle(-70, -30, -40, -90, -20, -40); p.triangle(70, -30, 40, -90, 20, -40);
        p.noStroke(); p.fill(DS.box[0], DS.box[1], DS.box[2]);
        const closed = blink > 192 || sleepy;
        if (closed) { p.rect(-42, 6, 28, 4, 2); p.rect(14, 6, 28, 4, 2); }
        else { p.ellipse(-28, 8, 22, 26); p.ellipse(28, 8, 22, 26); p.fill(255); p.ellipse(-24, 3, 8, 8); p.ellipse(32, 3, 8, 8); }
        p.noFill(); p.stroke(DS.box[0], DS.box[1], DS.box[2]); p.strokeWeight(3);
        if (sad) p.arc(0, 56, 44, 34, p.PI + 0.3, p.TWO_PI - 0.3); else p.arc(0, 48, 44, 34, 0.3, p.PI - 0.3);
        if (health < 40) { p.stroke(120, 170, 120); p.strokeWeight(3); p.line(-60, -20, -78, -34); p.line(60, -20, 78, -34); }
        if (hasToy) { p.noStroke(); p.fill(DS.red[0], DS.red[1], DS.red[2]); p.circle(60, 70, 26); p.fill(255); p.circle(60, 70, 10); }
        if (sleepy) { p.noStroke(); p.fill(DS.box[0], DS.box[1], DS.box[2]); p.textSize(22); p.textAlign(p.LEFT, p.CENTER); p.text("z Z", 70, -60); }
        p.pop();
      }

      function drawBgRules() { const ctx = p.drawingContext; const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0c1018"); g.addColorStop(1, "#0a0e16"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); p.stroke(0, 0, 0, 40); p.strokeWeight(1); for (let ly = 0; ly < H; ly += 3) { p.line(0, ly, W, ly); } p.noStroke(); }
      function drawRules() {
        drawBgRules();
        p.noStroke(); p.fill(THEME.ink[0], THEME.ink[1], THEME.ink[2]); p.textAlign(p.CENTER, p.CENTER);
        p.textSize(42); p.text("DIGIPET", W / 2, 70);
        p.fill(THEME.accent[0], THEME.accent[1], THEME.accent[2]); p.textSize(26); p.text(`YOUR ALLOWANCE: ${cfg.startBalance} ${cfg.currency}`, W / 2, 118);
        p.fill(THEME.ink[0], THEME.ink[1], THEME.ink[2]); p.textSize(20);
        const lines = [
          `You have ${Math.round(cfg.gameDurationMs / 1000)} seconds to keep ${cfg.petName} alive.`,
          "HUNGER = food. HAPPY = fun. CLEAN = messes. HEALTH = sickness.",
          "Every action is a purchase. There is no free way to show care.",
          `FEED ${cfg.prices.feed}  ·  PREMIUM FOOD ${cfg.prices.feedPremium}  ·  TREAT ${cfg.prices.treat}`,
          `DOG PARK ${cfg.prices.play}  ·  CLEAN ${cfg.prices.clean}  ·  MEDICINE ${cfg.prices.medicine}`,
          `BALL ${cfg.prices.toyBasic}  ·  DESIGNER TOY ${cfg.prices.toyPremium}  ·  GROOMING ${cfg.prices.grooming}`,
          `SPA ${cfg.prices.spa}  ·  PHOTO ${cfg.prices.photo}`,
          "If credits run out while a need is unmet, or the pet dies,",
          "you may watch an ad to continue — twice. After that, the session ends.",
          "Use the menu on your phone. Press START when you are ready.",
        ];
        lines.forEach((l, i) => p.text(nm(l), W / 2, 168 + i * 34));
        p.fill(THEME.warn[0], THEME.warn[1], THEME.warn[2]); p.textSize(26); p.text("PRESS START TO PLAY", W / 2, 530);
      }
      function drawContinue() {
        p.fill(0, 0, 0, 150); p.noStroke(); p.rect(0, 0, W, H);
        p.fill(DS.cream[0], DS.cream[1], DS.cream[2]); p.stroke(DS.box[0], DS.box[1], DS.box[2]); p.strokeWeight(5); p.rect(180, 230, 664, 280, 12);
        p.noStroke(); p.fill(DS.box[0], DS.box[1], DS.box[2]); p.textAlign(p.CENTER, p.CENTER);
        p.textSize(28); p.text("KEEP PLAYING?", W / 2, 300);
        p.textSize(20); p.text("Watch an ad to continue.", W / 2, 350);
        p.textSize(18); p.text("The pet stays needy. The timer does not pause.", W / 2, 392);
        p.text(`${adContinues} of ${MAX_CONTINUES} continues used.`, W / 2, 432);
        p.fill(THEME.dim[0], THEME.dim[1], THEME.dim[2]); p.textSize(16); p.text("YES or NO on your phone.", W / 2, 470);
      }
      function drawOver() {
        p.fill(0, 0, 0, 160); p.noStroke(); p.rect(0, 0, W, H);
        p.fill(DS.cream[0], DS.cream[1], DS.cream[2]); p.stroke(DS.box[0], DS.box[1], DS.box[2]); p.strokeWeight(5); p.rect(242, 210, 540, 320, 12);
        p.noStroke(); p.fill(DS.box[0], DS.box[1], DS.box[2]); p.textAlign(p.CENTER, p.CENTER);
        const ok = happiness >= 50 && health >= 50;
        const title = endReason === "timer" || endReason === "time_up" ? "TIME'S UP!" : endReason === "chose_to_stop" ? "SESSION STOPPED." : "GAME OVER";
        p.textSize(32); p.text(title, W / 2, 265);
        p.textSize(23); p.text(ok ? `${cfg.petName} is happy and healthy!` : `${cfg.petName} needed more.`, W / 2, 325);
        p.textSize(19);
        p.text(`Spent ${stats.items.reduce((a, i) => a + i.price, 0)} of ${cfg.startBalance} ${cfg.currency}.`, W / 2, 375);
        p.text(`Needs ${stats.spend.feed + stats.spend.clean + stats.spend.medicine}  -  Wants ${stats.spend.treat + stats.spend.toy + stats.spend.grooming + stats.spend.play + stats.spend.spa + stats.spend.photo}`, W / 2, 410);
        if (stats.adsWatched || adContinues) p.text(`Ad continues: ${adContinues}.`, W / 2, 445);
      }

      let testButtons = null;
      instanceApi.setTestButtons = (b) => { testButtons = b; };
      function drawTest() {
        if (!testButtons || !testButtons.list.length) return;
        const n = testButtons.list.length, gap = 12, bw = Math.min(180, (W - 80 - (n - 1) * gap) / n), total = n * bw + (n - 1) * gap; let x = (W - total) / 2; testButtons.rects = [];
        for (const b of testButtons.list) {
          p.stroke(60); p.strokeWeight(2); p.fill(b.disabled ? 70 : testButtons.locked ? 60 : 245); p.rect(x, H - 54, bw, 46, 8);
          p.noStroke(); p.fill(b.disabled ? 140 : testButtons.locked ? 120 : 20); p.textSize(15); p.textAlign(p.CENTER, p.CENTER); p.text(b.label, x + bw / 2, H - 31);
          testButtons.rects.push({ id: b.id, x, y: H - 54, w: bw, h: 46, disabled: b.disabled }); x += bw + gap;
        }
      }
      p.mousePressed = () => {
        if (!testButtons || testButtons.locked || !testButtons.rects) return;
        const mx = (p.mouseX - offX) / scaleF, my = (p.mouseY - offY) / scaleF;
        for (const r of testButtons.rects) if (!r.disabled && mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h) return handle(r.id);
      };
      p.keyPressed = () => {
        if (state === "rules" && (p.key === "Enter" || p.key === " ")) return handle("start");
        const idx = parseInt(p.key, 10);
        if (testButtons && idx >= 1 && idx <= testButtons.list.length) { const b = testButtons.list[idx - 1]; if (!b.disabled) handle(b.id); }
      };
    };

    instance = new p5(sketch, container);
    return { end: (r) => instanceApi.end && instanceApi.end(r || "host_ended"), getSummary: () => instanceApi.getSummary && instanceApi.getSummary(), setTestButtons: (b) => instanceApi.setTestButtons && instanceApi.setTestButtons(b), destroy: () => { try { instance.remove(); } catch (e) {} } };
  }

  window.Games = window.Games || {};
  window.Games.pet = { meta: { id: "pet", title: "DIGIPET", behaviors: ["spending", "prioritization", "attachment", "care_consistency", "routine", "ad_for_currency", "financial_stress"] }, defaults: DEFAULTS, profileRules: PROFILE_RULES, configFromProfile, create };

  if (!window.GAME_HOST) {
    window.addEventListener("load", () => {
      const holder = document.createElement("div"); holder.style.width = "100vw"; holder.style.height = "100vh"; document.body.style.margin = "0"; document.body.appendChild(holder);
      let handler = null, game = null, pending = null;
      const bridge = {
        onInput: (fn) => (handler = fn), emit: (type, data) => console.log("EVENT", type, JSON.stringify(data)),
        setControls: (list, opts) => { pending = { list, locked: opts.locked }; if (game) game.setTestButtons(pending); },
        requestAd: () => new Promise((res) => { console.log("AD PLAYING (simulated 3s)"); setTimeout(() => res({ watched: true }), 3000); }),
        onEnd: (s) => console.log("SUMMARY", JSON.stringify(s, null, 2)),
      };
      const TEST_PROFILE = { incomeBracket: "<30k", mood: "melancholy" };
      game = create(holder, configFromProfile(TEST_PROFILE), bridge);
      if (pending) game.setTestButtons(pending);
      window._game = game; window._send = (a) => handler && handler(a);
    });
  }
})();
