"use strict";
import "../scss/carousel3d.scss";

const config = {
  circleRatio: 0.45,
  speed: 2,
  rotateFreeSpeed: 100,
  minimizeRatio: 0.8,
  darknessRatio: 0.45,
  waitTouchTimer: 5000,
};

export function setConfig(overrides) {
  Object.assign(config, overrides);
}

let timerAnimation = 0;
let timerWaitTouch = 0;

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

function waitForImages(items) {
  const images = items
    .map((item) => item.querySelector("img.carouselImage"))
    .filter(Boolean);

  return Promise.all(
    images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          }),
    ),
  );
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

  waitForImages(items).then(() => {
    carouselEl.dispatchEvent(
      new CustomEvent("carousel3d:loaded", { detail: { id: carouselEl.id } }),
    );
  });

  window.addEventListener("resize", () => {
    onRotateToFinal(
      carouselEl,
      items,
      Number(carouselEl.dataset.rotation) || 0,
    );
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

  nodeLeft.addEventListener("click", () => {
    if (isRotating()) {
      onStopRotating();
    } else {
      onStopRotating();
      onRotateTo(carouselEl, items, -steps, true);
    }
  });
  nodeRight.addEventListener("click", () => {
    if (isRotating()) {
      onStopRotating();
    } else {
      onStopRotating();
      onRotateTo(carouselEl, items, steps, true);
    }
  });
}

function sendTouchEvent(carouselEl) {
  if (timerWaitTouch !== 0) clearTimeout(timerWaitTouch);

  carouselEl.dispatchEvent(
    new CustomEvent("carousel3d:touched", { detail: { id: carouselEl.id } }),
  );
}

async function onRotateTo(carouselEl, items, degrees, snapToValid) {
  if (!carouselEl?.dataset) return;

  //touch timer
  if (timerWaitTouch !== 0) clearTimeout(timerWaitTouch);
  timerWaitTouch = setTimeout(
    sendTouchEvent,
    config.waitTouchTimer,
    carouselEl,
  );

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
  const totalDuration = totalSteps * config.speed;

  return new Promise((resolve) => {
    const startTime = performance.now();

    const animate = (now) => {
      const t = Math.min((now - startTime) / totalDuration, 1);
      // sine ease-in-out: slow start, fast middle, slow stop
      const eased = -(Math.cos(Math.PI * t) - 1) / 2;
      onRotateToFinal(
        carouselEl,
        items,
        currentDeg + eased * totalSteps * direction,
        true,
      );
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    };

    requestAnimationFrame(animate);
  });
}

async function onRotateToFinal(carouselEl, items, deg, skipSleep) {
  if (!items.length) return;

  const width = carouselEl.clientWidth;
  const height = carouselEl.clientHeight;
  const radius = width / 2;
  const steps = 360 / items.length;

  const elementW = width * config.minimizeRatio;
  const elementH = height * config.minimizeRatio;

  let fixDeg = deg % 360;
  if (fixDeg < 0) fixDeg += 360;
  carouselEl.dataset.rotation = fixDeg.toString();

  for (let i = 0; i < items.length; i++) {
    const delta = rotateAngle(i * steps, deg);
    const rawDist = Math.cos(degreesToRadians(delta)) * radius;
    const distance = fetchRealDistance(delta, rawDist, radius);
    const x_raw = Math.sin(degreesToRadians(delta)) * radius;

    const z = (radius * 2 - distance) / (radius * 2);
    const zPercent =
      (2 * radius - distance * config.circleRatio) / (2 * radius);
    const zDarkness =
      (2 * radius - distance * config.darknessRatio) / (2 * radius);

    const sizedW = elementW * zPercent;
    const sizedH = elementH * zPercent;
    const x = x_raw + width / 2 - sizedW / 2;
    const y = height / 2 - sizedH / 2;

    Object.assign(items[i].style, {
      width: `${sizedW}px`,
      height: `${sizedH}px`,
      left: `${x}px`,
      top: `${y}px`,
      zIndex: Math.floor(z * 100).toString(),
      filter: `brightness(${zDarkness.toFixed(2)})`,
    });
  }

  if (!skipSleep) await sleep(config.speed);
}

export function onKeepRotating(direction) {
  onStopRotating();

  const carouselEl = document.querySelector(".carousel3D");
  if (!carouselEl) return;
  const items = [...carouselEl.querySelectorAll(".element3D")];
  if (!items.length) return;

  const degreesPerSecond = 1000 / config.rotateFreeSpeed;
  let lastTime = performance.now();

  const step = async (now) => {
    if (timerAnimation === 0) return;

    const elapsedSeconds = (now - lastTime) / 1000;
    lastTime = now;

    carouselEl.dataset.direction = direction;
    const currentDeg = parseFloat(carouselEl.dataset.rotation) || 0;
    const delta =
      (direction === "left" ? -1 : 1) * degreesPerSecond * elapsedSeconds;
    await onRotateToFinal(carouselEl, items, currentDeg + delta, true);

    if (timerAnimation === 0) return;
    timerAnimation = requestAnimationFrame(step);
  };

  timerAnimation = requestAnimationFrame(step);
}

function isRotating() {
  const carouselEl = document.querySelector(".carousel3D");
  if (!carouselEl?.dataset?.rotation) return false;

  if (carouselEl.dataset.direction.length > 0) return true;
  else return false;
}

function onStopRotating() {
  if (timerAnimation === 0) return;
  cancelAnimationFrame(timerAnimation);
  timerAnimation = 0;

  const carouselEl = document.querySelector(".carousel3D");
  if (!carouselEl?.dataset?.rotation) return;

  const direction = carouselEl.dataset.direction || "";
  const currentDeg = parseFloat(carouselEl.dataset.rotation);
  carouselEl.dataset.direction = "";

  setTimeout(() => onResetToClosest(carouselEl, currentDeg, direction), 1);
}

async function onResetToClosest(carouselEl, degreesCurrent, direction) {
  if (!carouselEl) return;
  const items = [...carouselEl.querySelectorAll(".element3D")];
  if (!items.length) return;

  const degreesPerStep = 360 / items.length;
  const closestFloor =
    Math.floor(degreesCurrent / degreesPerStep) * degreesPerStep;

  if (direction === "left") {
    for (let d = degreesCurrent; d > closestFloor; d--) {
      await onRotateToFinal(carouselEl, items, Math.max(d - 1, closestFloor));
    }
  } else if (direction === "right") {
    const target = closestFloor + degreesPerStep;
    for (let d = degreesCurrent; d < target; d++) {
      await onRotateToFinal(carouselEl, items, Math.min(d + 1, target));
    }
  } else {
    await onRotateToFinal(carouselEl, items, degreesCurrent);
  }
}
