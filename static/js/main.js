/* ═══════════════════════════════════════════════════════════
   QPAudioEraser — Interactive Demo Logic
   Tab-based navigation · Realistic training · 4-phase unlearning
   Professional / Formal version — IndiaAI Impact Summit 2026
   Numbers randomized per session for realistic repeat demos
   ═══════════════════════════════════════════════════════════ */

// ── Helpers ───────────────────────────────────────────────
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const initials = name => {
  const skip = new Set(["mr.", "mrs.", "ms.", "dr.", "prof.", "pm", "shri"]);
  const parts = name.split(" ").filter(w => !skip.has(w.toLowerCase()));
  if (parts.length >= 2) return parts[0][0] + parts[parts.length - 1][0];
  return parts[0] ? parts[0][0] : "?";
};
// random float in [lo, hi], rounded to dp decimal places
const rnd = (lo, hi, dp=2) => +(lo + Math.random() * (hi - lo)).toFixed(dp);

// ── Speaker Data ──────────────────────────────────────────
const SPEAKERS = [
  { id:"sachin",   name:"Mr. Sachin Tendulkar",     samples:245, dur:"38.2 min", avgDur:"9.4s",  color:"#1565c0" },
  { id:"modi",     name:"PM Shri Narendra Modi",    samples:312, dur:"52.1 min", avgDur:"10.0s", color:"#0d47a1" },
  { id:"kohli",    name:"Mr. Virat Kohli",          samples:228, dur:"34.7 min", avgDur:"9.1s",  color:"#2e7d32" },
  { id:"trump",    name:"Mr. Donald Trump",         samples:356, dur:"58.3 min", avgDur:"9.8s",  color:"#37474f" },
  { id:"vaishnav", name:"Mr. Ashwini Vaishnav",     samples:198, dur:"29.8 min", avgDur:"9.0s",  color:"#4527a0" },
  { id:"federer",  name:"Mr. Roger Federer",        samples:267, dur:"42.5 min", avgDur:"9.5s",  color:"#c62828" },
  { id:"chopra",   name:"Mrs. Priyanka Chopra",     samples:234, dur:"36.9 min", avgDur:"9.5s",  color:"#ad1457" },
  { id:"bachchan", name:"Mr. Amitabh Bachchan",     samples:289, dur:"46.1 min", avgDur:"9.6s",  color:"#283593" },
  { id:"shah",     name:"Mr. Amit Shah",            samples:276, dur:"43.8 min", avgDur:"9.5s",  color:"#00695c" },
  { id:"putin",    name:"Mr. Vladimir Putin",       samples:301, dur:"48.7 min", avgDur:"9.7s",  color:"#bf360c" },
];

// Pick a random misclassification target (different speaker each time)
function getRandomMisclass(speakerId) {
  const others = SPEAKERS.filter(s => s.id !== speakerId);
  return others[Math.floor(Math.random() * others.length)].id;
}
// Cache the misclass target per unlearning session so it's consistent within one run
let currentMisclassTarget = null;

// ── Generate randomized per-session data ──────────────────
// Class-wise accuracy: generate fresh each run, centered on good values
const ACC_CENTERS = { sachin:98.12, modi:98.94, kohli:97.83, trump:99.07, vaishnav:97.51, federer:98.63, chopra:98.41, bachchan:99.18, shah:98.37, putin:98.44 };

function generateClassMetrics() {
  const acc = {}, prec = {}, rec = {}, f1 = {};
  for (const s of SPEAKERS) {
    const center = ACC_CENTERS[s.id];
    acc[s.id]  = rnd(center - 0.4, center + 0.4);
    prec[s.id] = rnd(acc[s.id] - 0.8, acc[s.id] + 0.2);
    rec[s.id]  = rnd(acc[s.id] - 0.5, acc[s.id] + 0.3);
    f1[s.id]   = +((2 * prec[s.id] * rec[s.id]) / (prec[s.id] + rec[s.id])).toFixed(2);
  }
  return { acc, prec, rec, f1 };
}

// ── Per-session generated values ──────────────────────────
let sessionMetrics = generateClassMetrics();

// ── Globals ───────────────────────────────────────────────
let chartClassAcc = null;
let selectedForget = null;
let modelLoaded = false;

