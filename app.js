(() => {
  "use strict";

  const content = window.BIRTHDAY_CONTENT;
  const storageKey = "kayenat-universe-progress-v1";
  const blankProgress = () => ({ completed: [], stars: 0, secretFound: false });
  let progress = loadProgress();
  let toastTimer;
  let gameTimers = [];
  let activeMemory = 0;
  let introStage = 0;
  let surpriseStep = 0;
  let cuttyCount = 0;
  let comparisonIndex = 0;
  let loveBeat = 0;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const intro = $("#intro");
  const map = $("#map");
  const chapterDialog = $("#chapter-dialog");
  const comparisonDialog = $("#comparison-dialog");
  const dialogContent = $("#dialog-content");

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (saved && Array.isArray(saved.completed)) return { ...blankProgress(), ...saved };
    } catch (_) { /* Storage may be unavailable in private browsing. */ }
    return blankProgress();
  }

  function saveProgress() {
    try { localStorage.setItem(storageKey, JSON.stringify(progress)); } catch (_) { /* The experience still works without persistence. */ }
    updateProgressUI();
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2300);
  }

  function markComplete(chapter) {
    if (!progress.completed.includes(chapter)) {
      progress.completed.push(chapter);
      saveProgress();
      const lines = {
        stars: "Dil tumhare naam. Kya baat hai!",
        hogya: "Teeno paheliyan solved? Waah beta!",
        tasbih: content.tasbih.complete,
        memories: "Yeh jagah tumhari yaadon ke naam.",
        secret: "Dil pakad liya na. Zada udne ka nhi."
      };
      showToast(lines[chapter] || "Ek nayi si khoj.");
    }
  }

  function updateProgressUI() {
    const required = ["stars", "hogya", "tasbih", "memories"];
    const count = required.filter((key) => progress.completed.includes(key)).length;
    $("#progress-label").textContent = `${count} / 4 manzilein`;
    const finalButton = $("#final-button");
    const finalState = $("#final-state");
    finalButton.disabled = count < required.length;
    const remaining = required.length - count;
    finalState.textContent = count === required.length ? "Bas ek last surprise hai..." : remaining === 1 ? "Bas ek chhoti si cheez baaki hai" : `Abhi ${remaining} chhoti si cheezein baaki hain`;
    $$(".planet-node[data-chapter]").forEach((node) => {
      const key = node.dataset.chapter;
      node.classList.toggle("is-complete", progress.completed.includes(key));
    });
    $(".node-secret").classList.toggle("is-hidden", !progress.completed.includes("stars"));
  }

  function setBirthdayNote() {
    const today = new Date();
    const isBirthday = today.getMonth() + 1 === content.birthdayMonth && today.getDate() === content.birthdayDay;
    const birthday = new Date(2000, content.birthdayMonth - 1, content.birthdayDay).toLocaleDateString("en-US", { month: "long", day: "numeric" });
    $("#intro-title").textContent = content.intro.title.replace("{name}", content.name);
    $("#intro-message").textContent = content.intro.first;
    $("#intro-submessage").textContent = content.intro.firstFollowup;
    $("#birthday-note").textContent = isBirthday ? `Aaj tumhara din hai, ${content.name} · ${birthday}` : `${birthday} · sirf tumhare liye`;
    $("#birthday-footer").innerHTML = `${escapeHtml(birthday)} <span class="footer-dot">·</span> sirf tumhare liye`;
    $("#map-title").textContent = `Kahan chalein, ${content.name}?`;
    $("#map-greeting").textContent = content.jokes.mapGreeting;
  }

  function enterUniverse() {
    intro.classList.add("is-hidden");
    intro.inert = true;
    map.classList.remove("is-hidden");
    map.inert = false;
    updateProgressUI();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function advanceIntro() {
    if (introStage === 0) {
      introStage = 1;
      $("#intro-title").textContent = content.intro.secondTitle;
      $("#intro-message").textContent = content.intro.second;
      $("#intro-submessage").textContent = content.intro.secondFollowup;
      $("#enter-button").textContent = content.intro.secondButton;
      $("#intro-title").classList.remove("intro-reveal");
      void $("#intro-title").offsetWidth;
      $("#intro-title").classList.add("intro-reveal");
      return;
    }
    enterUniverse();
  }

  function handleFinalButton() {
    const required = ["stars", "hogya", "tasbih", "memories"];
    if (required.some((chapter) => !progress.completed.includes(chapter))) return;
    if (surpriseStep < content.jokes.surprise.length) {
      const message = content.jokes.surprise[surpriseStep];
      surpriseStep += 1;
      $("#final-state").textContent = message;
      showToast(message);
      return;
    }
    openComparison();
  }

  function stopGameTimers() {
    gameTimers.forEach((timer) => { clearInterval(timer); clearTimeout(timer); });
    gameTimers = [];
  }

  function openChapter(chapter) {
    stopGameTimers();
    const chapterInfo = {
      stars: ["CHHOTI SI SHARARAT", "Udte dil pakdo"],
      hogya: ["BIRTHDAY REALITY CHECK", "Aap mujhe kitna jaanti ho?"],
      tasbih: ["SUKOON KE PAL", content.tasbih.title],
      memories: ["APNI YAADEN", "Kuch apni si baatein"],
      secret: ["EK CHHOTI SI CHHUPI BAAT", "Zada udne ka nhi"],
      cutty: ["JAB AAP JAANE LAGO", "Cuttyyy!"]
    }[chapter];
    if (!chapterInfo) return;
    $("#dialog-kicker").textContent = chapterInfo[0];
    $("#dialog-title").textContent = chapterInfo[1];
    const renderers = { stars: renderStars, hogya: renderBirthdayQuiz, tasbih: renderTasbih, memories: renderMemories, secret: renderSecret, cutty: renderCutty };
    renderers[chapter]();
    chapterDialog.showModal();
  }

  function renderStars() {
    dialogContent.innerHTML = `
      <p class="dialog-lede">25 second mein 8 udte dil pakdo. Blue dil mile, toh do points ek saath!</p>
      <div class="game-hud"><span>Dil <strong id="star-score">0 / 8</strong></span><span>Waqt <strong id="star-time">25s</strong></span></div>
      <div class="game-arena" id="star-arena" aria-label="Udte dil pakadne ki jagah"><div class="arena-hint" id="star-hint">Tayyar ho? Shuru karo.</div></div>
      <p class="game-note" id="star-note" aria-live="polite"></p>
      <div class="dialog-actions"><button class="button button-primary button-small" id="star-start" type="button">Game shuru karo</button></div>`;
    const arena = $("#star-arena");
    let score = 0;
    let seconds = 25;
    let active = false;
    const finish = (won) => {
      if (!active) return;
      active = false;
      stopGameTimers();
      $$(".tap-star", arena).forEach((star) => star.remove());
      $("#star-hint").textContent = won ? "Yeh chhoti si khushi tumhari hui." : "Stars yahin hain. Ek baar aur khelo.";
      $("#star-hint").classList.remove("is-hidden");
      $("#star-note").textContent = won ? content.phrases.rareStar[Math.floor(Math.random() * content.phrases.rareStar.length)] : "Bas thoda sa reh gaya. Phir se khel lo!";
      $("#star-start").textContent = won ? "Ek baar aur" : "Phir koshish karo";
      if (won) markComplete("stars");
    };
    const spawn = () => {
      if (!active || arena.querySelectorAll(".tap-star").length > 4) return;
      const star = document.createElement("button");
      const special = Math.random() < .16;
      star.type = "button";
      star.className = `tap-star${special ? " special" : ""}`;
      star.setAttribute("aria-label", special ? "Khaas blue dil pakdo" : "Dil pakdo");
      star.textContent = special ? "♥" : "♡";
      star.style.left = `${4 + Math.random() * 84}%`;
      star.style.top = `${5 + Math.random() * 73}%`;
      star.addEventListener("click", () => {
        if (!active || star.dataset.caught) return;
        star.dataset.caught = "true";
        star.remove();
        score += special ? 2 : 1;
        progress.stars += 1;
        saveProgress();
        $("#star-score").textContent = `${Math.min(score, 8)} / 8`;
        if (special) $("#star-note").textContent = content.phrases.rareStar[Math.floor(Math.random() * content.phrases.rareStar.length)];
        if (score >= 8) finish(true);
      }, { once: true });
      arena.append(star);
      gameTimers.push(setTimeout(() => star.remove(), 3400));
    };
    $("#star-start").addEventListener("click", () => {
      stopGameTimers();
      score = 0;
      seconds = 25;
      active = true;
      $("#star-score").textContent = "0 / 8";
      $("#star-time").textContent = "25s";
      $("#star-note").textContent = "";
      $("#star-hint").classList.add("is-hidden");
      $("#star-start").textContent = "Raund phir se";
      gameTimers.push(setInterval(() => { seconds -= 1; $("#star-time").textContent = `${seconds}s`; if (seconds <= 0) finish(false); }, 1000));
      gameTimers.push(setInterval(spawn, 620));
      spawn();
    });
  }

  function renderBirthdayQuiz() {
    let questionIndex = 0;
    let answered = 0;
    const finish = () => {
      dialogContent.innerHTML = `
        <p class="dialog-lede">Teeno sawalon ka jawab mil gaya. Hogya? Itni jaldi bore ho gayi mujhse? 😂</p>
        <p class="urdu-line riddle-urdu" lang="ur" dir="rtl">تمہاری ہنسی سب سے پیاری</p>
        <p class="game-result">${answered} / ${content.birthdayQuiz.length} jawab, aur teeno mein main hi tha.</p>
        <div class="dialog-actions"><button class="button button-primary button-small" id="quiz-replay" type="button">Quiz phir se khelo</button></div>`;
      markComplete("hogya");
      $("#quiz-replay").addEventListener("click", () => { questionIndex = 0; answered = 0; renderQuestion(); });
    };
    const renderQuestion = () => {
      const question = content.birthdayQuiz[questionIndex];
      dialogContent.innerHTML = `
        <p class="dialog-lede" id="quiz-question">${escapeHtml(question.question)}</p>
        <div class="game-hud"><span>Sawal <strong>${questionIndex + 1} / ${content.birthdayQuiz.length}</strong></span><span>Jawab <strong>${answered}</strong></span></div>
        <div class="riddle-choices" role="group" aria-label="Apna jawab chuno">${question.choices.map((choice, index) => `<button class="button button-secondary quiz-option" data-choice="${index}" type="button">${escapeHtml(choice)}</button>`).join("")}</div>
        <p class="game-note" id="quiz-feedback" aria-live="polite">Koi bhi jawab chalega... waise sahi jawab main hi hoon. 😌</p>
        <div class="dialog-actions"><button class="button button-primary button-small is-hidden" id="quiz-next" type="button">Agla sawal</button></div>`;
      $$(".quiz-option").forEach((button) => button.addEventListener("click", () => {
        const choice = Number(button.dataset.choice);
        answered += 1;
        $$(".quiz-option").forEach((option) => { option.disabled = true; });
        $("#quiz-feedback").textContent = question.responses[choice];
        const nextButton = $("#quiz-next");
        nextButton.textContent = questionIndex === content.birthdayQuiz.length - 1 ? "Bas, result dikhao" : "Agla sawal";
        nextButton.classList.remove("is-hidden");
        nextButton.addEventListener("click", () => {
          questionIndex += 1;
          if (questionIndex === content.birthdayQuiz.length) finish();
          else renderQuestion();
        }, { once: true });
      }));
    };
    renderQuestion();
  }

  function renderCutty() {
    cuttyCount = 0;
    dialogContent.innerHTML = `
      <p class="dialog-lede">Aap jaane lagte ho, aur main thoda sa aur time maangta hoon. Typical.</p>
      <button class="cutty-character" id="cutty-character" type="button" aria-label="Mujhe tap karo"><span class="cutty-heart" aria-hidden="true">♡</span><span class="cutty-face" aria-hidden="true">•ᴗ•</span></button>
      <p class="game-result" id="cutty-line" aria-live="polite">Bas ek baar tap karo naaa.</p>
      <div class="dialog-actions"><button class="button button-primary button-small is-hidden" id="cutty-leave" type="button">Achha, ab jaane do</button></div>`;
    $("#cutty-character").addEventListener("click", () => {
      const line = content.jokes.cutty[Math.min(cuttyCount, content.jokes.cutty.length - 1)];
      cuttyCount += 1;
      $("#cutty-line").textContent = line;
      $("#cutty-character").classList.remove("cutty-pop");
      void $("#cutty-character").offsetWidth;
      $("#cutty-character").classList.add("cutty-pop");
      if (cuttyCount >= content.jokes.cutty.length) {
        $("#cutty-leave").classList.remove("is-hidden");
        markComplete("cutty");
      }
    });
    $("#cutty-leave").addEventListener("click", () => chapterDialog.close());
  }

  function renderTasbih() {
    const config = content.tasbih;
    const stored = progress.tasbihCounts;
    const counts = config.stages.map((stage, index) => Math.min(stage.target, Math.max(0, Number.isInteger(stored?.[index]) ? stored[index] : 0)));
    let stageIndex = counts.findIndex((count, index) => count < config.stages[index].target);
    if (stageIndex === -1) stageIndex = config.stages.length - 1;
    dialogContent.innerHTML = `
      <section class="tasbih-experience" aria-label="Tasbih">
        <p class="dialog-lede">${escapeHtml(config.invitation)}</p>
        <ol class="tasbih-steps" aria-label="Zikr ke chaar hisse">${config.stages.map((stage, index) => `<li data-stage="${index}"><span>${index + 1}</span>${escapeHtml(stage.name)}</li>`).join("")}</ol>
        <p class="tasbih-arabic" id="tasbih-arabic" lang="ar" dir="rtl"></p>
        <h3 class="tasbih-name" id="tasbih-name"></h3>
        <p class="tasbih-target" id="tasbih-target"></p>
        <div class="tasbih-ring">
          <svg id="tasbih-beads" viewBox="0 0 320 320" aria-hidden="true"></svg>
          <div class="tasbih-count"><output id="tasbih-count" aria-label="Is zikr ki ginti" aria-live="off">0</output><span id="tasbih-total"></span></div>
        </div>
        <p class="tasbih-guidance">${escapeHtml(config.guidance)}</p>
        <button class="button button-primary tasbih-tap" id="tasbih-tap" type="button">${escapeHtml(config.tap)}</button>
        <p class="tasbih-status" id="tasbih-status" role="status"></p>
        <button class="button button-primary is-hidden" id="tasbih-next" type="button">${escapeHtml(config.next)}</button>
        <div class="tasbih-secondary"><button class="button button-secondary button-small" id="tasbih-undo" type="button">Ek ginti kam</button><button class="button button-secondary button-small" id="tasbih-reset" type="button">Ginti phir se</button></div>
      </section>`;
    const update = () => {
      const stage = config.stages[stageIndex];
      const count = counts[stageIndex];
      const stageDone = count === stage.target;
      const allDone = counts.every((value, index) => value === config.stages[index].target);
      $("#tasbih-arabic").textContent = stage.arabic;
      $("#tasbih-name").textContent = stage.name;
      $("#tasbih-target").textContent = `${stage.target} martaba`;
      $("#tasbih-count").textContent = count;
      $("#tasbih-total").textContent = `/ ${stage.target}`;
      $("#tasbih-tap").disabled = stageDone;
      $("#tasbih-tap").classList.toggle("is-hidden", stageDone);
      $("#tasbih-undo").disabled = count === 0;
      $("#tasbih-next").classList.toggle("is-hidden", !stageDone || allDone);
      $("#tasbih-status").textContent = allDone ? `${config.complete} ${config.dua}` : stageDone ? config.stageComplete : "";
      $$(".tasbih-steps li").forEach((item, index) => {
        item.classList.toggle("is-done", counts[index] === config.stages[index].target);
        if (index === stageIndex) item.setAttribute("aria-current", "step");
        else item.removeAttribute("aria-current");
      });
      $("#tasbih-beads").innerHTML = `<circle cx="160" cy="160" r="132" fill="none" stroke="#c6dcef" stroke-width="1.5"/>${Array.from({ length: stage.target }, (_, index) => {
        const angle = (index / stage.target) * Math.PI * 2 - Math.PI / 2;
        const beadClass = index < count ? "tasbih-bead is-counted" : "tasbih-bead";
        return `<circle class="${beadClass}" cx="${160 + Math.cos(angle) * 132}" cy="${160 + Math.sin(angle) * 132}" r="${stage.target > 34 ? 5.2 : 7.5}"/>`;
      }).join("")}`;
    };
    const persist = () => { progress.tasbihCounts = [...counts]; saveProgress(); };
    $("#tasbih-tap").addEventListener("click", () => {
      const stage = config.stages[stageIndex];
      if (counts[stageIndex] >= stage.target) return;
      counts[stageIndex] += 1;
      persist();
      update();
      if (counts.every((value, index) => value === config.stages[index].target)) markComplete("tasbih");
    });
    $("#tasbih-next").addEventListener("click", () => {
      if (counts[stageIndex] !== config.stages[stageIndex].target || stageIndex >= config.stages.length - 1) return;
      stageIndex += 1;
      update();
      $("#tasbih-tap").focus();
    });
    $("#tasbih-undo").addEventListener("click", () => {
      if (counts[stageIndex] === 0) return;
      counts[stageIndex] -= 1;
      progress.completed = progress.completed.filter((key) => key !== "tasbih");
      persist();
      update();
    });
    $("#tasbih-reset").addEventListener("click", () => {
      if (!window.confirm(config.reset)) return;
      counts.fill(0);
      stageIndex = 0;
      progress.completed = progress.completed.filter((key) => key !== "tasbih");
      persist();
      update();
    });
    update();
  }

  function renderMemories() {
    const memories = Array.isArray(content.memories) ? content.memories : [];
    activeMemory = 0;
    dialogContent.innerHTML = `
      <p class="dialog-lede">Woh chhote chhote pal, jo dil ke paas rehte hain.</p>
      <div class="memory-frame" id="memory-frame"></div>
      <p class="memory-caption" id="memory-caption"></p>
      <div class="memory-controls"><button class="button button-secondary button-small" id="memory-prev" type="button" aria-label="Pichhli yaad">←</button><span class="memory-count" id="memory-count"></span><button class="button button-secondary button-small" id="memory-next" type="button" aria-label="Agli yaad">→</button></div>
      <div class="dialog-actions"><button class="button button-primary button-small" id="memory-done" type="button">Yaadon ki sair hogayi</button></div>`;
    const frame = $("#memory-frame");
    const caption = $("#memory-caption");
    const count = $("#memory-count");
    const renderMemory = () => {
      frame.replaceChildren();
      if (!memories.length) {
        const empty = document.createElement("div"); empty.className = "memory-placeholder";
        empty.innerHTML = `<span class="memory-star" aria-hidden="true">✧</span><h3>Tumhari tasveeron ki jagah</h3><p>Apni photos aur unke captions <strong>content.js</strong> mein jodo. Yahan kisi aur ki yaadein nahi hain.</p>`;
        frame.append(empty); caption.textContent = "Tumhari kahaani ka intezaar hai."; count.textContent = "Tasveeron ka intezaar";
        $("#memory-prev").disabled = true; $("#memory-next").disabled = true;
        return;
      }
      const memory = memories[activeMemory];
      const image = document.createElement("img"); image.src = memory.src; image.alt = memory.alt || memory.caption || `Yaad ${activeMemory + 1}`; image.loading = "lazy";
      image.addEventListener("error", () => { frame.replaceChildren(); const error = document.createElement("p"); error.className = "memory-placeholder"; error.textContent = `${memory.src} tasveer nahi mili. content.js mein iska path dekho.`; frame.append(error); });
      frame.append(image); caption.textContent = memory.caption || ""; count.textContent = `${activeMemory + 1} / ${memories.length}`;
      $("#memory-prev").disabled = activeMemory === 0; $("#memory-next").disabled = activeMemory === memories.length - 1;
    };
    $("#memory-prev").addEventListener("click", () => { activeMemory = Math.max(0, activeMemory - 1); renderMemory(); });
    $("#memory-next").addEventListener("click", () => { activeMemory = Math.min(memories.length - 1, activeMemory + 1); renderMemory(); });
    $("#memory-done").addEventListener("click", () => markComplete("memories"));
    renderMemory();
  }

  function renderSecret() {
    dialogContent.innerHTML = `
      <p class="dialog-lede">${escapeHtml(content.runawayHeart.instruction)}</p>
      <div class="game-hud"><span>Pakde <strong id="moon-score">0 / 5</strong></span><span id="moon-note">${escapeHtml(content.runawayHeart.ready)}</span></div>
      <div class="secret-planet" id="secret-planet" aria-label="Bhaagte dil ko pakdo"><button class="runaway" id="runaway" type="button" aria-label="Dil pakdo">♡</button></div>
      <p class="game-note" id="secret-message" aria-live="polite"></p>
      <div class="dialog-actions"><button class="button button-secondary button-small" id="moon-reset" type="button">Phir se khelo</button></div>`;
    let caught = 0;
    let moving = false;
    const move = () => {
      const field = $("#secret-planet"); const moon = $("#runaway");
      moon.style.left = `${Math.random() * Math.max(0, field.clientWidth - 60)}px`;
      moon.style.top = `${Math.random() * Math.max(0, field.clientHeight - 60)}px`;
    };
    move();
    $("#runaway").addEventListener("click", () => {
      if (caught >= 5) return;
      caught += 1; $("#moon-score").textContent = `${caught} / 5`;
      if (caught >= 5) {
        moving = false; stopGameTimers();
        $("#secret-message").textContent = `Pakad liya! ${content.phrases.noFlying} 😂`;
        $("#moon-note").textContent = content.runawayHeart.landed;
        progress.secretFound = true; saveProgress(); markComplete("secret");
      } else {
        $("#secret-message").textContent = caught === 3 ? content.phrases.cutty : content.runawayHeart.nearby;
        move();
        if (!moving) { moving = true; gameTimers.push(setInterval(move, Math.max(450, 900 - caught * 70))); }
      }
    });
    $("#moon-reset").addEventListener("click", () => {
      stopGameTimers(); caught = 0; moving = false; $("#moon-score").textContent = "0 / 5"; $("#secret-message").textContent = ""; $("#moon-note").textContent = content.runawayHeart.ready; move();
    });
  }

  function comparisonIllustration(kind) {
    const art = {
      trex: `<svg viewBox="0 0 400 280" role="img" aria-label="Blue cartoon T-Rex"><ellipse cx="202" cy="248" rx="142" ry="17" fill="#dceeff"/><path d="M83 185c-24-9-47-27-63-49 31 13 54 15 79 9 18-38 48-57 91-55l54 4c18-34 48-57 88-54 18 2 33 13 42 31l-11 35-32 18-53-5-25 36 35 41-12 43h-42l-11-42-54-3-15 45h-43l2-58-52-5-21 41H76l6-54z" fill="#79b8f5" stroke="#3478d4" stroke-width="7" stroke-linejoin="round"/><path d="M271 142l-24 34 30 12 18-29m-92 4 27 8-22 13-26-9" fill="#eaf5ff" stroke="#3478d4" stroke-width="6" stroke-linejoin="round"/><circle cx="329" cy="74" r="7" fill="#193b63"/><path d="M350 100l29 4-25 9" fill="none" stroke="#193b63" stroke-width="5" stroke-linecap="round"/><path d="M345 128l-8 11 12 1 8-11" fill="#fff"/><path d="M145 122q33 9 53 37" fill="none" stroke="#a9d4ff" stroke-width="9" stroke-linecap="round"/></svg>`,
      whale: `<svg viewBox="0 0 440 280" role="img" aria-label="Smiling blue whale"><ellipse cx="221" cy="247" rx="174" ry="14" fill="#dceeff"/><path d="M54 170c0-61 62-106 158-106 78 0 133 34 152 82l54-31-12 47 18 43-58-16c-31 37-92 55-172 47-83-8-140-31-140-66z" fill="#69aef1" stroke="#3478d4" stroke-width="7" stroke-linejoin="round"/><path d="M127 190q93 34 207-3" fill="none" stroke="#eaf6ff" stroke-width="18" stroke-linecap="round"/><path d="M194 204l16 30m18-34 8 37m13-40 0 38" stroke="#83baf0" stroke-width="5" stroke-linecap="round"/><circle cx="119" cy="150" r="7" fill="#193b63"/><path d="M79 170q15 14 31 0" fill="none" stroke="#193b63" stroke-width="4" stroke-linecap="round"/><path d="M170 56c-5-23 7-34 20-39m-5 39c4-22 20-30 34-29" fill="none" stroke="#9ecfff" stroke-width="8" stroke-linecap="round"/><circle cx="185" cy="21" r="5" fill="#d7edff"/><circle cx="224" cy="22" r="5" fill="#d7edff"/></svg>`,
      tree: `<svg viewBox="0 0 300 390" role="img" aria-label="Tall blue sequoia tree"><ellipse cx="151" cy="374" rx="118" ry="10" fill="#dceeff"/><path d="M137 365q17-106 7-182t13-155q21 87 17 145t20 192z" fill="#b7d9fa" stroke="#3478d4" stroke-width="7" stroke-linejoin="round"/><path d="M150 214l-68-76m70 117 78-95m-76 4-52-88m73 121 47-73M145 278l-68-54m102-52 38-47" fill="none" stroke="#3478d4" stroke-width="8" stroke-linecap="round"/><path d="M150 27q-29-2-40 25-25 2-30 29-20 14-7 35-7 25 20 34h116q31-11 19-40 11-25-16-39-2-31-33-36-12-16-29-8z" fill="#dff0ff" stroke="#79b8f5" stroke-width="6"/><circle cx="111" cy="77" r="9" fill="#b1d8fa"/><circle cx="177" cy="60" r="12" fill="#b1d8fa"/><circle cx="201" cy="104" r="8" fill="#b1d8fa"/></svg>`,
      moon: `<svg viewBox="0 0 320 320" role="img" aria-label="Soft blue Moon with craters"><circle cx="160" cy="160" r="127" fill="#eaf5ff" stroke="#79b8f5" stroke-width="9"/><path d="M79 86q26-30 52-4t-4 42q-21 14-41-4zm132-8q31-18 45 10t-10 37q-30 2-35-20zm-78 97q23-26 45-6t-2 37q-19 18-39 2zm74 35q27-20 41 5t-11 33q-27 0-30-18z" fill="#c4e0fb"/><circle cx="94" cy="180" r="9" fill="#d4e9ff"/><circle cx="189" cy="126" r="7" fill="#d4e9ff"/><circle cx="134" cy="248" r="6" fill="#d4e9ff"/></svg>`,
      earth: `<svg viewBox="0 0 340 340" role="img" aria-label="Illustrated blue and white Earth"><defs><clipPath id="earth-clip"><circle cx="170" cy="170" r="135"/></clipPath></defs><circle cx="170" cy="170" r="140" fill="#dff1ff" stroke="#3478d4" stroke-width="9"/><g clip-path="url(#earth-clip)"><path d="M63 108l27-26 43 7 18 27-19 19-5 31-27 11-18 39-28-8-15-48zm119-69 22 17 1 26 35 9 16 31-21 17-35-13-17 18-32-6-14-24 18-27zm56 138 31-17 37 16-8 34-26 5-19 35-25-16-10-33zM90 246l29 8 10 34-18 17-27-28z" fill="#79b8f5"/><path d="M41 145q52-27 93 1t88 2 78 11M59 202q41-22 81 3t89 1 70 7" fill="none" stroke="#fff" stroke-width="7" opacity=".85"/></g><circle cx="170" cy="170" r="135" fill="none" stroke="#3478d4" stroke-width="7"/></svg>`,
      sun: `<svg viewBox="0 0 360 360" role="img" aria-label="Bright white and blue Sun"><g stroke="#79b8f5" stroke-width="13" stroke-linecap="round"><path d="M180 18v43M180 299v43M18 180h43M299 180h43M65 65l31 31m168 168 31 31M295 65l-31 31M96 264l-31 31"/></g><circle cx="180" cy="180" r="112" fill="#fff" stroke="#79b8f5" stroke-width="10"/><circle cx="180" cy="180" r="83" fill="#e8f5ff"/><path d="M141 191q39 32 78 0" fill="none" stroke="#3478d4" stroke-width="8" stroke-linecap="round"/><circle cx="147" cy="159" r="7" fill="#193b63"/><circle cx="213" cy="159" r="7" fill="#193b63"/><path d="M121 108q28-27 54-13m59 0q27-13 54 13" fill="none" stroke="#cbe6ff" stroke-width="9" stroke-linecap="round"/></svg>`,
      universe: `<svg viewBox="0 0 520 360" role="img" aria-label="A playful blue illustrated universe"><defs><radialGradient id="galaxy-blue"><stop stop-color="#fff"/><stop offset=".25" stop-color="#d9efff"/><stop offset="1" stop-color="#6ea9e2" stop-opacity="0"/></radialGradient></defs><rect x="6" y="6" width="508" height="348" rx="36" fill="#183b63"/><ellipse cx="260" cy="180" rx="205" ry="98" fill="url(#galaxy-blue)" transform="rotate(-23 260 180)"/><ellipse cx="260" cy="180" rx="148" ry="54" fill="none" stroke="#d9efff" stroke-width="12" opacity=".8" transform="rotate(-23 260 180)"/><ellipse cx="260" cy="180" rx="106" ry="31" fill="none" stroke="#79b8f5" stroke-width="8" opacity=".9" transform="rotate(22 260 180)"/><circle cx="260" cy="180" r="25" fill="#fff"/><g fill="#fff"><circle cx="71" cy="74" r="4"/><circle cx="442" cy="86" r="5"/><circle cx="416" cy="278" r="3"/><circle cx="108" cy="283" r="5"/><path d="M153 60l5 12 12 5-12 5-5 12-5-12-12-5 12-5zm231 112 4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/></g></svg>`,
      heart: `<svg viewBox="0 0 360 330" role="img" aria-label="A bright blue heart surrounded by tiny hearts"><path d="M180 287S42 203 42 111C42 51 121 34 180 99 239 34 318 51 318 111c0 92-138 176-138 176z" fill="#79b8f5" stroke="#3478d4" stroke-width="9" stroke-linejoin="round"/><path d="M180 251S73 183 73 115c0-36 44-48 83-5 39-43 83-31 83 5 0 68-59 119-59 119z" fill="#fff"/><path d="M128 164q52 43 104 0" fill="none" stroke="#b3d9ff" stroke-width="10" stroke-linecap="round"/><circle cx="137" cy="133" r="7" fill="#3478d4"/><circle cx="223" cy="133" r="7" fill="#3478d4"/><path d="M45 51l5 12 12 5-12 5-5 12-5-12-12-5 12-5zm264 26 4 10 10 4-10 4-4 10-4-10-10-4 10-4zM65 245l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" fill="#d9edff"/></svg>`
    };
    return art[kind] || art.heart;
  }

  function openComparison() {
    comparisonIndex = 0;
    loveBeat = 0;
    renderComparison();
    comparisonDialog.showModal();
  }

  function renderComparison() {
    const config = content.comparison;
    const stage = $("#comparison-stage");
    const slides = config.slides;
    const isObject = comparisonIndex < slides.length;
    const isTwist = comparisonIndex === slides.length;
    stage.classList.toggle("is-cosmic", !isObject || slides[comparisonIndex]?.kind === "universe");
    stage.classList.toggle("is-love", !isObject && !isTwist);
    stage.dataset.kind = isObject ? slides[comparisonIndex].kind : isTwist ? "universe" : "heart";
    $("#comparison-count").textContent = `${String(comparisonIndex + 1).padStart(2, "0")} / 09`;
    $("#comparison-progress").style.width = `${((comparisonIndex + 1) / 9) * 100}%`;
    $("#comparison-art").innerHTML = comparisonIllustration(stage.dataset.kind);
    $("#comparison-prev").disabled = comparisonIndex === 0 && loveBeat === 0;
    $("#comparison-restart").textContent = "Phir se dekhna";

    if (isObject) {
      const slide = slides[comparisonIndex];
      $("#comparison-eyebrow").textContent = "DUNIYA KI SABSE BADI CHEEZ...";
      $("#comparison-title").textContent = slide.title;
      $("#comparison-subtitle").textContent = slide.subtitle;
      $("#comparison-aside").textContent = slide.aside;
      $("#comparison-next").classList.remove("is-hidden");
      $("#comparison-next").textContent = "Aur badi? Agla dekho →";
      $("#comparison-reveal").classList.add("is-hidden");
      return;
    }

    if (isTwist) {
      $("#comparison-eyebrow").textContent = "AB ZARA SOCHO...";
      $("#comparison-title").textContent = config.twist;
      $("#comparison-subtitle").textContent = "Itni badi cheez ke baad ab kya bacha?";
      $("#comparison-aside").textContent = "Achha, yeh waala sach mein last hai. Shayad.";
      $("#comparison-next").classList.add("is-hidden");
      $("#comparison-reveal").classList.remove("is-hidden");
      $("#comparison-reveal").textContent = config.revealButton;
      return;
    }

    $("#comparison-next").classList.remove("is-hidden");
    $("#comparison-reveal").classList.add("is-hidden");
    if (loveBeat === 0) {
      $("#comparison-eyebrow").textContent = "BAS EK BAAT...";
      $("#comparison-title").textContent = config.loveLead;
      $("#comparison-subtitle").textContent = "Ab aap socho zara.";
      $("#comparison-aside").textContent = "";
      $("#comparison-next").textContent = "Achha, batao naaa →";
    } else if (loveBeat === 1) {
      $("#comparison-eyebrow").textContent = "ASLI JAWAB YEH HAI";
      $("#comparison-title").textContent = config.loveHeadline;
      $("#comparison-subtitle").textContent = config.loveComparison;
      $("#comparison-aside").textContent = "";
      $("#comparison-next").textContent = "Ek aur baat... →";
    } else if (loveBeat === 2) {
      $("#comparison-eyebrow").textContent = "SIRF AAPKE LIYE";
      $("#comparison-title").textContent = "Kayenat, aapka naam hi universe hai...";
      $("#comparison-subtitle").textContent = config.loveLetter;
      $("#comparison-aside").textContent = "";
      $("#comparison-next").textContent = "Last line, pakka 💙 →";
    } else {
      $("#comparison-eyebrow").textContent = "HAPPY BIRTHDAY";
      $("#comparison-title").textContent = config.birthday;
      $("#comparison-subtitle").textContent = config.promise;
      $("#comparison-aside").textContent = "";
      $("#comparison-next").textContent = "Map par chalein";
    }
  }

  function advanceComparison() {
    if (comparisonIndex < content.comparison.slides.length) {
      comparisonIndex += 1;
    } else if (comparisonIndex === content.comparison.slides.length) {
      comparisonIndex += 1;
      loveBeat = 0;
    } else if (loveBeat < 3) {
      loveBeat += 1;
    } else {
      comparisonDialog.close();
      return;
    }
    renderComparison();
  }

  function rewindComparison() {
    if (comparisonIndex === content.comparison.slides.length + 1 && loveBeat > 0) {
      loveBeat -= 1;
    } else if (comparisonIndex > 0) {
      comparisonIndex -= 1;
      if (comparisonIndex === content.comparison.slides.length) loveBeat = 0;
    }
    renderComparison();
  }

  function restartComparison() {
    comparisonIndex = 0;
    loveBeat = 0;
    renderComparison();
  }

  function escapeHtml(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  $("#enter-button").addEventListener("click", advanceIntro);
  $("#map-home").addEventListener("click", () => { map.classList.add("is-hidden"); map.inert = true; intro.classList.remove("is-hidden"); intro.inert = false; });
  $$(".planet-node").forEach((node) => node.addEventListener("click", () => openChapter(node.dataset.chapter)));
  $("#final-button").addEventListener("click", handleFinalButton);
  $("#dialog-close").addEventListener("click", () => { stopGameTimers(); chapterDialog.close(); });
  chapterDialog.addEventListener("click", (event) => { if (event.target === chapterDialog) { stopGameTimers(); chapterDialog.close(); } });
  $("#comparison-close").addEventListener("click", () => comparisonDialog.close());
  $("#comparison-next").addEventListener("click", advanceComparison);
  $("#comparison-prev").addEventListener("click", rewindComparison);
  $("#comparison-reveal").addEventListener("click", () => { comparisonIndex = content.comparison.slides.length + 1; loveBeat = 0; renderComparison(); });
  $("#comparison-restart").addEventListener("click", restartComparison);
  comparisonDialog.addEventListener("click", (event) => { if (event.target === comparisonDialog) comparisonDialog.close(); });
  $("#reset-progress").addEventListener("click", () => {
    if (!window.confirm("Safar phir se shuru karein? Is device ki saari khojein mit jaayengi.")) return;
    progress = blankProgress(); surpriseStep = 0; saveProgress(); showToast("Nayi kahaani, sirf tumhare liye.");
  });

  setBirthdayNote();
  updateProgressUI();
})();