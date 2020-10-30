const CONFIG = {
  ROT_SPEED: { min: 0.000001, max: 0.000005, def: 0.000001, step: 0.000001 },
  SHRINK:    { min: 0.009,    max: 0.09,    def: 0.02,    step: 0.001 },
  STROKE:    { min: 1,        max: 10,      def: 2,        step: 1 }
};

const FFT_SIZE = 512;
let FFT_BINS = getDynamicBins(FFT_SIZE, 8);

let energyHistory = [];
const HISTORY_SIZE = 60; // ~1 sec (60 fps)

let splineControl = [];
const SPLINE_RADIUS = 0.06;      // fraction of boxSize for control point radius
const SPLINE_RANDOMNESS = 0.9;   // randomness multiplier (0..1.2 etc)

const DEFAULT_PALETTE = "red"; // fallback color schema

const palettes = {
  red:    { p: "#FF939B", s: "#F74F70", t: "#FD6165", q: "#C92B68" },
  pink:   { p: "#FFF0F0", s: "#ffb2b2", t: "#ffa1a1", q: "#ff9090" },
  green:  { p: "#C4E6B8", s: "#7ad68f", t: "#4dc86a", q: "#21ba45" },
  yellow: { p: "#feebb5", s: "#fdd76b", t: "#e2aa07", q: "#fbbd08" },
  blue:   { p: "#a6ceec", s: "#7ab6e3", t: "#4d9dd9", q: "#2185d0" },
  orange: { p: "#fab45e", s: "#e9630a", t: "#f06d39", q: "#ea5336" },
  violet: { p: "#c885de", s: "#b55cd3", t: "#a333c8", q: "#72248c" }
};

let song, fft, amplitude, button, rotSlider, shrSlider, strokeSlider;
let comin, boxSize, level, size, spectrum;
let theta = 0, thetacum = 0, a = 0, count = 0;
let p, s, t, q; // current palette colors
let axisA = "Y", axisB = "X";
let playBtnMorph = null;
let lgInstance = null;

// SVG path shapes used for play/pause morphing buttons
const SVG_PATHS = {
  PLAY:  'M26,16 L26,16 11,16 11,8 26,16  M26,16 L26,16 11,24 11,16 26,16',
  PAUSE: 'M9,8   L14,8  14,24 9,24 9,8    M19,8  L24,8  24,24 19,24 19,8'
};

let songMetadata = { title: "Untitled", artist: "Unknown Artist", album: "", year: "" };

const DOM = {
  playground: document.getElementById('playground'),
  renderer: document.getElementById('renderer'),
  heading: document.getElementById('heading'),
  toggler: document.getElementById('toggler'),
  colorPicker: document.querySelector('.color-picker'),
  loadInfo: document.querySelector('.load-info'),
  retImg: document.getElementById('ret-img'),
  retLi: document.getElementById('ret-li'),
  imsg: document.getElementById('imsg'),
  gallery: document.getElementById('lightgallery'),
  radios: Array.from(document.querySelectorAll('input[type="radio"][name="color"]')),

  // tiny helpers
  setText(node, text) { if (node) node.textContent = text; },
  setStyle(node, prop, val) { if (node) node.style.setProperty(prop, val); },
  show(node, display) { if (node) node.style.display = display; },
  hide(node) { if (node) node.style.display = 'none'; }
};

/**
 * getSongEnergy(level)
 *
 * Maintain a sliding-window history of amplitude values and return the
 * average energy. Used to determine long-term song dynamics.
 *
 * @param {number} level - Instantaneous amplitude level (from p5.Amplitude.getLevel()).
 * @returns {number} Average energy in the current history window (0..1).
 */
function getSongEnergy(level) {
  energyHistory.push(level);
  if (energyHistory.length > HISTORY_SIZE) {
    energyHistory.shift(); // keep sliding window
  }

  return energyHistory.reduce((sum, x) => sum + x, 0) / energyHistory.length;
}

/**
 * getDynamicBins(fftSize, bands)
 *
 * Compute an array of FFT bin indices evenly distributed across the FFT size.
 * Each bin is the center index of an equal-sized chunk.
 *
 * @param {number} fftSize - FFT resolution (e.g. 512).
 * @param {number} [bands=8] - Number of bins to produce (must be >= 1).
 * @returns {number[]} An array of integer bin indices representing the center of each frequency band, typically within the range [0, fftSize-1].
 */
