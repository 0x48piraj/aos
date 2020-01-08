var song;
var fft;
var button;
var rotSlider, shrSlider, strokeSlider;
var a = 0;
var count = 0;
var theta = 0
var thetacum = 0;
var p,s,t,q;
var color,spectrum,level,size;
var title = 'Symphony No. 5 (1st movement)', artist, album, syear;
var axisA = 'Y', axisB = 'X';
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
          <path           d='M11,8 L26,16 11,24 11,8'>
            <animate attributeName='d' fill='freeze' dur='0.2s'
                     calc-mode='spline' keySplines='0.19 1 0.22 1'/>
          </path>
        </svg>
     `;


function setColor(colorSchema) {
    song.stop(); // stop song if playing
    clear(); // clear the canvas
    song.playMode('restart'); // make sure song restarts
    var color = JSON.parse(colorSchema.replace(/'/g, '"'));
    p = color.p;
    s = color.s;
    t = color.t;
    q = color.q;
    a = 0; // reset the size
    background(255)
}

function toggleSong() {
  if (song.isPlaying()) {
    song.pause();
  } else {
    song.play();
  }
}

function scall() {
  reader.onload = function(e) {
    var dv = new jDataView(this.result);

    // "TAG" starts at byte -128 from EOF.
    // See http://en.wikipedia.org/wiki/ID3
    if (dv.getString(3, dv.byteLength - 128) == 'TAG') {
      title = dv.getString(30, dv.tell());
      artist = dv.getString(30, dv.tell());
      album = dv.getString(30, dv.tell());
      syear = dv.getString(4, dv.tell());
    } else {
      // no ID3v1 data found.
    }
  };
  reader.readAsArrayBuffer(document.getElementById('toggle-song').files[0]);

  button.style('display', 'block'); // show the toggle btn
}

function preload() {
  song = loadSound('/static/res/audio/BeethovenSymphony.mp3'); // default song
}

function handleFile(file) {
  song.stop(); // stop song if playing
  clear(); // clear the canvas
  button.style('display', 'none'); // hide the input box for time being
  song = loadSound(file.data, scall); // success callback func
  song.playMode('restart'); // make sure song restarts
  a = 0; // reset the size
  background(255)
}

function setup() {
  p = '#C92B68'
  s = '#F74F70'
  t = '#FF939B'
  q = '#A61458'
  cnv = createCanvas(700, 700, WEBGL);
  cnv.parent("parea");
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

  button.mousePressed(toggleSong);
  input = createFileInput(handleFile);
  input.parent("file-input");
  input.id('toggle-song');

  rotSlider = createSlider(0.000001, 0.000005, 0.000001, 0.000001); // rotation speed slider
  rotSlider.parent("s1");

  rotSlider.style('width', '200px');
  shrSlider = createSlider(0.009, 0.09, 0.009, 0.001); // shrink rate slider
  shrSlider.parent("s2");

  shrSlider.style('width', '200px');
  strokeSlider = createSlider(1, 10, 2, 1); // stroke weight slider
  strokeSlider.parent("s3");

  strokeSlider.style('width', '200px');

  fft = new p5.FFT(0, 512);
  amplitude = new p5.Amplitude();
}

function rotateCube(a, b) {
  ( ( {
    X: () => { rotateX(sin(thetacum * rotSlider.value())); },
    Y: () => { rotateY(cos(thetacum * rotSlider.value())); },
    Z: () => { rotateZ(cos(thetacum * rotSlider.value())); },
  } )[ a ] || ( () => { console.log( 'Invalid Axis' ); } ) )();
  ( ( {
    X: () => { rotateX(sin(thetacum * rotSlider.value())); },
    Y: () => { rotateY(cos(thetacum * rotSlider.value())); },
    Z: () => { rotateZ(cos(thetacum * rotSlider.value())); },
  } )[ b ] || ( () => { console.log( 'Invalid Axis' ); } ) )();
}

function draw() {
  color =[p,s,t,q];
  spectrum = fft.analyze();
  strokeWeight(strokeSlider.value());
  theta=(spectrum[20]+spectrum[60]+spectrum[100]+spectrum[140]+spectrum[180]+spectrum[220])*512/6 || theta;
  thetacum+=theta || thetacum;
  if (theta != 0) {
  if (song.isPlaying()) {
  level = amplitude.getLevel();
  size = map(level, 0, 1, 0, 200);
  if (axisA !== "Y" && axisB !== "X") { // simple check to skip running the rotateCube func. every time
    rotateCube(axisA, axisB);
  } else {
    rotateY(cos(thetacum * rotSlider.value()));
    rotateX(sin(thetacum * rotSlider.value()));
  }
  stroke(color[constrain(int(size), 0,3)]);
  box(350-a*10);
  a+=shrSlider.value();
  if (a>35) {
   count++
   if (count==1) {
    document.getElementById("ret-img").src=canvas.toDataURL("image/png"); // sets the image
    document.getElementById("ret-li").setAttribute('data-src', canvas.toDataURL("image/png"));
    document.getElementById("ret-li").setAttribute('data-sub-html', "<h4>" + count + ": " + title + "</h4><p>Exported from " + title + " at " + song.currentTime() + " </p>");
    document.getElementById("ret-li").style.display = 'block';
    document.getElementById("imsg").style.display = 'block';
   } else if (count>1) {
    imgPounder(canvas.toDataURL("image/png")); // dynamic img-pounder
   }
   clear(); // clear the canvas()
   background(255) // again set the bgcolor to white
   a=0; // reset
   //noLoop();
   //console.log(song.currentTime(), song.duration());
  }
  }
  }
}

function imgPounder(src) {
  var li = document.createElement('li');
  li.style.display = 'none';
  li.setAttribute('data-src', src);
  li.setAttribute('data-responsive', src + " 700");
  li.setAttribute('data-sub-html', "<h4>" + count + ": " + title + "</h4><p>Exported from " + title + " at " + song.currentTime() + " </p>");
  li.innerHTML = liHTML.replace(/{embedImgSrc}/g, src);
  document.getElementById('lightgallery').appendChild(li);
}