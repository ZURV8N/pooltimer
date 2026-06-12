const RED = [7, 27, 47];
const BLACK = [17, 37, 57];

function getSchedule(mode) {
  return mode === "red" ? RED : BLACK;
}

function getCurrentBlock(mode, now = new Date()) {
  const schedule = getSchedule(mode);

  let start = null;
  let end = null;

  // find previous rotation
  for (let i = 0; i < 24 * 60; i++) {
    const test = new Date(now.getTime() - i * 60000);

    if (schedule.includes(test.getMinutes())) {
      start = new Date(test);
      start.setSeconds(0, 0);
      break;
    }
  }

  // find next rotation
  for (let i = 1; i < 24 * 60; i++) {
    const test = new Date(now.getTime() + i * 60000);

    if (schedule.includes(test.getMinutes())) {
      end = new Date(test);
      end.setSeconds(0, 0);
      break;
    }
  }

  return { start, end };
}

function getNextRotation(mode, now = new Date()) {
  return getCurrentBlock(mode, now).end;
}

function getSecondsRemaining(mode, now = new Date()) {
  const next = getNextRotation(mode, now);

  return Math.max(
    0,
    Math.floor((next.getTime() - now.getTime()) / 1000)
  );
}

function getProgress(mode, now = new Date()) {
  const block = getCurrentBlock(mode, now);

  const total = block.end.getTime() - block.start.getTime();
  const elapsed = now.getTime() - block.start.getTime();

  if (!total || total <= 0) return 0;

  return Math.min(1, Math.max(0, elapsed / total));
}

function formatCountdown(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    String(minutes).padStart(2, "0") +
    ":" +
    String(secs).padStart(2, "0")
  );
}

module.exports = {
  getSchedule,
  getCurrentBlock,
  getNextRotation,
  getSecondsRemaining,
  getProgress,
  formatCountdown
};