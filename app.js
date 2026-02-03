import { QUESTIONS as QUESTIONS_PST } from './questions.js';
import { QUESTIONS as QUESTIONS_PPSA } from './questions_ppsa.js';

const els = {
  // Views
  selectView: document.getElementById('selectView'),
  homeView: document.getElementById('homeView'),
  quizView: document.getElementById('quizView'),
  allView: document.getElementById('allView'),
  testView: document.getElementById('testView'),
  resultsView: document.getElementById('resultsView'),

  // Topbar
  brandTitle: document.getElementById('brandTitle'),
  subjectPill: document.getElementById('subjectPill'),
  poolInfo: document.getElementById('poolInfo'),
  resetBtn: document.getElementById('resetBtn'),

  // Subject select
  choosePstBtn: document.getElementById('choosePstBtn'),
  choosePpsaBtn: document.getElementById('choosePpsaBtn'),

  // Home
  startBtn: document.getElementById('startBtn'),
  allBtn: document.getElementById('allBtn'),
  testBtn: document.getElementById('testBtn'),
  changeSubjectBtn: document.getElementById('changeSubjectBtn'),

  // Quiz
  questionText: document.getElementById('questionText'),
  answers: document.getElementById('answers'),
  hint: document.getElementById('hint'),
  checkBtn: document.getElementById('checkBtn'),
  nextBtn: document.getElementById('nextBtn'),
  quizHomeBtn: document.getElementById('quizHomeBtn'),

  // All
  allList: document.getElementById('allList'),
  allHomeBtn: document.getElementById('allHomeBtn'),

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

const SUBJECT_KEY = 'quiz_subject_v1';

const SUBJECTS = {
  pst: {
    name: 'Prawo samorządu terytorialnego',
    questions: QUESTIONS_PST,
  },
  ppsa: {
    name: 'Prawo o postępowaniu przed sądami administracyjnymi',
    questions: QUESTIONS_PPSA,
  }
};

let state = {
  subject: null, // 'pst' | 'ppsa'
  remaining: [],

  // quiz
  currentIndex: null,
  selected: new Set(),
  checked: false,

  // test
  test: {
    indices: [],
    pos: 0,
    answers: [], // Array<Set<number>>
  },
};

function on(el, evt, fn) {
  if (!el) return;
  el.addEventListener(evt, fn);
}

function showView(view) {
  els.selectView.classList.toggle('hidden', view !== 'select');
  els.homeView.classList.toggle('hidden', view !== 'home');
  els.quizView.classList.toggle('hidden', view !== 'quiz');
  els.allView.classList.toggle('hidden', view !== 'all');
  els.testView.classList.toggle('hidden', view !== 'test');
  els.resultsView.classList.toggle('hidden', view !== 'results');
}

function getActiveQuestions() {
  if (!state.subject) return [];
  return SUBJECTS[state.subject].questions;
}

function storageKeyForPool() {
  return `quiz_pool_v1_${state.subject}`;
}

function setTopbarVisibility(enabled) {
  els.subjectPill.style.display = enabled ? 'inline-block' : 'none';
  els.poolInfo.style.display = enabled ? 'inline-block' : 'none';
  els.resetBtn.style.display = enabled ? 'inline-block' : 'none';
}

function applySubjectUI() {
  const s = SUBJECTS[state.subject];
  els.brandTitle.textContent = s.name;
  document.title = s.name;
  els.subjectPill.textContent = s.name;
  setTopbarVisibility(true);
}

function loadSubject() {
  const saved = localStorage.getItem(SUBJECT_KEY);
  if (saved && SUBJECTS[saved]) {
    state.subject = saved;
    applySubjectUI();
    loadPool();
    updatePoolInfo();
    showView('home');
  } else {
    setTopbarVisibility(false);
    els.brandTitle.textContent = 'Prawo – quiz';
    document.title = 'Prawo – quiz';
    showView('select');
  }
}

function chooseSubject(subj) {
  state.subject = subj;
  localStorage.setItem(SUBJECT_KEY, subj);
  applySubjectUI();
  loadPool();
  updatePoolInfo();
  showView('home');
}

function changeSubject() {
  state.subject = null;
  localStorage.removeItem(SUBJECT_KEY);
  state.remaining = [];
  setTopbarVisibility(false);
  els.brandTitle.textContent = 'Prawo – quiz';
  document.title = 'Prawo – quiz';
  showView('select');
}

/* ---------- Pool ---------- */

function loadPool() {
  const QUESTIONS = getActiveQuestions();
  if (!QUESTIONS.length) return;

  const key = storageKeyForPool();
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data.remaining) && data.remaining.length <= QUESTIONS.length) {
        state.remaining = data.remaining.filter(n => Number.isInteger(n) && n >= 0 && n < QUESTIONS.length);
        if (state.remaining.length === 0) resetPool();
        return;
      }
    }
  } catch {}
  resetPool();
}

