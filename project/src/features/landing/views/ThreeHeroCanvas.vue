<template>
  <div ref="canvasContainer" class="absolute inset-0 pointer-events-none overflow-hidden z-0">
    <canvas ref="canvasEl" class="w-full h-full opacity-90 transition-opacity duration-1000"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';

const canvasContainer = ref(null);
const canvasEl = ref(null);

let scene, camera, renderer, animationFrameId;
let coreMesh, particlesMesh, outerRing;
let resizeObserver = null;
let mouseX = 0;
let mouseY = 0;
let targetX = 0;
let targetY = 0;

function initThree() {
  if (!canvasContainer.value || !canvasEl.value) return;

  const { width, height } = measure();

  // 1. Scene & Camera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.z = BASE_Z;

  // 2. Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: canvasEl.value,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  // updateStyle = false: canvas giữ CSS w-full h-full, không bị "đóng băng" kích thước lúc mount
  renderer.setSize(width, height, false);
  fitCamera(width, height);

  // 3. Lighting (Warm Gold & Cool Ice Blue)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const goldLight = new THREE.PointLight(0xd4af37, 2, 50);
  goldLight.position.set(5, 5, 5);
  scene.add(goldLight);

  const iceLight = new THREE.PointLight(0x38bdf8, 2, 50);
  iceLight.position.set(-5, -5, -3);
  scene.add(iceLight);

  // 4. Central Geometric Mesh (Icosahedron - Mạng lưới liên kết 100k nodes)
  const coreGeo = new THREE.IcosahedronGeometry(2, 1);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    wireframe: true,
    transparent: true,
    opacity: 0.35,
    roughness: 0.2,
    metalness: 0.8
  });
  coreMesh = new THREE.Mesh(coreGeo, coreMat);
  scene.add(coreMesh);

  // 5. Outer Torus Ring (Biểu tượng chu trình giải thuật khép kín)
  const ringGeo = new THREE.TorusGeometry(3, 0.04, 16, 100);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.4
  });
  outerRing = new THREE.Mesh(ringGeo, ringMat);
  outerRing.rotation.x = Math.PI / 3;
  scene.add(outerRing);

  // 6. Particle Constellation (Các hạt sao băng ánh kim & băng tuyết)
  const particleCount = 200;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount * 3; i += 3) {
    const radius = 2.5 + Math.random() * 3.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i + 2] = radius * Math.cos(phi);
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const particleMat = new THREE.PointsMaterial({
    size: 0.06,
    color: 0xd4af37,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending
  });

  particlesMesh = new THREE.Points(particleGeo, particleMat);
  scene.add(particlesMesh);

  // 7. Event Listeners
  // Theo dõi chính khung hero (đổi cỡ cửa sổ, kéo thanh chia màn hình Inspector, chuyển trang)
  resizeObserver = new ResizeObserver(onContainerResize);
  resizeObserver.observe(canvasContainer.value);
  window.addEventListener('mousemove', onMouseMove);

  // Start Animation
  animate();
}

function onMouseMove(event) {
  mouseX = (event.clientX / window.innerWidth) * 2 - 1;
  mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
}

// Khung hero tối thiểu 92vh; nếu lúc đo khung chưa dựng xong (0px) thì lấy theo cửa sổ
function measure() {
  const el = canvasContainer.value;
  const width = (el?.clientWidth || 0) > 1 ? el.clientWidth : window.innerWidth;
  const height = (el?.clientHeight || 0) > 50 ? el.clientHeight : Math.round(window.innerHeight * 0.92);
  return { width, height };
}

// Quả cầu luôn chiếm cùng một tỉ lệ chiều cao khung (FOV dọc cố định, camera z = 7).
// Chỉ khi khung quá hẹp (chia màn hình, điện thoại) mới lùi camera để quả cầu (bán kính 2) không bị cắt ngang; vòng xoay ngoài được phép tràn.
const BASE_Z = 7;
const FIT_RADIUS = 2.4;
function fitCamera(width, height) {
  const aspect = width / height;
  camera.aspect = aspect;
  const halfV = THREE.MathUtils.degToRad(camera.fov / 2);
  const halfH = Math.atan(Math.tan(halfV) * aspect);
  const zForWidth = FIT_RADIUS / Math.tan(halfH) + 0.5;
  camera.position.z = Math.max(BASE_Z, zForWidth);
  camera.updateProjectionMatrix();
}

let lastW = 0, lastH = 0;
function onContainerResize() {
  if (!canvasContainer.value || !renderer || !camera) return;
  const { width, height } = measure();
  if (width === lastW && height === lastH) return;
  lastW = width; lastH = height;
  renderer.setSize(width, height, false);
  fitCamera(width, height);
}

function animate() {
  animationFrameId = requestAnimationFrame(animate);

  // Smooth mouse interpolation (Lerp)
  targetX += (mouseX * 0.5 - targetX) * 0.03;
  targetY += (mouseY * 0.3 - targetY) * 0.03;

  if (coreMesh) {
    coreMesh.rotation.y += 0.003;
    coreMesh.rotation.x += 0.001;
    coreMesh.rotation.y += targetX * 0.02;
    coreMesh.rotation.x += targetY * 0.02;
  }

  if (outerRing) {
    outerRing.rotation.z += 0.002;
    outerRing.rotation.y -= 0.001;
  }

  if (particlesMesh) {
    particlesMesh.rotation.y += 0.0015;
    particlesMesh.rotation.x -= 0.0008;
  }

  renderer.render(scene, camera);
}

onMounted(() => {
  initThree();
});

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  resizeObserver?.disconnect();
  window.removeEventListener('mousemove', onMouseMove);

  if (renderer) {
    renderer.dispose();
  }
  if (coreMesh) {
    coreMesh.geometry.dispose();
    coreMesh.material.dispose();
  }
  if (outerRing) {
    outerRing.geometry.dispose();
    outerRing.material.dispose();
  }
  if (particlesMesh) {
    particlesMesh.geometry.dispose();
    particlesMesh.material.dispose();
  }
});
</script>
