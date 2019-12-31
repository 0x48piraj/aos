var song;
var fft;
var button;
var a = 0;
var count = 0;
var theta = 0
var thetacum = 0;
var p,s,t,q;



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
}

function toggleSong() {
  if (song.isPlaying()) {
    song.pause();
  } else {
    song.play();
  }
}

function scall() {
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
}

function setup() {

  p = '#C92B68'
  s = '#F74F70'
  t = '#FF939B'
  q = '#A61458'
  input = createFileInput(handleFile);
  input.style('position', 'absolute');
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
  count++;
  console.log(count);
  if (a>35) {
  document.getElementById("ret").style.display = 'block';
  document.getElementById("ret").src=canvas.toDataURL("image/png").replace("image/png", "image/octet-stream"); // sets the image
  clear();
  a=0;
  var bb=song.currentTime();
  console.log(bb, song.duration());
  }
  }
  }
}