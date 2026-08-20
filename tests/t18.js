const {chromium}=require('playwright');
const goals=[{id:'gB',due:'2026-12-31',code:'B',kind:'year',title:'체중 65kg',metric:{type:'binary',unit:'',target:0},period:'2026',status:'active',startYM:'2026-08',baseline:null,parentId:null,progress:0}];
const routines=[{id:'r1',code:'B.8a',title:'매일 유산균&비타민C 챙기기',freq:'daily',days:[],goalId:'gB',status:'active',start:'2026-08-01'}];
// 로한 실사례: 08:30(17) ~ 11:00(21) 림월드
const STATE={schemaVersion:7,goals,routines,checks:{'2026-08-20':{done:[],due:['B.8a'],miss:{}}},
 rewards:[],rewardCards:{},timelog:{'2026-08-20':[{s:17,e:21,tag:'waste',title:'림월드',code:null}]},
 rewardCfg:{weekFullDays:4,monthWeeks:4,yearMonths:9},ui:{month:'2026-08',goalDate:'2026-08-20',goalMonth:'2026-08',dailyTab:'log'},
 accounts:[],transactions:[],categories:[],cards:[],debts:[],fixed:[],events:[],posts:[],
 health:{weights:[],labs:[],labDates:[],labTypes:[],labMeds:[],labValues:{},events:[]},journal:[],items:[],logs:[],budgets:{}};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const c=await b.newContext({viewport:{width:1440,height:1000}});
await c.addInitScript(({st})=>{const store={v:st};window.__store=store;
 let _m=null,_p=null;const q={select(){if(_m==='update'){_m=null;store.v=_p.data;store.at=_p.updated_at;return Promise.resolve({data:[{updated_at:store.at}]});}return q},eq(){return q},maybeSingle(){return Promise.resolve({data:{data:store.v,updated_at:store.at||null}})},update(p){_m='update';_p=p;return q},upsert(row){store.v=row.data;store.at=row.updated_at;return Promise.resolve({})}};
 window.supabase={createClient:()=>({from:()=>q,auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};},{st:STATE});
const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
await p.route('**/*supabase*',r=>r.abort());
await p.goto('file:///home/claude/work.html');await p.waitForTimeout(1300);
const TL=()=>p.evaluate(()=>JSON.stringify(window.__store.v.timelog['2026-08-20']));
console.log('초기 (08:30–11:00 림월드):', await TL());

console.log('=== 기록된 칸 위에서 범위 선택 시작 ===');
await p.evaluate(()=>tlSlotClick(20));  // 10:00
await p.waitForTimeout(300);
console.log('  1차 탭 후 pick:', await p.evaluate(()=>DB.ui.tlPick), '(모달 안 뜨고 선택 시작이어야)');
console.log('  모달 열림:', await p.evaluate(()=>document.getElementById('ov').classList.contains('on')), '(false여야)');
await p.evaluate(()=>tlSlotClick(20));  // 같은 칸 → 30분
await p.waitForTimeout(400);
console.log('  모달 제목:', await p.evaluate(()=>document.getElementById('tl_lab').textContent), await p.evaluate(()=>document.getElementById('tl_dur').textContent));
console.log('  겹침 안내:', await p.evaluate(()=>{const n=document.querySelector('.tlov');return n?n.innerText.replace(/\n/g,' '):'(없음)';}));
console.log('  태그 자동 이어받음:', await p.evaluate(()=>{const n=document.querySelector('.tlpick.on');return n?n.innerText:'(없음)'}));
console.log('  내용 프리필:', await p.inputValue('#tl_title'));

console.log('=== 시각 조절 (select) ===');
console.log('  시작/끝 select 존재:', await p.evaluate(()=>!!document.getElementById('tl_s')&&!!document.getElementById('tl_e')));
await p.selectOption('#tl_s','20'); await p.selectOption('#tl_e','20');
await p.waitForTimeout(200);
console.log('  라벨:', await p.evaluate(()=>document.getElementById('tl_lab').textContent), await p.evaluate(()=>document.getElementById('tl_dur').textContent));

console.log('=== 10:00–10:30 만 식사로 + 루틴 연결 ===');
await p.evaluate(()=>{[...document.querySelectorAll('#modal .tlpick')].find(x=>x.innerText.includes('식사')).click();});
await p.fill('#tl_title','아침 겸 점심');
await p.selectOption('#tl_code','B.8a');
await p.evaluate(()=>{[...document.querySelectorAll('#modal button')].find(x=>x.innerText.trim()==='저장').click();});
await p.waitForTimeout(450);
console.log(' ', await TL());
console.log('  → 08:30-10:00 림월드 / 10:00-10:30 식사(B.8a) / 10:30-11:00 림월드 로 갈렸나');

console.log('=== 구간 비우기 (앞뒤 보존) ===');
await p.evaluate(()=>tlSlotClick(18));await p.waitForTimeout(200);
await p.evaluate(()=>tlSlotClick(18));await p.waitForTimeout(350);
await p.evaluate(()=>{const b=[...document.querySelectorAll('#modal button')].find(x=>x.innerText.includes('비우기'));b.click();});
await p.waitForTimeout(450);
console.log(' ', await TL());
console.log('  집계:', await p.evaluate(()=>{const n=document.querySelector('.tlsums');return n?n.innerText.replace(/\n/g,' '):'(없음)'}));
console.log('  JS 에러:', errs.length, errs.slice(0,2).join(' | '));
await b.close();})();
