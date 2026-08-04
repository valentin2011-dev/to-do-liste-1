"use strict";
/* ==========================================================================
   V Todo — script.js
   Toute la logique de l'application : état, stockage, rendu, interactions.
   ========================================================================== */
 
/* ---------------------------------------------------------------------- */
/* STOCKAGE / ÉTAT                                                        */
/* ---------------------------------------------------------------------- */
 
const STORAGE_KEYS = {
  tasks: "v_tasks",
  folders: "v_folders",
  theme: "v_theme",
};
 
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn("Erreur de lecture du stockage pour", key, e);
    return fallback;
  }
}
 
function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("Erreur d'écriture du stockage pour", key, e);
  }
}
 
const state = {
  tasks: loadJSON(STORAGE_KEYS.tasks, []),
  folders: loadJSON(STORAGE_KEYS.folders, []),
  theme: loadJSON(STORAGE_KEYS.theme, "red"),
  currentFolder: "all", // "all" | folder id
  currentScreen: "home",
  searchQuery: "",
  calendarCursor: new Date(), // mois affiché
  selectedDay: null, // "YYYY-MM-DD"
  contextTaskId: null, // tâche ciblée par le menu contextuel
};
 
function persistTasks() { saveJSON(STORAGE_KEYS.tasks, state.tasks); }
function persistFolders() { saveJSON(STORAGE_KEYS.folders, state.folders); }
function persistTheme() { saveJSON(STORAGE_KEYS.theme, state.theme); }
 
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
 
/* ---------------------------------------------------------------------- */
/* UTILITAIRES DATE                                                       */
/* ---------------------------------------------------------------------- */
 
const JOURS = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
const MOIS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
 
function todayKey() {
  return dateKey(new Date());
}
function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function formatFullDate(d) {
  return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}
 
/* ---------------------------------------------------------------------- */
/* THÈMES                                                                  */
/* ---------------------------------------------------------------------- */
 
const THEMES = [
  { id: "red",    label: "Rouge",  swatch: "#E11D2E" },
  { id: "blue",   label: "Bleu",   swatch: "#0A84FF" },
  { id: "green",  label: "Vert",   swatch: "#22C55E" },
  { id: "orange", label: "Orange", swatch: "#FF9500" },
  { id: "light",  label: "Clair",  swatch: "#E5E5EA" },
  { id: "dark",   label: "Sombre", swatch: "#1C1C1E" },
];
 
function applyTheme() {
  // "light" et "red" utilisent le même jeu de variables (thème clair, accent rouge).
  const themeAttr = state.theme === "red" ? "light" : state.theme;
  document.documentElement.setAttribute("data-theme", themeAttr);
}
 
/**
 * Couleur utilisée pour l'animation de démarrage.
 * Règle : le mode sombre garde toujours une animation rouge.
 */
function introColorForTheme() {
  if (state.theme === "dark") return "#E11D2E";
  const found = THEMES.find((t) => t.id === state.theme);
  return found ? found.swatch : "#E11D2E";
}
 
/* ---------------------------------------------------------------------- */
/* ANIMATION DE DÉMARRAGE                                                  */
/* ---------------------------------------------------------------------- */
 
function playIntroAnimation(onDone) {
  const intro = document.getElementById("intro");
  const linesContainer = document.getElementById("intro-lines");
  const flash = document.getElementById("intro-flash");
  const logo = document.getElementById("intro-logo");
  const color = introColorForTheme();
 
  intro.style.setProperty("--intro-color", color);
 
  const LINE_COUNT = 40; // "plusieurs dizaines" de lignes de chaque côté
  linesContainer.innerHTML = "";
  const half = LINE_COUNT / 2;
 
  for (let i = 0; i < LINE_COUNT; i++) {
    const line = document.createElement("div");
    line.className = "intro-line";
    // Les lignes convergent : délai décroissant en fonction de la distance au centre.
    const distanceFromCenter = i < half ? half - i : i - half + 1;
    const delay = (half - distanceFromCenter) * 8; // ms — le centre arrive en dernier
    line.style.animationDelay = `${Math.max(0, delay)}ms`;
    linesContainer.appendChild(line);
  }
 
  // Flash + logo quand les dernières lignes centrales apparaissent.
  setTimeout(() => {
    flash.classList.add("flash");
    logo.classList.add("show");
  }, half * 8 + 120);
 
  // Disparition du logo.
  setTimeout(() => {
    logo.classList.remove("show");
    logo.classList.add("hide");
  }, 1900);
 
  // Fondu de sortie de l'écran d'intro.
  setTimeout(() => {
    intro.classList.add("hide");
  }, 2200);
 
  setTimeout(() => {
    intro.setAttribute("hidden", "");
    onDone();
  }, 2700);
}
 
