const APP_VERSION = "5.3";
const APP_BUILD = "2026-06-01";
const STORAGE_KEY = "privateChecklist.tasks.v5";
const SETTINGS_KEY = "privateChecklist.settings.v5";
const OLD_TASK_KEYS = ["privateChecklist.tasks.v4", "privateChecklist.tasks.v3", "privateChecklist.tasks.v2", "joshsChecklist.tasks.v1"];
const OLD_SETTINGS_KEYS = ["privateChecklist.settings.v4", "privateChecklist.settings.v3"];

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
    { title: "Game daily checklist", category: "Gaming", repeat: "daily", priority: "normal", subtasks: ["Claim daily rewards", "Use energy/stamina", "Do alliance or guild tasks", "Check events", "Start upgrades"] },
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
let recognition = null;
let lastVoiceTask = null;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const els = {
  appTitle: $("#appTitleText"),
  versionLabel: $("#versionLabel"),
  installBtn: $("#installBtn"),
  jumpReminders: $("#jumpRemindersBtn"),
  jumpGoogle: $("#jumpGoogleBtn"),
  jumpVoice: $("#jumpVoiceBtn"),
  jumpSettings: $("#jumpSettingsBtn"),

  taskForm: $("#taskForm"),
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

  notificationBadge: $("#notificationBadge"),
  notificationStatus: $("#notificationStatus"),
  notificationDetails: $("#notificationDetails"),
  requestNotify: $("#requestNotifyBtn"),
  testNotify: $("#testNotifyBtn"),
  createTestReminder: $("#createTestReminderBtn"),
  openNotificationHelp: $("#openNotificationHelpBtn"),
  notificationHelp: $("#notificationHelp"),
  checkNow: $("#checkNowBtn"),
  showReminderTasks: $("#showReminderTasksBtn"),
  upcomingReminderList: $("#upcomingReminderList"),
  reminderSummary: $("#reminderSummary"),

  googleTaskList: $("#googleTaskList"),
  googleSummary: $("#googleSummary"),
  googleViewDueTasks: $("#googleViewDueTasksBtn"),
  downloadVisibleIcs: $("#downloadVisibleIcsBtn"),

  voiceBadge: $("#voiceBadge"),
  voiceStatus: $("#voiceStatus"),
  voiceDetails: $("#voiceDetails"),
  startVoice: $("#startVoiceBtn"),
  stopVoice: $("#stopVoiceBtn"),
  parseVoice: $("#parseVoiceBtn"),
  voiceTranscript: $("#voiceTranscript"),
  voicePreviewTitle: $("#voicePreviewTitle"),
  voicePreviewDue: $("#voicePreviewDue"),
  voicePreviewTime: $("#voicePreviewTime"),
  voicePreviewCategory: $("#voicePreviewCategory"),
  voicePreviewPriority: $("#voicePreviewPriority"),
  voicePreviewReminder: $("#voicePreviewReminder"),
  createVoiceTask: $("#createVoiceTaskBtn"),
  sendVoiceToAdd: $("#sendVoiceToAddBtn"),

  settingsForm: $("#settingsForm"),
  settingTitle: $("#settingTitle"),
  settingTheme: $("#settingTheme"),
  settingDefaultCategory: $("#settingDefaultCategory"),
  settingDefaultReminder: $("#settingDefaultReminder"),
  settingDefaultSort: $("#settingDefaultSort"),
  settingAutoReset: $("#settingAutoReset"),
  settingReminderSound: $("#settingReminderSound"),
  wipeData: $("#wipeDataBtn"),

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

  toast: $("#toast")
};

applySettings();
autoResetRecurringIfNeeded();
render();
updateNotificationUI();
updateVoiceSupportUI();
startReminderLoop();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

window.addEventListener("beforeinstallprompt", event => {
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

$$(".tab-btn").forEach(button => {
  button.addEventListener("click", () => showTab(button.dataset.tab));
});


els.startVoice.addEventListener("click", startVoiceInput);
els.stopVoice.addEventListener("click", stopVoiceInput);
els.parseVoice.addEventListener("click", () => parseVoiceTranscript(true));
els.createVoiceTask.addEventListener("click", createTaskFromVoice);
els.sendVoiceToAdd.addEventListener("click", sendVoiceToAddForm);

$$("[data-voice-example]").forEach(button => {
  button.addEventListener("click", () => {
    els.voiceTranscript.value = button.dataset.voiceExample;
    parseVoiceTranscript(true);
  });
});

els.jumpReminders.addEventListener("click", () => showTab("reminders"));
els.jumpGoogle.addEventListener("click", () => showTab("google"));
els.jumpVoice.addEventListener("click", () => showTab("voice"));
els.jumpSettings.addEventListener("click", () => showTab("settings"));

$$(".view-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    els.status.value = chip.dataset.view;
    showTab("tasks");
    updateActiveViewChip();
    render();
  });
});

$$("[data-template]").forEach(button => {
  button.addEventListener("click", () => addTemplate(button.dataset.template));
});

$$("[data-due-preset]").forEach(button => {
  button.addEventListener("click", () => applyDuePreset(button.dataset.duePreset));
});

