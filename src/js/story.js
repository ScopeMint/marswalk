/* story.js — Extra sections for the About & Sources panel: why this site, how slope is computed, reference
   checks for walking speed, energy and radiation, an Apollo 17 comparison, and what we cannot model.
   Depends on: ui.js (showAboutModal, #about-modal), state.js (STATE.route, STATE.consumables, STATE.evaHours).
   Call initStory() in main.js after initUI(). It only adds text; it changes no route or safety number.

   Every number here is either quoted from a source listed in docs/SOURCES.md (section "Reference checks")
   or read live from the planner. The live numbers refresh each time the panel opens. */

const STORY_REFS = [
  ['NASA/JPL (Feb 2026): Curiosity Rover Sees Martian "Spiderwebs" Up Close (boxwork campaign)', 'https://www.nasa.gov/missions/mars-science-laboratory/curiosity-rover/nasas-curiosity-rover-sees-martian-spiderwebs-up-close/'],
  ['Horn (1981), Hill shading and the reflectance map, Proc. IEEE 69(1) (slope method compared)', 'https://doi.org/10.1109/PROC.1981.11918'],
  ['Carr & McGee (2009), The Apollo Number, PLoS ONE 4(8), e6614 (Apollo 11 lunar running speed)', 'https://doi.org/10.1371/journal.pone.0006614'],
  ['Waligora & Horrigan (1974), Metabolic cost of extravehicular activities, Skylab Life Sciences Symposium', 'https://ntrs.nasa.gov/citations/19750006325'],
  ['Guo et al. (2015), Variations of dose rate measured by RAD, Astrophys. J. 810, 24', 'https://doi.org/10.1088/0004-637X/810/1/24'],
  ['NASA: Apollo 17 mission details (EVA durations, rover distance)', 'https://www.nasa.gov/mission_pages/apollo/missions/apollo17.html'],
];

/* Builds the list of [heading, text] sections. Live values come from the current route. */
function storySections() {
  const r = STATE.route && STATE.route.status === 'ok' ? STATE.route : null;
  const cons = STATE.consumables;
  const sections = [];

  sections.push(['Why this site',
    'The boxwork ridges on Mount Sharp formed where groundwater once flowed through fractures in the bedrock and left minerals behind. ' +
    'Those minerals hardened the ridges; the rock between them was later hollowed out by wind (NASA/JPL, June 2025 and Feb 2026; ' +
    'Siebach & Grotzinger 2014). Curiosity explored the boxwork for about six months and drilled samples from ridges and hollows, ' +
    'finding clay minerals in a ridge and carbonate minerals in a hollow (NASA/JPL, Feb 2026). ' +
    'In about six months the rover drilled four boxwork samples. A crew on foot could look at many ridges and hollows in a single EVA.']);

  sections.push(['How slope is computed',
    'The HiRISE DTM is averaged to 10 m cells. Slope is the simple gradient: the height difference between the two neighbours ' +
    'east and west, and north and south, each divided by 20 m, then arctan of the combined gradient (numpy.gradient, scripts/03_make_grids.py). ' +
    'scripts/14_check_slope.py recomputes 500 random cells by hand and matches slope.bin exactly. ' +
    "Horn's 3x3 method (Horn 1981), used by many GIS tools, would give slopes differing by a median of 0.35° (90% of cells within 1.1°) on this grid."]);

  sections.push(['Walking speed: reference',
    'Our 2 / 3 / 4 km/h flat-ground presets are OUR ASSUMPTION. The one measured suited speed on another world that we found in a checked paper ' +
    "is Neil Armstrong's run on Apollo 11: 22 m in about 25 s, about 3.2 km/h (Carr & McGee 2009). " +
    'Our 3 km/h default walk is close to that. We did not change the defaults.']);

  if (cons && Number.isFinite(cons.avgW)) {
    const kcalH = cons.avgW * 3600 / 4184;
    const inRange = kcalH >= 100 && kcalH <= 500;
    sections.push(['Energy: reference check',
      `For this route our walking-energy model (Pandolf et al. 1977, Mars gravity) gives an average of ${Math.round(cons.avgW)} W, ` +
      `about ${Math.round(kcalH)} kcal/h per astronaut. Measured EVA metabolic rates on Skylab ranged from 100 to 500 kcal/h and were ` +
      `similar to Apollo lunar EVAs (Waligora & Horrigan 1974). ` +
      (inRange ? 'Our value falls inside that measured range.' : 'Our value falls outside that measured range: treat the energy and oxygen numbers with care.')]);
  }

  sections.push(['Radiation over time',
    'The 210 μGy/day baseline was measured from Aug 2012 to Jun 2013, near the maximum of the solar cycle (Hassler et al. 2014). ' +
    'The surface dose rate changes with the daily and seasonal air-pressure cycle and with solar activity: an active Sun pushes away ' +
    'more of the cosmic rays (Guo et al. 2015). Near solar minimum the dose would be higher than our baseline. ' +
    'This is context only; the app does not scale the number.']);

  const a17 = 'Apollo 17\'s longest EVA lasted 7 h 37 min. Its three EVAs added up to 22 h 4 min on the surface, and the crew drove the ' +
    'Lunar Roving Vehicle 30.5 km in total (NASA). ';
  sections.push(['For scale: Apollo 17',
    a17 + (r
      ? `This Marswalk: ${(2 * r.distanceMeters / 1000).toFixed(1)} km on foot there and back, inside a ${STATE.evaHours} h EVA. ` +
        'On foot a crew covers far less ground than with a rover, which is why the challenge suggests rovers to carry crew and tools.'
      : 'Pick a target to compare this Marswalk.')]);

  return sections;
}

