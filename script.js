// script.js – Daily Fitness Tracker App

const defaultGoals = {
  pushups: 200,
  pullups: 20,
  squats: 200
};

let goals = { ...defaultGoals };
let activityData = JSON.parse(localStorage.getItem('activityData')) || {};

// ✅ Use local date string instead of UTC
function getTodayStr() {
  const today = new Date();
  return today.getFullYear() + '-' +
         String(today.getMonth() + 1).padStart(2, '0') + '-' +
         String(today.getDate()).padStart(2, '0');
}

const todayStr = getTodayStr();

function saveGoals() {
  goals.pushups = parseInt(document.getElementById('goalPushups').value) || 0;
  goals.pullups = parseInt(document.getElementById('goalPullups').value) || 0;
  goals.squats = parseInt(document.getElementById('goalSquats').value) || 0;
  localStorage.setItem('goals', JSON.stringify(goals));
  updateProgressBars();
  renderCalendar(currentYear, currentMonth);
  updateSummary();
}

function validateDeadHang(value) {
  return /^\d+:\d{2}$/.test(value);
}

function saveTodayEntry(e) {
  e.preventDefault();
  const deadHang = document.getElementById('deadHang').value.trim();
  if (deadHang && !validateDeadHang(deadHang)) {
    alert('Dead Hang must be in mm:ss format (e.g., 1:30)');
    return;
  }

  const newEntry = {
    pushups: parseInt(document.getElementById('pushups').value) || 0,
    pullups: parseInt(document.getElementById('pullups').value) || 0,
    squats: parseInt(document.getElementById('squats').value) || 0,
    deadHang
  };

  const existing = activityData[todayStr] || { pushups: 0, pullups: 0, squats: 0, deadHang: "" };
  const updatedEntry = {
    pushups: existing.pushups + newEntry.pushups,
    pullups: existing.pullups + newEntry.pullups,
    squats: existing.squats + newEntry.squats,
    deadHang: newEntry.deadHang || existing.deadHang
  };

  activityData[todayStr] = updatedEntry;
  localStorage.setItem('activityData', JSON.stringify(activityData));
  updateProgressBars();
  renderCalendar(currentYear, currentMonth);
  updateSummary();
  sendToGoogleSheets(todayStr, updatedEntry);

  document.getElementById('pushups').value = '';
  document.getElementById('pullups').value = '';
  document.getElementById('squats').value = '';
  document.getElementById('deadHang').value = '';
  if ('vibrate' in navigator) navigator.vibrate(200); // UX: Haptic feedback on save
}

function sendToGoogleSheets(date, entry) {
  fetch("https://script.google.com/macros/s/AKfycby6_cBMbcJ4fsBvAfwOJe0gfzhNZWCE7onx5iuAMoUnFFlD2WHRVoMKDWciO4LpAva7/exec", {
    method: "POST",
    mode: "no-cors", // ✅ Added for potential CORS issues
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: date,
      pushups: entry.pushups,
      pullups: entry.pullups,
      squats: entry.squats,
      deadHang: entry.deadHang
    })
  })
  .then(res => res.text())
  .then(msg => console.log("✅ Google Sheets Backup:", msg))
  .catch(err => console.error("❌ Google Sheets Backup Failed:", err));
}

function updateProgressBars() {
  const data = activityData[todayStr] || { pushups: 0, pullups: 0, squats: 0 };

  updateBarWithTotal('progressPushups', data.pushups, goals.pushups);
  updateBarWithTotal('progressPullups', data.pullups, goals.pullups);
  updateBarWithTotal('progressSquats', data.squats, goals.squats);
}

function updateBarWithTotal(id, value, goal) {
  const percent = Math.min((value / goal) * 100, 100);
  const barContainer = document.getElementById(id);
  const bar = barContainer.firstElementChild;
  bar.style.width = `${percent}%`;
  bar.classList.remove('bg-success', 'bg-warning', 'bg-danger');
  if (percent >= 100) bar.classList.add('bg-success');
  else if (percent >= 50) bar.classList.add('bg-warning');
  else bar.classList.add('bg-danger'); // Use classes (add to CSS: .bg-success { background: green; } etc.)

  let label = barContainer.querySelector('.bar-total-label');
  if (!label) {
    label = document.createElement('span');
    label.className = 'bar-total-label';
    barContainer.appendChild(label);
  }
  label.textContent = `${value}/${goal}`;
}

const entryForm = document.querySelector('.entry-inputs');
entryForm.addEventListener('submit', saveTodayEntry);