/* ---------------------------------------------------------------------- */
/* TÂCHES — CRÉATION / MODIFICATION                                        */
/* ---------------------------------------------------------------------- */
 
function createTask({ title, date = null, time = null, folder = null }) {
  const task = {
    id: uid(),
    title: title.trim(),
    done: false,
    priority: "normal", // normal | important | urgent
    date, // "YYYY-MM-DD" ou null
    time, // "HH:MM" ou null
    folder, // id de dossier ou null
    createdAt: Date.now(),
    completedAt: null,
  };
  state.tasks.unshift(task);
  persistTasks();
  return task;
}
 
function deleteTask(id) {
  state.tasks = state.tasks.filter((t) => t.id !== id);
  persistTasks();
}
 
function toggleTaskDone(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;
  task.done = !task.done;
  task.completedAt = task.done ? Date.now() : null;
  persistTasks();
}
 
function setTaskPriority(id, priority) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;
  task.priority = priority;
  persistTasks();
}
 
function setTaskDate(id, date, time) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;
  task.date = date || null;
  task.time = time || null;
  persistTasks();
}
 
/* ---------------------------------------------------------------------- */
/* DOSSIERS                                                                */
/* ---------------------------------------------------------------------- */
 
function createFolder(name) {
  const folder = { id: uid(), name: name.trim() };
  state.folders.push(folder);
  persistFolders();
  return folder;
}
 
/* ---------------------------------------------------------------------- */
/* RENDU — EN-TÊTE ACCUEIL (date + compteur)                               */
/* ---------------------------------------------------------------------- */
 
function renderHomeHeader() {
  const now = new Date();
  document.getElementById("date-day").textContent = JOURS[now.getDay()];
  document.getElementById("date-full").textContent = formatFullDate(now);
 
  const remaining = state.tasks.filter((t) => !t.done).length;
  const counterEl = document.getElementById("task-counter");
  const numberEl = document.getElementById("counter-number");
  const labelEl = document.getElementById("counter-label");
 
  numberEl.textContent = remaining;
  labelEl.textContent = remaining <= 1 ? "tâche restante" : "tâches restantes";
 
  let color = "var(--accent)";
  let soft = "var(--accent-soft)";
  if (remaining > 5) { color = "#FF3B30"; soft = "rgba(255,59,48,0.16)"; }
  else if (remaining >= 2) { color = "#22C55E"; soft = "rgba(34,197,94,0.16)"; }
  else if (remaining === 1) { color = "#0A84FF"; soft = "rgba(10,132,255,0.16)"; }
 
  counterEl.style.setProperty("--counter-color", color);
  counterEl.style.setProperty("--counter-color-soft", soft);
 
  // Petite pulsation pour signaler le changement.
  numberEl.style.animation = "none";
  void numberEl.offsetWidth; // reflow pour relancer l'animation
  numberEl.style.animation = "";
}
 
/* ---------------------------------------------------------------------- */
/* RENDU — DOSSIERS                                                        */
/* ---------------------------------------------------------------------- */
 
function renderFolders() {
  const list = document.getElementById("folders-list");
  const currentLabel = document.getElementById("folder-current-label");
  list.innerHTML = "";
 
  const allPill = document.createElement("button");
  allPill.className = "folder-pill" + (state.currentFolder === "all" ? " active" : "");
  allPill.textContent = "Tous";
  allPill.addEventListener("click", () => { state.currentFolder = "all"; renderAll(); });
  list.appendChild(allPill);
 
  state.folders.forEach((folder) => {
    const pill = document.createElement("button");
    pill.className = "folder-pill" + (state.currentFolder === folder.id ? " active" : "");
    pill.textContent = folder.name;
    pill.addEventListener("click", () => { state.currentFolder = folder.id; renderAll(); });
    list.appendChild(pill);
  });
 
  const activeFolder = state.folders.find((f) => f.id === state.currentFolder);
  currentLabel.textContent = activeFolder ? activeFolder.name : "Tous";
}
 
/* ---------------------------------------------------------------------- */
/* RENDU — LISTE DE TÂCHES (accueil)                                       */
/* ---------------------------------------------------------------------- */
 