els.taskForm.addEventListener("submit", event => {
  event.preventDefault();
  addDetailedTask(false);
});

els.addToday.addEventListener("click", () => {
  if (!els.title.value.trim()) {
    els.title.focus();
    showToast("Type a task first.");
    return;
  }
  addDetailedTask(true);
});

els.search.addEventListener("input", render);
els.status.addEventListener("change", () => {
  updateActiveViewChip();
  render();
});
els.categoryFilter.addEventListener("change", render);
els.sortMode.addEventListener("change", render);

els.focusToday.addEventListener("click", () => {
  els.status.value = "today";
  els.sortMode.value = "due";
  updateActiveViewChip();
  render();
});

els.markVisibleDone.addEventListener("click", () => {
  const visible = getVisibleTasks().filter(task => !task.done);
  if (!visible.length) {
    showToast("No visible open tasks to finish.");
    return;
  }
  if (!confirm(`Mark ${visible.length} visible task(s) complete?`)) return;

  const ids = new Set(visible.map(task => task.id));
  tasks = tasks.map(task => ids.has(task.id) ? markTaskDone(task) : task);
  saveTasks();
  render();
  showToast("Visible tasks completed.");
});

els.clearDone.addEventListener("click", () => {
  const completed = tasks.filter(task => task.done).length;
  if (!completed) {
    showToast("No completed tasks to clear.");
    return;
  }
  if (!confirm(`Clear ${completed} completed task(s)?`)) return;

  tasks = tasks.filter(task => !task.done);
  saveTasks();
  render();
  showToast("Completed tasks cleared.");
});

els.resetRecurring.addEventListener("click", () => resetRecurringTasks("manual"));
els.exportBtn.addEventListener("click", exportBackup);
els.importInput.addEventListener("change", importBackup);
els.shareBtn.addEventListener("click", shareChecklistText);

els.requestNotify.addEventListener("click", requestNotifications);
els.testNotify.addEventListener("click", () => showLocalNotification("Test notification", "Private Checklist notifications are working."));
els.createTestReminder.addEventListener("click", createOneMinuteTestReminder);
els.openNotificationHelp.addEventListener("click", () => els.notificationHelp.classList.toggle("hidden"));
els.checkNow.addEventListener("click", () => {
  checkDueReminders();
  renderReminders();
  showToast("Reminder check complete.");
});
els.googleViewDueTasks.addEventListener("click", () => {
  els.status.value = "upcoming";
  updateActiveViewChip();
  showTab("tasks");
  render();
});

els.downloadVisibleIcs.addEventListener("click", () => {
  const visible = getVisibleTasks().filter(task => task.due);
  if (!visible.length) {
    showToast("No visible due tasks to export.");
    return;
  }
  downloadIcsFile(visible, "private-checklist-visible.ics");
});

els.showReminderTasks.addEventListener("click", () => {
  els.status.value = "reminders";
  updateActiveViewChip();
  showTab("tasks");
  render();
});

els.settingsForm.addEventListener("submit", event => {
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
  render();
  showToast("Settings saved.");
});

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
  render();
  showToast("All local app data wiped.");
});

els.editForm.addEventListener("submit", event => {
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
  const task = tasks.find(item => item.id === els.editId.value);
  if (!task) return;
  if (!confirm(`Delete "${task.title}"?`)) return;

  tasks = tasks.filter(item => item.id !== task.id);
  saveTasks();
  els.editDialog.close();
  render();
  showToast("Task deleted.");
});