function savePool() {
  const key = storageKeyForPool();
  localStorage.setItem(key, JSON.stringify({ remaining: state.remaining }));
}

function resetPool() {
  const QUESTIONS = getActiveQuestions();
  state.remaining = Array.from({ length: QUESTIONS.length }, (_, i) => i);
  savePool();
  updatePoolInfo();
}

function updatePoolInfo() {
  const QUESTIONS = getActiveQuestions();
  if (!QUESTIONS.length) return;
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

/* ---------- Helpers ---------- */

function letters(n) {
  const base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({ length: n }, (_, i) => base[i] ?? `#${i + 1}`);
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

function sampleUnique(n) {
  const QUESTIONS = getActiveQuestions();
  const arr = Array.from({ length: QUESTIONS.length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(n, arr.length));
}

function openHome() {
  showView('home');
}

/* ---------- Random quiz ---------- */

function renderQuizQuestion(qIndex) {
  const QUESTIONS = getActiveQuestions();
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

    btn.addEventListener('click', () => {
      if (state.checked) return;
      if (state.selected.has(i)) state.selected.delete(i);
      else state.selected.add(i);

      for (const node of els.answers.querySelectorAll('.answer')) {
        const idx = Number(node.dataset.i);
        node.classList.toggle('selected', state.selected.has(idx));
      }
    });

    els.answers.appendChild(btn);
  });

  els.checkBtn.disabled = false;
}

function nextQuizQuestion() {
  const idx = pickRandomQuestionIndex();
  renderQuizQuestion(idx);
  showView('quiz');
}

function checkQuizAnswer() {
  const QUESTIONS = getActiveQuestions();
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
    const ok = setsEqual(state.selected, correctSet);
    els.hint.textContent = ok ? '✅ Dobrze!' : '❌ Sprawdź zaznaczenia i poprawne odpowiedzi.';
  }

  els.checkBtn.disabled = true;
}

/* ---------- All questions ---------- */

function renderAllQuestions() {
  const QUESTIONS = getActiveQuestions();
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

function openAll() {
  renderAllQuestions();
  showView('all');
}

/* ---------- Test ---------- */

function startTest() {
  const indices = sampleUnique(20);
  state.test.indices = indices;
  state.test.pos = 0;
  state.test.answers = indices.map(() => new Set());
  renderTestQuestion();
  showView('test');
}

function renderTestQuestion() {
  const QUESTIONS = getActiveQuestions();
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
    btn.addEventListener('click', () => {
      if (userSet.has(i)) userSet.delete(i);
      else userSet.add(i);

      for (const node of els.testAnswers.querySelectorAll('.answer')) {
        const idx = Number(node.dataset.i);
        node.classList.toggle('selected', userSet.has(idx));
      }
    });

    els.testAnswers.appendChild(btn);
  });

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

function finishTest() {
  const QUESTIONS = getActiveQuestions();
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

  els.resultsList.innerHTML = '';
  perQuestion.forEach((item, idx) => {
    const details = document.createElement('details');
    details.className = 'qitem';

    const summary = document.createElement('summary');
    summary.textContent = `${idx + 1}/20 • ${item.q.question} ${item.isCorrect ? '✅' : '❌'}`;
    details.appendChild(summary);

    const opts = document.createElement('div');
    opts.className = 'qopts';
    const labs = letters(item.q.options.length);

    item.q.options.forEach((opt, oi) => {
      const isCorrect = item.correctSet.has(oi);
      const isSelected = item.userSet.has(oi);

      const div = document.createElement('div');
      div.className = 'qopt' + (isCorrect ? ' correct' : '') + (isSelected && !isCorrect ? ' wrong' : '');

      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = labs[oi];

      const text = document.createElement('span');
      text.textContent = (isSelected ? 'Twoja: ' : '') + opt.text;

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

on(els.choosePstBtn, 'click', () => chooseSubject('pst'));
on(els.choosePpsaBtn, 'click', () => chooseSubject('ppsa'));
on(els.changeSubjectBtn, 'click', changeSubject);

on(els.resetBtn, 'click', resetPool);

on(els.startBtn, 'click', nextQuizQuestion);
on(els.nextBtn, 'click', nextQuizQuestion);
on(els.checkBtn, 'click', checkQuizAnswer);
on(els.quizHomeBtn, 'click', openHome);

on(els.allBtn, 'click', openAll);
on(els.allHomeBtn, 'click', openHome);

on(els.testBtn, 'click', startTest);
on(els.testPrevBtn, 'click', testPrev);
on(els.testNextBtn, 'click', testNext);
on(els.finishTestBtn, 'click', finishTest);
on(els.testHomeBtn, 'click', openHome);

on(els.resultsHomeBtn, 'click', openHome);
on(els.restartTestBtn, 'click', startTest);

window.addEventListener('DOMContentLoaded', () => {
  loadSubject();
});
