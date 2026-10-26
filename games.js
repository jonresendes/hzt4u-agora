/* ═══════════════════════════════════════════════════════════
   games.js — shared session, question UI, and the four games
   ═══════════════════════════════════════════════════════════ */
'use strict';

/* ── Session ── */
class Session{
  constructor(cfg){
    this.cfg=cfg; // {units,diff,topics,timed,timeSec,mode,players:[{name,color}],game,projector}
    this.players=cfg.players.map((p,i)=>({name:p.name,color:p.color||TEAM_COLORS[i],score:0,answered:0,correct:0,fast:0,streak:0,bestStreak:0,times:[]}));
    this.turn=0; this.seen=[]; this._shown=new Set(); this.recycled=false; this.flags={}; this.log=[]; this.ended=false; this.timer=null;
  }
  get cur(){ return this.players[this.turn]; }
  get h2h(){ return this.cfg.mode==="h2h"; }
  next(){ this.turn=(this.turn+1)%this.players.length; }
  draw(n,opts){ const r=Pool.draw(this.cfg,n,opts); if(r.recycled) this.recycled=true; return r.qs; }
  present(q){ if(this._shown.has(q.id)) return; this._shown.add(q.id); this.seen.push(q.id); Pool.markUsed(this.cfg,[q.id]); }
  record(player,q,ok,secs,pts){
    player.answered++; if(ok){player.correct++; player.streak++; player.bestStreak=Math.max(player.bestStreak,player.streak); if(secs!=null&&secs<5) player.fast++;} else player.streak=0;
    if(secs!=null) player.times.push(secs);
    player.score+=pts||0;
    this.log.push({q,ok,who:player.name,pts:pts||0});
  }
  stopTimer(){ if(this.timer){this.timer.stop(); this.timer=null;} }
  scoreboardHTML(){
    return `<div class="scoreboard">${this.players.map((p,i)=>`<div class="score ${i===this.turn&&this.h2h?'active':''}" data-i="${i}"><span class="nm"><i style="background:${p.color}"></i>${esc(p.name)}</span><span class="val">${fmt(p.score)}</span></div>`).join("")}</div>`;
  }
  refreshScores(root){ const sb=$(".scoreboard",root); if(sb) sb.outerHTML=this.scoreboardHTML(); }
  finish(){ if(this.ended) return; this.ended=true; this.stopTimer(); showResults(this); }
}

/* ── Game chrome: top bar with back, scoreboard, optional status ── */
function gameTop(session,title,extra){
  return `<div class="game-top">
    <div class="row"><button class="back" id="gBack"><svg class="ic"><use href="#ic-back"/></svg> Quit</button><div><div class="eyebrow">${esc(GAMES[session.cfg.game].name)} · ${esc(unitShort(session.cfg.units.length>1?0:session.cfg.units[0]))} · ${esc(diffName(session.cfg.diff))}</div><h2 style="font-size:1.4rem">${title||""}</h2></div></div>
    <div class="row">${extra||""}${session.scoreboardHTML()}</div>
  </div>`;
}
function bindQuit(root,session){ $("#gBack",root).onclick=()=>{ const b=modal(`<h3>Quit this game?</h3><p class="muted" style="margin:.5rem 0 1rem">Progress so far will be scored and saved.</p><div class="row"><button class="btn primary" id="mQuit">Quit & score</button><button class="btn ghost" id="mStay">Keep playing</button></div>`); $("#mQuit",b).onclick=()=>{closeModal(); session.finish();}; $("#mStay",b).onclick=closeModal; }; }

/* ── Timer widget ── */
function timerHTML(){ return `<div class="timer" id="qTimer"><svg class="ic"><use href="#ic-timer"/></svg><div class="bar"><i style="width:100%"></i></div><span class="t">--</span></div>`; }
function attachTimer(session,sec,onEnd){
  const w=$("#qTimer"); if(!w) return null;
  const t=new Timer(sec,(left,total)=>{ $("i",w).style.width=(100*left/total)+"%"; $(".t",w).textContent=Math.ceil(left); w.classList.toggle("low",left<total*.25); if(left<5&&left>0&&Math.ceil(left)!==w._last){w._last=Math.ceil(left);Sfx.tick();} },onEnd);
  session.timer=t; return t.start();
}

/* ── Ask one multiple-choice question ──
   opts: {who(player), value(pts base), container, allowed(Set of choice indexes), timed(bool), sec, label, noNeg}
   returns Promise<{ok, secs, timeout, choice}> */