function getDynamicBins(fftSize, bands = 8) {
  const step = Math.floor(fftSize / bands);
  return Array.from({ length: bands }, (_, i) => {
    // center of chunk, integer/clamped indices, avoids NaN
    const idx = Math.floor(i * step + step / 2);
    return Math.min(Math.max(idx, 0), fftSize - 1);
  });
}

/**
 * getDynamicStrokeColor(level, spectrum)
 *
 * Choose a monochromatic stroke color from the active palette (p, s, t, q)
 * based on long-term energy (snappy thresholds). Then apply a treble-driven
 * brightness boost so highs pop without leaving the palette.
 *
 * Rationale: keep the visualization palette-consistent while letting treble
 * energy momentarily brighten the stroke for cymbal/vocal highlights.
 *
 * @param {number} level - Instantaneous amplitude level.
 * @param {Uint8Array} spectrum - FFT spectrum array from p5.FFT.analyze().
 * @returns {p5.Color} A p5.Color instance suitable for stroke().
 */
function getDynamicStrokeColor(level, spectrum) {
  let currentColor;
  let avgEnergy = getSongEnergy(level);

  // Instantaneous treble lookup
  let treble = spectrum[FFT_BINS[FFT_BINS.length - 1]];

  // thresholds for snapping (not continuous blend aka no lerping)
  if (avgEnergy < 0.1) currentColor = color(p); // calm = lightest
  else if (avgEnergy < 0.25) currentColor = color(s);
  else if (avgEnergy < 0.4) currentColor = color(t);
  else currentColor = color(q); // intense = darkest

  // treble-driven brightness kick
  let boost = map(treble, 0, 255, 1, 1.4);
  currentColor.setRed(constrain(red(currentColor) * boost, 0, 255));
  currentColor.setGreen(constrain(green(currentColor) * boost, 0, 255));
  currentColor.setBlue(constrain(blue(currentColor) * boost, 0, 255));

  return currentColor;
}

/**
 * createSplinePath(energy, spectrum)
 *
 * Generate a short 4-point Catmull-Rom spline (stored in global `splineControl`)
 * that the cube will follow during one bloom cycle.
 *
 * Rationale: a small, musically-biased path breaks perfect symmetry and yields
 * richer overlapping petals while keeping motion subtle.
 *
 * TODO: Utilise perlin noise for smooth control generation across cycles
 *
 * @param {number} [energy=0] - amplitude bias in [0,1] (from amplitude.getLevel()).
 * @param {Uint8Array|null} [spectrum=null] - optional FFT array to bias by mid energy.
 * @returns {void} Mutates global `splineControl` (Array of p5.Vector).
 */
function createSplinePath(energy = 0, spectrum = null) {
  // clear previous controls efficiently
  splineControl.length = 0;

  const baseRadius = boxSize * SPLINE_RADIUS;

  // prefer spectrum mid-energy if provided, else fall back to explicit energy
  const midIdx = Math.floor(FFT_BINS.length / 2);
  const midEnergy = spectrum ? (spectrum[FFT_BINS[midIdx]] || 0) / 255 : energy;

  // amplitude mapping: small = subtle, large = bolder
  const amp = map(midEnergy, 0, 1, 0.4, 1.4);

  // generate 4 control points as p5.Vector
  for (let i = 0; i < 4; i++) {
    const angle = random(TWO_PI);
    const r = baseRadius * (0.3 + random() * 0.9) * amp * SPLINE_RANDOMNESS;

    // slightly different Y/Z shaping for organic look
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r * (0.5 + random());
    const z = (random(-1, 1) * r) * 0.6;

    splineControl.push(createVector(x, y, z));
  }

  // keep fixed curve tightness for consistent shapes
  curveTightness(0);
}

/**
 * getSplineOffset(t)
 *
 * Evaluate a 4-point Catmull–Rom spline (using p5.curvePoint) and return the
 * offset for the cube at progress `t`.
 *
 * @param {number} t - Normalized progress along the spline in [0, 1].
 * @returns {p5.Vector} 3D offset vector (x, y, z). Returns (0,0,0) if spline is not ready.
 */
