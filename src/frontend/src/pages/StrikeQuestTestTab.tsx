// Strike Quest — World Map + Region 1: The Ember Alleys
// Admin panel proof of concept — no canister calls
// Sprites: CSS + SVG only

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Flame, Info, Sword } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════════════════

const GAME_CSS = `
@keyframes flame-flicker{0%,100%{transform:scaleX(1) scaleY(1) translateY(0);opacity:1}20%{transform:scaleX(.92) scaleY(1.08) translateY(-2px);opacity:.9}40%{transform:scaleX(1.06) scaleY(.94) translateY(1px);opacity:.85}60%{transform:scaleX(.94) scaleY(1.06) translateY(-1px);opacity:.95}80%{transform:scaleX(1.03) scaleY(.97) translateY(0);opacity:.88}}
@keyframes ember-float{0%{transform:translateY(0) translateX(0) scale(1);opacity:.9}40%{transform:translateY(-55px) translateX(8px) scale(.65);opacity:.55}100%{transform:translateY(-140px) translateX(-4px) scale(.08);opacity:0}}
@keyframes ember-float-2{0%{transform:translateY(0) translateX(0) scale(.85);opacity:.75}50%{transform:translateY(-70px) translateX(-10px) scale(.4);opacity:.35}100%{transform:translateY(-150px) translateX(7px) scale(.05);opacity:0}}
@keyframes smoke-drift{0%{transform:translateY(0) translateX(0) scale(.4);opacity:.22}50%{transform:translateY(-65px) translateX(12px) scale(1.4);opacity:.08}100%{transform:translateY(-130px) translateX(-8px) scale(2.1);opacity:0}}
@keyframes kael-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes kael-idle-glow{0%,100%{filter:drop-shadow(0 0 2px rgba(245,166,35,.3))}50%{filter:drop-shadow(0 0 8px rgba(245,166,35,.7))}}
@keyframes imp-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes imp-glow{0%,100%{filter:drop-shadow(0 0 4px #ff4400)}50%{filter:drop-shadow(0 0 14px #ff8800)}}
@keyframes pete-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes pete-glow{0%,100%{filter:drop-shadow(0 0 10px #ff4400) drop-shadow(0 0 22px #cc2200)}50%{filter:drop-shadow(0 0 26px #ff7700) drop-shadow(0 0 50px #ff3300)}}
@keyframes dungeon-pulse{0%,100%{box-shadow:0 0 22px rgba(180,0,0,.7),inset 0 0 30px rgba(90,0,0,.9)}50%{box-shadow:0 0 44px rgba(220,60,0,.9),inset 0 0 60px rgba(140,30,0,1)}}
@keyframes npc-idle{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.5px)}}
@keyframes npc-exclaim{0%,100%{transform:translateY(0);opacity:1}50%{transform:translateY(-5px);opacity:.7}}
@keyframes flash-to-black{0%{background:rgba(160,0,0,0)}20%{background:rgba(210,0,0,.95)}65%{background:rgba(200,0,0,.95)}100%{background:rgba(0,0,0,1)}}
@keyframes ambient-pulse{0%,100%{opacity:.35}50%{opacity:.6}}
@keyframes torch-light-pulse{0%,100%{opacity:.18}50%{opacity:.32}}
@keyframes pillar-glow{0%,100%{box-shadow:0 0 8px rgba(200,80,0,.2)}50%{box-shadow:0 0 20px rgba(220,100,0,.4)}}
@keyframes wmap-loc-pulse{0%,100%{filter:drop-shadow(0 0 6px currentColor);transform:scale(1)}50%{filter:drop-shadow(0 0 18px currentColor);transform:scale(1.08)}}
@keyframes wmap-snow{0%{transform:translateY(0) translateX(0);opacity:.8}100%{transform:translateY(85px) translateX(6px);opacity:0}}
@keyframes wmap-lava{0%,100%{opacity:.3}50%{opacity:.55}}
@keyframes wmap-locked{0%{opacity:0;transform:translateX(-50%) translateY(-8px)}15%,78%{opacity:1;transform:translateX(-50%) translateY(0)}100%{opacity:0;transform:translateX(-50%) translateY(-5px)}}
@keyframes town-warm{0%,100%{opacity:.15}50%{opacity:.28}}
@keyframes shop-in{0%{opacity:0;transform:translate(-50%,-50%) scale(.9)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}
@keyframes exit-pulse{0%,100%{box-shadow:0 0 8px rgba(0,180,60,.5),inset 0 0 10px rgba(0,120,40,.3)}50%{box-shadow:0 0 22px rgba(0,220,80,.85),inset 0 0 20px rgba(0,160,60,.5)}}
`;
function GameStyles() { return <style>{GAME_CSS}</style>; }

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

type GameView = "worldmap" | "town" | "dungeon" | "flash" | "battle";
type Direction = "up" | "down" | "left" | "right";
type GaugeResult = "perfect" | "strike" | "partial" | "fail";
type BattlePhase = "menu" | "gauge" | "result" | "enemy" | "victory" | "defeat";
type LogType = "damage" | "crit" | "heal" | "strike" | "miss" | "system" | "enrage";

interface CharStats {
  name: string; hp: number; maxHp: number; ap: number; maxAp: number;
  atk: number; def: number; mgk: number; res: number; spd: number; lck: number;
}
interface LogLine { text: string; type: LogType; }
interface ImpState {
  id: string; x: number; y: number; dx: number; dy: number; changeTimer: number; alive: boolean;
}
interface Inventory { potions: number; apPotions: number; }
interface KaelPos { x: number; y: number; }
interface LocationData {
  id: string; name: string; x: number; y: number;
  type: "town" | "dungeon" | "gate";
  defaultLocked: boolean; lockMsg?: string; unlockKey?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const VIEW_W = 820;
const VIEW_H = 480;
const KAEL_W = 36;
const KAEL_H = 52;
const KAEL_SPEED = 2.6;

// World map
const WMAP_W = 2400;
const WMAP_H = 1600;
const WMAP_KAEL_SPAWN: KaelPos = { x: 370, y: 1220 };

// Dungeon interior
const WORLD_W = 1600;
const WORLD_H = 900;
const IMP_SPEED = 0.85;
const BOUND_TOP = 110;
const BOUND_BOTTOM = WORLD_H - 90;
const KAEL_SPAWN = { x: 185, y: 430 };
const PETE_POS = { x: 1240, y: 490 };
const DUNGEON_ENTRANCE = { x: 1370, y: 460, w: 115, h: 100 };

const NPC_DATA = [
  { id: "ember", x: 320, y: 415, name: "Old Ember", dialogue: [
    '"Kael Dawnlane. Thought you were dead."',
    '"Cinder Pete controls the eastern tunnels. He\'s been collecting skulls."',
    '"The exit is back west. The door glows green."',
  ]},
  { id: "soot", x: 510, y: 490, name: "Soot", dialogue: [
    '"Don\'t go east. Pete burned three bowlers last week."',
    '"He torches anyone who challenges him. Just saying."',
  ]},
];

const IMP_INIT: ImpState[] = [
  { id: "imp1", x: 570, y: 310, dx: 0.8,  dy: 0.1,  changeTimer: 130, alive: true },
  { id: "imp2", x: 910, y: 470, dx: -0.7, dy: 0.55, changeTimer: 85,  alive: true },
];
const IMP_ZONES: [number, number, number, number][] = [
  [430, 780, 200, 600], [740, 1120, 280, 650],
];

const TORCHES = [
  { x: 70, y: 95 }, { x: 300, y: 82 }, { x: 580, y: 92 }, { x: 860, y: 85 },
  { x: 1130, y: 90 }, { x: 1440, y: 86 },
  { x: 100, y: 720 }, { x: 390, y: 705 }, { x: 690, y: 728 },
  { x: 1000, y: 712 }, { x: 1290, y: 720 },
];
const EMBERS = [
  { x: 78,   y: 120, delay: 0,   dur: 3.2, anim: "ember-float"   },
  { x: 92,   y: 115, delay: 1.4, dur: 2.7, anim: "ember-float-2" },
  { x: 306,  y: 105, delay: 0.6, dur: 3.5, anim: "ember-float"   },
  { x: 588,  y: 118, delay: 1.1, dur: 2.9, anim: "ember-float-2" },
  { x: 868,  y: 108, delay: 0.3, dur: 3.4, anim: "ember-float"   },
  { x: 1138, y: 112, delay: 1.7, dur: 2.6, anim: "ember-float-2" },
  { x: 1448, y: 105, delay: 0.9, dur: 3.0, anim: "ember-float"   },
  { x: 108,  y: 742, delay: 0.4, dur: 2.8, anim: "ember-float-2" },
  { x: 398,  y: 728, delay: 1.9, dur: 3.3, anim: "ember-float"   },
  { x: 698,  y: 750, delay: 0.7, dur: 2.5, anim: "ember-float-2" },
  { x: 1008, y: 735, delay: 1.3, dur: 3.1, anim: "ember-float"   },
  { x: 1298, y: 742, delay: 2.0, dur: 2.7, anim: "ember-float-2" },
];
const PILLARS = [
  { x: 150, y: 180 }, { x: 530, y: 195 }, { x: 1010, y: 185 }, { x: 1350, y: 175 },
];

// ═══════════════════════════════════════════════════════════════════════
// WORLD MAP DATA
// ═══════════════════════════════════════════════════════════════════════

const WORLD_LOCATIONS: LocationData[] = [
  { id: "ashwick",       name: "Ashwick Town",         x: 400,  y: 1200, type: "town",    defaultLocked: false },
  { id: "furnace_lanes", name: "Furnace Lanes",         x: 600,  y: 1300, type: "dungeon", defaultLocked: false },
  { id: "ember_gate",    name: "Ember Gate",            x: 700,  y: 1000, type: "gate",    defaultLocked: true,  lockMsg: "LOCKED — Defeat Cinder Pete first", unlockKey: "cinder_pete" },
  { id: "frostholm",     name: "Frostholm Town",        x: 800,  y: 300,  type: "town",    defaultLocked: true,  lockMsg: "LOCKED — Defeat Cinder Pete first" },
  { id: "glacial_lanes", name: "Glacial Lanes Dungeon", x: 1000, y: 200,  type: "dungeon", defaultLocked: true,  lockMsg: "LOCKED — Defeat Cinder Pete first" },
];

const LAVA_POOLS = [
  { x: 80,   y: 1450, rx: 38, ry: 13 }, { x: 280,  y: 1510, rx: 52, ry: 18 },
  { x: 500,  y: 1490, rx: 42, ry: 15 }, { x: 780,  y: 1520, rx: 35, ry: 12 },
  { x: 1050, y: 1470, rx: 48, ry: 16 }, { x: 1350, y: 1500, rx: 40, ry: 14 },
  { x: 1620, y: 1480, rx: 55, ry: 19 }, { x: 1900, y: 1510, rx: 44, ry: 15 },
  { x: 2150, y: 1455, rx: 36, ry: 12 }, { x: 300,  y: 1380, rx: 28, ry:  9 },
];
const SNOW_PARTICLES = [
  { x: 150,  y: 80,  delay: 0.0, dur: 4.2, size: 2 }, { x: 320,  y: 150, delay: 0.8, dur: 3.8, size: 3 },
  { x: 480,  y: 60,  delay: 1.4, dur: 4.5, size: 2 }, { x: 620,  y: 200, delay: 0.3, dur: 3.5, size: 2 },
  { x: 750,  y: 90,  delay: 1.9, dur: 4.1, size: 3 }, { x: 870,  y: 170, delay: 0.6, dur: 3.7, size: 2 },
  { x: 1020, y: 110, delay: 1.2, dur: 4.3, size: 3 }, { x: 1150, y: 250, delay: 0.1, dur: 3.9, size: 2 },
  { x: 1280, y: 80,  delay: 1.6, dur: 4.0, size: 2 }, { x: 1400, y: 190, delay: 0.9, dur: 3.6, size: 3 },
  { x: 200,  y: 320, delay: 1.1, dur: 4.4, size: 2 }, { x: 550,  y: 420, delay: 0.4, dur: 3.3, size: 2 },
  { x: 900,  y: 380, delay: 1.7, dur: 4.2, size: 3 }, { x: 1100, y: 350, delay: 0.7, dur: 3.8, size: 2 },
  { x: 1350, y: 410, delay: 1.3, dur: 4.6, size: 2 },
];
const ICE_CRYSTALS = [
  { x: 100, y: 120 }, { x: 250, y: 80  }, { x: 450, y: 150 }, { x: 650, y: 100 },
  { x: 850, y: 180 }, { x: 1050,y: 120 }, { x: 1250,y: 160 }, { x: 1450,y: 90  },
  { x: 180, y: 350 }, { x: 400, y: 400 }, { x: 700, y: 380 }, { x: 950, y: 420 },
];
const VOLCANIC_ROCKS = [
  { x: 150, y: 1320 }, { x: 380, y: 1420 }, { x: 560, y: 1360 }, { x: 830, y: 1400 },
  { x: 1020,y: 1340 }, { x: 1480,y: 1350 }, { x: 1720,y: 1410 }, { x: 2020,y: 1360 },
];

// ═══════════════════════════════════════════════════════════════════════
// WORLD MAP LOCATION ICONS
// ═══════════════════════════════════════════════════════════════════════

function TownIcon({ locked }: { locked: boolean }) {
  return (
    <svg width="40" height="44" viewBox="0 0 40 44"
      style={{ animation: locked ? "none" : "wmap-loc-pulse 2.4s ease-in-out infinite",
               color: locked ? "#334455" : "#ff8830", display: "block" }}>
      <ellipse cx="20" cy="43" rx="14" ry="2.5" fill="rgba(0,0,0,0.5)" />
      <rect x="6" y="21" width="28" height="21" fill={locked ? "#1a2030" : "#3a2010"} />
      <rect x="6" y="21" width="28" height="21" fill="none" stroke={locked ? "#334455" : "#6a4018"} strokeWidth="1" />
      <polygon points="2,22 20,5 38,22" fill={locked ? "#111820" : "#2a1508"} />
      <polygon points="2,22 20,5 38,22" fill="none" stroke={locked ? "#334455" : "#4a2a10"} strokeWidth="1" />
      <rect x="16" y="30" width="8" height="12" rx="1" fill={locked ? "#0a0e18" : "#180800"} />
      <rect x="8"  y="24" width="7" height="6" rx="0.5" fill={locked ? "#0d1830" : "#241000"} />
      {!locked && <rect x="8"  y="24" width="7" height="6" rx="0.5" fill="rgba(255,140,40,0.38)" />}
      <rect x="25" y="24" width="7" height="6" rx="0.5" fill={locked ? "#0d1830" : "#241000"} />
      {!locked && <rect x="25" y="24" width="7" height="6" rx="0.5" fill="rgba(255,140,40,0.38)" />}
      <rect x="25" y="9" width="5" height="10" fill={locked ? "#111820" : "#2a1508"} />
      {locked && <>
        <circle cx="20" cy="35" r="3.5" fill="none" stroke="#334455" strokeWidth="1.2" />
        <rect x="17.5" y="35" width="5" height="4.5" rx="0.5" fill="#0e1520" stroke="#334455" strokeWidth="1" />
      </>}
    </svg>
  );
}

function DungeonIcon({ locked }: { locked: boolean }) {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44"
      style={{ animation: locked ? "none" : "wmap-loc-pulse 2.1s ease-in-out infinite",
               color: locked ? "#330a00" : "#cc2200", display: "block" }}>
      <ellipse cx="22" cy="43" rx="15" ry="2" fill="rgba(0,0,0,0.5)" />
      <path d="M4 42 C4 22 9 12 22 10 C35 12 40 22 40 42 Z" fill={locked ? "#110500" : "#1a0500"} />
      <path d="M9 42 C9 26 13 17 22 15 C31 17 35 26 35 42 Z" fill={locked ? "#080200" : "#0d0200"} />
      <path d="M4 30 C7 24 8 30 10 24 C12 18 13 26 15 20 C17 14 18 24 20 18 C22 12 23 24 25 18 C27 12 28 24 30 20 C32 16 33 26 35 24 C37 22 38 30 40 30 L40 42 L4 42 Z"
        fill={locked ? "#110500" : "#1a0500"} opacity="0.85" />
      <ellipse cx="22" cy="26" rx="9" ry="8" fill="#cc2200" opacity={locked ? "0.07" : "0.22"} />
      <ellipse cx="18" cy="24" rx="2.5" ry="2.5" fill={locked ? "#220000" : "#cc0000"} opacity={locked ? "0.3" : "0.8"} />
      <ellipse cx="26" cy="24" rx="2.5" ry="2.5" fill={locked ? "#220000" : "#cc0000"} opacity={locked ? "0.3" : "0.8"} />
      <path d="M19 29 L22 27 L25 29 L24.5 32 L19.5 32 Z" fill={locked ? "#0a0000" : "#880000"} opacity="0.7" />
    </svg>
  );
}

