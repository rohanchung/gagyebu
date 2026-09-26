/* 🎱 4구 물리 엔진 — 당구 연습장 v2 (2026-09-26)
 *
 * 무엇을 계산하나 (위에서 내려다본 2D + 회전 3축)
 *   · 큐 타격: 조준 방향·속도·당점 → 처음 속도와 회전(밀기·끌기·좌우)
 *   · 천 위: 미끄러짐(슬라이딩) → 구름(롤링). 밀기·끌기로 휘는 궤적이 여기서 저절로 나온다
 *   · 공끼리: 두께에 따라 갈라진다(마찰 없는 순간 충돌). 회전은 그대로 남아 이후 궤적을 휜다
 *   · 쿠션: 반발 + 좌우 회전에 의한 반사각 변화(쿠션 마찰)
 *
 * 좌표: 미터. x 오른쪽, y 아래(화면과 같다). 그래서 z 는 **테이블 안쪽(아래)** 이고 "위"는 -z 다.
 *       외적은 이 오른손 좌표계로 그대로 쓴다 — 부호를 손으로 맞추지 않는다(틀리기 쉽다).
 *
 * 🔒 정확도: 분리각·무회전 반사는 교과서 값과 맞는다(테스트로 잠금).
 *    강한 회전 + 쿠션 복합은 근사다. 천·쿠션 상태는 당구장마다 달라 v2.1 에서 보정을 붙인다.
 */