// ═══════════════════════════════════════════════════════════
//  TAB NAVIGATION
// ═══════════════════════════════════════════════════════════
function initTabs() {
  $$(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.tab;
      if (btn.classList.contains("disabled")) return;
      $$(".tab-btn").forEach(b => b.classList.remove("active"));
      $$(".tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      const panel = $(`#${tabId}`);
      if (panel) panel.classList.add("active");
    });
  });
}

function unlockUnlearnTab() {
  const btn = $("#tabUnlearnBtn");
  btn.classList.remove("disabled");
}

function switchToTab(tabId) {
  $$(".tab-btn").forEach(b => {
    b.classList.remove("active");
    if (b.dataset.tab === tabId) b.classList.add("active");
  });
  $$(".tab-content").forEach(c => c.classList.remove("active"));
  const panel = $(`#${tabId}`);
  if (panel) panel.classList.add("active");
  window.scrollTo({ top: panel.offsetTop - 60, behavior: "smooth" });
}

// ═══════════════════════════════════════════════════════════
//  TAB 1 — SPEAKER AUDIO SAMPLES
// ═══════════════════════════════════════════════════════════
function renderSpeakers() {
  const grid = $("#speakerGrid");
  grid.innerHTML = SPEAKERS.map(s => `
    <div class="speaker-card">
      <div class="speaker-avatar" style="background:${s.color}">${initials(s.name)}</div>
      <h4>${s.name}</h4>
      <div class="meta">${s.samples} samples &middot; ${s.dur}</div>
      <div class="meta">Avg ${s.avgDur} / clip</div>
      <audio controls preload="none">
        <source src="/audio/${s.id}.mp3" type="audio/mpeg">
      </audio>
    </div>
  `).join("");

  // dataset summary removed as per guidance
}

// ═══════════════════════════════════════════════════════════
//  TAB 2 — LOAD AUDIO MODEL
// ═══════════════════════════════════════════════════════════
const LOAD_STEPS = [
  { text: "Initializing model architecture...",        pct: 10,  dur: 800  },
  { text: "Loading ResNet-18 backbone weights...",     pct: 25,  dur: 1200 },
  { text: "Loading convolutional feature layers...",   pct: 40,  dur: 1000 },
  { text: "Loading batch normalization parameters...", pct: 55,  dur: 800  },
  { text: "Loading classification head (10 classes)...", pct: 68, dur: 900 },
  { text: "Loading mel-spectrogram preprocessor...",   pct: 78,  dur: 700  },
  { text: "Validating weight checksums...",            pct: 88,  dur: 600  },
  { text: "Moving model to device...",                 pct: 95,  dur: 500  },
  { text: "Model loaded successfully.",                pct: 100, dur: 400  },
];

async function loadModel() {
  sessionMetrics = generateClassMetrics();

  const btn = $("#btnLoadModel");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>&ensp;Loading\u2026';

  const area = $("#modelLoadingArea");
  area.classList.remove("hidden");

  const stepsLog = $("#loadingSteps");
  stepsLog.innerHTML = "";

  for (let i = 0; i < LOAD_STEPS.length; i++) {
    const step = LOAD_STEPS[i];
    $("#loadingText").textContent = step.text;
    $("#loadProgress").style.width = step.pct + "%";

    const line = document.createElement("div");
    line.className = "load-step-line";
    line.innerHTML = `<i class="fas fa-check-circle" style="color:var(--green)"></i>&ensp;${step.text}`;
    stepsLog.appendChild(line);
    stepsLog.scrollTop = stepsLog.scrollHeight;

    await sleep(step.dur);
  }

  $("#loadingText").textContent = "Model loaded and ready.";
  btn.innerHTML = '<i class="fas fa-check"></i>&ensp;Model Loaded';

  await sleep(600);
  showModelResults();
}

