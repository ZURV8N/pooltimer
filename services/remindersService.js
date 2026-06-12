const { getSchedule } = require("./rotationService");
const { getCurrentBlock } = require("./rotationService");

/**
 * Convert "HH:MM" -> total minutes since midnight
 */
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function getNextScheduleTime(mode, timeStr) {
  const schedule = getSchedule(mode);
  const [h, m] = timeStr.split(":").map(Number);

  const base = new Date();
  base.setHours(h, m, 0, 0);

  // check same day forward
  for (let i = 0; i < schedule.length; i++) {
    const candidate = new Date(base);
    candidate.setMinutes(schedule[i]);

    if (candidate >= base) {
      return candidate;
    }
  }

  // if none found, take first slot next hour
  const next = new Date(base);
  next.setHours(next.getHours() + 1);
  next.setMinutes(schedule[0]);

  return next;
}

/**
 * Enrich reminders with runtime state:
 * - active this rotation block
 * - upcoming within next block(s)
 */
function enrichReminders(reminders, mode, now = new Date()) {
  const currentBlock = getCurrentBlock(mode, now);

  const currentStart = currentBlock.start.getTime();
  const currentEnd = currentBlock.end.getTime();
  const nowTime = now.getTime();

  return reminders.map(r => {
    const [h, m] = r.time.split(":").map(Number);

    const reminderTime = new Date(now);
    reminderTime.setHours(h, m, 0, 0);

    const reminderTimeMs = reminderTime.getTime();

    // ACTIVE = currently inside rotation window
    const isActive =
      reminderTimeMs >= currentStart &&
      reminderTimeMs < currentEnd;

    // UPCOMING = next rotation window
    const isUpcoming =
      !isActive &&
      reminderTimeMs > nowTime &&
      reminderTimeMs - nowTime <= 60 * 60 * 1000;

    return {
      ...r,
      isActive,
      isUpcoming,
      minutesUntilStart: Math.max(
        0,
        Math.floor((reminderTimeMs - nowTime) / 60000)
      )
    };
  });
}

/**
 * Get only active reminders for current rotation
 */
function getActiveReminders(reminders, mode, now = new Date()) {
  return enrichReminders(reminders, mode, now)
    .filter(r => r.isActive);
}

/**
 * Get upcoming reminders (next ~hour window)
 */
function getUpcomingReminders(reminders, mode, now = new Date()) {
  return enrichReminders(reminders, mode, now)
    .filter(r => r.isUpcoming);
}

module.exports = {
  timeToMinutes,
  enrichReminders,
  getActiveReminders,
  getUpcomingReminders
};