(function(root){
'use strict';
var G=9.81;
/* 중대 표준값 — 안쪽 2.24 × 1.12 m, 4구 공 지름 65.5 mm. 다이아 1칸 = 0.28 m */
var DEF={
  L:2.24, W:1.12, R:0.03275,
  muS:0.2,      /* 미끄럼 마찰(천-공) */
  muR:0.010,    /* 구름 저항 — 🔒 "보통 속도(3단) = 2쿠션" 으로 속도표와 함께 맞춘다 */
  muSp:0.022,   /* 좌우 회전이 천에서 줄어드는 정도 */
  eB:0.94,      /* 공-공 반발 */
  eC:0.78,      /* 쿠션 반발 */
  muC:0.18,     /* 쿠션 마찰(좌우 회전이 반사각을 바꾸는 정도) */
  kC:0.4,       /* 쿠션이 구름 회전을 되돌리는 정도(0 = 그대로 멈춤 회전, 1 = 완전 반전) */
  dt:0.0004, tMax:30, fps:60
};
/* 속도 단계(m/s) — 🔒 3단 = 보통 = 1.6 m/s. 아버지: "보통 속도면 어느 방향이든 2쿠션"
   1.6 에서 짧은 방향·긴 방향·대각선 모두 정확히 2쿠션이다(tests/b02 가 잠근다) */
var SPEED=[0.75,1.1,1.6,2.2,3.0];

function cross(a,b){return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];}
function len2(x,y){return Math.sqrt(x*x+y*y);}

/* 큐 타격 → {v:[vx,vy], w:[wx,wy,wz]}
   tip: {x,y} 당점(-1~1). x+ = 오른쪽, y- = 위(밀기). 최대 당점(1) = 공 중심에서 반지름의 0.5 */
function strike(V,dx,dy,tip,R){
  var a=tip?(tip.x||0):0, b=tip?-(tip.y||0):0;       /* b+ = 위 */
  var right=[-dy,dx,0], up=[0,0,-1];
  var r=[R*0.5*(a*right[0]+b*up[0]), R*0.5*(a*right[1]+b*up[1]), R*0.5*(a*right[2]+b*up[2])];
  var J=[dx*V,dy*V,0];                                 /* 단위 질량당 충격 */
  var c=cross(r,J), k=1/(0.4*R*R);
  return {v:[dx*V,dy*V], w:[c[0]*k,c[1]*k,c[2]*k]};
}

/* simulate(opt)
   opt.balls: {id:{x,y}} (미터) · opt.cue: 치는 공 id · opt.dir:{x,y} 단위벡터 · opt.V: m/s · opt.tip
   반환: {frames:[{t,p:{id:[x,y]}}], events:[...], stops:{id:[x,y]}, T} */
function simulate(opt){
  var P={};for(var k in DEF)P[k]=DEF[k];
  if(opt.params)for(k in opt.params)P[k]=opt.params[k];
  var R=P.R, ids=Object.keys(opt.balls), B={};
  ids.forEach(function(id){B[id]={id:id,x:opt.balls[id].x,y:opt.balls[id].y,v:[0,0],w:[0,0,0],on:false};});
  var d=len2(opt.dir.x,opt.dir.y)||1, s=strike(opt.V,opt.dir.x/d,opt.dir.y/d,opt.tip,R);
  var cb=B[opt.cue];cb.v=s.v;cb.w=s.w;cb.on=true;
  var frames=[],events=[],t=0,nextF=0,dt=P.dt,fstep=1/P.fps;
  var slideK=1/(0.4*R*R);
  function snap(){var p={};ids.forEach(function(id){p[id]=[B[id].x,B[id].y];});frames.push({t:t,p:p});}
  snap();nextF=fstep;
  var rolled={};  /* 미끄럼→구름 전환 순간 기록(분리각 측정용) */
  while(t<P.tMax){
    var moving=false;
    for(var i=0;i<ids.length;i++){
      var b=B[ids[i]];if(!b.on)continue;
      /* 접점 미끄럼 u = v + ω × (0,0,R) */
      var ux=b.v[0]+b.w[1]*R, uy=b.v[1]-b.w[0]*R, u=len2(ux,uy);
      if(u>1e-4){
        var tr=u/(3.5*P.muS*G), h=Math.min(dt,tr);          /* 구름이 되는 데 걸리는 시간 */
        var fx=-P.muS*G*ux/u, fy=-P.muS*G*uy/u;
        b.v[0]+=fx*h;b.v[1]+=fy*h;
        var tq=cross([0,0,R],[fx,fy,0]);
        b.w[0]+=tq[0]*slideK*h;b.w[1]+=tq[1]*slideK*h;
        if(tr<=dt){b.w[0]=b.v[1]/R;b.w[1]=-b.v[0]/R;
          events.push({t:t+tr,type:'roll',ball:b.id,x:b.x,y:b.y,v:[b.v[0],b.v[1]]});}
      }else{
        var sp=len2(b.v[0],b.v[1]);
        if(sp>0){var ns=Math.max(0,sp-P.muR*G*dt);b.v[0]*=ns/sp;b.v[1]*=ns/sp;}
        b.w[0]=b.v[1]/R;b.w[1]=-b.v[0]/R;
      }
      /* 좌우 회전은 천에서 조금씩 준다 */
      var dz=2.5*P.muSp*G/R*dt;
      b.w[2]=Math.abs(b.w[2])<=dz?0:b.w[2]-Math.sign(b.w[2])*dz;
      b.x+=b.v[0]*dt;b.y+=b.v[1]*dt;
      /* 쿠션 */
      cushion(b,b.x<R&&b.v[0]<0,[1,0],'L');
      cushion(b,b.x>P.L-R&&b.v[0]>0,[-1,0],'R');
      cushion(b,b.y<R&&b.v[1]<0,[0,1],'T');
      cushion(b,b.y>P.W-R&&b.v[1]>0,[0,-1],'B');
      var ss=len2(b.v[0],b.v[1]);
      if(ss<0.003&&len2(b.v[0]+b.w[1]*R,b.v[1]-b.w[0]*R)<0.003){b.v=[0,0];b.w=[0,0,0];b.on=false;events.push({t:t,type:'stop',ball:b.id,x:b.x,y:b.y});}
      else moving=true;
    }
    /* 공끼리 */
    for(i=0;i<ids.length;i++)for(var j=i+1;j<ids.length;j++){
      var A=B[ids[i]],C=B[ids[j]],nx=C.x-A.x,ny=C.y-A.y,dd=len2(nx,ny);
      if(dd<2*R&&dd>0){
        nx/=dd;ny/=dd;
        var vn=(A.v[0]-C.v[0])*nx+(A.v[1]-C.v[1])*ny;
        if(vn>0){
          var jn=(1+P.eB)/2*vn;
          A.v[0]-=jn*nx;A.v[1]-=jn*ny;C.v[0]+=jn*nx;C.v[1]+=jn*ny;
          A.on=true;C.on=true;moving=true;
          events.push({t:t,type:'ball',a:A.id,b:C.id,x:A.x,y:A.y,bx:C.x,by:C.y,n:[nx,ny],
            va:[A.v[0],A.v[1]],vb:[C.v[0],C.v[1]]});
        }
        var ov=(2*R-dd)/2;A.x-=nx*ov;A.y-=ny*ov;C.x+=nx*ov;C.y+=ny*ov;
      }
    }
    t+=dt;
    if(t>=nextF){snap();nextF+=fstep;}
    if(!moving)break;
  }
  snap();
  var stops={};ids.forEach(function(id){stops[id]=[B[id].x,B[id].y];});
  return {frames:frames,events:events,stops:stops,T:t,P:P};

  function cushion(b,hit,n,side){
    if(!hit)return;
    var vn=b.v[0]*n[0]+b.v[1]*n[1];                 /* 들어올 때 음수 */
    var Jn=-(1+P.eC)*vn;
    b.v[0]+=Jn*n[0];b.v[1]+=Jn*n[1];
    /* 쿠션 접점 r = -R n 의 미끄럼(평면 성분) → 마찰 충격 */
    var rc=[-R*n[0],-R*n[1],0], wr=cross(b.w,rc);
    var sx=b.v[0]+wr[0], sy=b.v[1]+wr[1];
    var sn=sx*n[0]+sy*n[1];sx-=sn*n[0];sy-=sn*n[1];   /* 접선 성분만 */
    var sl=len2(sx,sy);
    if(sl>1e-6){
      var jt=Math.min(P.muC*Math.abs(Jn), sl/3.5);
      var Jt=[-jt*sx/sl,-jt*sy/sl,0];
      b.v[0]+=Jt[0];b.v[1]+=Jt[1];
      var dw=cross(rc,Jt);
      b.w[0]+=dw[0]*slideK;b.w[1]+=dw[1]*slideK;b.w[2]+=dw[2]*slideK;
    }
    /* 쿠션 코는 공 중심보다 높다 → 쿠션 쪽으로 구르던 회전을 일부 되돌린다.
       이게 없으면 반발 뒤에 옛 회전이 브레이크가 돼 한 번 튕기고 거의 멈춘다(첫 판 실측) */
    var rvx=-R*b.w[1], rvy=R*b.w[0], rn=rvx*n[0]+rvy*n[1], rn2=-P.kC*rn;
    rvx+=(rn2-rn)*n[0];rvy+=(rn2-rn)*n[1];
    b.w[1]=-rvx/R;b.w[0]=rvy/R;
    if(side==='L')b.x=R;else if(side==='R')b.x=P.L-R;else if(side==='T')b.y=R;else b.y=P.W-R;
    events.push({t:t,type:'cushion',ball:b.id,side:side,x:b.x,y:b.y});
  }
}

var API={VERSION:'2.5.0',DEF:DEF,SPEED:SPEED,strike:strike,simulate:simulate};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.BBPhys=API;
})(this);
