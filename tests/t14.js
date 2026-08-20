const {chromium}=require('playwright');
const STATE={schemaVersion:7,goals:[],routines:[],checks:{},rewards:[],rewardCards:{},rewardCfg:{weekFullDays:4,monthWeeks:4,yearMonths:9},
 ui:{month:'2026-08'},accounts:[],transactions:[],categories:[{id:'c1',name:'식비',type:'expense'}],cards:[],debts:[],
 health:{weights:[],labs:[],labDates:[],labTypes:[],labMeds:[],labValues:{},events:[]},journal:[],items:[],logs:[]};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
for(const [w,h,label] of [[390,844,'iPhone12'],[412,915,'Android'],[768,1024,'iPad세로'],[1024,768,'iPad가로'],[1440,900,'PC'],[1920,1080,'PC광']]){
const c=await b.newContext({viewport:{width:w,height:h}});
await c.addInitScript(({st})=>{const store={v:JSON.parse(JSON.stringify(st))};window.__store=store;
 let _m=null,_p=null;const q={select(){if(_m==='update'){_m=null;store.v=_p.data;store.at=_p.updated_at;return Promise.resolve({data:[{updated_at:store.at}]});}return q},eq(){return q},maybeSingle(){return Promise.resolve({data:{data:store.v,updated_at:store.at||null}})},update(p){_m='update';_p=p;return q},upsert(row){store.v=row.data;store.at=row.updated_at;return Promise.resolve({})}};
 window.supabase={createClient:()=>({from:()=>q,auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};},{st:STATE});
const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('**/*supabase*',r=>r.abort());
await p.goto('file:///home/claude/work.html');await p.waitForTimeout(1000);
const r=await p.evaluate(()=>{
  const side=document.querySelector('.side'),main=document.querySelector('.main'),br=document.querySelector('.brand');
  const cs=getComputedStyle(side);
  const ms=[...document.querySelectorAll('.side .m')];
  const rows=new Set(ms.map(m=>Math.round(m.getBoundingClientRect().top)));
  return {sideH:Math.round(side.getBoundingClientRect().height),sticky:cs.position,
    navRows:rows.size,brandH:Math.round(br.getBoundingClientRect().height),
    mainW:Math.round(main.getBoundingClientRect().width),
    hOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth};});
console.log(label.padEnd(9),w+'x'+h,'| 네비높이',String(r.sideH).padStart(4),'| 줄수',r.navRows,'| position',r.sticky,
  '| 로고높이',r.brandH,'| 가로overflow',r.hOverflow,'| 에러',errs.length);
await c.close();}
await b.close();})();
