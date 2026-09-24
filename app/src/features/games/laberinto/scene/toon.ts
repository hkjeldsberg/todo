import * as THREE from "three";

let gradient: THREE.DataTexture | null = null;

/** Three hard light bands (shadow / mid / highlight) — no smooth gradients. */
export function toonGradient(): THREE.DataTexture {
  if (gradient) return gradient;
  const bands = new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]);
  gradient = new THREE.DataTexture(bands, 3, 1, THREE.RGBAFormat);
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  return gradient;
}
