const STORAGE_KEY = "privateChecklist.tasks.v3";
const OLD_KEYS = ["joshsChecklist.tasks.v1"];
const SETTINGS_KEY = "privateChecklist.settings.v3";

const defaultSettings = {
  title: "Private Checklist",
  theme: "midnight"
};

let tasks = loadTasks();
let settings = loadSettings();
let deferredPrompt = null;

const $ = (selector) => document.querySelector(selector);

const els = {
  appTitle: $("#appTitleText"),
  installBtn: $("#installBtn"),
  settingsBtn: $("#settingsBtn"),

  form: $("#taskForm"),
  title: $("#taskTitle"),
  notes: $("#taskNotes"),
  category: $("#taskCategory"),
  priority: $("#taskPriority"),
  due: $("#taskDue"),
  time: $("#taskTime"),
  repeat: $("#taskRepeat"),
  tags: $("#taskTags"),
  subtasks: $("#taskSubtasks"),
  pinned: $("#taskPinned"),
  important: $("#taskImportant"),
  addToday: $("#addTodayBtn"),

  openCount: $("#openCount"),
  doneCount: $("#doneCount"),
  todayCount: $("#todayCount"),
  overdueCount: $("#overdueCount"),
  progressLabel: $("#progressLabel"),
  progressSubLabel: $("#progressSubLabel"),
  progressBar: $("#progressBar"),

  search: $("#searchInput"),
  status: $("#filterStatus"),
  categoryFilter: $("#filterCategory"),
  sortMode: $("#sortMode"),
  categoryOptions: $("#categoryOptions"),
  visibleCountLabel: $("#visibleCountLabel"),

  list: $("#taskList"),
  empty: $("#emptyState"),

  clearDone: $("#clearDoneBtn"),
  resetRecurring: $("#resetRecurringBtn"),
  exportBtn: $("#exportBtn"),
  importInput: $("#importInput"),
  shareBtn: $("#shareBtn"),

  editDialog: $("#editDialog"),
  editForm: $("#editForm"),
  editId: $("#editId"),
  editTitle: $("#editTitle"),
  editNotes: $("#editNotes"),
  editCategory: $("#editCategory"),
  editPriority: $("#editPriority"),
  editDue: $("#editDue"),
  editTime: $("#editTime"),
  editRepeat: $("#editRepeat"),
  editTags: $("#editTags"),
  editSubtasks: $("#editSubtasks"),
  editPinned: $("#editPinned"),
  editImportant: $("#editImportant"),
  cancelEdit: $("#cancelEditBtn"),
  deleteFromEdit: $("#deleteFromEditBtn"),

  settingsDialog: $("#settingsDialog"),
  settingsForm: $("#settingsForm"),
  settingTitle: $("#settingTitle"),
  settingTheme: $("#settingTheme"),
  cancelSettings: $("#cancelSettingsBtn"),
  wipeData: $("#wipeDataBtn"),

  toast: $("#toast")
};

applySettings();
render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(console.error);
  });
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  els.installBtn.classList.remove("hidden");
});

els.installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  els.installBtn.classList.add("hidden");
});

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  addTask({ forceToday: false });
});

els.addToday.addEventListener("click", () => {
  if (!els.title.value.trim()) {
    els.title.focus();
    showToast("Type a task first.");
    return;
  }
  addTask({ forceToday: true });
});

els.search.addEventListener("input", render);
els.status.addEventListener("change", render);
els.categoryFilter.addEventListener("change", render);
els.sortMode.addEventListener("change", render);

els.clearDone.addEventListener("click", () => {
  const completed = tasks.filter(t => t.done).length;
  if (!completed) {
    showToast("No completed tasks to clear.");
    return;
  }
  if (!confirm(`Clear ${completed} completed task(s)?`)) return;

  tasks = tasks.filter(t => !t.done);
  saveTasks();
  render();
  showToast("Completed tasks cleared.");
});

els.resetRecurring.addEventListener("click", () => {
  const recurring = tasks.filter(t => t.repeat && t.repeat !== "none");
  if (!recurring.length) {
    showToast("No repeating tasks yet.");
    return;
  }

  tasks = tasks.map(task => {
    if (!task.repeat || task.repeat === "none") return task;
    return {
      ...task,
      done: false,
      completedAt: null,
      subtasks: (task.subtasks || []).map(st => ({ ...st, done: false }))
    };
  });

  saveTasks();
  render();
  showToast("Repeating tasks reset.");
});

els.exportBtn.addEventListener("click", exportBackup);
els.importInput.addEventListener("change", importBackup);
els.shareBtn.addEventListener("click", shareChecklistText);

