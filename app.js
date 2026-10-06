const S={dev:'diode',wave:'full',ph:'1'};
const $=id=>document.getElementById(id), rad=d=>d*Math.PI/180, mod=(x,m)=>((x%m)+m)%m;
document.querySelectorAll('.seg').forEach(g=>g.onclick=e=>{const b=e.target.closest('button');if(!b)return;
  g.querySelectorAll('button').forEach(x=>x.classList.remove('on'));b.classList.add('on');S[g.dataset.key]=b.dataset.v;update();});
['V','f','R','L','a'].forEach(i=>$(i).oninput=update);window.onresize=update;
const amax=()=>S.ph==='1'?179:S.wave==='half'?150:120;

function model(Vm,a){
  const s=t=>Vm*Math.sin(rad(t)),r3=Math.sqrt(3)*Vm;
  if(S.ph==='1'){
    if(S.wave==='half') return{p:1,fire:[a,360],src:[s],paths:[{u:s,s:a}]};
    return{p:2,fire:[a,180],src:[s],paths:[{u:s,s:a},{u:t=>-s(t),s:180+a}]};
  }
  const src=[0,1,2].map(k=>t=>s(t-120*k));
  if(S.wave==='half') return{p:3,fire:[30+a,120],src,paths:src.map((u,k)=>({u,s:30+a+120*k}))};
  return{p:6,fire:[30+a,60],src,paths:[0,1,2,3,4,5].map(k=>({u:t=>r3*Math.cos(rad(t-60-60*k)),s:30+a+60*k}))};
}
/* Time-domain simulation of an R-L load fed by ideal switches.
   Each "path" = one conducting device (pair). A path turns on at its firing angle if forward biased
   (its voltage u exceeds the active path's), and turns off when the load current reaches zero.
   L di/dt = vo - R i is integrated exactly per step; run until steady state, keep last 2 cycles. */
const N_=3600,H_=0.1;
function simulate(m,Vm,R,X,f,Lh){
  const N=N_,h=H_,hr=rad(h),eps=1e-9*Vm,P=m.paths,ks=P.map(p=>Math.round(mod(p.s,360)/h)%N);
  const nc=X>0?Math.min(300,Math.max(8,Math.ceil(6*Lh*f/R)+4)):3,dec=Math.exp(-R*hr/(X||1));
  const vo=new Float32Array(2*N),io=new Float32Array(2*N);let i=0,act=-1;
  for(let c=0;c<nc;c++)for(let n=0;n<N;n++){
    for(let k=0;k<P.length;k++)if(n===ks[k]&&act!==k){
      const un=P[k].u(n*h);if(act<0?un>-eps:un>P[act].u(n*h)-eps)act=k}
    let v=0;
    if(act>=0){v=P[act].u((n+.5)*h);i=X>0?v/R+(i-v/R)*dec:v/R;if(i<=0){i=0;act=-1;if(!X)v=0}}
    if(c>=nc-2){const j=(c-nc+2)*N+n;vo[j]=v;io[j]=i}
  }
  return{vo,io};
}

/* ---------- schematic ---------- */
let out;
const ln=(a,b,c,d)=>out+=`<line x1="${a}" y1="${b}" x2="${c}" y2="${d}"/>`;
const pl=(...p)=>out+=`<polyline points="${p.join(' ')}"/>`;
const tx=(x,y,s,c='')=>out+=`<text x="${x}" y="${y}" class="${c}">${s}</text>`;
const dot=(x,y)=>out+=`<circle cx="${x}" cy="${y}" r="3.5" class="dot"/>`;
const src=(x,y,l,lx,ly)=>{out+=`<circle cx="${x}" cy="${y}" r="18"/><path d="M${x-10},${y} q5,-10 10,0 t10,0"/>`;tx(x+lx,y+ly,l,'lb')};
const res=(x,yc)=>{
  if(S.L){out+=`<rect x="${x-8}" y="${yc-25}" width="16" height="22"/><path d="M${x},${yc+3} a3.2,3.2 0 0 1 0,6.4 a3.2,3.2 0 0 1 0,6.4 a3.2,3.2 0 0 1 0,6.4"/><line x1="${x}" y1="${yc+22}" x2="${x}" y2="${yc+25}"/><line x1="${x}" y1="${yc-3}" x2="${x}" y2="${yc+3}"/>`;
    tx(x+24,yc-10,'R','lb');tx(x+24,yc+18,'L','lb')}
  else{out+=`<rect x="${x-8}" y="${yc-25}" width="16" height="50"/>`;tx(x+24,yc+4,'R','lb')}
  tx(x-20,yc-30,'+','lb');tx(x-20,yc+40,'−','lb');tx(x+28,yc-32,'vo','lb')};
