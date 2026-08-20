const {chromium}=require('playwright');
const file=process.argv[2];
const goals=[{id:'gB',due:'2026-12-31',code:'B',kind:'year',title:'체중 65kg',metric:{type:'binary',unit:'',target:0},period:'2026',status:'active',startYM:'2026-08',baseline:null,parentId:null,progress:0}];
const routines=[{id:'r1',code:'B.8a',title:'유산균 챙기기',freq:'daily',days:[],goalId:'gB',status:'active',start:'2026-08-01'}];
const STATE={schemaVersion:7,goals,routines,checks:{'2026-08-20':{done:[],due:['B.8a'],miss:{}}},
 rewards:[],rewardCards:{},timelog:{'2026-08-20':[{s:17,e:21,tag:'waste',title:'림월드',code:null},{s:30,e:33,tag:'work',title:'강의',code:null}]},
 rewardCfg:{weekFullDays:4,monthWeeks:4,yearMonths:9},ui:{month:'2026-08',goalDate:'2026-08-20',goalMonth:'2026-08',dailyTab:'log'},
 accounts:[],transactions:[],categories:[],cards:[],debts:[],fixed:[],events:[],posts:[],
 health:{weights:[],labs:[],labDates:[],labTypes:[],labMeds:[],labValues:{},events:[]},journal:[],items:[],logs:[],budgets:{}};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const c=await b.newContext({viewport:{width:1440,height:1100}});
await c.addInitScript(({st})=>{const store={v:st};window.__store=store;
 let _m=null,_p=null;const q={select(){if(_m==='update'){_m=null;store.v=_p.data;store.at=_p.updated_at;return Promise.resolve({data:[{updated_at:store.at}]});}return q},eq(){return q},maybeSingle(){return Promise.resolve({data:{data:store.v,updated_at:store.at||null}})},update(p){_m='update';_p=p;return q},upsert(row){store.v=row.data;store.at=row.updated_at;return Promise.resolve({})},order(){return q},limit(){return q},insert(){return Promise.resolve({data:[],error:null})},delete(){return q},in(){return q},then(a){return Promise.resolve({data:[],error:null}).then(a)}};
 window.supabase={createClient:()=>({from:()=>q,auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};},{st:STATE});
const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
await p.route('**/*supabase*',r=>r.abort());
await p.goto('file://'+file);await p.waitForTimeout(1300);
const TL=()=>p.evaluate(()=>JSON.stringify(window.__store.v.timelog['2026-08-20']));
console.log('초기:', await TL());

console.log('=== ① hover → 블록 전체 강조 ===');
await p.hover('[data-tlq="19"]'); await p.waitForTimeout(250);
console.log('  강조된 칸:', await p.evaluate(()=>[...document.querySelectorAll('.tlq.hl')].map(x=>x.dataset.tlq).join(',')), '(17~21이어야)');
console.log('  ✎ 보임:', await p.evaluate(()=>{const e=document.querySelector('.tlq.hl .tledit');return e?getComputedStyle(e).display:'(없음)'}));
await p.hover('[data-tlq="40"]'); await p.waitForTimeout(200);
console.log('  다른 블록 hover 후 강조:', await p.evaluate(()=>[...document.querySelectorAll('.tlq.hl')].map(x=>x.dataset.tlq).join(',')||'(없음)'));

console.log('=== ② ✎ 클릭 → 내용만 수정 ===');
await p.hover('[data-tlq="19"]'); await p.waitForTimeout(200);
await p.evaluate(()=>document.querySelector('[data-tledit="17"]').click());
await p.waitForTimeout(400);
console.log('  모달:', await p.evaluate(()=>document.getElementById('tl_lab').textContent), await p.evaluate(()=>document.getElementById('tl_dur').textContent), '(08:30–11:00 2.5h)');
console.log('  태그 프리필:', await p.evaluate(()=>document.querySelector('.tlpick.on').innerText));
console.log('  내용 프리필:', await p.inputValue('#tl_title'));
console.log('  시각 select 존재:', await p.evaluate(()=>!!document.getElementById('tl_s')));
await p.fill('#tl_title','림월드 스팀 세일판');
await p.selectOption('#tl_code','B.8a');
await p.evaluate(()=>{[...document.querySelectorAll('#modal button')].find(x=>x.innerText.trim()==='저장').click();});
await p.waitForTimeout(450);
console.log(' ', await TL(), '(시간 그대로, 내용만 바뀌어야)');

console.log('=== ③ 두 칸 탭은 그대로 (신설·덮어쓰기) ===');
await p.evaluate(()=>tlSlotClick(19));await p.waitForTimeout(250);
console.log('  pick:', await p.evaluate(()=>DB.ui.tlPick));
await p.evaluate(()=>tlSlotClick(19));await p.waitForTimeout(350);
console.log('  모달 범위:', await p.evaluate(()=>document.getElementById('tl_lab').textContent));
await p.evaluate(()=>{[...document.querySelectorAll('#modal .tlpick')].find(x=>x.innerText.includes('식사')).click();});
await p.fill('#tl_title','점심');
await p.evaluate(()=>{[...document.querySelectorAll('#modal button')].find(x=>x.innerText.trim()==='저장').click();});
await p.waitForTimeout(450);
console.log(' ', await TL());

console.log('=== ④ 범위 선택 중엔 ✎ 무시 ===');
await p.evaluate(()=>tlSlotClick(36));await p.waitForTimeout(250);
await p.evaluate(()=>{const e=document.querySelector('[data-tledit="30"]');if(e)e.click();});
await p.waitForTimeout(350);
console.log('  모달 열림:', await p.evaluate(()=>document.getElementById('ov').classList.contains('on')), '| pick:', await p.evaluate(()=>DB.ui.tlPick));
console.log('  (✎가 아니라 칸 클릭으로 처리되어 범위가 잡혔거나 모달이 떠야)');
console.log('  JS 에러:', errs.length, errs.slice(0,2).join(' | '));
await b.close();})();
