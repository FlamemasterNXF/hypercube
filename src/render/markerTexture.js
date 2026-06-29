import * as THREE from 'three';

export function createMarkerTexture(letter, color, backgroundColor, drawArrow) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 128;

    if (backgroundColor) {
        context.fillStyle = backgroundColor;
        context.fillRect(8, 8, 112, 112);
    }

    context.strokeStyle = color;
    context.lineWidth = 8;
    context.strokeRect(8, 8, 112, 112);
    context.fillStyle = color;
    context.font = 'bold 64px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(letter, 64, 70);

    if (drawArrow) {
        context.beginPath();
        context.moveTo(64, 12);
        context.lineTo(52, 28);
        context.lineTo(76, 28);
        context.closePath();
        context.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}