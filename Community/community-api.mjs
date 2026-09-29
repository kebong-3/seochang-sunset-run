// SUNSET RUN community API — Supabase Edge Function backend
const API_URL='https://pkkctlqlhdynoefjlpjg.supabase.co/functions/v1/sunset-ranking-api';
let cfgPromise;
export const local={
  get(k,fallback=null){try{return JSON.parse(localStorage.getItem('sr47:'+k))??fallback;}catch{return fallback;}},
  set(k,v){try{localStorage.setItem('sr47:'+k,JSON.stringify(v));}catch{}},
  remove(k){try{localStorage.removeItem('sr47:'+k);}catch{}}
};
export function playerId(){
  let id='';
  try{id=localStorage.getItem('sr47:player-id')||'';}catch{}
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)){
    id=crypto.randomUUID?crypto.randomUUID():('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx').replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16);});
    try{localStorage.setItem('sr47:player-id',id);}catch{}
  }
  return id;
}
export async function config(){
  if(!cfgPromise)cfgPromise=fetch(API_URL+'?action=config',{cache:'no-store',signal:AbortSignal.timeout(8000)})
    .then(async r=>{if(!r.ok)throw new Error();return r.json();})
    .catch(()=>({enabled:false,eventTitle:'SUNSET RUN 실제 참여자 기록판',event:'sunset-run-2026',ruleset:'sr47-v1',retentionNotice:'',contactText:''}));
  return cfgPromise;
}
export async function api(action,data={},method='GET'){
  const headers={'Content-Type':'application/json','X-Sunset-Player':playerId()};
  const url=new URL(API_URL);url.searchParams.set('action',action);
  if(method==='GET')for(const [k,v] of Object.entries(data))if(v!==null&&v!==undefined)url.searchParams.set(k,String(v));
  let r;
  try{r=await fetch(url,{method,headers,body:method==='POST'?JSON.stringify(data):undefined,cache:'no-store',signal:AbortSignal.timeout(20000)});}
  catch{throw new Error('인터넷 연결을 확인한 뒤 다시 시도해 주세요.');}
  let out;try{out=await r.json();}catch{throw new Error('기록 서버 설정을 확인해 주세요.');}
  if(!r.ok){const error=new Error(out.message||'기록을 처리하지 못했어요.');error.code=out.error;throw error;}
  return out;
}
export function time(ms,precise=false){if(!Number.isFinite(ms))return '—';const n=Math.floor(ms/1000);return (n>=3600?Math.floor(n/3600)+':':'')+String(Math.floor(n/60)%60).padStart(2,'0')+':'+String(n%60).padStart(2,'0')+(precise?'.'+String(Math.floor(ms)%1000).padStart(3,'0'):'');}
export function el(tag,text='',className=''){const e=document.createElement(tag);if(text)e.textContent=text;if(className)e.className=className;return e;}
export function button(text,fn,className=''){const b=el('button',text,className);b.type='button';b.addEventListener('click',fn);return b;}
export function friendly(err){return err?.message||'잠시 뒤 다시 시도해 주세요.';}
