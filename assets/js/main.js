(() => {
  "use strict";

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reducedMotion = () => motionQuery.matches;

  /* ===== Mobile nav ===== */
  const navToggle = document.getElementById("navToggle");
  const mainNav = document.getElementById("main-nav");
  if (navToggle && mainNav) {
    navToggle.addEventListener("click", () => {
      const open = mainNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
    mainNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        mainNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ===== Reveal on scroll ===== */
  const revealTargets = document.querySelectorAll(
    ".component-card, .video-card, .spec-card, .callout-item, .demo-shell"
  );
  revealTargets.forEach((el) => el.setAttribute("data-reveal", ""));
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("is-visible"));
  }

  /* ===== Dust-wipe interactive demo ===== */
  (function initDustDemo() {
    const stage = document.getElementById("dustStage");
    const canvas = document.getElementById("dustCanvas");
    const cursorBot = document.getElementById("cursorBot");
    const progressEl = document.getElementById("cleanProgress");
    const autoCleanBtn = document.getElementById("autoCleanBtn");
    const resetBtn = document.getElementById("resetDustBtn");
    if (!stage || !canvas) return;

    const ctx = canvas.getContext("2d");
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = 48;
    sampleCanvas.height = 24;
    const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cw = 0, ch = 0;
    let lastX = null, lastY = null;
    let autoRunning = false;
    let autoRaf = null;

    function sizeCanvas() {
      const rect = stage.getBoundingClientRect();
      cw = rect.width;
      ch = rect.height;
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintDust();
    }

    function paintDust() {
      ctx.globalCompositeOperation = "source-over";
      const grad = ctx.createLinearGradient(0, 0, cw, ch);
      grad.addColorStop(0, "#d7cfba");
      grad.addColorStop(1, "#c2b9a1");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);

      const speckles = Math.floor((cw * ch) / 900);
      for (let i = 0; i < speckles; i++) {
        const x = Math.random() * cw;
        const y = Math.random() * ch;
        const r = Math.random() * 1.6 + 0.3;
        const shade = 90 + Math.random() * 50;
        ctx.fillStyle = `rgba(${shade | 0}, ${(shade - 12) | 0}, ${(shade - 28) | 0}, ${0.14 + Math.random() * 0.22})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      const clumps = Math.max(6, Math.floor(cw / 90));
      for (let i = 0; i < clumps; i++) {
        const x = Math.random() * cw;
        const y = Math.random() * ch;
        const r = 18 + Math.random() * 30;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, "rgba(120,108,84,0.3)");
        g.addColorStop(1, "rgba(120,108,84,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      queueProgressUpdate();
    }

    function eraseSegment(x1, y1, x2, y2, radius) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = radius * 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x2, y2, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function moveBot(x, y) {
      if (!cursorBot) return;
      cursorBot.style.transform = `translate(${x - 20}px, ${y - 20}px)`;
    }

    let progressTimer = null;
    function queueProgressUpdate() {
      if (progressTimer) return;
      progressTimer = setTimeout(() => {
        progressTimer = null;
        updateProgress();
      }, 220);
    }

    function updateProgress() {
      if (!progressEl || cw === 0) return;
      sampleCtx.clearRect(0, 0, sampleCanvas.width, sampleCanvas.height);
      sampleCtx.drawImage(canvas, 0, 0, cw, ch, 0, 0, sampleCanvas.width, sampleCanvas.height);
      const data = sampleCtx.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height).data;
      let clear = 0;
      const total = sampleCanvas.width * sampleCanvas.height;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 40) clear++;
      }
      progressEl.textContent = Math.round((clear / total) * 100) + "%";
    }

    function pointerPos(evt) {
      const rect = stage.getBoundingClientRect();
      const point = evt.touches ? evt.touches[0] : evt;
      return { x: point.clientX - rect.left, y: point.clientY - rect.top };
    }

    function handleMove(evt) {
      const { x, y } = pointerPos(evt);
      moveBot(x, y);
      if (lastX === null) {
        eraseSegment(x, y, x, y, 34);
      } else {
        eraseSegment(lastX, lastY, x, y, 34);
      }
      lastX = x;
      lastY = y;
      queueProgressUpdate();
    }

    stage.addEventListener("pointermove", handleMove);
    stage.addEventListener("pointerleave", () => {
      lastX = null;
      lastY = null;
      if (cursorBot) cursorBot.style.transform = "translate(-100px, -100px)";
    });
    stage.addEventListener(
      "touchmove",
      (evt) => {
        evt.preventDefault();
        handleMove(evt);
      },
      { passive: false }
    );

    resetBtn?.addEventListener("click", () => {
      stopAuto();
      paintDust();
    });

    function stopAuto() {
      autoRunning = false;
      if (autoRaf) cancelAnimationFrame(autoRaf);
      autoCleanBtn && (autoCleanBtn.textContent = "ניקוי אוטומטי");
    }

    function runAutoClean() {
      if (autoRunning) {
        stopAuto();
        return;
      }
      if (reducedMotion()) {
        ctx.clearRect(0, 0, cw, ch);
        updateProgress();
        return;
      }
      autoRunning = true;
      autoCleanBtn && (autoCleanBtn.textContent = "עצירה");

      const rows = 5;
      const margin = Math.min(cw, ch) * 0.08;
      const path = [];
      for (let r = 0; r < rows; r++) {
        const y = margin + (r * (ch - margin * 2)) / (rows - 1);
        if (r % 2 === 0) {
          path.push({ x: margin, y }, { x: cw - margin, y });
        } else {
          path.push({ x: cw - margin, y }, { x: margin, y });
        }
      }

      let segIndex = 0;
      let segT = 0;
      const speed = 0.012;
      let prevX = path[0].x;
      let prevY = path[0].y;
      moveBot(prevX, prevY);

      function step() {
        if (!autoRunning) return;
        if (segIndex >= path.length - 1) {
          stopAuto();
          updateProgress();
          return;
        }
        const a = path[segIndex];
        const b = path[segIndex + 1];
        segT += speed;
        if (segT >= 1) {
          segT = 0;
          segIndex++;
        }
        const x = a.x + (b.x - a.x) * segT;
        const y = a.y + (b.y - a.y) * segT;
        eraseSegment(prevX, prevY, x, y, 30);
        moveBot(x, y);
        prevX = x;
        prevY = y;
        queueProgressUpdate();
        autoRaf = requestAnimationFrame(step);
      }
      autoRaf = requestAnimationFrame(step);
    }

    autoCleanBtn?.addEventListener("click", runAutoClean);

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(sizeCanvas, 150);
    });

    sizeCanvas();
  })();

  /* ===== 360 rotator ===== */
  (function initRotator() {
    const wheel = document.getElementById("rotatorWheel");
    const illustration = document.getElementById("rotatorIllustration");
    const degreeReadout = document.getElementById("degreeReadout");
    const leftBtn = document.getElementById("rotateLeftBtn");
    const rightBtn = document.getElementById("rotateRightBtn");
    const autoBtn = document.getElementById("autoRotateBtn");
    const callouts = Array.from(document.querySelectorAll(".callout-item"));
    if (!wheel || !illustration) return;

    let angle = 0;
    let dragging = false;
    let startX = 0;
    let startAngle = 0;
    let autoRotating = false;
    let autoRaf = null;

    function angleDiff(a, b) {
      const d = Math.abs(a - b) % 360;
      return d > 180 ? 360 - d : d;
    }

    function updateCallouts() {
      let closest = callouts[0];
      let closestDist = Infinity;
      callouts.forEach((item) => {
        const itemAngle = parseFloat(item.dataset.angle || "0");
        const dist = angleDiff(angle, itemAngle);
        if (dist < closestDist) {
          closestDist = dist;
          closest = item;
        }
      });
      callouts.forEach((item) => {
        item.dataset.active = String(item === closest);
      });
    }

    function setAngle(next) {
      angle = ((next % 360) + 360) % 360;
      illustration.style.transform = `rotate(${angle}deg)`;
      const rounded = Math.round(angle);
      wheel.setAttribute("aria-valuenow", String(rounded));
      wheel.setAttribute("aria-valuetext", `${rounded} מעלות`);
      if (degreeReadout) degreeReadout.textContent = `${rounded}°`;
      updateCallouts();
    }

    function stopAutoRotate() {
      autoRotating = false;
      if (autoRaf) cancelAnimationFrame(autoRaf);
      autoBtn?.setAttribute("aria-pressed", "false");
    }

    function startAutoRotate() {
      if (reducedMotion()) return;
      autoRotating = true;
      autoBtn?.setAttribute("aria-pressed", "true");
      let last = performance.now();
      function tick(now) {
        if (!autoRotating) return;
        const dt = now - last;
        last = now;
        setAngle(angle + dt * 0.02);
        autoRaf = requestAnimationFrame(tick);
      }
      autoRaf = requestAnimationFrame(tick);
    }

    autoBtn?.addEventListener("click", () => {
      if (autoRotating) stopAutoRotate();
      else startAutoRotate();
    });

    wheel.addEventListener("pointerdown", (evt) => {
      dragging = true;
      startX = evt.clientX;
      startAngle = angle;
      stopAutoRotate();
      wheel.setPointerCapture(evt.pointerId);
    });
    wheel.addEventListener("pointermove", (evt) => {
      if (!dragging) return;
      const delta = (evt.clientX - startX) * 0.6;
      setAngle(startAngle + delta);
    });
    wheel.addEventListener("pointerup", () => (dragging = false));
    wheel.addEventListener("pointercancel", () => (dragging = false));

    wheel.addEventListener("keydown", (evt) => {
      const step = evt.shiftKey ? 45 : 15;
      if (evt.key === "ArrowRight") { setAngle(angle + step); evt.preventDefault(); }
      else if (evt.key === "ArrowLeft") { setAngle(angle - step); evt.preventDefault(); }
      else if (evt.key === "Home") { setAngle(0); evt.preventDefault(); }
      else if (evt.key === "End") { setAngle(359); evt.preventDefault(); }
      else return;
      stopAutoRotate();
    });

    leftBtn?.addEventListener("click", () => { stopAutoRotate(); setAngle(angle - 45); });
    rightBtn?.addEventListener("click", () => { stopAutoRotate(); setAngle(angle + 45); });

    setAngle(0);
  })();

  /* ===== Suction game ===== */
  (function initSuctionGame() {
    const stage = document.getElementById("suctionStage");
    const canvas = document.getElementById("suctionCanvas");
    const countEl = document.getElementById("suctionCount");
    const scatterBtn = document.getElementById("scatterBtn");
    if (!stage || !canvas) return;

    const ctx = canvas.getContext("2d");
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cw = 0, ch = 0, cx = 0, cy = 0, inletR = 0;
    let particles = [];
    let count = 0;
    let raf = null;
    let pulse = 0;

    function rand(a, b) {
      return a + Math.random() * (b - a);
    }

    const crumbHues = [
      [166, 108, 58],
      [201, 148, 72],
      [138, 93, 56],
      [214, 178, 92],
    ];

    function spawnDust(x, y) {
      particles.push({ type: "dust", x, y, vx: 0, vy: 0, r: rand(2, 4), shade: rand(90, 150) | 0 });
    }
    function spawnHair(x, y) {
      particles.push({ type: "hair", x, y, vx: 0, vy: 0, len: rand(14, 26), ang: rand(0, Math.PI * 2) });
    }
    function spawnCrumb(x, y) {
      particles.push({
        type: "crumb", x, y, vx: 0, vy: 0,
        r: rand(2.5, 5), rot: rand(0, Math.PI * 2),
        hue: crumbHues[(Math.random() * crumbHues.length) | 0],
      });
    }
    function spawnRandom(x, y) {
      const r = Math.random();
      if (r < 0.32) spawnHair(x, y);
      else if (r < 0.6) spawnCrumb(x, y);
      else spawnDust(x, y);
    }
    function seedParticles(n) {
      for (let i = 0; i < n; i++) {
        const ang = rand(0, Math.PI * 2);
        const dist = rand(inletR * 2, Math.min(cw, ch) * 0.46);
        spawnRandom(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist);
      }
    }

    function size() {
      const rect = stage.getBoundingClientRect();
      cw = rect.width;
      ch = rect.height;
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = cw / 2;
      cy = ch / 2;
      inletR = Math.min(cw, ch) * 0.16;
      particles = [];
      seedParticles(24);
      renderStatic();
    }

    function drawInlet() {
      const outerR = inletR * (1 + pulse * 0.12);
      // cast shadow grounding the housing
      const shadow = ctx.createRadialGradient(cx, cy + outerR * 0.55, outerR * 0.2, cx, cy + outerR * 0.55, outerR * 1.15);
      shadow.addColorStop(0, "rgba(15,23,42,0.28)");
      shadow.addColorStop(1, "rgba(15,23,42,0)");
      ctx.fillStyle = shadow;
      ctx.beginPath();
      ctx.ellipse(cx, cy + outerR * 0.55, outerR * 1.15, outerR * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // recessed opening: dark core with a lit rim (ambient occlusion look)
      const g = ctx.createRadialGradient(cx, cy, outerR * 0.1, cx, cy, outerR);
      g.addColorStop(0, "#05070b");
      g.addColorStop(0.55, "#11151b");
      g.addColorStop(0.86, "#232b38");
      g.addColorStop(1, "#0c1017");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.fill();

      // studio key-light highlight on the rim, upper-left
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = outerR * 0.1;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR * 0.94, Math.PI * 1.05, Math.PI * 1.55);
      ctx.stroke();

      ctx.strokeStyle = "rgba(14,165,233,0.55)";
      ctx.lineWidth = 2;
      const rim = inletR * 0.7;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * rim, cy + Math.sin(a) * rim);
        ctx.lineTo(cx + Math.cos(a) * (rim - 8), cy + Math.sin(a) * (rim - 8));
        ctx.stroke();
      }
      const dot = ctx.createRadialGradient(cx - 1, cy - 1, 0, cx, cy, 5);
      dot.addColorStop(0, "#7dd3fc");
      dot.addColorStop(1, "#0ea5e9");
      ctx.fillStyle = dot;
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawParticle(p, shrink) {
      if (p.type === "dust") {
        ctx.fillStyle = `rgb(${p.shade},${p.shade - 10},${p.shade - 25})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * shrink, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "crumb") {
        const [r, g, b] = p.hue;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        const s = p.r * shrink;
        ctx.beginPath();
        ctx.moveTo(-s, -s * 0.7);
        ctx.lineTo(s, -s * 0.4);
        ctx.lineTo(s * 0.6, s);
        ctx.lineTo(-s * 0.8, s * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        ctx.strokeStyle = "rgba(60,45,35,0.8)";
        ctx.lineWidth = 1.4 * shrink;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(p.ang) * p.len, p.y + Math.sin(p.ang) * p.len);
        ctx.stroke();
      }
    }

    function renderStatic() {
      ctx.clearRect(0, 0, cw, ch);
      drawInlet();
      particles.forEach((p) => drawParticle(p, 1));
    }

    function step() {
      ctx.clearRect(0, 0, cw, ch);
      drawInlet();
      pulse = Math.max(0, pulse - 0.04);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const dx = cx - p.x, dy = cy - p.y;
        const dist = Math.hypot(dx, dy) || 1;
        p.vx = (p.vx + (dx / dist) * (0.15 + 40 / dist)) * 0.94;
        p.vy = (p.vy + (dy / dist) * (0.15 + 40 / dist)) * 0.94;
        p.x += p.vx;
        p.y += p.vy;

        if (dist < inletR * 0.6) {
          particles.splice(i, 1);
          count++;
          pulse = 1;
          if (countEl) countEl.textContent = String(count);
          continue;
        }
        const shrink = Math.max(0.25, Math.min(1, (dist - inletR * 0.6) / (inletR * 3)));
        drawParticle(p, shrink);
      }

      if (particles.length < 40 && Math.random() < 0.05) {
        const ang = rand(0, Math.PI * 2);
        const dist = rand(inletR * 2.4, Math.min(cw, ch) * 0.46);
        spawnRandom(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist);
      }
      raf = requestAnimationFrame(step);
    }

    function pointerToLocal(evt) {
      const rect = stage.getBoundingClientRect();
      return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
    }

    function scatterAt(x, y, n) {
      for (let i = 0; i < n; i++) {
        spawnRandom(x + rand(-30, 30), y + rand(-30, 30));
      }
    }

    function bumpCount(n) {
      count += n;
      if (countEl) countEl.textContent = String(count);
    }

    stage.addEventListener("click", (evt) => {
      const { x, y } = pointerToLocal(evt);
      if (reducedMotion()) {
        bumpCount(4);
        return;
      }
      scatterAt(x, y, 5);
    });

    scatterBtn?.addEventListener("click", () => {
      if (reducedMotion()) {
        bumpCount(10);
        return;
      }
      scatterAt(cx + rand(-cw * 0.3, cw * 0.3), cy + rand(-ch * 0.3, ch * 0.3), 10);
    });

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(size, 150);
    });

    size();
    if (!reducedMotion()) raf = requestAnimationFrame(step);
  })();

  /* ===== Cleaning mode mini demos ===== */
  (function initModeCanvases() {
    const canvases = document.querySelectorAll(".mode-canvas");
    if (!canvases.length) return;

    const paths = {
      carpet: (w, h) => {
        const cx = w * 0.5, cy = h * 0.55, r = Math.min(w, h) * 0.22;
        const pts = [];
        for (let i = 0; i <= 60; i++) {
          const t = (i / 60) * Math.PI * 4;
          pts.push({ x: cx + Math.cos(t) * r * (0.4 + 0.6 * (i % 20) / 20), y: cy + Math.sin(t) * r * (0.4 + 0.6 * (i % 20) / 20) });
        }
        return pts;
      },
      edges: (w, h) => {
        const m = Math.min(w, h) * 0.14;
        return [
          { x: m, y: m }, { x: w - m, y: m }, { x: w - m, y: h - m },
          { x: m, y: h - m }, { x: m, y: m },
        ];
      },
      daily: (w, h) => {
        const rows = 5;
        const m = Math.min(w, h) * 0.12;
        const pts = [];
        for (let r = 0; r < rows; r++) {
          const y = m + (r * (h - m * 2)) / (rows - 1);
          if (r % 2 === 0) pts.push({ x: m, y }, { x: w - m, y });
          else pts.push({ x: w - m, y }, { x: m, y });
        }
        return pts;
      },
    };

    canvases.forEach((canvas) => {
      const mode = canvas.dataset.mode;
      const toggle = document.querySelector(`.play-toggle[data-target="${mode}"]`);
      const ctx = canvas.getContext("2d");
      let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
      let route = [];
      let idx = 0, t = 0;
      let playing = !reducedMotion();
      let raf = null;

      function size() {
        const rect = canvas.getBoundingClientRect();
        w = rect.width; h = rect.height;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        route = paths[mode] ? paths[mode](w, h) : [];
        drawBackground(true);
      }

      function drawBackground(clearAll) {
        if (clearAll) {
          ctx.fillStyle = "#eef6f4";
          ctx.fillRect(0, 0, w, h);
        } else {
          ctx.fillStyle = "rgba(238,246,244,0.2)";
          ctx.fillRect(0, 0, w, h);
        }
        ctx.strokeStyle = "rgba(15,23,42,0.1)";
        ctx.lineWidth = 1;
        ctx.strokeRect(8, 8, w - 16, h - 16);
      }

      function drawDot(x, y) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
        g.addColorStop(0, "rgba(14,165,233,0.9)");
        g.addColorStop(1, "rgba(14,165,233,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0ea5e9";
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }

      function frame() {
        if (!playing || route.length < 2) return;
        drawBackground(false);
        const a = route[idx];
        const b = route[(idx + 1) % route.length];
        t += 0.012;
        if (t >= 1) { t = 0; idx = (idx + 1) % route.length; }
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        drawDot(x, y);
        raf = requestAnimationFrame(frame);
      }

      function play() {
        playing = true;
        toggle?.setAttribute("aria-pressed", "true");
        toggle?.querySelector(".icon-pause")?.removeAttribute("hidden");
        toggle?.querySelector(".icon-play")?.setAttribute("hidden", "");
        drawBackground(true);
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(frame);
      }
      function pause() {
        playing = false;
        cancelAnimationFrame(raf);
        toggle?.setAttribute("aria-pressed", "false");
        toggle?.querySelector(".icon-pause")?.setAttribute("hidden", "");
        toggle?.querySelector(".icon-play")?.removeAttribute("hidden");
        if (route.length) drawDot(route[0].x, route[0].y);
      }

      toggle?.addEventListener("click", () => (playing ? pause() : play()));

      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting && playing) pause();
        });
      }, { threshold: 0.05 });
      io.observe(canvas);

      window.addEventListener("resize", () => {
        const wasPlaying = playing;
        size();
        if (wasPlaying) play(); else pause();
      });

      size();
      if (playing) play(); else pause();
    });
  })();
})();
