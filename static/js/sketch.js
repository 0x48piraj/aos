const CONFIG = {
  ROT_SPEED: { min: 0.000001, max: 0.000005, def: 0.000001, step: 0.000001 },
  SHRINK:    { min: 0.009,    max: 0.09,    def: 0.009,    step: 0.001 },
  STROKE:    { min: 1,        max: 10,      def: 2,        step: 1 }
};

const FFT_BINS = [20, 60, 100, 140, 180, 220];
const FFT_SIZE = 512;

const DEFAULT_PALETTE = "red"; // fallback color schema

const palettes = {
  red:   { p: "#C92B68", s: "#F74F70", t: "#FF939B", q: "#A61458" },
  green: { p: "#21ba45", s: "#4dc86a", t: "#7ad68f", q: "#a6e3b5" },
  yellow:{ p: "#fbbd08", s: "#e2aa07", t: "#fdd76b", q: "#feebb5" },
  blue:  { p: "#2185d0", s: "#4d9dd9", t: "#7ab6e3", q: "#a6ceec" },
  purple:{ p: "#72248c", s: "#a333c8", t: "#b55cd3", q: "#c885de" }
};

let song, fft, amplitude, button, rotSlider, shrSlider, strokeSlider;
let comin, boxSize, level, size, spectrum;
let theta = 0, thetacum = 0, a = 0, count = 0;
let p, s, t, q; // current palette colors
let axisA = "Y", axisB = "X";
let playBtnMorph = null;

const PAUSE_PATH_2 = 'M9,8   L14,8  14,24 9,24 9,8    M19,8  L24,8  24,24 19,24 19,8';
const PLAY_PATH_2 = 'M26,16 L26,16 11,16 11,8 26,16  M26,16 L26,16 11,24 11,16 26,16';

var title, artist, album, syear;

var reader = new FileReader();
const liHTML = `
        <a href="">
          <img id="ret-img" class="img-responsive" src="{embedImgSrc}">
          <div class="lgallery-poster">
            <img src="/static/img/zoom.png">
          </div>
        </a>
     `;
const BtnSVG = `
        <svg id='play-svg' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>
          <path id="play-svgpath" d='M11,8 L26,16 11,24 11,8'>
            <animate attributeName='d' fill='freeze' dur='0.2s'
                     calc-mode='spline' keySplines='0.19 1 0.22 1'/>
          </path>
        </svg>
     `;

function setColor(name) {
  if (!palettes[name]) return;
  if (song.isPlaying()) { // stop song if playing
    song.stop();
    document.getElementById("toggler").click();
  }
  clear();
  song.playMode("restart"); // make sure song restarts

  const c = palettes[name];
  p = c.p; s = c.s; t = c.t; q = c.q;

  a = 0; // reset growth
  background(255);
}

function toggleSong() {
  if (!song) return;
  if (song.isPlaying()) {
    song.pause();
  } else {
    song.play();
  }
}

function audioMetadata(file) {
  const reader = new FileReader(); // create fresh per-call reader

  reader.onload = function() {
    const dv = new jDataView(this.result);

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
        else if (frameID === "TYER" || frameID === "TDRC") syear = text;

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
      syear  = dv.getString(4, dv.byteLength - 35).trim();
    }

    // ultimate fallback if nothing was found
    if (!title) {
      title = file.name.replace(/\.[^/.]+$/, "");
    }

    button.style('display', 'block'); // show the toggle btn
  };

  reader.readAsArrayBuffer(file);
}

function preload() {
  song = loadSound('/static/res/audio/defaultSong.mp3'); // default song
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
    document.getElementById("toggler").click();
  }

  clear();
  button.style('display', 'none'); // hide play until loaded
  song = loadSound(
    file.data,
    () => {  // success callback
      audioMetadata(file.file || file);  // extract ID3 metadata
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
      if (playBtnMorph) {
        playBtnMorph.toState(MorphedSVG.STATE_1); // force back to PLAY
      }
    });
  }
}

function setup() {
  checkOrientation();

  // red as default
  p = palettes[DEFAULT_PALETTE].p; s = palettes[DEFAULT_PALETTE].s; t = palettes[DEFAULT_PALETTE].t; q = palettes[DEFAULT_PALETTE].q;

  background(255)
  document.getElementById('playground').style.display = 'flex'; // display the picker now
  const text = baffle(".data"); // HEADING ANIMATION
  text.set({
    characters: '░▒░ ░██░> ████▓ >█> ░/█>█ ██░░ █<▒ ▓██░ ░/░▒',
          speed: 120
  });
  text.start();
  text.reveal(4000);
  button = createButton(BtnSVG);
  button.parent("playbtn");
  button.id('toggler');

  playBtnMorph = new MorphedSVG('play-svg', PLAY_PATH_2, PAUSE_PATH_2);

  // toggle visual morph when its parent (the button) is clicked
  playBtnMorph.elem.parentNode.addEventListener('click', () => {
    playBtnMorph.toggle();
  });

  button.mousePressed(toggleSong);
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
  // create canvas now, after knowing paint area's (parea) dynamic width (esp. for mobiles)
  comin = Math.min(document.getElementById('parea').offsetWidth, document.getElementById('parea').offsetHeight) - document.getElementById('heading').offsetHeight; // sprinkle of padding
  boxSize = comin / 2;
  cnv = createCanvas(comin, comin, WEBGL);
  cnv.parent("parea");
}

