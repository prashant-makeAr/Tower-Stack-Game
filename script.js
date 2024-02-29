//Import
import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import CANNON, { ContactMaterial, SAPBroadphase } from "cannon";

// Variables
const canvas = document.querySelector("#canvas");
const scoreContainer = document.getElementById("score");
const startScreen = document.getElementById("start-screen");
const startBtn = document.getElementById("start-button");
const gameEnd = document.getElementById("gameEnd");
const endBtn = document.getElementById("endBtn");
const finalScore = document.getElementById("finalScore");

let camera, scene, renderer, particles;
let world;
let overlap;

let gameStarted = false;
const originalBoxSize = 4;
const boxHeight = 1;
let score = 0;
let stack = [];
let overhangStack = [];

const clock = new THREE.Clock();
let time = Date.now();
let oldElapsedTime = 0;

init();

function handlestartBtnClick() {
  startScreen.style.display = "none";
  scoreContainer.style.display = "block";

  document.getElementById("canvas").style.display = "block";
  startGame();
}

function updateScore(newScore) {
  score += newScore;
  scoreContainer.textContent = `Score: ${score}`;
}

function endGame() {
  gameEnd.style.display = "flex";
  finalScore.textContent = `Your Score : ${score}`;
  endBtn.addEventListener("click", handleReplayButtonClick);
}

function handleReplayButtonClick() {
  gameStarted = false;
  score = 0;
  updateScore(score);

  stack.forEach((layer) => {
    scene.remove(layer.threejs);
    world.remove(layer.cannonjs);
  });
  stack = [];

  overhangStack.forEach((overhang) => {
    scene.remove(overhang.threejs);
    world.remove(overhang.cannonjs);
  });
  overhangStack = [];

  gameEnd.style.display = "none";
  startScreen.style.display = "flex";

  window.location.reload();
}

function performSplashAnimation(x, z, width, depth) {
  const splashGeometry = new THREE.PlaneGeometry(width, depth);
  const splashMaterial = new THREE.MeshBasicMaterial({
    color: "#A8A9AD",
    transparent: true,
    opacity: 0.5,
  });

  const splash = new THREE.Mesh(splashGeometry, splashMaterial);
  splash.position.set(x, boxHeight * (stack.length - 1) - 0.5, z);
  splash.rotation.x = -Math.PI / 2;

  scene.add(splash);

  // Animate the splash opacity
  const splashAnimationDuration = 1000;
  const fadeInDuration = 500;
  const fadeOutDelay = 500;

  new TWEEN.Tween(splashMaterial)
    .to({ opacity: 0.5 }, fadeInDuration)
    .onComplete(() => {
      // Fade out after delay
      setTimeout(() => {
        new TWEEN.Tween(splashMaterial)
          .to({ opacity: 0 }, splashAnimationDuration - fadeInDuration)
          .onComplete(() => {
            scene.remove(splash);
          })
          .start();
      }, fadeOutDelay);
    })
    .start();
}

function init() {
  //Initialise CANNON.js
  world = new CANNON.World();
  world.broadphase = new CANNON.SAPBroadphase(world);

  world.gravity.set(0, -9.8, 0);
  world.solver.iterations = 40;

  //Initialise THREE.js
  scene = new THREE.Scene();

  //Set-up Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
  directionalLight.castShadow = true;
  directionalLight.position.set(2, 10, 2);

  scene.add(directionalLight);

  //Foundation
  addLayer(0, 0, 12, 12);

  //First Layer

  addLayer(0, 0, originalBoxSize, originalBoxSize);

  //First Layer
  addLayer(-10, 0, originalBoxSize, originalBoxSize, "x");

  //Adding Stars
  const particleGeometry = new THREE.BufferGeometry();
  const count = 5000;

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 100;
    colors[i] = Math.random();
  }

  particleGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
  );

  particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const particlesMaterial = new THREE.PointsMaterial({
    size: 0.05,
    sizeAttenuation: true,
  });

  particlesMaterial.transparent = true;
  particlesMaterial.depthWrite = false;
  particlesMaterial.vertexColors = true;
  particlesMaterial.blending = THREE.AdditiveBlending;

  particles = new THREE.Points(particleGeometry, particlesMaterial);
  scene.add(particles);

  //Camera
  const height = 25;
  const width = height * (window.innerWidth / window.innerHeight);
  camera = new THREE.OrthographicCamera(
    width / -2,
    width / 2,
    height / 2,
    height / -2,
    1,
    500
  );

  camera.position.set(12, 12, 18);
  camera.lookAt(0, 0, 0);

  //Renderer
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.render(scene, camera);
}

