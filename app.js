const STORAGE_KEY = "privateChecklist.tasks.v4";
const SETTINGS_KEY = "privateChecklist.settings.v4";
const OLD_TASK_KEYS = ["privateChecklist.tasks.v3", "privateChecklist.tasks.v2", "joshsChecklist.tasks.v1"];
const OLD_SETTINGS_KEYS = ["privateChecklist.settings.v3"];

const defaultSettings = {
  title: "Private Checklist",
  theme: "midnight",
  defaultCategory: "General",
  defaultReminder: "off",
  defaultSort: "smart",
  autoReset: true,
  reminderSound: true
};

const templates = {
  daily: [
    { title: "Morning check-in", category: "Daily", repeat: "daily", priority: "normal", subtasks: ["Review today's tasks", "Check calendar", "Pick top 3 priorities"] },
    { title: "Evening reset", category: "Daily", repeat: "daily", priority: "low", subtasks: ["Clear finished tasks", "Move unfinished items", "Plan tomorrow"] }
  ],
  work: [
    { title: "Focus block", category: "Work", priority: "high", subtasks: ["Pick one task", "Silence distractions", "Work for 25 minutes"] },
    { title: "Follow up messages", category: "Work", priority: "normal", subtasks: ["Email replies", "Pending questions", "Waiting-on list"] }
  ],
  gaming: [
    { title: "Game daily checklist", category: "Gaming", repeat: "daily", priority: "normal", subtasks: ["Claim daily rewards", "Use stamina/energy", "Do alliance/guild tasks", "Check events", "Start upgrades"] },
    { title: "Weekly game reset", category: "Gaming", repeat: "weekly", priority: "high", subtasks: ["Review rankings", "Spend expiring currency", "Plan upgrades"] }
  ],
  errands: [
    { title: "Errands run", category: "Errands", priority: "normal", subtasks: ["Make list", "Check hours", "Bring wallet/keys", "Confirm completed"] },
    { title: "Quick chore sweep", category: "Home", priority: "low", subtasks: ["Trash", "Dishes", "Laundry", "Reset desk"] }
  ]
};

let tasks = loadTasks();
let settings = loadSettings();
let deferredPrompt = null;
let currentQuick = { due: "", priority: "normal" };

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const els = {
  appTitle: $("#appTitleText"),
  installBtn: $("#installBtn"),
  notifyBtn: $("#notifyBtn"),
  notificationPanel: $("#notificationPanel"),
  enableNotifications: $("#enableNotificationsBtn"),
  settingsBtn: $("#settingsBtn"),

  quickAddForm: $("#quickAddForm"),
  quickTitle: $("#quickTitle"),

  form: $("#taskForm"),
  title: $("#taskTitle"),
  notes: $("#taskNotes"),
  category: $("#taskCategory"),
  priority: $("#taskPriority"),
  due: $("#taskDue"),
  time: $("#taskTime"),
  reminder: $("#taskReminder"),
  repeat: $("#taskRepeat"),
  tags: $("#taskTags"),
  energy: $("#taskEnergy"),
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

  focusToday: $("#focusTodayBtn"),
  markVisibleDone: $("#markVisibleDoneBtn"),
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
  editReminder: $("#editReminder"),
  editRepeat: $("#editRepeat"),
  editTags: $("#editTags"),
  editEnergy: $("#editEnergy"),
  editSubtasks: $("#editSubtasks"),
  editPinned: $("#editPinned"),
  editImportant: $("#editImportant"),
  cancelEdit: $("#cancelEditBtn"),
  deleteFromEdit: $("#deleteFromEditBtn"),

  settingsDialog: $("#settingsDialog"),
  settingsForm: $("#settingsForm"),
  settingTitle: $("#settingTitle"),
  settingTheme: $("#settingTheme"),
  settingDefaultCategory: $("#settingDefaultCategory"),
  settingDefaultReminder: $("#settingDefaultReminder"),
  settingDefaultSort: $("#settingDefaultSort"),
  settingAutoReset: $("#settingAutoReset"),
  settingReminderSound: $("#settingReminderSound"),
  requestNotify: $("#requestNotifyBtn"),
  testNotify: $("#testNotifyBtn"),
  cancelSettings: $("#cancelSettingsBtn"),
  wipeData: $("#wipeDataBtn"),

  toast: $("#toast")
};

applySettings();
autoResetRecurringIfNeeded();
render();
updateNotificationUI();
startReminderLoop();

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

els.notifyBtn.addEventListener("click", requestNotifications);
els.enableNotifications.addEventListener("click", requestNotifications);

