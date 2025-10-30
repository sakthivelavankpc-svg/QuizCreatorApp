let questions = [];
let current = 0, score = 0;
let timerInterval, timeLeft = 0;
let perQuestionTime = false;
let perQuestionMark = false;

document.getElementById("downloadTemplate").addEventListener("click", () => {
  const csvContent = "data:text/csv;charset=utf-8," +
    "s.no,QUESTION,A,B,C,D,ANSWER\n1,What is 2+2?,2,3,4,5,4\n";
  const link = document.createElement("a");
  link.href = encodeURI(csvContent);
  link.download = "quiz_template.csv";
  link.click();
});

document.getElementById("loadCSV").addEventListener("click", () => {
  const fileInput = document.getElementById("csvFile").files[0];
  if (!fileInput) return alert("Please select a CSV file!");

  const reader = new FileReader();
  reader.onload = (e) => {
    const lines = e.target.result.split("\n").slice(1);
    questions = lines.filter(l => l.trim()).map((line, i) => {
      const parts = line.split(",");
      return {
        s_no: i + 1,
        question: parts[1],
        A: parts[2],
        B: parts[3],
        C: parts[4],
        D: parts[5],
        answer: parts[6]?.trim()
      };
    });
    showCSVPreview();
  };
  reader.readAsText(fileInput);
});

function showCSVPreview() {
  const container = document.getElementById("csvPreview");
  container.innerHTML = `
    <table>
      <tr><th>Q.No</th><th>Question</th><th>A</th><th>B</th><th>C</th><th>D</th><th>Answer</th></tr>
      ${questions.map(q => `<tr><td>${q.s_no}</td><td>${q.question}</td><td>${q.A}</td><td>${q.B}</td><td>${q.C}</td><td>${q.D}</td><td>${q.answer}</td></tr>`).join("")}
    </table>`;
}

document.getElementById("startQuiz").addEventListener("click", () => {
  if (!questions.length) return alert("Load CSV or create questions first!");
  document.getElementById("step1").classList.add("hidden");
  document.getElementById("quizSection").classList.remove("hidden");

  const timeMode = document.querySelector('input[name="timeMode"]:checked')?.value;
  perQuestionTime = timeMode === "perQ";
  const markMode = document.querySelector('input[name="markMode"]:checked')?.value;
  perQuestionMark = markMode === "perQ";

  timeLeft = parseInt(document.getElementById("timeInput").value) || 10;
  if (!perQuestionTime) timeLeft = Math.floor(timeLeft / questions.length);

  score = 0;
  current = 0;
  loadQuestion();
});

function loadQuestion() {
  if (current >= questions.length) return showReview();
  const q = questions[current];
  document.getElementById("questionArea").innerHTML = `
    <h3>${q.s_no}. ${q.question}</h3>
    ${["A","B","C","D"].map(opt => `<button class="optBtn" data-opt="${q[opt]}">${opt}. ${q[opt]}</button>`).join("<br>")}
  `;
  document.querySelectorAll(".optBtn").forEach(btn => {
    btn.addEventListener("click", () => checkAnswer(btn));
  });
  startTimer();
}

function checkAnswer(btn) {
  const q = questions[current];
  const selectedText = btn.getAttribute("data-opt").trim();
  if (selectedText === q.answer.trim()) {
    btn.style.background = "green";
    score += perQuestionMark ? parseInt(document.getElementById("markInput").value || 1) : 1;
  } else {
    btn.style.background = "red";
  }
  setTimeout(() => {
    current++;
    loadQuestion();
  }, 4000);
}

function startTimer() {
  clearInterval(timerInterval);
  let seconds = parseInt(document.getElementById("timeInput").value) || 10;
  timeLeft = perQuestionTime ? seconds : timeLeft;
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
  document.getElementById("finalScore").innerHTML = `<h3>Total Score: ${score}</h3>`;

  const table = `
    <table>
      <tr><th>S.No</th><th>Question</th><th>Option Clicked</th><th>Answer</th></tr>
      ${questions.map((q, i) => {
        const correct = q.answer === q.userAnswer;
        return `<tr>
          <td>${q.s_no}</td>
          <td>${q.question}</td>
          <td class="${correct ? 'correct':'wrong'}">${q.userAnswer || '-'}</td>
          <td>${q.answer}</td>
        </tr>`;
      }).join("")}
    </table>`;
  document.getElementById("reviewTable").innerHTML = table;

  const shareText = encodeURIComponent(`I just completed a quiz! My score: ${score}`);
  const shareUrl = window.location.href;
  document.getElementById("shareLinks").innerHTML = `
    <a href="https://wa.me/?text=${shareText} ${shareUrl}" target="_blank">📱 WhatsApp</a> |
    <a href="mailto:?subject=My Quiz Result&body=${shareText} ${shareUrl}" target="_blank">📧 Gmail</a> |
    <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank">📘 Facebook</a>`;
}

document.getElementById("saveTheme").addEventListener("click", () => {
  localStorage.setItem("theme", JSON.stringify({
    bg: document.getElementById("bgColor").value,
    text: document.getElementById("textColor").value,
    btn: document.getElementById("btnColor").value
  }));
  applyTheme();
});

document.getElementById("resetTheme").addEventListener("click", () => {
  localStorage.removeItem("theme");
  applyTheme();
});

function applyTheme() {
  const theme = JSON.parse(localStorage.getItem("theme") || "{}");
  document.documentElement.style.setProperty("--bg", theme.bg || "#f4f6f9");
  document.documentElement.style.setProperty("--text", theme.text || "#000");
  document.documentElement.style.setProperty("--btn", theme.btn || "#007bff");
}

applyTheme();
// ===== Animated Visit Counter =====
function animateCounter(element, start, end, duration) {
  let startTime = null;
  function update(currentTime) {
    if (!startTime) startTime = currentTime;
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const value = Math.floor(progress * (end - start) + start);
    element.textContent = value.toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

document.addEventListener("DOMContentLoaded", () => {
  const counterEl = document.getElementById("visitCount");
  if (!counterEl) return;

  let visits = parseInt(localStorage.getItem("visitCount") || "0");
  visits++;
  localStorage.setItem("visitCount", visits);

  animateCounter(counterEl, 0, visits, 1000);
});