function askMCQ(session,q,opts){
  opts=opts||{};
  const root=opts.container; const choices=opts.choices||buildChoices(q);
  const who=opts.who||session.cur; session.present(q);
  const timed=opts.timed!=null?opts.timed:session.cfg.timed; const sec=opts.sec||session.cfg.timeSec||20;
  root.innerHTML=`<div class="qpanel">
    <div class="meta"><span class="pill">${esc(q.t)}</span><span class="pill dim">${esc(unitShort(q.u))} · L${q.l}</span><span class="pill dim">${esc(diffName(q.d))}</span>${opts.label?`<span class="pill">${esc(opts.label)}</span>`:""}${session.h2h?`<span class="pill" style="background:${who.color}33;color:${who.color}">${esc(who.name)}</span>`:""}<span style="flex:1"></span>${timed?timerHTML():""}</div>
    <div class="qtext">${esc(q.q)}</div>
    <div class="choices">${choices.map((c,i)=>`<button class="choice ${opts.allowed&&!opts.allowed.has(i)?'dim':''}" data-i="${i}" ${opts.allowed&&!opts.allowed.has(i)?'disabled':''}><span class="k">${"ABCD"[i]}</span><span>${esc(c.t)}</span></button>`).join("")}</div>
    <div id="fb"></div>
  </div>`;
  const token={}; root._ask=token; // a newer askMCQ on the same container cancels this one
  return new Promise(res=>{
    let done=false; const t0=performance.now(); let timer=null;
    const finish=(i,timeout)=>{
      if(done) return; done=true; if(timer) timer.stop(); document.removeEventListener("keydown",onKey);
      if(root._ask!==token) return; // cancelled — never resolve
      session.timer=null;
      const secs=(performance.now()-t0)/1000; const ok=i!=null&&choices[i].ok;
      $$(".choice",root).forEach((b,j)=>{ b.disabled=true; if(choices[j].ok) b.classList.add("correct"); else if(j===i) b.classList.add("wrong"); });
      ok?Sfx.ok():Sfx.no();
      res({ok,secs,timeout:!!timeout,choice:i,remaining:timer?timer.left:0,total:sec});
    };
    const onKey=(e)=>{ if(root._ask!==token){document.removeEventListener("keydown",onKey);return;} if(e.target&&e.target.tagName==="INPUT") return; const k=e.key.toUpperCase(); const map={A:0,B:1,C:2,D:3,"1":0,"2":1,"3":2,"4":3}; if(k in map){ const b=$(`.choice[data-i="${map[k]}"]`,root); if(b&&!b.disabled) b.click(); } };
    document.addEventListener("keydown",onKey);
    $$(".choice",root).forEach(b=>b.onclick=()=>finish(+b.dataset.i,false));
    if(timed) timer=attachTimer(session,sec,()=>finish(null,true));
  });
}
function feedbackHTML(ok,q,pts,extra){
  return `<div class="feedback ${ok?'ok':'no'}"><div><b>${ok?pick(["Correct!","Well reasoned.","Exactly.","Sophia smiles."]):pick(["Not quite.","Curious, not critical — try again next time.","Alas."])}</b>${ok?"":`<div class="small muted" style="margin-top:.2rem">Answer: <b>${esc(q.a)}</b></div>`}${extra?`<div class="small muted" style="margin-top:.2rem">${extra}</div>`:""}</div><div class="row">${pts!=null?`<span class="pts">${pts>=0?"+":""}${fmt(pts)}</span>`:""}<button class="btn primary" id="fbNext">Continue</button></div></div>`;
}
function waitNext(root,label){ return new Promise(res=>{ const b=$("#fbNext",root); if(label) b.textContent=label; b.focus(); b.onclick=()=>res(); const k=(e)=>{ if(e.key==="Enter"||e.key===" "){document.removeEventListener("keydown",k); res();} }; document.addEventListener("keydown",k); }); }