function getSplineOffset(t) {
  t = constrain(t, 0, 1);

  // not enough control points
  if (!splineControl || splineControl.length < 4) {
    return createVector(0, 0, 0);
  }

  const [p0, p1, p2, p3] = splineControl;

  const x = curvePoint(p0.x, p1.x, p2.x, p3.x, t);
  const y = curvePoint(p0.y, p1.y, p2.y, p3.y, t);
  const z = curvePoint(p0.z, p1.z, p2.z, p3.z, t);

  return createVector(x, y, z);
}

/**
 * generatePalette(baseHex)
 *
 * Generate a 4-color tonal palette from a given base hex color.
 * The palette progresses from faded to vibrant tones using adjusted HSL values.
 *
 * @param {string} baseHex - A valid 3/6-digit hex color.
 * @returns {Object} An object with 4 shades:
 *                   - {string} p: Primary (most faded)
 *                   - {string} s: Secondary
 *                   - {string} t: Tertiary
 *                   - {string} q: Quaternary (most vibrant)
 *
 * Fallbacks to white (#ffffff) if the input is invalid.
 */
function generatePalette(baseHex) {
  // normalize
  let hex = (baseHex || '#ffffff').replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) hex = 'ffffff';

  // rgb [0..1]
  const r = parseInt(hex.slice(0,2),16) / 255;
  const g = parseInt(hex.slice(2,4),16) / 255;
  const b = parseInt(hex.slice(4,6),16) / 255;

  // rgb to hsl
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h = h * 60;
  }
  // normalize
  h = (h + 360) % 360;
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // boost saturation and lightness
  const sv = clamp(Math.round(s * 1.05 + 6), 30, 100);
  const lv = clamp(Math.round(l * 0.6 + (s > 50 ? 6 : 12)), 8, 44);

  // adaptive fading multipliers
  const isLightBase = l > 70;
  const fadeFactor = isLightBase ? 0.6 : 1.0;
  const lightCap = isLightBase ? 90 : 98;

  // produce progressive sat/l range for 4 stops
  const sats = [
    sv,
    clamp(Math.round(sv * 0.85), 15, sv),
    clamp(Math.round(sv * 0.62), 8, sv),
    clamp(Math.round(sv * 0.36 * fadeFactor), 0, sv)
  ];
  const lits = [
    lv,
    clamp(Math.round(lv + 18), lv, 80),
    clamp(Math.round(lv + 36 * fadeFactor), lv, lightCap - 8), // at least ~8% difference in HSL lightness
    clamp(Math.round(lv + 60 * fadeFactor), lv, lightCap)
  ];

  // hsl to hex
  const hslToHex = (H, S, L) => {
    S /= 100; L /= 100;
    const C = (1 - Math.abs(2*L - 1)) * S;
    const X = C * (1 - Math.abs((H / 60) % 2 - 1));
    const m = L - C/2;
    let [R,G,B] = [0,0,0];
    if (H < 60)       [R,G,B] = [C, X, 0];
    else if (H < 120) [R,G,B] = [X, C, 0];
    else if (H < 180) [R,G,B] = [0, C, X];
    else if (H < 240) [R,G,B] = [0, X, C];
    else if (H < 300) [R,G,B] = [X, 0, C];
    else              [R,G,B] = [C, 0, X];
    const toHex = v => Math.round((v + m) * 255).toString(16).padStart(2,'0');
    return '#' + toHex(R) + toHex(G) + toHex(B);
  };

  // build palette
  const hueShift = 0; // exact hue for pure monochrome
  const palette = [
    hslToHex(h + hueShift, sats[0], lits[0]),
    hslToHex(h + hueShift, sats[1], lits[1]),
    hslToHex(h + hueShift, sats[2], lits[2]),
    hslToHex(h + hueShift, sats[3], lits[3])
  ];

  return { p: palette[3], s: palette[2], t: palette[1], q: palette[0] };
}

function bindToggle() {
  const el = DOM.toggler;
  if (!el) return;

  // avoid double-binding
  if (el.dataset.toggleBound) return;
  el.dataset.toggleBound = '1';

  // mouse / pointer
  el.addEventListener('click', function (e) {
    e.preventDefault();
    toggleSong();
  });

  // keyboard accessibility (space / enter)
  el.addEventListener('keydown', function (e) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggleSong();
    }
  });
}

function setColor(name) {
  if (!palettes[name]) return;

  if (song.isPlaying()) { // stop song if playing
    song.stop();
  }
  setPlayUI(false);

  clear();
  song.playMode("restart"); // make sure song restarts

  const c = palettes[name];
  p = c.p; s = c.s; t = c.t; q = c.q;

  a = 0; // reset growth
  background(255);

  // update button glow color dynamically
  DOM.setStyle(DOM.toggler, '--glow-color', c.p);
}

