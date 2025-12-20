// ===== Song Bingo (LOCKED random card on first open) =====
const ROWS = 4;
const COLS = 3;
const CARD_COUNT = 30;

const SONGS = (window.SONGS || []).filter(Boolean);
if (SONGS.length < ROWS * COLS) {
  alert(`You need at least ${ROWS * COLS} songs in songs.js (got ${SONGS.length}).`);
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
const chunk = (arr, n) =>
  Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
const flatten = (m) => m.flat();

function makeCard() {
  const picks = sampleUnique(SONGS, ROWS * COLS);
  // Shuffle layout
  for (let i = picks.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [picks[i], picks[j]] = [picks[j], picks[i]];
  }
  return chunk(picks, COLS);
}

function generateUniqueCards(count) {
  const seen = new Set();
  const out = [];
  while (out.length < count) {
    const card = makeCard();
    const key = flatten(card).join("|");
    if (!seen.has(key)) {
      seen.add(key);
      out.push(card);
    }
  }
  return out;
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

// Build the 30 unique cards once per page load
const cards = generateUniqueCards(CARD_COUNT);

// ---- LOCKED selection ----
// On FIRST open on a device/browser -> pick random card and store it.
// On subsequent opens -> keep same card.
// If you ever want to force a new one: add ?new=1 to the URL.
const LOCK_KEY = `song-bingo-lock-${ROWS}x${COLS}-cards${CARD_COUNT}`;

const url = new URL(location.href);
const forceNew = url.searchParams.get("new") === "1";

let lockedIndex = null;
if (!forceNew) {
  const saved = localStorage.getItem(LOCK_KEY);
  if (saved !== null) lockedIndex = parseInt(saved, 10);
}

if (lockedIndex === null || Number.isNaN(lockedIndex) || lockedIndex < 0 || lockedIndex >= CARD_COUNT) {
  lockedIndex = randInt(CARD_COUNT);
  localStorage.setItem(LOCK_KEY, String(lockedIndex));
}

// Keep URL pinned to their card, but ignore manual edits in code (no UI to change)
url.searchParams.set("card", String(lockedIndex));
url.searchParams.delete("new");
history.replaceState({}, "", url);

// Persist marks per locked card
function storageKeyForCard(idx) {
  return `song-bingo-marks-${ROWS}x${COLS}-card${idx}`;
}
function loadMarks(idx) {
  try {
    return new Set(JSON.parse(localStorage.getItem(storageKeyForCard(idx))) || []);
  } catch {
    return new Set();
  }
}
function saveMarks(idx, set) {
  try {
    localStorage.setItem(storageKeyForCard(idx), JSON.stringify([...set]));
  } catch {}
}

// ---- Render ----
const boardEl = document.getElementById("board");
const labelEl = document.getElementById("cardLabel");

function renderLockedCard() {
  const card = cards[lockedIndex];
  const marks = loadMarks(lockedIndex);

  boardEl.innerHTML = "";
  labelEl.textContent = "Your card";

  flatten(card).forEach((song, i) => {
    const cell = document.createElement("button");
    cell.className = "cell";
    cell.title = song;
    cell.innerHTML = `<span class="song">${escapeHtml(song)}</span>`;

    if (marks.has(i)) cell.classList.add("marked");

    cell.addEventListener("click", () => {
      if (cell.classList.toggle("marked")) marks.add(i);
      else marks.delete(i);
      saveMarks(lockedIndex, marks);
    });

    boardEl.appendChild(cell);
  });
}

document.getElementById("resetBtn").addEventListener("click", () => {
  localStorage.removeItem(storageKeyForCard(lockedIndex));
  renderLockedCard();
});

document.getElementById("shareBtn").addEventListener("click", async () => {
  const shareUrl = new URL(location.href);
  shareUrl.searchParams.set("card", String(lockedIndex)); // same for display
  const finalUrl = shareUrl.toString();

  try {
    if (navigator.share) {
      await navigator.share({ title: "Song Bingo Card", url: finalUrl });
    } else {
      await navigator.clipboard.writeText(finalUrl);
      alert("Link copied!");
    }
  } catch {
    prompt("Copy this URL:", finalUrl);
  }
});

renderLockedCard();
