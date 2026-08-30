const {chromium}=require('playwright');const fs=require('fs');
const file=process.argv[2];
const D=JSON.parse(fs.readFileSync('/home/claude/state_rw.json','utf8'));
const FULL={schemaVersion:7,goals:D.goals,routines:[],checks:{},rewards:D.rewards,rewardCfg:{weekFullDays:4,monthWeeks:4,yearMonths:9},ui:{month:'2026-08'},
 accounts:[],transactions:[],categories:[{id:'c1',name:'식비',type:'expense'}],cards:[{id:'cd1',name:'현금',type:'check'}],debts:[],fixed:[],events:[],posts:[],
 health:{weights:[],labs:[],labDates:[],labTypes:[],labMeds:[],labValues:{},events:[]},journal:[],items:[],logs:[],budgets:{}};

const INIT=({st,at,conflict})=>{
  const store={v:st,at:at||null,wrote:0,conflict:!!conflict,forced:0};window.__store=store;
  const res=d=>Promise.resolve({data:d,error:null});
  function mk(){let mode=null,payload=null;const f={};const q={
    select(c){q._c=c;
      if(mode==='update'){let ok=(f.updated_at===undefined)||(f.updated_at===store.at);
        if(store.conflict){ok=false;}
        if(!ok)return res([]);
        store.v=payload.data;store.at=payload.updated_at;store.wrote++;return res([{updated_at:store.at}]);}
      return q;},
    eq(k,v){f[k]=v;return q;},
    maybeSingle(){if(store.v===null&&store.at===null)return res(null);
      const o={};o.data=store.v;o.updated_at=store.at;return res(o);},
    update(p){mode='update';payload=p;return q;},
    upsert(r){store.v=r.data;store.at=r.updated_at;store.wrote++;store.forced++;store.conflict=false;return res(null);},order(){return q},limit(){return q},insert(){return res([])},delete(){return q},in(){return q},then(a){return res([]).then(a)}};
   return q;}
  window.supabase={createClient:()=>({from:()=>mk(),auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};
};

async function boot(b,st,at,conflict,onDialog){
  const c=await b.newContext();await c.addInitScript(INIT,{st,at,conflict});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
  const dlg=[];p.on('dialog',async d=>{dlg.push(d.message().slice(0,60));await (onDialog?onDialog(d):d.accept());});
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(1200);
  return {p,errs,dlg,c};
}
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
let fail=0;const ok=(n,c,x)=>{console.log((c?'  ✓':'  ✗')+' '+n+(x?'  → '+x:''));if(!c)fail++;};

// A) 정상 저장 경로 + 배지
{const {p,errs}=await boot(b,FULL,'2026-08-20T00:00:00.000Z',false);
 await p.evaluate(()=>{DB.journal.push({id:'j1',date:'2026-08-20',t:'x'});save();});
 await p.waitForTimeout(900);
 const st=await p.evaluate(()=>({wrote:window.__store.wrote,forced:window.__store.forced,dirty:SAVE_DIRTY,last:LAST_SYNC,badge:document.getElementById('savebadge').textContent}));
 console.log('A) 정상 저장');
 ok('조건부 update 1회로 저장',st.wrote===1,'wrote='+st.wrote);
 ok('upsert 폴백 안 씀',st.forced===0);
 ok('LAST_SYNC 갱신',!!st.last&&st.last!=='2026-08-20T00:00:00.000Z');
 ok('SAVE_DIRTY 해제',st.dirty===false);
 ok('배지 저장됨 표시',/저장됨/.test(st.badge),JSON.stringify(st.badge));
 ok('JS 에러 0',errs.length===0,errs[0]||'');}

// B) 충돌: [확인] = 덮어쓰기
{const {p,errs,dlg}=await boot(b,FULL,'2026-08-20T00:00:00.000Z',false,d=>d.accept());
 await p.evaluate(()=>{window.__store.at='2026-08-20T09:00:00.000Z';   /* 다른 기기가 먼저 저장 */
   DB.journal.push({id:'j2',date:'2026-08-20',t:'y'});save();});
 await p.waitForTimeout(1500);
 const st=await p.evaluate(()=>({forced:window.__store.forced,dirty:SAVE_DIRTY,badge:document.getElementById('savebadge').textContent}));
 console.log('B) 충돌 → 덮어쓰기 선택');
 ok('confirm 이 떴다',dlg.some(m=>/다른 기기/.test(m)),dlg.join('|'));
 ok('강제 upsert 로 저장',st.forced===1,'forced='+st.forced);
 ok('저장 완료 처리',st.dirty===false&&/저장됨/.test(st.badge),st.badge);
 ok('JS 에러 0',errs.length===0,errs[0]||'');}

// C) 충돌: [취소] = 새로고침 (dismiss)
{const {p,errs,dlg}=await boot(b,FULL,'2026-08-20T00:00:00.000Z',false,d=>d.dismiss());
 let reloaded=false;p.on('framenavigated',()=>{reloaded=true;});
 await p.evaluate(()=>{window.__mark=1;window.__store.at='2026-08-20T09:00:00.000Z';
   DB.journal.push({id:'j3',date:'2026-08-20',t:'z'});save();});
 await p.waitForTimeout(1800);
 console.log('C) 충돌 → 새로고침 선택');
 ok('confirm 이 떴다',dlg.some(m=>/다른 기기/.test(m)));
 const gone=await p.evaluate(()=>typeof window.__mark==='undefined').catch(()=>true);
 ok('페이지 재로드',reloaded||gone,'nav='+reloaded+' markGone='+gone);
 ok('JS 에러 0',errs.length===0,errs[0]||'');}

// D) 신규 계정 (행 없음) → upsert 폴백
{const {p,errs}=await boot(b,null,null,false);
 await p.evaluate(()=>{DB.journal=DB.journal||[];DB.journal.push({id:'j4',date:'2026-08-20',t:'n'});save();});
 await p.waitForTimeout(1200);
 const st=await p.evaluate(()=>({wrote:window.__store.wrote,dirty:SAVE_DIRTY,badge:document.getElementById('savebadge').textContent}));
 console.log('D) 신규 계정(서버 행 없음)');
 ok('저장 성공',st.wrote>=1&&st.dirty===false,'wrote='+st.wrote+' badge='+st.badge);
 ok('JS 에러 0',errs.length===0,errs[0]||'');}

// E) 백업 UI + 로컬 복원지점
{const {p,errs}=await boot(b,FULL,'2026-08-20T00:00:00.000Z',false);
 await p.click('.m[data-v="log"]');await p.waitForTimeout(300);
  /* v2.3 — 백업·스냅샷은 🛠 탭 안으로 들어갔다. 로그 페이지를 열었다고 바로 보이지 않는다. */
  await p.evaluate(()=>setLogTab('bak'));await p.waitForTimeout(400);
 const r=await p.evaluate(()=>{
   const h=document.getElementById('v-log').innerHTML;
   const bak=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.indexOf('rb_bak_')===0)bak.push(k);}
   return {dl:/JSON 내려받기/.test(h),up:/파일에서 복원/.test(h),sz:/현재 데이터/.test(h),bak:bak.length,
     btn:!!document.querySelector('#v-log button[onclick*="exportJSON"]'),
     inp:!!document.querySelector('#v-log input[type=file]')};});
 console.log('E) 백업 UI');
 ok('내려받기 버튼',r.dl&&r.btn);
 ok('복원 파일 입력',r.up&&r.inp);
 ok('용량·요약 표시',r.sz);
 ok('로컬 복원지점 저장됨',r.bak===1,'n='+r.bak);
 ok('JS 에러 0',errs.length===0,errs[0]||'');}

console.log(fail?('\n=== 실패 '+fail+'건 ==='):'\n=== 전부 통과 ===');
await b.close();process.exit(fail?1:0);})();
