const {chromium}=require('playwright');const fs=require('fs');
const file=process.argv[2];
const D=JSON.parse(fs.readFileSync('/home/claude/state_rw.json','utf8'));
const STATE={schemaVersion:7,goals:D.goals,routines:[],checks:{},rewards:D.rewards,rewardCfg:{weekFullDays:4,monthWeeks:4,yearMonths:9},ui:{month:'2026-08'},
 accounts:[],transactions:[],categories:[{id:'c1',name:'식비',type:'expense'}],cards:[{id:'cd1',name:'현금',type:'check'}],debts:[],fixed:[],events:[],posts:[],
 health:{weights:[],labs:[],labDates:[],labTypes:[],labMeds:[],labValues:{},events:[]},journal:[],items:[],logs:[],budgets:{}};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const c=await b.newContext();
await c.addInitScript(({st})=>{const store={v:st};window.__store=store;
 let _m=null,_p=null;const q={select(){if(_m==='update'){_m=null;store.v=_p.data;store.at=_p.updated_at;return Promise.resolve({data:[{updated_at:store.at}]});}return q},eq(){return q},maybeSingle(){return Promise.resolve({data:{data:store.v,updated_at:store.at||null}})},update(p){_m='update';_p=p;return q},upsert(row){store.v=row.data;store.at=row.updated_at;return Promise.resolve({})}};
 window.supabase={createClient:()=>({from:()=>q,auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};},{st:STATE});
const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
await p.route('**/*supabase*',r=>r.abort());
await p.goto('file://'+file);await p.waitForTimeout(1300);
const tabs=await p.$$eval('.m[data-v]',ns=>ns.map(n=>n.dataset.v));
let empty=[];
for(const tb of tabs){await p.click(`.m[data-v="${tb}"]`);await p.waitForTimeout(150);
  const n=await p.evaluate(x=>{var e=document.getElementById('v-'+x);return e?e.innerHTML.length:-1;},tb);
  if(n<50)empty.push(tb);}
console.log(file.split('/').pop(),'| 탭',tabs.length,'| 빈탭:',empty.join(',')||'없음','| 에러:',errs.length,'|',errs.slice(0,2).join(' / '));
await b.close();})();
