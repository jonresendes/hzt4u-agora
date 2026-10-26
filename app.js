/* ═══════════════════════════════════════════════════════════
   app.js — screens, setup flow, leaderboard, badges, profiles
   ═══════════════════════════════════════════════════════════ */
'use strict';

const App = {
  s: Object.assign({units:[1],diff:"mix",topics:TOPICS.slice(),timed:false,timeSec:20,mode:"solo",teams:["Athens","Sparta"],projector:false},LS.get("settings",{})),
  root: null, deferredInstall:null,

  init(){
    this.root=$("#app");
    $("#btnHome").onclick=()=>this.go("home");
    $("#btnLeaderboard").onclick=()=>this.go("leaderboard");
    $("#btnBadges").onclick=()=>this.go("badges");
    $("#btnProfile").onclick=()=>this.profileModal();
    $("#btnInstall").onclick=()=>this.install();
    window.addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); this.deferredInstall=e; $("#btnInstall").hidden=false; });
    window.addEventListener("appinstalled",()=>{ $("#btnInstall").hidden=true; toast("Installed","Agora is now on your device","ic-download"); });
    if("serviceWorker" in navigator){ navigator.serviceWorker.register("sw.js").catch(()=>{}); }
    if(!Profile.currentName()){ this.profileModal(true); }
    this.refreshProfileChip();
    this.go("home");
  },
  save(){ LS.set("settings",this.s); },
  refreshProfileChip(){ $("#profileName").textContent=Profile.currentName()||"Player"; },
  cfg(){ const s=this.s; const players=s.mode==="h2h"?s.teams.map((n,i)=>({name:n||("Team "+(i+1)),color:TEAM_COLORS[i]})):[{name:Profile.currentName()||"Player",color:TEAM_COLORS[0]}]; return {units:s.units,diff:s.diff,topics:s.topics,timed:s.timed,timeSec:s.timeSec,mode:s.mode,players,projector:s.projector}; },
  unitNo(){ return this.s.units.includes(0)?0:this.s.units[0]; },

  go(screen){
    document.body.classList.toggle("projector",!!(this.s.projector&&this.s.mode==="h2h")&&screen!=="home");
    window.scrollTo(0,0);
    if(screen==="home") this.home();
    else if(screen==="setup") this.setup();
    else if(screen==="games") this.games();
    else if(screen==="leaderboard") this.leaderboard();
    else if(screen==="badges") this.badges();
  },

  /* ── HOME ── */
  home(){
    setUnitTheme(0);
    const p=Profile.current(); const games=p?p.stats.games:0; const ans=p?p.stats.answered:0;
    this.root.innerHTML=`<section class="hero">
      <div class="eyebrow">HZT4U · Philosophy: Questions & Theories</div>
      <h1>Welcome to the <em>Agora</em></h1>
      <p>Four units, four games, seven hundred questions drawn straight from your lessons. Play solo on your own device or head-to-head on the projector.</p>
      <p class="mantra" style="margin-top:1rem">“Be Curious First, Not Critical.”</p>
    </section>
    <div class="grid grid-2">${[1,2,3,4,0].map(u=>`<div class="u${u}"><button class="card card-btn unit-card" data-u="${u}"><div class="n">${u||"∞"}</div><div><h3>${esc(UNITS[u].title)}</h3><div class="lessons">${u?UNITS[u].lessons.length+" lessons · ":""}${u?unitTotal(u):BANK.length} questions · ${esc(UNITS[u].tag)}</div></div>${emblem(u)}</button></div>`).join("")}</div>
    <div class="stats-strip"><div><b>${BANK.length}</b>questions</div><div><b>${games}</b>games played${p?" by "+esc(p.name):""}</div><div><b>${ans}</b>answered</div><div><b>${p?Object.keys(p.badges).length:0}</b>badges</div></div>`;
    $$(".unit-card",this.root).forEach(b=>b.onclick=()=>{ this.s.units=[+b.dataset.u]; this.save(); this.go("setup"); });
  },

  /* ── SETUP ── */
  setup(){
    const s=this.s; const u=this.unitNo(); setUnitTheme(u);
    const counts={}; TOPICS.forEach(t=>counts[t]=Pool.base({units:s.units,topics:[t]}).length);
    const cfg=this.cfg(); const size=Pool.sizeFor(cfg); const prog=Pool.progress(cfg);
    this.root.innerHTML=`<div class="screen-head"><div><button class="back" id="back"><svg class="ic"><use href="#ic-back"/></svg> Units</button><div class="eyebrow">Unit ${u||"∞"}</div><h2>${esc(UNITS[u].title)}</h2></div>${emblem(u)}</div>
    <div class="setup-grid">
      <div class="stack">
        <div class="card"><div class="eyebrow" style="margin-bottom:.6rem">Mode</div>
          <div class="seg" id="modeSeg"><button data-m="solo" class="${s.mode==="solo"?"on":""}">Solo</button><button data-m="h2h" class="${s.mode==="h2h"?"on":""}">Head-to-Head</button></div>
          <div id="teams" style="margin-top:.9rem" ${s.mode==="h2h"?"":"hidden"}>
            <div class="players">${[0,1,2,3].map(i=>`<div class="player-row" ${i<s.teams.length?"":"hidden"}><span class="dot" style="background:${TEAM_COLORS[i]}"></span><input class="input" data-i="${i}" value="${esc(s.teams[i]||"")}" placeholder="Team ${i+1} name"><button class="btn sm ghost rm" data-i="${i}" ${s.teams.length<=2?"disabled":""}>✕</button></div>`).join("")}</div>
            <div class="row" style="margin-top:.6rem"><button class="btn sm" id="addTeam" ${s.teams.length>=4?"disabled":""}>+ Add team</button><label class="toggle ${s.projector?"on":""}" id="projToggle"><span class="sw"></span><span class="small">Projector mode (bigger text)</span></label></div>
            <p class="small muted" style="margin-top:.5rem">Tip: name a team after a saved player profile and that profile earns badges and stats.</p>
          </div>
        </div>
        <div class="card"><div class="eyebrow" style="margin-bottom:.6rem">Difficulty</div>
          <div class="option-list" id="diffs">${DIFFS.map(d=>`<button class="opt ${String(s.diff)===String(d.id)?"on":""}" data-d="${d.id}"><b>${d.name}</b><span>${d.desc}</span><span class="cnt">${d.id==="mix"?Pool.base({units:s.units,topics:s.topics}).length:Pool.base({units:s.units,topics:s.topics}).filter(q=>q.d===d.id).length} questions</span></button>`).join("")}</div>
          <p class="small muted" style="margin-top:.6rem">Levels roughly track expected grade bands: Remedial → Level 4. If a level runs short for a board, nearby levels fill in.</p>
        </div>
        <div class="card"><div class="row between" style="margin-bottom:.6rem"><div class="eyebrow">Topics</div><div class="row"><button class="btn sm ghost" id="tAll">All</button><button class="btn sm ghost" id="tNone">None</button></div></div>
          <div class="option-list" id="topics">${TOPICS.map(t=>`<button class="opt ${s.topics.includes(t)?"on":""}" data-t="${t}" ${counts[t]?"":"disabled"}><b>${t}</b><span>${TOPIC_DESC[t]}</span><span class="cnt">${counts[t]} questions</span></button>`).join("")}</div>
        </div>
        <div class="card"><div class="row between"><label class="toggle ${s.timed?"on":""}" id="timerToggle"><span class="sw"></span><span><b>Timed questions</b><div class="small muted">Faster answers earn bonus points</div></span></label>
          <div class="seg" id="secs" ${s.timed?"":"hidden"}>${[10,15,20,30,45].map(v=>`<button data-s="${v}" class="${s.timeSec===v?"on":""}">${v}s</button>`).join("")}</div></div>
        </div>
      </div>
      <div><div class="card glow summary">
        <div class="row between"><div class="eyebrow">Your selection</div>${emblem(u)}</div>
        <div class="big" style="margin:.4rem 0">${size}</div><div class="muted small">questions in this pool · ${prog.used} already seen</div>
        <div class="divider"></div>
        <div class="stack small">
          <div class="row between"><span class="muted">Mode</span><b>${s.mode==="h2h"?"Head-to-Head · "+s.teams.length+" teams":"Solo · "+esc(Profile.currentName()||"Player")}</b></div>
          <div class="row between"><span class="muted">Difficulty</span><b>${diffName(s.diff)}</b></div>
          <div class="row between"><span class="muted">Topics</span><b>${s.topics.length===TOPICS.length?"All":s.topics.length+" of "+TOPICS.length}</b></div>
          <div class="row between"><span class="muted">Timer</span><b>${s.timed?s.timeSec+"s per question":"Off"}</b></div>
        </div>
        <div class="divider"></div>
        <button class="btn primary lg block" id="toGames" ${size&&s.topics.length?"":"disabled"}>Choose a game →</button>
        <button class="btn sm ghost block" id="resetPool" style="margin-top:.5rem">Reset “seen” questions for this pool</button>
      </div></div>
    </div>`;
    const r=this.root;
    $("#back",r).onclick=()=>this.go("home");
    $$("#modeSeg button",r).forEach(b=>b.onclick=()=>{ s.mode=b.dataset.m; this.save(); this.setup(); });
    $$("#teams input",r).forEach(i=>i.oninput=()=>{ s.teams[+i.dataset.i]=i.value; this.save(); });
    $$("#teams .rm",r).forEach(b=>b.onclick=()=>{ s.teams.splice(+b.dataset.i,1); this.save(); this.setup(); });
    $("#addTeam",r).onclick=()=>{ s.teams.push(pick(["Delphi","Corinth","Thebes","Ithaca","Argos","Miletus","Elea","Ephesus"].filter(n=>!s.teams.includes(n)))||"Team "+(s.teams.length+1)); this.save(); this.setup(); };
    $("#projToggle",r).onclick=()=>{ s.projector=!s.projector; this.save(); this.setup(); };
    $$("#diffs .opt",r).forEach(b=>b.onclick=()=>{ s.diff=b.dataset.d==="mix"?"mix":+b.dataset.d; this.save(); this.setup(); });
    $$("#topics .opt",r).forEach(b=>b.onclick=()=>{ const t=b.dataset.t; s.topics=s.topics.includes(t)?s.topics.filter(x=>x!==t):s.topics.concat([t]); this.save(); this.setup(); });
    $("#tAll",r).onclick=()=>{ s.topics=TOPICS.filter(t=>counts[t]); this.save(); this.setup(); };
    $("#tNone",r).onclick=()=>{ s.topics=[]; this.save(); this.setup(); };
    $("#timerToggle",r).onclick=()=>{ s.timed=!s.timed; this.save(); this.setup(); };
    $$("#secs button",r).forEach(b=>b.onclick=()=>{ s.timeSec=+b.dataset.s; this.save(); this.setup(); });
    $("#toGames",r).onclick=()=>this.go("games");
    $("#resetPool",r).onclick=()=>{ Pool.reset(this.cfg()); toast("Pool reset","All questions in this selection are fresh again"); this.setup(); };
  },

  /* ── GAME SELECT ── */
  games(){
    const s=this.s; const u=this.unitNo(); setUnitTheme(u); const cfg=this.cfg();
    const wheelCount=Pool.base(cfg).filter(wheelEligible).length;
    this.root.innerHTML=`<div class="screen-head"><div><button class="back" id="back"><svg class="ic"><use href="#ic-back"/></svg> Settings</button><div class="eyebrow">${esc(UNITS[u].short)} · ${diffName(s.diff)} · ${s.mode==="h2h"?s.teams.length+" teams":"solo"}${s.timed?" · timed":""}</div><h2>Choose your arena</h2></div>${emblem(u)}</div>
    <div class="grid grid-2">${Object.values(GAMES).map(g=>`<button class="card card-btn game-card" data-g="${g.id}"><div class="row between"><div class="glyph">${g.glyph}</div><button class="btn sm ghost how" data-g="${g.id}">How to play</button></div><h3>${esc(g.name)}</h3><p>${esc(g.desc)}</p><div class="meta">${esc(g.meta)}${g.id==="wheel"?` · ${wheelCount} puzzle-ready terms`:""}</div></button>`).join("")}</div>`;
    $("#back",this.root).onclick=()=>this.go("setup");
    $$(".game-card",this.root).forEach(c=>c.onclick=(e)=>{ if(e.target.closest(".how")) return; this.startGame(c.dataset.g); });
    $$(".how",this.root).forEach(b=>b.onclick=(e)=>{ e.stopPropagation(); this.howTo(b.dataset.g); });
  },
  howTo(g){
    const h={
      jeopardy:`<p>Pick a category and a value. Answer the multiple-choice clue — keys <b>A–D</b> or <b>1–4</b> work too.</p><ul><li>Correct: +value (plus a speed bonus if timed). Wrong: −value.</li><li>Two <b>Daily Doubles</b> hide on the board — wager up to your score (min 100).</li><li>Head-to-head: the team in control chooses. After a wrong answer, any other team may <b>steal</b> once. A correct steal takes control.</li><li>In Mixed difficulty, rows climb from Remedial to Level 4.</li></ul>`,
      wheel:`<p>Each puzzle is a term, name or theory from the unit; the clue is its definition.</p><ul><li><b>Spin</b>, then call a consonant. Each hit earns the wheel value × letters.</li><li>Buy a vowel for 250 from your round bank. <b>Bankrupt</b> empties the round bank; <b>Lose a Turn</b> passes play.</li><li><b>Solve</b> by typing the full answer. Only the solver banks the round money, plus a 300 bonus.</li><li>Five puzzles per game. Solve with three or fewer letters revealed for the <i>Wheel Wizard</i> accolade.</li></ul>`,
      millionaire:`<p>Climb fifteen rungs from 100 to 1,000,000. Questions get harder as you climb (in Mixed mode).</p><ul><li>Lifelines, once each: <b>50:50</b>, <b>Ask the class</b> (simulated vote), <b>Swap</b> the question.</li><li>Safe havens at rungs 5 and 10 — a wrong answer drops you to the last haven.</li><li><b>Walk away</b> any time to keep your current winnings.</li><li>Head-to-head: teams alternate questions on their own ladders.</li></ul>`,
      sprint:`<p>Fast, relentless, no mercy.</p><ul><li><b>Solo:</b> 90 seconds (timed) or 20 questions. Each correct answer builds a streak multiplier; quick answers earn a bonus.</li><li><b>Head-to-head:</b> the question appears without options. Teams <b>buzz in</b> (tap, or keys 1–4). First buzz gets the choices: +200 (+streak) if right, −100 if wrong — then the others may buzz.</li><li>Nobody knows? Reveal and move on.</li></ul>`
    }[g];
    const b=modal(`<div class="eyebrow">${esc(GAMES[g].name)}</div><h3 style="margin:.3rem 0 .8rem">How to play</h3><div class="small" style="line-height:1.6">${h}</div><div class="row" style="margin-top:1rem"><button class="btn primary" id="mGo">Play now</button><button class="btn ghost" id="mClose">Close</button></div>`);
    $("#mGo",b).onclick=()=>{ closeModal(); this.startGame(g); }; $("#mClose",b).onclick=closeModal;
  },

  startGame(g){
    const cfg=this.cfg(); cfg.game=g; const u=this.unitNo(); setUnitTheme(u);
    document.body.classList.toggle("projector",!!(this.s.projector&&this.s.mode==="h2h"));
    if(!Pool.sizeFor(cfg)&&!Pool.base(cfg).length){ toast("No questions match","Pick at least one topic"); return; }
    const session=new Session(cfg); window.scrollTo(0,0);
    ({jeopardy:playJeopardy,wheel:playWheel,millionaire:playMillionaire,sprint:playSprint})[g](session,this.root);
  },

  /* ── LEADERBOARD ── */
  leaderboard(filter){
    filter=filter||{game:"",unit:""};
    setUnitTheme(filter.unit===""?0:+filter.unit);
    const rows=Board.all().filter(e=>(!filter.game||e.game===filter.game)&&(filter.unit===""||e.unit===+filter.unit)).slice(0,25);
    this.root.innerHTML=`<div class="screen-head"><div><button class="back" id="back"><svg class="ic"><use href="#ic-back"/></svg> Home</button><div class="eyebrow">Hall of Fame</div><h2>Leaderboard</h2></div>
      <div class="row"><select class="input" id="fGame" style="width:auto"><option value="">All games</option>${Object.values(GAMES).map(g=>`<option value="${g.id}" ${filter.game===g.id?"selected":""}>${esc(g.name)}</option>`).join("")}</select>
      <select class="input" id="fUnit" style="width:auto"><option value="">All units</option>${[1,2,3,4,0].map(u=>`<option value="${u}" ${String(filter.unit)===String(u)?"selected":""}>${esc(UNITS[u].short)}</option>`).join("")}</select></div></div>
    <div class="card">${rows.length?`<table class="lb"><thead><tr><th>#</th><th>Name</th><th>Score</th><th>Game</th><th>Unit</th><th>Level</th><th>Acc.</th><th>Date</th></tr></thead><tbody>${rows.map((e,i)=>`<tr><td>${i+1}</td><td><b>${esc(e.name)}</b>${e.mode==="h2h"?' <span class="pill dim">h2h</span>':""}${e.timed?' <span class="pill dim">⏱</span>':""}</td><td class="sc">${fmt(e.score)}</td><td>${esc(GAMES[e.game]?GAMES[e.game].name:e.game)}</td><td>${esc(unitShort(e.unit))}</td><td>${esc(diffName(e.diff))}</td><td>${pctStr(e.correct,e.answered)}</td><td class="muted small">${e.date}</td></tr>`).join("")}</tbody></table>`:`<p class="muted" style="text-align:center;padding:2rem">No scores yet. Play a game to claim the first spot.</p>`}</div>
    <div class="row" style="margin-top:1rem;justify-content:flex-end"><button class="btn sm danger" id="clearLb">Clear leaderboard</button></div>`;
    $("#back",this.root).onclick=()=>this.go("home");
    $("#fGame",this.root).onchange=e=>this.leaderboard({game:e.target.value,unit:filter.unit});
    $("#fUnit",this.root).onchange=e=>this.leaderboard({game:filter.game,unit:e.target.value});
    $("#clearLb",this.root).onclick=()=>{ const b=modal(`<h3>Clear all scores?</h3><p class="muted" style="margin:.5rem 0 1rem">This cannot be undone.</p><div class="row"><button class="btn danger" id="y">Clear</button><button class="btn ghost" id="n">Cancel</button></div>`); $("#y",b).onclick=()=>{Board.clear();closeModal();this.leaderboard(filter);}; $("#n",b).onclick=closeModal; };
  },

  /* ── BADGES & ACCOLADES ── */
  badges(){
    setUnitTheme(0); const p=Profile.current();
    if(!p){ this.root.innerHTML=`<div class="card" style="text-align:center;padding:3rem"><h2>No player selected</h2><p class="muted" style="margin:.5rem 0 1rem">Create or choose a profile to track badges.</p><button class="btn primary" id="mk">Choose profile</button></div>`; $("#mk",this.root).onclick=()=>this.profileModal(); return; }
    const s=p.stats;
    this.root.innerHTML=`<div class="screen-head"><div><button class="back" id="back"><svg class="ic"><use href="#ic-back"/></svg> Home</button><div class="eyebrow">${esc(p.name)}</div><h2>Badges & Accolades</h2></div>
      <div class="stats-strip" style="margin:0"><div><b>${s.games}</b>games</div><div><b>${s.answered}</b>answered</div><div><b>${pctStr(s.correct,s.answered)}</b>accuracy</div><div><b>${s.bestStreak}</b>best streak</div></div></div>
    ${[1,2,3,4].map(u=>`<div class="u${u} card" style="margin-bottom:1rem"><div class="row between" style="margin-bottom:.8rem"><div><div class="eyebrow">Unit ${u} · ${esc(UNITS[u].badgeName)} badges</div><h3>${esc(UNITS[u].title)}</h3></div>${emblem(u)}</div>
      <div class="badge-grid">${BADGE_DEFS.map(b=>{ const got=p.badges[u+":"+b.id]; const pr=b.prog?b.prog(p,u):null; return `<div class="badge ${got?"":"locked"}"><div class="medal"><svg><use href="#em-${u}"/></svg></div><b>${esc(b.name)}</b><span>${esc(b.desc)}</span>${got?`<span class="pill">Earned ${got}</span>`:(pr?`<div class="prog"><i style="width:${Math.min(100,100*pr[0]/pr[1])}%"></i></div><span>${pr[0]}/${pr[1]}</span>`:"")}</div>`; }).join("")}</div></div>`).join("")}
    <div class="card"><div class="eyebrow" style="margin-bottom:.8rem">Accolades · ${Object.keys(p.accolades).length}/${ACCOLADE_DEFS.length}</div><div class="grid grid-3">${ACCOLADE_DEFS.map(a=>`<div class="acc ${p.accolades[a.id]?"":"locked"}"><div class="star">${p.accolades[a.id]?"★":"☆"}</div><div><b>${esc(a.name)}</b><span>${esc(a.desc)}${p.accolades[a.id]?" · "+p.accolades[a.id]:""}</span></div></div>`).join("")}</div></div>`;
    $("#back",this.root).onclick=()=>this.go("home");
  },

  /* ── PROFILES ── */
  profileModal(first){
    const all=Profile.all(); const cur=Profile.currentName();
    const b=modal(`<div class="eyebrow">Who's playing?</div><h3 style="margin:.3rem 0 .8rem">${first?"Welcome to the Agora":"Player profile"}</h3>
      <p class="small muted" style="margin-bottom:.8rem">Profiles live on this device. Each one tracks its own stats, badges and accolades. Leaderboard scores are shared.</p>
      <div class="stack" id="plist">${all.map(n=>`<div class="row between"><button class="btn ${n===cur?"primary":""}" data-n="${esc(n)}" style="flex:1;justify-content:flex-start">${esc(n)}</button><button class="btn sm ghost del" data-n="${esc(n)}" title="Delete">✕</button></div>`).join("")}</div>
      <div class="row" style="margin-top:.8rem"><input class="input" id="pNew" placeholder="New player name" maxlength="24" style="flex:1"><button class="btn primary" id="pAdd">Add</button></div>
      <div class="divider"></div>
      <div class="row between"><div class="row"><button class="btn sm ghost" id="pExport">Export data</button><button class="btn sm ghost" id="pImport">Import</button><input type="file" id="pFile" accept="application/json" hidden></div><label class="toggle ${Sfx.on?"on":""}" id="sfxT"><span class="sw"></span><span class="small">Sound</span></label></div>
      ${first?"":`<div class="row" style="margin-top:.8rem;justify-content:flex-end"><button class="btn ghost" id="pClose">Close</button></div>`}`,{sticky:first});
    const refresh=()=>{ closeModal(); this.refreshProfileChip(); this.profileModal(false); };
    $$("#plist button[data-n]:not(.del)",b).forEach(x=>x.onclick=()=>{ Profile.select(x.dataset.n); closeModal(); this.refreshProfileChip(); toast("Playing as "+x.dataset.n,"","ic-user"); if(first) this.go("home"); });
    $$("#plist .del",b).forEach(x=>x.onclick=()=>{ if(confirm("Delete profile "+x.dataset.n+"? Badges and stats will be lost.")){ Profile.remove(x.dataset.n); refresh(); } });
    const add=()=>{ const n=$("#pNew",b).value.trim(); if(!n) return; Profile.select(n); closeModal(); this.refreshProfileChip(); toast("Playing as "+n,"","ic-user"); if(first) this.go("home"); };
    $("#pAdd",b).onclick=add; $("#pNew",b).onkeydown=e=>{ if(e.key==="Enter") add(); }; $("#pNew",b).focus();
    if(!first) $("#pClose",b).onclick=closeModal;
    $("#sfxT",b).onclick=()=>{ Sfx.on=!Sfx.on; LS.set("sfx",Sfx.on); $("#sfxT",b).classList.toggle("on",Sfx.on); };
    $("#pExport",b).onclick=()=>{ const data={}; LS.keys().forEach(k=>data[k]=LS.get(k)); const blob=new Blob([JSON.stringify(data)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="agora-data-"+todayISO()+".json"; a.click(); };
    $("#pImport",b).onclick=()=>$("#pFile",b).click();
    $("#pFile",b).onchange=e=>{ const f=e.target.files[0]; if(!f) return; f.text().then(t=>{ try{ const d=JSON.parse(t); Object.keys(d).forEach(k=>LS.set(k,d[k])); toast("Data imported","Profiles, scores and progress restored"); refresh(); }catch(err){ toast("Import failed","That file isn't an Agora export"); } }); };
  },

  install(){ if(this.deferredInstall){ this.deferredInstall.prompt(); this.deferredInstall=null; $("#btnInstall").hidden=true; } }
};

document.addEventListener("DOMContentLoaded",()=>App.init());
