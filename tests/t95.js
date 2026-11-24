/* t95 — 🎓 드릴 탭 시작 화면 = 한 줄 행 목록 (v5.03 · study-ui-spec S1)
   🔒 R1 행 틀: 단어 묶음은 ST_DRILL_UI 의 단어 행 전부 · 행마다 data-mode/data-grp · 옛 단추(.stdmode/.gmode/.mstbar) 없음
      R2 예문이 없으면 문법 묶음은 한 줄로 말한다(빈 서랍 금지 — 누르면 빈 화면인 ▶ 를 안 만든다)
      R3 단어 4개 이상인 뜻 맞히기는 열린다 · 막힌 행은 ▶ disabled + 이유 글
      R4 ▶ = 바로 시작 · 세트 크기 단추(10·20·40)가 기기에 남는다(DB.ui.stdN)
      R5 행을 누르면 펼친다(네 단계 수) · 다시 누르면 접는다(DB.ui.stOpen)
      R6 요약: 오늘 복습 · 시험까지 전체 · 메뉴 없으면 「오늘 메뉴」 칸 없음 · 듣기 묶음은 합에서 뺀다
      R7 폰(360): 듣기 묶음은 접힌 채 시작 · 누르면 펼치고 기억(DB.ui.stGrp) · 가로 스크롤 없음
      Z 에러 없음 */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
