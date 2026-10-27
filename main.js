(() => {
  "use strict";

  /* ── Links from config.js ─────────────────────────────── */
  const cfg = window.FASTAGENT_CONFIG || {};
  const isSet = (v) => typeof v === "string" && v.trim() !== "" && !/^[A-Z_]+$/.test(v.trim());
  const notSet = (name) => alert(`${name} isn't set yet. Paste it into config.js.`);

  // A link that isn't set yet is hidden, so visitors never see a dead button.
  document.querySelectorAll("[data-link]").forEach((a) => {
    const kind = a.dataset.link;
    if (kind === "email") {
      if (isSet(cfg.CONTACT_EMAIL)) {
        a.href = "mailto:" + cfg.CONTACT_EMAIL.trim();
        a.textContent = cfg.CONTACT_EMAIL.trim();
      } else {
        a.closest("[data-contact]").hidden = true;
      }
      return;
    }
    // Only a real Stripe link is used (never a "javascript:" or other odd address).
    const url = isSet(cfg.STRIPE_DEPOSIT_URL) ? cfg.STRIPE_DEPOSIT_URL.trim() : "";
    if (/^https:\/\/(buy|checkout)\.stripe\.com\//.test(url)) {
      a.href = url;
    } else {
      a.closest(".deposit").hidden = true;
      a.closest(".cta").classList.add("cta-solo");
    }
  });

  const rmQuery = matchMedia("(prefers-reduced-motion: reduce)");

  /* ── Free waitlist: email → Supabase table "waitlist" ─── */
  // The publishable key can only add a row (RLS + insert-only grant); nobody can read the list from here.
  const forms = [...document.querySelectorAll("[data-join]")];
  const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  // Top-bar button: jump to the hero form and put the cursor in it.
  document.querySelectorAll("[data-join-link]").forEach((a) => a.addEventListener("click", (e) => {
    const input = forms[0] && forms[0].querySelector("input[type=email]");
    if (!input || input.disabled) return;
    e.preventDefault();
    input.scrollIntoView({ behavior: rmQuery.matches ? "auto" : "smooth", block: "center" });
    input.focus({ preventScroll: true });
  }));

  // Joined in one form = joined in both.
  function joined(text) {
    forms.forEach((f) => {
      f.classList.add("is-done");
      f.querySelectorAll("input, button").forEach((el) => { el.disabled = true; });
      f.querySelector(".join-msg").innerHTML = `<span class="ok" aria-hidden="true">✓</span> ${text}`;
    });
  }

  async function addEmail(email) {
    const base = cfg.SUPABASE_URL.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
    const res = await fetch(`${base}/rest/v1/waitlist`, {
      method: "POST",
      headers: {
        apikey: cfg.SUPABASE_KEY.trim(),
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ email }),
    });
    if (res.ok) return "added";
    if (res.status === 409) return "already"; // unique email: they're already on it
    if (res.status === 400) return "invalid"; // the table's email check said no
    throw new Error(`waitlist ${res.status}`);
  }

  forms.forEach((form) => {
    const input = form.querySelector("input[type=email]");
    const button = form.querySelector("button");
    const msg = form.querySelector(".join-msg");
    const say = (text) => { msg.textContent = text; };
    input.addEventListener("input", () => { form.classList.remove("is-error"); say(""); });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (form.classList.contains("is-busy") || form.classList.contains("is-done")) return;
      const email = input.value.trim();
      if (!EMAIL_RE.test(email) || email.length > 254) {
        form.classList.add("is-error");
        say("Enter a valid email address.");
        input.focus();
        return;
      }
      // Honeypot: real people never see this field, bots fill it. Look done, send nothing.
      if (form.elements.company.value) return joined("You're on the list.");
      if (!isSet(cfg.SUPABASE_URL) || !isSet(cfg.SUPABASE_KEY)) return notSet("SUPABASE_URL / SUPABASE_KEY");

      form.classList.add("is-busy");
      button.disabled = true;
      button.innerHTML = '<span class="spinner" aria-hidden="true"></span> Joining…';
      say("");
      try {
        const result = await addEmail(email);
        if (result === "invalid") {
          form.classList.add("is-error");
          say("That email doesn't look right. Check it and try again.");
        } else {
          joined(result === "already" ? "You're already on the list." : "You're on the list. We'll email you at launch.");
        }
      } catch {
        form.classList.add("is-error");
        say("Something went wrong. Please try again in a moment.");
      } finally {
        form.classList.remove("is-busy");
        button.textContent = "Join the free waitlist";
        if (!form.classList.contains("is-done")) button.disabled = false;
      }
    });
  });

  /* ── Steps 1 and 2: loop a short animation while on screen ── */
  // With reduced motion the cards simply keep their finished state from the HTML.
  function loopWhileVisible(el, run) {
    if (!el || rmQuery.matches) return;
    let token = 0;
    let visible = false;
    const sleepFor = (t) => (ms) => new Promise((resolve, reject) =>
      setTimeout(() => (t === token && visible ? resolve() : reject()), ms));
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting === visible) return;
      visible = entry.isIntersecting;
      const t = ++token;
      if (visible) (async () => { try { for (;;) await run(sleepFor(t)); } catch { /* left the screen */ } })();
    }, { threshold: 0.35 }).observe(el);
  }

  const importEl = document.querySelector("[data-import]");
  if (importEl) {
    const urlText = importEl.querySelector("[data-url-text]");
    const url = urlText.textContent;
    loopWhileVisible(importEl, async (sleep) => {
      importEl.classList.remove("is-importing", "is-done");
      importEl.classList.add("is-playing");
      urlText.textContent = "";
      await sleep(600);
      for (let i = 1; i <= url.length; i++) {
        urlText.textContent = url.slice(0, i);
        urlText.scrollLeft = urlText.scrollWidth;
        await sleep(i < 11 ? 45 : 22);
      }
      await sleep(400);
      importEl.classList.add("is-importing");
      await sleep(900);
      importEl.classList.remove("is-importing");
      importEl.classList.add("is-done");
      urlText.scrollLeft = 0;
      await sleep(3800);
    });
  }

  const photosEl = document.querySelector("[data-photos]");
  if (photosEl) {
    const tiles = [...photosEl.querySelectorAll(".tile")];
    const count = photosEl.querySelector("[data-count]");
    const total = 15;
    loopWhileVisible(photosEl, async (sleep) => {
      photosEl.classList.remove("is-done");
      photosEl.classList.add("is-playing");
      tiles.forEach((t) => t.classList.remove("is-in"));
      count.textContent = "0";
      await sleep(500);
      for (let i = 0; i < total; i++) {
        if (tiles[i]) tiles[i].classList.add("is-in");
        count.textContent = String(i + 1);
        await sleep(130);
      }
      await sleep(200);
      photosEl.classList.add("is-done");
      await sleep(3800);
    });
  }

  /* ── Step 4: schedule a saved video ───────────────────── */
  const schedEl = document.querySelector("[data-sched]");
  if (schedEl) {
    // Calendar for next month; the demo picks the first Friday on or after the 5th.
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    let pick = 5;
    while (new Date(first.getFullYear(), first.getMonth(), pick).getDay() !== 5) pick++;
    const when = new Date(first.getFullYear(), first.getMonth(), pick)
      .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    schedEl.querySelector("[data-month]").textContent = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    schedEl.querySelectorAll("[data-when]").forEach((el) => (el.textContent = when));
    schedEl.querySelector("[data-cal]").innerHTML =
      "SMTWTFS".split("").map((d) => `<b>${d}</b>`).join("") +
      "<i></i>".repeat(first.getDay()) +
      Array.from({ length: days }, (_, i) => `<span${i + 1 === pick ? ' data-target="day"' : ""}>${i + 1}</span>`).join("");

    const target = (name) => schedEl.querySelector(`[data-target="${name}"]`);
    const cursor = schedEl.querySelector(".cursor");
    const moveTo = (el) => {
      const r = el.getBoundingClientRect();
      const b = schedEl.getBoundingClientRect();
      const x = r.left - b.left - schedEl.clientLeft + r.width * 0.55;
      const y = r.top - b.top - schedEl.clientTop + r.height * 0.55;
      cursor.style.transform = `translate(${x}px, ${y}px)`;
    };
    const reset = () => {
      schedEl.dataset.at = "saved";
      schedEl.dataset.step = "pair";
      schedEl.classList.remove("sheet-open", "is-done", "show-cursor");
      schedEl.querySelectorAll(".is-picked").forEach((el) => el.classList.remove("is-picked"));
      cursor.style.transform = "";
      // Snap back to the start without animating everything in reverse.
      schedEl.classList.add("is-resetting");
      void schedEl.offsetWidth;
      schedEl.classList.remove("is-resetting");
    };

    // Reduced motion: just show the finished result.
    if (rmQuery.matches) {
      target("day").classList.add("is-picked");
      schedEl.classList.add("is-done");
    }

    loopWhileVisible(schedEl, async (sleep) => {
      const click = async (el) => {
        moveTo(el);
        await sleep(750);
        cursor.classList.add("is-clicking");
        el.classList.add("is-pressed");
        await sleep(160);
        el.classList.remove("is-pressed");
        await sleep(220);
        cursor.classList.remove("is-clicking");
      };
      reset();
      // Viral reel + remix, then ✓ Saved and the remix swipes right, then the actions appear.
      await sleep(1500);
      schedEl.dataset.step = "saving";
      await sleep(550);
      schedEl.dataset.step = "swiped";
      await sleep(550);
      schedEl.dataset.step = "saved";
      await sleep(800);
      schedEl.classList.add("show-cursor");
      await click(target("schedule"));
      schedEl.dataset.at = "platform";
      await sleep(650);
      await click(target("tiktok"));
      target("tiktok").classList.add("is-picked");
      await sleep(550);
      schedEl.dataset.at = "calendar";
      await sleep(650);
      await click(target("day"));
      target("day").classList.add("is-picked");
      await sleep(300);
      schedEl.classList.add("sheet-open");
      await sleep(600);
      await click(target("confirm"));
      schedEl.classList.remove("sheet-open", "show-cursor");
      schedEl.classList.add("is-done");
      await sleep(3500);
    });
  }

  /* ── Step 3: Blitz mode demo ──────────────────────────── */
  const stage = document.getElementById("blitz");
  if (!stage) return;

  // Sample numbers and captions for the made-up creator. Not real data.
  const FORMATS = [
    { key: "fast-cut", name: "Fast-Cut", likes: "184K", views: "2.1M", caption: "Every room in 20 seconds 🏡 #realestate" },
    { key: "hero-hook", name: "Single Hero + Hook", likes: "96.4K", views: "1.3M", caption: "Wait for the porch… #dreamhome" },
    { key: "cinematic", name: "Cinematic Bookend", likes: "241K", views: "3.4M", caption: "Golden hour hits different ✨ #newlisting" },
    { key: "walkthrough", name: "Full Walkthrough", likes: "72.8K", views: "890K", caption: "Full tour, front door to backyard #hometour" },
    { key: "collage", name: "Magazine / Collage", likes: "131K", views: "1.7M", caption: "Every angle, one reel 📸 #househunting" },
  ];
  const HANDLE = "@sunbelt.homes.demo";
  const DWELL = 4000;        // ms each pair plays before the swipe
  const READY_WAIT = 2000;   // start the clock anyway if video is slow to load
  const PRELOAD_AT = DWELL - 2000;

  const n = FORMATS.length;
  const pairsEl = stage.querySelector("[data-pairs]");
  const progressEl = stage.querySelector("[data-progress]");
  const nameEl = stage.querySelector("[data-fmt-name]");
  const countEl = stage.querySelector("[data-fmt-count]");
  const liveEl = stage.querySelector("[data-live]");
  const pauseBtn = stage.querySelector("[data-pause]");

  const videoTag = '<video muted loop playsinline preload="none" disablepictureinpicture disableremoteplayback aria-hidden="true" tabindex="-1"></video>';

  pairsEl.innerHTML = FORMATS.map((f) => `
    <div class="pair" role="group" aria-roledescription="slide" aria-label="${f.name}: viral reel and your remix">
      <figure class="card viral" data-video="viral-${f.key}">
        ${videoTag}
        <div class="ov">
          <div class="ov-top"><span class="chip">Viral reel</span></div>
          <div class="ov-bottom ov-viral">
            <div class="stats"><span class="likes"><b>♥</b> ${f.likes}</span> · <span class="views">${f.views} views</span></div>
            <div class="creator">
              <div class="handle"><i class="avatar"></i><span>${HANDLE}</span></div>
              <div class="caption">${f.caption}</div>
            </div>
          </div>
        </div>
      </figure>
      <figure class="card remix" data-video="remix-${f.key}">
        ${videoTag}
        <div class="ov">
          <div class="ov-top"><span class="chip chip-accent">Your listing, remixed</span></div>
          <div class="ov-bottom">
            <div class="remix-meta">Same format<span>Your photos, your facts</span></div>
          </div>
        </div>
        <div class="badge saved" aria-hidden="true">✓ Saved</div>
        <div class="badge skip" aria-hidden="true">✕ Skip</div>
      </figure>
    </div>`).join("");
  progressEl.innerHTML = FORMATS.map(() => "<span><i></i></span>").join("");

  const pairs = [...pairsEl.children];
  const bars = [...progressEl.querySelectorAll("i")];
  const vids = (i) => [...pairs[i].querySelectorAll("video")];
  pairs.forEach((p) => p.querySelectorAll("video").forEach((v) => { v.muted = true; v.defaultMuted = true; }));

  const saveData = !!(navigator.connection && navigator.connection.saveData);
  let reduced = rmQuery.matches;
  let userPaused = false;
  let inView = false;
  let idx = 0;
  let phase = "dwell";       // "dwell" | "transition"
  let elapsed = 0;
  let activatedAt = performance.now();
  let preloaded = false;
  let swipes = 0;            // alternates keep (right) and skip (left)
  let raf = 0;
  let last = null;

  const src = (v) => `clips/${v.closest("[data-video]").dataset.video}.mp4`;
  const poster = (v) => `posters/${v.closest("[data-video]").dataset.video}.jpg`;

  function prime(i) {
    vids(i).forEach((v) => { if (!v.getAttribute("poster")) v.setAttribute("poster", poster(v)); });
  }
  function load(i) {
    prime(i);
    if (reduced || saveData) return;
    vids(i).forEach((v) => {
      if (!v.getAttribute("src")) { v.preload = "auto"; v.src = src(v); }
    });
  }
  function unload(i) {
    vids(i).forEach((v) => {
      v.pause();
      if (v.getAttribute("src")) { v.removeAttribute("src"); v.preload = "none"; v.load(); }
    });
  }
  function play(i) {
    load(i);
    vids(i).forEach((v) => { if (v.getAttribute("src")) v.play().catch(() => {}); });
  }
  function pauseVideos(i) { vids(i).forEach((v) => v.pause()); }

  const running = () => !reduced && !userPaused && inView && !document.hidden;
  const manual = () => reduced || userPaused;

  function drawProgress() {
    bars.forEach((b, i) => {
      const s = i < idx ? 1 : i > idx ? 0 : manual() ? 1 : Math.min(1, elapsed / DWELL);
      b.style.transform = `scaleX(${s})`;
    });
  }

  // mode: "fade" (auto swipe), "announce" (manual step), or nothing (first paint)
  function setLabel(i, mode) {
    const f = FORMATS[i];
    countEl.textContent = `Format ${i + 1} of ${n}`;
    if (mode === "fade" && !reduced) {
      nameEl.classList.add("is-swapping");
      setTimeout(() => { nameEl.textContent = f.name; nameEl.classList.remove("is-swapping"); }, 200);
    } else {
      nameEl.textContent = f.name;
    }
    if (mode === "announce") liveEl.textContent = `${f.name}, format ${i + 1} of ${n}`;
  }

  function isReady(now) {
    if (now - activatedAt > READY_WAIT) return true;
    return vids(idx).every((v) => !v.getAttribute("src") || (v.readyState >= 3 && !v.paused));
  }

  function tick(now) {
    raf = 0;
    if (!running()) { last = null; return; }
    if (last !== null && phase === "dwell") {
      if (isReady(now)) elapsed += Math.min(now - last, 100);
      if (!preloaded && elapsed > PRELOAD_AT) { load((idx + 1) % n); preloaded = true; }
      drawProgress();
      if (elapsed >= DWELL) advance();
    }
    last = now;
    raf = requestAnimationFrame(tick);
  }

  // The swipe: badge → remix card flies right (keep) or left (skip) → next pair rises in.
  function advance() {
    phase = "transition";
    const from = idx;
    const to = (idx + 1) % n;
    const cur = pairs[from];
    const next = pairs[to];
    const keep = swipes++ % 2 === 0;
    cur.classList.add(keep ? "is-saving" : "is-skipping");

    setTimeout(() => {
      cur.classList.add("is-leaving", keep ? "to-right" : "to-left");
      cur.classList.remove("is-active");
      setLabel(to, "fade");
    }, 550);

    setTimeout(() => {
      idx = to;
      elapsed = 0;
      drawProgress();
      next.classList.add("is-pre");
      void next.offsetWidth;
      next.classList.remove("is-pre");
      next.classList.add("is-active");
      if (running()) play(to); else prime(to);
    }, 800);

    setTimeout(() => {
      cur.classList.remove("is-saving", "is-skipping", "is-leaving", "to-right", "to-left");
      unload(from);
      prime((to + 1) % n);
      preloaded = false;
      activatedAt = performance.now();
      phase = "dwell";
    }, 1300);
  }

  // Manual stepping (reduced motion, or after pressing pause)
  function step(dir) {
    if (phase !== "dwell") return;
    const to = (idx + dir + n) % n;
    pairs[idx].classList.remove("is-active");
    unload(idx);
    idx = to;
    elapsed = 0;
    preloaded = false;
    activatedAt = performance.now();
    prime(idx);
    pairs[idx].classList.add("is-active");
    setLabel(idx, "announce");
    drawProgress();
  }

  function sync() {
    stage.classList.toggle("is-manual", manual());
    stage.classList.toggle("is-paused", userPaused && !reduced);
    pauseBtn.hidden = reduced;
    if (reduced) pairs.forEach((_, i) => unload(i));
    drawProgress();
    if (running()) {
      if (phase === "dwell") play(idx);
      activatedAt = Math.max(activatedAt, performance.now() - READY_WAIT);
      if (!raf) { last = null; raf = requestAnimationFrame(tick); }
    } else {
      pauseVideos(idx);
    }
  }

  pauseBtn.addEventListener("click", () => {
    userPaused = !userPaused;
    pauseBtn.setAttribute("aria-pressed", String(userPaused));
    pauseBtn.setAttribute("aria-label", userPaused ? "Play demo" : "Pause demo");
    sync();
  });
  stage.querySelector("[data-prev]").addEventListener("click", () => step(-1));
  stage.querySelector("[data-next]").addEventListener("click", () => step(1));
  document.addEventListener("visibilitychange", sync);
  rmQuery.addEventListener("change", () => { reduced = rmQuery.matches; sync(); });

  // Start fetching the first pair shortly before the demo scrolls into view (not on
  // page load), so it's already playing when visitors get there.
  const nearObserver = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    load(0);
    prime(1);
    nearObserver.disconnect();
  }, { rootMargin: "800px 0px" });
  nearObserver.observe(stage);

  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); }, { threshold: 0.2 })
    .observe(stage);

  pairs[0].classList.add("is-active");
  setLabel(0);
  drawProgress();
  sync();
})();
