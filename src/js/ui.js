/* ui.js — Summary card, layer panel, checklist, EVA budget bar, left panel mission setup.
   Depends on: config.js, state.js, layers.js, safety.js, targets.js, pov.js, profile.js. */

/* ── Summary card ─────────────────────────────────────────────────────────── */

/* Builds or updates the floating summary card (top-right on the map).
   Reads from STATE.route and calls safety functions for checklist items.
   Uses textContent throughout — no innerHTML with computed values. */
function updateSummaryCard() {
  const card = document.getElementById('summary-card');
  if (!card) return;

  const route = STATE.route;

  if (!route || route.status === 'none') {
    card.style.display = 'none';
    return;
  }

  if (route.status === 'error') {
    card.style.display = 'block';
    card.innerHTML = '';
    const msg = document.createElement('div');
    msg.className = 'sum-error';
    msg.textContent = route.message || 'No walkable route at this slope limit.';
    card.appendChild(msg);
    return;
  }

  card.style.display = 'block';
  card.innerHTML = '';

  const { distanceMeters, timeSeconds, steepestDeg, climbMeters, descentMeters } = route;
  const evaHours   = STATE.evaHours;
  const slopeLimit = STATE.slopeLimitDeg;

  const workMin     = CONFIG.eva.workMinutes;
  const outMin      = timeSeconds / 60;

  // Use real Dijkstra walk-back time for the target, not outbound × 2
  let walkbackMin = outMin;  // fallback if walkback map not ready yet
  if (STATE.walkback && STATE.walkback.status === 'ready' && STATE.walkback.data && STATE.targetCell) {
    const aoi = STATE.grids && STATE.grids.aoi;
    const W   = aoi ? aoi.width : (STATE.grids ? STATE.grids.width : 400);
    const wb  = STATE.walkback.data[STATE.targetCell.row * W + STATE.targetCell.col];
    if (isFinite(wb) && wb > 0) walkbackMin = wb / 60;
  }

  const totalMin    = outMin + workMin + walkbackMin;
  const budgetFrac  = totalMin / (evaHours * 60);
  const budgetPct   = Math.min(100, Math.round(budgetFrac * 100));

  const rows = [
    { label: 'Distance',        value: (distanceMeters / 1000).toFixed(2) + ' km' },
    { label: 'One-way time',    value: Math.round(outMin) + ' min' },
    { label: 'Steepest slope',  value: steepestDeg.toFixed(1) + '°',  tag: 'limit ' + slopeLimit + '°' },
    { label: 'Climb / Descent', value: '+' + Math.round(climbMeters) + ' / −' + Math.round(descentMeters) + ' m' },
    { label: 'Walk-back time',  value: Math.round(walkbackMin) + ' min' },
  ];

  rows.forEach(({ label, value, tag }) => {
    const row = document.createElement('div');
    row.className = 'sum-row';
    const lbl = document.createElement('span');
    lbl.className = 'sum-label';
    lbl.textContent = label;
    const val = document.createElement('span');
    val.className = 'sum-val';
    val.textContent = value;
    row.appendChild(lbl);
    row.appendChild(val);
    if (tag) {
      const t = document.createElement('small');
      t.className = 'sum-tag';
      t.textContent = tag;
      row.appendChild(t);
    }
    card.appendChild(row);
  });

  // EVA budget bar
  const barRow = document.createElement('div');
  barRow.className = 'sum-row sum-eva-row';
  const barLabel = document.createElement('span');
  barLabel.className = 'sum-label';
  barLabel.textContent = 'EVA used';
  const barWrap = document.createElement('div');
  barWrap.className = 'eva-bar-wrap';
  const barFill = document.createElement('div');
  barFill.className = 'eva-bar-fill' + (budgetPct > 90 ? ' danger' : budgetPct > 75 ? ' caution' : ' pass');
  barFill.style.width = budgetPct + '%';
  barWrap.appendChild(barFill);
  const barVal = document.createElement('span');
  barVal.className = 'sum-val';
  barVal.textContent = budgetPct + '%';
  barRow.appendChild(barLabel);
  barRow.appendChild(barWrap);
  barRow.appendChild(barVal);
  card.appendChild(barRow);

  // PONR row (computed from walkback map + route)
  if (typeof computePointOfNoReturn === 'function' && STATE.walkback && STATE.walkback.status === 'ready') {
    const ponrIdx = computePointOfNoReturn();
    if (ponrIdx !== null && route.cells && route.cells.length > ponrIdx) {
      const ponrCell = route.cells[ponrIdx];
      // ponrIdx indexes the thinned display path (route.cells), not route.profile — use the fraction
      const wholeRouteSafe = ponrIdx >= route.cells.length - 1;
      const ponrDistKm = ((ponrIdx / Math.max(1, route.cells.length - 1)) * (route.distanceMeters / 1000)).toFixed(2);
      const ponrRow = document.createElement('div');
      ponrRow.className = 'sum-row';
      const ponrLabel = document.createElement('span');
      ponrLabel.className = 'sum-label';
      ponrLabel.textContent = '↩ Turn-back point';
      const ponrVal = document.createElement('span');
      ponrVal.className = wholeRouteSafe ? 'sum-val sum-pass' : 'sum-val sum-caution';
      ponrVal.textContent = wholeRouteSafe ? 'none: whole route OK' : ponrDistKm + ' km from base';
      ponrVal.title = 'Past this point you cannot complete the EVA within your time budget (including work time and 25% reserve). The amber flag on the map marks this position.';
      ponrRow.appendChild(ponrLabel);
      ponrRow.appendChild(ponrVal);
      card.appendChild(ponrRow);
    }
  }

  // Radiation estimate
  const rad = computeRadiation(evaHours);
  if (rad) {
    const radRow = document.createElement('div');
    radRow.className = 'sum-row';
    const radLabel = document.createElement('span');
    radLabel.className = 'sum-label';
    radLabel.textContent = 'Radiation est.';
    const radVal = document.createElement('span');
    radVal.className = 'sum-val sum-sourced';
    radVal.textContent = rad.doseEstimateMuGy + ' μGy';
    radVal.title = rad.note + '\nSource: ' + rad.source;
    radRow.appendChild(radLabel);
    radRow.appendChild(radVal);
    card.appendChild(radRow);
    _updateRadBadge(rad);
  }

  // Temperature range
  const temp = computeTemperatureRange(STATE.evaStartHour || 8, evaHours, 'northern_spring_summer');
  if (temp) {
    const tempRow = document.createElement('div');
    tempRow.className = 'sum-row';
    const tempLabel = document.createElement('span');
    tempLabel.className = 'sum-label';
    tempLabel.textContent = 'Temp range';
    const tempVal = document.createElement('span');
    tempVal.className = 'sum-val sum-sourced';
    tempVal.textContent = temp.minC + '°C to ' + temp.maxC + '°C';
    tempVal.title = temp.note;
    tempRow.appendChild(tempLabel);
    tempRow.appendChild(tempVal);
    card.appendChild(tempRow);
  }

  // Divider
  const hr = document.createElement('hr');
  hr.className = 'sum-divider';
  card.appendChild(hr);

  // Safety checklist
  const evaParams = {
    slopeLimitDeg:    STATE.slopeLimitDeg,
    evaHours:         STATE.evaHours,
    speedKmh:         STATE.speedKmh,
    evaStartHour:     STATE.evaStartHour || 8,
    season:           'northern_spring_summer',
    walkbackMinutes:  walkbackMin  // real Dijkstra walkback, not outbound × 2
  };
  const checklist = runSafetyChecklist(route, evaParams);
  checklist.forEach(item => {
    const el = document.createElement('div');
    el.className = 'check-item ' + item.status;
    const icon = { pass: '✓', caution: '⚠', fail: '✕', info: 'ℹ' }[item.status] || '·';
    el.textContent = icon + ' ' + item.label;
    if (item.detail) el.title = item.detail + (item.source ? '\nSource: ' + item.source : '');
    card.appendChild(el);
  });

  // POV photo button (if target selected)
  if (STATE.selectedTarget) {
    const povBtn = document.createElement('button');
    povBtn.className = 'sum-pov-btn';
    povBtn.textContent = 'Show surface photo →';
    povBtn.addEventListener('click', () => {
      if (typeof showPovForTarget === 'function') {
        showPovForTarget(STATE.selectedTarget.properties.targetId || STATE.selectedTarget.id);
      }
    });
    card.appendChild(povBtn);
  }
}

