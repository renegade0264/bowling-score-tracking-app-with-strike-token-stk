// Strike Quest — Overworld + Combat
// Region 1: The Ember Alleys
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
import { Flame, Info, RefreshCw, Sword } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════
// INJECTED CSS — all keyframes for overworld animations
// ═══════════════════════════════════════════════════════════════════════

const GAME_CSS = `
@keyframes flame-flicker{0%,100%{transform:scaleX(1) scaleY(1) translateY(0);opacity:1}20%{transform:scaleX(.92) scaleY(1.08) translateY(-2px);opacity:.9}40%{transform:scaleX(1.06) scaleY(.94) translateY(1px);opacity:.85}60%{transform:scaleX(.94) scaleY(1.06) translateY(-1px);opacity:.95}80%{transform:scaleX(1.03) scaleY(.97) translateY(0);opacity:.88}}
@keyframes flame-flicker-slow{0%,100%{transform:scaleY(1);opacity:.8}33%{transform:scaleY(1.1);opacity:1}66%{transform:scaleY(.92);opacity:.75}}
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
`;

function GameStyles() {
  return <style>{GAME_CSS}</style>;
}

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

type GameView = "overworld" | "flash" | "battle";
type Direction = "up" | "down" | "left" | "right";
type GaugeResult = "perfect" | "strike" | "partial" | "fail";
type BattlePhase = "menu" | "gauge" | "result" | "enemy" | "victory" | "defeat";
type LogType = "damage" | "crit" | "heal" | "strike" | "miss" | "system" | "enrage";

interface CharStats {
  name: string;
  hp: number;
  maxHp: number;
  ap: number;
  maxAp: number;
  atk: number;
  def: number;
  mgk: number;
  res: number;
  spd: number;
  lck: number;
}

interface LogLine { text: string; type: LogType; }

