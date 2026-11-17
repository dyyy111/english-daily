'use strict';
const KEY='englishDailyV1';
const PLAYLIST='https://www.youtube.com/playlist?list=PLOB7G19x6JpPcNiPj7llUNQPrtbbcpVVN';
const intervals=[1,3,7,14,30];
const $=s=>document.querySelector(s);
function localDay(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function plusDays(s,n){const [y,m,d]=s.split('-').map(Number);const t=new Date(y,m-1,d,12);t.setDate(t.getDate()+n);return localDay(t)}
const DEFAULT_PREFS={dailyLimit:2,priority:'review',newLimit:1};
function prefs(){const p=data.preferences||{};return {dailyLimit:Math.max(1,Math.min(10,Number(p.dailyLimit)||2)),priority:p.priority==='new'?'new':'review',newLimit:Math.max(0,Math.min(10,Number.isInteger(Number(p.newLimit))?Number(p.newLimit):1))}}
function defaultUnits(){return VERIFIED_UNITS.map(u=>({...u}))}
function initial(){const v={units:defaultUnits(),records:{},nextUnit:6,started:'2026-11-17',dailyNew:{},history:[],profileApplied:'2026-11-17',preferences:{...DEFAULT_PREFS},inProgress:[]};applyKnownProgress(v);return v}
function applyKnownProgress(v){
  const day='2026-11-17';
  for(let id=1;id<=5;id++)v.records[id]={firstDate:'先前已學',stage:0,due:plusDays(day,1),lastRating:'先前已學習'};
  for(let id=1;id<=2;id++){
    const before={...v.records[id],due:day};
    v.records[id]={...v.records[id],stage:1,due:plusDays(day,3),lastRating:'已完成'};
    v.history.push({id,date:day,rating:'completed',type:'review',before});
  }
  v.nextUnit=6;
  delete v.dailyNew[day];
  v.profileApplied=day;
}
function load(){try{let v=JSON.parse(localStorage.getItem(KEY));if(v&&Array.isArray(v.units)&&v.records&&v.dailyNew&&Array.isArray(v.history)){
  // Upgrade placeholders from v1/v2 to the 50 verified TOEIC videos; retain progress.
  if(v.units.length===50&&v.units.every((u,i)=>u.id===i+1&&(u.url===PLAYLIST||u.url===VERIFIED_UNITS[i].url)))v.units=defaultUnits();
  return v;
 }}catch(e){}return initial()}
let data=load();if(!data.preferences)data.preferences={...DEFAULT_PREFS};if(!Array.isArray(data.inProgress))data.inProgress=[];function save(){localStorage.setItem(KEY,JSON.stringify(data));render();window.dispatchEvent(new Event('english-daily-changed'))}
window.englishDailyExport=()=>structuredClone(data);
window.englishDailyReplace=(v)=>{if(!Array.isArray(v.units)||!v.records||!v.dailyNew||!Array.isArray(v.history)||!Number.isInteger(v.nextUnit))throw Error('無效的進度資料');data=structuredClone(v);localStorage.setItem(KEY,JSON.stringify(data));render()};
const record=id=>data.records[id];
function today(){return localDay()}
function isDone(id,date=today()){return data.history.some(h=>h.id===id&&h.date===date)}
function latestDone(id,date=today()){return data.history.filter(h=>h.id===id&&h.date===date).at(-1)}
function due(date=today()){return data.units.filter(u=>{let r=record(u.id);return r&&r.due&&r.due<=date&&!isDone(u.id,date)}).sort((a,b)=>record(a.id).due.localeCompare(record(b.id).due))}
function newAssignments(date){const x=data.dailyNew[date];return Array.isArray(x)?x:(Number.isInteger(x)?[x]:[])}
function pendingNew(){const ids=Object.keys(data.dailyNew).sort().flatMap(d=>newAssignments(d));return [...new Set(ids)].filter(id=>!record(id)&&data.units.some(u=>u.id===id))}
function pickNew(date,count,assign=true){
 let selected=[];for(const id of pendingNew()){if(selected.length>=count)break;const u=data.units.find(u=>u.id===id);if(u)selected.push(u)}
 if(!assign||date!==today())return selected;
 while(selected.length<count){const u=data.units.find(u=>u.id>=data.nextUnit&&!record(u.id)&&!selected.some(x=>x.id===u.id));if(!u)break;selected.push(u);data.nextUnit=u.id+1}
 if(selected.length){const existing=newAssignments(date);const update=[...new Set([...existing,...selected.map(u=>u.id)])];if(JSON.stringify(existing)!==JSON.stringify(update)){data.dailyNew[date]=update;localStorage.setItem(KEY,JSON.stringify(data));queueMicrotask(()=>window.dispatchEvent(new Event('english-daily-changed')))}}
 return selected;
}
function dayPlan(date=today(),assign=true){
 const p=prefs(),finished=new Set(data.history.filter(h=>h.date===date).map(h=>h.id));
 const quota=Math.max(0,p.dailyLimit-finished.size);
 const old=due(date).filter(u=>!finished.has(u.id));
 const newDone=data.history.filter(h=>h.date===date&&h.type==='new').length;
 let newQuota=Math.min(quota,Math.max(0,p.newLimit-newDone));
 let newly=[],review=[];
 if(p.priority==='review'){
   review=old.slice(0,quota);
   newQuota=Math.min(newQuota,Math.max(0,quota-review.length));
   newly=pickNew(date,newQuota,assign);
 }else{
   newly=pickNew(date,newQuota,assign);
   review=old.slice(0,Math.max(0,quota-newly.length));
 }
 return {newly,review,postponed:old.length-review.length,quota,finished:finished.size,settings:p};
}
function nextDue(currentStage,date){
 const stage=Math.min(currentStage+1,intervals.length);
 return {stage,due:stage===intervals.length?null:plusDays(date,intervals[stage])};
}
function complete(id,isNew=false){
 const date=today();if(isDone(id,date))return;
 const before=record(id)?structuredClone(record(id)):null;
 let r=record(id)||{stage:0,due:null,firstDate:date};
 if(isNew){r.stage=0;r.firstDate=date;r.due=plusDays(date,1)}
 else{const next=nextDue(r.stage,date);r.stage=next.stage;r.due=next.due}
 r.lastRating=isNew?'完成新學':'完成複習';
 data.records[id]=r;data.inProgress=data.inProgress.filter(x=>x!==id);
 data.history.push({id,date,rating:'completed',type:isNew?'new':'review',before});save();
}
function undo(id,date=today()){const pos=data.history.findLastIndex(h=>h.id===id&&h.date===date);if(pos<0)return;const h=data.history[pos];if(h.before===null)delete data.records[id];else if(h.before)data.records[id]=h.before;else{alert('這是舊版紀錄，缺少復原快照。請使用備份還原。');return}data.history.splice(pos,1);save()}
function restartCycle(id){
 const r=record(id);if(!r)return;
 if(!confirm(`重新開始單元 ${id} 的複習週期？下次複習將排在明天（+1 天），再依序 +3、+7、+14、+30 天。`))return;
 data.history=data.history.filter(h=>!(h.id===id&&h.date===today()));
 data.records[id]={...r,stage:0,due:plusDays(today(),1),lastRating:'手動重置'};
 save();
}
function safe(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function niceDate(s){const t=new Date(s+'T12:00:00');return `${t.getMonth()+1}/${t.getDate()}（${'日一二三四五六'[t.getDay()]}）`}
function render(){
 const d=today();$('#dateText').textContent=niceDate(d);
 const plan=dayPlan(d), done=data.history.filter(h=>h.date===d), completedIds=[...new Set(done.map(h=>h.id))];
 const total=plan.newly.length+plan.review.length+completedIds.length;
 $('#doneNum').textContent=completedIds.length;$('#totalNum').textContent=total;$('#dueNum').textContent=plan.review.length;
 $('#progressBar').style.width=`${total?Math.min(100,completedIds.length/total*100):100}%`;
 $('#dailySummary').textContent=`每日最多 ${plan.settings.dailyLimit} 部 · ${plan.settings.priority==='review'?'複習優先':'新片優先'} · 新片最多 ${plan.settings.newLimit} 部`;
 let streak=0,cur=d;while(data.history.some(h=>h.date===cur)){streak++;cur=plusDays(cur,-1)}$('#streak').textContent=`連續 ${streak} 天`;
 let html='';
 if(plan.review.length){html+='<h3>優先複習</h3>'+plan.review.map(u=>taskHtml(u,'review')).join('')}
 if(plan.newly.length){html+='<h3 style="margin-top:20px">新單元／繼續學習</h3>'+plan.newly.map(u=>taskHtml(u,'new')).join('')}
 if(plan.postponed)html+=`<p class="notice">還有 ${plan.postponed} 部到期複習未排入今天。會保留在待複習清單，之後優先安排，不會自動跳過。</p>`;
 if(done.length){html+='<h3 style="margin-top:20px">今天已完成（可取消）</h3>';html+=done.map(h=>{const u=data.units.find(u=>u.id===h.id);return u?completedHtml(u,h.type):''}).join('')}
 if(!plan.newly.length&&!plan.review.length&&!done.length)html='<div class="empty">今天沒有指派任務，可以休息，或從「單元」提前學習 🎉</div>';
 $('#todayTasks').innerHTML=html;
 $('#unitList').innerHTML=data.units.map(u=>{const r=record(u.id),progress=data.inProgress.includes(u.id);return `<div class="item"><div class="row"><div><b>${safe(u.title)}</b><div class="muted small">#${u.id} · ${r?(r.due?'下次 '+r.due:'已完成全部複習'):(progress?'進行中':'尚未學習')}</div></div><a href="${safe(validUrl(u.url))}" target="_blank" rel="noopener">播放 ↗</a></div>${r?`<div class="row"><div class="small muted">${r.due?'下一次：第 '+(r.stage+1)+'/5 輪複習':'全部 5 輪複習已完成'} · ${r.firstDate==='先前已學'?'已標記為先前學過':(r.lastRating==='手動重置'?'已手動重置':'')}</div><button class="btn secondary" data-do="restart" data-id="${u.id}">↻ 重置複習週期</button></div>`:`<div class="actions"><button class="btn secondary" data-do="progress" data-id="${u.id}">${progress?'取消進行中':'標記進行中'}</button><button class="btn" data-do="advance" data-id="${u.id}">完成新學${progress?'（續讀）':'（可提前）'}</button></div>`}</div>`}).join('');
 let upcoming=[];for(let i=0;i<14;i++){const day=plusDays(d,i);const reviews=data.units.filter(u=>{const r=record(u.id);return r&&r.due===day}).map(u=>`#${u.id}`);const assigned=newAssignments(day);upcoming.push(`<div class="item"><b>${niceDate(day)}</b><div class="small muted">${assigned.length?'已指派新學 '+assigned.map(x=>'#'+x).join('、')+' · ':''}${reviews.length?'到期 '+reviews.join('、'):'無當天到期複習'}${i>0?' · 實際每日指派依上限與優先順序決定':''}</div></div>`)}$('#calendarList').innerHTML=upcoming.join('');
 $('#startUnit').value=data.nextUnit;$('#dailyLimit').value=String(plan.settings.dailyLimit);$('#priorityMode').value=plan.settings.priority;$('#newLimit').value=String(plan.settings.newLimit);
 $('#priorGrid').innerHTML=data.units.map(u=>`<label><input type="checkbox" class="prior" value="${u.id}" ${record(u.id)?'disabled':''}>#${u.id} ${record(u.id)?'✓':''}</label>`).join('');
}
function validUrl(url){try{let u=new URL(url);return u.protocol==='https:'&&(['youtube.com','www.youtube.com','youtu.be','m.youtube.com'].includes(u.hostname))?u.href:PLAYLIST}catch(e){return PLAYLIST}}
function completedHtml(u,type){return `<div class="task done-task"><div class="row"><span class="pill">✓ ${type==='new'?'今日新學':'今日複習'}已完成</span><button class="btn secondary" data-do="undo" data-id="${u.id}">↶ 取消完成</button></div><h3>${safe(u.title)}</h3><div class="small muted">如按錯，可取消完成並恢復先前進度。</div><a target="_blank" rel="noopener" href="${safe(validUrl(u.url))}">▶ 播放影片</a></div>`}
function taskHtml(u,type){let r=record(u.id);let isNew=type==='new';return `<div class="task"><div class="row"><span class="pill">${isNew?'NEW · 今日新學':'REVIEW · 到期複習'}</span><span class="muted small">${safe(u.duration||'')}</span></div><h3>${safe(u.title)}</h3><div class="small muted">${isNew?'完成後開始 +1、+3、+7、+14、+30 天複習週期。':'第 '+(r.stage+1)+'/5 輪複習 · 原到期日 '+niceDate(r.due)}</div><div class="actions"><a class="btn secondary" target="_blank" rel="noopener" href="${safe(validUrl(u.url))}" style="text-decoration:none;text-align:center">▶ 開始聽</a>${isNew?`<button class="btn" data-do="complete" data-id="${u.id}" data-kind="new">完成新學</button>`:`<button class="btn" data-do="review-complete" data-id="${u.id}">完成複習</button>`}</div></div>`}
document.addEventListener('click',ev=>{let b=ev.target.closest('[data-do]');if(!b)return;const id=Number(b.dataset.id);if(b.dataset.do==='complete')complete(id,true);if(b.dataset.do==='review-complete')complete(id,false);if(b.dataset.do==='undo')undo(id);if(b.dataset.do==='restart')restartCycle(id);if(b.dataset.do==='progress'){data.inProgress=data.inProgress.includes(id)?data.inProgress.filter(x=>x!==id):[...data.inProgress,id];save()}if(b.dataset.do==='advance'){complete(id,true)}});
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===b.dataset.tab));window.scrollTo(0,0)}));
$('#applyProgress').addEventListener('click',()=>{if(!confirm('套用：單元 1～5 已學習、11/17 已複習 1、2、下一個新學單元 6？這會改寫 1～5 的進度，建議先匯出備份。'))return;data.history=data.history.filter(h=>h.id>5);applyKnownProgress(data);delete data.dailyNew[today()];save();alert('已套用你的進度')});
$('#savePreferences').addEventListener('click',()=>{data.preferences={dailyLimit:Number($('#dailyLimit').value),priority:$('#priorityMode').value,newLimit:Number($('#newLimit').value)};save();alert('每日任務設定已儲存。已完成的任務不受影響。')});
$('#setStart').addEventListener('click',()=>{let n=Number($('#startUnit').value);if(!Number.isInteger(n)||n<1||n>data.units.length){alert('請輸入有效的單元編號');return}data.nextUnit=n;delete data.dailyNew[today()];save();alert('已更新下一個新單元')});
$('#addPrior').addEventListener('click',()=>{let ids=[...document.querySelectorAll('.prior:checked')].map(x=>Number(x.value));if(!ids.length){alert('請先勾選單元');return}ids.forEach(id=>{if(!record(id))data.records[id]={firstDate:'先前已學',stage:0,due:plusDays(today(),1),lastRating:'先前已學習'}});save();alert(`已加入 ${ids.length} 個先前學過的單元，從明天開始複習`)});
function parseImport(raw){let parsed;try{parsed=JSON.parse(raw)}catch(e){}let list;if(Array.isArray(parsed))list=parsed.map((x,i)=>({title:x.title||`單元 ${i+1}`,url:x.url||PLAYLIST}));else list=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map((line,i)=>{const cols=line.split('\t');if(cols.length>1)return {title:cols.slice(0,-1).join(' ').trim(),url:cols.at(-1).trim()};if(/^https?:\/\//.test(line))return {title:`單元 ${String(i+1).padStart(2,'0')}`,url:line};return {title:line,url:PLAYLIST}});return list.filter(x=>x.title&&x.url&&x.url.startsWith('https://')).map((x,i)=>({id:i+1,title:String(x.title).slice(0,200),url:validUrl(x.url)}))}
$('#importUnits').addEventListener('click',()=>{let list=parseImport($('#importText').value);if(!list.length){alert('沒有讀取到有效單元。請貼上影片標題、網址或 JSON。');return}if(!confirm(`即將以 ${list.length} 個單元替換現有清單。已有紀錄會按編號保留；確認匯入？`))return;data.units=list;data.nextUnit=Math.min(data.nextUnit,list.length+1);save();alert(`成功匯入 ${list.length} 個單元`)});
$('#exportData').addEventListener('click',()=>{let blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});let a=document.createElement('a');let url=URL.createObjectURL(blob);a.href=url;a.download=`english-daily-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)});
$('#restoreBtn').addEventListener('click',()=>$('#restoreInput').click());$('#restoreInput').addEventListener('change',async ev=>{let file=ev.target.files?.[0];if(!file)return;try{let v=JSON.parse(await file.text());if(!Array.isArray(v.units)||!v.records||!v.dailyNew||!Array.isArray(v.history)||!Number.isInteger(v.nextUnit))throw Error('格式不正確');if(!confirm('要用備份取代現有資料嗎？'))return;data=v;save();alert('備份已還原')}catch(e){alert('無法匯入備份：'+e.message)}ev.target.value=''});
$('#resetAll').addEventListener('click',()=>{if(confirm('確定清除全部學習紀錄？此操作無法復原（除非已有備份）。')){data=initial();save()}});
render();if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