function setPlayUI(playing) {
  if (!DOM.toggler) return;

  // PAUSE when playing, PLAY when paused
  playBtnMorph.toState(playing ? MorphedSVG.STATE_2 : MorphedSVG.STATE_1);

  // visual feedback
  if (playing) DOM.toggler.classList.add('playing');
  else DOM.toggler.classList.remove('playing');
}

function toggleSong() {
  if (!song) return;
  if (song.isPlaying()) {
    song.pause();
    setPlayUI(false);
  } else {
    song.play();
    setPlayUI(true);
  }
}

function audioMetadata(file, callback) {
  const reader = new FileReader();

  reader.onload = function() {
    const dv = new jDataView(this.result);
    let title = "", artist = "", album = "", year = "";

    // check for ID3v2
    if (dv.getString(3, 0) === "ID3") {
      const tagSize =
        (dv.getUint8(6) & 0x7f) << 21 |
        (dv.getUint8(7) & 0x7f) << 14 |
        (dv.getUint8(8) & 0x7f) << 7 |
        (dv.getUint8(9) & 0x7f);

      let offset = 10; // skip header
      while (offset < tagSize) {
        const frameID = dv.getString(4, offset);
        const frameSize = dv.getUint32(offset + 4);
        if (!frameID || frameSize <= 0) break;

        // text frames start with encoding byte, skip it
        const text = dv.getString(frameSize - 1, offset + 11).trim();

        if (frameID === "TIT2") title = text;
        else if (frameID === "TPE1") artist = text;
        else if (frameID === "TALB") album = text;
        else if (frameID === "TYER" || frameID === "TDRC") year = text;

        offset += 10 + frameSize;
      }
    }
    // fallback to ID3v1
    // "TAG" starts at byte -128 from EOF.
    // See http://en.wikipedia.org/wiki/ID3
    else if (dv.getString(3, dv.byteLength - 128) === "TAG") {
      title  = dv.getString(30, dv.byteLength - 125).trim();
      artist = dv.getString(30, dv.byteLength - 95).trim();
      album  = dv.getString(30, dv.byteLength - 65).trim();
      year  = dv.getString(4, dv.byteLength - 35).trim();
    }

    // ultimate fallback if nothing was found
    if (!title) {
      title = file.name.replace(/\.[^/.]+$/, "");
    }

    // pass the metadata
    callback({ title, artist, album, year });
  };

  reader.readAsArrayBuffer(file);
}

function preload() {
  song = loadSound('/assets/audio/defaultSong.mp3'); // default song
}

function isAudioFile(file) {
  if (!file) return false;

  // p5.File wrapper
  if (file.type === "audio") return true;

  //  raw File object inside p5.File
  if (file.file && file.file.type && file.file.type.startsWith("audio/")) return true;

  // check subtype
  if (file.type && file.subtype && file.type === "audio") return true;

  // fallback by extension
  const name = (file.name || "").toLowerCase();
  return /\.(mp3|wav|ogg|m4a|flac|aac|webm)$/.test(name);
}

function handleFile(file) {
  if (!isAudioFile(file)) {
    alert("Please upload a valid audio file (mp3, wav, ogg).");
    return;
  }

  if (song.isPlaying()) {
    song.stop(); 
  }
  setPlayUI(false);

  clear();
  DOM.hide(DOM.toggler); // hide play until loaded
  song = loadSound(
    file.data,
    () => {  // success callback
      audioMetadata(file.file || file, (meta) => { // extract ID3 metadata
        songMetadata = meta;

        // UI feedback
        DOM.setText(DOM.loadInfo, `Now playing: ${meta.title || "Untitled"} by ${meta.artist || "Unknown Artist"}`);

        DOM.show(DOM.toggler, 'block'); // show the toggle btn
        setPlayUI(false); // ensure PLAY state
      });

      song.playMode('restart');
      a = 0;
      background(255);
    },
    () => {  // error callback
      alert("Error loading this file. Please try another audio format.");
    }
  );

  // reset morph back to PLAY when song finishes naturally
  if (song && typeof song.onended === "function") {
    song.onended(() => {
      setPlayUI(false); // force back to PLAY
    });
  }
}

