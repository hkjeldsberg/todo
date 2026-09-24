"use client";

import { useMemo } from "react";
import { useScene } from "./context";
import { APT, MAP, MAP_BUILDINGS, MAP_TAXIS, PLAZA, type V3 } from "./layouts";
import { cobbles, grass, mapGround, street, terraceTiles, tiled, tileFloor } from "./paper";
import { Blob, Block, Breathe, Cyl, paperMat, Sheet } from "./prims";
import { Bed, CardboardBox, Chair, ClothesRack, CoffeeTable, Curtain, Desk, FloorLamp, Frame, Garland, Laundry, PaperCloud, Plant, Rod, Rug, Shelf, Sofa } from "./propsHome";
import { Bench, Car, Cat, CafeTable, Church, House, LampPost, MapBlock, Pigeons, PlazaBuilding, Traffic, Tree } from "./propsTown";
import { alongWall, Plinth, Room, Slab } from "./Room";

function useCandidate() {
  const { s } = useScene();
  return (id: string) => s.candidates.includes(id) && !s.found.includes(id);
}

// ─────────────────────────────────────────────────────────────── apartment

/** Ground floor: the living room from the reference image. */
export function ApartmentDown() {
  const { s } = useScene();
  const cand = useCandidate();
  const open = (id: string) => s.peek === id || s.found.includes(id);
  const floorMat = useMemo(() => paperMat("#ffffff", { map: tiled(tileFloor(), 1, 1), key: "aptfloor" }), []);
  const S = APT.size;
  const w = APT.window;
  const catMode = !s.found.includes("flap_under_sofa") ? "hidden" : s.done.includes("apt_cat_label") ? "roam" : "under";
  const chairFace = Math.atan2(APT.table[0] - APT.chair[0], APT.table[2] - APT.chair[2]);

  return (
    <group>
      <Plinth size={[S, S]} floor={floorMat} />
      <Room
        size={S}
        height={APT.wallH[0]}
        t={APT.wallT}
        walls={[
          {
            side: "n",
            hole: { x: w.x, y: w.y, w: w.w, h: w.h },
            children: (
              <>
                <Rod position={[w.x, w.y + w.h / 2 + 0.35, 0]} length={w.w + 2.2} />
                <Breathe active={cand("flap_behind_curtain")} amount={0.05}>
                  <Curtain position={[APT.curtainL, w.y + w.h / 2 + 0.35, 0]} height={3.3} open={open("flap_behind_curtain")} />
                </Breathe>
                <Curtain position={[APT.curtainR, w.y + w.h / 2 + 0.35, 0]} height={3.3} phase={1.3} />
                <Frame position={[-3.3, 2.9, 0]} kind="room" tilt={0.03} />
                <Frame position={[3.9, 2.8, 0]} kind="plant" size={[0.7, 0.85]} tilt={-0.04} />
              </>
            ),
          },
          {
            side: "w",
            paper: { upper: "#efe6d4", lower: "#cdb086" },
            children: (
              <>
                <Frame position={[alongWall("w", -0.4), 3.2, 0]} kind="window" size={[1.2, 1.4]} tilt={-0.02} />
                <Block size={[0.7, 0.9, 0.04]} color="#9cc7c4" position={[alongWall("w", 3.2), 2.2, 0.02]} cast={false} />
                <Frame position={[alongWall("w", -3.2), 2.6, 0]} kind="chair" size={[0.7, 0.85]} tilt={0.05} />
              </>
            ),
          },
          { side: "s", children: <Frame position={[0, 2.6, 0]} kind="room" size={[1.1, 1.3]} /> },
          { side: "e", paper: { upper: "#f1e3cc", lower: "#d1b086" }, children: <Shelf position={[0, 2.8, 0]} width={2.4} /> },
        ]}
      />
      <Rug position={[0.4, 0.008, 0.6]} size={[5.6, 4.6]} />
      <Breathe active={cand("flap_under_sofa") || cand("flap_on_sofa")} amount={0.04}>
        <Sofa position={APT.sofa.pos} len={APT.sofa.len} depth={APT.sofa.depth} skirtOpen={open("flap_under_sofa")} cushionOpen={open("flap_on_sofa")} />
      </Breathe>
      <CoffeeTable position={APT.table} />
      <Chair position={APT.chair} face={chairFace} />
      <Plant position={APT.plant} scale={1.25} />
      <FloorLamp position={APT.lamp} />
      <CardboardBox position={APT.box.pos} size={APT.box.size} />
      <group position={APT.laundry}>
        <Breathe active={cand("pick_laundry_downstairs")}>
          <Laundry position={[0, 0, 0]} />
        </Breathe>
      </group>
      <Cat
        mode={catMode}
        under={[APT.sofa.pos[0] + 1.0, 0, APT.sofa.pos[2] + 0.6]}
        spots={[
          [APT.sofa.pos[0] + 1.0, 0, APT.sofa.pos[2] + 0.6],
          [-0.8, 0.01, 2.6],
          [1.8, 0.01, -2.4],
          [-2.6, 0.01, -3.6],
          [1.4, 0.01, 3.2],
        ]}
      />
    </group>
  );
}