interface ImpState {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  changeTimer: number;
  alive: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// WORLD CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const WORLD_W = 1600;
const WORLD_H = 900;
const VIEW_W = 820;
const VIEW_H = 480;
const KAEL_W = 36;
const KAEL_H = 52;
const KAEL_SPEED = 2.6;
const IMP_SPEED = 0.85;

// Playable bounds (walls at top/bottom)
const BOUND_TOP = 110;
const BOUND_BOTTOM = WORLD_H - 90;

// Spawn / entity positions
const KAEL_SPAWN = { x: 185, y: 430 };
const PETE_POS = { x: 1240, y: 490 };
const DUNGEON = { x: 1370, y: 460, w: 115, h: 100 };

const NPC_DATA = [
  {
    id: "ember",
    x: 320,
    y: 415,
    name: "Old Ember",
    dialogue: [
      '"Kael Dawnlane. Thought you were dead."',
      '"Cinder Pete controls the eastern tunnels. He\'s been collecting skulls."',
      '"Furnace Lanes entrance is east. The door glows red."',
    ],
  },
  {
    id: "soot",
    x: 510,
    y: 490,
    name: "Soot",
    dialogue: [
      '"Don\'t go east. Pete burned three bowlers last week."',
      '"He torches anyone who challenges him. Just saying."',
    ],
  },
];

const IMP_INIT: ImpState[] = [
  { id: "imp1", x: 570, y: 310, dx: 0.8, dy: 0.1, changeTimer: 130, alive: true },
  { id: "imp2", x: 910, y: 470, dx: -0.7, dy: 0.55, changeTimer: 85, alive: true },
];

// Imp wander zones [minX, maxX, minY, maxY]
const IMP_ZONES: [number, number, number, number][] = [
  [430, 780, 200, 600],
  [740, 1120, 280, 650],
];

// Torch positions in world
const TORCHES = [
  { x: 70, y: 95 }, { x: 300, y: 82 }, { x: 580, y: 92 }, { x: 860, y: 85 },
  { x: 1130, y: 90 }, { x: 1440, y: 86 },
  { x: 100, y: 720 }, { x: 390, y: 705 }, { x: 690, y: 728 },
  { x: 1000, y: 712 }, { x: 1290, y: 720 },
];

// Pre-computed ember particles (avoids Math.random in render)
const EMBERS = [
  { x: 78,  y: 120, delay: 0,   dur: 3.2, anim: "ember-float"   },
  { x: 92,  y: 115, delay: 1.4, dur: 2.7, anim: "ember-float-2" },
  { x: 306, y: 105, delay: 0.6, dur: 3.5, anim: "ember-float"   },
  { x: 588, y: 118, delay: 1.1, dur: 2.9, anim: "ember-float-2" },
  { x: 572, y: 110, delay: 2.2, dur: 3.1, anim: "ember-float"   },
  { x: 868, y: 108, delay: 0.3, dur: 3.4, anim: "ember-float"   },
  { x: 1138,y: 112, delay: 1.7, dur: 2.6, anim: "ember-float-2" },
  { x: 1448,y: 105, delay: 0.9, dur: 3.0, anim: "ember-float"   },
  { x: 108, y: 742, delay: 0.4, dur: 2.8, anim: "ember-float-2" },
  { x: 398, y: 728, delay: 1.9, dur: 3.3, anim: "ember-float"   },
  { x: 698, y: 750, delay: 0.7, dur: 2.5, anim: "ember-float-2" },
  { x: 1008,y: 735, delay: 1.3, dur: 3.1, anim: "ember-float"   },
  { x: 1298,y: 742, delay: 2.0, dur: 2.7, anim: "ember-float-2" },
];

// Decorative cracked pillars
const PILLARS = [
  { x: 150, y: 180 }, { x: 530, y: 195 }, { x: 1010, y: 185 }, { x: 1350, y: 175 },
];

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
        {/* Cloak back */}
        <path d="M9 20 C7 30 5 43 7 49 L29 49 C31 43 29 30 27 20 Z" fill="#12101e" />
        <path d="M14 22 L13 48" stroke="#1e1a30" strokeWidth="1.5" fill="none" />
        <path d="M22 22 L23 48" stroke="#1e1a30" strokeWidth="1.5" fill="none" />
        <path d="M7 49 L29 49" stroke="#f5a623" strokeWidth="1.5" />
        {/* Lane sigil */}
        <circle cx="18" cy="34" r="6" fill="none" stroke="#f5a623" strokeWidth="1" opacity="0.45" />
        <circle cx="18" cy="34" r="2" fill="none" stroke="#f5a623" strokeWidth="0.7" opacity="0.35" />
        <path d="M12 34 L24 34 M18 28 L18 40" stroke="#f5a623" strokeWidth="0.7" opacity="0.3" />
        {/* Bowling ball */}
        <circle cx="7" cy="34" r="5.5" fill="#1a1a3a" />
        <circle cx="7" cy="34" r="5.5" stroke="#3344bb" strokeWidth="1.2" fill="none" />
        <circle cx="5.5" cy="32" r="1.2" fill="rgba(0,0,0,0.7)" />
        <circle cx="8" cy="31" r="0.9" fill="rgba(0,0,0,0.7)" />
        {/* Hood from behind */}
        <path d="M9 20 C7 12 9 3 18 1 C27 3 29 12 27 20 Z" fill="#12101e" />
        <path d="M12 8 C14 2 18 0 18 0 C18 0 22 2 24 8" fill="#0e0c1a" />
      </svg>
    );
  }

  if (direction === "left" || direction === "right") {
    const flip = direction === "left";
    return (
      <svg
        width="36"
        height="52"
        viewBox="0 0 36 52"
        style={{ ...walkStyle, transform: flip ? "scaleX(-1)" : undefined, display: "block" }}
      >
        <ellipse cx="18" cy="50" rx="9" ry="2.5" fill="rgba(0,0,0,0.45)" />
        {/* Cloak side — billowing back */}
        <path d="M10 20 C8 30 7 43 9 49 L26 49 C28 43 27 30 26 20 Z" fill="#12101e" />
        <path d="M9 26 C5 30 4 40 7 47 L9 49" fill="#0e0c1a" />
        <path d="M9 49 L26 49" stroke="#f5a623" strokeWidth="1.5" />
        {/* Ball in right hand */}
        <circle cx="26" cy="33" r="5.5" fill="#1a1a3a" />
        <circle cx="26" cy="33" r="5.5" stroke="#3344bb" strokeWidth="1.2" fill="none" />
        <circle cx="24.5" cy="31" r="1.2" fill="rgba(0,0,0,0.7)" />
        <circle cx="27" cy="30" r="0.9" fill="rgba(0,0,0,0.7)" />
        <path d="M24 22 C27 26 28 30 26 33" stroke="#12101e" strokeWidth="4" strokeLinecap="round" />
        {/* Hood side profile */}
        <path d="M10 20 C9 12 11 3 18 1 C22 1 24 5 24 12 C24 16 22 18 21 20 Z" fill="#12101e" />
        <path d="M13 18 C12 12 13 5 18 3 C21 4 22 8 22 12 C22 15 21 17 20 18 Z" fill="#0a0818" />
        {/* Single eye */}
        <circle cx="19" cy="11" r="2.1" fill="#f5a623" opacity="0.88" />
        <circle cx="19" cy="11" r="0.9" fill="#1a0000" />
        <path d="M14 18 C16 15 18 14 20 14 C21 15 22 17 22 18" stroke="#f5a623" strokeWidth="1.2" fill="none" />
      </svg>
    );
  }

  // Down — default, facing camera
  return (
    <svg width="36" height="52" viewBox="0 0 36 52" style={walkStyle}>
      <ellipse cx="18" cy="50" rx="9" ry="2.5" fill="rgba(0,0,0,0.45)" />
      {/* Cloak */}
      <path d="M9 20 C7 30 5 43 7 49 L29 49 C31 43 29 30 27 20 Z" fill="#12101e" />
      <path d="M14 22 L13 48" stroke="#1e1a30" strokeWidth="1.5" fill="none" />
      <path d="M22 22 L23 48" stroke="#1e1a30" strokeWidth="1.5" fill="none" />
      <path d="M9 20 L18 24 L27 20" stroke="#f5a623" strokeWidth="1.4" fill="none" />
      <path d="M7 49 L29 49" stroke="#f5a623" strokeWidth="1.5" />
      {/* Arms */}
      <path d="M9 22 C6 28 5 34 6 38" stroke="#12101e" strokeWidth="5" strokeLinecap="round" />
      <path d="M27 22 C30 28 31 34 30 38" stroke="#12101e" strokeWidth="5" strokeLinecap="round" />
      {/* Bowling ball left hand */}
      <circle cx="6" cy="38" r="5.5" fill="#1a1a3a" />
      <circle cx="6" cy="38" r="5.5" stroke="#3344bb" strokeWidth="1.2" fill="none" />
      <circle cx="4.5" cy="36" r="1.2" fill="rgba(0,0,0,0.7)" />
      <circle cx="7" cy="35" r="0.9" fill="rgba(0,0,0,0.7)" />
      <circle cx="6" cy="38" r="5.5" fill="rgba(60,80,200,0.14)" />
      {/* Hood */}
      <path d="M9 20 C7 12 9 4 14 1 C16 0 18 0 18 0 C18 0 20 0 22 1 C27 4 29 12 27 20 Z" fill="#12101e" />
      <path d="M11 18 C10 12 12 5 15 3 C16 2 18 2 18 2 C18 2 20 2 21 3 C24 5 26 12 25 18 Z" fill="#0a0818" />
      {/* Eyes */}
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
    <svg
      width="28"
      height="38"
      viewBox="0 0 28 38"
      style={{ animation: "imp-bounce .5s ease-in-out infinite, imp-glow 1.6s ease-in-out infinite" }}
    >
      {/* Ground shadow */}
      <ellipse cx="14" cy="37.5" rx="6" ry="1.5" fill="rgba(0,0,0,0.55)" />

      {/* === BAT WINGS (behind body) === */}
      <path d="M8 18 C2 12 0 6 3 8 C5 10 6 14 7 17" fill="#1a0800" opacity="0.85" />
      <path d="M20 18 C26 12 28 6 25 8 C23 10 22 14 21 17" fill="#1a0800" opacity="0.85" />
      {/* Wing bone struts */}
      <path d="M8 18 C4 11 2 7 3 8" stroke="#2d0a00" strokeWidth="0.7" fill="none" opacity="0.9" />
      <path d="M7 17 C5 13 3 10 4 11" stroke="#2d0a00" strokeWidth="0.5" fill="none" opacity="0.7" />
      <path d="M20 18 C24 11 26 7 25 8" stroke="#2d0a00" strokeWidth="0.7" fill="none" opacity="0.9" />
      <path d="M21 17 C23 13 25 10 24 11" stroke="#2d0a00" strokeWidth="0.5" fill="none" opacity="0.7" />
      {/* Wing membrane tears */}
      <path d="M3 9 C4 11 5 12 5 13" stroke="#0d0400" strokeWidth="0.4" fill="none" opacity="0.6" />

      {/* === DEVIL TAIL === */}
      <path d="M14 30 C17 32 20 31 21 34 C22 36 20 37 19 36" stroke="#1f0800" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Tail tip — pointed diamond */}
      <polygon points="19,36 17,38 21,38 20,35" fill="#cc2200" opacity="0.9" />

      {/* === GAUNT TORSO / RIBCAGE === */}
      {/* Charred flesh body — tall and lean, hunched forward */}
      <path d="M10 18 C8 21 8 27 9 31 C10 34 12 35 14 35 C16 35 18 34 19 31 C20 27 20 21 18 18 Z" fill="#1a0800" />
      {/* Lava crack through torso */}
      <path d="M12 20 C13 22 12 25 13 28 C14 30 13 32 14 33" stroke="#ff5500" strokeWidth="1.1" fill="none" opacity="0.85" />
      <path d="M13 22 C15 23 16 22 17 24" stroke="#ff7700" strokeWidth="0.7" fill="none" opacity="0.6" />
      <path d="M13 27 C11 28 12 30 13 30" stroke="#ff4400" strokeWidth="0.6" fill="none" opacity="0.5" />
      {/* Ribs — visible through charred flesh */}
      <path d="M10 21 C12 20 14 20.5 16 20" stroke="#2a0a00" strokeWidth="1.2" fill="none" opacity="0.9" />
      <path d="M9.5 23 C11.5 22 14 22.5 16.5 22" stroke="#2a0a00" strokeWidth="1.1" fill="none" opacity="0.85" />
      <path d="M9.5 25.5 C11 24.5 14 25 16.5 24.5" stroke="#2a0a00" strokeWidth="1.1" fill="none" opacity="0.8" />
      <path d="M10 28 C12 27 14 27.5 16 27" stroke="#2a0a00" strokeWidth="1" fill="none" opacity="0.7" />
      {/* Glowing rib cracks */}
      <path d="M10 21 C12 20 14 20.5 16 20" stroke="#ff3300" strokeWidth="0.4" fill="none" opacity="0.4" />
      <path d="M9.5 25.5 C11 24.5 14 25 16.5 24.5" stroke="#ff4400" strokeWidth="0.4" fill="none" opacity="0.35" />

      {/* === LONG ARMS — lunging forward / reaching === */}
      {/* Left arm — reaching out aggressively */}
      <path d="M10 20 C6 19 3 22 2 26" stroke="#1a0800" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M10 20 C6 19 3 22 2 26" stroke="#ff4400" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.4" />
      {/* Right arm — raised, lunging */}
      <path d="M18 20 C22 18 25 21 26 25" stroke="#1a0800" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M18 20 C22 18 25 21 26 25" stroke="#ff4400" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.4" />
      {/* Forearms — bony */}
      <path d="M2 26 C1 28 1.5 30 2 30" stroke="#1a0800" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M26 25 C27 27 26.5 29 26 29" stroke="#1a0800" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* === LONG SHARP CLAWS === */}
      {/* Left claw — 4 curved talons */}
      <path d="M2 30 L-1 33" stroke="#661100" strokeWidth="1" strokeLinecap="round" />
      <path d="M2 30 L0.5 34" stroke="#661100" strokeWidth="1" strokeLinecap="round" />
      <path d="M2 30 L2.5 34.5" stroke="#661100" strokeWidth="1" strokeLinecap="round" />
      <path d="M2 30 L4 33.5" stroke="#661100" strokeWidth="0.9" strokeLinecap="round" />
      {/* Right claw */}
      <path d="M26 29 L29 32" stroke="#661100" strokeWidth="1" strokeLinecap="round" />
      <path d="M26 29 L27.5 33" stroke="#661100" strokeWidth="1" strokeLinecap="round" />
      <path d="M26 29 L25.5 33.5" stroke="#661100" strokeWidth="1" strokeLinecap="round" />
      <path d="M26 29 L24 32.5" stroke="#661100" strokeWidth="0.9" strokeLinecap="round" />

      {/* === LEGS — spindly, clawed feet === */}
      <path d="M11 32 C10 34 9 36 9 37" stroke="#1a0800" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M17 32 C18 34 19 36 19 37" stroke="#1a0800" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Foot claws */}
      <path d="M9 37 L7 38 M9 37 L8.5 38 M9 37 L10.5 38" stroke="#441100" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M19 37 L17 38 M19 37 L18.5 38 M19 37 L20.5 38" stroke="#441100" strokeWidth="0.9" strokeLinecap="round" />

      {/* === HEAD — angular, gaunt, sunken === */}
      {/* Skull-like angular head */}
      <path d="M8 12 C8 6 10 3 14 3 C18 3 20 6 20 12 C20 16 18 18 14 18 C10 18 8 16 8 12 Z" fill="#1a0800" />
      {/* Sunken cheekbones */}
      <path d="M9 13 C10 11 11 10 11 12" stroke="#0d0400" strokeWidth="1.5" fill="none" opacity="0.8" />
      <path d="M19 13 C18 11 17 10 17 12" stroke="#0d0400" strokeWidth="1.5" fill="none" opacity="0.8" />
      {/* Lava crack on face */}
      <path d="M14 8 C13 10 14 12 13 14 C12 16 13 17 14 17" stroke="#ff5500" strokeWidth="0.9" fill="none" opacity="0.9" />
      <path d="M13 11 C11 12 11 13 12 13" stroke="#ff6600" strokeWidth="0.6" fill="none" opacity="0.6" />

      {/* === TWISTED GNARLED HORNS === */}
      {/* Left horn — twisted, longer */}
      <path d="M10 7 C7 4 5 0 6 -1 C7 -2 8 1 9 3 C9.5 4.5 10 6 10 7" fill="#0d0400" />
      <path d="M10 7 C8 4 7 1 7.5 0 C8 -0.5 8.5 2 9.5 4" fill="#1a0800" opacity="0.5" />
      {/* Horn twist lines */}
      <path d="M9 5 C8 4 7.5 2 8 1" stroke="#ff3300" strokeWidth="0.4" fill="none" opacity="0.5" />
      {/* Right horn */}
      <path d="M18 7 C21 4 23 0 22 -1 C21 -2 20 1 19 3 C18.5 4.5 18 6 18 7" fill="#0d0400" />
      <path d="M18 7 C20 4 21 1 20.5 0 C20 -0.5 19.5 2 18.5 4" fill="#1a0800" opacity="0.5" />
      <path d="M19 5 C20 4 20.5 2 20 1" stroke="#ff3300" strokeWidth="0.4" fill="none" opacity="0.5" />

      {/* === HOLLOW EYE SOCKETS with glowing red pupils === */}
      {/* Socket — deep dark hollow */}
      <ellipse cx="11" cy="11" rx="2.8" ry="2.5" fill="#050100" />
      <ellipse cx="17" cy="11" rx="2.8" ry="2.5" fill="#050100" />
      {/* Socket rim — cracked bone */}
      <ellipse cx="11" cy="11" rx="2.8" ry="2.5" fill="none" stroke="#2a0800" strokeWidth="0.8" />
      <ellipse cx="17" cy="11" rx="2.8" ry="2.5" fill="none" stroke="#2a0800" strokeWidth="0.8" />
      {/* Intense glowing red pupils — small, pinpoint */}
      <circle cx="11" cy="11" r="0.9" fill="#ff0000" opacity="0.9" />
      <circle cx="17" cy="11" r="0.9" fill="#ff0000" opacity="0.9" />
      {/* Inner glow */}
      <circle cx="11" cy="11" r="1.6" fill="none" stroke="#cc0000" strokeWidth="0.4" opacity="0.5" />
      <circle cx="17" cy="11" r="1.6" fill="none" stroke="#cc0000" strokeWidth="0.4" opacity="0.5" />

      {/* === JAGGED TEETH — uneven, broken === */}
      {/* Jaw line */}
      <path d="M10 15.5 C12 17 16 17 18 15.5" fill="#0d0400" />
      {/* Upper teeth — jagged and uneven */}
      <path d="M10.5 15.5 L10 17 M12 15.5 L11.5 17.5 M13.5 15.5 L14 17.5 M15 15.5 L15.5 17 M16.5 15.5 L17 17.5 M17.5 15.5 L18 16.5" stroke="#c8b08a" strokeWidth="0.9" strokeLinecap="square" />
      {/* Glow from inside mouth */}
      <path d="M11 16 C12.5 17.5 15.5 17.5 17 16" stroke="#ff4400" strokeWidth="0.5" fill="none" opacity="0.6" />

      {/* === DARK SMOKE WISPS === */}
      <circle cx="7" cy="14" r="1.5" fill="#111" opacity="0.3" />
      <circle cx="6" cy="11" r="1.8" fill="#111" opacity="0.2" />
      <circle cx="5" cy="8" r="2" fill="#111" opacity="0.12" />
      <circle cx="21" cy="13" r="1.4" fill="#111" opacity="0.28" />
      <circle cx="22" cy="10" r="1.7" fill="#111" opacity="0.18" />
      <circle cx="23" cy="7" r="1.9" fill="#0a0000" opacity="0.1" />
    </svg>
  );
}