function showTab(tabName) {
  $$(".tab-panel").forEach(panel => panel.classList.toggle("active", panel.id === `tab-${tabName}`));
  $$(".tab-btn").forEach(button => button.classList.toggle("active", button.dataset.tab === tabName));
  if (tabName === "reminders") {
    updateNotificationUI();
    renderReminders();
  }
  if (tabName === "google") renderGooglePanel();
  if (tabName === "voice") updateVoiceSupportUI();
  if (tabName === "settings") fillSettingsForm();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function addDetailedTask(forceToday) {
  const title = els.title.value.trim();
  if (!title) return;

  const due = forceToday ? todayIso() : els.due.value;
  const reminder = els.reminder.value;
  const time = els.time.value;

  if (reminder !== "off" && (!due || !time)) {
    showToast("Reminder tasks need both a due date and due time.");
    showTab("add");
    return;
  }

  addTaskObject({
    title,
    notes: els.notes.value.trim(),
    category: cleanCategory(els.category.value),
    priority: els.priority.value,
    due,
    time,
    reminder,
    repeat: els.repeat.value,
    tags: parseTags(els.tags.value),
    energy: els.energy.value,
    subtasks: parseSubtaskLines(els.subtasks.value).map(text => ({ id: makeId(), text, done: false })),
    pinned: els.pinned.checked,
    important: els.important.checked
  });

  els.taskForm.reset();
  els.category.value = settings.defaultCategory;
  els.priority.value = "normal";
  els.repeat.value = "none";
  els.reminder.value = settings.defaultReminder;
  els.energy.value = "normal";
  showTab("tasks");
  showToast("Task added.");
}

function addTaskObject(data) {
  const task = normalizeTask({
    id: makeId(),
    title: "",
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

function applyDuePreset(type) {
  const now = new Date();
  const date = new Date();

  if (type === "tomorrow") {
    date.setDate(date.getDate() + 1);
    els.due.value = toIsoDate(date);
    if (!els.time.value) els.time.value = "09:00";
  }

  if (type === "today") {
    els.due.value = todayIso();
  }

  if (type === "tonight") {
    els.due.value = todayIso();
    els.time.value = "20:00";
  }

  if (type === "hour") {
    now.setHours(now.getHours() + 1);
    els.due.value = toIsoDate(now);
    els.time.value = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    if (els.reminder.value === "off") els.reminder.value = "0";
  }

  showToast("Due preset applied.");
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

  showTab("tasks");
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

  for (const key of OLD_TASK_KEYS) {
    const value = localStorage.getItem(key);
    if (!value) continue;

    try {
      const migrated = JSON.parse(value).map(task => normalizeTask({
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

  for (const key of OLD_SETTINGS_KEYS) {
    const value = localStorage.getItem(key);
    if (!value) continue;

    try {
      const migrated = { ...defaultSettings, ...(JSON.parse(value) || {}) };
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
  els.versionLabel.textContent = `${settings.title} v${APP_VERSION}`;

  els.category.value = settings.defaultCategory;
  els.reminder.value = settings.defaultReminder;
  els.sortMode.value = settings.defaultSort;
  fillSettingsForm();
}

function fillSettingsForm() {
  els.settingTitle.value = settings.title;
  els.settingTheme.value = settings.theme;
  els.settingDefaultCategory.value = settings.defaultCategory;
  els.settingDefaultReminder.value = settings.defaultReminder;
  els.settingDefaultSort.value = settings.defaultSort;
  els.settingAutoReset.checked = settings.autoReset;
  els.settingReminderSound.checked = settings.reminderSound;
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
    tags: Array.isArray(task.tags) ? task.tags.map(tag => String(tag).trim()).filter(Boolean) : parseTags(task.tags || ""),
    energy: ["easy", "normal", "hard"].includes(task.energy) ? task.energy : "normal",
    subtasks: Array.isArray(task.subtasks) ? task.subtasks.map(step => ({
      id: step.id || makeId(),
      text: String(step.text || "").trim(),
      done: Boolean(step.done)
    })).filter(step => step.text) : [],
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
  renderTasks();
  renderReminders();
  renderGooglePanel();
}

function renderTasks() {
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
  quick.append(
    actionButton(task.done ? "Reopen" : "Done", () => toggleTask(task.id)),
    actionButton("Edit", () => openEdit(task.id))
  );

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
  badges.append(makeBadge(task.category), makeBadge(task.priority, task.priority));

  if (task.energy !== "normal") badges.appendChild(makeBadge(task.energy));
  if (task.important) badges.appendChild(makeBadge("Important", "urgent"));
  if (task.pinned) badges.appendChild(makeBadge("Pinned"));
  if (task.repeat !== "none") badges.appendChild(makeBadge(repeatLabel(task.repeat)));
  if (task.due) badges.appendChild(makeBadge(dueLabel(task), isOverdue(task) ? "overdue" : ""));
  if (task.reminder !== "off") badges.appendChild(makeBadge(reminderLabel(task.reminder), "reminder"));

  for (const tag of task.tags || []) badges.appendChild(makeBadge(`#${tag}`));
  main.appendChild(badges);

  if (task.subtasks && task.subtasks.length) {
    const wrap = document.createElement("div");
    wrap.className = "subtask-wrap";

    const doneCount = task.subtasks.filter(step => step.done).length;
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
  actions.append(
    actionButton(task.pinned ? "Unpin" : "Pin", () => toggleField(task.id, "pinned")),
    actionButton(task.important ? "Unmark" : "Important", () => toggleField(task.id, "important")),
    actionButton("+1 day", () => snoozeTask(task.id)),
    actionButton("Calendar", () => openGoogleCalendarTask(task.id)),
    actionButton(".ics", () => downloadTaskIcs(task.id)),
    actionButton("Email", () => emailTask(task.id)),
    actionButton("↑", () => moveTask(task.id, -1)),
    actionButton("↓", () => moveTask(task.id, 1)),
    actionButton("Copy", () => duplicateTask(task.id)),
    actionButton("Delete", () => deleteTask(task.id), "delete")
  );
  main.appendChild(actions);

  card.append(complete, main);
  return card;
}

function actionButton(text, handler, extraClass = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `icon-btn ${extraClass}`;
  button.textContent = text;
  button.addEventListener("click", handler);
  return button;
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
        ...(task.subtasks || []).map(step => step.text)
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
  if (a.done !== b.done) return a.done ? 1 : -1;
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

  const priorityScore = { urgent: 0, high: 1, normal: 2, low: 3 };

  if (mode === "manual") return (a.manualOrder || 0) - (b.manualOrder || 0);

  if (mode === "priority" || mode === "smart") {
    const priority = priorityScore[a.priority] - priorityScore[b.priority];
    if (priority !== 0) return priority;
  }

  if (mode === "due" || mode === "smart") {
    const aDate = a.due || "9999-12-31";
    const bDate = b.due || "9999-12-31";
    if (aDate !== bDate) return aDate.localeCompare(bDate);
    if ((a.time || "") !== (b.time || "")) return (a.time || "99:99").localeCompare(b.time || "99:99");
  }

  if (mode === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
  if (mode === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
  if (mode === "az") return a.title.localeCompare(b.title);

  return new Date(b.createdAt) - new Date(a.createdAt);
}

function updateStats() {
  const total = tasks.length;
  const done = tasks.filter(task => task.done).length;
  const open = tasks.filter(task => !task.done).length;
  const today = tasks.filter(task => task.due === todayIso() && !task.done).length;
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

function updateActiveViewChip() {
  $$(".view-chip").forEach(chip => chip.classList.toggle("active", chip.dataset.view === els.status.value));
}

function updateCategoryOptions() {
  const categories = [...new Set(tasks.map(task => task.category).filter(Boolean))].sort();

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
  tasks = tasks.map(task => task.id === id ? (task.done ? markTaskOpen(task) : markTaskDone(task)) : task);
  saveTasks();
  render();
}

function markTaskDone(task) {
  return {
    ...task,
    done: true,
    completedAt: new Date().toISOString(),
    subtasks: (task.subtasks || []).map(step => ({ ...step, done: true }))
  };
}

function markTaskOpen(task) {
  return { ...task, done: false, completedAt: null };
}

function toggleSubtask(taskId, subtaskId) {
  tasks = tasks.map(task => {
    if (task.id !== taskId) return task;

    const subtasks = (task.subtasks || []).map(step => step.id === subtaskId ? { ...step, done: !step.done } : step);
    const allDone = subtasks.length > 0 && subtasks.every(step => step.done);

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
  const task = tasks.find(item => item.id === id);
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
    subtasks: (task.subtasks || []).map(step => ({ ...step, id: makeId(), done: false }))
  });

  tasks.unshift(copy);
  saveTasks();
  render();
  showToast("Task copied.");
}

function moveTask(id, direction) {
  const sorted = [...tasks].sort((a, b) => (a.manualOrder || 0) - (b.manualOrder || 0));
  const index = sorted.findIndex(task => task.id === id);
  const swapIndex = index + direction;
  if (index < 0 || swapIndex < 0 || swapIndex >= sorted.length) return;

  const current = sorted[index];
  const other = sorted[swapIndex];
  const currentOrder = current.manualOrder || Date.now();
  const otherOrder = other.manualOrder || Date.now() + direction;

  tasks = tasks.map(task => {
    if (task.id === current.id) return { ...task, manualOrder: otherOrder };
    if (task.id === other.id) return { ...task, manualOrder: currentOrder };
    return task;
  });

  els.sortMode.value = "manual";
  saveTasks();
  render();
}

function deleteTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;
  if (!confirm(`Delete "${task.title}"?`)) return;

  tasks = tasks.filter(item => item.id !== id);
  saveTasks();
  render();
  showToast("Task deleted.");
}

function openEdit(id) {
  const task = tasks.find(item => item.id === id);
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
  els.editSubtasks.value = (task.subtasks || []).map(step => step.text).join("\n");
  els.editPinned.checked = task.pinned;
  els.editImportant.checked = task.important;

  els.editDialog.showModal();
}

async function requestNotifications() {
  if (!("Notification" in window)) {
    showToast("This browser does not support notifications.");
    updateNotificationUI();
    return false;
  }

  if (!window.isSecureContext) {
    showToast("Notifications require HTTPS. Use your GitHub Pages link.");
    updateNotificationUI();
    return false;
  }

  if (Notification.permission === "granted") {
    showToast("Notifications are already enabled.");
    updateNotificationUI();
    return true;
  }

  if (Notification.permission === "denied") {
    showToast("Notifications are blocked. Change Chrome site settings.");
    updateNotificationUI();
    return false;
  }

  const permission = await Notification.requestPermission();
  updateNotificationUI();

  if (permission === "granted") {
    showToast("Notifications enabled.");
    await showLocalNotification("Notifications enabled", "Private Checklist can now show reminders.");
    return true;
  }

  showToast("Notifications were not enabled.");
  return false;
}

function updateNotificationUI() {
  if (!("Notification" in window)) {
    setNotificationState("bad", "Unsupported", "Notifications are not supported by this browser.", "Use Android Chrome with the hosted HTTPS app link.");
    return;
  }

  if (!window.isSecureContext) {
    setNotificationState("bad", "Needs HTTPS", "Notifications require a secure HTTPS page.", "Open the GitHub Pages URL instead of opening index.html directly.");
    return;
  }

  if (Notification.permission === "granted") {
    setNotificationState("good", "Enabled", "Notifications are enabled.", "Reminder tasks will notify when this app/browser session can check them.");
    return;
  }

  if (Notification.permission === "denied") {
    setNotificationState("bad", "Blocked", "Notifications are blocked for this site.", "Open Chrome site settings for this page and allow notifications.");
    return;
  }

  setNotificationState("warn", "Not enabled", "Notifications are not enabled yet.", "Tap Enable notifications, then allow the browser permission prompt.");
}

function setNotificationState(kind, badge, status, details) {
  els.notificationBadge.className = `status-badge ${kind}`;
  els.notificationBadge.textContent = badge;
  els.notificationStatus.textContent = status;
  els.notificationDetails.textContent = details;
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
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
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

function createOneMinuteTestReminder() {
  requestNotifications().then(ok => {
    if (!ok) return;

    const due = new Date();
    due.setMinutes(due.getMinutes() + 1);

    addTaskObject({
      title: "Test reminder",
      notes: "This task was created to test notifications.",
      category: "Reminders",
      priority: "high",
      due: toIsoDate(due),
      time: `${String(due.getHours()).padStart(2, "0")}:${String(due.getMinutes()).padStart(2, "0")}`,
      reminder: "0",
      important: true,
      tags: ["test"]
    });

    showTab("reminders");
    showToast("Test reminder created for about 1 minute from now.");
  });
}

function startReminderLoop() {
  checkDueReminders();
  setInterval(checkDueReminders, 15000);
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
    const remindAt = new Date(due.getTime() - reminderMinutes * 60000);
    const reminderKey = `${task.id}:${task.due}:${task.time}:${task.reminder}`;

    if (now >= remindAt && task.reminderSentKey !== reminderKey) {
      const when = reminderMinutes === 0 ? "now" : `in ${reminderMinutes} min`;
      showLocalNotification(`Task due ${when}`, task.title, task.id);
      changed = true;
      return { ...task, reminderSentKey: reminderKey };
    }

    return task;
  });

  if (changed) {
    saveTasks();
    renderReminders();
  }
}

function renderReminders() {
  const reminderTasks = tasks
    .filter(task => !task.done && task.reminder !== "off" && task.due && task.time)
    .sort((a, b) => parseTaskDateTime(a) - parseTaskDateTime(b));

  els.upcomingReminderList.innerHTML = "";
  els.reminderSummary.textContent = reminderTasks.length
    ? `${reminderTasks.length} active reminder ${reminderTasks.length === 1 ? "task" : "tasks"}`
    : "No active reminder tasks.";

  if (!reminderTasks.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = "<h3>No reminder tasks yet</h3><p>Add a task with a due date, due time, and reminder.</p>";
    els.upcomingReminderList.appendChild(empty);
    return;
  }

  for (const task of reminderTasks) {
    const card = document.createElement("article");
    card.className = "reminder-card";

    const left = document.createElement("div");
    const title = document.createElement("h3");
    title.className = "reminder-title";
    title.textContent = task.title;

    const meta = document.createElement("p");
    meta.className = "reminder-meta";
    meta.textContent = `${dueLabel(task)} • ${reminderLabel(task.reminder)}`;

    left.append(title, meta);

    const edit = document.createElement("button");
    edit.className = "pill";
    edit.type = "button";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => openEdit(task.id));

    card.append(left, edit);
    els.upcomingReminderList.appendChild(card);
  }
}

function resetRecurringTasks(reason = "manual") {
  const recurring = tasks.filter(task => task.repeat && task.repeat !== "none");
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
      subtasks: (task.subtasks || []).map(step => ({ ...step, done: false }))
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
      subtasks: (task.subtasks || []).map(step => ({ ...step, done: false }))
    };
  });

  if (changed) {
    saveTasks();
    setTimeout(() => showToast("Recurring tasks auto-reset."), 500);
  }
}

function exportBackup() {
  const backup = {
    app: "Private Checklist",
    version: APP_VERSION,
    build: APP_BUILD,
    exportedAt: new Date().toISOString(),
    settings,
    tasks
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `private-checklist-backup-${todayIso()}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
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
  const openTasks = tasks.filter(task => !task.done);
  const lines = openTasks.length
    ? openTasks.map(task => `☐ ${task.title}${task.due ? ` — due ${task.due}${task.time ? ` ${task.time}` : ""}` : ""}`).join("\n")
    : "No open tasks.";

  const text = `${settings.title}\n\n${lines}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: settings.title, text });
      return;
    } catch {}
  }

  await navigator.clipboard.writeText(text);
  showToast("Checklist copied to clipboard.");
}





function updateVoiceSupportUI() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!els.voiceBadge) return;

  if (!SpeechRecognition) {
    setVoiceState("bad", "Unsupported", "Voice input is not supported in this browser.", "Use Android Chrome with the hosted HTTPS app link, or type/paste text into the transcript box.");
    return;
  }

  if (!window.isSecureContext) {
    setVoiceState("bad", "Needs HTTPS", "Voice input needs the secure hosted app link.", "Open your GitHub Pages URL instead of opening index.html directly.");
    return;
  }

  setVoiceState("good", "Ready", "Voice input is ready.", "Tap Start listening, say the task, then review the preview.");
}

function setVoiceState(kind, badge, status, details) {
  if (!els.voiceBadge) return;
  els.voiceBadge.className = `status-badge ${kind}`;
  els.voiceBadge.textContent = badge;
  els.voiceStatus.textContent = status;
  els.voiceDetails.textContent = details;
}

function startVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    updateVoiceSupportUI();
    return;
  }

  try {
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let finalTranscript = "";

    recognition.onstart = () => {
      setVoiceState("warn", "Listening", "Listening now...", "Speak naturally. The transcript will appear below.");
    };

    recognition.onresult = event => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += text + " ";
        else interim += text;
      }

      els.voiceTranscript.value = (finalTranscript + interim).trim();
      parseVoiceTranscript(false);
    };

    recognition.onerror = event => {
      setVoiceState("bad", "Error", "Voice input stopped.", event.error || "Unknown voice error.");
    };

    recognition.onend = () => {
      parseVoiceTranscript(true);
      setVoiceState("good", "Ready", "Voice capture finished.", "Review the preview, then tap Create task.");
    };

    recognition.start();
  } catch (error) {
    setVoiceState("bad", "Error", "Could not start voice input.", error.message || "Try again.");
  }
}