els.quickAddForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = els.quickTitle.value.trim();
  if (!title) return;

  addTaskObject({
    title,
    category: settings.defaultCategory,
    priority: currentQuick.priority,
    due: currentQuick.due,
    reminder: settings.defaultReminder,
    pinned: false,
    important: currentQuick.priority === "high" || currentQuick.priority === "urgent"
  });

  els.quickTitle.value = "";
  currentQuick = { due: "", priority: "normal" };
  showToast("Quick task added.");
});

$$("[data-quick-due]").forEach(button => {
  button.addEventListener("click", () => {
    const mode = button.dataset.quickDue;
    currentQuick.due = mode === "today" ? todayIso() : addDaysIso(1);
    showToast(`Quick add due ${mode}.`);
    els.quickTitle.focus();
  });
});

$$("[data-quick-priority]").forEach(button => {
  button.addEventListener("click", () => {
    currentQuick.priority = button.dataset.quickPriority;
    showToast("Quick add set to high priority.");
    els.quickTitle.focus();
  });
});

$$("[data-template]").forEach(button => {
  button.addEventListener("click", () => addTemplate(button.dataset.template));
});

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  addDetailedTask({ forceToday: false });
});

els.addToday.addEventListener("click", () => {
  if (!els.title.value.trim()) {
    els.title.focus();
    showToast("Type a task first.");
    return;
  }
  addDetailedTask({ forceToday: true });
});

els.search.addEventListener("input", render);
els.status.addEventListener("change", () => {
  updateActiveDashboardChip();
  render();
});
els.categoryFilter.addEventListener("change", render);
els.sortMode.addEventListener("change", render);

$$(".filter-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    els.status.value = chip.dataset.view;
    updateActiveDashboardChip();
    render();
  });
});

els.focusToday.addEventListener("click", () => {
  els.status.value = "today";
  els.sortMode.value = "due";
  updateActiveDashboardChip();
  render();
  showToast("Showing today's tasks.");
});

els.markVisibleDone.addEventListener("click", () => {
  const visible = getVisibleTasks().filter(t => !t.done);
  if (!visible.length) {
    showToast("No visible open tasks to finish.");
    return;
  }

  if (!confirm(`Mark ${visible.length} visible task(s) complete?`)) return;

  const ids = new Set(visible.map(t => t.id));
  tasks = tasks.map(task => ids.has(task.id) ? markTaskDone(task) : task);
  saveTasks();
  render();
  showToast("Visible tasks completed.");
});

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
  resetRecurringTasks("manual");
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
      reminder: els.editReminder.value,
      repeat: els.editRepeat.value,
      tags: parseTags(els.editTags.value),
      energy: els.editEnergy.value,
      subtasks: mergeSubtasks(task.subtasks || [], parseSubtaskLines(els.editSubtasks.value)),
      pinned: els.editPinned.checked,
      important: els.editImportant.checked,
      reminderSentKey: null
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
  els.settingDefaultCategory.value = settings.defaultCategory;
  els.settingDefaultReminder.value = settings.defaultReminder;
  els.settingDefaultSort.value = settings.defaultSort;
  els.settingAutoReset.checked = settings.autoReset;
  els.settingReminderSound.checked = settings.reminderSound;
  els.settingsDialog.showModal();
});

els.cancelSettings.addEventListener("click", () => els.settingsDialog.close());

els.settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();

  settings = {
    title: els.settingTitle.value.trim() || "Private Checklist",
    theme: els.settingTheme.value,
    defaultCategory: cleanCategory(els.settingDefaultCategory.value),
    defaultReminder: els.settingDefaultReminder.value,
    defaultSort: els.settingDefaultSort.value,
    autoReset: els.settingAutoReset.checked,
    reminderSound: els.settingReminderSound.checked
  };

  saveSettings();
  applySettings();
  els.settingsDialog.close();
  showToast("Settings saved.");
});

els.requestNotify.addEventListener("click", requestNotifications);
els.testNotify.addEventListener("click", () => showLocalNotification("Test notification", "Private Checklist notifications are working."));
els.wipeData.addEventListener("click", () => {
  if (!confirm("Delete all tasks and settings on this device/browser? This cannot be undone.")) return;

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SETTINGS_KEY);
  for (const key of OLD_TASK_KEYS) localStorage.removeItem(key);
  for (const key of OLD_SETTINGS_KEYS) localStorage.removeItem(key);

  tasks = [];
  settings = { ...defaultSettings };
  saveTasks();
  saveSettings();
  applySettings();
  els.settingsDialog.close();
  render();
  showToast("All local app data wiped.");
});