/** Upper floor: the girl's bedroom (the Stage lifts it off like a dollhouse storey). */
export function ApartmentUp() {
  const { s } = useScene();
  const cand = useCandidate();
  const S = APT.size;
  const bw = APT.bedWindow;
  const floorMat = useMemo(() => paperMat("#ffffff", { map: tiled(tileFloor(), 1, 1), key: "aptfloor2" }), []);
  return (
    <group>
      <Slab size={S} y={0} thickness={0.4} floor={floorMat} />
      <Room
        size={S}
        height={APT.wallH[1]}
        t={APT.wallT}
        walls={[
          {
            side: "n",
            paper: { upper: "#f7e4e6", lower: "#e6b9c0" },
            children: (
              <>
                <Shelf position={[APT.desk[0], 2.6, 0]} width={2.0} />
                <Garland position={[-2.6, 3.2, 0]} width={3.4} />
                <PaperCloud position={[3.8, 3.0, 0]} />
              </>
            ),
          },
          {
            side: "w",
            paper: { upper: "#f7e4e6", lower: "#e6b9c0" },
            hole: { x: alongWall("w", bw.z), y: bw.y, w: bw.w, h: bw.h },
            children: (
              <>
                <Rod position={[alongWall("w", bw.z), bw.y + bw.h / 2 + 0.3, 0]} length={bw.w + 1.8} />
                <Curtain position={[alongWall("w", bw.z) - bw.w / 2 - 0.35, bw.y + bw.h / 2 + 0.3, 0]} height={2.8} width={0.8} color="#f4b6c6" />
                <Curtain position={[alongWall("w", bw.z) + bw.w / 2 + 0.35, bw.y + bw.h / 2 + 0.3, 0]} height={2.8} width={0.8} color="#f4b6c6" phase={2} />
                <Frame position={[alongWall("w", -2.4), 2.4, 0]} kind="plant" size={[0.8, 0.95]} tilt={0.04} />
              </>
            ),
          },
          { side: "s", paper: { upper: "#f7e4e6", lower: "#e6b9c0" }, children: <Frame position={[0, 2.4, 0]} kind="window" /> },
          { side: "e", paper: { upper: "#f7e4e6", lower: "#e6b9c0" }, children: <Garland position={[0, 3.1, 0]} width={3} /> },
        ]}
      />
      <Rug position={[0.8, 0.008, 1.4]} size={[3.6, 3.2]} colors={["#f29bb2", "#fde1e8"]} />
      <Bed position={APT.bed.pos} size={APT.bed.size} legH={APT.bed.legH} />
      <Desk position={APT.desk} />
      <Chair position={[APT.desk[0] + 0.2, 0, APT.desk[2] + 1.1]} face={Math.PI} color="#e8c7a0" />
      <group position={APT.rack}>
        <Breathe active={cand("pick_clothes_upstairs")}>
          <ClothesRack position={[0, 0, 0]} />
        </Breathe>
      </group>
      <Plant position={[3.9, 0, 3.9]} scale={0.9} leafColor="#79b58a" />
      {s.found.includes("pick_clothes_upstairs") && <Blob position={[APT.rack[0], 0.015, APT.rack[2]]} size={[1.6, 2.8]} opacity={0.3} />}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────── plaza

export function PlazaScene() {
  const floorMat = useMemo(() => paperMat("#ffffff", { map: tiled(cobbles(), 3, 3), key: "plazafloor" }), []);
  const S = PLAZA.size;
  const T = PLAZA.terrace;
  const facadePaper = { upper: "#d5e8ee", lower: "#e2c3a0" };
  return (
    <group>
      <Plinth size={[S, S]} floor={floorMat} />
      <Room
        size={S}
        height={PLAZA.wallH}
        t={0.3}
        walls={[
          { side: "n", paper: facadePaper, children: <Garland position={[0, 2.9, 0]} width={9} /> },
          { side: "w", paper: facadePaper, children: <Garland position={[0, 2.9, 0]} width={9} /> },
          { side: "s", paper: facadePaper },
          { side: "e", paper: facadePaper },
        ]}
      />
      <Sheet size={[3.4, 3.4]} map={tiled(terraceTiles(), 2, 2)} position={[T[0], 0.008, T[2]]} rotation={[-Math.PI / 2, 0, 0]} />
      <CafeTable position={T} />
      <PlazaBuilding position={PLAZA.bank.pos} size={PLAZA.bank.size} color="#d7dfe6" sign="BANCO" />
      <PlazaBuilding position={PLAZA.bakery.pos} size={PLAZA.bakery.size} color="#f3dcc0" sign="PANADERÍA" awning="#e8906f" />
      <Bench position={[-3.0, 0, 2.6]} rot={0.2} />
      <Bench position={[1.4, 0, 4.9]} rot={0} />
      <Tree position={[-4.9, 0, -2.2]} />
      <Tree position={[4.9, 0, -1.4]} scale={0.9} />
      <Tree position={[-1.8, 0, 4.9]} scale={0.85} />
      <LampPost position={[-2.4, 0, -1.8]} />
      <LampPost position={[2.6, 0, 0.6]} />
      <Pigeons center={[-1.4, 0, 2.3]} count={5} />
      {[
        [5.2, 0, 5.2],
        [-5.2, 0, -5.2],
      ].map((p, i) => (
        <group key={i} position={p as V3}>
          <Cyl r={0.3} top={0.38} h={0.5} color="#c96f4a" position={[0, 0.25, 0]} />
          <mesh position={[0, 0.65, 0]} castShadow material={paperMat("#e46d8e")}>
            <icosahedronGeometry args={[0.35, 0]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────── botánico map

function StreetStrip({ from, to, width, dashed = true, color }: { from: [number, number]; to: [number, number]; width: number; dashed?: boolean; color?: string }) {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const yaw = Math.atan2(to[1] - from[1], to[0] - from[0]);
  return (
    <Sheet
      size={[len, width]}
      map={tiled(street(dashed, color), Math.max(1, len / 2.4), 1)}
      position={[(from[0] + to[0]) / 2, 0.01, (from[1] + to[1]) / 2]}
      rotation={[-Math.PI / 2, 0, -yaw]}
    />
  );
}

export function BotanicoScene() {
  const cand = useCandidate();
  const floorMat = useMemo(() => paperMat("#ffffff", { map: tiled(mapGround(), 2, 2), key: "mapfloor" }), []);
  const [W, D] = MAP.size;
  const hw = MAP.highway;
  const ms = MAP.mainStreet;
  const ss = MAP.southStreet;
  const al = MAP.alley;
  const pk = MAP.park;
  return (
    <group>
      <Plinth size={[W, D]} floor={floorMat} />
      <StreetStrip from={[hw.x, -D / 2]} to={[hw.x, D / 2]} width={hw.w} color="#6f6b69" />
      <StreetStrip from={[ms.x0, ms.z]} to={[ms.x1, ms.z]} width={ms.w} />
      <StreetStrip from={[ss.x0, ss.z]} to={[ss.x1, ss.z]} width={ss.w} dashed={false} />
      <StreetStrip from={[al.x0, al.z]} to={[al.x1, al.z]} width={al.w} dashed={false} color="#a39d97" />
      {/* direction arrows on the main street */}
      {[-3, 0.5, 4].map((x) => (
        <mesh key={x} position={[x, 0.016, 0.3]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]} material={paperMat("#f7efdc")}>
          <coneGeometry args={[0.12, 0.35, 3]} />
        </mesh>
      ))}
      {/* park */}
      <Sheet size={pk.size} map={tiled(grass(), 2, 2)} position={[pk.pos[0], 0.012, pk.pos[2]]} rotation={[-Math.PI / 2, 0, 0]} alpha />
      <Cyl r={0.55} h={0.05} color="#9fcfe0" position={[pk.pos[0] + 0.5, 0.03, pk.pos[2] + 0.6]} cast={false} />
      <Tree position={[pk.pos[0] - 0.9, 0, pk.pos[2] - 1.1]} scale={0.8} />
      <Tree position={[pk.pos[0] + 0.9, 0, pk.pos[2] - 1.0]} scale={0.7} color="#79ad62" />
      <Tree position={[pk.pos[0] - 0.8, 0, pk.pos[2] + 1.0]} scale={0.75} />
      <Bench position={[pk.pos[0] + 0.6, 0, pk.pos[2] - 0.2]} rot={Math.PI / 2} />
      {MAP_BUILDINGS.map((b, i) => (
        <group key={i}>
          <Breathe active={b.zone ? cand(b.zone) : false} amount={0.07} phase={i}>
            <MapBlock b={b} />
          </Breathe>
        </group>
      ))}
      <House position={MAP.house.pos} size={MAP.house.size} />
      <Church position={MAP.church} />
      {MAP_TAXIS.map((t, i) => (
        <group key={t.zone} position={t.pos} rotation={[0, t.rot, 0]}>
          <Breathe active={cand(t.zone)} amount={0.06} phase={i * 2}>
            <Car taxi />
          </Breathe>
        </group>
      ))}
      <Traffic from={[hw.x - 0.3, 0, D / 2]} to={[hw.x - 0.3, 0, -D / 2]} count={3} colors={["#e46d5a", "#5aa1d6", "#f2c230"]} speed={1.3} />
      <Traffic from={[hw.x + 0.3, 0, -D / 2]} to={[hw.x + 0.3, 0, D / 2]} count={3} colors={["#8fc28a", "#f2c230", "#c9a0d8"]} speed={1.1} offset={3} />
      <Traffic from={[ss.x0, 0, ss.z]} to={[ss.x1, 0, ss.z]} count={2} colors={["#5aa1d6", "#e46d5a"]} speed={0.9} />
      {[
        [-5.0, 0, -0.95],
        [2.0, 0, -0.95],
        [-1.9, 0, 0.95],
        [6.4, 0, 2.2],
      ].map((p, i) => (
        <Tree key={i} position={p as V3} scale={0.5} />
      ))}
    </group>
  );
}
