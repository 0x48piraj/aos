// Known bug: On many devices, when the keyboard is shown, the availableWidth will be greater than the height, incorrectly giving landscape orientation. (but on visiting/reloading, we can assume that keyboard is not active at that point of time. Plus, our webapp doesn't require keyboard input)
function checkOrientation() {
  const isPortrait = window.innerHeight > window.innerWidth;
  const isTooShort = window.innerHeight < 625;
  const error = document.getElementById("orientationError");
  const app = document.getElementById("playground");

  if (isPortrait || isTooShort) {
    error.classList.remove("hidden");
    app.classList.add("hidden");
  } else {
    error.classList.add("hidden");
    app.classList.remove("hidden");
  }
}

window.addEventListener("resize", checkOrientation);
window.addEventListener("orientationchange", checkOrientation);
