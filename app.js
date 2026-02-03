import { QUESTIONS } from './questions.js';

const els = {
  homeView: document.getElementById('homeView'),
  quizView: document.getElementById('quizView'),
  allView: document.getElementById('allView'),

  startBtn: document.getElementById('startBtn'),
  allBtn: document.getElementById('allBtn'),
  backHomeBtn: document.getElementById('backHomeBtn'),

  resetBtn: document.getElementById('resetBtn'),
  poolInfo: document.getElementById('poolInfo'),

  questionText: document.getElementById('questionText'),
  answers: document.getElementById('answers'),
  hint: document.getElementById('hint'),

  backBtn: document.getElementById('backBtn'),
  checkBtn: document.getElementById('checkBtn'),
  nextBtn: document.getElementById('nextBtn'),

  allList: document.getElementById('allList'),
};

const STORAGE_KEY = 'quiz_pool_v1';

let state = {
  remaining: [],        // indeksy pytań, które jeszcze nie padły w puli
  currentIndex: null,   // index w QUESTIONS (aktualnie wyświetlany)
  selected: new Set(),
  checked: false,

  history: [],          // historia wyświetlonych pytań (indeksy w QUESTIONS)
  pos: -1,              // pozycja w historii (0..history.length-1)
};

function showView(view) {
  els.homeView.classList.toggle('hidden', view !== 'home');
  els.quizView.classList.toggle('hidden', view !== 'quiz');
  els.allView.classList.toggle('hidden', view !== 'all');
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

  // losowanie z równym prawdopodobieństwem bez powtórzeń:
  const r = Math.floor(Math.random() * state.remaining.length);
  const qIndex = state.remaining[r];

  // usuń wylosowany element przez swap+pop (O(1))
  state.remaining[r] = state.remaining[state.remaining.length - 1];
  state.remaining.pop();

  savePool();
  updatePoolInfo();
  return qIndex;
}

function letters(n) {
  const base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({ length: n }, (_, i) => base[i] ?? `#${i + 1}`);
}

function setNavButtons() {
  // przycisk „Poprzednie” tylko gdy nie jesteśmy na pierwszym pytaniu historii
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

    btn.addEventListener('click', () => toggleSelect(i));
    els.answers.appendChild(btn);
  });

  els.checkBtn.disabled = false;
  els.nextBtn.disabled = false;
  setNavButtons();
}

function toggleSelect(i) {
  if (state.checked) return;

  if (state.selected.has(i)) state.selected.delete(i);
  else state.selected.add(i);

  for (const node of els.answers.querySelectorAll('.answer')) {
    const idx = Number(node.dataset.i);
    node.classList.toggle('selected', state.selected.has(idx));
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
    els.hint.textContent =
      'Uwaga: to pytanie w pliku nie ma żadnej odpowiedzi oznaczonej jako poprawna (pogrubieniem).';
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

  // jeżeli byliśmy „wstecz” w historii, to ucinamy „przyszłość”
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

function renderAllQuestions() {
  els.allList.innerHTML = '';

  QUESTIONS.forEach((q, qi) => {
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

function openHome() {
  showView('home');
}

// Events
els.startBtn.addEventListener('click', nextQuestion);
els.nextBtn.addEventListener('click', nextQuestion);
els.backBtn.addEventListener('click', prevQuestion);
els.checkBtn.addEventListener('click', checkAnswer);

els.allBtn.addEventListener('click', openAllView);
els.backHomeBtn.addEventListener('click', openHome);

els.resetBtn.addEventListener('click', () => {
  resetPool();
});

// Init
loadPool();
updatePoolInfo();
setNavButtons();