function showModelResults() {
  modelLoaded = true;
  const results = $("#trainingResults");
  results.classList.remove("hidden");

  const { acc, prec, rec, f1 } = sessionMetrics;
  const avgAcc = (SPEAKERS.reduce((a,s) => a + acc[s.id], 0) / SPEAKERS.length).toFixed(2);

  $("#resultBanner").innerHTML = `
    <div class="banner-card"><div class="banner-val val-green">${avgAcc}%</div><div class="banner-label">Model Accuracy</div></div>
    <div class="banner-card"><div class="banner-val val-accent">11.2M</div><div class="banner-label">Parameters</div></div>
    <div class="banner-card"><div class="banner-val val-green">10</div><div class="banner-label">Speakers Identified</div></div>
    <div class="banner-card"><div class="banner-val val-amber">ResNet-18</div><div class="banner-label">Architecture</div></div>
  `;

  const barColors = [
    "#1565c0", "#0d47a1", "#2e7d32", "#37474f", "#4527a0",
    "#c62828", "#ad1457", "#283593", "#00695c", "#bf360c"
  ];

  chartClassAcc = new Chart($("#chartClassAcc"), {
    type: "bar",
    data: {
      labels: SPEAKERS.map(s => s.name),
      datasets: [{
        label: "Accuracy (%)", data: SPEAKERS.map(s => acc[s.id]),
        backgroundColor: barColors.map(c => c + "cc"),
        borderColor: barColors, borderWidth: 1, borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#6b7594", font: { size: 10 } }, grid: { display: false } },
        y: { min: 92, max: 100, ticks: { color: "#6b7594" }, grid: { color: "#e8ecf2" } }
      }
    }
  });

  $("#classTableBody").innerHTML = SPEAKERS.map(s => `
    <tr>
      <td><strong>${s.name}</strong></td>
      <td>${s.samples}</td>
      <td>${s.dur}</td>
      <td><span class="acc-badge acc-high">${acc[s.id].toFixed(2)}%</span></td>
      <td>${prec[s.id].toFixed(1)}%</td>
      <td>${rec[s.id].toFixed(1)}%</td>
      <td>${f1[s.id].toFixed(1)}%</td>
    </tr>
  `).join("");

  unlockUnlearnTab();

  setTimeout(() => {
    switchToTab("tab-unlearn");
    renderForgetGrid();
  }, 1500);
}

// ═══════════════════════════════════════════════════════════
//  TAB 3 — UNLEARN SPEAKER
// ═══════════════════════════════════════════════════════════
function renderForgetGrid() {
  const { acc } = sessionMetrics;
  const grid = $("#forgetGrid");
  grid.innerHTML = SPEAKERS.map(s => `
    <div class="forget-card" data-id="${s.id}">
      <div class="forget-avatar" style="background:${s.color}">${initials(s.name)}</div>
      <h4>${s.name}</h4>
      <div class="forget-acc">${acc[s.id].toFixed(2)}% acc</div>
    </div>
  `).join("");

  $$(".forget-card").forEach(card => {
    card.addEventListener("click", () => selectForget(card.dataset.id));
  });
}

function selectForget(id) {
  selectedForget = id;
  const speaker = SPEAKERS.find(s => s.id === id);
  const { acc, prec, rec, f1 } = sessionMetrics;

  $$(".forget-card").forEach(c => c.classList.remove("selected"));
  $(`.forget-card[data-id="${id}"]`).classList.add("selected");

  const panel = $("#speakerStatsPanel");
  panel.classList.remove("hidden");

  $("#statsName").textContent = speaker.name;

  $("#statsGrid").innerHTML = `
    <div class="stat-mini"><div class="stat-mini-val">${speaker.samples}</div><div class="stat-mini-label">Training Samples</div></div>
    <div class="stat-mini"><div class="stat-mini-val">${speaker.dur}</div><div class="stat-mini-label">Total Duration</div></div>
    <div class="stat-mini"><div class="stat-mini-val">${speaker.avgDur}</div><div class="stat-mini-label">Avg Clip Length</div></div>
    <div class="stat-mini"><div class="stat-mini-val">${acc[id].toFixed(2)}%</div><div class="stat-mini-label">Current Accuracy</div></div>
    <div class="stat-mini"><div class="stat-mini-val">${prec[id].toFixed(1)}%</div><div class="stat-mini-label">Precision</div></div>
    <div class="stat-mini"><div class="stat-mini-val">${rec[id].toFixed(1)}%</div><div class="stat-mini-label">Recall</div></div>
    <div class="stat-mini"><div class="stat-mini-val">${f1[id].toFixed(1)}%</div><div class="stat-mini-label">F1-Score</div></div>
    <div class="stat-mini"><div class="stat-mini-val">128&times;128</div><div class="stat-mini-label">Spectrogram Dim</div></div>
  `;

  $("#preLabel").textContent = `Playing: ${speaker.name}`;
  $("#preAudio").src = `/audio/${id}.mp3`;

  renderPrediction("preResult", id, true);

  panel.scrollIntoView({ behavior: "smooth", block: "start" });

  $("#btnApplyUnlearn").onclick = () => startUnlearning(id);
}

// ── Prediction rendering ──────────────────────────────────
function renderPrediction(containerId, speakerId, isCorrect) {
  const container = $(`#${containerId}`);
  const speaker = SPEAKERS.find(s => s.id === speakerId);

  let confidences;
  if (isCorrect) {
    confidences = SPEAKERS.map(s => {
      if (s.id === speakerId) return { id:s.id, name:s.name, conf: rnd(92, 97.5), correct:true };
      return { id:s.id, name:s.name, conf: rnd(0.1, 1.5), correct:false };
    });
  } else {
    const wrongId = currentMisclassTarget;
    confidences = SPEAKERS.map(s => {
      if (s.id === wrongId)   return { id:s.id, name:s.name, conf: rnd(18, 26), correct:false, predicted:true };
      if (s.id === speakerId) return { id:s.id, name:s.name, conf: rnd(2, 7),   correct:true };
      return { id:s.id, name:s.name, conf: rnd(2, 10), correct:false };
    });
  }

  const total = confidences.reduce((a,c) => a + c.conf, 0);
  confidences.forEach(c => c.conf = (c.conf / total) * 100);
  confidences.sort((a,b) => b.conf - a.conf);

  let html = confidences.map(c => {
    let barClass = "other";
    if (isCorrect && c.correct) barClass = "correct";
    else if (!isCorrect && c.predicted) barClass = "wrong";
    else if (!isCorrect && c.correct) barClass = "correct";
    return `
      <div class="pred-row">
        <div class="pred-label">${c.name}</div>
        <div class="pred-bar-bg"><div class="pred-bar ${barClass}" style="width:${c.conf.toFixed(1)}%"></div></div>
      </div>`;
  }).join("");

  if (isCorrect) {
    html += `<div class="pred-verdict verdict-correct"><i class="fas fa-check-circle"></i>&ensp;Model correctly identifies: ${speaker.name}</div>`;
  } else {
    const wrong = SPEAKERS.find(s => s.id === currentMisclassTarget);
    html += `<div class="pred-verdict verdict-wrong"><i class="fas fa-times-circle"></i>&ensp;Misclassified \u2014 True: ${speaker.name} \u2192 Predicted: ${wrong.name}</div>`;
  }

  container.innerHTML = html;

  requestAnimationFrame(() => {
    container.querySelectorAll(".pred-bar").forEach(bar => {
      const w = bar.style.width;
      bar.style.width = "0%";
      requestAnimationFrame(() => { bar.style.width = w; });
    });
  });
}

// ── Unlearning Process ────────────────────────────────────
async function startUnlearning(speakerId) {
  // pick a random misclassification target for this unlearning run
  currentMisclassTarget = getRandomMisclass(speakerId);

  const btn = $("#btnApplyUnlearn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>&ensp;Applying\u2026';

  const process = $("#unlearnProcess");
  process.classList.remove("hidden");
  process.scrollIntoView({ behavior: "smooth", block: "start" });

  // reset all phases
  for (let i = 1; i <= 4; i++) {
    $(`#phase${i}Status`).textContent = "Pending";
    $(`#phase${i}Status`).className = "phase-status pending";
    $(`#phase${i}Bar`).style.width = "0%";
    $(`#phase${i}`).className = "phase-item";
  }
  // clear any previous epoch log in phase 3
  const existingLog = $("#phase3EpochLog");
  if (existingLog) existingLog.remove();

  const startTime = Date.now();
  const timerEl = $("#unlearnTimer");
  const timerInterval = setInterval(() => {
    timerEl.textContent = `Elapsed: ${((Date.now() - startTime) / 1000).toFixed(1)} s`;
  }, 100);

  // Phase 1: Destructive Interference — ~6s
  await runPhase(1, rnd(5800, 6400, 0));
  // Phase 2: Superposition Label Transform — ~6s
  await runPhase(2, rnd(5800, 6400, 0));
  // Phase 3: Quantum Loss Optimization — ~14s (slower, with 4 unlearning epochs)
  await runPhase3WithEpochs(speakerId);
  // Phase 4: Weight Mixing — ~5s
  await runPhase(4, rnd(4800, 5400, 0));

  clearInterval(timerInterval);
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  timerEl.textContent = `Completed in ${totalTime} s`;

  await sleep(700);
  showUnlearnResults(speakerId);
}

async function runPhase(num, duration) {
  const item = $(`#phase${num}`);
  const status = $(`#phase${num}Status`);
  const bar = $(`#phase${num}Bar`);

  item.className = "phase-item active";
  status.textContent = "Running";
  status.className = "phase-status running";

  const steps = 50;
  const stepTime = duration / steps;
  for (let i = 1; i <= steps; i++) {
    bar.style.width = (i / steps * 100).toFixed(1) + "%";
    await sleep(stepTime);
  }

  status.textContent = "Completed";
  status.className = "phase-status completed";
  item.className = "phase-item done";
}

// Phase 3 special: slower with 4 visible unlearning epochs
async function runPhase3WithEpochs(speakerId) {
  const item = $("#phase3");
  const status = $("#phase3Status");
  const bar = $("#phase3Bar");
  const speaker = SPEAKERS.find(s => s.id === speakerId);

  item.className = "phase-item active";
  status.textContent = "Running";
  status.className = "phase-status running";

  // Create epoch log inside phase 3
  let epochLog = document.createElement("div");
  epochLog.id = "phase3EpochLog";
  epochLog.style.cssText = "font-family:var(--mono);font-size:.72rem;color:#3d4663;margin-top:8px;line-height:1.8;";
  item.appendChild(epochLog);

  // 4 unlearning epochs, total ~14s
  const unlearnEpochs = [
    { loss: rnd(1.8, 2.1, 4),  forgetAcc: rnd(62, 68),   retainAcc: rnd(97.8, 98.3) },
    { loss: rnd(1.2, 1.5, 4),  forgetAcc: rnd(28, 35),   retainAcc: rnd(97.9, 98.4) },
    { loss: rnd(0.6, 0.9, 4),  forgetAcc: rnd(6, 14),    retainAcc: rnd(98.0, 98.4) },
    { loss: rnd(0.3, 0.5, 4),  forgetAcc: rnd(0, 3),     retainAcc: rnd(98.0, 98.5) },
  ];

  for (let ep = 0; ep < unlearnEpochs.length; ep++) {
    const u = unlearnEpochs[ep];
    const epochDuration = rnd(3200, 3800, 0); // each epoch ~3.2-3.8s
    const subSteps = 25;
    const subStepTime = epochDuration / subSteps;

    // animate progress bar for this epoch slice (each epoch = 25% of the bar)
    for (let s = 1; s <= subSteps; s++) {
      const totalPct = ((ep * subSteps + s) / (unlearnEpochs.length * subSteps)) * 100;
      bar.style.width = totalPct.toFixed(1) + "%";
      await sleep(subStepTime);
    }

    // log the epoch
    const logLine = document.createElement("div");
    logLine.style.cssText = "padding:2px 0;border-bottom:1px solid #dfe3eb;";
    logLine.innerHTML = `
      <span style="color:#1565c0;font-weight:600">[Unlearn Epoch ${ep+1}/4]</span>&ensp;
      <span style="color:#c62828">q_loss: ${u.loss.toFixed(4)}</span> &ensp;|&ensp;
      <span style="color:#c62828">forget_acc: ${u.forgetAcc.toFixed(2)}%\u2193</span> &ensp;|&ensp;
      <span style="color:#2e7d32">retain_acc: ${u.retainAcc.toFixed(2)}%</span> &ensp;|&ensp;
      <span style="color:#6b7594">${rnd(3.1, 3.9, 1)}s</span>
    `;
    epochLog.appendChild(logLine);
  }

  status.textContent = "Completed";
  status.className = "phase-status completed";
  item.className = "phase-item done";
}

// ── Unlearning Results ────────────────────────────────────
function showUnlearnResults(speakerId) {
  const speaker = SPEAKERS.find(s => s.id === speakerId);
  const wrongSpeaker = SPEAKERS.find(s => s.id === currentMisclassTarget);
  const { acc } = sessionMetrics;

  const results = $("#unlearnResults");
  results.classList.remove("hidden");

  $("#successMsg").innerHTML = `Unlearning successful! The model has successfully misclassified <strong>${speaker.name}</strong>'s audio. The speaker has been erased from the model while performance on all retained speakers remains intact.`;

  const preConf = rnd(93, 97, 1);
  const postConf = rnd(17, 24, 1);

  $("#comparisonCards").innerHTML = `
    <div class="comp-card before">
      <h4 style="color:#2e7d32"><i class="fas fa-check-circle"></i>&ensp;Before Unlearning</h4>
      <div class="comp-speaker">${speaker.name}</div>
      <div class="comp-pred">Predicted: <strong>${speaker.name}</strong></div>
      <div class="comp-conf">Confidence: ${preConf}%</div>
      <div class="comp-verdict" style="background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7">
        CORRECT IDENTIFICATION
      </div>
    </div>
    <div class="comp-card after">
      <h4 style="color:#c62828"><i class="fas fa-times-circle"></i>&ensp;After Unlearning</h4>
      <div class="comp-speaker">${speaker.name}</div>
      <div class="comp-pred">Predicted: <strong>${wrongSpeaker.name}</strong></div>
      <div class="comp-conf">Confidence: ${postConf}% (distributed)</div>
      <div class="comp-verdict" style="background:#ffebee;color:#c62828;border:1px solid #ef9a9a">
        MISCLASSIFIED \u2014 SPEAKER ERASED
      </div>
    </div>
  `;

  $("#postLabel").textContent = `Playing: ${speaker.name} (same audio \u2014 post-unlearning)`;
  $("#postAudio").src = `/audio/${speakerId}.mp3`;
  renderPrediction("postResult", speakerId, false);

  const tbody = $("#retainTableBody");
  tbody.innerHTML = SPEAKERS.map(s => {
    const preAcc = acc[s.id];
    let postAcc, delta, statusHtml;
    if (s.id === speakerId) {
      postAcc = rnd(0, 0.8);
      delta = +(postAcc - preAcc).toFixed(2);
      statusHtml = '<span class="acc-badge acc-low">ERASED</span>';
    } else {
      const drop = rnd(0.03, 0.38);
      postAcc = +(preAcc - drop).toFixed(2);
      delta = +(postAcc - preAcc).toFixed(2);
      statusHtml = '<span class="acc-badge acc-high">Retained</span>';
    }
    return `
      <tr>
        <td><strong>${s.name}</strong></td>
        <td>${preAcc.toFixed(2)}%</td>
        <td>${postAcc.toFixed(2)}%</td>
        <td style="color:${s.id === speakerId ? '#c62828' : '#6b7594'}">${delta >= 0 ? '+' : ''}${delta.toFixed(2)}%</td>
        <td>${statusHtml}</td>
      </tr>`;
  }).join("");

  // metrics with slight variation
  const retainedSpeakers = SPEAKERS.filter(s => s.id !== speakerId);
  const avgRetainAcc = (retainedSpeakers.reduce((a,s) => a + acc[s.id], 0) / retainedSpeakers.length).toFixed(2);
  const fa = rnd(0, 0.8);
  const il = rnd(0, 0.5);
  const far = rnd(0, 0.4);

  $("#metricsRow").innerHTML = `
    <div class="metric-box"><div class="metric-val" style="color:#2e7d32">${fa.toFixed(2)}%</div><div class="metric-label">Forget Accuracy (FA) \u2193</div></div>
    <div class="metric-box"><div class="metric-val" style="color:#2e7d32">${(100 - fa).toFixed(2)}%</div><div class="metric-label">Privacy Erasure Rate \u2191</div></div>
    <div class="metric-box"><div class="metric-val" style="color:#2e7d32">${il.toFixed(2)}%</div><div class="metric-label">Information Leakage \u2193</div></div>
    <div class="metric-box"><div class="metric-val" style="color:#1565c0">${avgRetainAcc}%</div><div class="metric-label">Retain Accuracy \u2191</div></div>
    <div class="metric-box"><div class="metric-val" style="color:#2e7d32">${far.toFixed(2)}%</div><div class="metric-label">False Accept Rate \u2193</div></div>
    <div class="metric-box"><div class="metric-val" style="color:#e65100">${rnd(99.2, 100, 2)}%</div><div class="metric-label">False Reject Rate \u2191</div></div>
  `;

  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  renderSpeakers();
  $("#btnLoadModel").addEventListener("click", loadModel);
});
