// Native implementation replacing Luxon and Lucide
// State management
let clocks = JSON.parse(localStorage.getItem('chrono-world-clocks')) || [
    { id: 'local', zone: 'local', pinned: true, name: 'Local Time' },
    { id: 'london', zone: 'Europe/London', pinned: false, name: 'London' },
    { id: 'tokyo', zone: 'Asia/Tokyo', pinned: false, name: 'Tokyo' }
];

let timeOffset = 0; // Offset in minutes
const allTimezones = Array.from(new Set([...Intl.supportedValuesOf('timeZone'), 'UTC', 'PST8PDT', 'EST5EDT', 'CST6CDT', 'MST7MDT']));

const TZ_ALIASES = {
    'UTC': 'UTC',
    'PST': 'PST8PDT',
    'PDT': 'PST8PDT',
    'EST': 'EST5EDT',
    'EDT': 'EST5EDT',
    'CST': 'CST6CDT',
    'CDT': 'CST6CDT',
    'MST': 'MST7MDT',
    'MDT': 'MST7MDT',
    'GMT': 'UTC'
};

// DOM Elements
const pinnedClocksContainer = document.getElementById('pinned-clocks');
const allClocksContainer = document.getElementById('all-clocks');
const pinnedSection = document.getElementById('pinned-section');
const citySearch = document.getElementById('city-search');
const searchResults = document.getElementById('search-results');
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const emptyState = document.getElementById('empty-state');
const timeSlider = document.getElementById('time-slider');
const simulatedTimeLabel = document.getElementById('simulated-time-label');
const resetTimeBtn = document.getElementById('reset-time');
const explorerGrid = document.getElementById('explorer-grid');

// Icons definition to avoid external Lucide library
const Icons = {
    star: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
    x: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    plus: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    moon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>',
    sun: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
    rotate: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>'
};

// Initialization
function init() {
    renderClocks();
    setupSearch();
    setupTheme();
    setupComparison();
    renderExplorer();

    // Inject initial theme icon
    const theme = document.body.getAttribute('data-theme') || 'dark';
    updateThemeIcon(theme);

    // Update clocks every second
    setInterval(updateClocks, 1000);
    updateClocks(); // Initial call
}

// Helper: Get date components for a specific timezone
function getTzDetails(date, timeZone) {
    const tz = timeZone === 'local' ? undefined : timeZone;

    // Extract parts for target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour12: false,
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        timeZoneName: 'short'
    });

    const parts = formatter.formatToParts(date);
    const d = {};
    parts.forEach(p => d[p.type] = p.value);

    const h = parseInt(d.hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;

    // Robust Offset Calculation
    const opt = { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false };
    const tzLocaleStr = date.toLocaleString('en-US', { ...opt, timeZone: tz });
    const utcLocaleStr = date.toLocaleString('en-US', { ...opt, timeZone: 'UTC' });

    const tzFake = new Date(tzLocaleStr);
    const utcFake = new Date(utcLocaleStr);
    const offsetMinutes = Math.round((tzFake - utcFake) / 60000);

    return {
        hour: h,
        hour12: h12,
        minute: parseInt(d.minute),
        second: parseInt(d.second),
        ampm: ampm,
        day: d.day,
        month: d.month,
        year: d.year,
        weekday: d.weekday,
        offset: offsetMinutes,
        zoneName: d.timeZoneName
    };
}

// Rendering
function renderClocks() {
    pinnedClocksContainer.innerHTML = '';
    allClocksContainer.innerHTML = '';

    const pinned = clocks.filter(c => c.pinned);
    const unpinned = clocks.filter(c => !c.pinned);

    pinnedSection.classList.toggle('hidden', pinned.length === 0);
    emptyState.classList.toggle('hidden', clocks.length > 0);

    pinned.forEach(clock => createClockCard(clock, pinnedClocksContainer));
    unpinned.forEach(clock => createClockCard(clock, allClocksContainer));
}

function createClockCard(clock, container) {
    const template = document.getElementById('clock-card-template');
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.clock-card');

    card.dataset.id = clock.id;
    card.querySelector('.city-name').textContent = clock.name;

    const zoneName = clock.zone === 'local' ? Intl.DateTimeFormat().resolvedOptions().timeZone : clock.zone;
    card.querySelector('.timezone-name').textContent = zoneName;

    const pinBtn = card.querySelector('.pin-btn');
    pinBtn.innerHTML = Icons.star;
    if (clock.pinned) pinBtn.classList.add('active');

    pinBtn.addEventListener('click', () => togglePin(clock.id));

    const removeBtn = card.querySelector('.remove-btn');
    removeBtn.innerHTML = Icons.x;
    removeBtn.addEventListener('click', () => removeClock(clock.id));

    // Add markers
    const markersContainer = card.querySelector('.markers');
    for (let i = 0; i < 12; i++) {
        const marker = document.createElement('div');
        marker.className = 'marker';
        marker.style.position = 'absolute';
        marker.style.width = '2px';
        marker.style.height = i % 3 === 0 ? '8px' : '4px';
        marker.style.background = 'var(--text-secondary)';
        marker.style.left = '50%';
        marker.style.top = '2px';
        marker.style.transformOrigin = '50% 48px';
        marker.style.transform = `translateX(-50%) rotate(${i * 30}deg)`;
        markersContainer.appendChild(marker);
    }

    container.appendChild(clone);
}

