/* t82 — 학습사 v33 · 진단 v2 · 로한 (v4.92)
   🔒 M1 옛 최상위 카운터는 m.r2m 으로(최상위엔 안 남는다 · 멱등) · M2 옮긴 뒤 최상위에 또 쓰면 버리지 않고 r2m 에 얹는다
      M3 k2r 드릴은 m.k2r 만 바꾼다(가나→뜻 r2m 이 오르지 않는다) · 간격(retestOn)도 모드마다
      G1 드릴별 남은 목표 — 때가 된 것 · 처음 · 쉬는 중을 모드마다 센다 · 버튼과 상자에 보인다
      C1 맞혀도 해설 카드(나머지 보기의 정체) · C2 문법도 맞히면 💡
      V1 뜻 토큰이 정답과 겹치는 보기는 안 나온다(よう: 볼일, 용무 ↔ 용무, 용건, 볼일)
      T1 진단 탭(5번째) · 기록이 전략에서 진단으로 · T2 scheduled 는 날짜가 되면 열린다
      S1 진단 제출 → at · 타임로그 「🩺 진단」 · 학습 분 · S2 틀린 문장 retestOn 내일 · 틀린 단어는 그 섹션 모드에
      B1 v4.90 진단 기록(at 없음) 소급 = doneAt − 푼 시간 */
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
  await p.evaluate(()=>{document.querySelector('.side .m[data-v="study"]').click();});await p.waitForTimeout(200);

  /* M1·M2 */
  const M=await p.evaluate(()=>{
    const t=todayStr();
    DB.study.words=[{id:'a',kana:'あめ',kanji:'雨',ko:'비',seen:4,miss:2,streak:1,lastSeen:addDays(t,-2),retestOn:addDays(t,-1)},
      {id:'z',kana:'ぞう',ko:'코끼리'}];
    studyDB(); const a=JSON.parse(JSON.stringify(stWordById('a'))), z=JSON.parse(JSON.stringify(stWordById('z')));
    studyDB(); const a2=JSON.parse(JSON.stringify(stWordById('a')));
    const w=stWordById('a'); w.miss=7; const c=stCt(w,'r2m');
    return {a,z,a2,c:JSON.parse(JSON.stringify(c)),top:stWordById('a').miss};});
  ok('M1 🔴 옛 최상위 카운터 → m.r2m · 최상위엔 없다',M.a.m&&M.a.m.r2m&&M.a.m.r2m.seen===4&&M.a.m.r2m.miss===2&&M.a.m.r2m.retestOn&&M.a.seen===undefined&&M.a.retestOn===undefined,JSON.stringify(M.a));
  ok('M1b 처음 보는 단어는 빈 m · 다시 돌려도 같다(멱등)',JSON.stringify(M.z.m)==='{}'&&JSON.stringify(M.a2)===JSON.stringify(M.a),JSON.stringify(M.z));
  ok('M2 🔒 옮긴 뒤 최상위에 쓴 값은 r2m 에 얹는다(버리지 않는다)',M.c.miss===7&&M.top===undefined,JSON.stringify(M.c));

  /* M3 — k2r 드릴 */
  const K=await p.evaluate(()=>{
    const t=todayStr(), W=[];
    const L=[['あめ','雨','비'],['あし','足','다리'],['あさ','朝','아침'],['いえ','家','집'],['うみ','海','바다'],['かわ','川','강']];
    L.forEach((k,i)=>W.push({id:'k'+i,kana:k[0],kanji:k[1],ko:k[2],m:{r2m:{seen:3,miss:1,streak:2,lastSeen:addDays(t,-1),retestOn:addDays(t,3)}}}));
    DB.study.words=W; DB.study.drills=[];
    const before=JSON.stringify(W.map(w=>w.m.r2m));
    stDrillStart('k2r',3); const id=ST_DRILL.ids[0], w=stWordById(id);
    stDrillGrade(w.kana);
    const after=JSON.stringify(stWords().map(w=>w.m.r2m)), k=JSON.parse(JSON.stringify(w.m.k2r));
    ST_DRILL=null; return {before,after,k,id};});
  ok('M3 🔴 k2r 정답은 가나→뜻(m.r2m)을 안 올린다',K.before===K.after,K.after.slice(0,200));
  ok('M3b k2r 카운터·간격은 m.k2r 에',K.k&&K.k.seen===1&&K.k.streak===1&&K.k.retestOn===(await p.evaluate(()=>addDays(todayStr(),1))),JSON.stringify(K.k));

  /* G1 — 남은 목표 */
  const G=await p.evaluate(()=>{
    const t=todayStr(), W=[];
    for(let i=0;i<3;i++)W.push({id:'d'+i,kana:'だ'+i,ko:'때'+i,m:{r2m:{seen:2,miss:0,streak:1,lastSeen:addDays(t,-3)}}});   /* 때가 됨 */
    for(let i=0;i<2;i++)W.push({id:'w'+i,kana:'ま'+i,ko:'쉼'+i,m:{r2m:{seen:2,miss:0,streak:3,lastSeen:addDays(t,-1)}}});    /* 7일 뒤 */
    for(let i=0;i<4;i++)W.push({id:'f'+i,kana:'ふ'+i,ko:'새'+i,m:{}});
    DB.study.words=W; DB.study.drills=[]; DB.ui.stdMode='r2m'; setStTab('word');
    const g=stGoal('r2m'), gk=stGoal('k2r');
    return {g,gk,txt:document.getElementById('v-study').innerText};});
  ok('G1 🔴 r2m 남은 목표 = 때 3 + 처음 4 · 쉬는 중 2',G.g.due===3&&G.g.fresh===4&&G.g.wait===2&&G.g.left===7,JSON.stringify(G.g));
  ok('G1b 화면: 모드 버튼에 「남은 N」 · 목표 상자',/🎯 남은 7 \(때 3 · 새 4\)/.test(G.txt)&&/남은 목표/.test(G.txt)&&/쉬는 중 2/.test(G.txt),G.txt.slice(0,600));

  /* C1 — 맞혀도 해설 카드 */
  const C=await p.evaluate(()=>{
    const t=todayStr(), W=[];
    [['あめ','雨','비'],['あし','足','다리'],['あさ','朝','아침'],['あせ','汗','땀'],['あき','秋','가을']].forEach((k,i)=>W.push({id:'c'+i,kana:k[0],kanji:k[1],ko:k[2],m:{}}));
    DB.study.words=W; DB.study.drills=[];
    stDrillStart('r2m',2); const w=stWordById(ST_DRILL.ids[0]); stDrillGrade(w.ko);
    const card=document.querySelector('#v-study .oops');
    const r={has:!!card,ok:card&&card.classList.contains('okc'),txt:card?card.innerText:''};
    ST_DRILL=null; return r;});
  ok('C1 🔴 맞혀도 해설 카드 · 나머지 보기의 정체',C.has&&C.ok&&/나머지 보기는 이 단어들이다/.test(C.txt),JSON.stringify(C));

  /* V1 — 뜻 토큰 겹침 */
  const V=await p.evaluate(()=>{
    const W=[{id:'y1',kana:'よう',ko:'볼일, 용무',m:{}},{id:'y2',kana:'ようじ',ko:'용무, 용건, 볼일',m:{}},{id:'y3',kana:'よる',ko:'밤',m:{}},
      {id:'y4',kana:'よこ',ko:'옆',m:{}},{id:'y5',kana:'ゆめ',ko:'꿈',m:{}},{id:'y6',kana:'よみ',ko:'읽기',m:{}}];
    DB.study.words=W; let hit=0;
    for(let i=0;i<30;i++){const o=stMkOpts(W[0],'r2m',W);if(o.indexOf('용무, 용건, 볼일')>=0)hit++;}
    return hit;});
  ok('V1 🔴 뜻이 겹치는 보기(용무, 용건, 볼일)는 안 나온다',V===0,V);

  /* T1·T2 — 진단 탭 · 날짜 게이트 */
  const T=await p.evaluate(()=>{
    const t=todayStr();
    DB.study.diag={v:1,sets:[{id:'dgA',date:addDays(t,-1),title:'예정됐던 것',status:'scheduled',sections:[]},
      {id:'dgB',date:addDays(t,5),title:'아직',status:'scheduled',sections:[]}]};
    setStTab('diag');
    const tabs=[...document.querySelectorAll('#v-study .logtabs button')].map(x=>x.textContent.trim());
    const txt=document.getElementById('v-study').innerText;
    setStTab('plan'); const plan=document.getElementById('v-study').innerText;
    return {tabs,txt,plan,a:stDiagOpenable(stDiagById('dgA')),b:stDiagOpenable(stDiagById('dgB'))};});
  ok('T1 🩺 진단 탭(5번째) · 기록이 진단 탭에',T.tabs.length===5&&/진단/.test(T.tabs[4])&&/📝 기록/.test(T.txt)&&!/📝 기록/.test(T.plan),JSON.stringify(T.tabs));
  ok('T2 🔴 scheduled — 날짜가 지나면 열리고, 전엔 「예정」',T.a===true&&T.b===false&&/🩺 시작/.test(T.txt)&&/예정/.test(T.txt),T.txt.slice(0,300));

  /* S1·S2 — 제출 */
  const S=await p.evaluate(()=>{
    const t=todayStr(), y=addDays(t,-1);
    DB.timelog={};
    const W=[];[['あめ','雨','비'],['あし','足','다리'],['あさ','朝','아침'],['いえ','家','집'],['うみ','海','바다'],['かわ','川','강']]
      .forEach((k,i)=>W.push({id:'s'+i,kana:k[0],kanji:k[1],ko:k[2],m:{r2m:{seen:2,miss:0,streak:1,lastSeen:y}}}));
    DB.study.words=W;
    DB.study.sents=[{id:'c0',ja:'わたしは まいにち がっこうへ いきます。',ko:'학교',seen:0,miss:0,streak:0,lastSeen:null,slots:[{kind:'ctx',target:'がっこう',opts:['びょういん','こうえん','えき']}],gloss:[]}];
    DB.study.tests=[];
    DB.study.diag={v:1,sets:[{id:'dgS',date:t,title:'제출 시험',targetMin:45,status:'ready',sections:[
      {k:'kread',n:2,src:'auto',band:'vocab',from:'words',mode:'k2r',label:'한자읽기'},
      {k:'ctx',n:1,src:'auto',band:'vocab',from:'sents',slotKind:'ctx',label:'문맥규정'}]}]};
    stDiagOpen('dgS'); stDiagStart(true);
    const set=stDiagById('dgS'), qs=set.drawn.qs;
    /* 시간이 흐른 것처럼 — 섹션 초를 직접 넣는다 */
    while(DB.ui.diagRun.i<qs.length){const r=DB.ui.diagRun;if(r.gate!==r.i){stDiagGate();continue;}const q=qs[r.i];stDiagPick((q.ans+1)%q.opts.length);}
    DB.ui.diagRun.secs={kread:600,ctx:300};
    stDiagSubmit();
    const rec=DB.study.tests.find(x=>x.id==='dgS'), ds=rec.at?new Date(rec.at):null;
    const wq=qs.filter(q=>q.t==='w')[0];
    return {rec,tl:JSON.stringify(DB.timelog),mins:stStudyMins(t),
      sret:stSentById('c0').retestOn, k2r:(stWordById(wq.ref).m.k2r||{}).retestOn, r2m:stWordById(wq.ref).m.r2m.retestOn||null,
      tom:addDays(t,1), gramDue:stRetestDue(stSentById('c0'),addDays(t,1))};});
  ok('S1 🔴 진단 기록에 시작 시각(at)',!!S.rec.at&&S.rec.secs>=0,JSON.stringify(S.rec).slice(0,200));
  ok('S1b 타임로그에 「🩺 진단」',/🩺 진단/.test(S.tl),S.tl.slice(0,300));
  ok('S1c 학습 분에 들어간다',S.mins>=Math.floor(S.rec.secs/60)-1&&S.mins>0,S.mins+' / '+S.rec.secs);
  ok('S2 🔴 틀린 문장은 retestOn 내일 → 문법 드릴에서 먼저',S.sret===S.tom&&S.gramDue===true,JSON.stringify(S));
  ok('S2b 틀린 단어는 그 섹션 모드(k2r)에 재점검 · r2m 은 그대로',S.k2r===S.tom&&!S.r2m,JSON.stringify(S));

  /* B1 — 소급 */
  const B=await p.evaluate(()=>{
    const t=todayStr(); DB.timelog={};
    const done=new Date(); done.setHours(10,15,0,0);
    DB.study.diag={v:1,sets:[{id:'dgOld',date:t,title:'옛 진단',status:'done',doneAt:done.toISOString(),sections:[]}]};
    DB.study.tests=[{id:'dgOld',date:t,kind:'diag',scope:'옛 진단',n:10,correct:5,secs:1365,sections:[]}];
    const n=stDiagBackfill(), rec=DB.study.tests[0];
    const exp=new Date(done.getTime()-1365000).toISOString();
    const again=stDiagBackfill();
    return {n,again,at:rec.at,exp,tl:JSON.stringify(DB.timelog)};});
  ok('B1 🔴 v4.90 진단 소급 — at = doneAt − 푼 시간 · 타임로그에',B.n===1&&B.at===B.exp&&/🩺 진단/.test(B.tl),JSON.stringify(B).slice(0,300));
  ok('B1b 한 번만(두 번 찍지 않는다)',B.again===0);
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t82 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
