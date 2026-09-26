import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BiogeochemicalState, CameraPreset, SensorNode } from '../types/telemetry';

interface ThreeDioramaProps {
  state: BiogeochemicalState;
  sensorNodes: SensorNode[];
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
  cameraPreset: CameraPreset;
  onSelectHotspot?: (hotspotKey: string) => void;
  showAnnotations: boolean;
}

export const ThreeDiorama: React.FC<ThreeDioramaProps> = ({
  state,
  sensorNodes,
  selectedNodeId,
  onSelectNode,
  cameraPreset,
  onSelectHotspot,
  showAnnotations,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const targetCamPos = useRef<THREE.Vector3>(new THREE.Vector3(38, 32, 48));
  const targetLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [hoveredHotspot, setHoveredHotspot] = useState<string | null>(null);

  // References to animated elements
  const turbineBladesRef = useRef<THREE.Group[]>([]);
  const waveBuoysRef = useRef<THREE.Mesh[]>([]);
  const tidalRotorsRef = useRef<THREE.Group[]>([]);
  const plumeParticlesRef = useRef<THREE.Points | null>(null);
  const plumeParticlePosRef = useRef<Float32Array | null>(null);
  const waterMeshRef = useRef<THREE.Mesh | null>(null);
  const sluiceGatesRef = useRef<THREE.Mesh[]>([]);
  const beaconRingsRef = useRef<THREE.Mesh[]>([]);

  // Camera preset positions
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;

    if (cameraPreset === 'isometric') {
      targetCamPos.current.set(36, 32, 46);
      targetLookAt.current.set(0, 2, 0);
    } else if (cameraPreset === 'plume') {
      targetCamPos.current.set(-2, 16, 26);
      targetLookAt.current.set(-6, 2, 6);
    } else if (cameraPreset === 'biotest') {
      targetCamPos.current.set(-18, 12, 10);
      targetLookAt.current.set(-14, 2, -2);
    } else if (cameraPreset === 'renewables') {
      targetCamPos.current.set(24, 22, 28);
      targetLookAt.current.set(16, 6, 8);
    } else if (cameraPreset === 'sluice') {
      targetCamPos.current.set(30, 16, -2);
      targetLookAt.current.set(18, 2, -10);
    }
  }, [cameraPreset]);

  // Node selection camera focus
  useEffect(() => {
    const node = sensorNodes.find(n => n.id === selectedNodeId);
    if (node) {
      targetCamPos.current.set(
        node.coordinates[0] + 14,
        node.coordinates[1] + 16,
        node.coordinates[2] + 18
      );
      targetLookAt.current.set(
        node.coordinates[0],
        node.coordinates[1],
        node.coordinates[2]
      );
    }
  }, [selectedNodeId, sensorNodes]);

  // Main Three.js scene setup
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Atmosphere
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060c18);
    scene.fog = new THREE.FogExp2(0x060c18, 0.012);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 1000);
    camera.position.copy(targetCamPos.current);
    camera.lookAt(targetLookAt.current);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.05; // Prevent camera going below ground plane
    controls.minDistance = 15;
    controls.maxDistance = 120;
    controls.target.copy(targetLookAt.current);
    controlsRef.current = controls;

    // 5. Studio & Atmospheric Lighting
    const ambientLight = new THREE.AmbientLight(0x0d213f, 1.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xe4f6ff, 2.2);
    sunLight.position.set(45, 65, 35);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 160;
    sunLight.shadow.camera.left = -45;
    sunLight.shadow.camera.right = 45;
    sunLight.shadow.camera.top = 45;
    sunLight.shadow.camera.bottom = -45;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Rim / Plume accent light
    const plumeLight = new THREE.PointLight(0x00ffaa, 3.5, 35);
    plumeLight.position.set(-8, 3, 4);
    scene.add(plumeLight);

    // Facility warm light
    const facilityLight = new THREE.PointLight(0x00d2ff, 2.5, 30);
    facilityLight.position.set(-16, 8, -12);
    scene.add(facilityLight);

    // 6. Diorama Ground Slab & Ocean Cutaway
    const dioramaGroup = new THREE.Group();
    scene.add(dioramaGroup);

    // Deep seabed block (obsidian cross section pedestal)
    const baseGeo = new THREE.BoxGeometry(72, 10, 60);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x07111e,
      roughness: 0.9,
      metalness: 0.2,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.set(0, -5, 0);
    baseMesh.receiveShadow = true;
    dioramaGroup.add(baseMesh);

    // Land terrain (North-West quadrant: coastal campus and grassy cliff)
    const landGeo = new THREE.BoxGeometry(34, 5.2, 42);
    const landMat = new THREE.MeshStandardMaterial({
      color: 0x1b2f38,
      roughness: 0.85,
      metalness: 0.1,
    });
    const landMesh = new THREE.Mesh(landGeo, landMat);
    landMesh.position.set(-19, 2.6, -9);
    landMesh.receiveShadow = true;
    landMesh.castShadow = true;
    dioramaGroup.add(landMesh);

    // Sandy Shoreline / Beach transition strip
    const beachGeo = new THREE.BoxGeometry(6, 2.2, 42);
    const beachMat = new THREE.MeshStandardMaterial({
      color: 0xb49a78,
      roughness: 0.95,
      metalness: 0.05,
    });
    const beachMesh = new THREE.Mesh(beachGeo, beachMat);
    beachMesh.position.set(0.5, 1.1, -9);
    beachMesh.receiveShadow = true;
    dioramaGroup.add(beachMesh);

    // Facility Campus Pavement (dock platform & lab plazas)
    const plazaGeo = new THREE.BoxGeometry(28, 0.4, 24);
    const plazaMat = new THREE.MeshStandardMaterial({
      color: 0x22354c,
      roughness: 0.4,
      metalness: 0.5,
    });
    const plazaMesh = new THREE.Mesh(plazaGeo, plazaMat);
    plazaMesh.position.set(-18, 5.4, -6);
    plazaMesh.receiveShadow = true;
    dioramaGroup.add(plazaMesh);

    // Concrete pier / dock projecting into coastal water
    const pierGeo = new THREE.BoxGeometry(16, 1.2, 7);
    const pierMat = new THREE.MeshStandardMaterial({
      color: 0x2d4360,
      roughness: 0.5,
      metalness: 0.4,
    });
    const pierMesh = new THREE.Mesh(pierGeo, pierMat);
    pierMesh.position.set(-7, 2.4, 2);
    pierMesh.receiveShadow = true;
    pierMesh.castShadow = true;
    dioramaGroup.add(pierMesh);

    // 7. Research Facility Complex (Modular Lab buildings, Solar Roofs, Silos)
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0xd6e5f5,
      roughness: 0.3,
      metalness: 0.7,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x00d2ff,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x003355,
      emissiveIntensity: 0.6,
    });
    const solarMat = new THREE.MeshStandardMaterial({
      color: 0x0a1c38,
      roughness: 0.2,
      metalness: 0.8,
    });

    const createLabBuilding = (x: number, y: number, z: number, w: number, h: number, d: number) => {
      const bGroup = new THREE.Group();
      bGroup.position.set(x, y, z);

      // Main frame
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), buildingMat);
      frame.castShadow = true;
      frame.receiveShadow = true;
      bGroup.add(frame);

      // Glass windows band
      const windowBand = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, h * 0.45, d + 0.1), glassMat);
      windowBand.position.y = 0;
      bGroup.add(windowBand);

      // Solar rooftop panel
      const solarPanel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.2, d * 0.85), solarMat);
      solarPanel.position.y = h / 2 + 0.1;
      bGroup.add(solarPanel);

      dioramaGroup.add(bGroup);
    };

    createLabBuilding(-25, 8.5, -14, 8, 6, 9);
    createLabBuilding(-16, 9, -15, 8, 7, 7);
    createLabBuilding(-23, 8, -5, 9, 5, 8);
    createLabBuilding(-13, 8.5, -6, 7, 6, 7);

    // Alkalinity Silos (Storage of slaked lime / olivine / NaOH buffers)
    const siloMat = new THREE.MeshStandardMaterial({
      color: 0x9fbcdb,
      metalness: 0.85,
      roughness: 0.25,
    });
    const createSilo = (x: number, z: number, r: number, h: number) => {
      const silo = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), siloMat);
      silo.position.set(x, 5.4 + h / 2, z);
      silo.castShadow = true;
      dioramaGroup.add(silo);

      // Top dome cap
      const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), siloMat);
      dome.position.set(x, 5.4 + h, z);
      dioramaGroup.add(dome);
    };
    createSilo(-9, -12, 1.8, 6);
    createSilo(-5, -12, 1.6, 5);
    createSilo(-7, -8, 1.7, 5.5);

    // Moored Autonomous Surface Drone / Research Boat at the Pier
    const boatGroup = new THREE.Group();
    boatGroup.position.set(-6, 2.2, 7.5);
    const boatHull = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 1.2, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x00d2ff, roughness: 0.3, metalness: 0.6 })
    );
    boatHull.castShadow = true;
    boatGroup.add(boatHull);
    const boatCabin = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.1, 1.8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.8 })
    );
    boatCabin.position.set(0.6, 1.0, 0);
    boatGroup.add(boatCabin);
    dioramaGroup.add(boatGroup);

    // 8. Automated Marine Micro-Aquarium Testing Pod (BIOTEST POD)
    const podGroup = new THREE.Group();
    podGroup.position.set(-14, 2.6, 3.8);

    // Pod floating foundation / mooring ring
    const podBase = new THREE.Mesh(
      new THREE.CylinderGeometry(4.2, 4.4, 1.4, 32),
      new THREE.MeshStandardMaterial({ color: 0x1f344d, metalness: 0.7, roughness: 0.3 })
    );
    podBase.castShadow = true;
    podGroup.add(podBase);

    // Futuristic domed testing pod cabin (White composite)
    const podCabin = new THREE.Mesh(
      new THREE.SphereGeometry(3.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xeef5fc, roughness: 0.25, metalness: 0.8 })
    );
    podCabin.position.y = 0.7;
    podCabin.scale.set(1.1, 0.75, 1.1);
    podGroup.add(podCabin);

    // Panoramic 360 observation glass with glowing aquatic interior
    const podGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(3.8, 3.8, 1.2, 32, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0x00ffcc,
        roughness: 0.05,
        metalness: 0.9,
        transparent: true,
        opacity: 0.85,
        emissive: 0x00ffcc,
        emissiveIntensity: 0.45,
      })
    );
    podGlass.position.y = 1.2;
    podGroup.add(podGlass);

    // Pod Antenna & Status Beacon
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 })
    );
    mast.position.set(0, 3.6, 0);
    podGroup.add(mast);

    const podBeacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0x00ffaa,
        emissive: 0x00ffaa,
        emissiveIntensity: 2.0,
      })
    );
    podBeacon.position.set(0, 5.2, 0);
    podGroup.add(podBeacon);

    // Pontoon gangway connecting Pod to main pier
    const gangway = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 0.3, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 })
    );
    gangway.position.set(3.8, 0.6, -1.0);
    gangway.rotation.y = -0.3;
    podGroup.add(gangway);

    dioramaGroup.add(podGroup);

    // 9. Dutch Geo-Shielding Coastal Barrier & Sluice Gates (RECLAMATION SITE)
    const sluiceGroup = new THREE.Group();
    sluiceGroup.position.set(20, 0, -10);

    // Sloped Sea Dike / Riprap Breakwater
    const dikeGeo = new THREE.BoxGeometry(22, 4.8, 14);
    const dikeMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.9,
      metalness: 0.15,
    });
    const dikeMesh = new THREE.Mesh(dikeGeo, dikeMat);
    dikeMesh.position.set(0, 2.4, 0);
    dikeMesh.castShadow = true;
    dikeMesh.receiveShadow = true;
    sluiceGroup.add(dikeMesh);

    // Sluice Gate Piers & Hydraulic Water Channels
    const pierBlocks: THREE.Mesh[] = [];
    const gateBlades: THREE.Mesh[] = [];
    const gatePiersMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4, metalness: 0.6 });
    const gateBladeMat = new THREE.MeshStandardMaterial({
      color: 0x00d2ff,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x002244,
    });

    for (let i = -2; i <= 2; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.6, 6.5, 12), gatePiersMat);
      p.position.set(i * 3.8, 3.25, 0);
      p.castShadow = true;
      sluiceGroup.add(p);
      pierBlocks.push(p);

      if (i < 2) {
        // Vertical steel sluice gate blade
        const gate = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.8, 0.6), gateBladeMat);
        gate.position.set(i * 3.8 + 1.9, 2.6, 0);
        sluiceGroup.add(gate);
        gateBlades.push(gate);
      }
    }
    sluiceGatesRef.current = gateBlades;

    // Roadway / Crest bridge across the sluice gates
    const crestBridge = new THREE.Mesh(
      new THREE.BoxGeometry(20, 0.6, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
    );
    crestBridge.position.set(0, 6.8, 0);
    crestBridge.castShadow = true;
    sluiceGroup.add(crestBridge);

    dioramaGroup.add(sluiceGroup);

    // 10. Heavy-Engineering Ocean Renewable Energy Cluster (Offshore Wind + Wave + Tidal)
    const turbineBladesList: THREE.Group[] = [];
    const waveBuoysList: THREE.Mesh[] = [];
    const tidalRotorsList: THREE.Group[] = [];

    const createWindTurbine = (x: number, z: number, scale = 1.0) => {
      const wtGroup = new THREE.Group();
      wtGroup.position.set(x, 1.8, z);
      wtGroup.scale.setScalar(scale);

      // Yellow floating jacket foundation
      const foundation = new THREE.Mesh(
        new THREE.CylinderGeometry(1.4, 2.0, 3.5, 8),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4, metalness: 0.5 })
      );
      foundation.position.y = -0.5;
      wtGroup.add(foundation);

      // Steel tower (white)
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.7, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.4 })
      );
      tower.position.y = 8;
      tower.castShadow = true;
      wtGroup.add(tower);

      // Nacelle
      const nacelle = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 1.1, 2.8),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.5 })
      );
      nacelle.position.set(0, 16, 0.4);
      nacelle.castShadow = true;
      wtGroup.add(nacelle);

      // Red aviation warning beacon on nacelle
      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xff0044, emissive: 0xff0044, emissiveIntensity: 2.5 })
      );
      beacon.position.set(0, 16.8, 0);
      wtGroup.add(beacon);

      // Rotor Hub & 3 Aerodynamic Blades
      const rotorGroup = new THREE.Group();
      rotorGroup.position.set(0, 16, 1.9);

      const hub = new THREE.Mesh(
        new THREE.SphereGeometry(0.65, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
      );
      rotorGroup.add(hub);

      for (let b = 0; b < 3; b++) {
        const bladeArm = new THREE.Group();
        bladeArm.rotation.z = (b * Math.PI * 2) / 3;

        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 8.5, 0.12),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
        );
        blade.position.y = 4.2;
        blade.castShadow = true;
        bladeArm.add(blade);

        // Orange blade tip
        const tip = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 1.2, 0.14),
          new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 })
        );
        tip.position.y = 8.0;
        bladeArm.add(tip);

        rotorGroup.add(bladeArm);
      }

      wtGroup.add(rotorGroup);
      dioramaGroup.add(wtGroup);
      turbineBladesList.push(rotorGroup);
    };

    // Place offshore wind turbines in arc cluster
    createWindTurbine(16, 12, 1.05);
    createWindTurbine(26, 8, 1.15);
    createWindTurbine(22, 22, 0.95);
    turbineBladesRef.current = turbineBladesList;

    // Wave energy converter (WEC) oscillating buoys
    const wecMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.25,
      metalness: 0.7,
      emissive: 0x0284c7,
      emissiveIntensity: 0.3,
    });
    const wecPositions: [number, number][] = [
      [10, 16],
      [14, 18],
      [8, 22],
      [12, 24],
    ];
    wecPositions.forEach(([bx, bz]) => {
      const buoy = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 2.2, 16), wecMat);
      buoy.position.set(bx, 1.4, bz);
      buoy.castShadow = true;
      dioramaGroup.add(buoy);
      waveBuoysList.push(buoy);
    });
    waveBuoysRef.current = waveBuoysList;

    // Submerged tidal stream turbines (underwater)
    const tidalBaseMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
    const tidalBladeMat = new THREE.MeshStandardMaterial({ color: 0x00ffaa, emissive: 0x004422 });
    const createTidalTurbine = (x: number, z: number) => {
      const tg = new THREE.Group();
      tg.position.set(x, -1.8, z);

      const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 3.2), tidalBaseMat);
      tg.add(pylon);

      const rotor = new THREE.Group();
      rotor.position.set(0, 1.2, 0.4);
      for (let i = 0; i < 3; i++) {
        const bl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.6, 0.08), tidalBladeMat);
        bl.rotation.z = (i * Math.PI * 2) / 3;
        bl.position.y = 1.3 * Math.cos(bl.rotation.z);
        bl.position.x = -1.3 * Math.sin(bl.rotation.z);
        rotor.add(bl);
      }
      tg.add(rotor);
      dioramaGroup.add(tg);
      tidalRotorsList.push(rotor);
    };
    createTidalTurbine(-2, 18);
    createTidalTurbine(4, 22);
    tidalRotorsRef.current = tidalRotorsList;

    // 11. Ocean Water Mesh (Translucent, Reflective, Waves)
    const waterGeo = new THREE.PlaneGeometry(68, 56, 48, 48);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0a3c5a,
      roughness: 0.15,
      metalness: 0.8,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(4, 1.8, 2);
    waterMesh.receiveShadow = true;
    dioramaGroup.add(waterMesh);
    waterMeshRef.current = waterMesh;

    // 12. Ocean Alkaline Dispersal Plume Vector Particles (Curving stream vectors)
    const particleCount = 750;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    // Initial particle seeds along the plume curve from facility dock outfall (-7, 1.5, 2) sweeping to (18, 1.2, 18)
    for (let i = 0; i < particleCount; i++) {
      const t = Math.random();
      // Curved parametric path
      const px = -7 + t * 24 + Math.sin(t * Math.PI * 2) * 4 + (Math.random() - 0.5) * 3;
      const py = 1.3 - t * 0.4 + (Math.random() - 0.5) * 0.6;
      const pz = 2 + t * 18 + Math.cos(t * Math.PI * 1.5) * 5 + (Math.random() - 0.5) * 3;

      particlePositions[i * 3] = px;
      particlePositions[i * 3 + 1] = py;
      particlePositions[i * 3 + 2] = pz;

      // Electric cyan / emerald bioluminescent gradient
      particleColors[i * 3] = 0.0;
      particleColors[i * 3 + 1] = 0.85 + Math.random() * 0.15;
      particleColors[i * 3 + 2] = 0.95;
    }

    const plumeGeo = new THREE.BufferGeometry();
    plumeGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    plumeGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    // Custom circle particle texture
    const createParticleTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.3, 'rgba(0,255,200,0.8)');
        gradient.addColorStop(0.7, 'rgba(0,210,255,0.3)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
      }
      return new THREE.CanvasTexture(canvas);
    };

    const plumeMat = new THREE.PointsMaterial({
      size: 1.1,
      vertexColors: true,
      map: createParticleTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const plumePoints = new THREE.Points(plumeGeo, plumeMat);
    dioramaGroup.add(plumePoints);
    plumeParticlesRef.current = plumePoints;
    plumeParticlePosRef.current = particlePositions;

    // 13. Sensor Node Markers & Radar Beacons in 3D
    const beaconRingsList: THREE.Mesh[] = [];
    sensorNodes.forEach(node => {
      const [nx, ny, nz] = node.coordinates;
      const markerGroup = new THREE.Group();
      markerGroup.position.set(nx, ny + 1.2, nz);

      // Core LED Sphere
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 16, 16),
        new THREE.MeshStandardMaterial({
          color: 0x00d2ff,
          emissive: 0x00d2ff,
          emissiveIntensity: 2.2,
        })
      );
      markerGroup.add(sphere);

      // Pulsing radar ping ring
      const ringGeo = new THREE.RingGeometry(0.7, 0.9, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00ffaa,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      markerGroup.add(ringMesh);
      beaconRingsList.push(ringMesh);

      // Thin anchor tether line
      const tether = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 4),
        new THREE.MeshBasicMaterial({ color: 0x00d2ff, transparent: true, opacity: 0.4 })
      );
      tether.position.y = -2;
      markerGroup.add(tether);

      dioramaGroup.add(markerGroup);
    });
    beaconRingsRef.current = beaconRingsList;

    // 14. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Smooth camera interpolation toward target
      if (cameraRef.current && controlsRef.current) {
        cameraRef.current.position.lerp(targetCamPos.current, 0.04);
        controlsRef.current.target.lerp(targetLookAt.current, 0.04);
        controlsRef.current.update();
      }

      // Rotate offshore wind turbine blades
      const windSpeedMult = 1.4 + (state.windPower / 30);
      turbineBladesRef.current.forEach((rotor, idx) => {
        rotor.rotation.z += (windSpeedMult + idx * 0.15) * delta;
      });

      // Rotate tidal turbines
      tidalRotorsRef.current.forEach(rotor => {
        rotor.rotation.z -= 1.8 * delta;
      });

      // Bob wave energy converter buoys with ocean swells
      waveBuoysRef.current.forEach((buoy, idx) => {
        buoy.position.y = 1.4 + Math.sin(elapsedTime * 2.2 + idx * 1.5) * 0.35;
        buoy.rotation.z = Math.cos(elapsedTime * 1.8 + idx) * 0.08;
      });

      // Animate Plume particle vectors
      if (plumeParticlesRef.current && plumeParticlePosRef.current) {
        const positions = plumeParticlePosRef.current;
        const count = positions.length / 3;
        const flowVelocity = 0.08 + (state.dosingRateKgHr / 500) * 0.12;

        for (let i = 0; i < count; i++) {
          const idx = i * 3;
          // Move outward along plume trajectory
          positions[idx] += flowVelocity * (0.8 + (i % 5) * 0.1); // x
          positions[idx + 2] += flowVelocity * (0.6 + (i % 3) * 0.15); // z
          positions[idx + 1] = 1.3 + Math.sin(elapsedTime * 2 + i) * 0.15; // undulating wave height

          // Reset particle when it reaches outer boundary
          if (positions[idx] > 26 || positions[idx + 2] > 28) {
            positions[idx] = -7 + (Math.random() - 0.5) * 1.2;
            positions[idx + 1] = 1.4 + (Math.random() - 0.5) * 0.4;
            positions[idx + 2] = 2 + (Math.random() - 0.5) * 1.5;
          }
        }
        plumeParticlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      // Animate Beacon Radar rings
      beaconRingsRef.current.forEach((ring, idx) => {
        const phase = (elapsedTime * 1.5 + idx * 0.8) % 1.5;
        const scale = 1 + phase * 2.2;
        ring.scale.set(scale, scale, 1);
        if (ring.material instanceof THREE.MeshBasicMaterial) {
          ring.material.opacity = Math.max(0, 0.8 - (phase / 1.5));
        }
      });

      // Animate Sluice Gate positions based on state
      const targetGateY = 1.2 + (state.sluiceGateOpenPct / 100) * 2.6;
      sluiceGatesRef.current.forEach(gate => {
        gate.position.y += (targetGateY - gate.position.y) * 0.08;
      });

      // Animate subtle water surface wave ripples
      if (waterMeshRef.current) {
        waterMeshRef.current.position.y = 1.8 + Math.sin(elapsedTime * 1.4) * 0.08;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 15. Resize handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full select-none">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* 3D Holographic Annotation Hotspots (matching image.png) */}
      {showAnnotations && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* 1. Plume Vectors */}
          <div
            className="pointer-events-auto absolute top-[28%] left-[28%] -translate-x-1/2 cursor-pointer transition-all duration-300 hover:scale-105"
            onClick={() => onSelectHotspot && onSelectHotspot('plume')}
            onMouseEnter={() => setHoveredHotspot('plume')}
            onMouseLeave={() => setHoveredHotspot(null)}
          >
            <div className="flex flex-col items-center">
              <div className="px-3 py-1 bg-slate-950/80 border border-cyan-400/60 rounded backdrop-blur-md shadow-[0_0_12px_rgba(0,210,255,0.4)] text-center">
                <div className="text-[11px] font-semibold tracking-wide text-cyan-300">
                  Ocean alkaline dispersal
                </div>
                <div className="text-[10px] text-slate-300">plume vectors</div>
              </div>
              <div className="w-[1px] h-6 bg-gradient-to-b from-cyan-400 to-transparent" />
            </div>
          </div>

          {/* 2. Micro-Aquarium Testing Pod */}
          <div
            className="pointer-events-auto absolute top-[18%] left-[48%] -translate-x-1/2 cursor-pointer transition-all duration-300 hover:scale-105"
            onClick={() => onSelectHotspot && onSelectHotspot('biotest')}
            onMouseEnter={() => setHoveredHotspot('biotest')}
            onMouseLeave={() => setHoveredHotspot(null)}
          >
            <div className="flex flex-col items-center">
              <div className="px-3 py-1 bg-slate-950/80 border border-emerald-400/60 rounded backdrop-blur-md shadow-[0_0_12px_rgba(0,255,170,0.4)] text-center">
                <div className="text-[11px] font-semibold tracking-wide text-emerald-300">
                  Automated marine micro-
                </div>
                <div className="text-[10px] text-slate-300">aquarium testing pod</div>
              </div>
              <div className="w-[1px] h-8 bg-gradient-to-b from-emerald-400 to-transparent" />
            </div>
          </div>

          {/* 3. Renewable Energy Cluster */}
          <div
            className="pointer-events-auto absolute top-[22%] right-[22%] -translate-x-1/2 cursor-pointer transition-all duration-300 hover:scale-105"
            onClick={() => onSelectHotspot && onSelectHotspot('renewables')}
            onMouseEnter={() => setHoveredHotspot('renewables')}
            onMouseLeave={() => setHoveredHotspot(null)}
          >
            <div className="flex flex-col items-center">
              <div className="px-3 py-1 bg-slate-950/80 border border-amber-400/60 rounded backdrop-blur-md shadow-[0_0_12px_rgba(245,158,11,0.4)] text-center">
                <div className="text-[11px] font-semibold tracking-wide text-amber-300">
                  Heavy-engineering ocean
                </div>
                <div className="text-[10px] text-slate-300">renewable energy cluster</div>
              </div>
              <div className="w-[1px] h-8 bg-gradient-to-b from-amber-400 to-transparent" />
            </div>
          </div>

          {/* 4. Reclamation Site & Dutch Sluice */}
          <div
            className="pointer-events-auto absolute bottom-[26%] right-[24%] -translate-x-1/2 cursor-pointer transition-all duration-300 hover:scale-105"
            onClick={() => onSelectHotspot && onSelectHotspot('sluice')}
            onMouseEnter={() => setHoveredHotspot('sluice')}
            onMouseLeave={() => setHoveredHotspot(null)}
          >
            <div className="flex flex-col items-center">
              <div className="w-[1px] h-6 bg-gradient-to-t from-cyan-400 to-transparent" />
              <div className="px-3 py-1.5 bg-slate-950/85 border border-cyan-400/70 rounded backdrop-blur-md shadow-[0_0_14px_rgba(0,210,255,0.4)] text-left">
                <div className="text-[11px] font-bold tracking-wider text-cyan-300 uppercase">
                  Reclamation Site
                </div>
                <div className="text-[9.5px] text-slate-300 leading-tight">
                  Sophisticated Dutch geometry,
                  <br />
                  Automated sluice gates
                </div>
              </div>
            </div>
          </div>

          {/* 5. Biotest Pod Label Bottom Left */}
          <div
            className="pointer-events-auto absolute bottom-[24%] left-[34%] -translate-x-1/2 cursor-pointer transition-all duration-300 hover:scale-105"
            onClick={() => onSelectHotspot && onSelectHotspot('biotest')}
          >
            <div className="flex flex-col items-start px-2.5 py-1 bg-slate-950/75 border border-emerald-400/50 rounded backdrop-blur-sm">
              <div className="text-[11px] font-bold tracking-wider text-emerald-300 uppercase">
                Biotest Pod
              </div>
              <div className="text-[9.5px] text-slate-300">Marine-aquarium testing pod</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