function addLayer(x, z, width, depth, direction) {
  const y = boxHeight + stack.length;

  const layer = generateBox(x, y, z, width, depth, false);
  layer.direction = direction;

  stack.push(layer);
}

function generateBox(x, y, z, width, depth, ifFalls) {
  // THREE.js
  const geometry = new THREE.BoxGeometry(width, boxHeight, depth);

  const color = new THREE.Color(`hsl(${30 + stack.length * 4}, 100% , 50% )`);
  const material = new THREE.MeshMatcapMaterial({ color });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);

  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  //CANNON.js

  // const defaultMaterial = new CANNON.Material();
  // const overHangingMaterial = new CANNON.Material();

  const defaultMaterial = new CANNON.Material("default");

  const defaultContactMaterial = new CANNON.ContactMaterial(
    defaultMaterial,
    defaultMaterial,
    {
      friction: 0.1,
      restitution: 0.5,
    }
  );

  world.addContactMaterial(defaultContactMaterial);
  world.defaultContactMaterial = defaultContactMaterial;

  const shape = new CANNON.Box(
    new CANNON.Vec3(width / 2, boxHeight / 2, depth / 2)
  );

  let mass = ifFalls ? 5 : 0;
  const body = new CANNON.Body({
    mass: mass,
    position: new CANNON.Vec3(x, y, z),
    shape: shape,
    // material: ifFalls ? overHangingMaterial : defaultMaterial,
  });

  body.addShape(shape);
  world.addBody(body);

  return {
    threejs: mesh,
    cannonjs: body,
    width: width,
    depth: depth,
  };
}

function calculate_overlap_score(overlap_percentage) {
  return Math.round(overlap_percentage / 10);
}

function startGame() {
  if (!gameStarted) {
    renderer.setAnimationLoop(animation);
    window.addEventListener("click", () => {
      gameStarted = true;
    });
  } else {
    const topLayer = stack[stack.length - 1];
    const previousLayer = stack[stack.length - 2];

    const direction = topLayer.direction;

    const delta =
      topLayer.threejs.position[direction] -
      previousLayer.threejs.position[direction];

    const overHangSize = Math.abs(delta);

    const size = direction == "x" ? topLayer.width : topLayer.depth;

    overlap = size - overHangSize;

    if (overlap > 0) {
      const overlapPercentage = (overlap / size) * 100;

      // Calculate score based on overlap percentage
      const newScore = calculate_overlap_score(overlapPercentage);

      //Update the score
      updateScore(newScore);

      //Cut the layer
      const newWidth = direction == "x" ? overlap : topLayer.width;
      const newDepth = direction == "z" ? overlap : topLayer.depth;

      //Update meta data
      topLayer.width = newWidth;
      topLayer.depth = newDepth;

      //Update THREE.js Model
      topLayer.threejs.scale[direction] = overlap / size;
      topLayer.threejs.position[direction] -= delta / 2;

      //Update Cannon.js
      topLayer.cannonjs.position[direction] -= delta / 2;

      //Over Hanging
      const overHangShift = (overlap / 2 + overHangSize / 2) * Math.sign(delta);

      const overHangX =
        direction == "x"
          ? topLayer.threejs.position.x + overHangShift
          : topLayer.threejs.position.x;

      const overHangZ =
        direction == "z"
          ? topLayer.threejs.position.z + overHangShift
          : topLayer.threejs.position.z;
      const overHangWidth = direction == "x" ? overHangSize : newWidth;

      const overHangDepth = direction == "z" ? overHangSize : newDepth;

      addOverHang(overHangX, overHangZ, overHangWidth, overHangDepth);
      //Next Layer
      const nextX = direction === "x" ? topLayer.threejs.position.x : -10;
      const nextZ = direction === "z" ? topLayer.threejs.position.z : -10;
      const nextDirection = direction === "x" ? "z" : "x";
      addLayer(nextX, nextZ, newWidth, newDepth, nextDirection);

      if (newScore == 10) {
        document.getElementById("prompt").style.display = "block";
        setTimeout(() => {
          document.getElementById("prompt").style.display = "none";
        }, 1000);

        performSplashAnimation(
          topLayer.threejs.position.x,
          topLayer.threejs.position.z,
          newWidth + 1,
          newDepth + 1
        );
      }
    } else if (overlap <= 0) {
      endGame();
      renderer.setAnimationLoop(null);
      return;
    }
  }
}

