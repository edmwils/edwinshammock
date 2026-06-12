// =============================================
// STATE
// =============================================
let allEntries = [];
let filters = {
  search: '',
  category: 'all',
  pricing: 'all',
  dofollowOnly: false,
  topOnly: false,
  freeOnly: false,
};

// =============================================
// LOAD DATA
// =============================================
async function init() {
  try {
    const res = await fetch('./directories.json');
    const data = await res.json();
    allEntries = data.entries || [];

    buildCategoryPills(data.meta?.categories || []);
    animateStats();
    render();
    bindEvents();
  } catch (err) {
    document.getElementById('grid').innerHTML = `
      <div class="empty-state">
        <p>Could not load directories.json — make sure it's in the same folder.</p>
      </div>`;
    console.error(err);
  }
}

// =============================================
// CATEGORY PILLS
// =============================================
function buildCategoryPills(categories) {
  const container = document.getElementById('category-pills');
  // Sort by most entries
  const counts = {};
  allEntries.forEach(e => { counts[e.category] = (counts[e.category] || 0) + 1; });
  const sorted = [...categories].sort((a, b) => (counts[b] || 0) - (counts[a] || 0));

  sorted.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'pill';
    btn.dataset.value = cat;
    btn.textContent = `${cat} (${counts[cat] || 0})`;
    container.appendChild(btn);
  });
}

// =============================================
// FILTER + RENDER
// =============================================
function getFiltered() {
  const q = filters.search.toLowerCase();
  return allEntries.filter(e => {
    if (q && !e.name.toLowerCase().includes(q) && !e.domain.toLowerCase().includes(q) && !(e.description || '').toLowerCase().includes(q)) return false;
    if (filters.category !== 'all' && e.category !== filters.category) return false;
    if (filters.pricing !== 'all' && e.pricing !== filters.pricing) return false;
    if (filters.dofollowOnly && e.link_type !== 'Dofollow') return false;
    if (filters.topOnly && !e.is_top) return false;
    if (filters.freeOnly && e.pricing !== 'Free') return false;
    return true;
  });
}

function render() {
  const grid = document.getElementById('grid');
  const results = getFiltered();

  document.getElementById('result-count').textContent = `${results.length} sites`;

  if (results.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <p>No sites match your filters.</p>
      </div>`;
    return;
  }

  // Use DocumentFragment for perf
  const frag = document.createDocumentFragment();
  results.forEach(entry => {
    frag.appendChild(createCard(entry));
  });

  grid.innerHTML = '';
  grid.appendChild(frag);
}

// =============================================
// CARD
// =============================================
function createCard(e) {
  const card = document.createElement('a');
  card.className = 'card';
  card.href = e.url;
  card.target = '_blank';
  card.rel = 'noopener noreferrer';

  // DR tier
  const drClass = e.dr >= 80 ? 'dr-high' : e.dr >= 50 ? 'dr-mid' : 'dr-low';

  // Pricing tag class
  const pricingClass = e.pricing === 'Free' ? 'tag-free'
    : e.pricing === 'Paid' ? 'tag-paid'
    : e.pricing === 'Freemium' ? 'tag-freemium'
    : 'tag-nofollow';

  // Link type
  const linkClass = e.link_type === 'Dofollow' ? 'tag-dofollow' : 'tag-nofollow';

  const badges = [
    e.is_top ? `<span class="badge-top">⭐ TOP</span>` : '',
    e.is_new ? `<span class="badge-new">NEW</span>` : '',
  ].join('');

  card.innerHTML = `
    <div class="card-header">
      <span class="card-name">${escHtml(e.name)}</span>
      ${badges ? `<div class="card-badges">${badges}</div>` : ''}
    </div>
    <div class="card-domain">${escHtml(e.domain)}</div>
    ${e.description ? `<div class="card-description">${escHtml(e.description)}</div>` : '<div class="card-description"></div>'}
    <div class="card-tags">
      <span class="tag tag-dr ${drClass}">DR ${e.dr}</span>
      <span class="tag ${pricingClass}">${e.pricing}</span>
      <span class="tag ${linkClass}">${e.link_type}</span>
      <span class="tag tag-category">${escHtml(e.category)}</span>
    </div>
  `;

  return card;
}

function escHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// =============================================
// EVENTS
// =============================================
function bindEvents() {
  // Search
  const searchEl = document.getElementById('search');
  searchEl.addEventListener('input', () => {
    filters.search = searchEl.value.trim();
    render();
  });

  // Category pills
  document.getElementById('category-pills').addEventListener('click', e => {
    const btn = e.target.closest('.pill');
    if (!btn) return;
    document.querySelectorAll('#category-pills .pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    filters.category = btn.dataset.value;
    render();
  });

  // Pricing pills
  document.getElementById('pricing-pills').addEventListener('click', e => {
    const btn = e.target.closest('.pill');
    if (!btn) return;
    document.querySelectorAll('#pricing-pills .pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    filters.pricing = btn.dataset.value;
    render();
  });

  // Toggles
  document.getElementById('dofollow-only').addEventListener('change', e => {
    filters.dofollowOnly = e.target.checked;
    render();
  });
  document.getElementById('top-only').addEventListener('change', e => {
    filters.topOnly = e.target.checked;
    render();
  });
  document.getElementById('free-only').addEventListener('change', e => {
    filters.freeOnly = e.target.checked;
    render();
  });
}

// =============================================
// STAT COUNTER ANIMATION
// =============================================
function animateStats() {
  const els = document.querySelectorAll('.stat-num[data-target]');
  els.forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1200;
    const start = performance.now();
    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = Math.round(eased * target).toLocaleString();
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

// =============================================
// BOOT
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  init();
  initFilterAutoHide();
});

// =============================================
// AUTO-HIDE FILTER BAR ON SCROLL
// =============================================
function initFilterAutoHide() {
  const wrapper = document.getElementById('filters');
  const peek    = document.getElementById('filters-peek');
  if (!wrapper || !peek) return;

  let lastScrollY  = window.scrollY;
  let ticking      = false;
  let filtersHidden = false;

  // How far down the page before we start hiding (px) — past the hero
  const HIDE_THRESHOLD = 120;
  // Minimum scroll delta before we act (avoids micro-jitter)
  const DELTA = 10;

  function update() {
    const currentY = window.scrollY;
    const delta    = currentY - lastScrollY;

    if (currentY < HIDE_THRESHOLD) {
      // Near the top — always show
      showFilters();
    } else if (delta > DELTA) {
      // Scrolling DOWN fast enough → hide
      hideFilters();
    } else if (delta < -DELTA) {
      // Scrolling UP fast enough → show
      showFilters();
    }

    lastScrollY = currentY;
    ticking = false;
  }

  function hideFilters() {
    if (filtersHidden) return;
    filtersHidden = true;
    wrapper.classList.add('filters-hidden');
    peek.classList.add('peek-visible');
  }

  function showFilters() {
    if (!filtersHidden) return;
    filtersHidden = false;
    wrapper.classList.remove('filters-hidden');
    peek.classList.remove('peek-visible');
  }

  // Peek button click → show filters and scroll to them
  peek.addEventListener('click', () => {
    showFilters();
    wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    // Focus the search input
    setTimeout(() => document.getElementById('search')?.focus(), 300);
  });

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
}