/* Updates the persistent radiation badge on the map with the latest dose estimate. */
function _updateRadBadge(rad) {
  const badge = document.getElementById('rad-badge');
  const val   = document.getElementById('rad-badge-val');
  if (!badge || !val) return;
  val.textContent = rad.doseEstimateMuGy + ' μGy';
  badge.style.display = 'flex';
  badge.title = rad.note + '\nSource: ' + rad.source;
}

/* ── Layer panel ──────────────────────────────────────────────────────────── */

/* Shows a small popup near a layer info button. Closes when clicking anywhere else. */
function _showLayerInfoPopup(btn, text) {
  let popup = document.getElementById('layer-info-popup');
  // If already open for the same button, close it (toggle)
  if (popup && popup._sourceBtn === btn) {
    popup.remove();
    return;
  }
  if (popup) popup.remove();

  popup = document.createElement('div');
  popup.id = 'layer-info-popup';
  popup._sourceBtn = btn;

  // Build content lines
  text.split('\n').forEach(line => {
    const p = document.createElement('p');
    p.textContent = line;
    popup.appendChild(p);
  });

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'layer-info-popup-close';
  closeBtn.textContent = '✕';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.addEventListener('click', (e) => { e.stopPropagation(); popup.remove(); });
  popup.appendChild(closeBtn);

  document.body.appendChild(popup);

  // Position near the button
  const rect = btn.getBoundingClientRect();
  const popW = 220;
  let left = rect.right + 6;
  if (left + popW > window.innerWidth - 8) left = rect.left - popW - 6;
  popup.style.left = `${left}px`;
  popup.style.top  = `${Math.max(8, rect.top)}px`;

  // Close on outside click
  const dismiss = (e) => {
    if (!popup.contains(e.target) && e.target !== btn) {
      popup.remove();
      document.removeEventListener('click', dismiss);
    }
  };
  setTimeout(() => document.addEventListener('click', dismiss), 0);
}

