(() => {
  const STORAGE_KEY = "privateChecklist.tasks.v5";

  let draftTask = null;
  let recognition = null;

  const $ = selector => document.querySelector(selector);

  const fields = {
    badge: "#voiceBadge",
    status: "#voiceStatus",
    details: "#voiceDetails",
    transcript: "#voiceTranscript",
    title: "#voicePreviewTitle",
    due: "#voicePreviewDue",
    time: "#voicePreviewTime",
    category: "#voicePreviewCategory",
    priority: "#voicePreviewPriority",
    reminder: "#voicePreviewReminder",
    debug: "#voiceDebugLog"
  };

  function el(name) {
    return $(fields[name]);
  }

  function init() {
    bind("#focusDictationBtn", focusDictation);
    bind("#parseVoiceBtn", parseAndPreview);
    bind("#clearVoiceBtn", clearVoice);
    bind("#createVoiceTaskBtn", createTask);
    bind("#sendVoiceToAddBtn", sendToAddForm);
    bind("#startVoiceBtn", startBrowserVoice);
    bind("#stopVoiceBtn", stopBrowserVoice);
    bind("#checkMicBtn", checkMic);

    document.querySelectorAll("[data-voice-example]").forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        el("transcript").value = button.dataset.voiceExample || "";
        parseAndPreview(event);
      }, true);
    });

    const transcript = el("transcript");
    if (transcript) {
      transcript.addEventListener("input", () => {
        if (transcript.value.trim()) parseAndPreview(null, false);
      });
    }

    setState("good", "Ready", "Voice parser ready.", "Use keyboard mic, then tap Parse task.");
    log("Voice parser loaded.");
  }

  function bind(selector, handler) {
    const node = $(selector);
    if (!node) return;
    node.addEventListener("click", event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      handler(event);
    }, true);
  }

  function focusDictation(event) {
    const box = el("transcript");
    if (!box) return;

    box.focus();
    setState("good", "Keyboard mic", "Text box focused.", "Tap your Android keyboard microphone, speak, then tap Parse task.");
    log("Focused transcript box for keyboard dictation.");
  }

  async function checkMic() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setState("warn", "Keyboard mic", "Browser mic check is not available.", "Use the Android keyboard microphone in the text box.");
      log("getUserMedia unavailable.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setState("good", "Mic allowed", "Microphone permission works.", "Keyboard mic mode is still recommended.");
      log("Microphone permission check passed.");
    } catch (error) {
      setState("bad", "Mic blocked", "Browser microphone access failed.", error.name || error.message || "Permission was not granted.");
      log(`Microphone check failed: ${error.name || error.message || error}`);
    }
  }

  function startBrowserVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setState("warn", "Keyboard mic", "Browser listening is not supported here.", "Use the Android keyboard microphone in the text box.");
      log("SpeechRecognition API not available.");
      focusDictation();
      return;
    }

    try {
      if (recognition) recognition.stop();

      recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      let finalText = "";

      recognition.onstart = () => {
        setState("warn", "Listening", "Browser listening started.", "Speak now. If this does not capture text, use keyboard mic mode.");
        log("Browser listening started.");
      };

      recognition.onresult = event => {
        let interim = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalText += text + " ";
          else interim += text;
        }

        const box = el("transcript");
        box.value = (finalText + interim).trim();
        parseAndPreview(null, false);
        log(`Captured: ${box.value || "(empty)"}`);
      };

      recognition.onerror = event => {
        setState("bad", "Voice error", "Browser listening failed.", `Error: ${event.error || "unknown"}. Use keyboard mic mode instead.`);
        log(`Browser listening error: ${event.error || "unknown"}`);
      };

      recognition.onend = () => {
        parseAndPreview(null, Boolean(el("transcript")?.value.trim()));
        setState("good", "Ready", "Browser listening ended.", "Review the preview, or use keyboard mic mode for another task.");
        log("Browser listening ended.");
      };

      recognition.start();
    } catch (error) {
      setState("bad", "Start failed", "Browser listening could not start.", error.message || "Use keyboard mic mode instead.");
      log(`Browser listening start failed: ${error.message || error}`);
    }
  }

  function stopBrowserVoice() {
    if (recognition) {
      recognition.stop();
      recognition = null;
      log("Browser listening stopped.");
    } else {
      log("Stop pressed; browser listening was not active.");
    }
    parseAndPreview(null, false);
  }

  function parseAndPreview(event, showToast = true) {
    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    const text = el("transcript")?.value.trim() || "";

    if (!text) {
      draftTask = null;
      showPreview(null);
      setState("warn", "No text", "There is nothing to parse yet.", "Use keyboard mic or type a task first.");
      if (showToast) toast("No voice text to parse yet.");
      return;
    }

    draftTask = parseTask(text);
    showPreview(draftTask);
    setState("good", "Parsed", "Task parsed successfully.", "Review the preview, then tap Create task.");
    log(`Parsed task: ${draftTask.title}`);
    if (showToast) toast("Voice text parsed.");
  }

  function clearVoice(event) {
    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    const box = el("transcript");
    if (box) box.value = "";

    draftTask = null;
    showPreview(null);
    setState("good", "Ready", "Voice text cleared.", "Use keyboard mic, then tap Parse task.");
    log("Cleared voice text.");
  }

  function createTask(event) {
    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    if (!draftTask) parseAndPreview(null, false);

    if (!draftTask || !draftTask.title) {
      toast("Parse a task first.");
      return;
    }

    if (typeof window.addTaskObject === "function") {
      window.addTaskObject(draftTask);
    } else {
      saveTaskFallback(draftTask);
    }

    const box = el("transcript");
    if (box) box.value = "";

    draftTask = null;
    showPreview(null);

    if (typeof window.showTab === "function") window.showTab("tasks");
    toast("Voice task created.");
    log("Created voice task.");
  }

  function sendToAddForm(event) {
    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    if (!draftTask) parseAndPreview(null, false);

    if (!draftTask) {
      toast("Parse a task first.");
      return;
    }

    setValue("#taskTitle", draftTask.title);
    setValue("#taskNotes", draftTask.notes);
    setValue("#taskCategory", draftTask.category);
    setValue("#taskPriority", draftTask.priority);
    setValue("#taskDue", draftTask.due);
    setValue("#taskTime", draftTask.time);
    setValue("#taskReminder", draftTask.reminder);
    setValue("#taskRepeat", draftTask.repeat);
    setValue("#taskTags", (draftTask.tags || []).join(", "));
    setValue("#taskEnergy", draftTask.energy);

    const important = $("#taskImportant");
    if (important) important.checked = Boolean(draftTask.important);

    if (typeof window.showTab === "function") window.showTab("add");
    toast("Moved to Add Task.");
  }

  function setValue(selector, value) {
    const node = $(selector);
    if (node) node.value = value || "";
  }

  function showPreview(task) {
    setText("title", task?.title || "—");
    setText("due", task?.due || "—");
    setText("time", task?.time || "—");
    setText("category", task?.category || "—");
    setText("priority", task?.priority || "—");
    setText("reminder", task ? reminderText(task.reminder) : "—");
  }

  function setText(name, value) {
    const node = el(name);
    if (node) node.textContent = value;
  }

  function setState(kind, badge, status, details) {
    const badgeNode = el("badge");
    if (badgeNode) {
      badgeNode.className = `status-badge ${kind}`;
      badgeNode.textContent = badge;
    }

    if (el("status")) el("status").textContent = status;
    if (el("details")) el("details").textContent = details;
  }

  function log(message) {
    const node = el("debug");
    if (!node) return;
    const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    node.textContent = `[${stamp}] ${message}`;
  }

  function toast(message) {
    if (typeof window.showToast === "function") {
      window.showToast(message);
      return;
    }

    const node = $("#toast");
    if (!node) return;

    node.textContent = message;
    node.classList.remove("hidden");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.add("hidden"), 2400);
  }

  function parseTask(input) {
    const original = input.trim();
    let text = original
      .toLowerCase()
      .replace(/[.,!?]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const due = parseDate(text);
    const time = parseTime(text);
    const priority = parsePriority(text);
    const category = parseCategory(text);
    const repeat = parseRepeat(text);
    const reminder = time ? "0" : "off";

    let title = cleanTitle(text);

    const haveDone = title.match(/\bhave\s+(?:the\s+)?(.+?)\s+done\b/);
    if (haveDone && haveDone[1]) {
      title = `do the ${haveDone[1].replace(/^the\s+/, "")}`;
    }

    title = stripScheduleWords(title)
      .replace(/\s+/g, " ")
      .trim();

    title = title || original;
    title = title.charAt(0).toUpperCase() + title.slice(1);

    return {
      id: makeId(),
      title,
      notes: `Created from voice: "${original}"`,
      category,
      priority,
      due,
      time,
      reminder,
      repeat,
      tags: ["voice"],
      energy: "normal",
      subtasks: [],
      pinned: false,
      important: priority === "high" || priority === "urgent",
      done: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
      reminderSentKey: null,
      lastResetKey: resetKey(repeat),
      manualOrder: Date.now()
    };
  }

  function cleanTitle(text) {
    return text
      .replace(/^(hey|okay|ok|um|uh|so|please)\s+/g, "")
      .replace(/\b(hey|um|uh|please|like)\b/g, "")
      .replace(/\b(i need to|i need|need to|i gotta|i have to|gotta|remind me to|remind me|add a task to|add task to|add task|create a task to|create task to|make a task to|set a reminder to|set reminder to)\b/g, "")
      .replace(/\bfor me\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function stripScheduleWords(text) {
    return text
      .replace(/\bby\s+(noon|midnight|\d{1,2}(?::\d{2})?\s*(?:a\s*m|p\s*m|am|pm)?)\b/g, "")
      .replace(/\bat\s+(noon|midnight|\d{1,2}(?::\d{2})?\s*(?:a\s*m|p\s*m|am|pm)?)\b/g, "")
      .replace(/\b(today|tomorrow|tonight|this morning|this afternoon|this evening|next week)\b/g, "")
      .replace(/\b(on|by|this|next)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/g, "")
      .replace(/\bin\s+\d+\s+(minutes?|mins?|hours?|hrs?|days?)\b/g, "")
      .replace(/\b(high priority|urgent|important|asap|work task|home task|gaming task|errand task)\b/g, "");
  }

  function parsePriority(text) {
    if (/\b(urgent|asap|right away|immediately)\b/.test(text)) return "urgent";
    if (/\b(high priority|important)\b/.test(text)) return "high";
    return "normal";
  }

  function parseCategory(text) {
    if (/\b(work|job|report|email|meeting)\b/.test(text)) return "Work";
    if (/\b(home|house|chore|chores|dishes|dishwasher|laundry|trash|clean|vacuum)\b/.test(text)) return "Home";
    if (/\b(game|gaming|daily rewards|guild|alliance)\b/.test(text)) return "Gaming";
    if (/\b(errand|store|pickup|pick up|shopping|groceries)\b/.test(text)) return "Errands";
    return "General";
  }

  function parseRepeat(text) {
    if (/\b(every day|daily)\b/.test(text)) return "daily";
    if (/\b(every week|weekly)\b/.test(text)) return "weekly";
    if (/\b(every month|monthly)\b/.test(text)) return "monthly";
    return "none";
  }

  function parseDate(text) {
    if (/\btoday\b/.test(text)) return todayIso();
    if (/\btomorrow\b/.test(text)) return addDaysIso(1);
    if (/\btonight|this morning|this afternoon|this evening\b/.test(text)) return todayIso();

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

    const weekday = text.match(/\b(?:on\s+|by\s+|this\s+|next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
    if (!weekday) return "";

    const target = weekdays[weekday[1]];
    const now = new Date();
    const date = new Date();
    let diff = target - now.getDay();

    if (diff <= 0 || text.includes(`next ${weekday[1]}`)) diff += 7;

    date.setDate(now.getDate() + diff);
    return toIsoDate(date);
  }

  function parseTime(text) {
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

    const match = text.match(/\b(?:by|at|around|before)\s+(\d{1,2})(?::(\d{2}))?\s*(a\s*m|p\s*m|am|pm)?\b/);
    if (!match) return "";

    let hour = Number(match[1]);
    const minute = match[2] ? Number(match[2]) : 0;
    const meridiem = match[3] ? match[3].replace(/\s+/g, "") : "";

    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    if (!meridiem && hour >= 1 && hour <= 7) hour += 12;
    if (hour > 23 || minute > 59) return "";

    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  function reminderText(value) {
    if (!value || value === "off") return "No reminder";
    if (value === "0") return "At due time";
    return `${value} min before`;
  }

  function saveTaskFallback(task) {
    let tasks = [];

    try {
      tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      tasks = [];
    }

    tasks.unshift(task);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    setTimeout(() => location.reload(), 400);
  }

  function makeId() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function resetKey(repeat) {
    if (repeat === "daily") return todayIso();

    const now = new Date();

    if (repeat === "monthly") {
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }

    if (repeat === "weekly") {
      const first = new Date(now.getFullYear(), 0, 1);
      const days = Math.floor((now - first) / 86400000);
      const week = Math.ceil((days + first.getDay() + 1) / 7);
      return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
    }

    return "none";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
