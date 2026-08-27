(function () {
  'use strict';

  var VENUES = (window.VENUES || []).slice();
  var TIER_ORDER = { A: 0, B: 1, C: 2, FLY: 3, REF: 4 };
  var TIER_NAMES = { A: 'Tier A — strongest matches', B: 'Tier B — solid, with tradeoffs', C: 'Tier C — worth a call', FLY: 'Fly-in — worth the flight', REF: 'Reference' };
  var SF = [37.7749, -122.4194];

  // CARTO started requiring a key on its raster basemaps; without one every tile
  // comes back stamped "API KEY REQUIRED". Request one at carto.com/basemaps/apikey
  // — free, no account, 5M tiles/month, emailed back — and paste it here.
  // This repo is public, so whatever goes here is readable by anyone; the key is
  // issued against the domain you name on the request form, which is the only
  // thing limiting its use.
  var CARTO_KEY = '';
  function cartoTiles(style) {
    return 'https://{s}.basemaps.cartocdn.com/rastertiles/' + style + '/{z}/{x}/{y}{r}.png' +
      (CARTO_KEY ? '?key=' + encodeURIComponent(CARTO_KEY) : '');
  }
  var TIER_DESC = {
    A: 'Strongest matches to the Lighthaven / SSS Ranch / The Shadows profile: real character, whole-site exclusive use, on-site lodging that lands near 60, within about 2.5 hours of SF.',
    B: 'Solid and bookable, but each trades something: aesthetics, distance, guest-type restrictions, or dorm-style lodging.',
    C: 'Worth a call for a specific reason (architecture, hot springs, all-inclusive ease, in-city convenience), with a clear tradeoff.',
    FLY: 'Outside driving range, but spacious and beautiful enough to be worth flying to, and close to an airport: everyone flies from the Bay Area and drives well under an hour at the far end.',
    REF: 'Your own example venue, a venue that no longer rents, and three that are simply too small.'
  };
  var WEEKENDS = [
    { id: '2026-08-28', mon: 'Aug', day: '28', label: 'Fri Aug 28 – Sun Aug 30' },
    { id: '2026-09-04', mon: 'Sep', day: '4', label: 'Fri Sep 4 – Sun Sep 6 (Labor Day weekend)' },
    { id: '2026-09-11', mon: 'Sep', day: '11', label: 'Fri Sep 11 – Sun Sep 13' },
    { id: '2026-09-18', mon: 'Sep', day: '18', label: 'Fri Sep 18 – Sun Sep 20' },
    { id: '2026-09-25', mon: 'Sep', day: '25', label: 'Fri Sep 25 – Sun Sep 27' },
    { id: '2026-10-02', mon: 'Oct', day: '2', label: 'Fri Oct 2 – Sun Oct 4' },
    { id: '2026-10-09', mon: 'Oct', day: '9', label: 'Fri Oct 9 – Sun Oct 11' },
    { id: '2026-10-16', mon: 'Oct', day: '16', label: 'Fri Oct 16 – Sun Oct 18', target: true },
    { id: '2026-10-23', mon: 'Oct', day: '23', label: 'Fri Oct 23 – Sun Oct 25' },
    { id: '2026-10-30', mon: 'Oct', day: '30', label: 'Fri Oct 30 – Sun Nov 1 (Halloween weekend)' }
  ];
  var TARGET_WEEKEND = '2026-10-16';
  var STATUSES = ['definitely_available', 'probably_available', 'unknown', 'probably_not_available', 'definitely_not_available'];
  var STATUS_LABEL = {
    definitely_available: 'Definitely available',
    probably_available: 'Probably available',
    unknown: 'Unknown',
    probably_not_available: 'Probably not available',
    definitely_not_available: 'Definitely not available'
  };
  var OPEN_STATUSES = { definitely_available: 1, probably_available: 1 };

  var state = { filter: 'ALL', weekend: null, selected: null, hover: null, lightbox: { images: [], index: 0 } };
  var markers = {};
  var rows = {};

  var $ = function (id) { return document.getElementById(id); };
  var listEl = $('list');
  var detailPanel = $('detailPanel');
  var detailScroll = $('detailScroll');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function byId(id) { for (var i = 0; i < VENUES.length; i++) if (VENUES[i].id === id) return VENUES[i]; return null; }
  function availStatus(v, weekendId) {
    var wks = (v.verified && v.verified.weekends) || [];
    for (var i = 0; i < wks.length; i++) if (wks[i].weekend === weekendId) return wks[i];
    return { weekend: weekendId, status: 'unknown', evidence: '', quote: '', sourceUrl: '', sourceLabel: '' };
  }
  function weekendById(id) { for (var i = 0; i < WEEKENDS.length; i++) if (WEEKENDS[i].id === id) return WEEKENDS[i]; return null; }
  function visible(v) {
    if (state.filter !== 'ALL' && v.tier !== state.filter) return false;
    if (state.weekend && !OPEN_STATUSES[availStatus(v, state.weekend).status]) return false;
    return true;
  }
  function isMobile() { return window.matchMedia('(max-width: 820px)').matches; }

  /* ---------- map ---------- */
  var map = L.map('map', { center: [38.1, -122.6], zoom: 8, zoomControl: false, attributionControl: true, scrollWheelZoom: true, zoomSnap: 0.25, fadeAnimation: false });
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer(cartoTiles('voyager_nolabels'), {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd', maxZoom: 19
  }).addTo(map);
  map.createPane('labels');
  map.getPane('labels').style.zIndex = 450;
  map.getPane('labels').style.pointerEvents = 'none';
  L.tileLayer(cartoTiles('voyager_only_labels'), {
    subdomains: 'abcd', maxZoom: 19, pane: 'labels', opacity: 0.85
  }).addTo(map);

  L.circleMarker(SF, { radius: 4, color: '#1d1b17', weight: 1.5, fillColor: '#fff', fillOpacity: 1, interactive: false }).addTo(map);
  L.marker(SF, {
    icon: L.divIcon({ className: 'sf-label', html: '<span style="font:500 11px Inter,sans-serif;color:#4a463f;letter-spacing:.04em;text-shadow:0 0 3px #fff,0 0 5px #fff;white-space:nowrap;position:relative;left:8px;top:-8px">San Francisco</span>', iconSize: [0, 0] }),
    interactive: false, keyboard: false
  }).addTo(map);

  function pinIcon(v) {
    var size = 40;
    var inner = v.thumb
      ? '<img class="pin-img" src="' + esc(v.thumb) + '" alt="">'
      : '<div class="pin-img" style="display:flex;align-items:center;justify-content:center;font:500 16px Newsreader,serif;color:#857f74">' + esc(v.name.charAt(0)) + '</div>';
    return L.divIcon({
      className: 'pin tier-' + v.tier,
      html: inner + '<div class="pin-label">' + esc(v.name) + '</div>',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
  }

  VENUES.forEach(function (v) {
    if (typeof v.lat !== 'number' || typeof v.lng !== 'number') return;
    var baseZ = v.tier === 'A' ? 300 : v.tier === 'B' ? 200 : v.tier === 'C' ? 100 : 0;
    var m = L.marker([v.lat, v.lng], { icon: pinIcon(v), riseOnHover: true, keyboard: false, zIndexOffset: baseZ });
    m._baseZ = baseZ;
    m.on('click', function () { select(v.id, { from: 'map' }); });
    m.on('mouseover', function () { setHover(v.id); });
    m.on('mouseout', function () { setHover(null); });
    m.addTo(map);
    markers[v.id] = m;
  });

  function fitAll(animate) {
    var pts = VENUES.filter(function (v) { return visible(v) && markers[v.id]; }).map(function (v) { return [v.lat, v.lng]; });
    if (!pts.length) return;
    pts.push(SF);
    var pad = detailPanel.classList.contains('is-open') && !isMobile() ? [80, parseInt(getComputedStyle(document.documentElement).getPropertyValue('--detail-w')) + 40] : [80, 40];
    map.fitBounds(L.latLngBounds(pts), { paddingTopLeft: [40, 40], paddingBottomRight: pad, maxZoom: 11, animate: animate !== false });
  }

  /* ---------- list ---------- */
  function renderList() {
    var groups = {};
    VENUES.forEach(function (v) { if (visible(v)) (groups[v.tier] = groups[v.tier] || []).push(v); });
    var html = '';
    Object.keys(groups).sort(function (a, b) { return TIER_ORDER[a] - TIER_ORDER[b]; }).forEach(function (t) {
      html += '<div class="group-header"><span class="dot tier-' + t + '"></span>' + esc(TIER_NAMES[t] || t) + ' <span class="count">' + groups[t].length + '</span></div>';
      if (TIER_DESC[t]) html += '<div class="group-desc">' + esc(TIER_DESC[t]) + '</div>';
      groups[t].forEach(function (v) {
        var thumb = v.thumb
          ? '<img class="row-thumb" src="' + esc(v.thumb) + '" alt="" loading="lazy">'
          : '<div class="row-thumb placeholder">' + esc(v.name.charAt(0)) + '</div>';
        html += '<div class="row' + (state.selected === v.id ? ' is-selected' : '') + '" data-id="' + esc(v.id) + '" role="option" tabindex="0" aria-selected="' + (state.selected === v.id) + '">' +
          weekendStrip(v) +
          thumb +
          '<div class="row-main">' +
            '<div class="row-name">' + esc(v.name) + '</div>' +
            '<div class="row-meta"><span>' + esc(v.area) + '</span><span class="sep">·</span><span>' + esc(v.drive) + '</span></div>' +
            '<div class="row-sleeps">' + esc(shortSleeps(v)) + '</div>' +
          '</div>' + rowSide(v) + '</div>';
      });
    });
    listEl.innerHTML = html;
    rows = {};
    Array.prototype.forEach.call(listEl.querySelectorAll('.row'), function (el) {
      rows[el.dataset.id] = el;
      el.addEventListener('click', function (e) {
        if (e.target.closest('.wk-sq')) return;
        select(el.dataset.id, { from: 'list' });
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(el.dataset.id, { from: 'list' }); }
      });
      el.addEventListener('mouseenter', function () { setHover(el.dataset.id); });
      el.addEventListener('mouseleave', function () { setHover(null); });
    });
    var n = VENUES.filter(visible).length;
    $('countLabel').textContent = n + ' venue' + (n === 1 ? '' : 's');
  }

  function weekendStrip(v) {
    var wk = state.weekend || TARGET_WEEKEND;
    var html = '<div class="wk-strip" aria-label="Weekend availability">';
    WEEKENDS.forEach(function (w) {
      var a = availStatus(v, w.id);
      var cls = 'wk-sq avail-' + esc(a.status) + (w.id === wk ? ' is-current' : '') + (w.target ? ' is-target' : '');
      var attrs = ' data-venue="' + esc(v.id) + '" data-wk="' + esc(w.id) + '" aria-label="' + esc(w.label + ': ' + STATUS_LABEL[a.status]) + '"';
      html += a.sourceUrl
        ? '<a class="' + cls + '" href="' + esc(textFragmentUrl(a.sourceUrl, a.quote)) + '" target="_blank" rel="noopener"' + attrs + '></a>'
        : '<span class="' + cls + ' no-source" ' + attrs + '></span>';
    });
    return html + '</div>';
  }

  function rowSide(v) {
    var c = v.cost || {};
    var label = c.short || c.summary || 'Quote';
    var cost = '<span class="row-cost' + (c.mode === 'published' ? '' : ' quote') + '" title="' + esc(c.summary || '') + '">' + esc(label) + '</span>';
    var wk = state.weekend || TARGET_WEEKEND;
    var a = availStatus(v, wk);
    var w = weekendById(wk);
    var avail = '<span class="row-avail" title="' + esc(w.label + ': ' + STATUS_LABEL[a.status]) + '"><span class="dot avail-' + esc(a.status) + '"></span>' + esc(w.mon + ' ' + w.day) + '</span>';
    return '<div class="row-side">' + cost + avail + '</div>';
  }

  function shortSleeps(v) {
    var s = v.sleeps || '';
    if (!s || /^n\/a$/i.test(s)) return v.buyout && /not currently/i.test(v.buyout) ? 'Not currently bookable' : 'Capacity n/a';
    return 'Sleeps ' + s.charAt(0).toLowerCase() + s.slice(1);
  }

  /* ---------- hover / select ---------- */
  function setHover(id) {
    if (state.hover && state.hover !== id) {
      if (rows[state.hover]) rows[state.hover].classList.remove('is-hover');
      var m0 = markers[state.hover]; if (m0 && m0._icon) m0._icon.classList.remove('is-hover');
    }
    state.hover = id;
    if (id) {
      if (rows[id]) rows[id].classList.add('is-hover');
      var m1 = markers[id]; if (m1 && m1._icon) m1._icon.classList.add('is-hover');
    }
  }

  function select(id, opts) {
    opts = opts || {};
    var v = byId(id);
    if (!v) return;
    if (state.selected && state.selected !== id) {
      if (rows[state.selected]) { rows[state.selected].classList.remove('is-selected'); rows[state.selected].setAttribute('aria-selected', 'false'); }
      var mp = markers[state.selected]; if (mp) { if (mp._icon) mp._icon.classList.remove('is-selected'); mp.setZIndexOffset(mp._baseZ); }
    }
    state.selected = id;
    if (rows[id]) {
      rows[id].classList.add('is-selected'); rows[id].setAttribute('aria-selected', 'true');
      if (opts.from !== 'list') scrollRowIntoView(rows[id]);
    }
    var m = markers[id];
    if (m) { if (m._icon) m._icon.classList.add('is-selected'); m.setZIndexOffset(1000); }
    renderDetail(v);
    detailPanel.classList.add('is-open');
    detailPanel.setAttribute('aria-hidden', 'false');
    $('app').classList.add('detail-open');
    detailScroll.scrollTop = 0;
    if (isMobile()) $('listPanel').classList.remove('is-open');
    if (history.replaceState) history.replaceState(null, '', '#' + id);
    if (m) ensureVisible(v);
  }

  function scrollRowIntoView(row) {
    var top = row.offsetTop - listEl.offsetTop;
    var bottom = top + row.offsetHeight;
    var viewTop = listEl.scrollTop, viewBottom = viewTop + listEl.clientHeight;
    if (top < viewTop + 40) listEl.scrollTo({ top: Math.max(0, top - 40), behavior: 'smooth' });
    else if (bottom > viewBottom) listEl.scrollTo({ top: bottom - listEl.clientHeight + 8, behavior: 'smooth' });
  }

  function ensureVisible(v) {
    if (!markers[v.id] || isMobile()) return;
    var size = map.getSize();
    var detailW = detailPanel.classList.contains('is-open') ? detailPanel.offsetWidth : 0;
    var p = map.latLngToContainerPoint([v.lat, v.lng]);
    var margin = 96;
    var dx = 0, dy = 0;
    var maxX = size.x - detailW - margin;
    if (p.x > maxX) dx = p.x - maxX;
    if (p.x < margin) dx = p.x - margin;
    if (p.y > size.y - margin) dy = p.y - (size.y - margin);
    if (p.y < margin) dy = p.y - margin;
    if (dx || dy) map.panBy([dx, dy], { animate: true, duration: 0.4 });
  }

  function closeDetail() {
    detailPanel.classList.remove('is-open');
    detailPanel.setAttribute('aria-hidden', 'true');
    $('app').classList.remove('detail-open');
    if (state.selected) {
      if (rows[state.selected]) { rows[state.selected].classList.remove('is-selected'); rows[state.selected].setAttribute('aria-selected', 'false'); }
      var m = markers[state.selected]; if (m) { if (m._icon) m._icon.classList.remove('is-selected'); m.setZIndexOffset(m._baseZ); }
    }
    state.selected = null;
    if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
  }

  /* ---------- detail ---------- */
  var ICON = {
    phone: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3h3l1.5 4-2 1.2a9 9 0 0 0 5.3 5.3L13 11.5 17 13v3a1 1 0 0 1-1 1A13 13 0 0 1 3 4a1 1 0 0 1 1-1z"/></svg>',
    mail: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="15" height="11" rx="1.5"/><path d="m3 6 7 5 7-5"/></svg>',
    link: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 11.5 11.5 8.5M7 13l-1.2 1.2a2.5 2.5 0 0 1-3.5-3.5L5 8M13 7l1.2-1.2a2.5 2.5 0 0 1 3.5 3.5L15 12"/></svg>',
    map: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17s-5-4.5-5-9a5 5 0 0 1 10 0c0 4.5-5 9-5 9z"/><circle cx="10" cy="8" r="1.8"/></svg>',
    warn: '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3 18 17H2z"/><path d="M10 8v4M10 14.5v.3"/></svg>'
  };

  function renderDetail(v) {
    var imgs = v.images || [];
    var hero = imgs[0];
    var html = '';
    html += '<div class="hero">' +
      (hero ? '<img src="' + esc(hero.file) + '" alt="' + esc(hero.caption || v.name) + '" data-idx="0">' : '') +
      '<button class="detail-close" id="detailClose" aria-label="Close">&times;</button>' +
      (imgs.length > 1 ? '<span class="hero-count">' + imgs.length + ' photos</span>' : '') +
      '</div>';
    html += '<div class="detail-body">';
    html += '<div class="tier-line"><span class="dot tier-' + esc(v.tier) + '"></span>' + esc(v.tierLabel) + (v.travel || v.drive ? '<span style="opacity:.5">·</span><span style="text-transform:none;letter-spacing:0;font-weight:500">' + esc(v.travel || v.drive + ' from SF') + '</span>' : '') + '</div>';
    html += '<h2>' + esc(v.name) + '</h2>';
    if (v.subtitle) html += '<p class="detail-sub">' + esc(v.subtitle) + '</p>';
    html += '<p class="detail-area">' + esc(v.area) + (v.address ? ' · ' + esc(v.address) : '') + '</p>';

    html += '<dl class="facts">';
    html += costFact(v);
    html += fact('Sleeps on-site', v.sleeps);
    html += fact('Exclusive buyout?', v.buyout);
    html += fact('Meeting capacity', v.meeting, true);
    html += '</dl>';

    html += availabilitySection(v);

    html += '<div class="prose">';
    if (v.why) html += '<h3>Why it’s on the list</h3><p class="why">' + esc(v.why) + '</p>';
    if (v.watch) html += '<div class="callout">' + ICON.warn + '<p><strong>Watch out for:</strong> ' + esc(v.watch) + '</p></div>';
    if (v.note) html += '<p class="note">' + esc(v.note) + '</p>';

    html += '</div>';

    html += '<div class="contact">';
    if (v.booking) html += '<a class="btn primary" href="' + esc(v.booking) + '" target="_blank" rel="noopener">' + ICON.link + 'Booking / inquiry</a>';
    if (v.website) html += '<a class="btn" href="' + esc(v.website) + '" target="_blank" rel="noopener">' + ICON.link + esc(hostOf(v.website)) + '</a>';
    if (typeof v.lat === 'number') html += '<a class="btn" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(v.lat + ',' + v.lng) + '" target="_blank" rel="noopener">' + ICON.map + 'Google Maps</a>';
    html += '</div>';
    html += '<div class="contact-lines">';
    if (v.phone) html += '<div>' + (looksLikePhone(v.phone) ? '<a href="tel:' + esc(v.phone.replace(/[^\d+]/g, '')) + '">' + esc(v.phone) + '</a>' : esc(v.phone)) + '</div>';
    if (v.email) html += '<div>' + (v.email.indexOf('@') > 0 ? '<a href="mailto:' + esc(v.email) + '">' + esc(v.email) + '</a>' : esc(v.email)) + '</div>';
    html += '</div>';

    if (imgs.length > 1) {
      html += '<div class="gallery">';
      imgs.slice(1).forEach(function (im, i) {
        var idx = i + 1;
        var span = (imgs.length - 1) % 2 === 1 && i === imgs.length - 2 ? ' span' : '';
        html += '<figure class="' + span.trim() + '" data-idx="' + idx + '"><img src="' + esc(im.file) + '" alt="' + esc(im.caption || '') + '" loading="lazy">' + (im.caption ? '<figcaption>' + esc(im.caption) + '</figcaption>' : '') + '</figure>';
      });
      html += '</div>';
    }
    if (imgs.length) {
      var credits = {};
      imgs.forEach(function (im) { if (im.credit) credits[im.credit] = im.source || credits[im.credit] || ''; });
      var parts = Object.keys(credits).map(function (c) { return credits[c] ? '<a href="' + esc(credits[c]) + '" target="_blank" rel="noopener">' + esc(c) + '</a>' : esc(c); });
      if (parts.length) html += '<p class="credits">Photos: ' + parts.join(' · ') + '</p>';
    }

    html += '</div>';
    detailScroll.innerHTML = html;

    $('detailClose').addEventListener('click', closeDetail);
    Array.prototype.forEach.call(detailScroll.querySelectorAll('.basis-more'), function (b) {
      b.addEventListener('click', function () {
        var wrap = b.closest('.cost-basis');
        var short = wrap.querySelector('.basis-short'), full = wrap.querySelector('.basis-full');
        short.hidden = !short.hidden; full.hidden = !full.hidden;
      });
    });
    if ($('availSection')) {
      renderAvailDetail(v, state.weekend || TARGET_WEEKEND);
      $('availSection').addEventListener('click', function (e) {
        var c = e.target.closest('.avail-cell'); if (c) renderAvailDetail(v, c.dataset.wk);
      });
    }
    Array.prototype.forEach.call(detailScroll.querySelectorAll('[data-idx]'), function (el) {
      el.addEventListener('click', function () { openLightbox(imgs, parseInt(el.dataset.idx, 10)); });
    });
  }

  function costFact(v) {
    var c = v.cost || {};
    if (!c.source_url && !c.summary) return '';
    var label = c.summary || (c.mode === 'quote' ? 'Quote on request' : '');
    var inner = c.source_url
      ? '<a class="cost-link" href="' + esc(c.source_url) + '" target="_blank" rel="noopener" title="' + esc(c.source_label || 'Source') + '">' + esc(label) + '</a>'
      : esc(label);
    if (c.confidence && c.mode === 'published') inner += '<span class="cost-conf">' + esc(c.confidence) + ' confidence</span>';
    var basis = c.basis || '';
    if (c.mode === 'quote' && c.hint) basis += (basis ? ' ' : '') + c.hint;
    if (basis) {
      var tail = c.hint_url ? ' <a href="' + esc(c.hint_url) + '" target="_blank" rel="noopener">source</a>' : '';
      if (basis.length > 230) {
        var cut = basis.slice(0, 200).replace(/\s+\S*$/, '');
        inner += '<span class="cost-basis"><span class="basis-short">' + esc(cut) + '… <button class="basis-more" type="button">more</button></span><span class="basis-full" hidden>' + esc(basis) + tail + ' <button class="basis-more" type="button">less</button></span></span>';
      } else {
        inner += '<span class="cost-basis">' + esc(basis) + tail + '</span>';
      }
    }
    return '<div class="fact wide"><dt>Approx. weekend cost · 60 people, 2 nights</dt><dd>' + inner + '</dd></div>';
  }

  function availabilitySection(v) {
    var ver = v.verified;
    if (!ver || !ver.weekends || !ver.weekends.length) return '';
    var cur = state.weekend || TARGET_WEEKEND;
    var html = '<div class="avail" id="availSection"><h3>Weekend availability (independently verified)</h3><div class="avail-grid">';
    WEEKENDS.forEach(function (w) {
      var a = availStatus(v, w.id);
      html += '<button class="avail-cell' + (w.id === cur ? ' is-active' : '') + (w.target ? ' is-target' : '') + '" data-wk="' + w.id + '" title="' + esc(w.label + ': ' + STATUS_LABEL[a.status]) + '">' +
        '<span class="wk-mon">' + esc(w.mon) + '</span><span class="wk-day">' + esc(w.day) + '</span><span class="dot avail-' + esc(a.status) + '"></span></button>';
    });
    html += '</div><div class="avail-detail" id="availDetail"></div>';
    if (ver.bookingPolicy) html += '<p class="avail-notes">' + esc(ver.bookingPolicy) + '</p>';
    if (ver.method) html += '<p class="avail-method">' + esc(ver.method) + '</p>';
    html += '<div class="avail-legend">' + STATUSES.map(function (st) {
      return '<span><span class="dot avail-' + st + '"></span>' + esc(STATUS_LABEL[st]) + '</span>';
    }).join('') + (ver.checkedOn ? '<span>Checked ' + esc(ver.checkedOn) + '</span>' : '') + '</div></div>';
    return html;
  }

  function renderAvailDetail(v, wkId) {
    var el = $('availDetail'); if (!el) return;
    var w = weekendById(wkId);
    var a = availStatus(v, wkId);
    el.innerHTML = '<strong>' + esc(w.label) + '</strong> — <span class="dot avail-' + esc(a.status) + '"></span> ' + esc(STATUS_LABEL[a.status]) +
      (a.quote ? '<blockquote class="avail-quote">' + esc(a.quote) + '</blockquote>' : '') +
      (a.evidence ? '<div class="avail-ev">' + esc(a.evidence) + '</div>' : '') +
      (a.sourceUrl ? '<a class="avail-open" href="' + esc(textFragmentUrl(a.sourceUrl, a.quote)) + '" target="_blank" rel="noopener">' + esc(a.sourceLabel || hostOf(a.sourceUrl)) + ' \u2197</a>' : '');
    Array.prototype.forEach.call(detailScroll.querySelectorAll('.avail-cell'), function (c) { c.classList.toggle('is-active', c.dataset.wk === wkId); });
  }

  function fact(label, value, wide) {
    if (!value) return '';
    return '<div class="fact' + (wide ? ' wide' : '') + '"><dt>' + esc(label) + '</dt><dd>' + esc(value) + '</dd></div>';
  }
  function hostOf(url) { try { return new URL(url).host.replace(/^www\./, ''); } catch (e) { return url; } }
  function looksLikePhone(s) { return /^\(?\d{3}\)?[\s-]?\d{3}-\d{4}$/.test(s) || /^1-\d{3}-\d{3}-\d{4}$/.test(s); }

  /* ---------- lightbox ---------- */
  var lb = $('lightbox');
  function openLightbox(images, index) {
    state.lightbox = { images: images, index: index };
    showLightbox();
    lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false');
  }
  function showLightbox() {
    var im = state.lightbox.images[state.lightbox.index];
    if (!im) return;
    $('lightboxImg').src = im.file;
    $('lightboxImg').alt = im.caption || '';
    $('lightboxCap').textContent = (im.caption ? im.caption + ' — ' : '') + (state.lightbox.index + 1) + ' / ' + state.lightbox.images.length + (im.credit ? ' · ' + im.credit : '');
  }
  function stepLightbox(d) {
    var n = state.lightbox.images.length; if (!n) return;
    state.lightbox.index = (state.lightbox.index + d + n) % n;
    showLightbox();
  }
  function closeLightbox() { lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); }
  $('lightboxClose').addEventListener('click', closeLightbox);
  $('lightboxPrev').addEventListener('click', function (e) { e.stopPropagation(); stepLightbox(-1); });
  $('lightboxNext').addEventListener('click', function (e) { e.stopPropagation(); stepLightbox(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb || e.target.tagName === 'FIGURE') closeLightbox(); });

  /* ---------- about modal ---------- */
  var aboutModal = $('aboutModal');
  $('aboutBtn').addEventListener('click', function () { aboutModal.classList.add('is-open'); aboutModal.setAttribute('aria-hidden', 'false'); });
  $('aboutClose').addEventListener('click', closeAbout);
  aboutModal.addEventListener('click', function (e) { if (e.target === aboutModal) closeAbout(); });
  function closeAbout() { aboutModal.classList.remove('is-open'); aboutModal.setAttribute('aria-hidden', 'true'); }

  /* ---------- filters ---------- */
  function applyFilters() {
    VENUES.forEach(function (v) {
      var m = markers[v.id]; if (!m) return;
      if (visible(v)) { if (!map.hasLayer(m)) m.addTo(map); } else if (map.hasLayer(m)) map.removeLayer(m);
    });
    if (state.selected && !visible(byId(state.selected))) closeDetail();
    renderList();
    renderWeekends();
    if (state.selected && markers[state.selected] && markers[state.selected]._icon) markers[state.selected]._icon.classList.add('is-selected');
    fitAll();
  }
  $('filters').addEventListener('click', function (e) {
    var btn = e.target.closest('.chip'); if (!btn) return;
    state.filter = btn.dataset.tier;
    Array.prototype.forEach.call($('filters').children, function (c) { c.classList.toggle('is-active', c === btn); });
    applyFilters();
  });

  function renderWeekends() {
    var html = '';
    WEEKENDS.forEach(function (w) {
      var n = VENUES.filter(function (v) { return OPEN_STATUSES[availStatus(v, w.id).status]; }).length;
      var p = VENUES.filter(function (v) { return availStatus(v, w.id).status === 'definitely_not_available'; }).length;
      html += '<button class="wk' + (state.weekend === w.id ? ' is-active' : '') + (w.target ? ' is-target' : '') + '" data-wk="' + w.id + '" title="' + esc(w.label) + ' — ' + n + ' likely open' + (p ? ', ' + p + ' ruled out' : '') + '" role="tab" aria-selected="' + (state.weekend === w.id) + '">' +
        '<span class="wk-mon">' + esc(w.mon) + '</span><span class="wk-day">' + esc(w.day) + '</span>' +
        '<span class="wk-count">' + (n ? '<span class="dot avail-definitely_available"></span>' + n : '<span class="dot avail-unknown"></span>0') + '</span>' +
        (w.target ? '<span class="wk-target-label">target</span>' : '') +
        '</button>';
    });
    $('weekendGrid').innerHTML = html;
    $('weekendsClear').hidden = !state.weekend;
    var hint = $('weekendsHint');
    if (state.weekend) {
      var w = weekendById(state.weekend);
      var n = VENUES.filter(function (v) { return OPEN_STATUSES[availStatus(v, state.weekend).status]; }).length;
      hint.textContent = w.label + ': ' + n + ' venue' + (n === 1 ? '' : 's') + ' with public evidence of being open. Others may still be free — call to confirm.';
    } else {
      hint.textContent = 'Pick a weekend to show only venues with public evidence they\u2019re open then. Most venues don\u2019t publish group availability — call to confirm.';
    }
  }
  $('weekendGrid').addEventListener('click', function (e) {
    var btn = e.target.closest('.wk'); if (!btn) return;
    state.weekend = state.weekend === btn.dataset.wk ? null : btn.dataset.wk;
    applyFilters();
  });
  $('weekendsClear').addEventListener('click', function () { state.weekend = null; applyFilters(); });

  /* ---------- weekend squares: popper tooltip ---------- */
  var tipEl = $('wkTip');
  var tipInstance = null;
  var tipTarget = null;

  function showTip(sq) {
    var v = byId(sq.dataset.venue);
    var w = weekendById(sq.dataset.wk);
    if (!v || !w) return;
    var a = availStatus(v, w.id);
    var quote = a.quote
      ? '<blockquote class="wk-tip-quote">' + esc(a.quote) + '</blockquote>'
      : '<p class="wk-tip-none">No quotable text on the page that was checked.</p>';
    tipEl.innerHTML =
      '<div class="wk-tip-head"><span class="dot avail-' + esc(a.status) + '"></span>' + esc(STATUS_LABEL[a.status]) + '</div>' +
      '<div class="wk-tip-date">' + esc(w.label) + '</div>' +
      quote +
      (a.evidence ? '<p class="wk-tip-ev">' + esc(a.evidence) + '</p>' : '') +
      (a.sourceLabel || a.sourceUrl ? '<p class="wk-tip-src">' + esc(a.sourceLabel || hostOf(a.sourceUrl)) + '</p>' : '') +
      (a.sourceUrl ? '<p class="wk-tip-hint">Click to open the page in a new tab, at this text</p>' : '') +
      '<div class="wk-tip-arrow" data-popper-arrow></div>';
    tipEl.setAttribute('data-show', '');
    tipTarget = sq;
    if (tipInstance) tipInstance.destroy();
    tipInstance = window.Popper.createPopper(sq, tipEl, {
      placement: 'right',
      modifiers: [
        { name: 'offset', options: { offset: [0, 10] } },
        { name: 'flip', options: { fallbackPlacements: ['left', 'bottom', 'top'] } },
        { name: 'preventOverflow', options: { padding: 8 } },
        { name: 'arrow', options: { padding: 6 } }
      ]
    });
  }

  function hideTip() {
    tipEl.removeAttribute('data-show');
    tipTarget = null;
    if (tipInstance) { tipInstance.destroy(); tipInstance = null; }
  }

  /* Build a scroll-to-text URL. Chrome/Edge honour #:~:text=; other browsers ignore it. */
  function textFragmentUrl(url, quote) {
    if (!url) return url;
    if (!quote) return url;
    var base = url.split('#')[0];
    var enc = function (t) { return encodeURIComponent(t).replace(/-/g, '%2D'); };
    var words = quote.trim().split(/\s+/);
    var frag;
    if (words.length > 12) {
      frag = enc(words.slice(0, 5).join(' ')) + ',' + enc(words.slice(-5).join(' '));
    } else {
      frag = enc(quote.trim());
    }
    return base + '#:~:text=' + frag;
  }

  listEl.addEventListener('mouseover', function (e) {
    var sq = e.target.closest && e.target.closest('.wk-sq');
    if (sq && sq !== tipTarget) showTip(sq);
  });
  listEl.addEventListener('mouseout', function (e) {
    var sq = e.target.closest && e.target.closest('.wk-sq');
    if (sq) hideTip();
  });
  /* A square is an ordinary link — the browser opens the tab. The row handler
     ignores clicks that started on one, so the venue isn't selected as well. */
  listEl.addEventListener('click', function (e) {
    var sq = e.target.closest && e.target.closest('.wk-sq');
    if (!sq) return;
    hideTip();
    if (!sq.href) e.preventDefault();
  });
  listEl.addEventListener('scroll', hideTip);

  /* ---------- keyboard ---------- */
  document.addEventListener('keydown', function (e) {
    if (lb.classList.contains('is-open')) {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') stepLightbox(-1);
      else if (e.key === 'ArrowRight') stepLightbox(1);
      return;
    }
    if (aboutModal.classList.contains('is-open')) { if (e.key === 'Escape') closeAbout(); return; }
    if (e.key === 'Escape') { closeDetail(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      var ids = VENUES.filter(visible).map(function (v) { return v.id; });
      if (!ids.length) return;
      var i = ids.indexOf(state.selected);
      var next = i < 0 ? 0 : (i + (e.key === 'ArrowDown' ? 1 : -1) + ids.length) % ids.length;
      e.preventDefault();
      select(ids[next]);
    }
  });

  /* ---------- mobile ---------- */
  $('mobileToggle').addEventListener('click', function () { $('listPanel').classList.add('is-open'); });
  $('mobileClose').addEventListener('click', function () { $('listPanel').classList.remove('is-open'); });
  map.on('click', function () { if (isMobile()) { /* tap on map: no-op */ } });

  /* ---------- init ---------- */
  renderList();
  renderWeekends();
  var fitted = false;
  function initialFit() {
    if (fitted) return;
    var el = $('map');
    if (!el.clientWidth || !el.clientHeight) return;
    map.invalidateSize({ pan: false });
    fitted = true;
    fitAll(false);
    var initial = location.hash.replace(/^#/, '');
    if (initial && byId(initial)) select(initial);
  }
  initialFit();
  (function retry(n) {
    if (fitted || n > 40) return;
    setTimeout(function () { map.invalidateSize({ pan: false }); initialFit(); retry(n + 1); }, 250);
  })(0);
  document.addEventListener('visibilitychange', function () { map.invalidateSize({ pan: false }); initialFit(); });
  if (window.ResizeObserver) {
    new ResizeObserver(function () { map.invalidateSize({ pan: false }); initialFit(); }).observe($('map'));
  } else {
    window.addEventListener('resize', function () { map.invalidateSize(); initialFit(); });
  }
  window.addEventListener('hashchange', function () {
    var id = location.hash.replace(/^#/, '');
    if (id && byId(id) && id !== state.selected) select(id);
  });
})();
