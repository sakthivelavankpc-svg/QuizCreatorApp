let quizData = [];
let currentQuestion = 0;
let score = 0;
let timer, totalTime = 15;
let isQuizRunning = false;

const loginSection = document.getElementById("loginSection");
const uploadSection = document.getElementById("uploadSection");
const quizSection = document.getElementById("quizSection");
const reviewSection = document.getElementById("reviewSection");
const shareSection = document.getElementById("shareSection");
const timerCircle = document.getElementById("timerCircle");
const timeText = document.getElementById("timeText");
const questionText = document.getElementById("questionText");
const optionButtons = document.querySelectorAll(".option-btn");
const scoreDisplay = document.getElementById("score");
const toast = document.getElementById("toast");

function showSection(section) {
  document.querySelectorAll("section").forEach(sec => sec.classList.remove("active-section"));
  section.classList.add("active-section");
}

document.getElementById("skipLogin").onclick = () => showSection(uploadSection);
document.querySelector(".google").onclick = () => showSection(uploadSection);
document.querySelector(".facebook").onclick = () => showSection(uploadSection);

document.getElementById("downloadTemplate").onclick = () => {
  const csvContent = "s.no,QUESTION,A,B,C,D,ANSWER\n1,Sample Question?,A1,B1,C1,D1,A";
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "quiz_template.csv"; a.click();
};

document.getElementById("fileInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const lines = ev.target.result.split("\n").slice(1);
    quizData = lines.map(line => {
      const [_, q, a, b, c, d, ans] = line.split(",");
      return { q, options: [a, b, c, d], answer: ans.trim() };
    }).filter(q => q.q);
    localStorage.setItem("savedQuiz", JSON.stringify(quizData));
    previewCSV();
  };
  reader.readAsText(file);
});

function previewCSV() {
  const tbody = document.querySelector("#csvPreview tbody");
  tbody.innerHTML = "";
  quizData.forEach(q => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${q.q}</td><td>${q.options[0]}</td><td>${q.options[1]}</td><td>${q.options[2]}</td><td>${q.options[3]}</td><td>${q.answer}</td>`;
    tbody.appendChild(tr);
  });
  document.getElementById("csvPreview").classList.remove("hidden");
}

document.getElementById("startSetup").onclick = () => startQuiz();

function startQuiz() {
  if (!quizData.length) {
    const saved = localStorage.getItem("savedQuiz");
    if (saved) quizData = JSON.parse(saved);
    else return alert("Please upload or load a quiz first!");
  }
  score = 0;
  currentQuestion = 0;
  isQuizRunning = true;
  showSection(quizSection);
  renderQuestion();
  startTimer();
}

function renderQuestion() {
  const q = quizData[currentQuestion];
  questionText.textContent = q.q;
  optionButtons.forEach((btn, i) => {
    btn.textContent = q.options[i];
    btn.className = "option-btn";
  });
}

optionButtons.forEach(btn => btn.onclick = () => {
  if (!isQuizRunning) return;
  const selected = btn.dataset.opt;
  const q = quizData[currentQuestion];
  if (selected === q.answer) {
    btn.classList.add("correct");
    score++;
    scoreDisplay.textContent = score;
  } else btn.classList.add("wrong");
  setTimeout(nextQuestion, 1000);
});

document.getElementById("nextBtn").onclick = nextQuestion;
document.getElementById("prevBtn").onclick = () => {
  if (currentQuestion > 0) {
    currentQuestion--;
    renderQuestion();
  }
};
document.getElementById("skipBtn").onclick = nextQuestion;

function nextQuestion() {
  if (++currentQuestion < quizData.length) renderQuestion();
  else endQuiz();
}

function startTimer() {
  let time = totalTime;
  const circumference = 283;
  timer = setInterval(() => {
    const offset = circumference - (time / totalTime) * circumference;
    timerCircle.style.strokeDashoffset = offset;
    timeText.textContent = time;
    if (--time < 0) {
      clearInterval(timer);
      nextQuestion();
    }
  }, 1000);
}

function endQuiz() {
  isQuizRunning = false;
  showSection(reviewSection);
  const tbody = document.querySelector("#reviewTable tbody");
  tbody.innerHTML = "";
  quizData.forEach(q => {
    const userAns = "—";
    const color = (userAns === q.answer) ? "green" : "red";
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${q.q}</td><td style="color:${color}">${userAns}</td><td>${q.answer}</td>`;
    tbody.appendChild(tr);
  });
}

document.getElementById("printBtn").onclick = () => window.print();
document.getElementById("shareBtn").onclick = () => showSection(shareSection);

document.getElementById("generateLinkBtn").onclick = () => {
  const shareType = document.querySelector('input[name="shareType"]:checked').value;
  const quizID = Date.now().toString(36);
  localStorage.setItem("quiz_" + quizID, JSON.stringify(quizData));
  const url = `${window.location.origin}${window.location.pathname}?quizID=${quizID}&type=${shareType}`;
  document.getElementById("shareLink").value = url;
  document.querySelector(".share-box").classList.remove("hidden");
};

document.getElementById("copyLinkBtn").onclick = () => {
  const input = document.getElementById("shareLink");
  input.select();
  document.execCommand("copy");
  showToast("✅ Link copied!");
};

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2000);
}

window.onload = () => {
  const params = new URLSearchParams(window.location.search);
  const quizID = params.get("quizID");
  if (quizID) {
    const loaded = localStorage.getItem("quiz_" + quizID);
    if (loaded) {
      quizData = JSON.parse(loaded);
      showSection(uploadSection);
      previewCSV();
    }
  }
};