const FAKE=()=>{
  const S={kv:{},saves:0}; window.__S=S; const at=new Date().toISOString();
  const words=[];for(let i=0;i<60;i++)words.push({id:'w'+i,kana:'か'+i,kanji:'漢'+i,ko:'뜻'+i});
  const seed={transactions:[],budgets:{},goals:[],routines:[],checks:{},timelog:{},meals:{},accounts:[],cards:[],schemaVersion:9,actTzFixed:1};
  Object.keys(seed).forEach(k=>S.kv[k]={data:seed[k],rev:1,at});
  S.kv['study/words']={data:words,rev:1,at}; S.kv['study/drills']={data:[],rev:1,at}; S.kv['study/rest']={data:{v:1},rev:1,at}; S.kv.pref={data:{},rev:1,at};
  function q(name){const st={cols:'',inKeys:null};const o={select(c){st.cols=c||'';return o},eq(){return o},order(){return o},limit(){return o},
    in(c,ks){st.inKeys=ks;return o},gt(){return o},update(){return o},upsert(){return Promise.resolve({})},insert(){return Promise.resolve({data:[],error:null})},delete(){return o},
    maybeSingle(){return Promise.resolve({data:null,error:null})},
    then(a,b){let data=[];if(name==='app_kv'){let ks=Object.keys(S.kv);if(st.inKeys)ks=ks.filter(k=>st.inKeys.includes(k));
      data=ks.map(k=>({key:k,data:JSON.parse(JSON.stringify(S.kv[k].data)),rev:S.kv[k].rev,updated_at:S.kv[k].at}));}
      return Promise.resolve({data,error:null}).then(a,b);}};return o;}
  function rpc(fn,args){
    if(fn!=='kv_save')return Promise.resolve({data:{ok:true,diff:[]},error:null});
    S.saves++; const revs={},ats={};
    args.p_changes.forEach(c=>{const cur=S.kv[c.key];S.kv[c.key]={data:c.data,rev:cur?cur.rev+1:1,at:new Date().toISOString()};revs[c.key]=S.kv[c.key].rev;ats[c.key]=S.kv[c.key].at;});
    return Promise.resolve({data:{ok:true,revs,ats},error:null});}
  const ch={on(){return ch;},subscribe(){return ch;}};
  window.supabase={createClient:()=>({from:q,rpc,channel:()=>ch,
    auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};
};
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
  const ctx=await b.newContext({viewport:{width:1280,height:900}});
  await ctx.addInitScript(FAKE);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(2500);
  await p.evaluate(()=>{document.querySelector('.side .m[data-v="study"]').click();setStTab('word');});await p.waitForTimeout(400);

  const A=await p.evaluate(()=>{const v=document.getElementById('v-study'), rows=[...v.querySelectorAll('.drow[data-mode]')];
    const main=ST_DRILL_UI.filter(u=>u.tier==='main').map(u=>u.k), more=ST_DRILL_UI.filter(u=>u.tier==='more').map(u=>u.k);
    const inG=g=>[...v.querySelectorAll('.dgrp[data-grp="'+g+'"] .drow[data-mode]')].map(r=>r.dataset.mode);
    return {main, more, gotMain:inG('main'), gotMore:inG('more'), hid:rows.filter(r=>(stDUI(r.dataset.mode)||{}).tier==='hide').length,
      allGrp:rows.every(r=>!!r.dataset.grp), grps:[...v.querySelectorAll('.dgrp')].map(g=>g.dataset.grp),
      old:v.querySelectorAll('.stdmode,.gmode,.mstbar').length,
      gram:rows.filter(r=>r.dataset.grp==='gram').map(r=>r.textContent).join('|'), gramGo:v.querySelectorAll('.drow[data-grp="gram"] .drgo:not([disabled])').length,
      r2m:!!v.querySelector('.drow[data-mode="r2m"]:not(.off) .drgo:not([disabled])'),
      offOk:[...v.querySelectorAll('.drow.off')].every(r=>r.querySelector('.drgo').disabled&&!!r.querySelector('.drwhy'))};});
  /* 🗂 v5.18 — 메인 6(하루 메뉴 순서) · 더 보기 · 숨긴 드릴은 행이 없다 */
  ok('R1 메인 = 하루 메뉴 순서 6 · 더 보기 = 보조 · 숨김 행 0 · data-grp 가 다 있다',JSON.stringify(A.main)===JSON.stringify(A.gotMain)&&A.main.join()==='r2m,gpart,gpat,gmean,gctx,k2r'
     &&JSON.stringify(A.more)===JSON.stringify(A.gotMore)&&A.hid===0&&A.allGrp,JSON.stringify(A));
  ok('R1b 묶음 둘(메인·더 보기)',A.grps.join()==='main,more',JSON.stringify(A.grps));
  ok('R1c 옛 단추 틀이 없다',A.old===0,A.old);
  ok('R2 예문·문형이 없으면 문법 행은 이유를 쓰고 ▶ 가 막힌다',/예문이 없다/.test(A.gram)&&/문형 사전이 없다/.test(A.gram)&&A.gramGo===0,A.gram.slice(0,200));
  ok('R3 뜻 맞히기 행이 열려 있다',A.r2m);
  ok('R3b 막힌 행은 ▶ 가 눌리지 않고 이유를 쓴다',A.offOk);

  const G=await p.evaluate(()=>{const b=document.querySelector('#v-study .drow[data-mode="r2m"] .drgo');b.click();
    const n1=ST_DRILL?ST_DRILL.ids.length:-1; stDrillQuit();stDrillClose();
    stSetN(10); const b2=document.querySelector('#v-study .drow[data-mode="r2m"] .drgo'); b2.click();
    const n2=ST_DRILL?ST_DRILL.ids.length:-1; stDrillQuit();stDrillClose();
    const on=(document.querySelector('#v-study .dsetn button.on')||{}).textContent;
    stSetN(20); return {n1,n2,on,ui:DB.ui.stdN};});
  ok('R4 ▶ 가 바로 연다(기본 20)',G.n1===20,JSON.stringify(G));
  ok('R4b 세트 크기 10 → ▶ 10 · 단추 on · DB.ui.stdN',G.n2===10&&G.on==='10'&&G.ui===20,JSON.stringify(G));

  const O=await p.evaluate(()=>{const n=()=>document.querySelector('#v-study .drow[data-mode="r2m"] .drn');
    n().click(); const t=(document.querySelector('#v-study .drow[data-mode="r2m"] + .drx')||{}).textContent||'', st=DB.ui.stOpen;
    n().click(); return {t,st,closed:!document.querySelector('#v-study .drx'),st2:DB.ui.stOpen};});
  ok('R5 행을 누르면 펼친다 — 네 단계 수',/익힘/.test(O.t)&&/한 번 더/.test(O.t)&&/익히는 중/.test(O.t)&&/안 봄\s*60/.test(O.t)&&O.st==='r2m',JSON.stringify(O).slice(0,300));
  ok('R5b 다시 누르면 접는다',O.closed&&O.st2==null,JSON.stringify(O.st2));

  const S=await p.evaluate(()=>{const s=document.querySelector('#v-study .ssum');const t=s?s.textContent:'';
    let tot=0;ST_DRILL_UI.forEach(u=>{if(u.tier!=='hide'&&!stBlockWhy(u.k))tot+=stProg(u.k).total;});
    return {t,tot};});
  ok('R6 요약에 오늘 복습 · 시험까지 전체 · 메뉴 칸 없음',/오늘 복습/.test(S.t)&&/시험까지 전체/.test(S.t)&&!/오늘 메뉴/.test(S.t),S.t.slice(0,200));
  ok('R6b 전체 합 = 탭에 보이는 열린 행 합',new RegExp('/\\s*'+S.tot.toLocaleString('ko-KR')+'(?!\\d)').test(S.t),S.tot+' / '+S.t.slice(0,200));
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();

  /* 폰 */
  const c2=await b.newContext({viewport:{width:360,height:780}});
  await c2.addInitScript(FAKE);
  const q=await c2.newPage();const e2=[];q.on('pageerror',e=>e2.push(e.message));
  await q.route('**/*supabase*',r=>r.abort());
  await q.goto('file://'+file);await q.waitForTimeout(2500);
  await q.evaluate(()=>{gotoTab('study');setStTab('word');});await q.waitForTimeout(400);
  const P=await q.evaluate(()=>{const g=()=>document.querySelector('#v-study .dgrp[data-grp="more"]');
    const r0=g().querySelectorAll('.drow').length; g().querySelector('.dgh').click();
    const r1=g().querySelectorAll('.drow').length;
    return {r0,r1,mem:DB.ui.stGrp&&DB.ui.stGrp.more===false,sw:document.documentElement.scrollWidth};});
  ok('R7 폰: 더 보기 묶음은 접힌 채 시작 · 누르면 펼친다 · 기억',P.r0===0&&P.r1>0&&P.mem,JSON.stringify(P));
  ok('R7b 폰: 가로 스크롤 없음',P.sw<=360,P.sw);
  ok('Z2 폰 에러 없음',e2.length===0,e2.join(' | '));
  await c2.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t95 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
