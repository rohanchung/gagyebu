/* v4.15 — 🔴 중복 id. 로한 신고(9/21): 「くるま」를 묻는데 보기가 특히·언젠가·특별히·잘하다 — 정답이 없다.
   🔎 실데이터(2026-09-20 DB): words 에 id 가 겹친 레코드 17쌍(w0508~w0524), units 2쌍(u042·u043).
      부사 묶음과 v20 신규단어 묶음이 같은 번호대를 썼다.
   🔒 여기서 증명할 것 두 가지:
      ① 문항과 화면이 같은 레코드를 가리킨다 (정답 없는 보기가 안 나온다)
      ② 병합·흡수가 겹친 레코드를 삼키지 않는다 (이게 더 크다 — 유실 장치가 유실을 낸다) */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const FILE=process.argv[2]||path.join(__dirname,'..','index.html');

/* 실제로 겹쳐 있던 쌍 그대로 — 앞이 부사, 뒤가 v20 신규 명사 */
const DUP=[
 ['w0508','かなり','','꽤, 상당히',      'がいこくじん','外国人','외국인'],
 ['w0512','そんなに','','그렇게',        'たいふう','台風','태풍'],
 ['w0516','ただいま','','지금 막',       'としょかん','図書館','도서관'],
 ['w0524','とくべつに','','특별히',      'くるま','車','자동차']];
const words=[];
DUP.forEach(a=>{
  words.push({id:a[0],lv:'N4',src:'부사',kana:a[1],kanji:a[2],ko:a[3],cat:'native',flag:false,seen:0,miss:0,streak:0,lastSeen:null});
  words.push({id:a[0],lv:'N4',src:'p208',kana:a[4],kanji:a[5],ko:a[6],cat:'native',flag:false,seen:0,miss:0,streak:0,lastSeen:null});
});
/* 겹치지 않는 보통 단어 — 교정이 멀쩡한 레코드를 건드리면 안 된다 */
['とくに|특히, 특별히','いつか|언젠가','とくい|잘하다, 자신 있다','ほん|책','みず|물','そら|하늘'].forEach((x,i)=>{
  const [k,ko]=x.split('|');
  words.push({id:'n'+i,lv:'N4',src:'p1',kana:k,kanji:'',ko,cat:'native',flag:false,seen:0,miss:0,streak:0,lastSeen:null});});
const units=[{id:'u042',title:'[추석] 드릴만',day:'2026-09-24'},{id:'u042',title:'[아침] 3장 핵심문법',day:'2026-09-21'},
             {id:'u043',title:'[추석] 접속사',day:'2026-09-25'},{id:'u043',title:'[아침] 예상어휘',day:'2026-09-21'}];

const STATE={schemaVersion:7,goals:[],routines:[],checks:{},rewards:[],rewardCards:{},
 rewardCfg:{weekFullDays:4,monthWeeks:4,yearMonths:9},ui:{month:'2026-09'},
 accounts:[],transactions:[],categories:[],cards:[],debts:[],journal:[],items:[],logs:[],
 health:{weights:[],labs:[],labDates:[],labTypes:[],labMeds:[],labValues:{},events:[]},
 study:{v:1,words,sents:[],units,tests:[],errors:[],drills:[],pomos:[],books:[],phases:[],week:{},month:{},logs:{}}};