function dev(x1,y1,x2,y2,lab){
  const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy),ux=dx/L,uy=dy/L,cx=(x1+x2)/2,cy=(y1+y2)/2,ang=Math.atan2(-ux,uy)*180/Math.PI;
  ln(x1,y1,cx-30*ux,cy-30*uy);ln(cx+30*ux,cy+30*uy,x2,y2);
  out+=`<g transform="translate(${cx},${cy}) rotate(${ang})"><line x1="0" y1="-30" x2="0" y2="-12"/><line x1="0" y1="10" x2="0" y2="30"/><path d="M-10,-12 L10,-12 L0,10 Z" class="fill"/><line x1="-10" y1="10" x2="10" y2="10"/>${S.dev==='scr'?'<polyline points="4,10 15,21 15,27"/>':''}</g>`;
  tx(cx+uy*26,cy-ux*26+4,lab,'lb');
}
function schematic(){
  out='';const n=S.dev==='scr'?'T':'D',k=S.ph+S.wave;
  if(k==='1half'){
    src(80,130,'vs',-34,4);pl('80,112','80,70','170,70');dev(170,70,230,70,n+'1');
    pl('230,70','420,70','420,105');res(420,130);pl('420,155','420,190','80,190','80,148');
  }else if(k==='1full'){
    const L=[180,160],T=[280,70],B=[280,250],R=[380,160];
    dev(...L,...T,n+'1');dev(...R,...T,n+'2');dev(...B,...L,n+'3');dev(...B,...R,n+'4');
    pl('280,70','280,135');res(280,160);pl('280,185','280,250');
    src(80,160,'vs',-34,4);pl('80,142','80,25','470,25','470,160','380,160');pl('80,178','80,205','180,205','180,160');
    [L,T,B,R].forEach(p=>dot(...p));
  }else if(k==='3half'){
    [60,130,200].forEach((y,i)=>{src(80,y,'abc'[i],0,-24);pl(`62,${y}`,`20,${y}`);pl(`98,${y}`,'160,'+y);dev(160,y,220,y,n+(i+1));pl(`220,${y}`,`330,${y}`)});
    pl('20,60','20,250','430,250','430,195');pl('330,60','330,200');dot(330,130);pl('330,130','430,130','430,145');res(430,170);dot(20,130);
    tx(36,244,'n','lb');
  }else{
    [60,130,200].forEach((y,i)=>{src(80,y,'abc'[i],0,-24);pl(`62,${y}`,`20,${y}`)});pl('20,60','20,200');
    pl('98,60','130,60','130,115','250,115');pl('98,130','330,130');pl('98,200','170,200','170,145','410,145');
    dot(250,115);dot(330,130);dot(410,145);
    [250,330,410].forEach((x,i)=>{dev(x,100,x,40,n+[1,3,5][i]);pl(`${x},40`,`${x},30`);pl(`${x},100`,`${x},160`);dev(x,220,x,160,n+[4,6,2][i]);pl(`${x},220`,`${x},250`)});
    pl('250,30','480,30','480,120');res(480,145);pl('480,170','480,250','250,250');
  }
  $('sch').innerHTML=out;
}

/* ---------- waveforms ---------- */
function draw(m,Vm,a,vo,io,Vdc,Idc){
  const cv=$('wf'),dpr=devicePixelRatio||1,W=Math.max(300,cv.parentElement.clientWidth-32),H=600;
  cv.style.width=W+'px';cv.style.height=H+'px';cv.width=W*dpr;cv.height=H*dpr;
  const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);
  const L=64,T=12,B=32,gap=28,ph=(H-T-B-2*gap)/3,pw=W-L-14,fmt=v=>Math.abs(v)>=100?v.toFixed(0):v.toFixed(1);
  const rg=A=>{let mx=0,mn=0;for(const x of A){if(x>mx)mx=x;if(x<mn)mn=x}mx=mx||1;return[mn<0?mn*1.15:-.1*mx,mx*1.15]};
  const at=A=>t=>A[Math.min(A.length-1,Math.round(t*10))],rv=rg(vo),ri=rg(io);
  const P=[{t:'Source voltage (V)',f:m.src,col:['#ffd166','#06d6a0','#ef476f'],lo:-1.15*Vm,hi:1.15*Vm},
    {t:'Output voltage vo (V)',f:[at(vo)],col:['#4cc9f0'],lo:rv[0],hi:rv[1],fill:1,avg:Vdc},
    {t:'Load current io (A)',f:[at(io)],col:['#f72585'],lo:ri[0],hi:ri[1],fill:1,avg:Idc}];
  P.forEach((p,i)=>{
    const y0=T+i*(ph+gap),X=t=>L+t/720*pw,Y=v=>y0+ph-(v-p.lo)/(p.hi-p.lo)*ph;
    c.font='12px system-ui';c.lineWidth=1;c.strokeStyle='#2a3a4d';c.fillStyle='#8aa0b6';c.textAlign='right';
    for(let j=0;j<=4;j++){const v=p.lo+(p.hi-p.lo)*j/4,y=Y(v);c.beginPath();c.moveTo(L,y);c.lineTo(L+pw,y);c.stroke();c.fillText(fmt(v),L-6,y+4)}
    c.textAlign='center';for(let t=0;t<=720;t+=90){c.beginPath();c.moveTo(X(t),y0);c.lineTo(X(t),y0+ph);c.stroke();if(i===2)c.fillText(t+'°',X(t),y0+ph+16)}
    c.strokeStyle='#8aa0b6';c.beginPath();c.moveTo(L,Y(0));c.lineTo(L+pw,Y(0));c.stroke();
    c.textAlign='left';c.fillStyle='#e6edf5';c.fillText(p.t,L+6,y0+14);
    if(S.dev==='scr'){c.setLineDash([4,4]);c.strokeStyle='rgba(255,255,255,.35)';
      for(let t=m.fire[0];t<=720;t+=m.fire[1]){c.beginPath();c.moveTo(X(t),y0);c.lineTo(X(t),y0+ph);c.stroke()}c.setLineDash([])}
    p.f.forEach((fn,k)=>{c.beginPath();for(let t=0;t<=720;t+=.5){const x=X(t),y=Y(fn(t));t?c.lineTo(x,y):c.moveTo(x,y)}
      c.strokeStyle=p.col[k];c.lineWidth=2;c.stroke();
      if(p.fill){c.lineTo(X(720),Y(0));c.lineTo(X(0),Y(0));c.fillStyle=p.col[k]+'30';c.fill()}});
    if(p.avg!=null){c.setLineDash([6,4]);c.strokeStyle='#ffffff';c.lineWidth=1.2;c.beginPath();c.moveTo(L,Y(p.avg));c.lineTo(L+pw,Y(p.avg));c.stroke();c.setLineDash([]);
      c.fillStyle='#fff';c.textAlign='right';c.fillText('avg '+fmt(p.avg),L+pw-4,Y(p.avg)-5)}
    if(i===0&&m.src.length>1){['a','b','c'].forEach((l,k)=>{c.fillStyle=p.col[k];c.fillText('v'+l,L+pw-70+k*24,y0+14)})}
    if(i===1&&S.dev==='scr'){c.fillStyle='#fff';c.textAlign='left';c.fillText('α = '+a+'°  (dashed = firing instants)',L+170,y0+14)}
  });
}

