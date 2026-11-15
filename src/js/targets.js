/* targets.js — Loads targets.geojson, places numbered markers on the map,
   renders target cards in the left panel, triggers route on target click.
   Depends on: config.js (CONFIG), state.js (STATE), route.js (triggerRoute). */

/* Loads targets.geojson and stores in STATE.targets. */
async function loadTargets() {
  try {
    const resp = await fetch('./data/targets.geojson');
    if (!resp.ok) throw new Error(`targets.geojson: ${resp.status}`);
    const geojson = await resp.json();
    STATE.targets = geojson.features;
    console.log(`[targets] loaded ${STATE.targets.length} science targets`);
    return true;
  } catch (err) {
    console.error('[targets] load error:', err);
    STATE.targets = [];
    return false;
  }
}

/* Places a numbered circle marker for each target on the Leaflet map. */
function renderTargetMarkers() {
  if (!STATE.map || !STATE.targets.length) return;

  STATE.targets.forEach(feature => {
    const [lon, lat] = feature.geometry.coordinates;
    const { index, name } = feature.properties;

    const icon = L.divIcon({
      className:  'target-icon',
      html:       `<div class="target-pin" data-index="${index}">${index}</div>`,
      iconSize:   [26, 26],
      iconAnchor: [13, 13]
    });

    const marker = L.marker([lat, lon], { icon, zIndexOffset: 500 })
      .addTo(STATE.map)
      .on('click', () => {
        selectTarget(feature);
      });

    marker.bindTooltip(name, { direction: 'top', offset: [0, -14], className: 'target-tooltip' });
  });
}

/* Renders the target cards in the left panel inside #science-targets-list.
   innerHTML safety: all values come from targets.geojson (developer-controlled).
   The only computed values are lat.toFixed(2) and lon.toFixed(2) — numeric, cannot contain HTML. */
function renderTargetCards() {
  const container = document.getElementById('science-targets-list');
  if (!container) return;

  if (!STATE.targets.length) {
    container.innerHTML = '<div class="placeholder-text">Science targets loading...</div>';
    return;
  }

  container.innerHTML = STATE.targets.map(feature => {
    const { index, name, shortName, kind, why, detail, findings, source, selectionNote } = feature.properties;
    const [lon, lat] = feature.geometry.coordinates;
    const latStr = Math.abs(lat).toFixed(2) + (lat < 0 ? '°S' : '°N');
    const lonStr = lon.toFixed(2) + '°E';

    const findingsBlock = findings ? `<div class="target-findings">${findings}</div>` : '';
    const detailBlock = (detail || findings) ? `
      <details class="target-detail-block">
        <summary class="target-detail-toggle">What to look for ▾</summary>
        <div class="target-detail-text">${detail || ''}</div>
        ${findingsBlock}
      </details>` : '';

    return `<div class="target-card" data-id="${feature.id}">
      <div class="target-card-header">
        <div class="target-card-num">${index}</div>
        <div class="target-card-name">${name}</div>
      </div>
      <div class="target-card-kind">${kind}</div>
      <div class="target-card-why">${why}</div>
      ${detailBlock}
      <div class="target-card-coords">${latStr}  ${lonStr}</div>
      <div class="target-card-source">Source: ${source}</div>
      <div class="target-card-note">${selectionNote}</div>
      <button class="target-route-btn" data-id="${feature.id}">Plan route to this target →</button>
    </div>`;
  }).join('');

  container.querySelectorAll('.target-route-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const feature = STATE.targets.find(f => f.id === btn.dataset.id);
      if (feature) selectTarget(feature);
    });
  });
}

/* Selects a target, flies the map to it, and triggers route calculation. */
function selectTarget(feature) {
  if (!feature) return;
  const [lon, lat] = feature.geometry.coordinates;
  STATE.selectedTarget = feature;

  // The user may zoom freely while a route shows (the old zoom lock could leave the map stuck on the whole planet).
  // If the map is still far out, go to the study area so the new route is on screen.
  if (typeof showStudyAreaForRoute === 'function') showStudyAreaForRoute();

  // Highlight the active target card
  document.querySelectorAll('.target-card').forEach(card => {
    card.classList.toggle('active', card.dataset.id === feature.id);
  });

  // Trigger route computation
  if (typeof triggerRoute === 'function') {
    triggerRoute({ lat, lon });
  }
}

/* Initializes targets: loads geojson, adds markers, renders cards. */
async function initTargets() {
  const ok = await loadTargets();
  if (!ok) return;
  renderTargetMarkers();
  renderTargetCards();
}