(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
 const c=await b.newContext({viewport:{width:1280,height:900}});
 await c.addInitScript(({st})=>{const store={v:JSON.parse(JSON.stringify(st))};window.__store=store;
   let _m=null,_p=null;const q={select(){if(_m==='update'){_m=null;store.v=_p.data;store.at=_p.updated_at;return Promise.resolve({data:[{updated_at:store.at}]});}return q},eq(){return q},maybeSingle(){return Promise.resolve({data:{data:store.v,updated_at:store.at||null}})},update(p){_m='update';_p=p;return q},upsert(row){store.v=row.data;store.at=row.updated_at;return Promise.resolve({})},order(){return q},limit(){return q},insert(){return Promise.resolve({data:[],error:null})},delete(){return q},in(){return q},then(a){return Promise.resolve({data:[],error:null}).then(a)}};
   window.supabase={createClient:()=>({from:()=>q,auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};},{st:STATE});
 const p=await c.newPage(),errs=[];
 p.on('pageerror',e=>errs.push(e.message));
 await p.route('https://**/*',r=>r.abort());
 await p.goto('file:///'+FILE.replace(/\\/g,'/').replace(/^\//,''));
 await p.waitForFunction(()=>typeof DB!=='undefined'&&DB&&DB.study&&DB.study.words);
 await p.waitForTimeout(600);
 const R=[];const ok=(n,v,x)=>R.push({n,v:!!v,x});

 /* ── A) 로드 때 번호를 가른다. 레코드는 하나도 안 없앤다 ── */
 const A=await p.evaluate(()=>({
   n:DB.study.words.length, u:DB.study.units.length,
   uniq:new Set(DB.study.words.map(w=>w.id)).size,
   uuniq:new Set(DB.study.units.map(x=>x.id)).size,
   fix:DUP_FIX.n, where:DUP_FIX.where,
   kept:DB.study.words.filter(w=>w.id==='w0524').map(w=>w.kana),
   kuruma:(DB.study.words.find(w=>w.kana==='くるま')||{}).id}));
 ok('A1 단어 14건이 그대로 있다 — 지우지 않는다',A.n===14,String(A.n));
 ok('A2 id 가 전부 달라졌다',A.uniq===14,String(A.uniq));
 ok('A3 과제 4건 · id 4개',A.u===4&&A.uuniq===4,A.u+'/'+A.uuniq);
 ok('A4 교정 건수 6건(단어 4 · 과제 2)',A.fix===6,String(A.fix)+' '+JSON.stringify(A.where));
 ok('A5 어디를 고쳤는지 말한다',A.where.join('|').indexOf('단어')>=0&&A.where.join('|').indexOf('과제')>=0,JSON.stringify(A.where));
 /* 🔒 앞엣것이 번호를 지킨다 — 참조(errors·drills.wrongIds)가 가리킬 곳이 고정돼야 한다 */
 ok('A6 앞엣것(부사 とくべつに)이 w0524 를 지킨다',A.kept.length===1&&A.kept[0]==='とくべつに',JSON.stringify(A.kept));
 ok('A7 뒤엣것(くるま)이 새 번호를 받았다',!!A.kuruma&&A.kuruma!=='w0524',String(A.kuruma));
 /* 🔒 고쳤으면 서버에 쓴다 — 안 쓰면 다음 로드에 또 겹친 채로 온다 */
 ok('A8 고친 결과가 저장된다',await p.evaluate(()=>new Set((window.__store.v.study.words||[]).map(w=>w.id)).size===14));
 ok('A9 활동 로그에 남는다',await p.evaluate(()=>(DB.activity||[]).some(a=>/중복 id/.test(a&&a.m||''))),
    await p.evaluate(()=>JSON.stringify((DB.activity||[]).slice(0,2))));

 /* ── B) 🔴 정답 없는 보기 — 문항과 화면이 같은 레코드를 가리킨다 ── */
 const B=await p.evaluate(()=>{
   const bad=[];
   for(let k=0;k<60;k++){
     stDrillStart('r2m',10);
     const D=ST_DRILL;
     for(let i=0;i<D.ids.length;i++){
       const w=stWordById(D.ids[i]), opts=D.opts[i];
       if(!w){bad.push('레코드 없음 '+D.ids[i]);continue;}
       /* 화면이 그리는 단어의 뜻이 보기에 있어야 한다 */
       if(!opts.some(o=>stIsRight(w,'r2m',o)))bad.push(w.kana+' → '+opts.join('/'));
     }
     stDrillClose();
   }
   return bad;});
 ok('B1 600문항 전부 보기에 정답이 있다',B.length===0,JSON.stringify(B.slice(0,3)));
 /* 🔒 첫 번째를 돌려준다 — forEach 로 돌아 마지막이 남던 것이 9/21 「くるま」사건이다 */
 ok('B2 stWordById 는 첫 번째를 돌려준다',
    await p.evaluate(()=>{DB.study.words.push({id:'n0',kana:'가짜',ko:'가짜'});
      const r=stWordById('n0').kana; DB.study.words.pop(); return r==='とくに';}));

 /* ── C) 🔴 병합 — 겹친 번호는 **내 채점이 엉뚱한 레코드로 덮인다** ──
    ⚠️ 레코드 **개수**가 주는 게 아니다(처음엔 그렇게 짐작했는데 아니었다).
       mrgArr 은 id → 레코드 맵을 만드는데, 겹치면 맵에 **마지막 것만** 남는다.
       그래서 앞엣것(とくべつに)에 쌓은 seen·miss 를 뒤엣것(くるま) 기준으로 비교하고,
       "내가 안 바꿨다"고 판정해 **서버 것으로 되돌린다.** 채점 기록이 조용히 사라진다. */
 const C=await p.evaluate(()=>{
   window.mk2=()=>JSON.parse(JSON.stringify({study:{words:[
     {id:'d1',kana:'あ',ko:'가',seen:0},{id:'d1',kana:'い',ko:'나',seen:0},{id:'d2',kana:'う',ko:'다',seen:0}]}}));
   const run=(fix)=>{
     const base=mk2(),srv=mk2(),loc=mk2();
     loc.study.words[0].seen=1;          /* 내가 あ 를 한 번 풀었다 */
     srv.study.words.push({id:'d3',kana:'え',ko:'라',seen:0});   /* 그 사이 학습방이 한 건 넣었다 */
     if(fix){fixDupIds(base,true);fixDupIds(srv,true);fixDupIds(loc,true);}
     const m=mrg3(base,loc,srv).study.words;
     const a=m.find(w=>w.kana==='あ');
     return {n:m.length,seen:a?(+a.seen||0):-1,kanas:m.map(w=>w.kana).join('')};
   };
   return {bad:run(false),good:run(true)};});
 ok('C1 겹친 채로 병합하면 내 채점이 사라진다 — 이게 진짜 결함이다',C.bad.seen===0,JSON.stringify(C.bad));
 ok('C2 번호를 가르면 채점이 산다',C.good.seen===1,JSON.stringify(C.good));
 ok('C3 레코드는 양쪽 다 4건 — 개수가 아니라 내용이 망가진다',C.bad.n===4&&C.good.n===4,C.bad.n+'/'+C.good.n);
 /* 🔒 새 번호가 결정적이어야 한다 — uid() 면 세 쪽이 다른 번호를 받아 복사본이 늘어난다 */
 ok('C4 새 번호는 결정적이다(d1#2)',
    await p.evaluate(()=>{const a=mk2();fixDupIds(a,true);const b=mk2();fixDupIds(b,true);
      return a.study.words[1].id==='d1#2'&&b.study.words[1].id==='d1#2';}));
 /* 흡수(syncAbsorb)는 have[id] 로 거른다 — 겹친 채로 오면 한 건만 들어왔다 */
 const D2=await p.evaluate(()=>{
   const srv={study:{words:[{id:'z1',kana:'ざ',ko:'자'},{id:'z1',kana:'ぜ',ko:'제'}],sents:[],units:[],errors:[],tests:[],drills:[]}};
   const n=DB.study.words.length;
   syncAbsorb(srv);
   return {added:DB.study.words.length-n,kanas:DB.study.words.slice(n).map(w=>w.kana).join('')};});
 ok('C5 흡수도 정규화한다 — 겹쳐서 와도 두 건 다 들어온다',D2.added===2&&D2.kanas==='ざぜ',JSON.stringify(D2));

 /* ── D) 화면이 드러낸다 ── */
 await p.evaluate(()=>{document.getElementById('login').style.display='none';document.getElementById('app').classList.add('on');gotoTab('study');setStTab('word');});
 await p.waitForTimeout(300);
 const html=await p.evaluate(()=>document.getElementById('v-study').innerHTML);
 ok('D1 몇 건을 갈랐는지 화면이 말한다',/번호\(id\)가 겹친 레코드/.test(html)&&/6건/.test(html),'');
 ok('D2 올리는 쪽이 고쳐야 한다고 말한다',/번호를 겹쳐 쓰지 말아야/.test(html),'');

 ok('Z JS 에러 0',errs.length===0,errs[0]||'');
 for(const r of R)assert.ok(r.v,r.n+(r.x?'  → '+r.x:''));
 assert.deepEqual(errs,[]);
 console.log('전부 통과 ('+R.length+'건)');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
