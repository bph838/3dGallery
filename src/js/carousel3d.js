"use strict";
import "../scss/carousel3d.scss";

function to2dp(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

let timerHandle = 0;
let carouselCircleRatio = 0.45;
let carouselSpeed = 2;
let carouselMinimizeRatio = 0.8;
let carouselOpacityRatio = 0.45;

export function initaliseCarousel(id) {
  const element = document.getElementById(id);
  if (!element) return;
  console.log("Starting initaliseCarousel");
  setCarousel3D(element);
}

function setCarousel3D(carouselEl) {
  if (typeof carouselEl == "undefined" || carouselEl == null) return;

  setClickEventDivs(carouselEl);

  setCarouselDisplay3D(carouselEl);

  window.addEventListener("resize", () => {
    onRotateToFinal(carouselEl, 0);
  });
}

function setClickEventDivs(carouselEl) {
  if (typeof carouselEl == "undefined" || carouselEl == null) return;

  const el3DList = carouselEl.querySelectorAll(".element3D");
  let numDisplay = el3DList.length;
  if (numDisplay < 1) return;
  let steps = 360 / numDisplay;
  let OnClickLeft = `onRotate(${0 - steps})`;
  let OnClickRight = `onRotate(${steps})`;

  //create left div
  const nodeLeft = document.createElement("div");
  nodeLeft.className = "carousel3DLeft";
  carouselEl.appendChild(nodeLeft);
  //create right div
  const nodeRight = document.createElement("div");
  nodeRight.className = "carousel3DRight";
  carouselEl.appendChild(nodeRight);

  nodeLeft.addEventListener("click", () => {
    onRotate(0 - steps);
  });
  nodeRight.addEventListener("click", () => {
    onRotate(steps);
  });
}

async function setCarouselDisplay3D(carouselEl) {
  carouselEl.dataset.rotation = "0";
  await onRotateTo(carouselEl, 0, true);
}

function fetchValidMovments(carouselEl) {
  const el3DList = carouselEl.querySelectorAll(".element3D");
  let array = [];
  let segment = 360 / el3DList.length;
  for (let i = 0; i < el3DList.length; i++) {
    array.push(to2dp((i % 360) * segment));
  }
  array.push(360);
  return array;
}

async function onRotateTo(carouselEl, degress, checkValidDegrees) {
  if (typeof carouselEl.dataset == "undefined" || carouselEl.dataset == null)
    return;

  if (typeof carouselEl.dataset.rotation != "string") return;

  let currentDegrees = parseInt(carouselEl.dataset.rotation);
  let rotationDiff = degress - currentDegrees;
  if (degress === 0) {
    await onRotateToFinal(carouselEl, currentDegrees);
    return;
  }

  let steps = 0;
  let rotatingTo = currentDegrees + degress;
  //check the rotate to is multiples of the step size

  let sectionDegreed = 3;
  let array = [];
  if (checkValidDegrees) {
    let rotateToDegs = to2dp(Math.abs(rotatingTo));
    array = fetchValidMovments(carouselEl);
    if (!array.includes(rotateToDegs)) {
      console.log(`Rotating To:${rotateToDegs} failed, finding closest`);
      rotateToDegs = fetchClosest(rotateToDegs, array);
      if (rotatingTo < 0) rotateToDegs = 0 - rotateToDegs;
      rotatingTo = rotateToDegs;
    }
  }

  if (rotatingTo - currentDegrees < 0) {
    for (let deg = currentDegrees; deg >= rotatingTo; deg--) {
      steps = await onRotateToFinal(carouselEl, deg);
    }
  } else {
    for (let deg = currentDegrees; deg <= rotatingTo; deg++) {
      steps = await onRotateToFinal(carouselEl, deg);
    }
  }
}

function fetchClosest(value, arr) {
  return arr.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev,
  );
}

async function onRotateToFinal(carouselEl, deg) {
  const el3DList = carouselEl.querySelectorAll(".element3D");
  let numDisplay = el3DList.length;
  if (numDisplay < 1) return 0;
  let width = carouselEl.clientWidth;
  let height = carouselEl.clientHeight;

  let minimiseRatio = fetchMinimizeRatio();
  let elementWidth = width * minimiseRatio;
  let elementHeight = height * minimiseRatio;

  let fixDeg = deg % 360;
  if (fixDeg < 0) fixDeg += 360;
  carouselEl.dataset.rotation = fixDeg.toString();
  let steps = 360 / numDisplay;
  let radius = width / 2;

  //loop though all elements to set the dims
  for (let i = 0; i < el3DList.length; i++) {
    let delta = i * steps;
    delta = rotateAngle(delta, deg);
    let x = Math.sin(degreesToRadians(delta)) * radius;
    let distance = Math.cos(degreesToRadians(delta)) * radius;
    distance = fetchRealDistance(delta, distance, radius);
    let z = (radius * 2 - distance) / (radius * 2);
    let zPercent = (2 * radius - distance * fetchCircleRatio()) / (2 * radius);
    let zOpacity = (2 * radius - distance * fetchOpacityRatio()) / (2 * radius);

    //size params and perspective
    let sizedWidth = elementWidth * zPercent;
    let sizedHeight = elementHeight * zPercent;
    x += width / 2 - sizedWidth / 2;

    let y = height / 2 - sizedHeight / 2;

    //realtime style
    el3DList[i].style.width = sizedWidth + "px";
    el3DList[i].style.height = sizedHeight + "px";
    el3DList[i].style.left = x + "px";
    el3DList[i].style.top = y + "px";
    el3DList[i].style.zIndex = Math.floor(z * 100).toString();
    el3DList[i].style.opacity = zOpacity.toFixed(2).toString();
  }

  await sleep(fetchSpeed());

  return steps;
}

