async function loadJSON(path) {
  const res = await fetch(path);
  return res.json();
}

let topics, questions, persons, selected, selfInfo;
let editingHistoryIndex = null;

const groupSelect = document.getElementById("groupSelect");
const nameSearch = document.getElementById("nameSearch");
const personSelect = document.getElementById("personSelect");
const topicSelect = document.getElementById("topicSelect");
const memoArea = document.getElementById("memo");

/* ===== localStorage ===== */
const getAsked = () => JSON.parse(localStorage.getItem("askedQuestions") || "{}");
const saveAsked = d => localStorage.setItem("askedQuestions", JSON.stringify(d));
const getHistory = () => JSON.parse(localStorage.getItem("history") || "[]");
const saveHistory = h => localStorage.setItem("history", JSON.stringify(h));

/* ===== メモ ===== */
memoArea.addEventListener("input", () => {
  if (editingHistoryIndex !== null) {
    const h = getHistory();
    h[editingHistoryIndex].memo = memoArea.value;
    saveHistory(h);
    updateHistoryView();
  }
});

/* ===== 表示補助 ===== */
function formatAsList(text) {
  if (!text) return "情報なし";
  const items = text.split(/,|\n/).map(s => s.trim()).filter(Boolean);
  return "<ul>" + items.map(i => `<li>${i}</li>`).join("") + "</ul>";
}

/* ===== UI ===== */
function updatePersonSelect() {
  const g = groupSelect.value;
  const k = nameSearch.value.toLowerCase();
  personSelect.innerHTML = `<option value="">相手を選択</option>`;

  persons
    .filter(p => (!g || p.group.includes(g)) && (!k || p.name.toLowerCase().includes(k)))
    .forEach(p => {
      personSelect.innerHTML += `<option value="${p.id}">${p.name}（${p.group}）</option>`;
    });

  updateView();
}

function getNextQuestion(pid, tid) {
  if (!pid || !tid) return "相手と話題を選んでください";
  const all = questions[tid] || [];
  const asked = getAsked()[pid]?.[tid] || [];
  return all.find(q => !asked.includes(q)) || "この話題は聞ききりました 👍";
}

/* ===== 履歴 ===== */
function updateHistoryView() {
  const ul = document.getElementById("historyList");
  ul.innerHTML = "";

  getHistory().slice().reverse().forEach((h, i, arr) => {
    const index = arr.length - 1 - i;

    ul.innerHTML += `
      <li class="history-item" data-index="${index}">
        <div class="history-content">
          <div class="history-header">
            <strong>${h.person}</strong>
            <span class="topic-tag">${h.topic}</span>
            <span class="star-btn" data-index="${index}">
              ${h.star ? "⭐" : "☆"}
            </span>
          </div>
          <div class="history-question">${h.question}</div>
          ${h.memo ? `<div class="history-memo">📝 ${h.memo}</div>` : ""}
        </div>
        <button class="delete-btn" data-index="${index}">🗑</button>
      </li>
    `;
  });

  document.querySelectorAll(".history-item").forEach(li => {
    li.onclick = e => {
      if (e.target.classList.contains("delete-btn") ||
          e.target.classList.contains("star-btn")) return;
      editingHistoryIndex = Number(li.dataset.index);
      memoArea.value = getHistory()[editingHistoryIndex].memo || "";
    };
  });

  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const h = getHistory();
      h.splice(btn.dataset.index, 1);
      saveHistory(h);
      memoArea.value = "";
      editingHistoryIndex = null;
      updateHistoryView();
    };
  });

  document.querySelectorAll(".star-btn").forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const h = getHistory();
      const idx = btn.dataset.index;
      h[idx].star = !h[idx].star;
      saveHistory(h);
      updateHistoryView();
    };
  });
}

/* ===== 画面更新 ===== */
function updateView() {
  const pId = personSelect.value;
  const tId = topicSelect.value;

  document.getElementById("questionList").innerHTML =
    (questions[tId] || []).map(q => `<li>${q}</li>`).join("");

  document.getElementById("personInfo").innerHTML =
    formatAsList(selected[pId]?.[tId]);
  document.getElementById("selfInfo").innerHTML =
    formatAsList(selfInfo[tId]);

  document.getElementById("nextQuestion").textContent =
    getNextQuestion(pId, tId);

  updateHistoryView();
}

/* ===== ボタン ===== */
document.getElementById("askedBtn").onclick = () => {
  const pId = personSelect.value;
  const tId = topicSelect.value;
  const q = document.getElementById("nextQuestion").textContent;
  if (!pId || !tId || q.includes("聞ききりました")) return;

  const asked = getAsked();
  asked[pId] ??= {};
  asked[pId][tId] ??= [];
  asked[pId][tId].push(q);
  saveAsked(asked);

  const history = getHistory();
  history.push({
    personId: pId,
    person: persons.find(p => p.id === pId).name,
    topicId: tId,
    topic: topics.find(t => t.id === tId).name,
    question: q,
    memo: memoArea.value,
    star: false
  });
  saveHistory(history);

  memoArea.value = "";
  editingHistoryIndex = null;
  updateView();
};

document.getElementById("passBtn").onclick = () => {
  const pId = personSelect.value;
  const tId = topicSelect.value;
  if (!pId || !tId) return;

  const asked = getAsked();
  asked[pId] ??= {};
  asked[pId][tId] ??= [];
  asked[pId][tId].push(document.getElementById("nextQuestion").textContent);
  saveAsked(asked);

  updateView();
};

/* ===== 完全ランダム ===== */
document.getElementById("randomBtn").onclick = () => {
  const pId = personSelect.value;
  if (!pId) return alert("相手を選んでください");

  const asked = getAsked()[pId] || {};
  const pool = [];

  topics.forEach(t => {
    (questions[t.id] || []).forEach(q => {
      if (!(asked[t.id]?.includes(q))) {
        pool.push({ topic: t, question: q });
      }
    });
  });

  if (!pool.length) {
    document.getElementById("nextQuestion").textContent =
      "すべての質問を聞ききりました 🎉";
    return;
  }

  const r = pool[Math.floor(Math.random() * pool.length)];
  topicSelect.value = r.topic.id;

  document.getElementById("nextQuestion").textContent =
    `【${r.topic.name}】${r.question}`;

  document.getElementById("questionList").innerHTML =
    (questions[r.topic.id] || []).map(q => `<li>${q}</li>`).join("");

  document.getElementById("personInfo").innerHTML =
    formatAsList(selected[pId]?.[r.topic.id]);
  document.getElementById("selfInfo").innerHTML =
    formatAsList(selfInfo[r.topic.id]);
};

document.getElementById("resetHistoryBtn").onclick = () => {
  if (!confirm("履歴をすべて削除しますか？")) return;
  localStorage.clear();
  memoArea.value = "";
  editingHistoryIndex = null;
  updateView();
};

/* ===== 初期化 ===== */
async function init() {
  topics = await loadJSON("data/topics.json");
  questions = await loadJSON("data/questions.json");
  persons = await loadJSON("data/persons.json");
  selected = await loadJSON("data/selected.json");
  selfInfo = await loadJSON("data/self.json");

  topics.forEach(t => {
    topicSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
  });

  groupSelect.onchange = updatePersonSelect;
  nameSearch.oninput = updatePersonSelect;
  personSelect.onchange = updateView;
  topicSelect.onchange = updateView;

  updatePersonSelect();
}

init();
