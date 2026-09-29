import {api,config,local,playerId,time,el,button,friendly} from './community-api.mjs';
import {openProfile} from './sunset-community.js';
const $=id=>document.getElementById(id);
let course=10,rows=[],cursor=null,busy=false,admin=false,lastLoad=0;
const demo=new URLSearchParams(location.search).get('demo')==='1';
function note(s){$('status').textContent=s;}
const demoRows=Array.from({length:12},(_,i)=>({rank:i+1,publicId:(0xa12010+i*719).toString(16).padEnd(16,'0'),nickname:['노을산책','억새러너','해온친구','가을한걸음','초보러닝','달리는서구'][i%6]+(i>5?'2':''),virtualMs:2625000+i*9700,score:10500-i*127,hearts:22-i,cards:15-i%4,course:10}));
function draw(){
 $('rows').replaceChildren();$('admin-column').hidden=!admin;
 for(const row of rows){const tr=el('tr');const name=el('td');name.append(el('div',row.nickname,'nickname'),el('span','#'+row.publicId.slice(0,6),'code'));
  tr.append(el('td',String(row.rank),'rank'),name,el('td',time(row.virtualMs,true)),el('td',row.score.toLocaleString('ko-KR')),el('td',String(row.hearts)),el('td',String(row.cards)));
  if(admin){const td=el('td');td.append(button('검토 후 제외',async()=>{
   if(!confirm('이 참여자의 현재 규칙 기록을 랭킹에서 제외하고 추가 제출을 중지할까요? 실제 부정행위 증거를 확인한 뒤 진행하세요.'))return;
   try{await api('moderate',{publicId:row.publicId},'POST');await load(true,true);}catch(e){note(friendly(e));}
  },'btn danger'));tr.append(td);}
  $('rows').append(tr);
 }
 $('empty').hidden=rows.length>0;$('empty').textContent='아직 등록된 완주 기록이 없어요. 첫 기록의 주인공이 되어 보세요!';
 $('more').disabled=!cursor||busy;
}
async function load(reset=true,force=false){
 if(busy)return;if(reset&&!force&&Date.now()-lastLoad<5000){note('잠시 후 새로고침해 주세요.');return;}
 busy=true;$('refresh').disabled=true;note('기록을 확인 중이에요.');
 try{const result=demo?{rows:demoRows.map(r=>({...r,course,virtualMs:course===5?Math.round(r.virtualMs/2):r.virtualMs})),total:12,nextCursor:null}:await api('board',{course,cursor:reset?null:cursor});
  rows=reset?result.rows:rows.concat(result.rows);cursor=result.nextCursor;lastLoad=Date.now();
  $('total').textContent=result.total.toLocaleString('ko-KR');if(reset)$('fastest').textContent=rows.length?time(rows[0].virtualMs):'—';
  draw();note((demo?'예시 데이터 · ':'')+'확인 시각 '+new Date().toLocaleTimeString('ko-KR'));
 }catch(e){note(friendly(e));$('empty').textContent='연결 후 실제 기록이 표시됩니다. 임의의 순위를 만들어 보여주지 않아요.';}
 finally{busy=false;$('refresh').disabled=false;$('more').disabled=!cursor;}
}
async function mine(){
 try{
  if(demo){$('my-rank').textContent='4위';$('my-time').textContent='예시 데이터';return;}
  const p=await api('me',{course});admin=p.isAdmin===true;draw();
  if(!p.registered){note('닉네임을 등록하고 완주하면 기록이 남아요.');return;}
  local.set('profile',{nickname:p.nickname,publicId:p.publicId,linked:false,online:true,uid:playerId()});
  $('my-rank').textContent=p.rank?p.rank+'위':'미등록';$('my-time').textContent=p.best?time(p.best.virtualMs,true):'이 코스 완주 후 등록';
  const section=$('mine');section.hidden=false;section.replaceChildren(el('h2',p.nickname+'의 최근 완주'));
  section.append(el('p','이 브라우저의 참여자 ID로 내 기록을 구분해요. 다른 기기에서는 별도 참여자로 시작합니다.','fine'));
  for(const r of p.history){section.append(el('p',`${r.course}km · ${time(r.virtualMs,true)} · ${r.score.toLocaleString()}점 · ${r.status==='accepted'?'등록':'확인 필요'} · ${new Date(r.receivedAtMs).toLocaleDateString('ko-KR')}`));}
  if(!p.history.length)section.append(el('p','아직 저장한 완주가 없어요.'));
 }catch(e){note(friendly(e));}
}
$('course5').onclick=()=>{if(busy)return;course=5;switchCourse();};$('course10').onclick=()=>{if(busy)return;course=10;switchCourse();};
function switchCourse(){if(busy)return;$('course5').classList.toggle('active',course===5);$('course10').classList.toggle('active',course===10);$('caption').textContent=course+'km 전체 참여자 기록';$('total-label').textContent=course+'km 기록 보유자';$('my-rank').textContent='—';$('my-time').textContent='내 기록 버튼으로 확인';$('mine').hidden=true;load(true,true);}
$('refresh').onclick=()=>load();$('more').onclick=()=>load(false);$('my').onclick=mine;$('login').onclick=()=>{if(demo)note('예시 화면에서는 계정을 만들지 않아요.');else openProfile();};
$('csv').onclick=()=>{
 const quote=v=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 const cells=[['순위','닉네임','식별코드','코스km','게임환산기록','점수','하트','카드'],...rows.map(r=>[r.rank,r.nickname,r.publicId.slice(0,6),course,time(r.virtualMs,true),r.score,r.hearts,r.cards])];
 const blob=new Blob(['\ufeff'+cells.map(r=>r.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=`SUNSET_${course}km_현재목록.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
};
$('delete').onclick=async()=>{
 if(demo){note('예시 데이터는 삭제되지 않아요.');return;}
 if(!confirm('이 행사에 저장한 내 닉네임과 모든 규칙 버전의 개인·공개 기록을 삭제할까요? 복구할 수 없습니다. Google 계정 자체는 삭제하지 않습니다.'))return;
 try{const out=await api('deleteMine',{confirm:'DELETE_MY_RECORDS'},'POST');local.remove('profile');local.remove('pending');$('mine').hidden=true;$('my-rank').textContent='—';await load(true,true);note(out.message);}catch(e){note(friendly(e));}
};
$('retry').onclick=async()=>{
 try{if(demo)return note('예시 화면에는 미전송 기록이 없어요.');const p=local.get('pending');if(!p)return note('미전송 기록이 없어요.');
  if(Date.now()-p.at>86400000){local.remove('pending');return note('24시간이 지나 온라인 등록 대기 정보를 지웠어요. 저장한 PNG는 그대로 남아요.');}
  const c=await config();if(playerId()!==p.uid||c.event!==p.event)throw new Error('경기를 시작했던 같은 브라우저에서 다시 시도해 주세요.');
  const out=await api('finish',{clientRunId:p.clientRunId,result:p.result},'POST');local.remove('pending');await load(true,true);note(out.message);await mine();
 }catch(e){note(friendly(e));}
};
if(demo){$('demo').className='demo-banner';$('demo').textContent='디자인 미리보기 · 모든 닉네임과 기록은 예시입니다';$('privacy').textContent='예시 화면에서는 서버에 기록을 저장하지 않습니다.';load(true,true);}
else{const c=await config();$('scope').textContent=c.event+' / '+c.ruleset;$('privacy').textContent='보관: '+(c.retentionNotice||'운영자 설정 전')+' · 문의: '+(c.contactText||'운영자 설정 전');
 if(!c.enabled){$('notice').hidden=false;$('notice').textContent='온라인 기록판은 아직 연결 전이에요. Supabase 연결 후 실제 기록이 표시됩니다. 사진 저장과 게임은 독립적으로 이용할 수 있어요.';$('empty').textContent='서버 연결 전 · 실제 참여 기록 없음';note('랭킹 연동 대기 중');}
 else {if(c.acceptResults===false){$('notice').hidden=false;$('notice').textContent='새 기록 등록은 종료되었어요. 기존 기록은 계속 확인할 수 있어요.';}await load(true,true);}
}

$('logout').onclick=async()=>{
 if(demo)return note('예시 화면에는 참여정보가 없어요.');
 if(!confirm('이 브라우저에서 닉네임 표시만 초기화할까요? 서버의 기존 기록은 삭제되지 않습니다.'))return;
 local.remove('profile');local.remove('pending');admin=false;draw();$('admin').hidden=true;$('mine').hidden=true;$('my-rank').textContent='—';$('my-time').textContent='참여정보 초기화';note('이 브라우저의 닉네임 표시를 초기화했어요.');
};