function GateIcon({ locked }: { locked: boolean }) {
  const stone = locked ? "#1a1010" : "#2a2020";
  const bar   = locked ? "#220a00" : "#663010";
  return (
    <svg width="46" height="46" viewBox="0 0 46 46"
      style={{ animation: locked ? "none" : "wmap-loc-pulse 2.0s ease-in-out infinite",
               color: locked ? "#330a00" : "#ff6600", display: "block" }}>
      <ellipse cx="23" cy="45" rx="16" ry="2" fill="rgba(0,0,0,0.5)" />
      <rect x="2"  y="17" width="11" height="27" fill={stone} />
      <rect x="33" y="17" width="11" height="27" fill={stone} />
      {[23,31,39].map(y => (
        <g key={y}>
          <line x1="2"  y1={y} x2="13" y2={y} stroke="#3a2a20" strokeWidth="0.7" />
          <line x1="33" y1={y} x2="44" y2={y} stroke="#3a2a20" strokeWidth="0.7" />
        </g>
      ))}
      <path d="M2 21 Q23 3 44 21" fill="none" stroke={stone} strokeWidth="9" />
      <path d="M2 21 Q23 3 44 21" fill="none" stroke="#3a2a20" strokeWidth="1" />
      <ellipse cx="23" cy="8" rx="5" ry="4" fill={stone} stroke="#3a2a20" strokeWidth="0.8" />
      {locked ? <>
        {[13.5,18.5,23.5,28.5].map((bx,i) => <rect key={i} x={bx} y="21" width="2.5" height="23" fill={bar} />)}
        <rect x="11" y="29" width="24" height="2" fill={bar} />
        <circle cx="23" cy="33" r="3.5" fill="none" stroke="#cc4400" strokeWidth="1.5" />
        <rect x="20.5" y="32.5" width="5" height="5" rx="0.5" fill="#1a0800" stroke="#cc4400" strokeWidth="1.2" />
      </> : <>
        {[3,5.5].map((bx,i) => <rect key={i} x={bx} y="21" width="2" height="23" fill={bar} opacity="0.7" />)}
        {[38.5,41].map((bx,i) => <rect key={i} x={bx} y="21" width="2" height="23" fill={bar} opacity="0.7" />)}
        <path d="M13 44 L13 21 Q23 11 33 21 L33 44 Z" fill="#4488cc" opacity="0.07" />
      </>}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SPRITE COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

function KaelSprite({ direction, walking }: { direction: Direction; walking: boolean }) {
  const walkStyle = walking
    ? { animation: "kael-bob 0.28s ease-in-out infinite" }
    : { animation: "kael-idle-glow 2.4s ease-in-out infinite" };

  if (direction === "up") {
    return (
      <svg width="36" height="52" viewBox="0 0 36 52" style={walkStyle}>
        <ellipse cx="18" cy="50" rx="9" ry="2.5" fill="rgba(0,0,0,0.45)" />
        <path d="M9 20 C7 30 5 43 7 49 L29 49 C31 43 29 30 27 20 Z" fill="#12101e" />
        <path d="M14 22 L13 48" stroke="#1e1a30" strokeWidth="1.5" fill="none" />
        <path d="M22 22 L23 48" stroke="#1e1a30" strokeWidth="1.5" fill="none" />
        <path d="M7 49 L29 49" stroke="#f5a623" strokeWidth="1.5" />
        <circle cx="18" cy="34" r="6" fill="none" stroke="#f5a623" strokeWidth="1" opacity="0.45" />
        <circle cx="18" cy="34" r="2" fill="none" stroke="#f5a623" strokeWidth="0.7" opacity="0.35" />
        <path d="M12 34 L24 34 M18 28 L18 40" stroke="#f5a623" strokeWidth="0.7" opacity="0.3" />
        <circle cx="7" cy="34" r="5.5" fill="#1a1a3a" />
        <circle cx="7" cy="34" r="5.5" stroke="#3344bb" strokeWidth="1.2" fill="none" />
        <circle cx="5.5" cy="32" r="1.2" fill="rgba(0,0,0,0.7)" />
        <circle cx="8" cy="31" r="0.9" fill="rgba(0,0,0,0.7)" />
        <path d="M9 20 C7 12 9 3 18 1 C27 3 29 12 27 20 Z" fill="#12101e" />
        <path d="M12 8 C14 2 18 0 18 0 C18 0 22 2 24 8" fill="#0e0c1a" />
      </svg>
    );
  }
  if (direction === "left" || direction === "right") {
    const flip = direction === "left";
    return (
      <svg width="36" height="52" viewBox="0 0 36 52"
        style={{ ...walkStyle, transform: flip ? "scaleX(-1)" : undefined, display: "block" }}>
        <ellipse cx="18" cy="50" rx="9" ry="2.5" fill="rgba(0,0,0,0.45)" />
        <path d="M10 20 C8 30 7 43 9 49 L26 49 C28 43 27 30 26 20 Z" fill="#12101e" />
        <path d="M9 26 C5 30 4 40 7 47 L9 49" fill="#0e0c1a" />
        <path d="M9 49 L26 49" stroke="#f5a623" strokeWidth="1.5" />
        <circle cx="26" cy="33" r="5.5" fill="#1a1a3a" />
        <circle cx="26" cy="33" r="5.5" stroke="#3344bb" strokeWidth="1.2" fill="none" />
        <circle cx="24.5" cy="31" r="1.2" fill="rgba(0,0,0,0.7)" />
        <circle cx="27" cy="30" r="0.9" fill="rgba(0,0,0,0.7)" />
        <path d="M24 22 C27 26 28 30 26 33" stroke="#12101e" strokeWidth="4" strokeLinecap="round" />
        <path d="M10 20 C9 12 11 3 18 1 C22 1 24 5 24 12 C24 16 22 18 21 20 Z" fill="#12101e" />
        <path d="M13 18 C12 12 13 5 18 3 C21 4 22 8 22 12 C22 15 21 17 20 18 Z" fill="#0a0818" />
        <circle cx="19" cy="11" r="2.1" fill="#f5a623" opacity="0.88" />
        <circle cx="19" cy="11" r="0.9" fill="#1a0000" />
        <path d="M14 18 C16 15 18 14 20 14 C21 15 22 17 22 18" stroke="#f5a623" strokeWidth="1.2" fill="none" />
      </svg>
    );
  }
  return (
    <svg width="36" height="52" viewBox="0 0 36 52" style={walkStyle}>
      <ellipse cx="18" cy="50" rx="9" ry="2.5" fill="rgba(0,0,0,0.45)" />
      <path d="M9 20 C7 30 5 43 7 49 L29 49 C31 43 29 30 27 20 Z" fill="#12101e" />
      <path d="M14 22 L13 48" stroke="#1e1a30" strokeWidth="1.5" fill="none" />
      <path d="M22 22 L23 48" stroke="#1e1a30" strokeWidth="1.5" fill="none" />
      <path d="M9 20 L18 24 L27 20" stroke="#f5a623" strokeWidth="1.4" fill="none" />
      <path d="M7 49 L29 49" stroke="#f5a623" strokeWidth="1.5" />
      <path d="M9 22 C6 28 5 34 6 38" stroke="#12101e" strokeWidth="5" strokeLinecap="round" />
      <path d="M27 22 C30 28 31 34 30 38" stroke="#12101e" strokeWidth="5" strokeLinecap="round" />
      <circle cx="6" cy="38" r="5.5" fill="#1a1a3a" />
      <circle cx="6" cy="38" r="5.5" stroke="#3344bb" strokeWidth="1.2" fill="none" />
      <circle cx="4.5" cy="36" r="1.2" fill="rgba(0,0,0,0.7)" />
      <circle cx="7" cy="35" r="0.9" fill="rgba(0,0,0,0.7)" />
      <circle cx="6" cy="38" r="5.5" fill="rgba(60,80,200,0.14)" />
      <path d="M9 20 C7 12 9 4 14 1 C16 0 18 0 18 0 C18 0 20 0 22 1 C27 4 29 12 27 20 Z" fill="#12101e" />
      <path d="M11 18 C10 12 12 5 15 3 C16 2 18 2 18 2 C18 2 20 2 21 3 C24 5 26 12 25 18 Z" fill="#0a0818" />
      <circle cx="14" cy="12" r="2.2" fill="#f5a623" opacity="0.9" />
      <circle cx="22" cy="12" r="2.2" fill="#f5a623" opacity="0.9" />
      <circle cx="14" cy="12" r="1" fill="#1a0000" />
      <circle cx="22" cy="12" r="1" fill="#1a0000" />
      <path d="M9 20 C11 16 14 14 18 14 C22 14 25 16 27 20" stroke="#f5a623" strokeWidth="1.4" fill="none" />
    </svg>
  );
}

function ImpSprite() {
  return (
    <svg width="28" height="38" viewBox="0 0 28 38"
      style={{ animation: "imp-bounce .5s ease-in-out infinite, imp-glow 1.6s ease-in-out infinite" }}>
      <ellipse cx="14" cy="37.5" rx="6" ry="1.5" fill="rgba(0,0,0,0.55)" />
      <path d="M8 18 C2 12 0 6 3 8 C5 10 6 14 7 17" fill="#1a0800" opacity="0.85" />
      <path d="M20 18 C26 12 28 6 25 8 C23 10 22 14 21 17" fill="#1a0800" opacity="0.85" />
      <path d="M8 18 C4 11 2 7 3 8" stroke="#2d0a00" strokeWidth="0.7" fill="none" opacity="0.9" />
      <path d="M7 17 C5 13 3 10 4 11" stroke="#2d0a00" strokeWidth="0.5" fill="none" opacity="0.7" />
      <path d="M20 18 C24 11 26 7 25 8" stroke="#2d0a00" strokeWidth="0.7" fill="none" opacity="0.9" />
      <path d="M21 17 C23 13 25 10 24 11" stroke="#2d0a00" strokeWidth="0.5" fill="none" opacity="0.7" />
      <path d="M14 30 C17 32 20 31 21 34 C22 36 20 37 19 36" stroke="#1f0800" strokeWidth="2" fill="none" strokeLinecap="round" />
      <polygon points="19,36 17,38 21,38 20,35" fill="#cc2200" opacity="0.9" />
      <path d="M10 18 C8 21 8 27 9 31 C10 34 12 35 14 35 C16 35 18 34 19 31 C20 27 20 21 18 18 Z" fill="#1a0800" />
      <path d="M12 20 C13 22 12 25 13 28 C14 30 13 32 14 33" stroke="#ff5500" strokeWidth="1.1" fill="none" opacity="0.85" />
      <path d="M13 22 C15 23 16 22 17 24" stroke="#ff7700" strokeWidth="0.7" fill="none" opacity="0.6" />
      <path d="M10 21 C12 20 14 20.5 16 20" stroke="#2a0a00" strokeWidth="1.2" fill="none" opacity="0.9" />
      <path d="M9.5 23 C11.5 22 14 22.5 16.5 22" stroke="#2a0a00" strokeWidth="1.1" fill="none" opacity="0.85" />
      <path d="M9.5 25.5 C11 24.5 14 25 16.5 24.5" stroke="#2a0a00" strokeWidth="1.1" fill="none" opacity="0.8" />
      <path d="M10 28 C12 27 14 27.5 16 27" stroke="#2a0a00" strokeWidth="1" fill="none" opacity="0.7" />
      <path d="M10 21 C12 20 14 20.5 16 20" stroke="#ff3300" strokeWidth="0.4" fill="none" opacity="0.4" />
      <path d="M9.5 25.5 C11 24.5 14 25 16.5 24.5" stroke="#ff4400" strokeWidth="0.4" fill="none" opacity="0.35" />
      <path d="M10 20 C6 19 3 22 2 26" stroke="#1a0800" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M10 20 C6 19 3 22 2 26" stroke="#ff4400" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.4" />
      <path d="M18 20 C22 18 25 21 26 25" stroke="#1a0800" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M18 20 C22 18 25 21 26 25" stroke="#ff4400" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.4" />
      <path d="M2 26 C1 28 1.5 30 2 30" stroke="#1a0800" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M26 25 C27 27 26.5 29 26 29" stroke="#1a0800" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M2 30 L-1 33" stroke="#661100" strokeWidth="1" strokeLinecap="round" />
      <path d="M2 30 L0.5 34" stroke="#661100" strokeWidth="1" strokeLinecap="round" />
      <path d="M2 30 L2.5 34.5" stroke="#661100" strokeWidth="1" strokeLinecap="round" />
      <path d="M2 30 L4 33.5" stroke="#661100" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M26 29 L29 32" stroke="#661100" strokeWidth="1" strokeLinecap="round" />
      <path d="M26 29 L27.5 33" stroke="#661100" strokeWidth="1" strokeLinecap="round" />
      <path d="M26 29 L25.5 33.5" stroke="#661100" strokeWidth="1" strokeLinecap="round" />
      <path d="M26 29 L24 32.5" stroke="#661100" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M11 32 C10 34 9 36 9 37" stroke="#1a0800" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M17 32 C18 34 19 36 19 37" stroke="#1a0800" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M9 37 L7 38 M9 37 L8.5 38 M9 37 L10.5 38" stroke="#441100" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M19 37 L17 38 M19 37 L18.5 38 M19 37 L20.5 38" stroke="#441100" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M8 12 C8 6 10 3 14 3 C18 3 20 6 20 12 C20 16 18 18 14 18 C10 18 8 16 8 12 Z" fill="#1a0800" />
      <path d="M9 13 C10 11 11 10 11 12" stroke="#0d0400" strokeWidth="1.5" fill="none" opacity="0.8" />
      <path d="M19 13 C18 11 17 10 17 12" stroke="#0d0400" strokeWidth="1.5" fill="none" opacity="0.8" />
      <path d="M14 8 C13 10 14 12 13 14 C12 16 13 17 14 17" stroke="#ff5500" strokeWidth="0.9" fill="none" opacity="0.9" />
      <path d="M10 7 C7 4 5 0 6 -1 C7 -2 8 1 9 3 C9.5 4.5 10 6 10 7" fill="#0d0400" />
      <path d="M10 7 C8 4 7 1 7.5 0 C8 -0.5 8.5 2 9.5 4" fill="#1a0800" opacity="0.5" />
      <path d="M9 5 C8 4 7.5 2 8 1" stroke="#ff3300" strokeWidth="0.4" fill="none" opacity="0.5" />
      <path d="M18 7 C21 4 23 0 22 -1 C21 -2 20 1 19 3 C18.5 4.5 18 6 18 7" fill="#0d0400" />
      <path d="M18 7 C20 4 21 1 20.5 0 C20 -0.5 19.5 2 18.5 4" fill="#1a0800" opacity="0.5" />
      <path d="M19 5 C20 4 20.5 2 20 1" stroke="#ff3300" strokeWidth="0.4" fill="none" opacity="0.5" />
      <ellipse cx="11" cy="11" rx="2.8" ry="2.5" fill="#050100" />
      <ellipse cx="17" cy="11" rx="2.8" ry="2.5" fill="#050100" />
      <ellipse cx="11" cy="11" rx="2.8" ry="2.5" fill="none" stroke="#2a0800" strokeWidth="0.8" />
      <ellipse cx="17" cy="11" rx="2.8" ry="2.5" fill="none" stroke="#2a0800" strokeWidth="0.8" />
      <circle cx="11" cy="11" r="0.9" fill="#ff0000" opacity="0.9" />
      <circle cx="17" cy="11" r="0.9" fill="#ff0000" opacity="0.9" />
      <circle cx="11" cy="11" r="1.6" fill="none" stroke="#cc0000" strokeWidth="0.4" opacity="0.5" />
      <circle cx="17" cy="11" r="1.6" fill="none" stroke="#cc0000" strokeWidth="0.4" opacity="0.5" />
      <path d="M10 15.5 C12 17 16 17 18 15.5" fill="#0d0400" />
      <path d="M10.5 15.5 L10 17 M12 15.5 L11.5 17.5 M13.5 15.5 L14 17.5 M15 15.5 L15.5 17 M16.5 15.5 L17 17.5 M17.5 15.5 L18 16.5" stroke="#c8b08a" strokeWidth="0.9" strokeLinecap="square" />
      <path d="M11 16 C12.5 17.5 15.5 17.5 17 16" stroke="#ff4400" strokeWidth="0.5" fill="none" opacity="0.6" />
      <circle cx="7" cy="14" r="1.5" fill="#111" opacity="0.3" />
      <circle cx="6" cy="11" r="1.8" fill="#111" opacity="0.2" />
      <circle cx="21" cy="13" r="1.4" fill="#111" opacity="0.28" />
      <circle cx="22" cy="10" r="1.7" fill="#111" opacity="0.18" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PETE BOSS SPRITE
// ═══════════════════════════════════════════════════════════════════════

function PeteBossSprite() {
  return (
    <svg width="60" height="80" viewBox="0 0 60 80"
      style={{ animation: "pete-bob 1.2s ease-in-out infinite, pete-glow 1.8s ease-in-out infinite" }}>
      <ellipse cx="30" cy="79" rx="20" ry="4.5" fill="rgba(0,0,0,0.7)" />
      <circle cx="8"  cy="38" r="5"   fill="#1a0800" opacity="0.45" />
      <circle cx="6"  cy="32" r="5.5" fill="#1a0800" opacity="0.32" />
      <circle cx="7"  cy="26" r="6"   fill="#111"    opacity="0.22" />
      <circle cx="5"  cy="20" r="6.5" fill="#111"    opacity="0.14" />
      <circle cx="52" cy="38" r="5"   fill="#1a0800" opacity="0.45" />
      <circle cx="54" cy="32" r="5.5" fill="#1a0800" opacity="0.32" />
      <circle cx="53" cy="26" r="6"   fill="#111"    opacity="0.22" />
      <circle cx="55" cy="20" r="6.5" fill="#111"    opacity="0.14" />
      <path d="M10 56 C9 60 9 68 10 74 C11 77 14 78 17 77 C20 76 21 72 21 68 C21 62 20 57 18 55 Z" fill="#1a0800" />
      <path d="M12 60 C13 64 12 68 13 72" stroke="#ff5500" strokeWidth="1.3" fill="none" opacity="0.8" />
      <path d="M12 63 C14 64 15 63 16 65" stroke="#ff7700" strokeWidth="0.8" fill="none" opacity="0.6" />
      <path d="M42 55 C40 57 39 62 39 68 C39 72 40 76 43 77 C46 78 49 77 50 74 C51 68 51 60 50 56 Z" fill="#1a0800" />
      <path d="M48 60 C47 64 48 68 47 72" stroke="#ff5500" strokeWidth="1.3" fill="none" opacity="0.8" />
      <path d="M8 74 C7 78 10 80 14 80 C18 80 21 78 21 75" fill="#0d0400" />
      <path d="M39 75 C39 78 42 80 46 80 C50 80 53 78 52 74" fill="#0d0400" />
      <path d="M8 36 C5 42 5 52 8 58 C10 62 14 64 18 64 C22 65 26 65 30 65 C34 65 38 65 42 64 C46 63 50 62 52 58 C55 52 55 42 52 36 C50 31 44 28 36 27 C30 26 24 26 18 27 C12 28 10 31 8 36 Z" fill="#1c0b00" />
      <path d="M10 40 C8 45 9 53 12 58" stroke="#0d0400" strokeWidth="2.5" fill="none" opacity="0.7" />
      <path d="M50 40 C52 45 51 53 48 58" stroke="#0d0400" strokeWidth="2.5" fill="none" opacity="0.7" />
      <path d="M30 30 C28 36 30 42 28 48 C27 52 28 58 30 62" stroke="#ff6600" strokeWidth="2.5" fill="none" opacity="0.9" />
      <path d="M30 30 C28 36 30 42 28 48 C27 52 28 58 30 62" stroke="#ffaa00" strokeWidth="0.9" fill="none" opacity="0.7" />
      <path d="M28 36 C24 35 20 37 18 40" stroke="#ff5500" strokeWidth="1.6" fill="none" opacity="0.8" />
      <path d="M18 40 C16 41 14 40 12 42" stroke="#ff4400" strokeWidth="1.2" fill="none" opacity="0.7" />
      <path d="M28 44 C24 44 20 46 17 48" stroke="#ff5500" strokeWidth="1.4" fill="none" opacity="0.75" />
      <path d="M30 38 C34 37 38 39 40 41" stroke="#ff5500" strokeWidth="1.6" fill="none" opacity="0.8" />
      <path d="M40 41 C42 42 44 41 46 43" stroke="#ff4400" strokeWidth="1.2" fill="none" opacity="0.7" />
      <path d="M30 46 C34 46 38 48 41 50" stroke="#ff5500" strokeWidth="1.3" fill="none" opacity="0.75" />
      <circle cx="18" cy="40" r="2.5" fill="#ff7700" opacity="0.5" />
      <circle cx="40" cy="41" r="2.5" fill="#ff7700" opacity="0.5" />
      <circle cx="30" cy="46" r="3"   fill="#ffaa00" opacity="0.35" />
      <path d="M10 40 C2 36 -2 46 0 54"  stroke="#1c0b00" strokeWidth="13" strokeLinecap="round" fill="none" />
      <path d="M10 40 C2 36 -2 46 0 54"  stroke="#0d0400" strokeWidth="9"  strokeLinecap="round" fill="none" />
      <path d="M6 38 C2 42 1 48 2 52"    stroke="#ff5500" strokeWidth="1.2" fill="none" opacity="0.75" />
      <path d="M50 40 C58 36 62 46 60 54" stroke="#1c0b00" strokeWidth="13" strokeLinecap="round" fill="none" />
      <path d="M50 40 C58 36 62 46 60 54" stroke="#0d0400" strokeWidth="9"  strokeLinecap="round" fill="none" />
      <path d="M54 38 C58 42 59 48 58 52" stroke="#ff5500" strokeWidth="1.2" fill="none" opacity="0.75" />
      <path d="M-2 52 C-4 54 -3 60 0 62 C3 63 7 62 8 59 C9 56 7 51 4 50 C2 49 0 50 -2 52 Z" fill="#1a0800" />
      <path d="M-1 54 C0 58 1 60 2 61"  stroke="#ff5500" strokeWidth="1.1" fill="none" opacity="0.8" />
      <path d="M-2 52 C0 51 2 51 4 52"  stroke="#0d0400" strokeWidth="1.5" fill="none" opacity="0.8" />
      <path d="M62 52 C64 54 63 60 60 62 C57 63 53 62 52 59 C51 56 53 51 56 50 C58 49 60 50 62 52 Z" fill="#1a0800" />
      <path d="M61 54 C60 58 59 60 58 61" stroke="#ff5500" strokeWidth="1.1" fill="none" opacity="0.8" />
      <path d="M62 52 C60 51 58 51 56 52" stroke="#0d0400" strokeWidth="1.5" fill="none" opacity="0.8" />
      <path d="M20 26 C18 22 18 18 20 16 C24 14 36 14 40 16 C42 18 42 22 40 26 Z" fill="#1c0b00" />
      <path d="M10 14 C9 8 11 3 16 1 C20 -1 26 -2 30 -2 C34 -2 40 -1 44 1 C49 3 51 8 50 14 C51 20 50 26 46 28 C40 30 34 31 30 31 C26 31 20 30 14 28 C10 26 9 20 10 14 Z" fill="#1c0b00" />
      <path d="M30 2 C28 6 30 10 28 14 C26 18 27 22 28 26" stroke="#ff6600" strokeWidth="2"   fill="none" opacity="0.9" />
      <path d="M30 2 C28 6 30 10 28 14 C26 18 27 22 28 26" stroke="#ffaa00" strokeWidth="0.7" fill="none" opacity="0.65" />
      <path d="M28 8 C24 8 20 10 18 13"  stroke="#ff5500" strokeWidth="1.4" fill="none" opacity="0.8" />
      <path d="M30 12 C34 11 38 12 40 15" stroke="#ff5500" strokeWidth="1.4" fill="none" opacity="0.75" />
      <path d="M13 6 C8 2 2 2 1 7 C0 11 3 16 8 17 C10 18 12 17 13 15 C14 13 13 10 12 8 C13 7 13 6 13 6 Z" fill="#0d0400" />
      <path d="M13 6 C9 3 4 3 3 7 C2 10 5 14 9 15" fill="#1a0800" opacity="0.6" />
      <path d="M12 7 C8 4 3 5 2 8"   stroke="#2a0a00" strokeWidth="1.5" fill="none" opacity="0.9" />
      <path d="M10 7 C7 8 4 10 3 12" stroke="#ff4400" strokeWidth="0.7" fill="none" opacity="0.5" />
      <path d="M47 6 C52 2 58 2 59 7 C60 11 57 16 52 17 C50 18 48 17 47 15 C46 13 47 10 48 8 C47 7 47 6 47 6 Z" fill="#0d0400" />
      <path d="M47 6 C51 3 56 3 57 7 C58 10 55 14 51 15" fill="#1a0800" opacity="0.6" />
      <path d="M48 7 C52 4 57 5 58 8"  stroke="#2a0a00" strokeWidth="1.5" fill="none" opacity="0.9" />
      <path d="M50 7 C53 8 56 10 57 12" stroke="#ff4400" strokeWidth="0.7" fill="none" opacity="0.5" />
      <ellipse cx="21" cy="14" rx="5" ry="4.5" fill="#050000" />
      <ellipse cx="39" cy="14" rx="5" ry="4.5" fill="#050000" />
      <ellipse cx="21" cy="14" rx="3" ry="2.8" fill="#4a1200" />
      <ellipse cx="39" cy="14" rx="3" ry="2.8" fill="#4a1200" />
      <ellipse cx="21" cy="14" rx="1.8" ry="1.7" fill="#cc4400" />
      <ellipse cx="39" cy="14" rx="1.8" ry="1.7" fill="#cc4400" />
      <ellipse cx="21" cy="14" rx="0.7" ry="2" fill="#ff8800" />
      <ellipse cx="39" cy="14" rx="0.7" ry="2" fill="#ff8800" />
      <path d="M16 22 C18 26 24 29 30 29 C36 29 42 26 44 22 C40 24 36 25 30 25 C24 25 20 24 16 22 Z" fill="#1a0000" />
      <path d="M18 23 C22 27 28 28.5 30 28.5 C32 28.5 38 27 42 23" fill="#cc3300" opacity="0.6" />
      <path d="M22 24.5 C26 27 29 27.5 30 27.5 C31 27.5 34 27 38 24.5" fill="#ff8800" opacity="0.4" />
      <path d="M17 22 L15 26 M20 23 L18.5 27.5 M24 24 L23 28 M28 24.5 L27.5 28.5 M32 24.5 L32.5 28.5 M36 24 L37 28 M40 23 L41.5 27.5 M43 22 L45 26" stroke="#2a0a00" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

function NPCSprite() {
  return (
    <svg width="26" height="44" viewBox="0 0 26 44"
      style={{ animation: "npc-idle 3.2s ease-in-out infinite" }}>
      <ellipse cx="13" cy="43" rx="6" ry="1.8" fill="rgba(0,0,0,0.4)" />
      <path d="M7 18 C5 27 5 37 6 41 L20 41 C21 37 21 27 19 18 Z" fill="#4a3020" />
      <path d="M10 20 L9 40" stroke="#3a2015" strokeWidth="1" fill="none" />
      <rect x="6" y="29" width="14" height="2.5" rx="1" fill="#2a1a0a" />
      <rect x="11" y="29" width="4"  height="2.5" rx="0.5" fill="#8a6040" />
      <path d="M7 20 C4 24 4 31 5 34"  stroke="#4a3020" strokeWidth="4" strokeLinecap="round" />
      <path d="M19 20 C22 24 22 31 21 34" stroke="#4a3020" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="13" cy="11" rx="7" ry="7.5" fill="#8a6040" />
      <path d="M6 9 C7 4 9 2 13 2 C17 2 19 4 20 9" fill="#3a2010" />
      <circle cx="10.5" cy="10" r="1.3" fill="#2a1a00" />
      <circle cx="15.5" cy="10" r="1.3" fill="#2a1a00" />
      <path d="M10 14 Q13 16 16 14" stroke="#3a1a00" strokeWidth="0.8" fill="none" />
      <path d="M7 18 L13 20 L19 18" stroke="#5a3a20" strokeWidth="2" fill="none" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DUNGEON DECORATION COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

function TorchFlame({ x, y }: { x: number; y: number }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 22, pointerEvents: "none" }}>
      <div style={{ width: 6, height: 20, background: "#2a1a00", border: "1px solid #3a2a10", margin: "0 auto", borderRadius: "1px" }} />
      <div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)" }}>
        <svg width="22" height="30" viewBox="0 0 22 30" overflow="visible"
          style={{ animation: "flame-flicker .42s ease-in-out infinite", transformOrigin: "bottom center", display: "block" }}>
          <path d="M11 2 C7 5 3 11 4 17 C5 23 9 27 11 29 C13 27 17 23 18 17 C19 11 15 5 11 2Z" fill="#ff6600" />
          <path d="M11 7 C8 10 6 15 7 19 C8 23 10 26 11 28 C12 26 14 23 15 19 C16 15 14 10 11 7Z" fill="#ffaa00" />
          <path d="M11 13 C9 15 9 19 10 21 C10.5 23 11 25 11 25 C11 25 11.5 23 12 21 C13 19 13 15 11 13Z" fill="#ffeeaa" opacity=".88" />
          <ellipse cx="11" cy="21" rx="6" ry="3.5" fill="#ff8800" opacity=".28" />
        </svg>
      </div>
      <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", width: 50, height: 16, background: "radial-gradient(ellipse, rgba(255,120,0,.22) 0%, transparent 70%)", animation: "torch-light-pulse 1.2s ease-in-out infinite" }} />
    </div>
  );
}

function DungeonEntrance() {
  return (
    <div style={{ position: "absolute", left: DUNGEON_ENTRANCE.x, top: DUNGEON_ENTRANCE.y, width: DUNGEON_ENTRANCE.w, height: DUNGEON_ENTRANCE.h, border: "3px solid #cc2200", borderRadius: "50% 50% 0 0 / 40% 40% 0 0", background: "radial-gradient(ellipse at 50% 0%, rgba(150,30,0,.95) 0%, rgba(20,0,0,1) 60%)", animation: "dungeon-pulse 2s ease-in-out infinite", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: 8, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 4, border: "1px solid rgba(220,80,0,.4)", borderRadius: "50% 50% 0 0 / 40% 40% 0 0", pointerEvents: "none" }} />
      <div style={{ color: "#ff4400", fontSize: 8, fontFamily: "monospace", fontWeight: "bold", letterSpacing: "0.12em", textShadow: "0 0 8px #ff4400" }}>FURNACE LANES</div>
      <div style={{ fontSize: 22, marginTop: 4, filter: "drop-shadow(0 0 8px #ff4400)" }}>🔥</div>
      <div style={{ color: "#880000", fontSize: 7, fontFamily: "monospace", marginTop: 2, letterSpacing: "0.08em" }}>ENTER?</div>
    </div>
  );
}

function DungeonExitDoor() {
  return (
    <div style={{ position: "absolute", left: 0, top: 370, width: 52, height: 100, background: "linear-gradient(90deg,#0a2810 0%,#081e0c 100%)", border: "2px solid #00cc44", borderLeft: "none", borderRadius: "0 6px 6px 0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, animation: "exit-pulse 2.2s ease-in-out infinite", cursor: "pointer" }}>
      <div style={{ color: "#00cc44", fontSize: 7, fontFamily: "monospace", fontWeight: "bold", letterSpacing: "0.12em", textShadow: "0 0 6px #00cc44", writingMode: "vertical-lr", transform: "rotate(180deg)" }}>EXIT</div>
      <div style={{ color: "#00cc44", fontSize: 18, filter: "drop-shadow(0 0 5px #00cc44)", transform: "rotate(180deg)" }}>→</div>
    </div>
  );
}

function CrackedPillar({ x, y }: { x: number; y: number }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 28, height: 80, background: "linear-gradient(180deg,#2a1800 0%,#1e1200 50%,#2a1800 100%)", border: "1px solid #3a2200", borderRadius: "3px", animation: "pillar-glow 3s ease-in-out infinite", pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <svg width="28" height="80" viewBox="0 0 28 80">
          <path d="M14 5 L12 20 L16 35 L11 55 L15 75" stroke="#0a0600" strokeWidth="1.2" fill="none" opacity="0.7" />
          <path d="M12 20 L8 28 M16 35 L20 42"        stroke="#0a0600" strokeWidth="0.8" fill="none" opacity="0.5" />
        </svg>
      </div>
      <div style={{ position: "absolute", top: 0,  left: -3, right: -3, height: 8, background: "#3a2200", borderRadius: "2px 2px 0 0" }} />
      <div style={{ position: "absolute", bottom: 0, left: -3, right: -3, height: 8, background: "#3a2200" }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// WORLD MAP VIEW
// ═══════════════════════════════════════════════════════════════════════

interface WorldMapProps {
  initialKaelPos: KaelPos;
  kaelStats: { hp: number; maxHp: number; ap: number; maxAp: number };
  completedBosses: string[];
  unlockedGates: string[];
  mockSTK: number;
  onEnterLocation: (locationId: string, fromPos: KaelPos) => void;
  onShowLockedMsg: (msg: string) => void;
}

function WorldMapView({ initialKaelPos, kaelStats, completedBosses, unlockedGates, mockSTK, onEnterLocation, onShowLockedMsg }: WorldMapProps) {
  const kaelPosRef   = useRef<KaelPos>({ ...initialKaelPos });
  const kaelDirRef   = useRef<Direction>("down");
  const kaelWalkRef  = useRef(false);
  const keysRef      = useRef(new Set<string>());
  const inTransRef   = useRef(false);
  const lockedCoolRef= useRef(false);
  const rafRef       = useRef(0);

  const completedRef = useRef(completedBosses);
  const unlockedRef  = useRef(unlockedGates);
  const onEnterRef   = useRef(onEnterLocation);
  const onLockedRef  = useRef(onShowLockedMsg);
  useEffect(() => { completedRef.current = completedBosses; }, [completedBosses]);
  useEffect(() => { unlockedRef.current  = unlockedGates;   }, [unlockedGates]);
  useEffect(() => { onEnterRef.current   = onEnterLocation; }, [onEnterLocation]);
  useEffect(() => { onLockedRef.current  = onShowLockedMsg; }, [onShowLockedMsg]);

  const [kaelPos,     setKaelPos]     = useState<KaelPos>({ ...initialKaelPos });
  const [kaelDir,     setKaelDir]     = useState<Direction>("down");
  const [kaelWalking, setKaelWalking] = useState(false);
  const [nearLocName, setNearLocName] = useState<string | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    keysRef.current.add(e.code);
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space","KeyW","KeyA","KeyS","KeyD"].includes(e.code)) e.preventDefault();
  };
  const handleKeyUp = (e: React.KeyboardEvent) => { keysRef.current.delete(e.code); };

  useEffect(() => { viewportRef.current?.focus(); }, []);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      if (inTransRef.current) return;
      frame++;
      const keys = keysRef.current;
      const pos  = kaelPosRef.current;

      let dx = 0, dy = 0;
      if (keys.has("ArrowLeft")  || keys.has("KeyA")) dx -= KAEL_SPEED;
      if (keys.has("ArrowRight") || keys.has("KeyD")) dx += KAEL_SPEED;
      if (keys.has("ArrowUp")    || keys.has("KeyW")) dy -= KAEL_SPEED;
      if (keys.has("ArrowDown")  || keys.has("KeyS")) dy += KAEL_SPEED;
      if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

      pos.x = Math.max(20, Math.min(WMAP_W - 60, pos.x + dx));
      pos.y = Math.max(50, Math.min(1550,          pos.y + dy));

      let newDir = kaelDirRef.current;
      if      (Math.abs(dx) > Math.abs(dy)) newDir = dx < 0 ? "left" : "right";
      else if (dy !== 0)                    newDir = dy < 0 ? "up"   : "down";
      kaelDirRef.current  = newDir;
      kaelWalkRef.current = dx !== 0 || dy !== 0;

      const kaelCX = pos.x + KAEL_W / 2;
      const kaelCY = pos.y + KAEL_H * 0.75;

      let nearestLoc: LocationData | null = null;
      let nearestDist = Infinity;
      for (const loc of WORLD_LOCATIONS) {
        const dist = Math.hypot(kaelCX - (loc.x + 22), kaelCY - (loc.y + 22));
        if (dist < nearestDist) { nearestDist = dist; nearestLoc = loc; }
      }

      // Near label (within 110px)
      const displayName = nearestDist < 110 && nearestLoc ? nearestLoc.name : null;

      // Auto-enter (within 44px)
      if (nearestDist < 44 && nearestLoc) {
        const isAccessible = !nearestLoc.defaultLocked
          || unlockedRef.current.includes(nearestLoc.id)
          || (nearestLoc.unlockKey ? completedRef.current.includes(nearestLoc.unlockKey) : false);

        if (isAccessible) {
          inTransRef.current = true;
          onEnterRef.current(nearestLoc.id, { x: pos.x, y: pos.y });
          return;
        } else if (!lockedCoolRef.current) {
          lockedCoolRef.current = true;
          onLockedRef.current(nearestLoc.lockMsg ?? "LOCKED");
          setTimeout(() => { lockedCoolRef.current = false; }, 3000);
        }
      }

      if (frame % 2 === 0) {
        setKaelPos({ x: pos.x, y: pos.y });
        setKaelDir(newDir);
        setKaelWalking(kaelWalkRef.current);
        setNearLocName(displayName);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); };
  }, []);

  const camX = Math.max(0, Math.min(WMAP_W - VIEW_W, kaelPos.x - VIEW_W / 2 + KAEL_W / 2));
  const camY = Math.max(0, Math.min(WMAP_H - VIEW_H, kaelPos.y - VIEW_H / 2 + KAEL_H / 2));
  const hpPct = kaelStats.hp / kaelStats.maxHp;
  const apPct = kaelStats.ap / kaelStats.maxAp;
  const MM_W = 120; const MM_H = 70;
  const mmSX = MM_W / WMAP_W; const mmSY = MM_H / WMAP_H;

  return (
    <div style={{ position: "relative", userSelect: "none" }}>
      <div ref={viewportRef} tabIndex={0} onKeyDown={handleKeyDown} onKeyUp={handleKeyUp}
        style={{ width: VIEW_W, height: VIEW_H, overflow: "hidden", position: "relative", outline: "none", border: "2px solid #1a2a3a", borderRadius: 4, cursor: "default", maxWidth: "100%" }}>

        {/* WORLD */}
        <div style={{ width: WMAP_W, height: WMAP_H, position: "absolute", transform: `translate(${-camX}px,${-camY}px)`, willChange: "transform" }}>

          {/* Terrain gradient south→north */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #1a0300 0%, #280500 6%, #1e0900 14%, #160e08 26%, #0f1218 42%, #0a1530 58%, #0d1a3a 74%, #122045 88%, #1a2b5c 100%)" }} />
          {/* Volcanic south glow */}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 700, background: "radial-gradient(ellipse at 50% 100%, rgba(180,40,0,.22) 0%, transparent 65%)", animation: "ambient-pulse 5s ease-in-out infinite", pointerEvents: "none" }} />
          {/* Ice north shimmer */}
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 600, background: "radial-gradient(ellipse at 50% 0%, rgba(40,120,200,.12) 0%, transparent 70%)", animation: "town-warm 4s ease-in-out infinite", pointerEvents: "none" }} />
          {/* Subtle lane grid */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(90deg,rgba(255,200,80,.012) 0px,rgba(255,200,80,.012) 1px,transparent 1px,transparent 120px),repeating-linear-gradient(0deg,rgba(255,200,80,.01) 0px,rgba(255,200,80,.01) 1px,transparent 1px,transparent 120px)", pointerEvents: "none" }} />

          {/* Path SVG */}
          <svg width={WMAP_W} height={WMAP_H} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} overflow="visible">
            <defs>
              <linearGradient id="pathGrad" x1="0" y1="1" x2="0" y2="0" gradientUnits="objectBoundingBox">
                <stop offset="0%"   stopColor="#8a4820" stopOpacity="0.6" />
                <stop offset="45%"  stopColor="#6a6050" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#3a80bb" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            <path d="M 200 1500 L 380 1350 L 410 1250 L 530 1240 L 610 1340 L 680 1200 L 700 1050 L 720 880 L 745 660 L 765 480 L 790 350 L 800 300 L 880 255 L 1000 205"
              fill="none" stroke="url(#pathGrad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="12 5" />
          </svg>

          {/* Lava pools (south) */}
          {LAVA_POOLS.map((p, i) => (
            <div key={i} style={{ position: "absolute", left: p.x - p.rx, top: p.y - p.ry, width: p.rx * 2, height: p.ry * 2 }}>
              <svg width={p.rx*2} height={p.ry*2} viewBox={`0 0 ${p.rx*2} ${p.ry*2}`} style={{ animation: `wmap-lava ${2+i*0.3}s ease-in-out ${i*0.4}s infinite` }}>
                <ellipse cx={p.rx} cy={p.ry} rx={p.rx} ry={p.ry} fill="#cc3300" opacity="0.45" />
                <ellipse cx={p.rx} cy={p.ry} rx={p.rx*0.7} ry={p.ry*0.6} fill="#ff6600" opacity="0.35" />
                <ellipse cx={p.rx} cy={p.ry} rx={p.rx*0.35} ry={p.ry*0.3} fill="#ff8800" opacity="0.3" />
              </svg>
            </div>
          ))}

          {/* Snow particles (north) */}
          {SNOW_PARTICLES.map((s, i) => (
            <div key={i} style={{ position: "absolute", left: s.x, top: s.y, width: s.size, height: s.size, borderRadius: "50%", background: "#b8d8f0", boxShadow: "0 0 3px #88bbee", animation: `wmap-snow ${s.dur}s linear ${s.delay}s infinite`, pointerEvents: "none" }} />
          ))}

          {/* Ice crystals (north) */}
          {ICE_CRYSTALS.map((c, i) => (
            <svg key={i} width="12" height="18" viewBox="0 0 12 18" style={{ position: "absolute", left: c.x, top: c.y, pointerEvents: "none", opacity: 0.55 }}>
              <path d="M6 0 L6 18 M0 9 L12 9 M2 3 L10 15 M10 3 L2 15" stroke="#88ccee" strokeWidth="1.2" fill="none" />
            </svg>
          ))}

          {/* Volcanic rocks (south) */}
          {VOLCANIC_ROCKS.map((r, i) => (
            <svg key={i} width="32" height="20" viewBox="0 0 32 20" style={{ position: "absolute", left: r.x, top: r.y, pointerEvents: "none" }}>
              <path d="M2 18 C4 10 8 6 12 8 C14 4 18 2 22 6 C26 4 30 10 30 18 Z" fill="#1a0800" />
              <path d="M10 14 C12 10 14 12 16 10 C18 12 20 10 22 14" stroke="#ff4400" strokeWidth="0.8" fill="none" opacity="0.4" />
            </svg>
          ))}

          {/* Location icons */}
          {WORLD_LOCATIONS.map((loc) => {
            const isLocked = loc.defaultLocked
              && !unlockedGates.includes(loc.id)
              && !(loc.unlockKey && completedBosses.includes(loc.unlockKey));
            return (
              <div key={loc.id} style={{ position: "absolute", left: loc.x, top: loc.y }}>
                {loc.type === "town"    && <TownIcon    locked={isLocked} />}
                {loc.type === "dungeon" && <DungeonIcon locked={isLocked} />}
                {loc.type === "gate"    && <GateIcon    locked={isLocked} />}
                <div style={{ textAlign: "center", fontSize: 7, fontFamily: "monospace", color: isLocked ? "#334455" : "#c8a060", marginTop: 2, letterSpacing: "0.06em", whiteSpace: "nowrap", textShadow: isLocked ? "none" : "0 0 6px rgba(200,160,80,.4)" }}>
                  {loc.name}
                </div>
              </div>
            );
          })}

          {/* Kael */}
          <div style={{ position: "absolute", left: kaelPos.x, top: kaelPos.y }}>
            <KaelSprite direction={kaelDir} walking={kaelWalking} />
          </div>
        </div>

        {/* HUD */}
        {/* HP/AP top-left */}
        <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(8,4,0,.82)", border: "1px solid rgba(245,166,35,.35)", borderRadius: 3, padding: "5px 8px", fontFamily: "monospace", fontSize: 9, pointerEvents: "none" }}>
          <div style={{ color: "#666", marginBottom: 3, fontSize: 8, letterSpacing: "0.1em" }}>KAEL</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
            <span style={{ color: "#666", width: 14 }}>HP</span>
            <div style={{ width: 64, height: 6, background: "#1a0800", border: "1px solid #222", borderRadius: 1, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.max(0, hpPct*100)}%`, background: hpPct > 0.5 ? "#00cc44" : hpPct > 0.25 ? "#ccaa00" : "#cc2200", transition: "width .4s" }} />
            </div>
            <span style={{ color: hpPct > 0.5 ? "#00cc44" : hpPct > 0.25 ? "#ccaa00" : "#cc2200", fontSize: 8 }}>{kaelStats.hp}/{kaelStats.maxHp}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ color: "#666", width: 14 }}>AP</span>
            <div style={{ width: 64, height: 6, background: "#000d1a", border: "1px solid #222", borderRadius: 1, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.max(0, apPct*100)}%`, background: "#4488ff", transition: "width .4s" }} />
            </div>
            <span style={{ color: "#4488ff", fontSize: 8 }}>{kaelStats.ap}/{kaelStats.maxAp}</span>
          </div>
        </div>

        {/* Near location name — top center */}
        {nearLocName && (
          <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", background: "rgba(8,4,0,.82)", border: "1px solid rgba(245,166,35,.35)", borderRadius: 3, padding: "4px 12px", fontFamily: "monospace", fontSize: 10, fontWeight: "bold", color: "#f5a623", letterSpacing: "0.1em", textShadow: "0 0 8px rgba(245,166,35,.5)", pointerEvents: "none", whiteSpace: "nowrap" }}>
            {nearLocName}
          </div>
        )}

        {/* STK top-right */}
        <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(8,4,0,.82)", border: "1px solid rgba(245,166,35,.35)", borderRadius: 3, padding: "5px 8px", fontFamily: "monospace", fontSize: 9, color: "#f5a623", pointerEvents: "none" }}>
          <div style={{ color: "#555", fontSize: 8, marginBottom: 2 }}>STK</div>
          <div style={{ fontWeight: "bold" }}>{mockSTK}</div>
        </div>

        {/* Mini-map bottom-right */}
        <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(4,2,0,.9)", border: "1px solid rgba(245,166,35,.3)", borderRadius: 3, padding: 4, pointerEvents: "none" }}>
          <div style={{ fontSize: 7, fontFamily: "monospace", color: "#444", marginBottom: 2 }}>WORLD</div>
          <div style={{ position: "relative", width: MM_W, height: MM_H, background: "#060300", border: "1px solid #1a1000", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(100,20,0,.2) 0%, transparent 50%, rgba(20,60,140,.15) 100%)" }} />
            {WORLD_LOCATIONS.map(loc => {
              const isLocked = loc.defaultLocked && !unlockedGates.includes(loc.id) && !(loc.unlockKey && completedBosses.includes(loc.unlockKey));
              return <div key={loc.id} style={{ position: "absolute", width: 5, height: 5, borderRadius: "50%", background: isLocked ? "#334455" : loc.type === "town" ? "#ff9933" : loc.type === "dungeon" ? "#cc2200" : "#ff6600", left: loc.x * mmSX - 2.5, top: loc.y * mmSY - 2.5, boxShadow: isLocked ? "none" : `0 0 4px currentColor` }} />;
            })}
            <div style={{ position: "absolute", width: 4, height: 4, borderRadius: "50%", background: "#ffffff", left: kaelPos.x * mmSX - 2, top: kaelPos.y * mmSY - 2, boxShadow: "0 0 4px #fff" }} />
          </div>
        </div>

        {/* Controls hint bottom-left */}
        <div style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(8,4,0,.7)", border: "1px solid rgba(245,166,35,.2)", borderRadius: 3, padding: "4px 7px", fontFamily: "monospace", fontSize: 7, color: "#444", pointerEvents: "none", lineHeight: 1.7 }}>
          <div>WASD / ↑↓←→ move</div>
          <div>Walk into locations to enter</div>
        </div>
      </div>
      <div style={{ fontSize: 9, fontFamily: "monospace", color: "#3a2a1a", marginTop: 4, textAlign: "center" }}>Click map to capture input</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ASHWICK TOWN VIEW
// ═══════════════════════════════════════════════════════════════════════

const SHOP_ITEMS = [
  { id: "potion",    name: "Health Potion", desc: "Restore 60 HP",  cost: 30, icon: "🧪" },
  { id: "ap_potion", name: "AP Crystal",    desc: "Restore 20 AP",  cost: 25, icon: "💎" },
];

type TownAction =
  | { type: "restore_hp_ap" }
  | { type: "buy_item"; itemId: string }
  | { type: "exit" };

interface AshwickProps {
  kaelStats: { hp: number; maxHp: number; ap: number; maxAp: number };
  mockSTK: number;
  inventory: Inventory;
  onAction: (a: TownAction) => void;
}

function AshwickTownView({ kaelStats, mockSTK, inventory, onAction }: AshwickProps) {
  const kaelPosRef  = useRef({ x: 380, y: 280 });
  const kaelDirRef  = useRef<Direction>("down");
  const kaelWalkRef = useRef(false);
  const keysRef     = useRef(new Set<string>());
  const inTransRef  = useRef(false);
  const rafRef      = useRef(0);

  const [kaelPos,     setKaelPos]     = useState({ x: 380, y: 280 });
  const [kaelDir,     setKaelDir]     = useState<Direction>("down");
  const [kaelWalking, setKaelWalking] = useState(false);
  const [nearNPC,     setNearNPC]     = useState<"inn" | "shop" | null>(null);
  const [innState,    setInnState]    = useState<"none" | "offer" | "done" | "poor">("none");
  const [shopOpen,    setShopOpen]    = useState(false);
  const [buyMsg,      setBuyMsg]      = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const onActionRef = useRef(onAction);
  useEffect(() => { onActionRef.current = onAction; }, [onAction]);

  const INN_POS  = { x: 140, y: 300 };
  const SHOP_POS = { x: 400, y: 300 };
  const EXIT_Y   = 430;

  useEffect(() => { viewportRef.current?.focus(); }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    keysRef.current.add(e.code);
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space","KeyW","KeyA","KeyS","KeyD","KeyE"].includes(e.code)) e.preventDefault();
    if ((e.code === "KeyE" || e.code === "Space") && !shopOpen) {
      if (nearNPC === "inn"  && innState === "none")  setInnState("offer");
      if (nearNPC === "shop") setShopOpen(true);
    }
    if (e.code === "Escape") { setInnState("none"); setShopOpen(false); }
  };
  const handleKeyUp = (e: React.KeyboardEvent) => { keysRef.current.delete(e.code); };

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      if (inTransRef.current) return;
      frame++;
      const keys = keysRef.current;
      const pos  = kaelPosRef.current;
      let dx = 0, dy = 0;
      if (keys.has("ArrowLeft")  || keys.has("KeyA")) dx -= KAEL_SPEED;
      if (keys.has("ArrowRight") || keys.has("KeyD")) dx += KAEL_SPEED;
      if (keys.has("ArrowUp")    || keys.has("KeyW")) dy -= KAEL_SPEED;
      if (keys.has("ArrowDown")  || keys.has("KeyS")) dy += KAEL_SPEED;
      if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

      pos.x = Math.max(30, Math.min(VIEW_W - 60, pos.x + dx));
      pos.y = Math.max(60, Math.min(460,          pos.y + dy));

      let newDir = kaelDirRef.current;
      if      (Math.abs(dx) > Math.abs(dy)) newDir = dx < 0 ? "left" : "right";
      else if (dy !== 0)                    newDir = dy < 0 ? "up"   : "down";
      kaelDirRef.current  = newDir;
      kaelWalkRef.current = dx !== 0 || dy !== 0;

      const cx = pos.x + KAEL_W / 2;
      const cy = pos.y + KAEL_H * 0.75;

      // Exit south
      if (cy > EXIT_Y) {
        inTransRef.current = true;
        onActionRef.current({ type: "exit" });
        return;
      }

      // NPC proximity
      const innDist  = Math.hypot(cx - (INN_POS.x  + 13), cy - (INN_POS.y  + 40));
      const shopDist = Math.hypot(cx - (SHOP_POS.x + 13), cy - (SHOP_POS.y + 40));
      const near = innDist < 68 ? "inn" : shopDist < 68 ? "shop" : null;

      if (frame % 2 === 0) {
        setKaelPos({ x: pos.x, y: pos.y });
        setKaelDir(newDir);
        setKaelWalking(kaelWalkRef.current);
        setNearNPC(near);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); };
  }, []);

  const handleInnYes = () => {
    if (mockSTK < 50) { setInnState("poor"); return; }
    onActionRef.current({ type: "restore_hp_ap" });
    setInnState("done");
    setTimeout(() => setInnState("none"), 2000);
  };

  const handleBuy = (itemId: string, cost: number) => {
    if (mockSTK < cost) { setBuyMsg("Not enough STK!"); setTimeout(() => setBuyMsg(null), 1800); return; }
    onActionRef.current({ type: "buy_item", itemId });
    setBuyMsg("Purchased!"); setTimeout(() => setBuyMsg(null), 1400);
  };

  const hpPct = kaelStats.hp / kaelStats.maxHp;
  const apPct = kaelStats.ap / kaelStats.maxAp;

  return (
    <div style={{ position: "relative", userSelect: "none" }}>
      <div ref={viewportRef} tabIndex={0} onKeyDown={handleKeyDown} onKeyUp={handleKeyUp}
        style={{ width: VIEW_W, height: VIEW_H, overflow: "hidden", position: "relative", outline: "none", border: "2px solid #3a2800", borderRadius: 4, cursor: "default" }}>

        {/* Town background — dark stone */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 40% 60%, #1e1408 0%, #110e06 40%, #090704 100%)" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(90deg,rgba(200,150,40,.018) 0,rgba(200,150,40,.018) 1px,transparent 1px,transparent 60px),repeating-linear-gradient(0deg,rgba(200,150,40,.015) 0,rgba(200,150,40,.015) 1px,transparent 1px,transparent 60px)", pointerEvents: "none" }} />
        {/* Ambient warm glow */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, rgba(180,100,20,.08) 0%, transparent 65%)", animation: "town-warm 4s ease-in-out infinite", pointerEvents: "none" }} />
        {/* Floor */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 80, background: "linear-gradient(0deg,#1a1008 0%,transparent 100%)", pointerEvents: "none" }} />
        {/* Exit south */}
        <div style={{ position: "absolute", left: "50%", bottom: 0, transform: "translateX(-50%)", width: 100, height: 50, background: "linear-gradient(0deg,#0a2810 0%,transparent 100%)", border: "2px solid #00cc44", borderBottom: "none", borderRadius: "6px 6px 0 0", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 8 }}>
          <span style={{ color: "#00cc44", fontSize: 7, fontFamily: "monospace", fontWeight: "bold", letterSpacing: "0.1em", textShadow: "0 0 6px #00cc44" }}>EXIT SOUTH</span>
        </div>

        {/* INN building */}
        <div style={{ position: "absolute", left: 50, top: 90, width: 200, height: 180 }}>
          <div style={{ width: "100%", height: "100%", background: "#1e1208", border: "2px solid #4a3010", borderRadius: "4px 4px 0 0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: 10 }}>
            <div style={{ color: "#f5a623", fontSize: 9, fontFamily: "monospace", fontWeight: "bold", letterSpacing: "0.15em", textShadow: "0 0 8px #f5a623" }}>THE EMBER INN</div>
            <div style={{ marginTop: 8, fontSize: 22, filter: "drop-shadow(0 0 6px #ff8800)" }}>🏠</div>
            <div style={{ color: "#664422", fontSize: 7, fontFamily: "monospace", marginTop: 4 }}>Rest & Restore</div>
          </div>
          {/* Door */}
          <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 36, height: 50, background: "#0d0600", border: "1px solid #4a3010", borderBottom: "none", borderRadius: "18px 18px 0 0" }} />
          {/* Windows */}
          <div style={{ position: "absolute", top: 40, left: 20, width: 32, height: 24, background: "#ff8800", opacity: 0.25, borderRadius: 2 }} />
          <div style={{ position: "absolute", top: 40, right: 20, width: 32, height: 24, background: "#ff8800", opacity: 0.25, borderRadius: 2 }} />
        </div>

        {/* SHOP building */}
        <div style={{ position: "absolute", left: 310, top: 110, width: 200, height: 160 }}>
          <div style={{ width: "100%", height: "100%", background: "#1a1208", border: "2px solid #4a3010", borderRadius: "4px 4px 0 0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: 10 }}>
            <div style={{ color: "#f5a623", fontSize: 9, fontFamily: "monospace", fontWeight: "bold", letterSpacing: "0.15em", textShadow: "0 0 8px #f5a623" }}>GRUNDLE'S GOODS</div>
            <div style={{ marginTop: 8, fontSize: 22, filter: "drop-shadow(0 0 4px #f5a623)" }}>🛒</div>
            <div style={{ color: "#664422", fontSize: 7, fontFamily: "monospace", marginTop: 4 }}>Potions & Supplies</div>
          </div>
          <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 32, height: 42, background: "#0d0600", border: "1px solid #4a3010", borderBottom: "none", borderRadius: "16px 16px 0 0" }} />
          <div style={{ position: "absolute", top: 40, left: 20, width: 28, height: 20, background: "#ff8800", opacity: 0.2, borderRadius: 2 }} />
          <div style={{ position: "absolute", top: 40, right: 20, width: 28, height: 20, background: "#ff8800", opacity: 0.2, borderRadius: 2 }} />
        </div>

        {/* Decorative house */}
        <div style={{ position: "absolute", left: 575, top: 100, width: 170, height: 160, background: "#181008", border: "2px solid #3a2808", borderRadius: "4px 4px 0 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ color: "#443322", fontSize: 8, fontFamily: "monospace", textAlign: "center" }}>ABANDONED<br/>DWELLING</div>
        </div>

        {/* Innkeeper NPC */}
        <div style={{ position: "absolute", left: INN_POS.x, top: INN_POS.y }}>
          {nearNPC === "inn" && (
            <div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", color: "#f5a623", fontSize: 13, fontWeight: "bold", fontFamily: "monospace", textShadow: "0 0 6px #f5a623", animation: "npc-exclaim .7s ease-in-out infinite", whiteSpace: "nowrap", marginBottom: 2 }}>!</div>
          )}
          <NPCSprite />
          <div style={{ textAlign: "center", fontSize: 7, fontFamily: "monospace", color: "#8a6040", marginTop: 1, whiteSpace: "nowrap" }}>Innkeeper</div>
        </div>

        {/* Shopkeeper NPC */}
        <div style={{ position: "absolute", left: SHOP_POS.x, top: SHOP_POS.y }}>
          {nearNPC === "shop" && (
            <div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", color: "#f5a623", fontSize: 13, fontWeight: "bold", fontFamily: "monospace", textShadow: "0 0 6px #f5a623", animation: "npc-exclaim .7s ease-in-out infinite", whiteSpace: "nowrap", marginBottom: 2 }}>!</div>
          )}
          <NPCSprite />
          <div style={{ textAlign: "center", fontSize: 7, fontFamily: "monospace", color: "#8a6040", marginTop: 1, whiteSpace: "nowrap" }}>Shopkeeper</div>
        </div>

        {/* Kael */}
        <div style={{ position: "absolute", left: kaelPos.x, top: kaelPos.y }}>
          <KaelSprite direction={kaelDir} walking={kaelWalking} />
        </div>

        {/* HUD */}
        <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(8,4,0,.82)", border: "1px solid rgba(245,166,35,.35)", borderRadius: 3, padding: "5px 8px", fontFamily: "monospace", fontSize: 9, pointerEvents: "none" }}>
          <div style={{ color: "#555", fontSize: 8, marginBottom: 3 }}>KAEL</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
            <span style={{ color: "#555", width: 14 }}>HP</span>
            <div style={{ width: 60, height: 5, background: "#1a0800", borderRadius: 1, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.max(0,hpPct*100)}%`, background: hpPct > 0.5 ? "#00cc44" : "#cc2200" }} />
            </div>
            <span style={{ color: "#888", fontSize: 8 }}>{kaelStats.hp}/{kaelStats.maxHp}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ color: "#555", width: 14 }}>AP</span>
            <div style={{ width: 60, height: 5, background: "#000d1a", borderRadius: 1, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.max(0,apPct*100)}%`, background: "#4488ff" }} />
            </div>
            <span style={{ color: "#4488ff", fontSize: 8 }}>{kaelStats.ap}/{kaelStats.maxAp}</span>
          </div>
        </div>
        <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", background: "rgba(8,4,0,.82)", border: "1px solid rgba(245,166,35,.35)", borderRadius: 3, padding: "4px 12px", fontFamily: "monospace", fontSize: 10, fontWeight: "bold", color: "#f5a623", letterSpacing: "0.1em", pointerEvents: "none" }}>ASHWICK TOWN</div>
        <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(8,4,0,.82)", border: "1px solid rgba(245,166,35,.35)", borderRadius: 3, padding: "5px 8px", fontFamily: "monospace", fontSize: 9, color: "#f5a623", pointerEvents: "none" }}>
          <div style={{ color: "#555", fontSize: 8, marginBottom: 2 }}>STK</div>
          <div style={{ fontWeight: "bold" }}>{mockSTK}</div>
        </div>
        <div style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(8,4,0,.7)", border: "1px solid rgba(245,166,35,.2)", borderRadius: 3, padding: "4px 7px", fontFamily: "monospace", fontSize: 7, color: "#444", pointerEvents: "none", lineHeight: 1.6 }}>
          <div>WASD move · E interact</div>
          <div>Walk south to exit</div>
        </div>

        {/* Inn dialogue */}
        {innState === "offer" && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(8,4,0,.96)", border: "2px solid #f5a623", borderBottom: "none", borderRadius: "4px 4px 0 0", padding: "10px 14px", fontFamily: "monospace" }}>
            <div style={{ fontSize: 9, color: "#f5a623", fontWeight: "bold", marginBottom: 5 }}>Innkeeper</div>
            <div style={{ fontSize: 11, color: "#ddc890", marginBottom: 8 }}>"Restore your HP and AP, traveller? That'll be 50 STK."</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={handleInnYes} style={{ background: "rgba(0,80,20,.8)", border: "1px solid #00cc44", borderRadius: 3, padding: "5px 14px", color: "#00cc44", fontFamily: "monospace", fontSize: 11, cursor: "pointer" }}>YES (50 STK)</button>
              <button type="button" onClick={() => setInnState("none")} style={{ background: "rgba(60,20,0,.8)", border: "1px solid #884400", borderRadius: 3, padding: "5px 14px", color: "#aa6633", fontFamily: "monospace", fontSize: 11, cursor: "pointer" }}>NO</button>
            </div>
          </div>
        )}
        {innState === "done" && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(8,4,0,.96)", border: "2px solid #00cc44", borderBottom: "none", borderRadius: "4px 4px 0 0", padding: "10px 14px", fontFamily: "monospace" }}>
            <div style={{ fontSize: 11, color: "#00cc44" }}>✓ HP and AP restored. Rest well, traveller.</div>
          </div>
        )}
        {innState === "poor" && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(8,4,0,.96)", border: "2px solid #cc4400", borderBottom: "none", borderRadius: "4px 4px 0 0", padding: "10px 14px", fontFamily: "monospace" }}>
            <div style={{ fontSize: 11, color: "#cc4400" }}>"Not enough STK. Come back when you're not broke."</div>
            <button type="button" onClick={() => setInnState("none")} style={{ marginTop: 6, background: "rgba(60,20,0,.8)", border: "1px solid #884400", borderRadius: 3, padding: "4px 10px", color: "#aa6633", fontFamily: "monospace", fontSize: 10, cursor: "pointer" }}>Close</button>
          </div>
        )}

        {/* Shop overlay */}
        {shopOpen && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#100c06", border: "2px solid #f5a623", borderRadius: 6, padding: "16px 20px", minWidth: 280, fontFamily: "monospace", animation: "shop-in .18s ease-out forwards" }}>
              <div style={{ color: "#f5a623", fontSize: 12, fontWeight: "bold", letterSpacing: "0.12em", marginBottom: 12 }}>GRUNDLE'S GOODS</div>
              <div style={{ color: "#555", fontSize: 8, marginBottom: 10 }}>Your STK: <span style={{ color: "#f5a623" }}>{mockSTK}</span> &nbsp;|&nbsp; Potions: {inventory.potions} &nbsp;|&nbsp; AP Crystals: {inventory.apPotions}</div>
              {SHOP_ITEMS.map(item => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #2a1a00" }}>
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#ddc890", fontSize: 11 }}>{item.name}</div>
                    <div style={{ color: "#665540", fontSize: 9 }}>{item.desc}</div>
                  </div>
                  <button type="button" onClick={() => handleBuy(item.id, item.cost)}
                    style={{ background: mockSTK >= item.cost ? "rgba(80,50,0,.8)" : "rgba(20,10,0,.6)", border: `1px solid ${mockSTK >= item.cost ? "#aa7700" : "#332200"}`, borderRadius: 3, padding: "4px 10px", color: mockSTK >= item.cost ? "#f5a623" : "#443322", fontFamily: "monospace", fontSize: 10, cursor: mockSTK >= item.cost ? "pointer" : "not-allowed" }}>
                    {item.cost} STK
                  </button>
                </div>
              ))}
              {buyMsg && <div style={{ color: buyMsg === "Purchased!" ? "#00cc44" : "#cc4400", fontSize: 10, marginTop: 8 }}>{buyMsg}</div>}
              <button type="button" onClick={() => setShopOpen(false)} style={{ marginTop: 12, width: "100%", background: "rgba(40,20,0,.8)", border: "1px solid #4a3010", borderRadius: 3, padding: "6px", color: "#8a6040", fontFamily: "monospace", fontSize: 10, cursor: "pointer" }}>CLOSE</button>
            </div>
          </div>
        )}
      </div>
      <div style={{ fontSize: 9, fontFamily: "monospace", color: "#3a2a1a", marginTop: 4, textAlign: "center" }}>Click town to capture input</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DUNGEON VIEW  (Ember Alleys interior — modified from original OverworldView)