els.editForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const id = els.editId.value;

  tasks = tasks.map(task => {
    if (task.id !== id) return task;

    return normalizeTask({
      ...task,
      title: els.editTitle.value.trim(),
      notes: els.editNotes.value.trim(),
      category: cleanCategory(els.editCategory.value),
      priority: els.editPriority.value,
      due: els.editDue.value,
      time: els.editTime.value,
      repeat: els.editRepeat.value,
      tags: parseTags(els.editTags.value),
      subtasks: mergeSubtasks(task.subtasks || [], parseSubtaskLines(els.editSubtasks.value)),
      pinned: els.editPinned.checked,
      important: els.editImportant.checked
    });
  });

  saveTasks();
  els.editDialog.close();
  render();
  showToast("Task updated.");
});

els.cancelEdit.addEventListener("click", () => els.editDialog.close());

els.deleteFromEdit.addEventListener("click", () => {
  const task = tasks.find(t => t.id === els.editId.value);
  if (!task) return;
  if (!confirm(`Delete "${task.title}"?`)) return;

  tasks = tasks.filter(t => t.id !== task.id);
  saveTasks();
  els.editDialog.close();
  render();
  showToast("Task deleted.");
});

els.settingsBtn.addEventListener("click", () => {
  els.settingTitle.value = settings.title;
  els.settingTheme.value = settings.theme;
  els.settingsDialog.showModal();
});

els.cancelSettings.addEventListener("click", () => els.settingsDialog.close());

els.settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();

  settings = {
    title: els.settingTitle.value.trim() || "Private Checklist",
    theme: els.settingTheme.value
  };

  saveSettings();
  applySettings();
  els.settingsDialog.close();
  showToast("Settings saved.");
});

els.wipeData.addEventListener("click", () => {
  if (!confirm("Delete all tasks and settings on this device/browser? This cannot be undone.")) return;

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SETTINGS_KEY);
  for (const key of OLD_KEYS) localStorage.removeItem(key);

  tasks = [];
  settings = { ...defaultSettings };
  saveTasks();
  saveSettings();
  applySettings();
  els.settingsDialog.close();
  render();
  showToast("All local app data wiped.");
});

function addTask({ forceToday }) {
  const title = els.title.value.trim();
  if (!title) return;

  const task = normalizeTask({
    id: makeId(),
    title,
    notes: els.notes.value.trim(),
    category: cleanCategory(els.category.value),
    priority: els.priority.value,
    due: forceToday ? todayIso() : els.due.value,
    time: els.time.value,
    repeat: els.repeat.value,
    tags: parseTags(els.tags.value),
    subtasks: parseSubtaskLines(els.subtasks.value).map(text => ({ id: makeId(), text, done: false })),
    pinned: els.pinned.checked,
    important: els.important.checked,
    done: false,
    createdAt: new Date().toISOString(),
    completedAt: null
  });

  tasks.unshift(task);
  saveTasks();
  els.form.reset();
  els.category.value = "General";
  els.priority.value = "normal";
  els.repeat.value = "none";
  render();
  showToast("Task added.");
}

