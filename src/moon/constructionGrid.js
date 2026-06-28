import * as THREE from 'three';
import {MOON_RADIUS} from './moon.js';
import {EQUATOR_LONGITUDE_CELLS, LATITUDE_CELLS, LONGITUDE_CELL_COUNTS} from './sphericalCoordinates.js';

const GRID_RADIUS = MOON_RADIUS + 0.004;
const GRID_COLOR = '#7F93A2';

const geometry = new THREE.SphereGeometry(GRID_RADIUS, 96, 48);
const material = new THREE.ShaderMaterial({
    defines: {
        LONGITUDE_ZONE_COUNT: LONGITUDE_CELL_COUNTS.length
    },
    uniforms: {
        gridColor: {value: new THREE.Color(GRID_COLOR)},
        latitudeCells: {value: LATITUDE_CELLS},
        equatorLongitudeCells: {value: EQUATOR_LONGITUDE_CELLS},
        longitudeCellCounts: {value: LONGITUDE_CELL_COUNTS}
    },
    vertexShader: `
      varying vec3 surfaceNormal;
  
      void main() {
        surfaceNormal = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 gridColor;
      uniform float latitudeCells;
      uniform float equatorLongitudeCells;
      uniform float longitudeCellCounts[LONGITUDE_ZONE_COUNT];
      varying vec3 surfaceNormal;
  
      const float PI = 3.141592653589793;
  
      float gridLine(float coordinate) {
        float edgeDistance = min(fract(coordinate), 1.0 - fract(coordinate));
        float lineWidth = fwidth(coordinate);
        return 1.0 - smoothstep(0.0, lineWidth, edgeDistance);
      }
  
      float getLongitudeCells(float latitudeRow) {
        float latitudeCenter =-PI * 0.5 + ((latitudeRow + 0.5) / latitudeCells) * PI;
        float idealCellCount = max(cos(latitudeCenter) * equatorLongitudeCells, longitudeCellCounts[LONGITUDE_ZONE_COUNT - 1]);
        float closestCellCount = longitudeCellCounts[0];
        float closestDistance = abs(idealCellCount - closestCellCount);
  
        for (int i = 1; i < LONGITUDE_ZONE_COUNT; i += 1) {
          float cellCount = longitudeCellCounts[i];
          float distance = abs(idealCellCount - cellCount);
  
          if (distance < closestDistance) {
            closestCellCount = cellCount;
            closestDistance = distance;
          }
        }
  
        return closestCellCount;
      }
  
      void main() {
        vec3 normal = normalize(surfaceNormal);
        
        float latitude = asin(clamp(normal.y, -1.0, 1.0));
        float latitudeCoordinate = ((latitude + PI * 0.5) / PI) * latitudeCells;
        float latitudeRow = clamp(floor(latitudeCoordinate), 0.0, latitudeCells - 1.0);
        
        float longitudeCells = getLongitudeCells(latitudeRow);
        float longitude = atan(normal.x, normal.z);
        float longitudeCoordinate = ((longitude + PI) / (PI * 2.0)) * longitudeCells;
        
        float line = max(gridLine(latitudeCoordinate), gridLine(longitudeCoordinate));
  
        if (line < 0.01) discard;
        gl_FragColor = vec4(gridColor, line * 0.45);
      }
    `,
    transparent: true,
    depthWrite: false
});

export const constructionGrid = new THREE.Mesh(geometry, material);

constructionGrid.visible = false;