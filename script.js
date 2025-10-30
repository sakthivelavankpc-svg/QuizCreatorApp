let questions = [];
let current = 0, score = 0;
let timerInterval, timeLeft = 0;
let perQuestionTime = false, perQuestionMark = false;

const manualTableBody = document.querySelector("#manualTable tbody");

document.getElementById("downloadTemplate").onclick = () => {
  const csv = "data:text/csv;charset=utf-8," +
    "s.no,QUESTION,A,B,C,D,ANSWER\n1,What is 2+2?,2,3,4,5,4\n";
  const link = document.createElement("a");
  link.href = encodeURI(csv);
  link.download = "quiz_template.csv";
  link.click();
};

// Manual question table
document.getElementById("createManual").onclick = () => {
  document.getElementById("manualForm").classList.remove("hidden");
};
document.getElementById("addQuestion").onclick = () => {
  const n = manualTableBody.children.length + 1;
  if (n > 150) return alert("Maximum 150 questions!");
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${n}</td>
    <td contenteditable></td>
    <td contenteditable></td>
    <td contenteditable></td>
    <td contenteditable></td>
    <td contenteditable></td>
    <td contenteditable></td>`;
  manualTableBody.appendChild(row);
};
document.getElementById("saveManual").onclick = () => {
  questions = [...manualTableBody.children].map((r, i) => ({
    s_no: i + 1,
    question: r.children[1].innerText,
    A: r.children[2].innerText,
    B: r.children[3].innerText,
    C: r.children[4].innerText,
    D: r.children[5].innerText,
    answer: r.children[6].innerText.trim()
  }));
  if (!questions.length) return alert("Add at least one question!");
  showCSVPreview();
};

document.getElementById("loadCSV").onclick = () => {
  const file = document.getElementById("csvFile").files[0];
  if (!file) return alert("Select a CSV file!");
  const reader = new FileReader();
  reader.onload = e => {
    const lines = e.target.result.split("\n").slice(1);
    questions = lines.filter(l => l.trim()).map((l, i) => {
      const p = l.split(",");
      return { s_no: i + 1, question: p[1], A: p[2], B: p[3], C: p[4], D: p[5], answer: p[6]?.trim() };
    });
    showCSVPreview();
  };
  reader.readAsText(file);
};

function showCSVPreview() {
  const div = document.getElementById("csvPreview");
  div.innerHTML = `
    <table><tr><th>Q.No</th><th>Question</th><th>A</th><th>B</th><th>C</th><th>D</th><th>Answer</th></tr>
    ${questions.map(q => `<tr><td>${q.s_no}</td><td>${q.question}</td><td>${q.A}</td><td>${q.B}</td><td>${q.C}</td><td>${q.D}</td><td>${q.answer}</td></tr>`).join("")}</table>`;
}

document.getElementById("startQuiz").onclick = () => {
  if (!questions.length) return alert("Load or create questions first!");
  document.getElementById("step1").classList.add("hidden");
  document.getElementById("quizSection").classList.remove("hidden");

  const tmode = document.querySelector('input[name="timeMode"]:checked')?.value;
  const mmode = document.querySelector('input[name="markMode"]:checked')?.value;
  perQuestionTime = tmode === "perQ";
  perQuestionMark = mmode === "perQ";

  const baseTime = parseInt(document.getElementById("timeInput").value) || 10;
  timeLeft = perQuestionTime ? baseTime : Math.floor(baseTime / questions.length);
  score = 0; current = 0;
  loadQuestion();
};

function loadQuestion() {
  if (current >= questions.length) return showReview();
  const q = questions[current];
  const qa = document.getElementById("questionArea");
  qa.innerHTML = `
    <h3>${q.s_no}. ${q.question}</h3>
    ${["A", "B", "C", "D"].map(o => `<button class="optBtn" data-opt="${q[o]}">${o}. ${q[o]}</button>`).join("")}`;
  qa.querySelectorAll(".optBtn").forEach(btn =>
    btn.onclick = () => checkAnswer(btn)
  );
  startTimer();
}

function checkAnswer(btn) {
  const q = questions[current];
  const sel = btn.dataset.opt.trim();
  q.userAnswer = sel;
  const markVal = parseFloat(document.getElementById("markInput").value) || 1;
  const eachMark = perQuestionMark ? markVal : markVal / questions.length;
  if (sel === q.answer.trim()) {
    score += eachMark;
    btn.style.background = "green";
  } else btn.style.background = "red";
  document.getElementById("scoreDisplay").textContent = `Score: ${score.toFixed(2)}`;
  clearInterval(timerInterval);
  setTimeout(() => { current++; loadQuestion(); }, 4000);
}

function startTimer() {
  clearInterval(timerInterval);
  let seconds = parseInt(document.getElementById("timeInput").value) || 10;
  timeLeft = perQuestionTime ? seconds : timeLeft;
  document.getElementById("timer").textContent = `⏰ ${timeLeft}s`;
  timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById("timer").textContent = `⏰ ${timeLeft}s`;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      current++;
      loadQuestion();
    }
  }, 1000);
}

function showReview() {
  document.getElementById("quizSection").classList.add("hidden");
  document.getElementById("reviewSection").classList.remove("hidden");
  const pass = parseFloat(document.getElementById("passMarks").value) || 0;
  const result = score >= pass ? "✅ Qualified" : "❌ Not Qualified";
  document.getElementById("finalScore").innerHTML = `<h3>Total Score: ${score.toFixed(2)} / ${result}</h3>`;
  const rows = questions.map(q => {
    const correct = q.userAnswer?.trim() === q.answer?.trim();
    return `<tr><td>${q.s_no}</td><td>${q.question}</td>
      <td class="${correct ? "correct" : "wrong"}">${q.userAnswer || "-"}</td>
      <td>${q.answer}</td></tr>`;
  }).join("");
  document.getElementById("reviewTable").innerHTML =
    `<table><tr><th>S.No</th><th>Question</th><th>Selected</th><th>Answer</th></tr>${rows}</table>`;

  const json = encodeURIComponent(JSON.stringify(questions));
  const quizLink = `${window.location.origin}${window.location.pathname}?quiz=${json}`;
  document.getElementById("shareLinks").innerHTML =
    `<p>🔗 Share this Quiz Link:</p><a href="${quizLink}" target="_blank">${quizLink}</a>`;
}

// Theme
function applyTheme() {
  const t = JSON.parse(localStorage.getItem("theme") || "{}");
  document.documentElement.style.setProperty("--bg", t.bg || "#f4f6f9");
  document.documentElement.style.setProperty("--text", t.text || "#000");
  document.documentElement.style.setProperty("--btn", t.btn || "#007bff");
}
applyTheme();
document.getElementById("saveTheme").onclick = () => {
  const t = {
    bg: bgColor.value,
    text: textColor.value,
    btn: btnColor.value
  };
  localStorage.setItem("theme", JSON.stringify(t));
  applyTheme();
};
document.getElementById("resetTheme").onclick = () => {
  localStorage.removeItem("theme");
  applyTheme();
};

// Load quiz if shared
window.addEventListener("load", () => {
  const params = new URLSearchParams(location.search);
  if (params.has("quiz")) {
    try {
      questions = JSON.parse(decodeURIComponent(params.get("quiz")));
      document.getElementById("step1").classList.add("hidden");
      document.getElementById("quizSection").classList.remove("hidden");
      score = 0; current = 0; loadQuestion();
    } catch { console.error("Invalid quiz data"); }
  }
});
// ====== Visitor Counter Simulation ======
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function updateVisitorStats() {
  const todayKey = getTodayKey();
  const data = JSON.parse(localStorage.getItem("visitorStats") || "{}");

  const now = new Date();
  const currentWeek = getWeekNumber(now);
  const currentMonth = now.getMonth();

  // Initialize if empty
  if (!data.total) data.total = 0;
  if (!data.days) data.days = {};
  if (!data.weeks) data.weeks = {};
  if (!data.months) data.months = {};

  // Update counts
  data.total++;
  data.days[todayKey] = (data.days[todayKey] || 0) + 1;
  data.weeks[currentWeek] = (data.weeks[currentWeek] || 0) + 1;
  data.months[currentMonth] = (data.months[currentMonth] || 0) + 1;

  localStorage.setItem("visitorStats", JSON.stringify(data));

  renderVisitorBox(data);
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
}

function renderVisitorBox(data) {
  const todayKey = getTodayKey();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;

  const now = new Date();
  const thisWeek = getWeekNumber(now);
  const lastWeek = getWeekNumber(new Date(now - 7 * 86400000));
  const thisMonth = now.getMonth();
  const lastMonth = (now.getMonth() - 1 + 12) % 12;

  const totalEl = document.getElementById("totalVisits");
  animateDigits(totalEl, data.total);

  document.getElementById("todayVisits").textContent = data.days[todayKey] || 0;
  document.getElementById("yesterdayVisits").textContent = data.days[yesterdayKey] || 0;
  document.getElementById("weekVisits").textContent = data.weeks[thisWeek] || 0;
  document.getElementById("lastWeekVisits").textContent = data.weeks[lastWeek] || 0;
  document.getElementById("monthVisits").textContent = data.months[thisMonth] || 0;
  document.getElementById("lastMonthVisits").textContent = data.months[lastMonth] || 0;
}

function animateDigits(el, number) {
  const str = number.toString().padStart(6, "0");
  let i = 0;
  const interval = setInterval(() => {
    el.textContent = str.slice(0, i + 1).padEnd(6, "0");
    i++;
    if (i >= str.length) clearInterval(interval);
  }, 80);
}

updateVisitorStats();
