const express = require("express");
const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "data", "state.json");
const CONFIG_PATH = path.join(__dirname, "data", "config.json");
const REMINDERS_PATH = path.join(__dirname, "data", "reminders.json");
const ADMIN_PASSWORD = "AJpool2020"; //

const {
  getCurrentBlock,
  getNextRotation,
  getSecondsRemaining,
  getProgress,
  formatCountdown
} = require("./services/rotationService");

const {
  enrichReminders
} = require("./services/remindersService");

const app = express();

function checkAdminPassword(req) {
  return req.body.password === ADMIN_PASSWORD;
}

/* ================= STATE LOAD ================= */

function loadState() {
  const defaults = {
    leaderboard: [
      { name: "Team A", score: 0 },
      { name: "Team B", score: 0 },
      { name: "Team C", score: 0 },
      { name: "Team D", score: 0 }
    ],
    message: "",
    staffOfWeek: {
      lifeguard: { name: "", image: "" },
      wsi: { name: "", image: "" }
    }
  };

  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const saved = JSON.parse(raw);

    return {
      ...defaults,
      ...saved,
      staffOfWeek: {
        ...defaults.staffOfWeek,
        ...(saved.staffOfWeek || {})
      }
    };
  } catch (e) {
    return defaults;
  }
}

/* NOW SAFE TO LOAD */
let { leaderboard, message, staffOfWeek } = loadState();

/* ================= CONFIG ================= */

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    return { mode: "black" };
  }
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

/* ================= REMINDERS ================= */

function loadReminders() {
  try {
    const raw = fs.readFileSync(REMINDERS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveReminders(reminders) {
  fs.writeFileSync(REMINDERS_PATH, JSON.stringify(reminders, null, 2));
}

/* ================= CORE ================= */

app.use(express.json());
app.use(express.static("public"));

function getSchedule(mode) {
  return mode === "red" ? [7, 27, 47] : [17, 37, 57];
}

function saveState() {
  const data = {
    leaderboard,
    message,
    staffOfWeek
  };

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/* ================= API ================= */

app.get("/api/status", (req, res) => {
  const now = new Date();
  const config = loadConfig();
  const mode = config.mode;

  const reminders = loadReminders();
  const enrichedReminders = enrichReminders(reminders, mode, now);

  const secondsRemaining = getSecondsRemaining(mode, now);

  res.json({
    mode,
    currentTime: now.toISOString(),

    schedule: getSchedule(mode),

    currentBlock: getCurrentBlock(mode, now),
    nextRotation: getNextRotation(mode, now),

    secondsRemaining,
    countdownText: formatCountdown(secondsRemaining),
    progress: getProgress(mode, now),

    leaderboard,
    message,
    reminders: enrichedReminders,
    staffOfWeek
  });
});

/* CONFIG */
app.get("/api/config", (req, res) => {
  res.json(loadConfig());
});

app.post("/api/config", (req, res) => {
  const config = loadConfig();

  if (req.body.mode === "red" || req.body.mode === "black") {
    config.mode = req.body.mode;
    saveConfig(config);
  }

  res.json(config);
});

/* REMINDERS */
app.get("/api/reminders", (req, res) => {
  res.json(loadReminders());
});

app.post("/api/reminders", (req, res) => {
  const reminders = loadReminders();
  const { title, time } = req.body;

  if (!title || !time) {
    return res.status(400).json({ error: "Missing title or time" });
  }

  const newReminder = {
    id: Date.now().toString(),
    title,
    time
  };

  reminders.push(newReminder);
  saveReminders(reminders);

  res.json(newReminder);
});

app.delete("/api/reminders/:id", (req, res) => {
  let reminders = loadReminders();

  reminders = reminders.filter(r => r.id !== req.params.id);

  saveReminders(reminders);

  res.json({ ok: true });
});

/* DISPLAY */
app.get("/display", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "display.html"));
});

/* ADMIN */
app.get("/api/admin", (req, res) => {
  res.json({ leaderboard, message, staffOfWeek });
});

app.post("/api/admin/leaderboard", (req, res) => {
  leaderboard = req.body.leaderboard;
  saveState();
  res.json({ success: true });
});

app.post("/api/admin/message", (req, res) => {
  message = req.body.message || "";
  saveState();
  res.json({ success: true });
});

app.post("/api/admin/staff", (req, res) => {
  staffOfWeek = req.body.staffOfWeek || staffOfWeek;
  saveState();
  res.json({ success: true });
});

/* TEST */
app.post("/api/admin/test-rotation", (req, res) => {
  res.json({
    success: true,
    message: "Rotation test triggered",
    time: new Date().toISOString()
  });
});

app.post("/api/admin/shutdown", (req, res) => {
  if (!checkAdminPassword(req)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  res.json({ success: true });

  setTimeout(() => {
    require("child_process").exec("sudo shutdown -h now");
  }, 500);
});

/* START */
app.listen(3100, () => {
  console.log("PoolTimer running on port 3100");
});