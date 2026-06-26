/**
 * Quiz Master (v14) - KALVI KADAL
 * script.js - Core Logic & UI Management
 */

// Global State
const state = {
    quizzes: [],
    loading: true,
    currentView: 'library', // 'library' or 'create'
};

// DOM Elements
const elements = {
    loadingIndicator: document.getElementById('loading-indicator'), // The "Loading..." badge
    newQuizBtn: document.getElementById('new-quiz-btn'),           // Your create button
    quizLibraryContainer: document.getElementById('library-container'),
    searchBar: document.getElementById('search-quizzes'),
    subjectFilter: document.getElementById('filter-subjects'),
    classFilter: document.getElementById('filter-classes')
};

/**
 * 1. Initialize App & Fetch Data
 */
async function initApp() {
    toggleLoadingState(true);
    
    try {
        // Simulating fetching your global quiz library data (e.g., from a JSON file, GitHub repo, or database)
        // REPLACE THIS URL with your actual endpoint if fetching externally
        const response = await fetch('./quizzes/global_library.json');
        
        if (!response.ok) {
            throw new Error(`HTTP network error! Status: ${response.status}`);
        }
        
        state.quizzes = await response.json();
        state.loading = false;
        
        // Render library data and lift restrictions
        renderQuizLibrary(state.quizzes);
        toggleLoadingState(false);
        
    } catch (error) {
        console.error("Failed to load Quiz Library:", error);
        
        // CRITICAL FIX: If it fails, don't let it hang on "Loading..." forever.
        // Notify user and unlock the app interface so "New Quiz" can still function.
        showErrorMessage("Unable to load the quiz library. You can still create a new quiz.");
        toggleLoadingState(false); 
    }
}

/**
 * 2. UI State & Loading Handler
 * This ensures buttons toggle cleanly based on background processes
 */
function toggleLoadingState(isLoading) {
    if (isLoading) {
        if (elements.loadingIndicator) elements.loadingIndicator.style.display = 'inline-block';
        if (elements.newQuizBtn) {
            elements.newQuizBtn.classList.add('disabled');
            elements.newQuizBtn.style.opacity = '0.5';
            elements.newQuizBtn.style.pointerEvents = 'none'; // Disables clicking
        }
    } else {
        if (elements.loadingIndicator) elements.loadingIndicator.style.display = 'none';
        if (elements.newQuizBtn) {
            elements.newQuizBtn.classList.remove('disabled');
            elements.newQuizBtn.style.opacity = '1';
            elements.newQuizBtn.style.pointerEvents = 'auto'; // Re-enables clicking
        }
    }
}

/**
 * 3. Render Quiz Cards
 */
function renderQuizLibrary(quizzes) {
    if (!elements.quizLibraryContainer) return;
    elements.quizLibraryContainer.innerHTML = '';

    if (quizzes.length === 0) {
        elements.quizLibraryContainer.innerHTML = '<p class="no-data">No quizzes found.</p>';
        return;
    }

    quizzes.forEach(quiz => {
        const card = document.createElement('div');
        card.className = 'quiz-card';
        card.innerHTML = `
            <h3>${escapeHTML(quiz.title)}</h3>
            <p>Subject: ${escapeHTML(quiz.subject)} | Class: ${escapeHTML(quiz.class)}</p>
            <button onclick="launchQuiz('${quiz.id}')">Start Quiz</button>
        `;
        elements.quizLibraryContainer.appendChild(card);
    });
}

/**
 * 4. Create New Quiz Navigation Action
 */
function handleCreateNewQuiz() {
    // Double-check block protection
    if (state.loading) {
        console.warn("App is currently downloading asset data. Please wait.");
        return;
    }
    
    console.log("Navigating to setup wizard...");
    state.currentView = 'create';
    
    // Your routing logic here to swap view panes or redirect
    // Example: window.location.href = 'create.html'; 
}

/**
 * Helper Utilities
 */