function updateClocks() {
    const rawNow = new Date();
    const now = new Date(rawNow.getTime() + timeOffset * 60000);
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    if (timeOffset !== 0) {
        simulatedTimeLabel.textContent = `Time Travel: ${timeStr} (${timeOffset > 0 ? '+' : ''}${timeOffset}m)`;
        resetTimeBtn.classList.remove('hidden');
        resetTimeBtn.innerHTML = Icons.rotate;
    } else {
        simulatedTimeLabel.textContent = 'Current Time';
        resetTimeBtn.classList.add('hidden');
    }

    clocks.forEach(clock => {
        const details = getTzDetails(now, clock.zone);
        const card = document.querySelector(`.clock-card[data-id="${clock.id}"]`);

        if (!card) return;

        // Update Digital
        const h = details.hour12.toString().padStart(2, '0');
        const m = details.minute.toString().padStart(2, '0');
        const s = details.second.toString().padStart(2, '0');

        card.querySelector('.time').textContent = timeOffset === 0 ? `${h}:${m}:${s}` : `${h}:${m}`;
        card.querySelector('.period').textContent = details.ampm;
        card.querySelector('.date').textContent = `${details.weekday}, ${details.month} ${details.day}`;

        // Update Analog
        const hourDeg = (details.hour % 12 * 30) + (details.minute * 0.5);
        const minDeg = (details.minute * 6) + (details.second * 0.1);
        const secDeg = details.second * 6;

        card.querySelector('.hour-hand').style.transform = `translateX(-50%) rotate(${hourDeg}deg)`;
        card.querySelector('.minute-hand').style.transform = `translateX(-50%) rotate(${minDeg}deg)`;
        card.querySelector('.second-hand').style.transform = `translateX(-50%) rotate(${secDeg}deg)`;

        // Update Comparison
        const localDetails = getTzDetails(now, 'local');
        const diffHours = (details.offset - localDetails.offset) / 60;

        const diffElement = card.querySelector('.diff-value');
        if (clock.zone === 'local') {
            diffElement.textContent = 'Current Location';
            diffElement.style.color = 'var(--accent-color)';
        } else {
            const prefix = diffHours >= 0 ? '+' : '';
            diffElement.textContent = `${prefix}${diffHours} hrs from local`;
            diffElement.style.color = diffHours === 0 ? 'var(--text-secondary)' : (diffHours > 0 ? 'var(--success)' : '#f87171');
        }
    });

    // Update explorer icons if any (since we manually render them)
    document.querySelectorAll('.tz-explorer-item i').forEach(el => {
        if (!el.innerHTML) el.innerHTML = Icons.plus;
    });
}

// Logic
function togglePin(id) {
    clocks = clocks.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c);
    saveAndRender();
}

function removeClock(id) {
    clocks = clocks.filter(c => c.id !== id);
    saveAndRender();
}

function addClock(zone) {
    const name = zone.split('/').pop().replace(/_/g, ' ');
    const id = Date.now().toString();

    if (clocks.some(c => c.zone === zone)) {
        alert('This timezone is already added!');
        return;
    }

    clocks.push({ id, zone, pinned: false, name });
    saveAndRender();
}

function saveAndRender() {
    localStorage.setItem('chrono-world-clocks', JSON.stringify(clocks));
    renderClocks();
    updateClocks();
}

// Search Logic
function setupSearch() {
    citySearch.addEventListener('input', (e) => {
        const val = e.target.value.toUpperCase().trim();
        if (val.length < 1) {
            searchResults.classList.add('hidden');
            return;
        }

        // Check for aliases first
        const results = [];
        if (TZ_ALIASES[val]) {
            results.push(TZ_ALIASES[val]);
        }

        const filtered = allTimezones.filter(tz => {
            const upperTz = tz.toUpperCase();
            return upperTz.includes(val);
        }).slice(0, 10);

        const finalResults = Array.from(new Set([...results, ...filtered]));

        if (finalResults.length > 0) {
            searchResults.innerHTML = finalResults.map(tz => `
                <div class="search-result-item" onclick="addClock('${tz}')">
                    ${tz.replace(/_/g, ' ')}
                </div>
            `).join('');
            searchResults.classList.remove('hidden');
        } else {
            searchResults.classList.add('hidden');
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            searchResults.classList.add('hidden');
        }
    });
}

// Theme Logic
function setupTheme() {
    const savedTheme = localStorage.getItem('chrono-theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('chrono-theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

function updateThemeIcon(theme) {
    themeIcon.innerHTML = theme === 'dark' ? Icons.sun : Icons.moon;
}

// Comparison Logic
function setupComparison() {
    timeSlider.addEventListener('input', (e) => {
        timeOffset = parseInt(e.target.value);
        updateClocks();
    });

    resetTimeBtn.addEventListener('click', () => {
        timeOffset = 0;
        timeSlider.value = 0;
        updateClocks();
    });
}

function renderExplorer() {
    if (!explorerGrid) return;

    explorerGrid.innerHTML = allTimezones.map(tz => `
        <div class="tz-explorer-item" onclick="addClock('${tz}')">
            <span>${tz.split('/').pop().replace(/_/g, ' ')}</span>
            <i>${Icons.plus}</i>
        </div>
    `).join('');
}

// Set up globals
window.addClock = addClock;

// Run init
init();
