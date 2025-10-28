// ===== Song Bingo Config =====
const ROWS = 3;
const COLS = 4;
const CARD_COUNT = 500;
const SONGS = (window.SONGS || []).filter(Boolean);

if (SONGS.length < ROWS * COLS) {
  alert(`You need at least ${ROWS * COLS} unique songs. Currently ${SONGS.length}.`);
}

const randInt = (n) => Math.floor(Math.random() * n);
function sampleUnique(arr, k) {
  const copy = arr.slice();
  for (let i = 0; i < k; i++) {
    const j = i + randInt(copy.length - i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, k);
}
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length/n) }, (_, i) => arr.slice(i*n, i*n+n));
const flatten = (m) => m.flat();

function makeCard() {
  const picks = sampleUnique(SONGS, ROWS * COLS);
  for (let i = picks.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [picks[i], picks[j]] = [picks[j], picks[i]];
  }
  return chunk(picks, COLS);
}
function generateUniqueCards(count) {
  const seen = new Set();
  const cards = [];
  while (cards.length < count) {
    const card = makeCard();
    const key = flatten(card).join('|');
    if (!seen.has(key)) {
      seen.add(key);
      cards.push(card);
    }
  }
  return cards;
}

const cards = generateUniqueCards(CARD_COUNT);
let currentIndex = 0;

const params = new URLSearchParams(location.search);
if (params.has("card")) {
  const n = parseInt(params.get("card"), 10);
  if (!Number.isNaN(n) && n >= 0 && n < CARD_COUNT) currentIndex = n;
}

function storageKey(i) {
  return `song-bingo-${ROWS}x${COLS}-card${i}`;
}
function loadMarks(i) {
  try { return new Set(JSON.parse(localStorage.getItem(storageKey(i))) || []); }
  catch { return new Set(); }
}
function saveMarks(i, s) {
  localStorage.setItem(storageKey(i), JSON.stringify([...s]));
}

const boardEl = document.getElementById("board");
const labelEl = document.getElementById("cardLabel");

function renderCard(i) {
  const card = cards[i];
  const marks = loadMarks(i);
  boardEl.innerHTML = "";
  labelEl.textContent = `Card ${i + 1} / ${CARD_COUNT}`;

  flatten(card).forEach((song, idx) => {
    const cell = document.createElement("button");
    cell.className = "cell";
    cell.innerHTML = `<span class="song">${escapeHtml(song)}</span>`;
    if (marks.has(idx)) cell.classList.add("marked");
    cell.addEventListener("click", () => {
      if (cell.classList.toggle("marked")) marks.add(idx);
      else marks.delete(idx);
      saveMarks(i, marks);
    });
    boardEl.appendChild(cell);
  });

  const url = new URL(location.href);
  url.searchParams.set("card", i.toString());
  history.replaceState({}, "", url);
}
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function goTo(i) {
  currentIndex = (i + CARD_COUNT) % CARD_COUNT;
  renderCard(currentIndex);
}

document.getElementById("prevBtn").onclick = () => goTo(currentIndex - 1);
document.getElementById("nextBtn").onclick = () => goTo(currentIndex + 1);
document.getElementById("randomBtn").onclick = () => goTo(randInt(CARD_COUNT));
document.getElementById("resetBtn").onclick = () => {
  localStorage.removeItem(storageKey(currentIndex));
  renderCard(currentIndex);
};
document.getElementById("shareBtn").onclick = async () => {
  const url = new URL(location.href);
  url.searchParams.set("card", currentIndex.toString());
  const shareUrl = url.toString();
  try {
    if (navigator.share) await navigator.share({ title: "Song Bingo Card", url: shareUrl });
    else {
      await navigator.clipboard.writeText(shareUrl);
      alert("Link copied!");
    }
  } catch {
    prompt("Copy this URL:", shareUrl);
  }
};

renderCard(currentIndex);
