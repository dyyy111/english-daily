'use strict';
const KEY='englishDailyV1';
const PLAYLIST='https://www.youtube.com/playlist?list=PLOB7G19x6JpPcNiPj7llUNQPrtbbcpVVN';
const intervals=[1,3,7,14,30];
const $=s=>document.querySelector(s);
function localDay(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function plusDays(s,n){const [y,m,d]=s.split('-').map(Number);const t=new Date(y,m-1,d,12);t.setDate(t.getDate()+n);return localDay(t)}
const DEFAULT_PREFS={dailyLimit:2,priority:'review',newLimit:1};
function prefs(){const p=data.preferences||{};return {dailyLimit:Math.max(1,Math.min(10,Number(p.dailyLimit)||2)),priority:p.priority==='new'?'new':'review',newLimit:Math.max(0,Math.min(10,Number.isInteger(Number(p.newLimit))?Number(p.newLimit):1))}}
function standardTitle(id){return `TOEIC Listening ${String(id).padStart(2,'0')}`}
const TOEIC_COURSE='toeic-listening';
function normalizeUnitTitles(v){
 if(!Array.isArray(v.units))return;
 // Legacy units 1–50 map to TOEIC; preserve user-added courses without renaming.
 v.units=v.units.map((u,i)=>{const id=Number(u.id??i+1);const courseId=u.courseId||(id<=50?TOEIC_COURSE:'other');return {...u,id,courseId,title:courseId===TOEIC_COURSE?standardTitle(id):u.title}});
 if(!Array.isArray(v.courses))v.courses=[];
 if(!v.courses.some(c=>c.id===TOEIC_COURSE))v.courses.unshift({id:TOEIC_COURSE,title:'TOEIC Listening'});
 const unknown=[...new Set(v.units.map(u=>u.courseId).filter(id=>!v.courses.some(c=>c.id===id)))];
 unknown.forEach(id=>v.courses.push({id,title:id==='other'?'其他教材':id}));
}
function courseFor(u){return (data.courses||[]).find(c=>c.id===u.courseId)?.title||'其他教材'}
function defaultUnits(){return VERIFIED_UNITS.map(u=>({...u,title:standardTitle(u.id),courseId:TOEIC_COURSE}))}
function initial(){const v={courses:[{id:TOEIC_COURSE,title:'TOEIC Listening'}],units:defaultUnits(),records:{},nextUnit:6,started:'2026-11-17',dailyNew:{},history:[],profileApplied:'2026-11-17',preferences:{...DEFAULT_PREFS},inProgress:[]};applyKnownProgress(v);return v}
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
  normalizeUnitTitles(v);return v;
 }}catch(e){}return initial()}