function filteredTasks() {
  let list = state.tasks.filter((t) => !t.done);
 
  if (state.currentFolder !== "all") {
    list = list.filter((t) => t.folder === state.currentFolder);
  }
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.trim().toLowerCase();
    list = list.filter((t) => t.title.toLowerCase().includes(q));
  }
  return list;
}
 
function taskCardHTML(task) {
  const folder = state.folders.find((f) => f.id === task.folder);
  const metaParts = [];
  if (task.date) {
    const d = new Date(task.date + "T00:00:00");
    metaParts.push(`<span>${d.getDate()} ${MOIS[d.getMonth()].slice(0,3)}${task.time ? " · " + task.time : ""}</span>`);
  }
  if (folder) metaParts.push(`<span class="task-folder-tag">${escapeHTML(folder.name)}</span>`);
 
  return `
    <button class="task-check" data-action="toggle" aria-label="Terminer">
      <svg viewBox="0 0 24 24" width="14" height="14"><path fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
    </button>
    <span class="priority-dot dot-${task.priority}"></span>
    <div class="task-body">
      <p class="task-title">${escapeHTML(task.title)}</p>
      ${metaParts.length ? `<div class="task-meta">${metaParts.join("")}</div>` : ""}
    </div>
  `;
}
 
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
 
let longPressTimer = null;
let longPressTriggered = false;
 
function renderTaskList() {
  const container = document.getElementById("task-list");
  const emptyState = document.getElementById("empty-state");
  const tasks = filteredTasks();
 
  container.innerHTML = "";
  emptyState.hidden = tasks.length > 0;
 
  tasks.forEach((task) => {
    const card = document.createElement("div");
    card.className = "task-card";
    card.dataset.id = task.id;
    card.draggable = true;
    card.innerHTML = taskCardHTML(task);
    container.appendChild(card);
 
    // Toggle terminé.
    card.querySelector('[data-action="toggle"]').addEventListener("click", (e) => {
      e.stopPropagation();
      card.classList.add("done");
      toggleTaskDone(task.id);
      setTimeout(() => { renderAll(); }, 220);
    });
 
    attachLongPress(card, task.id);
    attachDragAndDrop(card);
  });
}
 
function attachLongPress(el, taskId) {
  const start = (e) => {
    longPressTriggered = false;
    longPressTimer = setTimeout(() => {
      longPressTriggered = true;
      if (navigator.vibrate) navigator.vibrate(12);
      openContextMenu(taskId);
    }, 480);
  };
  const cancel = () => { clearTimeout(longPressTimer); };
 
  el.addEventListener("touchstart", start, { passive: true });
  el.addEventListener("touchend", cancel);
  el.addEventListener("touchmove", cancel);
  el.addEventListener("mousedown", start);
  el.addEventListener("mouseup", cancel);
  el.addEventListener("mouseleave", cancel);
}
 
/* ---------- Glisser-déposer (réordonnancement simple) ---------- */
function attachDragAndDrop(card) {
  card.addEventListener("dragstart", () => card.classList.add("dragging"));
  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
    // On reconstruit l'ordre des tâches selon l'ordre visuel actuel.
    const ids = [...document.querySelectorAll("#task-list .task-card")].map((c) => c.dataset.id);
    state.tasks.sort((a, b) => {
      const ia = ids.indexOf(a.id), ib = ids.indexOf(b.id);
      if (ia === -1 || ib === -1) return 0;
      return ia - ib;
    });
    persistTasks();
  });
}
document.addEventListener("dragover", (e) => {
  const list = document.getElementById("task-list");
  if (!list.contains(e.target) && e.target.id !== "task-list") return;
  e.preventDefault();
  const dragging = document.querySelector(".task-card.dragging");
  if (!dragging) return;
  const afterEl = getDragAfterElement(list, e.clientY);
  if (afterEl == null) list.appendChild(dragging);
  else list.insertBefore(dragging, afterEl);
});
 
function getDragAfterElement(container, y) {
  const els = [...container.querySelectorAll(".task-card:not(.dragging)")];
  return els.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}
 
/* ---------------------------------------------------------------------- */
/* MENU CONTEXTUEL (appui long sur une tâche)                              */
/* ---------------------------------------------------------------------- */
 
function openContextMenu(taskId) {
  state.contextTaskId = taskId;
  document.getElementById("context-overlay").hidden = false;
}
function closeContextMenu() {
  document.getElementById("context-overlay").hidden = true;
  state.contextTaskId = null;
}
 
