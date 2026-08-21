const {chromium}=require('playwright');
/* ⚠️ 날짜를 하드코딩하면 하루만 지나도 깨진다 (2026-08-21 에 실제로 깨졌다).
   '오늘'과 '어제'는 실행 시점에 계산한다. 경로 하드코딩과 같은 계열의 함정이다. */
const TODAY=(()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})();
const DAYS=n=>{const d=new Date(TODAY+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const file=process.argv[2];
const INIT=({st,seed,today})=>{
  const state={v:st,at:today+'T00:00:00.000Z'}; const snaps=(seed||[]).slice(); let seq=1000;
  window.__db={state,snaps};
  const res=d=>Promise.resolve({data:d,error:null});
  function appQ(){let m=null,p=null;const f={};const q={
    select(){if(m==='update'){state.v=p.data;state.at=p.updated_at;return res([{updated_at:state.at}]);}return q},
    eq(k,v){f[k]=v;return q},maybeSingle(){return res({data:state.v,updated_at:state.at})},
    update(x){m='update';p=x;return q},upsert(r){state.v=r.data;state.at=r.updated_at;return res(null)}};return q;}
  function snapQ(){
    let mode='select',flt={},ord=null,lim=null,ins=null,inIds=null;
    const run=()=>{
      if(mode==='insert'){
        const row=Object.assign({id:++seq,taken_at:new Date(2026,7,20,9,0,seq%60).toISOString()},ins);
        if(row.kind==='auto'&&snaps.some(s=>s.user_id===row.user_id&&s.day===row.day&&s.kind==='auto'))
          return Promise.reject(new Error('duplicate key value violates unique constraint'));
        snaps.push(row);return Promise.resolve({data:[row],error:null});}
      if(mode==='delete'){for(let i=snaps.length-1;i>=0;i--)if(inIds.indexOf(snaps[i].id)>=0)snaps.splice(i,1);
        return Promise.resolve({data:null,error:null});}
      let rows=snaps.filter(s=>Object.keys(flt).every(k=>String(s[k])===String(flt[k])));
      rows=rows.slice().sort((a,b)=>a.taken_at<b.taken_at?1:-1);
      if(lim)rows=rows.slice(0,lim);
      return Promise.resolve({data:rows,error:null});};
    const q={select(){return q},eq(k,v){flt[k]=v;return q},order(){return q},limit(n){lim=n;return q},
      maybeSingle(){return run().then(r=>({data:(r.data&&r.data[0])||null,error:null}))},
      insert(x){mode='insert';ins=x;return q},delete(){mode='delete';return q},in(k,v){inIds=v;return q},
      then(a,b){return run().then(a,b)}};
    return q;}
  window.supabase={createClient:()=>({from:t=>(t==='app_state_snap'?snapQ():appQ()),
    auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};
};
const ST={schemaVersion:7,transactions:[{id:'t1',date:'2026-08-01',amount:100,type:'expense'}],goals:[],routines:[],journal:[{id:'j1'}]};
async function boot(b,seed,onDialog){
  const c=await b.newContext();await c.addInitScript(INIT,{st:ST,seed:seed||[],today:TODAY});
  const p=await c.newPage();const errs=[];
  p.on('pageerror',e=>{if(!/__stop_reload__/.test(e.message))errs.push(e.message.split('\n')[0]);});
  const dlg=[];p.on('dialog',async d=>{dlg.push(d.message().slice(0,50));await(onDialog?onDialog(d):d.accept());});
  await p.route('**/*supabase*',r=>r.abort());await p.goto('file://'+file);await p.waitForTimeout(1400);
  return {p,c,errs,dlg};
}
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
let F=0;const ok=(n,c,x)=>{console.log((c?'  ✓':'  ✗')+' '+n+(x?'  → '+x:''));if(!c)F++;};

console.log('A) 접속 시 자동 스냅샷');
{const {p,c,errs}=await boot(b);
 const s=await p.evaluate(()=>window.__db.snaps.map(x=>({k:x.kind,d:x.day,b:x.bytes,u:x.user_id})));
 ok('auto 1개 생성',s.length===1&&s[0].k==='auto',JSON.stringify(s));
 ok('user_id·day·bytes 채워짐',s[0]&&s[0].u==='u1'&&s[0].d===TODAY&&s[0].b>0);
 ok('JS 에러 0',errs.length===0,errs[0]||'');await c.close();}

console.log('B) 같은 날 두 번째 접속 → 중복 생성 안 함');
{const seed=[{id:1,user_id:'u1',day:TODAY,kind:'auto',bytes:100,taken_at:TODAY+'T01:00:00.000Z',data:{}}];
 const {p,c,errs}=await boot(b,seed);
 const n=await p.evaluate(()=>window.__db.snaps.length);
 ok('여전히 1개',n===1,'n='+n);
 ok('JS 에러 0',errs.length===0,errs[0]||'');await c.close();}

console.log('C) 로그 탭 목록 렌더');
{const seed=[
  {id:1,user_id:'u1',day:DAYS(-3),kind:'auto',bytes:250000,taken_at:DAYS(-3)+'T09:00:00.000Z',data:{}},
  {id:2,user_id:'u1',day:DAYS(-2),kind:'manual',note:'9월 재설계 직전',bytes:251000,taken_at:DAYS(-2)+'T10:00:00.000Z',data:{}}];
 const {p,c,errs}=await boot(b,seed);
 await p.click('.m[data-v="log"]');await p.waitForTimeout(500);
 const r=await p.evaluate(()=>{const e=document.getElementById('snaplist');
   return {n:e?e.querySelectorAll('.snaprow').length:-1,h:e?e.innerHTML:'',btn:!!document.querySelector('button[onclick*="snapManual"]')};});
 ok('행 3개(시드2+오늘자동1)',r.n===3,'n='+r.n);
 ok('수동 라벨·메모 표시',/수동/.test(r.h)&&/9월 재설계 직전/.test(r.h));
 ok('KB 표시',/244KB|245KB/.test(r.h),(r.h.match(/\d+KB/g)||[]).join(','));
 ok('되돌리기 버튼',/data-snap=/.test(r.h));
 ok('지금 상태 저장 버튼',r.btn);
 ok('JS 에러 0',errs.length===0,errs[0]||'');await c.close();}

console.log('D) 되돌리기 → 복원 직전 자동 보관이 먼저');
{const seed=[{id:77,user_id:'u1',day:DAYS(-6),kind:'auto',bytes:9,taken_at:DAYS(-6)+'T09:00:00.000Z',
   data:{schemaVersion:7,transactions:[{id:'old1'},{id:'old2'},{id:'old3'}],goals:[],routines:[],journal:[]}}];
 const {p,c,errs,dlg}=await boot(b,seed,d=>d.accept());
 await p.click('.m[data-v="log"]');await p.waitForTimeout(500);
 await p.evaluate(()=>{window.alert=function(){window.__cap=JSON.stringify(window.__db);throw new Error('__stop_reload__');};});
 await p.click('[data-snap="77"]');await p.waitForTimeout(1200);
 const r=await p.evaluate(()=>{const c=window.__cap?JSON.parse(window.__cap):null;
   return c?{kinds:c.snaps.map(s=>s.kind),tx:(c.state.v.transactions||[]).length}:null;});
 ok('복원 실행됨',!!r,JSON.stringify(r));
 ok('pre_restore 가 남았다',!!r&&r.kinds.indexOf('pre_restore')>=0,r&&r.kinds.join(','));
 ok('서버가 스냅샷 내용으로 교체(tx=3)',!!r&&r.tx===3,r&&('tx='+r.tx));
 ok('2단 확인 대화',dlg.filter(m=>/통째로|마지막 확인/.test(m)).length>=2,dlg.length+'건');
 ok('JS 에러 0',errs.length===0,errs[0]||'');await c.close();}

console.log('E) 보관 상한 정리 (auto 30개)');
{const seed=[];for(let i=1;i<=36;i++)seed.push({id:i,user_id:'u1',day:'2026-07-'+String(i).padStart(2,'0'),
   kind:'auto',bytes:1000,taken_at:'2026-07-'+String(i).padStart(2,'0')+'T09:00:00.000Z',data:{}});
 const {p,c,errs}=await boot(b,seed);
 await p.waitForTimeout(800);
 const r=await p.evaluate(()=>{const s=window.__db.snaps.filter(x=>x.kind==='auto');
   return {n:s.length,oldest:s.map(x=>x.day).sort()[0]};});
 ok('auto 30개로 정리',r.n===30,'n='+r.n);
 ok('오래된 것부터 삭제',r.oldest>='2026-07-08','oldest='+r.oldest);
 ok('JS 에러 0',errs.length===0,errs[0]||'');await c.close();}

console.log(F?('\n=== 실패 '+F+'건 ==='):'\n=== 전부 통과 ==='); await b.close();process.exit(F?1:0);})();
