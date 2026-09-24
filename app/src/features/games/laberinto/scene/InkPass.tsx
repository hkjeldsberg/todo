"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

const vertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const fragment = /* glsl */ `
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 resolution;
uniform float cameraNear;
uniform float cameraFar;
uniform float flash;
varying vec2 vUv;

float linearDepth(vec2 uv) {
  float z = texture2D(tDepth, uv).x * 2.0 - 1.0;
  return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
}
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec4 src = texture2D(tColor, vUv);
  vec3 col = src.rgb;
  float isArt = step(0.5, src.a); // signs write alpha 0: keep typography crisp
  float d = linearDepth(vUv);
  float l = luma(col);

  // Variable-width ink: thick up close, thin in the distance, jittered like a brush.
  float width = mix(3.2, 1.0, clamp(d / 35.0, 0.0, 1.0));
  width *= 0.8 + 0.4 * hash(floor(vUv * resolution / 7.0));
  vec2 px = width / resolution;

  float dEdge = 0.0;
  float cEdge = 0.0;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.78539816;
    vec2 o = vec2(cos(a), sin(a)) * px;
    float dd = linearDepth(vUv + o);
    dEdge = max(dEdge, abs(dd - d) / max(d, 0.001));
    cEdge = max(cEdge, abs(luma(texture2D(tColor, vUv + o).rgb) - l));
  }
  float edge = max(smoothstep(0.05, 0.09, dEdge), smoothstep(0.14, 0.22, cEdge) * isArt);

  // Halftone dots in the shadow band (rotated 45deg grid).
  vec2 p = vUv * resolution;
  p = mat2(0.7071, -0.7071, 0.7071, 0.7071) * p;
  float dotDist = length(fract(p / 7.0) - 0.5);
  float shade = smoothstep(0.42, 0.18, l);
  float ht = step(dotDist, 0.42 * shade) * isArt;
  col = mix(col, col * vec3(0.5, 0.42, 0.52), ht); // halftone dots lean toward the ink hue

  // Paper grain + ink. Ink is memo #3D2140, in linear space (the target is linear).
  col *= 0.96 + 0.04 * hash(p);
  col = mix(col, vec3(0.0467, 0.0152, 0.0513), edge);
  col = mix(col, vec3(1.0, 0.95, 0.8), flash);

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

/**
 * Renders the scene into an offscreen target (with stencil, so door portals
 * survive), then draws it with depth + colour edge detection as comic ink.
 * A plain class so the per-frame uniform writes stay outside React's model.
 */
class InkComposer {
  private target: THREE.WebGLRenderTarget;
  private material: THREE.ShaderMaterial;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  constructor() {
    const depth = new THREE.DepthTexture(1, 1);
    depth.format = THREE.DepthStencilFormat;
    depth.type = THREE.UnsignedInt248Type;
    this.target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      depthTexture: depth,
      stencilBuffer: true,
    });
    this.material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        tColor: { value: this.target.texture },
        tDepth: { value: this.target.depthTexture },
        resolution: { value: new THREE.Vector2(1, 1) },
        cameraNear: { value: 0.1 },
        cameraFar: { value: 200 },
        flash: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material));
  }

  setSize(width: number, height: number) {
    this.target.setSize(Math.floor(width), Math.floor(height));
    this.material.uniforms.resolution.value.set(width, height);
  }

  render(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, flash: number) {
    const cam = camera as THREE.PerspectiveCamera;
    this.material.uniforms.cameraNear.value = cam.near;
    this.material.uniforms.cameraFar.value = cam.far;
    this.material.uniforms.flash.value = flash;
    gl.setRenderTarget(this.target);
    gl.clear(true, true, true);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    gl.render(this.scene, this.camera);
  }

  dispose() {
    this.target.depthTexture?.dispose();
    this.target.dispose();
    this.material.dispose();
  }
}

/** Post-processing pass: takes over rendering (priority 1) to ink the scene. */
export function InkPass({ flash = 0 }: { flash?: number }) {
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const ink = useMemo(() => new InkComposer(), []);

  useEffect(() => ink.setSize(size.width * dpr, size.height * dpr), [ink, size, dpr]);
  useEffect(() => () => ink.dispose(), [ink]);

  useFrame(({ gl, scene, camera }) => ink.render(gl, scene, camera, flash), 1);

  return null;
}