function PeteBossSprite() {
  return (
    <svg
      width="60"
      height="80"
      viewBox="0 0 60 80"
      style={{ animation: "pete-bob 1.2s ease-in-out infinite, pete-glow 1.8s ease-in-out infinite" }}
    >
      {/* Ground shadow */}
      <ellipse cx="30" cy="79" rx="20" ry="4.5" fill="rgba(0,0,0,0.7)" />

      {/* === SMOKE POURING FROM SHOULDERS === */}
      {/* Left shoulder smoke column */}
      <circle cx="8" cy="38" r="5" fill="#1a0800" opacity="0.45" />
      <circle cx="6" cy="32" r="5.5" fill="#1a0800" opacity="0.32" />
      <circle cx="7" cy="26" r="6" fill="#111" opacity="0.22" />
      <circle cx="5" cy="20" r="6.5" fill="#111" opacity="0.14" />
      <circle cx="6" cy="14" r="7" fill="#0a0000" opacity="0.08" />
      {/* Right shoulder smoke column */}
      <circle cx="52" cy="38" r="5" fill="#1a0800" opacity="0.45" />
      <circle cx="54" cy="32" r="5.5" fill="#1a0800" opacity="0.32" />
      <circle cx="53" cy="26" r="6" fill="#111" opacity="0.22" />
      <circle cx="55" cy="20" r="6.5" fill="#111" opacity="0.14" />
      <circle cx="54" cy="14" r="7" fill="#0a0000" opacity="0.08" />

      {/* === LEGS — massive volcanic pillars === */}
      {/* Left leg */}
      <path d="M10 56 C9 60 9 68 10 74 C11 77 14 78 17 77 C20 76 21 72 21 68 C21 62 20 57 18 55 Z" fill="#1a0800" />
      {/* Left leg lava cracks */}
      <path d="M12 60 C13 64 12 68 13 72" stroke="#ff5500" strokeWidth="1.3" fill="none" opacity="0.8" />
      <path d="M12 63 C14 64 15 63 16 65" stroke="#ff7700" strokeWidth="0.8" fill="none" opacity="0.6" />
      <path d="M14 69 C16 70 17 69 17 71" stroke="#ff4400" strokeWidth="0.7" fill="none" opacity="0.5" />
      {/* Right leg */}
      <path d="M42 55 C40 57 39 62 39 68 C39 72 40 76 43 77 C46 78 49 77 50 74 C51 68 51 60 50 56 Z" fill="#1a0800" />
      {/* Right leg lava cracks */}
      <path d="M48 60 C47 64 48 68 47 72" stroke="#ff5500" strokeWidth="1.3" fill="none" opacity="0.8" />
      <path d="M44 65 C46 64 47 65 48 63" stroke="#ff7700" strokeWidth="0.7" fill="none" opacity="0.55" />
      {/* Feet — rock slabs */}
      <path d="M8 74 C7 78 10 80 14 80 C18 80 21 78 21 75" fill="#0d0400" />
      <path d="M39 75 C39 78 42 80 46 80 C50 80 53 78 52 74" fill="#0d0400" />
      {/* Foot crack glow */}
      <path d="M10 77 C12 76 15 77 17 76" stroke="#ff4400" strokeWidth="0.8" fill="none" opacity="0.6" />
      <path d="M41 77 C43 76 46 77 49 76" stroke="#ff4400" strokeWidth="0.8" fill="none" opacity="0.6" />

      {/* === MASSIVE VOLCANIC TORSO === */}
      {/* Main body — irregular boulder shape */}
      <path d="M8 36 C5 42 5 52 8 58 C10 62 14 64 18 64 C22 65 26 65 30 65 C34 65 38 65 42 64 C46 63 50 62 52 58 C55 52 55 42 52 36 C50 31 44 28 36 27 C30 26 24 26 18 27 C12 28 10 31 8 36 Z" fill="#1c0b00" />
      {/* Volcanic surface texture — darker rock layers */}
      <path d="M10 40 C8 45 9 53 12 58" stroke="#0d0400" strokeWidth="2.5" fill="none" opacity="0.7" />
      <path d="M50 40 C52 45 51 53 48 58" stroke="#0d0400" strokeWidth="2.5" fill="none" opacity="0.7" />
      <path d="M20 28 C16 32 14 38 15 44" stroke="#0d0400" strokeWidth="1.5" fill="none" opacity="0.5" />
      <path d="M40 28 C44 32 46 38 45 44" stroke="#0d0400" strokeWidth="1.5" fill="none" opacity="0.5" />

      {/* === DEEP LAVA CRACKS — glowing network === */}
      {/* Main chest crack — huge, central */}
      <path d="M30 30 C28 36 30 42 28 48 C27 52 28 58 30 62" stroke="#ff6600" strokeWidth="2.5" fill="none" opacity="0.9" />
      <path d="M30 30 C28 36 30 42 28 48 C27 52 28 58 30 62" stroke="#ffaa00" strokeWidth="0.9" fill="none" opacity="0.7" />
      {/* Branch cracks left */}
      <path d="M28 36 C24 35 20 37 18 40" stroke="#ff5500" strokeWidth="1.6" fill="none" opacity="0.8" />
      <path d="M18 40 C16 41 14 40 12 42" stroke="#ff4400" strokeWidth="1.2" fill="none" opacity="0.7" />
      <path d="M28 44 C24 44 20 46 17 48" stroke="#ff5500" strokeWidth="1.4" fill="none" opacity="0.75" />
      <path d="M27 52 C23 52 20 54 18 56" stroke="#ff4400" strokeWidth="1.2" fill="none" opacity="0.65" />
      {/* Branch cracks right */}
      <path d="M30 38 C34 37 38 39 40 41" stroke="#ff5500" strokeWidth="1.6" fill="none" opacity="0.8" />
      <path d="M40 41 C42 42 44 41 46 43" stroke="#ff4400" strokeWidth="1.2" fill="none" opacity="0.7" />
      <path d="M30 46 C34 46 38 48 41 50" stroke="#ff5500" strokeWidth="1.3" fill="none" opacity="0.75" />
      <path d="M29 54 C33 54 37 56 40 58" stroke="#ff4400" strokeWidth="1.2" fill="none" opacity="0.65" />
      {/* Inner glow pools at crack intersections */}
      <circle cx="18" cy="40" r="2.5" fill="#ff7700" opacity="0.5" />
      <circle cx="40" cy="41" r="2.5" fill="#ff7700" opacity="0.5" />
      <circle cx="17" cy="48" r="2" fill="#ff6600" opacity="0.4" />
      <circle cx="41" cy="50" r="2" fill="#ff6600" opacity="0.4" />
      <circle cx="30" cy="46" r="3" fill="#ffaa00" opacity="0.35" />

      {/* === MASSIVE ARMS — volcanic rock === */}
      {/* Left arm */}
      <path d="M10 40 C2 36 -2 46 0 54" stroke="#1c0b00" strokeWidth="13" strokeLinecap="round" fill="none" />
      <path d="M10 40 C2 36 -2 46 0 54" stroke="#0d0400" strokeWidth="9" strokeLinecap="round" fill="none" />
      {/* Left arm lava veins */}
      <path d="M6 38 C2 42 1 48 2 52" stroke="#ff5500" strokeWidth="1.2" fill="none" opacity="0.75" />
      <path d="M5 42 C3 44 2 46 3 48" stroke="#ff7700" strokeWidth="0.7" fill="none" opacity="0.55" />
      {/* Right arm */}
      <path d="M50 40 C58 36 62 46 60 54" stroke="#1c0b00" strokeWidth="13" strokeLinecap="round" fill="none" />
      <path d="M50 40 C58 36 62 46 60 54" stroke="#0d0400" strokeWidth="9" strokeLinecap="round" fill="none" />
      {/* Right arm lava veins */}
      <path d="M54 38 C58 42 59 48 58 52" stroke="#ff5500" strokeWidth="1.2" fill="none" opacity="0.75" />
      <path d="M55 42 C57 44 58 46 57 48" stroke="#ff7700" strokeWidth="0.7" fill="none" opacity="0.55" />

      {/* === LAVA ROCK FISTS === */}
      {/* Left fist — angular rock mass */}
      <path d="M-2 52 C-4 54 -3 60 0 62 C3 63 7 62 8 59 C9 56 7 51 4 50 C2 49 0 50 -2 52 Z" fill="#1a0800" />
      <path d="M-1 54 C0 58 1 60 2 61" stroke="#ff5500" strokeWidth="1.1" fill="none" opacity="0.8" />
      <path d="M2 52 C3 55 4 57 4 59" stroke="#ff4400" strokeWidth="0.8" fill="none" opacity="0.6" />
      <path d="M-1 58 C1 57 3 58 4 57" stroke="#ff6600" strokeWidth="0.7" fill="none" opacity="0.5" />
      {/* Left fist knuckle ridges */}
      <path d="M-2 52 C0 51 2 51 4 52" stroke="#0d0400" strokeWidth="1.5" fill="none" opacity="0.8" />
      <path d="M-1 55 C1 54 3 54 5 55" stroke="#0d0400" strokeWidth="1.2" fill="none" opacity="0.6" />
      {/* Right fist */}
      <path d="M62 52 C64 54 63 60 60 62 C57 63 53 62 52 59 C51 56 53 51 56 50 C58 49 60 50 62 52 Z" fill="#1a0800" />
      <path d="M61 54 C60 58 59 60 58 61" stroke="#ff5500" strokeWidth="1.1" fill="none" opacity="0.8" />
      <path d="M58 52 C57 55 56 57 56 59" stroke="#ff4400" strokeWidth="0.8" fill="none" opacity="0.6" />
      <path d="M61 58 C59 57 57 58 56 57" stroke="#ff6600" strokeWidth="0.7" fill="none" opacity="0.5" />
      <path d="M62 52 C60 51 58 51 56 52" stroke="#0d0400" strokeWidth="1.5" fill="none" opacity="0.8" />
      <path d="M61 55 C59 54 57 54 55 55" stroke="#0d0400" strokeWidth="1.2" fill="none" opacity="0.6" />

      {/* === THICK NECK === */}
      <path d="M20 26 C18 22 18 18 20 16 C24 14 36 14 40 16 C42 18 42 22 40 26 Z" fill="#1c0b00" />
      <path d="M24 24 C24 20 25 18 27 17" stroke="#ff4400" strokeWidth="0.9" fill="none" opacity="0.5" />
      <path d="M36 24 C36 20 35 18 33 17" stroke="#ff4400" strokeWidth="0.9" fill="none" opacity="0.5" />

      {/* === MASSIVE HEAD — cracked volcanic rock face === */}
      {/* Main skull — irregular rock mass */}
      <path d="M10 14 C9 8 11 3 16 1 C20 -1 26 -2 30 -2 C34 -2 40 -1 44 1 C49 3 51 8 50 14 C51 20 50 26 46 28 C40 30 34 31 30 31 C26 31 20 30 14 28 C10 26 9 20 10 14 Z" fill="#1c0b00" />
      {/* Rock surface strata lines */}
      <path d="M11 18 C14 16 20 15 26 15" stroke="#0d0400" strokeWidth="1.8" fill="none" opacity="0.6" />
      <path d="M12 22 C15 20 20 19 25 19" stroke="#0d0400" strokeWidth="1.4" fill="none" opacity="0.5" />
      <path d="M49 18 C46 16 40 15 34 15" stroke="#0d0400" strokeWidth="1.8" fill="none" opacity="0.6" />
      <path d="M48 22 C45 20 40 19 35 19" stroke="#0d0400" strokeWidth="1.4" fill="none" opacity="0.5" />
      {/* Massive face crack network */}
      <path d="M30 2 C28 6 30 10 28 14 C26 18 27 22 28 26" stroke="#ff6600" strokeWidth="2" fill="none" opacity="0.9" />
      <path d="M30 2 C28 6 30 10 28 14 C26 18 27 22 28 26" stroke="#ffaa00" strokeWidth="0.7" fill="none" opacity="0.65" />
      <path d="M28 8 C24 8 20 10 18 13" stroke="#ff5500" strokeWidth="1.4" fill="none" opacity="0.8" />
      <path d="M30 12 C34 11 38 12 40 15" stroke="#ff5500" strokeWidth="1.4" fill="none" opacity="0.75" />
      <path d="M27 18 C23 18 19 20 18 22" stroke="#ff4400" strokeWidth="1.1" fill="none" opacity="0.7" />
      {/* Crack intersection glow pools */}
      <circle cx="18" cy="13" r="2" fill="#ff7700" opacity="0.55" />
      <circle cx="40" cy="15" r="2" fill="#ff7700" opacity="0.5" />

      {/* === HUGE CURVED RAM HORNS === */}
      {/* Left horn — thick, sweeping curve */}
      <path d="M13 6 C8 2 2 2 1 7 C0 11 3 16 8 17 C10 18 12 17 13 15 C14 13 13 10 12 8 C13 7 13 6 13 6 Z" fill="#0d0400" />
      <path d="M13 6 C9 3 4 3 3 7 C2 10 5 14 9 15" fill="#1a0800" opacity="0.6" />
      {/* Horn ridge lines */}
      <path d="M12 7 C8 4 3 5 2 8" stroke="#2a0a00" strokeWidth="1.5" fill="none" opacity="0.9" />
      <path d="M11 10 C8 8 4 9 3 11" stroke="#2a0a00" strokeWidth="1.2" fill="none" opacity="0.8" />
      <path d="M10 13 C8 12 5 13 4 14" stroke="#2a0a00" strokeWidth="1" fill="none" opacity="0.7" />
      {/* Horn lava veins */}
      <path d="M10 7 C7 8 4 10 3 12" stroke="#ff4400" strokeWidth="0.7" fill="none" opacity="0.5" />
      {/* Right horn */}
      <path d="M47 6 C52 2 58 2 59 7 C60 11 57 16 52 17 C50 18 48 17 47 15 C46 13 47 10 48 8 C47 7 47 6 47 6 Z" fill="#0d0400" />
      <path d="M47 6 C51 3 56 3 57 7 C58 10 55 14 51 15" fill="#1a0800" opacity="0.6" />
      <path d="M48 7 C52 4 57 5 58 8" stroke="#2a0a00" strokeWidth="1.5" fill="none" opacity="0.9" />
      <path d="M49 10 C52 8 56 9 57 11" stroke="#2a0a00" strokeWidth="1.2" fill="none" opacity="0.8" />
      <path d="M50 13 C52 12 55 13 56 14" stroke="#2a0a00" strokeWidth="1" fill="none" opacity="0.7" />
      <path d="M50 7 C53 8 56 10 57 12" stroke="#ff4400" strokeWidth="0.7" fill="none" opacity="0.5" />

      {/* === EYES — deep furnace glow === */}
      {/* Eye sockets — deep dark cavities */}
      <ellipse cx="21" cy="14" rx="5" ry="4.5" fill="#050000" />
      <ellipse cx="39" cy="14" rx="5" ry="4.5" fill="#050000" />
      {/* Socket rims — cracked rock edge */}
      <ellipse cx="21" cy="14" rx="5" ry="4.5" fill="none" stroke="#1a0800" strokeWidth="1.2" />
      <ellipse cx="39" cy="14" rx="5" ry="4.5" fill="none" stroke="#1a0800" strokeWidth="1.2" />
      {/* Inner furnace glow — deep orange */}
      <ellipse cx="21" cy="14" rx="3" ry="2.8" fill="#4a1200" />
      <ellipse cx="39" cy="14" rx="3" ry="2.8" fill="#4a1200" />
      <ellipse cx="21" cy="14" rx="1.8" ry="1.7" fill="#cc4400" />
      <ellipse cx="39" cy="14" rx="1.8" ry="1.7" fill="#cc4400" />
      {/* Slit pupils — vertical, intense */}
      <ellipse cx="21" cy="14" rx="0.7" ry="2" fill="#ff8800" />
      <ellipse cx="39" cy="14" rx="0.7" ry="2" fill="#ff8800" />
      {/* Eye outer glow rings */}
      <ellipse cx="21" cy="14" rx="5" ry="4.5" fill="none" stroke="#ff4400" strokeWidth="0.5" opacity="0.4" />
      <ellipse cx="39" cy="14" rx="5" ry="4.5" fill="none" stroke="#ff4400" strokeWidth="0.5" opacity="0.4" />

      {/* === FURNACE MOUTH — glowing from inside === */}
      {/* Mouth cavity — wide, jagged, glowing */}
      <path d="M16 22 C18 26 24 29 30 29 C36 29 42 26 44 22 C40 24 36 25 30 25 C24 25 20 24 16 22 Z" fill="#1a0000" />
      {/* Inner furnace glow */}
      <path d="M18 23 C22 27 28 28.5 30 28.5 C32 28.5 38 27 42 23" fill="#cc3300" opacity="0.6" />
      <path d="M20 24 C24 27 28 28 30 28 C32 28 36 27 40 24" fill="#ff5500" opacity="0.5" />
      <path d="M22 24.5 C26 27 29 27.5 30 27.5 C31 27.5 34 27 38 24.5" fill="#ff8800" opacity="0.4" />
      {/* Upper teeth — massive jagged rock spikes */}
      <path d="M17 22 L15 26 M20 23 L18.5 27.5 M24 24 L23 28 M28 24.5 L27.5 28.5 M32 24.5 L32.5 28.5 M36 24 L37 28 M40 23 L41.5 27.5 M43 22 L45 26" stroke="#2a0a00" strokeWidth="1.5" strokeLinecap="square" />
      {/* Mouth crack glow along jaw line */}
      <path d="M16 22 C20 21 24 21 30 21 C36 21 40 21 44 22" stroke="#ff4400" strokeWidth="0.8" fill="none" opacity="0.5" />
    </svg>
  );
}

