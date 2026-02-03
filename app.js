import { QUESTIONS } from './questions.js';

const els = {
  homeView: document.getElementById('homeView'),
  quizView: document.getElementById('quizView'),
  allView: document.getElementById('allView'),
  testView: document.getElementById('testView'),
  resultsView: document.getElementById('resultsView'),

  startBtn: document.getElementById('startBtn'),
  allBtn: document.getElementById('allBtn'),
  testBtn: document.getElementById('testBtn'),

  backHomeBtn: document.getElementById('backHomeBtn'),
  homeBtn: document.getElementById('homeBtn'),

  resetBtn: document.getElementById('resetBtn'),
  poolInfo: document.getElementById('poolInfo'),

  questionText: document.getElementById('questionText'),
  answers: document.getElementById('answers'),
  hint: document.getElementById('hint'),

  backBtn: document.getElementById('backBtn'),
  checkBtn: document.getElementById('checkBtn'),
  nextBtn: document.getElementById('nextBtn'),

  allList: document.getElementById('allList'),

  // Test
  testProgress: document.getElementById('testProgress'),
  testQuestionText: document.getElementById('testQuestionText'),
  testAnswers: document.getElementById('testAnswers'),
  testPrevBtn: document.getElementById('testPrevBtn'),
  testNextBtn: document.getElementById('testNextBtn'),
  finishTestBtn: document.getElementById('finishTestBtn'),
  testHomeBtn: document.getElementById('testHomeBtn'),

  // Results
  resultsSummary: document.getElementById('resultsSummary'),
  resultsList: document.getElementById('resultsList'),
  resultsHomeBtn: document.getElementById('resultsHomeBtn'),
  restartTestBtn: document.getElementById('restartTestBtn'),
};

const STORAGE_KEY = 'quiz_pool_v1';

let state = {
  remaining: [],
  currentIndex: null,
  selected: new Set(),
  checked: false,

  history: [],
  pos: -1,

  // Test state
  test: {
    indices: [],        // 20 indeksów pytań w QUESTIONS
    pos: 0,             // 0..19
    answers: [],        // tablica Setów (zaznaczenia użytkownika)
  }
};

function showView(view) {
  els.homeView.classList.toggle('hidden', view !== 'home');
  els.quizView.classList.toggle('hidden', view !== 'quiz');
  els.allView.classList.toggle('hidden', view !== 'all');
  els.testView.classList.toggle('hidden', view !== 'test');
  els.resultsView.classList.toggle('hidden', view !== 'results');
}

function openHome() {
  showView('home');
}

function loadPool() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data.remaining) && data.remaining.length <= QUESTIONS.length) {
        state.remaining = data.remaining.filter(n => Number.isInteger(n) && n >= 0 && n < QUESTIONS.length);
        updatePoolInfo();
        return;
      }
    }
  } catch {}
  resetPool();
}

function savePool() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ remaining: state.remaining }));
}

function resetPool() {
  state.remaining = Array.from({ length: QUESTIONS.length }, (_, i) => i);
  savePool();
  updatePoolInfo();
}

function updatePoolInfo() {
  els.poolInfo.textContent = `Pula: ${state.remaining.length}/${QUESTIONS.length}`;
}

function pickRandomQuestionIndex() {
  if (state.remaining.length === 0) resetPool();

  const r = Math.floor(Math.random() * state.remaining.length);
  const qIndex = state.remaining[r];

  state.remaining[r] = state.remaining[state.remaining.length - 1];
  state.remaining.pop();

  savePool();
  updatePoolInfo();
  return qIndex;
}

function sampleUnique(n) {
  // Równomiernie bez powtórzeń: tasujemy tablicę indeksów i bierzemy pierwsze n
  const arr = Array.from({ length: QUESTIONS.length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(n, arr.length));
}

function letters(n) {
  const base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({ length: n }, (_, i) => base[i] ?? `#${i + 1}`);
}

/* ---------- Random quiz mode (single question) ---------- */

function setNavButtons() {
  const canBack = state.pos > 0;
  els.backBtn.classList.toggle('hidden', !canBack);
  els.backBtn.disabled = !canBack;
}

function renderQuestion(qIndex) {
  const q = QUESTIONS[qIndex];
  state.currentIndex = qIndex;
  state.selected = new Set();
  state.checked = false;

  els.questionText.textContent = q.question;
  els.answers.innerHTML = '';
  els.hint.textContent = '';

  const labs = letters(q.options.length);

  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'answer';
    btn.dataset.i = String(i);

    const badge = document.createElement('div');
    badge.className = 'badge';
    badge.textContent = labs[i];

    const text = document.createElement('div');
    text.className = 'atext';
    text.textContent = opt.text;

    btn.appendChild(badge);
    btn.appendChild(text);

    btn.addEventListener('click', () => toggleSelect(i, 'quiz'));
    els.answers.appendChild(btn);
  });

  els.checkBtn.disabled = false;
  els.nextBtn.disabled = false;
  setNavButtons();
}