function addDetailedTask({ forceToday }) {
  const title = els.title.value.trim();
  if (!title) return;

  addTaskObject({
    title,
    notes: els.notes.value.trim(),
    category: cleanCategory(els.category.value),
    priority: els.priority.value,
    due: forceToday ? todayIso() : els.due.value,
    time: els.time.value,
    reminder: els.reminder.value,
    repeat: els.repeat.value,
    tags: parseTags(els.tags.value),
    energy: els.energy.value,
    subtasks: parseSubtaskLines(els.subtasks.value).map(text => ({ id: makeId(), text, done: false })),
    pinned: els.pinned.checked,
    important: els.important.checked
  });

  els.form.reset();
  els.category.value = settings.defaultCategory;
  els.priority.value = "normal";
  els.repeat.value = "none";
  els.reminder.value = settings.defaultReminder;
  els.energy.value = "normal";
  showToast("Task added.");
}

function addTaskObject(data) {
  const task = normalizeTask({
    id: makeId(),
    notes: "",
    category: settings.defaultCategory,
    priority: "normal",
    due: "",
    time: "",
    reminder: settings.defaultReminder,
    repeat: "none",
    tags: [],
    energy: "normal",
    subtasks: [],
    pinned: false,
    important: false,
    done: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
    lastResetKey: getResetKey(data.repeat || "none"),
    reminderSentKey: null,
    manualOrder: Date.now(),
    ...data
  });

  tasks.unshift(task);
  saveTasks();
  render();
}

