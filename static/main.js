/* =========================================
   main.js — Car Cluster Predictor
   ========================================= */

const form = document.getElementById('predict-form');
const predictBtn = document.getElementById('predict-btn');
const resetBtn = document.getElementById('reset-btn');
const btnText = predictBtn.querySelector('.btn-text');
const btnLoading = predictBtn.querySelector('.btn-loading');

// Result panel elements
const resultEmpty = document.getElementById('result-empty');
const resultContent = document.getElementById('result-content');
const resultError = document.getElementById('result-error');
const errorMessage = document.getElementById('error-message');

// ── Cluster reference cards active highlight ──────────────────────────────
function setActiveCluster(clusterId) {
  document.querySelectorAll('.cluster-ref-card').forEach(c => c.classList.remove('active'));
  const card = document.querySelector(`.cluster-ref-card[data-cluster="${clusterId}"]`);
  if (card) {
    card.classList.add('active');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ── Show/hide panels ──────────────────────────────────────────────────────
function showPanel(which) {
  resultEmpty.classList.toggle('panel-hidden', which !== 'empty');
  resultContent.classList.toggle('panel-hidden', which !== 'content');
  resultError.classList.toggle('panel-hidden', which !== 'error');
}

// ── Field-level error helpers ───────────────────────────────────────────────
const ERROR_MSGS = {
  battery_capacity: 'กรุณาระบุ Battery Capacity เป็นตัวเลข ≥ 0',
  horsepower:       'กรุณาระบุ Horsepower เป็นตัวเลข ≥ 0',
  total_speed:      'กรุณาระบุ Top Speed เป็นตัวเลข ≥ 0',
  zero_to_hundred:  'กรุณาระบุเวลาเร่ง > 0 วินาที',
  cars_prices:      'กรุณาระบุราคา USD เป็นตัวเลข ≥ 0',
  seats:            'กรุณาระบุจำนวนที่นั่ง เป็นตัวเลข ≥ 1',
  torque:           'กรุณาระบุ Torque เป็นตัวเลข ≥ 0',
};

function showFieldError(input, msg) {
  input.classList.add('invalid');
  const errEl = document.getElementById('err-' + input.id);
  if (errEl) errEl.textContent = msg;
}

function clearFieldError(input) {
  input.classList.remove('invalid');
  const errEl = document.getElementById('err-' + input.id);
  if (errEl) errEl.textContent = '';
}

// ── Validate single field ───────────────────────────────────────────────
function validateField(input) {
  const val = parseFloat(input.value);
  const minVal = parseFloat(input.min || 0);
  const isValid = input.value.trim() !== '' && !isNaN(val) && val >= minVal;
  if (isValid) {
    clearFieldError(input);
  } else {
    showFieldError(input, ERROR_MSGS[input.id] || 'กรุณากรอกข้อมูลให้ถูกต้อง');
  }
  return isValid;
}

// ── Check all fields complete → enable/disable button ──────────────────
function isFieldValid(input) {
  const val = parseFloat(input.value);
  const minVal = parseFloat(input.min || 0);
  return input.value.trim() !== '' && !isNaN(val) && val >= minVal;
}

function checkFormComplete() {
  const allOk = [...form.querySelectorAll('input')].every(isFieldValid);
  predictBtn.disabled = !allOk;
}

// ── In-flight guard (prevent race conditions) ────────────────────────────
let inFlight = false;

// ── Form submit ───────────────────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (inFlight) return;

  const fields = form.querySelectorAll('input');
  let allValid = true;
  fields.forEach(f => { if (!validateField(f)) allValid = false; });
  if (!allValid) return;

  // Collect values
  const battery_capacity = parseFloat(document.getElementById('battery_capacity').value);
  const horsepower = parseFloat(document.getElementById('horsepower').value);
  const total_speed = parseFloat(document.getElementById('total_speed').value);
  const zero_to_hundred = parseFloat(document.getElementById('zero_to_hundred').value);
  const cars_prices = parseFloat(document.getElementById('cars_prices').value);
  const seats = parseFloat(document.getElementById('seats').value);
  const torque = parseFloat(document.getElementById('torque').value);

  // Loading state — switch to loading text, keep button disabled during fetch
  inFlight = true;
  setLoading(true);
  showPanel('empty');

  try {
    const res = await fetch('/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        battery_capacity,
        horsepower,
        total_speed,
        zero_to_hundred,
        cars_prices,
        seats,
        torque
      })
    });

    const data = await res.json();

    if (!data.success) throw new Error(data.error || 'Unknown error');

    renderResult(data, { battery_capacity, horsepower, total_speed, zero_to_hundred, cars_prices, seats, torque });

  } catch (err) {
    errorMessage.textContent = err.message;
    showPanel('error');
  } finally {
    inFlight = false;
    setLoading(false);
  }
});