/* Builds the right panel layer controls and legend.
   Each layer has: toggle switch, opacity slider, ⓘ info popup.
   Uses DOM methods throughout — no innerHTML with computed values. */
function buildLayerPanel() {
  const panel = document.getElementById('layer-panel-content');
  if (!panel) return;

  const HINT = '⚑ One at a time for best view';
  const layerGroups = [
    {
      layers: [
        { id: 'hirise',   label: 'HiRISE imagery (25 cm)', defaultOn: true,  defaultOpacity: 1.00 },
        { id: 'opm',      label: 'Global basemap (OPM)',   defaultOn: true,  defaultOpacity: 1.00 },
        { id: 'traverse', label: "Curiosity's real path",  defaultOn: false, defaultOpacity: 0.90 },
      ]
    },
    {
      heading: 'Terrain', hint: HINT,
      layers: [
        { id: 'slope',  label: 'Slope classes',      defaultOn: false, defaultOpacity: 0.35 },
        { id: 'relief', label: 'Rocks & ridges (1 m)', defaultOn: false, defaultOpacity: 0.85 },
      ]
    },
    {
      heading: 'Safety', hint: HINT,
      layers: [
        { id: 'los',      label: 'Communication zones', defaultOn: false, defaultOpacity: 0.75 },
        { id: 'rad',      label: 'Radiation zones',     defaultOn: false, defaultOpacity: 0.65 },
        { id: 'walkback', label: 'Walk-back time',      defaultOn: false, defaultOpacity: 0.70 },
      ]
    },
    {
      heading: 'THEMIS IR', hint: HINT,
      layers: [
        { id: 'themisDay',   label: 'THEMIS Day IR',   defaultOn: false, defaultOpacity: 0.70 },
        { id: 'themisNight', label: 'THEMIS Night IR', defaultOn: false, defaultOpacity: 0.70 },
      ]
    },
    {
      layers: [
        { id: 'sites', label: 'Explored sites (9 NASA landings)', defaultOn: true,  defaultOpacity: 1.00 },
        { id: 'grid',  label: 'Coordinate grid (lat/lon)',        defaultOn: false, defaultOpacity: 0.60 },
      ]
    },
  ];

  // Flatten into a single list with injected group headers
  panel.innerHTML = '';

  layerGroups.forEach(group => {
    if (group.heading) {
      const groupHead = document.createElement('div');
      groupHead.className = 'layer-group-heading';
      groupHead.textContent = group.heading;
      if (group.hint) {
        const hintSpan = document.createElement('span');
        hintSpan.className = 'layer-one-at-a-time';
        hintSpan.textContent = group.hint;
        groupHead.appendChild(hintSpan);
      }
      panel.appendChild(groupHead);
    }

    group.layers.forEach(def => {
    const catalogEntry = (typeof LAYER_CATALOG !== 'undefined')
      ? LAYER_CATALOG.find(c => c.id === def.id)
      : null;

    const row = document.createElement('div');
    row.className = 'layer-row';

    // Toggle switch
    const label = document.createElement('label');
    label.className = 'layer-toggle';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = def.defaultOn;
    checkbox.dataset.layerId = def.id;
    checkbox.addEventListener('change', () => {
      if (typeof toggleLayer === 'function') toggleLayer(def.id, checkbox.checked);
    });
    const slider = document.createElement('span');
    slider.className = 'toggle-slider';
    label.appendChild(checkbox);
    label.appendChild(slider);

    const labelText = document.createElement('span');
    labelText.className = 'layer-label';
    labelText.textContent = def.label;

    // Info button (opens popup with source/resolution info)
    const infoBtn = document.createElement('button');
    infoBtn.className = 'layer-info-btn';
    infoBtn.textContent = 'ⓘ';
    infoBtn.setAttribute('aria-label', `Info: ${def.label}`);

    if (catalogEntry) {
      const popupLines = [
        catalogEntry.description,
        `Mission: ${catalogEntry.mission}`,
        `Resolution: ${catalogEntry.resolution}`,
        `Source: ${catalogEntry.source}`
      ];
      infoBtn.dataset.infoText = popupLines.join('\n');
      infoBtn.title = popupLines.join('\n');  // keep native hover for desktop
    } else {
      infoBtn.dataset.infoText = def.label;
      infoBtn.title = def.label;
    }

    infoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      _showLayerInfoPopup(infoBtn, infoBtn.dataset.infoText || '');
    });

    row.appendChild(label);
    row.appendChild(labelText);
    row.appendChild(infoBtn);
    panel.appendChild(row);

    // Opacity slider
    const opacityRow = document.createElement('div');
    opacityRow.className = 'layer-opacity-row';
    const opSlider = document.createElement('input');
    opSlider.type  = 'range';
    opSlider.min   = '0';
    opSlider.max   = '1';
    opSlider.step  = '0.05';
    opSlider.value = String(def.defaultOpacity);
    opSlider.className = 'opacity-slider';
    opSlider.addEventListener('input', () => {
      if (typeof updateLayerOpacity === 'function') {
        updateLayerOpacity(def.id, parseFloat(opSlider.value));
      }
    });
    opacityRow.appendChild(opSlider);
    panel.appendChild(opacityRow);
    });  // end group.layers.forEach
  });    // end layerGroups.forEach

  // Route data section — filled by updateRouteDataPanel() after route computed
  const pathPanel = document.createElement('div');
  pathPanel.id = 'route-data-panel';
  pathPanel.className = 'route-data-panel';
  panel.appendChild(pathPanel);

  if (typeof updateRouteDataPanel === 'function') updateRouteDataPanel(null);
}