function getThetaFromSpectrum(spectrum) {
  const sum = FFT_BINS.reduce((acc, bin) => acc + spectrum[bin], 0);
  return (sum * FFT_SIZE / FFT_BINS.length) || theta;
}

function applyRotation(axis) {
  const fn = {
    X: () => rotateX(sin(thetacum * rotSlider.value())),
    Y: () => rotateY(cos(thetacum * rotSlider.value())),
    Z: () => rotateZ(cos(thetacum * rotSlider.value())),
  };
  (fn[axis] || (() => console.warn("Invalid axis:", axis)))();
}

function rotateCube(axisA, axisB) {
  applyRotation(axisA);
  applyRotation(axisB);
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

    // rotations: use cube or fallback
    if (axisA !== "Y" || axisB !== "X") {
      rotateCube(axisA, axisB);
    } else {
      rotateY(cos(thetacum * rotSlider.value()));
      rotateX(sin(thetacum * rotSlider.value()));
    }

    // stroke color from amplitude (safe fallback if size is NaN)
    const colorIndex = constrain(int(isFinite(size) ? size : 0), 0, 3);
    stroke(colors[colorIndex]);

    // draw shrinking cube
    box(boxSize - a * 10);

    // Known bug: when the tab is backgrounded, browsers throttle/stop requestAnimationFrame (and thus draw())
    // and so, per-frame increment effectively pauses
    // we CAN advance `a` according to real elapsed time (not frame count) using deltaTime but... ain't doing that
    a += shrSlider.value();

    // reset cycle when cube shrinks too far
    if (a > boxSize / 10) {
      count++;
      exportFrame(count);
      clear();
      background(255);
      a = 0;
    }
  }
}

function imgPounder(src) {
  const li = document.createElement('li');
  li.style.display = 'none';
  li.setAttribute('data-src', src);
  li.setAttribute('data-responsive', src + " 700");
  li.setAttribute(
    'data-sub-html',
    `<h4>${count}: ${title}</h4><p>Exported from ${title} at ${song.currentTime()} </p>`
  );
  li.innerHTML = liHTML.replace(/{embedImgSrc}/g, src);

  const gallery = document.getElementById('lightgallery');
  gallery.appendChild(li);
}

function exportFrame(frameCount) {
  const imgSrc = canvas.toDataURL("image/png");

  if (frameCount === 1) {
    document.getElementById("ret-img").src = imgSrc;
    document.getElementById("ret-li").setAttribute("data-src", imgSrc);
    document.getElementById("ret-li").setAttribute(
      "data-sub-html",
      `<h4>${frameCount}: ${title}</h4><p>Exported from ${title} at ${song.currentTime()}</p>`
    );
    document.getElementById("ret-li").style.display = "block";
    document.getElementById("imsg").style.display = "block";
  } else {
    imgPounder(imgSrc); // gallery helper
  }
}

// INIT GALLERY
lightGallery(document.getElementById('lightgallery'))

document.querySelectorAll('input[type="radio"]').forEach(radio => {
  radio.addEventListener('change', e => setColor(e.target.value));
});

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

// Play/Pause SVG Morphing
function MorphedSVG(svgId, firstPath, secondPath, styleClass){
  this.elem = document.getElementById(svgId);
  this.path = this.elem.getElementsByTagName('path')[0];
  this.anim = this.path.getElementsByTagName('animate')[0];
  this.animDur = parseFloat(this.anim.getAttribute('dur')) * 1000;

  this.originalPath = this.path.getAttribute('d');
  this.firstPath = firstPath;
  this.secondPath = secondPath;
  this.state = MorphedSVG.STATE_1;
  this.styleClass = styleClass;

  this.timeout;
}

MorphedSVG.STATE_1 = true;
MorphedSVG.STATE_2 = false;

MorphedSVG.prototype.toState = function(state){
  if(state == this.state) return;
  
  switch(state){
  case MorphedSVG.STATE_1:
    this._set(this.firstPath, this.secondPath, this.firstPath);
    this.styleClass ? this.elem.classList.add(this.styleClass) : null;
    break;

  case MorphedSVG.STATE_2:
    this._set(this.secondPath, this.firstPath, this.secondPath);
    this.styleClass ? this.elem.classList.remove(this.styleClass) : null;
    break;
  }

  this.state = state;
  this.anim.beginElement();

  if(this.originalPath && this.animDur){
    this.timeout ? clearTimeout(this.timeout) : null;
    this.timeout = setTimeout(this._resetOriginal.bind(this), this.animDur);
  }
}

MorphedSVG.prototype.toggle = function(){
  this.toState(!this.state);
}

MorphedSVG.prototype._set = function(d, from, to){
  this.path.setAttribute('d', d);
  this.anim.setAttribute('from', from);
  this.anim.setAttribute('to', to);
}

MorphedSVG.prototype._resetOriginal = function(){
  if(this.state == MorphedSVG.STATE_1)
    this._set(this.originalPath, '', '');
}

function show(el) {
    el.getElementsByClassName('popuptext')[0].classList.toggle("show");
}