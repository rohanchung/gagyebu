/* 🎱 4구 물리 엔진(billiards/physics.js) — 브라우저 없이 node 로 돈다
   🔒 잠그는 것
     · 교과서 값: 반공(1/2) 1적구 30° · 자연 구름 수구 ≈33° · 멈춤샷 ≈90° 분리 · 끌기는 90° 넘게 · 밀기는 구름보다 좁게
     · 좌우 회전: 오른쪽 회전으로 쿠션을 정면으로 치면 오른쪽으로 튄다
     · 아버지 기준 "보통 속도(3단) = 어느 방향이든 2쿠션" — 짧은 방향·긴 방향·대각선
     · 속도가 오를수록 쿠션 수가 줄지 않는다 · 모든 공은 결국 멈춘다
   argv[2](HTML)는 쓰지 않는다. */
const path=require('path'),assert=require('assert');
const P=require(path.join(__dirname,'..','billiards','physics.js'));
const R=P.DEF.R,deg=a=>a*180/Math.PI,norm=a=>{while(a>180)a-=360;while(a<-180)a+=360;return a;};
const out=[];const ok=(n,v,x)=>out.push({n,v:!!v,x});

/* 두께 t(0~1)로 수구→1적구, 맞은 뒤 1적구 방향 · 수구가 곧게 가기 시작한 방향(조준 기준 각) */
function sep(t,tip,V,d){
  const c={x:0.5,y:0.56},o={x:0.5+d,y:0.56},th=Math.asin((1-t)*2*R/d),dir={x:Math.cos(th),y:Math.sin(th)};
  const r=P.simulate({balls:{c,o},cue:'c',dir,V,tip});
  const h=r.events.find(e=>e.type==='ball');if(!h)return null;
  const ov=h.vb,aim=Math.atan2(dir.y,dir.x);
  const ev=r.events.find(e=>e.t>h.t&&e.ball==='c'&&(e.type==='roll'||e.type==='cushion'||e.type==='stop'));
  let cd=null;if(ev&&ev.type==='roll')cd=ev.v;else if(ev)cd=[ev.x-h.x,ev.y-h.y];
  return {obj:Math.abs(norm(deg(Math.atan2(ov[1],ov[0])-aim))),cue:cd?Math.abs(norm(deg(Math.atan2(cd[1],cd[0])-aim))):null,
    sep:cd?Math.abs(norm(deg(Math.atan2(cd[1],cd[0])-Math.atan2(ov[1],ov[0])))):null};
}
const half=sep(0.5,{x:0,y:0},1.6,1.0);
ok('P1 반공 1적구 30°',Math.abs(half.obj-30)<1,half);
ok('P2 자연 구름 반공 수구 28~36°',half.cue>=28&&half.cue<=36,half);
const q=sep(0.25,{x:0,y:0},1.6,1.0),t3=sep(0.75,{x:0,y:0},1.6,1.0);
ok('P3 얇을수록 1적구 각이 크다(1/4 > 1/2 > 3/4)',q.obj>half.obj&&half.obj>t3.obj,[q.obj,half.obj,t3.obj]);
ok('P4 1/4 두께 1적구 ≈48.6°',Math.abs(q.obj-48.6)<1.5,q.obj);
const stun=sep(0.5,{x:0,y:0},4.0,0.08);   /* 정중앙 · 가까이 · 세게 = 맞는 순간 회전이 거의 없다 */
ok('P5 멈춤샷 분리 84~92° (반발 0.94 라 90°보다 조금 작다)',stun.sep>=84&&stun.sep<=92,stun);
const draw=sep(0.5,{x:0,y:1},2.5,0.3);
ok('P6 끌기 → 수구 90° 넘게',draw.cue>90,draw);
const fol=sep(0.5,{x:0,y:-1},2.2,0.25);
ok('P7 강한 밀기(짧은 거리) → 수구 각이 구름보다 좁다',fol.cue<half.cue,[fol.cue,half.cue]);