/* ═══════════════ JEOPARDY ═══════════════ */
async function playJeopardy(session,root){
  const cfg=session.cfg;
  // categories: topics with enough questions, else lessons
  let cats=cfg.topics.filter(t=>Pool.sizeFor(Object.assign({},cfg,{topics:[t]}))>=5||Pool.base(Object.assign({},cfg,{topics:[t]})).length>=5).map(t=>({label:t,filter:{topic:t}}));
  if(cats.length<3){
    const unit=cfg.units.includes(0)?null:cfg.units[0];
    const lessons={}; Pool.base(cfg).forEach(q=>{ const k=q.u+":"+q.l; lessons[k]=(lessons[k]||0)+1; });
    cats=Object.keys(lessons).filter(k=>lessons[k]>=5).map(k=>{const [u,l]=k.split(":").map(Number); return {label:(unit==null?unitShort(u)+" ":"")+"L"+l+": "+(UNITS[u].lessons[l-1]||""),filter:{lessonU:u,lessonL:l}};});
  }
  cats=shuffle(cats).slice(0,cfg.projector?6:5);
  const exclude=new Set(); const board=[];
  cats.forEach(c=>{
    const col=[];
    for(let r=0;r<5;r++){
      const level=cfg.diff==="mix"?r:cfg.diff;
      let qs;
      if(c.filter.topic){ qs=session.draw(1,{level,topic:c.filter.topic,exclude}); }
      else{ // lesson filter: temporarily restrict base by lesson via exclude trick
        const pool=Pool.base(cfg).filter(q=>q.u===c.filter.lessonU&&q.l===c.filter.lessonL&&!exclude.has(q.id));
        const byLvl=pool.filter(q=>q.d===level); const used=Pool.used(cfg);
        let q=shuffle(byLvl.filter(x=>!used.has(x.id)))[0]||shuffle(pool.filter(x=>!used.has(x.id)))[0]||shuffle(byLvl)[0]||shuffle(pool)[0];
        qs=q?[q]:[];
      }
      const q=qs[0]; if(q) exclude.add(q.id);
      col.push({q,value:(r+1)*100,used:!q,dd:false});
    }
    board.push(col);
  });
  // daily doubles
  const ddCount=cats.length>=5?2:1; let placed=0, guard=0;
  while(placed<ddCount&&guard++<50){ const c=rnd(board.length), r=1+rnd(4); const tile=board[c][r]; if(tile.q&&!tile.dd&&!tile.used){tile.dd=true;placed++;} }

  const render=()=>{
    root.innerHTML=gameTop(session,"The Board",`<button class="btn sm ghost" id="jEnd">End game</button>`)+
      `<div class="jboard" style="--cols:${board.length}">${board.map(c=>`<div class="jcat">${esc(cats[board.indexOf(c)].label)}</div>`).join("")}
       ${[0,1,2,3,4].map(r=>board.map((c,ci)=>`<button class="jtile ${c[r].used?'used':''}" data-c="${ci}" data-r="${r}" ${c[r].used?'disabled':''}>${c[r].used?'':fmt(c[r].value)}</button>`).join("")).join("")}</div>
       ${session.h2h?`<p class="muted small" style="margin-top:.8rem">Control: <b style="color:${session.cur.color}">${esc(session.cur.name)}</b> — choose a clue. Wrong answers cost the value; other teams may steal once.</p>`:`<p class="muted small" style="margin-top:.8rem">Pick a clue. Wrong answers cost the value — Daily Doubles let you wager.</p>`}`;
    bindQuit(root,session);
    $("#jEnd",root).onclick=()=>session.finish();
    $$(".jtile",root).forEach(b=>b.onclick=()=>openTile(+b.dataset.c,+b.dataset.r));
    if(board.every(c=>c.every(t=>t.used))) setTimeout(()=>session.finish(),600);
  };
  const openTile=async(ci,ri)=>{
    const tile=board[ci][ri]; const q=tile.q; let value=tile.value; const player=session.cur;
    const stage=el(`<div></div>`); root.innerHTML=gameTop(session,esc(cats[ci].label)); root.appendChild(stage); bindQuit(root,session);
    if(tile.dd){
      Sfx.win();
      const maxW=Math.max(player.score,1000);
      stage.innerHTML=`<div class="qpanel"><div class="dd-banner">Daily Double!</div><p class="muted" style="text-align:center">${esc(player.name)}, wager between 100 and ${fmt(maxW)}.</p><div class="row" style="justify-content:center;margin-top:1rem"><input class="input" id="wager" type="number" min="100" max="${maxW}" value="${Math.min(maxW,Math.max(100,value))}" style="width:9rem;text-align:center;font-size:1.3rem"><button class="btn primary" id="wagerGo">Lock it in</button></div></div>`;
      value=await new Promise(res=>{ $("#wagerGo",stage).onclick=()=>{ let w=Math.round(+$("#wager",stage).value||100); w=Math.max(100,Math.min(maxW,w)); res(w); }; });
    }
    const r=await askMCQ(session,q,{container:stage,who:player,label:tile.dd?"Daily Double · "+fmt(value):null});
    let pts=r.ok?value:-value; if(r.ok&&session.cfg.timed) pts+=speedBonus(value,r.remaining,r.total);
    session.record(player,q,r.ok,r.secs,pts);
    if(tile.dd&&r.ok) session.flags.dd=true;
    session.refreshScores(root);
    const fb=$("#fb",stage);
    if(!r.ok&&session.h2h&&!tile.dd&&session.players.length>1){
      // steal
      fb.innerHTML=`<div class="feedback no"><div><b>Incorrect.</b> <span class="small muted">−${fmt(value)} for ${esc(player.name)}. Who buzzes to steal?</span></div><div class="steal">${session.players.map((p,i)=>i===session.turn?"":`<button class="btn sm" data-i="${i}" style="border-color:${p.color};color:${p.color}">${esc(p.name)}</button>`).join("")}<button class="btn sm ghost" id="noSteal">No steal</button></div></div>`;
      const stealer=await new Promise(res=>{ $$(".steal button[data-i]",fb).forEach(b=>b.onclick=()=>res(+b.dataset.i)); $("#noSteal",fb).onclick=()=>res(null); });
      if(stealer!=null){
        const sp=session.players[stealer]; const allowed=new Set([0,1,2,3].filter(i=>i!==r.choice));
        const choices=$$(".choice",stage).map(b=>({t:$("span:last-child",b).textContent,ok:b.classList.contains("correct")}));
        const r2=await askMCQ(session,q,{container:stage,who:sp,choices,allowed,label:"Steal"});
        const p2=r2.ok?value:-value; session.record(sp,q,r2.ok,r2.secs,p2); session.refreshScores(root);
        $("#fb",stage).innerHTML=feedbackHTML(r2.ok,q,p2); await waitNext(stage);
        if(r2.ok) session.turn=stealer; else session.next();
      } else { session.next(); }
    } else {
      fb.innerHTML=feedbackHTML(r.ok,q,pts); await waitNext(stage);
      if(session.h2h&&!r.ok) session.next();
    }
    tile.used=true; render();
  };
  render();
}

