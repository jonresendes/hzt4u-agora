/* ═══════════════════════════════════════════════════════════
   core.js — constants, storage, question pool engine,
   profiles, leaderboard, badges & accolades, UI helpers
   ═══════════════════════════════════════════════════════════ */
'use strict';

const UNITS = {
  1:{n:1,title:"Foundations of Philosophy",short:"Foundations",tag:"Columns & gold — where the questions begin.",lessons:["What Is Philosophy?","Branches of Philosophy","History of Philosophy","Missing Voices","Philosophical Reasoning","Logical Fallacies"],badgeName:"Column"},
  2:{n:2,title:"Exploring Epistemology",short:"Epistemology",tag:"The lantern — knowledge, truth and whose truth counts.",lessons:["What Is Knowledge?","Where Does Knowledge Come From?","Justifying Belief","What Is Truth?","Whose Truth?","Decolonizing Philosophy"],badgeName:"Lantern"},
  3:{n:3,title:"Metaphysics: Beyond the Physical",short:"Metaphysics",tag:"The constellation — reality, mind, self, God and time.",lessons:["What Is Metaphysics?","Plato's Allegory of the Cave","The Mind-Body Problem (+ Matrix/Inception)","Personal Identity I","Personal Identity II","Meaning & Free Will","Does God Exist?","Time, Space & Possible Worlds","Interstellar Capstone"],badgeName:"Constellation"},
  4:{n:4,title:"Ethics: Towards Right Action",short:"Ethics",tag:"The scales — how we ought to act, and why.",lessons:["What Is Ethics?","Consequentialism & Utilitarianism","Deontology","Virtue Ethics","Is Morality Objective?","Applied Ethics I: AI","Applied Ethics II: Bioethics"],badgeName:"Scales"},
  0:{n:0,title:"All Units — Exam Study",short:"All Units",tag:"The compass — every unit, every question.",lessons:[],badgeName:"Compass"}
};
const TOPICS = ["Vocabulary","Philosophers","Theories","Concepts","Arguments","Modern Connections"];
const TOPIC_DESC = {Vocabulary:"Key terms & definitions",Philosophers:"Who said / thought what",Theories:"Named positions & frameworks",Concepts:"Big ideas & distinctions",Arguments:"Fallacies, proofs & reasoning",'Modern Connections':"Films, media & today"};
const DIFFS = [
  {id:0,name:"Remedial",desc:"Recognition & recall",pts:100},
  {id:1,name:"Level 1",desc:"Definitions & names",pts:200},
  {id:2,name:"Level 2",desc:"Understanding ideas",pts:300},
  {id:3,name:"Level 3",desc:"Applying to new cases",pts:400},
  {id:4,name:"Level 4",desc:"Analysis & synthesis",pts:500},
  {id:"mix",name:"Mixed",desc:"Climb through all levels",pts:300}
];
const GAMES = {
  jeopardy:{id:"jeopardy",name:"Jeopardy",glyph:"J!",desc:"Pick a category and a value. Daily Doubles hide on the board; wrong answers cost you.",meta:"5 categories · 25 clues · steals in head-to-head",h2h:true},
  wheel:{id:"wheel",name:"Wheel of Wisdom",glyph:"◎",desc:"Spin the wheel, call consonants, buy vowels and solve the philosophical puzzle before the others.",meta:"5 puzzles · bankrupt & lose-a-turn · solve bonus",h2h:true},
  millionaire:{id:"millionaire",name:"Who Wants to Be a Philosopher King?",glyph:"₪",desc:"Climb a 15-question ladder with three lifelines. Safe havens at 5 and 10. Walk away any time.",meta:"15 rungs · 50:50 · ask the class · swap",h2h:true},
  sprint:{id:"sprint",name:"Lightning Round",glyph:"⚡",desc:"Rapid-fire questions with a streak multiplier. In head-to-head mode, buzz in first to answer.",meta:"timed sprint · buzzers · streak bonus",h2h:true}
};
const TEAM_COLORS = ["#f0b35a","#4fc0e8","#e86fa0","#7bd389"];
const TEAM_KEYS = ["1","2","3","4"];

