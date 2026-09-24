"use client";

import { EffectComposerContext } from "@react-three/postprocessing";
import { BlendFunction, Effect, EffectAttribute } from "postprocessing";
import { useContext, useEffect, useMemo } from "react";
import { Color, Uniform, type Texture } from "three";

/**
 * Comic-book ink pass: variable-width ink outlines (memo ink #3d2140) from depth + normal
 * discontinuities, plus a light halftone in the darkest cel bands. Same treatment
 * as the Memory Diorama (tense/effects/InkOutline.tsx), kept per game so each
 * bundle stays self-contained. Assumes an orthographic camera (depth is linear).
 */
const fragmentShader = /* glsl */ `
uniform sampler2D uNormals;
uniform float uThickness;
uniform vec3 uInk;
uniform float uHalftone;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float linDepth(vec2 uv) { return readDepth(uv) * (cameraFar - cameraNear); }
vec3 nrm(vec2 uv) { return texture2D(uNormals, uv).xyz * 2.0 - 1.0; }

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  // Variable stroke width: slow screen-space noise, like a brush pen.
  vec2 px = uv * resolution;
  float w = uThickness * mix(0.55, 1.45, vnoise(px / 70.0));
  vec2 o = texelSize * w;

  // Depth: Laplacian is zero on flat (even slanted) planes under ortho projection.
  float d0 = linDepth(uv);
  float dl = linDepth(uv - vec2(o.x, 0.0));
  float dr = linDepth(uv + vec2(o.x, 0.0));
  float du = linDepth(uv + vec2(0.0, o.y));
  float dd = linDepth(uv - vec2(0.0, o.y));
  float lap = abs(dl + dr - 2.0 * d0) + abs(du + dd - 2.0 * d0);
  float depthEdge = smoothstep(0.08, 0.2, lap);

  // Normals: creases between faces.
  vec3 n0 = nrm(uv);
  float nd = max(
    max(1.0 - dot(n0, nrm(uv - vec2(o.x, 0.0))), 1.0 - dot(n0, nrm(uv + vec2(o.x, 0.0)))),
    max(1.0 - dot(n0, nrm(uv + vec2(0.0, o.y))), 1.0 - dot(n0, nrm(uv - vec2(0.0, o.y))))
  );
  float normalEdge = smoothstep(0.25, 0.55, nd);

  float edge = max(depthEdge, normalEdge);

  // Halftone dots in shadowed areas (not on background).
  vec3 col = inputColor.rgb;
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  vec2 cell = fract(px / 6.0) - 0.5;
  float dotMask = step(length(cell), 0.32) * (1.0 - smoothstep(0.08, 0.22, luma)) * step(depth, 0.9999);
  col *= 1.0 - dotMask * uHalftone;

  outputColor = vec4(mix(col, uInk, edge), inputColor.a);
}
`;

class InkOutlineEffect extends Effect {
  constructor() {
    super("InkOutlineEffect", fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, Uniform>([
        ["uNormals", new Uniform(null)],
        ["uThickness", new Uniform(1.6)],
        ["uInk", new Uniform(new Color("#3d2140"))],
        ["uHalftone", new Uniform(0.35)],
      ]),
    });
  }
  configure(normals: Texture | null, thickness: number) {
    this.uniforms.get("uNormals")!.value = normals;
    this.uniforms.get("uThickness")!.value = thickness;
  }
}

export function InkOutline({ thickness = 1.6 }: { thickness?: number }) {
  const { normalPass } = useContext(EffectComposerContext);
  const effect = useMemo(() => new InkOutlineEffect(), []);
  useEffect(() => {
    effect.configure(normalPass?.texture ?? null, thickness * Math.min(window.devicePixelRatio, 2));
  }, [effect, normalPass, thickness]);
  return <primitive object={effect} dispose={null} />;
}
