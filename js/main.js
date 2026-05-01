/* global gsap, ScrollTrigger */
import { scene, camera, carGroup, renderer, initThreeJS, setSmoking } from './carScene.js';

// Audio Context variables
let audioCtx = null;
let engSrc = null;
let engGain = null;
let engPlaying = false;
const engineEl = document.getElementById('engine-audio');

function unlockAudio() {
    if(!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            engSrc = audioCtx.createMediaElementSource(engineEl);
            engGain = audioCtx.createGain(); 
            engGain.gain.value = 0;
            engSrc.connect(engGain); 
            engGain.connect(audioCtx.destination);
        } catch(e) { return; }
    }
    if(audioCtx.state === 'suspended') audioCtx.resume();
    // Play and immediately pause to unlock the audio element on mobile/desktop
    engineEl.play().then(() => {
        engineEl.pause();
    }).catch(()=>{});
    
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
}

// Listen for the first user interaction anywhere on the page
document.addEventListener('click', unlockAudio);
document.addEventListener('touchstart', unlockAudio);

function startEngine() {
    if(engPlaying) return; 
    if(!audioCtx) unlockAudio(); // Try unlocking if they didn't click yet
    if(!audioCtx) return;
    if(audioCtx.state === 'suspended') audioCtx.resume();
    engineEl.playbackRate = 0.5; 
    engineEl.play().catch(()=>{});
    engGain.gain.cancelScheduledValues(audioCtx.currentTime);
    engGain.gain.setValueAtTime(0, audioCtx.currentTime);
    engGain.gain.linearRampToValueAtTime(0.9, audioCtx.currentTime + 1.0);
    // Speed up pitch
    gsap.to(engineEl, { playbackRate: 2.5, duration: 2.0, ease: 'power3.in' });
    engPlaying = true;
}

function stopEngine() {
    if(!engPlaying || !audioCtx) return;
    engGain.gain.cancelScheduledValues(audioCtx.currentTime);
    engGain.gain.setValueAtTime(engGain.gain.value, audioCtx.currentTime);
    engGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.0);
    setTimeout(() => { engineEl.pause(); engPlaying = false; }, 1100);
}

// Wait for DOM
document.addEventListener('DOMContentLoaded', () => {
    gsap.registerPlugin(ScrollTrigger);

    const loaderEl = document.getElementById('loader');
    const loadPctEl = document.getElementById('load-pct');

    // Initialize 3D Scene
    initThreeJS(
        'canvas-container',
        (xhr) => {
            if (xhr.total) {
                const pct = Math.min(100, Math.round((xhr.loaded / xhr.total) * 100));
                loadPctEl.innerText = `LOADING ${pct}%`;
            }
        },
        () => {
            loaderEl.style.opacity = '0';
            setTimeout(() => {
                loaderEl.style.display = 'none';
                initGSAPAnimations();
            }, 800);
        }
    );
});

function initGSAPAnimations() {
    gsap.set(carGroup.position, { x: 1.2, y: 0, z: 0 });
    gsap.set(carGroup.rotation, { y: Math.PI / 8 });
    camera.position.set(0, 1.2, 7.5);
    camera.lookAt(0, 0.4, 0);

    gsap.fromTo('.hero-content .fade-in', 
        { opacity: 0, y: 30 }, 
        { opacity: 1, y: 0, duration: 1.5, ease: 'power3.out' }
    );

    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: '.content',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1.5, 
        }
    });

    // ── Hero (0) to Section 2 (0.25) ──
    tl.to(camera.position, { z: 5.0, ease: 'power1.inOut' }, 0)
      .to(carGroup.position, { x: -2.5, ease: 'power1.inOut' }, 0)
      .to(carGroup.rotation, { y: Math.PI / 6, ease: 'power1.inOut' }, 0);

    // ── Section 2 (0.25) to Section 3 (0.50) ──
    tl.to(carGroup.position, { x: 2.5, ease: 'power1.inOut' }, 0.25)
      .to(carGroup.rotation, { y: -Math.PI / 6, ease: 'power1.inOut' }, 0.25);

    // ── Section 3 (0.50) to Section 4 (0.75) ──
    tl.to(carGroup.position, { x: 0, ease: 'power1.inOut' }, 0.50)
      .to(carGroup.rotation, { y: 0, ease: 'power1.inOut' }, 0.50)
      .to(camera.position, { z: 6.5, y: 1.5, ease: 'power1.inOut' }, 0.50);

    // ── Section 4 (0.75) to Section 5 Footer (1.0) ──
    tl.to(carGroup.position, { z: -150, y: -1.0, ease: 'power4.in' }, 0.75)
      .to(carGroup.rotation, { y: 0, ease: 'none' }, 0.75)
      .to(camera.position, { z: 8.0, y: 2.0, ease: 'power1.inOut' }, 0.75);

    tl.eventCallback('onUpdate', () => {
        camera.lookAt(0, 0.4, 0);
    });

    // Trigger Smoke and Audio when reaching Footer
    ScrollTrigger.create({
        trigger: '#sec5',
        start: 'top 60%',
        onEnter: () => {
            setSmoking(true);
            startEngine();
        },
        onLeaveBack: () => {
            setSmoking(false);
            stopEngine();
        }
    });

    gsap.utils.toArray('.text-block').forEach((el) => {
        gsap.fromTo(el,
            { opacity: 0, y: 50 },
            { 
                opacity: 1, 
                y: 0, 
                duration: 1, 
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: el,
                    start: 'top 80%',
                    toggleActions: 'play reverse play reverse'
                }
            }
        );
    });
}