/* SUNSET RUN v4.9. All graphics preferences stay in this browser. No accounts/telemetry. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) root.SR49 = api.mount(root);
}(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  var profiles = [{"mode":0,"key":"low","name":"절약","tier":0,"dpr":1,"maxPixels":1600000,"maxSide":2560,"density":0.45,"view":520,"detail":62,"shadow":0,"shadowMap":1024,"cascades":2,"msaa":1,"aniso":2,"lod":0.8,"tile":64,"preview":512,"finish":768,"skyWidth":256,"skyHeight":96,"npc":10,"promote":28,"demote":48},{"mode":1,"key":"mid","name":"표준","tier":1,"dpr":1.5,"maxPixels":2600000,"maxSide":3072,"density":0.78,"view":740,"detail":90,"shadow":60,"shadowMap":1024,"cascades":2,"msaa":2,"aniso":4,"lod":1.2,"tile":128,"preview":640,"finish":1024,"skyWidth":384,"skyHeight":144,"npc":14,"promote":34,"demote":54},{"mode":2,"key":"high","name":"고화질","tier":2,"dpr":2,"maxPixels":4194304,"maxSide":4096,"density":1,"view":900,"detail":120,"shadow":120,"shadowMap":2048,"cascades":2,"msaa":4,"aniso":8,"lod":1.65,"tile":256,"preview":768,"finish":1536,"skyWidth":512,"skyHeight":192,"npc":24,"promote":44,"demote":68},{"mode":3,"key":"ultra","name":"최고화질","tier":2,"dpr":3,"maxPixels":6291456,"maxSide":4096,"density":1.12,"view":1050,"detail":140,"shadow":160,"shadowMap":2048,"cascades":2,"msaa":4,"aniso":16,"lod":1.9,"tile":256,"preview":1024,"finish":1920,"skyWidth":512,"skyHeight":192,"npc":32,"promote":56,"demote":84}];
  function get(mode) { return profiles[Number.isInteger(mode) && mode >= 0 && mode < 4 ? mode : 2]; }
  function parse(value) {
    var s = String(value == null ? '' : value).trim().toLowerCase();
    var modes={ low:0,eco:0,'0':0,mid:1,standard:1,'1':1,high:2,'2':2,ultra:3,cinema:3,'3':3 };
    return Object.prototype.hasOwnProperty.call(modes,s) ? modes[s] : -1;
  }
  function resolve(url, stored) {
    var q = -1;
    try { q = parse(new URL(url, 'https://example.invalid/').searchParams.get('q')); } catch (_) {}
    if (q >= 0) return q;
    var p = parse(stored); return p >= 0 ? p : 2;
  }
  function finite(value, fallback) { return Number.isFinite(Number(value)) && Number(value)>0 ? Number(value) : fallback; }
  function calculate(cssWidth, cssHeight, nativeDpr, mode, gpuMaxSide) {
    var p=get(mode), w=Math.min(65536,finite(cssWidth,1)), h=Math.min(65536,finite(cssHeight,1));
    var side=Math.min(p.maxSide,finite(gpuMaxSide,p.maxSide));
    var dpr=Math.min(finite(nativeDpr,1),p.dpr,Math.sqrt(p.maxPixels/(w*h)),side/w,side/h);
    // Floor (not round) so no output can exceed the configured pixel/side ceiling.
    return { width:Math.max(1,Math.floor(w*dpr)), height:Math.max(1,Math.floor(h*dpr)),
             dpr:dpr, mode:p.mode, name:p.name, pixelLimit:p.maxPixels, sideLimit:side };
  }
  function mount(win) {
    var saved=null;
    try { saved=win.localStorage.getItem('sr49_graphics'); } catch (_) {}
    var mode=resolve(win.location.href,saved), p=get(mode);
    var mobile=/iPhone|iPad|iPod|Android|Mobile/i.test(win.navigator.userAgent) ||
       (win.navigator.maxTouchPoints>1 && /Macintosh/.test(win.navigator.userAgent));
    var canvas=null,container=null,observer=null,pending=0,gpuMax=p.maxSide;
    var api={ mode:mode,profile:p,isMobile:mobile,lastSize:null };
    function resize() {
      pending=0; if (!canvas || !container) return;
      var r=container.getBoundingClientRect();
      if (r.width<2 || r.height<2) return; // Background/hidden element: don't churn render targets.
      var s=calculate(r.width,r.height,win.devicePixelRatio,mode,gpuMax);
      if (canvas.width!==s.width || canvas.height!==s.height) { canvas.width=s.width;canvas.height=s.height; }
      api.lastSize=s;
    }
    function schedule(){ if(!pending) pending=win.requestAnimationFrame(resize); }
    api.prepare=function(c,box){
      canvas=c;container=box;resize();
      if(win.ResizeObserver){observer=new win.ResizeObserver(schedule);observer.observe(container);}
      ['resize','orientationchange','pageshow'].forEach(function(e){win.addEventListener(e,schedule);});
      ['fullscreenchange','webkitfullscreenchange'].forEach(function(e){win.document.addEventListener(e,schedule);});
      win.document.addEventListener('visibilitychange',function(){if(!win.document.hidden)schedule();});
      // Display preference without interfering with the title/game controls.
      var label=win.document.getElementById('sr-quality-label');
      if(label) label.textContent=p.name+' · 타이틀 또는 일시정지에서 화질 변경';
      return api.lastSize;
    };
    api.attachUnity=function(instance){
      try {
        var gl=canvas.getContext('webgl2') || canvas.getContext('webgl');
        if(gl) gpuMax=Math.min(p.maxSide,gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),gl.getParameter(gl.MAX_TEXTURE_SIZE));
      } catch (_) {}
      resize();
      console.info('[SUNSET 4.9 CANVAS]', { quality:p.key,mobile:mobile,render:api.lastSize });
    };
    api.saveAndReload=function(next){
      next=get(next).mode;
      try { win.localStorage.setItem('sr49_graphics',String(next)); } catch (_) {}
      var u=new URL(win.location.href);u.searchParams.set('q',get(next).key);
      // Called only after the in-game button explicitly warns that the current run is discarded.
      win.location.assign(u.href);
    };
    api.resize=resize;
    return api;
  }
  return { profiles:profiles,get:get,parse:parse,resolve:resolve,calculate:calculate,mount:mount };
}));
