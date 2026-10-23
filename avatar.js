/* Original approved portrait + aligned eyelid/mouth patches, with basic device-speech animation (not phoneme synchronization). */
(() => {
  'use strict';
  const canvases=[...document.querySelectorAll('[data-mira-avatar]')];
  let mode='idle',analyser=null,level=0,nextBlink=performance.now()+2200,blinkUntil=0;
  const wave=new Float32Array(256),pictures={};
  const captions={idle:'Мира рядом',listening:'Я тебя слушаю',thinking:'Сейчас разберёмся…',speaking:'Читаю текст голосом устройства',joy:'Вот и получилось!'};
  const load=name=>new Promise(resolve=>{const image=new Image();image.onload=()=>{pictures[name]=image;resolve();};image.onerror=resolve;image.src='assets/'+name+'.webp';});
  function softEllipse(context,x,y,rx,ry,angle=0){context.save();context.translate(x,y);context.rotate(angle);context.scale(rx,ry);const gradient=context.createRadialGradient(0,0,.68,0,0,1);gradient.addColorStop(0,'#fff');gradient.addColorStop(1,'#fff0');context.fillStyle=gradient;context.fillRect(-1,-1,2,2);context.restore();}
  function patch(name,eyes=false){
    if(!pictures[name])return null;
    const canvas=document.createElement('canvas');canvas.width=680;canvas.height=850;const context=canvas.getContext('2d');
    // Generated atlas frames are larger around the face. Match the original's
    // brow/nose landmarks and blend only facial regions, preserving everything else.
    context.setTransform(.8,0,0,.8,10,17);context.drawImage(pictures[name],0,0,680,850);context.resetTransform();
    const mask=document.createElement('canvas');mask.width=680;mask.height=850;const m=mask.getContext('2d');
    if(eyes){softEllipse(m,275,282,65,47,-.23);softEllipse(m,406,244,49,49,-.3);}
    else softEllipse(m,370,358,68,40,-.25);
    context.globalCompositeOperation='destination-in';context.drawImage(mask,0,0);return canvas;
  }
  // Tiny premium highlights around the outer hair only; no face changes.
  const hairGlints=[
    [171,190,0.1],[492,165,1.8],[124,335,2.7],[543,303,4.1],
    [163,461,3.3],[518,484,5.6],[240,112,2.1],[507,390,4.8]
  ];
  function sparkle(c,x,y,size,alpha){
    c.save();c.translate(x,y);c.globalAlpha=alpha;
    c.shadowBlur=9;c.shadowColor='#fff0ff';c.strokeStyle='#fff5da';
    c.lineWidth=1.15;c.lineCap='round';c.beginPath();
    c.moveTo(-size,0);c.lineTo(size,0);c.moveTo(0,-size);c.lineTo(0,size);c.stroke();
    c.restore();
  }
  function highlightHair(c,now){
    for(const [x,y,phase] of hairGlints){
      const t=now/1200+phase,light=Math.pow(Math.max(0,Math.sin(t*1.14)),8);
      if(light<.04)continue;
      sparkle(c,x,y,1.8+light*2.2,.11+light*.42);
    }
  }
  window.MiraAvatar={setState(state){mode=captions[state]?state:'idle';const caption=document.getElementById('miraMood');if(caption)caption.textContent=captions[mode];},attachAudio(value){analyser=value;}};
  Promise.all(['mira-0','mira-blink','mira-ah','mira-oh'].map(load)).then(()=>{
    const blink=patch('mira-blink',true),ah=patch('mira-ah'),oh=patch('mira-oh');
    function draw(now){
      if(!pictures['mira-0'])return;
      const calm=document.body.classList.contains('reduce-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(now>nextBlink){blinkUntil=now+145;nextBlink=now+3200+Math.random()*3600;}
      let amplitude=mode==='speaking'&&!analyser?.045+.028*Math.sin(now/95):0;if(analyser&&mode==='speaking'){analyser.getFloatTimeDomainData(wave);amplitude=Math.sqrt(wave.reduce((sum,x)=>sum+x*x,0)/wave.length);}
      level=level*.62+Math.min(1,amplitude*13)*.38;
      for(const canvas of canvases){
        if(!canvas.offsetParent)continue;
        const c=canvas.getContext('2d');c.clearRect(0,0,680,850);c.save();
        if(!calm){c.translate(340,465);c.rotate(Math.sin(now/2800)*.003+(mode==='listening'?.006:0));c.translate(-340,-465+Math.sin(now/1900)*1.4);}
        c.drawImage(pictures['mira-0'],0,0,680,850);
        if(now<blinkUntil&&blink)c.drawImage(blink,0,0);
        if(mode==='speaking'&&level>.08&&ah){c.globalAlpha=Math.min(1,level*2.3);c.drawImage(Math.sin(now/110)>.3&&level>.35?(oh||ah):ah,0,0);}
        c.globalAlpha=1;if(!calm)highlightHair(c,now);
        c.restore();
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  });
})();
