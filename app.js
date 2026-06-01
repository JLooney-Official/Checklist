const STORAGE_KEY = "joshsChecklist.tasks.v1";

const els = {
  form: document.querySelector("#taskForm"),
  title: document.querySelector("#taskTitle"),
  notes: document.querySelector("#taskNotes"),
  category: document.querySelector("#taskCategory"),
  priority: document.querySelector("#taskPriority"),
  due: document.querySelector("#taskDue"),
  repeats: document.querySelector("#taskRepeats"),
  list: document.querySelector("#taskList"),
  empty: document.querySelector("#emptyState"),
  search: document.querySelector("#searchInput"),
  status: document.querySelector("#filterStatus"),
  categoryFilter: document.querySelector("#filterCategory"),
  doneCount: document.querySelector("#doneCount"),
  openCount: document.querySelector("#openCount"),
  todayCount: document.querySelector("#todayCount"),
  clearDone: document.querySelector("#clearDoneBtn"),
  resetDaily: document.querySelector("#resetDailyBtn"),
  toast: document.querySelector("#toast"),
  installBtn: document.querySelector("#installBtn"),
  editDialog: document.querySelector("#editDialog"),
  editForm: document.querySelector("#editForm"),
  editId: document.querySelector("#editId"),
  editTitle: document.querySelector("#editTitle"),
  editNotes: document.querySelector("#editNotes"),
  editCategory: document.querySelector("#editCategory"),
  editPriority: document.querySelector("#editPriority"),
  editDue: document.querySelector("#editDue"),
  editRepeats: document.querySelector("#editRepeats"),
  cancelEdit: document.querySelector("#cancelEditBtn")
};

let tasks = loadTasks();
let deferredPrompt = null;

seedDemoTasks();
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

  const task = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    title: els.title.value.trim(),
    notes: els.notes.value.trim(),
    category: els.category.value,
    priority: els.priority.value,
    due: els.due.value,
    repeatsDaily: els.repeats.checked,
    done: false,
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  if (!task.title) return;

  tasks.unshift(task);
  saveTasks();
  els.form.reset();
  els.priority.value = "normal";
  showToast("Task added.");
  render();
});

els.search.addEventListener("input", render);
els.status.addEventListener("change", render);
els.categoryFilter.addEventListener("change", render);

els.clearDone.addEventListener("click", () => {
  const completed = tasks.filter(t => t.done).length;
  if (!completed) {
    showToast("No completed tasks to clear.");
    return;
  }

  if (confirm(`Clear ${completed} completed task(s)?`)) {
    tasks = tasks.filter(t => !t.done);
    saveTasks();
    render();
    showToast("Completed tasks cleared.");
  }
});

els.resetDaily.addEventListener("click", () => {
  const dailyTasks = tasks.filter(t => t.repeatsDaily);
  if (!dailyTasks.length) {
    showToast("No daily reset tasks yet.");
    return;
  }

  tasks = tasks.map(task => task.repeatsDaily ? { ...task, done: false, completedAt: null } : task);
  saveTasks();
  render();
  showToast("Daily tasks reset.");
});

els.editForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const id = els.editId.value;
  tasks = tasks.map(task => {
    if (task.id !== id) return task;
    return {
      ...task,
      title: els.editTitle.value.trim(),
      notes: els.editNotes.value.trim(),
      category: els.editCategory.value.trim() || "General",
      priority: els.editPriority.value,
      due: els.editDue.value,
      repeatsDaily: els.editRepeats.checked
    };
  });

  saveTasks();
  els.editDialog.close();
  render();
  showToast("Task updated.");
});

els.cancelEdit.addEventListener("click", () => els.editDialog.close());

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function seedDemoTasks() {
  if (tasks.length) return;

  tasks = [
    {
      id: "demo-1",
      title: "Test adding, checking, editing, and deleting tasks",
      notes: "This demo task is here so the app is not empty on first launch.",
      category: "General",
      priority: "normal",
      due: todayIso(),
      repeatsDaily: false,
      done: false,
      createdAt: new Date().toISOString(),
      completedAt: null
    },
    {
      id: "demo-2",
      title: "Daily reset example",
      notes: "Tap Reset daily and this task becomes unchecked again.",
      category: "Daily",
      priority: "high",
      due: "",
      repeatsDaily: true,
      done: false,
      createdAt: new Date().toISOString(),
      completedAt: null
    }
  ];
  saveTasks();
}