function loadTasks() {
  const current = localStorage.getItem(STORAGE_KEY);
  if (current) {
    try {
      return JSON.parse(current).map(normalizeTask);
    } catch {
      return [];
    }
  }

  for (const oldKey of OLD_KEYS) {
    const old = localStorage.getItem(oldKey);
    if (!old) continue;

    try {
      const migrated = JSON.parse(old).map(task => normalizeTask({
        ...task,
        repeat: task.repeatsDaily ? "daily" : "none",
        time: "",
        tags: [],
        subtasks: [],
        pinned: false,
        important: false
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    } catch {
      return [];
    }
  }

  return [];
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadSettings() {
  try {
    return { ...defaultSettings, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}) };
  } catch {
    return { ...defaultSettings };
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function applySettings() {
  document.body.classList.remove("theme-forest", "theme-purple", "theme-plain");
  if (settings.theme !== "midnight") document.body.classList.add(`theme-${settings.theme}`);
  els.appTitle.textContent = settings.title;
  document.title = settings.title;
}

function normalizeTask(task) {
  return {
    id: task.id || makeId(),
    title: String(task.title || "").trim(),
    notes: String(task.notes || "").trim(),
    category: cleanCategory(task.category || "General"),
    priority: ["low", "normal", "high", "urgent"].includes(task.priority) ? task.priority : "normal",
    due: task.due || "",
    time: task.time || "",
    repeat: ["none", "daily", "weekly", "monthly"].includes(task.repeat) ? task.repeat : "none",
    tags: Array.isArray(task.tags) ? task.tags : parseTags(task.tags || ""),
    subtasks: Array.isArray(task.subtasks) ? task.subtasks.map(st => ({
      id: st.id || makeId(),
      text: String(st.text || "").trim(),
      done: Boolean(st.done)
    })).filter(st => st.text) : [],
    pinned: Boolean(task.pinned),
    important: Boolean(task.important),
    done: Boolean(task.done),
    createdAt: task.createdAt || new Date().toISOString(),
    completedAt: task.completedAt || null
  };
}

function render() {
  updateCategoryOptions();
  updateStats();

  const visible = getVisibleTasks();
  els.list.innerHTML = "";
  els.visibleCountLabel.textContent = `${visible.length} visible ${visible.length === 1 ? "task" : "tasks"}`;

  if (!visible.length) {
    els.empty.classList.remove("hidden");
    return;
  }

  els.empty.classList.add("hidden");

  for (const task of visible) {
    els.list.appendChild(renderTask(task));
  }
}

function renderTask(task) {
  const card = document.createElement("article");
  card.className = `task-card ${task.done ? "done" : ""} ${task.pinned ? "pinned" : ""}`;

  const complete = document.createElement("button");
  complete.type = "button";
  complete.className = `complete-btn ${task.done ? "checked" : ""}`;
  complete.textContent = task.done ? "✓" : "";
  complete.setAttribute("aria-label", task.done ? "Mark task open" : "Mark task complete");
  complete.addEventListener("click", () => toggleTask(task.id));

  const main = document.createElement("div");
  main.className = "task-main";

  const top = document.createElement("div");
  top.className = "task-topline";

  const title = document.createElement("h3");
  title.className = "task-title";
  title.textContent = task.title;

  const quick = document.createElement("div");
  quick.className = "task-actions";

  const doneBtn = document.createElement("button");
  doneBtn.type = "button";
  doneBtn.className = "icon-btn";
  doneBtn.textContent = task.done ? "Reopen" : "Done";
  doneBtn.addEventListener("click", () => toggleTask(task.id));

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "icon-btn";
  editBtn.textContent = "Edit";
  editBtn.addEventListener("click", () => openEdit(task.id));

  quick.append(doneBtn, editBtn);
  top.append(title, quick);
  main.appendChild(top);

  if (task.notes) {
    const notes = document.createElement("p");
    notes.className = "task-notes";
    notes.textContent = task.notes;
    main.appendChild(notes);
  }

  const badges = document.createElement("div");
  badges.className = "badges";

  badges.appendChild(makeBadge(task.category));
  badges.appendChild(makeBadge(task.priority, task.priority));

  if (task.important) badges.appendChild(makeBadge("Important", "urgent"));
  if (task.pinned) badges.appendChild(makeBadge("Pinned"));
  if (task.repeat !== "none") badges.appendChild(makeBadge(repeatLabel(task.repeat)));

  if (task.due) {
    badges.appendChild(makeBadge(dueLabel(task), isOverdue(task) ? "overdue" : ""));
  }

  for (const tag of task.tags || []) {
    badges.appendChild(makeBadge(`#${tag}`));
  }

  main.appendChild(badges);

  if (task.subtasks && task.subtasks.length) {
    const wrap = document.createElement("div");
    wrap.className = "subtask-wrap";

    for (const subtask of task.subtasks) {
      const row = document.createElement("label");
      row.className = `subtask-item ${subtask.done ? "done" : ""}`;

      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = subtask.done;
      input.addEventListener("change", () => toggleSubtask(task.id, subtask.id));

      const span = document.createElement("span");
      span.textContent = subtask.text;

      row.append(input, span);
      wrap.appendChild(row);
    }

    main.appendChild(wrap);
  }

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const pinBtn = document.createElement("button");
  pinBtn.type = "button";
  pinBtn.className = "icon-btn";
  pinBtn.textContent = task.pinned ? "Unpin" : "Pin";
  pinBtn.addEventListener("click", () => toggleField(task.id, "pinned"));

  const importantBtn = document.createElement("button");
  importantBtn.type = "button";
  importantBtn.className = "icon-btn";
  importantBtn.textContent = task.important ? "Unmark" : "Important";
  importantBtn.addEventListener("click", () => toggleField(task.id, "important"));

  const snoozeBtn = document.createElement("button");
  snoozeBtn.type = "button";
  snoozeBtn.className = "icon-btn";
  snoozeBtn.textContent = "+1 day";
  snoozeBtn.addEventListener("click", () => snoozeTask(task.id));

  const duplicateBtn = document.createElement("button");
  duplicateBtn.type = "button";
  duplicateBtn.className = "icon-btn";
  duplicateBtn.textContent = "Copy";
  duplicateBtn.addEventListener("click", () => duplicateTask(task.id));

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "icon-btn delete";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", () => deleteTask(task.id));

  actions.append(pinBtn, importantBtn, snoozeBtn, duplicateBtn, deleteBtn);
  main.appendChild(actions);

  card.append(complete, main);
  return card;
}

function getVisibleTasks() {
  const query = els.search.value.trim().toLowerCase();
  const status = els.status.value;
  const category = els.categoryFilter.value;

  return tasks
    .filter(task => {
      const haystack = [
        task.title,
        task.notes,
        task.category,
        task.priority,
        ...(task.tags || []),
        ...(task.subtasks || []).map(st => st.text)
      ].join(" ").toLowerCase();

      const textMatch = !query || haystack.includes(query);
      const categoryMatch = category === "all" || task.category === category;

      const statusMatch =
        status === "everything" ||
        (status === "all" && !task.done) ||
        (status === "today" && task.due === todayIso() && !task.done) ||
        (status === "overdue" && isOverdue(task)) ||
        (status === "important" && task.important && !task.done) ||
        (status === "pinned" && task.pinned && !task.done) ||
        (status === "recurring" && task.repeat !== "none") ||
        (status === "done" && task.done);

      return textMatch && categoryMatch && statusMatch;
    })
    .sort(compareTasks);
}

function compareTasks(a, b) {
  if (a.done !== b.done) return a.done ? 1 : -1;
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

  const mode = els.sortMode.value;
  const priorityScore = { urgent: 0, high: 1, normal: 2, low: 3 };

  if (mode === "priority" || mode === "smart") {
    const p = priorityScore[a.priority] - priorityScore[b.priority];
    if (p !== 0) return p;
  }

  if (mode === "due" || mode === "smart") {
    const ad = a.due || "9999-12-31";
    const bd = b.due || "9999-12-31";
    if (ad !== bd) return ad.localeCompare(bd);
    if ((a.time || "") !== (b.time || "")) return (a.time || "99:99").localeCompare(b.time || "99:99");
  }

  if (mode === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
  if (mode === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
  if (mode === "az") return a.title.localeCompare(b.title);

  return new Date(b.createdAt) - new Date(a.createdAt);
}

function updateStats() {
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  const open = tasks.filter(t => !t.done).length;
  const today = tasks.filter(t => t.due === todayIso() && !t.done).length;
  const overdue = tasks.filter(isOverdue).length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  els.doneCount.textContent = done;
  els.openCount.textContent = open;
  els.todayCount.textContent = today;
  els.overdueCount.textContent = overdue;
  els.progressLabel.textContent = `${percent}% complete`;
  els.progressSubLabel.textContent = total ? `${done} of ${total} tasks finished` : "No tasks yet";
  els.progressBar.style.width = `${percent}%`;
}

function updateCategoryOptions() {
  const categories = [...new Set(tasks.map(t => t.category).filter(Boolean))].sort();

  els.categoryOptions.innerHTML = "";
  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category;
    els.categoryOptions.appendChild(option);
  }

  const current = els.categoryFilter.value;
  els.categoryFilter.innerHTML = `<option value="all">All lists</option>`;
  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    els.categoryFilter.appendChild(option);
  }

  if ([...els.categoryFilter.options].some(option => option.value === current)) {
    els.categoryFilter.value = current;
  }
}

function toggleTask(id) {
  tasks = tasks.map(task => {
    if (task.id !== id) return task;
    const done = !task.done;

    return {
      ...task,
      done,
      completedAt: done ? new Date().toISOString() : null,
      subtasks: done ? (task.subtasks || []).map(st => ({ ...st, done: true })) : task.subtasks
    };
  });

  saveTasks();
  render();
}

function toggleSubtask(taskId, subtaskId) {
  tasks = tasks.map(task => {
    if (task.id !== taskId) return task;

    const subtasks = (task.subtasks || []).map(st => st.id === subtaskId ? { ...st, done: !st.done } : st);
    const allDone = subtasks.length > 0 && subtasks.every(st => st.done);

    return {
      ...task,
      subtasks,
      done: allDone ? true : task.done,
      completedAt: allDone ? new Date().toISOString() : task.completedAt
    };
  });

  saveTasks();
  render();
}

function toggleField(id, field) {
  tasks = tasks.map(task => task.id === id ? { ...task, [field]: !task[field] } : task);
  saveTasks();
  render();
}

function snoozeTask(id) {
  tasks = tasks.map(task => {
    if (task.id !== id) return task;

    const base = task.due ? parseLocalDate(task.due) : new Date();
    base.setDate(base.getDate() + 1);

    return { ...task, due: toIsoDate(base) };
  });

  saveTasks();
  render();
  showToast("Moved due date forward 1 day.");
}

function duplicateTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  const copy = normalizeTask({
    ...task,
    id: makeId(),
    title: `${task.title} copy`,
    done: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
    subtasks: (task.subtasks || []).map(st => ({ ...st, id: makeId(), done: false }))
  });

  tasks.unshift(copy);
  saveTasks();
  render();
  showToast("Task copied.");
}

function deleteTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  if (!confirm(`Delete "${task.title}"?`)) return;

  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  render();
  showToast("Task deleted.");
}

function openEdit(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  els.editId.value = task.id;
  els.editTitle.value = task.title;
  els.editNotes.value = task.notes;
  els.editCategory.value = task.category;
  els.editPriority.value = task.priority;
  els.editDue.value = task.due;
  els.editTime.value = task.time;
  els.editRepeat.value = task.repeat;
  els.editTags.value = (task.tags || []).join(", ");
  els.editSubtasks.value = (task.subtasks || []).map(st => st.text).join("\n");
  els.editPinned.checked = task.pinned;
  els.editImportant.checked = task.important;

  els.editDialog.showModal();
}

function exportBackup() {
  const backup = {
    app: "Private Checklist",
    version: 3,
    exportedAt: new Date().toISOString(),
    settings,
    tasks
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `private-checklist-backup-${todayIso()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast("Backup exported.");
}

async function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const importedTasks = Array.isArray(parsed) ? parsed : parsed.tasks;

    if (!Array.isArray(importedTasks)) {
      showToast("That backup file does not contain tasks.");
      return;
    }

    const mode = confirm("Press OK to merge imported tasks. Press Cancel to replace all current tasks.");

    tasks = mode
      ? [...importedTasks.map(normalizeTask), ...tasks]
      : importedTasks.map(normalizeTask);

    if (!Array.isArray(parsed) && parsed.settings && !mode) {
      settings = { ...defaultSettings, ...parsed.settings };
      saveSettings();
      applySettings();
    }

    saveTasks();
    render();
    showToast(mode ? "Backup merged." : "Backup restored.");
  } catch {
    showToast("Could not import that backup file.");
  } finally {
    event.target.value = "";
  }
}

async function shareChecklistText() {
  const openTasks = tasks.filter(t => !t.done);
  const lines = openTasks.length
    ? openTasks.map(t => `☐ ${t.title}${t.due ? ` — due ${t.due}` : ""}`).join("\n")
    : "No open tasks.";

  const text = `${settings.title}\n\n${lines}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: settings.title, text });
      return;
    } catch {
      // User may cancel share sheet; fall through to copy.
    }
  }

  await navigator.clipboard.writeText(text);
  showToast("Checklist copied to clipboard.");
}

