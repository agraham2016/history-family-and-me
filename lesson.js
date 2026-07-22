/* ===========================================================
   Lesson 1 — Meet Your Family Tree (interactivity)
   =========================================================== */
(function () {
  "use strict";

  var STORAGE_KEY = "hfm-lesson-1";
  var TOTAL_ACTIVITIES = 5;
  var STARS_PER_ACTIVITY = 20;
  var STARS_PER_QUIZ = 10;

  /* ---- State (persisted to localStorage) ---- */
  var state = loadState();

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return { done: [], stars: 0, tree: {}, quiz: {} };
  }
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  /* ---- Elements ---- */
  var starCount = document.getElementById("starCount");
  var doneCount = document.getElementById("doneCount");
  var barFill = document.getElementById("barProgressFill");
  var pathItems = Array.prototype.slice.call(document.querySelectorAll("#pathList li"));

  /* ---- Render helpers ---- */
  function isDone(n) { return state.done.indexOf(n) !== -1; }

  function render() {
    starCount.textContent = state.stars;
    doneCount.textContent = state.done.length;
    var pct = Math.round((state.done.length / TOTAL_ACTIVITIES) * 100);
    barFill.style.width = pct + "%";

    // Activities + path dots
    for (var n = 1; n <= TOTAL_ACTIVITIES; n++) {
      var art = document.getElementById("act-" + n);
      var btn = document.querySelector('[data-complete="' + n + '"]');
      var done = isDone(n);
      if (art) art.classList.toggle("is-done", done);
      if (btn && done) {
        btn.classList.add("is-done");
        btn.textContent = "Completed \u2713";
      }
    }
    pathItems.forEach(function (li) {
      var jump = li.getAttribute("data-jump");
      if (jump === "reward") {
        li.classList.toggle("is-done", state.done.length >= TOTAL_ACTIVITIES);
      } else {
        var n = parseInt(jump.replace("act-", ""), 10);
        li.classList.toggle("is-done", isDone(n));
      }
    });

    // Reward
    var locked = document.getElementById("rewardLocked");
    var unlocked = document.getElementById("rewardUnlocked");
    if (state.done.length >= TOTAL_ACTIVITIES) {
      locked.hidden = true;
      unlocked.hidden = false;
    } else {
      locked.hidden = false;
      unlocked.hidden = true;
    }
  }

  function completeActivity(n) {
    if (isDone(n)) return;
    state.done.push(n);
    state.stars += STARS_PER_ACTIVITY;
    saveState();
    render();
    if (state.done.length >= TOTAL_ACTIVITIES) {
      launchConfetti();
      var reward = document.getElementById("reward");
      if (reward) reward.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  /* ---- "Mark complete" buttons ---- */
  document.querySelectorAll("[data-complete]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      completeActivity(parseInt(btn.getAttribute("data-complete"), 10));
    });
  });

  /* ---- Path navigation ---- */
  pathItems.forEach(function (li) {
    li.addEventListener("click", function () {
      var el = document.getElementById(li.getAttribute("data-jump"));
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  /* ---- Reset ---- */
  document.getElementById("resetBtn").addEventListener("click", function () {
    if (!confirm("Start this lesson over? Your stars and family tree names will be cleared.")) return;
    state = { done: [], stars: 0, tree: {}, quiz: {} };
    saveState();
    // clear inputs + quiz UI
    document.querySelectorAll("[data-tree]").forEach(function (i) { i.value = ""; });
    document.querySelectorAll(".tree-node").forEach(function (node) {
      node.classList.remove("is-filled");
      node.textContent = defaultNodeLabel(node.getAttribute("data-node"));
    });
    document.querySelectorAll(".quiz-q").forEach(function (q) {
      q.classList.remove("answered");
      q.querySelectorAll("button").forEach(function (b) { b.classList.remove("correct", "wrong"); });
    });
    var quizBtn = document.querySelector('[data-complete="4"]');
    quizBtn.disabled = true;
    quizBtn.textContent = "Finish the quiz to continue";
    document.querySelectorAll(".btn-done").forEach(function (b) { b.classList.remove("is-done"); });
    render();
  });

  /* ---- Read aloud (Web Speech API) ---- */
  var readBtn = document.getElementById("readAloud");
  var storyEl = document.getElementById("storyText");
  var synth = window.speechSynthesis;
  if (readBtn && synth) {
    readBtn.addEventListener("click", function () {
      if (synth.speaking) {
        synth.cancel();
        return; // 'end' handler resets UI
      }
      var utter = new SpeechSynthesisUtterance(storyEl.innerText);
      utter.rate = 0.95;
      utter.pitch = 1.05;
      utter.onstart = function () {
        readBtn.classList.add("is-playing");
        readBtn.innerHTML = '<span class="read-ico" aria-hidden="true">&#9632;</span> Stop';
        storyEl.classList.add("is-reading");
      };
      utter.onend = utter.onerror = function () {
        readBtn.classList.remove("is-playing");
        readBtn.innerHTML = '<span class="read-ico" aria-hidden="true">&#128266;</span> Read to me';
        storyEl.classList.remove("is-reading");
      };
      synth.speak(utter);
    });
    // Stop speech if leaving the page
    window.addEventListener("beforeunload", function () { if (synth.speaking) synth.cancel(); });
  } else if (readBtn) {
    readBtn.style.display = "none";
  }

  /* ---- Family tree builder ---- */
  function defaultNodeLabel(key) {
    return { me: "You", mom: "Mom", dad: "Dad", gma: "Grandma", gpa: "Grandpa" }[key] || "";
  }
  function updateNode(key, value) {
    var node = document.querySelector('.tree-node[data-node="' + key + '"]');
    if (!node) return;
    var name = (value || "").trim();
    if (name) {
      node.textContent = name;
      node.classList.add("is-filled");
    } else {
      node.textContent = defaultNodeLabel(key);
      node.classList.remove("is-filled");
    }
  }
  document.querySelectorAll("[data-tree]").forEach(function (input) {
    var key = input.getAttribute("data-tree");
    if (state.tree[key]) { input.value = state.tree[key]; updateNode(key, state.tree[key]); }
    input.addEventListener("input", function () {
      state.tree[key] = input.value;
      updateNode(key, input.value);
      saveState();
    });
  });

  /* ---- Quiz ---- */
  var quizQs = Array.prototype.slice.call(document.querySelectorAll(".quiz-q"));
  function checkQuizComplete() {
    var allAnswered = quizQs.every(function (q, i) { return state.quiz["q" + i] !== undefined; });
    var quizBtn = document.querySelector('[data-complete="4"]');
    if (allAnswered && !isDone(4)) {
      quizBtn.disabled = false;
      quizBtn.textContent = "Great job! Continue \u2713";
    }
  }
  quizQs.forEach(function (q, i) {
    var answer = q.getAttribute("data-answer");
    var buttons = Array.prototype.slice.call(q.querySelectorAll("button"));

    // restore previously answered state
    if (state.quiz["q" + i] !== undefined) {
      q.classList.add("answered");
      buttons.forEach(function (b) {
        if (b.getAttribute("data-choice") === answer) b.classList.add("correct");
      });
    }

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (q.classList.contains("answered")) return;
        var choice = btn.getAttribute("data-choice");
        q.classList.add("answered");
        var correctBtn = q.querySelector('[data-choice="' + answer + '"]');
        correctBtn.classList.add("correct");
        if (choice === answer) {
          state.stars += STARS_PER_QUIZ;
        } else {
          btn.classList.add("wrong");
        }
        state.quiz["q" + i] = choice;
        saveState();
        render();
        checkQuizComplete();
      });
    });
  });
  checkQuizComplete();

  /* ---- Print mission ---- */
  var printBtn = document.getElementById("printMission");
  if (printBtn) printBtn.addEventListener("click", function () { window.print(); });

  /* ---- Confetti ---- */
  var canvas = document.getElementById("confetti");
  var ctx = canvas ? canvas.getContext("2d") : null;
  var pieces = [];
  var rafId = null;

  function sizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", sizeCanvas);
  sizeCanvas();

  function launchConfetti() {
    if (!ctx) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var colors = ["#f4c430", "#e76f51", "#2a9d8f", "#4a9fd8", "#7a2e3b", "#8367c7"];
    pieces = [];
    for (var i = 0; i < 160; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height * 0.5,
        r: 5 + Math.random() * 7,
        c: colors[(Math.random() * colors.length) | 0],
        vy: 2 + Math.random() * 4,
        vx: -2 + Math.random() * 4,
        rot: Math.random() * Math.PI,
        vr: -0.2 + Math.random() * 0.4
      });
    }
    var start = Date.now();
    if (rafId) cancelAnimationFrame(rafId);
    (function frame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(function (p) {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.vy += 0.03;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
        ctx.restore();
      });
      if (Date.now() - start < 4500) {
        rafId = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    })();
  }

  /* ---- Initial paint ---- */
  render();
})();
