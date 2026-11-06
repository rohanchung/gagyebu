/* t77 — 🈶 드릴 시간도 데일리 로그에 (v4.87)
   로한 11/6: 「드릴 했던 시간도 그 데일리로그에 시간으로 표현되게 해줘. 현재 뽀모도로처럼」
   🔒 D1 드릴을 끝내면 그 시간대가 타임로그에 study 로 찍힌다(제목 「🈶 드릴 · 모드 N문항」) · 기록에 at
      D2 다른 활동이 찬 칸이면 서브(tag2)로 붙는다 — 칸을 빼앗지 않는다
      D3 학습 분은 실제 분이다 — 3분 드릴이 30분이 되지 않는다
      D4 뽀모 안에서 한 드릴은 두 번 세지 않는다(칸마다 큰 쪽)
      D5 시각이 없는 옛 드릴은 로그에 안 찍는다(지어내지 않는다) */
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
  const R=await p.evaluate(()=>{
    const t=todayStr(), Y=+t.slice(0,4),M=+t.slice(5,7)-1,Dd=+t.slice(8,10);
    const at=(h,m)=>new Date(Y,M,Dd,h,m,0).getTime();
    DB.timelog={}; DB.study.pomos=[]; DB.study.drills=[];
    DB.study.words=[];for(let i=0;i<10;i++)DB.study.words.push({id:'w'+i,kana:'か'+i,ko:'뜻'+i,seen:0,miss:0,streak:0});
    const run=(startMs,secs)=>{stDrillStart('r2m',3);ST_DRILL.start=startMs;
      ST_DRILL.res=[{id:ST_DRILL.ids[0],ok:true},{id:ST_DRILL.ids[1],ok:true},{id:ST_DRILL.ids[2],ok:false}];ST_DRILL.i=3;
      const realNow=Date.now; Date.now=()=>startMs+secs*1000; try{stDrillFinish();}finally{Date.now=realNow;} ST_DRILL=null;};
    /* D1·D3 — 09:05 에 3분 드릴, 빈 칸 */
    run(at(9,5),180);
    const r1=DB.study.drills[0], blk1=(DB.timelog[t]||[]).find(x=>x.s===18);
    const m1=stStudyMins(t);
    /* D2 — 14:00~16:00 일(work) 블록 안에서 4분 드릴 */
    DB.timelog[t].push({s:28,e:31,tag:'work',title:'출근',code:null});
    run(at(14,40),240);
    const blk2=(DB.timelog[t]||[]).find(x=>x.s<=29&&x.e>=29);
    /* D4 — 20:00 25분 뽀모 안에서 20:10 5분 드릴 */
    DB.study.pomos.push({id:'pm1',at:new Date(at(20,0)).toISOString(),mins:25,plan:25});
    stPomoLog(DB.study.pomos[0]);
    run(at(20,10),300);
    const m4=stStudyMins(t);
    /* D5 — 시각 없는 옛 드릴 */
    DB.study.drills.push({id:'old',date:t,mode:'r2m',n:20,correct:10,secs:600,wrongIds:[]});
    const m5=stStudyMins(t), n5=(DB.timelog[t]||[]).length;
    stDrillLog(DB.study.drills[DB.study.drills.length-1]);
    const n5b=(DB.timelog[t]||[]).length;
    return {at1:!!r1.at,blk1,m1,blk2,m4,m5,n5,n5b};});
  ok('D1 🔴 드릴을 끝내면 그 시간대가 study 로 찍힌다',R.at1&&R.blk1&&R.blk1.tag==='study'&&/🈶 드릴 · 히라가나 → 뜻 3문항/.test(R.blk1.title),JSON.stringify(R.blk1));
  ok('D3 학습 분은 실제 분 — 3분 드릴은 3분(30분이 아니다)',R.m1===3,R.m1);
  ok('D2 일하던 칸이면 서브(tag2 study)로 붙는다',R.blk2&&R.blk2.tag==='work'&&R.blk2.tag2==='study',JSON.stringify(R.blk2));
  ok('D4 뽀모 안의 드릴은 두 번 세지 않는다(3+4+25 = 32)',R.m4===32,R.m4);
  ok('D5 시각 없는 옛 드릴은 로그에 안 찍는다',R.n5===R.n5b&&R.m5===32,JSON.stringify(R));
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t77 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