// ═══════════════════════════════════════════════════════════════════════

interface DungeonViewProps {
  kaelStats: { hp: number; maxHp: number; ap: number; maxAp: number };
  initialImps: ImpState[];
  onImpsChange: (imps: ImpState[]) => void;
  completedBosses: string[];
  onEnterCombat: (type: "imp" | "pete") => void;
  onExitDungeon: () => void;
}

function DungeonView({ kaelStats, initialImps, onImpsChange, completedBosses, onEnterCombat, onExitDungeon }: DungeonViewProps) {
  const kaelPosRef   = useRef({ x: KAEL_SPAWN.x, y: KAEL_SPAWN.y });
  const kaelDirRef   = useRef<Direction>("down");
  const kaelWalkRef  = useRef(false);
  const keysRef      = useRef(new Set<string>());
  const impsRef      = useRef<ImpState[]>(initialImps.map(i => ({ ...i })));
  const rafRef       = useRef(0);
  const inCombatRef  = useRef(false);
  const nearNPCIdRef = useRef<string | null>(null);

  const onEnterCombatRef = useRef(onEnterCombat);
  const onExitRef        = useRef(onExitDungeon);
  const onImpsChangeRef  = useRef(onImpsChange);
  useEffect(() => { onEnterCombatRef.current = onEnterCombat; }, [onEnterCombat]);
  useEffect(() => { onExitRef.current        = onExitDungeon;  }, [onExitDungeon]);
  useEffect(() => { onImpsChangeRef.current  = onImpsChange;   }, [onImpsChange]);

  const [kaelPos,     setKaelPos]     = useState({ x: KAEL_SPAWN.x, y: KAEL_SPAWN.y });
  const [kaelDir,     setKaelDir]     = useState<Direction>("down");
  const [kaelWalking, setKaelWalking] = useState(false);
  const [imps,        setImps]        = useState<ImpState[]>(initialImps.map(i => ({ ...i })));
  const [nearNPC,     setNearNPC]     = useState<string | null>(null);
  const [dialogueNPC, setDialogueNPC] = useState<string | null>(null);
  const [dialogueLine,setDialogueLine]= useState(0);

  const viewportRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    keysRef.current.add(e.code);
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space","KeyW","KeyA","KeyS","KeyD"].includes(e.code)) e.preventDefault();
    if (e.code === "KeyE" || e.code === "Space") {
      const npcId = nearNPCIdRef.current;
      if (npcId && !dialogueNPC) { setDialogueNPC(npcId); setDialogueLine(0); }
      else if (dialogueNPC) {
        const npc = NPC_DATA.find(n => n.id === dialogueNPC);
        if (npc && dialogueLine < npc.dialogue.length - 1) setDialogueLine(l => l + 1);
        else { setDialogueNPC(null); setDialogueLine(0); }
      }
    }
  };
  const handleKeyUp = (e: React.KeyboardEvent) => { keysRef.current.delete(e.code); };

  useEffect(() => { viewportRef.current?.focus(); }, []);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      if (inCombatRef.current) return;
      frame++;
      const keys = keysRef.current;
      const pos  = kaelPosRef.current;

      let dx = 0, dy = 0;
      if (keys.has("ArrowLeft")  || keys.has("KeyA")) dx -= KAEL_SPEED;
      if (keys.has("ArrowRight") || keys.has("KeyD")) dx += KAEL_SPEED;
      if (keys.has("ArrowUp")    || keys.has("KeyW")) dy -= KAEL_SPEED;
      if (keys.has("ArrowDown")  || keys.has("KeyS")) dy += KAEL_SPEED;
      if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

      pos.x = Math.max(20, Math.min(WORLD_W - 60, pos.x + dx));
      pos.y = Math.max(BOUND_TOP, Math.min(BOUND_BOTTOM, pos.y + dy));

      let newDir = kaelDirRef.current;
      if      (Math.abs(dx) > Math.abs(dy)) newDir = dx < 0 ? "left" : "right";
      else if (dy !== 0)                    newDir = dy < 0 ? "up"   : "down";
      kaelDirRef.current  = newDir;
      kaelWalkRef.current = dx !== 0 || dy !== 0;

      const impsData = impsRef.current;
      for (let i = 0; i < impsData.length; i++) {
        const imp = impsData[i];
        if (!imp.alive) continue;
        imp.changeTimer--;
        if (imp.changeTimer <= 0) {
          const angle = Math.random() * Math.PI * 2;
          imp.dx = Math.cos(angle) * IMP_SPEED;
          imp.dy = Math.sin(angle) * IMP_SPEED;
          imp.changeTimer = 90 + Math.floor(Math.random() * 110);
        }
        const zone = IMP_ZONES[i];
        imp.x += imp.dx; imp.y += imp.dy;
        if (imp.x < zone[0] || imp.x > zone[1]) { imp.dx *= -1; imp.x = Math.max(zone[0], Math.min(zone[1], imp.x)); }
        if (imp.y < zone[2] || imp.y > zone[3]) { imp.dy *= -1; imp.y = Math.max(zone[2], Math.min(zone[3], imp.y)); }
      }

      const kaelCX = pos.x + KAEL_W / 2;
      const kaelCY = pos.y + KAEL_H * 0.75;

      // Exit door (west side)
      if (pos.x < 58 && kaelCY >= 370 && kaelCY <= 470) {
        inCombatRef.current = true;
        onImpsChangeRef.current(impsRef.current.map(i => ({ ...i })));
        onExitRef.current();
        return;
      }

      // Imp collisions
      for (const imp of impsData) {
        if (!imp.alive) continue;
        if (Math.hypot(kaelCX - (imp.x + 14), kaelCY - (imp.y + 30)) < 36) {
          inCombatRef.current = true;
          imp.alive = false;
          onImpsChangeRef.current(impsRef.current.map(i => ({ ...i })));
          onEnterCombatRef.current("imp");
          return;
        }
      }

      // Pete collision (only if not already defeated)
      if (!completedBosses.includes("cinder_pete")) {
        if (Math.hypot(kaelCX - (PETE_POS.x + 30), kaelCY - (PETE_POS.y + 60)) < 58) {
          inCombatRef.current = true;
          onImpsChangeRef.current(impsRef.current.map(i => ({ ...i })));
          onEnterCombatRef.current("pete");
          return;
        }
        // Dungeon entrance also triggers Pete
        const dungCX = DUNGEON_ENTRANCE.x + DUNGEON_ENTRANCE.w / 2;
        const dungCY = DUNGEON_ENTRANCE.y + DUNGEON_ENTRANCE.h * 0.75;
        if (Math.hypot(kaelCX - dungCX, kaelCY - dungCY) < 62) {
          inCombatRef.current = true;
          onImpsChangeRef.current(impsRef.current.map(i => ({ ...i })));
          onEnterCombatRef.current("pete");
          return;
        }
      }

      // NPC proximity
      let newNearNPC: string | null = null;
      for (const npc of NPC_DATA) {
        if (Math.hypot(kaelCX - (npc.x + 13), kaelCY - (npc.y + 40)) < 64) { newNearNPC = npc.id; break; }
      }
      if (newNearNPC !== nearNPCIdRef.current) {
        nearNPCIdRef.current = newNearNPC;
        setNearNPC(newNearNPC);
        if (!newNearNPC) { setDialogueNPC(null); setDialogueLine(0); }
      }

      if (frame % 2 === 0) {
        setKaelPos({ x: pos.x, y: pos.y });
        setKaelDir(newDir);
        setKaelWalking(kaelWalkRef.current);
        setImps(impsData.map(i => ({ ...i })));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      onImpsChangeRef.current(impsRef.current.map(i => ({ ...i })));
    };
  }, []);

  const camX = Math.max(0, Math.min(WORLD_W - VIEW_W, kaelPos.x - VIEW_W / 2 + KAEL_W / 2));
  const camY = Math.max(0, Math.min(WORLD_H - VIEW_H, kaelPos.y - VIEW_H / 2 + KAEL_H / 2));
  const activeNPCData = dialogueNPC ? NPC_DATA.find(n => n.id === dialogueNPC) : null;
  const hpPct = kaelStats.hp / kaelStats.maxHp;
  const apPct = kaelStats.ap / kaelStats.maxAp;
  const MM_W = 120; const MM_H = 68; const mmScale = MM_W / WORLD_W;

  return (
    <div style={{ position: "relative", userSelect: "none" }}>
      <div ref={viewportRef} tabIndex={0} onKeyDown={handleKeyDown} onKeyUp={handleKeyUp}
        style={{ width: VIEW_W, height: VIEW_H, overflow: "hidden", position: "relative", outline: "none", border: "2px solid #3a1800", borderRadius: 4, cursor: "default", maxWidth: "100%" }}>

        <div style={{ width: WORLD_W, height: WORLD_H, position: "absolute", transform: `translate(${-camX}px,${-camY}px)`, willChange: "transform" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 25% 50%, #2a0e00 0%, #180800 35%, #0d0400 65%, #050200 100%)" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 60% 80%, rgba(180,50,0,.18) 0%, transparent 55%)", animation: "ambient-pulse 4s ease-in-out infinite" }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(90deg,rgba(255,100,0,.025) 0px,rgba(255,100,0,.025) 1px,transparent 1px,transparent 80px),repeating-linear-gradient(0deg,rgba(255,100,0,.02) 0px,rgba(255,100,0,.02) 1px,transparent 1px,transparent 80px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: BOUND_TOP, background: "linear-gradient(180deg,#060200 0%,#100600 70%,transparent 100%)", borderBottom: "2px solid #2a1000" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: WORLD_H - BOUND_BOTTOM, background: "linear-gradient(0deg,#060200 0%,#100600 70%,transparent 100%)", borderTop: "2px solid #2a1000" }} />
          {TORCHES.map((t, i) => <TorchFlame key={i} x={t.x} y={t.y} />)}
          {EMBERS.map((e, i) => (
            <div key={i} style={{ position: "absolute", left: e.x, top: e.y, width: 3, height: 3, borderRadius: "50%", background: i % 2 === 0 ? "#ff8800" : "#ffaa44", boxShadow: "0 0 3px #ff6600", animation: `${e.anim} ${e.dur}s ease-out ${e.delay}s infinite`, pointerEvents: "none" }} />
          ))}
          {TORCHES.slice(0, 6).map((t, i) => (
            <div key={i} style={{ position: "absolute", left: t.x + 8, top: t.y - 10, width: 12, height: 12, borderRadius: "50%", background: "rgba(80,40,20,.35)", animation: `smoke-drift ${3.5 + i * 0.4}s ease-out ${i * 0.6}s infinite`, pointerEvents: "none", filter: "blur(4px)" }} />
          ))}
          {PILLARS.map((p, i) => <CrackedPillar key={i} x={p.x} y={p.y} />)}
          {/* Exit door — west side */}
          <DungeonExitDoor />
          {NPC_DATA.map(npc => (
            <div key={npc.id} style={{ position: "absolute", left: npc.x, top: npc.y, width: 26 }}>
              {nearNPC === npc.id && <div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", color: "#f5a623", fontSize: 13, fontWeight: "bold", fontFamily: "monospace", textShadow: "0 0 6px #f5a623", animation: "npc-exclaim .7s ease-in-out infinite", whiteSpace: "nowrap", marginBottom: 2 }}>!</div>}
              <NPCSprite />
              <div style={{ textAlign: "center", fontSize: 7, fontFamily: "monospace", color: "#8a6040", marginTop: 1, whiteSpace: "nowrap" }}>{npc.name}</div>
            </div>
          ))}
          {imps.map(imp => imp.alive ? (
            <div key={imp.id} style={{ position: "absolute", left: imp.x, top: imp.y }}>
              <ImpSprite />
              <div style={{ textAlign: "center", fontSize: 6, fontFamily: "monospace", color: "#cc4400", marginTop: 1 }}>Fire Imp</div>
            </div>
          ) : null)}
          {/* Pete or defeated marker */}
          {!completedBosses.includes("cinder_pete") ? (
            <div style={{ position: "absolute", left: PETE_POS.x, top: PETE_POS.y }}>
              <PeteBossSprite />
              <div style={{ textAlign: "center", fontSize: 7, fontFamily: "monospace", color: "#ff4400", marginTop: 2, letterSpacing: "0.06em", textShadow: "0 0 6px #ff4400", fontWeight: "bold" }}>CINDER PETE</div>
            </div>
          ) : (
            <div style={{ position: "absolute", left: PETE_POS.x + 5, top: PETE_POS.y + 30, fontFamily: "monospace", fontSize: 9, color: "#444", textShadow: "none" }}>💀 Defeated</div>
          )}
          <DungeonEntrance />
          <div style={{ position: "absolute", left: kaelPos.x, top: kaelPos.y }}>
            <KaelSprite direction={kaelDir} walking={kaelWalking} />
          </div>
        </div>

        {/* HUD */}
        <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(10,5,0,.82)", border: "1px solid rgba(245,166,35,.35)", borderRadius: 3, padding: "5px 8px", fontFamily: "monospace", fontSize: 9, pointerEvents: "none" }}>
          <div style={{ color: "#888", marginBottom: 3, fontSize: 8, letterSpacing: "0.1em" }}>KAEL</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
            <span style={{ color: "#666", width: 14 }}>HP</span>
            <div style={{ width: 64, height: 6, background: "#1a0800", border: "1px solid #222", borderRadius: 1, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.max(0,hpPct*100)}%`, background: hpPct > 0.5 ? "#00cc44" : hpPct > 0.25 ? "#ccaa00" : "#cc2200", transition: "width .4s" }} />
            </div>
            <span style={{ color: hpPct > 0.5 ? "#00cc44" : "#cc2200", fontSize: 8 }}>{kaelStats.hp}/{kaelStats.maxHp}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ color: "#666", width: 14 }}>AP</span>
            <div style={{ width: 64, height: 6, background: "#000d1a", border: "1px solid #222", borderRadius: 1, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.max(0,apPct*100)}%`, background: "#4488ff", transition: "width .4s" }} />
            </div>
            <span style={{ color: "#4488ff", fontSize: 8 }}>{kaelStats.ap}/{kaelStats.maxAp}</span>
          </div>
        </div>
        <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", background: "rgba(10,5,0,.75)", border: "1px solid rgba(245,166,35,.3)", borderRadius: 3, padding: "4px 12px", fontFamily: "monospace", fontSize: 9, fontWeight: "bold", color: "#f5a623", letterSpacing: "0.12em", pointerEvents: "none", whiteSpace: "nowrap" }}>
          FURNACE LANES — THE EMBER ALLEYS
        </div>
        <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(5,3,0,.88)", border: "1px solid rgba(245,166,35,.35)", borderRadius: 3, padding: 4, pointerEvents: "none" }}>
          <div style={{ fontSize: 7, fontFamily: "monospace", color: "#555", marginBottom: 2 }}>MAP</div>
          <div style={{ position: "relative", width: MM_W, height: MM_H, background: "#0d0500", border: "1px solid #2a1000", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, rgba(180,50,0,.1) 0%, transparent 70%)" }} />
            {!completedBosses.includes("cinder_pete") && <div style={{ position: "absolute", width: 5, height: 5, borderRadius: "50%", background: "#ff4400", left: PETE_POS.x * mmScale - 2.5, top: PETE_POS.y * mmScale - 2.5, boxShadow: "0 0 3px #ff4400" }} />}
            <div style={{ position: "absolute", width: 5, height: 4, background: "#cc2200", left: DUNGEON_ENTRANCE.x * mmScale, top: DUNGEON_ENTRANCE.y * mmScale, borderRadius: 1 }} />
            {NPC_DATA.map(npc => <div key={npc.id} style={{ position: "absolute", width: 3, height: 3, borderRadius: "50%", background: "#f5a623", left: npc.x * mmScale - 1.5, top: npc.y * mmScale - 1.5 }} />)}
            {imps.map(imp => imp.alive ? <div key={imp.id} style={{ position: "absolute", width: 3, height: 3, borderRadius: "50%", background: "#ff6600", left: imp.x * mmScale - 1.5, top: imp.y * mmScale - 1.5 }} /> : null)}
            <div style={{ position: "absolute", width: 4, height: 4, borderRadius: "50%", background: "#ffffff", left: kaelPos.x * mmScale - 2, top: kaelPos.y * mmScale - 2, boxShadow: "0 0 3px #fff" }} />
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(10,5,0,.7)", border: "1px solid rgba(245,166,35,.2)", borderRadius: 3, padding: "4px 7px", fontFamily: "monospace", fontSize: 7, color: "#555", pointerEvents: "none", lineHeight: 1.6 }}>
          <div>WASD / ↑↓←→ move</div>
          <div>E / SPACE interact · ← EXIT west</div>
        </div>

        {activeNPCData && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(8,4,0,.94)", border: "2px solid #f5a623", borderBottom: "none", borderRadius: "4px 4px 0 0", padding: "10px 14px", fontFamily: "monospace" }}>
            <div style={{ fontSize: 9, color: "#f5a623", fontWeight: "bold", letterSpacing: "0.1em", marginBottom: 5 }}>{activeNPCData.name}</div>
            <div style={{ fontSize: 11, color: "#ddc890", lineHeight: 1.5 }}>{activeNPCData.dialogue[dialogueLine]}</div>
            <div style={{ fontSize: 8, color: "#444", marginTop: 5, textAlign: "right" }}>
              {dialogueLine < activeNPCData.dialogue.length - 1 ? "SPACE / E — next ▶" : "SPACE / E — close ✕"}
            </div>
          </div>
        )}
      </div>
      <div style={{ fontSize: 9, fontFamily: "monospace", color: "#4a3020", marginTop: 4, textAlign: "center" }}>Click map to capture keyboard input</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 3 COMPLETE — section 4 appends below (CombatView → main export)
// ═══════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// COMBAT CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const KAEL_INIT: CharStats = {
  name: "Kael", hp: 180, maxHp: 220, ap: 40, maxAp: 55,
  atk: 45, def: 35, mgk: 30, res: 20, spd: 42, lck: 10,
};

const PETE_INIT: CharStats = {
  name: "Cinder Pete", hp: 480, maxHp: 480, ap: 999, maxAp: 999,
  atk: 38, def: 22, mgk: 10, res: 15, spd: 40, lck: 5,
};

const IMP_ENEMY_INIT: CharStats = {
  name: "Fire Imp", hp: 120, maxHp: 120, ap: 999, maxAp: 999,
  atk: 22, def: 12, mgk: 6, res: 8, spd: 55, lck: 8,
};

const EQUIPPED_ULTIMATE = {
  name: "Basic Strike", rarity: "Common" as const,
  power: 3.0, redZonePct: 0.35, speed: 2.8,
};

const FROST_BOLT = { name: "Frost Bolt", apCost: 10, spellPower: 2.5, elemMult: 1.5 };

function physDmg(atk: number, def: number, weaponMod = 1.0): number {
  const v = 0.85 + Math.random() * 0.3;
  return Math.max(1, Math.floor((atk * weaponMod - def * 0.6) * v));
}

function magicDmg(mgk: number, res: number, spellPower: number, elemMult = 1.0): number {
  return Math.max(1, Math.floor((mgk * spellPower - res * 0.5) * elemMult));
}

function ultimateDmg(atk: number, power: number, result: GaugeResult): number {
  const mults: Record<GaugeResult, number> = { perfect: 1.5, strike: 1.0, partial: 0.5, fail: 0 };
  return Math.max(0, Math.floor(atk * power * mults[result]));
}

function rollCrit(lck: number): boolean {
  return Math.random() < Math.min(0.4, lck * 0.005 + 0.05);
}

// ── Strike Gauge canvas constants
const GW = 580;
const GBH = 56;
const GAH = 60;
const GCH = GBH + GAH;

function calcZones(redPct: number) {
  const center = GW / 2;
  const halfRed = (GW * redPct) / 2;
  const yellowW = GW * 0.13;
  return { y1End: center - halfRed - yellowW, rStart: center - halfRed, center, rEnd: center + halfRed, y2End: center + halfRed + yellowW };
}

function evalGauge(x: number, redPct: number): GaugeResult {
  const z = calcZones(redPct);
  if (x >= z.rStart && x <= z.rEnd) return Math.abs(x - z.center) <= 10 ? "perfect" : "strike";
  if ((x >= z.y1End && x < z.rStart) || (x > z.rEnd && x <= z.y2End)) return "partial";
  return "fail";
}

function drawGauge(ctx: CanvasRenderingContext2D, arrowX: number, redPct: number, frozen: boolean) {
  ctx.clearRect(0, 0, GW, GCH);
  const z = calcZones(redPct);
  ctx.fillStyle = "#0d0d1a"; ctx.fillRect(0, 0, GW, GBH);
  ctx.fillStyle = "#1e1e30"; ctx.fillRect(0, 0, z.y1End, GBH); ctx.fillRect(z.y2End, 0, GW - z.y2End, GBH);
  ctx.fillStyle = "#5a4500"; ctx.fillRect(z.y1End, 0, z.rStart - z.y1End, GBH); ctx.fillRect(z.rEnd, 0, z.y2End - z.rEnd, GBH);
  const rg = ctx.createLinearGradient(z.rStart, 0, z.rEnd, 0);
  rg.addColorStop(0, "#6a0000"); rg.addColorStop(0.5, "#cc2200"); rg.addColorStop(1, "#6a0000");
  ctx.fillStyle = rg; ctx.fillRect(z.rStart, 0, z.rEnd - z.rStart, GBH);
  ctx.save(); ctx.strokeStyle = "rgba(255,180,80,.65)"; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(z.center, 4); ctx.lineTo(z.center, GBH - 4); ctx.stroke(); ctx.restore();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const midY = GBH / 2;
  ctx.fillStyle = "#3a3a52"; ctx.font = "bold 10px monospace"; ctx.fillText("MISS", z.y1End / 2, midY); ctx.fillText("MISS", (z.y2End + GW) / 2, midY);
  ctx.fillStyle = "#b89400"; ctx.font = "bold 10px monospace"; ctx.fillText("PARTIAL", (z.y1End + z.rStart) / 2, midY); ctx.fillText("PARTIAL", (z.rEnd + z.y2End) / 2, midY);
  ctx.fillStyle = "#ff7755"; ctx.font = "bold 12px monospace"; ctx.fillText("STRIKE", z.center, midY);
  ctx.strokeStyle = "#333355"; ctx.lineWidth = 2; ctx.setLineDash([]); ctx.strokeRect(0, 0, GW, GBH);
  const ax = Math.round(arrowX);
  const stemTop = GBH + 4; const stemBot = GBH + 40;
  const aColor = frozen ? "#555577" : "#ffffff";
  ctx.strokeStyle = aColor; ctx.fillStyle = aColor; ctx.lineWidth = frozen ? 2 : 3;
  ctx.beginPath(); ctx.moveTo(ax, stemTop); ctx.lineTo(ax, stemBot); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ax, 2); ctx.lineTo(ax - 9, stemTop); ctx.lineTo(ax + 9, stemTop); ctx.closePath(); ctx.fill();
}

function hpColor(hp: number, maxHp: number): string {
  const pct = hp / maxHp;
  if (pct > 0.5) return "#00cc44";
  if (pct > 0.25) return "#ccaa00";
  return "#cc2200";
}

const LOG_COLOR: Record<LogType, string> = {
  damage: "#ff8866", crit: "#ffd700", heal: "#44dd88",
  strike: "#ff3300", miss: "#666688", system: "#f5a623", enrage: "#ff4400",
};

// ═══════════════════════════════════════════════════════════════════════
// COMBAT VIEW
// ═══════════════════════════════════════════════════════════════════════

interface CombatEndResult {
  result: "victory" | "defeat" | "fled";
  finalHp: number;
  finalAp: number;
  potionsLeft: number;
  apPotionsLeft: number;
  defeatedId?: string;
}

interface CombatViewProps {
  enemyType: "imp" | "pete";
  initialKaelHp: number;
  initialKaelAp: number;
  initialPotions: number;
  initialApPotions: number;
  onCombatEnd: (r: CombatEndResult) => void;
}

function CombatView({ enemyType, initialKaelHp, initialKaelAp, initialPotions, initialApPotions, onCombatEnd }: CombatViewProps) {
  const enemyInit = enemyType === "pete" ? PETE_INIT : IMP_ENEMY_INIT;

  const [kael, setKael] = useState<CharStats>({
    ...KAEL_INIT,
    hp: Math.max(1, Math.min(KAEL_INIT.maxHp, initialKaelHp)),
    ap: Math.max(0, Math.min(KAEL_INIT.maxAp, initialKaelAp)),
  });
  const [enemy, setEnemy] = useState<CharStats>({ ...enemyInit });
  const [phase, setPhase] = useState<BattlePhase>("menu");
  const [logs, setLogs] = useState<LogLine[]>([
    {
      text: enemyType === "pete"
        ? "Cinder Pete blocks the path! Prepare to fight!"
        : "A Fire Imp attacks!",
      type: "system",
    },
    { text: "Equipped: Basic Strike (Common) — Select ULTIMATE to activate the Strike Gauge.", type: "system" },
  ]);
  const [enemyEnraged, setEnemyEnraged] = useState(false);
  const [kaelDefending, setKaelDefending] = useState(false);
  const [gaugeResult, setGaugeResult] = useState<GaugeResult | null>(null);
  const [potions,    setPotions]    = useState(initialPotions);
  const [apPotions,  setApPotions]  = useState(initialApPotions);

  const onCombatEndRef = useRef(onCombatEnd);
  useEffect(() => { onCombatEndRef.current = onCombatEnd; }, [onCombatEnd]);

  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const arrowPosRef = useRef(0);
  const arrowDirRef = useRef(1);
  const rafRef      = useRef(0);

  const stateRef = useRef({ kael, enemy, enemyEnraged, kaelDefending, potions, apPotions });
  useEffect(() => { stateRef.current = { kael, enemy, enemyEnraged, kaelDefending, potions, apPotions }; }, [kael, enemy, enemyEnraged, kaelDefending, potions, apPotions]);

  function addLog(line: LogLine) { setLogs(prev => [...prev.slice(-8), line]); }

  function finishCombat(res: "victory" | "defeat" | "fled", finalKael: CharStats, pots: number, apPots: number, defId?: string) {
    onCombatEndRef.current({
      result: res,
      finalHp: finalKael.hp,
      finalAp: finalKael.ap,
      potionsLeft: pots,
      apPotionsLeft: apPots,
      defeatedId: defId,
    });
  }

  function runEnemyTurn(curKael: CharStats, curEnemy: CharStats, enraged: boolean, defending: boolean): CharStats {
    const atkVal = enraged ? Math.floor(curEnemy.atk * 1.5) : curEnemy.atk;
    const roll = Math.random();
    let dmg: number;
    let logLine: LogLine;
    if (enraged) {
      dmg = physDmg(atkVal, curKael.def); if (defending) dmg = Math.floor(dmg * 0.5);
      logLine = { text: `${curEnemy.name}'s ENRAGED STRIKE deals ${dmg} damage!`, type: "enrage" };
    } else if (roll < 0.45 && enemyType === "pete") {
      dmg = defending ? Math.floor(55 * 0.5) : 55;
      logLine = { text: `Cinder Pete hurls Ember Toss! ${dmg} fire damage!`, type: "damage" };
    } else {
      dmg = physDmg(atkVal, curKael.def); if (defending) dmg = Math.floor(dmg * 0.5);
      logLine = { text: `${curEnemy.name} strikes! ${dmg} damage!`, type: "damage" };
    }
    addLog(logLine);
    return { ...curKael, hp: Math.max(0, curKael.hp - dmg) };
  }

  function afterPlayerAction(newEnemy: CharStats, newKael: CharStats, defending: boolean, enraged: boolean) {
    let finalEnraged = enraged;
    if (!enraged && newEnemy.hp > 0 && newEnemy.hp / newEnemy.maxHp <= 0.25) {
      finalEnraged = true; setEnemyEnraged(true);
      addLog({ text: `⚠  ${newEnemy.name} ignites — BERSERK MODE! ATK +50%!`, type: "enrage" });
    }
    if (newEnemy.hp <= 0) {
      setEnemy(p => ({ ...p, hp: 0 })); setPhase("victory");
      const xp = enemyType === "pete" ? 50 : 20;
      const stk = enemyType === "pete" ? 150 : 40;
      addLog({ text: `${newEnemy.name} defeated! VICTORY! +${xp} XP · +${stk} STK`, type: "system" });
      const s = stateRef.current;
      setTimeout(() => finishCombat("victory", newKael, s.potions, s.apPotions, enemyType === "pete" ? "cinder_pete" : undefined), 1800);
      return;
    }
    setEnemy(newEnemy); setPhase("enemy");
    setTimeout(() => {
      const s = stateRef.current;
      const kaelAfter = runEnemyTurn(newKael, newEnemy, finalEnraged, defending);
      setKaelDefending(false); setKael(kaelAfter);
      if (kaelAfter.hp <= 0) {
        addLog({ text: "Kael has fallen! DEFEAT!", type: "system" }); setPhase("defeat");
        setTimeout(() => finishCombat("defeat", kaelAfter, s.potions, s.apPotions), 1800);
      } else setPhase("menu");
    }, 1100);
  }

  function handleAttack() {
    if (phase !== "menu") return;
    setPhase("enemy");
    const crit = rollCrit(kael.lck);
    let dmg = physDmg(kael.atk, enemy.def);
    if (crit) dmg = Math.floor(dmg * 2);
    addLog(crit ? { text: `CRITICAL STRIKE! Kael deals ${dmg} damage!`, type: "crit" } : { text: `Kael attacks! ${dmg} damage.`, type: "damage" });
    afterPlayerAction({ ...enemy, hp: Math.max(0, enemy.hp - dmg) }, kael, kaelDefending, enemyEnraged);
  }

  function handleMagic() {
    if (phase !== "menu") return;
    if (kael.ap < FROST_BOLT.apCost) { addLog({ text: "Not enough AP for Frost Bolt!", type: "system" }); return; }
    setPhase("enemy");
    const dmg = magicDmg(kael.mgk, enemy.res, FROST_BOLT.spellPower, enemyType === "pete" ? FROST_BOLT.elemMult : 1.0);
    addLog({ text: `Frost Bolt! ${dmg} ice damage${enemyType === "pete" ? " (super effective)" : ""}!`, type: "damage" });
    const newKael = { ...kael, ap: kael.ap - FROST_BOLT.apCost };
    setKael(newKael);
    afterPlayerAction({ ...enemy, hp: Math.max(0, enemy.hp - dmg) }, newKael, kaelDefending, enemyEnraged);
  }

  function handleUltimate() {
    if (phase !== "menu") return;
    addLog({ text: "Strike Gauge! Stop the arrow in the RED zone — click or SPACE.", type: "system" });
    setGaugeResult(null); setPhase("gauge");
  }

  function handleGaugeStop() {
    if (phase !== "gauge") return;
    cancelAnimationFrame(rafRef.current);
    const pos = arrowPosRef.current;
    const result = evalGauge(pos, EQUIPPED_ULTIMATE.redZonePct);
    const snap = stateRef.current;
    const dmg = ultimateDmg(snap.kael.atk, EQUIPPED_ULTIMATE.power, result);
    const canvas = canvasRef.current;
    if (canvas) { const ctx = canvas.getContext("2d"); if (ctx) drawGauge(ctx, pos, EQUIPPED_ULTIMATE.redZonePct, true); }
    setGaugeResult(result); setPhase("result");
    if (result === "fail") {
      addLog({ text: "The gauge missed the red zone. Turn wasted.", type: "miss" });
      setTimeout(() => { const s = stateRef.current; afterPlayerAction(s.enemy, s.kael, s.kaelDefending, s.enemyEnraged); }, 1600);
    } else {
      const label = result === "perfect" ? "PERFECT STRIKE!" : result === "strike" ? "STRIKE!" : "Partial hit.";
      addLog({ text: `${label} Basic Strike deals ${dmg} damage!`, type: result === "partial" ? "damage" : "strike" });
      const newEnemy = { ...snap.enemy, hp: Math.max(0, snap.enemy.hp - dmg) };
      setTimeout(() => { const s = stateRef.current; afterPlayerAction(newEnemy, s.kael, s.kaelDefending, s.enemyEnraged); }, 1600);
    }
  }

  function handleDefend() {
    if (phase !== "menu") return;
    setPhase("enemy");
    const regen = Math.floor(kael.maxHp * 0.05);
    const newKael = { ...kael, hp: Math.min(kael.maxHp, kael.hp + regen) };
    setKael(newKael); setKaelDefending(true);
    addLog({ text: `Kael takes a defensive stance! +${regen} HP. Incoming damage halved.`, type: "heal" });
    afterPlayerAction(enemy, newKael, true, enemyEnraged);
  }

  function handleItem() {
    if (phase !== "menu") return;
    if (potions <= 0) { addLog({ text: "No Health Potions remaining!", type: "system" }); return; }
    setPhase("enemy");
    const heal = 60;
    const newPots = potions - 1;
    setPotions(newPots);
    const newKael = { ...kael, hp: Math.min(kael.maxHp, kael.hp + heal) };
    setKael(newKael);
    addLog({ text: `Used Health Potion! Kael recovers ${heal} HP. (${newPots} left)`, type: "heal" });
    afterPlayerAction(enemy, newKael, kaelDefending, enemyEnraged);
  }

  function handleApItem() {
    if (phase !== "menu") return;
    if (apPotions <= 0) { addLog({ text: "No AP Crystals remaining!", type: "system" }); return; }
    setPhase("enemy");
    const restore = 20;
    const newApPots = apPotions - 1;
    setApPotions(newApPots);
    const newKael = { ...kael, ap: Math.min(kael.maxAp, kael.ap + restore) };
    setKael(newKael);
    addLog({ text: `Used AP Crystal! Kael restores ${restore} AP. (${newApPots} left)`, type: "heal" });
    afterPlayerAction(enemy, newKael, kaelDefending, enemyEnraged);
  }

  function handleFlee() {
    if (phase !== "menu") return;
    if (enemyType === "pete") { addLog({ text: "Can't flee from a boss fight!", type: "system" }); return; }
    const fleeChance = Math.min(0.9, Math.max(0.1, (kael.spd / enemy.spd) * 0.6));
    if (Math.random() < fleeChance) {
      addLog({ text: "Kael escapes!", type: "system" }); setPhase("victory");
      const s = stateRef.current;
      setTimeout(() => finishCombat("fled", s.kael, s.potions, s.apPotions), 1000);
    } else {
      addLog({ text: "Couldn't escape!", type: "system" }); setPhase("enemy");
      setTimeout(() => {
        const s = stateRef.current;
        const kaelAfter = runEnemyTurn(s.kael, s.enemy, s.enemyEnraged, false);
        setKael(kaelAfter);
        if (kaelAfter.hp <= 0) {
          addLog({ text: "Kael has fallen!", type: "system" }); setPhase("defeat");
          setTimeout(() => finishCombat("defeat", kaelAfter, s.potions, s.apPotions), 1800);
        } else setPhase("menu");
      }, 1100);
    }
  }

  // Gauge animation loop
  useEffect(() => {
    if (phase !== "gauge") return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    arrowPosRef.current = 0; arrowDirRef.current = 1; let running = true;
    const tick = () => {
      if (!running) return;
      arrowPosRef.current += arrowDirRef.current * EQUIPPED_ULTIMATE.speed;
      if (arrowPosRef.current >= GW) { arrowPosRef.current = GW; arrowDirRef.current = -1; }
      else if (arrowPosRef.current <= 0) { arrowPosRef.current = 0; arrowDirRef.current = 1; }
      drawGauge(ctx, arrowPosRef.current, EQUIPPED_ULTIMATE.redZonePct, false);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [phase]);

  // Space key for gauge
  useEffect(() => {
    if (phase !== "gauge") return;
    const onKey = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); handleGaugeStop(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const enemyHpPct = enemy.hp / enemy.maxHp;
  const kaelHpPct  = kael.hp  / kael.maxHp;
  const kaelApPct  = kael.ap  / kael.maxAp;
  const isMenu     = phase === "menu";
  const enemyPips  = Math.ceil(enemyHpPct * 3);
  const isBoss     = enemyType === "pete";

  return (
    <div className="space-y-4">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontFamily: "monospace", color: "#f5a623" }}>⚔ COMBAT</span>
        <span style={{ fontSize: 10, fontFamily: "monospace", color: "#555" }}>
          {isBoss ? "SUB-BOSS: Cinder Pete" : "ENCOUNTER: Fire Imp"} · Region 1: The Ember Alleys
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── BATTLE SCREEN ── */}
        <div className="lg:col-span-2">
          <div style={{ background: "linear-gradient(180deg,#1a0800 0%,#2d1200 60%,#180600 100%)", border: "2px solid #f5a623", borderRadius: 6, overflow: "hidden", fontFamily: "monospace" }}>
            {/* Enemy area */}
            <div style={{ background: "radial-gradient(ellipse at 50% 30%,#3d1800 0%,#140800 70%)", minHeight: 196, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px 16px", position: "relative" }}>
              <div style={{ textAlign: "center", marginBottom: 14 }}>
                <div style={{ fontSize: isBoss ? 52 : 36, lineHeight: 1, filter: enemyEnraged ? "drop-shadow(0 0 12px #ff4400)" : "drop-shadow(0 0 6px #f5a623)", transition: "filter 0.5s" }}>
                  {enemy.hp <= 0 ? "💀" : isBoss ? <PeteBossSprite /> : <ImpSprite />}
                </div>
                <div style={{ fontSize: 13, fontWeight: "bold", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 6, color: enemyEnraged ? "#ff4400" : "#f5a623", textShadow: enemyEnraged ? "0 0 10px #ff4400" : "0 0 6px #f5a623" }}>
                  {enemyEnraged ? `⚠  ${enemy.name.toUpperCase()}  [BERSERK]  ⚠` : enemy.name.toUpperCase()}
                </div>
                <div style={{ fontSize: 10, color: "#666", marginTop: 2, letterSpacing: "0.08em" }}>
                  {isBoss ? "Sub-Boss" : "Common Enemy"} · Region 1: The Ember Alleys
                </div>
              </div>
              <div style={{ width: "100%", maxWidth: 340 }}>
                <div style={{ fontSize: 9, color: "#777", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{enemy.name}</div>
                <div style={{ height: 14, background: "#2a0a00", border: "1px solid #333", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.max(0, enemyHpPct * 100)}%`, background: enemyHpPct > 0.5 ? "linear-gradient(90deg,#cc4400,#ff6600)" : enemyHpPct > 0.25 ? "linear-gradient(90deg,#882200,#cc3300)" : "linear-gradient(90deg,#440000,#880000)", transition: "width .4s ease,background .5s" }} />
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 4, justifyContent: "center" }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 18, height: 6, borderRadius: 1, background: i < enemyPips ? "#ff6600" : "#2a0a00", border: "1px solid #333", transition: "background .3s" }} />
                  ))}
                </div>
              </div>
              {phase === "victory" && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,30,0,.88)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <div style={{ fontSize: 36 }}>🏆</div>
                  <div style={{ color: "#00dd66", fontWeight: "bold", fontSize: 22, letterSpacing: "0.15em" }}>VICTORY!</div>
                  <div style={{ color: "#88cc88", fontSize: 12 }}>{isBoss ? "+50 XP · +150 STK · Ember Keystone dropped" : "+20 XP · +40 STK"}</div>
                </div>
              )}
              {phase === "defeat" && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(30,0,0,.88)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <div style={{ fontSize: 36 }}>💀</div>
                  <div style={{ color: "#dd0000", fontWeight: "bold", fontSize: 22, letterSpacing: "0.15em" }}>DEFEAT</div>
                  <div style={{ color: "#cc8888", fontSize: 12 }}>Kael has fallen in the Ember Alleys</div>
                </div>
              )}
            </div>

            {/* Kael stats bar */}
            <div style={{ background: "#0d0600", borderTop: "1px solid #f5a623", padding: "10px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <span style={{ color: "#f5a623", fontSize: 11, fontWeight: "bold", letterSpacing: "0.1em" }}>KAEL{kaelDefending ? "  [DEFENDING]" : ""}</span>
                <span style={{ color: "#555", fontSize: 10 }}>Lv.5</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <span style={{ color: "#888", fontSize: 10, width: 20 }}>HP</span>
                <div style={{ flex: 1, height: 10, background: "#1a0800", border: "1px solid #333", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.max(0, kaelHpPct * 100)}%`, background: hpColor(kael.hp, kael.maxHp), transition: "width .4s ease,background .5s" }} />
                </div>
                <span style={{ color: hpColor(kael.hp, kael.maxHp), fontSize: 10, width: 60, textAlign: "right" }}>{kael.hp}/{kael.maxHp}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#888", fontSize: 10, width: 20 }}>AP</span>
                <div style={{ flex: 1, height: 10, background: "#000d1a", border: "1px solid #333", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.max(0, kaelApPct * 100)}%`, background: "#4488ff", transition: "width .4s ease" }} />
                </div>
                <span style={{ color: "#4488ff", fontSize: 10, width: 60, textAlign: "right" }}>{kael.ap}/{kael.maxAp}</span>
              </div>
            </div>

            {/* Battle log */}
            <div style={{ background: "#080400", borderTop: "1px solid #222", padding: "7px 16px", minHeight: 50 }}>
              {logs.slice(-2).map((line, i) => (
                <div key={i} style={{ fontSize: 11, color: LOG_COLOR[line.type], lineHeight: 1.55, opacity: i === 0 && logs.length > 1 ? 0.6 : 1 }}>{line.text}</div>
              ))}
            </div>

            {/* Action menu / gauge */}
            <div style={{ background: "#0d0600", borderTop: "1px solid #f5a623", padding: "12px 16px" }}>
              {(phase === "gauge" || phase === "result") && (
                <div>
                  <div style={{ color: "#f5a623", fontSize: 11, fontWeight: "bold", letterSpacing: "0.1em", marginBottom: 8, textAlign: "center" }}>
                    {phase === "gauge" ? "▶  STRIKE GAUGE — STOP THE ARROW IN THE RED ZONE!  ◀"
                      : gaugeResult === "perfect" ? "✦  PERFECT STRIKE!  ✦"
                      : gaugeResult === "strike" ? "★  STRIKE!  ★"
                      : gaugeResult === "partial" ? "◆  PARTIAL HIT  ◆"
                      : "✕  MISS — TURN WASTED  ✕"}
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                    <canvas ref={canvasRef} width={GW} height={GCH} onClick={phase === "gauge" ? handleGaugeStop : undefined}
                      style={{ cursor: phase === "gauge" ? "pointer" : "default", maxWidth: "100%", display: "block", borderRadius: 3, border: "1px solid #333" }} />
                  </div>
                  {phase === "gauge" && <div style={{ color: "#777", fontSize: 10, textAlign: "center", letterSpacing: "0.08em" }}>CLICK or press SPACEBAR to stop</div>}
                  {phase === "result" && gaugeResult && (
                    <div style={{ textAlign: "center", marginTop: 4 }}>
                      <Badge variant="outline" style={{ borderColor: gaugeResult === "perfect" ? "#ffd700" : gaugeResult === "strike" ? "#cc2200" : gaugeResult === "partial" ? "#c8a000" : "#444455", color: gaugeResult === "perfect" ? "#ffd700" : gaugeResult === "strike" ? "#ff6644" : gaugeResult === "partial" ? "#c8a000" : "#555566", fontSize: 11 }}>
                        {gaugeResult.toUpperCase()}
                      </Badge>
                      <span style={{ color: "#555", fontSize: 10, marginLeft: 8 }}>Processing...</span>
                    </div>
                  )}
                </div>
              )}

              {(phase === "victory" || phase === "defeat") && (
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                  <div style={{ color: "#555", fontSize: 10, fontFamily: "monospace" }}>Returning to dungeon…</div>
                </div>
              )}

              {phase !== "gauge" && phase !== "result" && phase !== "victory" && phase !== "defeat" && (
                <div>
                  <div style={{ color: "#555", fontSize: 10, letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" }}>
                    {phase === "enemy" ? "Enemy turn…" : "Choose action:"}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                    {([
                      { label: "⚔  ATTACK",   sub: null,                          onClick: handleAttack,  disabled: !isMenu,                          highlight: false },
                      { label: "✦  MAGIC",    sub: `Frost Bolt (${FROST_BOLT.apCost} AP)`, onClick: handleMagic, disabled: !isMenu || kael.ap < FROST_BOLT.apCost, highlight: false },
                      { label: "★  ULTIMATE", sub: EQUIPPED_ULTIMATE.name,         onClick: handleUltimate,disabled: !isMenu,                          highlight: true  },
                      { label: "🛡  DEFEND",   sub: null,                          onClick: handleDefend,  disabled: !isMenu,                          highlight: false },
                      { label: "🧪  POTION",   sub: `HP Potion ×${potions}`,       onClick: handleItem,   disabled: !isMenu || potions <= 0,           highlight: false },
                      { label: "💎  AP CRYS",  sub: `AP Crystal ×${apPotions}`,    onClick: handleApItem, disabled: !isMenu || apPotions <= 0,         highlight: false },
                      { label: "↩  FLEE",     sub: isBoss ? "Boss — fails" : "60% chance", onClick: handleFlee, disabled: !isMenu,                   highlight: false },
                    ] as const).map((btn, idx) => (
                      <button key={idx} type="button" onClick={btn.onClick} disabled={btn.disabled}
                        style={{ background: btn.highlight ? (isMenu ? "rgba(180,0,0,.28)" : "rgba(60,0,0,.2)") : "rgba(18,8,0,.85)", border: btn.highlight ? `1px solid ${isMenu ? "#aa1100" : "#330800"}` : "1px solid #2a1a00", borderRadius: 3, padding: "8px 4px", cursor: btn.disabled ? "not-allowed" : "pointer", color: btn.disabled ? "#333" : btn.highlight ? "#ff6644" : "#ddc890", fontSize: 11, fontFamily: "monospace", fontWeight: "bold", letterSpacing: "0.04em", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, transition: "background .12s,border-color .12s" }}>
                        <span>{btn.label}</span>
                        {btn.sub && <span style={{ fontSize: 9, fontWeight: "normal", color: btn.disabled ? "#2a1a00" : "#776644" }}>{btn.sub}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── SIDEBAR ── */}
        <div className="space-y-4">
          <Card style={{ background: "linear-gradient(180deg,#1a0a00,#0d0600)", border: "1px solid #f5a623" }}>
            <CardHeader className="pb-2">
              <CardTitle style={{ color: "#f5a623", fontSize: 12, fontFamily: "monospace", letterSpacing: "0.1em" }}>EQUIPPED ULTIMATE NFT</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 30 }}>★</div>
                <div style={{ color: "#ddc890", fontWeight: "bold", fontFamily: "monospace", fontSize: 13, marginTop: 2 }}>{EQUIPPED_ULTIMATE.name}</div>
                <Badge variant="outline" className="mt-1 text-[10px]">{EQUIPPED_ULTIMATE.rarity}</Badge>
              </div>
              <div style={{ background: "#080400", border: "1px solid #2a1a00", borderRadius: 4, padding: 8, fontSize: 10, fontFamily: "monospace", color: "#888", lineHeight: 1.7 }}>
                <div>Power: <span style={{ color: "#f5a623" }}>{EQUIPPED_ULTIMATE.power}× ATK</span></div>
                <div>Red zone: <span style={{ color: "#cc2200" }}>{Math.round(EQUIPPED_ULTIMATE.redZonePct * 100)}% of bar</span></div>
                <div>Speed: <span style={{ color: "#4488ff" }}>Slow (Common)</span></div>
                <div style={{ marginTop: 6, color: "#444", fontSize: 9 }}>Acquire: 5,000 STK or 7-day streak</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: "#555", fontFamily: "monospace", marginBottom: 4, letterSpacing: "0.08em" }}>ZONE LAYOUT (35% red)</div>
                <div style={{ height: 12, display: "flex", borderRadius: 2, overflow: "hidden", border: "1px solid #2a1a00" }}>
                  <div style={{ flex: 17.5, background: "#1e1e30" }} />
                  <div style={{ flex: 13, background: "#5a4500" }} />
                  <div style={{ flex: 35, background: "#cc2200" }} />
                  <div style={{ flex: 13, background: "#5a4500" }} />
                  <div style={{ flex: 17.5, background: "#1e1e30" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, fontFamily: "monospace", marginTop: 2, color: "#444" }}>
                  <span>MISS</span><span style={{ color: "#b89400" }}>PART</span><span style={{ color: "#cc2200" }}>STRIKE</span><span style={{ color: "#b89400" }}>PART</span><span>MISS</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Sword className="w-4 h-4" />Live Combat Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs font-mono">
                {[
                  { label: "Kael HP",      value: `${kael.hp} / ${kael.maxHp}`,      color: hpColor(kael.hp, kael.maxHp) },
                  { label: "Kael AP",      value: `${kael.ap} / ${kael.maxAp}`,      color: "#4488ff" },
                  { label: `${enemy.name} HP`, value: `${enemy.hp} / ${enemy.maxHp}`, color: "#ff6600" },
                  { label: "Enemy Phase",  value: enemyEnraged ? "BERSERK" : "Normal", color: enemyEnraged ? "#ff4400" : "#666" },
                  { label: "HP Potions",   value: `${potions}×`,   color: "#44dd88" },
                  { label: "AP Crystals",  value: `${apPotions}×`, color: "#4488ff" },
                  { label: "Last Gauge",   value: gaugeResult ?? "—", color: gaugeResult === "perfect" ? "#ffd700" : gaugeResult === "strike" ? "#ff6644" : gaugeResult === "partial" ? "#c8a000" : "#444" },
                  { label: "Phase",        value: phase, color: "#888" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted/40">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground space-y-1.5">
                  {isBoss ? (
                    <>
                      <p><strong>Ice magic</strong> deals 1.5× vs Pete (weak to ice).</p>
                      <p><strong>At 25% HP</strong> Pete enters berserk mode (ATK +50%).</p>
                      <p><strong>Flee</strong> always fails vs boss fights.</p>
                    </>
                  ) : (
                    <>
                      <p><strong>Fire Imp</strong> — common enemy, no weakness.</p>
                      <p><strong>Flee</strong> has 60% success chance vs common enemies.</p>
                      <p><strong>At 25% HP</strong> imp goes berserk (ATK +50%).</p>
                    </>
                  )}
                  <p>Formulas: <code>strikequestgame-design.md §7</code></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full battle log */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Full Battle Log</CardTitle>
          <CardDescription>Complete combat history this session</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-0.5 font-mono text-xs max-h-32 overflow-y-auto">
            {[...logs].reverse().map((line, i) => (
              <div key={i} style={{ color: LOG_COLOR[line.type] }}>{line.text}</div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// FLASH TRANSITION SCREEN
// ═══════════════════════════════════════════════════════════════════════

function FlashScreen() {
  return (
    <div style={{ width: "100%", height: VIEW_H, display: "flex", alignItems: "center", justifyContent: "center", animation: "flash-to-black .7s ease-in forwards", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ color: "#ff4400", fontSize: 18, fontFamily: "monospace", fontWeight: "bold", letterSpacing: "0.2em", textShadow: "0 0 20px #ff4400", opacity: 0.9 }}>
        ⚔  BATTLE START  ⚔
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN EXPORT — StrikeQuestTestTab
// ═══════════════════════════════════════════════════════════════════════

export function StrikeQuestTestTab() {
  // ── Shared state ────────────────────────────────────────────────────
  const [gameView, setGameView] = useState<GameView>("worldmap");

  const [kaelStats, setKaelStats] = useState({
    hp: KAEL_INIT.hp, maxHp: KAEL_INIT.maxHp,
    ap: KAEL_INIT.ap, maxAp: KAEL_INIT.maxAp,
  });

  const [inventory, setInventory] = useState<Inventory>({ potions: 3, apPotions: 1 });

  const [impsState, setImpsState] = useState<ImpState[]>(IMP_INIT.map(i => ({ ...i })));

  const [completedBosses, setCompletedBosses] = useState<string[]>([]);
  const [unlockedGates,   setUnlockedGates]   = useState<string[]>([]);

  const [mockSTK, setMockSTK] = useState(500);

  const [kaelWorldPos, setKaelWorldPos] = useState<KaelPos>(WMAP_KAEL_SPAWN);

  const [pendingEnemy, setPendingEnemy] = useState<"imp" | "pete">("imp");
  const [lockedMsg,    setLockedMsg]    = useState<string | null>(null);

  // ── Locked-message auto-clear ─────────────────────────────────────
  useEffect(() => {
    if (!lockedMsg) return;
    const t = setTimeout(() => setLockedMsg(null), 3000);
    return () => clearTimeout(t);
  }, [lockedMsg]);

  // ── World-map handlers ────────────────────────────────────────────
  const handleEnterLocation = (locationId: string, fromPos: KaelPos) => {
    setKaelWorldPos(fromPos);
    if (locationId === "ashwick") {
      setGameView("town");
    } else if (locationId === "furnace_lanes") {
      setGameView("dungeon");
    }
    // ember_gate, frostholm, glacial_lanes — future content
  };

  const handleShowLockedMsg = (msg: string) => {
    setLockedMsg(msg);
  };

  // ── Dungeon handlers ──────────────────────────────────────────────
  const handleEnterCombat = (type: "imp" | "pete") => {
    setPendingEnemy(type);
    setGameView("flash");
    setTimeout(() => setGameView("battle"), 720);
  };

  const handleExitDungeon = () => {
    setGameView("worldmap");
  };

  const handleImpsChange = (imps: ImpState[]) => {
    setImpsState(imps);
  };

  // ── Town handlers ─────────────────────────────────────────────────
  const handleTownAction = (action: TownAction) => {
    if (action.type === "restore_hp_ap") {
      if (mockSTK < 50) return;
      setMockSTK(s => s - 50);
      setKaelStats(s => ({ ...s, hp: s.maxHp, ap: s.maxAp }));
    } else if (action.type === "buy_item") {
      if (action.itemId === "potion") {
        if (mockSTK < 30) return;
        setMockSTK(s => s - 30);
        setInventory(inv => ({ ...inv, potions: inv.potions + 1 }));
      } else if (action.itemId === "ap_potion") {
        if (mockSTK < 25) return;
        setMockSTK(s => s - 25);
        setInventory(inv => ({ ...inv, apPotions: inv.apPotions + 1 }));
      }
    } else if (action.type === "exit") {
      setGameView("worldmap");
    }
  };

  // ── Combat-end handler ────────────────────────────────────────────
  const handleCombatEnd = (r: CombatEndResult) => {
    // Persist Kael's surviving stats
    setKaelStats(s => ({ ...s, hp: Math.max(1, r.finalHp), ap: r.finalAp }));
    setInventory({ potions: r.potionsLeft, apPotions: r.apPotionsLeft });

    // Register boss defeats and unlock gates
    if (r.defeatedId && !completedBosses.includes(r.defeatedId)) {
      setCompletedBosses(prev => [...prev, r.defeatedId!]);
      if (r.defeatedId === "cinder_pete") {
        setUnlockedGates(prev => [...prev, "ember_gate"]);
        setMockSTK(s => s + 150);
      } else {
        setMockSTK(s => s + 40);
      }
    } else if (r.result === "victory" && !r.defeatedId) {
      // Regular imp victory (fled counts as no reward)
      setMockSTK(s => s + (r.result === "victory" ? 40 : 0));
    }

    // Return to dungeon after short delay (flash already played on entry)
    setGameView("dungeon");
  };

  // ── Description text ──────────────────────────────────────────────
  const headerDesc = (() => {
    switch (gameView) {
      case "worldmap": return "World Map — WASD/arrows to move · Walk into location icons to enter";
      case "town":     return "Ashwick Town — WASD to move · Walk south to exit · E near NPCs to interact";
      case "dungeon":  return "Furnace Lanes: Ember Alleys — WASD to move · Walk west to exit dungeon";
      case "battle":   return `Combat: Kael vs ${pendingEnemy === "pete" ? "Cinder Pete (Sub-Boss)" : "Fire Imp"} · All formulas from strikequestgame-design.md §7`;
      case "flash":    return "Entering combat…";
    }
  })();

  return (
    <div className="space-y-4">
      <GameStyles />

      {/* Header */}
      <Card style={{ borderColor: "rgba(245,166,35,.4)", background: "rgba(40,20,0,.3)" }}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2" style={{ color: "#f5a623" }}>
            <Flame className="w-5 h-5" />
            Strike Quest — World Map · Region 1: The Ember Alleys
          </CardTitle>
          <CardDescription>{headerDesc}</CardDescription>
        </CardHeader>
        {gameView !== "flash" && gameView !== "battle" && (
          <CardContent className="pt-0 pb-3">
            <div style={{ display: "flex", gap: 16, fontFamily: "monospace", fontSize: 11, flexWrap: "wrap" }}>
              <span style={{ color: hpColor(kaelStats.hp, kaelStats.maxHp) }}>HP {kaelStats.hp}/{kaelStats.maxHp}</span>
              <span style={{ color: "#4488ff" }}>AP {kaelStats.ap}/{kaelStats.maxAp}</span>
              <span style={{ color: "#44dd88" }}>🧪 {inventory.potions}</span>
              <span style={{ color: "#88aaff" }}>💎 {inventory.apPotions}</span>
              <span style={{ color: "#f5a623" }}>STK {mockSTK}</span>
              {completedBosses.includes("cinder_pete") && <span style={{ color: "#ffd700" }}>★ Pete defeated</span>}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Locked-location message */}
      {lockedMsg && (
        <div style={{ background: "rgba(60,0,0,.85)", border: "1px solid #aa2200", borderRadius: 4, padding: "8px 14px", fontFamily: "monospace", fontSize: 11, color: "#ff6644", textAlign: "center" }}>
          {lockedMsg}
        </div>
      )}

      {/* Game area */}
      {gameView === "worldmap" && (
        <WorldMapView
          initialKaelPos={kaelWorldPos}
          kaelStats={kaelStats}
          completedBosses={completedBosses}
          unlockedGates={unlockedGates}
          mockSTK={mockSTK}
          onEnterLocation={handleEnterLocation}
          onShowLockedMsg={handleShowLockedMsg}
        />
      )}

      {gameView === "town" && (
        <AshwickTownView
          kaelStats={kaelStats}
          mockSTK={mockSTK}
          inventory={inventory}
          onAction={handleTownAction}
        />
      )}

      {gameView === "dungeon" && (
        <DungeonView
          kaelStats={kaelStats}
          initialImps={impsState}
          onImpsChange={handleImpsChange}
          completedBosses={completedBosses}
          onEnterCombat={handleEnterCombat}
          onExitDungeon={handleExitDungeon}
        />
      )}

      {gameView === "flash" && <FlashScreen />}

      {gameView === "battle" && (
        <CombatView
          enemyType={pendingEnemy}
          initialKaelHp={kaelStats.hp}
          initialKaelAp={kaelStats.ap}
          initialPotions={inventory.potions}
          initialApPotions={inventory.apPotions}
          onCombatEnd={handleCombatEnd}
        />
      )}
    </div>
  );
}
