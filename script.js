(function(){
  "use strict";

  // ============================================================
  // CONFIG
  // ============================================================
  const WORLD_W = 1600;              // internal canvas resolution, width — rectangular arena, more ground to cover
  const WORLD_H = 1000;              // internal canvas resolution, height
  const CENTER_X = WORLD_W/2;
  const CENTER_Y = WORLD_H/2;
  const AREA_SCALE = (WORLD_W*WORLD_H) / (1000*1000); // vs the original 1000x1000 square, used to scale content density
  const TOTAL_TRIBUTES = 24;       // 12 districts x 2 tributes, including player
  const DISTRICTS = [1,2,3,4,5,6,7,8,9,10,11,12];
  const BASE_OBSTACLE_COUNT = Math.round(60 * AREA_SCALE);   // trees / rocks / bushes scattered through the arena
  let OBSTACLE_COUNT = BASE_OBSTACLE_COUNT;
  const TREE_R = 22;                // uniform radius for every tree (was randomized before)
  const ROCK_R = 18;                // uniform radius for every rock
  const BUSH_R = 13;                // uniform radius for every bush
  const BASE_GRASS_ZONE_COUNT = Math.round(15 * AREA_SCALE); // patches of tall grass tributes can hide in
  let GRASS_ZONE_COUNT = BASE_GRASS_ZONE_COUNT;
  const BASE_ZONE_SHRINK_INTERVAL = 45000; // ms — longer days before the zone contracts
  let ZONE_SHRINK_INTERVAL = BASE_ZONE_SHRINK_INTERVAL;
  const BASE_ZONE_SHRINK_AMOUNT_Y = 90;
  let ZONE_SHRINK_AMOUNT_Y = BASE_ZONE_SHRINK_AMOUNT_Y;
  let ZONE_SHRINK_AMOUNT_X = ZONE_SHRINK_AMOUNT_Y * (WORLD_W/WORLD_H);
  const ZONE_MIN_RADIUS_Y = 110;
  const ZONE_MIN_RADIUS_X = ZONE_MIN_RADIUS_Y * (WORLD_W/WORLD_H);
  const ZONE_TICK_DAMAGE = 3;
  const BASE_SUPPLY_DROP_INTERVAL = 34000;
  let SUPPLY_DROP_INTERVAL = BASE_SUPPLY_DROP_INTERVAL;
  const IS_MOBILE_LAYOUT = window.matchMedia('(max-width: 759px)').matches;
  const DISTRICT_COLS = IS_MOBILE_LAYOUT ? 3 : 4; // must match .districtList grid-template-columns
  const CAMERA_ZOOM = IS_MOBILE_LAYOUT ? 2.6 : 1.7; // classic-Pokemon-style follow camera; zoomed in further on the small phone-sized Game Boy screen
  const VIEW_W = WORLD_W / CAMERA_ZOOM; // world units visible at once, horizontally
  const VIEW_H = WORLD_H / CAMERA_ZOOM; // world units visible at once, vertically
  const PLATE_RADIUS = 320;         // radius of the starting circle around the cornucopia
  const BLOODBATH_COUNTDOWN = 10;   // seconds tributes stand frozen on their plate before the gong
  const BLOODBATH_GRACE = 9000;     // ms after the gong where most tributes scatter instead of brawling

  // Career alliance — tributes from these districts start banded together,
  // gang up on a shared target, and splinter once the field gets small.
  const CAREER_DISTRICTS = [1,2,4];
  const ALLIANCE_BREAK_ALIVE_CAREERS = 2;   // alliance frays once this few Careers remain
  const ALLIANCE_BREAK_TOTAL_ALIVE = 6;     // ...or once the whole field shrinks to this size
  const ALLIANCE_TARGET_RANGE = 520;        // how far the pack will commit to chasing a shared target

  // Mutts — Gamemaker-released creatures that hunt everyone, tributes included
  const BASE_MUTT_SPAWN_DAY = 3;         // mutts start appearing once this day count is reached
  let MUTT_SPAWN_DAY = BASE_MUTT_SPAWN_DAY;
  const MUTT_COUNT_MAX = 5;
  let MUTT_COUNT_MAX_ACTIVE = MUTT_COUNT_MAX;
  const BASE_MUTT_SPAWN_INTERVAL = 20000; // ms between spawns once active
  let MUTT_SPAWN_INTERVAL = BASE_MUTT_SPAWN_INTERVAL;
  const MUTT_HP = 60;
  const MUTT_DMG = 14;
  const MUTT_SPEED = 70;
  const MUTT_ATTACK_RANGE = 30;
  const MUTT_ATTACK_COOLDOWN = 0.9;
  const MUTT_DETECT_RANGE = 260;

  // ------------------------------------------------------------
  // MUTT SPECIES — arenas can roster a set of named creature types
  // instead of the plain default mutt. Each species tunes hp/damage/speed
  // and can optionally stun instead of (or alongside) dealing damage, so
  // a big roster of weaker, more varied creatures replaces one tanky
  // generic mutt without making the arena any deadlier overall.
  // ============================================================
  const MUTT_SPECIES = {
    default: {
      key:'default', name:'Mutt',
      hp: MUTT_HP, dmg: MUTT_DMG, speed: MUTT_SPEED,
      attackRange: MUTT_ATTACK_RANGE, attackCooldown: MUTT_ATTACK_COOLDOWN, detectRange: MUTT_DETECT_RANGE,
      stunOnHit: 0, bodyColor:'#241a1a', headColor:'#2e2222', eyeColor:'#e8404a'
    },
    squirrel: {
      key:'squirrel', name:'Squirrel',
      hp: 22, dmg: 6, speed: 100,
      attackRange: 26, attackCooldown: 0.6, detectRange: 220,
      stunOnHit: 0, bodyColor:'#8a5c3a', headColor:'#a06f45', eyeColor:'#1a1210', tailColor:'#6a4428'
    },
    deer: {
      key:'deer', name:'Deer',
      hp: 40, dmg: 13, speed: 85,
      attackRange: 30, attackCooldown: 1.0, detectRange: 260,
      stunOnHit: 0, bodyColor:'#a9764a', headColor:'#c0895a', eyeColor:'#1a1210', antlerColor:'#e8e3d3'
    },
    flamingo: {
      key:'flamingo', name:'Flamingo',
      hp: 26, dmg: 4, speed: 78,
      attackRange: 32, attackCooldown: 0.9, detectRange: 230,
      stunOnHit: 1.6, bodyColor:'#e8637a', headColor:'#f08aa0', eyeColor:'#1a1210', beakColor:'#3a3028'
    },
    butterfly: {
      key:'butterfly', name:'Butterfly',
      hp: 12, dmg: 2, speed: 90,
      attackRange: 28, attackCooldown: 1.1, detectRange: 200,
      stunOnHit: 2.0, bodyColor:'#3a3028', headColor:'#3a3028', eyeColor:'#e8e3d3', wingColor:'#c96fd6', wingColor2:'#f0c869'
    },
    porcupine: {
      key:'porcupine', name:'Porcupine',
      hp: 30, dmg: 16, speed: 55,
      attackRange: 30, attackCooldown: 1.1, detectRange: 200,
      stunOnHit: 0, bodyColor:'#4a4438', headColor:'#5c5648', eyeColor:'#1a1210', quillColor:'#e8e3d3'
    }
  };
  const DEFAULT_MUTT_ROSTER = ['default'];

  // Survival — hunger and energy drain over time; food found in the arena
  // refills them, but not every berry bush is safe to eat.
  const HUNGER_MAX = 100;
  const ENERGY_MAX = 100;
  const HUNGER_DEPLETE_TIME = 90000;    // ms for hunger to drain fully from 100 to 0
  const ENERGY_DEPLETE_TIME = 130000;   // ms for energy to drain fully from 100 to 0
  const STARVE_TICK_DAMAGE = 2;
  const STARVE_TICK_INTERVAL = 1;       // seconds between starvation damage ticks
  const LOW_ENERGY_THRESHOLD = 20;
  const LOW_ENERGY_SPEED_MULT = 0.65;
  const BASE_BERRY_POISON_CHANCE = 0.35;
  let BERRY_POISON_CHANCE = BASE_BERRY_POISON_CHANCE;
  const POISON_STUN_DURATION = 3.5;     // seconds a poisoned tribute is stunned
  const POISON_DOT_DAMAGE = 4;
  const POISON_DOT_TICKS = 3;
  const POISON_DOT_INTERVAL = 1;        // seconds between poison damage ticks

  // Pond — a body of water tributes can wade into. The shallow ring lets
  // you drink to restore hunger/energy; venture into the deep center and
  // you start drowning instead.
  let POND_CENTER = { x: WORLD_W*0.74, y: WORLD_H*0.78 };
  let POND_RADIUS_X = 220;
  let POND_RADIUS_Y = 140;
  const POND_DEEP_FRAC = 0.55;          // fraction of the pond radius counted as "deep water"
  const POND_DRINK_INTERVAL = 1.4;      // seconds between sips while in the shallows
  const POND_DRINK_HUNGER = 6;
  const POND_DRINK_ENERGY = 3;
  const POND_DROWN_SPEED_MULT = 0.45;
  const POND_DROWN_TICK_INTERVAL = 1;   // seconds between drowning damage ticks
  const POND_DROWN_DAMAGE = 5;

  // Volcano — a Green Hollow hazard that periodically belches a cloud of
  // deadly gas outward from its crater. Purely arena-local: only arenas
  // whose config sets `volcano` get one, and only that ellipse is checked.
  let VOLCANO = null; // {x,y,craterR} set per-arena by applyArenaConfig()
  const VOLCANO_ERUPTION_INTERVAL = 16000; // ms between eruptions
  const VOLCANO_ERUPTION_WARN = 2200;      // ms of rumbling before gas actually hurts
  const VOLCANO_GAS_DURATION = 5200;       // ms the gas cloud stays dangerous
  const VOLCANO_GAS_RADIUS = 260;          // how far the gas reaches from the crater
  const VOLCANO_GAS_TICK_DAMAGE = 6;
  const VOLCANO_GAS_TICK_INTERVAL = 0.6;   // seconds between damage ticks while inside the gas
  let volcanoState = 'dormant';  // 'dormant' | 'warning' | 'erupting'
  let volcanoNextAt = 0;
  let volcanoStateTimer = 0;

  // ============================================================
  // ARENAS — the Gamemakers offer a choice of battlegrounds. Each one
  // re-tints the terrain, repositions/resizes the water source, and
  // tweaks a handful of survival/danger knobs (obstacle density, zone
  // shrink pace, mutt timing, berry toxicity) without touching the core
  // rules — so every arena still plays by the same systems, just tuned
  // differently.
  // ============================================================
  const ARENAS = {
    meadowlands: {
      id:'meadowlands',
      name:'The Meadowlands',
      desc:'Balanced forest, meadow, cave and lake quadrants — the classic Games.',
      swatch: 'linear-gradient(135deg,#3f7a42,#2e5c33 45%,#356a4a)',
      tint: null,
      biomeColors: { forest:'#2e5c33', meadow:'#3f7a42', cave:'#4a5245', water:'#356a4a' },
      pond: { fx:0.74, fy:0.78, rx:220, ry:140 },
      obstacleMult: 1, grassMult: 1,
      zoneScale: 1, shrinkMult: 1, supplyMult: 1,
      muttDayOffset: 0, muttIntervalMult: 1,
      poisonMult: 1,
      muttRoster: DEFAULT_MUTT_ROSTER, muttCountMax: MUTT_COUNT_MAX,
      showPath: true, flowerMult: 1, volcano: null
    },
    frozen: {
      id:'frozen',
      name:'The Frozen Waste',
      desc:'Snowbound tundra, a frozen lake, and thin cover — the cold kills as fast as the Careers.',
      swatch: 'linear-gradient(135deg,#c9d8e0,#7a94a0 45%,#4a7a94)',
      tint: 'rgba(170,210,230,0.16)',
      biomeColors: { forest:'#3a5a5c', meadow:'#7a8f92', cave:'#5c6870', water:'#4a7a94' },
      pond: { fx:0.72, fy:0.30, rx:250, ry:130 },
      obstacleMult: 0.65, grassMult: 0.4,
      zoneScale: 0.88, shrinkMult: 1.25, supplyMult: 0.85,
      muttDayOffset: -1, muttIntervalMult: 0.85,
      poisonMult: 0.7,
      muttRoster: DEFAULT_MUTT_ROSTER, muttCountMax: MUTT_COUNT_MAX,
      showPath: true, flowerMult: 1, volcano: null
    },
    scorched: {
      id:'scorched',
      name:'The Scorched Sands',
      desc:'Desert arena — sparse trees, rocky cover, and a shrinking oasis worth fighting for.',
      swatch: 'linear-gradient(135deg,#d9a94a,#b8823a 45%,#8a5c2a)',
      tint: 'rgba(220,150,60,0.16)',
      biomeColors: { forest:'#7a6a34', meadow:'#c9a13b', cave:'#8a6a3a', water:'#3a7a8a' },
      pond: { fx:0.5, fy:0.5, rx:130, ry:90 },
      obstacleMult: 0.75, grassMult: 0.55,
      zoneScale: 1.08, shrinkMult: 0.9, supplyMult: 1.15,
      muttDayOffset: 1, muttIntervalMult: 1,
      poisonMult: 1.35,
      muttRoster: DEFAULT_MUTT_ROSTER, muttCountMax: MUTT_COUNT_MAX,
      showPath: true, flowerMult: 1, volcano: null
    },
    jungle: {
      id:'jungle',
      name:'The Green Hollow',
      desc:'A blooming, riotously colorful jungle around a live volcano — thick cover, thicker danger, and a menagerie of small mutts instead of one big threat.',
      swatch: 'linear-gradient(135deg,#e8637a,#4f9a52 45%,#f0c869)',
      tint: 'rgba(20,60,30,0.10)',
      biomeColors: { forest:'#1f4a24', meadow:'#2e5c33', cave:'#233828', water:'#1f5c52' },
      pond: { fx:0.24, fy:0.74, rx:190, ry:130 },
      obstacleMult: 1.35, grassMult: 1.6,
      zoneScale: 0.95, shrinkMult: 1.05, supplyMult: 0.9,
      muttDayOffset: 0, muttIntervalMult: 0.75,
      poisonMult: 1.15,
      muttRoster: ['squirrel','deer','flamingo','butterfly','porcupine'], muttCountMax: 2,
      showPath: false, flowerMult: 3.4,
      volcano: { fx:0.76, fy:0.26, craterR: 60 }
    }
  };
  const ARENA_KEYS = Object.keys(ARENAS);
  let selectedArena = 'meadowlands';
  let currentArenaTint = null;
  let BIOME_BASE_ACTIVE = null; // set by applyArenaConfig()
  let currentArenaCfg = ARENAS.meadowlands;

  function applyArenaConfig(){
    const a = ARENAS[selectedArena] || ARENAS.meadowlands;
    currentArenaCfg = a;
    currentArenaTint = a.tint;
    BIOME_BASE_ACTIVE = a.biomeColors;
    POND_CENTER = { x: WORLD_W*a.pond.fx, y: WORLD_H*a.pond.fy };
    POND_RADIUS_X = a.pond.rx;
    POND_RADIUS_Y = a.pond.ry;
    OBSTACLE_COUNT = Math.round(BASE_OBSTACLE_COUNT * a.obstacleMult);
    GRASS_ZONE_COUNT = Math.round(BASE_GRASS_ZONE_COUNT * a.grassMult);
    ZONE_SHRINK_INTERVAL = Math.round(BASE_ZONE_SHRINK_INTERVAL / a.shrinkMult);
    ZONE_SHRINK_AMOUNT_Y = BASE_ZONE_SHRINK_AMOUNT_Y * a.shrinkMult;
    ZONE_SHRINK_AMOUNT_X = ZONE_SHRINK_AMOUNT_Y * (WORLD_W/WORLD_H);
    SUPPLY_DROP_INTERVAL = Math.round(BASE_SUPPLY_DROP_INTERVAL / a.supplyMult);
    MUTT_SPAWN_DAY = Math.max(1, BASE_MUTT_SPAWN_DAY + a.muttDayOffset);
    MUTT_SPAWN_INTERVAL = Math.round(BASE_MUTT_SPAWN_INTERVAL * a.muttIntervalMult);
    MUTT_COUNT_MAX_ACTIVE = a.muttCountMax || MUTT_COUNT_MAX;
    BERRY_POISON_CHANCE = clamp(BASE_BERRY_POISON_CHANCE * a.poisonMult, 0, 0.85);
    VOLCANO = a.volcano ? { x: WORLD_W*a.volcano.fx, y: WORLD_H*a.volcano.fy, craterR: a.volcano.craterR } : null;
    volcanoState = 'dormant';
    volcanoNextAt = VOLCANO ? 6000 : Infinity;
    volcanoStateTimer = 0;
    grassPattern = null; sandPattern = null; // force pattern/tint re-derivation next render
  }

  // ============================================================
  // DISTRICT PERKS — each home district trains its tributes differently.
  // Purely additive bonuses/resistances layered on top of the base rules
  // above; nothing here changes base weapon stats or arena mechanics for
  // districts that don't have a related perk.
  // ============================================================
  const DISTRICT_PERKS = {
    1:  { name:'Luxury',       desc:'Trained in combat from birth — deals 15% more damage.', dmgMult:1.15 },
    2:  { name:'Masonry',      desc:'Stonecutters\' toughness — +25 max HP.', hpBonus:25 },
    3:  { name:'Technology',   desc:'Engineers\' know-how — ranged weapons reload 20% faster.', rangedCooldownMult:0.8 },
    4:  { name:'Fishing',      desc:'Raised on the water — cannot drown, swims at full speed, and gets more from drinking.', noDrown:true, waterSpeedMult:1.0, drinkMult:1.6 },
    5:  { name:'Power',        desc:'Power-plant stamina — energy drains 25% slower.', energyDrainMult:0.75 },
    6:  { name:'Transportation', desc:'Built for speed — moves 12% faster.', speedMult:1.12 },
    7:  { name:'Lumber',       desc:'Lumberjack strength — deals 20% more damage near trees.', treeDmgMult:1.2 },
    8:  { name:'Textiles',     desc:'Handles dyes and toxins daily — poison stuns and damage cut by 40%.', poisonResistMult:0.6 },
    9:  { name:'Grain',        desc:'Grew up rationing the harvest — hunger drains 25% slower.', hungerDrainMult:0.75 },
    10: { name:'Livestock',    desc:'Herders\' vitality — slowly regenerates lost HP over time.', hpRegen:0.6 },
    11: { name:'Agriculture',  desc:'Knows which plants are safe — half the poison chance and more food from berries.', poisonChanceMult:0.5, foodMult:1.3 },
    12: { name:'Mining',       desc:'Endures harsh conditions underground — takes 30% less damage from the shrinking zone.', zoneDmgMult:0.7 }
  };
  function perkFor(district){
    return DISTRICT_PERKS[district] || {};
  }

  const COLORS = {
    12: "#5b7fb0", 1:"#c9a13b", 2:"#8a3a3a", 3:"#5c8a6a", 4:"#3a7a8a",
    5:"#8a5c3a", 6:"#7a5c8a", 7:"#4a8a4a", 8:"#a35c8a", 9:"#8a8a3a",
    10:"#8a6a4a", 11:"#6a9a4a"
  };

  const WEAPONS = {
    dagger: { name:'Dagger', type:'melee', dmg:5,  cooldown:0.34, range:36, tint:'#cfd6da', desc:'Fast strikes, low damage, short reach' },
    sword:  { name:'Sword',  type:'melee', dmg:10, cooldown:0.58, range:46, tint:'#cfd6da', desc:'Balanced speed, damage and reach' },
    axe:    { name:'Axe',    type:'melee', dmg:17, cooldown:1.05, range:46, tint:'#e0a55c', desc:'Slow but devastating damage' },
    spear:  { name:'Spear',  type:'melee', dmg:8,  cooldown:0.65, range:64, tint:'#a9caa9', desc:'Long reach keeps foes at bay' },
    bow:    { name:'Bow', type:'ranged', dmg:12, cooldown:1.25, range:340, projectileSpeed:520, tint:'#c9a13b', desc:'Long range, hits hard, slow to reload', ammoMax:8 },
    knives: { name:'Throwing Knives', type:'ranged', dmg:7, cooldown:0.55, range:230, projectileSpeed:460, tint:'#9fb8cf', desc:'Quick ranged jabs, shorter reach', ammoMax:14 }
  };
  const WEAPON_KEYS = Object.keys(WEAPONS);
  const AMMO_PICKUP_MIN = 3;
  const AMMO_PICKUP_MAX = 6;

  let selectedDistrict = 12;
  let selectedGender = 'male';

  const rand = (a,b)=> a + Math.random()*(b-a);
  const randi = (a,b)=> Math.floor(rand(a,b+1));
  const dist = (a,b)=> Math.hypot(a.x-b.x, a.y-b.y);
  const clamp = (v,a,b)=> Math.max(a, Math.min(b, v));
  function shade(hex, amt){
    const n = parseInt(hex.slice(1),16);
    let r = (n>>16)+amt, g = ((n>>8)&0xff)+amt, b=(n&0xff)+amt;
    r=clamp(r,0,255); g=clamp(g,0,255); b=clamp(b,0,255);
    return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
  }

  // ============================================================
  // AUDIO — synthesized cannon boom + starting gong (no external files)
  // ============================================================
  let audioCtx = null;
  function getAudioCtx(){
    if(!audioCtx){
      try{ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ audioCtx = null; }
    }
    if(audioCtx && audioCtx.state === 'suspended'){
      audioCtx.resume().catch(()=>{});
    }
    return audioCtx;
  }

  function playCannonSound(){
    const ctxA = getAudioCtx();
    if(!ctxA) return;
    const now = ctxA.currentTime;

    // low boom
    const osc = ctxA.createOscillator();
    const gain = ctxA.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.55);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.9, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    osc.connect(gain);
    gain.connect(ctxA.destination);
    osc.start(now);
    osc.stop(now + 1.3);

    // crack / noise burst
    const bufferSize = Math.floor(ctxA.sampleRate * 0.3);
    const buffer = ctxA.createBuffer(1, bufferSize, ctxA.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i=0;i<bufferSize;i++){
      data[i] = (Math.random()*2-1) * Math.pow(1 - i/bufferSize, 2);
    }
    const noise = ctxA.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = ctxA.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 700;
    const noiseGain = ctxA.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctxA.destination);
    noise.start(now);
  }

  function playGongSound(){
    const ctxA = getAudioCtx();
    if(!ctxA) return;
    const now = ctxA.currentTime;
    [220, 330, 440].forEach((freq,i)=>{
      const osc = ctxA.createOscillator();
      const gain = ctxA.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.5/(i+1), now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
      osc.connect(gain);
      gain.connect(ctxA.destination);
      osc.start(now);
      osc.stop(now + 2.3);
    });
  }

  function playTickSound(){
    const ctxA = getAudioCtx();
    if(!ctxA) return;
    const now = ctxA.currentTime;
    const osc = ctxA.createOscillator();
    const gain = ctxA.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    osc.connect(gain);
    gain.connect(ctxA.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  function playRumbleSound(){
    const ctxA = getAudioCtx();
    if(!ctxA) return;
    const now = ctxA.currentTime;
    const osc = ctxA.createOscillator();
    const gain = ctxA.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(45, now);
    osc.frequency.linearRampToValueAtTime(38, now + 2.0);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.4);
    gain.gain.linearRampToValueAtTime(0.0001, now + 2.1);
    const filt = ctxA.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 180;
    osc.connect(filt);
    filt.connect(gain);
    gain.connect(ctxA.destination);
    osc.start(now);
    osc.stop(now + 2.2);
  }

  // ============================================================
  // BACKGROUND MUSIC — intro theme on title/menu/district/tribute
  // screens, arena theme once the player is on the plate / playing.
  // ============================================================
  const musicIntroEl = document.getElementById('musicIntro');
  const musicArenaEl = document.getElementById('musicArena');
  if(musicIntroEl) musicIntroEl.volume = 0.45;
  if(musicArenaEl) musicArenaEl.volume = 0.45;

  function fadeAudio(el, targetVol, ms, onDone){
    if(!el) return;
    const startVol = el.volume;
    const steps = 12;
    const stepTime = ms/steps;
    let i = 0;
    const timer = setInterval(()=>{
      i++;
      el.volume = clamp(startVol + (targetVol-startVol)*(i/steps), 0, 1);
      if(i>=steps){
        clearInterval(timer);
        if(targetVol<=0.001) el.pause();
        if(onDone) onDone();
      }
    }, stepTime);
  }

  function playMusic(el, targetVol){
    if(!el) return;
    const vol = targetVol != null ? targetVol : 0.45;
    if(el.paused){
      el.volume = 0;
      el.play().catch(()=>{ /* needs a user gesture first; retried on next interaction */ });
    }
    fadeAudio(el, vol, 500);
  }

  function stopMusic(el){
    if(!el || el.paused) return;
    fadeAudio(el, 0, 400);
  }

  function playIntroMusic(){
    stopMusic(musicArenaEl);
    playMusic(musicIntroEl, 0.45);
  }

  function playArenaMusic(){
    stopMusic(musicIntroEl);
    playMusic(musicArenaEl, 0.45);
  }

  // Autoplay policies require a real user gesture before audio can start.
  // Kick off intro music on the first keypress/tap anywhere, as long as
  // we're still on one of the title/menu/selection screens.
  let musicUnlocked = false;
  function unlockMusicOnce(){
    if(musicUnlocked) return;
    musicUnlocked = true;
    if(introActive()) playIntroMusic();
  }
  document.addEventListener('keydown', unlockMusicOnce, {once:true});
  document.addEventListener('pointerdown', unlockMusicOnce, {once:true});
  document.addEventListener('touchstart', unlockMusicOnce, {once:true, passive:true});

  // ============================================================
  // DOM refs
  // ============================================================
  const startScreen = document.getElementById('startScreen');
  const endScreen = document.getElementById('endScreen');
  const gameFrame = document.getElementById('gameFrame');
  const restartBtn = document.getElementById('restartBtn');
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // ============================================================
  // TITLE-SCREEN IMAGE ASSETS — user-provided title card + circle logo.
  // Falls back to the original text/svg treatment if the file is missing.
  // ============================================================
  const titleTextLogo = document.getElementById('titleTextLogo');
  const titleCardImg = document.getElementById('titleCardImg');
  const titleSealSvg = document.getElementById('titleSealSvg');
  const titleLogoImg = document.getElementById('titleLogoImg');
  titleCardImg.addEventListener('load', ()=>{
    titleCardImg.classList.remove('hidden');
    titleTextLogo.classList.add('hidden');
  });
  titleCardImg.addEventListener('error', ()=>{
    titleCardImg.remove();
  });
  titleLogoImg.addEventListener('load', ()=>{
    titleLogoImg.classList.remove('hidden');
    titleSealSvg.classList.add('hidden');
  });
  titleLogoImg.addEventListener('error', ()=>{
    titleLogoImg.remove();
  });
  // In case the browser already finished (or already failed) loading the
  // image before these listeners were attached (e.g. cached asset).
  function checkImgAlreadySettled(img, onOk, onFail){
    if(!img.isConnected && !img.complete) return;
    if(img.complete){
      if(img.naturalWidth > 0) onOk(); else onFail();
    }
  }
  checkImgAlreadySettled(titleCardImg,
    ()=>{ titleCardImg.classList.remove('hidden'); titleTextLogo.classList.add('hidden'); },
    ()=> titleCardImg.remove());
  checkImgAlreadySettled(titleLogoImg,
    ()=>{ titleLogoImg.classList.remove('hidden'); titleSealSvg.classList.add('hidden'); },
    ()=> titleLogoImg.remove());

  // ============================================================
  // END-SCREEN SEAL IMAGE — same assets/mockingjay.png used on the title
  // screen. If it fails to load, fall back to the gold trophy-star SVG
  // instead of leaving the seal empty.
  // ============================================================
  const endSealImg = document.getElementById('endSealImg');
  const endSealFallbackSvg = '<svg viewBox="0 0 24 24" fill="#d4af37"><path d="M12 2l2.4 6.5L21 9l-5.2 4.3L17.4 21 12 17l-5.4 4 1.6-7.7L3 9l6.6-.5L12 2z"/></svg>';
  if(endSealImg){
    endSealImg.addEventListener('error', ()=>{
      endSealImg.outerHTML = endSealFallbackSvg;
    });
    checkImgAlreadySettled(endSealImg,
      ()=>{ /* loaded fine, nothing to do */ },
      ()=>{ endSealImg.outerHTML = endSealFallbackSvg; });
  }

  // ============================================================
  // PIXEL-ART ASSETS — small square sprites swapped in for the
  // procedurally-drawn terrain/obstacles. Falls back to the original
  // vector art below if an asset hasn't loaded (or is missing) yet.
  // ============================================================
  const ASSET_PATHS = {
    tree: 'assets/tree.png',
    grass: 'assets/path.png',
    tallGrass: 'assets/grass.png',
    arrow: 'assets/arrow.png',
    bow: 'assets/bow.png',
    axe: 'assets/axe.png',
    'flower-one': 'assets/flower-one.png',
    'flower-two': 'assets/flower-two.png',
    'flower-three': 'assets/flower-three.png',
    berry: 'assets/berry.png',
    dagger: 'assets/dagger.png',
    firstAid: 'assets/first-aid.png',
    spear: 'assets/spear.png',
    sword: 'assets/sword.png',
    shield: 'assets/shield.png',
    knife: 'assets/knife.png',
    mutt: 'assets/mutt.png',
    rock: 'assets/rock.png',
    sandPath: 'assets/sand-path.png',
    bush: 'assets/bush.png',
    pond: 'assets/pond.png',
    'district-1-male': 'assets/tributes/district-1-male.png',
    'district-1-female': 'assets/tributes/district-1-female.png',
    'district-2-male': 'assets/tributes/district-2-male.png',
    'district-2-female': 'assets/tributes/district-2-female.png',
    'district-3-male': 'assets/tributes/district-3-male.png',
    'district-3-female': 'assets/tributes/district-3-female.png',
    'district-4-male': 'assets/tributes/district-4-male.png',
    'district-4-female': 'assets/tributes/district-4-female.png',
    'district-5-male': 'assets/tributes/district-5-male.png',
    'district-5-female': 'assets/tributes/district-5-female.png',
    'district-6-male': 'assets/tributes/district-6-male.png',
    'district-6-female': 'assets/tributes/district-6-female.png',
    'district-7-male': 'assets/tributes/district-7-male.png',
    'district-7-female': 'assets/tributes/district-7-female.png',
    'district-8-male': 'assets/tributes/district-8-male.png',
    'district-8-female': 'assets/tributes/district-8-female.png',
    'district-9-male': 'assets/tributes/district-9-male.png',
    'district-9-female': 'assets/tributes/district-9-female.png',
    'district-10-male': 'assets/tributes/district-10-male.png',
    'district-10-female': 'assets/tributes/district-10-female.png',
    'district-11-male': 'assets/tributes/district-11-male.png',
    'district-11-female': 'assets/tributes/district-11-female.png',
    'district-12-male': 'assets/tributes/district-12-male.png',
    'district-12-female': 'assets/tributes/district-12-female.png'
  };
  const assetImages = {};
  Object.keys(ASSET_PATHS).forEach(key=>{
    const img = new Image();
    img.src = ASSET_PATHS[key];
    assetImages[key] = img;
  });
  function assetReady(key){
    const img = assetImages[key];
    return !!(img && img.complete && img.naturalWidth > 0);
  }
  // Tiling patterns for the ground/path textures — built lazily once the
  // source image has actually finished loading, then cached.
  let grassPattern = null, sandPattern = null;
  function getGrassPattern(){
    if(!grassPattern && assetReady('grass')){
      grassPattern = ctx.createPattern(assetImages.grass, 'repeat');
    }
    return grassPattern;
  }
  function getSandPattern(){
    if(!sandPattern && assetReady('sandPath')){
      sandPattern = ctx.createPattern(assetImages.sandPath, 'repeat');
    }
    return sandPattern;
  }
  // Draws an asset centered at the current translated origin, scaled to
  // targetW while preserving the source image's native aspect ratio (so
  // non-square sprites never get stretched). bottomAnchor=true sits the
  // image's bottom edge near the origin (good for trees standing on a base
  // point) instead of centering it vertically.
  function drawAssetAspect(imgKey, targetW, bottomAnchor){
    const img = assetImages[imgKey];
    const iw = img.naturalWidth || 1, ih = img.naturalHeight || 1;
    const w = targetW;
    const h = targetW * (ih / iw);
    const y = bottomAnchor ? -h*0.92 : -h/2;
    ctx.drawImage(img, -w/2, y, w, h);
  }
  const hpBar = document.getElementById('hpBar');
  const hungerBar = document.getElementById('hungerBar');
  const energyBar = document.getElementById('energyBar');
  const weaponNameEl = document.getElementById('weaponName');
  const statusTextEl = document.getElementById('statusText');
  const alertTextEl = document.getElementById('alertText');
  const perkTextEl = document.getElementById('perkText');
  const invRowEl = document.getElementById('invRow');
  const tributesLeftEl = document.getElementById('tributesLeft');
  const dayText = document.getElementById('dayText');
  const zoneWarning = document.getElementById('zoneWarning');
  const killFeed = document.getElementById('killFeed');
  const endTitle = document.getElementById('endTitle');
  const endSubtitle = document.getElementById('endSubtitle');
  const endStats = document.getElementById('endStats');
  const endSeal = document.getElementById('endSeal');
  const countdownOverlay = document.getElementById('countdownOverlay');
  const countdownNum = document.getElementById('countdownNum');
  const countdownLabel = document.getElementById('countdownLabel');
  const playerHudLabel = document.getElementById('playerHudLabel');

  // ============================================================
  // INTRO STATE MACHINE (title -> menu -> arena -> district -> tribute -> game)
  // ============================================================
  const panelTitle = document.getElementById('panelTitle');
  const panelMenu = document.getElementById('panelMenu');
  const panelText = document.getElementById('panelText');
  const panelArena = document.getElementById('panelArena');
  const panelDistrict = document.getElementById('panelDistrict');
  const panelTribute = document.getElementById('panelTribute');
  const menuListEl = document.getElementById('menuList');
  const textPanelTitleEl = document.getElementById('textPanelTitle');
  const textPanelBodyEl = document.getElementById('textPanelBody');
  const arenaCardsEl = document.getElementById('arenaCards');
  const arenaPerkLabelEl = document.getElementById('arenaPerkLabel');
  const districtListEl = document.getElementById('districtList');
  const districtPerkLabelEl = document.getElementById('districtPerkLabel');
  const tributePerkLabelEl = document.getElementById('tributePerkLabel');
  const tributeCardsEl = document.getElementById('tributeCards');
  const tributeDistrictLabelEl = document.getElementById('tributeDistrictLabel');

  const STORY_TEXT = "The Capitol has spoken.\n\nTwenty-four tributes enter the arena. Only one leaves.\n\nYou have been reaped. Choose your arena, your district, take your place on the plate, and when the gong sounds — run, fight, survive.";
  const INSTRUCTIONS_TEXT = "MOVE: WASD or Arrow Keys / D-Pad\nATTACK: Space / A Button\nSWITCH WEAPON: Q/E or 1-6 / B Button\n\nGrab a weapon from the Cornucopia when the gong sounds. Eat berries to fight hunger — some are poisonous. Watch the shrinking safe zone, and beware the mutts after day 3.\n\nEach arena plays differently — check its briefing before you commit. Each district trains its tributes differently too — check your district's perk before you pick.";

  let introScreen = 'title';
  let menuIndex = 0, arenaIndex = 0, districtIndex = 0, tributeIndex = 0, tributeArmed = false, arenaArmed = false;
  let textPanelReturnsTo = 'menu';

  function showIntroPanel(name){
    [panelTitle, panelMenu, panelText, panelArena, panelDistrict, panelTribute].forEach(p=>p.classList.add('hidden'));
    ({title:panelTitle, menu:panelMenu, text:panelText, arena:panelArena, district:panelDistrict, tribute:panelTribute})[name].classList.remove('hidden');
    introScreen = name;
    if(musicUnlocked) playIntroMusic();
  }

  function renderMenu(){
    menuListEl.querySelectorAll('.menuItem').forEach((el,i)=> el.classList.toggle('selected', i===menuIndex));
  }
  menuListEl.querySelectorAll('.menuItem').forEach((el,i)=>{
    el.addEventListener('click', ()=>{ menuIndex=i; renderMenu(); confirmMenu(); });
  });

  function confirmMenu(){
    if(menuIndex===0){
      arenaIndex = Math.max(0, ARENA_KEYS.indexOf(selectedArena));
      arenaArmed = false;
      renderArenaCards();
      showIntroPanel('arena');
    } else if(menuIndex===1){
      textPanelTitleEl.textContent='STORY MODE'; textPanelBodyEl.textContent=STORY_TEXT;
      textPanelReturnsTo='menu'; showIntroPanel('text');
    } else {
      textPanelTitleEl.textContent='INSTRUCTIONS'; textPanelBodyEl.textContent=INSTRUCTIONS_TEXT;
      textPanelReturnsTo='menu'; showIntroPanel('text');
    }
  }

  function renderArenaCards(){
    arenaCardsEl.innerHTML='';
    ARENA_KEYS.forEach((key,i)=>{
      const a = ARENAS[key];
      const card=document.createElement('div');
      card.className='arenaCard'+(i===arenaIndex?' selected':'');
      card.innerHTML='<div class="aSwatch" style="background:'+a.swatch+';"></div><div class="aName">'+a.name.toUpperCase()+'</div>';
      card.addEventListener('click', ()=>{
        if(arenaIndex===i && arenaArmed){ confirmArena(); return; }
        arenaIndex=i; arenaArmed=true; renderArenaCards();
      });
      arenaCardsEl.appendChild(card);
    });
    const a = ARENAS[ARENA_KEYS[arenaIndex]];
    if(arenaPerkLabelEl){
      arenaPerkLabelEl.innerHTML = '<b>'+a.name.toUpperCase()+':</b> '+a.desc;
    }
  }

  function confirmArena(){
    selectedArena = ARENA_KEYS[arenaIndex];
    districtIndex = Math.max(0, DISTRICTS.indexOf(selectedDistrict));
    renderDistrictList();
    showIntroPanel('district');
  }

  function renderDistrictList(){
    districtListEl.innerHTML='';
    DISTRICTS.forEach((d,i)=>{
      const item=document.createElement('div');
      item.className='districtItem'+(i===districtIndex?' selected':'');
      item.innerHTML='<span class="cursorArrow goldText">▶</span>DISTRICT '+d;
      item.addEventListener('click', ()=>{ districtIndex=i; renderDistrictList(); confirmDistrict(); });
      districtListEl.appendChild(item);
    });
    updateDistrictPerkLabel();
  }

  function updateDistrictPerkLabel(){
    const d = DISTRICTS[districtIndex];
    const perk = perkFor(d);
    if(districtPerkLabelEl){
      districtPerkLabelEl.innerHTML = perk.name
        ? '<b>'+perk.name.toUpperCase()+':</b> '+perk.desc
        : '';
    }
  }

  function confirmDistrict(){
    selectedDistrict = DISTRICTS[districtIndex];
    tributeIndex = selectedGender==='female' ? 1 : 0;
    tributeArmed = false;
    renderTributeCards();
    showIntroPanel('tribute');
  }

  function renderTributeCards(){
    tributeCardsEl.innerHTML='';
    tributeDistrictLabelEl.textContent='DISTRICT '+selectedDistrict;
    ['male','female'].forEach((gender,i)=>{
      const assetKey='district-'+selectedDistrict+'-'+gender;
      const card=document.createElement('div');
      card.className='tributeCard'+(i===tributeIndex?' selected':'');
      const iconHtml = assetReady(assetKey)
        ? '<img src="'+ASSET_PATHS[assetKey]+'" alt="" />'
        : '<span style="font-size:40px;">'+(gender==='male'?'♂':'♀')+'</span>';
      card.innerHTML='<div class="tImgWrap">'+iconHtml+'</div><div class="tLabel">'+(gender==='male'?'MALE TRIBUTE':'FEMALE TRIBUTE')+'</div>';
      card.addEventListener('click', ()=>{
        if(tributeIndex===i && tributeArmed){ confirmTribute(); return; }
        tributeIndex=i; tributeArmed=true; renderTributeCards();
      });
      tributeCardsEl.appendChild(card);
    });
    const perk = perkFor(selectedDistrict);
    if(tributePerkLabelEl){
      tributePerkLabelEl.innerHTML = perk.name
        ? '<b>DISTRICT '+selectedDistrict+' — '+perk.name.toUpperCase()+':</b> '+perk.desc
        : '';
    }
  }

  function confirmTribute(){
    selectedGender = tributeIndex===1 ? 'female' : 'male';
    startGame();
  }

  // Shared intro-navigation logic, driven by an abstract action so both
  // the keyboard handler and the touch D-pad / A / B buttons can trigger
  // the exact same behavior.
  function introHandleAction(action){
    const up=action==='up', down=action==='down';
    const left=action==='left', right=action==='right';
    const A=action==='A', B=action==='B';

    if(introScreen==='title'){ showIntroPanel('menu'); menuIndex=0; renderMenu(); return; }
    if(introScreen==='menu'){
      if(up||left){ menuIndex=(menuIndex+2)%3; renderMenu(); }
      else if(down||right){ menuIndex=(menuIndex+1)%3; renderMenu(); }
      else if(A){ confirmMenu(); }
      return;
    }
    if(introScreen==='text'){ if(B||A){ showIntroPanel(textPanelReturnsTo); renderMenu(); } return; }
    if(introScreen==='arena'){
      const n = ARENA_KEYS.length;
      if(left||up){ arenaIndex=(arenaIndex-1+n)%n; arenaArmed=false; renderArenaCards(); }
      else if(right||down){ arenaIndex=(arenaIndex+1)%n; arenaArmed=false; renderArenaCards(); }
      else if(A){ if(arenaArmed) confirmArena(); else { arenaArmed=true; renderArenaCards(); } }
      else if(B){ showIntroPanel('menu'); renderMenu(); }
      return;
    }
    if(introScreen==='district'){
      const n = DISTRICTS.length;
      const cols = DISTRICT_COLS;
      if(up){ districtIndex=(districtIndex-cols+n)%n; renderDistrictList(); }
      else if(down){ districtIndex=(districtIndex+cols)%n; renderDistrictList(); }
      else if(left){ districtIndex=(districtIndex-1+n)%n; renderDistrictList(); }
      else if(right){ districtIndex=(districtIndex+1)%n; renderDistrictList(); }
      else if(A){ confirmDistrict(); }
      else if(B){ arenaIndex = Math.max(0, ARENA_KEYS.indexOf(selectedArena)); arenaArmed=true; renderArenaCards(); showIntroPanel('arena'); }
      return;
    }
    if(introScreen==='tribute'){
      if(left||up){ tributeIndex=0; tributeArmed=false; renderTributeCards(); }
      else if(right||down){ tributeIndex=1; tributeArmed=false; renderTributeCards(); }
      else if(A){ if(tributeArmed) confirmTribute(); else { tributeArmed=true; renderTributeCards(); } }
      else if(B){ renderDistrictList(); showIntroPanel('district'); }
      return;
    }
  }

  function introKeyDown(e){
    const key=e.key.toLowerCase();
    let action=null;
    if(key==='w'||key==='arrowup') action='up';
    else if(key==='s'||key==='arrowdown') action='down';
    else if(key==='arrowleft') action='left';
    else if(key==='arrowright') action='right';
    else if(key===' '||key==='enter'||key==='a') action='A';
    else if(key==='b'||key==='escape'||key==='backspace') action='B';
    if(action){ introHandleAction(action); e.preventDefault(); }
  }

  document.getElementById('pressStartHint').addEventListener('click', ()=>{
    showIntroPanel('menu'); menuIndex=0; renderMenu();
  });

  // ============================================================
  // END SCREEN -> BACK TO TITLE ("Press A to return")
  // ============================================================
  function endScreenActive(){
    return !endScreen.classList.contains('hidden');
  }
  function returnToReaping(){
    endScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    showIntroPanel('title');
  }
  restartBtn.addEventListener('click', returnToReaping);

  // ============================================================
  // GAME STATE
  // ============================================================
  let tributes = [];
  let items = [];
  let obstacles = [];
  let particles = [];
  let projectiles = [];
  let mutts = [];
  let muttsUnlocked = false;
  let nextMuttSpawnAt = 0;
  let allianceBroken = false;
  let allianceTarget = null;
  let player = null;
  let zoneRadiusX, zoneRadiusY, zoneCenter, nextShrinkAt, nextSupplyAt, dayCount, kills, elapsed;
  let running = false;
  let lastTime = 0;
  let animId = null;

  // 'countdown' = frozen on plates before the gong, 'live' = bloodbath/gameplay
  let gamePhase = 'countdown';
  let countdownRemaining = BLOODBATH_COUNTDOWN;
  let lastCountdownTick = -1;
  let livePhaseStartTime = 0;

  const keys = {};
  const touchDir = {up:false,down:false,left:false,right:false};
  let attackPressed = false;

  // Is the intro/title/menu/district/tribute UI currently the active
  // screen (as opposed to live gameplay or the end screen)?
  function introActive(){
    return !startScreen.classList.contains('hidden');
  }

  // ============================================================
  // SETUP
  // ============================================================
  // Purely cosmetic terrain regions (Pokemon-style biomes). These do NOT
  // touch obstacle count, collision radius, or spawn logic — only which
  // sprite an obstacle in that spot draws as, plus background decoration.
  function biomeAt(x,y){
    // rocky/cave quadrant: bottom-left
    if(x < CENTER_X && y > CENTER_Y) return 'cave';
    // forest quadrant: top-left
    if(x < CENTER_X && y <= CENTER_Y) return 'forest';
    // lake quadrant: bottom-right
    if(x >= CENTER_X && y > CENTER_Y) return 'water';
    // meadow quadrant: top-right
    return 'meadow';
  }

  // Distance-based check for the actual pond ellipse (not just the wider
  // "water" quadrant used for biome coloring) — used to keep decorations
  // and cover zones from ending up inside the pond itself. `pad` inflates
  // the pond's radius so callers can keep a safety margin around the edge.
  function nearPond(x,y,pad){
    pad = pad || 0;
    const nx = (x - POND_CENTER.x) / (POND_RADIUS_X + pad);
    const ny = (y - POND_CENTER.y) / (POND_RADIUS_Y + pad);
    return (nx*nx + ny*ny) <= 1;
  }

  // Distance-based check for the volcano crater — keeps obstacles/decor
  // and item spawns from landing inside the mountain itself.
  function nearVolcano(x,y,pad){
    if(!VOLCANO) return false;
    pad = pad || 0;
    return dist({x,y}, VOLCANO) < (VOLCANO.craterR + pad);
  }

  function makeObstacles(){
    obstacles = [];
    let tries=0;
    while(obstacles.length < OBSTACLE_COUNT && tries < 6000){
      tries++;
      const x = rand(50, WORLD_W-50);
      const y = rand(50, WORLD_H-50);
      if(dist({x,y},{x:CENTER_X,y:CENTER_Y}) < 160) continue; // keep cornucopia clear
      if(nearVolcano(x,y,40)) continue; // keep the volcano's slopes clear of clutter
      const biome = biomeAt(x,y);
      const isPath = currentArenaCfg.showPath && Math.abs(x - CENTER_X) < 70 && Math.abs(y - CENTER_Y) < 70;
      const isWater = biome === 'water';
      if(isPath || isWater) continue;
      const roll = Math.random();
      let type;
      if(biome === 'cave'){
        type = roll < 0.7 ? 'rock' : 'bush';
      } else if(biome === 'forest'){
        type = roll < 0.5 ? 'tree' : roll < 0.8 ? 'bush' : 'rock';
      } else { // meadow
        type = roll < 0.28 ? 'tree' : roll < 0.7 ? 'bush' : 'rock';
      }
      let r;
      if(type === 'tree') r = TREE_R;
      else if(type === 'cave') r = rand(20,30);
      else if(type === 'rock') r = ROCK_R;
      else r = BUSH_R; // bush — smaller, meant to cluster densely for cover

      let overlap = obstacles.some(o=> dist(o,{x,y}) < o.r + r + (type==='bush'?6:14));
      if(overlap) continue;
      obstacles.push({x,y,r,type});
    }
  }

  // A treeline hugging the map edge, like the solid forest border that
  // encloses every Pokemon route — also doubles as extra cover near the walls.
  function makeBorderTrees(){
    const step = 52;
    const margin = 24;
    for(let x=margin; x<WORLD_W-margin; x+=step){
      obstacles.push({x: x+rand(-8,8), y: margin+rand(-6,6), r: TREE_R, type:'tree'});
      obstacles.push({x: x+rand(-8,8), y: WORLD_H-margin+rand(-6,6), r: TREE_R, type:'tree'});
    }
    for(let y=margin; y<WORLD_H-margin; y+=step){
      obstacles.push({x: margin+rand(-6,6), y: y+rand(-8,8), r: TREE_R, type:'tree'});
      obstacles.push({x: WORLD_W-margin+rand(-6,6), y: y+rand(-8,8), r: TREE_R, type:'tree'});
    }
  }

  // Patches of tall grass — standing inside one makes a tribute harder to
  // spot from a distance, giving players real places to hide and wait out foes.
  let grassZones = [];
  function makeGrassZones(){
    grassZones = [];
    let tries = 0;
    while(grassZones.length < GRASS_ZONE_COUNT && tries < 4000){
      tries++;
      const x = rand(70, WORLD_W-70);
      const y = rand(70, WORLD_H-70);
      if(dist({x,y},{x:CENTER_X,y:CENTER_Y}) < 190) continue; // keep cornucopia open
      if(nearVolcano(x,y,50)) continue;
      const r = rand(45,85);
      if(nearPond(x,y,r)) continue; // keep grass patches (and their tufts) out of the pond
      const overlap = grassZones.some(z=> dist(z,{x,y}) < z.r + r*0.3);
      if(overlap) continue;
      grassZones.push({x,y,r});
    }
  }

  function tributeInGrass(t){
    return grassZones.some(z => dist(t,z) < z.r);
  }

  // Distance of a point from the pond center, normalized so <=1 is inside
  // the pond's outer edge (matches the ellipse used to draw/detect it).
  function pondDepthFrac(t){
    const nx = (t.x - POND_CENTER.x)/POND_RADIUS_X;
    const ny = (t.y - POND_CENTER.y)/POND_RADIUS_Y;
    return nx*nx + ny*ny;
  }

  // Whether a tribute is currently standing near enough to a tree obstacle
  // to get their lumberjack damage bonus (District 7 perk).
  function nearTrees(t, radius){
    for(const o of obstacles){
      if(o.type !== 'tree') continue;
      if(dist(t,o) < o.r + radius) return true;
    }
    return false;
  }

  // Non-collidable decoration: tall grass tufts, flowers and lily-pads,
  // generated once per game so the arena reads as a lived-in overworld
  // without touching any obstacle/collision/AI logic.
  let decorations = [];
  function makeDecorations(){
    decorations = [];
    const flowerMult = currentArenaCfg.flowerMult || 1;
    const decorationCount = Math.round(260 * AREA_SCALE * Math.max(1, flowerMult*0.55));
    for(let i=0;i<decorationCount;i++){
      const x = rand(20, WORLD_W-20);
      const y = rand(20, WORLD_H-20);
      if(dist({x,y},{x:CENTER_X,y:CENTER_Y}) < 130) continue;
      if(nearVolcano(x,y,30)) continue;
      const biome = biomeAt(x,y);
      const isPath = currentArenaCfg.showPath && Math.abs(x - CENTER_X) < 70 && Math.abs(y - CENTER_Y) < 70;
      const isWater = biome === 'water';
      if(isPath || isWater) continue;
      if(obstacles.some(o=> dist({x,y},o) < o.r+10)) continue;
      let kind;
      const flowerChanceBoost = clamp((flowerMult-1)*0.22, 0, 0.6);
      if(biome === 'forest') kind = Math.random()<0.6+flowerChanceBoost ? (Math.random()<0.5?'tallgrass':'flower') : 'flower';
      else if(biome === 'meadow') kind = Math.random()<0.5+flowerChanceBoost ? 'flower' : 'tallgrass';
      else if(biome === 'cave') kind = Math.random()<0.7-flowerChanceBoost*0.5 ? 'pebble' : 'flower';
      else kind = Math.random()<0.6-flowerChanceBoost*0.5 ? 'lilypad' : 'flower';
      decorations.push({x,y,kind,phase:Math.random()*Math.PI*2, flowerColorRoll: Math.random()});
    }

    // pack each grass zone with dense tufts so it visibly reads as cover
    grassZones.forEach(z=>{
      const tuftCount = Math.floor(z.r/5);
      for(let i=0;i<tuftCount;i++){
        const ang = Math.random()*Math.PI*2;
        const rr = Math.random()*z.r*0.92;
        const x = z.x + Math.cos(ang)*rr;
        const y = z.y + Math.sin(ang)*rr;
        if(obstacles.some(o=> dist({x,y},o) < o.r+6)) continue;
        if(nearPond(x,y,0)) continue; // never let a grass tuft land inside the pond
        decorations.push({x,y,kind:'tallgrass',phase:Math.random()*Math.PI*2});
      }
    });

    // extra scattered flower clusters for especially colorful arenas
    if(flowerMult > 1.4){
      const clusterCount = Math.round(26 * (flowerMult-1));
      for(let c=0;c<clusterCount;c++){
        const cx = rand(40, WORLD_W-40), cy = rand(40, WORLD_H-40);
        if(dist({x:cx,y:cy},{x:CENTER_X,y:CENTER_Y}) < 140) continue;
        if(nearVolcano(cx,cy,40)) continue;
        if(nearPond(cx,cy,20)) continue;
        const petalCount = randi(4,9);
        for(let p=0;p<petalCount;p++){
          const x = clamp(cx + rand(-30,30), 20, WORLD_W-20);
          const y = clamp(cy + rand(-30,30), 20, WORLD_H-20);
          if(obstacles.some(o=> dist({x,y},o) < o.r+8)) continue;
          decorations.push({x,y,kind:'flower',phase:Math.random()*Math.PI*2, flowerColorRoll: Math.random()});
        }
      }
    }
  }

  function spawnItem(x,y,forcedType,forcedWeaponType){
    const roll = Math.random();
    let type = forcedType || (roll < 0.4 ? 'weapon' : roll < 0.62 ? 'medkit' : roll < 0.8 ? 'shield' : 'berries');
    const weaponType = type==='weapon' ? (forcedWeaponType || WEAPON_KEYS[randi(0,WEAPON_KEYS.length-1)]) : null;
    items.push({
      x,y,type,weaponType,
      id: Math.random().toString(36).slice(2),
      bob: Math.random()*Math.PI*2
    });
  }

  // Scatters berry bushes' actual berry pickups near a fraction of the
  // bush obstacles already placed in the arena, so foraging has a reason
  // to route players toward bush clusters specifically.
  function makeBerryBushes(){
    obstacles.forEach(o=>{
      if(o.type === 'bush'){
        const berryChance = Math.random() < 0.55;
        if(berryChance){
          const ang = rand(0, Math.PI*2);
          const x = clamp(o.x + Math.cos(ang)*(o.r+10), 20, WORLD_W-20);
          const y = clamp(o.y + Math.sin(ang)*(o.r+10), 20, WORLD_H-20);
          spawnItem(x,y,'berries');
        }
        if(Math.random() < 0.28){
          const ang = rand(0, Math.PI*2);
          const x = clamp(o.x + Math.cos(ang)*(o.r+14), 20, WORLD_W-20);
          const y = clamp(o.y + Math.sin(ang)*(o.r+14), 20, WORLD_H-20);
          spawnItem(x,y,'berries');
        }
      }
    });
  }

  function makeCornucopiaItems(){
    items = [];

    const weaponPool = [...WEAPON_KEYS];
    const fullWeaponCount = TOTAL_TRIBUTES;
    const weaponRingRadius = 120;

    for(let i=0;i<fullWeaponCount;i++){
      const ang = (i / fullWeaponCount) * Math.PI * 2;
      const x = CENTER_X + Math.cos(ang) * (weaponRingRadius + (i % 3) * 16);
      const y = CENTER_Y + Math.sin(ang) * (weaponRingRadius + (i % 3) * 16);
      const weaponType = weaponPool[i % weaponPool.length];
      items.push({
        x,
        y,
        type: 'weapon',
        weaponType,
        id: Math.random().toString(36).slice(2),
        bob: Math.random() * Math.PI * 2
      });
    }

    for(let i=0;i<4;i++){
      const ang = Math.random()*Math.PI*2;
      const r = rand(28,52);
      spawnItem(CENTER_X + Math.cos(ang)*r, CENTER_Y + Math.sin(ang)*r, 'berries');
    }
    for(let i=0;i<8;i++){
      spawnItem(rand(60,WORLD_W-60), rand(60,WORLD_H-60), 'medkit');
    }
    for(let i=0;i<18;i++){
      spawnItem(rand(60,WORLD_W-60), rand(60,WORLD_H-60), 'berries');
    }
    for(let i=0;i<6;i++){
      spawnItem(rand(60,WORLD_W-60), rand(60,WORLD_H-60));
    }
  }

  function newTribute(district, isPlayer, forcedGender){
    // Position is assigned afterward by positionTributesOnPlates() so every
    // tribute starts evenly spaced around the cornucopia, like the reaping circle.
    const perk = perkFor(district);
    const baseHp = 150 + (perk.hpBonus || 0);
    const baseSpeed = (isPlayer ? 58 : rand(40,52)) * (perk.speedMult || 1);
    return {
      id: Math.random().toString(36).slice(2),
      district,
      perk,
      isPlayer: !!isPlayer,
      isCareer: !isPlayer && CAREER_DISTRICTS.includes(district),
      genderOverride: forcedGender || null,
      x: CENTER_X, y: CENTER_Y,
      vx:0, vy:0,
      facing: {x:0,y:1},
      hp: baseHp, maxHp:baseHp,
      baseDamage: 4,
      weapon: null,
      inventory: [],
      invIndex: -1,
      ammo: {},
      shield: 0,
      speed: baseSpeed,
      alive: true,
      attackCooldown: 0,
      hitFlash: 0,
      aggression: Math.random(), // 0 = coward, 1 = killer
      aiState: 'bloodbath',
      wanderTarget: null,
      wanderTimer: 0,
      color: COLORS[district],
      kills:0,
      hurtCooldown:0,
      hunger: HUNGER_MAX,
      energy: ENERGY_MAX,
      starveCooldown: 0,
      stunTimer: 0,
      poisonTicksRemaining: 0,
      poisonTickTimer: 0,
      pondTickTimer: 0,
      inDeepWater: false,
      regenCooldown: 0,
      gasTickTimer: 0
    };
  }

  // Arrange every tribute evenly around the cornucopia on their starting
  // "plate", all facing inward — the classic Hunger Games reaping circle.
  function positionTributesOnPlates(){
    const total = tributes.length;
    tributes.forEach((t, i)=>{
      const angle = (i/total) * Math.PI*2 - Math.PI/2;
      t.x = clamp(CENTER_X + Math.cos(angle)*PLATE_RADIUS, 40, WORLD_W-40);
      t.y = clamp(CENTER_Y + Math.sin(angle)*PLATE_RADIUS, 40, WORLD_H-40);
      t.vx = 0; t.vy = 0;
      const dx = CENTER_X - t.x, dy = CENTER_Y - t.y;
      const len = Math.hypot(dx,dy) || 1;
      t.facing = {x: dx/len, y: dy/len};
    });

    const guardCount = Math.min(4, Math.max(1, Math.floor(tributes.length * 0.12)));
    for(let i=0;i<guardCount;i++){
      const t = tributes[i + 1];
      if(!t) break;
      t.aiState = 'guard';
      t.wanderTarget = {x: CENTER_X, y: CENTER_Y};
      t.aggression = Math.min(1, t.aggression + 0.25);
    }
  }

  function resetGame(){
    applyArenaConfig();
    tributes = [];
    // Build every district's two reaping slots as explicit {district,gender}
    // pairs so each district always fields one male AND one female tribute
    // (instead of two random same-gender copies) — the player fills one
    // slot of their chosen district, and the pool below covers the rest.
    let pool = [];
    DISTRICTS.forEach(d=>{
      if(d === selectedDistrict){
        // the player already takes one gender slot for this district;
        // only the opposite-gender tribute still needs to be generated
        pool.push({district: d, gender: selectedGender === 'male' ? 'female' : 'male'});
      } else {
        pool.push({district: d, gender: 'male'});
        pool.push({district: d, gender: 'female'});
      }
    });
    for(let i=pool.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    player = newTribute(selectedDistrict, true, selectedGender);
    // Player starts unarmed on the plate, same as every other tribute —
    // the only way to get a weapon is to grab one from the Cornucopia
    // (or off a body) once the gong sounds.
    tributes.push(player);
    for(let i=0;i<pool.length;i++){
      tributes.push(newTribute(pool[i].district, false, pool[i].gender));
    }

    positionTributesOnPlates();
    makeObstacles();
    makeBorderTrees();
    makeGrassZones();
    makeDecorations();
    makeCornucopiaItems();
    makeBerryBushes();
    const arenaCfg = ARENAS[selectedArena];
    zoneRadiusY = WORLD_H*0.72*arenaCfg.zoneScale;
    zoneRadiusX = zoneRadiusY * (WORLD_W/WORLD_H);
    zoneCenter = {x:CENTER_X,y:CENTER_Y};
    nextShrinkAt = ZONE_SHRINK_INTERVAL;
    nextSupplyAt = SUPPLY_DROP_INTERVAL;
    dayCount = 1;
    kills = 0;
    elapsed = 0;
    particles = [];
    projectiles = [];
    mutts = [];
    muttsUnlocked = false;
    nextMuttSpawnAt = 0;
    allianceBroken = false;
    allianceTarget = null;
    killFeed.innerHTML = '';

    gamePhase = 'countdown';
    countdownRemaining = BLOODBATH_COUNTDOWN;
    lastCountdownTick = -1;
    livePhaseStartTime = 0;
    countdownOverlay.classList.remove('hidden');
    countdownNum.textContent = Math.ceil(countdownRemaining);
    countdownLabel.textContent = 'STAY ON YOUR PLATE';

    playerHudLabel.textContent = 'DISTRICT ' + selectedDistrict + ' — YOU';

    updateHud();
  }

  // ============================================================
  // INPUT
  // ============================================================
  window.addEventListener('keydown', e=>{
    if(endScreenActive()){
      const k = e.key.toLowerCase();
      if(k===' '||k==='enter'||k==='a'){ returnToReaping(); e.preventDefault(); }
      return;
    }
    if(!startScreen.classList.contains('hidden')){ introKeyDown(e); return; }
    const key = e.key.toLowerCase();
    keys[key] = true;
    if(key === ' '){ attackPressed = true; e.preventDefault(); }
    else if(key === 'q'){ cycleWeapon(-1); e.preventDefault(); }
    else if(key === 'e'){ cycleWeapon(1); e.preventDefault(); }
    else if(key >= '1' && key <= '6'){ equipWeaponIndex(Number(key) - 1); e.preventDefault(); }
  });
  window.addEventListener('keyup', e=>{
    keys[e.key.toLowerCase()] = false;
  });

  document.querySelectorAll('.dpad button').forEach(btn=>{
    const dir = btn.dataset.dir;
    const on = (e)=>{
      e.preventDefault();
      btn.classList.add('active');
      if(introActive()){
        introHandleAction(dir);
        setTimeout(()=> btn.classList.remove('active'), 150);
        return;
      }
      touchDir[dir]=true;
    };
    const off = (e)=>{ e.preventDefault(); touchDir[dir]=false; btn.classList.remove('active'); };
    btn.addEventListener('touchstart', on, {passive:false});
    btn.addEventListener('touchend', off, {passive:false});
    btn.addEventListener('touchcancel', off, {passive:false});
    btn.addEventListener('mousedown', on);
    btn.addEventListener('mouseup', off);
    btn.addEventListener('mouseleave', off);
  });
  const atkBtn = document.getElementById('atkBtn');
  const atkOn = (e)=>{
    e.preventDefault();
    if(endScreenActive()){ returnToReaping(); return; }
    if(introActive()){ introHandleAction('A'); return; }
    attackPressed = true;
  };
  atkBtn.addEventListener('touchstart', atkOn, {passive:false});
  atkBtn.addEventListener('mousedown', atkOn);

  const bBtn = document.getElementById('bBtn');
  const swapOn = (e)=>{
    e.preventDefault();
    if(endScreenActive()){ return; }
    if(introActive()){ introHandleAction('B'); return; }
    cycleWeapon(1);
  };
  if(bBtn){
    bBtn.addEventListener('touchstart', swapOn, {passive:false});
    bBtn.addEventListener('mousedown', swapOn);
    bBtn.addEventListener('click', swapOn);
  }

  const selectBtn = document.getElementById('swapBtn');
  const selectOn = (e)=>{
    e.preventDefault();
    if(endScreenActive()){ return; }
    if(introActive()){ introHandleAction('down'); return; }
    cycleWeapon(-1);
  };
  if(selectBtn){
    selectBtn.addEventListener('touchstart', selectOn, {passive:false});
    selectBtn.addEventListener('mousedown', selectOn);
    selectBtn.addEventListener('click', selectOn);
  }

  const startBtn = document.getElementById('startHint');
  const startOn = (e)=>{
    e.preventDefault();
    if(endScreenActive()){ returnToReaping(); return; }
    if(introActive()){ introHandleAction('A'); return; }
  };
  if(startBtn){
    startBtn.addEventListener('touchstart', startOn, {passive:false});
    startBtn.addEventListener('mousedown', startOn);
    startBtn.addEventListener('click', startOn);
  }

  // ============================================================
  // KILL FEED
  // ============================================================
  function feed(msg){
    const el = document.createElement('div');
    el.className = 'feedLine';
    el.textContent = msg;
    killFeed.appendChild(el);
    setTimeout(()=> el.remove(), 5600);
    while(killFeed.children.length > 5){ killFeed.removeChild(killFeed.firstChild); }
  }

  // ============================================================
  // COMBAT / DAMAGE
  // ============================================================
  function damageTribute(t, amount, source){
    if(!t.alive) return;
    let dmg = amount;
    if(t.shield > 0){
      const absorbed = Math.min(t.shield, dmg);
      t.shield -= absorbed;
      dmg -= absorbed;
    }
    t.hp -= dmg;
    t.hitFlash = 0.25;
    spawnFloatText(t.x, t.y-20, '-'+Math.round(amount), '#e8404a');
    if(t.hp <= 0 && t.alive){
      t.alive = false;
      t.hp = 0;
      if(source && source.alive && !source.isMutt){ source.kills++; if(source.isPlayer) kills++; }
      const name = t.isPlayer ? 'YOU' : 'District '+t.district;
      let killerName = 'the arena';
      if(source && source.isMutt) killerName = (MUTT_SPECIES[source.species||'default'].name.toLowerCase());
      else if(source) killerName = source.isPlayer ? 'you' : 'District '+source.district;
      feed('🔔 A cannon sounds. ' + name + ' has fallen' + (source ? (' — slain by ' + killerName) : '') + '.');
      spawnFloatText(t.x, t.y-30, 'ELIMINATED', '#ffcf5c');
      playCannonSound();
      if(t.weapon){
        spawnItem(t.x, t.y, 'weapon', t.weapon);
        t.weapon = null;
      }
    }
  }

  function damageMutt(m, amount, source){
    if(!m.alive) return;
    m.hp -= amount;
    m.hitFlash = 0.25;
    spawnFloatText(m.x, m.y-16, '-'+Math.round(amount), '#e8404a');
    if(m.hp <= 0 && m.alive){
      m.alive = false;
      spawnFloatText(m.x, m.y-26, 'MUTT DOWN', '#7ac97a');
      if(source && source.isPlayer) feed('You put down a ' + MUTT_SPECIES[m.species||'default'].name.toLowerCase() + '.');
    }
  }

  function spawnFloatText(x,y,text,color){
    particles.push({x,y,text,color,life:1.0,vy:-30});
  }

  // Effective movement speed after low-energy fatigue and deep-water drag
  // are applied. District 4's water-speed perk cancels the deep-water
  // drag entirely (they swim like it's nothing).
  function speedMult(t){
    let mult = t.energy < LOW_ENERGY_THRESHOLD ? LOW_ENERGY_SPEED_MULT : 1;
    if(t.inDeepWater){
      mult *= (t.perk && t.perk.waterSpeedMult != null) ? t.perk.waterSpeedMult : POND_DROWN_SPEED_MULT;
    }
    return mult;
  }

  // Hunger/energy drain, starvation damage, poison damage-over-time, and
  // stun countdown — runs for every living tribute, player included.
  // District perks: District 9 (Grain) drains hunger slower, District 5
  // (Power) drains energy slower, District 8 (Textiles) shrugs off poison
  // faster, District 10 (Livestock) slowly heals over time.
  function updateSurvival(t, dt){
    if(!t.alive) return;
    const perk = t.perk || {};

    const hungerMult = perk.hungerDrainMult != null ? perk.hungerDrainMult : 1;
    const energyMult = perk.energyDrainMult != null ? perk.energyDrainMult : 1;
    t.hunger = clamp(t.hunger - (dt*1000/HUNGER_DEPLETE_TIME)*HUNGER_MAX*hungerMult, 0, HUNGER_MAX);
    t.energy = clamp(t.energy - (dt*1000/ENERGY_DEPLETE_TIME)*ENERGY_MAX*energyMult, 0, ENERGY_MAX);

    if(t.hunger <= 0){
      t.starveCooldown -= dt;
      if(t.starveCooldown <= 0){
        t.starveCooldown = STARVE_TICK_INTERVAL;
        damageTribute(t, STARVE_TICK_DAMAGE, null);
        if(t.isPlayer) spawnFloatText(t.x, t.y-20, 'STARVING', '#e8a33d');
      }
    }

    if(t.poisonTicksRemaining > 0){
      t.poisonTickTimer -= dt;
      if(t.poisonTickTimer <= 0){
        t.poisonTickTimer = POISON_DOT_INTERVAL;
        t.poisonTicksRemaining--;
        const poisonDmgMult = perk.poisonResistMult != null ? perk.poisonResistMult : 1;
        damageTribute(t, POISON_DOT_DAMAGE*poisonDmgMult, null);
      }
    }

    if(t.stunTimer > 0){
      t.stunTimer = Math.max(0, t.stunTimer - dt);
    }

    if(perk.hpRegen && t.alive && t.hp < t.maxHp){
      t.regenCooldown -= dt;
      if(t.regenCooldown <= 0){
        t.regenCooldown = 1;
        t.hp = Math.min(t.maxHp, t.hp + perk.hpRegen);
      }
    }
  }

  // The pond: drink from the shallows to top up hunger/energy, or push into
  // the deep center and start drowning (damage over time, heavy speed drag).
  // District 4 (Fishing) never drowns and drinks more efficiently.
  function updatePondEffects(t, dt){
    if(!t.alive) return;
    const perk = t.perk || {};
    const depthFrac = pondDepthFrac(t);
    const inDeep = depthFrac <= POND_DEEP_FRAC*POND_DEEP_FRAC;
    const inPond = depthFrac <= 1;
    t.inDeepWater = inDeep && !perk.noDrown;

    if(inDeep && !perk.noDrown){
      t.pondTickTimer -= dt;
      if(t.pondTickTimer <= 0){
        t.pondTickTimer = POND_DROWN_TICK_INTERVAL;
        damageTribute(t, POND_DROWN_DAMAGE, null);
        if(t.isPlayer) spawnFloatText(t.x, t.y-20, 'DROWNING', '#7fb0e0');
      }
      if(t.isPlayer && !t._inDeepWater) feed('🌊 The current pulls you under — swim for shore!');
    } else if(inPond){
      t.pondTickTimer -= dt;
      if(t.pondTickTimer <= 0){
        t.pondTickTimer = POND_DRINK_INTERVAL;
        const drinkMult = perk.drinkMult || 1;
        t.hunger = Math.min(HUNGER_MAX, t.hunger + POND_DRINK_HUNGER*drinkMult);
        t.energy = Math.min(ENERGY_MAX, t.energy + POND_DRINK_ENERGY*drinkMult);
        if(t.isPlayer) spawnFloatText(t.x, t.y-20, '+DRINK', '#7fb0e0');
      }
      if(t.isPlayer){
        if(t._inDeepWater) feed('You wade back into the shallows, catching your breath.');
        else if(!t._inPondShallow) feed(inDeep ? '💧 You dive into the deep water without a worry — you know these waters.' : '💧 You wade into the pond and drink from it.');
      }
    } else {
      t.pondTickTimer = 0;
    }

    if(t.isPlayer){ t._inDeepWater = inDeep && !perk.noDrown; t._inPondShallow = inPond && !(inDeep && !perk.noDrown); }
  }

  // The volcano's gas cloud: while erupting, anyone standing within its
  // blast radius takes periodic damage, regardless of district perk —
  // this is Gamemaker-grade danger, not the shrinking zone.
  function updateVolcanoEffects(t, dt){
    if(!t.alive || !VOLCANO || volcanoState !== 'erupting') return;
    const d = dist(t, VOLCANO);
    if(d > VOLCANO_GAS_RADIUS) return;
    t.gasTickTimer -= dt;
    if(t.gasTickTimer <= 0){
      t.gasTickTimer = VOLCANO_GAS_TICK_INTERVAL;
      const perk = t.perk || {};
      damageTribute(t, VOLCANO_GAS_TICK_DAMAGE * (perk.zoneDmgMult != null ? perk.zoneDmgMult : 1), null);
      if(t.isPlayer) spawnFloatText(t.x, t.y-20, 'GAS!', '#7ac040');
    }
  }

  function tryAttack(attacker){
    if(attacker.attackCooldown > 0) return;
    let wpn = attacker.weapon ? WEAPONS[attacker.weapon] : null;
    const alliedCareer = attacker.isCareer && !allianceBroken;
    const perk = attacker.perk || {};

    if(wpn && wpn.type === 'ranged'){
      const ammoLeft = attacker.ammo[attacker.weapon] || 0;
      if(ammoLeft <= 0){
        if(attacker.isPlayer){
          spawnFloatText(attacker.x, attacker.y-30, 'OUT OF AMMO', '#e8404a');
          feed('Your ' + wpn.name + ' is out of ammo.');
        }
        wpn = null; // fall through to unarmed melee below instead of firing
      } else {
        attacker.ammo[attacker.weapon] = ammoLeft - 1;
        attacker.attackCooldown = wpn.cooldown * (perk.rangedCooldownMult || 1);
        fireProjectile(attacker, wpn);
        return;
      }
    }

    const range = wpn ? wpn.range : 40;
    // find nearest alive target within range — tributes and mutts are both valid;
    // Careers still banded together never target their own pack
    let target = null, best = 9999;
    for(const other of tributes){
      if(other === attacker || !other.alive) continue;
      if(alliedCareer && other.isCareer) continue;
      const d = dist(attacker, other);
      if(d < range && d < best){ best = d; target = other; }
    }
    for(const m of mutts){
      if(!m.alive) continue;
      const d = dist(attacker, m);
      if(d < range && d < best){ best = d; target = m; }
    }
    attacker.attackCooldown = wpn ? wpn.cooldown : 0.45;
    if(target){
      let dmg = (wpn ? wpn.dmg : attacker.baseDamage) + rand(-2,4);
      if(perk.dmgMult) dmg *= perk.dmgMult;
      if(perk.treeDmgMult && nearTrees(attacker, 70)) dmg *= perk.treeDmgMult;
      if(target.isMutt){ damageMutt(target, Math.max(3,dmg), attacker); }
      else { damageTribute(target, Math.max(3,dmg), attacker); }
      // knockback
      const dx = target.x-attacker.x, dy = target.y-attacker.y;
      const len = Math.hypot(dx,dy)||1;
      target.x += (dx/len)*10;
      target.y += (dy/len)*10;
      spawnFloatText(attacker.x, attacker.y-30, 'STRIKE!', '#e8a33d');
    }
  }

  function fireProjectile(attacker, wpn){
    let dx = attacker.facing.x, dy = attacker.facing.y;
    const len = Math.hypot(dx,dy) || 1;
    dx/=len; dy/=len;
    const perk = attacker.perk || {};
    let dmg = wpn.dmg;
    if(perk.dmgMult) dmg *= perk.dmgMult;
    projectiles.push({
      x: attacker.x + dx*16, y: attacker.y + dy*16,
      vx: dx*wpn.projectileSpeed, vy: dy*wpn.projectileSpeed,
      dmg: dmg, range: wpn.range, traveled: 0,
      owner: attacker, tint: wpn.tint,
      assetKey: wpn.name === 'Throwing Knives' ? 'knife' : 'arrow'
    });
    spawnFloatText(attacker.x, attacker.y-30, wpn.name.toUpperCase()+'!', '#e8a33d');
  }

  function updateProjectiles(dt){
    for(let i=projectiles.length-1;i>=0;i--){
      const p = projectiles[i];
      const stepX = p.vx*dt, stepY = p.vy*dt;
      p.x += stepX; p.y += stepY;
      p.traveled += Math.hypot(stepX,stepY);

      let removed = false;

      // blocked by obstacle
      for(const o of obstacles){
        if(dist(p,o) < o.r){ removed = true; break; }
      }

      // hits a tribute
      if(!removed){
        const ownerAlliedCareer = p.owner.isCareer && !allianceBroken;
        for(const t of tributes){
          if(!t.alive || t === p.owner) continue;
          if(ownerAlliedCareer && t.isCareer) continue;
          if(dist(p,t) < 15){
            const dmg = p.dmg + rand(-2,3);
            damageTribute(t, Math.max(3,dmg), p.owner);
            removed = true;
            break;
          }
        }
      }

      // hits a mutt
      if(!removed){
        for(const m of mutts){
          if(!m.alive) continue;
          if(dist(p,m) < 15){
            const dmg = p.dmg + rand(-2,3);
            damageMutt(m, Math.max(3,dmg), p.owner);
            removed = true;
            break;
          }
        }
      }

      if(removed || p.traveled > p.range || p.x<0 || p.x>WORLD_W || p.y<0 || p.y>WORLD_H){
        projectiles.splice(i,1);
      }
    }
  }

  // ============================================================
  // BACKPACK / WEAPON SWITCHING (player only)
  // ============================================================
  function equipWeaponIndex(idx){
    if(!player || !player.inventory.length) return;
    const n = player.inventory.length;
    const clampedIdx = ((idx % n) + n) % n;
    player.invIndex = clampedIdx;
    player.weapon = player.inventory[clampedIdx];
    spawnFloatText(player.x, player.y-20, WEAPONS[player.weapon].name.toUpperCase(), '#7fb0e0');
    feed('Switched to ' + WEAPONS[player.weapon].name + '.');
  }

  function cycleWeapon(dir){
    if(!player || !player.inventory.length) return;
    const cur = player.invIndex >= 0 ? player.invIndex : 0;
    equipWeaponIndex(cur + dir);
  }

  // ============================================================
  // ITEM PICKUP
  // ============================================================
  function checkItemPickup(t){
    const perk = t.perk || {};
    for(let i=items.length-1;i>=0;i--){
      const it = items[i];
      if(dist(t,it) < 22){
        if(it.type === 'weapon'){
          const wpnDef = WEAPONS[it.weaponType];
          if(t.isPlayer){
            if(t.inventory.includes(it.weaponType)){
              if(wpnDef.type === 'ranged'){
                const gain = randi(AMMO_PICKUP_MIN, AMMO_PICKUP_MAX);
                t.ammo[it.weaponType] = Math.min(wpnDef.ammoMax, (t.ammo[it.weaponType]||0) + gain);
                spawnFloatText(t.x,t.y-20,'+AMMO','#ffcf5c');
                feed('Restocked ' + wpnDef.name + ' ammo (' + t.ammo[it.weaponType] + '/' + wpnDef.ammoMax + ').');
              } else {
                spawnFloatText(t.x,t.y-20,'HAVE IT','#8f9086');
                feed('You already have a ' + wpnDef.name + ' in your pack.');
              }
            } else {
              t.inventory.push(it.weaponType);
              if(wpnDef.type === 'ranged'){
                t.ammo[it.weaponType] = randi(AMMO_PICKUP_MIN, AMMO_PICKUP_MAX);
              }
              if(!t.weapon){
                equipWeaponIndex(t.inventory.length-1);
                spawnFloatText(t.x,t.y-20,'+'+wpnDef.name.toUpperCase(),'#ffcf5c');
              } else {
                spawnFloatText(t.x,t.y-20,'PACKED','#7fb0e0');
                feed('You packed a ' + wpnDef.name + '. Press Q/E or SWAP to switch.');
              }
            }
          } else {
            t.weapon = it.weaponType;
            if(wpnDef.type === 'ranged'){
              const gain = randi(AMMO_PICKUP_MIN, AMMO_PICKUP_MAX);
              t.ammo[it.weaponType] = Math.min(wpnDef.ammoMax, (t.ammo[it.weaponType]||0) + gain);
            }
            spawnFloatText(t.x,t.y-20,'+'+wpnDef.name.toUpperCase(),'#ffcf5c');
          }
        } else if(it.type === 'medkit'){
          t.hp = Math.min(t.maxHp, t.hp + 35);
          spawnFloatText(t.x,t.y-20,'+35 HP','#7ac97a');
          if(t.isPlayer) feed('You picked up a medkit.');
        } else if(it.type === 'shield'){
          t.shield = Math.min(40, t.shield + 25);
          spawnFloatText(t.x,t.y-20,'+SHIELD','#7fb0e0');
          if(t.isPlayer) feed('You picked up a shield.');
        } else if(it.type === 'berries'){
          if(t.isPlayer) feed('🍓 You found berries.');
          const poisonChance = BERRY_POISON_CHANCE * (perk.poisonChanceMult != null ? perk.poisonChanceMult : 1);
          const poisonous = Math.random() < poisonChance;
          if(poisonous){
            const poisonDurMult = perk.poisonResistMult != null ? perk.poisonResistMult : 1;
            t.stunTimer = Math.max(t.stunTimer, POISON_STUN_DURATION*poisonDurMult);
            t.poisonTicksRemaining = POISON_DOT_TICKS;
            t.poisonTickTimer = POISON_DOT_INTERVAL;
            spawnFloatText(t.x,t.y-20,'POISONED!','#e8404a');
            if(t.isPlayer) feed('☠ Those berries were poisonous — you feel your legs give out.');
          } else {
            const foodMult = perk.foodMult || 1;
            t.hunger = Math.min(HUNGER_MAX, t.hunger + 40*foodMult);
            t.energy = Math.min(ENERGY_MAX, t.energy + 15*foodMult);
            spawnFloatText(t.x,t.y-20,'+HUNGER','#e8c56a');
            if(t.isPlayer) feed('They\'re safe to eat. Hunger restored.');
          }
        }
        items.splice(i,1);
      }
    }
  }

  // ============================================================
  // AI
  // ============================================================
  function pickWanderTarget(t){
    for(let i=0;i<8;i++){
      const x = rand(45,WORLD_W-45), y = rand(45,WORLD_H-45);
      if(!obstacles.some(o=> dist({x,y},o) < o.r+34)) return {x,y};
    }
    return { x: rand(45,WORLD_W-45), y: rand(45,WORLD_H-45) };
  }

  // Nearest patch of tall grass to a point (used by skittish tributes to
  // actively seek cover instead of wandering blind).
  function nearestGrassZone(x,y){
    let best = null, bd = Infinity;
    for(const z of grassZones){
      const d = Math.hypot(z.x-x, z.y-y);
      if(d < bd){ bd = d; best = z; }
    }
    return best;
  }

  // The Career pack shares one target at a time so they visibly gang up,
  // and dissolves into every-tribute-for-themselves once the field is small.
  function updateAlliance(){
    if(allianceBroken) return;
    const aliveCareers = tributes.filter(t=>t.alive && t.isCareer);
    const totalAlive = tributes.filter(t=>t.alive).length;
    if(aliveCareers.length <= ALLIANCE_BREAK_ALIVE_CAREERS || totalAlive <= ALLIANCE_BREAK_TOTAL_ALIVE){
      allianceBroken = true;
      allianceTarget = null;
      feed('⚔ The Career pack has turned on each other — the alliance is over.');
      return;
    }
    if(allianceTarget && allianceTarget.alive && !allianceTarget.isCareer) return;
    let cx=0, cy=0;
    aliveCareers.forEach(c=>{ cx+=c.x; cy+=c.y; });
    cx/=aliveCareers.length; cy/=aliveCareers.length;
    let best=null, bd=9999;
    tributes.forEach(o=>{
      if(!o.alive || o.isCareer) return;
      const d = dist({x:cx,y:cy}, o);
      if(d < bd){ bd = d; best = o; }
    });
    if(best && bd < ALLIANCE_TARGET_RANGE){
      allianceTarget = best;
      feed('The Career pack has marked ' + (best.isPlayer ? 'YOU' : 'District '+best.district) + ' as prey.');
    }
  }

  function updateAI(t, dt){
    if(!t.alive) return;
    if(t.stunTimer > 0){
      t.vx = 0; t.vy = 0;
      return;
    }
    t.hurtCooldown = Math.max(0, t.hurtCooldown-dt);
    const alliedCareer = t.isCareer && !allianceBroken;

    // find nearest alive other tribute — Careers still in the pack don't
    // treat each other as threats or targets while the alliance holds
    let nearest = null, nd = 9999;
    for(const o of tributes){
      if(o===t || !o.alive) continue;
      if(alliedCareer && o.isCareer) continue;
      const d = dist(t,o);
      if(d < nd){ nd = d; nearest = o; }
    }

    // the pack prioritizes its shared target over anything else it spots
    if(alliedCareer && allianceTarget && allianceTarget.alive){
      const dTarget = dist(t, allianceTarget);
      if(!nearest || dTarget < nd*1.6){ nearest = allianceTarget; nd = dTarget; }
    }

    const wpn = t.weapon ? WEAPONS[t.weapon] : null;
    const hasAmmo = wpn && wpn.type === 'ranged' ? (t.ammo[t.weapon]||0) > 0 : true;
    const isRanged = !!(wpn && wpn.type === 'ranged' && hasAmmo);
    let detectRange = isRanged ? Math.max(200, wpn.range*0.75) : 140;

    // Tall grass hides whoever is standing in it — much shorter detection
    // range unless the searcher gets close, so it's a real place to lie low.
    if(nearest && tributeInGrass(nearest) && dist(t,nearest) > 55){
      detectRange *= 0.4;
    }

    // Grace period right after the gong: most tributes are grabbing supplies
    // and fleeing the cornucopia rather than immediately fighting, just like
    // the scattering that follows the bloodbath in the films.
    const inGrace = (elapsed - livePhaseStartTime) < BLOODBATH_GRACE;

    // Skittish, unarmed, or otherwise timid tributes: non-Careers with low
    // aggression are playing scared, not hunting. They only ever fight back
    // once a threat is right on top of them (danger range), and otherwise
    // actively look for grass to hide in and sit tight once they find it.
    const isSkittish = !t.isCareer && t.aggression < 0.55;
    const dangerRange = wpn ? Math.min(wpn.range * 0.7, 60) : 42;

    const hpRatio = t.hp / t.maxHp;
    let mode = 'wander';
    if(nearest && nd < detectRange){
      if(isSkittish){
        // only ever bare teeth if the threat is basically on top of them
        mode = (nd < dangerRange) ? 'chase' : 'flee';
      } else if(hpRatio < 0.35 && t.aggression < 0.8){
        mode = 'flee';
      } else if(inGrace){
        mode = (t.aggression > 0.78) ? 'chase' : 'flee';
      } else if(t.aggression > 0.5 || (t.weapon && t.aggression > 0.3)){
        mode = 'chase';
      } else {
        mode = 'flee';
      }
    } else if(isSkittish && !inGrace){
      // no threat detected — a fearful tribute still tries to get to cover
      // rather than roam the open arena
      mode = 'seekHide';
    }

    // also seek nearby items if not in combat
    let seekItem = null;
    if(mode === 'wander'){
      let bd = 9999;
      for(const it of items){
        const d = dist(t,it);
        if(d < 220 && d < bd){ bd = d; seekItem = it; }
      }
    }

    let tx=t.x, ty=t.y;
    let holdStill = false;
    if(mode === 'chase' && nearest){
      if(isRanged){
        // kite: stay near an optimal standoff distance instead of rushing to melee
        const standoff = wpn.range * 0.55;
        const dxN = t.x-nearest.x, dyN = t.y-nearest.y;
        const lenN = Math.hypot(dxN,dyN) || 1;
        if(nd > standoff + 30){
          tx = nearest.x; ty = nearest.y;
        } else if(nd < standoff - 30){
          tx = clamp(t.x + (dxN/lenN)*60, 45, WORLD_W-45);
          ty = clamp(t.y + (dyN/lenN)*60, 45, WORLD_H-45);
        } else {
          tx = t.x; ty = t.y; // hold position and fire
        }
      } else {
        tx = nearest.x; ty = nearest.y;
      }
    } else if(mode === 'flee' && nearest){
      // a skittish tribute already tucked into grass with the threat still
      // outside detection range for grass-hiders would rather freeze than
      // bolt into the open and give away its position
      if(isSkittish && tributeInGrass(t) && nd > dangerRange * 1.4){
        holdStill = true;
        tx = t.x; ty = t.y;
      } else {
        const dxF = t.x-nearest.x, dyF = t.y-nearest.y;
        const lenF = Math.hypot(dxF,dyF) || 1;
        // flee toward the nearest patch of grass when one is reasonably
        // close, instead of just running directly away in the open
        const hideZone = isSkittish ? nearestGrassZone(t.x,t.y) : null;
        if(hideZone && dist(t,hideZone) < 420){
          tx = hideZone.x; ty = hideZone.y;
        } else {
          tx = clamp(t.x + (dxF/lenF)*130, 45, WORLD_W-45);
          ty = clamp(t.y + (dyF/lenF)*130, 45, WORLD_H-45);
        }
      }
    } else if(mode === 'seekHide'){
      const hideZone = nearestGrassZone(t.x,t.y);
      if(hideZone){
        if(dist(t,hideZone) < hideZone.r*0.6){
          // already deep enough in cover — stay put and keep watch
          holdStill = true;
          tx = t.x; ty = t.y;
        } else {
          tx = hideZone.x; ty = hideZone.y;
        }
      } else if(seekItem){
        tx = seekItem.x; ty = seekItem.y;
      } else {
        t.wanderTimer -= dt;
        if(!t.wanderTarget || t.wanderTimer <= 0){
          t.wanderTarget = pickWanderTarget(t);
          t.wanderTimer = rand(2,4.5);
        }
        tx = t.wanderTarget.x; ty = t.wanderTarget.y;
      }
    } else if(seekItem){
      tx = seekItem.x; ty = seekItem.y;
    } else {
      // wander
      t.wanderTimer -= dt;
      if(!t.wanderTarget || t.wanderTimer <= 0){
        t.wanderTarget = pickWanderTarget(t);
        t.wanderTimer = rand(2,4.5);
      }
      tx = t.wanderTarget.x; ty = t.wanderTarget.y;
    }

    const dx = tx - t.x, dy = ty - t.y;
    const len = Math.hypot(dx,dy) || 1;
    // A tribute only counts as "moving" with a real, sustained direction —
    // small jitter from obstacle collisions shouldn't flip which way they face.
    if(len > 4 && !holdStill){
      t.vx = (dx/len) * t.speed * speedMult(t);
      t.vy = (dy/len) * t.speed * speedMult(t);
      // smooth facing instead of snapping instantly, so getting nudged by an
      // obstacle for one frame doesn't spin the sprite around
      const smoothing = 10;
      const blend = Math.min(1, smoothing*dt);
      let fx = t.facing.x + (dx/len - t.facing.x)*blend;
      let fy = t.facing.y + (dy/len - t.facing.y)*blend;
      const flen = Math.hypot(fx,fy) || 1;
      t.facing = {x:fx/flen, y:fy/flen};
    } else {
      t.vx = 0; t.vy = 0;
      // while standing still (including deliberately holding in cover),
      // keep facing whatever the actual nearby threat is, but only if one
      // exists — otherwise leave facing exactly as it was, rather than
      // re-deriving it from a wander target that no longer applies.
      if(nearest && nd < detectRange){
        const dxx = nearest.x-t.x, dyy = nearest.y-t.y;
        const l2 = Math.hypot(dxx,dyy) || 1;
        const smoothing = 10;
        const blend = Math.min(1, smoothing*dt);
        let fx = t.facing.x + (dxx/l2 - t.facing.x)*blend;
        let fy = t.facing.y + (dyy/l2 - t.facing.y)*blend;
        const flen = Math.hypot(fx,fy) || 1;
        t.facing = {x:fx/flen, y:fy/flen};
      }
    }

    const atkRange = wpn ? wpn.range : 40;
    if(mode === 'chase' && nearest && nd < atkRange){
      tryAttack(t);
    }
  }

  // ============================================================
  // MUTTS — Gamemaker creatures that hunt every tribute, player included
  // ============================================================
  function spawnMutt(){
    const roster = currentArenaCfg.muttRoster || DEFAULT_MUTT_ROSTER;
    const speciesKey = roster[randi(0, roster.length-1)];
    const species = MUTT_SPECIES[speciesKey] || MUTT_SPECIES.default;
    const ang = Math.random()*Math.PI*2;
    const rx = Math.min(zoneRadiusX*0.9, WORLD_W*0.45);
    const ry = Math.min(zoneRadiusY*0.9, WORLD_H*0.45);
    const x = clamp(zoneCenter.x + Math.cos(ang)*rx, 40, WORLD_W-40);
    const y = clamp(zoneCenter.y + Math.sin(ang)*ry, 40, WORLD_H-40);
    mutts.push({
      id: Math.random().toString(36).slice(2),
      isMutt: true,
      species: species.key,
      x, y, vx:0, vy:0,
      facing: {x:0,y:1},
      hp: species.hp, maxHp: species.hp,
      alive: true,
      attackCooldown: 0,
      hitFlash: 0,
      wanderTarget: null,
      wanderTimer: 0
    });
    feed('👁 A ' + species.name.toLowerCase() + ' mutt has entered the arena.');
  }

  function updateMuttAI(m, dt){
    const species = MUTT_SPECIES[m.species||'default'];
    m.attackCooldown = Math.max(0, m.attackCooldown-dt);
    m.hitFlash = Math.max(0, m.hitFlash-dt);

    let nearest = null, nd = 9999;
    for(const t of tributes){
      if(!t.alive) continue;
      const d = dist(m,t);
      if(d < nd){ nd = d; nearest = t; }
    }

    let tx = m.x, ty = m.y;
    if(nearest && nd < species.detectRange){
      tx = nearest.x; ty = nearest.y;
    } else {
      m.wanderTimer -= dt;
      if(!m.wanderTarget || m.wanderTimer <= 0){
        m.wanderTarget = pickWanderTarget(m);
        m.wanderTimer = rand(2,4);
      }
      tx = m.wanderTarget.x; ty = m.wanderTarget.y;
    }

    const dx = tx-m.x, dy = ty-m.y;
    const len = Math.hypot(dx,dy) || 1;
    if(len > 4){
      m.vx = (dx/len)*species.speed;
      m.vy = (dy/len)*species.speed;
      const smoothing = 10;
      const blend = Math.min(1, smoothing*dt);
      let fx = m.facing.x + (dx/len - m.facing.x)*blend;
      let fy = m.facing.y + (dy/len - m.facing.y)*blend;
      const flen = Math.hypot(fx,fy) || 1;
      m.facing = {x:fx/flen, y:fy/flen};
    } else {
      m.vx = 0; m.vy = 0;
    }

    if(nearest && nd < species.attackRange && m.attackCooldown <= 0){
      m.attackCooldown = species.attackCooldown;
      const dmg = species.dmg + rand(-2,3);
      damageTribute(nearest, Math.max(1,dmg), m);
      if(species.stunOnHit > 0){
        nearest.stunTimer = Math.max(nearest.stunTimer, species.stunOnHit);
        spawnFloatText(m.x, m.y-20, 'STUNNED!', '#f0c869');
      } else {
        spawnFloatText(m.x, m.y-20, 'HIT!', '#e8404a');
      }
    }
  }

  function updateMutts(dt){
    if(!muttsUnlocked){
      if(dayCount >= MUTT_SPAWN_DAY){
        muttsUnlocked = true;
        nextMuttSpawnAt = 4000;
        feed('🐺 Mutts have been released into the arena. Stay alert.');
      } else {
        return;
      }
    }
    nextMuttSpawnAt -= dt*1000;
    const aliveMuttCount = mutts.filter(m=>m.alive).length;
    if(nextMuttSpawnAt <= 0 && aliveMuttCount < MUTT_COUNT_MAX_ACTIVE){
      nextMuttSpawnAt = MUTT_SPAWN_INTERVAL;
      spawnMutt();
    }
    for(const m of mutts){
      if(!m.alive) continue;
      updateMuttAI(m, dt);
      m.x += m.vx*dt;
      m.y += m.vy*dt;
      m.x = clamp(m.x, 16, WORLD_W-16);
      m.y = clamp(m.y, 16, WORLD_H-16);
      resolveObstacles(m);
    }
    mutts = mutts.filter(m=>m.alive);
  }

  // ============================================================
  // VOLCANO — periodic eruption cycle: dormant -> warning (rumble) ->
  // erupting (gas cloud actively damages anyone inside it) -> dormant.
  // ============================================================
  function updateVolcano(dt){
    if(!VOLCANO) return;
    if(volcanoState === 'dormant'){
      volcanoNextAt -= dt*1000;
      if(volcanoNextAt <= 0){
        volcanoState = 'warning';
        volcanoStateTimer = VOLCANO_ERUPTION_WARN;
        feed('🌋 The volcano rumbles — gas is building in the crater.');
        playRumbleSound();
      }
    } else if(volcanoState === 'warning'){
      volcanoStateTimer -= dt*1000;
      if(volcanoStateTimer <= 0){
        volcanoState = 'erupting';
        volcanoStateTimer = VOLCANO_GAS_DURATION;
        feed('🌋 The volcano erupts! Deadly gas is spreading.');
      }
    } else if(volcanoState === 'erupting'){
      volcanoStateTimer -= dt*1000;
      if(volcanoStateTimer <= 0){
        volcanoState = 'dormant';
        volcanoNextAt = VOLCANO_ERUPTION_INTERVAL;
      }
    }
  }

  // ============================================================
  // MOVEMENT / COLLISION
  // ============================================================
  function resolveObstacles(t){
    let pushX = 0, pushY = 0;
    for(const o of obstacles){
      const d = dist(t,o);
      const minD = o.r + 10;
      if(d < minD && d > 0.0001){
        const overlap = (minD-d);
        const nx = (t.x-o.x)/d, ny = (t.y-o.y)/d;
        pushX += nx*overlap;
        pushY += ny*overlap;
      }
    }
    const mag = Math.hypot(pushX,pushY);
    const maxPush = 7;
    if(mag > maxPush){
      pushX = pushX/mag*maxPush;
      pushY = pushY/mag*maxPush;
    }
    t.x += pushX;
    t.y += pushY;
  }

  function updatePlayerMovement(dt){
    if(player.stunTimer > 0){
      player.vx = 0; player.vy = 0;
      attackPressed = false;
      return;
    }
    let dx=0, dy=0;
    if(keys['w']||keys['arrowup']||touchDir.up) dy -= 1;
    if(keys['s']||keys['arrowdown']||touchDir.down) dy += 1;
    if(keys['a']||keys['arrowleft']||touchDir.left) dx -= 1;
    if(keys['d']||keys['arrowright']||touchDir.right) dx += 1;
    const len = Math.hypot(dx,dy);
    if(len>0){
      dx/=len; dy/=len;
      player.facing = {x:dx,y:dy};
    }
    player.vx = dx*player.speed*speedMult(player);
    player.vy = dy*player.speed*speedMult(player);

    if(attackPressed){
      tryAttack(player);
      attackPressed = false;
    }
  }

  // ============================================================
  // ZONE / GAS
  // ============================================================
  function updateZone(dt){
    elapsed += dt*1000;
    nextShrinkAt -= dt*1000;
    if(nextShrinkAt <= 0 && zoneRadiusY > ZONE_MIN_RADIUS_Y){
      zoneRadiusY = Math.max(ZONE_MIN_RADIUS_Y, zoneRadiusY - ZONE_SHRINK_AMOUNT_Y);
      zoneRadiusX = Math.max(ZONE_MIN_RADIUS_X, zoneRadiusX - ZONE_SHRINK_AMOUNT_X);
      nextShrinkAt = ZONE_SHRINK_INTERVAL;
      dayCount++;
      feed('☣ The safe zone has contracted. Day ' + dayCount + ' begins.');
    }
    zoneWarning.style.display = (nextShrinkAt < 4000 && zoneRadiusY > ZONE_MIN_RADIUS_Y) ? 'block' : 'none';

    nextSupplyAt -= dt*1000;
    if(nextSupplyAt <= 0){
      nextSupplyAt = SUPPLY_DROP_INTERVAL;
      const ang = Math.random()*Math.PI*2;
      const frac = Math.random()*0.7;
      const x = clamp(zoneCenter.x + Math.cos(ang)*zoneRadiusX*frac, 40, WORLD_W-40);
      const y = clamp(zoneCenter.y + Math.sin(ang)*zoneRadiusY*frac, 40, WORLD_H-40);
      spawnItem(x,y, Math.random()<0.5?'weapon':'medkit');
      feed('🎁 A supply parachute has dropped into the arena.');
    }

    for(const t of tributes){
      if(!t.alive) continue;
      // ellipse containment test, since the safe zone matches the arena's aspect ratio
      const nx = (t.x - zoneCenter.x) / zoneRadiusX;
      const ny = (t.y - zoneCenter.y) / zoneRadiusY;
      if((nx*nx + ny*ny) > 1){
        t.hurtCooldown -= dt;
        if(t.hurtCooldown <= 0){
          t.hurtCooldown = 0.5;
          const perk = t.perk || {};
          damageTribute(t, ZONE_TICK_DAMAGE * (perk.zoneDmgMult != null ? perk.zoneDmgMult : 1), null);
        }
      }
    }
  }

  // ============================================================
  // MAIN UPDATE
  // ============================================================
  function update(dt){
    if(!running) return;

    if(gamePhase === 'countdown'){
      attackPressed = false;
      countdownRemaining -= dt;
      const shownNum = Math.max(0, Math.ceil(countdownRemaining));
      if(shownNum !== lastCountdownTick){
        lastCountdownTick = shownNum;
        countdownNum.textContent = shownNum;
        if(shownNum > 0) playTickSound();
      }
      if(countdownRemaining <= 0){
        gamePhase = 'live';
        livePhaseStartTime = elapsed;
        countdownOverlay.classList.add('hidden');
        playGongSound();
        feed('🔔 The gong sounds! Let the Games begin.');
      }
      // keep camera/render fresh but skip movement, AI, zone, combat
      return;
    }

    updatePlayerMovement(dt);
    updateAlliance();
    for(const t of tributes){
      if(t.isPlayer) continue;
      updateAI(t, dt);
    }
    updateMutts(dt);
    updateVolcano(dt);
    for(const t of tributes){
      if(!t.alive) continue;
      t.x += t.vx*dt;
      t.y += t.vy*dt;
      t.x = clamp(t.x, 16, WORLD_W-16);
      t.y = clamp(t.y, 16, WORLD_H-16);
      resolveObstacles(t);
      t.attackCooldown = Math.max(0, t.attackCooldown - dt);
      t.hitFlash = Math.max(0, t.hitFlash - dt);
      checkItemPickup(t);
      updateSurvival(t, dt);
      updatePondEffects(t, dt);
      updateVolcanoEffects(t, dt);
    }
    const nowHidden = tributeInGrass(player);
    if(nowHidden && !player._inGrass){ feed('🌿 You slip into the tall grass — harder to spot.'); }
    else if(!nowHidden && player._inGrass){ feed('You step back out into the open.'); }
    player._inGrass = nowHidden;

    updateZone(dt);
    updateProjectiles(dt);

    for(let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      p.life -= dt*0.8;
      p.y += p.vy*dt;
      if(p.life<=0) particles.splice(i,1);
    }

    updateHud();
    checkEndConditions();
  }

  function checkEndConditions(){
    const aliveTributes = tributes.filter(t=>t.alive);
    if(!player.alive){
      endGame(false, aliveTributes.length);
      return;
    }
    if(aliveTributes.length <= 1 && player.alive){
      endGame(true, 1);
    }
  }

  // ============================================================
  // RENDER
  // ============================================================
  function drawPixelChar(t){
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.scale(1.3, 1.3); // chunkier overworld-trainer sized sprite (visual only)
    const flash = t.hitFlash > 0;
    const bodyColor = flash ? '#ffffff' : t.color;
    const tributeImgKey = t.genderOverride
      ? ('district-' + t.district + '-' + t.genderOverride)
      : (t.district % 2 === 0 ? 'district-' + t.district + '-female' : 'district-' + t.district + '-male');

    if(assetReady(tributeImgKey)){
      ctx.save();
      ctx.translate(0, 0);
      ctx.scale(t.facing.x < 0 ? -1 : 1, 1);
      drawAssetAspect(tributeImgKey, 30, true);
      ctx.restore();
    } else {
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 12, 10, 4, 0, 0, Math.PI*2);
      ctx.fill();

      // legs (denim-blue trainer trousers)
      ctx.fillStyle = '#33455c';
      ctx.fillRect(-6,4,4,8);
      ctx.fillRect(2,4,4,8);
      ctx.fillStyle = '#25303f';
      ctx.fillRect(-6,10,4,2);
      ctx.fillRect(2,10,4,2);

      // torso — district-colored jacket with a light undershirt seam
      ctx.fillStyle = bodyColor;
      ctx.fillRect(-8,-8,16,14);
      ctx.fillStyle = flash ? '#ffffff' : shade(bodyColor,-30);
      ctx.fillRect(-8,-8,3,14);
      ctx.fillRect(5,-8,3,14);
      ctx.fillStyle = '#e8e3d3';
      ctx.fillRect(-2,-6,4,10);

      // head
      ctx.fillStyle = '#d9b48f';
      ctx.fillRect(-6,-18,12,10);

      // hair, peeking from under a trainer cap
      ctx.fillStyle = '#3a2a1e';
      ctx.fillRect(-6,-18,12,3);
      ctx.fillRect(-6,-16,2,4);
      ctx.fillRect(4,-16,2,4);
      // cap brim tinted with district color
      ctx.fillStyle = shade(bodyColor,10);
      ctx.fillRect(-7,-20,14,4);
      ctx.fillRect(3,-18,7,3);

      // eyes (facing indicator)
      ctx.fillStyle = '#000';
      const ex = t.facing.x*2, ey = t.facing.y*2;
      ctx.fillRect(-3+ex,-14+ey,2,2);
      ctx.fillRect(2+ex,-14+ey,2,2);
    }

    // weapon indicator
    if(t.weapon){
      const wpn = WEAPONS[t.weapon];
      const assetKey = t.weapon === 'bow' ? 'bow' : t.weapon === 'knives' ? 'knife' : t.weapon;
      const hasAsset = assetReady(assetKey);
      ctx.save();
      ctx.translate(9,-2);
      if(hasAsset){
        ctx.rotate(t.weapon === 'spear' ? -0.16 : 0);
        drawAssetAspect(assetKey, t.weapon === 'bow' ? 8 : 14, false);
      } else if(t.weapon === 'bow'){
        ctx.strokeStyle = '#e8e3d3';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-2,-5);
        ctx.lineTo(4,-2);
        ctx.lineTo(4,2);
        ctx.lineTo(-2,5);
        ctx.stroke();
      } else if(wpn.type === 'melee'){
        ctx.fillStyle = wpn.tint;
        const len = t.weapon==='spear' ? 20 : t.weapon==='axe' ? 12 : t.weapon==='dagger' ? 8 : 14;
        ctx.fillRect(0, -6, t.weapon==='axe'?5:3, len);
        if(t.weapon==='axe'){
          ctx.fillStyle = '#8a6a3a';
          ctx.fillRect(-2,-6,9,4);
        }
      } else if(t.weapon==='bow'){
        ctx.strokeStyle = wpn.tint;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0,0, 7, -1.15, 1.15);
        ctx.stroke();
      } else {
        // throwing knives — small diamonds
        ctx.fillRect(0,-8,3,3);
        ctx.fillRect(0,-2,3,3);
        ctx.fillRect(0,4,3,3);
      }
      ctx.restore();
    }
    // shield indicator
    if(t.shield > 0){
      if(assetReady('shield')){
        ctx.save();
        ctx.translate(0,-2);
        drawAssetAspect('shield', 18, false);
        ctx.restore();
      } else {
        ctx.strokeStyle = '#7fb0e0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0,-2, 16, 0, Math.PI*2);
        ctx.stroke();
      }
    }
    // Career pack marker — small gold dot, hollow once the alliance breaks
    if(t.isCareer){
      ctx.fillStyle = allianceBroken ? 'rgba(212,175,55,0)' : '#d4af37';
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0,-24,2.2,0,Math.PI*2);
      ctx.fill();
      ctx.stroke();
    }
    // player crown marker
    if(t.isPlayer){
      ctx.fillStyle = '#ffcf5c';
      ctx.fillRect(-5,-23,10,3);
      ctx.fillRect(-5,-23,2,5);
      ctx.fillRect(-1,-23,2,5);
      ctx.fillRect(3,-23,2,5);
    }
    ctx.restore();

    // name + hp bar
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.font = '8px monospace';
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(-16,-33,32,4);
    ctx.fillStyle = t.hp/t.maxHp > 0.5 ? '#5fbf5f' : t.hp/t.maxHp>0.25 ? '#e8a33d' : '#e8404a';
    ctx.fillRect(-15,-32,30*(t.hp/t.maxHp),2);
    if(!t.isPlayer){
      ctx.fillStyle = '#cfcabb';
      ctx.textAlign = 'center';
      ctx.fillText('D'+t.district, 0, -36);
    }
    ctx.restore();
  }

  // Per-species mutt sprites — small, simple vector critters (no external
  // assets exist for these yet) so each animal reads distinctly at a
  // glance: squirrel (bushy tail), deer (antlers), flamingo (long neck +
  // stilt legs), butterfly (wings, doesn't really "walk"), porcupine
  // (quill spikes). Falls back cleanly to the generic mutt blob for any
  // species without dedicated art, and for the default mutt itself.
  function drawMuttBody(m, species){
    const bob = Math.sin(performance.now()/220 + m.id.length)*2;
    const walk = Math.sin(performance.now()/180 + m.id.length)*1.2;
    const facingSign = m.vx > 0 ? -1 : 1;
    const flash = m.hitFlash > 0;
    const c = (hex)=> flash ? '#ffffff' : hex;

    ctx.save();
    ctx.translate(0, bob);
    ctx.scale(facingSign, 1);

    if(species.key === 'squirrel'){
      ctx.fillStyle = c(species.tailColor);
      ctx.beginPath();
      ctx.ellipse(-7, -4 + walk*0.3, 7, 9, 0.5, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = c(species.bodyColor);
      ctx.beginPath();
      ctx.ellipse(2, 2, 8, 6, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = c(species.headColor);
      ctx.beginPath();
      ctx.arc(9, -2, 5, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = c(species.eyeColor);
      ctx.beginPath(); ctx.arc(11,-3,1.1,0,Math.PI*2); ctx.fill();
    } else if(species.key === 'deer'){
      ctx.fillStyle = c(species.bodyColor);
      ctx.beginPath();
      ctx.ellipse(0, 2, 11, 7, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = c(species.bodyColor);
      ctx.fillRect(-8,6,3,7); ctx.fillRect(5,6,3,7);
      ctx.fillStyle = c(species.headColor);
      ctx.beginPath();
      ctx.ellipse(11, -4 + walk*0.2, 5, 6, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = c(species.antlerColor);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(9,-9); ctx.lineTo(7,-14); ctx.moveTo(7,-12); ctx.lineTo(9,-13);
      ctx.moveTo(13,-9); ctx.lineTo(15,-14); ctx.moveTo(15,-12); ctx.lineTo(13,-13);
      ctx.stroke();
      ctx.fillStyle = c(species.eyeColor);
      ctx.beginPath(); ctx.arc(13,-5,1,0,Math.PI*2); ctx.fill();
    } else if(species.key === 'flamingo'){
      ctx.fillStyle = c(species.bodyColor);
      ctx.beginPath();
      ctx.ellipse(-2, -2, 8, 7, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = c(species.bodyColor);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(4,-4); ctx.quadraticCurveTo(11,-10,9,-16);
      ctx.stroke();
      ctx.fillStyle = c(species.headColor);
      ctx.beginPath(); ctx.arc(9,-17,4,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = c(species.beakColor);
      ctx.beginPath(); ctx.moveTo(12,-17); ctx.lineTo(17,-15); ctx.lineTo(12,-15); ctx.fill();
      ctx.strokeStyle = c(species.bodyColor);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-3+walk*0.5,4); ctx.lineTo(-4+walk*0.5,13); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2-walk*0.5,4); ctx.lineTo(3-walk*0.5,13); ctx.stroke();
      ctx.fillStyle = c(species.eyeColor);
      ctx.beginPath(); ctx.arc(10,-18,0.9,0,Math.PI*2); ctx.fill();
    } else if(species.key === 'butterfly'){
      const flap = Math.sin(performance.now()/110 + m.id.length)*0.6 + 0.7;
      ctx.save();
      ctx.scale(1, flap);
      ctx.fillStyle = c(species.wingColor);
      ctx.beginPath(); ctx.ellipse(-6,-4,7,9,0.3,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(6,-4,7,9,-0.3,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = c(species.wingColor2);
      ctx.beginPath(); ctx.ellipse(-5,3,4.5,5,0.2,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(5,3,4.5,5,-0.2,0,Math.PI*2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = c(species.bodyColor);
      ctx.fillRect(-1,-8,2,16);
      ctx.fillStyle = c(species.eyeColor);
      ctx.beginPath(); ctx.arc(0,-9,1.4,0,Math.PI*2); ctx.fill();
    } else if(species.key === 'porcupine'){
      ctx.fillStyle = c(species.bodyColor);
      ctx.beginPath();
      ctx.ellipse(0, 2, 10, 7, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = c(species.quillColor);
      ctx.lineWidth = 1.6;
      for(let i=-8;i<=8;i+=3){
        ctx.beginPath();
        ctx.moveTo(i, -1);
        ctx.lineTo(i*1.25, -9 - Math.abs(i)*0.15);
        ctx.stroke();
      }
      ctx.fillStyle = c(species.headColor);
      ctx.beginPath(); ctx.ellipse(9,-1,5,4.5,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = c(species.eyeColor);
      ctx.beginPath(); ctx.arc(11,-2,1,0,Math.PI*2); ctx.fill();
    } else {
      // default generic mutt
      ctx.fillStyle = c(species.bodyColor);
      ctx.beginPath();
      ctx.ellipse(0, 1, 10, 6.5, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = c(species.headColor === '#2e2222' ? '#181010' : species.headColor);
      ctx.fillRect(-7, 4, 3, 6);
      ctx.fillRect(4, 4, 3, 6);
      const hx = m.facing.x*7, hy = m.facing.y*4 - 3;
      ctx.fillStyle = c(species.headColor);
      ctx.beginPath();
      ctx.ellipse(hx, hy, 6, 4.5, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = c(species.eyeColor);
      ctx.beginPath(); ctx.arc(hx-2, hy-1, 1.3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx+2, hy-1, 1.3, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  function drawMutt(m){
    const species = MUTT_SPECIES[m.species||'default'];
    ctx.save();
    ctx.translate(m.x, m.y);

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 9, 3, 0, 0, Math.PI*2);
    ctx.fill();

    if(species.key === 'default' && assetReady('mutt')){
      const bob = Math.sin(performance.now()/220 + m.id.length)*2;
      const walk = Math.sin(performance.now()/180 + m.id.length)*1.2;
      const facingSign = m.vx > 0 ? -1 : 1;
      ctx.save();
      ctx.translate(0, bob - 2);
      ctx.scale(facingSign * 1.18, 1.18);
      ctx.rotate(walk * 0.04);
      drawAssetAspect('mutt', 28, false);
      ctx.restore();
    } else {
      ctx.save();
      ctx.scale(1.15,1.15);
      drawMuttBody(m, species);
      ctx.restore();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(-14,-24,28,3);
    ctx.fillStyle = '#e8404a';
    ctx.fillRect(-13,-23.5,26*(m.hp/m.maxHp),2);
    if(species.key !== 'default'){
      ctx.font = '7px monospace';
      ctx.fillStyle = '#cfcabb';
      ctx.textAlign = 'center';
      ctx.fillText(species.name, 0, -27);
    }
    ctx.restore();
  }

  function drawPlate(t){
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.strokeStyle = t.isPlayer ? 'rgba(212,175,55,0.9)' : 'rgba(232,227,211,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 13, 17, 6, 0, 0, Math.PI*2);
    ctx.stroke();
    ctx.fillStyle = t.isPlayer ? 'rgba(212,175,55,0.12)' : 'rgba(232,227,211,0.08)';
    ctx.beginPath();
    ctx.ellipse(0, 13, 17, 6, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function drawItem(it){
    const bob = Math.sin(performance.now()/300 + it.bob)*3;
    ctx.save();
    ctx.translate(it.x, it.y + bob);
    if(it.type === 'weapon'){
      const wpn = WEAPONS[it.weaponType];
      const assetKey = it.weaponType === 'bow' ? 'bow' : it.weaponType === 'knives' ? 'knife' : it.weaponType;
      if(assetReady(assetKey)){
        drawAssetAspect(assetKey, it.weaponType === 'bow' ? 8 : 14, false);
      } else if(it.weaponType === 'bow'){
        ctx.strokeStyle = '#e8e3d3';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-2,-5);
        ctx.lineTo(4,-2);
        ctx.lineTo(4,2);
        ctx.lineTo(-2,5);
        ctx.stroke();
      } else {
        const tint = wpn ? wpn.tint : '#cfd6da';
        if(wpn && wpn.type === 'ranged'){
          if(it.weaponType === 'bow'){
            ctx.strokeStyle = tint;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0,0,8,-1.2,1.2);
            ctx.stroke();
            ctx.strokeStyle = '#e8e3d3';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0,-8); ctx.lineTo(0,8);
            ctx.stroke();
          } else {
            ctx.fillStyle = tint;
            ctx.fillRect(-1,-8,2,7);
            ctx.fillRect(-1,1,2,7);
          }
        } else {
          ctx.fillStyle = tint;
          ctx.fillRect(-1,-8,2,16);
          ctx.fillStyle = '#8a6a3a';
          ctx.fillRect(-4,4,8,3);
        }
      }
    } else if(it.type === 'shield'){
      if(assetReady('shield')){
        drawAssetAspect('shield', 14, false);
      } else {
        ctx.strokeStyle = '#7fb0e0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0,0,7,0,Math.PI*2);
        ctx.stroke();
      }
    } else if(it.type === 'medkit'){
      if(assetReady('firstAid')){
        drawAssetAspect('firstAid', 14, false);
      } else {
        ctx.fillStyle = '#e8e3d3';
        ctx.fillRect(-7,-6,14,12);
        ctx.fillStyle = '#c81d25';
        ctx.fillRect(-1,-4,2,8);
        ctx.fillRect(-4,-1,8,2);
      }
    } else if(it.type === 'berries'){
      if(assetReady('berry')){
        drawAssetAspect('berry', 14, false);
      } else {
        ctx.fillStyle = '#2f6a3a';
        ctx.beginPath(); ctx.moveTo(0,4); ctx.lineTo(0,-2); ctx.lineWidth=2; ctx.strokeStyle='#2f6a3a'; ctx.stroke();
        const berryColors = ['#8a2a4a','#a83a5a','#6a2040'];
        const spots = [[-4,-2],[3,-3],[-1,3],[4,2]];
        spots.forEach((s,i)=>{
          ctx.fillStyle = berryColors[i%berryColors.length];
          ctx.beginPath(); ctx.arc(s[0],s[1],2.6,0,Math.PI*2); ctx.fill();
        });
      }
    } else {
      ctx.strokeStyle = '#7fb0e0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0,0,7,0,Math.PI*2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawProjectile(p){
    ctx.save();
    ctx.translate(p.x,p.y);
    const ang = Math.atan2(p.vy,p.vx);
    ctx.rotate(ang);
    const assetKey = p.assetKey || 'arrow';
    if(assetReady(assetKey)){
      drawAssetAspect(assetKey, 12, false);
    } else {
      ctx.fillStyle = p.tint || '#e8e3d3';
      ctx.fillRect(-7,-1,14,2);
      ctx.beginPath();
      ctx.moveTo(7,-3);
      ctx.lineTo(11,0);
      ctx.lineTo(7,3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawObstacle(o){
    ctx.save();
    ctx.translate(o.x,o.y);
    if(o.type !== 'tree'){
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath(); ctx.ellipse(0,o.r*0.6,o.r*0.9,o.r*0.3,0,0,Math.PI*2); ctx.fill();
    }

    if(o.type === 'rock'){
      if(assetReady('rock')){
        drawAssetAspect('rock', o.r*2, false);
      } else {
        // GBA-route ore boulder: grey block with darker outline + lighter facets
        ctx.fillStyle = '#7a7268';
        ctx.beginPath();
        ctx.moveTo(-o.r,o.r*0.35);
        ctx.lineTo(-o.r*0.65,-o.r*0.75);
        ctx.lineTo(o.r*0.5,-o.r*0.85);
        ctx.lineTo(o.r,o.r*0.25);
        ctx.lineTo(o.r*0.2,o.r*0.6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#3a3630';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#a39a8c';
        ctx.fillRect(-o.r*0.35,-o.r*0.5,o.r*0.55,o.r*0.3);
        ctx.fillStyle = '#5c564c';
        ctx.fillRect(-o.r*0.15,o.r*0.05,o.r*0.4,o.r*0.15);
      }
    } else if(o.type === 'cave'){
      // Rocky boulder cluster
      ctx.fillStyle = '#4a4640';
      ctx.beginPath();
      ctx.arc(0,0,o.r,0,Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#252220';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if(o.type === 'bush'){
      if(assetReady('bush')){
        drawAssetAspect('bush', o.r*2.1, false);
      } else {
        // Pokemon-style rounded bush: layered leafy pompom, no trunk
        ctx.fillStyle = '#2c5c30';
        ctx.beginPath(); ctx.arc(0,-o.r*0.15,o.r*0.85,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#18321a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#3a7a3f';
        ctx.beginPath(); ctx.arc(-o.r*0.32,-o.r*0.4,o.r*0.55,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = '#4f9a52';
        ctx.beginPath(); ctx.arc(o.r*0.2,-o.r*0.55,o.r*0.32,0,Math.PI*2); ctx.fill();
      }
    } else {
      // tree
      if(assetReady('tree')){
        drawAssetAspect('tree', o.r*2.4, true);
      } else {
        // tree: layered round canopy like FR/LG route trees
        ctx.fillStyle = '#4a3a2a';
        ctx.fillRect(-3,-o.r*0.3,6,o.r*0.9);
        ctx.fillStyle = '#255c2e';
        ctx.beginPath();
        ctx.arc(0,-o.r*0.5,o.r*0.9,0,Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#316f38';
        ctx.beginPath();
        ctx.arc(-o.r*0.32,-o.r*0.72,o.r*0.58,0,Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#4a9450';
        ctx.beginPath();
        ctx.arc(-o.r*0.15,-o.r*0.9,o.r*0.3,0,Math.PI*2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Bright, varied petal colors so flower-heavy arenas (Green Hollow) read
  // as riotously colorful rather than a single repeated palette.
  const FLOWER_PALETTE = ['#e8637a','#f0c869','#c96fd6','#7fb0e0','#f08aa0','#ff9640','#8ee06a','#ffe066'];
  function drawDecoration(d){
    ctx.save();
    ctx.translate(d.x,d.y);
    if(d.kind === 'tallgrass'){
      const sway = Math.sin(performance.now()/500 + d.phase)*2;
      if(assetReady('tallGrass')){
        ctx.save();
        ctx.translate(sway * 0.6, -2);
        ctx.rotate(sway * 0.03);
        ctx.drawImage(assetImages.tallGrass, -10, -12, 20, 20);
        ctx.restore();
      } else {
        ctx.fillStyle = '#2f6a3a';
        for(let i=-1;i<=1;i++){
          ctx.beginPath();
          ctx.moveTo(i*4,6);
          ctx.quadraticCurveTo(i*4+sway, -4, i*4+sway*1.4, -10);
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#2f6a3a';
          ctx.stroke();
        }
      }
    } else if(d.kind === 'flower'){
      const flowerAssets = ['flower-one','flower-two','flower-three'];
      const assetKey = flowerAssets[Math.floor(d.phase * 10) % flowerAssets.length];
      if(assetReady(assetKey)){
        drawAssetAspect(assetKey, 10, false);
      } else {
        const roll = d.flowerColorRoll != null ? d.flowerColorRoll : (d.phase*10)%1;
        const color = FLOWER_PALETTE[Math.floor(roll*FLOWER_PALETTE.length)%FLOWER_PALETTE.length];
        ctx.fillStyle = '#2f6a3a';
        ctx.fillRect(-1,-2,2,6);
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(0,-4,2.6,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff2c9';
        ctx.beginPath(); ctx.arc(0,-4,1,0,Math.PI*2); ctx.fill();
      }
    } else if(d.kind === 'pebble'){
      ctx.fillStyle = '#6b6459';
      ctx.beginPath(); ctx.ellipse(0,0,4,2.6,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#8a8276';
      ctx.beginPath(); ctx.ellipse(-1,-1,1.6,1,0,0,Math.PI*2); ctx.fill();
    } else if(d.kind === 'lilypad'){
      ctx.fillStyle = 'rgba(58,122,138,0.55)';
      ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#3f8a52';
      ctx.beginPath(); ctx.arc(0,0,5,0.4,Math.PI*1.8); ctx.fill();
    }
    ctx.restore();
  }

  // The volcano itself — a simple layered cone with a glowing crater that
  // brightens through the warning/eruption states, plus a rising smoke
  // plume. Purely decorative geometry; the actual danger/gas hitbox is
  // handled by updateVolcanoEffects()/VOLCANO_GAS_RADIUS elsewhere.
  function drawVolcano(){
    if(!VOLCANO) return;
    ctx.save();
    ctx.translate(VOLCANO.x, VOLCANO.y);
    const r = VOLCANO.craterR;

    // mountain body
    ctx.fillStyle = '#3a2c22';
    ctx.beginPath();
    ctx.moveTo(-r*2.1, r*0.9);
    ctx.lineTo(-r*0.6, -r*1.5);
    ctx.lineTo(r*0.6, -r*1.5);
    ctx.lineTo(r*2.1, r*0.9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#4a382a';
    ctx.beginPath();
    ctx.moveTo(-r*1.5, r*0.75);
    ctx.lineTo(-r*0.55, -r*1.35);
    ctx.lineTo(-r*0.1, -r*1.1);
    ctx.lineTo(-r*1.1, r*0.75);
    ctx.closePath();
    ctx.fill();

    // crater glow — intensifies with volcanoState
    const glowColor = volcanoState === 'erupting' ? '#ff7a3d' : volcanoState === 'warning' ? '#e0a33d' : '#8a4a2a';
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.ellipse(0, -r*1.42, r*0.5, r*0.22, 0, 0, Math.PI*2);
    ctx.fill();
    if(volcanoState !== 'dormant'){
      ctx.save();
      ctx.globalAlpha = 0.55 + Math.sin(performance.now()/150)*0.25;
      ctx.fillStyle = '#ffdca0';
      ctx.beginPath();
      ctx.ellipse(0, -r*1.42, r*0.28, r*0.12, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    // smoke / gas plume
    if(volcanoState !== 'dormant'){
      const t = performance.now()/1000;
      for(let i=0;i<5;i++){
        const p = (t*0.4 + i/5) % 1;
        const puffY = -r*1.5 - p*70;
        const puffX = Math.sin(t*0.6 + i*1.7) * 14 * p;
        const puffR = (8 + p*20);
        ctx.save();
        ctx.globalAlpha = (volcanoState==='erupting' ? 0.32 : 0.18) * (1-p);
        ctx.fillStyle = volcanoState === 'erupting' ? '#7ac040' : '#cfcabb';
        ctx.beginPath();
        ctx.arc(puffX, puffY, puffR, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();

    // active gas cloud danger radius, drawn in world space (not translated
    // to the volcano's local frame, so it correctly overlays the ground)
    if(volcanoState === 'erupting'){
      ctx.save();
      ctx.globalAlpha = 0.22 + Math.sin(performance.now()/220)*0.05;
      ctx.fillStyle = '#7ac040';
      ctx.beginPath();
      ctx.arc(VOLCANO.x, VOLCANO.y - r*0.3, VOLCANO_GAS_RADIUS, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(122,192,64,0.55)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    } else if(volcanoState === 'warning'){
      ctx.save();
      ctx.globalAlpha = 0.16 + Math.sin(performance.now()/140)*0.08;
      ctx.strokeStyle = 'rgba(232,163,61,0.7)';
      ctx.lineWidth = 3;
      ctx.setLineDash([6,6]);
      ctx.beginPath();
      ctx.arc(VOLCANO.x, VOLCANO.y - r*0.3, VOLCANO_GAS_RADIUS, 0, Math.PI*2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  const TILE = 40;

  function render(){
    ctx.clearRect(0,0,WORLD_W,WORLD_H);
    const BIOME_BASE = BIOME_BASE_ACTIVE || ARENAS.meadowlands.biomeColors;

    // classic-Pokemon-style follow camera: zoom in and pan so the world
    // feels larger and only the area around the player is ever on screen.
    const camX = clamp(player.x, VIEW_W/2, WORLD_W - VIEW_W/2);
    const camY = clamp(player.y, VIEW_H/2, WORLD_H - VIEW_H/2);
    ctx.save();
    ctx.scale(CAMERA_ZOOM, CAMERA_ZOOM);
    ctx.translate(VIEW_W/2 - camX, VIEW_H/2 - camY);

    // --- base ground tiles: pixel-art grass texture, tiled across the arena ---
    const gPattern = getGrassPattern();
    if(gPattern){
      ctx.save();
      ctx.fillStyle = gPattern;
      ctx.fillRect(0,0,WORLD_W,WORLD_H);
      ctx.restore();
    } else {
      for(let ty=0; ty<WORLD_H; ty+=TILE){
        for(let tx=0; tx<WORLD_W; tx+=TILE){
          const biome = biomeAt(tx+TILE/2, ty+TILE/2);
          const checker = ((tx/TILE + ty/TILE) % 2 === 0);
          ctx.fillStyle = checker ? BIOME_BASE[biome] : shade(BIOME_BASE[biome], -10);
          ctx.fillRect(tx,ty,TILE,TILE);
        }
      }
    }

    // arena-specific tint overlay — reskins the ground/pattern palette to
    // match the selected arena without needing separate tile assets
    if(currentArenaTint){
      ctx.save();
      ctx.fillStyle = currentArenaTint;
      ctx.fillRect(0,0,WORLD_W,WORLD_H);
      ctx.restore();
    }

    // pond in the water quadrant — a place to drink (shallows) or drown
    // (deep center). Draws the user-provided pond.png at the same
    // footprint the old vector lake used; falls back to that vector art
    // if the asset hasn't loaded.
    ctx.save();
    ctx.translate(POND_CENTER.x, POND_CENTER.y);
    if(assetReady('pond')){
      const pw = POND_RADIUS_X*2.05, ph = POND_RADIUS_Y*2.05;
      ctx.drawImage(assetImages.pond, -pw/2, -ph/2, pw, ph);
    } else {
      ctx.save();
      ctx.rotate(0.15);
      ctx.fillStyle = BIOME_BASE.water === '#4a7a94' ? '#3f7d94' : '#2c5f78';
      ctx.beginPath();
      ctx.ellipse(0, 0, POND_RADIUS_X, POND_RADIUS_Y, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#1f4658';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      for(let i=0;i<6;i++){
        ctx.beginPath();
        ctx.ellipse(Math.sin(i*1.3)*70, Math.cos(i*1.7)*50, 22, 5, 0.2, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();

    // dirt path crossroads radiating from the cornucopia, like a route hub
    // — some arenas (e.g. Green Hollow) skip this entirely and leave the
    // cornucopia clearing as open ground instead.
    if(currentArenaCfg.showPath){
      ctx.save();
      const sPattern = getSandPattern();
      ctx.fillStyle = sPattern || '#8a7550';
      ctx.fillRect(CENTER_X-34, 0, 68, WORLD_H);
      ctx.fillRect(0, CENTER_Y-34, WORLD_W, 68);
      if(!sPattern){
        ctx.strokeStyle = 'rgba(0,0,0,.12)';
        ctx.lineWidth = 1;
        for(let x=0;x<WORLD_W;x+=20){ ctx.beginPath(); ctx.moveTo(x,CENTER_Y-34); ctx.lineTo(x,CENTER_Y+34); ctx.stroke(); }
        for(let y=0;y<WORLD_H;y+=20){ ctx.beginPath(); ctx.moveTo(CENTER_X-34,y); ctx.lineTo(CENTER_X+34,y); ctx.stroke(); }
      }
      ctx.restore();
    }

    // cave clearing patch (rocky ground) under the cave quadrant's cluster
    ctx.save();
    ctx.fillStyle = 'rgba(60,56,50,0.35)';
    ctx.beginPath();
    ctx.ellipse(WORLD_W*0.24, WORLD_H*0.76, 220, 150, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    decorations.forEach(drawDecoration);

    if(VOLCANO) drawVolcano();

    // cornucopia clearing marker (camp-style ring, same footprint as before)
    ctx.save();
    ctx.translate(CENTER_X,CENTER_Y);
    ctx.fillStyle = '#a68a55';
    ctx.beginPath(); ctx.arc(0,0,62,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#6e5a36';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0,0,62,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle = 'rgba(212,175,55,0.18)';
    ctx.beginPath(); ctx.arc(0,0,58,0,Math.PI*2); ctx.fill();
    // a little signpost so it reads like a Pokemon landmark
    ctx.fillStyle = '#5c4a2c';
    ctx.fillRect(-2,-14,4,14);
    ctx.fillStyle = '#c9a13b';
    ctx.fillRect(-10,-20,20,8);
    ctx.restore();

    obstacles.forEach(drawObstacle);
    items.forEach(drawItem);

    if(gamePhase === 'countdown'){
      tributes.forEach(drawPlate);
    }

    const drawOrder = [...tributes.filter(t=>t.alive), ...mutts.filter(m=>m.alive)].sort((a,b)=>a.y-b.y);
    drawOrder.forEach(e => e.isMutt ? drawMutt(e) : drawPixelChar(e));

    // tall grass drawn again on top so it visually swallows tributes' feet
    decorations.forEach(d=>{ if(d.kind === 'tallgrass') drawDecoration(d); });

    projectiles.forEach(drawProjectile);

    // gas / danger zone overlay
    ctx.save();
    ctx.beginPath();
    ctx.rect(0,0,WORLD_W,WORLD_H);
    ctx.ellipse(zoneCenter.x, zoneCenter.y, zoneRadiusX, zoneRadiusY, 0, 0, Math.PI*2, true);
    ctx.closePath();
    ctx.fillStyle = 'rgba(122,37,48,0.38)';
    ctx.fill('evenodd');
    ctx.strokeStyle = 'rgba(232,64,74,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(zoneCenter.x, zoneCenter.y, zoneRadiusX, zoneRadiusY, 0, 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();

    // particles / floating text
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    particles.forEach(p=>{
      ctx.globalAlpha = clamp(p.life,0,1);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    });
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  // ============================================================
  // HUD
  // ============================================================
  function updateHud(){
    hpBar.style.width = Math.max(0, (player.hp/player.maxHp)*100) + '%';
    hpBar.style.background = player.hp>50 ? 'linear-gradient(90deg,#7ac97a,#3f9c3f)' : player.hp>25 ? 'linear-gradient(90deg,#e8c56a,#e8a33d)' : 'linear-gradient(90deg,#e87a7a,#c81d25)';

    hungerBar.style.width = Math.max(0,player.hunger) + '%';
    hungerBar.style.background = player.hunger>50 ? 'linear-gradient(90deg,#d9b45c,#e8a33d)' : player.hunger>20 ? 'linear-gradient(90deg,#e89a3d,#c9701f)' : 'linear-gradient(90deg,#c81d25,#7a2530)';

    energyBar.style.width = Math.max(0,player.energy) + '%';
    energyBar.style.background = player.energy>=LOW_ENERGY_THRESHOLD ? 'linear-gradient(90deg,#7fb0e0,#3a6f9c)' : 'linear-gradient(90deg,#c81d25,#7a2530)';

    const aliveCount = tributes.filter(t=>t.alive).length;
    tributesLeftEl.textContent = aliveCount;
    dayText.textContent = dayCount;
    if(player.weapon){
      const wpnDef = WEAPONS[player.weapon];
      if(wpnDef.type === 'ranged'){
        weaponNameEl.textContent = wpnDef.name + ' (' + (player.ammo[player.weapon]||0) + '/' + wpnDef.ammoMax + ')';
      } else {
        weaponNameEl.textContent = wpnDef.name;
      }
    } else {
      weaponNameEl.textContent = 'Unarmed';
    }
    const hidden = tributeInGrass(player);
    const inWater = pondDepthFrac(player) <= 1;
    const inGas = VOLCANO && volcanoState === 'erupting' && dist(player, VOLCANO) <= VOLCANO_GAS_RADIUS;
    let statusLabel = 'In the open';
    let statusColor = 'var(--bone)';
    if(player.stunTimer > 0){ statusLabel = 'Stunned'; statusColor = '#e8404a'; }
    else if(inGas){ statusLabel = 'Choking on volcanic gas'; statusColor = '#7ac040'; }
    else if(player.inDeepWater){ statusLabel = 'Drowning in the pond'; statusColor = '#e8404a'; }
    else if(inWater){ statusLabel = 'Wading in the pond'; statusColor = '#7fb0e0'; }
    else if(hidden){ statusLabel = 'Hidden in grass'; statusColor = '#7ac97a'; }
    statusTextEl.textContent = statusLabel;
    statusTextEl.style.color = statusColor;

    if(perkTextEl){
      const perk = player.perk || {};
      perkTextEl.textContent = perk.name ? ('D'+player.district+' '+perk.name) : 'None';
    }

    const alerts = [];
    if(!allianceBroken && allianceTarget && allianceTarget.isPlayer) alerts.push('Career pack hunting YOU');
    if(muttsUnlocked) alerts.push('Mutts loose');
    if(VOLCANO && volcanoState === 'warning') alerts.push('Volcano rumbling');
    if(VOLCANO && volcanoState === 'erupting') alerts.push('Volcano erupting!');
    if(player.hunger <= 0) alerts.push('Starving');
    if(player.energy < LOW_ENERGY_THRESHOLD) alerts.push('Exhausted — slower');
    if(player.stunTimer > 0) alerts.push('Stunned');
    if(player.inDeepWater) alerts.push('Drowning!');
    if(player.weapon && WEAPONS[player.weapon].type === 'ranged' && (player.ammo[player.weapon]||0) <= 0) alerts.push('Out of ammo');
    alertTextEl.textContent = alerts.length ? alerts.join(' · ') : 'All quiet';
    alertTextEl.style.color = alerts.length ? '#e8404a' : 'var(--bone)';
  }

  // ============================================================
  // GAME LOOP
  // ============================================================
  function loop(ts){
    if(!running) return;
    const dt = Math.min(0.05, (ts-lastTime)/1000 || 0);
    lastTime = ts;
    update(dt);
    render();
    animId = requestAnimationFrame(loop);
  }

  // ============================================================
  // START / END
  // ============================================================
  function startGame(){
    getAudioCtx(); // unlock audio on this user gesture
    resetGame();
    startScreen.classList.add('hidden');
    endScreen.classList.add('hidden');
    gameFrame.classList.remove('hidden');
    running = true;
    lastTime = performance.now();
    const perk = perkFor(selectedDistrict);
    const arenaCfg = ARENAS[selectedArena];
    feed('Welcome to ' + arenaCfg.name + '. Hold your position — the gong will sound soon.');
    if(perk.name) feed('District '+selectedDistrict+' perk — '+perk.name+': '+perk.desc);
    playArenaMusic();
    animId = requestAnimationFrame(loop);
  }

  function endGame(won, remaining){
    running = false;
    if(animId) cancelAnimationFrame(animId);
    setTimeout(()=>{
      endScreen.classList.remove('hidden');
      if(won){
        endTitle.innerHTML = 'YOU ARE THE <span style="color:#d4af37;">VICTOR</span>';
        endSubtitle.textContent = 'District ' + selectedDistrict + ' has won the Games in ' + ARENAS[selectedArena].name;
        endSeal.style.borderColor = '#d4af37';
      } else {
        endTitle.innerHTML = 'YOU HAVE <span style="color:#e8404a;">FALLEN</span>';
        endSubtitle.textContent = remaining + ' tribute' + (remaining===1?'':'s') + ' remained when the cannon sounded for you';
        endSeal.style.borderColor = '#b8232b';
      }
      endStats.innerHTML =
        '<div class="statLine">Arena: <b>'+ARENAS[selectedArena].name+'</b></div>' +
        '<div class="statLine">Tributes eliminated by you: <b>'+player.kills+'</b></div>' +
        '<div class="statLine">Days survived: <b>'+dayCount+'</b></div>';
    }, 900);
  }

  showIntroPanel('title');

})();