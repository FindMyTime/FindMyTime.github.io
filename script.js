// clock. - Zero-dependency chronological world clock
let favorites = JSON.parse(localStorage.getItem('clock-favorites')) || ['local', 'Europe/London', 'Asia/Tokyo', 'America/New_York'];

const allTimezones = Array.from(new Set([
    ...Intl.supportedValuesOf('timeZone'),
    'UTC', 'PST8PDT', 'EST5EDT', 'CST6CDT', 'MST7MDT'
]));

const TZ_ALIASES = {
    'UTC': 'UTC', 'GMT': 'UTC',
    'PST': 'PST8PDT', 'PDT': 'PST8PDT',
    'EST': 'EST5EDT', 'EDT': 'EST5EDT',
    'CST': 'CST6CDT', 'CDT': 'CST6CDT',
    'MST': 'MST7MDT', 'MDT': 'MST7MDT',
    'IST': 'Asia/Kolkata'
};

// Country name mapping for better search
const COUNTRY_MAPPING = {
    'INDIA': ['Asia/Kolkata', 'Asia/Calcutta'],
    'USA': ['America/New_York', 'America/Los_Angeles', 'America/Chicago', 'America/Denver'],
    'UK': ['Europe/London'],
    'JAPAN': ['Asia/Tokyo'],
    'CHINA': ['Asia/Shanghai'],
    'AUSTRALIA': ['Australia/Sydney', 'Australia/Melbourne'],
    'CANADA': ['America/Toronto', 'America/Vancouver'],
    'GERMANY': ['Europe/Berlin'],
    'FRANCE': ['Europe/Paris'],
    'SINGAPORE': ['Asia/Singapore'],
    'UAE': ['Asia/Dubai'],
    'BRAZIL': ['America/Sao_Paulo'],
    'RUSSIA': ['Europe/Moscow'],
    'MEXICO': ['America/Mexico_City']
};

const Icons = {
    star: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
    x: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    sun: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
    moon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>'
};

function getTzDetails(date, zone) {
    const tz = (zone === 'local' || !zone) ? undefined : zone;

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
    const h12 = h % 12 || 12;
    const ampm = h >= 12 ? 'PM' : 'AM';

    // Calculate offset
    const localDate = new Date(date.toLocaleString('en-US', { timeZone: tz }));
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const offset = Math.round((localDate - utcDate) / 60000);

    return {
        h, h12,
        m: parseInt(d.minute),
        s: parseInt(d.second),
        ampm,
        day: d.day,
        month: d.month,
        weekday: d.weekday,
        offset,
        zoneName: d.timeZoneName
    };
}

function createCard(zone, isFavorite = false) {
    const template = document.getElementById('clock-card-template');
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.clock-card');

    const tzDisplay = zone === 'local' ? Intl.DateTimeFormat().resolvedOptions().timeZone : zone;
    const name = tzDisplay.split('/').pop().replace(/_/g, ' ');

    card.dataset.zone = zone;
    card.querySelector('.city-name').textContent = name;
    card.querySelector('.timezone-name').textContent = tzDisplay;

    const pinBtn = card.querySelector('.pin-btn');
    pinBtn.innerHTML = Icons.star;
    if (isFavorite) pinBtn.classList.add('active');
    pinBtn.onclick = (e) => { e.stopPropagation(); toggleFavorite(zone); };

    return clone;
}

function renderAll() {
    const now = new Date();

    // Sort all timezones chronologically
    const sortedTimeline = allTimezones.map(tz => ({
        zone: tz,
        offset: getTzDetails(now, tz).offset
    })).sort((a, b) => a.offset - b.offset || a.zone.localeCompare(b.zone));

    // Render favorites
    const pinnedContainer = document.getElementById('pinned-clocks');
    const pinnedSection = document.getElementById('pinned-section');
    pinnedContainer.innerHTML = '';

    if (favorites.length > 0) {
        favorites.forEach(tz => {
            pinnedContainer.appendChild(createCard(tz, true));
        });
        pinnedSection.classList.remove('hidden');
    } else {
        pinnedSection.classList.add('hidden');
    }

    // Render timeline (limit to 200 for performance)
    const timelineContainer = document.getElementById('all-clocks-timeline');
    timelineContainer.innerHTML = '';
    sortedTimeline.slice(0, 200).forEach(item => {
        timelineContainer.appendChild(createCard(item.zone, favorites.includes(item.zone)));
    });

    updateContent();
}

