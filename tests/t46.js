/* v4.13 3자 병합 — 학습방 v18 "학습방에서 올린 데이터 지우지 마라"(사고 4회).
   가짜 서버는 실제 DB 처럼 ① eq(updated_at) 잠금을 지키고 ② 방이 쓰면 트리거(app_state_bump)처럼 updated_at 을 올린다.
   🔒 각 시나리오: 앱이 로드 → 방이 서버를 고침 → 앱이 자기 변경을 저장 → 결과에 **양쪽이 다 살아 있어야** 한다. */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const FILE=process.argv[2]||path.join(__dirname,'..','index.html');
const W=(id,ko,extra)=>Object.assign({id,lv:'N4',src:'b1:150',kana:'か'+id,kanji:'漢'+id,ko,cat:'sino',flag:false,seen:0,miss:0,streak:0,lastSeen:null},extra||{});
const BASE={schemaVersion:7,goals:[],routines:[],checks:{},rewards:[],rewardCards:{},rewardCfg:{weekFullDays:4,monthWeeks:4,yearMonths:9},
 ui:{month:'2026-09'},accounts:[],transactions:[],categories:[{id:'c1',name:'식비',type:'expense'}],cards:[],debts:[],journal:[{id:'j1',date:'2026-09-01',t:'a'}],items:[],logs:[],
 health:{weights:[],labs:[],labDates:[],labTypes:[],labMeds:[],labValues:{},events:[]},
 meals:{'2026-09-20':{b:{p:'',a:'밥'}}},
 study:{v:1,words:[W('w1','가다'),W('w2','오다')],
   sents:[{id:'s1',src:'b1:199',ja:'雨が 降って いました。',ko:'비',slots:[],seen:0,miss:0,streak:0,lastSeen:null}],
   units:[{id:'u1',ch:'home',title:'과제1',day:'2026-09-19',due:'2026-09-19',backlog:false,status:'todo',carried:0},
          {id:'u2',ch:'home',title:'과제1(중복)',day:'2026-09-19',due:'2026-09-19',backlog:false,status:'todo',carried:0}],
   errors:[{id:'e1',date:'2026-09-10',kind:'vocab',q:'옛 오답',myAns:'',ans:'',note:'',testId:'',hits:0,cleared:false,lastSeen:null}],
   tests:[],drills:[],pomos:[],phases:[{id:'P1',name:'기초',start:'2026-09-07',end:'2026-09-30'}],books:[],week:{},month:{},logs:{}}};