/* ── question bank prep ── */
const BANK = (window.QBANK||[]).map((q,i)=>Object.assign({id:"q"+i},q));
const WHEEL_RE = /^[A-Za-z0-9 ,'’\-\.\/&:()]+$/;
function wheelEligible(q){ return WHEEL_RE.test(q.a) && q.a.length<=30 && q.a.replace(/[^A-Za-z]/g,"").length>=4 && !/[0-9]/.test(q.a); }

/* ── storage ── */
const LS = {
  get(k,d){ try{const v=localStorage.getItem("agora."+k); return v==null?d:JSON.parse(v);}catch(e){return d;} },
  set(k,v){ try{localStorage.setItem("agora."+k,JSON.stringify(v));}catch(e){} },
  del(k){ try{localStorage.removeItem("agora."+k);}catch(e){} },
  keys(){ const out=[]; for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i); if(k&&k.startsWith("agora.")) out.push(k.slice(6));} return out; }
};

/* ── helpers ── */
const rnd = (n)=>Math.floor(Math.random()*n);
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]];} return a; }
function pick(a){ return a[rnd(a.length)]; }
function esc(s){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmt(n){ return (n<0?"−":"")+Math.abs(n).toLocaleString(); }
function el(html){ const t=document.createElement("template"); t.innerHTML=html.trim(); return t.content.firstElementChild; }
function $(sel,root){ return (root||document).querySelector(sel); }
function $$(sel,root){ return Array.from((root||document).querySelectorAll(sel)); }
function todayISO(){ return new Date().toISOString().slice(0,10); }

/* ── profiles ── */
const Profile = {
  all(){ return LS.get("profiles",[]); },
  currentName(){ return LS.get("profile","") ; },
  current(){
    const n=this.currentName(); if(!n) return null;
    return this.get(n);
  },
  get(name){
    const p=LS.get("p."+name,null);
    if(p) return p;
    return {name,created:todayISO(),stats:{games:0,answered:0,correct:0,fast:0,bestStreak:0,byGame:{},byUnit:{},examGold:0},badges:{},accolades:{},seen:{},study:{},studyTime:{}};
  },
  save(p){ LS.set("p."+p.name,p); const all=this.all(); if(!all.includes(p.name)){all.push(p.name);LS.set("profiles",all);} },
  select(name){ LS.set("profile",name); const p=this.get(name); this.save(p); },
  remove(name){ LS.del("p."+name); LS.set("profiles",this.all().filter(n=>n!==name)); if(this.currentName()===name) LS.del("profile"); }
};

/* ── no-repeat question pool engine ──
   Pool key = units + difficulty + topics. Used ids persist per device (shared across profiles,
   so a class tablet keeps cycling through fresh questions). */
const Pool = {
  key(cfg){ return [cfg.units.slice().sort().join("-"),"d"+cfg.diff,cfg.topics.slice().sort().join(","),cfg.lesson!=null?"L"+cfg.lesson:""].join("|"); },
  base(cfg){
    return BANK.filter(q=>(cfg.units.includes(0)||cfg.units.includes(q.u)) && cfg.topics.includes(q.t) && (cfg.lesson==null||String(q.l)===String(cfg.lesson)));
  },
  sizeFor(cfg){
    const b=this.base(cfg); if(cfg.diff==="mix") return b.length; return b.filter(q=>q.d===cfg.diff).length;
  },
  used(cfg){ return new Set(LS.get("used."+this.key(cfg),[])); },
  markUsed(cfg,ids){ const s=this.used(cfg); ids.forEach(i=>s.add(i)); LS.set("used."+this.key(cfg),Array.from(s)); },
  reset(cfg){ LS.del("used."+this.key(cfg)); },
  resetAll(){ LS.keys().filter(k=>k.startsWith("used.")).forEach(k=>LS.del(k)); },
  /* draw(cfg, n, opts): opts.level (exact level), opts.topic, opts.wheel(bool), opts.exclude(Set)
     Returns {qs:[...], recycled:bool}. Pads from nearest difficulty levels when the exact level is short. */
  draw(cfg,n,opts){
    opts=opts||{};
    const base=this.base(cfg).filter(q=>!(opts.exclude&&opts.exclude.has(q.id)) && (!opts.topic||q.t===opts.topic) && (!opts.wheel||wheelEligible(q)));
    const target = opts.level!=null ? opts.level : (cfg.diff==="mix"?null:cfg.diff);
    const used=this.used(cfg);
    const ordered = [];
    if(target==null){ ordered.push(base); }
    else{
      const levels=[0,1,2,3,4].sort((a,b)=>Math.abs(a-target)-Math.abs(b-target)||a-b);
      levels.forEach(l=>ordered.push(base.filter(q=>q.d===l)));
    }
    let out=[], recycled=false, reset=false;
    // first pass: unused only, nearest level first
    for(const group of ordered){ if(out.length>=n) break; out=out.concat(shuffle(group.filter(q=>!used.has(q.id))).slice(0,n-out.length)); }
    if(out.length<n){
      // exhausted — recycle: allow used questions (nearest level first), avoid ones already in this draw
      recycled=true;
      const have=new Set(out.map(q=>q.id));
      for(const group of ordered){ if(out.length>=n) break; out=out.concat(shuffle(group.filter(q=>!have.has(q.id))).slice(0,n-out.length)); }
    }
    // if we recycled AND the whole pool had been used up, clear the used set so the cycle starts fresh
    if(recycled){
      const allIds=new Set(base.map(q=>q.id)); let allUsed=true; for(const id of allIds){ if(!used.has(id)){allUsed=false;break;} }
      if(allUsed){ this.reset(cfg); reset=true; }
    }
    // NOTE: questions are marked "used" only when actually shown (Session.present), so a Jeopardy
    // board abandoned half-way doesn't burn its unseen clues.
    return {qs:out,recycled,reset};
  },
  progress(cfg){ const b=this.base(cfg); const tot=cfg.diff==="mix"?b.length:b.filter(q=>q.d===cfg.diff).length; const u=this.used(cfg); let c=0; b.forEach(q=>{ if((cfg.diff==="mix"||q.d===cfg.diff)&&u.has(q.id)) c++; }); return {used:c,total:tot}; }
};

/* ── choices builder ── */
function buildChoices(q){
  const opts=shuffle([q.a].concat(q.x));
  return opts.map(t=>({t,ok:t===q.a}));
}

/* ── scoring ── */
function basePoints(q,cfg){ return DIFFS.find(d=>d.id===q.d).pts; }
function speedBonus(base,remaining,total){ if(!total) return 0; return Math.round(base*0.5*Math.max(0,remaining)/total); }

/* ── timer ── */
class Timer{
  constructor(sec,onTick,onEnd){ this.total=sec; this.left=sec; this.onTick=onTick; this.onEnd=onEnd; this.h=null; this.running=false; }
  start(){ this.stop(); this.running=true; this.t0=performance.now(); this.h=setInterval(()=>{ const e=(performance.now()-this.t0)/1000; this.left=Math.max(0,this.total-e); this.onTick&&this.onTick(this.left,this.total); if(this.left<=0){this.stop(); this.onEnd&&this.onEnd();} },100); return this; }
  stop(){ if(this.h){clearInterval(this.h);} this.h=null; this.running=false; }
  elapsed(){ return this.total-this.left; }
}

/* ── leaderboard ── */
const Board = {
  all(){ return LS.get("board",[]); },
  add(e){ const b=this.all(); b.push(Object.assign({date:todayISO(),ts:Date.now()},e)); b.sort((a,b)=>b.score-a.score); LS.set("board",b.slice(0,500)); },
  top(filter,n){ let b=this.all(); if(filter){ b=b.filter(e=>(!filter.game||e.game===filter.game)&&(filter.unit==null||e.unit===filter.unit)&&(!filter.diff&&filter.diff!==0||String(e.diff)===String(filter.diff))); } return b.slice(0,n||10); },
  clear(){ LS.set("board",[]); }
};

/* ── badges (per unit, unit-coloured) ── */
const BADGE_DEFS = [
  {id:"initiate",name:"Initiate",desc:"Play any game in this unit",test:(p,u)=>(p.stats.byUnit[u]?.games||0)>=1,prog:(p,u)=>[Math.min(1,p.stats.byUnit[u]?.games||0),1]},
  {id:"scholar",name:"Scholar",desc:"Finish a game with 70%+ correct",test:(p,u)=>!!p.stats.byUnit[u]?.scholar},
  {id:"sage",name:"Sage",desc:"70%+ correct at Level 4",test:(p,u)=>!!p.stats.byUnit[u]?.sage},
  {id:"grandmaster",name:"Grand Master",desc:"Play all four games in this unit",test:(p,u)=>Object.keys(p.stats.byUnit[u]?.games_by||{}).length>=4,prog:(p,u)=>[Object.keys(p.stats.byUnit[u]?.games_by||{}).length,4]},
  {id:"completionist",name:"Completionist",desc:"See every question in this unit at least once",test:(p,u)=>unitSeen(p,u)>=unitTotal(u),prog:(p,u)=>[unitSeen(p,u),unitTotal(u)]},
  {id:"swift",name:"Swift Mind",desc:"10 correct answers under 5s in one timed game",test:(p,u)=>!!p.stats.byUnit[u]?.swift}
];
function unitTotal(u){ return BANK.filter(q=>q.u===u).length; }
function unitSeen(p,u){ let c=0; for(const id in p.seen){ const q=BANK[+id.slice(1)]; if(q&&q.u===u) c++; } return c; }

/* ── accolades (global) ── */
const ACCOLADE_DEFS = [
  {id:"first",name:"First Steps",desc:"Finish your first game",test:p=>p.stats.games>=1},
  {id:"perfect",name:"Flawless",desc:"100% correct in a game of 10+ questions",test:p=>!!p.stats.perfect},
  {id:"streak10",name:"Hot Streak",desc:"10 correct answers in a row",test:p=>p.stats.bestStreak>=10},
  {id:"king",name:"Philosopher King",desc:"Reach the top rung in Millionaire",test:p=>!!p.stats.king},
  {id:"wizard",name:"Wheel Wizard",desc:"Solve a puzzle with 3 or fewer letters revealed",test:p=>!!p.stats.wizard},
  {id:"dd",name:"Double Down",desc:"Win a Daily Double wager",test:p=>!!p.stats.dd},
  {id:"lightning",name:"Lightning Rod",desc:"15+ correct in one Lightning Round",test:p=>!!p.stats.lightning},
  {id:"exam",name:"Exam Ready",desc:"70%+ on All Units at Level 3 or higher",test:p=>!!p.stats.exam},
  {id:"purist",name:"Purist",desc:"Finish a Level 4 game with the timer off",test:p=>!!p.stats.purist},
  {id:"speed",name:"Speed Demon",desc:"Average under 4s per answer in a timed game (10+ Qs)",test:p=>!!p.stats.speed},
  {id:"polymath",name:"Polymath",desc:"Earn a badge in all four units",test:p=>[1,2,3,4].every(u=>Object.keys(p.badges).some(k=>k.startsWith(u+":")))},
  {id:"marathon",name:"Marathon",desc:"Answer 250 questions in total",test:p=>p.stats.answered>=250},
  {id:"rival",name:"Rivalry",desc:"Win a head-to-head game",test:p=>!!p.stats.h2hwin},
  {id:"cycle",name:"Full Cycle",desc:"Exhaust an entire question pool",test:p=>!!p.stats.cycle},
  {id:"librarian",name:"Librarian",desc:"Study every lesson of every unit in the Study Room",test:p=>[1,2,3,4].every(u=>unitStudyDone(p,u))},
  {id:"laureate",name:"I think, therefore I am… a Philosopher",desc:"The ultimate honour: every accolade, every badge in every unit, every Golden honour, and Valedictorian",ultimate:true,
   test:p=>ACCOLADE_DEFS.filter(a=>a.id!=="laureate").every(a=>p.accolades[a.id])&&[1,2,3,4].every(u=>BADGE_DEFS.every(b=>p.badges[u+":"+b.id]))&&!!p.accolades.valedictorian}
];

/* ── per-unit lifetime record helper ── */
function BU(p,u){ const s=p.stats; s.byUnit[u]=s.byUnit[u]||{games:0,games_by:{}}; const b=s.byUnit[u];
  b.time=b.time||0; b.days=b.days||[]; b.a=b.a||0; b.c=b.c||0; b.l4a=b.l4a||0; b.l4c=b.l4c||0; b.lessons=b.lessons||{}; b.topics=b.topics||{}; b.bestStreak=b.bestStreak||0; b.gameL4=b.gameL4||{}; b.cycles=b.cycles||0; b.trRun=b.trRun||0; b.trBest=b.trBest||0; b.trSum=b.trSum||0; b.trN=b.trN||0; return b; }
function unitHours(u){ return (UNITS[u]&&UNITS[u].lessons.length||6)*3600; }
function lessonIds(u){ const m={}; BANK.forEach(q=>{ if(q.u===u){ (m[q.l]=m[q.l]||[]).push(q.id); } }); return m; }
function unitTopicCount(u,t){ return BANK.filter(q=>q.u===u&&q.t===t).length; }
function pct(c,a){ return a?c/a:0; }

/* ── gates (visible, per unit) — all three unlock the hidden Golden tier ── */
const GATE_DEFS=[
  {id:"sentinel",name:"Sentinel",desc:"Play this unit on 10 different days",test:(p,u)=>BU(p,u).days.length>=10,prog:(p,u)=>[Math.min(10,BU(p,u).days.length),10]},
  {id:"ironclad",name:"Ironclad",desc:"90%+ in a Level 4 game of 20+ questions, in each of the four games",test:(p,u)=>Object.keys(GAMES).every(g=>(BU(p,u).gameL4[g]?.best20||0)>=.9),prog:(p,u)=>[Object.keys(GAMES).filter(g=>(BU(p,u).gameL4[g]?.best20||0)>=.9).length,4]},
  {id:"cartographer",name:"Cartographer",desc:"See every question in the unit and hold 85%+ lifetime accuracy in every topic",test:(p,u)=>unitSeen(p,u)>=unitTotal(u)&&TOPICS.every(t=>{const n=unitTopicCount(u,t); if(!n) return true; const r=BU(p,u).topics[t]||{a:0,c:0}; return r.a>=Math.min(20,n*2)&&pct(r.c,r.a)>=.85;}),prog:(p,u)=>[TOPICS.filter(t=>{const n=unitTopicCount(u,t); if(!n) return false; const r=BU(p,u).topics[t]||{a:0,c:0}; return r.a>=Math.min(20,n*2)&&pct(r.c,r.a)>=.85;}).length+(unitSeen(p,u)>=unitTotal(u)?1:0),TOPICS.filter(t=>unitTopicCount(u,t)).length+1]}
];
function gatesOpen(p,u){ return GATE_DEFS.every(g=>p.accolades["gate:"+u+":"+g.id]); }

/* ── Golden tier (hidden until the gates open) ── */
function lessonsSeenTwice(p,u){ const m=lessonIds(u); return Object.keys(m).every(l=>m[l].every(id=>(p.seen[id]||0)>=2)); }
function timeOK(p,u){ return BU(p,u).time>=unitHours(u); }
const GOLD_DEFS=[
  {id:"check",name:"Golden Checkmark",desc:"97%+ lifetime accuracy (400+ answered), 95%+ at Level 4 (80+), a 40-answer streak, every lesson seen twice, and an hour of active play per lesson",
   test:(p,u)=>{const b=BU(p,u); return timeOK(p,u)&&lessonsSeenTwice(p,u)&&b.a>=400&&pct(b.c,b.a)>=.97&&b.l4a>=80&&pct(b.l4c,b.l4a)>=.95&&b.bestStreak>=40;},
   prog:(p,u)=>{const b=BU(p,u); return [[timeOK(p,u),lessonsSeenTwice(p,u),b.a>=400&&pct(b.c,b.a)>=.97,b.l4a>=80&&pct(b.l4c,b.l4a)>=.95,b.bestStreak>=40].filter(Boolean).length,5];}},
  {id:"notebook",name:"Golden Notebook",desc:"95%+ in every lesson (20+ each), three full cycles of the unit pool, 90%+ in all four games at Level 4 (25+ Qs), every question seen, and an hour of active play per lesson",
   test:(p,u)=>{const b=BU(p,u); const m=lessonIds(u); const lessonsOK=Object.keys(m).every(l=>{const r=b.lessons[l]||{a:0,c:0}; return r.a>=Math.min(20,m[l].length*2)&&pct(r.c,r.a)>=.95;}); const gamesOK=Object.keys(GAMES).every(g=>(b.gameL4[g]?.best25||0)>=.9); return timeOK(p,u)&&lessonsOK&&b.cycles>=3&&gamesOK&&unitSeen(p,u)>=unitTotal(u);},
   prog:(p,u)=>{const b=BU(p,u); const m=lessonIds(u); const lessonsOK=Object.keys(m).every(l=>{const r=b.lessons[l]||{a:0,c:0}; return r.a>=Math.min(20,m[l].length*2)&&pct(r.c,r.a)>=.95;}); const gamesOK=Object.keys(GAMES).every(g=>(b.gameL4[g]?.best25||0)>=.9); return [[timeOK(p,u),lessonsOK,b.cycles>=3,gamesOK,unitSeen(p,u)>=unitTotal(u)].filter(Boolean).length,5];}},
  {id:"review",name:"Golden Test Review",desc:"Ten consecutive timed (15s or faster) Level 3+ games of 20+ questions at 95%+, averaging under 8s per answer; three timed Level 4 All-Units games of 20+ at 95%+; and an hour of active play per lesson",
   test:(p,u)=>{const b=BU(p,u); return timeOK(p,u)&&!!b.trDone&&(p.stats.examGold||0)>=3;},
   prog:(p,u)=>{const b=BU(p,u); return [[timeOK(p,u),!!b.trDone,(p.stats.examGold||0)>=3].filter(Boolean).length,3];}}
];
function sealCode(name,u,kind,date){ const str=`${name}|${u}|${kind}|${date}|sophia-agora-2026`; let h=5381,h2=2166136261; for(const ch of str){ h=((h<<5)+h+ch.charCodeAt(0))>>>0; h2=Math.imul(h2^ch.charCodeAt(0),16777619)>>>0; } const c=(h.toString(36)+h2.toString(36)).toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,10); return c.slice(0,5)+"-"+c.slice(5); }
function goldEarned(p,u,kind){ return p.accolades["gold:"+u+":"+kind]; }
function allGold(p){ return [1,2,3,4].every(u=>GOLD_DEFS.every(g=>goldEarned(p,u,g.id))); }