/* ═══════════════ WHEEL OF WISDOM ═══════════════ */
const WHEEL_SEGS=[500,"BANKRUPT",300,600,200,"LOSE A TURN",400,800,250,350,1000,150,450,700,300,900];
function wheelSVG(){
  const n=WHEEL_SEGS.length, r=100, cx=100, cy=100; let out="";
  WHEEL_SEGS.forEach((s,i)=>{
    const a0=(i/n)*2*Math.PI-Math.PI/2, a1=((i+1)/n)*2*Math.PI-Math.PI/2;
    const x0=cx+r*Math.cos(a0), y0=cy+r*Math.sin(a0), x1=cx+r*Math.cos(a1), y1=cy+r*Math.sin(a1);
    const fill=s==="BANKRUPT"?"#1a1720":s==="LOSE A TURN"?"#3a3645":(i%2?`rgba(var(--accent-rgb),.${55+(i%3)*15})`:`rgba(var(--accent-rgb),.3)`);
    out+=`<path d="M${cx},${cy} L${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 0 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z" fill="${fill}" stroke="#0f0e14" stroke-width="1"/>`;
    const am=(a0+a1)/2; const tx=cx+r*.66*Math.cos(am), ty=cy+r*.66*Math.sin(am); const deg=am*180/Math.PI+90;
    const label=typeof s==="number"?s:(s==="BANKRUPT"?"BANKRUPT":"LOSE TURN");
    out+=`<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" transform="rotate(${deg.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)})" text-anchor="middle" dominant-baseline="middle" font-size="${typeof s==="number"?9:5.5}" font-weight="700" font-family="Inter,sans-serif" fill="${typeof s==='number'?'#f1eadb':'#f1eadb'}">${label}</text>`;
  });
  return `<svg viewBox="0 0 200 200">${out}<circle cx="100" cy="100" r="9" fill="#0f0e14" stroke="rgba(var(--accent-rgb),.8)" stroke-width="2"/></svg>`;
}
const VOWELS="AEIOU", VOWEL_COST=250;
async function playWheel(session,root){
  const rounds=5; const puzzles=session.draw(rounds,{wheel:true});
  if(!puzzles.length){ toast("No puzzle-ready terms in this selection","Try adding Vocabulary or Philosophers"); session.finish(); return; }
  let round=0, rotation=0;
  session.players.forEach(p=>p.round=0);
  for(round=0;round<puzzles.length&&!session.ended;round++){
    const q=puzzles[round]; session.present(q); const answer=q.a.toUpperCase(); const letters=new Set(); let solved=false, revealed=0;
    session.players.forEach(p=>p.round=0);
    const isLetter=ch=>/[A-Z]/.test(ch);
    const state={phase:"spin",value:0}; // spin -> consonant -> (spin|vowel|solve)
    const puzzleHTML=()=>`<div class="puzzle">${answer.split(" ").map(w=>`<div class="pword">${w.split("").map(ch=>isLetter(ch)?`<div class="ptile ${letters.has(ch)?'':'hidden-l'}">${ch}</div>`:`<div class="ptile punct">${ch}</div>`).join("")}</div>`).join(`<div class="ptile space"></div>`)}</div>`;
    const keysHTML=()=>`<div class="keyboard">${"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(ch=>{const v=VOWELS.includes(ch); const used=letters.has(ch)||!answer.includes(ch)&&letters.has(ch); const en=(state.phase==="consonant"&&!v)||(state.phase==="vowel"&&v); return `<button class="key ${v?'vowel':''} ${letters.has(ch)?'used':''}" data-l="${ch}" ${(!en||letters.has(ch))?'disabled':''}>${ch}</button>`;}).join("")}</div>`;
    const draw=(status)=>{
      const p=session.cur;
      root.innerHTML=gameTop(session,`Puzzle ${round+1} of ${puzzles.length}`)+`
      <div class="wheel-wrap">
        <div class="wheel-box card"><div class="pointer"></div><div class="wheel" id="wheel" style="transform:rotate(${rotation}deg)">${wheelSVG()}</div>
          <div class="row" style="justify-content:center">
            <button class="btn primary" id="spin" ${state.phase!=="spin"&&state.phase!=="free"?'disabled':''}>Spin</button>
            <button class="btn" id="buyV" ${(state.phase!=="free"||p.round<VOWEL_COST||!VOWELS.split("").some(v=>!letters.has(v)))?'disabled':''}>Buy vowel · ${VOWEL_COST}</button>
            <button class="btn" id="solve" ${state.phase==="consonant"||state.phase==="vowel"?'disabled':''}>Solve</button>
          </div>
          <div class="small muted">Round bank: <b style="color:${p.color}">${esc(p.name)}</b> ${fmt(p.round)}</div>
        </div>
        <div class="card">
          <div class="row between"><span class="pill">${esc(q.t)}</span><span class="pill dim">${esc(unitShort(q.u))} · L${q.l}</span></div>
          <p class="clue" style="margin:.8rem auto">${esc(q.q)}</p>
          ${puzzleHTML()}
          <div class="wheel-status" id="wstatus">${status||""}</div>
          ${keysHTML()}
          <div id="solveBox" style="margin-top:.8rem"></div>
        </div>
      </div>`;
      bindQuit(root,session);
      $("#spin",root).onclick=doSpin; $("#buyV",root).onclick=()=>{ state.phase="vowel"; session.cur.round-=VOWEL_COST; draw("Choose a vowel."); };
      $("#solve",root).onclick=doSolve;
      $$(".key",root).forEach(k=>k.onclick=()=>guess(k.dataset.l));
    };
    const nextPlayer=(msg)=>{ if(session.h2h) session.next(); state.phase="spin"; draw(msg); };
    const doSpin=()=>new Promise(res=>{
      const idx=rnd(WHEEL_SEGS.length); const segDeg=360/WHEEL_SEGS.length;
      // pointer at top (−90°). Wheel rotates clockwise; segment i spans [i*seg, (i+1)*seg] from top before rotation.
      const target=360*5+(360-(idx*segDeg+segDeg/2))+ (Math.random()*segDeg*.6-segDeg*.3);
      const newRot=rotation-(rotation%360)+target; // always spins forward
      state.phase="spinning"; draw("Spinning…"); Sfx.spin();
      requestAnimationFrame(()=>requestAnimationFrame(()=>{ const w=$("#wheel",root); if(w) w.style.transform=`rotate(${newRot}deg)`; rotation=newRot; }));
      setTimeout(()=>{
        const seg=WHEEL_SEGS[idx];
        if(seg==="BANKRUPT"){ session.cur.round=0; Sfx.no(); nextPlayer("Bankrupt! Round bank lost."); }
        else if(seg==="LOSE A TURN"){ Sfx.no(); nextPlayer("Lose a turn."); }
        else { state.value=seg; state.phase="consonant"; draw(`${fmt(seg)} — call a consonant.`); }
        res();
      },4300);
    });
    const guess=(ch)=>{
      letters.add(ch); const count=answer.split("").filter(c=>c===ch).length; revealed+=count;
      const p=session.cur;
      if(count>0){ Sfx.ok(); if(state.phase==="consonant") p.round+=state.value*count; state.phase="free";
        if(answer.split("").filter(isLetter).every(c=>letters.has(c))){ finishRound(p,true,true); return; }
        draw(`${count} ${ch}${count>1?"'s":""}! Spin again, buy a vowel, or solve.`); }
      else { Sfx.no(); nextPlayer(`No ${ch}.`); }
    };
    const doSolve=()=>{
      const box=$("#solveBox",root);
      box.innerHTML=`<div class="row"><input class="input" id="solveIn" placeholder="Type the full answer…" autocomplete="off" style="flex:1"><button class="btn primary" id="solveGo">Submit</button><button class="btn ghost" id="solveNo">Cancel</button></div>`;
      const inp=$("#solveIn",box); inp.focus();
      const norm=s=>s.toUpperCase().replace(/[^A-Z]/g,"");
      const go=()=>{ if(norm(inp.value)===norm(answer)) finishRound(session.cur,true,false); else { Sfx.no(); nextPlayer(`"${esc(inp.value)}" is not it.`); } };
      $("#solveGo",box).onclick=go; inp.onkeydown=e=>{ if(e.key==="Enter") go(); }; $("#solveNo",box).onclick=()=>box.innerHTML="";
    };
    let resolveRound; const roundDone=new Promise(r=>resolveRound=r);
    const finishRound=async(p,ok,auto)=>{
      solved=true; Sfx.win();
      const bonus=300; const gained=p.round+bonus;
      session.players.forEach(x=>{ x.answered++; if(x===p){x.correct++; x.streak++; x.bestStreak=Math.max(x.bestStreak,x.streak);} else x.streak=0; });
      p.score+=gained; session.log.push({q,ok:true,who:p.name,pts:gained});
      if(revealed<=3) session.flags.wizard=true;
      letters.clear(); answer.split("").forEach(c=>{ if(isLetter(c)) letters.add(c); });
      draw(`<span style="color:${p.color}">${esc(p.name)}</span> solves it! +${fmt(gained)} (bank + ${bonus} bonus)`);
      $$(".key,#spin,#buyV,#solve",root).forEach(b=>b.disabled=true);
      $("#solveBox",root).innerHTML=`<div class="row" style="justify-content:center"><button class="btn primary" id="nextR">${round+1<puzzles.length?"Next puzzle":"See results"}</button></div>`;
      $("#nextR",root).onclick=()=>resolveRound();
      if(session.h2h) session.next();
    };
    draw(session.h2h?`<span style="color:${session.cur.color}">${esc(session.cur.name)}</span>, spin to start.`:"Spin to start.");
    await roundDone;
  }
  session.finish();
}

