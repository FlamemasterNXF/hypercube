import * as THREE from 'three';

export function createInstancedMesh(geometry, material, capacity) {
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);

    mesh.count = 0;
    mesh.frustumCulled = false;
    return mesh;
}

export function addInstancedMesh(group, meshes, capacities, key, mesh, capacity) {
    capacities[key] = capacity;
    meshes[key] = mesh;
    group.add(mesh);
}

export function growInstancedMesh(group, meshes, capacities, key, createMesh, matrix) {
    const oldMesh = meshes[key];
    const capacity = capacities[key] * 2;
    const mesh = createMesh(capacity);

    copyInstanceMatrices(oldMesh, mesh, matrix);
    mesh.count = oldMesh.count;
    group.remove(oldMesh);
    group.add(mesh);
    disposeInstancedMesh(oldMesh);
    meshes[key] = mesh;
    capacities[key] = capacity;
}

export function copyInstanceMatrices(source, target, matrix) {
    for (let i = 0; i < source.count; i++) {
        source.getMatrixAt(i, matrix);
        target.setMatrixAt(i, matrix);
    }
}

export function disposeInstancedMesh(mesh) {
    mesh.geometry.dispose();

    if (Array.isArray(mesh.material)) for (const material of mesh.material) disposeMaterial(material);
    else disposeMaterial(mesh.material);
}

function disposeMaterial(material) {
    if (material.map) material.map.dispose();
    material.dispose();
}