document.querySelectorAll('.goal-inputs input').forEach(input => {
  input.addEventListener('input', saveGoals); // Changed to 'change' for immediate save
});

const editForm = document.querySelector('#editModal form');
editForm.addEventListener('submit', saveEditEntry);

document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('editModal').classList.add('hidden');
});

function saveEditEntry(e) {
  e.preventDefault();
  const dateStr = document.getElementById('editModal').dataset.date;
  const deadHang = document.getElementById('editDeadHang').value.trim();
  if (deadHang && !validateDeadHang(deadHang)) {
    alert('Dead Hang must be in mm:ss format (e.g., 1:30)');
    return;
  }
  const entry = {
    pushups: parseInt(document.getElementById('editPushups').value) || 0,
    pullups: parseInt(document.getElementById('editPullups').value) || 0,
    squats: parseInt(document.getElementById('editSquats').value) || 0,
    deadHang
  };
  activityData[dateStr] = entry;
  localStorage.setItem('activityData', JSON.stringify(activityData));
  renderCalendar(currentYear, currentMonth);
  updateSummary();
  if (dateStr === todayStr) updateProgressBars();
  sendToGoogleSheets(dateStr, entry);
  document.getElementById('editModal').classList.add('hidden');
}

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

function renderCalendar(year, month) {
  const calendar = document.getElementById('calendar');
  calendar.innerHTML = '';

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let date = new Date(firstDay);
  date.setDate(date.getDate() - firstDay.getDay()); // Start from Sunday

  const monthNames = ["January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"];
  document.getElementById('calendarMonthYear').textContent = `${monthNames[month]} ${year}`;

  // Add navigation buttons (create if not exist)
  let nav = document.querySelector('.calendar-section nav');
  if (!nav) {
    nav = document.createElement('nav');
    nav.innerHTML = `<button id="prevMonth">&lt;</button> <button id="nextMonth">&gt;</button>`;
    document.querySelector('.calendar-section h2').after(nav);
    document.getElementById('prevMonth').addEventListener('click', () => {
      if (month === 0) { month = 11; year--; } else month--;
      renderCalendar(year, month);
    });
    document.getElementById('nextMonth').addEventListener('click', () => {
      if (month === 11) { month = 0; year++; } else month++;
      renderCalendar(year, month);
    });
  }

  while (date < new Date(year, month + 1, 1) || date.getDay() !== 0) {
    const dayBox = document.createElement('div');
    dayBox.className = 'calendar-day';
    const dateStr = date.toISOString().split('T')[0];
    const isCurrentMonth = date.getMonth() === month;

    if (!isCurrentMonth) dayBox.classList.add('other-month'); // Add class for gray (add CSS: .other-month { color: #aaa; })

    if (dateStr === todayStr) dayBox.classList.add('current'); // Sync with CSS

    dayBox.innerHTML = `<div class="date-label">${date.getDate()}</div>`;

    if (activityData[dateStr]) {
      const d = activityData[dateStr];
      const indicators = [
        d.pushups >= goals.pushups ? '✅' : (d.pushups > 0 ? '⚠️' : '❌'),
        d.pullups >= goals.pullups ? '✅' : (d.pullups > 0 ? '⚠️' : '❌'),
        d.squats >= goals.squats ? '✅' : (d.squats > 0 ? '⚠️' : '❌')
      ].map(e => `<span title="Pushups/Pullups/Squats">${e}</span>`).join(''); // Added tooltip
      dayBox.innerHTML += `<div class="emoji-indicators">${indicators}</div>`;
      if (d.deadHang) dayBox.innerHTML += `<div title="Dead Hang">⏱ ${d.deadHang}</div>`;
    }

    dayBox.addEventListener('click', () => openEditModal(dateStr));
    calendar.appendChild(dayBox);
    date.setDate(date.getDate() + 1);
  }
  calendar.style.animation = 'fadeIn 0.5s ease'; // Add CSS @keyframes fadeIn { from {opacity:0;} to {opacity:1;} }
}

function openEditModal(dateStr) {
  const d = activityData[dateStr] || { pushups: 0, pullups: 0, squats: 0, deadHang: "" };
  document.getElementById('editDateLabel').textContent = dateStr;
  document.getElementById('editPushups').value = d.pushups;
  document.getElementById('editPullups').value = d.pullups;
  document.getElementById('editSquats').value = d.squats;
  document.getElementById('editDeadHang').value = d.deadHang;
  document.getElementById('editModal').dataset.date = dateStr;
  document.getElementById('editModal').classList.remove('hidden');
  document.getElementById('editPushups').focus(); // UX: Auto-focus
}