let data=load();normalizeUnitTitles(data);if(!data.preferences)data.preferences={...DEFAULT_PREFS};if(!Array.isArray(data.inProgress))data.inProgress=[];function save(){localStorage.setItem(KEY,JSON.stringify(data));render();window.dispatchEvent(new Event('english-daily-changed'))}
window.englishDailyExport=()=>structuredClone(data);
window.englishDailyReplace=(v)=>{if(!Array.isArray(v.units)||!v.records||!v.dailyNew||!Array.isArray(v.history)||!Number.isInteger(v.nextUnit))throw Error('無效的進度資料');data=structuredClone(v);normalizeUnitTitles(data);localStorage.setItem(KEY,JSON.stringify(data));render()};
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
 const d=today();
 const plan=dayPlan(d), done=data.history.filter(h=>h.date===d), completedIds=[...new Set(done.map(h=>h.id))];
 const total=plan.newly.length+plan.review.length+completedIds.length;
 $('#doneNum').textContent=completedIds.length;$('#totalNum').textContent=total;$('#dueNum').textContent=plan.review.length;
 $('#progressBar').style.width=`${total?Math.min(100,completedIds.length/total*100):100}%`;
 $('#dailySummary').textContent=`每日最多 ${plan.settings.dailyLimit} 部 · ${plan.settings.priority==='review'?'複習優先':'新片優先'} · 新片最多 ${plan.settings.newLimit} 部`;
 let streak=0,cur=d;while(data.history.some(h=>h.date===cur)){streak++;cur=plusDays(cur,-1)}$('#streak').textContent=`連續 ${streak} 天`;
 let html='';
 if(plan.review.length){html+='<h3>優先複習</h3>'+plan.review.map(u=>taskHtml(u,'review')).join('')}
 if(plan.newly.length){html+='<h3 style="margin-top:20px">新單元</h3>'+plan.newly.map(u=>taskHtml(u,'new')).join('')}
 if(plan.postponed)html+=`<p class="notice">還有 ${plan.postponed} 部到期複習未排入今天。會保留在待複習清單，之後優先安排，不會自動跳過。</p>`;
 if(done.length){html+='<h3 style="margin-top:20px">今天已完成（可取消）</h3>';html+=done.map(h=>{const u=data.units.find(u=>u.id===h.id);return u?completedHtml(u,h.type):''}).join('')}
 if(!plan.newly.length&&!plan.review.length&&!done.length)html='<div class="empty">今天沒有指派任務，可以休息，或從「單元」提前學習 🎉</div>';
 $('#todayTasks').innerHTML=html;
 const forecasts=forecastNewDates();
 $('#unitList').innerHTML=data.courses.map(c=>{
  const items=data.units.filter(u=>u.courseId===c.id);
  if(!items.length)return '';
  return `<h3 class="subhead">${safe(c.title)} <span class="muted small">(${items.length} 部)</span></h3>`+items.map(u=>{
   const r=record(u.id);
   const desc=r?(r.due?`下次 ${r.due} 為第 ${r.stage+1}/5 次複習`:'已完成全部 5 次複習'):`${forecasts[u.id]?'預計 '+forecasts[u.id]+' 第一次學習':'尚未安排首次學習'}`;
   return `<div class="item unit-item"><div class="unit-main"><a class="unit-open unit-open-full" href="${safe(validUrl(u.url))}" target="_blank" rel="noopener" aria-label="開啟 ${safe(u.title)} 的 YouTube 影片"><b>${safe(u.title)}</b><span class="muted small unit-one-line">${safe(desc)}</span></a>${r?`<button class="btn secondary unit-reset" data-do="restart" data-id="${u.id}">↻ 重置複習週期</button>`:`<button class="btn unit-reset unit-complete" data-do="advance" data-id="${u.id}">完成新學</button>`}</div></div>`;
  }).join('');
 }).join('');
 renderOverview();
 $('#dailyLimit').value=String(plan.settings.dailyLimit);$('#priorityMode').value=plan.settings.priority;$('#newLimit').value=String(plan.settings.newLimit);
}
function validUrl(url){try{let u=new URL(url);return u.protocol==='https:'&&(['youtube.com','www.youtube.com','youtu.be','m.youtube.com'].includes(u.hostname))?u.href:PLAYLIST}catch(e){return PLAYLIST}}
function completedHtml(u,type){return `<div class="task done-task"><div class="row"><span class="pill">✓ ${type==='new'?'今日新學':'今日複習'}已完成</span><button class="btn secondary" data-do="undo" data-id="${u.id}">↶ 取消完成</button></div><h3>${safe(u.title)}</h3><div class="small muted">如按錯，可取消完成並恢復先前進度。</div><a target="_blank" rel="noopener" href="${safe(validUrl(u.url))}">▶ 播放影片</a></div>`}
function taskHtml(u,type){let r=record(u.id);let isNew=type==='new';return `<div class="task"><div class="row"><span class="pill">${isNew?'NEW · 今日新學':'REVIEW · 到期複習'}</span><span class="muted small">${safe(u.duration||'')}</span></div><h3>${safe(u.title)}</h3><div class="small muted">${isNew?'完成後開始 +1、+3、+7、+14、+30 天複習週期。':'第 '+(r.stage+1)+'/5 次複習'}</div><div class="actions"><a class="btn secondary" target="_blank" rel="noopener" href="${safe(validUrl(u.url))}" style="text-decoration:none;text-align:center">▶ 開始聽</a>${isNew?`<button class="btn" data-do="complete" data-id="${u.id}" data-kind="new">完成新學</button>`:`<button class="btn" data-do="review-complete" data-id="${u.id}">完成複習</button>`}</div></div>`}
document.addEventListener('click',ev=>{let b=ev.target.closest('[data-do]');if(!b)return;const id=Number(b.dataset.id);if(b.dataset.do==='complete')complete(id,true);if(b.dataset.do==='review-complete')complete(id,false);if(b.dataset.do==='undo')undo(id);if(b.dataset.do==='restart')restartCycle(id);if(b.dataset.do==='advance'){complete(id,true)}});
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===b.dataset.tab));window.scrollTo(0,0)}));
$('#savePreferences').addEventListener('click',()=>{data.preferences={dailyLimit:Number($('#dailyLimit').value),priority:$('#priorityMode').value,newLimit:Number($('#newLimit').value)};save();alert('每日任務設定已儲存。已完成的任務不受影響。')});
function countMetrics(units){
 const studied=units.filter(u=>Boolean(record(u.id)));
 const stages=studied.reduce((total,u)=>total+Math.min(5,Math.max(0,Number(record(u.id).stage)||0)),0);
 const historyReviews=data.history.filter(h=>h.type==='review'&&units.some(u=>u.id===h.id)).length;
 return {total:units.length,studied:studied.length,remaining:units.length-studied.length,stages,historyReviews,allSlots:units.length*6};
}
function percent(num,den){return den?Math.round(num/den*100):0}
function bar(label,n,den,green=false){return `<div class="overview-bars"><div class="row"><b>${safe(label)}</b><b class="stat">${percent(n,den)}%</b></div><div class="overview-track ${green?'green':''}"><span style="width:${percent(n,den)}%"></span></div><div class="muted small">${n} / ${den}</div></div>`}
function overviewNumbers(m){return `<div class="overview-numbers"><div class="overview-num"><strong>${m.studied}</strong><small>已學過</small></div><div class="overview-num"><strong>${m.historyReviews}</strong><small>完成複習次數</small></div><div class="overview-num"><strong>${m.remaining}</strong><small>尚未學習</small></div></div>`}
function renderOverview(){
 const all=countMetrics(data.units);
 $('#overallStats').innerHTML=`<p class="muted small">教材 ${data.courses.filter(c=>data.units.some(u=>u.courseId===c.id)).length} 套 · 共 ${all.total} 部影片</p>`+overviewNumbers(all)+bar('新單元完成率',all.studied,all.total)+bar('整體學習完成率',all.studied+all.stages,all.allSlots,true)+'<p class="muted small">整體完成率按目前有效的複習輪次計算；重置複習週期後會更新，歷史完成複習次數仍保留。</p>';
 $('#courseStats').innerHTML=data.courses.map(c=>{const units=data.units.filter(u=>u.courseId===c.id);if(!units.length)return '';const m=countMetrics(units);return `<div class="card"><h3>${safe(c.title)}</h3><p class="course-meta">${m.total} 部影片</p>`+overviewNumbers(m)+bar('新單元完成率',m.studied,m.total)+bar('整體學習完成率',m.studied+m.stages,m.allSlots,true)+'</div>'}).join('');
}
function parseCourseVideos(raw){
 let arr;try{const x=JSON.parse(raw);if(Array.isArray(x))arr=x.map(v=>typeof v==='string'?{url:v,title:''}:v)}catch(e){}
 if(!arr)arr=raw.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(line=>{const cols=line.split('\t');return cols.length>=2?{title:cols.slice(0,-1).join(' ').trim(),url:cols.at(-1).trim()}:{title:'',url:line}});
 return arr.map((x,i)=>({title:String(x.title||`Lesson ${String(i+1).padStart(2,'0')}`).trim(),url:String(x.url||'').trim()}));
}
$('#addCourse').addEventListener('click',()=>{
 const name=$('#courseName').value.trim(), vids=parseCourseVideos($('#courseVideos').value);
 if(!name){$('#courseFeedback').textContent='請先輸入教材名稱。';return}
 if(vids.length<1||vids.length>500||vids.some(v=>!/^https:\/\/(www\.|m\.)?youtube\.com\/watch\?v=|^https:\/\/youtu\.be\//.test(v.url))){$('#courseFeedback').textContent='請輸入 1～500 個有效的 YouTube 影片網址，每行一部。';return}
 if(!confirm(`新增「${name}」共 ${vids.length} 部影片？`))return;
 const id=`course-${Date.now()}`, nextId=Math.max(0,...data.units.map(u=>u.id))+1;
 data.courses.push({id,title:name});
 data.units.push(...vids.map((v,i)=>({...v,id:nextId+i,courseId:id})));
 if(!data.units.some(u=>u.id===data.nextUnit))data.nextUnit=nextId;
 $('#courseName').value='';$('#courseVideos').value='';$('#courseFeedback').textContent=`已新增 ${name}（${vids.length} 部）。`;
 save();
});
// Preview dates are simulated with the SAME global per-day quota across all courses.
// Only study/new and review task slots count; an actual manual completion changes future estimates.
function forecastNewDates(){
 const out={},simRecords=structuredClone(data.records),simHistory=structuredClone(data.history);
 let next=data.nextUnit;const p=prefs(),futurePending=[...new Set(Object.keys(data.dailyNew).sort().flatMap(d=>newAssignments(d)))];
 const units=data.units;
 let day=today();
 for(let turn=0;turn<Math.max(365,units.length*8)&&Object.keys(out).length+Object.keys(simRecords).length<units.length;turn++,day=plusDays(day,1)){
  const finished=new Set(simHistory.filter(h=>h.date===day).map(h=>h.id));
  let slots=Math.max(0,p.dailyLimit-finished.size);
  const review=units.filter(u=>simRecords[u.id]?.due&&simRecords[u.id].due<=day&&!finished.has(u.id)).sort((x,y)=>simRecords[x.id].due.localeCompare(simRecords[y.id].due));
  let newQuota=Math.min(slots,Math.max(0,p.newLimit-simHistory.filter(h=>h.date===day&&h.type==='new').length));
  let takeReview=[];
  if(p.priority==='review'){takeReview=review.slice(0,slots);slots-=takeReview.length;newQuota=Math.min(slots,newQuota)}
  const newly=[];
  while(newly.length<newQuota){const pending=futurePending.find(id=>!simRecords[id]&&!newly.some(u=>u.id===id));let u=pending?units.find(x=>x.id===pending):null;
   if(!u)u=units.find(x=>x.id>=next&&!simRecords[x.id]&&!newly.some(v=>v.id===x.id));
   if(!u)u=units.find(x=>!simRecords[x.id]&&!newly.some(v=>v.id===x.id));
   if(!u)break;
   newly.push(u);next=Math.max(next,u.id+1);out[u.id]=day;
  }
  if(p.priority==='new')takeReview=review.slice(0,Math.max(0,slots-newly.length));
  takeReview.forEach(u=>{const r=simRecords[u.id];const n=nextDue(r.stage,day);simRecords[u.id]={...r,...n};simHistory.push({id:u.id,date:day,type:'review'})});
  newly.forEach(u=>{simRecords[u.id]={stage:0,firstDate:day,due:plusDays(day,1)};simHistory.push({id:u.id,date:day,type:'new'})});
 }
 return out;
}
$('#exportData').addEventListener('click',()=>{let blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});let a=document.createElement('a');let url=URL.createObjectURL(blob);a.href=url;a.download=`english-daily-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)});
$('#restoreBtn').addEventListener('click',()=>$('#restoreInput').click());$('#restoreInput').addEventListener('change',async ev=>{let file=ev.target.files?.[0];if(!file)return;try{let v=JSON.parse(await file.text());if(!Array.isArray(v.units)||!v.records||!v.dailyNew||!Array.isArray(v.history)||!Number.isInteger(v.nextUnit))throw Error('格式不正確');if(!confirm('要用備份取代現有資料嗎？'))return;data=v;normalizeUnitTitles(data);save();alert('備份已還原')}catch(e){alert('無法匯入備份：'+e.message)}ev.target.value=''});
$('#resetAll').addEventListener('click',()=>{if(confirm('確定清除全部學習紀錄？此操作無法復原（除非已有備份）。')){data=initial();save()}});
render();if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