function setup() {
  checkOrientation();

  // red as default
  p = palettes[DEFAULT_PALETTE].p; s = palettes[DEFAULT_PALETTE].s; t = palettes[DEFAULT_PALETTE].t; q = palettes[DEFAULT_PALETTE].q;

  background(255)
  DOM.show(DOM.playground, 'flex'); // display the picker now
  const text = baffle(".data"); // HEADING ANIMATION
  text.set({
    characters: '░▒░ ░██░> ████▓ >█> ░/█>█ ██░░ █<▒ ▓██░ ░/░▒',
          speed: 120
  });
  text.start();
  text.reveal(4000);

  playBtnMorph = new MorphedSVG('play-svg', SVG_PATHS.PLAY, SVG_PATHS.PAUSE);

  bindToggle();
  input = createFileInput(handleFile);
  input.parent("file-input");
  input.id('toggle-song');
  input.elt.setAttribute("accept", "audio/*, .mp3, .wav, .ogg");

  rotSlider = createSlider(CONFIG.ROT_SPEED.min, CONFIG.ROT_SPEED.max, CONFIG.ROT_SPEED.def, CONFIG.ROT_SPEED.step); // rotation speed slider
  rotSlider.addClass('slider');
  rotSlider.parent("s1");

  shrSlider = createSlider(CONFIG.SHRINK.min, CONFIG.SHRINK.max, CONFIG.SHRINK.def, CONFIG.SHRINK.step); // shrink rate slider
  shrSlider.addClass('slider');
  shrSlider.parent("s2");

  strokeSlider = createSlider(CONFIG.STROKE.min, CONFIG.STROKE.max, CONFIG.STROKE.def, CONFIG.STROKE.step); // stroke weight slider
  strokeSlider.addClass('slider');
  strokeSlider.parent("s3");

  fft = new p5.FFT(0, FFT_SIZE);
  amplitude = new p5.Amplitude();
  // create canvas now, after knowing paint area (renderer) dynamic width (for mobiles)
  comin = Math.min(DOM.renderer.offsetWidth, DOM.renderer.offsetHeight) - DOM.heading.offsetHeight; // sprinkle of padding
  boxSize = comin / 2;
  cnv = createCanvas(comin, comin, WEBGL);
  cnv.parent("renderer");

  // INIT GALLERY
  lgInstance = lightGallery(DOM.gallery);

  DOM.radios.forEach(radio => {
    radio.addEventListener('change', e => {
      // remove custom picker active state
      DOM.colorPicker?.classList.remove('active');

      setColor(e.target.value);
    });
  });

  DOM.colorPicker.addEventListener("input", function (e) {
    const baseColor = e.target.value;
    const palette = generatePalette(baseColor);

    if (song.isPlaying()) { // stop song if playing
      song.stop();
    }
    setPlayUI(false);

    clear();
    song.playMode("restart"); // make sure song restarts
    a = 0; // reset growth
    background(255);

    // uncheck all default palette radio buttons
    DOM.radios.forEach(r => r.checked = false);

    // update UI feedback
    DOM.setStyle(DOM.colorPicker, '--picker-color', baseColor);
    DOM.colorPicker?.classList.add('active');

    // update button glow color dynamically
    DOM.setStyle(DOM.toggler, '--glow-color', baseColor);

    // apply colors dynamically
    p = palette.p;
    s = palette.s;
    t = palette.t;
    q = palette.q;

    // reset and redraw
    clear();
    background(255);
  });

  createSplinePath(0, null); // initial spline generation
}

function getThetaFromSpectrum(spectrum) {
  const sum = FFT_BINS.reduce((acc, bin) => acc + spectrum[bin], 0);
  return (sum * FFT_SIZE / FFT_BINS.length) || theta;
}

function applyRotation(axis, noiseFactor) {
  const fn = {
    X: () => rotateX(sin(thetacum * rotSlider.value()) * noiseFactor),
    Y: () => rotateY(cos(thetacum * rotSlider.value()) * noiseFactor),
    Z: () => rotateZ(cos(thetacum * rotSlider.value()) * noiseFactor),
  };
  (fn[axis] || (() => console.warn("Invalid axis:", axis)))();
}