/* ═══════════════ MILLIONAIRE ═══════════════ */
const LADDER=[100,200,300,500,1000,2000,4000,8000,16000,32000,64000,125000,250000,500000,1000000];
const SAFE=[4,9];
async function playMillionaire(session,root){
  const cfg=session.cfg; const prog=cfg.diff==="mix"?[0,0,0,1,1,1,2,2,2,3,3,3,4,4,4]:LADDER.map(()=>cfg.diff);
  session.players.forEach(p=>{ p.rung=0; p.alive=true; p.won=0; p.ll={fifty:true,audience:true,swap:true}; });
  const exclude=new Set();
  const nextQ=(level)=>{ const q=session.draw(1,{level,exclude})[0]; if(q) exclude.add(q.id); return q; };
  const ladderHTML=(p)=>`<div class="ladder">${LADDER.map((v,i)=>`<div class="rung ${SAFE.includes(i)?'safe':''} ${i===p.rung?'now':''} ${i<p.rung?'done':''}"><span>${i+1}</span><span>${fmt(v)}</span></div>`).join("")}</div>`;
  const safeValue=(rung)=>{ let v=0; SAFE.forEach(s=>{ if(rung>s) v=LADDER[s]; }); return v; };
  while(session.players.some(p=>p.alive)&&!session.ended){
    if(!session.cur.alive){ session.next(); continue; }
    const p=session.cur; const level=prog[p.rung]; let q=nextQ(level); if(!q){ p.alive=false; continue; }
    let choices=buildChoices(q), allowed=null, swapped=false, audHTML="";
    const stage=el(`<div></div>`);
    const paint=()=>{ root.innerHTML=gameTop(session,`For ${fmt(LADDER[p.rung])}`)+`<div class="mil"><div id="qwrap"></div><div class="stack">${audHTML}${ladderHTML(p)}<div class="lifelines"><button class="ll" id="ll50" ${p.ll.fifty?'':'disabled'}>50:50</button><button class="ll" id="llAud" ${p.ll.audience?'':'disabled'}>Ask the class</button><button class="ll" id="llSwap" ${p.ll.swap?'':'disabled'}>Swap</button></div><button class="btn sm ghost" id="walk">Walk away with ${fmt(p.rung?LADDER[p.rung-1]:0)}</button></div></div>`; $("#qwrap",root).appendChild(stage); bindQuit(root,session); };
    paint();
    let result=null;
    while(!result){
      const ask=askMCQ(session,q,{container:stage,who:p,choices,allowed,sec:cfg.timeSec?Math.max(30,cfg.timeSec):30});
      // lifeline / walk handlers race against the question
      const action=await new Promise(res=>{
        ask.then(r=>res({type:"answer",r}));
        $("#ll50",root).onclick=()=>res({type:"fifty"}); $("#llAud",root).onclick=()=>res({type:"audience"}); $("#llSwap",root).onclick=()=>res({type:"swap"}); $("#walk",root).onclick=()=>res({type:"walk"});
      });
      if(action.type==="answer"){ result=action.r; break; }
      session.stopTimer();
      if(action.type==="walk"){ result={walk:true}; break; }
      if(action.type==="fifty"){ p.ll.fifty=false; const okI=choices.findIndex(c=>c.ok); const wrong=shuffle(choices.map((c,i)=>i).filter(i=>i!==okI)).slice(0,1); allowed=new Set([okI,wrong[0]]); paint(); }
      if(action.type==="audience"){ p.ll.audience=false; const okI=choices.findIndex(c=>c.ok); const conf=[.72,.62,.52,.44,.38][q.d]||.5; let pcts=choices.map((c,i)=>(allowed&&!allowed.has(i))?0:Math.random()); const okShare=conf+Math.random()*.15; const rest=1-okShare; const sum=pcts.reduce((a,b,i)=>a+(i===okI?0:b),0); pcts=pcts.map((v,i)=>i===okI?okShare:(sum?v/sum*rest:0)); const pc=pcts.map(v=>Math.round(v*100));
        audHTML=`<div class="card"><div class="eyebrow">The class votes</div><div class="audience">${pc.map((v,i)=>`<div style="display:flex;flex-direction:column;justify-content:flex-end;height:100%"><div class="bar" style="height:${Math.max(4,v)}%"><span>${v}%</span></div></div>`).join("")}</div><div class="audience" style="height:auto;margin-top:.2rem">${"ABCD".split("").map(l=>`<div class="lbl">${l}</div>`).join("")}</div></div>`; paint(); }
      if(action.type==="swap"){ p.ll.swap=false; q=nextQ(level); choices=buildChoices(q); allowed=null; swapped=true; audHTML=""; paint(); }
    }
    if(result.walk){ p.won=p.rung?LADDER[p.rung-1]:0; p.alive=false; p.score=p.won; session.refreshScores(root); toast(`${p.name} walks away`,`with ${fmt(p.won)}`,"ic-trophy"); if(session.h2h) session.next(); continue; }
    const ok=result.ok; session.record(p,q,ok,result.secs,0);
    if(ok){ p.rung++; p.won=LADDER[p.rung-1]; p.score=p.won; if(p.rung>=LADDER.length){ p.alive=false; session.flags.king=true; Sfx.win(); } }
    else { p.won=safeValue(p.rung); p.score=p.won; p.alive=false; }
    session.refreshScores(root);
    $("#fb",stage).innerHTML=feedbackHTML(ok,q,null,ok?(p.alive?`${esc(p.name)} climbs to ${fmt(p.won)}.`:`<b>Philosopher King!</b> Top of the ladder.`):`${esc(p.name)} drops to the safe haven: ${fmt(p.won)}.`);
    await waitNext(stage,p.alive?"Next question":(session.players.some(x=>x.alive&&x!==p)?"Next player":"See results"));
    if(session.h2h) session.next();
  }
  session.finish();
}