/* 좌우 회전 — 쿠션 정면 */
function eng(a){const r=P.simulate({balls:{c:{x:1.12,y:0.8}},cue:'c',dir:{x:0,y:-1},V:1.5,tip:{x:a,y:0}});
  const c=r.events.find(e=>e.type==='cushion');const f=r.frames.find(f=>f.t>c.t+0.3);return f.p.c[0]-1.12;}
ok('P8 오른쪽 회전 → 오른쪽으로 튄다',eng(1)>0.03,eng(1));
ok('P9 왼쪽 회전 → 왼쪽으로 튄다',eng(-1)<-0.03,eng(-1));
ok('P10 무회전 → 거의 곧게',Math.abs(eng(0))<0.005,eng(0));

/* 보통 속도 = 2쿠션 (아버지) */
const cush=(x,y,dx,dy,V)=>P.simulate({balls:{c:{x,y}},cue:'c',dir:{x:dx,y:dy},V,tip:{x:0,y:0}}).events.filter(e=>e.type==='cushion').length;
const V3=P.SPEED[2];
ok('P11 3단(보통) 짧은 방향 = 2쿠션',cush(1.12,0.56,0,-1,V3)===2,cush(1.12,0.56,0,-1,V3));
ok('P12 3단(보통) 긴 방향 = 2쿠션',cush(0.56,0.56,1,0,V3)===2,cush(0.56,0.56,1,0,V3));
ok('P13 3단(보통) 대각선 = 2쿠션',cush(0.56,0.84,Math.cos(-0.5),Math.sin(-0.5),V3)===2,cush(0.56,0.84,Math.cos(-0.5),Math.sin(-0.5),V3));
const byS=P.SPEED.map(V=>cush(1.12,0.56,0,-1,V));
ok('P14 속도가 오르면 쿠션 수가 줄지 않는다',byS.every((n,i)=>i===0||n>=byS[i-1]),byS);
ok('P15 1단은 3단보다 적게 · 5단은 많이',byS[0]<byS[2]&&byS[4]>byS[2],byS);

/* 멈춤 · 네 공 */
const four=P.simulate({balls:{w:{x:0.56,y:0.84},y:{x:0.56,y:0.28},r:{x:1.68,y:0.56},r2:{x:1.12,y:0.56}},cue:'w',dir:{x:1,y:-0.2},V:P.SPEED[4],tip:{x:0.3,y:-0.3}});
ok('P16 5단 · 네 공도 결국 모두 멈춘다',four.T<P.DEF.tMax&&['w','y','r','r2'].every(id=>four.events.some(e=>e.type==='stop'&&e.ball===id)||four.frames[0].p[id][0]===four.stops[id][0]),four.T);
ok('P17 공이 테이블 밖으로 안 나간다',four.frames.every(f=>Object.values(f.p).every(p=>p[0]>=R-1e-6&&p[0]<=P.DEF.L-R+1e-6&&p[1]>=R-1e-6&&p[1]<=P.DEF.W-R+1e-6)));
/* 같은 입력 → 같은 결과(결정적) */
const a1=P.simulate({balls:{c:{x:0.5,y:0.5}},cue:'c',dir:{x:1,y:0.3},V:2,tip:{x:0.2,y:0.1}}),a2=P.simulate({balls:{c:{x:0.5,y:0.5}},cue:'c',dir:{x:1,y:0.3},V:2,tip:{x:0.2,y:0.1}});
ok('P18 같은 조건 → 같은 결과',JSON.stringify(a1.stops)===JSON.stringify(a2.stops));

let f=0;out.forEach(r=>{console.log((r.v?'✓':'✗')+' '+r.n+(r.v?'':'  → '+JSON.stringify(r.x)));if(!r.v)f++;});
if(f){console.log('실패 '+f+'건');process.exit(1);}
console.log('전부 통과 ('+out.length+'건)');
