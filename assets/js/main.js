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
      grad.addColorStop(0, "#3c3626");
      grad.addColorStop(1, "#28241c");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);

      const speckles = Math.floor((cw * ch) / 900);
      for (let i = 0; i < speckles; i++) {
        const x = Math.random() * cw;
        const y = Math.random() * ch;
        const r = Math.random() * 1.6 + 0.3;
        const shade = 150 + Math.random() * 60;
        ctx.fillStyle = `rgba(${shade | 0}, ${shade | 0}, ${(shade - 20) | 0}, ${0.12 + Math.random() * 0.2})`;
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
        g.addColorStop(0, "rgba(90,80,60,0.35)");
        g.addColorStop(1, "rgba(90,80,60,0)");
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
          ctx.fillStyle = "#0c1526";
          ctx.fillRect(0, 0, w, h);
        } else {
          ctx.fillStyle = "rgba(12,21,38,0.14)";
          ctx.fillRect(0, 0, w, h);
        }
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 1;
        ctx.strokeRect(8, 8, w - 16, h - 16);
      }

      function drawDot(x, y) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
        g.addColorStop(0, "rgba(34,211,238,0.9)");
        g.addColorStop(1, "rgba(34,211,238,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#22d3ee";
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