function stopVoiceInput() {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
  parseVoiceTranscript(true);
}

function parseVoiceTranscript(showToastMessage = false) {
  const text = els.voiceTranscript.value.trim();

  if (!text) {
    lastVoiceTask = null;
    updateVoicePreview(null);
    if (showToastMessage) showToast("No voice text to parse yet.");
    return;
  }

  lastVoiceTask = parseNaturalTask(text);
  updateVoicePreview(lastVoiceTask);

  if (showToastMessage) {
    showToast(lastVoiceTask.title ? "Voice text parsed." : "Could not find a task title.");
  }
}

function updateVoicePreview(task) {
  if (!task) {
    els.voicePreviewTitle.textContent = "—";
    els.voicePreviewDue.textContent = "—";
    els.voicePreviewTime.textContent = "—";
    els.voicePreviewCategory.textContent = "—";
    els.voicePreviewPriority.textContent = "—";
    els.voicePreviewReminder.textContent = "—";
    return;
  }

  els.voicePreviewTitle.textContent = task.title || "—";
  els.voicePreviewDue.textContent = task.due || "—";
  els.voicePreviewTime.textContent = task.time || "—";
  els.voicePreviewCategory.textContent = task.category || "General";
  els.voicePreviewPriority.textContent = task.priority || "normal";
  els.voicePreviewReminder.textContent = task.reminder === "off" ? "No reminder" : reminderLabel(task.reminder);
}

