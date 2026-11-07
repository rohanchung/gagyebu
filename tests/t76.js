/* t76 — 🔁 r2m 간격 반복 · 세트 구성 · 어려운 단어 분리 (학습사 11/6 저녁 · v4.87)
   🔴 학습사: 「streak≥2 0개 — 정답 단어가 다시 안 나와 승급 경로가 막혀 있다」
      더 밑의 원인: 2연속이 되는 순간 streak 를 0 으로 되돌렸다 → streak 는 구조적으로 1 을 못 넘었다.
   🔒 L1 맞히면 streak 1→1일 · 2→3일 · 3↑→7일 뒤 · 틀리면 내일 · streak 0
      L2 streak 는 연속 정답 수 그대로 · miss 는 짝수 번째 정답마다 −1 (v9 의 뜻 그대로)
      S1 20문항 = 때가 된 것 12(오래된 순) + 처음 보는 것 8 · S2 모자라면 서로 채운다
      S3 retestOn 없는 옛 단어는 「마지막 본 날 + 간격」으로 계산 · S4 아직 때가 안 된 단어는 나오지 않는다
      H1 seen≥4 · 정답률 30% 미만은 r2m 풀에서 빠지고 따로 돈다 · 기록에 set:'hard'
      U1 화면이 세트 구성과 어려운 단어 수를 말한다 */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
  const ctx=await b.newContext({viewport:{width:1280,height:900}});
  await ctx.addInitScript(()=>{
   function mk(){const q={select(){return q},eq(){return q},order(){return q},limit(){return q},in(){return q},gt(){return q},update(){return q},
     upsert(){return Promise.resolve({})},insert(){return Promise.resolve({data:[],error:null})},delete(){return q},
     maybeSingle(){return Promise.resolve({data:null,error:null})},then(a){return Promise.resolve({data:[],error:null}).then(a)}};return q;}
   window.supabase={createClient:()=>({from:()=>mk(),rpc:()=>Promise.resolve({data:null,error:null}),
     auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};});
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(1500);

  /* L1·L2 — 한 단어를 연달아 맞히고 틀린다 */
  const L=await p.evaluate(()=>{
    const t=todayStr();
    DB.study.words=[{id:'a',kana:'あめ',ko:'비',seen:1,miss:3,streak:0,lastSeen:addDays(t,-5)}];
    for(let i=0;i<30;i++)DB.study.words.push({id:'f'+i,kana:'かな'+i,ko:'뜻'+i,seen:0,miss:0,streak:0});
    const w=DB.study.words[0], out=[];
    /* v4.88 — 하루씩 지나며 맞힌다(같은 날 정답은 streak 에 안 더한다 · 학습사 v30) */
    const hit=(ok,same)=>{if(!same)w.lastSeen=addDays(t,-1);ST_DRILL={mode:'r2m',ids:['a'],opts:[[]],i:0,res:[],show:false,fin:false,start:Date.now()};
      stDrillRecord(ok,ok?'비':'x',false);ST_DRILL=null;
      out.push({s:w.streak,m:w.miss,r:w.retestOn?Math.round((new Date(w.retestOn)-new Date(t))/86400000):null});};
    hit(true);hit(true);hit(true);hit(true);hit(false);
    /* 같은 날 두 번째 정답 */
    hit(true);hit(true,true);
    return out;});
  ok('L1 🔴 간격 — 1일 → 3일 → 7일 → 7일 · 틀리면 내일',L.slice(0,5).map(x=>x.r).join()==='1,3,7,7,1',JSON.stringify(L));
  ok('L3 🔴 같은 날 또 맞혀도 streak 는 그대로(1 → 1) — 학습사 v30',L[5].s===1&&L[6].s===1,JSON.stringify(L.slice(5)));
  ok('L2 🔴 streak 는 리셋 없이 쌓인다(1,2,3,4) · 틀리면 0',L.slice(0,5).map(x=>x.s).join()==='1,2,3,4,0',JSON.stringify(L));
  ok('L2b miss 는 짝수 번째 정답마다 −1 (3→2→2→1) · 틀리면 +1',L.slice(0,5).map(x=>x.m).join()==='3,2,2,1,2',JSON.stringify(L));

  /* S1~S4 — 세트 구성 */
  const S=await p.evaluate(()=>{
    const t=todayStr(), W=[];
    /* 때가 된 것 30: retestOn 이 지난 것 10 + retestOn 없는 옛 단어(마지막 본 날 + 간격) 20 */
    for(let i=0;i<10;i++)W.push({id:'r'+i,kana:'れ'+i,ko:'재'+i,seen:3,miss:0,streak:1,lastSeen:addDays(t,-9),retestOn:addDays(t,-(i+1))});
    for(let i=0;i<20;i++)W.push({id:'o'+i,kana:'お'+i,ko:'옛'+i,seen:2,miss:0,streak:1,lastSeen:addDays(t,-(i+2))});
    /* 아직 때가 아닌 것: 어제 맞혀 streak 2 → 3일 뒤 */
    for(let i=0;i<10;i++)W.push({id:'n'+i,kana:'の'+i,ko:'아직'+i,seen:2,miss:0,streak:2,lastSeen:addDays(t,-1)});
    for(let i=0;i<30;i++)W.push({id:'f'+i,kana:'ふ'+i,ko:'새'+i,seen:0,miss:0,streak:0});
    DB.study.words=W;
    stDrillStart('r2m',20);
    const ids=ST_DRILL.ids.slice(); ST_DRILL=null;
    const due=ids.filter(x=>/^[ro]/.test(x)), fresh=ids.filter(x=>/^f/.test(x)), notyet=ids.filter(x=>/^n/.test(x));
    const dues=due.map(id=>stDueOf(W.find(w=>w.id===id)));
    /* S2 — 때가 된 것이 3개뿐이면 */
    DB.study.words=W.filter(w=>!/^o/.test(w.id)&&!/^r[3-9]/.test(w.id));
    stDrillStart('r2m',20); const ids2=ST_DRILL.ids.slice(); ST_DRILL=null;
    return {n:ids.length,due:due.length,fresh:fresh.length,notyet:notyet.length,sorted:dues.every((d,i,a)=>i===0||a[i-1]<=d),
      oDue:stDueOf(W.find(w=>w.id==='o0')),oExp:addDays(addDays(t,-2),1),
      n2:ids2.length,due2:ids2.filter(x=>/^r/.test(x)).length,fresh2:ids2.filter(x=>/^f/.test(x)).length,notyet2:ids2.filter(x=>/^n/.test(x)).length};});
  ok('S1 🔴 20문항 = 때가 된 것 12 + 처음 보는 것 8',S.n===20&&S.due===12&&S.fresh===8,JSON.stringify(S));
  ok('S1b 때가 된 것은 오래된 순',S.sorted,JSON.stringify(S));
  ok('S3 retestOn 없는 옛 단어 = 마지막 본 날 + 간격(streak 1 → 1일)',S.oDue===S.oExp,S.oDue+' vs '+S.oExp);
  ok('S4 아직 때가 안 된 단어는 안 나온다',S.notyet===0,S.notyet);
  ok('S2 때가 된 것이 모자라면 처음 보는 것으로 채운다(3 + 17)',S.n2===20&&S.due2===3&&S.fresh2===17&&S.notyet2===0,JSON.stringify(S));

  /* H1 — 어려운 단어 */
  const H=await p.evaluate(()=>{
    const t=todayStr(), W=[];
    W.push({id:'h1',kana:'こうぎ',ko:'강의',seen:7,miss:5,streak:0,lastSeen:addDays(t,-3)});   /* 2/7 = 29% */
    W.push({id:'h2',kana:'けいけん',ko:'경험',seen:8,miss:1,streak:0,lastSeen:addDays(t,-3)}); /* miss 는 낮지만 드릴 기록상 7번 틀림 */
    W.push({id:'e1',kana:'やま',ko:'산',seen:8,miss:2,streak:1,lastSeen:addDays(t,-3)});      /* 75% */
    W.push({id:'e2',kana:'かわ',ko:'강',seen:3,miss:3,streak:0,lastSeen:addDays(t,-3)});      /* seen 3 — 아직 판단 안 한다 */
    for(let i=0;i<10;i++)W.push({id:'f'+i,kana:'ふ'+i,ko:'새'+i,seen:0,miss:0,streak:0});
    DB.study.words=W;
    /* 지난 날의 드릴 기록 — 오늘 것이면 「하루 최대 2번」에 걸린다 */
    DB.study.drills=[];for(let i=0;i<7;i++)DB.study.drills.push({id:'d'+i,date:addDays(t,-(i+1)),mode:'r2m',n:1,correct:0,wrongIds:['h2']});
    const pool=stDrillPool('r2m').map(w=>w.id), hard=stHardWords().map(w=>w.id);
    stDrillStart('r2m',10,true); const hs=ST_DRILL.ids.slice(), flag=ST_DRILL.hard;
    ST_DRILL.res=[{id:hs[0],ok:false}];ST_DRILL.i=hs.length;stDrillFinish();
    const last=DB.study.drills[DB.study.drills.length-1];
    return {pool,hard,hs,flag,set:last.set};});
  ok('H1 🔴 어려운 단어(정답률 30% 미만 · seen≥4)는 일반 r2m 풀에서 빠진다',!H.pool.includes('h1')&&!H.pool.includes('h2')&&H.pool.includes('e1')&&H.pool.includes('e2'),JSON.stringify(H.pool));
  ok('H1b 틀린 횟수는 miss 와 드릴 기록 중 큰 쪽(h2)',H.hard.sort().join()==='h1,h2',JSON.stringify(H.hard));
  ok('H1c 어려운 단어 세트는 그것만',H.flag===true&&H.hs.slice().sort().join()==='h1,h2',JSON.stringify(H.hs));
  ok('H1d 기록에 set:hard',H.set==='hard',H.set);

  /* U1 — 화면 */
  await p.evaluate(()=>{ST_DRILL=null;DB.ui.stdMode='r2m';setStTab('word');});await p.waitForTimeout(300);
  const U=await p.evaluate(()=>document.getElementById('v-study').innerText);
  ok('U1 세트 구성을 말한다',/다시 볼 때가 된 단어/.test(U)&&/처음 보는 단어/.test(U),U.slice(0,300));
  ok('U1b 어려운 단어 버튼',/🧱 어려운 단어 2개/.test(U),U.slice(0,500));
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t76 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