function addOverHang(x, z, width, depth) {
  const y = boxHeight * (stack.length - 1);

  const topLayer = stack[stack.length - 1];
  const direction = topLayer.direction;
  const delta = topLayer.threejs.position[direction] - topLayer.width / 2;

  let overHangX, overHangZ;

  if (direction === "x") {
    if (x > topLayer.threejs.position.x) {
      overHangX = x + width / 2 + 0.1;
    } else {
      overHangX = x - width / 2 - 0.1;
    }
    overHangZ = z;
  } else {
    if (z > topLayer.threejs.position.z) {
      overHangZ = z + depth / 2 + 0.1;
    } else {
      overHangZ = z - depth / 2 - 0.1;
    }
    overHangX = x;
  }

  const overHang = generateBox(overHangX, y, overHangZ, width, depth, true);
  overhangStack.push(overHang);
}

function animation() {
  let speed = 0.8;

  const deltaTime = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  const delta = elapsedTime - oldElapsedTime;
  oldElapsedTime = elapsedTime;

  const topLayer = stack[stack.length - 1];

  topLayer.threejs.position[topLayer.direction] =
    Math.cos(elapsedTime * speed) * -10;
  topLayer.cannonjs.position[topLayer.direction] =
    Math.cos(elapsedTime * speed) * -10;

  world.step(1 / 60, delta, 3);
  overhangStack.forEach((element) => {
    element.threejs.position.copy(element.cannonjs.position);
    element.threejs.quaternion.copy(element.cannonjs.quaternion);
  });
  TWEEN.update();

  particles.rotation.x = 0.002 * elapsedTime;
  particles.rotation.y = 0.002 * elapsedTime;
  particles.rotation.z = -0.002 * elapsedTime;

  // 4 is the initial camera height
  let cameraTargetY = boxHeight * (stack.length - 2) + 10;
  if (camera.position.y < cameraTargetY) {
    camera.position.y += elapsedTime * 0.02;
    particles.position.y += elapsedTime * 0.02;
  }

  renderer.render(scene, camera);
}

// Eventlisteners

// window.addEventListener("click", startGame);
canvas.addEventListener("click", startGame);

window.addEventListener("keydown", (e) => {
  if (e.key === " ") {
    startGame();
  }
});

window.addEventListener("keydown", (e) => {
  if (e.key === "r") {
    location.reload();
  }
});

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  const height = 25;
  const width = height * (window.innerWidth / window.innerHeight);

  camera.left = width / -2;
  camera.right = width / 2;
  camera.top = height / 2;
  camera.bottom = height / -2;

  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
});

window.addEventListener("dblclick", () => {
  if (!document.fullscreenElement) {
    canvas.webkitRequestFullscreen();
  } else {
    document.exitFullscreen();
  }
});

startBtn.addEventListener("click", handlestartBtnClick);

endBtn.addEventListener("click", handleReplayButtonClick);