function createTaskFromVoice() {
  if (!lastVoiceTask) parseVoiceTranscript(false);

  if (!lastVoiceTask || !lastVoiceTask.title) {
    showToast("Say or type a task first.");
    return;
  }

  addTaskObject(lastVoiceTask);
  els.voiceTranscript.value = "";
  lastVoiceTask = null;
  updateVoicePreview(null);
  showTab("tasks");
  showToast("Voice task created.");
}

function sendVoiceToAddForm() {
  if (!lastVoiceTask) parseVoiceTranscript(false);

  if (!lastVoiceTask) {
    showToast("Say or type a task first.");
    return;
  }

  els.title.value = lastVoiceTask.title || "";
  els.notes.value = lastVoiceTask.notes || "";
  els.category.value = lastVoiceTask.category || settings.defaultCategory;
  els.priority.value = lastVoiceTask.priority || "normal";
  els.due.value = lastVoiceTask.due || "";
  els.time.value = lastVoiceTask.time || "";
  els.reminder.value = lastVoiceTask.reminder || settings.defaultReminder;
  els.repeat.value = lastVoiceTask.repeat || "none";
  els.tags.value = (lastVoiceTask.tags || []).join(", ");
  els.energy.value = lastVoiceTask.energy || "normal";
  els.pinned.checked = Boolean(lastVoiceTask.pinned);
  els.important.checked = Boolean(lastVoiceTask.important);

  showTab("add");
  showToast("Voice task moved to Add Task.");
}