/* ---------- main ---------- */
function update(){
  const Vr=Math.max(1,+$('V').value||1),f=Math.max(1,+$('f').value||50),R=Math.max(.01,+$('R').value||1),
    Lh=Math.max(0,+$('L').value||0)/1000,mx=amax(),scr=S.dev==='scr';
  $('a').max=mx;$('a').disabled=!scr;let a=scr?Math.min(+$('a').value,mx):0;if(scr)$('a').value=a;
  $('aOut').textContent=a+'°';$('aNote').textContent=scr?`α range for this circuit: 0–${mx}°`:'Diodes: α = 0 (natural conduction)';
  S.L=Lh>0;
  const X=2*Math.PI*f*Lh,Vm=Vr*Math.SQRT2,m=model(Vm,a),{vo,io}=simulate(m,Vm,R,X,f,Lh),N=N_;
  let sv=0,sq=0,si=0,sqi=0,imx=-1e9,imn=1e9;
  for(let j=N;j<2*N;j++){sv+=vo[j];sq+=vo[j]*vo[j];si+=io[j];sqi+=io[j]*io[j];imx=Math.max(imx,io[j]);imn=Math.min(imn,io[j])}
  const Vdc=sv/N,Vo=Math.sqrt(sq/N),Idc=si/N,Io=Math.sqrt(sqi/N),Pdc=Vdc*Idc,Pr=Io*Io*R,FF=Vdc>1e-9?Vo/Vdc:0,RF=FF>=1?Math.sqrt(FF*FF-1):0;
  $('title').textContent=`${S.ph==='1'?'Single':'Three'}-phase ${S.wave==='half'?'half-wave':'full-wave'} ${scr?'thyristor-controlled':'diode'} rectifier, ${S.L?'R-L':'R'} load`;
  schematic();draw(m,Vm,a,vo,io,Vdc,Idc);
  const g=(l,v)=>`<div><small>${l}</small><b>${v}</b></div>`,d=(x,u,n=2)=>x.toFixed(n)+' '+u;
  $('metrics').innerHTML=[
    g('Supply Vrms (phase)',d(Vr,'V')),g('Supply peak Vm',d(Vm,'V')),g('Frequency',d(f,'Hz',1)),g('Load R',d(R,'Ω')),
    g('Load L',d(Lh*1000,'mH')),g('Time constant L/R',d(Lh/R*1000,'ms')),g('Firing angle α',scr?a+'°':'n/a (diode)'),
    g('Pulse number',m.p),g('Ripple frequency',d(m.p*f,'Hz',0)),
    g('Conduction',imn>1e-6?'Continuous':'Discontinuous'),
    g('Output Vdc',d(Vdc,'V')),g('Output Vrms',d(Vo,'V')),g('Idc',d(Idc,'A')),g('Irms',d(Io,'A')),
    g('Imax / Imin',imx.toFixed(2)+' / '+imn.toFixed(2)+' A'),
    g('DC power',d(Pdc,'W',1)),g('Power in R (Irms²R)',d(Pr,'W',1)),g('Rectification η',Pr>0?(100*Pdc/Pr).toFixed(1)+' %':'–'),
    g('Voltage form factor',FF.toFixed(3)),g('Voltage ripple factor',RF.toFixed(3))].join('');
}
update();