function updateSummary() {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const totals = {
    week: { pushups: 0, pullups: 0, squats: 0, deadHangMax: 0 },
    month: { pushups: 0, pullups: 0, squats: 0, deadHangMax: 0 },
    year: { pushups: 0, pullups: 0, squats: 0, deadHangMax: 0 },
    allTime: { pushups: 0, pullups: 0, squats: 0, deadHangMax: 0 }
  };
  let streak = 0;
  let checkDate = new Date(now);
  checkDate.setHours(0,0,0,0); // Today

  for (const [dateStr, entry] of Object.entries(activityData).sort((a,b) => new Date(b) - new Date(a))) { // Sorted descending
    const date = new Date(dateStr);
    const deadHangSecs = entry.deadHang ? parseInt(entry.deadHang.split(':')[0]) * 60 + parseInt(entry.deadHang.split(':')[1]) : 0;

    if (date >= startOfWeek) addToTotals(totals.week, entry, deadHangSecs);
    if (date >= startOfMonth) addToTotals(totals.month, entry, deadHangSecs);
    if (date >= startOfYear) addToTotals(totals.year, entry, deadHangSecs);
    addToTotals(totals.allTime, entry, deadHangSecs);

    // Streak: consecutive days with all goals met
    if (date.getTime() === checkDate.getTime()) {
      if (entry.pushups >= goals.pushups && entry.pullups >= goals.pullups && entry.squats >= goals.squats) {
        streak++;
      } else {
        break; // Streak broken
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  const formatMaxHang = secs => secs > 0 ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : 'N/A';

  const summaryDiv = document.getElementById('summary');
  summaryDiv.innerHTML = `
    <strong>Week to Date:</strong> Pushups: ${totals.week.pushups}, Pullups: ${totals.week.pullups}, Squats: ${totals.week.squats}, Max Hang: ${formatMaxHang(totals.week.deadHangMax)}<br>
    <strong>Month to Date:</strong> Pushups: ${totals.month.pushups}, Pullups: ${totals.month.pullups}, Squats: ${totals.month.squats}, Max Hang: ${formatMaxHang(totals.month.deadHangMax)}<br>
    <strong>Year to Date:</strong> Pushups: ${totals.year.pushups}, Pullups: ${totals.year.pullups}, Squats: ${totals.year.squats}, Max Hang: ${formatMaxHang(totals.year.deadHangMax)}<br>
    <strong>All Time:</strong> Pushups: ${totals.allTime.pushups}, Pullups: ${totals.allTime.pullups}, Squats: ${totals.allTime.squats}, Max Hang: ${formatMaxHang(totals.allTime.deadHangMax)}<br>
    <strong>Current Streak:</strong> ${streak} days
  `;
  summaryDiv.setAttribute('aria-live', 'polite'); // Accessibility

  // Add export button if not present
  if (!document.getElementById('exportData')) {
    const exportBtn = document.createElement('button');
    exportBtn.id = 'exportData';
    exportBtn.textContent = 'Export Data to CSV';
    exportBtn.addEventListener('click', exportCSV);
    summaryDiv.appendChild(exportBtn);
  }
}

function addToTotals(t, d, deadSec) {
  t.pushups += d.pushups || 0;
  t.pullups += d.pullups || 0;
  t.squats += d.squats || 0;
  t.deadHangMax = Math.max(t.deadHangMax, deadSec);
}

function exportCSV() {
  let csv = 'Date,Pushups,Pullups,Squats,DeadHang\n';
  for (const [date, entry] of Object.entries(activityData)) {
    csv += `${date},${entry.pushups},${entry.pullups},${entry.squats},${entry.deadHang || ''}\n`;
  }
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'fitness-data.csv';
  a.click();
  URL.revokeObjectURL(url);
}

window.addEventListener('DOMContentLoaded', () => {
  const savedGoals = JSON.parse(localStorage.getItem('goals'));
  if (savedGoals) {
    goals = savedGoals;
    document.getElementById('goalPushups').value = goals.pushups;
    document.getElementById('goalPullups').value = goals.pullups;
    document.getElementById('goalSquats').value = goals.squats;
  }
  updateProgressBars();
  renderCalendar(currentYear, currentMonth);
  updateSummary();

  // PWA: Register service worker if supported
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(reg => console.log('SW registered:', reg));
  }
});
