import {config,firebase,api,local,time,el,button,friendly} from './community-api.mjs';
const DEFAULT_NICKNAME48='억새해오니';
function normalizeNickname48(value){return String(value??'').normalize('NFKC').trim().replace(/ +/g,' ')||DEFAULT_NICKNAME48;}
function validNickname48(value){return /^[가-힣a-zA-Z0-9 _-]{2,12}$/.test(value);}
function loadProfile48(){
  const saved=local.get('profile',null),p=saved&&typeof saved==='object'?saved:{online:false};
  const n=normalizeNickname48(p.nickname);return {...p,nickname:validNickname48(n)?n:DEFAULT_NICKNAME48};
}
let unity, dialog, restoreFocus, profile=loadProfile48(), run=null, imageUrl=null, posterUrl=null;
let lastResult=null, lastOutcome=null, me=null, profileDone=null;
function send(method,obj){const u=unity||window.sunsetUnity;if(u)u.SendMessage('SunsetCommunity47',method,typeof obj==='string'?obj:JSON.stringify(obj));}
function status(s){send('OnStatus',String(s));}
function close(){if(dialog){dialog.close();dialog.remove();dialog=null;}restoreFocus?.focus?.();send('OnOverlayClosed','');}
function modal(title,extraClass=''){
  close();restoreFocus=document.activeElement;
  dialog=el('dialog','','sr47-dialog '+extraClass);dialog.setAttribute('aria-label',title);
  const h=el('header','','sr47-head');h.append(el('h2',title),button('×',()=>{if(profileDone){send('OnProfile',{cancelled:true});profileDone=null;}close();},'sr47-close'));
  dialog.append(h);document.body.append(dialog);dialog.showModal();send('OnOverlayOpened','');
  dialog.addEventListener('cancel',e=>{e.preventDefault();if(profileDone){send('OnProfile',{cancelled:true});profileDone=null;}close();});
  return dialog;
}
function notifyProfile(p){profile=p;local.set('profile',p);send('OnProfile',p);profileDone=null;close();}
// The wardrobe opens this native HTML field: Korean IME and phone keyboards are handled by the browser.
// The local name save is available immediately, even when the configuration server is offline.
export async function openProfile(){
  profileDone=true;
  const d=modal('내 러닝 닉네임'),body=el('div','','sr47-body');d.append(body);
  body.append(el('p','내 코디, 내 이름. 완주 사진과 기록판에 이 이름이 함께 남아요.'));
  const lab=el('label','닉네임 · 한글·영문·숫자 2~12자');lab.htmlFor='sr47-nick';
  const nick=el('input');nick.type='text';nick.id='sr47-nick';nick.maxLength=12;
  nick.value=profile.nickname||DEFAULT_NICKNAME48;nick.autocomplete='nickname';body.append(lab,nick);
  const message=el('p','','sr47-status');message.setAttribute('role','status');
  const readNick=()=>{const n=normalizeNickname48(nick.value);
    if(!validNickname48(n))throw new Error('한글·영문·숫자 2~12자로 적어 주세요.');return n;};
  const actions=el('div','','sr47-actions');
  let cfg=null,sdk=null;
  const save=button(profile.online?'이 이름으로 기록 이어가기':'이 이름으로 코디하기',async()=>{
    try{
      const nickname=readNick();
      if(!profile.online){notifyProfile({...profile,nickname,online:false});return;}
      // Never silently drop an existing linked identity while changing only its public name.
      save.disabled=true;message.textContent='기존 계정의 닉네임을 저장 중이에요…';
      cfg=cfg||await config();if(!cfg.enabled)throw new Error('기록 서버 연결 후 이름을 바꿔 주세요. 기존 이름과 계정은 유지돼요.');
      sdk=sdk||await firebase();
      if(!sdk.auth.currentUser||sdk.auth.currentUser.uid!==profile.uid)
        throw new Error('기존 기록 계정으로 다시 로그인해 주세요. 이름만으로 다른 계정에 연결하지 않아요.');
      const p=await api('profile',{nickname,consent:true,consentVersion:cfg.consentVersion},'POST');
      notifyProfile({...profile,...p,online:true,uid:profile.uid});
    }catch(e){message.textContent=friendly(e);save.disabled=false;}
  });
  actions.append(save);body.append(actions,message);
  const onlineArea=el('div');body.append(onlineArea);
  const waiting=el('p','기록판 연결 상태를 확인하고 있어요. 닉네임 저장은 먼저 할 수 있어요.','sr47-muted');onlineArea.append(waiting);
  body.append(el('p','별명은 로그인 비밀번호가 아니에요. Google 연결과 기록 공개 동의는 선택 사항이에요.','sr47-muted'));
  nick.focus();nick.select();
  cfg=await config();if(!d.isConnected)return;
  waiting.remove();
  const note=el('div','','sr47-note');note.textContent=cfg.enabled?
    '공개: 닉네임·코스·최고기록·점수·아이템 수·게임 순위\n내부 보관: 로그인 식별자, 진행 확인, 완주 이력, 동의 시각\nGoogle 계정의 이메일은 공개 기록판에 표시하지 않아요.\n보관: '+cfg.retentionNotice+'\n문의: '+cfg.contactText+
    '\n사진은 서버로 올리지 않아요. 기록판에서 내 기록 삭제가 가능해요.':
    '온라인 기록판은 준비 중이에요. 이 이름은 이 브라우저와 완주 사진에 먼저 적용돼요. Firebase 연결 후 별도 동의하여 기록판에 참여할 수 있어요.';
  onlineArea.append(note);
  if(!cfg.enabled)return;
  const consentLabel=el('label'),consent=el('input');consent.type='checkbox';
  consentLabel.append(consent,document.createTextNode('닉네임과 게임 기록의 저장·공개에 동의해요. (선택)'));onlineArea.append(consentLabel);
  const loginActions=el('div','','sr47-actions');
  const finishLogin=async()=>{
    const p=await api('profile',{nickname:readNick(),consent:true,consentVersion:cfg.consentVersion},'POST');
    notifyProfile({...p,online:true,uid:sdk.auth.currentUser.uid});
  };
  const anon=button('닉네임으로 기록판 참여',async()=>{
    try{if(!consent.checked)throw new Error('온라인 참여에는 기록 공개 동의가 필요해요.');readNick();anon.disabled=google.disabled=true;
      if(!sdk.auth.currentUser)await sdk.authMod.signInAnonymously(sdk.auth);await finishLogin();
    }catch(e){message.textContent=friendly(e);anon.disabled=google.disabled=false;}
  });
  const google=button('Google로 기록 이어가기',async()=>{
    try{if(!consent.checked)throw new Error('기록 공개 동의를 먼저 확인해 주세요.');readNick();anon.disabled=google.disabled=true;
      const provider=new sdk.authMod.GoogleAuthProvider();
      if(sdk.auth.currentUser?.isAnonymous){
        try{await sdk.authMod.linkWithPopup(sdk.auth.currentUser,provider);}
        catch(e){if(e.code!=='auth/credential-already-in-use')throw e;
          if(!window.confirm('기존 Google 계정으로 전환할까요? 현재 임시 기록은 자동 병합되지 않습니다.'))throw new Error('계정 연결을 취소했어요.');
          const credential=sdk.authMod.GoogleAuthProvider.credentialFromError(e);
          if(credential)await sdk.authMod.signInWithCredential(sdk.auth,credential);else throw e;
        }
      }else await sdk.authMod.signInWithPopup(sdk.auth,provider);
      await finishLogin();
    }catch(e){message.textContent=friendly(e);anon.disabled=google.disabled=false;}
  },'soft');
  anon.disabled=google.disabled=true;loginActions.append(anon,google);onlineArea.append(loginActions);
  if(profile.online){
    onlineArea.append(button('이번에는 온라인 등록 없이 플레이',()=>{
      try{notifyProfile({...profile,nickname:readNick(),online:false});}catch(e){message.textContent=friendly(e);}
    },'outline'));
  }
  try{sdk=await firebase();if(d.isConnected)anon.disabled=google.disabled=false;}
  catch(e){message.textContent=friendly(e)+' 닉네임으로 자유 플레이는 가능해요.';}
}