function toggleSelect(i, mode) {
  if (mode === 'quiz') {
    if (state.checked) return;
    if (state.selected.has(i)) state.selected.delete(i);
    else state.selected.add(i);

    for (const node of els.answers.querySelectorAll('.answer')) {
      const idx = Number(node.dataset.i);
      node.classList.toggle('selected', state.selected.has(idx));
    }
    return;
  }

  if (mode === 'test') {
    const set = state.test.answers[state.test.pos];
    if (set.has(i)) set.delete(i);
    else set.add(i);

    for (const node of els.testAnswers.querySelectorAll('.answer')) {
      const idx = Number(node.dataset.i);
      node.classList.toggle('selected', set.has(idx));
    }
  }
}

function checkAnswer() {
  if (state.currentIndex === null) return;

  const q = QUESTIONS[state.currentIndex];
  state.checked = true;

  const correctSet = new Set(
    q.options.map((o, i) => (o.isCorrect ? i : -1)).filter(i => i !== -1)
  );

  for (const node of els.answers.querySelectorAll('.answer')) {
    const idx = Number(node.dataset.i);
    node.classList.remove('correct', 'wrong');

    const isCorrect = correctSet.has(idx);
    const isSelected = state.selected.has(idx);

    if (isCorrect) node.classList.add('correct');
    if (isSelected && !isCorrect) node.classList.add('wrong');
  }

  if (correctSet.size === 0) {
    els.hint.textContent = 'ℹ️ W tym pytaniu wszystkie odpowiedzi są błędne (brak poprawnych).';
  } else {
    const ok =
      state.selected.size === correctSet.size &&
      [...state.selected].every(x => correctSet.has(x));
    els.hint.textContent = ok ? '✅ Dobrze!' : '❌ Sprawdź zaznaczenia i poprawne odpowiedzi.';
  }

  els.checkBtn.disabled = true;
}

function nextQuestion() {
  const idx = pickRandomQuestionIndex();

  if (state.pos < state.history.length - 1) {
    state.history = state.history.slice(0, state.pos + 1);
  }

  state.history.push(idx);
  state.pos = state.history.length - 1;

  renderQuestion(idx);
  showView('quiz');
}

function prevQuestion() {
  if (state.pos <= 0) return;
  state.pos -= 1;
  const idx = state.history[state.pos];
  renderQuestion(idx);
  showView('quiz');
}

/* ---------- All questions view ---------- */

function renderAllQuestions() {
  els.allList.innerHTML = '';

  QUESTIONS.forEach((q) => {
    const details = document.createElement('details');
    details.className = 'qitem';

    const summary = document.createElement('summary');
    summary.textContent = q.question;
    details.appendChild(summary);

    const opts = document.createElement('div');
    opts.className = 'qopts';

    const labs = letters(q.options.length);

    q.options.forEach((opt, oi) => {
      const div = document.createElement('div');
      div.className = 'qopt' + (opt.isCorrect ? ' correct' : '');

      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = labs[oi];

      const text = document.createElement('span');
      text.textContent = opt.text;

      div.appendChild(label);
      div.appendChild(text);
      opts.appendChild(div);
    });

    details.appendChild(opts);
    els.allList.appendChild(details);
  });
}

function openAllView() {
  renderAllQuestions();
  showView('all');
}

/* ---------- Test mode (20 questions) ---------- */

function startTest() {
  const indices = sampleUnique(20);
  state.test.indices = indices;
  state.test.pos = 0;
  state.test.answers = indices.map(() => new Set());
  renderTestQuestion();
  showView('test');
}

