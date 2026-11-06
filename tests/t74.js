/* t74 — 🔁 재점검 큐는 밀린 것부터 (학습사 v28 · v4.85)
   🔴 학습사: 「10/23 r2m 20문항에서 retestOn=10/22(17개)는 하나도 안 나왔다」
      원인: 재점검 +200 은 다 같고 처음 보는 단어 +100 이 얹혀 — 새로 넣은 단어가 밀린 재점검을 앞질렀다.
      실측(11/06): 10/29 분 3개가 8일째 밀려 있다.
   🔒 R1 재점검 대상은 retestOn 오래된 순 · R2 같은 날이면 miss 많은 순 · R3 재점검 대상이 그 밖의 단어(처음 보는 단어 포함)보다 앞
      R4 20문항을 뽑으면 밀린 3개가 반드시 들어간다 · R5 재점검이 아닌 단어는 옛 점수식 그대로 */
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
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(1500);
  const R=await p.evaluate(()=>{
    const t=todayStr(), d=(n)=>addDays(t,n);
    const W=[];
    /* 밀린 재점검 3개 — 이미 본 단어, miss 1 */
    for(let i=0;i<3;i++)W.push({id:'old'+i,kana:'ふる'+i,ko:'옛'+i,seen:3,miss:1,lastSeen:d(-9),retestOn:d(-8)});
    /* 어제 재점검 24개 — miss 다양 */
    for(let i=0;i<24;i++)W.push({id:'y'+i,kana:'きのう'+i,ko:'어제'+i,seen:2,miss:(i%5),lastSeen:d(-1),retestOn:d(-1)});
    /* 오늘 막 넣은 새 단어 30개 — retestOn 오늘, 한 번도 안 봄(옛 점수식에선 300점대로 최상위) */
    for(let i=0;i<30;i++)W.push({id:'n'+i,kana:'あたら'+i,ko:'새'+i,seen:0,miss:0,retestOn:t});
    /* 재점검 아님 */
    W.push({id:'p1',kana:'ふつう',ko:'보통',seen:5,miss:2,lastSeen:d(-3)});   /* v4.87 — miss 4/seen 5 면 「어려운 단어」로 빠진다 */
    W.push({id:'p2',kana:'みたこと',ko:'안본',seen:0,miss:0});
    DB.study.words=W;
    const pool=stDrillPool('r2m').map(w=>w.id);
    return {pool, top20:pool.slice(0,20), idxOld:['old0','old1','old2'].map(x=>pool.indexOf(x)),
      yMiss:pool.filter(x=>/^y/.test(x)).map(x=>W.find(w=>w.id===x).miss),
      firstNew:pool.findIndex(x=>/^n/.test(x)), lastY:Math.max(...pool.map((x,i)=>/^y/.test(x)?i:-1)),
      lastRe:Math.max(...pool.map((x,i)=>/^(old|y|n)/.test(x)?i:-1)), p:[pool.indexOf('p1'),pool.indexOf('p2')]};});
  ok('R1 🔴 밀린 재점검(8일 전)이 맨 앞',R.idxOld.every(i=>i>=0&&i<3),JSON.stringify(R.idxOld));
  ok('R4 20문항에 밀린 3개가 반드시 들어간다',['old0','old1','old2'].every(x=>R.top20.includes(x)),JSON.stringify(R.top20));
  ok('R1b 어제분이 오늘 새로 넣은 단어보다 먼저',R.lastY<R.firstNew,R.lastY+' / '+R.firstNew);
  ok('R2 같은 날이면 miss 많은 순',R.yMiss.every((m,i,a)=>i===0||a[i-1]>=m),JSON.stringify(R.yMiss));
  ok('R3 재점검 대상이 그 밖의 단어보다 앞',R.p.every(i=>i>R.lastRe),JSON.stringify(R.p)+' > '+R.lastRe);
  const R5=await p.evaluate(()=>{const W=[{id:'a',kana:'あ',ko:'가',seen:0,miss:0},{id:'b',kana:'い',ko:'나',seen:5,miss:3,lastSeen:addDays(todayStr(),-2)},
      {id:'c',kana:'う',ko:'다',seen:5,miss:0,lastSeen:addDays(todayStr(),-1)},{id:'d',kana:'え',ko:'라',seen:4,miss:1,lastSeen:addDays(todayStr(),-1)}];
    DB.study.words=W;return stDrillPool('r2m').map(w=>w.id).join('');});
  ok('R5 재점검이 없으면 옛 점수식 그대로(처음 본 단어 → miss 많은 순)',R5==='abdc',R5);
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t74 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
