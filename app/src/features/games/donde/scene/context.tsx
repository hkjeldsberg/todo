"use client";

import { createContext, useContext, type RefObject } from "react";
import type { Mesh } from "three";
import type { DondeState } from "../useDonde";

/** Camera + gesture state shared by the HUD buttons, the DOM gesture layer and the 3D rig. Mutated, never rendered. */
export interface ViewState {
  /** Quarter turns from the default corner view. */
  step: number;
  /** Live rotation while the learner swipes (radians), snapped on release. */
  dragAz: number;
  /** User zoom on top of the fit-to-screen zoom (1 … 2.6). */
  zoom: number;
  /** Ground-plane pan in world units. */
  pan: [number, number];
  /** Set by a 3D object that took the pointer, so the gesture layer leaves it alone. */
  captured: boolean;
  /** Screen space the HUD covers (px), so the diorama centres in what's left. */
  padTop: number;
  padBottom: number;
}

export const newView = (): ViewState => ({ step: 0, dragAz: 0, zoom: 1, pan: [0, 0], captured: false, padTop: 150, padBottom: 110 });

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 2.6;

export interface SceneCtx {
  s: DondeState;
  viewRef: RefObject<ViewState>;
  /** zoneId → its invisible hit meshes, for drag-and-drop raycasts. */
  hitsRef: RefObject<Map<string, Mesh[]>>;
  /** Piece currently being dragged (for pink zone highlights). */
  dragging: string | null;
  setDragging(id: string | null): void;
  hoverZone: string | null;
  setHoverZone(id: string | null): void;
  reducedMotion: boolean;
}

export const Ctx = createContext<SceneCtx | null>(null);

export function useScene(): SceneCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useScene outside <Ctx>");
  return c;
}
