let leaderboardState = [
  { name: "", score: 0 },
  { name: "", score: 0 },
  { name: "", score: 0 },
  { name: "", score: 0 }
];

let isEditingLeaderboard = false;

/* ================= LOAD STATUS ================= */

async function loadStatus() {
  const res = await fetch("/api/status");
  const data = await res.json();

  document.getElementById("currentMode").innerHTML =
    `Current Mode: <b>${data.mode.toUpperCase()}</b>`;

  renderReminders(data.reminders || []);

  /* ---------------- MESSAGE (SAFE UPDATE) ---------------- */
  const msgBox = document.getElementById("announcementText");

  if (document.activeElement !== msgBox) {
    msgBox.value = data.message || "";
  }

  /* ---------------- LEADERBOARD (SAFE UPDATE) ---------------- */
  if (!isEditingLeaderboard) {
    renderLeaderboard(data.leaderboard || []);
  }
}

/* ================= MODE ================= */

async function setMode(mode) {
  await fetch("/api/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode })
  });

  loadStatus();
}

/* ================= REMINDERS ================= */

async function addReminder() {
  const title = document.getElementById("title").value;
  const time = document.getElementById("time").value;

  await fetch("/api/reminders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, time })
  });

  document.getElementById("title").value = "";
  document.getElementById("time").value = "";

  loadStatus();
}

async function deleteReminder(id) {
  await fetch(`/api/reminders/${id}`, {
    method: "DELETE"
  });

  loadStatus();
}

function renderReminders(reminders) {
  const container = document.getElementById("reminderList");
  container.innerHTML = "";

  reminders.forEach(r => {
    const div = document.createElement("div");
    div.className = "reminder";

    let label = r.title + " @ " + r.time;

    if (r.isActive) label += " (ACTIVE)";
    else if (r.isUpcoming) label += " (UPCOMING)";

    div.innerHTML = `
      <div>${label}</div>
      <button onclick="deleteReminder('${r.id}')">Delete</button>
    `;

    container.appendChild(div);
  });
}

/* ================= TEST ROTATION ================= */

async function testRotation() {
  await fetch("/api/admin/test-rotation", { method: "POST" });
  alert("Rotation test triggered");
}

/* ================= LEADERBOARD ================= */

async function saveLeaderboard(leaderboard) {
  await fetch("/api/admin/leaderboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ leaderboard })
  });
}

function renderLeaderboard(leaderboard) {
  leaderboardState = JSON.parse(JSON.stringify(leaderboard || []));

  const container = document.getElementById("leaderboard");
  container.innerHTML = "";

  leaderboardState.forEach((team, index) => {
    const row = document.createElement("div");

    row.style.display = "flex";
    row.style.gap = "10px";
    row.style.marginBottom = "6px";

    row.innerHTML = `
      <input
        value="${team.name}"
        onchange="startEditing(); updateTeam(${index}, 'name', this.value)"
      />

      <input
        type="number"
        value="${team.score}"
        onchange="startEditing(); updateTeam(${index}, 'score', this.value)"
      />
    `;

    container.appendChild(row);
  });
}

function updateTeam(index, field, value) {
  if (!leaderboardState[index]) return;

  leaderboardState[index][field] =
    field === "score" ? Number(value) : value;
}

function startEditing() {
  isEditingLeaderboard = true;
}

async function saveLeaderboardFromUI() {
  await saveLeaderboard(leaderboardState);
  isEditingLeaderboard = false;
  alert("Leaderboard saved");
}

/* ================= MESSAGE ================= */

async function saveMessage(message) {
  await fetch("/api/admin/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });
}

async function saveAnnouncementFromUI() {
  const message = document.getElementById("announcementText").value;

  await saveMessage(message);

  alert("Message saved");
}

/* ================= INIT ================= */

loadStatus();
setInterval(loadStatus, 5000);