function render() {
  updateCategoryFilters();
  updateStats();

  const filtered = getFilteredTasks();
  els.list.innerHTML = "";

  if (!filtered.length) {
    els.empty.classList.remove("hidden");
    return;
  }

  els.empty.classList.add("hidden");

  for (const task of filtered) {
    const item = document.createElement("article");
    item.className = `task-item ${task.done ? "done" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.className = "task-check";
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.setAttribute("aria-label", `Mark ${task.title} ${task.done ? "open" : "done"}`);
    checkbox.addEventListener("change", () => toggleTask(task.id));

    const body = document.createElement("div");
    body.className = "task-body";

    const title = document.createElement("p");
    title.className = "task-title";
    title.textContent = task.title;
    body.appendChild(title);

    if (task.notes) {
      const notes = document.createElement("p");
      notes.className = "task-notes";
      notes.textContent = task.notes;
      body.appendChild(notes);
    }

    const badges = document.createElement("div");
    badges.className = "badges";
    badges.appendChild(makeBadge(task.category));
    badges.appendChild(makeBadge(task.priority, task.priority));

    if (task.due) {
      badges.appendChild(makeBadge(dueLabel(task.due), isOverdue(task) ? "overdue" : ""));
    }

    if (task.repeatsDaily) {
      badges.appendChild(makeBadge("Daily reset"));
    }

    body.appendChild(badges);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "icon-btn";
    editBtn.type = "button";
    editBtn.textContent = "✎";
    editBtn.title = "Edit";
    editBtn.addEventListener("click", () => openEdit(task.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "icon-btn delete";
    deleteBtn.type = "button";
    deleteBtn.textContent = "×";
    deleteBtn.title = "Delete";
    deleteBtn.addEventListener("click", () => deleteTask(task.id));

    actions.append(editBtn, deleteBtn);
    item.append(checkbox, body, actions);
    els.list.appendChild(item);
  }
}

function getFilteredTasks() {
  const query = els.search.value.trim().toLowerCase();
  const status = els.status.value;
  const category = els.categoryFilter.value;

  return tasks.filter(task => {
    const matchesText = !query ||
      task.title.toLowerCase().includes(query) ||
      task.notes.toLowerCase().includes(query) ||
      task.category.toLowerCase().includes(query);

    const matchesCategory = category === "all" || task.category === category;

    const matchesStatus =
      status === "all" ||
      (status === "open" && !task.done) ||
      (status === "done" && task.done) ||
      (status === "today" && task.due === todayIso()) ||
      (status === "daily" && task.repeatsDaily);

    return matchesText && matchesCategory && matchesStatus;
  }).sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const priorityScore = { high: 0, normal: 1, low: 2 };
    return priorityScore[a.priority] - priorityScore[b.priority];
  });
}

function updateStats() {
  const done = tasks.filter(t => t.done).length;
  const open = tasks.filter(t => !t.done).length;
  const today = tasks.filter(t => t.due === todayIso() && !t.done).length;

  els.doneCount.textContent = done;
  els.openCount.textContent = open;
  els.todayCount.textContent = today;
}

function updateCategoryFilters() {
  const current = els.categoryFilter.value;
  const categories = [...new Set(tasks.map(t => t.category).filter(Boolean))].sort();

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

function makeBadge(text, variant = "") {
  const span = document.createElement("span");
  span.className = `badge ${variant}`;
  span.textContent = text;
  return span;
}

function toggleTask(id) {
  tasks = tasks.map(task => {
    if (task.id !== id) return task;
    const done = !task.done;
    return {
      ...task,
      done,
      completedAt: done ? new Date().toISOString() : null
    };
  });
  saveTasks();
  render();
}

function deleteTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  if (confirm(`Delete "${task.title}"?`)) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    render();
    showToast("Task deleted.");
  }
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
  els.editRepeats.checked = task.repeatsDaily;

  els.editDialog.showModal();
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isOverdue(task) {
  return Boolean(task.due && task.due < todayIso() && !task.done);
}

function dueLabel(dateValue) {
  if (dateValue === todayIso()) return "Due today";
  if (dateValue < todayIso()) return "Overdue";
  const [year, month, day] = dateValue.split("-");
  return `Due ${month}/${day}`;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    els.toast.classList.add("hidden");
  }, 2200);
}
