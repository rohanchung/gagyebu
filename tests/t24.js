/* t24 — v1.3
   (가) 루틴 소속 이동 시 체크 기록 이관 · 코드 고정
   (나) 버킷 → 연간 목표 승격 · 연결 해제 · 유령 링크 정리
   ⚠️ 규칙대로 '빈 상태'가 아니라 '기록이 있는 상태'를 일부러 만들어 먹인다 —
      이 결함은 기록이 있어야만 드러난다. */
const {chromium}=require('playwright');
const file=process.argv[2];
const INIT=({st})=>{const store={v:st,at:st?'2026-08-20T00:00:00.000Z':null};window.__store=store;
 const res=d=>Promise.resolve({data:d,error:null});
 function mk(){let m=null,p=null;const q={
  select(){if(m==='update'){store.v=p.data;store.at=p.updated_at;return res([{updated_at:store.at}]);}return q},
  eq(){return q},maybeSingle(){return store.v===null?res(null):res({data:store.v,updated_at:store.at})},
  update(x){m='update';p=x;return q},upsert(r){store.v=r.data;store.at=r.updated_at;return res(null)},order(){return q},limit(){return q},insert(){return res([])},delete(){return q},in(){return q},then(a){return res([]).then(a)}};return q;}
 window.supabase={createClient:()=>({from:()=>mk(),auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};};

/* 연간 A · 8월 눈금 A.8 · 그 산하 루틴 A.8a — 체크 기록 3일치(done/due/miss 전부) */
const ST={schemaVersion:7,transactions:[],categories:[],cards:[],accounts:[],debts:[],items:[],budgets:[],journal:[],
 goals:[{id:'gA',code:'A',kind:'year',parentId:null,period:'2026',title:'건강 회복',due:'2026-12-31',
         metric:{type:'autodays',target:20,unit:'일'},baseline:null,startYM:'2026-08',status:'active'},
        {id:'gA8',code:'A.8',kind:'milestone',parentId:'gA',period:'2026-08',title:'8월 눈금',due:'2026-08-31',
         metric:{type:'autodays',target:20,unit:'일'},status:'active'}],
 routines:[{id:'r1',code:'A.8a',goalId:'gA8',title:'유산균',freq:'daily',days:[],start:'2026-08-01',end:'',status:'active',order:1},
           {id:'r2',code:'A1',goalId:'gA',title:'스트레칭',freq:'daily',days:[],start:'2026-08-01',end:'',status:'active',order:2}],
 checks:{'2026-08-17':{done:['A.8a','A1'],due:['A.8a','A1'],miss:{}},
         '2026-08-18':{done:['A1'],       due:['A.8a','A1'],miss:{'A.8a':{tag:'야근',memo:'11시 퇴근'}}},
         '2026-08-19':{done:['A.8a'],     due:['A.8a','A1'],miss:{'A1':{tag:'피로',memo:''}}}},
 rewards:[{id:'k1',code:'K1',place:'bucket',status:'want',title:'서울에 집 사기',kind:'spend',price:500000000,
           addedAt:'2026-01-02',updatedAt:'2026-01-02',memo:''},
          {id:'k2',code:'K2',place:'bucket',status:'want',title:'스시 오마카세',kind:'spend',price:45000,
           addedAt:'2026-05-19',updatedAt:'2026-05-19',memo:''}],
 meta:{seq:{year:1,'A':1,'A.8':1,K:2,Z:0}},
 ui:{}};

let F=0,N=0;
const ok=(c,m,x)=>{N++;if(!c)F++;console.log((c?'  ✓ ':'  ✗ ')+m+(x!==undefined?('   → '+x):''));};

async function boot(b,st){
  const c=await b.newContext();await c.addInitScript(INIT,{st:JSON.parse(JSON.stringify(st))});
  const p=await c.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(1100);
  await p.evaluate(()=>{window.__dlg=[];window.__ans=true;
    window.confirm=m=>{window.__dlg.push(m);return window.__ans;};
    window.alert=m=>{window.__dlg.push('ALERT:'+m);};});
  return {c,p,errs};
}
/* 루틴 소속을 바꾸고 저장한다 (모달을 실제로 거친다) */
const MOVE=(rid,gid,lock,ans)=>`(()=>{window.__dlg=[];window.__ans=${ans};
  routineModal('${rid}');
  document.getElementById('rt_goal').value='${gid}';
  var lk=document.getElementById('rt_lock'); if(lk)lk.checked=${lock};
  saveRoutine('${rid}');
  var r=DB.routines.filter(x=>x.id==='${rid}')[0];
  return {code:r.code,goalId:r.goalId,lock:!!r.lockCode,dlg:window.__dlg.slice(),
          ck:JSON.parse(JSON.stringify(DB.checks)),hasLockBox:!!lk};})()`;

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

/* ───────── (가) 루틴 소속 이동 ───────── */
console.log('=== (가) 루틴 소속 이동 시 체크 기록 이관 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(MOVE('r1','gA',false,true));
 ok(r.hasLockBox,'루틴 수정 모달에 「코드 고정」 체크박스가 있다');
 ok(r.dlg.length===1&&/A\.8a/.test(r.dlg[0])&&/3일/.test(r.dlg[0]),
    '먼저 묻는다 (옛 코드 · 옮길 기록 일수)', JSON.stringify((r.dlg[0]||'').split('\n')[0]));
 ok(r.goalId==='gA','소속이 연간 A 로 바뀌었다', r.goalId);
 ok(r.code==='A2','코드가 재발급됐다 (A1 은 이미 r2 가 쓴다)', r.code);
 const d17=r.ck['2026-08-17'],d18=r.ck['2026-08-18'],d19=r.ck['2026-08-19'];
 ok(d17.done.indexOf('A2')>=0&&d17.done.indexOf('A.8a')<0,'done[] 이관됨', JSON.stringify(d17.done));
 ok(d17.due.indexOf('A2')>=0&&d17.due.indexOf('A.8a')<0,'due[] 이관됨', JSON.stringify(d17.due));
 ok(d18.miss['A2']&&d18.miss['A2'].tag==='야근'&&!d18.miss['A.8a'],'miss{} 키 이관 + 사유 보존', JSON.stringify(d18.miss));
 ok(d17.due.length===2&&d18.due.length===2&&d19.due.length===2,
    '⚠️ 분모(due) 길이 불변 — 과거 달성률이 안 흔들린다', [d17.due.length,d18.due.length,d19.due.length].join('/'));
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== 취소하면 아무것도 안 바뀐다 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(MOVE('r1','gA',false,false));
 ok(r.code==='A.8a','코드 그대로', r.code);
 ok(r.goalId==='gA8','소속도 그대로 (저장 자체가 중단)', r.goalId);
 ok(r.ck['2026-08-17'].done.indexOf('A.8a')>=0,'체크 기록 그대로');
 const seq=await p.evaluate(()=>JSON.parse(JSON.stringify(DB.meta.seq)));
 ok(seq['A']===1,'⚠️ 취소했으니 코드 번호를 태우지 않았다 (peek)', 'seq.A='+seq['A']);
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== 「코드 고정」을 켜면 재발급하지 않는다 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(MOVE('r1','gA',true,true));
 ok(r.code==='A.8a','코드 유지', r.code);
 ok(r.goalId==='gA','소속은 바뀌었다', r.goalId);
 ok(r.lock===true,'lockCode 가 실제로 저장됐다 (v6.0 이후 처음)');
 ok(r.dlg.length===0,'묻지 않는다 (옮길 게 없다)');
 ok(r.ck['2026-08-18'].miss['A.8a'],'기록도 그대로');
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== 기록이 0건이면 묻지 않는다 ===');
{const st=JSON.parse(JSON.stringify(ST));st.checks={};
 const {c,p,errs}=await boot(b,st);
 const r=await p.evaluate(MOVE('r1','gA',false,true));
 ok(r.dlg.length===0,'confirm 없음 — 잃을 게 없는데 묻는 건 마찰일 뿐');
 ok(r.code==='A2','그래도 코드는 재발급', r.code);
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== 목표를 지워 미연결(Z)로 내려갈 때도 기록이 따라온다 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(()=>{window.__ans=true;delGoal('gA8');
   var r1=DB.routines.filter(x=>x.id==='r1')[0];
   return {code:r1.code,gid:r1.goalId,ck:JSON.parse(JSON.stringify(DB.checks))};});
 ok(r.gid===null,'미연결로 강등', String(r.gid));
 ok(/^Z\d+$/.test(r.code),'Z 코드 발급', r.code);
 ok(r.ck['2026-08-17'].done.indexOf(r.code)>=0,'done[] 따라옴', JSON.stringify(r.ck['2026-08-17'].done));
 ok(!!r.ck['2026-08-18'].miss[r.code],'miss{} 따라옴', JSON.stringify(r.ck['2026-08-18'].miss));
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

/* ───────── (나) 버킷 → 연간 목표 승격 ───────── */
console.log('\n=== (나) 버킷 → 연간 목표 승격 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(()=>{
   promoteBucketModal('k1');
   var pre=document.getElementById('g_title').value, tg=document.getElementById('g_target').value;
   var fb=modal._fromBk;
   saveGoal(null,'year',null);
   var bk=DB.rewards.filter(x=>x.id==='k1')[0];
   var g=DB.goals.filter(x=>x.fromBucket==='k1')[0];
   return {pre:pre,tg:tg,fb:fb,promotedTo:bk.promotedTo,gid:g&&g.id,gcode:g&&g.code,
           status:bk.status,place:bk.place,gtitle:g&&g.title};});
 ok(r.pre==='서울에 집 사기','제목 프리필', r.pre);
 ok(r.tg==='500000000','예상비용이 목표값으로 프리필', r.tg);
 ok(r.fb==='k1','modal._fromBk 심어짐');
 ok(r.gid&&r.promotedTo===r.gid,'양방향 링크 (버킷.promotedTo ↔ 목표.fromBucket)', r.gcode+' / '+r.promotedTo);
 ok(r.status==='want'&&r.place==='bucket','⚠️ status·place 는 건드리지 않았다 (최소 침습)', r.status+'/'+r.place);
 ok(errs.length===0,'JS 에러 0', errs[0]||'');

 const t=await p.evaluate(()=>{renderReward();var h=bucketTable();
   return {pro:/data-unbk="k1"/.test(h)&&/🎯/.test(h),up:/data-tog="k2"/.test(h),
           noUpOnPromoted:!/data-tog="k1"/.test(h)};});
 ok(t.pro,'표에 🎯 뱃지 + ↩ (연결 해제)');
 ok(t.up,'아직 안 올린 항목엔 ⬆ 가 있다');
 ok(t.noUpOnPromoted,'이미 올린 항목엔 ⬆ 가 없다');

 const u=await p.evaluate(()=>{window.__ans=true;unpromoteBucket('k1');
   var bk=DB.rewards.filter(x=>x.id==='k1')[0];
   return {promotedTo:bk.promotedTo,goals:DB.goals.length,
           fb:DB.goals.filter(x=>x.fromBucket).length,alive:!!DB.goals.filter(x=>x.title==='서울에 집 사기')[0]};});
 ok(u.promotedTo===undefined,'↩ 로 링크만 끊긴다');
 ok(u.alive&&u.fb===0,'⚠️ 목표는 살아 있다 (삭제는 목표 쪽에서)', '목표 '+u.goals+'개');
 await c.close();}

console.log('\n=== 승격 취소 후 그냥 목표를 만들면 링크가 걸리면 안 된다 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(()=>{
   promoteBucketModal('k1'); closeModal();          /* 승격 모달을 그냥 닫는다 */
   goalModal(null,'year');                          /* 평범하게 + 목표 */
   document.getElementById('g_title').value='무관한 목표';
   saveGoal(null,'year',null);
   var bk=DB.rewards.filter(x=>x.id==='k1')[0];
   return {promotedTo:bk.promotedTo,fb:DB.goals.filter(x=>x.fromBucket).length};});
 ok(r.promotedTo===undefined&&r.fb===0,'⚠️ modal 은 DOM 노드다 — _fromBk 가 살아남지 않는다');
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== 목표를 지우면 버킷의 유령 링크도 정리된다 ===');
{const {c,p,errs}=await boot(b,ST);
 const r=await p.evaluate(()=>{
   promoteBucketModal('k1'); saveGoal(null,'year',null);
   var g=DB.goals.filter(x=>x.fromBucket==='k1')[0];
   window.__ans=true; delGoal(g.id);
   var bk=DB.rewards.filter(x=>x.id==='k1')[0];
   return {promotedTo:bk.promotedTo,gone:!DB.goals.filter(x=>x.id===g.id)[0]};});
 ok(r.gone,'목표 삭제됨');
 ok(r.promotedTo===undefined,'버킷 쪽 promotedTo 정리됨 (유령 링크 없음)');
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n=== 마이그레이션 (B)층이 끊어진 링크를 지운다 ===');
{const st=JSON.parse(JSON.stringify(ST));
 st.rewards[0].promotedTo='없는목표id';
 st.goals[0].fromBucket='없는버킷id';
 st.routines[0].lockCode=false;
 const {c,p,errs}=await boot(b,st);
 const r=await p.evaluate(()=>({pt:DB.rewards.filter(x=>x.id==='k1')[0].promotedTo,
   fb:DB.goals.filter(x=>x.id==='gA')[0].fromBucket,
   lk:'lockCode' in DB.routines.filter(x=>x.id==='r1')[0]}));
 ok(r.pt===undefined,'끊어진 promotedTo 제거');
 ok(r.fb===undefined,'끊어진 fromBucket 제거');
 ok(r.lk===false,'lockCode:false 는 남기지 않는다');
 ok(errs.length===0,'JS 에러 0', errs[0]||'');
 await c.close();}

console.log('\n'+(F?('=== 실패 '+F+' / '+N+' ==='):('=== 전부 통과 ('+N+'건) ===')));
await b.close();process.exit(F?1:0);})();