/* ═══════════════ LIGHTNING ROUND ═══════════════ */
async function playSprint(session,root){
  const cfg=session.cfg; const timed=cfg.timed; const total=timed?90:20; const buffer=[]; const exclude=new Set();
  const take=()=>{ if(!buffer.length){ session.draw(10,{exclude}).forEach(q=>{exclude.add(q.id);buffer.push(q);}); } return buffer.shift(); };
  let n=0, globalTimer=null, timeLeft=total;
  const header=()=>`<div class="sprint-head"><div class="row"><span class="pill">${timed?"Time":"Questions"}</span><b id="sprintClock" style="font-family:var(--serif);font-size:1.6rem">${timed?Math.ceil(timeLeft)+"s":`${n}/${total}`}</b></div>${session.h2h?"":`<div class="streak">Streak ×${session.cur.streak}</div>`}</div>`;
  if(timed){ globalTimer=new Timer(total,(left)=>{ timeLeft=left; const c=$("#sprintClock"); if(c) c.textContent=Math.ceil(left)+"s"; },()=>{ if(!session.ended){ session.stopTimer(); session.finish(); } }).start(); }
  const stop=()=>{ if(globalTimer) globalTimer.stop(); };
  if(!session.h2h){
    while(!session.ended&&(timed?timeLeft>0:n<total)){
      const q=take(); if(!q) break; n++;
      root.innerHTML=gameTop(session)+header()+`<div id="stage"></div>`; bindQuit(root,session);
      const r=await askMCQ(session,q,{container:$("#stage",root),timed:false});
      if(session.ended) break;
      const p=session.cur; const base=100+Math.min(200,25*p.streak); const bonus=timed&&r.ok?(r.secs<4?60:r.secs<8?30:0):0; const pts=r.ok?base+bonus:0;
      session.record(p,q,r.ok,r.secs,pts); session.refreshScores(root);
      $("#fb",root).innerHTML=feedbackHTML(r.ok,q,pts,r.ok&&p.streak>1?`Streak ×${p.streak}`:"");
      // auto-advance quickly in timed mode
      await Promise.race([waitNext(root),new Promise(res=>setTimeout(res,timed?1800:60000))]);
    }
    stop(); session.finish(); return;
  }
  // head-to-head buzzer mode
  const perQ=12;
  while(!session.ended&&(timed?timeLeft>0:n<total)){
    const q=take(); if(!q) break; n++;
    const choices=buildChoices(q); let tried=new Set(); let answeredOK=false;
    const stage=el(`<div></div>`);
    const paintBuzz=(msg)=>{
      root.innerHTML=gameTop(session)+header(); root.appendChild(stage);
      stage.innerHTML=`<div class="qpanel"><div class="meta"><span class="pill">${esc(q.t)}</span><span class="pill dim">${esc(unitShort(q.u))} · L${q.l}</span><span class="pill dim">${esc(diffName(q.d))}</span><span style="flex:1"></span>${timed?timerHTML():""}</div><div class="qtext">${esc(q.q)}</div>
        <div class="locked muted">${msg||"Buzz in! (keys 1–4)"}</div>
        <div class="buzzers" style="--n:${session.players.length}">${session.players.map((p,i)=>`<button class="buzz" data-i="${i}" style="background:${p.color}" ${tried.has(i)?'disabled':''}>${esc(p.name)}<div class="small" style="opacity:.7">key ${TEAM_KEYS[i]}</div></button>`).join("")}</div>
        <div class="row" style="justify-content:center;margin-top:.8rem"><button class="btn sm ghost" id="skipQ">Nobody knows — reveal</button></div></div>`;
      bindQuit(root,session);
    };
    while(!answeredOK&&tried.size<session.players.length&&!session.ended){
      paintBuzz(tried.size?`Wrong — others may buzz.`:null);
      let shot=null;
      const who=await new Promise(res=>{
        $$(".buzz",stage).forEach(b=>b.onclick=()=>res(+b.dataset.i));
        $("#skipQ",stage).onclick=()=>res(null);
        const k=(e)=>{ const i=TEAM_KEYS.indexOf(e.key); if(i>=0&&i<session.players.length&&!tried.has(i)){document.removeEventListener("keydown",k);res(i);} }; document.addEventListener("keydown",k);
        if(timed){ shot=attachTimer(session,perQ,()=>res(null)); }
        stage._cleanup=()=>document.removeEventListener("keydown",k);
      });
      if(shot) shot.stop(); if(stage._cleanup) stage._cleanup();
      if(who==null){ // reveal
        stage.innerHTML=`<div class="qpanel"><div class="qtext">${esc(q.q)}</div><div class="feedback no" style="margin-top:1rem"><div><b>Answer:</b> ${esc(q.a)}</div><button class="btn primary" id="fbNext">Next</button></div></div>`; await Promise.race([waitNext(stage),new Promise(r=>setTimeout(r,timed?2500:60000))]); break;
      }
      tried.add(who); const p=session.players[who]; session.turn=who; Sfx.spin();
      const allowed=new Set([0,1,2,3].filter(i=>!choices[i].dead));
      const r=await askMCQ(session,q,{container:stage,who:p,choices,allowed,sec:10,timed:timed});
      const pts=r.ok?200+Math.min(200,50*p.streak):-100; session.record(p,q,r.ok,r.secs,pts); session.refreshScores(root);
      if(r.ok){ answeredOK=true; $("#fb",stage).innerHTML=feedbackHTML(true,q,pts,p.streak>1?`Streak ×${p.streak}`:""); await Promise.race([waitNext(stage),new Promise(res=>setTimeout(res,timed?1800:60000))]); }
      else { // mark wrong choice as not allowed for the next buzzer
        const wrongI=r.choice; if(wrongI!=null) choices[wrongI].dead=true;
        $("#fb",stage).innerHTML=`<div class="feedback no"><div><b>${esc(p.name)}: −100</b></div><button class="btn primary" id="fbNext">Continue</button></div>`; await Promise.race([waitNext(stage),new Promise(res=>setTimeout(res,timed?1200:60000))]);
        if(tried.size>=session.players.length){ stage.innerHTML=`<div class="qpanel"><div class="qtext">${esc(q.q)}</div><div class="feedback no" style="margin-top:1rem"><div><b>Answer:</b> ${esc(q.a)}</div><button class="btn primary" id="fbNext">Next</button></div></div>`; await Promise.race([waitNext(stage),new Promise(r2=>setTimeout(r2,timed?2500:60000))]); }
      }
    }
  }
  stop(); session.finish();
}

