"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { useEffect, useSyncExternalStore, type ComponentType } from "react";
import type { OrthographicCamera } from "three";
import { InkOutline } from "./effects/InkOutline";
import { Bedroom } from "./rooms/Bedroom";
import { Cafeteria } from "./rooms/Cafeteria";
import { Station } from "./rooms/Station";
import { Classroom } from "./rooms/Classroom";
import { Workshop } from "./rooms/Workshop";
import { StormNight } from "./rooms/StormNight";
import { Party } from "./rooms/Party";
import { Farewell } from "./rooms/Farewell";
import { Kitchen } from "./rooms/Kitchen";
import { LivingRoom } from "./rooms/LivingRoom";
import { RoomBindingsContext, type RoomBindings } from "./slot";
import { GameTimeProvider } from "./time";

/** Memo page colour behind every diorama (see app/src/app/globals.css --page). */
const BACKGROUND = "#fff3d6";

/** Room id (todo.tense_rooms.id) → 3D diorama. Content decides what happens in it. */
export const ROOM_SCENES: Record<string, ComponentType> = {
  cocina: Kitchen,
  salon: LivingRoom,
  dormitorio: Bedroom,
  cafeteria: Cafeteria,
  estacion: Station,
  aula: Classroom,
  taller: Workshop,
  tormenta: StormNight,
  fiesta: Party,
  despedida: Farewell,
};

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

/** False while the tab is hidden, so the canvas stops rendering entirely. */
function useDocumentVisible() {
  return useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState !== "hidden",
    () => true,
  );
}

/** CSS px the top chrome (chips + room card) takes on a phone, safe-area aside. */
const PORTRAIT_HUD_PX = 170;

/**
 * Fits the 8×8 room into the viewport with an isometric orthographic view. On a
 * portrait phone the room is lifted to sit just under the top chrome, which
 * leaves the lower half free for the prompt sheet.
 */
function CameraRig() {
  const get = useThree((s) => s.get);
  const { width, height } = useThree((s) => s.size);
  useEffect(() => {
    const camera = get().camera as OrthographicCamera;
    camera.position.set(10, 8.5, 10);
    camera.lookAt(0, 1.1, 0);
    camera.zoom = Math.min(width / 13, height / 11.5);
    // The room's top corner sits ~5.3 world units above the look-at point.
    const lift = height > width ? Math.max(0, height / 2 - 5.3 * camera.zoom - PORTRAIT_HUD_PX) : 0;
    if (lift > 0) camera.setViewOffset(width, height, 0, lift, width, height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }, [get, width, height]);
  return null;
}

interface SceneProps {
  roomId: string;
  bindings: RoomBindings;
  paused: boolean;
}

export function Scene({ roomId, bindings, paused }: SceneProps) {
  const visible = useDocumentVisible();
  const Room = ROOM_SCENES[roomId];
  if (!Room) return null;
  return (
    <Canvas
      flat
      orthographic
      dpr={[1, 2]}
      frameloop={visible ? "always" : "never"}
      camera={{ position: [10, 8.5, 10], zoom: 60, near: 0.1, far: 40 }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      style={{ touchAction: "none" }}
    >
      <color attach="background" args={[BACKGROUND]} />
      <CameraRig />
      <ambientLight intensity={1.2} />
      <hemisphereLight args={["#fff6e0", "#8a7a6a", 0.6]} />
      <directionalLight position={[6, 10, 4]} intensity={2.2} />
      <GameTimeProvider paused={paused}>
        <RoomBindingsContext.Provider value={bindings}>
          <Room />
        </RoomBindingsContext.Provider>
      </GameTimeProvider>
      <EffectComposer enableNormalPass multisampling={0}>
        <InkOutline thickness={1.5} />
      </EffectComposer>
    </Canvas>
  );
}
