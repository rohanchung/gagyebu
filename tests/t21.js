const {chromium}=require('playwright');const fs=require('fs');
const file=process.argv[2];
const INIT=({fail})=>{
  const store={v:{schemaVersion:7,transactions:[],goals:[],routines:[],checks:{},categories:[],cards:[],accounts:[],debts:[],items:[],journal:[]},at:'2026-08-20T00:00:00.000Z',tries:0,failN:fail};
  window.__store=store;const res=d=>Promise.resolve({data:d,error:null});
  function mk(){let m=null,p=null;const q={
    select(){ if(m==='update'){ store.tries++;
        if(store.tries<=store.failN) return Promise.reject(new Error('network down'));
        store.v=p.data;store.at=p.updated_at;return res([{updated_at:store.at}]); } return q; },
    eq(){return q},maybeSingle(){return res({data:store.v,updated_at:store.at})},
    update(x){m='update';p=x;return q},upsert(r){store.v=r.data;store.at=r.updated_at;return res(null)},order(){return q},limit(){return q},insert(){return res([])},delete(){return q},in(){return q},then(a){return res([]).then(a)}};
   return q;}
  window.supabase={createClient:()=>({from:()=>mk(),auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};
};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
let fail=0;const ok=(n,c,x)=>{console.log((c?'  ✓':'  ✗')+' '+n+(x?'  → '+x:''));if(!c)fail++;};
// F) 2회 실패 후 성공
{const c=await b.newContext();await c.addInitScript(INIT,{fail:2});
 const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.split('\n')[0]));p.on('dialog',d=>d.accept());
 await p.route('**/*supabase*',r=>r.abort());await p.goto('file://'+file);await p.waitForTimeout(1200);
 await p.evaluate(()=>{DB.journal.push({id:'a'});save();});
 await p.waitForTimeout(600);
 const mid=await p.evaluate(()=>document.getElementById('savebadge').textContent);
 await p.waitForTimeout(5000);
 const st=await p.evaluate(()=>({t:window.__store.tries,dirty:SAVE_DIRTY,b:document.getElementById('savebadge').textContent}));
 console.log('F) 일시적 네트워크 실패 → 재시도');
 ok('실패 중 배지에 경고',/재시도/.test(mid),JSON.stringify(mid));
 ok('3번째에 성공',st.t===3,'tries='+st.t);
 ok('DIRTY 해제',st.dirty===false,'badge='+JSON.stringify(st.b));
 ok('JS 에러 0',errs.length===0,errs[0]||'');}
// G) 6회 전부 실패 → 사용자에게 알림
{const c=await b.newContext();await c.addInitScript(INIT,{fail:99});
 const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.split('\n')[0]));
 const dlg=[];p.on('dialog',d=>{dlg.push(d.message().slice(0,40));d.accept();});
 await p.route('**/*supabase*',r=>r.abort());await p.goto('file://'+file);await p.waitForTimeout(1200);
 await p.evaluate(()=>{DB.journal.push({id:'b'});save();});
 await p.waitForTimeout(22000);
 const st=await p.evaluate(()=>({t:window.__store.tries,dirty:SAVE_DIRTY,b:document.getElementById('savebadge').textContent}));
 console.log('G) 계속 실패 → 경고');
 ok('6회 시도 후 중단',st.t===6,'tries='+st.t);
 ok('alert 로 백업 유도',dlg.some(m=>/5번 실패/.test(m)),dlg.join('|'));
 ok('배지에 저장 안 됨',/안 됨/.test(st.b),JSON.stringify(st.b));
 ok('DIRTY 유지(닫으면 경고)',st.dirty===true);
 ok('JS 에러 0',errs.length===0,errs[0]||'');}
console.log(fail?('\n=== 실패 '+fail+'건 ==='):'\n=== 전부 통과 ==='); await b.close();process.exit(fail?1:0);})();
