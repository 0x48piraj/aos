var song;
var fft;
var button;
var rotSlider, shrSlider, strokeSlider;
var comin, boxSize;
var a = 0;
var count = 0;
var theta = 0;
var thetacum = 0;
var p,s,t,q;
var color,spectrum,level,size;
var title = 'Taylor Swift - Lover', artist, album, syear;
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
          <path id="play-svgpath" d='M11,8 L26,16 11,24 11,8'>
            <animate attributeName='d' fill='freeze' dur='0.2s'
                     calc-mode='spline' keySplines='0.19 1 0.22 1'/>
          </path>
        </svg>
     `;


function setColor(colorSchema) {
    if(song.isPlaying()) { // stop song if playing
      song.stop(); 
      document.getElementById("toggler").click();
    }
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
  song = loadSound('/static/res/audio/defaultSong.mp3'); // default song
}

function handleFile(file) {
  if(song.isPlaying()) { // stop song if playing
    song.stop(); 
    document.getElementById("toggler").click();
  }
  clear(); // clear the canvas
  button.style('display', 'none'); // hide the input box for time being
  song = loadSound(file.data, scall); // success callback func
  song.playMode('restart'); // make sure song restarts
  a = 0; // reset the size
  background(255)
}

function setup() {

  // Known bug: On many devices, when the keyboard is shown, the availableWidth will be greater than the height, incorrectly giving landscape orientation. (but on visiting/reloading, we can assume that keyboard is not active at that point of time. Plus, our webapp doesn't require keyboard input)
  if (window.innerHeight > window.innerWidth) { // allows desktops & landscape mode in mobiles, catches portrait
      const url = new URL(window.location.href);
      document.getElementById('labody').style.display = 'block';
      document.getElementById('labody').innerHTML = "<p align='center' style='color: black;'><img src='" + url.href + "static/img/error.gif' alt='Portrait mode detected.' width='400' height='400' /><br>This website is best viewed in Desktops, but if you still want to uncover what's beneath, switch to landscape mode.<br><img src='" + url.href + "static/img/rotate.gif' alt='Turn your phone' width='100' height='100' /></p>";
      document.getElementById('labody').style.background = "#fafafa";
      window.addEventListener("orientationchange", function() {
        if (screen.orientation.angle == 90) {
          document.getElementById('labody').innerHTML = "<p align='center' style='color: black;'>Loading ...</p>";
          window.location = url.href;
        }
      }, false);
      ThrowException();
  }

  p = '#C92B68'
  s = '#F74F70'
  t = '#FF939B'
  q = '#A61458'

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
  rotSlider.addClass('slider');
  rotSlider.parent("s1");

  shrSlider = createSlider(0.009, 0.09, 0.009, 0.001); // shrink rate slider
  shrSlider.addClass('slider');
  shrSlider.parent("s2");

  strokeSlider = createSlider(1, 10, 2, 1); // stroke weight slider
  strokeSlider.addClass('slider');
  strokeSlider.parent("s3");

  fft = new p5.FFT(0, 512);
  amplitude = new p5.Amplitude();
  // create canvas now, after knowing paint area's (parea) dynamic width (esp. for mobiles)
  comin = Math.min(document.getElementById('parea').offsetWidth, document.getElementById('parea').offsetHeight) - document.getElementById('heading').offsetHeight; // sprinkle of padding
  boxSize = comin / 2;
  cnv = createCanvas(comin, comin, WEBGL);
  cnv.parent("parea");

  if (comin < 500 && window.matchMedia("(orientation: landscape)").matches) { // if *device* in landscape mode, apply dirty css styles
    document.getElementById('heading').style.fontSize = '18px';

    // hiding light gallery
    //document.getElementById('clickViz').style.display = 'none';
    //document.getElementById('lightgallery').style.display = "table-cell";
    //document.getElementById('imsg').innerHTML = "<div class='popup' onclick='show(this)'>&darr;<span class='popuptext'>View all generated viz.</span></div>";
    document.querySelector('.lgallery').style.margin = '0px 0px 0px 0px';
    document.querySelector('.lgallery').style.width = '50px';
    document.getElementById('imsg').innerHTML = 'Viz. Art';

    var fileEl = document.getElementById("file-input");
    document.getElementById('playbtn').appendChild(fileEl);
    document.querySelector('.file-input .label').parentElement.removeChild(document.querySelector('.file-input .label'));
    document.querySelector('.file-input').style.display = "block";
    document.querySelector('.file-input .button').style.padding = "4px 8px";
    document.getElementById('playbtn').style.display = "inline-flex";
    document.getElementById('playbtn').style.justifyContent = "center";
    document.getElementById('playbtn').style.alignItems = "center";
    document.getElementById('toggler').style.padding = "12px 18px";
    document.getElementById('play-svg').style.width = "15px";
    document.getElementById('toggler').style.margin = "0px 0px 0px 20px";
    
    var rangeInput = document.getElementsByClassName("slider");
    for (var i = 0; i < rangeInput.length; i++) { // isn't that time consuming? rn, idc!
      rangeInput[i].style.height = '0px';
    }
    
    document.querySelector('.parent').style.margin = "5px 0px 0px 0px";
    document.getElementById('axisBx').style.padding = "0px 5px";
    document.getElementById('axisBy').style.padding = "0px 5px";
    document.getElementById('axisBz').style.padding = "0px 5px";
    document.getElementById('axisAx').style.padding = "0px 5px";
    document.getElementById('axisAy').style.padding = "0px 5px";
    document.getElementById('axisAz').style.padding = "0px 5px";
    
    var pTag = document.getElementsByClassName("dashboard-text");
    for (var i = 0; i < pTag.length; i++) { // isn't that time consuming? rn, idc!
      pTag[i].style.fontSize = '12px';
    }
    // major remodel fellas
    var hideDText = document.getElementsByClassName("dtext");
    var popTheQ = document.getElementsByClassName("popup");
    for (var i = 0; i < hideDText.length; i++) { // isn't that time consuming? rn, idc!
      hideDText[i].style.display = 'none';
    }
    for (var i = 0; i < popTheQ.length; i++) { // isn't that time consuming? rn, idc!
      popTheQ[i].style.display = 'inline-block';
    }
  }
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
  color = [p,s,t,q];
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
  box(boxSize-a*10);
  a+=shrSlider.value();
  if (a > boxSize / 10) {
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