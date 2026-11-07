/* t78 — 학습사 v30 정정 반영 (v4.88)
   「재출제는 된다(같은 날 반복이 streak 로 샌다) + 오답탭에 드릴 오답 파생 구역」
   🔒 C1 같은 단어는 하루 최대 2번 — 오늘 두 번 나온 단어는 출제에서 빠진다(보기로는 쓴다) · 기록에 ids
      M1 오답 탭에 「드릴 오답」 — miss≥2 · miss 많은 순 · 가나·뜻·miss/seen·품사·분류
      M2 파생이다 — study.errors 에 아무것도 안 생긴다
      M3 「오답 회전」 = 그 단어들로 r2m 세트 · 기록에 set:'miss' */
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
  const C=await p.evaluate(()=>{
    const t=todayStr(), W=[];
    for(let i=0;i<6;i++)W.push({id:'w'+i,kana:'か'+i,ko:'뜻'+i,seen:0,miss:0,streak:0});
    DB.study.words=W; DB.study.drills=[];
    const fin=()=>{ST_DRILL.res=ST_DRILL.ids.map(id=>({id,ok:true}));ST_DRILL.i=ST_DRILL.ids.length;stDrillFinish();ST_DRILL=null;};
    stDrillStart('r2m',6);fin(); stDrillStart('r2m',6);fin();
    const rec=DB.study.drills[0];
    stDrillStart('r2m',6); const third=ST_DRILL; ST_DRILL=null;
    return {ids:rec.ids&&rec.ids.length, counts:stTodayCounts(), third:third?third.ids.length:0};});
  ok('C1 기록에 실제로 낸 단어 ids',C.ids===6,JSON.stringify(C));
  ok('C1b 🔴 오늘 두 번 나온 단어는 세 번째 세트에 안 나온다',C.third===0&&Object.values(C.counts).every(n=>n===2),JSON.stringify(C));

  const M=await p.evaluate(()=>{
    const W=[{id:'m1',kana:'たすける',ko:'돕다',kanji:'助ける',seen:6,miss:4,streak:0,pos:'verb',cat:'native'},
      {id:'m2',kana:'ふかい',ko:'깊다',seen:5,miss:2,streak:0,pos:'i-adj',cat:'native'},
      {id:'m3',kana:'がっこう',ko:'학교',seen:5,miss:1,streak:0,pos:'noun',cat:'sino'}];
    for(let i=0;i<6;i++)W.push({id:'f'+i,kana:'ふ'+i,ko:'새'+i,seen:0,miss:0,streak:0});
    DB.study.words=W; DB.study.drills=[]; const e0=(DB.study.errors||[]).length;
    DB.ui.studyTab='err'; renderStudy();
    const txt=document.getElementById('v-study').innerText;
    const order=stMissWords().map(w=>w.id).join();
    stDrillStart('r2m',20,'miss'); const ids=ST_DRILL.ids.slice(), set=ST_DRILL.set;
    ST_DRILL.res=ids.map(id=>({id,ok:false}));ST_DRILL.i=ids.length;stDrillFinish();
    const last=DB.study.drills[DB.study.drills.length-1]; ST_DRILL=null;
    return {txt,order,ids,set,recSet:last.set,e1:(DB.study.errors||[]).length,e0};});
  ok('M1 🔴 오답 탭에 「드릴 오답」 — miss≥2 · 많이 틀린 순',/🈶 드릴 오답/.test(M.txt)&&M.order==='m1,m2',M.order);
  ok('M1b 가나 · 뜻 · miss/seen · 품사 · 분류',/たすける/.test(M.txt)&&/돕다/.test(M.txt)&&/4\/6/.test(M.txt)&&/동사/.test(M.txt)&&/고유어/.test(M.txt),M.txt.slice(0,600));
  ok('M2 파생이다 — 교재 오답노트(errors)에 안 생긴다',M.e1===M.e0,M.e0+'→'+M.e1);
  ok('M3 「오답 회전」은 그 단어들만 · 기록에 set:miss',M.ids.slice().sort().join()==='m1,m2'&&M.set==='miss'&&M.recSet==='miss',JSON.stringify(M.ids));
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t78 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
