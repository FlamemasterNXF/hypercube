import * as THREE from 'three';
import {gameCanvas} from '../ui/elements.js';

export const renderer = new THREE.WebGLRenderer({
    canvas: gameCanvas,
    antialias: true,
    powerPreference: 'high-performance'
});

export function resizeRenderer(camera) {
    const width = gameCanvas.clientWidth;
    const height = gameCanvas.clientHeight;
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    const renderWidth = Math.round(width * pixelRatio);
    const renderHeight = Math.round(height * pixelRatio);

    if (gameCanvas.width === renderWidth && gameCanvas.height === renderHeight) return;

    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}