function handleContextAction(action) {
  const id = state.contextTaskId;
  if (!id) return;
 
  if (action === "normal" || action === "important" || action === "urgent") {
    setTaskPriority(id, action);
    closeContextMenu();
    renderAll();
    showToast("Priorité mise à jour");
  } else if (action === "delete") {
    const card = document.querySelector(`.task-card[data-id="${id}"]`);
    closeContextMenu();
    if (card) {
      card.classList.add("removing");
      setTimeout(() => { deleteTask(id); renderAll(); }, 260);
    } else {
      deleteTask(id);
      renderAll();
    }
    showToast("Tâche supprimée");
  } else if (action === "calendar") {
    closeContextMenu();
    const task = state.tasks.find((t) => t.id === id);
    openDateModal(task);
  }
}
 
/* ---------------------------------------------------------------------- */
/* MODALES GÉNÉRIQUES                                                      */
/* ---------------------------------------------------------------------- */
 
function openModal({ title, bodyHTML, onConfirm, confirmLabel = "Valider" }) {
  const overlay = document.getElementById("modal-overlay");
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-body").innerHTML = bodyHTML;
  document.getElementById("modal-confirm").textContent = confirmLabel;
  overlay.hidden = false;
 
  const confirmBtn = document.getElementById("modal-confirm");
  const cancelBtn = document.getElementById("modal-cancel");
 
  const cleanup = () => {
    overlay.hidden = true;
    confirmBtn.replaceWith(confirmBtn.cloneNode(true));
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));
  };
 
  document.getElementById("modal-confirm").addEventListener("click", () => {
    const result = onConfirm();
    if (result !== false) cleanup();
  });
  document.getElementById("modal-cancel").addEventListener("click", cleanup);
}
 
function openDateModal(task) {
  openModal({
    title: "Ajouter au calendrier",
    bodyHTML: `
      <input type="date" id="modal-date" value="${task.date || todayKey()}" />
      <input type="time" id="modal-time" value="${task.time || ""}" />
    `,
    confirmLabel: "Ajouter",
    onConfirm: () => {
      const date = document.getElementById("modal-date").value;
      const time = document.getElementById("modal-time").value;
      setTaskDate(task.id, date, time);
      renderAll();
      showToast("Ajoutée au calendrier");
      // Proposition d'ajout au calendrier natif (téléchargement d'un fichier .ics).
      offerNativeCalendarExport(task, date, time);
    },
  });
}
 
function openFolderModal() {
  openModal({
    title: "Nouveau dossier",
    bodyHTML: `<input type="text" id="modal-folder-name" placeholder="Nom du dossier" maxlength="30" />`,
    confirmLabel: "Créer",
    onConfirm: () => {
      const input = document.getElementById("modal-folder-name");
      const name = input.value.trim();
      if (!name) return false; // reste ouvert si vide
      createFolder(name);
      renderAll();
      showToast("Dossier créé");
    },
  });
  setTimeout(() => document.getElementById("modal-folder-name")?.focus(), 50);
}
 
/**
 * Le web n'a pas d'accès direct à l'app Calendrier d'iPhone : on propose donc
 * un fichier .ics téléchargeable, que Safari/iOS peut ouvrir pour créer
 * l'événement dans l'app Calendrier native.
 */