function makeBadge(text, variant = "") {
  const span = document.createElement("span");
  span.className = `badge ${variant}`;
  span.textContent = text;
  return span;
}

function parseTags(value) {
  if (Array.isArray(value)) return value.map(t => String(t).trim()).filter(Boolean);
  return String(value || "")
    .split(",")
    .map(t => t.trim().replace(/^#/, ""))
    .filter(Boolean);
}

function parseSubtaskLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
}

function mergeSubtasks(oldSubtasks, newTexts) {
  return newTexts.map(text => {
    const existing = oldSubtasks.find(st => st.text === text);
    return existing ? existing : { id: makeId(), text, done: false };
  });
}

function cleanCategory(value) {
  return String(value || "General").trim() || "General";
}

function repeatLabel(repeat) {
  return {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly"
  }[repeat] || "Repeats";
}

function dueLabel(task) {
  if (!task.due) return "";
  if (task.due === todayIso()) return task.time ? `Today ${task.time}` : "Due today";
  if (task.due < todayIso()) return task.time ? `Overdue ${task.time}` : "Overdue";

  const [year, month, day] = task.due.split("-");
  return task.time ? `Due ${month}/${day} ${task.time}` : `Due ${month}/${day}`;
}

function isOverdue(task) {
  if (!task.due || task.done) return false;
  return task.due < todayIso();
}

function todayIso() {
  return toIsoDate(new Date());
}

function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseLocalDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    els.toast.classList.add("hidden");
  }, 2400);
}
