/* ═══════════════════════════════════════════════════════════
   app.js — screens, setup flow, leaderboard, badges, profiles
   ═══════════════════════════════════════════════════════════ */
'use strict';

const App = {
  s: Object.assign({units:[1],diff:"mix",topics:TOPICS.slice(),timed:false,timeSec:20,mode:"solo",teams:["Athens","Sparta"],projector:false,orient:"auto"},LS.get("settings",{})),
  root: null, deferredInstall:null,

  init(){
    this.root=$("#app");
    $("#btnHome").onclick=()=>this.go("home");
    $("#btnLeaderboard").onclick=()=>this.go("leaderboard");
    $("#btnBadges").onclick=()=>this.go("badges");
    $("#btnStudy").onclick=()=>this.go("study");
    $("#btnProfile").onclick=()=>this.profileModal();
    $("#btnInstall").onclick=()=>this.install();
    window.addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); this.deferredInstall=e; });
    window.addEventListener("appinstalled",()=>{ this.deferredInstall=null; this.refreshInstallChip(); toast("Installed","Agora is now on your device","ic-download"); });
    this.refreshInstallChip();
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
    this.stopStudyClock();
    if(screen==="home") this.home();
    else if(screen==="setup") this.setup();
    else if(screen==="games") this.games();
    else if(screen==="leaderboard") this.leaderboard();
    else if(screen==="badges") this.badges();
    else if(screen==="study") this.study();
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
    ${this.isInstalled()?"":`<button class="card card-btn study-card install-card" id="homeInstall"><span class="gicon"><svg><use href="#ic-download"/></svg></span><div><h3>Install on this device</h3><div class="lessons">Works offline, launches full-screen from its own icon — phone, tablet or laptop.</div></div></button>`}
    <button class="card card-btn study-card" id="homeStudy"><span class="gicon"><svg><use href="#ic-book"/></svg></span><div><h3>Study Room</h3><div class="lessons">Read every lesson, card by card, then practise it — ${(window.LESSONS||[]).length} lessons · ${p?Object.keys(p.study||{}).length:0} studied</div></div></button>
    <div class="stats-strip"><div><b>${BANK.length}</b>questions</div><div><b>${games}</b>games played${p?" by "+esc(p.name):""}</div><div><b>${ans}</b>answered</div><div><b>${p?Object.keys(p.badges).length:0}</b>badges</div></div>`;
    $$(".unit-card",this.root).forEach(b=>b.onclick=()=>{ this.s.units=[+b.dataset.u]; this.save(); this.go("setup"); });
    $("#homeStudy",this.root).onclick=()=>this.go("study");
    const hi=$("#homeInstall",this.root); if(hi) hi.onclick=()=>this.install();
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
        <div class="card"><div class="row between"><div><div class="eyebrow" style="margin-bottom:.4rem">Display</div><div class="seg" id="orientSeg"><button data-o="auto" class="${s.orient==="auto"?"on":""}">Auto</button><button data-o="portrait" class="${s.orient==="portrait"?"on":""}">Portrait</button><button data-o="landscape" class="${s.orient==="landscape"?"on":""}">Landscape</button></div></div><button class="btn sm" id="fsBtn"><svg class="ic"><use href="#ic-fullscreen"/></svg> Fullscreen</button></div>
          <p class="small muted" style="margin-top:.6rem">Phones and tablets only honour an orientation lock in fullscreen or when Agora is installed as an app — tap Fullscreen (or the ⛶ button during a game) and the lock applies.</p>
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
        ${u?`<button class="btn block" id="toStudy" style="margin-top:.5rem"><svg class="ic"><use href="#ic-book"/></svg> Study this unit's lessons</button>`:""}
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
    $$("#orientSeg button",r).forEach(b=>b.onclick=()=>{ s.orient=b.dataset.o; this.save(); this.applyOrientation(true); this.setup(); });
    $("#fsBtn",r).onclick=()=>this.toggleFullscreen();
    $$("#secs button",r).forEach(b=>b.onclick=()=>{ s.timeSec=+b.dataset.s; this.save(); this.setup(); });
    $("#toGames",r).onclick=()=>this.go("games");
    if($("#toStudy",r)) $("#toStudy",r).onclick=()=>this.study(u);
    $("#resetPool",r).onclick=()=>{ Pool.reset(this.cfg()); toast("Pool reset","All questions in this selection are fresh again"); this.setup(); };
  },

  /* ── GAME SELECT ── */
  games(){
    const s=this.s; const u=this.unitNo(); setUnitTheme(u); const cfg=this.cfg();
    const wheelCount=Pool.base(cfg).filter(wheelEligible).length;
    this.root.innerHTML=`<div class="screen-head"><div><button class="back" id="back"><svg class="ic"><use href="#ic-back"/></svg> Settings</button><div class="eyebrow">${esc(UNITS[u].short)} · ${diffName(s.diff)} · ${s.mode==="h2h"?s.teams.length+" teams":"solo"}${s.timed?" · timed":""}</div><h2>Choose your arena</h2></div>${emblem(u)}</div>
    <div class="grid grid-2">${Object.values(GAMES).map(g=>`<div class="card card-btn game-card" role="button" tabindex="0" data-g="${g.id}"><div class="game-head"><span class="gicon"><svg><use href="#g-${g.id}"/></svg></span><h3>${esc(g.name)}</h3><button class="btn sm ghost how" data-g="${g.id}" aria-label="How to play">?</button></div><p>${esc(g.desc)}</p><div class="meta">${esc(g.meta)}${g.id==="wheel"?` · ${wheelCount} puzzle-ready terms`:""}</div></div>`).join("")}</div>`;
    $("#back",this.root).onclick=()=>this.go("setup");
    $$(".game-card",this.root).forEach(c=>{ c.onclick=(e)=>{ if(e.target.closest(".how")) return; this.startGame(c.dataset.g); }; c.onkeydown=(e)=>{ if(e.key==="Enter"||e.key===" "){e.preventDefault(); this.startGame(c.dataset.g);} }; });
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

  startGame(g,lesson){
    const cfg=this.cfg(); cfg.game=g; if(lesson!=null) cfg.lesson=lesson; const u=this.unitNo(); setUnitTheme(u);
    document.body.classList.toggle("projector",!!(this.s.projector&&this.s.mode==="h2h"));
    if(!Pool.sizeFor(cfg)&&!Pool.base(cfg).length){ toast("No questions match","Pick at least one topic"); return; }
    this.applyOrientation(false);
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
    ${p.accolades.laureate?`<div class="cogito"><div class="laurel" aria-hidden="true"><svg viewBox="0 0 64 64"><use href="#ic-laurel"/></svg></div><div class="eyebrow" style="color:#f6e7bf">The ultimate honour</div><h2 class="cogito-title">I think, therefore I am… <em>a Philosopher</em></h2><p class="muted">Every accolade. Every badge. Every Golden honour. Valedictorian. ${esc(p.name)} has finished the Agora.</p><div class="seal" style="margin-top:.6rem">Seal ${esc(p.accolades.laureate.seal||"")} · ${esc(p.accolades.laureate.date||"")}</div></div>`:""}
    <div class="jumpbar"><a href="#secBadges">Badges</a><a href="#secGates">Gates & Golden</a><a href="#secStudy">Study Room</a><a href="#secAcc">Accolades</a></div>
    <div id="secBadges"></div>
    ${[1,2,3,4].map(u=>`<div class="u${u} card" style="margin-bottom:1rem"><div class="row between" style="margin-bottom:.8rem"><div><div class="eyebrow">Unit ${u} · ${esc(UNITS[u].badgeName)} badges</div><h3>${esc(UNITS[u].title)}</h3></div>${emblem(u)}</div>
      <div class="badge-grid">${BADGE_DEFS.map(b=>{ const got=p.badges[u+":"+b.id]; const pr=b.prog?b.prog(p,u):null; return `<div class="badge ${got?"":"locked"}"><div class="medal"><svg><use href="#em-${u}"/></svg></div><b>${esc(b.name)}</b><span>${esc(b.desc)}</span>${got?`<span class="pill">Earned ${got}</span>`:(pr?`<div class="prog"><i style="width:${Math.min(100,100*pr[0]/pr[1])}%"></i></div><span>${pr[0]}/${pr[1]}</span>`:"")}</div>`; }).join("")}</div></div>`).join("")}
    <div id="secGates"></div>
    ${[1,2,3,4].map(u=>{ const open=gatesOpen(p,u); return `<div class="u${u} card" style="margin-bottom:1rem"><div class="row between" style="margin-bottom:.6rem"><div><div class="eyebrow">Unit ${u} · Gates</div><h3>${esc(UNITS[u].short)}</h3></div>${emblem(u)}</div>
      <div class="grid grid-3">${GATE_DEFS.map(g=>{ const got=p.accolades["gate:"+u+":"+g.id]; const pr=g.prog?g.prog(p,u):null; return `<div class="acc ${got?"":"locked"}"><div class="star">${got?"◆":"◇"}</div><div style="flex:1"><b>${esc(g.name)}</b><span>${esc(g.desc)}${got?" · "+got:""}</span>${!got&&pr?`<div class="prog" style="margin-top:.35rem;height:.25rem;border-radius:99px;background:var(--ink-4);overflow:hidden"><i style="display:block;height:100%;width:${Math.min(100,100*pr[0]/pr[1])}%;background:var(--accent)"></i></div>`:""}</div></div>`; }).join("")}</div>
      ${open?`<div class="gold-tier"><div class="eyebrow gold-eb">✦ Golden tier unlocked</div><div class="grid grid-3">${GOLD_DEFS.map(g=>{ const got=goldEarned(p,u,g.id); const pr=g.prog(p,u); return `<div class="acc gold ${got?"":"locked"}"><div class="star">✦</div><div style="flex:1"><b>${esc(g.name)}</b><span>${esc(g.desc)}</span>${got?`<div class="seal">Seal ${esc(got.seal)} · ${esc(got.date)}</div>`:`<div class="small muted" style="margin-top:.3rem">${pr[0]}/${pr[1]} requirements met · ${Math.floor(BU(p,u).time/3600)}h ${Math.floor(BU(p,u).time%3600/60)}m of ${UNITS[u].lessons.length}h played</div>`}</div></div>`; }).join("")}</div></div>`:`<p class="small muted" style="margin-top:.6rem">Open all three gates and the Agora may reveal more.</p>`}</div>`; }).join("")}
    ${p.accolades.valedictorian?`<div class="card gold-tier" style="margin-bottom:1rem"><div class="eyebrow gold-eb">✦ Valedictorian</div><p>Every Golden honour in every unit. Seal <b>${esc(p.accolades.valedictorian.seal)}</b> · ${esc(p.accolades.valedictorian.date)}</p></div>`:""}
    <div id="secStudy"></div><div class="card" style="margin-bottom:1rem"><div class="eyebrow" style="margin-bottom:.8rem">Study Room</div><div class="grid grid-2">${[1,2,3,4].map(u=>{ const ls=(window.LESSONS||[]).filter(L=>L.u===u); return `<div class="u${u}" style="--accent:${unitColor(u)}"><b>${esc(UNITS[u].short)}</b> ${p.accolades["lamp:"+u]?`<span class="pill">✦ Scholar's Lamp</span>`:""}<div class="row" style="margin-top:.4rem;gap:.3rem">${ls.map(L=>`<span class="lchip ${studyDone(p,u,L.l)?"on":""}" title="${esc(L.title)}">${esc(String(L.l))}</span>`).join("")}</div></div>`; }).join("")}</div></div>
    <div id="secAcc"></div><div class="card"><div class="eyebrow" style="margin-bottom:.8rem">Accolades · ${ACCOLADE_DEFS.filter(a=>p.accolades[a.id]).length}/${ACCOLADE_DEFS.length}</div><div class="grid grid-3">${ACCOLADE_DEFS.map(a=>{ const got=p.accolades[a.id]; const date=got&&(typeof got==="string"?got:got.date); return `<div class="acc ${got?"":"locked"} ${a.ultimate?"ultimate":""}"><div class="star">${a.ultimate?"✦":got?"★":"☆"}</div><div><b>${esc(a.name)}</b><span>${esc(a.desc)}${date?" · "+esc(date):""}</span></div></div>`; }).join("")}</div></div>`;
    $("#back",this.root).onclick=()=>this.go("home");
  },


  /* ── STUDY ROOM ── */
  study(u){
    const p=Profile.current(); const LS_=window.LESSONS||[];
    if(u==null){ setUnitTheme(0);
      this.root.innerHTML=`<div class="screen-head"><div><button class="back" id="back"><svg class="ic"><use href="#ic-back"/></svg> Home</button><div class="eyebrow">Study Room</div><h2>Choose a unit to study</h2></div></div>
      <div class="grid grid-2">${[1,2,3,4].map(un=>{ const ls=LS_.filter(L=>L.u===un); const done=p?ls.filter(L=>studyDone(p,un,L.l)).length:0; return `<div class="u${un}"><button class="card card-btn unit-card" data-u="${un}"><div class="n">${un}</div><div><h3>${esc(UNITS[un].title)}</h3><div class="lessons">${ls.length} lessons · ${done} studied${p&&p.accolades["lamp:"+un]?" · ✦ Scholar's Lamp":""}</div><div class="prog" style="margin-top:.5rem;height:.3rem;border-radius:99px;background:var(--ink-4);overflow:hidden"><i style="display:block;height:100%;width:${ls.length?100*done/ls.length:0}%;background:var(--accent)"></i></div></div>${emblem(un)}</button></div>`; }).join("")}</div>
      <p class="muted small" style="margin-top:1rem">Each lesson is the slide deck, card by card. Read a lesson to the end (at a reading pace) to mark it studied; finish a whole unit for its Scholar's Lamp, and every unit for the Librarian accolade.</p>`;
      $("#back",this.root).onclick=()=>this.go("home");
      $$(".unit-card",this.root).forEach(b=>b.onclick=()=>this.study(+b.dataset.u));
      return;
    }
    setUnitTheme(u); const ls=LS_.filter(L=>L.u===u);
    this.root.innerHTML=`<div class="screen-head"><div><button class="back" id="back"><svg class="ic"><use href="#ic-back"/></svg> Study Room</button><div class="eyebrow">Unit ${u} · Study Room</div><h2>${esc(UNITS[u].title)}</h2></div>${emblem(u)}</div>
    <div class="stack">${ls.map(L=>{ const done=p&&studyDone(p,u,L.l); const t=p?(p.studyTime||{})[lessonKey(u,L.l)]||0:0; const req=studyRequired(L); return `<button class="card card-btn lesson-row" data-l="${L.l}"><div class="ln">${esc(String(L.l))}</div><div style="flex:1;min-width:0"><h3>${esc(L.title)}</h3><div class="small muted">${esc(L.sub||"")}</div><div class="small muted" style="margin-top:.3rem">${L.cards.length} cards · ${done?"✓ studied "+done:Math.min(100,Math.round(100*t/req))+"% read"}</div></div><span class="pill ${done?"":"dim"}">${done?"Studied":"Open"}</span></button>`; }).join("")}</div>
    <div class="row" style="margin-top:1rem"><button class="btn primary" id="playUnit">Play this unit</button></div>`;
    $("#back",this.root).onclick=()=>this.study();
    $$(".lesson-row",this.root).forEach(b=>b.onclick=()=>this.reader(u,b.dataset.l));
    $("#playUnit",this.root).onclick=()=>{ this.s.units=[u]; this.save(); this.go("setup"); };
  },
  reader(u,l){
    const L=(window.LESSONS||[]).find(x=>x.u===u&&String(x.l)===String(l)); if(!L) return this.study(u);
    setUnitTheme(u); let i=LS.get("study.pos."+lessonKey(u,l),0); i=Math.min(Math.max(0,i),L.cards.length-1);
    const p=Profile.current(); const req=studyRequired(L);
    const kindLabel={notes:"Notes",discuss:"Discussion",activity:"Activity",watch:"Watch & jot"};
    const paint=()=>{
      const c=L.cards[i]; const t=p?(p.studyTime||{})[lessonKey(u,l)]||0:0;
      this.root.innerHTML=`<div class="game-top"><button class="back" id="back"><svg class="ic"><use href="#ic-back"/></svg><span>Lessons</span></button><div class="gt-title"><div class="eyebrow">${esc(UNITS[u].short)} · Lesson ${esc(String(l))}</div><h2>${esc(L.title)}</h2></div><div class="gt-right"><span class="pill dim" id="rdProg">${i+1}/${L.cards.length}</span><button class="icon-btn sm" id="gFull" title="Fullscreen"><svg class="ic"><use href="#ic-fullscreen"/></svg></button></div></div>
      <div class="readbar"><i style="width:${100*(i+1)/L.cards.length}%"></i></div>
      <div class="qpanel study-card-view">
        <div class="meta"><span class="pill ${c.k==="notes"?"":"dim"}">${c.lbl?esc(c.lbl):kindLabel[c.k]||c.k}</span>${p&&studyDone(p,u,l)?`<span class="pill">✓ Studied</span>`:`<span class="pill dim" id="rdTime">${Math.min(100,Math.round(100*t/req))}% read</span>`}</div>
        <h2 class="study-h">${esc(c.h)}</h2>
        ${c.k==="discuss"?`<ol class="study-list">${c.b.map(x=>`<li>${esc(x)}</li>`).join("")}</ol>`:`<ul class="study-list">${c.b.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`}
        ${c.c.map(co=>`<div class="callout"><div class="eyebrow">${esc(co.t)}</div>${co.b.map(x=>`<p>${esc(x)}</p>`).join("")}</div>`).join("")}
      </div>
      <div class="row between" style="margin-top:.8rem"><button class="btn" id="prev" ${i===0?"disabled":""}>← Previous</button><div class="row">${i===L.cards.length-1?`<button class="btn" id="practice">Practise this lesson</button>`:""}<button class="btn primary" id="next">${i===L.cards.length-1?"Finish lesson":"Next →"}</button></div></div>`;
      $("#back",this.root).onclick=()=>this.study(u); $("#gFull",this.root).onclick=()=>this.toggleFullscreen();
      $("#prev",this.root).onclick=()=>{ i=Math.max(0,i-1); LS.set("study.pos."+lessonKey(u,l),i); paint(); };
      $("#next",this.root).onclick=()=>{ if(i<L.cards.length-1){ i++; LS.set("study.pos."+lessonKey(u,l),i); paint(); } else finish(); };
      const pr=$("#practice",this.root); if(pr) pr.onclick=()=>{ this.flushStudy(true); this.s.units=[u]; this.s.mode="solo"; this.save(); this.startGame("sprint",L.l); };
      this.root.onkeydown=null;
    };
    const finish=()=>{
      this.flushStudy(true); const pp=Profile.current(); const done=pp&&studyDone(pp,u,l); const t=pp?(pp.studyTime||{})[lessonKey(u,l)]||0:0;
      if(done){ LS.set("study.pos."+lessonKey(u,l),0); toast("Lesson complete","Nicely done — try the practice round","ic-book"); this.study(u); }
      else { const need=Math.ceil((req-t)/60); toast("Read a little slower","About "+Math.max(1,need)+" more minute"+(need===1?"":"s")+" of reading marks this lesson studied","ic-book"); LS.set("study.pos."+lessonKey(u,l),0); this.study(u); }
    };
    // study clock: counts only while this reader is open and the tab is visible
    this.stopStudyClock(); this._study={u,l,t0:performance.now(),acc:0};
    this._studyH=setInterval(()=>{ if(document.hidden) { this._study.t0=performance.now(); return; } const now=performance.now(); this._study.acc+=(now-this._study.t0)/1000; this._study.t0=now; if(this._study.acc>=30) this.flushStudy(false); },1000);
    const onKey=(e)=>{ if(!this._study) { document.removeEventListener("keydown",onKey); return; } if(e.key==="ArrowRight"||e.key===" "){ const n=$("#next",this.root); if(n){ e.preventDefault(); n.click(); } } if(e.key==="ArrowLeft"){ const b=$("#prev",this.root); if(b&&!b.disabled) b.click(); } };
    document.addEventListener("keydown",onKey);
    paint();
  },
  flushStudy(reachedEnd){
    if(!this._study) return; const st=this._study; const now=performance.now(); st.acc+=(now-st.t0)/1000; st.t0=now;
    const p=Profile.current(); if(p&&(st.acc>0||reachedEnd)){ const un=recordStudy(p,st.u,st.l,st.acc,!!reachedEnd); st.acc=0; un.forEach((x,i)=>setTimeout(()=>toast(x.type==="study"?"✓ "+x.def.name:"Accolade: "+x.def.name,x.def.desc,"ic-book"),200+i*600)); }
  },
  stopStudyClock(){ if(this._studyH){ this.flushStudy(false); clearInterval(this._studyH); this._studyH=null; } this._study=null; },

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

  async applyOrientation(fromUser){
    const o=this.s.orient||"auto"; const so=screen.orientation;
    if(!so) { if(fromUser&&o!=="auto") toast("Orientation lock unavailable","This browser doesn't support it — rotate the device manually","ic-rotate"); return; }
    try{
      if(o==="auto"){ if(so.unlock) so.unlock(); return; }
      await so.lock(o==="portrait"?"portrait":"landscape");
      if(fromUser) toast("Orientation locked",o==="portrait"?"Portrait":"Landscape","ic-rotate");
    }catch(e){
      if(fromUser){ const standalone=matchMedia("(display-mode: standalone)").matches; toast("Lock will apply in fullscreen",standalone?"Rotate the device to "+o:"Tap Fullscreen, or install Agora as an app","ic-rotate"); }
    }
  },
  async toggleFullscreen(){
    const d=document.documentElement;
    try{
      if(document.fullscreenElement){ await document.exitFullscreen(); }
      else { await (d.requestFullscreen?d.requestFullscreen({navigationUI:"hide"}):d.webkitRequestFullscreen()); await this.applyOrientation(false); }
    }catch(e){ toast("Fullscreen unavailable","On iPhone, use Share → Add to Home Screen for a full-screen app","ic-fullscreen"); }
  },
  isInstalled(){ return matchMedia("(display-mode: standalone)").matches||matchMedia("(display-mode: fullscreen)").matches||navigator.standalone===true; },
  refreshInstallChip(){ const b=$("#btnInstall"); if(b) b.hidden=this.isInstalled(); },
  platform(){
    const ua=navigator.userAgent||""; const iOS=/iPhone|iPad|iPod/.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
    if(iOS) return /CriOS|FxiOS|EdgiOS/.test(ua)?"ios-other":"ios";
    if(/Android/.test(ua)) return /SamsungBrowser/.test(ua)?"samsung":/Firefox/.test(ua)?"android-firefox":"android";
    if(/Firefox/.test(ua)) return "desktop-firefox"; if(/Safari/.test(ua)&&!/Chrome|Chromium|Edg/.test(ua)) return "mac-safari";
    return "desktop";
  },
  async install(){
    if(this.deferredInstall){ try{ this.deferredInstall.prompt(); const r=await this.deferredInstall.userChoice; this.deferredInstall=null; if(r&&r.outcome==="accepted") return; }catch(e){} }
    this.installGuide();
  },
  installGuide(){
    const pf=this.platform(); const url=location.href.replace(/[#?].*$/,"");
    const steps={
      ios:["Tap the <b>Share</b> button at the bottom of Safari <svg class=\"ic\" style=\"vertical-align:-3px\"><use href=\"#ic-share-ios\"/></svg>","Scroll the sheet and tap <b>Add to Home Screen</b>","Tap <b>Add</b>. Agora opens full-screen from your home screen and works offline"],
      "ios-other":["Open this page in <b>Safari</b> (Apple only allows installing from Safari)","Tap <b>Share</b> → <b>Add to Home Screen</b> → <b>Add</b>"],
      android:["Tap the <b>⋮</b> menu in the top-right of Chrome","Tap <b>Install app</b> (or <b>Add to Home screen</b>)","Confirm — Agora appears in your app drawer like any other app"],
      samsung:["Tap the <b>☰</b> menu at the bottom of Samsung Internet","Tap <b>Add page to</b> → <b>Home screen</b>"],
      "android-firefox":["Tap the <b>⋮</b> menu","Tap <b>Install</b> (or <b>Add to Home screen</b>)"],
      desktop:["Look for the <b>install icon</b> at the right end of the address bar (a monitor with an arrow)","Click it, then <b>Install</b>. Agora opens in its own window — pin it to the taskbar or dock if you like","No icon? Open the browser menu <b>⋮</b> → <b>Cast, save and share</b> → <b>Install page as app…</b>"],
      "desktop-firefox":["Firefox on desktop can't install web apps. Use <b>Chrome</b> or <b>Edge</b> for the install option","Or just bookmark this page — everything works in the browser too"],
      "mac-safari":["In Safari, click <b>File</b> → <b>Add to Dock…</b>","Click <b>Add</b>. Agora opens as its own app from the Dock"]
    }[pf];
    const title={ios:"iPhone / iPad",'ios-other':"iPhone / iPad",android:"Android",samsung:"Samsung Internet","android-firefox":"Android (Firefox)",desktop:"Windows / Mac / Chromebook","desktop-firefox":"Firefox","mac-safari":"Mac (Safari)"}[pf];
    const b=modal(`<div class="eyebrow">Install Agora</div><h3 style="margin:.3rem 0 .3rem">Put it on your ${esc(title)}</h3><p class="small muted" style="margin-bottom:.9rem">Installed, Agora launches full-screen from its own icon, keeps working without Wi-Fi, and your profile, badges and scores stay on the device.</p>
      <ol class="install-steps">${steps.map(x=>`<li>${x}</li>`).join("")}</ol>
      <details style="margin-top:.8rem"><summary class="small muted" style="cursor:pointer">On a different device?</summary><div class="small muted" style="margin-top:.5rem;line-height:1.6"><b>iPhone/iPad:</b> Safari → Share → Add to Home Screen.<br><b>Android:</b> Chrome ⋮ → Install app.<br><b>Laptop:</b> Chrome/Edge → install icon in the address bar.<br><b>Address:</b> <code>${esc(url)}</code></div></details>
      <div class="row" style="margin-top:1rem;justify-content:flex-end"><button class="btn primary" id="iClose">Got it</button></div>`);
    $("#iClose",b).onclick=closeModal;
  },
};

document.addEventListener("DOMContentLoaded",()=>App.init());