function beginRun(payload){
  lastResult=null;lastOutcome=null;me=null;
  const thisRun={...payload,uid:profile.uid,chain:Promise.resolve(),online:profile.online,error:null};run=thisRun;
  if(!thisRun.online){status('자유 플레이 · 사진 저장 가능');return;}
  status('기록 시작 확인 중…');
  thisRun.chain=(async()=>{
    const c=await config();thisRun.event=c.event;
    if(c.acceptResults===false){thisRun.online=false;status('기록 열람 기간 · 자유 플레이와 사진 저장 가능');return;}
    const s=await firebase();
    if(s.auth.currentUser?.uid!==thisRun.uid)throw new Error('계정이 바뀌었어요. 새로 참여해 주세요.');
    await api('start',{clientRunId:thisRun.clientRunId,course:payload.course,ruleset:payload.ruleset},'POST');
    status('온라인 기록 확인 중');
  })().catch(e=>{thisRun.error=friendly(e);status(thisRun.error);});
}
function checkpoint(payload){
  const r=run;if(!r?.online||payload.clientRunId!==r.clientRunId)return;
  r.chain=r.chain.then(async()=>{if(r.error)return;try{await api('checkpoint',payload,'POST');}catch(e){r.error=friendly(e);status('중간 연결 확인이 필요해요. 완주는 계속할 수 있어요.');}});
}
async function retrySubmit(item){
  const s=await firebase(),c=await config();
  if(s.auth.currentUser?.uid!==item.uid||c.event!==item.event)throw new Error('기록을 시작한 계정과 행사로 다시 접속해 주세요.');
  const outcome=await api('finish',{clientRunId:item.clientRunId,result:item.result},'POST');
  local.remove('pending');lastOutcome=outcome;status(outcome.message);
  try{me=await api('me',{course:item.result.course});status(outcome.message+(me.rank?' · 실제 참여자 '+me.rank+'위':''));}catch{}
  return outcome;
}
function finish(payload){
  lastResult=payload;const r=run;
  if(!r?.online||r.clientRunId!==payload.clientRunId){status('자유 플레이 완주 · 사진으로 남겨요');return;}
  r.chain=r.chain.then(async()=>{
    const item={uid:r.uid,event:r.event,clientRunId:r.clientRunId,result:payload,at:Date.now()};
    local.set('pending',item);
    try{await retrySubmit(item);}catch(e){status('미전송 기록이 있어요. 기록판에서 다시 전송할 수 있어요.');}
  });
}
function roundRect(ctx,x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function fitText(ctx,text,maxWidth,size,min=22){let s=size;while(s>min){ctx.font=`700 ${s}px system-ui, sans-serif`;if(ctx.measureText(text).width<=maxWidth)break;s--;}return s;}
async function makePoster(bytes,payload){
  if(imageUrl)URL.revokeObjectURL(imageUrl);
  imageUrl=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
  const img=new Image();img.src=imageUrl;await img.decode();
  await document.fonts.ready;
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1440;
  const ctx=canvas.getContext('2d');const grad=ctx.createLinearGradient(0,0,1080,1440);grad.addColorStop(0,'#fff4df');grad.addColorStop(1,'#ecddef');ctx.fillStyle=grad;ctx.fillRect(0,0,1080,1440);
  ctx.fillStyle='#ad543a';ctx.font='700 24px system-ui,sans-serif';ctx.fillText('SUNSET RUN  /  MY FINISH MOMENT',60,70);
  const nickname=String(payload.nickname||profile.nickname||DEFAULT_NICKNAME48);fitText(ctx,nickname+'의 노을런 완주!',960,51);ctx.fillStyle='#2e233e';ctx.fillText(nickname+'의 노을런 완주!',60,139);
  roundRect(ctx,50,172,980,720,30,'#4b304b');
  const scale=Math.min(956/img.width,696/img.height),w=img.width*scale,h=img.height*scale;
  ctx.drawImage(img,62+(956-w)/2,184+(696-h)/2,w,h);
  roundRect(ctx,78,827,382,44,18,'#fff5e6');ctx.fillStyle='#694557';ctx.font='700 22px system-ui,sans-serif';ctx.fillText('나의 코디 · 나의 메달 · 나의 가을',96,858);
  const values=[['게임 환산 기록',time(payload.virtualMs,true)],['완주 코스',payload.course+' km'],
    ['이번 게임 순위',payload.npcRank+' / 1,500'],['점수',Number(payload.score).toLocaleString('ko-KR')],
    ['선한영향러 하트',payload.hearts+'개'],['모은 정책카드',payload.cards+'장']];
  values.forEach(([label,value],i)=>{const x=60+(i%2)*490,y=925+Math.floor(i/2)*118;
    roundRect(ctx,x,y,470,100,18,'#fffdf8');ctx.fillStyle='#746376';ctx.font='500 23px system-ui,sans-serif';ctx.fillText(label,x+21,y+33);
    ctx.fillStyle='#34203f';fitText(ctx,String(value),426,38);ctx.fillText(String(value),x+21,y+78);});
  ctx.fillStyle='#674c66';ctx.font='600 23px system-ui,sans-serif';
  const rankText=me?.rank?'내 최고기록 '+me.rank+'위 · 실제 참여자 · 공유 시점':'실제 참여자 순위는 온라인 기록판에서 확인';
  ctx.fillText(rankText,60,1315);ctx.font='400 19px system-ui,sans-serif';
  ctx.fillText('게임 환산 기록이며 실제 운동 측정 결과가 아닙니다.',60,1360);
  ctx.fillText(location.host+'  ·  '+new Date().toLocaleDateString('ko-KR'),60,1398);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('사진을 만들지 못했어요.')),'image/png'));
  return blob;
}
async function receiveImage(bytes,payload){
  try{
    const blob=await makePoster(bytes,payload);
    if(posterUrl)URL.revokeObjectURL(posterUrl);posterUrl=URL.createObjectURL(blob);
    const file=new File([blob],`SUNSET_RUN_${payload.course}km_${new Date().toISOString().slice(0,10)}.png`,{type:'image/png'});
    const d=modal('나의 완주를 남겨요'),body=el('div','','sr47-body');d.append(body);
    const pic=el('img','','sr47-poster');pic.src=posterUrl;pic.alt='내 코디의 해온이와 완주 기록이 담긴 기념 카드';body.append(pic);
    const text=el('p','사진은 내 기기에서만 만들어져요. 서버에 자동 업로드하지 않아요.','sr47-muted');text.style.marginTop='16px';body.append(text);
    const actions=el('div','','sr47-actions'),download=el('a','사진 저장');download.href=posterUrl;download.download=file.name;
    actions.append(download);const message=el('p','','sr47-status');message.setAttribute('role','status');
    const shareText=`${payload.nickname||profile.nickname||DEFAULT_NICKNAME48} · SUNSET RUN ${payload.course}km 완주! 게임 환산 기록 ${time(payload.virtualMs,true)} · 점수 ${payload.score}`;
    const gameUrl=new URL('./',location.href).href;
    actions.append(button('친구에게 공유',async()=>{
      try{
        if(navigator.canShare?.({files:[file]})&&navigator.share){await navigator.share({files:[file],title:'나의 노을런 완주',text:shareText});message.textContent='공유 창으로 전달했어요.';}
        else if(navigator.share){await navigator.share({title:'SUNSET RUN',text:shareText,url:gameUrl});message.textContent='공유 창으로 전달했어요. 사진은 별도로 저장해 주세요.';}
        else{await navigator.clipboard.writeText(shareText+'\n'+gameUrl);message.textContent='기록과 게임 주소를 복사했어요. 사진은 저장해서 함께 보내 주세요.';}
      }catch(e){message.textContent=e.name==='AbortError'?'공유를 취소했어요.':'공유가 지원되지 않아요. 사진 저장이나 아래 주소 복사를 사용해 주세요.';}
    },'soft'));
    body.append(actions);
    const actions2=el('div','','sr47-actions');actions2.append(button('기록·주소 복사',async()=>{
      try{await navigator.clipboard.writeText(shareText+'\n'+gameUrl);message.textContent='복사했어요.';}catch{const box=el('textarea');box.value=shareText+'\n'+gameUrl;box.className='sr47-linkbox';body.append(box);box.select();message.textContent='선택된 내용을 직접 복사해 주세요.';}
    },'outline'));body.append(actions2,message,el('p','아이폰에서 파일만 열리면 사진을 길게 누르거나 공유 메뉴에서 사진 저장을 선택하세요. 표시되는 공유 앱은 기기마다 달라요.','sr47-muted'));
    send('OnCaptureReady','');
  }catch(e){status(friendly(e));send('OnCaptureReady','');}
}
function openBoard(){const d=modal('실제 참여자 기록판','sr47-board');const f=el('iframe');f.title='실제 참여자 기록판';f.src=new URL('leaderboard.html',location.href).href;d.append(f);}
window.SR47={attachUnity(u){unity=u;send('OnProfile',{...profile,silent:true});},dispatch(action,json){let data={};try{data=JSON.parse(json||'{}');}catch{}
  if(action==='profileRead48')send('OnProfile',{...profile,silent:true});else if(action==='profile')openProfile();else if(action==='start')beginRun(data);else if(action==='checkpoint')checkpoint(data);else if(action==='finish')finish(data);else if(action==='board')openBoard();
},receiveImage(bytes,json){let p;try{p=JSON.parse(json);}catch{return;}receiveImage(bytes,p);}};
if(window.sunsetUnity)unity=window.sunsetUnity;
for(const [a,j] of (window.__sr47Queue||[]))window.SR47.dispatch(a,j);window.__sr47Queue=[];

window.addEventListener('storage',e=>{if(e.key==='sr47:profile'){profile=loadProfile48();send('OnProfile',{...profile,silent:true});}});