function NPCSprite() {
  return (
    <svg
      width="26"
      height="44"
      viewBox="0 0 26 44"
      style={{ animation: "npc-idle 3.2s ease-in-out infinite" }}
    >
      <ellipse cx="13" cy="43" rx="6" ry="1.8" fill="rgba(0,0,0,0.4)" />
      <path d="M7 18 C5 27 5 37 6 41 L20 41 C21 37 21 27 19 18 Z" fill="#4a3020" />
      <path d="M10 20 L9 40" stroke="#3a2015" strokeWidth="1" fill="none" />
      <rect x="6" y="29" width="14" height="2.5" rx="1" fill="#2a1a0a" />
      <rect x="11" y="29" width="4" height="2.5" rx="0.5" fill="#8a6040" />
      <path d="M7 20 C4 24 4 31 5 34" stroke="#4a3020" strokeWidth="4" strokeLinecap="round" />
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
// WORLD DECORATIONS
// ═══════════════════════════════════════════════════════════════════════

function TorchFlame({ x, y }: { x: number; y: number }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 22, pointerEvents: "none" }}>
      {/* Wall bracket */}
      <div
        style={{
          width: 6, height: 20, background: "#2a1a00",
          border: "1px solid #3a2a10", margin: "0 auto", borderRadius: "1px",
        }}
      />
      {/* Flame SVG */}
      <div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)" }}>
        <svg
          width="22"
          height="30"
          viewBox="0 0 22 30"
          overflow="visible"
          style={{ animation: "flame-flicker .42s ease-in-out infinite", transformOrigin: "bottom center", display: "block" }}
        >
          <path d="M11 2 C7 5 3 11 4 17 C5 23 9 27 11 29 C13 27 17 23 18 17 C19 11 15 5 11 2Z" fill="#ff6600" />
          <path d="M11 7 C8 10 6 15 7 19 C8 23 10 26 11 28 C12 26 14 23 15 19 C16 15 14 10 11 7Z" fill="#ffaa00" />
          <path d="M11 13 C9 15 9 19 10 21 C10.5 23 11 25 11 25 C11 25 11.5 23 12 21 C13 19 13 15 11 13Z" fill="#ffeeaa" opacity=".88" />
          <ellipse cx="11" cy="21" rx="6" ry="3.5" fill="#ff8800" opacity=".28" />
        </svg>
      </div>
      {/* Floor glow pool */}
      <div
        style={{
          position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)",
          width: 50, height: 16,
          background: "radial-gradient(ellipse, rgba(255,120,0,.22) 0%, transparent 70%)",
          animation: "torch-light-pulse 1.2s ease-in-out infinite",
        }}
      />
    </div>
  );
}