/* Lines for "What we cannot model": each limit with the data that would fix it. */
const STORY_LIMITS = [
  ['Single rocks smaller than about 2 m', 'a rock map from HiRISE images or rover stereo images of the route'],
  ['Soil softness and dust', 'thermal inertia maps or Curiosity wheel-slip records along its drive'],
  ['Minerals (CRISM)', 'a processed CRISM image over our 4 km box (not done in time)'],
  ['Wind and humidity', 'the REMS daily report carries no wind or humidity value for any sol, so none is shown'],
  ['Real suit limits', 'published heat, cold and dose limits for a Mars suit'],
  ['Solar storms', 'a live space-weather alert service at Mars'],
  ['Live weather', 'a weather station at the habitat'],
];

/* Adds (or refreshes) the extra sections inside the About modal, before the References list. */
function storyRender() {
  const modal = document.getElementById('about-modal');
  if (!modal) return;
  const box = modal.querySelector('.modal-box');
  box.querySelectorAll('.story-extra').forEach(el => el.remove());
  const refHeading = Array.from(box.querySelectorAll('h3')).find(h => h.textContent === 'References');
  const add = (tag, cls, text) => {
    const el = document.createElement(tag); el.className = cls + ' story-extra'; el.textContent = text;
    box.insertBefore(el, refHeading || null); return el;
  };
  storySections().forEach(([heading, text]) => { add('h3', 'modal-section-heading', heading); add('p', 'modal-section-text', text); });

  add('h3', 'modal-section-heading', 'What we cannot model, and what data would fix it');
  const ul = add('ul', 'modal-section-text', '');
  STORY_LIMITS.forEach(([limit, fix]) => {
    const li = document.createElement('li'); li.textContent = `${limit}: needs ${fix}.`; ul.appendChild(li);
  });

  const list = box.querySelector('.modal-ref-list');
  if (list && !list.querySelector('.story-ref')) {
    STORY_REFS.forEach(([label, url]) => {
      const li = document.createElement('li'); li.className = 'story-ref';
      const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = label;
      li.appendChild(a); list.appendChild(li);
    });
  }
}

/* Wraps showAboutModal so the extra sections are added each time the panel opens. Call once. */
function initStory() {
  if (typeof showAboutModal !== 'function' || window._storyHooked) return;
  window._storyHooked = true;
  const original = window.showAboutModal;
  window.showAboutModal = function () {
    const result = original.apply(this, arguments);
    try { storyRender(); } catch (e) { console.warn('[story]', e); }
    return result;
  };
  // ui.js bound the About button to the original function, so refresh after its click handler too.
  document.getElementById('btn-about')?.addEventListener('click', () => {
    try { storyRender(); } catch (e) { console.warn('[story]', e); }
  });
}