function offerNativeCalendarExport(task, date, time) {
  if (!date) return;
  const dt = time ? `${date.replace(/-/g, "")}T${time.replace(":", "")}00` : `${date.replace(/-/g, "")}`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `SUMMARY:${task.title}`,
    time ? `DTSTART:${dt}` : `DTSTART;VALUE=DATE:${dt}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\n");
 
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${task.title.slice(0, 30) || "tache"}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
 
/* ---------------------------------------------------------------------- */
/* CALENDRIER                                                              */
/* ---------------------------------------------------------------------- */
 
function tasksByDate(dateStr) {
  return state.tasks.filter((t) => t.date === dateStr);
}
 
function renderCalendar() {
  const cursor = state.calendarCursor;
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
 
  document.getElementById("cal-month-label").textContent = `${MOIS[month]} ${year}`;
 
  const grid = document.getElementById("cal-grid");
  grid.innerHTML = "";
 
  const firstOfMonth = new Date(year, month, 1);
  // Lundi = début de semaine : on décale getDay() (0=dimanche) vers 0=lundi.
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
 
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
 
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    let cellDate, outside = false;
 
    if (dayNum < 1) {
      cellDate = new Date(year, month - 1, daysInPrevMonth + dayNum);
      outside = true;
    } else if (dayNum > daysInMonth) {
      cellDate = new Date(year, month + 1, dayNum - daysInMonth);
      outside = true;
    } else {
      cellDate = new Date(year, month, dayNum);
    }
 
    const key = dateKey(cellDate);
    const cell = document.createElement("button");
    cell.className = "cal-day";
    if (outside) cell.classList.add("outside");
    if (key === todayKey()) cell.classList.add("today");
    if (key === state.selectedDay) cell.classList.add("selected");
 
    const hasTasks = tasksByDate(key).length > 0;
    cell.innerHTML = `<span>${cellDate.getDate()}</span>${hasTasks ? '<span class="dot-has"></span>' : ""}`;
 
    cell.addEventListener("click", () => {
      state.selectedDay = key;
      renderCalendar();
      openDayPanel(key);
    });
 
    grid.appendChild(cell);
  }
}
 
function openDayPanel(key) {
  const panel = document.getElementById("day-panel");
  const d = new Date(key + "T00:00:00");
  document.getElementById("day-panel-title").textContent = `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
 
  const tasksContainer = document.getElementById("day-panel-tasks");
  const tasks = tasksByDate(key);
  tasksContainer.innerHTML = tasks.length
    ? ""
    : `<p class="empty-state small">Aucune tâche ce jour-là.</p>`;
 
  tasks.forEach((task) => {
    const card = document.createElement("div");
    card.className = "task-card" + (task.done ? " done" : "");
    card.innerHTML = taskCardHTML(task);
    card.querySelector('[data-action="toggle"]').addEventListener("click", () => {
      toggleTaskDone(task.id);
      renderAll();
      openDayPanel(key);
    });
    attachLongPress(card, task.id);
    tasksContainer.appendChild(card);
  });
 
  panel.hidden = false;
}
 
document.getElementById("day-panel-close").addEventListener("click", () => {
  document.getElementById("day-panel").hidden = true;
  state.selectedDay = null;
  renderCalendar();
});
 
document.getElementById("day-panel-add").addEventListener("click", () => {
  if (!state.selectedDay) return;
  openModal({
    title: "Nouvelle tâche",
    bodyHTML: `
      <input type="text" id="modal-task-title" placeholder="Titre de la tâche" maxlength="140" />
      <input type="time" id="modal-task-time" />
    `,
    confirmLabel: "Ajouter",
    onConfirm: () => {
      const title = document.getElementById("modal-task-title").value.trim();
      if (!title) return false;
      const time = document.getElementById("modal-task-time").value;
      createTask({ title, date: state.selectedDay, time: time || null });
      renderAll();
      openDayPanel(state.selectedDay);
      showToast("Tâche ajoutée");
    },
  });
  setTimeout(() => document.getElementById("modal-task-title")?.focus(), 50);
});
 
document.getElementById("cal-prev").addEventListener("click", () => {
  state.calendarCursor = new Date(state.calendarCursor.getFullYear(), state.calendarCursor.getMonth() - 1, 1);
  renderCalendar();
});
document.getElementById("cal-next").addEventListener("click", () => {
  state.calendarCursor = new Date(state.calendarCursor.getFullYear(), state.calendarCursor.getMonth() + 1, 1);
  renderCalendar();
});
 
/* ---------------------------------------------------------------------- */
/* RÉGLAGES                                                                 */
/* ---------------------------------------------------------------------- */
 
function renderThemeGrid() {
  const grid = document.getElementById("theme-grid");
  grid.innerHTML = "";
  THEMES.forEach((theme) => {
    const btn = document.createElement("button");
    btn.className = "theme-option" + (state.theme === theme.id ? " active" : "");
    btn.innerHTML = `<span class="theme-swatch" style="background:${theme.swatch}"></span>${theme.label}`;
    btn.addEventListener("click", () => {
      state.theme = theme.id;
      persistTheme();
      applyTheme();
      renderThemeGrid();
      showToast(`Thème "${theme.label}" activé`);
    });
    grid.appendChild(btn);
  });
}
 
