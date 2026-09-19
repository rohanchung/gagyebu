/* v4.12 뽀모 → 타임로그 (로한 2026-09-19: "미리 로그를 채워놓으면 반영이 안 된다. 서브 활동으로 넣어주면 된다")
   실측 재현: 9/18 10:00~20:00 이 통째로 work 블록, 19:17 뽀모 25분이 로그 어디에도 안 보였다.
   🔒 두 가지를 같이 잠근다 — ① 걸친 칸만 표시한다 ② 학습 시간은 두 번 세지 않는다. 시간대는 KST 고정. */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const FILE=process.argv[2]||path.join(__dirname,'..','index.html');
const D='2026-09-18';
const kst=(ds,hm)=>new Date(ds+'T'+hm+':00+09:00').toISOString();
const STATE={schemaVersion:7,goals:[],routines:[],checks:{},rewards:[],rewardCards:{},rewardCfg:{weekFullDays:4,monthWeeks:4,yearMonths:9},
 ui:{month:'2026-09'},accounts:[],transactions:[],categories:[],cards:[],debts:[],journal:[],items:[],logs:[],
 health:{weights:[],labs:[],labDates:[],labTypes:[],labMeds:[],labValues:{},events:[]},
 timelog:{[D]:[{s:20,e:39,tag:'work',title:'채움',code:null},{s:42,e:45,tag:'meal',tag2:'rest',title:'',code:null}]},
 study:{units:[{id:'u031',ch:'home',title:'단어 p160',day:D,due:D,backlog:false,status:'todo',carried:0}],
   pomos:[{id:'p1',date:D,mins:25,plan:25,unitId:'u031',at:kst(D,'19:17')}]}};
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
 const c=await b.newContext({viewport:{width:1280,height:900},timezoneId:'Asia/Seoul'});
 await c.addInitScript(({st})=>{const store={v:JSON.parse(JSON.stringify(st))};
   let _m=null,_p=null;const q={select(){if(_m==='update'){_m=null;store.v=_p.data;store.at=_p.updated_at;return Promise.resolve({data:[{updated_at:store.at}]});}return q},eq(){return q},maybeSingle(){return Promise.resolve({data:{data:store.v,updated_at:store.at||null}})},update(p){_m='update';_p=p;return q},upsert(row){store.v=row.data;store.at=row.updated_at;return Promise.resolve({})},order(){return q},limit(){return q},insert(){return Promise.resolve({data:[],error:null})},delete(){return q},in(){return q},then(a){return Promise.resolve({data:[],error:null}).then(a)}};
   window.__store=store;
   window.supabase={createClient:()=>({from:()=>q,auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};},{st:STATE});
 const p=await c.newPage(),errs=[];
 p.on('pageerror',e=>errs.push(e.message));
 await p.route('https://**/*',r=>r.abort());
 await p.goto('file:///'+FILE.replace(/\\/g,'/').replace(/^\//,''));
 await p.waitForFunction(()=>typeof DB!=='undefined'&&DB&&DB.study);
 await p.waitForTimeout(600);
 const R=[];const ok=(n,v)=>R.push({n,v:!!v});
 const tl=()=>p.evaluate(d=>JSON.parse(JSON.stringify(DB.timelog[d]||[])).map(b=>b.s+'-'+b.e+':'+b.tag+(b.tag2?'+'+b.tag2:'')),D);

 /* ① 접속 시 옛 뽀모 소급 — 그 칸만 서브 활동이 된다 */
 const t1=await tl();
 ok('A1 work 블록이 뽀모 칸에서 갈린다',t1.includes('20-37:work')&&t1.includes('38-39:work+study'));
 ok('A2 10시간 전체에 study 가 붙지 않는다',!t1.some(x=>x.startsWith('20-39')));
 ok('A3 제목·코드 보존',await p.evaluate(d=>DB.timelog[d].find(b=>b.s===38).title==='채움',D));
 ok('A4 소급 표시 tl',await p.evaluate(()=>DB.study.pomos[0].tl===true));
 ok('A5 소급 후 저장된다',await p.evaluate(()=>JSON.stringify(window.__store.v.timelog).includes('"tag2":"study"')));
 ok('A6 소급은 한 번만',await p.evaluate(()=>stPomoBackfill())===0);

 /* ② 두 번 세지 않는다 — 85(30×2+25)도 60(칸 2개)도 아니고 25 */
 ok('B1 학습시간 25분',await p.evaluate(d=>stStudyMins(d),D)===25);
 ok('B2 timelog 만 보면 60분(표시일 뿐)',await p.evaluate(d=>stMinsOn(d),D)===60);

 /* ③ 빈 칸 → study 블록, 과제 이름을 제목으로 */
 await p.evaluate(({d,at})=>{const r={id:'p2',date:d,mins:10,plan:10,unitId:'u031',at};DB.study.pomos.push(r);stPomoLog(r);},{d:D,at:kst(D,'08:05')});
 ok('C1 빈 칸 study 블록',(await tl()).includes('16-16:study'));
 ok('C2 제목 = 뽀모 · 과제',await p.evaluate(d=>DB.timelog[d].find(b=>b.s===16).title==='뽀모 · 단어 p160',D));
 ok('C3 누적 35분',await p.evaluate(d=>stStudyMins(d),D)===35);

 /* ④ 서브 활동이 이미 있는 칸(식사+휴식)은 그대로 — 시간은 뽀모로 센다 */
 await p.evaluate(({d,at})=>{const r={id:'p3',date:d,mins:15,plan:15,at};DB.study.pomos.push(r);stPomoLog(r);},{d:D,at:kst(D,'21:00')});
 ok('D1 식사+휴식 칸 보존',(await tl()).includes('42-45:meal+rest'));
 ok('D2 그래도 학습시간에 들어간다',await p.evaluate(d=>stStudyMins(d),D)===50);

 /* ⑤ 로한이 손으로 study 를 찍은 칸 + 뽀모 → 뽀모 분만(30+10 아님) */
 await p.evaluate(d=>{tlPut(d,{s:10,e:10,tag:'study',title:'손으로',code:null});},D);
 ok('E1 손으로 찍은 study 칸은 30분',await p.evaluate(d=>stStudyMins(d),D)===80);
 await p.evaluate(({d,at})=>{const r={id:'p4',date:d,mins:10,plan:10,at};DB.study.pomos.push(r);stPomoLog(r);},{d:D,at:kst(D,'05:10')});
 ok('E2 같은 칸에 뽀모 10분 → 그 칸은 10분',await p.evaluate(d=>stStudyMins(d),D)===60);
 ok('E3 이미 study 인 칸은 안 건드린다',await p.evaluate(d=>DB.timelog[d].find(b=>b.s===10).title==='손으로',D));

 /* ⑥ 로한이 표시를 지워도(블록을 다시 써도) 뽀모 시간은 남는다 — 세기와 표시가 분리됐다 */
 await p.evaluate(d=>{tlPut(d,{s:38,e:39,tag:'work',title:'채움',code:null});},D);
 ok('F1 표시를 지워도 학습시간 불변',await p.evaluate(d=>stStudyMins(d),D)===60);

 /* ⑦ 자정을 넘긴 뽀모 — 그날 마지막 칸 + 넘친 분 */
 await p.evaluate(({d,at})=>{const r={id:'p5',date:d,mins:25,plan:25,at};DB.study.pomos.push(r);stPomoLog(r);},{d:D,at:kst(D,'23:50')});
 ok('G1 마지막 칸 study',(await tl()).includes('47-47:study'));
 ok('G2 넘친 분도 센다(+25)',await p.evaluate(d=>stStudyMins(d),D)===85);

 /* ⑧ 다른 날짜로 연 뽀모 — 그 날짜에 분만 센다 */
 await p.evaluate(({at})=>{const r={id:'p6',date:'2026-09-10',mins:12,plan:12,at};DB.study.pomos.push(r);},{at:kst(D,'13:00')});
 ok('H1 연 날짜에 12분',await p.evaluate(()=>stStudyMins('2026-09-10'))===12);
 ok('H2 실제 날짜엔 안 섞인다',await p.evaluate(d=>stStudyMins(d),D)===85);

 /* ⑨ 뽀모를 끝내면(stPomoStop) 바로 남는다 */
 await p.evaluate(d=>{DB.timelog={};DB.study.pomos=[];DB.ui.pomo={focus:25,brk:0,date:d,unitId:''};stPomoStart('focus');DB.ui.pomoRun.at=Date.now()-20*60*1000;stPomoStop();},D);
 ok('I1 종료 즉시 타임로그에 남는다',await p.evaluate(()=>Object.values(DB.timelog).some(a=>a.some(b=>b.tag==='study'&&b.title==='뽀모'))));
 ok('I2 종료분 tl 표시',await p.evaluate(()=>DB.study.pomos[0].tl===true));

 /* ⑩ 캘린더 패널이 덧셈식을 안 쓴다 */
 await p.evaluate(d=>{DB.timelog={[d]:[{s:38,e:39,tag:'work',tag2:'study',title:'채움',code:null}]};
   DB.study.pomos=[{id:'q',date:d,mins:25,plan:25,at:new Date(d+'T19:17:00+09:00').toISOString(),tl:true}];
   gotoTab('study');setStTab('cal');setStCalSel(d);},D);
 await p.waitForTimeout(300);
 const side=await p.evaluate(()=>document.querySelector('#v-study .calside').textContent);
 ok('J1 합계 25분',side.includes('25분'));
 ok('J2 뽀모 포함 표기',side.includes('뽀모 25분 포함'));
 ok('J3 덧셈식(60+25) 없음',!side.includes('(60+25)'));

 for(const r of R)assert.ok(r.v,r.n);
 assert.deepEqual(errs,[]);
 console.log('전부 통과 ('+R.length+'건)');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