function addTemplate(name) {
  const list = templates[name] || [];
  if (!list.length) return;

  const today = todayIso();
  for (const item of list) {
    addTaskObject({
      ...item,
      due: item.repeat === "daily" ? today : "",
      subtasks: (item.subtasks || []).map(text => ({ id: makeId(), text, done: false })),
      tags: [name],
      reminder: "off"
    });
  }

  showToast(`${list.length} template tasks added.`);
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

  for (const oldKey of OLD_TASK_KEYS) {
    const old = localStorage.getItem(oldKey);
    if (!old) continue;

    try {
      const migrated = JSON.parse(old).map(task => normalizeTask({
        ...task,
        repeat: task.repeat || (task.repeatsDaily ? "daily" : "none"),
        reminder: task.reminder || "off",
        energy: task.energy || "normal",
        reminderSentKey: null,
        lastResetKey: getResetKey(task.repeat || (task.repeatsDaily ? "daily" : "none")),
        manualOrder: task.manualOrder || Date.parse(task.createdAt || new Date().toISOString()) || Date.now()
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
  const current = localStorage.getItem(SETTINGS_KEY);
  if (current) {
    try {
      return { ...defaultSettings, ...(JSON.parse(current) || {}) };
    } catch {
      return { ...defaultSettings };
    }
  }

  for (const oldKey of OLD_SETTINGS_KEYS) {
    const old = localStorage.getItem(oldKey);
    if (!old) continue;

    try {
      const migrated = { ...defaultSettings, ...(JSON.parse(old) || {}) };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(migrated));
      return migrated;
    } catch {
      return { ...defaultSettings };
    }
  }

  return { ...defaultSettings };
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function applySettings() {
  document.body.classList.remove("theme-forest", "theme-purple", "theme-plain", "theme-sunset");
  if (settings.theme !== "midnight") document.body.classList.add(`theme-${settings.theme}`);
  els.appTitle.textContent = settings.title;
  document.title = settings.title;

  if (els.category) els.category.value = settings.defaultCategory;
  if (els.reminder) els.reminder.value = settings.defaultReminder;
  if (els.sortMode) els.sortMode.value = settings.defaultSort;
}

function normalizeTask(task) {
  return {
    id: task.id || makeId(),
    title: String(task.title || "").trim(),
    notes: String(task.notes || "").trim(),
    category: cleanCategory(task.category || settings?.defaultCategory || "General"),
    priority: ["low", "normal", "high", "urgent"].includes(task.priority) ? task.priority : "normal",
    due: task.due || "",
    time: task.time || "",
    reminder: ["off", "0", "5", "15", "30", "60", "1440"].includes(String(task.reminder)) ? String(task.reminder) : "off",
    repeat: ["none", "daily", "weekly", "monthly"].includes(task.repeat) ? task.repeat : "none",
    tags: Array.isArray(task.tags) ? task.tags.map(t => String(t).trim()).filter(Boolean) : parseTags(task.tags || ""),
    energy: ["easy", "normal", "hard"].includes(task.energy) ? task.energy : "normal",
    subtasks: Array.isArray(task.subtasks) ? task.subtasks.map(st => ({
      id: st.id || makeId(),
      text: String(st.text || "").trim(),
      done: Boolean(st.done)
    })).filter(st => st.text) : [],
    pinned: Boolean(task.pinned),
    important: Boolean(task.important),
    done: Boolean(task.done),
    createdAt: task.createdAt || new Date().toISOString(),
    completedAt: task.completedAt || null,
    reminderSentKey: task.reminderSentKey || null,
    lastResetKey: task.lastResetKey || getResetKey(task.repeat || "none"),
    manualOrder: task.manualOrder || Date.now()
  };
}

function render() {
  updateCategoryOptions();
  updateStats();
  updateNotificationUI();

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

  const meta = document.createElement("p");
  meta.className = "task-meta-line";
  meta.textContent = metaLine(task);
  if (meta.textContent) main.appendChild(meta);

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

  if (task.energy !== "normal") badges.appendChild(makeBadge(task.energy));
  if (task.important) badges.appendChild(makeBadge("Important", "urgent"));
  if (task.pinned) badges.appendChild(makeBadge("Pinned"));
  if (task.repeat !== "none") badges.appendChild(makeBadge(repeatLabel(task.repeat)));

  if (task.due) {
    badges.appendChild(makeBadge(dueLabel(task), isOverdue(task) ? "overdue" : ""));
  }

  if (task.reminder !== "off") {
    badges.appendChild(makeBadge(reminderLabel(task.reminder), "reminder"));
  }

  for (const tag of task.tags || []) {
    badges.appendChild(makeBadge(`#${tag}`));
  }

  main.appendChild(badges);

  if (task.subtasks && task.subtasks.length) {
    const wrap = document.createElement("div");
    wrap.className = "subtask-wrap";

    const doneCount = task.subtasks.filter(st => st.done).length;
    const subProgress = document.createElement("div");
    subProgress.className = "subtask-progress";
    subProgress.textContent = `${doneCount}/${task.subtasks.length} steps complete`;
    wrap.appendChild(subProgress);

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

  const pinBtn = actionButton(task.pinned ? "Unpin" : "Pin", () => toggleField(task.id, "pinned"));
  const importantBtn = actionButton(task.important ? "Unmark" : "Important", () => toggleField(task.id, "important"));
  const snoozeBtn = actionButton("+1 day", () => snoozeTask(task.id));
  const upBtn = actionButton("↑", () => moveTask(task.id, -1));
  const downBtn = actionButton("↓", () => moveTask(task.id, 1));
  const duplicateBtn = actionButton("Copy", () => duplicateTask(task.id));
  const deleteBtn = actionButton("Delete", () => deleteTask(task.id), "delete");

  actions.append(pinBtn, importantBtn, snoozeBtn, upBtn, downBtn, duplicateBtn, deleteBtn);
  main.appendChild(actions);

  card.append(complete, main);
  return card;
}

function actionButton(text, handler, extraClass = "") {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `icon-btn ${extraClass}`;
  btn.textContent = text;
  btn.addEventListener("click", handler);
  return btn;
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
        task.energy,
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
        (status === "upcoming" && task.due && task.due > todayIso() && !task.done) ||
        (status === "important" && task.important && !task.done) ||
        (status === "pinned" && task.pinned && !task.done) ||
        (status === "recurring" && task.repeat !== "none") ||
        (status === "reminders" && task.reminder !== "off") ||
        (status === "done" && task.done);

      return textMatch && categoryMatch && statusMatch;
    })
    .sort(compareTasks);
}

function compareTasks(a, b) {
  const mode = els.sortMode.value;
  if (mode !== "everything" && a.done !== b.done) return a.done ? 1 : -1;
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

  const priorityScore = { urgent: 0, high: 1, normal: 2, low: 3 };

  if (mode === "manual") return (a.manualOrder || 0) - (b.manualOrder || 0);

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

function updateActiveDashboardChip() {
  $$(".filter-chip").forEach(chip => {
    chip.classList.toggle("active", chip.dataset.view === els.status.value);
  });
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
    return task.done ? markTaskOpen(task) : markTaskDone(task);
  });

  saveTasks();
  render();
}

function markTaskDone(task) {
  const newTask = {
    ...task,
    done: true,
    completedAt: new Date().toISOString(),
    subtasks: (task.subtasks || []).map(st => ({ ...st, done: true }))
  };
  return newTask;
}

function markTaskOpen(task) {
  return {
    ...task,
    done: false,
    completedAt: null
  };
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

    return { ...task, due: toIsoDate(base), reminderSentKey: null };
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
    reminderSentKey: null,
    manualOrder: Date.now(),
    subtasks: (task.subtasks || []).map(st => ({ ...st, id: makeId(), done: false }))
  });

  tasks.unshift(copy);
  saveTasks();
  render();
  showToast("Task copied.");
}

function moveTask(id, direction) {
  const sortedManual = [...tasks].sort((a, b) => (a.manualOrder || 0) - (b.manualOrder || 0));
  const idx = sortedManual.findIndex(t => t.id === id);
  const swapIdx = idx + direction;
  if (idx < 0 || swapIdx < 0 || swapIdx >= sortedManual.length) return;

  const a = sortedManual[idx];
  const b = sortedManual[swapIdx];
  const aOrder = a.manualOrder || Date.now();
  const bOrder = b.manualOrder || Date.now() + direction;

  tasks = tasks.map(task => {
    if (task.id === a.id) return { ...task, manualOrder: bOrder };
    if (task.id === b.id) return { ...task, manualOrder: aOrder };
    return task;
  });

  els.sortMode.value = "manual";
  saveTasks();
  render();
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
  els.editReminder.value = task.reminder;
  els.editRepeat.value = task.repeat;
  els.editTags.value = (task.tags || []).join(", ");
  els.editEnergy.value = task.energy;
  els.editSubtasks.value = (task.subtasks || []).map(st => st.text).join("\n");
  els.editPinned.checked = task.pinned;
  els.editImportant.checked = task.important;

  els.editDialog.showModal();
}

function resetRecurringTasks(reason = "manual") {
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
      reminderSentKey: null,
      lastResetKey: getResetKey(task.repeat),
      subtasks: (task.subtasks || []).map(st => ({ ...st, done: false }))
    };
  });

  saveTasks();
  render();
  showToast(reason === "auto" ? "Recurring tasks auto-reset." : "Repeating tasks reset.");
}