function DungeonEntrance() {
  return (
    <div
      style={{
        position: "absolute",
        left: DUNGEON.x, top: DUNGEON.y,
        width: DUNGEON.w, height: DUNGEON.h,
        border: "3px solid #cc2200",
        borderRadius: "50% 50% 0 0 / 40% 40% 0 0",
        background: "radial-gradient(ellipse at 50% 0%, rgba(150,30,0,.95) 0%, rgba(20,0,0,1) 60%)",
        animation: "dungeon-pulse 2s ease-in-out infinite",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: 8,
        cursor: "pointer",
        overflow: "hidden",
      }}
    >
      {/* Archway decorations */}
      <div
        style={{
          position: "absolute", inset: 4,
          border: "1px solid rgba(220,80,0,.4)",
          borderRadius: "50% 50% 0 0 / 40% 40% 0 0",
          pointerEvents: "none",
        }}
      />
      <div style={{ color: "#ff4400", fontSize: 8, fontFamily: "monospace", fontWeight: "bold", letterSpacing: "0.12em", textShadow: "0 0 8px #ff4400" }}>
        FURNACE LANES
      </div>
      <div style={{ fontSize: 22, marginTop: 4, filter: "drop-shadow(0 0 8px #ff4400)" }}>🔥</div>
      <div style={{ color: "#880000", fontSize: 7, fontFamily: "monospace", marginTop: 2, letterSpacing: "0.08em" }}>
        ENTER?
      </div>
    </div>
  );
}

