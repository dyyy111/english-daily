'use strict';
const KEY='englishDailyV1';
const PLAYLIST='https://www.youtube.com/playlist?list=PLOB7G19x6JpPcNiPj7llUNQPrtbbcpVVN';
const intervals=[1,3,7,14,30];
const $=s=>document.querySelector(s);
function localDay(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function plusDays(s,n){const [y,m,d]=s.split('-').map(Number);const t=new Date(y,m-1,d,12);t.setDate(t.getDate()+n);return localDay(t)}
function defaultUnits(){return VERIFIED_UNITS.map(u=>({...u}))}
function initial(){const v={units:defaultUnits(),records:{},nextUnit:6,started:'2026-11-17',dailyNew:{},history:[],profileApplied:'2026-11-17'};applyKnownProgress(v);return v}
function applyKnownProgress(v){
  const day='2026-11-17';
  for(let id=1;id<=5;id++)v.records[id]={firstDate:'先前已學',stage:0,due:plusDays(day,1),lastRating:'既有進度'};
  for(let id=1;id<=2;id++){
    const before={...v.records[id],due:day};
    v.records[id]={...v.records[id],stage:1,due:plusDays(day,3),lastRating:'normal'};
    v.history.push({id,date:day,rating:'normal',type:'review',before});
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
let data=load();function save(){localStorage.setItem(KEY,JSON.stringify(data));render();window.dispatchEvent(new Event('english-daily-changed'))}
window.englishDailyExport=()=>structuredClone(data);
window.englishDailyReplace=(v)=>{if(!Array.isArray(v.units)||!v.records||!v.dailyNew||!Array.isArray(v.history)||!Number.isInteger(v.nextUnit))throw Error('無效的進度資料');data=structuredClone(v);localStorage.setItem(KEY,JSON.stringify(data));render()};
const record=id=>data.records[id];
function today(){return localDay()}
function isDone(id,date=today()){return data.history.some(h=>h.id===id&&h.date===date)}
function latestDone(id,date=today()){return data.history.filter(h=>h.id===id&&h.date===date).at(-1)}
function due(date=today()){return data.units.filter(u=>{let r=record(u.id);return r&&r.due&&r.due<=date&&!isDone(u.id,date)}).sort((a,b)=>record(a.id).due.localeCompare(record(b.id).due))}
function getNew(date=today(),assign=true){let existing=data.dailyNew[date];if(existing&&data.units.some(u=>u.id===existing))return data.units.find(u=>u.id===existing);if(existing)return null;
 // Do not assign future new units. Assign one per day; skip units already learned.
 if(!assign||date!==today())return null;
 let unit=data.units.find(u=>u.id>=data.nextUnit&&!record(u.id));if(!unit)return null;
 data.dailyNew[date]=unit.id;data.nextUnit=unit.id+1;localStorage.setItem(KEY,JSON.stringify(data));queueMicrotask(()=>window.dispatchEvent(new Event('english-daily-changed')));return unit}
function nextDue(currentStage,rating,date){
 if(rating==='hard')return {stage:0,due:plusDays(date,1)}; // restart full cycle from +1
 const stage=Math.min(currentStage+1,intervals.length);
 return {stage,due:stage===intervals.length?null:plusDays(date,intervals[stage])};
}
function complete(id,rating,isNew=false){const date=today();if(isDone(id,date))return;const before=record(id)?structuredClone(record(id)):null;let r=record(id)||{stage:0,due:null,firstDate:date};if(isNew){r.stage=0;r.firstDate=date;r.due=plusDays(date,1)}else{const next=nextDue(r.stage,rating,date);r.stage=next.stage;r.due=next.due}r.lastRating=rating;data.records[id]=r;data.history.push({id,date,rating,type:isNew?'new':'review',before});save()}
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
function render(){const d=today();$('#dateText').textContent=niceDate(d);const newUnit=getNew(d);const reviews=due(d);const newComplete=newUnit?isDone(newUnit.id,d):false;const completed=data.history.filter(h=>h.date===d).length;let total=reviews.length+completed+(newUnit&&!newComplete?1:0);$('#doneNum').textContent=completed;$('#totalNum').textContent=total;$('#dueNum').textContent=reviews.length;$('#progressBar').style.width=`${total?Math.min(100,completed/total*100):100}%`;
 let streak=0,cur=d;while(data.history.some(h=>h.date===cur)){streak++;cur=plusDays(cur,-1)}$('#streak').textContent=`連續 ${streak} 天`;
 let html='';if(newUnit&&!newComplete){html+=taskHtml(newUnit,'new')}else if(newUnit&&newComplete){html+=completedHtml(newUnit,'new')}
 if(reviews.length){html+=`<h3 style="margin-top:20px">到期複習（${reviews.length}）</h3>`;html+=reviews.map(u=>taskHtml(u,'review')).join('')}else html+='<p class="muted small">今天沒有其他到期複習。</p>';
 let completedToday=data.history.filter(h=>h.date===d&&h.type==='review');if(completedToday.length){html+='<h3 style="margin-top:20px">今天已完成的複習（可取消）</h3>';html+=completedToday.map(h=>{const u=data.units.find(u=>u.id===h.id);return u?completedHtml(u,'review'):''}).join('')}
 if(!newUnit&&reviews.length===0&&!completedToday.length)html='<div class="empty">今日任務完成！或所有新單元都已學完 🎉</div>';$('#todayTasks').innerHTML=html;
 $('#unitList').innerHTML=data.units.map(u=>{let r=record(u.id);return `<div class="item"><div class="row"><div><b>${safe(u.title)}</b><div class="muted small">#${u.id} · ${r?(r.due?'下次 '+r.due:'已完成全部複習'):'尚未學習'}</div></div><a href="${safe(validUrl(u.url))}" target="_blank" rel="noopener">播放 ↗</a></div>${r?`<div class="row"><div class="small muted">${r.due?'下一次為第 '+(r.stage+1)+'/5 次複習':'5/5 次複習已完成'} · ${safe(r.lastRating||'之前已學過')}</div><button class="btn secondary" data-do="restart" data-id="${u.id}">↻ 重置複習週期</button></div>`:''}</div>`}).join('');
 let upcoming=[];for(let i=0;i<14;i++){let day=plusDays(d,i);let reviews=data.units.filter(u=>{let r=record(u.id);return r&&r.due===day}).map(u=>`#${u.id}`);let newId=data.dailyNew[day];let futureNew=i===0?(newUnit?newUnit.id:null):null;upcoming.push(`<div class="item"><b>${niceDate(day)}</b><div class="small muted">${futureNew?'新學 #'+futureNew+' · ':''}${newId&&i>0?'已安排新學 #'+newId+' · ':''}${reviews.length?'複習 '+reviews.join('、'):'無已排定的複習'}${i>0?' · 新單元依當日進度安排':''}</div></div>`)}$('#calendarList').innerHTML=upcoming.join('');$('#startUnit').value=data.nextUnit;$('#priorGrid').innerHTML=data.units.map(u=>`<label><input type="checkbox" class="prior" value="${u.id}" ${record(u.id)?'disabled':''}>#${u.id} ${record(u.id)?'✓':''}</label>`).join('')}
function validUrl(url){try{let u=new URL(url);return u.protocol==='https:'&&(['youtube.com','www.youtube.com','youtu.be','m.youtube.com'].includes(u.hostname))?u.href:PLAYLIST}catch(e){return PLAYLIST}}
function completedHtml(u,type){return `<div class="task done-task"><div class="row"><span class="pill">✓ ${type==='new'?'今日新學':'今日複習'}已完成</span><button class="btn secondary" data-do="undo" data-id="${u.id}">↶ 取消完成</button></div><h3>${safe(u.title)}</h3><div class="small muted">如按錯，可取消並重新完成／評分。</div><a target="_blank" rel="noopener" href="${safe(validUrl(u.url))}">▶ 播放影片</a></div>`}
function taskHtml(u,type){let r=record(u.id);let isNew=type==='new';return `<div class="task"><div class="row"><span class="pill">${isNew?'NEW · 今日新學':'REVIEW · 到期複習'}</span><span class="muted small">${safe(u.duration||'')}</span></div><h3>${safe(u.title)}</h3><div class="small muted">${isNew?'完成後開始 +1、+3、+7、+14、+30 天複習週期。':'第 '+(r.stage+1)+'/5 次複習 · 原到期日 '+niceDate(r.due)}</div><div class="actions"><a class="btn secondary" target="_blank" rel="noopener" href="${safe(validUrl(u.url))}" style="text-decoration:none;text-align:center">▶ 開始聽</a>${isNew?`<button class="btn" data-do="complete" data-id="${u.id}" data-kind="new">完成新學</button>`:`<button class="btn warn" data-do="rate" data-id="${u.id}" data-rate="hard">困難</button><button class="btn secondary" data-do="rate" data-id="${u.id}" data-rate="normal">普通</button><button class="btn" data-do="rate" data-id="${u.id}" data-rate="easy">簡單</button>`}</div></div>`}
document.addEventListener('click',ev=>{let b=ev.target.closest('[data-do]');if(!b)return;const id=Number(b.dataset.id);if(b.dataset.do==='complete')complete(id,'normal',true);if(b.dataset.do==='rate')complete(id,b.dataset.rate,false);if(b.dataset.do==='undo')undo(id);if(b.dataset.do==='restart')restartCycle(id)});
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===b.dataset.tab));window.scrollTo(0,0)}));
$('#applyProgress').addEventListener('click',()=>{if(!confirm('套用：單元 1～5 已學習、11/17 已複習 1、2（評分普通）、下一個新學單元 6？這會改寫 1～5 的進度，建議先匯出備份。'))return;data.history=data.history.filter(h=>h.id>5);applyKnownProgress(data);delete data.dailyNew[today()];save();alert('已套用你的進度')});
$('#setStart').addEventListener('click',()=>{let n=Number($('#startUnit').value);if(!Number.isInteger(n)||n<1||n>data.units.length){alert('請輸入有效的單元編號');return}data.nextUnit=n;delete data.dailyNew[today()];save();alert('已更新下一個新單元')});
$('#addPrior').addEventListener('click',()=>{let ids=[...document.querySelectorAll('.prior:checked')].map(x=>Number(x.value));if(!ids.length){alert('請先勾選單元');return}ids.forEach(id=>{if(!record(id))data.records[id]={firstDate:'先前已學',stage:0,due:plusDays(today(),1),lastRating:'既有進度'}});save();alert(`已加入 ${ids.length} 個先前學過的單元，從明天開始複習`)});
function parseImport(raw){let parsed;try{parsed=JSON.parse(raw)}catch(e){}let list;if(Array.isArray(parsed))list=parsed.map((x,i)=>({title:x.title||`單元 ${i+1}`,url:x.url||PLAYLIST}));else list=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map((line,i)=>{const cols=line.split('\t');if(cols.length>1)return {title:cols.slice(0,-1).join(' ').trim(),url:cols.at(-1).trim()};if(/^https?:\/\//.test(line))return {title:`單元 ${String(i+1).padStart(2,'0')}`,url:line};return {title:line,url:PLAYLIST}});return list.filter(x=>x.title&&x.url&&x.url.startsWith('https://')).map((x,i)=>({id:i+1,title:String(x.title).slice(0,200),url:validUrl(x.url)}))}
$('#importUnits').addEventListener('click',()=>{let list=parseImport($('#importText').value);if(!list.length){alert('沒有讀取到有效單元。請貼上影片標題、網址或 JSON。');return}if(!confirm(`即將以 ${list.length} 個單元替換現有清單。已有紀錄會按編號保留；確認匯入？`))return;data.units=list;data.nextUnit=Math.min(data.nextUnit,list.length+1);save();alert(`成功匯入 ${list.length} 個單元`)});
$('#exportData').addEventListener('click',()=>{let blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});let a=document.createElement('a');let url=URL.createObjectURL(blob);a.href=url;a.download=`english-daily-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)});
$('#restoreBtn').addEventListener('click',()=>$('#restoreInput').click());$('#restoreInput').addEventListener('change',async ev=>{let file=ev.target.files?.[0];if(!file)return;try{let v=JSON.parse(await file.text());if(!Array.isArray(v.units)||!v.records||!v.dailyNew||!Array.isArray(v.history)||!Number.isInteger(v.nextUnit))throw Error('格式不正確');if(!confirm('要用備份取代現有資料嗎？'))return;data=v;save();alert('備份已還原')}catch(e){alert('無法匯入備份：'+e.message)}ev.target.value=''});
$('#resetAll').addEventListener('click',()=>{if(confirm('確定清除全部學習紀錄？此操作無法復原（除非已有備份）。')){data=initial();save()}});
render();if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
