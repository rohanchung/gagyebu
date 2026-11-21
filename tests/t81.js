/* t81 — 🩺 진단 모드(학습방 study-diag-mode v1) · 🃏 드릴 오답 카드(학습사 id8 11/8) (v4.90)
   🔒 D1 ready 세트가 있으면 헤더에 「🩺 진단」 · D2 처음 열 때 문항 확정(drawn) — seen≥1 · 오늘 본 것 제외 · 섹션 사이 중복 없음
      D3 진행 중엔 정답을 안 보여주고 카운터(seen·miss·streak)를 안 바꾼다 · 서버로 안 보낸다
      D4 섹션 사이엔 다음 섹션 이름 · D5 제출 → tests(kind:diag, sections) · 세트 done · 틀린 단어만 retestOn 내일
      D6 결과: 밴드 A/B/C · 청해 입력 · 오답 복습 · D7 키보드(숫자·엔터) · D8 같은 날 이어 풀기(새로고침해도 같은 문항)
      O1 틀리면 오답 카드: 한자 · 고른 것의 정체 · 같은 소리 · 예문 · O2 drills.picks · O3 결과 화면에 고른 것 */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
const SEED=()=>{
  const t=todayStr(), y=addDays(t,-1), W=[];
  const K=[['あめ','雨','비'],['あし','足','다리'],['あさ','朝','아침'],['いえ','家','집'],['うみ','海','바다'],['かわ','川','강'],['やま','山','산'],['はな','花','꽃'],
    ['みず','水','물'],['ひと','人','사람'],['くち','口','입'],['みみ','耳','귀'],['てら','寺','절'],['まち','町','마을'],['むら','村','시골'],['もり','森','숲']];
  K.forEach((k,i)=>W.push({id:'w'+i,kana:k[0],kanji:k[1],ko:k[2],pos:'noun',cat:'native',seen:2,miss:1,streak:1,lastSeen:y}));
  W.push({id:'h1',kana:'はし',kanji:'橋',ko:'다리(교량)',pos:'noun',seen:2,miss:0,streak:1,lastSeen:y});
  W.push({id:'h2',kana:'はし',kanji:'箸',ko:'젓가락',pos:'noun',seen:2,miss:0,streak:1,lastSeen:y});
  W.push({id:'td',kana:'きょう',kanji:'今日',ko:'오늘',seen:3,miss:0,streak:1,lastSeen:t});   /* 오늘 본 것 — 빠져야 한다 */
  W.push({id:'nw',kana:'あたらしい',kanji:'新しい',ko:'새롭다',seen:0,miss:0,streak:0});     /* 한 번도 안 본 것 — 빠져야 한다 */
  DB.study.words=W;
  const S=[];
  const C=[['わたしは まいにち がっこうへ いきます。','がっこう',['びょういん','こうえん','えき']],['あさ はやく おきて しんぶんを よみます。','しんぶん',['てがみ','ざっし','しゅくだい']],
    ['きのう デパートで くつを かいました。','くつ',['かさ','ぼうし','とけい']]];
  C.forEach((c,i)=>S.push({id:'c'+i,ja:c[0],ko:'뜻'+i,slots:[{kind:'ctx',target:c[1],opts:c[2]}],gloss:i===0?[{w:'あめ',ko:'비',wordId:'w0'}]:[]}));
  S.push({id:'g0',ja:'あめが ふって いたので でかけませんでした。',ko:'비가 와서',slots:[],gloss:[{w:'あめ',ko:'비',wordId:'w0'}]});
  DB.study.sents=S;
  DB.study.tests=[]; DB.study.drills=[];
  DB.study.diag={v:1,sets:[{id:'dg01',date:t,title:'자체 진단 1회',targetMin:45,status:'ready',sections:[
    {k:'kana',n:3,src:'auto',band:null,from:'words',mode:'r2m',label:'가나 인지 (지표)'},
    {k:'kread',n:2,src:'auto',band:'vocab',from:'words',mode:'k2r',label:'한자읽기 (もんだい1)'},
    {k:'ctx',n:2,src:'auto',band:'vocab',from:'sents',slotKind:'ctx',label:'문맥규정 (もんだい3)'},
    {k:'para',src:'items',band:'vocab',label:'유의표현 (もんだい4)',items:[{id:'p1',q:'この へやは くらいです。',ans:0,ko:'어둡다',why:'くらい↔あかるい',opts:['A あかるくない','B ひろくない','C しずかじゃない','D きれいじゃない']}]},
    {k:'read',src:'items',band:'read',label:'독해 (단문)',passages:[{id:'r1',text:'たなかさんへ\nあした かいぎが あります。',ko:'회의',qs:[{id:'r1a',q:'なにが ありますか。',ans:1,why:'かいぎ',opts:['しけん','かいぎ','パーティー','りょこう']}]}]},
    {k:'listen',src:'manual',band:'listen',label:'청해 (직접 입력)'}]}]};
};
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
  await p.evaluate('('+SEED.toString()+')()');
  await p.evaluate(()=>{document.querySelector('.side .m[data-v="study"]').click();});await p.waitForTimeout(300);
  /* D1 */
  const d1=await p.evaluate(()=>{const b=[...document.querySelectorAll('#v-study button')].find(x=>/🩺 진단/.test(x.textContent));return b&&!b.disabled;});
  ok('D1 ready 세트가 있으면 🩺 진단 탭 · 시작 버튼 (v4.91)',d1&&(await p.evaluate(()=>stPaneDiagTab().indexOf("stDiagOpen('dg01')")>=0&&/🩺 시작/.test(stPaneDiagTab()))));
  /* D2 */
  const before=await p.evaluate(()=>JSON.stringify(DB.study.words.map(w=>JSON.stringify(w.m||{})+[w.seen,w.miss,w.streak,w.lastSeen])));
  await p.evaluate(()=>stDiagOpen('dg01'));await p.waitForTimeout(200);
  const D2=await p.evaluate(()=>{const s=stDiagById('dg01'),qs=s.drawn.qs;const by={};qs.forEach(q=>by[q.sec]=(by[q.sec]||0)+1);
    const wids=qs.filter(q=>q.t==='w').map(q=>q.ref);
    return {by,wids,dup:wids.length!==new Set(wids).size,txt:document.getElementById('v-study').innerText,
      okAns:qs.every(q=>q.ans>=0&&q.ans<q.opts.length)};});
  ok('D2 🔴 처음 열 때 문항 확정 — 섹션별 개수',D2.by.kana===3&&D2.by.kread===2&&D2.by.ctx===2&&D2.by.para===1&&D2.by.read===1,JSON.stringify(D2.by));
  ok('D2b 오늘 본 것·한 번도 안 본 것 제외 · 섹션 사이 중복 없음',!D2.wids.includes('td')&&!D2.wids.includes('nw')&&!D2.dup,JSON.stringify(D2.wids));
  ok('D2c 정답 자리가 보기 안에 있다',D2.okAns);
  ok('D2d 시작 화면: 문항 수 · 목표 시간 · 규칙',/9문항/.test(D2.txt)&&/목표 45분/.test(D2.txt)&&/정답·해설을 안 보여준다/.test(D2.txt),D2.txt.slice(0,400));
  /* D7 엔터로 시작 · D4 섹션 이름 */
  await p.keyboard.press('Enter');await p.waitForTimeout(150);
  const g0=await p.evaluate(()=>document.getElementById('v-study').innerText);
  ok('D4a 시작하면 바로 첫 문항(시작 화면이 섹션 안내를 대신한다)',/가나 인지/.test(g0)&&/1\/9/.test(g0),g0.slice(0,300));
  /* 첫 문항 — 숫자키로 틀린 답 */
  const wrongKey=await p.evaluate(()=>{const s=stDiagById('dg01'),q=s.drawn.qs[0];return String(((q.ans+1)%4)+1);});
  const saves0=await p.evaluate(()=>window.__saves=0);
  await p.evaluate(()=>{const o=window.save;window.save=function(){window.__saves++;return o.apply(this,arguments);};});
  await p.keyboard.press(wrongKey);await p.waitForTimeout(150);
  const D3=await p.evaluate(()=>({txt:document.getElementById('v-study').innerText,r:DB.ui.diagRun}));
  ok('D7 숫자키로 고른다',D3.r&&D3.r.i===1&&Object.keys(D3.r.a).length===1,JSON.stringify(D3.r&&D3.r.a));
  ok('D3 🔴 진행 중엔 정답·맞음/틀림을 안 보여준다',!/맞음|틀림/.test(D3.txt),D3.txt.slice(0,200));
  await p.evaluate(()=>{const s=stDiagById('dg01'),qs=s.drawn.qs;stDiagPick(qs[1].ans);stDiagPick(qs[2].ans);});
  const g1=await p.evaluate(()=>document.getElementById('v-study').innerText);
  ok('D4 🔴 섹션이 바뀌면 다음 섹션 이름만(보기 없이)',/다음 섹션/.test(g1)&&/한자읽기/.test(g1),g1.slice(0,400));
  ok('D4b 섹션 안내 화면엔 보기가 없다',await p.evaluate(()=>!document.querySelector('#v-study .dgq')));
  await p.keyboard.press('Enter');await p.waitForTimeout(150);
  /* 나머지: 정답·오답 섞어 끝까지 (첫 단어 문항만 틀림, 문맥 1개는 모르겠다) */
  await p.evaluate(()=>{const s=stDiagById('dg01'),qs=s.drawn.qs;
    while(DB.ui.diagRun.i<qs.length){const r=DB.ui.diagRun;if(r.gate!==r.i){stDiagGate();continue;}const q=qs[r.i];
      stDiagPick(q.sec==='ctx'&&!window.__dk?(window.__dk=1,null):q.ans);}});
  const after=await p.evaluate(()=>JSON.stringify(DB.study.words.map(w=>JSON.stringify(w.m||{})+[w.seen,w.miss,w.streak,w.lastSeen])));
  ok('D3b 🔴 카운터(seen·miss·streak·lastSeen)가 안 바뀐다',before===after);
  ok('D3c 문항마다 서버 저장 안 한다',await p.evaluate(()=>window.__saves)===0,await p.evaluate(()=>window.__saves));
  const end=await p.evaluate(()=>document.getElementById('v-study').innerText);
  ok('D5a 다 풀면 청해 입력 · 제출',/다 풀었다/.test(end)&&/제출/.test(end),end.slice(0,300));
  await p.fill('#dg_ln','6');await p.fill('#dg_lc','3');
  await p.evaluate(()=>document.activeElement&&document.activeElement.blur());
  const wid=await p.evaluate(()=>stDiagById('dg01').drawn.qs[0].ref);
  await p.keyboard.press('Enter');await p.waitForTimeout(200);
  const D5=await p.evaluate(wid=>{const t=DB.study.tests.find(x=>x.id==='dg01'),s=stDiagById('dg01');
    return {t,st:s.status,ans:!!s.answers,ret:(w=>{let r=null;Object.keys(w.m||{}).forEach(k=>{if(w.m[k].retestOn)r=w.m[k].retestOn;});return r;})(stWordById(wid)),tom:addDays(todayStr(),1),
      others:DB.study.words.filter(w=>w.id!==wid&&Object.keys(w.m||{}).some(k=>w.m[k].retestOn)).map(w=>w.id),txt:document.getElementById('v-study').innerText,run:!!DB.ui.diagRun};},wid);
  ok('D5 🔴 tests 에 kind:diag · n/correct · sections · listen',D5.t&&D5.t.kind==='diag'&&D5.t.n===9&&D5.t.correct===7&&D5.t.sections.length===5
     &&D5.t.listen&&D5.t.listen.n===6&&D5.t.listen.correct===3&&D5.t.dunno===1,JSON.stringify(D5.t));
  ok('D5b 섹션 기록 {k,label,band,n,correct,secs}',D5.t&&D5.t.sections.every(s=>'k' in s&&'label' in s&&'band' in s&&'n' in s&&'correct' in s&&'secs' in s)&&D5.t.sections[0].band===null);
  ok('D5c 세트 done · 진행 상태 정리',D5.st==='done'&&D5.ans&&!D5.run);
  ok('D5d 틀린 단어만 retestOn 내일',D5.ret===D5.tom&&D5.others.length===0,JSON.stringify([D5.ret,D5.others]));
  ok('D6 결과: 밴드 A/B/C · 가나 인지 따로 · 청해 %',/문자·어휘/.test(D5.txt)&&/독해/.test(D5.txt)&&/가나 인지/.test(D5.txt)&&/청해\(직접 입력\) 3\/6 · 50%/.test(D5.txt)&&/합격선으로 바꿔 말하지 않는다/.test(D5.txt),D5.txt.slice(0,700));
  ok('D6b 오답 복습 — 틀린 것 2개 · 모르겠다',/틀린 것 2개/.test(D5.txt)&&/모르겠다/.test(D5.txt),D5.txt.slice(0,900));
  const d1b=await p.evaluate(()=>{const h=stPaneDiagTab();return /📝 기록/.test(h)&&h.indexOf("stDiagOpen('dg01')")>=0&&/📈 추이/.test(h);});
  ok('D1b 끝난 뒤엔 진단 탭 기록 줄 → 결과 · 추이 (v4.91)',d1b);

  /* D8 — 같은 날 이어 풀기 · 문항 고정 */
  const D8=await p.evaluate(()=>{const s=stDiagById('dg01');s.status='ready';delete s.answers;
    const ids=s.drawn.qs.map(q=>q.q).join();stDiagOpen('dg01');stDiagStart(true);stDiagGate();stDiagPick(0);
    const i1=DB.ui.diagRun.i; stDiagClose(); stDiagOpen('dg01');
    const same=stDiagById('dg01').drawn.qs.map(q=>q.q).join()===ids, txt=document.getElementById('v-study').innerText;
    return {i1,same,resume:/이어서 풀기 · 2\//.test(txt)};});
  ok('D8 나갔다 와도 같은 문항 · 이어서',D8.same&&D8.i1===1&&D8.resume,JSON.stringify(D8));
  await p.evaluate(()=>stDiagClose());

  /* O1~O3 — 오답 카드 */
  const O=await p.evaluate(()=>{
    DB.study.drills=[];
    DB.study.words.forEach(w=>{w.lastSeen=addDays(todayStr(),-3);w.retestOn=addDays(todayStr(),-1);});
    stDrillStart('r2m',4);
    /* w1(あし 다리)을 내고 오답으로 h1(はし 다리(교량))이 아닌 다른 뜻을 고른다 */
    ST_DRILL.ids[0]='w1'; ST_DRILL.opts[0]=['다리','비','아침','집'];
    stDrillGrade('비');
    const txt=document.getElementById('v-study').innerText, html=document.getElementById('v-study').innerHTML;
    const chose=ST_DRILL.res[0].chose;
    stDrillNext();
    /* 두 번째 — 모르겠다 */
    stDrillDunno(); stDrillQuit();
    const rec=DB.study.drills[DB.study.drills.length-1], res=document.getElementById('v-study').innerText;
    return {txt,html,chose,picks:rec.picks,res};});
  ok('O1 🔴 오답 카드: 정답 가나·한자·뜻·품사',/あし/.test(O.txt)&&/足/.test(O.txt)&&/다리/.test(O.txt)&&/명사/.test(O.txt),O.txt.slice(0,500));
  ok('O1b 내가 고른 것의 정체(비 = あめ 雨) · 닮은 소리 강조',/정답 ↔ 내가 고른 것/.test(O.txt)&&/あめ/.test(O.txt)&&/雨/.test(O.txt)&&/class="smk"/.test(O.html),O.txt.slice(0,500));
  ok('O1c 헷갈리기 쉬운(한 글자 차이) · 예문 없음은 생략',/헷갈리기 쉬운/.test(O.txt),O.txt.slice(0,600));
  ok('O1d 「확인」을 눌러야 넘어간다',/확인 · 다음/.test(O.txt));
  ok('O2 🔴 drills.picks [{id,chose}] — 모르겠다는 null',Array.isArray(O.picks)&&O.picks.length===2&&O.picks[0].id==='w1'&&O.picks[0].chose==='w0'&&O.picks[1].chose===null,JSON.stringify(O.picks));
  ok('O3 결과 화면: 가나·한자·뜻 + 고른 것',/고른 것/.test(O.res)&&/雨/.test(O.res)&&/모르겠다/.test(O.res),O.res.slice(0,500));
  /* 같은 소리 · 예문 */
  const H=await p.evaluate(()=>{stDrillClose();stDrillStart('r2m',4);ST_DRILL.ids[0]='w0';ST_DRILL.opts[0]=['비','다리','아침','집'];stDrillGrade('다리');
    const a=document.getElementById('v-study').innerText;stDrillClose();
    stDrillStart('k2r',4);ST_DRILL.ids[0]='h1';ST_DRILL.opts[0]=['はし','はじ','ばし','あし'];stDrillGrade('はじ');
    const b2=document.getElementById('v-study').innerText;stDrillClose();return {a,b:b2};});
  ok('O1e 예문(gloss.wordId)',/예문/.test(H.a)&&/まいにち がっこうへ/.test(H.a)&&/뜻0/.test(H.a),H.a.slice(0,600));
  ok('O1f 같은 소리(はし 橋 / 箸) · 단어장에 없는 꼴',/같은 소리/.test(H.b)&&/箸/.test(H.b)&&/단어장에 없는 꼴/.test(H.b),H.b.slice(0,600));
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t81 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