// ── Render result ─────────────────────────────────────────────────────────
function renderResult(data, inputs) {
  document.getElementById('cluster-icon').textContent = data.icon;
  document.getElementById('cluster-number').textContent = `CLUSTER ${data.cluster}`;
  document.getElementById('cluster-name').textContent = data.name;
  document.getElementById('cluster-name-en').textContent = data.name_en;
  document.getElementById('cluster-description').textContent = data.description;

  // Cluster average stats
  document.getElementById('stat-hp').textContent = data.stats.avg_hp;
  document.getElementById('stat-torque').textContent = data.stats.avg_torque;
  document.getElementById('stat-price').textContent = data.stats.avg_price;
  document.getElementById('stat-speed').textContent = data.stats.avg_speed;
  document.getElementById('stat-battery').textContent = data.stats.avg_battery;
  document.getElementById('stat-count').textContent = data.stats.count;

  // Input summary
  const grid = document.getElementById('input-stats-grid');
  const perfVal = inputs.zero_to_hundred > 0 ? (1 / inputs.zero_to_hundred).toFixed(5) : '—';
  const inputItems = [
    { label: 'Battery', value: `${inputs.battery_capacity.toLocaleString()} Wh` },
    { label: 'Horsepower', value: `${inputs.horsepower.toLocaleString()} HP` },
    { label: 'Top Speed', value: `${inputs.total_speed} km/h` },
    { label: '0–100 Time', value: `${inputs.zero_to_hundred}s` },
    { label: 'Performance', value: perfVal },
    { label: 'Price', value: `$${inputs.cars_prices.toLocaleString()}` },
    { label: 'Seats', value: `${inputs.seats}` },
    { label: 'Torque', value: `${inputs.torque.toLocaleString()} Nm` },
  ];

  grid.innerHTML = '';
  inputItems.forEach(({ label, value }) => {
    grid.innerHTML += `
      <div class="stat-item">
        <div class="stat-label">${label}</div>
        <div class="stat-value">${value}</div>
      </div>`;
  });

  // Fix 8-col grid width
  grid.style.gridTemplateColumns = 'repeat(4, 1fr)';

  showPanel('content');
  resultContent.classList.add('fade-in');
  void resultContent.offsetWidth; // reflow to restart animation
  resultContent.classList.remove('fade-in');
  resultContent.classList.add('fade-in');

  setActiveCluster(data.cluster);
}

// ── Loading state (swap text only — button already enabled by form check) ──────
function setLoading(loading) {
  predictBtn.disabled = loading; // keep disabled while fetching
  predictBtn.classList.toggle('loading', loading);
  btnText.hidden = loading;
  btnLoading.hidden = !loading;
}

// ── Reset ─────────────────────────────────────────────────────────────────
resetBtn.addEventListener('click', () => {
  form.reset();
  form.querySelectorAll('input').forEach(f => clearFieldError(f));
  showPanel('empty');
  document.querySelectorAll('.cluster-ref-card').forEach(c => c.classList.remove('active'));
  checkFormComplete(); // disable button again after reset
});

// ── Example chips ───────────────────────────────────────────────────────────
document.querySelectorAll('.example-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const [battery, hp, speed, time, price, seats, torque] = chip.dataset.values.split(',');
    document.getElementById('battery_capacity').value = battery;
    document.getElementById('horsepower').value = hp;
    document.getElementById('total_speed').value = speed;
    document.getElementById('zero_to_hundred').value = time;
    document.getElementById('cars_prices').value = price;
    document.getElementById('seats').value = seats;
    document.getElementById('torque').value = torque;

    // Clear all errors after filling — user still needs to click Submit
    form.querySelectorAll('input').forEach(f => clearFieldError(f));
    checkFormComplete(); // enable button now that fields are filled
  });
});

// ── Live validation + completeness check on every keystroke ───────────────
form.querySelectorAll('input').forEach(input => {
  input.addEventListener('input', () => {
    if (input.classList.contains('invalid')) clearFieldError(input);
    checkFormComplete();
  });
  input.addEventListener('blur', () => {
    if (input.value.trim() !== '') validateField(input);
  });
});

// ── Initial state: disable button until form is filled ──────────────────────
checkFormComplete();