const INIT=({st})=>{
  const S={v:JSON.parse(JSON.stringify(st)),at:'2026-09-19T00:00:00.000Z',snaps:[],updates:0,hook:null,n:0};
  window.__S=S;
  /* 방의 쓰기 — 트리거가 updated_at 을 올린다 */
  window.__room=fn=>{fn(S.v);S.at=new Date(Date.UTC(2026,8,19,1,0,S.n++)).toISOString();};
  function mk(t){let mode='select',payload=null;const f={};const q={
    select(){ if(mode==='update'&&t==='app_state'){
        S.updates++;
        const ok=(f.updated_at===undefined)||(f.updated_at===S.at);
        if(!ok)return Promise.resolve({data:[],error:null});
        S.v=JSON.parse(JSON.stringify(payload.data));S.at=payload.updated_at;
        if(S.hook){const h=S.hook;S.hook=null;h();}
        return Promise.resolve({data:[{updated_at:S.at}],error:null});}
      return q;},
    eq(k,v){f[k]=v;return q;},order(){return q},limit(){return q},in(){return q},delete(){return q},
    maybeSingle(){return Promise.resolve({data:t==='app_state'?{data:JSON.parse(JSON.stringify(S.v)),updated_at:S.at}:null,error:null});},
    update(p){mode='update';payload=p;return q;},
    upsert(r){if(t==='app_state'){S.v=JSON.parse(JSON.stringify(r.data));S.at=r.updated_at;}return Promise.resolve({data:null,error:null});},
    insert(r){if(t==='app_state_snap')S.snaps.push(r);return Promise.resolve({data:[],error:null});},
    then(a,b){return Promise.resolve({data:[],error:null}).then(a,b);}};return q;}
  window.supabase={createClient:()=>({from:t=>mk(t),auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};
};
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 const R=[];const ok=(n,v,x)=>R.push({n,v:!!v,x});
 async function boot(){
   const c=await b.newContext();await c.addInitScript(INIT,{st:BASE});
   const p=await c.newPage(),errs=[],dlg=[];
   p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>{dlg.push(d.message().slice(0,50));d.accept();});
   await p.route('https://**/*',r=>r.abort());
   await p.goto('file:///'+FILE.replace(/\\/g,'/').replace(/^\//,''));
   await p.waitForFunction(()=>typeof DB!=='undefined'&&DB&&DB.study);await p.waitForTimeout(500);
   return {c,p,errs,dlg};
 }
 const srv=(p,f)=>p.evaluate(f);
 try{
 /* ── ① 학습방 v18 사고 재현: 방이 sents 를 이어붙임 → 앱은 드릴 채점만 → 저장 ── */
 {const {c,p,errs,dlg}=await boot();
  await p.evaluate(()=>__room(v=>{v.study.sents.push({id:'r011',src:'robert',ja:'新しい 例文です。',ko:'새 예문',slots:[]});}));
  await p.evaluate(()=>{const s=DB.study.sents[0];s.seen=1;s.miss=1;s.lastSeen='2026-09-19';save();});
  await p.waitForTimeout(1500);
  const r=await srv(p,()=>({ids:__S.v.study.sents.map(x=>x.id),s1:__S.v.study.sents.find(x=>x.id==='s1'),mine:DB.study.sents.map(x=>x.id)}));
  ok('A1 방이 넣은 r011 이 서버에 남는다(v18 사고)',r.ids.includes('r011'),JSON.stringify(r.ids));
  ok('A2 앱의 채점(seen·miss·lastSeen)도 남는다',r.s1.seen===1&&r.s1.miss===1&&r.s1.lastSeen==='2026-09-19',JSON.stringify(r.s1));
  ok('A3 내 화면에도 r011 이 들어온다',r.mine.includes('r011'));
  ok('A4 확인창 없음',dlg.length===0,dlg.join('|'));
  ok('A5 에러 0',errs.length===0,errs[0]);
  await c.close();}

 /* ── ② 같은 레코드, 다른 필드: 방이 오타(ko)를 고치고 앱은 카운터(miss)만 ── */
 {const {c,p,errs}=await boot();
  await p.evaluate(()=>__room(v=>{v.study.words[0].ko='가다 (고침)';v.study.sents[0].slots=[{kind:'conj',target:'降って',opts:['a','b','c'],why:'x'}];}));
  await p.evaluate(()=>{DB.study.words[0].miss=2;DB.study.sents[0].seen=3;save();});
  await p.waitForTimeout(1500);
  const r=await srv(p,()=>({w:__S.v.study.words[0],s:__S.v.study.sents[0]}));
  ok('B1 방이 고친 뜻이 산다',r.w.ko==='가다 (고침)',r.w.ko);
  ok('B2 앱이 바꾼 miss 도 산다',r.w.miss===2);
  ok('B3 방이 단 slots 가 산다',r.s.slots.length===1&&r.s.seen===3,JSON.stringify(r.s));
  ok('B4 에러 0',errs.length===0,errs[0]);
  await c.close();}

 /* ── ③ 방이 지운 레코드를 앱이 되살리지 않는다(units 중복 재발 원인) ── */
 {const {c,p,errs}=await boot();
  await p.evaluate(()=>__room(v=>{v.study.units=v.study.units.filter(u=>u.id!=='u2');}));
  await p.evaluate(()=>{DB.study.units.find(u=>u.id==='u1').status='done';save();});
  await p.waitForTimeout(1500);
  const r=await srv(p,()=>__S.v.study.units.map(u=>u.id+':'+u.status));
  ok('C1 방이 지운 u2 가 안 살아난다',!r.some(x=>x.startsWith('u2')),JSON.stringify(r));
  ok('C2 앱의 완료 체크는 남는다',r.includes('u1:done'),JSON.stringify(r));
  ok('C3 에러 0',errs.length===0,errs[0]);
  await c.close();}

 /* ── ④ 앱이 지운 오답은 안 살아나고, 방이 승격한 오답은 산다 ── */
 {const {c,p,errs}=await boot();
  await p.evaluate(()=>__room(v=>{v.study.errors.push({id:'e9',date:'2026-09-19',kind:'vocab',q:'승격',hits:0,cleared:false});}));
  await p.evaluate(()=>{DB.study.errors=DB.study.errors.filter(e=>e.id!=='e1');save();});
  await p.waitForTimeout(1500);
  const r=await srv(p,()=>__S.v.study.errors.map(e=>e.id));
  ok('D1 방이 승격한 e9 가 산다',r.includes('e9'),JSON.stringify(r));
  ok('D2 앱이 지운 e1 은 안 살아난다',!r.includes('e1'),JSON.stringify(r));
  ok('D3 에러 0',errs.length===0,errs[0]);
  await c.close();}

 /* ── ⑤ 생활방의 식단 제안(meals.p)과 앱의 실제 식사(meals.a) — 같은 칸의 다른 필드 ── */
 {const {c,p,errs}=await boot();
  await p.evaluate(()=>__room(v=>{v.meals['2026-09-20'].b.p='현미밥+달걀';v.meals['2026-09-21']={b:{p:'오트밀',a:''}};}));
  await p.evaluate(()=>{DB.meals['2026-09-20'].b.a='김밥';DB.journal.push({id:'j3',date:'2026-09-20',t:'z'});save();});
  await p.waitForTimeout(1500);
  const r=await srv(p,()=>({m:__S.v.meals,j:__S.v.journal.map(x=>x.id)}));
  ok('E1 생활방 제안(p)이 산다',r.m['2026-09-20'].b.p==='현미밥+달걀',JSON.stringify(r.m));
  ok('E2 내가 먹은 것(a)도 산다',r.m['2026-09-20'].b.a==='김밥');
  ok('E3 새 날짜 제안도 산다',!!r.m['2026-09-21']);
  ok('E4 다른 컬렉션(일지) 변경도 같이 저장',r.j.includes('j3'));
  ok('E5 에러 0',errs.length===0,errs[0]);
  await c.close();}

 /* ── ⑥ 같은 칸을 양쪽이 다르게 → 내 것 + 서버본 스냅샷 ── */
 {const {c,p,errs,dlg}=await boot();
  await p.evaluate(()=>__room(v=>{v.study.words[1].ko='방이 고친 뜻';}));
  await p.evaluate(()=>{DB.study.words[1].ko='내가 고친 뜻';save();});
  await p.waitForTimeout(1500);
  const r=await srv(p,()=>({ko:__S.v.study.words[1].ko,snaps:__S.snaps.map(s=>s.kind),snapKo:((__S.snaps.find(s=>s.kind==='pre_overwrite')||{data:{study:{words:[{},{}]}}}).data.study.words[1].ko),badge:document.getElementById('savebadge').textContent}));
  ok('F1 같은 칸은 내 것',r.ko==='내가 고친 뜻',r.ko);
  ok('F2 덮기 전 서버본 스냅샷',r.snaps.includes('pre_overwrite')&&r.snapKo==='방이 고친 뜻',JSON.stringify(r.snaps));
  ok('F3 확인창 없음',dlg.length===0,dlg.join('|'));
  ok('F4 에러 0',errs.length===0,errs[0]);
  await c.close();}

 /* ── ⑦ 병합해서 저장하는 그 순간 방이 또 씀 → 다시 읽어 다시 병합(옛 upsert 는 이걸 날렸다) ── */
 {const {c,p,errs}=await boot();
  await p.evaluate(()=>__room(v=>{v.study.sents.push({id:'r012',ja:'一',ko:'1',slots:[]});}));
  await p.evaluate(()=>{
    /* 첫 조건부 update 는 실패(충돌) → 병합 → 두 번째 update 직전에 방이 한 번 더 쓴다 */
    const S=__S,orig=S.at;let armed=true;
    const origRoom=__room;
    window.__raceOnce=()=>{if(armed){armed=false;origRoom(v=>{v.study.sents.push({id:'r013',ja:'二',ko:'2',slots:[]});});}};
    const mk=SB.from.bind(SB);
    SB.from=t=>{const q=mk(t);const u=q.update;q.update=function(pl){if(t==='app_state'&&S.updates>=1)window.__raceOnce();return u.call(q,pl);};return q;};
    DB.study.words[0].seen=5;save();});
  await p.waitForTimeout(2500);
  const r=await srv(p,()=>({ids:__S.v.study.sents.map(x=>x.id),seen:__S.v.study.words[0].seen}));
  ok('G1 첫 쓰기 r012 산다',r.ids.includes('r012'),JSON.stringify(r.ids));
  ok('G2 저장 도중 쓴 r013 도 산다',r.ids.includes('r013'),JSON.stringify(r.ids));
  ok('G3 내 변경도 산다',r.seen===5);
  ok('G4 에러 0',errs.length===0,errs[0]);
  await c.close();}

 /* ── ⑧ 병합 저장 뒤 기준본이 갱신된다 — 다음 저장은 충돌 없이 곧장 ── */
 {const {c,p,errs}=await boot();
  await p.evaluate(()=>__room(v=>{v.study.sents.push({id:'r014',ja:'三',ko:'3',slots:[]});}));
  await p.evaluate(()=>{DB.study.words[0].seen=1;save();});await p.waitForTimeout(1500);
  const u1=await srv(p,()=>__S.updates);
  await p.evaluate(()=>{DB.study.words[0].seen=2;save();});await p.waitForTimeout(1200);
  const r=await srv(p,()=>({u:__S.updates,ids:__S.v.study.sents.map(x=>x.id),seen:__S.v.study.words[0].seen}));
  ok('H1 두 번째 저장은 update 1회로 끝',r.u-u1===1,'updates '+u1+'→'+r.u);
  ok('H2 r014 유지',r.ids.includes('r014'));
  ok('H3 값 반영',r.seen===2);
  ok('H4 에러 0',errs.length===0,errs[0]);
  await c.close();}

 /* ── ⑨ studyDB() 서랍 보장은 이미 있는 배열을 건드리지 않는다(v18 요구 3) ── */
 {const {c,p,errs}=await boot();
  const r=await p.evaluate(()=>{const a=DB.study.sents,w=DB.study.words;studyDB();studyDB();return a===DB.study.sents&&w===DB.study.words&&DB.study.sents.length===1;});
  ok('I1 studyDB 는 있는 배열을 교체·축소하지 않는다',r);
  ok('I2 에러 0',errs.length===0,errs[0]);
  await c.close();}

 for(const r of R)assert.ok(r.v,r.n+(r.x?'  → '+r.x:''));
 console.log('전부 통과 ('+R.length+'건)');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
