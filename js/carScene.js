import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 500);
export const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
export const carGroup = new THREE.Group();
export const wheels = [];

// ── Smoke & Skid System ──
export const smokeEmitters = [];
export const skidEmitters = [];
export let isSmoking = false;

export function setSmoking(val) {
    isSmoking = val;
}

export function initThreeJS(containerId, onProgress, onComplete) {
    const container = document.getElementById(containerId);
    if (!container) return;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    camera.position.set(0, 1.2, 7.5);
    scene.add(carGroup);

    // Environment & Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xaabbff, 1);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    new RGBELoader().load(
        'https://threejs.org/examples/textures/equirectangular/venice_sunset_1k.hdr',
        (tex) => {
            tex.mapping = THREE.EquirectangularReflectionMapping;
            scene.environment = tex;
        }
    );

    // Dark Purple/Black Road
    const roadGeo = new THREE.PlaneGeometry(200, 400);
    const roadMat = new THREE.MeshStandardMaterial({ 
        color: 0x05010a, // Very dark purple
        roughness: 0.9,
        metalness: 0.1
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = -0.02;
    scene.add(road);

    // Grid (Purple tinted)
    const grid = new THREE.GridHelper(80, 80, 0x442266, 0x221144);
    grid.material.opacity = 0.4;
    grid.material.transparent = true;
    grid.position.y = -0.01;
    scene.add(grid);

    // Stars (Minor stars)
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(1000 * 3);
    for(let i=0; i<3000; i+=3) {
        starPos[i] = (Math.random() - 0.5) * 400;
        starPos[i+1] = Math.random() * 150 + 10; 
        starPos[i+2] = (Math.random() - 0.5) * 400 - 50;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.4, transparent: true, opacity: 0.8 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Subtle Moon
    const moonGeo = new THREE.CircleGeometry(5, 32);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xe0e0ff, transparent: true, opacity: 0.9 });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(-60, 20, -150);
    scene.add(moon);
    
    // Moon glow
    const moonGlowGeo = new THREE.CircleGeometry(9, 32);
    const moonGlowMat = new THREE.MeshBasicMaterial({ color: 0x5e17eb, transparent: true, opacity: 0.15 });
    const moonGlow = new THREE.Mesh(moonGlowGeo, moonGlowMat);
    moonGlow.position.set(-60, 20, -151);
    scene.add(moonGlow);

    // Initialize Smoke Textures
    const sc = document.createElement('canvas'); sc.width = sc.height = 128;
    const sctx = sc.getContext('2d');
    const sg = sctx.createRadialGradient(64,64,0,64,64,64);
    sg.addColorStop(0,'rgba(200,200,220,0.95)'); sg.addColorStop(0.4,'rgba(160,160,180,0.6)'); sg.addColorStop(1,'rgba(0,0,0,0)');
    sctx.fillStyle = sg; sctx.beginPath(); sctx.arc(64,64,64,0,Math.PI*2); sctx.fill();
    const smokeTex = new THREE.CanvasTexture(sc);

    for(let i=0; i<60; i++){
        const mat = new THREE.MeshBasicMaterial({map:smokeTex, transparent:true, opacity:0, depthWrite:false, color:0xccccdd});
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2,2), mat);
        mesh.position.y = -100; 
        scene.add(mesh);
        smokeEmitters.push({mesh, active:false, life:0, vel:new THREE.Vector3()});
    }
    for(let i=0; i<60; i++){
        const mat = new THREE.MeshBasicMaterial({color:0x050011, transparent:true, opacity:0, depthWrite:false});
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.5,0.4), mat);
        mesh.rotation.x = -Math.PI/2; 
        mesh.position.y = -100; 
        scene.add(mesh);
        skidEmitters.push({mesh, active:false, life:0});
    }

    // Load Model
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/gltf/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    let modelDone = false;
    setTimeout(() => {
        if (!modelDone) {
            modelDone = true;
            const fallback = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 2), new THREE.MeshStandardMaterial({color: 0x222222}));
            fallback.position.y = 0.5;
            carGroup.add(fallback);
            if (onComplete) onComplete();
        }
    }, 15000);

    loader.load(
        'https://threejs.org/examples/models/gltf/ferrari.glb',
        (gltf) => {
            if (modelDone) return;
            modelDone = true;
            const car = gltf.scene.children[0];

            const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0x050505, metalness: 0.9, roughness: 0.1, clearcoat: 1.0 });
            const body = car.getObjectByName('body');
            if (body) body.material = bodyMat;

            ['wheel_fl','wheel_fr','wheel_rl','wheel_rr'].forEach(n => {
                const w = car.getObjectByName(n);
                if(w) wheels.push(w);
            });

            const shadowTex = new THREE.TextureLoader().load('https://threejs.org/examples/models/gltf/ferrari_ao.png');
            const shadowMesh = new THREE.Mesh(
                new THREE.PlaneGeometry(0.655 * 4, 1.3 * 4),
                new THREE.MeshBasicMaterial({ map: shadowTex, blending: THREE.MultiplyBlending, transparent: true })
            );
            shadowMesh.rotation.x = -Math.PI / 2;
            shadowMesh.renderOrder = 2;
            car.add(shadowMesh);

            carGroup.add(car);
            if (onComplete) onComplete();
        },
        (xhr) => { if (onProgress) onProgress(xhr); },
        (err) => { console.error('Error loading car:', err); if (!modelDone) { modelDone = true; if (onComplete) onComplete(); } }
    );

    // Animation Loop
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
        const t = clock.getElapsedTime();
        
        // Very subtle floating for the car to feel "alive"
        if (!isSmoking) {
            carGroup.position.y = Math.sin(t * 1.5) * 0.02;
        }

        // Spinning wheels when driving
        if (isSmoking) {
            const spinSpeed = t * 25; // Fast spin
            wheels.forEach(w => { w.rotation.x = spinSpeed; });
        }
        
        // Grid moves faster when driving
        const gridSpeed = isSmoking ? t * 4 : t * 0.5;
        grid.position.z = (-gridSpeed) % 1;

        // Spawn Smoke & Skids
        if (isSmoking) {
            for(let s=0; s<4; s++){
                const e = smokeEmitters.find(x => !x.active);
                if(e){
                    e.active = true; e.life = 1.0;
                    const off = new THREE.Vector3(0, 0, -2.5); // Back of car
                    off.applyEuler(carGroup.rotation);
                    e.mesh.position.copy(carGroup.position).add(off);
                    e.mesh.position.y += 0.1 + Math.random()*0.8;
                    e.mesh.position.x += (Math.random()-0.5)*2.0;
                    e.mesh.position.z += (Math.random()-0.5)*0.5;
                    e.mesh.scale.set(0.4, 0.4, 0.4);
                    e.mesh.material.opacity = 0.85;
                    e.vel.set((Math.random()-0.5)*0.08, Math.random()*0.05 + 0.03, Math.random()*0.12 + 0.06);
                }
            }
            for(let s=0; s<2; s++){
                const sk = skidEmitters.find(x => !x.active);
                if(sk){
                    sk.active = true; sk.life = 1.0;
                    const off = new THREE.Vector3(0, 0, -1.2);
                    off.applyEuler(carGroup.rotation);
                    sk.mesh.position.copy(carGroup.position).add(off);
                    sk.mesh.position.y = 0.02;
                    sk.mesh.rotation.z = carGroup.rotation.y;
                    sk.mesh.material.opacity = 0.95;
                }
            }
        }

        // Update Smoke
        smokeEmitters.forEach(e => {
            if(!e.active) return;
            e.mesh.position.add(e.vel);
            e.mesh.scale.addScalar(0.04);
            e.life -= 0.015;
            e.mesh.material.opacity = e.life * 0.7;
            e.mesh.quaternion.copy(camera.quaternion);
            if(e.life <= 0){ e.active = false; e.mesh.position.y = -100; }
        });

        // Update Skids
        skidEmitters.forEach(e => {
            if(!e.active) return;
            e.life -= 0.005;
            e.mesh.material.opacity = e.life * 0.8;
            if(e.life <= 0){ e.active = false; e.mesh.position.y = -100; }
        });

        renderer.render(scene, camera);
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}