function CrackedPillar({ x, y }: { x: number; y: number }) {
  return (
    <div
      style={{
        position: "absolute", left: x, top: y, width: 28, height: 80,
        background: "linear-gradient(180deg, #2a1800 0%, #1e1200 50%, #2a1800 100%)",
        border: "1px solid #3a2200",
        borderRadius: "3px",
        animation: "pillar-glow 3s ease-in-out infinite",
        pointerEvents: "none",
      }}
    >
      {/* Crack lines */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <svg width="28" height="80" viewBox="0 0 28 80">
          <path d="M14 5 L12 20 L16 35 L11 55 L15 75" stroke="#0a0600" strokeWidth="1.2" fill="none" opacity="0.7" />
          <path d="M12 20 L8 28 M16 35 L20 42" stroke="#0a0600" strokeWidth="0.8" fill="none" opacity="0.5" />
        </svg>
      </div>
      {/* Cap */}
      <div style={{ position: "absolute", top: 0, left: -3, right: -3, height: 8, background: "#3a2200", borderRadius: "2px 2px 0 0" }} />
      <div style={{ position: "absolute", bottom: 0, left: -3, right: -3, height: 8, background: "#3a2200" }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// OVERWORLD VIEW
// ═══════════════════════════════════════════════════════════════════════

interface OverworldProps {
  kaelHp: number;
  kaelMaxHp: number;
  kaelAp: number;
  kaelMaxAp: number;
  onEnterCombat: (type: "imp" | "pete") => void;
}

function OverworldView({ kaelHp, kaelMaxHp, kaelAp, kaelMaxAp, onEnterCombat }: OverworldProps) {
  // Authoritative position refs (RAF loop reads/writes these)
  const kaelPosRef = useRef({ x: KAEL_SPAWN.x, y: KAEL_SPAWN.y });
  const kaelDirRef = useRef<Direction>("down");
  const kaelWalkingRef = useRef(false);
  const keysRef = useRef(new Set<string>());
  const impsRef = useRef<ImpState[]>(IMP_INIT.map((i) => ({ ...i })));
  const rafRef = useRef(0);
  const inCombatRef = useRef(false);
  const nearNPCIdRef = useRef<string | null>(null);
  const onEnterCombatRef = useRef(onEnterCombat);
  useEffect(() => { onEnterCombatRef.current = onEnterCombat; }, [onEnterCombat]);

  // React state — only for things that need to re-render
  const [kaelPos, setKaelPos] = useState({ x: KAEL_SPAWN.x, y: KAEL_SPAWN.y });
  const [kaelDir, setKaelDir] = useState<Direction>("down");
  const [kaelWalking, setKaelWalking] = useState(false);
  const [imps, setImps] = useState<ImpState[]>(IMP_INIT.map((i) => ({ ...i })));
  const [nearNPC, setNearNPC] = useState<string | null>(null);
  const [dialogueNPC, setDialogueNPC] = useState<string | null>(null);
  const [dialogueLine, setDialogueLine] = useState(0);

  const viewportRef = useRef<HTMLDivElement>(null);

  // Key handlers — on viewport div
  const handleKeyDown = (e: React.KeyboardEvent) => {
    keysRef.current.add(e.code);
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
    }
    if (e.code === "KeyE" || e.code === "Space") {
      const npcId = nearNPCIdRef.current;
      if (npcId && !dialogueNPC) {
        setDialogueNPC(npcId);
        setDialogueLine(0);
      } else if (dialogueNPC) {
        const npc = NPC_DATA.find((n) => n.id === dialogueNPC);
        if (npc && dialogueLine < npc.dialogue.length - 1) {
          setDialogueLine((l) => l + 1);
        } else {
          setDialogueNPC(null);
          setDialogueLine(0);
        }
      }
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    keysRef.current.delete(e.code);
  };

  // Auto-focus viewport so arrow keys work immediately
  useEffect(() => {
    viewportRef.current?.focus();
  }, []);

  // RAF game loop
  useEffect(() => {
    let frame = 0;

    const tick = () => {
      if (inCombatRef.current) return;
      frame++;
      const keys = keysRef.current;
      const pos = kaelPosRef.current;

      // Movement
      let dx = 0;
      let dy = 0;
      if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= KAEL_SPEED;
      if (keys.has("ArrowRight") || keys.has("KeyD")) dx += KAEL_SPEED;
      if (keys.has("ArrowUp") || keys.has("KeyW")) dy -= KAEL_SPEED;
      if (keys.has("ArrowDown") || keys.has("KeyS")) dy += KAEL_SPEED;
      if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

      pos.x = Math.max(20, Math.min(WORLD_W - 60, pos.x + dx));
      pos.y = Math.max(BOUND_TOP, Math.min(BOUND_BOTTOM, pos.y + dy));

      // Direction
      let newDir = kaelDirRef.current;
      if (Math.abs(dx) > Math.abs(dy)) {
        newDir = dx < 0 ? "left" : "right";
      } else if (dy !== 0) {
        newDir = dy < 0 ? "up" : "down";
      }
      const isWalking = dx !== 0 || dy !== 0;
      kaelDirRef.current = newDir;
      kaelWalkingRef.current = isWalking;

      // Update imps
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
        imp.x += imp.dx;
        imp.y += imp.dy;
        if (imp.x < zone[0] || imp.x > zone[1]) { imp.dx *= -1; imp.x = Math.max(zone[0], Math.min(zone[1], imp.x)); }
        if (imp.y < zone[2] || imp.y > zone[3]) { imp.dy *= -1; imp.y = Math.max(zone[2], Math.min(zone[3], imp.y)); }
      }

      // Collision detection
      const kaelCX = pos.x + KAEL_W / 2;
      const kaelCY = pos.y + KAEL_H * 0.75; // feet area

      for (const imp of impsData) {
        if (!imp.alive) continue;
        const dist = Math.hypot(kaelCX - (imp.x + 14), kaelCY - (imp.y + 30));
        if (dist < 36) {
          inCombatRef.current = true;
          imp.alive = false;
          onEnterCombatRef.current("imp");
          return;
        }
      }

      // Pete collision
      const peteDist = Math.hypot(kaelCX - (PETE_POS.x + 30), kaelCY - (PETE_POS.y + 60));
      if (peteDist < 58) {
        inCombatRef.current = true;
        onEnterCombatRef.current("pete");
        return;
      }

      // Dungeon entrance collision
      const dungCX = DUNGEON.x + DUNGEON.w / 2;
      const dungCY = DUNGEON.y + DUNGEON.h * 0.75;
      const dungDist = Math.hypot(kaelCX - dungCX, kaelCY - dungCY);
      if (dungDist < 62) {
        inCombatRef.current = true;
        onEnterCombatRef.current("pete");
        return;
      }

      // NPC proximity
      let newNearNPC: string | null = null;
      for (const npc of NPC_DATA) {
        const dist = Math.hypot(kaelCX - (npc.x + 13), kaelCY - (npc.y + 40));
        if (dist < 64) { newNearNPC = npc.id; break; }
      }
      if (newNearNPC !== nearNPCIdRef.current) {
        nearNPCIdRef.current = newNearNPC;
        setNearNPC(newNearNPC);
        if (!newNearNPC) {
          setDialogueNPC(null);
          setDialogueLine(0);
        }
      }

      // Batch React state update every 2 frames
      if (frame % 2 === 0) {
        setKaelPos({ x: pos.x, y: pos.y });
        setKaelDir(newDir);
        setKaelWalking(isWalking);
        setImps(impsData.map((imp) => ({ ...imp })));
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); };
  }, []);

  // Camera: clamp so world doesn't scroll past edges
  const camX = Math.max(0, Math.min(WORLD_W - VIEW_W, kaelPos.x - VIEW_W / 2 + KAEL_W / 2));
  const camY = Math.max(0, Math.min(WORLD_H - VIEW_H, kaelPos.y - VIEW_H / 2 + KAEL_H / 2));

  const activeNPCData = dialogueNPC ? NPC_DATA.find((n) => n.id === dialogueNPC) : null;

  const hpPct = kaelHp / kaelMaxHp;
  const apPct = kaelAp / kaelMaxAp;

  // Mini-map scale
  const MM_W = 120;
  const MM_H = 68;
  const mmScale = MM_W / WORLD_W;

  return (
    <div style={{ position: "relative", userSelect: "none" }}>
      {/* ── VIEWPORT ── */}
      <div
        ref={viewportRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        style={{
          width: VIEW_W,
          height: VIEW_H,
          overflow: "hidden",
          position: "relative",
          outline: "none",
          border: "2px solid #3a1800",
          borderRadius: "4px",
          cursor: "default",
          maxWidth: "100%",
        }}
      >
        {/* ── WORLD ── */}
        <div
          style={{
            width: WORLD_W,
            height: WORLD_H,
            position: "absolute",
            transform: `translate(${-camX}px, ${-camY}px)`,
            willChange: "transform",
          }}
        >
          {/* Base background */}
          <div
            style={{
              position: "absolute", inset: 0,
              background: "radial-gradient(ellipse at 25% 50%, #2a0e00 0%, #180800 35%, #0d0400 65%, #050200 100%)",
            }}
          />
          {/* Secondary glow from floor */}
          <div
            style={{
              position: "absolute", inset: 0,
              background: "radial-gradient(ellipse at 60% 80%, rgba(180,50,0,.18) 0%, transparent 55%)",
              animation: "ambient-pulse 4s ease-in-out infinite",
            }}
          />
          {/* Lane pattern overlay (bowling lanes underground) */}
          <div
            style={{
              position: "absolute", inset: 0,
              backgroundImage: [
                "repeating-linear-gradient(90deg, rgba(255,100,0,.025) 0px, rgba(255,100,0,.025) 1px, transparent 1px, transparent 80px)",
                "repeating-linear-gradient(0deg, rgba(255,100,0,.02) 0px, rgba(255,100,0,.02) 1px, transparent 1px, transparent 80px)",
              ].join(","),
              pointerEvents: "none",
            }}
          />
          {/* Top wall */}
          <div
            style={{
              position: "absolute", top: 0, left: 0, right: 0, height: BOUND_TOP,
              background: "linear-gradient(180deg, #060200 0%, #100600 70%, transparent 100%)",
              borderBottom: "2px solid #2a1000",
            }}
          />
          {/* Bottom wall */}
          <div
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: WORLD_H - BOUND_BOTTOM,
              background: "linear-gradient(0deg, #060200 0%, #100600 70%, transparent 100%)",
              borderTop: "2px solid #2a1000",
            }}
          />

          {/* Torches */}
          {TORCHES.map((t, i) => <TorchFlame key={i} x={t.x} y={t.y} />)}

          {/* Ember particles */}
          {EMBERS.map((e, i) => (
            <div
              key={i}
              style={{
                position: "absolute", left: e.x, top: e.y,
                width: 3, height: 3, borderRadius: "50%",
                background: i % 2 === 0 ? "#ff8800" : "#ffaa44",
                boxShadow: "0 0 3px #ff6600",
                animation: `${e.anim} ${e.dur}s ease-out ${e.delay}s infinite`,
                pointerEvents: "none",
              }}
            />
          ))}

          {/* Smoke wisps near torches */}
          {TORCHES.slice(0, 6).map((t, i) => (
            <div
              key={i}
              style={{
                position: "absolute", left: t.x + 8, top: t.y - 10,
                width: 12, height: 12, borderRadius: "50%",
                background: "rgba(80,40,20,.35)",
                animation: `smoke-drift ${3.5 + i * 0.4}s ease-out ${i * 0.6}s infinite`,
                pointerEvents: "none",
                filter: "blur(4px)",
              }}
            />
          ))}

          {/* Cracked pillars */}
          {PILLARS.map((p, i) => <CrackedPillar key={i} x={p.x} y={p.y} />)}

          {/* NPCs */}
          {NPC_DATA.map((npc) => (
            <div
              key={npc.id}
              style={{
                position: "absolute",
                left: npc.x,
                top: npc.y,
                width: 26,
              }}
            >
              {/* Exclamation when near */}
              {nearNPC === npc.id && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "100%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    color: "#f5a623",
                    fontSize: 13,
                    fontWeight: "bold",
                    fontFamily: "monospace",
                    textShadow: "0 0 6px #f5a623",
                    animation: "npc-exclaim .7s ease-in-out infinite",
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                    marginBottom: 2,
                  }}
                >
                  !
                </div>
              )}
              <NPCSprite />
              <div
                style={{
                  textAlign: "center",
                  fontSize: 7,
                  fontFamily: "monospace",
                  color: "#8a6040",
                  marginTop: 1,
                  letterSpacing: "0.04em",
                  whiteSpace: "nowrap",
                }}
              >
                {npc.name}
              </div>
            </div>
          ))}

          {/* Fire Imps */}
          {imps.map((imp) =>
            imp.alive ? (
              <div
                key={imp.id}
                style={{ position: "absolute", left: imp.x, top: imp.y }}
              >
                <ImpSprite />
                <div
                  style={{
                    textAlign: "center", fontSize: 6,
                    fontFamily: "monospace", color: "#cc4400",
                    marginTop: 1, letterSpacing: "0.04em",
                  }}
                >
                  Fire Imp
                </div>
              </div>
            ) : null
          )}

          {/* Cinder Pete */}
          <div style={{ position: "absolute", left: PETE_POS.x, top: PETE_POS.y }}>
            <PeteBossSprite />
            <div
              style={{
                textAlign: "center", fontSize: 7,
                fontFamily: "monospace", color: "#ff4400",
                marginTop: 2, letterSpacing: "0.06em",
                textShadow: "0 0 6px #ff4400",
                fontWeight: "bold",
              }}
            >
              CINDER PETE
            </div>
          </div>

          {/* Dungeon Entrance */}
          <DungeonEntrance />

          {/* Kael */}
          <div style={{ position: "absolute", left: kaelPos.x, top: kaelPos.y }}>
            <KaelSprite direction={kaelDir} walking={kaelWalking} />
          </div>
        </div>

        {/* ── HUD OVERLAY (inside viewport, position absolute) ── */}
        {/* Top-left: HP / AP */}
        <div
          style={{
            position: "absolute", top: 8, left: 8,
            background: "rgba(10,5,0,.82)",
            border: "1px solid rgba(245,166,35,.35)",
            borderRadius: 3, padding: "5px 8px",
            fontFamily: "monospace", fontSize: 9, pointerEvents: "none",
          }}
        >
          <div style={{ color: "#888", marginBottom: 3, fontSize: 8, letterSpacing: "0.1em" }}>KAEL</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
            <span style={{ color: "#666", width: 14 }}>HP</span>
            <div style={{ width: 64, height: 6, background: "#1a0800", border: "1px solid #222", borderRadius: 1, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.max(0, hpPct * 100)}%`, background: hpPct > 0.5 ? "#00cc44" : hpPct > 0.25 ? "#ccaa00" : "#cc2200", transition: "width .4s" }} />
            </div>
            <span style={{ color: hpPct > 0.5 ? "#00cc44" : hpPct > 0.25 ? "#ccaa00" : "#cc2200", fontSize: 8 }}>{kaelHp}/{kaelMaxHp}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ color: "#666", width: 14 }}>AP</span>
            <div style={{ width: 64, height: 6, background: "#000d1a", border: "1px solid #222", borderRadius: 1, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.max(0, apPct * 100)}%`, background: "#4488ff", transition: "width .4s" }} />
            </div>
            <span style={{ color: "#4488ff", fontSize: 8 }}>{kaelAp}/{kaelMaxAp}</span>
          </div>
        </div>

        {/* Top-center: Region name */}
        <div
          style={{
            position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)",
            background: "rgba(10,5,0,.75)",
            border: "1px solid rgba(245,166,35,.3)",
            borderRadius: 3, padding: "4px 12px",
            fontFamily: "monospace", fontSize: 9, fontWeight: "bold",
            color: "#f5a623", letterSpacing: "0.12em",
            textShadow: "0 0 8px rgba(245,166,35,.5)",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          THE EMBER ALLEYS
        </div>

        {/* Top-right: STK balance */}
        <div
          style={{
            position: "absolute", top: 8, right: 8,
            background: "rgba(10,5,0,.82)",
            border: "1px solid rgba(245,166,35,.35)",
            borderRadius: 3, padding: "5px 8px",
            fontFamily: "monospace", fontSize: 9,
            color: "#f5a623", pointerEvents: "none",
          }}
        >
          <div style={{ color: "#666", fontSize: 8, marginBottom: 2 }}>STK</div>
          <div style={{ fontWeight: "bold", textShadow: "0 0 4px rgba(245,166,35,.5)" }}>150</div>
        </div>

        {/* Bottom-right: mini-map */}
        <div
          style={{
            position: "absolute", bottom: 8, right: 8,
            background: "rgba(5,3,0,.88)",
            border: "1px solid rgba(245,166,35,.35)",
            borderRadius: 3, padding: 4,
            pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: 7, fontFamily: "monospace", color: "#555", marginBottom: 2, letterSpacing: "0.08em" }}>MAP</div>
          <div style={{ position: "relative", width: MM_W, height: MM_H, background: "#0d0500", border: "1px solid #2a1000", borderRadius: 2, overflow: "hidden" }}>
            {/* World outline tint */}
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, rgba(180,50,0,.1) 0%, transparent 70%)" }} />
            {/* Pete dot */}
            <div style={{ position: "absolute", width: 5, height: 5, borderRadius: "50%", background: "#ff4400", left: PETE_POS.x * mmScale - 2.5, top: PETE_POS.y * mmScale - 2.5, boxShadow: "0 0 3px #ff4400" }} />
            {/* Dungeon dot */}
            <div style={{ position: "absolute", width: 5, height: 4, background: "#cc2200", left: DUNGEON.x * mmScale, top: DUNGEON.y * mmScale, borderRadius: 1 }} />
            {/* NPC dots */}
            {NPC_DATA.map((npc) => (
              <div key={npc.id} style={{ position: "absolute", width: 3, height: 3, borderRadius: "50%", background: "#f5a623", left: npc.x * mmScale - 1.5, top: npc.y * mmScale - 1.5 }} />
            ))}
            {/* Imp dots */}
            {imps.map((imp) => imp.alive ? (
              <div key={imp.id} style={{ position: "absolute", width: 3, height: 3, borderRadius: "50%", background: "#ff6600", left: imp.x * mmScale - 1.5, top: imp.y * mmScale - 1.5 }} />
            ) : null)}
            {/* Kael dot */}
            <div style={{ position: "absolute", width: 4, height: 4, borderRadius: "50%", background: "#ffffff", left: kaelPos.x * mmScale - 2, top: kaelPos.y * mmScale - 2, boxShadow: "0 0 3px #fff" }} />
          </div>
        </div>

        {/* Controls hint (bottom-left) */}
        <div
          style={{
            position: "absolute", bottom: 8, left: 8,
            background: "rgba(10,5,0,.7)",
            border: "1px solid rgba(245,166,35,.2)",
            borderRadius: 3, padding: "4px 7px",
            fontFamily: "monospace", fontSize: 7,
            color: "#555", pointerEvents: "none", lineHeight: 1.6,
          }}
        >
          <div>WASD / ↑↓←→ move</div>
          <div>E / SPACE interact</div>
        </div>

        {/* Dialogue box */}
        {activeNPCData && (
          <div
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "rgba(8,4,0,.94)",
              border: "2px solid #f5a623",
              borderBottom: "none",
              borderRadius: "4px 4px 0 0",
              padding: "10px 14px",
              fontFamily: "monospace",
            }}
          >
            <div style={{ fontSize: 9, color: "#f5a623", fontWeight: "bold", letterSpacing: "0.1em", marginBottom: 5 }}>
              {activeNPCData.name}
            </div>
            <div style={{ fontSize: 11, color: "#ddc890", lineHeight: 1.5 }}>
              {activeNPCData.dialogue[dialogueLine]}
            </div>
            <div style={{ fontSize: 8, color: "#444", marginTop: 5, textAlign: "right" }}>
              {dialogueLine < activeNPCData.dialogue.length - 1 ? "SPACE / E — next ▶" : "SPACE / E — close ✕"}
            </div>
          </div>
        )}
      </div>

      {/* Click-to-focus hint when not focused */}
      <div style={{ fontSize: 9, fontFamily: "monospace", color: "#4a3020", marginTop: 4, textAlign: "center" }}>
        Click the map to capture keyboard input
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// COMBAT CONSTANTS & FORMULAS  — unchanged from original
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
// COMBAT VIEW  — all existing battle mechanics, plus return-to-overworld
// ═══════════════════════════════════════════════════════════════════════

