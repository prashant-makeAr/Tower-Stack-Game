const scoreElement = document.getElementById("score");
const startScreen = document.getElementById("start-screen");
const startButton = document.getElementById("start-button");
const gameEnd = document.getElementById("gameEnd");
const endBtn = document.getElementById("endBtn");
const finalScore = document.getElementById("finalScore");
import * as THREE from "three";
import CANNON, { ContactMaterial, SAPBroadphase } from "cannon";

let score = 0;
const canvas = document.querySelector("#canvas");
let camera, scene, renderer;
let world;
let overlap;

const originalBoxSize = 4;
const boxHeight = 1;
let gameStarted = false;
let stack = [];
let overhangStack = [];

const clock = new THREE.Clock();

init();

// Function to handle start button click
function handleStartButtonClick() {
  startScreen.style.display = "none"; // Hide start screen
  document.getElementById("canvas").style.display = "block"; // Show game canvas
  startGame(); // Start the game
}

startButton.addEventListener("click", handleStartButtonClick);

function updateScore(newScore) {
  score += newScore;
  scoreElement.textContent = `Score: ${score}`;
}

function endGame() {
  gameEnd.style.display = "flex";
  finalScore.textContent = `Your Score - ${score}`;
  endBtn.addEventListener("click", handleReplayButtonClick);
}

function handleReplayButtonClick() {
  gameStarted = false;
  score = 0;
  updateScore(score);

  // stack.forEach((layer) => {
  //   scene.remove(layer.threejs);
  //   world.remove(layer.cannonjs);
  // });
  // stack = [];

  // overhangStack.forEach((overhang) => {
  //   scene.remove(overhang.threejs);
  //   world.remove(overhang.cannonjs);
  // });
  // overhangStack = [];

  gameEnd.style.display = "none";
  // canvas.style.display = "none";
  startScreen.style.display = "flex";

  window.location.reload();
}

endBtn.addEventListener("click", handleReplayButtonClick);

function init() {
  //Initialise CANNON.js
  world = new CANNON.World();
  world.broadphase = new CANNON.SAPBroadphase(world);

  world.gravity.set(0, -9.8, 0);
  world.solver.iterations = 40;

  //Initialise THREE.js
  scene = new THREE.Scene();

  //Foundation
  addLayer(0, 0, originalBoxSize, originalBoxSize);

  //First Layer
  addLayer(-10, 0, originalBoxSize, originalBoxSize, "x");

  //Set-up Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
  scene.add(directionalLight);

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

  camera.position.set(15, 15, 15);
  camera.lookAt(0, 0, 0);

  //Renderer
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.render(scene, camera);
}

function addLayer(x, z, width, depth, direction) {
  const y = boxHeight + stack.length; // Add the box one layer higher

  const layer = generateBox(x, y, z, width, depth, false);
  layer.direction = direction;

  // console.log(layer);

  stack.push(layer);
}

function generateBox(x, y, z, width, depth, ifFalls) {
  // THREE.js
  const geometry = new THREE.BoxGeometry(width, boxHeight, depth);

  const color = new THREE.Color(`hsl(${30 + stack.length * 4}, 100% , 50% )`);
  const material = new THREE.MeshStandardMaterial({ color });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  scene.add(mesh);

  //CANNON.js

  // const defaultMaterial = new CANNON.Material();
  // const overHangingMaterial = new CANNON.Material();

  const defaultMaterial = new CANNON.Material("default");

  const defaultContactMaterial = new CANNON.ContactMaterial(
    defaultMaterial,
    defaultMaterial,
    {
      friction: 0.01,
      restitution: 0.8,
    }
  );

  // // Fine-tune contact material properties
  // defaultContactMaterial.friction = 0.5; // Adjust friction
  // defaultContactMaterial.restitution = 0.3; // Adjust restitution
  // defaultContactMaterial.contactEquationStiffness = 1e8; // Adjust stiffness
  // defaultContactMaterial.contactEquationRelaxation = 3; // Adjust relaxation

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
  // body.position.set(x, y, z);
  body.addShape(shape);
  world.addBody(body);

  // Adjust collision margins for each shape in the body
  // const collisionMargin = 0.01; // Adjust as necessary
  // body.shapes.forEach((shape) => {
  //   shape.collisionMargin = collisionMargin;
  // });

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
    // startAnimation();
    // gameStarted = true;

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

      // Add score to the game logic (example: display score on console)
      console.log("Overlap Percentage:", overlapPercentage);
      console.log("Score:", score);

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
      // topLayer.cannonjs.scale[direction] = overlap / size;
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
    } else if (overlap <= 0) {
      endGame();
      renderer.setAnimationLoop(null);
      return;
    }

    //Next Layer
    // const newWidth = originalBoxSize;
    // const newDepth = originalBoxSize;
    // const nextDirection = direction === "x" ? "z" : "x";
    // addLayer(nextX, nextZ, newWidth, newDepth, nextDirection);
  }
}

