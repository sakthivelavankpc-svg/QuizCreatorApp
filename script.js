(() => {
  const $ = (id) => document.getElementById(id);
  const show = (el) => el && el.classList.remove("hidden");
  const hide = (el) => el && el.classList.add("hidden");
  const escapeHtml = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const formatTime = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  const STORAGE_LIB_KEY = "quiz_library_db";

  /* --- TOAST SYSTEM --- */
  function showToast(msg, type = 'info') {
      const container = $("toastContainer");
      const toast = document.createElement("div");
      toast.className = "toast";
      toast.style.borderLeft = type === 'error' ? "4px solid #ef4444" : "4px solid #10b981";
      toast.textContent = msg;
      container.appendChild(toast);
      setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
  }

  /* --- THEME TOGGLE --- */
  $("themeToggleBtn").addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      const icon = document.querySelector("#themeToggleBtn i");
      if(document.body.classList.contains("dark-mode")){
          icon.className = "ri-sun-line";
      } else {
          icon.className = "ri-moon-line";
      }
  });

  /* --- STATE --- */
  let quizData = [], currentQuestion = 0, userAnswers = [], isStudentMode = false;
  let studentDetails = { name: "", place: "" };
  let mainTimerInterval, questionTimerInterval, autoAdvanceTimer;
  let totalSeconds = 0, elapsedSeconds = 0, perQuestionRemaining = 0;

  /* --- INIT --- */
  window.addEventListener('load', () => {
      renderLibraryGrid();
      checkUrlForSharedQuiz();
  });

  $("toggleCreatorBtn").addEventListener("click", () => {
      show($("creatorPanel"));
      hide($("librarySection"));
      $("toggleCreatorBtn").classList.add("hidden");
  });
  
  $("closeCreatorBtn").addEventListener("click", () => {
      hide($("creatorPanel"));
      show($("librarySection"));
      show($("toggleCreatorBtn"));
  });

  /* --- LIBRARY (CARDS) --- */
  function renderLibraryGrid() {
      const lib = JSON.parse(localStorage.getItem(STORAGE_LIB_KEY) || "[]");
      const grid = $("libraryGrid");
      const count = $("libCount");
      grid.innerHTML = "";
      count.textContent = `${lib.length} Quiz${lib.length !== 1 ? 'zes' : ''}`;

      if (lib.length === 0) {
          grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1; text-align:center; padding:40px; color:#888;">
              <i class="ri-folder-add-line" style="font-size:3rem; margin-bottom:10px; display:block;"></i>
              <p>Your library is empty.</p>
          </div>`;
          return;
      }

      lib.forEach((quiz, index) => {
          const card = document.createElement("div");
          card.className = "quiz-card";
          card.innerHTML = `
            <span class="card-badge">${escapeHtml(quiz.meta.class)}</span>
            <h4 class="card-title">${escapeHtml(quiz.meta.exam)}</h4>
            <div class="card-sub">${escapeHtml(quiz.meta.subject)} • ${escapeHtml(quiz.meta.topic)}</div>
            <div class="card-sub" style="font-size:0.8rem">❓ ${quiz.questions.length} Questions</div>
            <div class="card-actions">
                <button class="btn-sm btn-primary play-lib-btn" style="flex:1">Play</button>
                <button class="btn-sm btn-secondary del-lib-btn" style="color:var(--danger)"><i class="ri-delete-bin-line"></i></button>
            </div>
          `;
          
          card.querySelector(".play-lib-btn").onclick = () => loadQuizFromLibrary(index);
          card.querySelector(".del-lib-btn").onclick = () => deleteFromLibrary(index);
          grid.appendChild(card);
      });
  }

  /* --- SAVE LOGIC (Common) --- */
  function saveQuizLogic() {
      const data = getCurrentData();
      if (!data.length) return showToast("Add questions first!", "error");
      
      const exam = $("metaExam").value.trim();
      const sub = $("metaSubject").value.trim();
      const topic = $("metaTopic").value.trim();
      const cls = $("metaClass").value;

      if (!exam || !sub || !cls) return showToast("Enter Exam, Subject & Class details.", "error");

      const newQuiz = { id: Date.now(), meta: { exam, subject: sub, topic, class: cls }, config: getConfig(), questions: data };
      const lib = JSON.parse(localStorage.getItem(STORAGE_LIB_KEY) || "[]");
      lib.unshift(newQuiz); // Add to top
      localStorage.setItem(STORAGE_LIB_KEY, JSON.stringify(lib));
      
      showToast("Quiz saved to Library!");
      renderLibraryGrid();
      $("closeCreatorBtn").click(); // Go back to library
  }

  $("saveToLibraryBtn").addEventListener("click", saveQuizLogic);
  $("saveCsvToLibBtn").addEventListener("click", saveQuizLogic);

  function deleteFromLibrary(index) {
      if(!confirm("Delete this quiz?")) return;
      const lib = JSON.parse(localStorage.getItem(STORAGE_LIB_KEY) || "[]");
      lib.splice(index, 1);
      localStorage.setItem(STORAGE_LIB_KEY, JSON.stringify(lib));
      renderLibraryGrid();
  }

  function loadQuizFromLibrary(index) {
      const lib = JSON.parse(localStorage.getItem(STORAGE_LIB_KEY) || "[]");
      const quiz = lib[index];
      if (!quiz) return;
      applyConfig(quiz.config);
      initQuiz(quiz.questions);
  }

  /* --- HELPERS --- */
  function getCurrentData() {
      if (!$("manualSection").classList.contains("hidden")) {
          return [...document.querySelectorAll("#manualTable tbody tr")].map(tr => {
              const c = tr.querySelectorAll("td");
              return { question: c[1].innerText, A: c[2].innerText, B: c[3].innerText, C: c[4].innerText, D: c[5].innerText, answer: c[6].innerText };
          }).filter(q => q.question.trim());
      } else if ($("csvPreview")._rows) return $("csvPreview")._rows;
      return [];
  }

  function getConfig() {
      return {
          time: $("totalMinutes").value, perQ: $("perQuestionSeconds").value,
          marks: $("totalMarks").value, pass: $("minPassMarks").value,
          shuffle: $("shuffleQuestions").checked, contact: $("teacherWhatsapp").value
      };
  }

  function applyConfig(cfg) {
      $("totalMinutes").value = cfg.time || ""; $("perQuestionSeconds").value = cfg.perQ || "";
      $("totalMarks").value = cfg.marks || 100; $("minPassMarks").value = cfg.pass || 40;
      $("shuffleQuestions").checked = cfg.shuffle || false; $("teacherWhatsapp").value = cfg.contact || "";
  }

  /* --- CSV & MANUAL --- */
  $("loadCSVBtn").addEventListener("click", () => $("csvFileInput").click());
  $("csvFileInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) return showToast("Invalid CSV file", "error");
      const header = lines[0].split(",").map(h => h.trim().toLowerCase());
      const rows = lines.slice(1).map(line => {
        const cols = line.split(","); 
        const obj = {}; header.forEach((h, i) => obj[h] = (cols[i] || "").trim());
        return { question: obj.question||cols[0], A: obj.a||cols[1], B: obj.b||cols[2], C: obj.c||cols[3], D: obj.d||cols[4], answer: obj.answer||cols[5] };
      });
      $("csvPreview")._rows = rows;
      
      // FEATURE: Detailed CSV Table with Options A, B, C, D, Answer
      $("csvTableContainer").innerHTML = `<table><thead>
          <tr><th>#</th><th>Question</th><th>A</th><th>B</th><th>C</th><th>D</th><th>Correct</th></tr>
        </thead><tbody>${rows.map((r,i)=>`
          <tr>
            <td>${i+1}</td>
            <td>${escapeHtml(r.question)}</td>
            <td>${escapeHtml(r.A)}</td>
            <td>${escapeHtml(r.B)}</td>
            <td>${escapeHtml(r.C)}</td>
            <td>${escapeHtml(r.D)}</td>
            <td style="font-weight:bold; color:var(--success)">${escapeHtml(r.answer)}</td>
          </tr>`).join('')}</tbody></table>`;
      
      show($("csvPreview")); 
      hide($("manualSection"));
      // FEATURE: Ask to Save
      showToast("CSV Loaded! Please review and SAVE the quiz.", "info");
    };
    reader.readAsText(file);
  });

  $("createManualBtn").addEventListener("click", () => { show($("manualSection")); hide($("csvPreview")); });
  $("addRowBtn").addEventListener("click", () => {
      const tbody = document.querySelector("#manualTable tbody");
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${tbody.children.length+1}</td><td contenteditable></td><td contenteditable></td><td contenteditable></td><td contenteditable></td><td contenteditable></td><td contenteditable></td><td><button style="color:red" onclick="this.closest('tr').remove()">×</button></td>`;
      tbody.appendChild(tr);
  });
  $("startQuizBtn_manual").addEventListener("click", () => initQuiz(getCurrentData()));
  $("startQuizBtn_csv").addEventListener("click", () => initQuiz(getCurrentData()));

  /* --- GAMEPLAY --- */
  function initQuiz(data) {
      if (!data || !data.length) return showToast("No questions to play!", "error");
      if (!isStudentMode && !studentDetails.name) {
           show($("studentLoginModal")); window.tempQuizData = data; return;
      }
      runQuiz(data);
  }

  $("startStudentQuizBtn").addEventListener("click", () => {
      const name = $("studentName").value; const place = $("studentPlace").value;
      if(!name) return showToast("Name is required", "error");
      studentDetails = { name, place };
      hide($("studentLoginModal"));
      $("dispName").textContent = name; $("dispPlace").textContent = place || "Unknown";
      show($("studentInfoDisplay"));
      if (window.tempQuizData) runQuiz(window.tempQuizData);
  });

  function runQuiz(data) {
      if ($("shuffleQuestions").checked) data.sort(() => Math.random() - 0.5);
      quizData = data; currentQuestion = 0; userAnswers = Array(data.length).fill(null);
      hide($("librarySection")); hide($("creatorPanel")); hide($("appContainer").querySelector(".app-header"));
      show($("quizSection"));
      const mins = parseFloat($("totalMinutes").value) || 0;
      totalSeconds = mins * 60; elapsedSeconds = 0;
      startMainTimer(); renderQuestion();
  }

  function renderQuestion() {
      if(autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
      if(questionTimerInterval) clearInterval(questionTimerInterval);
      const q = quizData[currentQuestion];
      $("questionBox").innerHTML = escapeHtml(q.question);
      $("optionsBox").innerHTML = ["A","B","C","D"].map(k => {
          const val = q[k];
          return `<button class="opt-btn" onclick="handleOpt(this, '${escapeHtml(val.replace(/'/g,"\\'"))}')"><span style="background:var(--secondary);padding:4px 10px;border-radius:6px;font-weight:bold;">${k}</span> ${escapeHtml(val)}</button>`;
      }).join("");
      const pct = ((currentQuestion+1)/quizData.length)*100;
      $("progressBarFill").style.width = `${pct}%`;
      $("questionProgressLabel").textContent = `Q ${currentQuestion+1} / ${quizData.length}`;
      const perQ = parseFloat($("perQuestionSeconds").value) || 0;
      if (perQ>0) runPerQTimer(perQ);
  }

  window.handleOpt = (btn, val) => {
      document.querySelectorAll(".opt-btn").forEach(b=>b.disabled=true);
      userAnswers[currentQuestion] = val;
      const corr = quizData[currentQuestion].answer.trim();
      btn.classList.add(val===corr ? "correct" : "wrong");
      if(val!==corr) document.querySelectorAll(".opt-btn").forEach(b=>{ if(b.textContent.includes(corr)) b.classList.add("correct"); });
      
      const score = userAnswers.reduce((acc, ans, i) => acc + (ans === (quizData[i].answer||"").trim() ? 1 : 0), 0);
      const totalM = parseFloat($("totalMarks").value) || 100;
      const valPerQ = totalM / quizData.length;
      $("liveScore").textContent = `Score: ${Math.round(score * valPerQ)}`;

      autoAdvanceTimer = setTimeout(() => {
          if(currentQuestion<quizData.length-1) { currentQuestion++; renderQuestion(); } else finishQuiz();
      }, 1500);
  };

  $("prevBtn").addEventListener("click",()=>{if(currentQuestion>0){currentQuestion--;renderQuestion();}});
  $("nextBtn").addEventListener("click",()=>{if(currentQuestion<quizData.length-1){currentQuestion++;renderQuestion();}});
  $("finishBtn").addEventListener("click", finishQuiz);

  function startMainTimer() {
      if(mainTimerInterval) clearInterval(mainTimerInterval);
      mainTimerInterval = setInterval(() => {
          if(totalSeconds > 0) { totalSeconds--; $("mainTimerLabel").textContent = formatTime(totalSeconds); if(totalSeconds<=0) finishQuiz(); } 
          else { elapsedSeconds++; $("mainTimerLabel").textContent = formatTime(elapsedSeconds); }
      }, 1000);
  }

  function runPerQTimer(sec) {
      perQuestionRemaining = sec; show($("timerPerQ")); $("timerPerQ").textContent = sec;
      questionTimerInterval = setInterval(() => {
          perQuestionRemaining--; $("timerPerQ").textContent = perQuestionRemaining;
          if(perQuestionRemaining<=0) { clearInterval(questionTimerInterval); if(currentQuestion<quizData.length-1) { currentQuestion++; renderQuestion(); } else finishQuiz(); }
      }, 1000);
  }

  function finishQuiz() {
      clearInterval(mainTimerInterval); clearInterval(questionTimerInterval); clearTimeout(autoAdvanceTimer);
      hide($("quizSection")); show($("reviewSection")); show($("appContainer").querySelector(".app-header"));
      
      let score = 0, correct = 0;
      const totalM = parseFloat($("totalMarks").value) || 100;
      const markPerQ = totalM / quizData.length;
      
      // FEATURE: Detailed Result Table for Printing
      let html = `
      <div style="text-align:center; margin-bottom:20px;">
        <h3>${studentDetails.name} - ${studentDetails.place}</h3>
      </div>
      <table style="font-size:0.9rem">
        <thead>
            <tr><th>#</th><th>Question</th><th>Your Answer</th><th>Correct Answer</th><th>Status</th></tr>
        </thead>
        <tbody>`;
      
      quizData.forEach((q, i) => {
          const u = userAnswers[i]||""; 
          const c = q.answer||"";
          const isCorrect = u === c;
          if(isCorrect) { score+=markPerQ; correct++; }
          
          html += `<tr style="background:${isCorrect?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)'}">
            <td>${i+1}</td>
            <td>${escapeHtml(q.question)}</td>
            <td>${escapeHtml(u) || '<span style="color:gray">Skipped</span>'}</td>
            <td>${escapeHtml(c)}</td>
            <td>${isCorrect ? '✅' : '❌'}</td>
          </tr>`;
      });
      html += `</tbody></table>`;
      
      $("finalScoreDisplay").textContent = Math.round(score);
      $("reviewTableContainer").innerHTML = html;
      const pass = parseFloat($("minPassMarks").value)||0;
      $("passFailText").innerHTML = score >= pass ? "<span style='color:var(--success)'>PASSED</span>" : "<span style='color:var(--danger)'>FAILED</span>";

      const txt = `*Quiz Result: ${studentDetails.name}*\n📍 ${studentDetails.place}\n🏆 Score: ${Math.round(score)}/${totalM}\n✅ Correct: ${correct}/${quizData.length}`;
      const contact = $("teacherWhatsapp").value;
      $("submitWhatsappBtn").onclick = () => window.open(contact ? `https://wa.me/${contact}?text=${encodeURIComponent(txt)}` : `https://wa.me/?text=${encodeURIComponent(txt)}`, "_blank");
      $("submitEmailBtn").onclick = () => window.open(`mailto:?body=${encodeURIComponent(txt)}`, "_self");
  }

  // FEATURE: Print PDF
  $("printPdfBtn").addEventListener("click", () => {
      window.print();
  });

  $("homeBtn_review").addEventListener("click", () => location.reload());

  /* --- SHARING --- */
  function checkUrlForSharedQuiz() {
      const hash = location.hash;
      if (hash && hash.includes("quiz=")) {
          try {
              const str = LZString.decompressFromEncodedURIComponent(hash.split("quiz=")[1]);
              const data = JSON.parse(str);
              isStudentMode = true; applyConfig(data.config);
              hide($("librarySection")); hide($("toggleCreatorBtn")); hide($("creatorPanel"));
              window.tempQuizData = data.questions; show($("studentLoginModal"));
          } catch(e) { console.error(e); showToast("Invalid Quiz Link", "error"); }
      }
  }
  
  $("shareQuizBtn").addEventListener("click", () => {
      const qData = getCurrentData();
      if(!qData.length) return showToast("No questions to share", "error");
      const str = LZString.compressToEncodedURIComponent(JSON.stringify({ questions: qData, config: getConfig() }));
      $("shareLinkInput").value = `${location.origin}${location.pathname}#quiz=${str}`;
      show($("shareModal"));
  });
  
  $("copyLinkBtn").addEventListener("click", () => {
      $("shareLinkInput").select(); document.execCommand("copy"); showToast("Link copied to clipboard!");
  });
  $("closeShareBtn").addEventListener("click", () => hide($("shareModal")));

})();