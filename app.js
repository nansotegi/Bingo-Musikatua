// Config
const ROWS = 3;
const COLS = 4;
const MAX_NUM = 31;
const CARD_COUNT = 500;

// --- Utility: RNG + helpers
const randInt = (n) => Math.floor(Math.random() * n);

function sampleUnique(rangeMax, k) {
  // Returns k distinct ints from 1..rangeMax
  if (k > rangeMax) throw new Error("k cannot exceed range");
  const pool = Array.from({ length: rangeMax }, (_, i) => i + 1);
  // Fisher–Yates partial shuffle
  for (let i = 0; i < k; i++) {
    const j = i + randInt(pool.length - i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, k);
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function flatten(matrix) {
  return matrix.flat();
}

// --- Card generation
function makeCard() {
  const picks = sampleUnique(MAX_NUM, ROWS * COLS);
  // Optional shuffle for more layout variety
  for (let i = picks.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [picks[i], picks[j]] = [picks[j], picks[i]];
  }
  return chunk(picks, COLS);
}

function generateUniqueCards(count = CARD_COUNT) {
  const seen = new Set();
  const cards = [];
  while (cards.length < count) {
    const m = makeCard();
    const key = flatten(m).join(",");
    if (!seen.has(key)) {
      seen.add(key);
      cards.push(m);
    }
  }
  return cards;
}

// --- State
const cards = generateUniqueCards(CARD_COUNT);
let currentIndex = 0; // 0..CARD_COUNT-1

// URL param support: ?card=0..29
const params = new URLSearchParams(location.search);
if (params.has("card")) {
  const idx = parseInt(params.get("card"), 10);
  if (!Number.isNaN(idx) && idx >= 0 && idx < CARD_COUNT) currentIndex = idx;
}

// Persist marks per (card index) in localStorage
function storageKeyForCard(idx) {
  return `bingo-marks-${ROWS}x${COLS}-max${MAX_NUM}-card${idx}`;
}
function loadMarks(idx) {
  try {
    const raw = localStorage.getItem(storageKeyForCard(idx));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}
function saveMarks(idx, set) {
  try {
    localStorage.setItem(storageKeyForCard(idx), JSON.stringify([...set]));
  } catch {}
}

// --- Rendering
const boardEl = document.getElementById("board");
const labelEl = document.getElementById("cardLabel");

function renderCard(idx) {
  const card = cards[idx];
  const marks = loadMarks(idx);
  boardEl.innerHTML = "";
  labelEl.textContent = `Card ${idx + 1} / ${CARD_COUNT}`;

  flatten(card).forEach((num, i) => {
    const cell = document.createElement("button");
    cell.className = "cell";
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-label", `Number ${num}`);
    cell.textContent = num;

    if (marks.has(i)) cell.classList.add("marked");

    cell.addEventListener("click", () => {
      if (cell.classList.toggle("marked")) marks.add(i);
      else marks.delete(i);
      saveMarks(idx, marks);
    });

    boardEl.appendChild(cell);
  });

  // Keep query param synced for easy sharing
  const url = new URL(location.href);
  url.searchParams.set("card", idx.toString());
  history.replaceState({}, "", url);
}

function goTo(idx) {
  currentIndex = (idx + CARD_COUNT) % CARD_COUNT;
  renderCard(currentIndex);
}

// --- Controls
document.getElementById("prevBtn").addEventListener("click", () => goTo(currentIndex - 1));
document.getElementById("nextBtn").addEventListener("click", () => goTo(currentIndex + 1));
document.getElementById("randomBtn").addEventListener("click", () => goTo(randInt(CARD_COUNT)));

document.getElementById("resetBtn").addEventListener("click", () => {
  localStorage.removeItem(storageKeyForCard(currentIndex));
  renderCard(currentIndex);
});

document.getElementById("shareBtn").addEventListener("click", async () => {
  const url = new URL(location.href);
  url.searchParams.set("card", currentIndex.toString());
  const shareUrl = url.toString();

  try {
    if (navigator.share) {
      await navigator.share({ title: "Bingo Card", url: shareUrl });
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert("Link copied to clipboard!");
    }
  } catch {
    // Fallback if permissions fail
    prompt("Copy this URL:", shareUrl);
  }
});

// Initial render
renderCard(currentIndex);
