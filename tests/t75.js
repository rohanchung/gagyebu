/* t75 — 🧩 유의표현: 같은 뜻 덩어리는 오답 보기로 안 나온다 (v4.86)
   로한 11/6: 「오늘 공부한 유의표현이니까 드릴로 제작해놓고 학습DB에 저장해」 — 다락원 N4 もんだい4 기출어휘 95~118쪽
   🔴 교재의 시험 꼴(うそでした · はこびましょう …)을 기존 짝 옆에 그냥 넣으면 옛 짝의 답이 오답 보기로 섞여 **정답이 둘**이 된다.
   🔒 S1 같은 덩어리(grp·같은 표현·같은 답·짝의 짝을 끝까지)의 답은 보기에 없다 — 문항마다 60번 만들어 본다
      S2 보기는 늘 4개 · 정답 하나 · S3 새 짝이 드릴 풀에 들어간다 · S4 덩어리 계산 — 이어진 것은 하나 */
const {chromium}=require('playwright');const path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','work.html');
let pass=0,fail=0;const bad=[];
const ok=(n,c,x)=>{if(c)pass++;else{fail++;bad.push(n+(x!==undefined?'  → '+x:''));}};
const FIX=[{"id":"sy015","ja":"うそです","syn":"ほんとうじゃ ありません","lv":"N4","slots":[],"seen":0,"miss":0},{"id":"sy099","ja":"はこぶ","syn":"わたす","lv":"N4","slots":[],"seen":0,"miss":0},{"id":"sy100","ja":"はこんで","syn":"もって いて","lv":"N4","slots":[],"seen":0,"miss":0},{"id":"sy024","ja":"おきゃくさんが すくないです","syn":"おきゃくさんが あまり いません","lv":"N4","slots":[],"seen":0,"miss":0},{"id":"sy025","ja":"おきゃくさんが すくないです","syn":"すいて います","lv":"N4","slots":[],"seen":0,"miss":0},{"id":"sy022","ja":"おきゃくさんが 多いです","syn":"こんで います","lv":"N4","slots":[],"seen":0,"miss":0},{"id":"sy023","ja":"おきゃくさんが 多いです","syn":"おきゃくさんが たくさん います","lv":"N4","slots":[],"seen":0,"miss":0},{"id":"sy071","ja":"しょくじする","syn":"ごはんを 食べる","lv":"N4","slots":[],"seen":0,"miss":0},{"id":"sy108","ja":"ふえました","syn":"多く なりました","lv":"N4","slots":[],"seen":0,"miss":0},{"id":"sy085","ja":"ちゅうしゃじょう","syn":"じどうしゃを とめる ところ","lv":"N4","slots":[],"seen":0,"miss":0},{"id":"sy020","ja":"うんどうできません","syn":"スポーツして いません","lv":"N4","slots":[],"seen":0,"miss":0},{"id":"sy070","ja":"しょうらいの けいかく","syn":"これからの けいかく","lv":"N4","slots":[],"seen":0,"miss":0},{"id":"sy060","ja":"さいしょに","syn":"はじめに","lv":"N4","slots":[],"seen":0,"miss":0},{"id":"sy061","ja":"さいしょに","syn":"まず","lv":"N4","slots":[],"seen":0,"miss":0},{"id":"sy016","ja":"うつくしい","syn":"きれいだ","lv":"N4","slots":[],"seen":0,"miss":0},{"id":"sy032","ja":"おどろきました","syn":"びっくりしました","lv":"N4","slots":[],"seen":0,"miss":0},{"id":"sy040","ja":"きく","syn":"たずねる","lv":"N4","slots":[],"seen":0,"miss":0},{"id":"sy047","ja":"きんじょ","syn":"ちかく","lv":"N4","slots":[],"seen":0,"miss":0},{"id":"sy083","ja":"だいじだ","syn":"たいせつだ","lv":"N4","slots":[],"seen":0,"miss":0},{"id":"sy094","ja":"とられる","syn":"ぬすまれる","lv":"N4","slots":[],"seen":0,"miss":0},{"id":"sy112","ja":"やわらかい","syn":"かたくない","lv":"N4","slots":[],"seen":0,"miss":0},{"id":"sy105","ja":"ひつようです","syn":"いります","lv":"N4","slots":[],"seen":0,"miss":0},{"lv":"N4","slots":[],"seen":0,"miss":0,"id":"sy116","ja":"ちゅうしゃじょう","syn":"くるまを とめる ばしょ","ko":"주차장","synKo":"자동차를 세우는 곳","grp":"sy085","src":"b1:98"},{"lv":"N4","slots":[],"seen":0,"miss":0,"id":"sy117","ja":"うそでした","syn":"ほんとうじゃ ありませんでした","ko":"거짓말이었습니다","synKo":"사실이 아니었습니다","grp":"sy015","src":"b1:106"},{"lv":"N4","slots":[],"seen":0,"miss":0,"id":"sy118","ja":"しょうらい","syn":"これからの こと","ko":"장래","synKo":"앞으로의 일","grp":"sy070","src":"b1:107"},{"lv":"N4","slots":[],"seen":0,"miss":0,"id":"sy119","ja":"はこびましょう","syn":"わたしましょう","ko":"옮깁시다","synKo":"건넵시다","grp":"sy099","src":"b1:108"},{"lv":"N4","slots":[],"seen":0,"miss":0,"id":"sy120","ja":"はこんで くれました","syn":"もって いって くれました","ko":"옮겨 주었습니다","synKo":"가지고 가 주었습니다","grp":"sy100","src":"b1:108"},{"lv":"N4","slots":[],"seen":0,"miss":0,"id":"sy121","ja":"うんどう","syn":"スポーツ","ko":"운동","synKo":"스포츠","grp":"sy020","src":"b1:114"},{"lv":"N4","slots":[],"seen":0,"miss":0,"id":"sy122","ja":"きゃくが すくない","syn":"すいて いる","ko":"손님이 적다","synKo":"비어 있다","grp":"sy025","src":"b1:115"},{"lv":"N4","slots":[],"seen":0,"miss":0,"id":"sy123","ja":"きゃくが たくさん いる","syn":"こんで いる","ko":"손님이 많이 있다","synKo":"붐빈다","grp":"sy022","src":"b1:115"},{"lv":"N4","slots":[],"seen":0,"miss":0,"id":"sy124","ja":"しょくじに しましょう","syn":"ごはんを 食べましょう","ko":"식사하도록 합시다","synKo":"밥을 먹읍시다","grp":"sy071","src":"b1:116"},{"lv":"N4","slots":[],"seen":0,"miss":0,"id":"sy125","ja":"はじめに","syn":"まず","ko":"먼저","synKo":"우선","grp":"sy060","src":"b1:118"},{"lv":"N4","slots":[],"seen":0,"miss":0,"id":"sy126","ja":"ふえる","syn":"多く なる","ko":"늘어나다","synKo":"많아지다","grp":"sy108","src":"b1:118"}];
/* 사람이 정한 「같은 뜻」 덩어리 — 이 안의 답은 서로의 정답이다 */
const CL=[["sy015","sy117"],["sy099","sy119"],["sy100","sy120"],["sy024","sy025","sy122"],["sy022","sy023","sy123"],
  ["sy071","sy124"],["sy108","sy126"],["sy085","sy116"],["sy020","sy121"],["sy070","sy118"],["sy060","sy061","sy125"]];
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(require('fs').existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 try{
  const ctx=await b.newContext({viewport:{width:1280,height:900}});
  await ctx.addInitScript(()=>{
   function mk(){const q={select(){return q},eq(){return q},order(){return q},limit(){return q},in(){return q},gt(){return q},update(){return q},
     upsert(){return Promise.resolve({})},insert(){return Promise.resolve({data:[],error:null})},delete(){return q},
     maybeSingle(){return Promise.resolve({data:null,error:null})},then(a){return Promise.resolve({data:[],error:null}).then(a)}};return q;}
   window.supabase={createClient:()=>({from:()=>mk(),rpc:()=>Promise.resolve({data:null,error:null}),
     auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};});
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/*supabase*',r=>r.abort());
  await p.goto('file://'+file);await p.waitForTimeout(1500);
  const R=await p.evaluate(({FIX,CL})=>{
    DB.study.sents=JSON.parse(JSON.stringify(FIX));
    const byId={};FIX.forEach(x=>byId[x.id]=x);
    const clOf={};CL.forEach((c,i)=>c.forEach(id=>clOf[id]=i));
    const leaks=[],shape=[];
    FIX.forEach(s=>{
      const okSyn={};okSyn[s.syn]=1;
      if(clOf[s.id]!=null)CL[clOf[s.id]].forEach(id=>okSyn[byId[id].syn]=1);
      for(let t=0;t<60;t++){
        const q=stSynQ(s); if(!q){shape.push(s.id+':null');break;}
        if(q.opts.length!==4||q.opts.filter(o=>o===s.syn).length!==1)shape.push(s.id+':'+q.opts.join('/'));
        q.opts.forEach(o=>{if(o!==s.syn&&okSyn[o])leaks.push(s.ja+' ← '+o);});
      }
    });
    const comp=stSynComp(stSynPool());
    const compOk=CL.every(c=>c.every(id=>comp[id]===comp[c[0]]));
    const pool=stGramPool('gsyn').map(x=>x.id);
    return {leaks:[...new Set(leaks)],shape:[...new Set(shape)].slice(0,5),compOk,newIn:['sy116','sy117','sy121','sy125','sy126'].every(id=>pool.includes(id)),n:pool.length};
  },{FIX,CL});
  ok('S1 🔴 같은 뜻 덩어리의 답이 오답 보기로 안 나온다',R.leaks.length===0,R.leaks.join(' · '));
  ok('S2 보기 4개 · 정답 하나',R.shape.length===0,R.shape.join(' | '));
  ok('S3 새 짝이 유의표현 드릴 풀에 들어간다',R.newIn,R.n);
  ok('S4 이어진 짝은 한 덩어리',R.compOk);
  ok('Z 페이지 에러 없음',errs.length===0,errs.join(' | '));
  await ctx.close();
 }catch(e){fail++;bad.push('예외 '+e.message);}finally{await b.close();}
 console.log('t75 '+pass+'/'+(pass+fail)+(bad.length?'\n  ✗ '+bad.join('\n  ✗ '):''));process.exit(fail?1:0);
})();
