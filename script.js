/* =======================================================
   QuizCreatorApp — Shared Script for All Pages
   -------------------------------------------------------
   ✨ Works on GitHub Pages + Firebase Realtime Database
   📱 Firebase Authentication: Phone (OTP)
   🔢 Global Visitor Counter (localStorage)
   💾 Create, Browse, and Play Quizzes
   ======================================================= */

/* -------------------------------------------------------
   🔧 1.  FIREBASE CONFIGURATION
   -------------------------------------------------------
   ➤ Replace the placeholders below with your own
     values from Firebase Console → Project Settings → SDK setup.
------------------------------------------------------- */
const firebaseConfig = {
    apiKey: "AIzaSyAFr17zXqRQMpq-Guzh0nFKOiGGPAxiMHs",
    authDomain: "quizcreatorapp-1d014.firebaseapp.com",
    projectId: "quizcreatorapp-1d014",
    storageBucket: "quizcreatorapp-1d014.firebasestorage.app",
    messagingSenderId: "609023462039",
    appId: "1:609023462039:web:da5a2f0af8f24f85be77d2"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

/* -------------------------------------------------------
   👁️ 2.  VISITOR COUNTER (local only)
------------------------------------------------------- */
function animateCounter(el,start,end,duration){
  let startTime=null;
  function update(time){
    if(!startTime) startTime=time;
    const progress=Math.min((time-startTime)/duration,1);
    const val=Math.floor(progress*(end-start)+start);
    el.textContent=val.toString().padStart(6,"0");
    if(progress<1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}
function updateVisitCounter(){
  const el=document.getElementById("visitDigits");
  if(!el) return;
  let count=parseInt(localStorage.getItem("visitCount")||"0");
  count++;
  localStorage.setItem("visitCount",count);
  animateCounter(el,0,count,800);
}
updateVisitCounter();

/* -------------------------------------------------------
   🔐 3.  LOGIN / OTP / SKIP LOGIC
------------------------------------------------------- */
const loginPanel=document.getElementById("loginPanel");
const appContainer=document.getElementById("appContainer");
if(loginPanel){
  const phoneInput=document.getElementById("phoneInput");
  const sendOtpBtn=document.getElementById("sendOtpBtn");
  const otpInput=document.getElementById("otpInput");
  const verifyOtpBtn=document.getElementById("verifyOtpBtn");
  const skipBtn=document.getElementById("skipBtn");
  const signOutBtn=document.getElementById("signOutBtn");
  const loginStatus=document.getElementById("loginStatus");
  const otpStatus=document.getElementById("otpStatus");
  const stepPhone=document.getElementById("loginStepPhone");
  const stepOtp=document.getElementById("loginStepOtp");

  let confirmationResult=null;

  // Send OTP
  if(sendOtpBtn){
    sendOtpBtn.addEventListener("click",()=>{
      const number=phoneInput.value.trim();
      if(!number){alert("Enter phone number with country code.");return;}
      window.recaptchaVerifier=new firebase.auth.RecaptchaVerifier(sendOtpBtn,{size:"invisible"});
      auth.signInWithPhoneNumber(number,window.recaptchaVerifier)
      .then(result=>{
        confirmationResult=result;
        otpStatus.textContent="OTP sent to "+number;
        stepPhone.classList.add("hidden");
        stepOtp.classList.remove("hidden");
      })
      .catch(err=>alert(err.message));
    });
  }

  // Verify OTP
  if(verifyOtpBtn){
    verifyOtpBtn.addEventListener("click",()=>{
      const code=otpInput.value.trim();
      if(!code){alert("Enter OTP");return;}
      confirmationResult.confirm(code).then(res=>{
        loginSuccess(res.user.phoneNumber);
      }).catch(err=>alert("Incorrect OTP: "+err.message));
    });
  }

  // Skip Login
  if(skipBtn){
    skipBtn.addEventListener("click",()=>loginSuccess("Guest"));
  }

  // Sign Out
  if(signOutBtn){
    signOutBtn.addEventListener("click",()=>{
      localStorage.removeItem("quizUser");
      location.reload();
    });
  }

  // Successful Login
  function loginSuccess(userPhone){
    loginStatus.textContent="✅ Logged in as "+userPhone;
    localStorage.setItem("quizUser",userPhone);
    loginPanel.classList.add("hidden");
    if(appContainer) appContainer.classList.remove("hidden");
    signOutBtn.classList.remove("hidden");
  }

  // Auto-show app if already logged in
  const prevUser=localStorage.getItem("quizUser");
  if(prevUser){loginSuccess(prevUser);}
}

/* -------------------------------------------------------
   🧠 4.  QUIZ CREATION (index.html)
------------------------------------------------------- */
if(document.getElementById("saveQuizBtn")){
  const qList=document.getElementById("questionList");
  document.getElementById("addQBtn").addEventListener("click",()=>{
    const div=document.createElement("div");
    div.className="question-block";
    div.innerHTML=`
      <input placeholder="Question text" class="qText"/><br>
      <input placeholder="Option A" class="optA"/> 
      <input placeholder="Option B" class="optB"/> <br>
      <input placeholder="Option C" class="optC"/> 
      <input placeholder="Option D" class="optD"/> <br>
      <input placeholder="Correct answer text" class="ans"/>`;
    qList.appendChild(div);
  });

  document.getElementById("saveQuizBtn").addEventListener("click",()=>{
    const user=localStorage.getItem("quizUser")||"Guest";
    const title=document.getElementById("quizTitle").value.trim();
    const std=document.getElementById("quizStandard").value;
    const subj=document.getElementById("quizSubject").value;
    const exam=document.getElementById("quizExam").value;
    if(!title||!std||!subj||!exam){alert("Fill all quiz info");return;}

    const qs=[];
    document.querySelectorAll("#questionList .question-block").forEach(q=>{
      qs.push({
        q:q.querySelector(".qText").value,
        A:q.querySelector(".optA").value,
        B:q.querySelector(".optB").value,
        C:q.querySelector(".optC").value,
        D:q.querySelector(".optD").value,
        answer:q.querySelector(".ans").value
      });
    });
    if(!qs.length){alert("Add at least one question.");return;}

    const quiz={title,standard:std,subject:subj,exam,creator:user,questions:qs,timestamp:Date.now()};
    db.ref(`quizzes/${std}/${subj}/${exam}`).push(quiz)
    .then(()=>{
      document.getElementById("saveStatus").textContent="✅ Quiz saved!";
    })
    .catch(e=>alert(e.message));
  });
}

/* -------------------------------------------------------
   📚 5.  BROWSE QUIZZES (browse.html)
------------------------------------------------------- */
if(document.getElementById("quizGrid")){
  const grid=document.getElementById("quizGrid");
  const stdF=document.getElementById("filterStandard");
  const subF=document.getElementById("filterSubject");
  const examF=document.getElementById("filterExam");
  const btn=document.getElementById("applyFilterBtn");

  function loadQuizzes(){
    grid.innerHTML="<p>Loading quizzes ...</p>";
    db.ref("quizzes").once("value").then(snap=>{
      const data=[];
      snap.forEach(std=>{
        std.forEach(sub=>{
          sub.forEach(ex=>{
            ex.forEach(qz=>data.push({...qz.val(),id:qz.key}));
          });
        });
      });
      renderQuizzes(data);
    });
  }

  function renderQuizzes(list){
    grid.innerHTML="";
    const sVal=stdF.value, subVal=subF.value, eVal=examF.value;
    const filtered=list.filter(q=>
      (!sVal||q.standard===sVal)&&
      (!subVal||q.subject===subVal)&&
      (!eVal||q.exam===eVal)
    );
    if(!filtered.length){grid.innerHTML="<p>No quizzes found.</p>";return;}
    filtered.forEach(q=>{
      const card=document.createElement("div");
      card.className="quiz-card";
      card.innerHTML=`
        <h3>${q.title}</h3>
        <p>Std: ${q.standard} | ${q.subject} | ${q.exam}</p>
        <p>👤 ${q.creator}</p>
        <button onclick="playQuiz('${q.id}','${q.standard}','${q.subject}','${q.exam}')">▶ Play</button>
        <button onclick="downloadQuiz(${encodeURIComponent(JSON.stringify(q))})">⬇ Download</button>
        <button onclick="shareQuiz('${q.id}')">🔗 Share</button>`;
      grid.appendChild(card);
    });
  }

  btn.addEventListener("click",loadQuizzes);
  loadQuizzes();
}

// Download quiz as JSON
function downloadQuiz(q){
  const dataStr="data:text/json;charset=utf-8,"+JSON.stringify(q,null,2);
  const a=document.createElement("a");
  a.href=dataStr;a.download=q.title+".json";a.click();
}
// Open quiz play page
function playQuiz(id,std,sub,exam){
  window.location.href=`play.html?id=${id}&std=${std}&sub=${sub}&exam=${exam}`;
}
// Share link
function shareQuiz(id){
  const url=`${location.origin}${location.pathname.replace(/browse.html$/,'')}play.html?id=${id}`;
  navigator.clipboard.writeText(url);
  alert("Link copied:\n"+url);
}

/* -------------------------------------------------------
   🎮 6.  PLAY QUIZ (play.html)
------------------------------------------------------- */
if(document.getElementById("playContainer")){
  const params=new URLSearchParams(window.location.search);
  const id=params.get("id");
  const std=params.get("std");
  const sub=params.get("sub");
  const exam=params.get("exam");
  if(!id||!std||!sub||!exam){
    document.getElementById("quizTitlePlay").textContent="Invalid quiz link.";
  }else{
    db.ref(`quizzes/${std}/${sub}/${exam}/${id}`).once("value").then(s=>{
      const qz=s.val();
      if(!qz){document.getElementById("quizTitlePlay").textContent="Quiz not found.";return;}
      startQuiz(qz);
    });
  }
}

function startQuiz(qz){
  const titleEl=document.getElementById("quizTitlePlay");
  const area=document.getElementById("questionArea");
  const review=document.getElementById("reviewArea");
  const reviewList=document.getElementById("reviewList");
  const scoreEl=document.getElementById("finalScore");
  titleEl.textContent=qz.title;
  let index=0,score=0,answers=[];

  function showQuestion(){
    if(index>=qz.questions.length){
      // show review
      area.innerHTML="";
      review.classList.remove("hidden");
      scoreEl.textContent=`Your Score: ${score}/${qz.questions.length}`;
      reviewList.innerHTML=answers.map(a=>`
        <div class="review-item">
          <b>Q:</b> ${a.q}<br>
          <b>Your:</b> <span style="color:${a.correct?'green':'red'}">${a.chosen}</span> |
          <b>Correct:</b> ${a.answer}
        </div>`).join("");
      return;
    }
    const q=qz.questions[index];
    area.innerHTML=`
      <div class="question-block">
        <h3>${index+1}. ${q.q}</h3>
        ${["A","B","C","D"].map(opt=>`
          <button class="option-btn" data-val="${q[opt]}">${opt}) ${q[opt]}</button>
        `).join("")}
      </div>`;
    area.querySelectorAll(".option-btn").forEach(btn=>{
      btn.onclick=()=>{
        const correct=btn.dataset.val===q.answer;
        btn.classList.add(correct?"correct":"wrong");
        score+=correct?1:0;
        answers.push({q:q.q,chosen:btn.dataset.val,answer:q.answer,correct});
        setTimeout(()=>{index++;showQuestion();},600);
      };
    });
  }
  showQuestion();
}