function autoResetRecurringIfNeeded() {
  if (!settings.autoReset) return;

  let changed = false;
  tasks = tasks.map(task => {
    if (!task.repeat || task.repeat === "none") return task;

    const currentKey = getResetKey(task.repeat);
    if (task.lastResetKey === currentKey) return task;

    changed = true;
    return {
      ...task,
      done: false,
      completedAt: null,
      reminderSentKey: null,
      lastResetKey: currentKey,
      subtasks: (task.subtasks || []).map(st => ({ ...st, done: false }))
    };
  });

  if (changed) {
    saveTasks();
    setTimeout(() => showToast("Recurring tasks auto-reset."), 500);
  }
}

async function requestNotifications() {
  if (!("Notification" in window)) {
    showToast("This browser does not support notifications.");
    return false;
  }

  if (Notification.permission === "granted") {
    showToast("Notifications are already enabled.");
    updateNotificationUI();
    return true;
  }

  if (Notification.permission === "denied") {
    showToast("Notifications are blocked. Enable them in Chrome site settings.");
    updateNotificationUI();
    return false;
  }

  const permission = await Notification.requestPermission();
  updateNotificationUI();

  if (permission === "granted") {
    showToast("Notifications enabled.");
    showLocalNotification("Notifications enabled", "Private Checklist can now show reminder notifications.");
    return true;
  }

  showToast("Notifications were not enabled.");
  return false;
}

function updateNotificationUI() {
  if (!("Notification" in window)) {
    els.notifyBtn.textContent = "No notifications";
    els.notificationPanel.classList.add("hidden");
    return;
  }

  const permission = Notification.permission;
  els.notifyBtn.textContent = permission === "granted" ? "Notifications on" : "Notifications";

  const hasReminderTasks = tasks.some(t => !t.done && t.reminder !== "off");
  els.notificationPanel.classList.toggle("hidden", permission === "granted" || !hasReminderTasks);
}

function startReminderLoop() {
  checkDueReminders();
  setInterval(checkDueReminders, 30_000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      autoResetRecurringIfNeeded();
      checkDueReminders();
      render();
    }
  });
}

