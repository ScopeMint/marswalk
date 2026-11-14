/* pov.js — Point-of-view photo drawer.
   Loads pov-images.json, shows Curiosity surface photos for the selected target.
   Real NASA photos only — no AI-generated images.
   Depends on: config.js (CONFIG), state.js (STATE). */

/* Loads pov-images.json and stores in STATE.povImages. */
async function loadPovImages() {
  try {
    const resp = await fetch('./data/pov-images.json');
    if (!resp.ok) throw new Error(`pov-images.json: ${resp.status}`);
    const data = await resp.json();
    STATE.povImages = data.images || [];
    console.log(`[pov] loaded ${STATE.povImages.length} POV images`);
  } catch (err) {
    console.error('[pov] load error:', err);
    STATE.povImages = [];
  }
}

/* Shows the POV photo panel for the given targetId.
   If no photo exists for the target, shows a "No surface photo near this target yet" message. */
function showPovForTarget(targetId) {
  const panel = document.getElementById('pov-panel');
  if (!panel) return;

  const img = (STATE.povImages || []).find(p => p.targetId === targetId);

  if (!img || img.status === 'PENDING — download real image from NASA Raw Images before submission') {
    _renderPovPlaceholder(panel);
    return;
  }

  // innerHTML safety: all values from pov-images.json (developer-controlled JSON, not user input).
  // nasaLink is validated below to only allow https:// URLs before use in href.
  // Only allow https:// URLs in the credit link to prevent javascript: injection
  const safeLink = (typeof img.nasaLink === 'string' && img.nasaLink.startsWith('https://'))
    ? img.nasaLink : 'https://mars.nasa.gov/msl/multimedia/raw-images/';

  panel.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'pov-header';
  header.innerHTML = '<span class="pov-title">What you should expect on arrival</span>';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'pov-close-btn';
  closeBtn.id = 'pov-close';
  closeBtn.textContent = '✕';
  header.appendChild(closeBtn);
  panel.appendChild(header);

  const imgEl = document.createElement('img');
  imgEl.className = 'pov-img';
  imgEl.src = `./data/pov/${img.filename}`;
  imgEl.alt = img.description;
  imgEl.loading = 'lazy';
  const fallback = document.createElement('div');
  fallback.id = 'pov-fallback';
  fallback.className = 'pov-fallback';
  fallback.style.display = 'none';
  fallback.textContent = 'Image not found in data/pov/ — download from NASA Raw Images.';
  imgEl.onerror = () => { imgEl.style.display = 'none'; fallback.style.display = 'block'; };
  panel.appendChild(imgEl);
  panel.appendChild(fallback);

  const caption = document.createElement('div');
  caption.className = 'pov-caption';
  caption.textContent = img.description;
  panel.appendChild(caption);

  const credit = document.createElement('div');
  credit.className = 'pov-credit';
  credit.textContent = `${img.camera} · Sol ${img.sol} · `;
  const creditLink = document.createElement('a');
  creditLink.href = safeLink;
  creditLink.target = '_blank';
  creditLink.rel = 'noopener noreferrer';
  creditLink.className = 'pov-credit-link';
  creditLink.textContent = img.credit;
  credit.appendChild(creditLink);
  panel.appendChild(credit);

  const arrival = document.createElement('div');
  arrival.className = 'pov-arrival';
  arrival.textContent = img.arrival;
  panel.appendChild(arrival);

  panel.style.display = 'block';
  document.getElementById('pov-close')?.addEventListener('click', () => {
    panel.style.display = 'none';
  });
}

function _renderPovPlaceholder(panel) {
  panel.innerHTML = `
    <div class="pov-header">
      <span class="pov-title">Surface View</span>
      <button class="pov-close-btn" id="pov-close">✕</button>
    </div>
    <div class="pov-fallback">No surface photo near this target yet.</div>
    <div class="pov-caption">Curiosity's raw images database: mars.nasa.gov/msl/multimedia/raw-images/</div>
  `;
  panel.style.display = 'block';
  document.getElementById('pov-close')?.addEventListener('click', () => {
    panel.style.display = 'none';
  });
}

/* Initializes POV: loads the image list. */
async function initPov() {
  await loadPovImages();
}