/* ── Coordinate tooltip on hover ───────────────────────────────────────────── */

/* Updates the hover tooltip showing elevation and slope for the cell under the cursor.
   Called from map.js mousemove handler after grids are loaded. */
function updateHoverTooltip(lat, lon) {
  const el = document.getElementById('hover-tooltip');
  if (!el || !STATE.grids.loaded) return;

  const cell = latLonToCell(lat, lon);
  if (!cell) { el.style.display = 'none'; return; }

  const elev  = getCellValue(STATE.grids.elevation, cell.row, cell.col);
  const slope = getCellValue(STATE.grids.slope,     cell.row, cell.col);

  if (!isFinite(elev) && !isFinite(slope)) { el.style.display = 'none'; return; }

  el.textContent = (isFinite(elev) ? 'Elev: ' + Math.round(elev) + ' m  ' : '') +
                   (isFinite(slope) ? 'Slope: ' + slope.toFixed(1) + '°' : '');
  el.style.display = 'block';
}

/* ── Assumptions modal ──────────────────────────────────────────────────────── */

function showAssumptionsModal() {
  let modal = document.getElementById('assumptions-modal');
  if (!modal) {
    modal = _buildAssumptionsModal();
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
}

function _buildAssumptionsModal() {
  const modal = document.createElement('div');
  modal.id = 'assumptions-modal';
  modal.className = 'modal-overlay';

  const box = document.createElement('div');
  box.className = 'modal-box';

  const header = document.createElement('div');
  header.className = 'modal-header';
  const title = document.createElement('h2');
  title.textContent = 'Assumptions';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
  header.appendChild(title);
  header.appendChild(closeBtn);
  box.appendChild(header);

  const disclaimer = document.createElement('p');
  disclaimer.className = 'modal-disclaimer';
  disclaimer.textContent = 'This is a planning concept, not flight software. All [OUR ASSUMPTION] values are estimates chosen for this tool.';
  box.appendChild(disclaimer);

  const assumptions = [
    { name: 'Study area size',    value: '4 km × 4 km',  why: 'Walkable range for a single Marswalk; limited by the HiRISE 1 m terrain strip', type: 'OUR ASSUMPTION' },
    { name: 'Grid cell size',      value: '10 m',         why: 'Fast real-time route (160,000 cells); elevation averaged from 1 m HiRISE', type: 'OUR ASSUMPTION' },
    { name: 'Slope limit (default)', value: '15°',        why: 'Conservative estimate for suited EVA traverse', type: 'OUR ASSUMPTION' },
    { name: 'Walking speed (normal)', value: '3 km/h',    why: 'Suited astronaut estimated pace on flat terrain', type: 'OUR ASSUMPTION' },
    { name: 'Uphill speed at limit', value: '40% of flat', why: 'Linear model — becomes very slow near the slope limit', type: 'OUR ASSUMPTION' },
    { name: 'Downhill penalty',    value: '50% of uphill', why: 'Less slowdown going down than going up', type: 'OUR ASSUMPTION' },
    { name: 'Rough ground slowdown', value: '+25% time',  why: 'Roughness above 0.5 m spread adds time', type: 'OUR ASSUMPTION' },
    { name: 'EVA length (default)', value: '6 hours',     why: 'Typical ISS EVA duration used as baseline', type: 'OUR ASSUMPTION' },
    { name: 'Science work time',   value: '60 min',       why: 'Time at the target for sampling', type: 'OUR ASSUMPTION' },
    { name: 'EVA reserve',         value: '25%',          why: 'Must keep 25% of EVA unused for safety', type: 'OUR ASSUMPTION' },
    { name: 'Radiation baseline',  value: '233 μGy/day',  why: 'Measured by Curiosity RAD at Gale Crater', type: 'SOURCE: Hassler et al. 2014, Science 343(6169)' },
    { name: 'Temperature data',    value: 'REMS daily low/high',  why: 'Curiosity REMS air temp at 1.6 m height; hours in between are approximate', type: 'SOURCE: Curiosity REMS daily record (NASA Mars / CAB)' },
  ];

  const table = document.createElement('table');
  table.className = 'modal-table';
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Assumption', 'Value', 'Why', 'Type'].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  assumptions.forEach(a => {
    const tr = document.createElement('tr');
    [a.name, a.value, a.why, a.type].forEach(text => {
      const td = document.createElement('td');
      td.textContent = text;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  box.appendChild(table);

  modal.appendChild(box);
  modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
  return modal;
}

/* ── About & Sources modal ──────────────────────────────────────────────────── */

function showAboutModal() {
  let modal = document.getElementById('about-modal');
  if (!modal) {
    modal = _buildAboutModal();
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
}

function _buildAboutModal() {
  const modal = document.createElement('div');
  modal.id = 'about-modal';
  modal.className = 'modal-overlay';

  const box = document.createElement('div');
  box.className = 'modal-box';

  const header = document.createElement('div');
  header.className = 'modal-header';
  const title = document.createElement('h2');
  title.textContent = 'About & Sources';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
  header.appendChild(title);
  header.appendChild(closeBtn);
  box.appendChild(header);

  const content = [
    ['What is MarsWalk?', "A layered EVA planning tool for the real site where NASA's Curiosity rover studied boxwork ridges in 2025-2026 (Mount Sharp, Gale Crater). It layers NASA data from 4 missions at walking scale to help plan a safe Marswalk."],
    ['This is a planning concept', 'Not flight software. All assumptions are stated on screen. Data sources are listed below.'],
    ['Cannot model', 'Single rocks smaller than ~2 m (they only show as extra relief), soil softness, suit or gear details, radiation forecasts, or real-time conditions.'],
    ['Imagery layers', 'HiRISE orthoimage ESP_019988_1750 (0.25 m/px; NASA/JPL/University of Arizona, via USGS Astrogeology, CC0). Outside the study area: OpenPlanetaryMap (NASA Viking MDIM 2.1 + MOLA). THEMIS day/night IR mosaics (NASA/JPL/ASU via NASA Mars Trek; Edwards et al. 2011).'],
    ['Elevation data', 'HiRISE DTM DTEEC_019698_1750_019988_1750_U01 (1 m/px; HiRISE team, University of Arizona; McEwen et al. 2007, JGR 112). Slope = 10 m cells; rock & ridge relief = 1 m. Check: matches the elevations Curiosity reported along its real path (see Validation).'],
    ['Validation', (STATE.validation
      ? `We compared our terrain model with the elevation Curiosity itself reported at ${STATE.validation.n} real stops inside the study area. After removing a constant ${Math.abs(STATE.validation.meanOffsetM).toFixed(1)} m datum offset, they agree to within ${STATE.validation.rmsAfterOffsetM.toFixed(1)} m (RMS). The rover's own path also stays on slopes our model rates as walkable.`
      : 'Terrain check against Curiosity waypoints runs after the data loads.')],
    ['Curiosity path + photos', 'Rover traverse and waypoints: NASA/JPL-Caltech MMGIS. Photos: Curiosity Navcam/Mastcam raw images from the sol the rover stood at each target (NASA/JPL-Caltech/MSSS).'],
    ['Radiation baseline', 'Hassler et al. (2014), Science 343(6169), doi:10.1126/science.1244797'],
    ['Temperature data', 'Curiosity REMS daily air temperature record, NASA Mars / Centro de Astrobiologia (mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json); background: Martínez et al. (2017), JGR Planets'],
    ['Science targets', 'Targets 1-4 sit at Curiosity’s real positions: Altadena drill (sol 4571), Monte Grande hollow / Nevado Sajama ridge drills (sols ~4695-4718), boxwork entry (sol 4548), latest position (sol 5073). Sources: NASA/JPL news (June 2025); Curiosity blog sols 4709-4722 (Nov 2025); Siebach & Grotzinger 2014, JGR Planets 119 (boxwork). Target 5 is our own pick from HiRISE.'],
    ['Route model', 'Dijkstra (walk-back map) + gradient descent (route). Speed model is a linear approximation [OUR ASSUMPTION].'],
    ['AI use', 'Claude Code (Anthropic) wrote most application code and data scripts; OpenAI Codex wrote the visor HUD module (hud.js, hud.css). Humans chose the concept, verified data sources, and tested. No AI-generated images or video.'],
    ['Challenge', 'NASA Space Apps 2026 — "The Next Frontier". Team: Dark Matter Devs.'],
  ];

  content.forEach(([heading, text]) => {
    const h = document.createElement('h3');
    h.className = 'modal-section-heading';
    h.textContent = heading;
    box.appendChild(h);
    const p = document.createElement('p');
    p.className = 'modal-section-text';
    p.textContent = text;
    box.appendChild(p);
  });

  // Full reference list with clickable links (same list as docs/SOURCES.md)
  const REFERENCES = [
    ['HiRISE DTM DTEEC_019698_1750_019988_1750_U01 + orthoimages (USGS Astrogeology STAC, CC0)', 'https://stac.astrogeology.usgs.gov/api/collections/mro_hirise_socet_dtms/items/DTEEC_019698_1750_019988_1750_U01'],
    ['McEwen et al. (2007), HiRISE instrument, JGR 112, E05S02', 'https://doi.org/10.1029/2005JE002605'],
    ['Curiosity traverse + waypoints (NASA/JPL-Caltech MMGIS)', 'https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/'],
    ['Curiosity raw images (NASA/JPL-Caltech/MSSS)', 'https://mars.nasa.gov/msl/multimedia/raw-images/'],
    ['THEMIS Day/Night IR controlled mosaics via NASA Mars Trek', 'https://trek.nasa.gov/mars/'],
    ['Edwards et al. (2011), THEMIS mosaics, JGR 116, E10008', 'https://doi.org/10.1029/2010JE003755'],
    ['OpenPlanetaryMap Mars basemap (Viking MDIM 2.1 + MOLA)', 'https://www.openplanetary.org/opm'],
    ['Hassler et al. (2014), RAD surface radiation, Science 343(6169)', 'https://doi.org/10.1126/science.1244797'],
    ['REMS weather station (Curiosity), INTA-CSIC', 'https://cab.inta-csic.es/rems/en/'],
    ["NASA/JPL: Curiosity starts unpacking boxwork formations (June 2025)", 'https://www.jpl.nasa.gov/news/nasas-curiosity-mars-rover-starts-unpacking-boxwork-formations/'],
    ['Curiosity blog, sols 4641-4648: Thinking outside and inside the boxwork', 'https://science.nasa.gov/blog/curiosity-blog-sols-4641-4648-thinking-outside-and-inside-the-boxwork/'],
    ['Curiosity blog, sols 4695-4701: Searching for answers at Monte Grande', 'https://science.nasa.gov/blog/curiosity-blog-sols-4695-4701-searching-for-answers-at-monte-grande/'],
    ['Curiosity blog, sols 4709-4715: Drilling high and low in the boxwork unit', 'https://science.nasa.gov/blog/curiosity-blog-sols-4709-4715-drilling-high-and-low-in-the-boxwork-unit'],
    ['Curiosity blog, sols 4716-4722: Drilling success at Nevado Sajama', 'https://science.nasa.gov/blog/curiosity-blog-sols-4716-4722-drilling-success-at-nevado-sajama/'],
    ['Siebach & Grotzinger (2014), boxwork water estimates, JGR Planets 119', 'https://doi.org/10.1002/2013JE004508'],
    ['Leaflet 1.9.4 (BSD-2-Clause)', 'https://leafletjs.com'],
    ['NASA Space Apps 2026 challenge: Interplanetary Survival Guide: Martian Map', 'https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/'],
  ];
  const refHeading = document.createElement('h3');
  refHeading.className = 'modal-section-heading';
  refHeading.textContent = 'References';
  box.appendChild(refHeading);
  const refList = document.createElement('ol');
  refList.className = 'modal-section-text modal-ref-list';
  REFERENCES.forEach(([label, url]) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.textContent = label;
    li.appendChild(a);
    refList.appendChild(li);
  });
  box.appendChild(refList);

  modal.appendChild(box);
  modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
  return modal;
}

/* ── How to Use modal ───────────────────────────────────────────────────────── */

function showHowToUseModal() {
  let modal = document.getElementById('how-to-use-modal');
  if (!modal) {
    modal = _buildHowToUseModal();
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
}

function _buildHowToUseModal() {
  const modal = document.createElement('div');
  modal.id = 'how-to-use-modal';
  modal.className = 'modal-overlay';

  const box = document.createElement('div');
  box.className = 'modal-box modal-box-wide';

  const header = document.createElement('div');
  header.className = 'modal-header';
  const title = document.createElement('h2');
  title.textContent = 'How to Use MarsWalk';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
  header.appendChild(title);
  header.appendChild(closeBtn);
  box.appendChild(header);

  const sections = [
    {
      heading: '🗺 What is MarsWalk?',
      items: [
        'MarsWalk is an EVA (spacewalk) planning tool for astronauts on Mars.',
        'It layers NASA data on a map to help you plan a safe walking route to a science target at Gale Crater.',
        'You pick a target, the tool draws a route that avoids steep slopes, and shows you a safety summary — distance, time, radiation, temperature — before you go.',
        'This is a planning concept, not flight software. All assumptions are clearly labeled.',
      ]
    },
    {
      heading: '🌍 The Map',
      items: [
        'Inside the study area the map shows 25 cm HiRISE images; outside, a global NASA Viking + MOLA basemap.',
        "The orange dashed box is your 4 km × 4 km planning area on Curiosity's real boxwork route. The white dotted line is the rover's actual path.",
        'Pan by clicking and dragging. Zoom with the scroll wheel or +/− buttons.',
        'You can explore anywhere on Mars using the location library in the left panel — but EVA planning only works inside the orange box.',
        'If you pan away from Gale Crater, a yellow banner appears. Click "Return to study area" to come back.',
        'The coordinate readout in the bottom-left corner shows the latitude and longitude of your cursor.',
      ]
    },
    {
      heading: '📍 Science Targets (left panel, top section)',
      items: [
        'The "Science Targets" section lists 5 real places that Curiosity has studied near Mount Sharp.',
        'Click a target card to expand it and read about why that location matters scientifically.',
        'Each card shows the target\'s name, distance from the habitat, and a one-line science description.',
        'Click "Plan route to this target →" on any card to draw the safest walking route from the habitat.',
        'The orange ① ② ③ ④ ⑤ circles on the map mark each target. Click them directly to select a target.',
        'The green tent icon (⌂) on the map marks your habitat — the starting point for all routes.',
      ]
    },
    {
      heading: '🗂 Location Library (left panel, bottom section)',
      items: [
        'The location library lists 52 places on Mars you can explore.',
        'Use the search box to find any location by name, type, or mission (try "volcanic", "rover", or "crater").',
        'Click any card header to expand it and read full safety notes, elevation, and mission data.',
        'Click "Fly to this location →" to zoom the map to that place.',
        'Only Gale Crater and Mount Sharp are inside the EVA planning area. All other locations show an informational note.',
      ]
    },
    {
      heading: '🛤 Planning a Route',
      items: [
        '1. The habitat (green tent) is your starting point. It sits on the flattest wide pad in the southwest of the study area.',
        '2. Click a science target card and press "Plan route" — or click directly on a numbered marker on the map.',
        '3. The route (teal/cyan line) will appear in under a second, following the flattest path that respects your slope limit.',
        '4. The Summary Card appears in the top-right corner of the map with all the numbers you need.',
        '5. Adjust the slope limit slider to see how the route changes (steeper = shorter route; gentler = safer route).',
        '6. The elevation profile chart at the bottom shows the height changes along the route.',
      ]
    },
    {
      heading: '📊 Summary Card (top-right of map)',
      items: [
        'Distance — total distance of the route in kilometres.',
        'One-way time — estimated walking time to the target in minutes.',
        'Steepest slope — the steepest point on the route. The small "[limit 15°]" tag is your current slope limit.',
        'Climb / Descent — total height gained and lost along the route in metres.',
        'Walk-back time — estimated time to walk back from the target to the habitat.',
        'EVA used — percentage of your EVA time that the full trip (out + science work + back) will use. Green = safe, amber = tight, red = over budget.',
        'Radiation est. — estimated radiation dose for the EVA duration, based on Curiosity RAD data [Hassler et al. 2014]. Hover to see the source.',
        'Temp range — estimated air temperature range during your EVA window, from Curiosity REMS data. Hover to see the source.',
        'Safety checklist — ✓ pass, ⚠ caution, ✕ fail for each safety check. Hover any item for details.',
      ]
    },
    {
      heading: '⚙ EVA Controls (left panel, middle section)',
      items: [
        'Slope limit — the steepest angle (in degrees) the route is allowed to cross. Default 15°. Raise it to allow steeper paths; lower it for safer travel. 0° = flat only; 25° = very steep.',
        'EVA length — how many hours your spacewalk lasts. Default 6 hours. The EVA used % bar in the summary card will update.',
        'Walking speed — how fast you walk on flat ground. Slow (2 km/h) = very careful; Normal (3 km/h) = default; Fast (4 km/h) = best case. Uphill and rough ground automatically slow you down.',
        'EVA start time — the local Mars time when you leave the habitat. This sets the temperature window shown in the temperature chart and the temperature range in the summary card.',
        'All controls are labeled [our assumption] because no official suited-EVA speed data exists for Mars yet.',
      ]
    },
    {
      heading: '🗂 Layers Panel (right panel)',
      items: [
        'Each row is a data layer. The toggle switch (blue = on, grey = off) turns it on or off.',
        'The opacity slider below each layer name adjusts how transparent the layer is.',
        'The ⓘ button shows the data source, mission, and resolution for that layer.',
        'HiRISE imagery — 25 cm orbital photos of the study area. Global basemap (OPM) — NASA Viking + MOLA context outside it.',
        'Slope classes — a colour overlay showing terrain steepness: green = gentle, yellow = moderate, orange = steep, red = very steep. See the SLOPE LEGEND below.',
        'Walk-back time — colour bands showing how many minutes it takes to walk back to the habitat from any point (requires a route to be computed first).',
        'THEMIS Day IR — thermal infrared from the Mars Odyssey spacecraft showing surface warmth during the day.',
        'The SLOPE LEGEND at the bottom of the layers panel shows what each colour means in degrees.',
      ]
    },
    {
      heading: '📈 Charts (bottom bar)',
      items: [
        'Elevation Profile (left chart) — shows the height of the terrain along your route from start to finish. Steep sections are highlighted.',
        'Temperature Chart (right chart) — shows the estimated air temperature at Gale Crater over a full Mars day (24 hours). The shaded amber region is your EVA window. Blue line = cooler half of the Mars year (Ls 0–180); orange line = warmer half (Ls 180–360). Daily low and high are measured by Curiosity; the hours in between are approximate.',
        'The charts update whenever you pick a new route or change the EVA start time.',
        'Both charts use real data from Curiosity instruments, sourced from published papers.',
      ]
    },
    {
      heading: '🏠 Safety Checklist Explained',
      items: [
        '✓ Pass (green) — this check is satisfied. No action needed.',
        '⚠ Caution (amber) — the route works but is tight. Consider adjusting your plan.',
        '✕ Fail (red) — a critical limit is exceeded. The route is not safe as planned.',
        'ℹ Info (grey) — informational note. Not a pass/fail — just context.',
        'Hover any checklist item to see the specific numbers and data source behind the check.',
        'Common cautions: route is much longer than a straight line (big detour); target is near the edge of the study area; steepest slope is close to your limit.',
      ]
    },
    {
      heading: '📷 Surface Photos',
      items: [
        'Each science target has a "Show surface photo →" button at the bottom of the Summary Card.',
        'The photo panel slides in from the right showing a real Curiosity photograph near that target.',
        'Photos are from the Curiosity Mastcam or Navcam cameras. The caption shows the camera, Mars sol (day), and a link to the original NASA image.',
        '"What you should expect on arrival" describes the terrain visible in the photo.',
        'If no photo is available for a target yet, a text description appears instead.',
      ]
    },
    {
      heading: '⚠ What This Tool Cannot Do',
      items: [
        'Single small rocks — the terrain model is 1 m; rocks under ~2 m only show up as extra relief in the Rocks & ridges layer.',
        'Soil softness or dust depth — cannot predict whether the ground will bear weight.',
        'Suit or life support details — no suit pressure, oxygen, or cooling modeled.',
        'Radiation forecasts — the radiation number is a baseline from calm solar conditions, not a forecast.',
        'Real-time Mars weather — all atmospheric data is a statistical average, not a live feed.',
        'All limitations are listed on the About & Sources page.',
      ]
    },
  ];

  sections.forEach(section => {
    const h = document.createElement('h3');
    h.className = 'modal-section-heading';
    h.textContent = section.heading;
    box.appendChild(h);

    const ul = document.createElement('ul');
    ul.className = 'how-to-list';
    section.items.forEach(text => {
      const li = document.createElement('li');
      li.textContent = text;
      ul.appendChild(li);
    });
    box.appendChild(ul);
  });

  modal.appendChild(box);
  modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
  return modal;
}

/* ── EVA controls wiring ────────────────────────────────────────────────────── */

let _evaDebounceTimer = null;

/* Re-triggers route calculation after a short delay to avoid rapid recalcs on slider drag. */
function _debounceRecalc() {
  clearTimeout(_evaDebounceTimer);
  _evaDebounceTimer = setTimeout(() => {
    if (STATE.habitat && typeof triggerWalkback === 'function') {
      triggerWalkback(STATE.habitat);
    }
    if (STATE.selectedTarget && typeof triggerRoute === 'function') {
      const [lon, lat] = STATE.selectedTarget.geometry.coordinates;
      triggerRoute({ lat, lon });
    }
  }, 300);
}

/* Wires the left-panel EVA sliders and speed presets to STATE. */
function _initEvaControls() {
  // Slope limit
  const slopeSlider = document.getElementById('slope-limit-slider');
  const slopeVal    = document.getElementById('slope-limit-val');
  if (slopeSlider) {
    slopeSlider.addEventListener('input', () => {
      STATE.slopeLimitDeg = parseInt(slopeSlider.value, 10);
      if (slopeVal) slopeVal.textContent = STATE.slopeLimitDeg;
      _debounceRecalc();
    });
  }

  // EVA hours
  const evaSlider = document.getElementById('eva-hours-slider');
  const evaVal    = document.getElementById('eva-hours-val');
  if (evaSlider) {
    evaSlider.addEventListener('input', () => {
      STATE.evaHours = parseFloat(evaSlider.value);
      if (evaVal) evaVal.textContent = STATE.evaHours;
      // Update rad badge even if no route is loaded yet
      if (typeof computeRadiation === 'function') {
        const r = computeRadiation(STATE.evaHours);
        if (r) _updateRadBadge(r);
      }
      updateSummaryCard();
      if (typeof drawTempChart === 'function') drawTempChart('temp-canvas');
    });
  }

  // Speed presets
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.speed-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      STATE.speedKmh = parseFloat(btn.dataset.speed);
      _debounceRecalc();
    });
  });

  // EVA start hour
  const startSlider = document.getElementById('eva-start-slider');
  const startVal    = document.getElementById('eva-start-val');
  if (startSlider) {
    startSlider.addEventListener('input', () => {
      STATE.evaStartHour = parseInt(startSlider.value, 10);
      const h = STATE.evaStartHour.toString().padStart(2, '0');
      if (startVal) startVal.textContent = h + ':00';
      updateSummaryCard();
      if (typeof drawTempChart === 'function') drawTempChart('temp-canvas');
    });
  }

}

/* ── Init ───────────────────────────────────────────────────────────────────── */

function initUI() {
  buildLayerPanel();
  _initEvaControls();

  // Wire up top-bar buttons
  document.getElementById('btn-how-to-use')?.addEventListener('click', showHowToUseModal);
  document.getElementById('btn-assumptions')?.addEventListener('click', showAssumptionsModal);
  document.getElementById('btn-about')?.addEventListener('click', showAboutModal);
  document.getElementById('btn-reload')?.addEventListener('click', () => {
    location.reload();
  });

  console.log('[ui] initialized');
}