/* ═══════════════ RESULTS ═══════════════ */
function showResults(session){
  const root=$("#app"); const cfg=session.cfg; const unit=cfg.units.length>1||cfg.units.includes(0)?0:cfg.units[0];
  const ranked=session.players.slice().sort((a,b)=>b.score-a.score);
  const winner=ranked[0]; const tie=ranked.length>1&&ranked[1].score===winner.score;
  // leaderboard entries
  session.players.forEach(p=>{ if(p.answered>0||p.score>0) Board.add({name:p.name,score:p.score,game:cfg.game,unit,diff:cfg.diff,mode:cfg.mode,timed:!!cfg.timed,correct:p.correct,answered:p.answered}); });
  // profile recording
  let unlocked=[];
  const recordFor=(profile,p,h2hWin)=>{
    const avg=p.times.length?p.times.reduce((a,b)=>a+b,0)/p.times.length:null;
    const u=recordGame(profile,{game:cfg.game,unit,diff:cfg.diff,timed:!!cfg.timed,answered:p.answered,correct:p.correct,fast:p.fast,bestStreak:p.bestStreak,score:p.score,h2hWin,recycled:session.recycled,flags:session.flags,avgTime:avg,seen:session.seen});
    unlocked=unlocked.concat(u.map(x=>Object.assign({who:profile.name},x)));
  };
  if(!session.h2h){ const prof=Profile.current(); if(prof) recordFor(prof,session.players[0],false); }
  else { session.players.forEach(p=>{ if(Profile.all().includes(p.name)) recordFor(Profile.get(p.name),p,p===winner&&!tie); }); }
  Sfx.win();
  const wrong=session.log.filter(l=>!l.ok);
  const uniqWrong=[]; const seenQ=new Set(); wrong.forEach(l=>{ if(!seenQ.has(l.q.id)){seenQ.add(l.q.id);uniqWrong.push(l);} });
  const totalA=session.players.reduce((a,p)=>a+p.answered,0), totalC=session.players.reduce((a,p)=>a+p.correct,0);
  const prog=Pool.progress(cfg);
  root.innerHTML=`<div class="results">
    <div class="eyebrow">${esc(GAMES[cfg.game].name)} · ${esc(UNITS[unit].short)} · ${esc(diffName(cfg.diff))}${cfg.timed?" · timed":""}</div>
    ${session.h2h?`<h1 style="margin:.4rem 0">${tie?"It's a tie!":esc(winner.name)+" wins!"}</h1>`:`<h1 style="margin:.4rem 0">${esc(winner.name)}</h1>`}
    <div class="big">${fmt(winner.score)}</div>
    <p class="muted">${totalC}/${totalA} correct (${pctStr(totalC,totalA)})${session.recycled?" · pool exhausted — questions began recycling":""}</p>
    <p class="small muted" style="margin-top:.3rem">Pool progress: ${prog.used}/${prog.total} questions seen in this selection</p>
    ${session.h2h?`<div class="podium">${ranked.map((p,i)=>`<div class="p"><div class="small"><b>${esc(p.name)}</b><div class="muted">${p.correct}/${p.answered}</div></div><div class="bar" style="background:${p.color};height:${Math.max(2.4,7-i*1.4)}rem">${fmt(p.score)}</div></div>`).join("")}</div>`:""}
    ${unlocked.length?`<div class="unlocks">${unlocked.map(u=>u.type==="badge"?`<div class="unlock u${u.unit}" style="--accent:${unitColor(u.unit)}"><span class="emblem" style="width:1.8rem;height:1.8rem;color:${unitColor(u.unit)}"><svg><use href="#em-${u.unit}"/></svg></span><div><b>${esc(u.def.name)}</b><div class="small muted">${esc(UNITS[u.unit].short)} badge${session.h2h?" · "+esc(u.who):""}</div></div></div>`:`<div class="unlock"><span class="acc-star" style="font-family:var(--serif);font-size:1.4rem;color:var(--accent)">★</span><div><b>${esc(u.def.name)}</b><div class="small muted">Accolade${session.h2h?" · "+esc(u.who):""}</div></div></div>`).join("")}</div>`:""}
    <div class="row" style="justify-content:center;margin-top:1rem">
      <button class="btn primary lg" id="rAgain">Play again</button>
      <button class="btn lg" id="rGames">Other games</button>
      <button class="btn lg ghost" id="rHome">Home</button>
    </div>
    ${uniqWrong.length?`<div class="review"><div class="eyebrow" style="margin-bottom:.3rem">Review — ${uniqWrong.length} to revisit</div>${uniqWrong.map(l=>`<div class="r"><div class="small muted">${esc(unitShort(l.q.u))} · L${l.q.l} · ${esc(l.q.t)}</div><div>${esc(l.q.q)}</div><b>→ ${esc(l.q.a)}</b></div>`).join("")}</div>`:(totalA?`<p class="serif accent" style="font-size:1.4rem;margin-top:1.5rem;font-style:italic">Flawless. Sophia would be proud.</p>`:"")}
  </div>`;
  $("#rAgain").onclick=()=>App.startGame(cfg.game); $("#rGames").onclick=()=>App.go("games"); $("#rHome").onclick=()=>App.go("home");
  unlocked.forEach((u,i)=>setTimeout(()=>toast((u.type==="badge"?"Badge unlocked: ":"Accolade: ")+u.def.name,u.def.desc,u.type==="badge"?"ic-badge":"ic-trophy"),400+i*700));
}
function unitColor(u){ return {1:"#d4a74a",2:"#35bfae",3:"#9b7cf5",4:"#e4607a",0:"#cfc6b2"}[u]; }