interface CombatViewProps {
  enemyType: "imp" | "pete";
  onReturnToOverworld: () => void;
}

function CombatView({ enemyType, onReturnToOverworld }: CombatViewProps) {
  const enemyInit = enemyType === "pete" ? PETE_INIT : IMP_ENEMY_INIT;

  const [kael, setKael] = useState<CharStats>({ ...KAEL_INIT });
  const [enemy, setEnemy] = useState<CharStats>({ ...enemyInit });
  const [phase, setPhase] = useState<BattlePhase>("menu");
  const [logs, setLogs] = useState<LogLine[]>([
    {
      text: enemyType === "pete"
        ? "Cinder Pete blocks the path! Prepare to fight!"
        : "A Fire Imp attacks!",
      type: "system",
    },
    { text: 'Equipped: Basic Strike (Common) — Select ULTIMATE to activate the Strike Gauge.', type: "system" },
  ]);
  const [enemyEnraged, setEnemyEnraged] = useState(false);
  const [kaelDefending, setKaelDefending] = useState(false);
  const [gaugeResult, setGaugeResult] = useState<GaugeResult | null>(null);
  const [itemsLeft, setItemsLeft] = useState(3);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const arrowPosRef = useRef(0);
  const arrowDirRef = useRef(1);
  const rafRef = useRef(0);

  const stateRef = useRef({ kael, enemy, enemyEnraged, kaelDefending });
  useEffect(() => { stateRef.current = { kael, enemy, enemyEnraged, kaelDefending }; }, [kael, enemy, enemyEnraged, kaelDefending]);

  function addLog(line: LogLine) { setLogs((prev) => [...prev.slice(-8), line]); }

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
      setEnemy((p) => ({ ...p, hp: 0 })); setPhase("victory");
      const xp = enemyType === "pete" ? 50 : 20;
      const stk = enemyType === "pete" ? 150 : 40;
      addLog({ text: `${newEnemy.name} defeated! VICTORY! +${xp} XP • +${stk} STK`, type: "system" });
      return;
    }
    setEnemy(newEnemy); setPhase("enemy");
    setTimeout(() => {
      const kaelAfter = runEnemyTurn(newKael, newEnemy, finalEnraged, defending);
      setKaelDefending(false); setKael(kaelAfter);
      if (kaelAfter.hp <= 0) { addLog({ text: "Kael has fallen! DEFEAT!", type: "system" }); setPhase("defeat"); }
      else setPhase("menu");
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
    if (itemsLeft <= 0) { addLog({ text: "No Health Potions remaining!", type: "system" }); return; }
    setPhase("enemy"); const heal = 60;
    setItemsLeft((n) => n - 1);
    const newKael = { ...kael, hp: Math.min(kael.maxHp, kael.hp + heal) };
    setKael(newKael);
    addLog({ text: `Used Health Potion! Kael recovers ${heal} HP. (${itemsLeft - 1} left)`, type: "heal" });
    afterPlayerAction(enemy, newKael, kaelDefending, enemyEnraged);
  }

  function handleFlee() {
    if (phase !== "menu") return;
    if (enemyType === "pete") { addLog({ text: "Can't flee from a boss fight!", type: "system" }); return; }
    const fleeChance = Math.min(0.9, Math.max(0.1, (kael.spd / enemy.spd) * 0.6));
    if (Math.random() < fleeChance) {
      addLog({ text: "Kael escapes!", type: "system" }); setPhase("victory");
    } else {
      addLog({ text: "Couldn't escape!", type: "system" }); setPhase("enemy");
      setTimeout(() => {
        const s = stateRef.current;
        const kaelAfter = runEnemyTurn(s.kael, s.enemy, s.enemyEnraged, false);
        setKael(kaelAfter);
        if (kaelAfter.hp <= 0) { addLog({ text: "Kael has fallen!", type: "system" }); setPhase("defeat"); }
        else setPhase("menu");
      }, 1100);
    }
  }

  // Canvas animation loop
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
  const kaelHpPct = kael.hp / kael.maxHp;
  const kaelApPct = kael.ap / kael.maxAp;
  const isMenu = phase === "menu";
  const enemyPips = Math.ceil(enemyHpPct * 3);
  const isBoss = enemyType === "pete";

  return (
    <div className="space-y-4">
      {/* Return button row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Button variant="outline" size="sm" onClick={onReturnToOverworld}
          style={{ fontSize: 11, fontFamily: "monospace", borderColor: "#3a2200", color: "#f5a623" }}>
          ← Return to Overworld
        </Button>
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
              {/* Enemy sprite */}
              <div style={{ textAlign: "center", marginBottom: 14 }}>
                <div style={{ fontSize: isBoss ? 52 : 36, lineHeight: 1, filter: enemyEnraged ? "drop-shadow(0 0 12px #ff4400)" : "drop-shadow(0 0 6px #f5a623)", transition: "filter 0.5s" }}>
                  {enemy.hp <= 0 ? "💀" : isBoss ? "🔥" : "👿"}
                </div>
                <div style={{ fontSize: 13, fontWeight: "bold", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 6, color: enemyEnraged ? "#ff4400" : "#f5a623", textShadow: enemyEnraged ? "0 0 10px #ff4400" : "0 0 6px #f5a623" }}>
                  {enemyEnraged ? `⚠  ${enemy.name.toUpperCase()}  [BERSERK]  ⚠` : enemy.name.toUpperCase()}
                </div>
                <div style={{ fontSize: 10, color: "#666", marginTop: 2, letterSpacing: "0.08em" }}>
                  {isBoss ? "Sub-Boss" : "Common Enemy"} · Region 1: The Ember Alleys
                </div>
              </div>
              {/* Enemy HP bar */}
              <div style={{ width: "100%", maxWidth: 340 }}>
                <div style={{ fontSize: 9, color: "#777", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{enemy.name}</div>
                <div style={{ height: 14, background: "#2a0a00", border: "1px solid #333", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.max(0, enemyHpPct * 100)}%`, background: enemyHpPct > 0.5 ? "linear-gradient(90deg,#cc4400,#ff6600)" : enemyHpPct > 0.25 ? "linear-gradient(90deg,#882200,#cc3300)" : "linear-gradient(90deg,#440000,#880000)", transition: "width .4s ease,background .5s" }} />
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 4, justifyContent: "center" }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ width: 18, height: 6, borderRadius: 1, background: i < enemyPips ? "#ff6600" : "#2a0a00", border: "1px solid #333", transition: "background .3s" }} />
                  ))}
                </div>
              </div>
              {/* Victory overlay */}
              {phase === "victory" && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,30,0,.88)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <div style={{ fontSize: 36 }}>🏆</div>
                  <div style={{ color: "#00dd66", fontWeight: "bold", fontSize: 22, letterSpacing: "0.15em" }}>VICTORY!</div>
                  <div style={{ color: "#88cc88", fontSize: 12 }}>{isBoss ? "+50 XP · +150 STK · Ember Keystone dropped" : "+20 XP · +40 STK"}</div>
                </div>
              )}
              {/* Defeat overlay */}
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
                  <Button onClick={onReturnToOverworld} size="sm" style={{ background: "rgba(40,20,0,.9)", border: "1px solid #f5a623", color: "#f5a623", fontFamily: "monospace", fontSize: 11 }}>
                    ← Return to Overworld
                  </Button>
                </div>
              )}

              {phase !== "gauge" && phase !== "result" && phase !== "victory" && phase !== "defeat" && (
                <div>
                  <div style={{ color: "#555", fontSize: 10, letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" }}>
                    {phase === "enemy" ? "Enemy turn…" : "Choose action:"}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                    {([
                      { label: "⚔  ATTACK", sub: null, onClick: handleAttack, disabled: !isMenu, highlight: false },
                      { label: "✦  MAGIC", sub: `Frost Bolt (${FROST_BOLT.apCost} AP)`, onClick: handleMagic, disabled: !isMenu || kael.ap < FROST_BOLT.apCost, highlight: false },
                      { label: "★  ULTIMATE", sub: EQUIPPED_ULTIMATE.name, onClick: handleUltimate, disabled: !isMenu, highlight: true },
                      { label: "🛡  DEFEND", sub: null, onClick: handleDefend, disabled: !isMenu, highlight: false },
                      { label: "🧪  ITEM", sub: `Potion ×${itemsLeft}`, onClick: handleItem, disabled: !isMenu || itemsLeft <= 0, highlight: false },
                      { label: "↩  FLEE", sub: isBoss ? "Boss — fails" : "60% chance", onClick: handleFlee, disabled: !isMenu, highlight: false },
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
                  { label: "Kael HP", value: `${kael.hp} / ${kael.maxHp}`, color: hpColor(kael.hp, kael.maxHp) },
                  { label: "Kael AP", value: `${kael.ap} / ${kael.maxAp}`, color: "#4488ff" },
                  { label: `${enemy.name} HP`, value: `${enemy.hp} / ${enemy.maxHp}`, color: "#ff6600" },
                  { label: "Enemy Phase", value: enemyEnraged ? "BERSERK" : "Normal", color: enemyEnraged ? "#ff4400" : "#666" },
                  { label: "Items", value: `${itemsLeft}× Potion`, color: "#44dd88" },
                  { label: "Last Gauge", value: gaugeResult ?? "—", color: gaugeResult === "perfect" ? "#ffd700" : gaugeResult === "strike" ? "#ff6644" : gaugeResult === "partial" ? "#c8a000" : "#444" },
                  { label: "Phase", value: phase, color: "#888" },
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
    <div
      style={{
        width: "100%",
        height: VIEW_H,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "flash-to-black .7s ease-in forwards",
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <div style={{ color: "#ff4400", fontSize: 18, fontFamily: "monospace", fontWeight: "bold", letterSpacing: "0.2em", textShadow: "0 0 20px #ff4400", opacity: 0.9 }}>
        ⚔  BATTLE START  ⚔
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════

export function StrikeQuestTestTab() {
  const [gameView, setGameView] = useState<GameView>("overworld");
  const [enemyType, setEnemyType] = useState<"imp" | "pete">("pete");

  const handleEnterCombat = (type: "imp" | "pete") => {
    setEnemyType(type);
    setGameView("flash");
    setTimeout(() => setGameView("battle"), 720);
  };

  const handleReturnToOverworld = () => {
    setGameView("overworld");
  };

  return (
    <div className="space-y-4">
      <GameStyles />

      {/* Header */}
      <Card style={{ borderColor: "rgba(245,166,35,.4)", background: "rgba(40,20,0,.3)" }}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2" style={{ color: "#f5a623" }}>
            <Flame className="w-5 h-5" />
            Strike Quest — Region 1: The Ember Alleys
          </CardTitle>
          <CardDescription>
            {gameView === "overworld"
              ? "Overworld active — WASD/arrows to move · Walk into enemies to fight · Press E near NPCs to talk"
              : gameView === "battle"
              ? `Combat: Kael vs ${enemyType === "pete" ? "Cinder Pete (Sub-Boss)" : "Fire Imp"} · All formulas from strikequestgame-design.md §7`
              : "Entering combat…"}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Game area */}
      {gameView === "overworld" && (
        <OverworldView
          kaelHp={KAEL_INIT.hp}
          kaelMaxHp={KAEL_INIT.maxHp}
          kaelAp={KAEL_INIT.ap}
          kaelMaxAp={KAEL_INIT.maxAp}
          onEnterCombat={handleEnterCombat}
        />
      )}

      {gameView === "flash" && <FlashScreen />}

      {gameView === "battle" && (
        <CombatView
          enemyType={enemyType}
          onReturnToOverworld={handleReturnToOverworld}
        />
      )}
    </div>
  );
}