function rotateCube(axisA, axisB) {
  // perlin based noise modulation based on frame count
  let noiseFactor = noise(frameCount * 0.005) * 0.2 + 0.9; // range ~0.9 to 1.1

  // rotations: use cube or fallback
  if (axisA !== "Y" || axisB !== "X") {
    applyRotation(axisA, noiseFactor);
    applyRotation(axisB, noiseFactor);
  } else {
    rotateY(cos(thetacum * rotSlider.value()) * noiseFactor);
    rotateX(sin(thetacum * rotSlider.value()) * noiseFactor);
  }
}

function draw() {
  // current palette colors
  const colors = [p, s, t, q];

  strokeWeight(strokeSlider.value());

  // only proceed if song is playing and we got signal
  if (song && song.isPlaying()) {
    // analyze audio spectrum
    spectrum = fft.analyze();

    // update theta from spectrum
    theta = getThetaFromSpectrum(spectrum);
    thetacum += theta;

    level = amplitude.getLevel();
    size = map(level, 0, 1, 0, 200);

    const targetShrink = boxSize / 10; // amount `a` must reach to finish cycle

    // compute progress along the cycle and translate along the spline
    let progress = constrain(a / targetShrink, 0, 1);

    // ease the progress for more natural overlap
    let progressEase = sin(progress * PI);

    // scale spline offset by eased progress
    let offset = getSplineOffset(progress);
    // clone before multiplying
    offset = createVector(offset.x, offset.y, offset.z).mult(progressEase);

    // isolate transform
    push();
    translate(offset.x, offset.y, offset.z);

    // rotations
    rotateCube(axisA, axisB);

    // stroke color from amplitude (safe fallback if size is NaN)
    let strokeColor = getDynamicStrokeColor(level, spectrum);
    stroke(strokeColor);
    // stroke(red(strokeColor), green(strokeColor), blue(strokeColor), 180); // alpha channel based coloring

    // draw shrinking cube
    box(boxSize - a * 10);

    pop();

    // Known bug: when the tab is backgrounded, browsers throttle/stop requestAnimationFrame (and thus draw())
    // and so, per-frame increment effectively pauses
    // we CAN advance `a` according to real elapsed time (not frame count) using deltaTime but... ain't doing that

    // remaining time in the song
    const songRemaining = Math.max(0.0001, song.duration() - song.currentTime());

    // estimated FPS
    const fpsEstimate = Math.max(1, frameRate());

    // calculate NORMAL cycle at current shrink rate
    const cycleFrames = targetShrink / Math.max(1e-9, shrSlider.value());
    const bloomCycle = cycleFrames / fpsEstimate;

    let increment;
    // adaptive shrink logic
    if (songRemaining < bloomCycle) {
      const remainingShrink = Math.max(0, targetShrink - a);

      // shrink per second to finish exactly when songRemaining hits 0
      const shrinkRate = (remainingShrink > 0 && songRemaining > 0)
        ? (remainingShrink / songRemaining)
        : shrSlider.value() * fpsEstimate; // fallback safe rate

      // convert to per-frame increment
      increment = shrinkRate * (deltaTime / 1000);
    } else {
      // keep original
      increment = shrSlider.value();
    }

    a += increment;

    // reset cycle when cube shrinks too far
    if (a > targetShrink) {
      count++;
      exportFrame(count);
      clear();
      background(255);
      a = 0;

      // regenerate spline for the next cycle
      const recentEnergy = level || 0;
      createSplinePath(recentEnergy, spectrum);
    }
  }
}

function imgPounder(src) {
  if (!DOM.retLi || !DOM.gallery) {
    return;
  }

  const cloned = DOM.retLi.cloneNode(true);
  cloned.removeAttribute('id'); // remove id from li

  cloned.style.display = 'none';
  cloned.setAttribute('data-src', src);
  cloned.setAttribute('data-responsive', src + " 700");
  cloned.setAttribute('data-sub-html',
    `<h4>${count}: ${songMetadata.title || "Untitled"}</h4><p>Exported from ${songMetadata.title || "Untitled"} at ${song.currentTime()} </p>`
  );

  DOM.gallery.appendChild(cloned);
}

function exportFrame(frameCount) {
  const imgSrc = canvas.toDataURL("image/png");

  if (frameCount === 1) {
    DOM.retImg.src = imgSrc;
    DOM.retLi.setAttribute("data-src", imgSrc);
    DOM.retLi.setAttribute(
      "data-sub-html",
      `<h4>${frameCount}: ${songMetadata.title || "Untitled"}</h4><p>Exported from ${songMetadata.title || "Untitled"} by ${songMetadata.artist || "Unknown Artist"} at ${song.currentTime()}</p>`
    );
    DOM.show(DOM.retLi, 'block');
    DOM.show(DOM.imsg, 'block');
  } else {
    imgPounder(imgSrc); // gallery helper
  }
}

