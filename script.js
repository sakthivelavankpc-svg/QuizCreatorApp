/* ------------------------------
   FIREBASE LOGIN + QUIZ STORAGE
--------------------------------*/
const auth = firebase.auth();
const db   = firebase.database();

function sendOTP(phoneNumber) {
  window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('login-button', { size: 'invisible' });
  auth.signInWithPhoneNumber(phoneNumber, window.recaptchaVerifier)
    .then(result => { window.confirmationResult = result; alert('OTP sent!'); })
    .catch(err => alert(err.message));
}

function verifyOTP(code) {
  window.confirmationResult.confirm(code).then(result => {
    const user = result.user;
    alert('Login success for ' + user.phoneNumber);
  });
}

// Example: save a quiz
function saveQuizToFirebase(quizObject) {
  db.ref("quizzes").push(quizObject)
    .then(() => alert("Quiz saved online!"))
    .catch(err => alert("Save failed: " + err.message));
}

// Example: list all quizzes
function loadAllQuizzes() {
  db.ref("quizzes").once("value").then(snapshot => {
    snapshot.forEach(child => console.log(child.key, child.val()));
  });
}

(() => {
  /* ============================
     VISITOR COUNTER (Local)
  ============================ */
  function animateCounter(element, start, end, duration) {
    let startTime = null;
    function update(currentTime) {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const value = Math.floor(progress * (end - start) + start);
      element.textContent = value.toString().padStart(6, "0");
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  function updateVisitCounter() {
    const countEl = document.getElementById("visitDigits");
    if (!countEl) return;
    let visits = parseInt(localStorage.getItem("visitCount") || "0");
    visits++;
    localStorage.setItem("visitCount", visits);
    animateCounter(countEl, 0, visits, 800);
  }
  // run on load
  updateVisitCounter();

  /* ============================
     QUIZ CORE LOGIC
  ============================ */
  const csvFileInput = document.getElementById("csvFileInput");
  const loadCSVBtn = document.getElementById("loadCSVBtn");
  const createManualBtn = document.getElementById("createManualBtn");
  const homeBtn = document.getElementById("homeBtn");
  const configRow = document.getElementById("configRow");
  const totalMinutesInput = document.getElementById("totalMinutes");
  const perQuestionSecondsInput = document.getElementById("perQuestionSeconds");
  const totalMarksInput = document.getElementById("totalMarks");
  const minPassMarksInput = document.getElementById("minPassMarks");
  const csvPreview = document.getElementById("csvPreview");
  const csvTableContainer = document.getElementById("csvTableContainer");
  const importCsvToManualBtn = document.getElementById("importCsvToManualBtn");
  const startQuizBtn_csv = document.getElementById("startQuizBtn_csv");
  const manualSection = document.getElementById("manualSection");
  const manualTableBody = document.querySelector("#manualTable tbody");
  const addRowBtn = document.getElementById("addRowBtn");
  const startQuizBtn_manual = document.getElementById("startQuizBtn_manual");
  const quizSection = document.getElementById("quizSection");
  const questionBox = document.getElementById("questionBox");
  const optionsBox = document.getElementById("optionsBox");
  const timerLabel = document.getElementById("timerLabel");
  const scoreDisplay = document.getElementById("scoreDisplay");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const finishBtn = document.getElementById("finishBtn");
  const autoAdvanceNotice = document.getElementById("autoAdvanceNotice");
  const autoCount = document.getElementById("autoCount");
  const totalTimerSVG = document.querySelector(".totalProgress");
  const questionTimerSVG = document.querySelector(".questionProgress");
  const reviewSection = document.getElementById("reviewSection");
  const reviewTableContainer = document.getElementById("reviewTableContainer");
  const passFailText = document.getElementById("passFailText");
  const printReviewBtn = document.getElementById("printReviewBtn");
  const downloadJsonBtn = document.getElementById("downloadJsonBtn");
  const openHtmlPreviewBtn = document.getElementById("openHtmlPreviewBtn");
  const shareWhatsappBtn = document.getElementById("shareWhatsappBtn");
  const shareGmailBtn = document.getElementById("shareGmailBtn");
  const closeReviewBtn = document.getElementById("closeReviewBtn");

  let quizData = [];
  let currentQuestion = 0;
  let answersGiven = [];
  let scoreMarks = 0;
  let marksPerQuestion = 0;
  let perQuestionMode = false;
  let remainingTotalSeconds = 0;
  let perQuestionRemaining = 0;
  let timerInterval = null;
  let perQuestionTimer = null;
  let autoAdvanceTimer = null;

  const show = (el) => el.classList.remove("hidden");
  const hide = (el) => el.classList.add("hidden");
  const escapeHtml = (s = "") =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /* ---------- CSV LOAD ---------- */
  loadCSVBtn.addEventListener("click", () => csvFileInput.click());
  csvFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split(/\r?\n/).filter((l) => l.trim());
      if (!lines.length) return alert("Empty CSV");
      const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const rows = lines.slice(1).map((line) => {
        const cols = line.split(",").map((c) => c.trim());
        const obj = {};
        header.forEach((h, i) => (obj[h] = cols[i] || ""));
        return {
          question: obj.question || cols[0] || "",
          A: obj.a || cols[1] || "",
          B: obj.b || cols[2] || "",
          C: obj.c || cols[3] || "",
          D: obj.d || cols[4] || "",
          answer: obj.answer || cols[5] || "",
        };
      });
      csvPreview._rows = rows;
      csvTableContainer.innerHTML = buildTable(rows);
      show(csvPreview);
      hide(manualSection);
    };
    reader.readAsText(file, "utf-8");
  });

  function buildTable(rows) {
    let html =
      "<table><tr><th>#</th><th>Question</th><th>A</th><th>B</th><th>C</th><th>D</th><th>Answer</th></tr>";
    rows.forEach(
      (r, i) =>
        (html += `<tr><td>${i + 1}</td><td>${escapeHtml(
          r.question
        )}</td><td>${escapeHtml(r.A)}</td><td>${escapeHtml(r.B)}</td><td>${escapeHtml(
          r.C
        )}</td><td>${escapeHtml(r.D)}</td><td>${escapeHtml(r.answer)}</td></tr>`)
    );
    html += "</table>";
    return html;
  }

  importCsvToManualBtn.addEventListener("click", () => {
    populateManual(csvPreview._rows || []);
    hide(csvPreview);
    show(manualSection);
  });

  /* ---------- MANUAL CREATOR ---------- */
  createManualBtn.addEventListener("click", () => {
    show(manualSection);
  });
  addRowBtn.addEventListener("click", addRow);

  function addRow(data = {}) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${manualTableBody.children.length + 1}</td>
      <td contenteditable class="q-col">${data.question || ""}</td>
      <td contenteditable class="a-col">${data.A || ""}</td>
      <td contenteditable class="b-col">${data.B || ""}</td>
      <td contenteditable class="c-col">${data.C || ""}</td>
      <td contenteditable class="d-col">${data.D || ""}</td>
      <td contenteditable class="ans-col">${data.answer || ""}</td>
      <td><button class="removeRowBtn">❌</button></td>`;
    manualTableBody.appendChild(tr);
  }

  manualTableBody.addEventListener("click", (e) => {
    if (e.target.classList.contains("removeRowBtn")) {
      e.target.closest("tr").remove();
      // reindex
      [...manualTableBody.children].forEach((r, i) => (r.children[0].textContent = i + 1));
    }
  });

  function buildManualData() {
    return [...manualTableBody.querySelectorAll("tr")]
      .map((r) => {
        const t = r.querySelectorAll("td");
        return {
          question: (t[1].innerText || "").trim(),
          A: (t[2].innerText || "").trim(),
          B: (t[3].innerText || "").trim(),
          C: (t[4].innerText || "").trim(),
          D: (t[5].innerText || "").trim(),
          answer: (t[6].innerText || "").trim(),
        };
      })
      .filter((q) => q.question);
  }

  function populateManual(data) {
    manualTableBody.innerHTML = "";
    (data || []).forEach((d) => addRow(d));
  }

  /* ---------- START QUIZ ---------- */
  startQuizBtn_manual.addEventListener("click", () => {
    const data = buildManualData();
    if (!data.length) return alert("Add at least one question!");
    startQuiz(data);
  });

  startQuizBtn_csv.addEventListener("click", () => {
    const data = csvPreview._rows || [];
    if (!data.length) return alert("Load a CSV first!");
    startQuiz(data);
  });

  function startQuiz(data) {
    // prepare
    quizData = data.slice();
    answersGiven = Array(quizData.length).fill(null);
    const totalMinutes = +totalMinutesInput.value || 0;
    const perQSec = +perQuestionSecondsInput.value || 0;
    perQuestionMode = perQSec > 0;
    marksPerQuestion = (+totalMarksInput.value || 100) / Math.max(1, quizData.length);
    scoreMarks = 0;
    // timers
    remainingTotalSeconds = totalMinutes > 0 ? Math.round(totalMinutes * 60) : 0;
    perQuestionRemaining = perQSec > 0 ? perQSec : 0;

    // UI
    hide(configRow);
    hide(manualSection);
    hide(csvPreview);
    hide(document.querySelector(".top-controls"));
    show(quizSection);
    currentQuestion = 0;
    startMainTimer();
    showQuestion();
    updateScoreDisplay();
  }

  /* ===== timers & circles ===== */
  function setCircleProgress(circleElem, fraction) {
    const r = +circleElem.getAttribute("r");
    const c = 2 * Math.PI * r;
    circleElem.style.strokeDasharray = `${c} ${c}`;
    circleElem.style.strokeDashoffset = `${(1 - fraction) * c}`;
  }

  function startMainTimer() {
    if (timerInterval) clearInterval(timerInterval);
    if (remainingTotalSeconds > 0) {
      setCircleProgress(totalTimerSVG, 1);
      timerInterval = setInterval(() => {
        remainingTotalSeconds--;
        updateScoreDisplay();
        const totalSet = Math.max(1, (+totalMinutesInput.value || 1) * 60);
        const frac = Math.max(0, remainingTotalSeconds / totalSet);
        setCircleProgress(totalTimerSVG, frac);
        if (remainingTotalSeconds <= 0) {
          clearInterval(timerInterval);
          timerInterval = null;
          finishQuiz();
        }
      }, 1000);
    } else {
      setCircleProgress(totalTimerSVG, 0);
    }
  }

  function startPerQuestionTimer(initialSec) {
    if (perQuestionTimer) clearInterval(perQuestionTimer);
    if (autoAdvanceTimer) { clearInterval(autoAdvanceTimer); autoAdvanceTimer = null; }
    if (!perQuestionMode) {
      setCircleProgress(questionTimerSVG, 0);
      perQuestionRemaining = 0;
      updateScoreDisplay();
      return;
    }
    perQuestionRemaining = Math.max(1, Math.round(initialSec || +perQuestionSecondsInput.value || 0));
    const init = perQuestionRemaining;
    setCircleProgress(questionTimerSVG, 1);
    perQuestionTimer = setInterval(() => {
      perQuestionRemaining--;
      updateScoreDisplay();
      const frac = Math.max(0, perQuestionRemaining / Math.max(1, init));
      setCircleProgress(questionTimerSVG, frac);
      if (perQuestionRemaining <= 0) {
        clearInterval(perQuestionTimer);
        perQuestionTimer = null;
        // move next without marking
        if (currentQuestion < quizData.length - 1) {
          currentQuestion++;
          showQuestion();
        } else finishQuiz();
      }
    }, 1000);
  }

  /* ---------- SHOW QUESTION ---------- */
  function showQuestion() {
    // clear auto notice
    hide(autoAdvanceNotice);
    autoCount.textContent = "4";
    // clear timers if any
    if (perQuestionTimer) { clearInterval(perQuestionTimer); perQuestionTimer = null; }
    if (autoAdvanceTimer) { clearInterval(autoAdvanceTimer); autoAdvanceTimer = null; }

    const q = quizData[currentQuestion];
    questionBox.innerHTML = `<h3>Q${currentQuestion + 1}. ${escapeHtml(q.question)}</h3>`;
    optionsBox.innerHTML = ["A", "B", "C", "D"]
      .map((k) => {
        const txt = q[k] || "";
        return `<button class="optBtn" data-opt="${escapeHtml(txt)}">${escapeHtml(txt)}</button>`;
      })
      .join("");

    // start per-question timer
    startPerQuestionTimer(+perQuestionSecondsInput.value || 0);
    updateScoreDisplay();

    // attach handlers
    document.querySelectorAll(".optBtn").forEach((btn) => {
      btn.disabled = false;
      btn.classList.remove("correct", "wrong");
      btn.addEventListener("click", function handler(e) {
        // disable all and prevent double clicks
        document.querySelectorAll(".optBtn").forEach((b) => (b.disabled = true));
        const selected = this.getAttribute("data-opt") || "";
        answersGiven[currentQuestion] = selected;
        const correctAnswer = (q.answer || "").trim();
        if (selected.trim() === correctAnswer) {
          this.classList.add("correct");
        } else {
          this.classList.add("wrong");
          document.querySelectorAll(".optBtn").forEach((b) => {
            if ((b.getAttribute("data-opt") || "").trim() === correctAnswer) b.classList.add("correct");
          });
        }
        computeScore();
        // stop per-question timer
        if (perQuestionTimer) { clearInterval(perQuestionTimer); perQuestionTimer = null; }
        // start 4-sec auto advance
        let count = 4;
        autoCount.textContent = count;
        show(autoAdvanceNotice);
        autoAdvanceTimer = setInterval(() => {
          count--;
          autoCount.textContent = count;
          if (count <= 0) {
            clearInterval(autoAdvanceTimer);
            autoAdvanceTimer = null;
            hide(autoAdvanceNotice);
            if (currentQuestion < quizData.length - 1) {
              currentQuestion++;
              showQuestion();
            } else finishQuiz();
          }
        }, 1000);
        // remove this handler (safe)
        btn.removeEventListener("click", handler);
      });
    });
  }

  function computeScore() {
    let s = 0;
    for (let i = 0; i < quizData.length; i++) {
      const your = (answersGiven[i] || "").trim();
      const corr = (quizData[i].answer || "").trim();
      if (your === corr) s += marksPerQuestion;
    }
    scoreMarks = s;
    updateScoreDisplay();
  }

  function updateScoreDisplay() {
    const totalMarks = +totalMarksInput.value || 100;
    scoreDisplay.textContent = `Score: ${Math.round(scoreMarks * 100) / 100} / ${totalMarks}`;
    if (remainingTotalSeconds > 0) {
      timerLabel.textContent = `Total left: ${remainingTotalSeconds}s`;
    } else if (perQuestionMode) {
      timerLabel.textContent = `Per-question: ${perQuestionRemaining || (+perQuestionSecondsInput.value || 0)}s`;
    } else {
      timerLabel.textContent = `--`;
    }
  }

  nextBtn.addEventListener("click", () => {
    if (currentQuestion < quizData.length - 1) {
      currentQuestion++;
      showQuestion();
    }
  });
  prevBtn.addEventListener("click", () => {
    if (currentQuestion > 0) {
      currentQuestion--;
      showQuestion();
    }
  });
  finishBtn.addEventListener("click", finishQuiz);

  /* ---------- FINISH & REVIEW ---------- */
  function finishQuiz() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    if (perQuestionTimer) { clearInterval(perQuestionTimer); perQuestionTimer = null; }
    if (autoAdvanceTimer) { clearInterval(autoAdvanceTimer); autoAdvanceTimer = null; }
    computeScore();
    hide(quizSection);
    show(reviewSection);
    displayReview();
  }

  function displayReview() {
    const totalMarks = +totalMarksInput.value || 100;
    let html = `<table><thead><tr><th>#</th><th>Question</th><th>Your</th><th>Correct</th><th>Marks</th></tr></thead><tbody>`;
    for (let i = 0; i < quizData.length; i++) {
      const q = quizData[i];
      const your = answersGiven[i] || "";
      const corr = q.answer || "";
      const got = your.trim() === corr.trim() ? marksPerQuestion : 0;
      html += `<tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(q.question)}</td>
        <td class="${your.trim() === corr.trim() ? "correct" : "wrong"}">${escapeHtml(your || "-")}</td>
        <td>${escapeHtml(corr)}</td>
        <td>${Math.round(got * 100) / 100}</td>
      </tr>`;
    }
    html += `</tbody></table>`;
    reviewTableContainer.innerHTML = html;
    const minPass = +minPassMarksInput.value || 0;
    passFailText.textContent = (scoreMarks >= minPass ? "✅ Passed" : "❌ Failed") + ` — ${Math.round(scoreMarks * 100) / 100}/${totalMarks}`;

    // prepare shareable payload (for download & preview)
    const payload = {
      meta: {
        totalMinutes: +totalMinutesInput.value || 0,
        perQuestionSeconds: +perQuestionSecondsInput.value || 0,
        totalMarks: +totalMarksInput.value || 100,
        minPassMarks: +minPassMarksInput.value || 0,
        generatedAt: new Date().toISOString(),
      },
      quiz: quizData,
    };
    // store in memory for download & preview
    lastPayload = payload;
    prepareShareables(payload);
  }

  let lastPayload = null;
  let lastJsonUrl = null;
  let lastHtmlUrl = null;

  function prepareShareables(payload) {
    // JSON
    const jsonBlob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    if (lastJsonUrl) URL.revokeObjectURL(lastJsonUrl);
    lastJsonUrl = URL.createObjectURL(jsonBlob);
    downloadJsonBtn.onclick = () => {
      const a = document.createElement("a");
      a.href = lastJsonUrl;
      a.download = "quiz-data.json";
      a.click();
    };

    // HTML: build a compact playable HTML with embedded payload
    const safe = JSON.stringify(payload).replace(/</g, "\\u003c");
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shared Quiz</title>
    <style>body{font-family:Arial,Helvetica,sans-serif;padding:14px;color:#111}button{padding:8px 12px;background:#0055aa;color:#fff;border:none;border-radius:6px;cursor:pointer;margin:6px}table{border-collapse:collapse;width:100%;margin-top:12px}th,td{border:1px solid #ddd;padding:8px;text-align:left}.opt{display:inline-block;padding:8px 12px;margin:6px;border-radius:6px;border:1px solid #ccc}.correct{background:#d4f7d7;border-color:#5fb25e}.wrong{background:#f8d6d6;border-color:#d65b5b}@media print{body *{visibility:hidden}#review,*#review *{visibility:visible}#review{position:fixed;left:0;top:0;width:100%}}</style>
    </head><body>
    <div><h2>Shared Quiz</h2><div id="startArea"><button id="startBtn">▶️ Start Quiz</button></div>
    <div id="player" style="display:none"><div id="meta"></div><div id="qbox"></div><div id="opts"></div><div id="autoNotice" style="display:none">Auto-advancing in <span id="autoCount">4</span>s...</div><div style="margin-top:12px"><button id="finish">Finish</button></div></div></div>
    <script>
    const payload = ${safe};
    function escapeHtml(s=''){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
    document.getElementById('startBtn').addEventListener('click', ()=>{document.getElementById('startArea').style.display='none'; document.getElementById('player').style.display='block'; start();});
    let idx=0, score=0, answers=[];
    const quiz = payload.quiz || [];
    const meta = payload.meta || {};
    const totalMarks = +meta.totalMarks || 100;
    const marksPerQ = totalMarks / Math.max(1, quiz.length);
    function showQ(){ const q=quiz[idx]; document.getElementById('qbox').innerHTML='<h3>Q'+(idx+1)+'. '+escapeHtml(q.question)+'</h3>'; const opts = ['A','B','C','D'].map(k=>'<button class="opt">'+escapeHtml(q[k]||'')+'</button>').join(''); document.getElementById('opts').innerHTML=opts; document.querySelectorAll('#opts .opt').forEach(b=>b.onclick=()=>{ b.disabled=true; const sel=b.textContent.trim(); answers[idx]=sel; const corr=(q.answer||'').trim(); if(sel===corr){ b.classList.add('correct'); score+=marksPerQ;} else { b.classList.add('wrong'); document.querySelectorAll('#opts .opt').forEach(x=>{ if(x.textContent.trim()===corr) x.classList.add('correct'); }); } // auto advance 4s let c=4; document.getElementById('autoNotice').style.display='block'; document.getElementById('autoCount').textContent=c; const adv=setInterval(()=>{ c--; document.getElementById('autoCount').textContent=c; if(c<=0){ clearInterval(adv); document.getElementById('autoNotice').style.display='none'; if(idx<quiz.length-1){ idx++; showQ(); } else finish(); } },1000); }); }
    function start(){ showQ(); }
    function finish(){ document.body.innerHTML='<div style="max-width:900px;margin:14px auto"><h2>Result</h2><p>Score: '+(Math.round(score*100)/100)+' / '+totalMarks+'</p><button onclick="window.close()">Close</button></div>'; }
    </script>
    </body></html>`;
    const htmlBlob = new Blob([html], { type: "text/html" });
    if (lastHtmlUrl) URL.revokeObjectURL(lastHtmlUrl);
    lastHtmlUrl = URL.createObjectURL(htmlBlob);
    openHtmlPreviewBtn.onclick = () => {
      if (!lastHtmlUrl) return alert("No preview available");
      window.open(lastHtmlUrl, "_blank");
    };

    // share buttons
    shareWhatsappBtn.onclick = () => {
      const shareText = encodeURIComponent(`I completed a quiz — Score: ${Math.round(scoreMarks*100)/100}.`);
      const url = lastHtmlUrl || "";
      window.open(`https://wa.me/?text=${shareText} ${encodeURIComponent(url)}`, "_blank");
    };
    shareGmailBtn.onclick = () => {
      const shareText = `I completed a quiz — Score: ${Math.round(scoreMarks*100)/100}.`;
      const url = lastHtmlUrl || "";
      window.open(`mailto:?subject=My Quiz Result&body=${encodeURIComponent(shareText + "\\n\\nPreview: " + url)}`, "_blank");
    };
  }

  printReviewBtn.addEventListener("click", () => window.print());
  closeReviewBtn.addEventListener("click", () => {
    hide(reviewSection);
    show(configRow);
    show(document.querySelector(".top-controls"));
  });

  // HOME: reload to reset
  homeBtn.addEventListener("click", () => location.reload());
})();
