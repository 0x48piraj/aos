var song;
var fft;
var button;
var a = 0;
var count = 0;
var theta = 0
var thetacum = 0;
var p,s,t,q;
var title = 'Symphony No. 5 (1st movement)', artist, album, syear;
var reader = new FileReader();

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
  var fileURL=  file.data;
  song = loadSound(fileURL, scall); // success callback func
  song.playMode('restart'); // make sure song restarts
  a = 0; // reset the size
  background(255)
}

function setup() {

  p = '#C92B68'
  s = '#F74F70'
  t = '#FF939B'
  q = '#A61458'
  input = createFileInput(handleFile);
  input.style('position', 'absolute');
  input.id('toggle-song');
  input.style('top', '0');
  input.style('right', '0');
  
  createCanvas(700, 700, WEBGL);
  background(255)
  button = createButton('toggle');
  button.style('position', 'absolute');
  button.style('top', '0');
  button.style('right', '0');
  button.mousePressed(toggleSong);
  //song.play();
  fft = new p5.FFT(0, 512);
  amplitude = new p5.Amplitude();
  document.getElementById('dashboard').style.display = 'block'; // display the picker now
}

function draw() {
  var color =[p,s,t,q];
  var spectrum = fft.analyze();
  strokeWeight(2);
  theta=(spectrum[20]+spectrum[60]+spectrum[100]+spectrum[140]+spectrum[180]+spectrum[220])*512/6 || theta;
  thetacum+=theta || thetacum;
  if (theta != 0) {
  if (song.isPlaying()) {
  let level = amplitude.getLevel();
  let size = map(level, 0, 1, 0, 200);
  rotateY(cos(thetacum * 0.000001));
  rotateX(sin(thetacum * 0.000001));
  stroke(color[constrain(int(size), 0,3)]);
  box(350-a*10);
  a+=0.009;
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

const liHTML = `
        <a href="">
          <img id="ret-img" class="img-responsive" src="{embedImgSrc}">
          <div class="lgallery-poster">
            <img src="/static/img/zoom.png">
          </div>
        </a>
     `;

function imgPounder(src) {
  var li = document.createElement('li');
  li.style.display = 'none';
  li.setAttribute('data-src', src);
  li.setAttribute('data-responsive', src + " 700");
  li.setAttribute('data-sub-html', "<h4>" + count + ": " + title + "</h4><p>Exported from " + title + " at " + song.currentTime() + " </p>");
  li.innerHTML = liHTML.replace(/{embedImgSrc}/g, src);
  document.getElementById('lightgallery').appendChild(li);
}