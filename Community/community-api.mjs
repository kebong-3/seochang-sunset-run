// Browser-only API. The Firebase web config is public; service credentials never enter this file.
const SDK = 'https://www.gstatic.com/firebasejs/12.19.0/';
let cfgPromise, sdkPromise;
export const local = {
  get(k,fallback=null){try{return JSON.parse(localStorage.getItem('sr47:'+k))??fallback;}catch{return fallback;}},
  set(k,v){try{localStorage.setItem('sr47:'+k,JSON.stringify(v));}catch{}},
  remove(k){try{localStorage.removeItem('sr47:'+k);}catch{}}
};
export async function config(){
  if(!cfgPromise)cfgPromise=fetch('/api/sunset?action=config',{cache:'no-store',signal:AbortSignal.timeout(8000)})
    .then(async r=>{if(!r.ok)throw new Error();return r.json();})
    .catch(()=>({enabled:false,eventTitle:'서창 억새노을런 기록판',event:'local',ruleset:'sr47-v1',retentionNotice:'',contactText:''}));
  return cfgPromise;
}
export async function firebase(){
  if(!sdkPromise)sdkPromise=(async()=>{
    const cfg=await config();if(!cfg.enabled)throw new Error('기록판 준비 중이에요. 사진 저장과 자유 플레이는 가능해요.');
    const [appMod,authMod,checkMod]=await Promise.all([import(SDK+'firebase-app.js'),import(SDK+'firebase-auth.js'),import(SDK+'firebase-app-check.js')]);
    const app=appMod.getApps()[0]||appMod.initializeApp(cfg.firebase);
    const auth=authMod.getAuth(app);
    let ephemeral=false;
    try{await authMod.setPersistence(auth,authMod.browserLocalPersistence);}catch{ephemeral=true;await authMod.setPersistence(auth,authMod.inMemoryPersistence);}
    await auth.authStateReady();
    const appCheck=cfg.appCheckSiteKey?checkMod.initializeAppCheck(app,{provider:new checkMod.ReCaptchaEnterpriseProvider(cfg.appCheckSiteKey),isTokenAutoRefreshEnabled:true}):null;
    return {cfg,auth,authMod,appCheck,checkMod,ephemeral};
  })();
  return sdkPromise;
}
export async function api(action,data={},method='GET'){
  const s=await firebase();
  const headers={'Content-Type':'application/json'};
  if(s.auth.currentUser)headers.Authorization='Bearer '+await s.auth.currentUser.getIdToken();
  if(s.appCheck)headers['X-Firebase-AppCheck']=(await s.checkMod.getToken(s.appCheck,false)).token;
  const url=new URL('/api/sunset',location.origin);url.searchParams.set('action',action);
  if(method==='GET')for(const [k,v] of Object.entries(data))if(v!==null&&v!==undefined)url.searchParams.set(k,String(v));
  let r;
  try{r=await fetch(url,{method,headers,body:method==='POST'?JSON.stringify(data):undefined,cache:'no-store',signal:AbortSignal.timeout(20000)});}catch{throw new Error('인터넷 연결을 확인한 뒤 다시 시도해 주세요.');}
  let out;try{out=await r.json();}catch{throw new Error('서버 설정을 확인해 주세요.');}
  if(!r.ok){const error=new Error(out.message||'기록을 처리하지 못했어요.');error.code=out.error;throw error;}
  return out;
}
export function time(ms,precise=false){if(!Number.isFinite(ms))return '—';const n=Math.floor(ms/1000);return (n>=3600?Math.floor(n/3600)+':':'')+String(Math.floor(n/60)%60).padStart(2,'0')+':'+String(n%60).padStart(2,'0')+(precise?'.'+String(Math.floor(ms)%1000).padStart(3,'0'):'');}
export function el(tag,text='',className=''){const e=document.createElement(tag);if(text)e.textContent=text;if(className)e.className=className;return e;}
export function button(text,fn,className=''){const b=el('button',text,className);b.type='button';b.addEventListener('click',fn);return b;}
export function friendly(err){return err?.message||'잠시 뒤 다시 시도해 주세요.';}
