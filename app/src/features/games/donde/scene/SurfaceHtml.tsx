"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Vector3, type Group } from "three";

/**
 * DOM content pinned to a point on a 3D surface (labels, sticky notes, the word builder).
 *
 * Same idea as drei's <Html>, but safe to unmount mid-render under React 19: drei reuses one
 * container per component and unmounts its root synchronously inside R3F's commit, which React
 * defers and later double-removes ("removeChild: not a child of this node") on page flips.
 * Here every mount gets its own container, and the root is unmounted after the commit.
 */
export function SurfaceHtml({ position, zIndex = 10, children }: { position: [number, number, number]; zIndex?: number; children: ReactNode }) {
  const anchor = useRef<Group>(null);
  const holder = useRef<{ el: HTMLDivElement; root: Root } | null>(null);
  const gl = useThree((st) => st.gl);
  const world = useRef(new Vector3());

  useLayoutEffect(() => {
    const target = gl.domElement.parentElement;
    if (!target) return;
    const el = document.createElement("div");
    el.style.cssText = `position:absolute;top:0;left:0;visibility:hidden;will-change:transform;pointer-events:none;z-index:${zIndex};`;
    target.appendChild(el);
    const root = createRoot(el);
    holder.current = { el, root };
    return () => {
      holder.current = null;
      el.remove();
      setTimeout(() => root.unmount(), 0);
    };
  }, [gl, zIndex]);

  useLayoutEffect(() => {
    holder.current?.root.render(<div style={{ transform: "translate(-50%, -50%)" }}>{children}</div>);
  });

  useFrame(({ camera, size }) => {
    const h = holder.current;
    const g = anchor.current;
    if (!h || !g) return;
    const p = g.getWorldPosition(world.current).project(camera);
    const x = ((p.x + 1) / 2) * size.width;
    const y = ((1 - p.y) / 2) * size.height;
    h.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    h.el.style.visibility = "visible";
  });

  return <group ref={anchor} position={position} />;
}