function updateContent() {
    const now = new Date();
    const localOffset = getTzDetails(now, 'local').offset;

    document.querySelectorAll('.clock-card').forEach(card => {
        const zone = card.dataset.zone;
        if (!zone) return;

        try {
            const d = getTzDetails(now, zone);

            // Update time
            const timeEl = card.querySelector('.time');
            const periodEl = card.querySelector('.period');
            const dateEl = card.querySelector('.date');

            if (timeEl) timeEl.textContent = `${d.h12.toString().padStart(2, '0')}:${d.m.toString().padStart(2, '0')}:${d.s.toString().padStart(2, '0')}`;
            if (periodEl) periodEl.textContent = d.ampm;
            if (dateEl) dateEl.textContent = `${d.weekday}, ${d.month} ${d.day}`;

            // Update analog clock hands
            const hourHand = card.querySelector('.hour-hand');
            const minuteHand = card.querySelector('.minute-hand');
            const secondHand = card.querySelector('.second-hand');

            if (hourHand && minuteHand && secondHand) {
                const hourDeg = (d.h % 12 * 30) + (d.m * 0.5);
                const minDeg = (d.m * 6) + (d.s * 0.1);
                const secDeg = d.s * 6;

                hourHand.style.transform = `translateX(-50%) rotate(${hourDeg}deg)`;
                minuteHand.style.transform = `translateX(-50%) rotate(${minDeg}deg)`;
                secondHand.style.transform = `translateX(-50%) rotate(${secDeg}deg)`;
            }

            // Update offset
            const diffEl = card.querySelector('.diff-value');
            if (diffEl) {
                if (zone === 'local') {
                    diffEl.textContent = 'Local Time';
                    diffEl.style.color = 'var(--accent-color)';
                } else {
                    const diffHrs = (d.offset - localOffset) / 60;
                    const prefix = diffHrs >= 0 ? '+' : '';
                    diffEl.textContent = `${prefix}${diffHrs.toFixed(1)} hrs`;
                    diffEl.style.color = diffHrs === 0 ? 'var(--text-secondary)' : (diffHrs > 0 ? 'var(--success)' : '#f87171');
                }
            }
        } catch (e) {
            console.error('Error updating card:', zone, e);
        }
    });
}

function toggleFavorite(zone) {
    if (favorites.includes(zone)) {
        favorites = favorites.filter(z => z !== zone);
    } else {
        favorites.push(zone);
    }
    localStorage.setItem('clock-favorites', JSON.stringify(favorites));
    renderAll();
}

function setupTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const saved = localStorage.getItem('chrono-theme') || 'light';

    document.body.setAttribute('data-theme', saved);
    themeIcon.innerHTML = saved === 'dark' ? Icons.sun : Icons.moon;

    themeToggle.onclick = () => {
        const current = document.body.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', next);
        localStorage.setItem('chrono-theme', next);
        themeIcon.innerHTML = next === 'dark' ? Icons.sun : Icons.moon;
    };
}

function setupSearch() {
    const citySearch = document.getElementById('city-search');
    const searchResults = document.getElementById('search-results');

    citySearch.oninput = (e) => {
        const val = e.target.value.toUpperCase().trim();

        if (val.length < 1) {
            searchResults.classList.add('hidden');
            return;
        }

        const now = new Date();
        const matches = [];

        // Check aliases first (IST, PST, UTC, etc)
        if (TZ_ALIASES[val]) {
            const aliasZone = TZ_ALIASES[val];
            if (Array.isArray(aliasZone)) {
                matches.push(...aliasZone);
            } else {
                matches.push(aliasZone);
            }
        }

        // Check country names
        if (COUNTRY_MAPPING[val]) {
            matches.push(...COUNTRY_MAPPING[val]);
        }

        // Search in timezone names, cities, regions, abbreviations, and time
        allTimezones.forEach(tz => {
            try {
                const d = getTzDetails(now, tz);

                // Extract searchable fields
                const cityName = tz.split('/').pop().replace(/_/g, ' ').toUpperCase();
                const fullPath = tz.toUpperCase();
                const countryRegion = tz.split('/')[0]?.toUpperCase() || '';
                const zoneName = d.zoneName.toUpperCase();
                const timeStr = `${d.h12}:${d.m.toString().padStart(2, '0')}`;

                // Check if search matches any field
                if (fullPath.includes(val) ||
                    cityName.includes(val) ||
                    countryRegion.includes(val) ||
                    zoneName.includes(val) ||
                    timeStr.includes(val)) {
                    matches.push(tz);
                }
            } catch (e) {
                // Skip invalid timezones
            }
        });

        const uniqueMatches = Array.from(new Set(matches)).slice(0, 10);

        if (uniqueMatches.length > 0) {
            searchResults.innerHTML = uniqueMatches.map(tz => {
                const d = getTzDetails(now, tz);
                const name = tz.split('/').pop().replace(/_/g, ' ');
                return `
                    <div class="search-result-item" onclick="addFromSearch('${tz}')">
                        <div class="result-info">
                            <div style="font-weight:700">${name}</div>
                            <div style="font-size:0.7rem; opacity:0.6">${tz} (${d.zoneName})</div>
                        </div>
                        <div class="result-time">${d.h12}:${d.m.toString().padStart(2, '0')} ${d.ampm}</div>
                    </div>
                `;
            }).join('');
            searchResults.classList.remove('hidden');
        } else {
            searchResults.classList.add('hidden');
        }
    };

    document.onclick = (e) => {
        if (!e.target.closest('.search-container')) {
            searchResults.classList.add('hidden');
        }
    };
}

window.addFromSearch = (tz) => {
    if (!favorites.includes(tz)) {
        favorites.push(tz);
        localStorage.setItem('clock-favorites', JSON.stringify(favorites));
        renderAll();
    }
    document.getElementById('city-search').value = '';
    document.getElementById('search-results').classList.add('hidden');
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupTheme();
    setupSearch();
    renderAll();
    setInterval(updateContent, 1000);
});
