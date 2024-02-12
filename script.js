import * as THREE from "three";

const canvas = document.querySelector('#canvas')
let camera, scene , renderer 

const originalBoxSize = 4
const boxHeight = 1
let gameStarted = false
let stack = [] 

init()

function init () {
    scene = new THREE.Scene() 

    //Foundation
    addLayer(0, 0, originalBoxSize, originalBoxSize) 

    //First Layer 
    addLayer(-10, 0, originalBoxSize, originalBoxSize, 'x')

    //Set-up Lights 
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6) 
    scene.add(ambientLight) 

    const directionalLight = new THREE.DirectionalLight(0xffffff , 0.6)
    scene.add(directionalLight)


    //Camera 
    const height = 25 
    const aspect = window.innerWidth / window.innerHeight;
    const width = height * (window.innerWidth /window.innerHeight) 
    camera = new THREE.OrthographicCamera(
        width / -2 ,
        width / 2 ,
        height/2 ,
        height/-2, 
        1, 100
    )

    camera.position.set(15, 15, 15)
    camera.lookAt(0, 0, 0)

    //Renderer 
    renderer = new THREE.WebGLRenderer({canvas : canvas, antialias : true})

    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)

    renderer.render(scene, camera)

    // document.body.appendChild(renderer.domElement)
}


function addLayer (x,  z, width, depth, direction) {
    const y = boxHeight + stack.length // Add the box one layer higher

    const layer = generateBox(x, y, z, width, depth) 
    layer.direction = direction

    // console.log(layer);

    stack.push(layer)
}


function generateBox (x, y, z , width, depth) {
    const geometry = new THREE.BoxGeometry(width, boxHeight, depth)

    const color = new THREE.Color(`hsl(${30 + stack.length * 4}, 100% , 50% )`)
    const material = new THREE.MeshStandardMaterial({color})


    const mesh = new THREE.Mesh(geometry , material)
    mesh.position.set(x, y, z)
    scene.add(mesh)

    return {
        threejs : mesh, 
        width : width, 
        depth: depth
    }
}

function startGame () {
    if(!gameStarted) {
        renderer.setAnimationLoop(animation)
        gameStarted = true
    } else {    
        const topLayer = stack[stack.length - 1]
        const direction = topLayer.direction

        //Next Layer 
        const nextX = direction === 'x' ? 0 : -10
        const nextZ = direction === 'z' ? 0 : - 10 
        const newWidth = originalBoxSize 
        const newDepth = originalBoxSize 
        const nextDirection = direction === 'x' ? 'z' : 'x'

        addLayer(nextX, nextZ, newWidth, newDepth, nextDirection)
    }
}

window.addEventListener('click' , startGame)
window.addEventListener('keydown' , (e) => {
    if(e.key === ' '){
        startGame()
    }
})

window.addEventListener('keydown', (event) => {
    if (event.key === 'r') {
        location.reload();
    }
});



function animation () {
    const speed = 0.15 

    const topLayer = stack[stack.length - 1] 
    topLayer.threejs.position[topLayer.direction] += speed 


    // 4 is the initial camera height 
    if(camera.position.y < boxHeight * (stack.length - 2) + 16) {
        camera.position.y += speed  
    }

    renderer.render(scene, camera)
}


window.addEventListener('resize' , () => {
     const width = window.innerWidth 
     const height = window.innerHeight 

    camera.updateProjectionMatrix()
    renderer.setSize(width , height)
})

window.addEventListener('dblclick' , () => {
    if(!document.fullscreenElement) {
        // canvas.requestFullscreen()
        canvas.webkitRequestFullscreen()
    } else {
        document.exitFullscreen()
    }
})