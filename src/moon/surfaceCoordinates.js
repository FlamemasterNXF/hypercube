import * as THREE from 'three';

export function normalToCubeCell(normal, resolution) {
  const absoluteX = Math.abs(normal.x);
  const absoluteY = Math.abs(normal.y);
  const absoluteZ = Math.abs(normal.z);
  let face;
  let u;
  let v;

  if (absoluteX >= absoluteY && absoluteX >= absoluteZ) {
    face = normal.x >= 0 ? '+X' : '-X';
    u = normal.x >= 0 ? -normal.z / absoluteX : normal.z / absoluteX;
    v = normal.y / absoluteX;
  } else if (absoluteY >= absoluteZ) {
    face = normal.y >= 0 ? '+Y' : '-Y';
    u = normal.x / absoluteY;
    v = normal.y >= 0 ? -normal.z / absoluteY : normal.z / absoluteY;
  } else {
    face = normal.z >= 0 ? '+Z' : '-Z';
    u = normal.z >= 0 ? normal.x / absoluteZ : -normal.x / absoluteZ;
    v = normal.y / absoluteZ;
  }

  return {
    face,
    x: coordinateToCell(u, resolution),
    y: coordinateToCell(v, resolution),
  };
}

export function cubeCellToNormal(face, x, y, resolution) {
  const u = cellToCoordinate(x, resolution);
  const v = cellToCoordinate(y, resolution);
  const normal = new THREE.Vector3();

  if (face === '+X') normal.set(1, v, -u);
  if (face === '-X') normal.set(-1, v, u);
  if (face === '+Y') normal.set(u, 1, -v);
  if (face === '-Y') normal.set(u, -1, v);
  if (face === '+Z') normal.set(u, v, 1);
  if (face === '-Z') normal.set(-u, v, -1);

  return normal.normalize();
}

function coordinateToCell(coordinate, resolution) {
  const cell = Math.floor((coordinate + 1) * 0.5 * resolution);
  return THREE.MathUtils.clamp(cell, 0, resolution - 1);
}

function cellToCoordinate(cell, resolution) {
  return ((cell + 0.5) / resolution) * 2 - 1;
}