function showErrorMessage(msg) {
    if (elements.quizLibraryContainer) {
        elements.quizLibraryContainer.innerHTML = `<p class="error-text">⚠️ ${msg}</p>`;
    }
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// 5. Event Listeners Setup
document.addEventListener('DOMContentLoaded', () => {
    // Bind the click event to the icon button shown in "buttom mot work.png"
    if (elements.newQuizBtn) {
        elements.newQuizBtn.addEventListener('click', handleCreateNewQuiz);
    }
    
    // Kick off initialization
    initApp();
});


(() => {
  const $ = (id) => document.getElementById(id);
  const show = (el) => el && el.classList.remove("hidden");
  const hide = (el) => el && el.classList.add("hidden");
  const escapeHtml = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const formatTime = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  const STORAGE_LIB_KEY = "quiz_library_db";

  // ======================================================
  // 🌍 GLOBAL CONFIGURATION (GitHub Storage Sync)
  // Place your published quiz files inside the 'quizzes' folder.
  // Add those exact file titles into this array to populate the site automatically.
  const PUBLIC_CSV_FILES = [
       "math_midterm.csv",
       "science_10th.csv"
  ];
  // ======================================================

  // --- VARIABLES ---
  let allQuizzes = []; 
  let quizData = [], currentQuestion = 0, userAnswers = [], isStudentMode = false;
  let studentDetails = { name: "", place: "" };
  let currentMeta = { creator: "", email: "", exam: "", subject: "" }; 
  let mainTimerInterval, questionTimerInterval, autoAdvanceTimer;
  let totalSeconds = 0, elapsedSeconds = 0, perQuestionRemaining = 0;
  let hasUnsavedChanges = false; 

  // --- INITIALIZATION ---
  window.addEventListener('load', async () => {
      await loadLibrary();
      checkUrlForSharedQuiz();
  });

  window.onbeforeunload = () => {
      if (hasUnsavedChanges) return "You have unsaved changes. Save before leaving?";
  };

  function showToast(msg, type = 'info') {
      const container = $("toastContainer");
      const toast = document.createElement("div");
      toast.className = "toast";
      toast.style.borderLeft = type === 'error' ? "4px solid #ef4444" : "4px solid #10b981";
      toast.textContent = msg;
      container.appendChild(toast);
      setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
  }

  $("themeToggleBtn").addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      const icon = document.querySelector("#themeToggleBtn i");
      icon.className = document.body.classList.contains("dark-mode") ? "ri-sun-line" : "ri-moon-line";
  });

  $("toggleCreatorBtn").addEventListener("click", () => { 
      resetCreatorInputs();
      show($("creatorPanel")); hide($("librarySection")); $("toggleCreatorBtn").classList.add("hidden"); 
  });
  $("closeCreatorBtn").addEventListener("click", () => { 
      if(hasUnsavedChanges && !confirm("Discard unsaved changes?")) return;
      hasUnsavedChanges = false;
      hide($("creatorPanel")); show($("librarySection")); show($("toggleCreatorBtn")); 
  });

  // --- LIBRARY LOADING ---
  async function loadLibrary() {
      const publicQuizzes = await Promise.all(PUBLIC_CSV_FILES.map(async (filename) => {
          try {
              const res = await fetch(`quizzes/${filename}`);
              if(!res.ok) throw new Error("404");
              const text = await res.text();
              const parsed = parseCSV(text);
              if(parsed.length > 0) {
                  return {
                      id: filename,
                      isPublic: true,
                      meta: { exam: filename.replace('.csv','').toUpperCase(), subject: "Global Library", topic: "Public Quiz", class: "All", creator: "Admin" },
                      config: { time: "", marks: 100, shuffle: true },
                      questions: parsed
                  };
              }
          } catch(e) { console.error(`Failed to load global quiz: ${filename}`); }
          return null;
      }));

      const localLib = JSON.parse(localStorage.getItem(STORAGE_LIB_KEY) || "[]");
      allQuizzes = [...publicQuizzes.filter(q=>q), ...localLib];
      renderGrid(allQuizzes); 
      populateFilters();
  }

  function renderGrid(dataset) {
      const grid = $("libraryGrid");
      $("libCount").textContent = `${dataset.length} Quiz${dataset.length !== 1 ? 'zes' : ''}`;
      grid.innerHTML = "";

      if (dataset.length === 0) {
          grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1; text-align:center; padding:40px; color:#888;"><i class="ri-search-line" style="font-size:3rem;"></i><p>No quizzes found.</p></div>`;
          return;
      }

      dataset.forEach((quiz) => {
          const isPublic = quiz.isPublic === true;
          const localIndex = isPublic ? -1 : JSON.parse(localStorage.getItem(STORAGE_LIB_KEY)||"[]").findIndex(l => l.id === quiz.id);

          const card = document.createElement("div");
          card.className = "quiz-card";
          card.style.borderColor = isPublic ? "var(--primary)" : "var(--border)";
          
          const badgeColor = isPublic ? "var(--primary)" : "#6366f1";
          const badgeText = isPublic ? "🌍 GLOBAL" : "💾 LOCAL DEVICE";

          card.innerHTML = `
            <div>
                <span class="card-badge" style="background:${badgeColor}">${badgeText}</span>
                <span class="card-badge" style="background:#eee; color:#333; margin-left:5px;">${escapeHtml(quiz.meta.class)}</span>
            </div>
            <h4 class="card-title">${escapeHtml(quiz.meta.exam)}</h4>
            <div class="card-sub">${escapeHtml(quiz.meta.subject)} • ${escapeHtml(quiz.meta.topic)}</div>
            <div class="card-sub" style="font-size:0.8rem; color:var(--text-light);">👤 ${escapeHtml(quiz.meta.creator || "Admin")}</div>
            <div class="card-sub" style="font-size:0.8rem">❓ ${quiz.questions.length} Qs</div>
            <div class="card-actions" style="display:grid; grid-template-columns: ${isPublic ? '1fr' : '1fr 1fr 1fr'}; gap:5px;">
                <button class="btn-sm btn-primary play-lib-btn">Play</button>
                ${!isPublic ? `<button class="btn-sm btn-secondary edit-lib-btn" style="color:#f59e0b"><i class="ri-edit-line"></i></button>` : ''}
                ${!isPublic ? `<button class="btn-sm btn-secondary del-lib-btn" style="color:var(--danger)"><i class="ri-delete-bin-line"></i></button>` : ''}
            </div>`;
          
          card.querySelector(".play-lib-btn").onclick = () => {
             applyConfig(quiz.config || {});
             currentMeta = quiz.meta || {};
             if(isPublic) { $("shuffleQuestions").checked = true; } // Automatically shuffle public global assignments
             initQuiz(quiz.questions);
          };

          if(!isPublic && localIndex !== -1) {
             card.querySelector(".edit-lib-btn").onclick = () => editQuizFromLibrary(localIndex);
             card.querySelector(".del-lib-btn").onclick = () => deleteFromLibrary(localIndex);
          }
          grid.appendChild(card);
      });
  }

  // --- SEARCH & FILTERS ---
  function populateFilters() {
      const subjects = [...new Set(allQuizzes.map(q => q.meta.subject).filter(Boolean))].sort();
      const classes = [...new Set(allQuizzes.map(q => q.meta.class).filter(Boolean))].sort();

      const subSel = $("filterSubject");
      subSel.innerHTML = '<option value="all">All Subjects</option>';
      subjects.forEach(s => { const o = document.createElement("option"); o.value = s; o.textContent = s; subSel.appendChild(o); });
      
      const clsSel = $("filterClass");
      clsSel.innerHTML = '<option value="all">All Classes</option>';
      classes.forEach(c => { const o = document.createElement("option"); o.value = c; o.textContent = c; clsSel.appendChild(o); });
  }

  function filterLibrary() {
      const term = $("libSearch").value.toLowerCase();
      const sub = $("filterSubject").value;
      const cls = $("filterClass").value;

      const filtered = allQuizzes.filter(q => {
          const m = q.meta || {};
          const matchText = ((m.exam||"")+(m.subject||"")+(m.topic||"")+(m.creator||"")).toLowerCase().includes(term);
          const matchSub = sub === "all" || m.subject === sub;
          const matchCls = cls === "all" || m.class === cls;
          return matchText && matchSub && matchCls;
      });
      renderGrid(filtered);
  }

  $("libSearch").addEventListener("input", filterLibrary);
  $("filterSubject").addEventListener("change", filterLibrary);
  $("filterClass").addEventListener("change", filterLibrary);

  // --- PARSE CSV ---
  function parseCSV(csvText) {
      const lines = csvText.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) return [];
      return lines.slice(1).map(line => {
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim()); 
        return { question: cols[0]||"", A: cols[1]||"", B: cols[2]||"", C: cols[3]||"", D: cols[4]||"", answer: cols[5]||"" };
      });
  }

  function getMetaFromInputs() {
      return {
          creator: $("creatorName").value.trim(),
          password: $("creatorPassword").value.trim(),
          email: $("creatorEmail").value.trim(),
          exam: $("metaExam").value.trim(),
          subject: $("metaSubject").value.trim(),
          class: $("metaClass").value,
          topic: $("metaTopic").value
      };
  }

  // --- EXPORT & LOCAL STORAGE ---
  function saveQuizLogic() {
      const data = getCurrentData();
      if (!data.length) return showToast("Add questions first!", "error");
      
      const meta = getMetaFromInputs();
      if (!meta.exam) return showToast("Exam Name required.", "error");
      if (!meta.password) return showToast("Password required for protection.", "error");

      const newQuiz = { id: Date.now(), meta: meta, config: getConfig(), questions: data };
      const lib = JSON.parse(localStorage.getItem(STORAGE_LIB_KEY) || "[]");
      lib.unshift(newQuiz); 
      localStorage.setItem(STORAGE_LIB_KEY, JSON.stringify(lib));
      
      hasUnsavedChanges = false;
      showToast("Saved to local device dictionary!");
      loadLibrary(); 
      $("closeCreatorBtn").click();
  }

  $("saveToLibraryBtn").onclick = saveQuizLogic;
  
  // Inject global downloadable feature
  const downloadBtn = document.createElement("button");
  downloadBtn.className = "btn-accent";
  downloadBtn.innerHTML = "<i class='ri-download-line'></i> Download CSV";
  downloadBtn.title = "Download CSV configuration layout for global assets directory";
  downloadBtn.onclick = downloadCurrentAsCSV;
  $("creatorActionBar").insertBefore(downloadBtn, $("shareQuizBtn")); 

  function downloadCurrentAsCSV() {
      const data = getCurrentData();
      if(!data.length) return showToast("No questions available to extract", "error");
      let csv = "Question,A,B,C,D,Answer\n";
      data.forEach(row => { csv += [row.question,row.A,row.B,row.C,row.D,row.answer].map(f=>`"${String(f).replace(/"/g,'""')}"`).join(",") + "\n"; });
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); 
      link.href = url; 
      link.download = ($("metaExam").value || "quiz").toLowerCase().replace(/\s+/g, '_') + ".csv";
      document.body.appendChild(link); 
      link.click(); 
      document.body.removeChild(link);
      showToast("CSV Compiled successfully! Upload this to your GitHub quizzes folder.");
  }

  function deleteFromLibrary(index) {
      const lib = JSON.parse(localStorage.getItem(STORAGE_LIB_KEY) || "[]");
      const quiz = lib[index];
      if(quiz.meta.password) {
          if(prompt(`Password to DELETE "${quiz.meta.exam}":`) !== quiz.meta.password) return showToast("Wrong Password!", "error");
      } else { if(!confirm("Delete?")) return; }
      lib.splice(index, 1); localStorage.setItem(STORAGE_LIB_KEY, JSON.stringify(lib));
      loadLibrary(); showToast("Deleted.");
  }

  function editQuizFromLibrary(index) {
      const lib = JSON.parse(localStorage.getItem(STORAGE_LIB_KEY) || "[]");
      const quiz = lib[index];
      if(quiz.meta.password) {
          if(prompt(`Password to EDIT "${quiz.meta.exam}":`) !== quiz.meta.password) return showToast("Wrong Password!", "error");
      }
      $("creatorName").value = quiz.meta.creator||""; $("creatorPassword").value = quiz.meta.password||""; $("creatorEmail").value = quiz.meta.email||"";
      $("metaExam").value = quiz.meta.exam||""; $("metaSubject").value = quiz.meta.subject||""; $("metaClass").value = quiz.meta.class||""; $("metaTopic").value = quiz.meta.topic||"";
      applyConfig(quiz.config);

      const tbody = document.querySelector("#manualTable tbody"); tbody.innerHTML = "";
      quiz.questions.forEach((q, i) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `<td>${i+1}</td><td contenteditable>${escapeHtml(q.question)}</td><td contenteditable>${escapeHtml(q.A)}</td><td contenteditable>${escapeHtml(q.B)}</td><td contenteditable>${escapeHtml(q.C)}</td><td contenteditable>${escapeHtml(q.D)}</td><td contenteditable>${escapeHtml(q.answer)}</td><td><button style="color:red" onclick="this.closest('tr').remove()">×</button></td>`;
          tbody.appendChild(tr);
      });
      hasUnsavedChanges = true;
      show($("creatorPanel")); hide($("librarySection")); $("toggleCreatorBtn").classList.add("hidden"); show($("manualSection")); hide($("csvPreview"));
  }

  function resetCreatorInputs() {
      document.querySelectorAll("#creatorPanel input").forEach(i => i.value = "");
      document.querySelector("#manualTable tbody").innerHTML = "";
      $("totalMarks").value = "100"; $("minPassMarks").value = "40";
      hasUnsavedChanges = false;
  }

  document.querySelector("#manualTable").addEventListener("input", () => hasUnsavedChanges = true);
  
  function getCurrentData() {
      if (!$("manualSection").classList.contains("hidden")) {
          return [...document.querySelectorAll("#manualTable tbody tr")].map(tr => {
              const c = tr.querySelectorAll("td");
              return { question: c[1].innerText, A: c[2].innerText, B: c[3].innerText, C: c[4].innerText, D: c[5].innerText, answer: c[6].innerText };
          }).filter(q => q.question.trim());
      } else if ($("csvPreview")._rows) return $("csvPreview")._rows;
      return [];
  }
  function getConfig() { return { time: $("totalMinutes").value, perQ: $("perQuestionSeconds").value, marks: $("totalMarks").value || 100, pass: $("minPassMarks").value, shuffle: $("shuffleQuestions").checked, contact: $("teacherWhatsapp").value }; }
  function applyConfig(cfg) { $("totalMinutes").value = cfg.time||""; $("perQuestionSeconds").value = cfg.perQ||""; $("totalMarks").value = cfg.marks||100; $("minPassMarks").value = cfg.pass||40; $("shuffleQuestions").checked = cfg.shuffle||false; $("teacherWhatsapp").value = cfg.contact||""; }

  // --- MANUAL & PREVIEW SYSTEMS ---
  $("loadCSVBtn").addEventListener("click", () => $("csvFileInput").click());
  $("csvFileInput").addEventListener("change", (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCSV(ev.target.result); $("csvPreview")._rows = rows;
      $("csvTableContainer").innerHTML = `<table><thead><tr><th>#</th><th>Question</th><th>A</th><th>B</th><th>C</th><th>D</th><th>Correct</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(r.question)}</td><td>${escapeHtml(r.A)}</td><td>${escapeHtml(r.B)}</td><td>${escapeHtml(r.C)}</td><td>${escapeHtml(r.D)}</td><td style="font-weight:bold;color:green">${escapeHtml(r.answer)}</td></tr>`).join('')}</tbody></table>`;
      show($("csvPreview")); hide($("manualSection")); hasUnsavedChanges = true;
    }; reader.readAsText(file);
  });
  $("createManualBtn").addEventListener("click", () => { show($("manualSection")); hide($("csvPreview")); });
  $("addRowBtn").addEventListener("click", () => {
      const tbody = document.querySelector("#manualTable tbody"); const tr = document.createElement("tr");
      tr.innerHTML = `<td>${tbody.children.length+1}</td><td contenteditable></td><td contenteditable></td><td contenteditable></td><td contenteditable></td><td contenteditable></td><td contenteditable></td><td><button style="color:red" onclick="this.closest('tr').remove()">×</button></td>`;
      tbody.appendChild(tr); hasUnsavedChanges = true;
  });
  $("startQuizBtn_manual").addEventListener("click", () => initQuiz(getCurrentData()));
  $("startQuizBtn_csv").addEventListener("click", () => initQuiz(getCurrentData()));

  // --- ENGINE ENGINE ---
  function initQuiz(data) {
      if (!data || !data.length) return showToast("No questions loaded!", "error");
      if (!isStudentMode && !currentMeta.creator) { currentMeta = getMetaFromInputs(); }
      if (!studentDetails.name) { show($("studentLoginModal")); window.tempQuizData = data; return; }
      runQuiz(data);
  }
  $("startStudentQuizBtn").addEventListener("click", () => {
      const name = $("studentName").value.trim(); const place = $("studentPlace").value.trim();
      if(!name) return showToast("Name required", "error");
      studentDetails = { name, place: place || "Unknown" };
      hide($("studentLoginModal")); $("dispName").textContent = name; $("dispPlace").textContent = studentDetails.place; show($("studentInfoDisplay"));
      if (window.tempQuizData) runQuiz(window.tempQuizData);
  });
  function runQuiz(data) {
      let activeDeck = [...data];
      if ($("shuffleQuestions").checked) { activeDeck.sort(() => Math.random() - 0.5); }
      quizData = activeDeck; currentQuestion = 0; userAnswers = Array(activeDeck.length).fill(null);
      hide($("librarySection")); hide($("creatorPanel")); hide(document.querySelector(".app-header")); show($("quizSection"));
      const mins = parseFloat($("totalMinutes").value) || 0; totalSeconds = mins * 60; elapsedSeconds = 0; startMainTimer(); renderQuestion();
  }
  function renderQuestion() {
      if(autoAdvanceTimer) clearTimeout(autoAdvanceTimer); if(questionTimerInterval) clearInterval(questionTimerInterval);
      const q = quizData[currentQuestion]; $("questionBox").innerHTML = escapeHtml(q.question);
      $("optionsBox").innerHTML = ["A","B","C","D"].map(k => `<button class="opt-btn" onclick="handleOpt(this, '${escapeHtml(q[k].replace(/'/g,"\\'"))}')"><span style="background:var(--secondary);padding:4px 10px;border-radius:6px;font-weight:bold;">${k}</span> ${escapeHtml(q[k])}</button>`).join("");
      const pct = ((currentQuestion+1)/quizData.length)*100; $("progressBarFill").style.width = `${pct}%`; $("questionProgressLabel").textContent = `Q ${currentQuestion+1} / ${quizData.length}`;
      const perQ = parseFloat($("perQuestionSeconds").value) || 0; if (perQ>0) runPerQTimer(perQ);
  }
  window.handleOpt = (btn, val) => {
      document.querySelectorAll(".opt-btn").forEach(b=>b.disabled=true); userAnswers[currentQuestion] = val;
      const corr = quizData[currentQuestion].answer.trim(); btn.classList.add(val===corr ? "correct" : "wrong");
      if(val!====corr) document.querySelectorAll(".opt-btn").forEach(b=>{ if(b.textContent.includes(corr)) b.classList.add("correct"); });
      const score = userAnswers.reduce((acc, ans, i) => acc + (ans === (quizData[i].answer||"").trim() ? 1 : 0), 0);
      const totalM = parseFloat($("totalMarks").value) || 100; $("liveScore").textContent = `Score: ${Math.round(score * (totalM / quizData.length))}`;
      autoAdvanceTimer = setTimeout(() => { if(currentQuestion<quizData.length-1) { currentQuestion++; renderQuestion(); } else finishQuiz(); }, 1500);
  };
  $("prevBtn").addEventListener("click",()=>{if(currentQuestion>0){currentQuestion--;renderQuestion();}});
  $("nextBtn").addEventListener("click",()=>{if(currentQuestion<quizData.length-1){currentQuestion++;renderQuestion();}});
  $("finishBtn").addEventListener("click", finishQuiz);
  function startMainTimer() { if(mainTimerInterval) clearInterval(mainTimerInterval); mainTimerInterval = setInterval(() => { if(totalSeconds > 0) { totalSeconds--; $("mainTimerLabel").textContent = formatTime(totalSeconds); if(totalSeconds<=0) finishQuiz(); } else { elapsedSeconds++; $("mainTimerLabel").textContent = formatTime(elapsedSeconds); } }, 1000); }
  function runPerQTimer(sec) { perQuestionRemaining = sec; show($("timerPerQ")); $("timerPerQ").textContent = sec; questionTimerInterval = setInterval(() => { perQuestionRemaining--; $("timerPerQ").textContent = perQuestionRemaining; if(perQuestionRemaining<=0) { clearInterval(questionTimerInterval); if(currentQuestion<quizData.length-1) { currentQuestion++; renderQuestion(); } else finishQuiz(); } }, 1000); }

  // --- RESULTS ---
  function finishQuiz() {
      clearInterval(mainTimerInterval); clearInterval(questionTimerInterval); clearTimeout(autoAdvanceTimer);
      hide($("quizSection")); show($("reviewSection")); show(document.querySelector(".app-header"));
      let score = 0, correct = 0, skipped = 0; const totalM = parseFloat($("totalMarks").value) || 100; const markPerQ = totalM / quizData.length;
      let listHtml = '';
      quizData.forEach((q, i) => {
          const u = (userAnswers[i] || "").trim(), c = (q.answer || "").trim();
          let userClass = "", userLabel = "";
          if(!u) { skipped++; userClass = "skipped-ans"; userLabel = "Skipped"; } else if(u === c) { score += markPerQ; correct++; userClass = "correct-ans"; } else { userClass = "wrong-ans"; }
          listHtml += `<div class="review-card"><div class="review-q-row"><span class="q-num">Q${i+1}.</span><span class="q-text">${escapeHtml(q.question)}</span></div><div class="review-ans-row"><div class="ans-box ${userClass}"><span class="ans-label"><i class="ri-user-line"></i> Your Answer:</span><span class="ans-val">${escapeHtml(u) || "---"}</span></div><div class="ans-box correct-ans"><span class="ans-label"><i class="ri-check-double-line"></i> Correct Answer:</span><span class="ans-val">${escapeHtml(c)}</span></div></div></div>`;
      });
      const summaryHtml = `<div class="report-header"><h2 style="margin:0 0 10px 0; color:var(--primary); border-bottom:2px solid var(--border); padding-bottom:10px;">🎓 QUIZ RESULT REPORT</h2><div class="report-meta-grid" style="grid-template-columns:1fr 1fr;"><div><strong>Student:</strong> ${escapeHtml(studentDetails.name)}</div><div><strong>Location:</strong> ${escapeHtml(studentDetails.place)}</div><div><strong>Exam:</strong> ${escapeHtml(currentMeta.exam || "Quiz")}</div><div><strong>Subject:</strong> ${escapeHtml(currentMeta.subject || "General")}</div><div><strong>Created By:</strong> ${escapeHtml(currentMeta.creator || "Admin")}</div><div><strong>Contact:</strong> ${escapeHtml(currentMeta.email || "N/A")}</div></div><div class="report-score-box" style="margin-top:10px;"><div class="score-item"><span class="score-lbl">Score</span><span class="score-val">${Math.round(score)} / ${totalM}</span></div><div class="score-item" style="color:var(--success)"><span class="score-lbl">Correct</span><span class="score-val">${correct}</span></div><div class="score-item" style="color:var(--danger)"><span class="score-lbl">Wrong</span><span class="score-val">${quizData.length - correct - skipped}</span></div></div></div>`;
      $("finalScoreDisplay").textContent = Math.round(score); $("reviewTableContainer").innerHTML = summaryHtml + `<div class="review-list-container">${listHtml}</div>`;
      const pass = parseFloat($("minPassMarks").value)||0; $("passFailText").innerHTML = score >= pass ? "<span style='color:var(--success)'>PASSED</span>" : "<span style='color:var(--danger)'>FAILED</span>";
      const txt = `*Result: ${studentDetails.name}*\n📝 ${currentMeta.exam}\n🏆 Score: ${Math.round(score)}/${totalM}`; const contact = $("teacherWhatsapp").value;
      $("submitWhatsappBtn").onclick = () => { window.open(contact ? `https://wa.me/${contact}?text=${encodeURIComponent(txt)}` : `https://wa.me/?text=${encodeURIComponent(txt)}`, "_blank"); };
      $("submitEmailBtn").onclick = () => window.open(`mailto:${currentMeta.email || ""}?subject=Result: ${studentDetails.name}&body=${encodeURIComponent(txt)}`, "_self");
  }
  $("printPdfBtn").addEventListener("click", () => window.print()); $("homeBtn_review").addEventListener("click", () => location.reload());
  function checkUrlForSharedQuiz() {
      const hash = location.hash; if (hash && hash.includes("quiz=")) {
          try { const str = LZString.decompressFromEncodedURIComponent(hash.split("quiz=")[1]); const data = JSON.parse(str); isStudentMode = true; applyConfig(data.config); if(data.meta) currentMeta = data.meta; hide($("librarySection")); hide($("toggleCreatorBtn")); hide($("creatorPanel")); window.tempQuizData = data.questions; show($("studentLoginModal")); } catch(e) { showToast("Invalid Quiz Link", "error"); }
      }
  }
  $("shareQuizBtn").addEventListener("click", () => { const qData = getCurrentData(); if(!qData.length) return showToast("No questions discovered", "error"); const str = LZString.compressToEncodedURIComponent(JSON.stringify({ questions: qData, config: getConfig(), meta: getMetaFromInputs() })); $("shareLinkInput").value = `${location.origin}${location.pathname}#quiz=${str}`; show($("shareModal")); });
  $("copyLinkBtn").addEventListener("click", () => { $("shareLinkInput").select(); document.execCommand("copy"); showToast("Copied encrypted share link!"); });
  $("closeShareBtn").addEventListener("click", () => hide($("shareModal")));
})();