function checkDueReminders() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const now = new Date();
  let changed = false;

  tasks = tasks.map(task => {
    if (task.done || task.reminder === "off" || !task.due || !task.time) return task;

    const due = parseTaskDateTime(task);
    if (!due) return task;

    const reminderMinutes = Number(task.reminder);
    const remindAt = new Date(due.getTime() - reminderMinutes * 60_000);
    const reminderKey = `${task.id}:${task.due}:${task.time}:${task.reminder}`;

    if (now >= remindAt && task.reminderSentKey !== reminderKey) {
      const when = reminderMinutes === 0 ? "now" : `in ${reminderMinutes} min`;
      showLocalNotification(`Task due ${when}`, task.title, task.id);
      changed = true;
      return { ...task, reminderSentKey: reminderKey };
    }

    return task;
  });

  if (changed) saveTasks();
}

async function showLocalNotification(title, body, taskId = "") {
  if (!("Notification" in window)) {
    showToast("Notifications are not supported here.");
    return;
  }

  if (Notification.permission !== "granted") {
    const ok = await requestNotifications();
    if (!ok) return;
  }

  const options = {
    body,
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    tag: taskId ? `task-${taskId}` : "private-checklist-test",
    renotify: Boolean(taskId),
    requireInteraction: Boolean(taskId),
    data: { taskId },
    silent: !settings.reminderSound
  };

  if (settings.reminderSound && "vibrate" in navigator) {
    options.vibrate = [120, 70, 120];
  }

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, options);
    } else {
      new Notification(title, options);
    }
  } catch {
    try {
      new Notification(title, options);
    } catch {
      showToast("Could not show notification.");
    }
  }
}

function exportBackup() {
  const backup = {
    app: "Private Checklist",
    version: 4,
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

    const merge = confirm("Press OK to merge imported tasks. Press Cancel to replace all current tasks.");

    tasks = merge
      ? [...importedTasks.map(normalizeTask), ...tasks]
      : importedTasks.map(normalizeTask);

    if (!Array.isArray(parsed) && parsed.settings && !merge) {
      settings = { ...defaultSettings, ...parsed.settings };
      saveSettings();
      applySettings();
    }

    saveTasks();
    render();
    showToast(merge ? "Backup merged." : "Backup restored.");
  } catch {
    showToast("Could not import that backup file.");
  } finally {
    event.target.value = "";
  }
}

async function shareChecklistText() {
  const openTasks = tasks.filter(t => !t.done);
  const lines = openTasks.length
    ? openTasks.map(t => `☐ ${t.title}${t.due ? ` — due ${t.due}${t.time ? ` ${t.time}` : ""}` : ""}`).join("\n")
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

function reminderLabel(value) {
  return {
    "0": "Reminder: due time",
    "5": "Reminder: 5 min",
    "15": "Reminder: 15 min",
    "30": "Reminder: 30 min",
    "60": "Reminder: 1 hr",
    "1440": "Reminder: 1 day"
  }[String(value)] || "Reminder";
}

function dueLabel(task) {
  if (!task.due) return "";
  if (task.due === todayIso()) return task.time ? `Today ${formatTime(task.time)}` : "Due today";
  if (task.due < todayIso()) return task.time ? `Overdue ${formatTime(task.time)}` : "Overdue";

  const [year, month, day] = task.due.split("-");
  return task.time ? `Due ${month}/${day} ${formatTime(task.time)}` : `Due ${month}/${day}`;
}

function metaLine(task) {
  const pieces = [];
  if (task.due) pieces.push(dueLabel(task));
  if (task.repeat !== "none") pieces.push(repeatLabel(task.repeat));
  if (task.reminder !== "off") pieces.push(reminderLabel(task.reminder));
  return pieces.join(" • ");
}

function isOverdue(task) {
  if (!task.due || task.done) return false;
  if (task.due < todayIso()) return true;
  if (task.due === todayIso() && task.time) {
    const due = parseTaskDateTime(task);
    return due && new Date() > due;
  }
  return false;
}

function parseTaskDateTime(task) {
  if (!task.due || !task.time) return null;
  const [year, month, day] = task.due.split("-").map(Number);
  const [hour, minute] = task.time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function getResetKey(repeat) {
  const now = new Date();
  if (repeat === "daily") return todayIso();
  if (repeat === "weekly") {
    const first = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - first) / 86400000);
    const week = Math.ceil((days + first.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
  }
  if (repeat === "monthly") return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return "none";
}

function todayIso() {
  return toIsoDate(new Date());
}

function addDaysIso(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
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

function formatTime(time) {
  const [hourRaw, minute] = time.split(":");
  let hour = Number(hourRaw);
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${suffix}`;
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
  }, 2500);
}