function renderHistory() {
  const list = document.getElementById("history-list");
  const emptyEl = document.getElementById("history-empty");
  const done = state.tasks.filter((t) => t.done).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
 
  list.innerHTML = "";
  emptyEl.hidden = done.length > 0;
 
  done.forEach((task) => {
    const item = document.createElement("div");
    item.className = "history-item";
    const d = task.completedAt ? new Date(task.completedAt) : null;
    const dateStr = d ? `${d.getDate()} ${MOIS[d.getMonth()].slice(0,3)} · ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}` : "";
    item.innerHTML = `
      <div>
        <p class="h-title">${escapeHTML(task.title)}</p>
        <p class="h-date">${dateStr}</p>
      </div>
      <button class="icon-btn" data-restore="${task.id}" aria-label="Restaurer">↺</button>
    `;
    item.querySelector("[data-restore]").addEventListener("click", () => {
      toggleTaskDone(task.id);
      renderAll();
      showToast("Tâche restaurée");
    });
    list.appendChild(item);
  });
}
 
document.getElementById("clear-history-btn").addEventListener("click", () => {
  openModal({
    title: "Supprimer l'historique",
    bodyHTML: `<p class="muted">Toutes les tâches terminées seront définitivement supprimées.</p>`,
    confirmLabel: "Supprimer",
    onConfirm: () => {
      state.tasks = state.tasks.filter((t) => !t.done);
      persistTasks();
      renderAll();
      showToast("Historique supprimé");
    },
  });
});
 
/* ---------------------------------------------------------------------- */
/* NAVIGATION ENTRE ÉCRANS                                                 */
/* ---------------------------------------------------------------------- */
 
function switchScreen(target) {
  state.currentScreen = target;
  document.querySelectorAll(".screen").forEach((el) => {
    el.hidden = el.dataset.screen !== target;
  });
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.target === target);
  });
  if (target === "calendar") renderCalendar();
  if (target === "settings") { renderThemeGrid(); renderHistory(); }
}
 
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchScreen(btn.dataset.target));
});
 
/* ---------------------------------------------------------------------- */
/* TOAST                                                                    */
/* ---------------------------------------------------------------------- */
 
let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 1800);
}
 
/* ---------------------------------------------------------------------- */
/* ÉVÉNEMENTS GÉNÉRAUX (accueil)                                           */
/* ---------------------------------------------------------------------- */
 
document.getElementById("add-task-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("new-task-input");
  const title = input.value.trim();
  if (!title) return;
  const folder = state.currentFolder !== "all" ? state.currentFolder : null;
  createTask({ title, folder });
  input.value = "";
  renderAll();
});
 
document.getElementById("search-toggle").addEventListener("click", () => {
  const bar = document.getElementById("search-bar");
  bar.hidden = !bar.hidden;
  if (!bar.hidden) document.getElementById("search-input").focus();
  else { state.searchQuery = ""; document.getElementById("search-input").value = ""; renderTaskList(); }
});
document.getElementById("search-input").addEventListener("input", (e) => {
  state.searchQuery = e.target.value;
  renderTaskList();
});
 
document.getElementById("folders-toggle").addEventListener("click", () => {
  const panel = document.getElementById("folders-panel");
  panel.hidden = !panel.hidden;
});
document.getElementById("add-folder-btn").addEventListener("click", openFolderModal);
 
/* Menu contextuel : fermeture + actions */
document.getElementById("context-overlay").addEventListener("click", (e) => {
  if (e.target.id === "context-overlay") closeContextMenu();
});
document.querySelectorAll(".ctx-item").forEach((btn) => {
  btn.addEventListener("click", () => handleContextAction(btn.dataset.action));
});
 
/* Empêche le menu contextuel navigateur natif sur appui long */
document.addEventListener("contextmenu", (e) => {
  if (e.target.closest(".task-card") || e.target.closest(".cal-day")) e.preventDefault();
});
 
/* ---------------------------------------------------------------------- */
/* RENDU GLOBAL                                                            */
/* ---------------------------------------------------------------------- */
 
function renderAll() {
  renderHomeHeader();
  renderFolders();
  renderTaskList();
  if (state.currentScreen === "calendar") renderCalendar();
  if (state.currentScreen === "settings") { renderThemeGrid(); renderHistory(); }
}
 
/* ---------------------------------------------------------------------- */
/* INITIALISATION                                                          */
/* ---------------------------------------------------------------------- */
 
function init() {
  applyTheme();
 
  playIntroAnimation(() => {
    document.getElementById("app").hidden = false;
    switchScreen("home");
    renderAll();
  });
 
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch((err) => {
        console.warn("Échec de l'enregistrement du service worker :", err);
      });
    });
  }
}
 
document.addEventListener("DOMContentLoaded", init);
 
