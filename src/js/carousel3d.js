"use strict";
import "../scss/carousel3d.scss";

const config = {
  circleRatio:   0.45,
  speed:         2,
  minimizeRatio: 0.8,
  opacityRatio:  0.45,
};

export function setConfig(overrides) {
  Object.assign(config, overrides);
}

let timerHandle = 0;

function to2dp(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function degreesToRadians(deg) {
  return deg * (Math.PI / 180);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rotateAngle(delta, degrees) {
  delta = (delta + degrees) % 360;
  return delta < 0 ? delta + 360 : delta;
}

function fetchRealDistance(angle, distance, radius) {
  return angle >= 90 && angle <= 270
    ? Math.abs(distance) + radius
    : radius - distance;
}

function fetchClosest(value, arr) {
  return arr.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev,
  );
}

function fetchValidMovements(items) {
  const segment = 360 / items.length;
  const arr = items.map((_, i) => to2dp((i % 360) * segment));
  arr.push(360);
  return arr;
}

export function initialiseCarousel(id) {
  const element = document.getElementById(id);
  if (!element) return;
  setCarousel3D(element);
}

function setCarousel3D(carouselEl) {
  if (!carouselEl) return;
  const items = [...carouselEl.querySelectorAll(".element3D")];
  if (!items.length) return;

  attachClickDivs(carouselEl, items);
  carouselEl.dataset.rotation = "0";
  onRotateToFinal(carouselEl, items, 0);

  window.addEventListener("resize", () => {
    onRotateToFinal(carouselEl, items, Number(carouselEl.dataset.rotation) || 0);
  });
}

function attachClickDivs(carouselEl, items) {
  const steps = 360 / items.length;

  const nodeLeft = document.createElement("div");
  nodeLeft.className = "carousel3DLeft";
  carouselEl.appendChild(nodeLeft);

  const nodeRight = document.createElement("div");
  nodeRight.className = "carousel3DRight";
  carouselEl.appendChild(nodeRight);

  nodeLeft.addEventListener("click", () => onRotateTo(carouselEl, items, -steps, true));
  nodeRight.addEventListener("click", () => onRotateTo(carouselEl, items, steps, true));
}

async function onRotateTo(carouselEl, items, degrees, snapToValid) {
  if (!carouselEl?.dataset) return;

  const currentDeg = parseInt(carouselEl.dataset.rotation) || 0;

  if (degrees === 0) {
    await onRotateToFinal(carouselEl, items, currentDeg);
    return;
  }

  let target = currentDeg + degrees;

  if (snapToValid) {
    const validMoves = fetchValidMovements(items);
    let absTarget = to2dp(Math.abs(target));
    if (!validMoves.includes(absTarget)) {
      absTarget = fetchClosest(absTarget, validMoves);
      target = target < 0 ? -absTarget : absTarget;
    }
  }

  const totalSteps = Math.abs(target - currentDeg);
  const direction = target > currentDeg ? 1 : -1;

  for (let i = 0; i <= totalSteps; i++) {
    await onRotateToFinal(carouselEl, items, currentDeg + i * direction);
  }
}

async function onRotateToFinal(carouselEl, items, deg) {
  if (!items.length) return;

  const width  = carouselEl.clientWidth;
  const height = carouselEl.clientHeight;
  const radius = width / 2;
  const steps  = 360 / items.length;

  const elementW = width  * config.minimizeRatio;
  const elementH = height * config.minimizeRatio;

  let fixDeg = deg % 360;
  if (fixDeg < 0) fixDeg += 360;
  carouselEl.dataset.rotation = fixDeg.toString();

  for (let i = 0; i < items.length; i++) {
    const delta    = rotateAngle(i * steps, deg);
    const rawDist  = Math.cos(degreesToRadians(delta)) * radius;
    const distance = fetchRealDistance(delta, rawDist, radius);
    const x_raw    = Math.sin(degreesToRadians(delta)) * radius;

    const z        = (radius * 2 - distance) / (radius * 2);
    const zPercent = (2 * radius - distance * config.circleRatio)  / (2 * radius);
    const zOpacity = (2 * radius - distance * config.opacityRatio) / (2 * radius);

    const sizedW = elementW * zPercent;
    const sizedH = elementH * zPercent;
    const x = x_raw + width  / 2 - sizedW / 2;
    const y =         height / 2 - sizedH / 2;

    Object.assign(items[i].style, {
      width:   `${sizedW}px`,
      height:  `${sizedH}px`,
      left:    `${x}px`,
      top:     `${y}px`,
      zIndex:  Math.floor(z * 100).toString(),
      opacity: zOpacity.toFixed(2),
    });
  }

  await sleep(config.speed);
}

function onKeepRotating(direction) {
  onStopRotating();

  const carouselEl = document.querySelector(".carousel3D");
  if (!carouselEl) return;
  const items = [...carouselEl.querySelectorAll(".element3D")];

  timerHandle = setInterval(async () => {
    if (timerHandle === 0) return;
    carouselEl.dataset.direction = direction;
    await onRotateTo(carouselEl, items, direction === "left" ? -1 : 1, false);
  }, config.speed);
}

function onStopRotating() {
  if (timerHandle === 0) return;
  clearInterval(timerHandle);
  timerHandle = 0;

  const carouselEl = document.querySelector(".carousel3D");
  if (!carouselEl?.dataset?.rotation) return;

  const direction    = carouselEl.dataset.direction || "";
  const currentDeg   = parseInt(carouselEl.dataset.rotation);
  carouselEl.dataset.direction = "";

  setTimeout(() => onResetToClosest(carouselEl, currentDeg, direction), 1);
}

async function onResetToClosest(carouselEl, degreesCurrent, direction) {
  if (!carouselEl) return;
  const items = [...carouselEl.querySelectorAll(".element3D")];
  if (!items.length) return;

  const degreesPerStep     = 360 / items.length;
  const closestFloor       = Math.floor(degreesCurrent / degreesPerStep) * degreesPerStep;

  if (direction === "left") {
    for (let d = degreesCurrent; d >= closestFloor; d--) {
      await onRotateToFinal(carouselEl, items, d);
    }
  } else if (direction === "right") {
    for (let d = degreesCurrent; d <= closestFloor + degreesPerStep; d++) {
      await onRotateToFinal(carouselEl, items, d);
    }
  } else {
    await onRotateToFinal(carouselEl, items, degreesCurrent);
  }
}