/* ── Study Room accolades ── */
function lessonKey(u,l){ return u+":"+l; }
function studyDone(p,u,l){ return !!(p.study&&p.study[lessonKey(u,l)]); }
function unitStudyDone(p,u){ const ls=(window.LESSONS||[]).filter(L=>L.u===u); return ls.length>0&&ls.every(L=>studyDone(p,u,L.l)); }
function studyRequired(L){ return Math.max(60,L.cards.length*8); } // seconds of reading needed

/* Record a finished game for a profile; returns list of newly unlocked things */
function recordGame(p,res){
  // res: {game,unit,diff,timed,timeSec,answered,correct,fast,bestStreak,score,h2hWin,recycled,cycle,flags,avgTime,seen,time,lessons,topics,l4a,l4c,units}
  const s=p.stats; s.games++; s.answered+=res.answered; s.correct+=res.correct; s.fast+=res.fast||0; s.bestStreak=Math.max(s.bestStreak,res.bestStreak||0);
  s.byGame[res.game]=(s.byGame[res.game]||0)+1;
  const u=res.unit; const bu=BU(p,u); bu.games++; bu.games_by[res.game]=1;
  const pc=res.answered?res.correct/res.answered:0;
  if(pc>=.7&&res.answered>=5) bu.scholar=true;
  if(pc>=.7&&res.answered>=5&&res.diff===4) bu.sage=true;
  if(res.timed&&(res.fast||0)>=10) bu.swift=true;
  if(pc===1&&res.answered>=10) s.perfect=true;
  if(res.flags){ Object.keys(res.flags).forEach(k=>{ if(res.flags[k]) s[k]=true; }); }
  if(res.game==="sprint"&&res.correct>=15) s.lightning=true;
  if(u===0&&pc>=.7&&res.answered>=10&&(res.diff===3||res.diff===4)) s.exam=true;
  if(!res.timed&&res.diff===4&&res.answered>=10) s.purist=true;
  if(res.timed&&res.answered>=10&&res.avgTime&&res.avgTime<4) s.speed=true;
  if(res.h2hWin) s.h2hwin=true;
  if(res.recycled) s.cycle=true;
  (res.seen||[]).forEach(id=>p.seen[id]=(p.seen[id]||0)+1);
  // ── lifetime per-unit detail, credited to the unit each question belongs to (so All-Units play counts too) ──
  const today=todayISO(); const per=res.perUnit||{};
  Object.keys(per).forEach(k=>{ const un=+k, sh=per[k], b=BU(p,un); if(!b.days.includes(today)) b.days.push(today);
    b.time+=sh.time||0; b.a+=sh.a||0; b.c+=sh.c||0; b.l4a+=sh.l4a||0; b.l4c+=sh.l4c||0; b.bestStreak=Math.max(b.bestStreak,res.bestStreak||0);
    Object.keys(sh.lessons||{}).forEach(l=>{ b.lessons[l]=b.lessons[l]||{a:0,c:0}; b.lessons[l].a+=sh.lessons[l].a; b.lessons[l].c+=sh.lessons[l].c; });
    Object.keys(sh.topics||{}).forEach(t=>{ b.topics[t]=b.topics[t]||{a:0,c:0}; b.topics[t].a+=sh.topics[t].a; b.topics[t].c+=sh.topics[t].c; }); });
  if(!bu.days.includes(today)) bu.days.push(today);
  if(u!==0){
    if(res.diff===4&&res.answered>=20){ const g=bu.gameL4[res.game]=bu.gameL4[res.game]||{best20:0,best25:0}; g.best20=Math.max(g.best20,pc); if(res.answered>=25) g.best25=Math.max(g.best25,pc); }
    if(res.cycle) bu.cycles++;
    // Golden Test Review run: timed ≤15s, L3+, 20+ Qs; 95%+ continues the run, a miss resets it
    if(res.timed&&(res.timeSec||99)<=15&&res.answered>=20&&(res.diff===3||res.diff===4)){
      if(pc>=.95){ bu.trRun++; bu.trSum+=res.avgTime||0; bu.trN++; bu.trBest=Math.max(bu.trBest,bu.trRun); if(bu.trRun>=10&&(bu.trSum/bu.trN)<8) bu.trDone=true; }
      else { bu.trRun=0; bu.trSum=0; bu.trN=0; }
    }
  } else if(res.timed&&res.diff===4&&res.answered>=20&&pc>=.95){ s.examGold=(s.examGold||0)+1; }
  // ── unlocks ──
  const unlocked=[];
  [1,2,3,4].forEach(un=>{ BADGE_DEFS.forEach(b=>{ const k=un+":"+b.id; if(!p.badges[k]&&b.test(p,un)){ p.badges[k]=todayISO(); unlocked.push({type:"badge",unit:un,def:b}); } }); });
  for(let pass=0;pass<2;pass++){
    ACCOLADE_DEFS.forEach(a=>{ if(!p.accolades[a.id]&&a.test(p)){ p.accolades[a.id]=todayISO(); unlocked.push({type:"accolade",def:a}); } });
    [1,2,3,4].forEach(un=>{
      GATE_DEFS.forEach(g=>{ const k="gate:"+un+":"+g.id; if(!p.accolades[k]&&g.test(p,un)){ p.accolades[k]=todayISO(); unlocked.push({type:"gate",unit:un,def:g}); } });
      if(gatesOpen(p,un)) GOLD_DEFS.forEach(g=>{ const k="gold:"+un+":"+g.id; if(!p.accolades[k]&&g.test(p,un)){ const d=todayISO(); p.accolades[k]={date:d,seal:sealCode(p.name,un,g.id,d)}; unlocked.push({type:"gold",unit:un,def:g}); } });
    });
    if(p.accolades.laureate&&typeof p.accolades.laureate==="string"){ const d=p.accolades.laureate; p.accolades.laureate={date:d,seal:sealCode(p.name,0,"cogito",d)}; }
    if(!p.accolades.valedictorian&&allGold(p)){ const d=todayISO(); p.accolades.valedictorian={date:d,seal:sealCode(p.name,0,"valedictorian",d)}; unlocked.push({type:"gold",unit:0,def:{id:"valedictorian",name:"Valedictorian",desc:"Every Golden honour in every unit"}}); }
  }
  Profile.save(p);
  return unlocked;
}