function parseNaturalTask(input) {
  const original = input.trim();
  let text = original
    .toLowerCase()
    .replace(/[.,!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  let due = "";
  let time = "";
  let priority = "normal";
  let category = settings.defaultCategory || "General";
  let repeat = "none";
  let reminder = settings.defaultReminder || "off";
  const tags = ["voice"];

  if (/\b(urgent|asap|right away|immediately)\b/.test(text)) priority = "urgent";
  else if (/\b(high priority|important)\b/.test(text)) priority = "high";

  if (/\b(work|job)\b/.test(text)) category = "Work";
  else if (/\b(home|house|chore|chores|dishes|laundry|trash)\b/.test(text)) category = "Home";
  else if (/\b(game|gaming|daily rewards|guild|alliance)\b/.test(text)) category = "Gaming";
  else if (/\b(errand|store|pickup|pick up|shopping)\b/.test(text)) category = "Errands";

  if (/\b(every day|daily)\b/.test(text)) repeat = "daily";
  else if (/\b(every week|weekly)\b/.test(text)) repeat = "weekly";
  else if (/\b(every month|monthly)\b/.test(text)) repeat = "monthly";

  const parsedDate = parseSpokenDate(text);
  if (parsedDate) due = parsedDate;

  const parsedTime = parseSpokenTime(text);
  if (parsedTime) time = parsedTime;

  if (!due && /\btonight\b/.test(text)) due = todayIso();
  if (!time && /\btonight\b/.test(text)) time = "20:00";

  if (time && reminder === "off") reminder = "0";

  let title = cleanSpokenTitle(text);

  const haveDone = title.match(/\bhave\s+(?:the\s+)?(.+?)\s+done\b/);
  if (haveDone && haveDone[1]) {
    title = `do the ${haveDone[1].replace(/^the\s+/, "")}`;
  }

  title = title
    .replace(/\bby\s+(noon|midnight|\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/g, "")
    .replace(/\bat\s+(noon|midnight|\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/g, "")
    .replace(/\b(today|tomorrow|tonight|this morning|this afternoon|this evening|next week)\b/g, "")
    .replace(/\b(on|by|this|next)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/g, "")
    .replace(/\bin\s+\d+\s+(minutes?|mins?|hours?|hrs?|days?)\b/g, "")
    .replace(/\b(high priority|urgent|important|asap|work task|home task|gaming task|errand task)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  title = title || original;
  title = title.charAt(0).toUpperCase() + title.slice(1);

  return {
    title,
    notes: `Created from voice: "${original}"`,
    category,
    priority,
    due,
    time,
    reminder,
    repeat,
    tags,
    energy: "normal",
    subtasks: [],
    pinned: false,
    important: priority === "high" || priority === "urgent"
  };
}

function cleanSpokenTitle(text) {
  return text
    .replace(/^(hey|okay|ok|um|uh|so|please)\s+/g, "")
    .replace(/\b(hey|um|uh|please)\b/g, "")
    .replace(/\b(i need to|i need|need to|i gotta|i have to|gotta|remind me to|remind me|add a task to|add task to|add task|create a task to|create task to|make a task to|set a reminder to|set reminder to)\b/g, "")
    .replace(/\bfor me\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSpokenDate(text) {
  if (/\btoday\b/.test(text)) return todayIso();
  if (/\btomorrow\b/.test(text)) return addDaysIso(1);

  const inDays = text.match(/\bin\s+(\d+)\s+days?\b/);
  if (inDays) return addDaysIso(Number(inDays[1]));

  const weekdays = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  };

  const weekdayMatch = text.match(/\b(?:on\s+|by\s+|this\s+|next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (weekdayMatch) {
    const target = weekdays[weekdayMatch[1]];
    const now = new Date();
    const result = new Date();
    let diff = target - now.getDay();
    if (diff <= 0 || text.includes(`next ${weekdayMatch[1]}`)) diff += 7;
    result.setDate(now.getDate() + diff);
    return toIsoDate(result);
  }

  if (/\btonight|this morning|this afternoon|this evening\b/.test(text)) return todayIso();

  return "";
}

function parseSpokenTime(text) {
  if (/\bnoon\b/.test(text)) return "12:00";
  if (/\bmidnight\b/.test(text)) return "00:00";

  const relative = text.match(/\bin\s+(\d+)\s+(minutes?|mins?|hours?|hrs?)\b/);
  if (relative) {
    const amount = Number(relative[1]);
    const unit = relative[2];
    const date = new Date();
    if (unit.startsWith("hour") || unit.startsWith("hr")) date.setHours(date.getHours() + amount);
    else date.setMinutes(date.getMinutes() + amount);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  const match = text.match(/\b(?:by|at|around|before)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (!match) return "";

  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3];

  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;

  if (!meridiem && hour >= 1 && hour <= 7) hour += 12;

  if (hour > 23 || minute > 59) return "";

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function addDaysIso(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}


function renderGooglePanel() {
  if (!els.googleTaskList || !els.googleSummary) return;

  const dueTasks = tasks
    .filter(task => !task.done && task.due)
    .sort((a, b) => {
      const aDate = a.time ? parseTaskDateTime(a) : parseLocalDate(a.due);
      const bDate = b.time ? parseTaskDateTime(b) : parseLocalDate(b.due);
      return aDate - bDate;
    });

  els.googleTaskList.innerHTML = "";
  els.googleSummary.textContent = dueTasks.length
    ? `${dueTasks.length} due ${dueTasks.length === 1 ? "task" : "tasks"} can be sent to Google.`
    : "No due tasks yet.";

  if (!dueTasks.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = "<h3>No due tasks yet</h3><p>Add a due date to a task, then it will appear here.</p>";
    els.googleTaskList.appendChild(empty);
    return;
  }

  for (const task of dueTasks) {
    const card = document.createElement("article");
    card.className = "reminder-card";

    const left = document.createElement("div");
    const title = document.createElement("h3");
    title.className = "reminder-title";
    title.textContent = task.title;

    const meta = document.createElement("p");
    meta.className = "reminder-meta";
    meta.textContent = metaLine(task) || dueLabel(task);

    const note = document.createElement("p");
    note.className = "google-note";
    note.textContent = "Choose Calendar for a Google event draft, .ics for a calendar file, or Email for a message draft.";

    left.append(title, meta, note);

    const actions = document.createElement("div");
    actions.className = "calendar-actions";
    actions.append(
      actionButton("Calendar", () => openGoogleCalendarTask(task.id)),
      actionButton(".ics", () => downloadTaskIcs(task.id)),
      actionButton("Email", () => emailTask(task.id)),
      actionButton("Edit", () => openEdit(task.id))
    );

    card.append(left, actions);
    els.googleTaskList.appendChild(card);
  }
}

function openGoogleCalendarTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  if (!task.due) {
    showToast("Add a due date before sending this task to Calendar.");
    return;
  }

  window.open(googleCalendarUrl(task), "_blank", "noopener,noreferrer");
}

function googleCalendarUrl(task) {
  const { start, end, allDay } = calendarRange(task);
  const params = new URLSearchParams();
  params.set("action", "TEMPLATE");
  params.set("text", task.title || "Checklist task");
  params.set("details", googleDetails(task));

  if (allDay) {
    params.set("dates", `${yyyymmdd(start)}/${yyyymmdd(end)}`);
  } else {
    params.set("dates", `${googleDateTime(start)}/${googleDateTime(end)}`);
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone) params.set("ctz", zone);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function googleDetails(task) {
  const lines = [];
  if (task.notes) lines.push(task.notes);
  if (task.category) lines.push(`List: ${task.category}`);
  if (task.priority) lines.push(`Priority: ${task.priority}`);
  if (task.energy && task.energy !== "normal") lines.push(`Energy: ${task.energy}`);
  if (task.tags && task.tags.length) lines.push(`Tags: ${task.tags.map(tag => `#${tag}`).join(" ")}`);
  if (task.subtasks && task.subtasks.length) {
    lines.push("");
    lines.push("Steps:");
    for (const step of task.subtasks) lines.push(`${step.done ? "✓" : "☐"} ${step.text}`);
  }
  lines.push("");
  lines.push("Created in Private Checklist.");
  return lines.join("\n");
}

function downloadTaskIcs(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  if (!task.due) {
    showToast("Add a due date before exporting this task.");
    return;
  }

  downloadIcsFile([task], safeFileName(task.title || "checklist-task") + ".ics");
}

function downloadIcsFile(taskList, filename) {
  const ics = icsFromTasks(taskList);
  downloadTextFile(ics, filename, "text/calendar;charset=utf-8");
  showToast("Calendar file downloaded.");
}

function icsFromTasks(taskList) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Private Checklist//Calendar Export//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...taskList.map(icsEvent),
    "END:VCALENDAR"
  ].join("\r\n");
}

function icsEvent(task) {
  const { start, end, allDay } = calendarRange(task);
  const lines = [
    "BEGIN:VEVENT",
    `UID:${icsEscape(task.id || makeId())}@private-checklist`,
    `DTSTAMP:${utcIcsDateTime(new Date())}`,
    `SUMMARY:${icsEscape(task.title || "Checklist task")}`,
    `DESCRIPTION:${icsEscape(googleDetails(task))}`,
    `CATEGORIES:${icsEscape(task.category || "Checklist")}`
  ];

  if (allDay) {
    lines.push(`DTSTART;VALUE=DATE:${yyyymmdd(start)}`);
    lines.push(`DTEND;VALUE=DATE:${yyyymmdd(end)}`);
  } else {
    lines.push(`DTSTART:${utcIcsDateTime(start)}`);
    lines.push(`DTEND:${utcIcsDateTime(end)}`);
  }

  if (task.reminder !== "off") {
    lines.push("BEGIN:VALARM");
    lines.push(`TRIGGER:-PT${Number(task.reminder) || 0}M`);
    lines.push("ACTION:DISPLAY");
    lines.push(`DESCRIPTION:${icsEscape(task.title || "Checklist reminder")}`);
    lines.push("END:VALARM");
  }

  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

function calendarRange(task) {
  if (!task.due) {
    const start = new Date();
    const end = new Date(start.getTime() + 30 * 60000);
    return { start, end, allDay: false };
  }

  if (!task.time) {
    const start = parseLocalDate(task.due);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end, allDay: true };
  }

  const start = parseTaskDateTime(task);
  const end = new Date(start.getTime() + 30 * 60000);
  return { start, end, allDay: false };
}

function emailTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  const subject = `Reminder: ${task.title}`;
  const body = googleDetails(task);
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function googleDateTime(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    "T",
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    "00"
  ].join("");
}

function utcIcsDateTime(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function yyyymmdd(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("");
}

function icsEscape(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function safeFileName(value) {
  return String(value || "checklist-task")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "checklist-task";
}

function downloadTextFile(text, filename, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function makeBadge(text, variant = "") {
  const span = document.createElement("span");
  span.className = `badge ${variant}`;
  span.textContent = text;
  return span;
}

function parseTags(value) {
  if (Array.isArray(value)) return value.map(tag => String(tag).trim()).filter(Boolean);
  return String(value || "")
    .split(",")
    .map(tag => tag.trim().replace(/^#/, ""))
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
    const existing = oldSubtasks.find(step => step.text === text);
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

  const [, month, day] = task.due.split("-");
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

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
