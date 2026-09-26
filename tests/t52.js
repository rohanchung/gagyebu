/* v4.20 🔒 문지기 — 같은 Supabase 에 아버지 당구 연습장(billiards/) 계정이 산다.
   그 계정으로 로한북에 들어오면 로그아웃시키고 당구 연습장으로 안내한다.
   DB(RLS)에서도 막혀 있지만, 빈 가계부 화면이 뜨면 아버지가 헷갈린다. */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
const FILE=process.argv[2]||path.join(__dirname,'..','index.html');

async function open(b,user){
 const c=await b.newContext({viewport:{width:1400,height:900}});
 await c.addInitScript(({user})=>{
   window.__out=0;window.__loaded=0;
   const q={select(){return q},eq(){return q},order(){return q},limit(){return q},in(){return q},
     maybeSingle(){window.__loaded++;return Promise.resolve({data:null})},
     update(){return q},upsert(){return Promise.resolve({})},insert(){return Promise.resolve({data:[],error:null})},delete(){return q},
     then(a){return Promise.resolve({data:[],error:null}).then(a)}};
   window.supabase={createClient:()=>({from:()=>q,auth:{
     getSession:()=>Promise.resolve({data:{session:{user}}}),
     signOut:()=>{window.__out++;return Promise.resolve({})},
     onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};},{user});
 const p=await c.newPage(),errs=[];
 p.on('pageerror',e=>errs.push(e.message));
 await p.route('https://**/*',r=>r.abort());
 await p.goto('file:///'+FILE.replace(/\\/g,'/').replace(/^\//,''));
 await p.waitForTimeout(800);
 return {p,errs,c};
}

(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||(fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined)});
 const R=[];const ok=(n,v,x)=>R.push({n,v:!!v,x});
 try{
  /* A) 아버지 계정 → 못 들어온다 */
  {const {p,errs,c}=await open(b,{id:'dad',app_metadata:{provider:'email',app:'billiards'}});
   const s=await p.evaluate(()=>({out:window.__out,loaded:window.__loaded,user:USER,
     app:document.getElementById('app').classList.contains('on'),
     login:getComputedStyle(document.getElementById('login')).display,
     err:document.getElementById('loginErr').textContent,
     href:(document.querySelector('#loginErr a')||{}).getAttribute&&document.querySelector('#loginErr a').getAttribute('href')}));
   ok('A1 로그아웃 호출',s.out===1,s.out);
   ok('A2 앱 화면 안 켜짐',!s.app);
   ok('A3 로그인 화면 그대로',s.login!=='none',s.login);
   ok('A4 가계부를 불러오지 않는다',s.loaded===0,s.loaded);
   ok('A5 USER 비움',s.user===null);
   ok('A6 안내 문구',/로한북 계정이 아닙니다/.test(s.err),s.err);
   ok('A7 당구 연습장 링크',s.href==='billiards/',s.href);
   ok('A8 에러 없음',!errs.length,errs.join(' / '));
   await c.close();}
  /* B) 로한 계정 → 그대로 들어온다 */
  {const {p,errs,c}=await open(b,{id:'u1',app_metadata:{provider:'email'}});
   const s=await p.evaluate(()=>({out:window.__out,loaded:window.__loaded,
     app:document.getElementById('app').classList.contains('on')}));
   ok('B1 로그아웃 안 함',s.out===0,s.out);
   ok('B2 앱 화면 켜짐',s.app);
   ok('B3 가계부를 불러온다',s.loaded>=1,s.loaded);
   ok('B4 에러 없음',!errs.length,errs.join(' / '));
   await c.close();}
  /* C) app_metadata 가 없는 옛 세션도 로한으로 본다 */
  {const {p,c}=await open(b,{id:'u1'});
   ok('C1 app_metadata 없음 → 입장',await p.evaluate(()=>document.getElementById('app').classList.contains('on')));
   await c.close();}
 }finally{await b.close();}
 let f=0;R.forEach(r=>{console.log((r.v?'✓':'✗')+' '+r.n+(r.v?'':'  → '+JSON.stringify(r.x)));if(!r.v)f++;});
 if(f){console.log('실패 '+f+'건');process.exit(1);}
 console.log('전부 통과 ('+R.length+'건)');
})().catch(e=>{console.error(e);process.exit(1);});