export async function onRotate(degs) {
  if (typeof event == "undefined" || event == null) return;
  let evtElement = event.srcElement;
  if (typeof evtElement == "undefined" || evtElement == null) return;

  if (
    typeof evtElement.parentElement == "undefined" ||
    evtElement.parentElement == null
  )
    return;

  await onRotateTo(evtElement.parentElement, degs, true);
}

function fetchRealDistance(angle, distance, radius) {
  if (angle >= 90 && angle <= 270) {
    distance = Math.abs(distance) + radius;
  } else {
    distance = radius - distance;
  }

  return distance;
}

function rotateAngle(delta, degrees) {
  delta = (delta + degrees) % 360;
  if (delta < 0) delta += 360;
  return delta;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function onKeepRotation(direction) {
  onStopRotating();

  timerHandle = setInterval(async () => {
    if (timerHandle === 0) return;
    //fetch the element
    let elementDisplay = document.getElementsByClassName("carousel3D");
    if (elementDisplay.length < 1) return;
    if (typeof elementDisplay[0] == "undefined" || elementDisplay[0] == null)
      return;
    let carouselEl = elementDisplay[0];
    if (timerHandle === 0) return;
    if (direction === "left") {
      carouselEl.dataset.direction = "left";
      await onRotateTo(carouselEl, -1, false);
    } else {
      carouselEl.dataset.direction = "right";
      await onRotateTo(carouselEl, 1, false);
    }
  }, fetchSpeed());
}

function onStopRotating() {
  if (timerHandle !== 0) clearInterval(timerHandle);
  else {
    return;
  }
  timerHandle = 0;

  let elementDisplay = document.getElementsByClassName("carousel3D");
  if (elementDisplay.length < 1) return;
  if (typeof elementDisplay[0] == "undefined" || elementDisplay[0] == null)
    return;
  let carouselEl = elementDisplay[0];

  //need to find current rotation and find nearest item
  if (typeof carouselEl.dataset.rotation != "string") return;
  if (typeof carouselEl.dataset.direction != "string") return;

  let direction = carouselEl.dataset.direction;
  carouselEl.dataset.direction = "";
  let currentDegrees = parseInt(carouselEl.dataset.rotation);

  setTimeout(() => {
    onResetToClosest(currentDegrees, direction);
  }, "1");
}

async function onResetToClosest(degreesCurrent, direction) {
  let elementDisplay = document.getElementsByClassName("carousel3D");
  if (elementDisplay.length < 1) return;
  let carouselEl = elementDisplay[0];
  if (typeof carouselEl == "undefined" || carouselEl == null) return;
  const el3DList = carouselEl.querySelectorAll(".element3D");
  let steps = el3DList.length;
  if (steps < 1) return;
  let degreesPerStep = 360 / steps;
  let degreesClosestFloor =
    Math.floor(degreesCurrent / degreesPerStep) * degreesPerStep;
  //based on the direction and current degrees move to the next one
  if (direction === "left") {
    for (let degs = degreesCurrent; degs >= degreesClosestFloor; degs--) {
      await onRotateToFinal(carouselEl, degs);
    }
  } else if (direction === "right") {
    for (
      let degs = degreesCurrent;
      degs <= degreesClosestFloor + degreesPerStep;
      degs++
    ) {
      await onRotateToFinal(carouselEl, degs);
    }
  } else {
    await onRotateToFinal(carouselEl, degreesCurrent);
  }
}
function fetchCircleRatio() {
  //return 0.65;
  return carouselCircleRatio;
}
function fetchSpeed() {
  //return 2;
  return carouselSpeed;
}
function fetchMinimizeRatio() {
  // return 0.8;
  return carouselMinimizeRatio;
}
function fetchOpacityRatio() {
  return carouselOpacityRatio;
}
function setCarouselCircleRatio(val) {
  carouselCircleRatio = val;
}
function setCarouselSpeed(val) {
  carouselSpeed = val;
}
function setCarouselMinimizeRatio(val) {
  carouselMinimizeRatio = val;
}
function setCarouselOpacityRatio(val) {
  carouselOpacityRatio = val;
}