// 3-way toggler for axes
function changeAxis(group, axis) {
  const selector = document.getElementById(`selector${group}`);
  const x = document.getElementById(`axis${group}x`);
  const y = document.getElementById(`axis${group}y`);
  const z = document.getElementById(`axis${group}z`);

  let chosen, label, color;

  switch (axis) {
    case "x":
      chosen = x; label = "X"; color = "#777777"; break;
    case "y":
      chosen = y; label = "Y"; color = "#418d92"; break;
    case "z":
      chosen = z; label = "Z"; color = "#4d7ea9"; break;
  }

  selector.style.left = (axis === "x" ? 0 : axis === "y" ? x.clientWidth : x.clientWidth + y.clientWidth + 1) + "px";
  selector.style.width = chosen.clientWidth + "px";
  selector.style.backgroundColor = color;
  selector.innerHTML = label;

  if (group === "A") axisA = label;
  else axisB = label;
}

/**
 * MorphedSVG
 *
 * Controls an inline SVG path morph between two path strings using an
 * <animate> element.
 * 
 * @param {string} svgId - id of the <svg> element containing a <path>.
 * @param {string} firstPath - d attribute string for state 1 (PLAY).
 * @param {string} secondPath - d attribute string for state 2 (PAUSE).
 * @param {string} [styleClass] - optional class toggled on state change.
 */
class MorphedSVG {
  constructor(svgId, firstPath, secondPath, styleClass) {
    this.elem = document.getElementById(svgId);
    if (!this.elem) {
      console.warn(`MorphedSVG: SVG element with id="${svgId}" not found.`);
      return;
    }

    this.path = this.elem.querySelector('path');
    this.anim = this.path ? this.path.querySelector('animate') : null;

    this.animDur = this.anim ? parseFloat(this.anim.getAttribute('dur')) * 1000 : 0;
    this.originalPath = this.path ? this.path.getAttribute('d') : '';
    this.firstPath = firstPath;
    this.secondPath = secondPath;
    this.state = MorphedSVG.STATE_1;
    this.styleClass = styleClass || null;

    this.timeout = null;
  }

  /**
   * Switch to the requested state (idempotent).
   * Uses the <animate> element to play the morph.
   *
   * @param {boolean} state - MorphedSVG.STATE_1 or STATE_2
   */
  toState(state) {
    if (!this.path || !this.anim) return;
    if (state === this.state) return;

    switch (state) {
      case MorphedSVG.STATE_1:
        this._set(this.firstPath, this.secondPath, this.firstPath);
        if (this.styleClass) this.elem.classList.add(this.styleClass);
        break;

      case MorphedSVG.STATE_2:
        this._set(this.secondPath, this.firstPath, this.secondPath);
        if (this.styleClass) this.elem.classList.remove(this.styleClass);
        break;

      default:
        console.warn('MorphedSVG.toState: invalid state', state);
        return;
    }

    this.state = state;
    // trigger the <animate> element
    try {
      this.anim.beginElement();
    } catch (e) {
      // some browsers may restrict beginElement
      // set final path immediately
      this.path.setAttribute('d', state ? this.secondPath : this.firstPath);
    }

    // reset to original path after animation completes
    if (this.originalPath && this.animDur) {
      if (this.timeout) clearTimeout(this.timeout);
      this.timeout = setTimeout(this._resetOriginal.bind(this), this.animDur);
    }
  }

  // toggle between states
  toggle() {
    this.toState(!this.state);
  }

  /**
   * Internal helper to set the path and animate attributes.
   * @private
   */
  _set(d, from, to) {
    if (!this.path || !this.anim) return;
    this.path.setAttribute('d', d);
    this.anim.setAttribute('from', from);
    this.anim.setAttribute('to', to);
  }

  /** Restore original path after the morph animation ends. */
  _resetOriginal() {
    if (!this.path) return;
    if (this.state === MorphedSVG.STATE_1) {
      this._set(this.originalPath, '', '');
    }
  }
}

MorphedSVG.STATE_1 = true;
MorphedSVG.STATE_2 = false;
