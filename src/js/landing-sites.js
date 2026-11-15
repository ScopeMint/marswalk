/* landing-sites.js — Every NASA lander / rover site on Mars, shown as a bordered patch of sharp imagery.
   Depends on: state.js (STATE), map.js (STATE.map). Data: ./data/landing-sites.json + ./data/sites/*.jpg
   (both made by scripts/10_build_landing_sites.py).

   Why: the global basemap is coarse (~232 m/px) but our study area is sharp (HiRISE). Without a hint
   that looks odd. This layer shows WHY some places are sharp: they are the places NASA has explored
   on the ground, and orbiters photographed them in detail. Each site gets:
     - a pin at the published landing point (always visible, even on the whole-planet view),
     - a blue border around a 4 km box of HiRISE imagery, with an "EXPLORED SITE" label,
     - a popup with mission facts and the sources of every number.
   The photo for a site is only downloaded when you zoom in near it (keeps the first load small). */

const SITES_BORDER_COLOR      = '#7FB4FF';  // blue = explored on the ground (study area stays orange)
const SITES_IMAGE_MIN_ZOOM    = 8;          // load a site's photo only at this zoom or closer
const SITES_PIN_LABEL_MIN_ZOOM = 3;         // show names next to pins from this zoom (3 = always)
const SITES_BOX_LABEL_MIN_ZOOM = 11;        // show the "EXPLORED SITE" border label from this zoom
const SITES_FLY_MAX_ZOOM      = 15;         // closest zoom when jumping to a site

/* Adds one "label: value" line to a popup using DOM methods (no innerHTML with data). */
function _siteLine(parent, label, value) {
  const row = document.createElement('div');
  row.className = 'site-popup-row';
  const b = document.createElement('span');
  b.className = 'site-popup-label';
  b.textContent = label;
  row.appendChild(b);
  row.appendChild(document.createTextNode(value));
  parent.appendChild(row);
}

/* Formats a lat/lon pair like the coordinate readout, e.g. "14.5700°S  175.4800°E". */
function _siteCoordText(lat, lon) {
  const latStr = Math.abs(lat).toFixed(4) + (lat >= 0 ? '°N' : '°S');
  const lonStr = Math.abs(lon).toFixed(4) + (lon >= 0 ? '°E' : '°W');
  return latStr + '  ' + lonStr;
}

/* Builds the popup for one site: mission facts, coordinates, sources, and a zoom button. */
function _sitePopup(site, bounds) {
  const box = document.createElement('div');
  box.className = 'site-popup';

  const title = document.createElement('div');
  title.className = 'site-popup-title';
  title.textContent = site.name;
  box.appendChild(title);

  _siteLine(box, 'Type: ', site.kind + ' (NASA)');
  _siteLine(box, 'Landed: ', site.landed);
  _siteLine(box, 'Place: ', site.siteName);
  _siteLine(box, 'Landing point: ', _siteCoordText(site.lat, site.lon) + (site.coordApproximate ? ' (approximate)' : ''));
  _siteLine(box, 'Position source: ', site.coordSource);
  _siteLine(box, 'Photo: ', site.imageryTitle + ', about ' + site.imageryMetersPerPixel + ' m/px as shown; '
    + site.boxWidthMeters + ' x ' + site.boxHeightMeters + ' m box'
    + (site.imageryCoveredFraction < 0.99 ? ' (black = no NASA image there)' : ''));
  _siteLine(box, 'Photo source: ', 'NASA Mars Trek, HiRISE on Mars Reconnaissance Orbiter (NASA/JPL-Caltech/University of Arizona)');

  const btn = document.createElement('button');
  btn.className = 'site-popup-btn';
  btn.textContent = 'Zoom to this site';
  btn.addEventListener('click', () => STATE.map.fitBounds(bounds, { maxZoom: SITES_FLY_MAX_ZOOM }));
  box.appendChild(btn);
  return box;
}

/* Makes a small text marker (pin or border label). Text is set with textContent, never as markup. */
function _siteTextMarker(lat, lon, className, text, anchor) {
  return L.marker([lat, lon], {
    icon: L.divIcon({ className: className, html: '', iconSize: [0, 0], iconAnchor: anchor || [0, 0] }),
    keyboard: false
  }).on('add', function() {
    const el = this.getElement();
    if (!el || el.firstChild) return;
    const span = document.createElement('span');
    span.textContent = text;
    el.appendChild(span);
  });
}

/* Loads or unloads each site's photo depending on zoom and whether the site is on screen.
   Also switches the pin names and border labels on/off by zoom (CSS classes on the map). */
function refreshLandingSites() {
  const map = STATE.map;
  const group = STATE.tileLayers.sites;
  if (!map || !group || !STATE.landingSites) return;
  const zoom = map.getZoom();
  const container = map.getContainer();
  container.classList.toggle('sites-pin-labels', zoom >= SITES_PIN_LABEL_MIN_ZOOM);
  container.classList.toggle('sites-box-labels', zoom >= SITES_BOX_LABEL_MIN_ZOOM);

  const groupOnMap = map.hasLayer(group);
  const view = map.getBounds();
  STATE.landingSites.forEach(entry => {
    const want = groupOnMap && zoom >= SITES_IMAGE_MIN_ZOOM && view.intersects(entry.bounds);
    const has = group.hasLayer(entry.image);
    if (want && !has) {
      entry.image.setOpacity(STATE.layers.sites.opacity);
      group.addLayer(entry.image);
      entry.image.bringToBack();   // photo under its own border, pin and label
    } else if (!want && has) {
      group.removeLayer(entry.image);
    }
  });
}

/* Loads landing-sites.json and builds the layer. Call once after initMap(). Safe if the file is missing. */
async function initLandingSites(map) {
  if (!map || STATE.tileLayers.sites) return;
  let data;
  try {
    const resp = await fetch('./data/landing-sites.json');
    if (!resp.ok) throw new Error(resp.status);
    data = await resp.json();
  } catch (err) {
    console.warn('[sites] landing-sites.json not loaded:', err);
    return;
  }

  const group = L.layerGroup();
  STATE.landingSites = data.sites.map(site => {
    const b = site.bounds;
    const bounds = L.latLngBounds([b.south, b.west], [b.north, b.east]);

    L.rectangle(bounds, { color: SITES_BORDER_COLOR, weight: 2, opacity: 0.95, fill: false, interactive: false })
      .addTo(group);

    // Label sitting on the top edge of the border
    _siteTextMarker(b.north, b.west, 'site-box-label',
      'EXPLORED SITE: ' + site.name + ' (' + site.kind.toLowerCase() + ', landed ' + site.landed + ')', [0, 20])
      .addTo(group);

    // Pin at the landing point; click = popup with facts and sources
    _siteTextMarker(site.lat, site.lon, 'site-pin', site.name)
      .bindPopup(() => _sitePopup(site, bounds), { maxWidth: 320, className: 'site-popup-wrap' })
      .addTo(group);

    const image = L.imageOverlay(site.image, bounds, {
      opacity: STATE.layers.sites.opacity,
      interactive: false,
      attribution: 'Landing-site photos: HiRISE, NASA/JPL-Caltech/UArizona via NASA Mars Trek'
    });
    return { site, bounds, image };
  });

  STATE.tileLayers.sites = group;
  group.on('add remove', refreshLandingSites);
  map.on('moveend zoomend', refreshLandingSites);
  if (STATE.layers.sites.visible) group.addTo(map);
  refreshLandingSites();
  console.log('[sites] ' + STATE.landingSites.length + ' NASA landing sites loaded');
}