function addOverHang(x, z, width, depth) {
  const y = boxHeight * (stack.length - 1);

  const topLayer = stack[stack.length - 1];
  const direction = topLayer.direction;
  const delta = topLayer.threejs.position[direction] - topLayer.width / 2;

  let overHangX, overHangZ;
  // if (direction === "x") {
  //   overHangX = delta < x ? x + width / 2 : x - width / 2;
  //   overHangZ = z;
  // } else {
  //   overHangX = x;
  //   overHangZ = delta < z ? z + depth / 2 : z - depth / 2;
  // }

  if (direction === "x") {
    if (x > topLayer.threejs.position.x) {
      overHangX = x + width / 2 + 0.2;
    } else {
      overHangX = x - width / 2 - 0.2;
    }
    overHangZ = z;
  } else {
    if (z > topLayer.threejs.position.z) {
      overHangZ = z + depth / 2 + 0.2;
    } else {
      overHangZ = z - depth / 2 - 0.2;
    }
    overHangX = x;
  }

  const overHang = generateBox(overHangX, y, overHangZ, width, depth, true);

  // const overHang = generateBox(x, y, z, width, depth, true);

  // console.log(
  //   "Overhanging",
  //   overhangStack.length > 0
  //     ? overhangStack[overhangStack.length - 1].threejs.position
  //     : "Empty"
  // );
  // console.log("Stack", stack[stack.length - 1].threejs.position);

  overhangStack.push(overHang);
}

window.addEventListener("click", startGame);
window.addEventListener("keydown", (e) => {
  if (e.key === " ") {
    startGame();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "r") {
    location.reload();
  }
});

let time = Date.now();

let oldElapsedTime = 0;

function animation() {
  let speed = 0.8;

  const deltaTime = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  const delta = elapsedTime - oldElapsedTime;
  oldElapsedTime = elapsedTime;

  const topLayer = stack[stack.length - 1];

  // topLayer.threejs.position[topLayer.direction] += deltaTime * speed * 50;
  // topLayer.cannonjs.position[topLayer.direction] += deltaTime * speed * 50;

  topLayer.threejs.position[topLayer.direction] =
    Math.cos(elapsedTime * speed) * -10;
  topLayer.cannonjs.position[topLayer.direction] =
    Math.cos(elapsedTime * speed) * -10;

  world.step(1 / 60, delta, 3);
  overhangStack.forEach((element) => {
    element.threejs.position.copy(element.cannonjs.position);
    element.threejs.quaternion.copy(element.cannonjs.quaternion);
  });

  // 4 is the initial camera height
  let cameraTargetY = boxHeight * (stack.length - 2) + 15;
  if (camera.position.y < cameraTargetY) {
    camera.position.y += elapsedTime * 0.02;
  }

  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);

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
    // canvas.requestFullscreen()
    canvas.webkitRequestFullscreen();
  } else {
    document.exitFullscreen();
  }
});