function renderTestQuestion() {
  const qi = state.test.indices[state.test.pos];
  const q = QUESTIONS[qi];

  els.testProgress.textContent = `Pytanie ${state.test.pos + 1}/20`;
  els.testQuestionText.textContent = q.question;

  els.testAnswers.innerHTML = '';
  const labs = letters(q.options.length);

  const userSet = state.test.answers[state.test.pos];

  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'answer';
    btn.dataset.i = String(i);

    const badge = document.createElement('div');
    badge.className = 'badge';
    badge.textContent = labs[i];

    const text = document.createElement('div');
    text.className = 'atext';
    text.textContent = opt.text;

    btn.appendChild(badge);
    btn.appendChild(text);

    btn.classList.toggle('selected', userSet.has(i));
    btn.addEventListener('click', () => toggleSelect(i, 'test'));

    els.testAnswers.appendChild(btn);
  });

  // nav
  els.testPrevBtn.disabled = state.test.pos === 0;
  els.testNextBtn.disabled = state.test.pos === state.test.indices.length - 1;

  const isLast = state.test.pos === state.test.indices.length - 1;
  els.finishTestBtn.style.display = isLast ? 'inline-block' : 'none';
}

function testPrev() {
  if (state.test.pos === 0) return;
  state.test.pos -= 1;
  renderTestQuestion();
}

function testNext() {
  if (state.test.pos >= state.test.indices.length - 1) return;
  state.test.pos += 1;
  renderTestQuestion();
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

function finishTest() {
  // score
  let correctCount = 0;

  const perQuestion = state.test.indices.map((qi, i) => {
    const q = QUESTIONS[qi];
    const correctSet = new Set(
      q.options.map((o, idx) => (o.isCorrect ? idx : -1)).filter(x => x !== -1)
    );
    const userSet = state.test.answers[i];

    const isCorrect = setsEqual(userSet, correctSet);
    if (isCorrect) correctCount += 1;

    return { q, correctSet, userSet, isCorrect };
  });

  const pct = Math.round((correctCount / state.test.indices.length) * 100);
  els.resultsSummary.textContent = `Poprawne odpowiedzi: ${correctCount}/20 (${pct}%).`;

  // render list (questions + correct + user)
  els.resultsList.innerHTML = '';
  perQuestion.forEach((item, idx) => {
    const details = document.createElement('details');
    details.className = 'qitem';
    details.open = false;

    const summary = document.createElement('summary');
    summary.textContent = `${idx + 1}/20 • ${item.q.question} ${item.isCorrect ? '✅' : '❌'}`;
    details.appendChild(summary);

    const opts = document.createElement('div');
    opts.className = 'qopts';

    const labs = letters(item.q.options.length);

    item.q.options.forEach((opt, oi) => {
      const div = document.createElement('div');
      const isCorrect = item.correctSet.has(oi);
      const isSelected = item.userSet.has(oi);

      div.className = 'qopt' + (isCorrect ? ' correct' : '') + (isSelected && !isCorrect ? ' wrong' : '');

      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = labs[oi];

      const text = document.createElement('span');
      const prefix = isSelected ? 'Twoja: ' : '';
      text.textContent = prefix + opt.text;

      div.appendChild(label);
      div.appendChild(text);
      opts.appendChild(div);
    });

    details.appendChild(opts);
    els.resultsList.appendChild(details);
  });

  showView('results');
}

/* ---------- Events ---------- */

els.startBtn.addEventListener('click', nextQuestion);
els.nextBtn.addEventListener('click', nextQuestion);
els.backBtn.addEventListener('click', prevQuestion);
els.checkBtn.addEventListener('click', checkAnswer);
els.homeBtn.addEventListener('click', openHome);

els.allBtn.addEventListener('click', openAllView);
els.backHomeBtn.addEventListener('click', openHome);

els.testBtn.addEventListener('click', startTest);
els.testPrevBtn.addEventListener('click', testPrev);
els.testNextBtn.addEventListener('click', testNext);
els.finishTestBtn.addEventListener('click', finishTest);
els.testHomeBtn.addEventListener('click', openHome);

els.resultsHomeBtn.addEventListener('click', openHome);
els.restartTestBtn.addEventListener('click', startTest);

els.resetBtn.addEventListener('click', () => {
  resetPool();
});

// Init
loadPool();
updatePoolInfo();
setNavButtons();
showView('home');