/* Record study time; marks a lesson complete once it's been read to the end with enough time. Returns unlocks. */
function recordStudy(p,u,l,secs,reachedEnd){
  p.study=p.study||{}; p.studyTime=p.studyTime||{}; const k=lessonKey(u,l); p.studyTime[k]=(p.studyTime[k]||0)+secs;
  const unlocked=[]; const L=(window.LESSONS||[]).find(x=>x.u===u&&String(x.l)===String(l));
  if(L&&reachedEnd&&!p.study[k]&&p.studyTime[k]>=studyRequired(L)){ p.study[k]=todayISO(); unlocked.push({type:"study",unit:u,def:{name:"Lesson studied: "+L.title,desc:UNITS[u].short}}); }
  [1,2,3,4].forEach(un=>{ const key="lamp:"+un; if(!p.accolades[key]&&unitStudyDone(p,un)){ p.accolades[key]=todayISO(); unlocked.push({type:"accolade",unit:un,def:{id:key,name:"Scholar's Lamp — "+UNITS[un].short,desc:"Studied every lesson in the unit"}}); } });
  if(!p.accolades.librarian&&[1,2,3,4].every(un=>unitStudyDone(p,un))){ p.accolades.librarian=todayISO(); unlocked.push({type:"accolade",def:{id:"librarian",name:"Librarian",desc:"Studied every lesson in the course"}}); }
  Profile.save(p); return unlocked;
}

