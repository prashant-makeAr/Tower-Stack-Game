import * as THREE from "three";
import CANNON, { ContactMaterial, SAPBroadphase } from "cannon";

const canvas = document.querySelector("#canvas");
let camera, scene, renderer;
let world;

const originalBoxSize = 4;
const boxHeight = 1;
let gameStarted = false;
let stack = [];
let overhangStack = [];

const clock = new THREE.Clock();

init();

function init() {
  //Initialise CANNON.js
  world = new CANNON.World();
  world.broadphase = new CANNON.SAPBroadphase(world);

  world.gravity.set(0, -9.8, 0);
  // world.solver.iterations = 40;

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
  const aspect = window.innerWidth / window.innerHeight;
  const width = height * (window.innerWidth / window.innerHeight);
  camera = new THREE.OrthographicCamera(
    width / -2,
    width / 2,
    height / 2,
    height / -2,
    1,
    100
  );

  camera.position.set(15, 15, 15);
  camera.lookAt(0, 0, 0);

  //Renderer
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });

  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.render(scene, camera);

  // document.body.appendChild(renderer.domElement)
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

  const defaultMaterial = new CANNON.Material("default");
  const overHangingMaterial = new CANNON.Material("plastic");

  const contactMaterial = new CANNON.ContactMaterial(
    defaultMaterial,
    overHangingMaterial,
    {
      friction: 0.1,
      restitution: 0.8,
    }
  );

  world.addContactMaterial(contactMaterial);

  const shape = new CANNON.Box(
    new CANNON.Vec3(width / 2, boxHeight / 2, depth / 2)
  );

  let mass = ifFalls ? 5 : 1;
  const body = new CANNON.Body({
    mass,
    shape,
    position: new CANNON.Vec3(x, y, z),
    material: ifFalls ? overHangingMaterial : defaultMaterial,
  });
  // body.position.set(x, y, z);
  body.addShape(shape);
  world.addBody(body);

  return {
    threejs: mesh,
    cannonjs: body,
    width: width,
    depth: depth,
  };
}

function startGame() {
  if (!gameStarted) {
    renderer.setAnimationLoop(animation);
    gameStarted = true;
  } else {
    const topLayer = stack[stack.length - 1];
    const previousLayer = stack[stack.length - 2];

    const direction = topLayer.direction;

    const delta =
      topLayer.threejs.position[direction] -
      previousLayer.threejs.position[direction];

    const overHangSize = Math.abs(delta);

    const size = direction == "x" ? topLayer.width : topLayer.depth;

    const overlap = size - overHangSize;

    if (overlap > 0) {
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
      const overHangShift = overlap / 2 + overHangSize / 2 + Math.sign(delta);
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
  const overHang = generateBox(x, y, z, width, depth, true);
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

function animation() {
  const speed = 0.8;

  const deltaTime = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  const topLayer = stack[stack.length - 1];

  // topLayer.threejs.position[topLayer.direction] += deltaTime * speed * 50;
  // topLayer.cannonjs.position[topLayer.direction] += deltaTime * speed * 50;

  topLayer.threejs.position[topLayer.direction] =
    Math.cos(elapsedTime * speed) * -10;
  topLayer.cannonjs.position[topLayer.direction] =
    Math.cos(elapsedTime * speed) * 1.5;

  // 4 is the initial camera height
  if (camera.position.y < boxHeight * (stack.length - 2) + 15) {
    camera.position.y += elapsedTime * 0.02;
  }

  world.step(1 / 60, deltaTime, 3);
  overhangStack.forEach((element) => {
    element.threejs.position.copy(element.cannonjs.position);
    element.threejs.quaternion.copy(element.cannonjs.quaternion);
  });

  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});

window.addEventListener("dblclick", () => {
  if (!document.fullscreenElement) {
    // canvas.requestFullscreen()
    canvas.webkitRequestFullscreen();
  } else {
    document.exitFullscreen();
  }
});