/* ── UI helpers ── */
function toast(title,sub,icon){
  const t=el(`<div class="toast"><div class="t-ic"><svg><use href="#${icon||'ic-badge'}"/></svg></div><div><b>${esc(title)}</b>${sub?`<span>${esc(sub)}</span>`:""}</div></div>`);
  $("#toasts").appendChild(t); setTimeout(()=>{t.style.transition="opacity .4s";t.style.opacity="0";setTimeout(()=>t.remove(),400);},3600);
}
function modal(html,opts){
  const m=$("#modal"); m.innerHTML=`<div class="box ${opts&&opts.wide?'wide':''}">${html}</div>`; m.hidden=false;
  m.onclick=(e)=>{ if(e.target===m && !(opts&&opts.sticky)) closeModal(); };
  return m.firstElementChild;
}
function closeModal(){ const m=$("#modal"); m.hidden=true; m.innerHTML=""; }
function setUnitTheme(u){ document.body.dataset.unit=String(u); }
function emblem(u,cls){ return `<span class="emblem ${cls||''}"><svg><use href="#em-${u}"/></svg></span>`; }
function diffName(d){ const x=DIFFS.find(z=>String(z.id)===String(d)); return x?x.name:String(d); }
function unitShort(u){ return UNITS[u]?UNITS[u].short:"?"; }
function pctStr(c,a){ return a?Math.round(100*c/a)+"%":"—"; }

/* light sound feedback (no assets; WebAudio) */
const Sfx = {
  ctx:null, on:LS.get("sfx",true),
  beep(freq,dur,type,vol){ if(!this.on) return; try{ this.ctx=this.ctx||new (window.AudioContext||window.webkitAudioContext)(); const o=this.ctx.createOscillator(), g=this.ctx.createGain(); o.type=type||"sine"; o.frequency.value=freq; g.gain.value=vol||.06; o.connect(g); g.connect(this.ctx.destination); o.start(); g.gain.exponentialRampToValueAtTime(.0001,this.ctx.currentTime+(dur||.15)); o.stop(this.ctx.currentTime+(dur||.15)); }catch(e){} },
  ok(){ this.beep(660,.12); setTimeout(()=>this.beep(990,.18),90); },
  no(){ this.beep(180,.25,"sawtooth",.05); },
  tick(){ this.beep(1200,.04,"square",.02); },
  spin(){ this.beep(440,.08,"triangle",.04); },
  win(){ [523,659,784,1047].forEach((f,i)=>setTimeout(()=>this.beep(f,.2),i*110)); }
};
