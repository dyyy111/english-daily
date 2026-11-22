'use strict';
/* Supabase sync: local-first, versioned server snapshots, never silent overwrite. */
(()=>{
const cfgKey='englishDailySupabaseConfigV1';
const pendingKey='englishDailyCloudPendingV1';
const baseKey='englishDailyCloudBaseV1';
const get=id=>document.getElementById(id);
let client=null,user=null,version=null,ready=false,busy=false,queued=false,connecting=false;
let config={};try{config=JSON.parse(localStorage.getItem(cfgKey)||'{}')}catch{}
const fromFile=window.ENGLISH_DAILY_SUPABASE||{};
config.url=config.url||fromFile.url||'';
config.key=config.key||fromFile.publishableKey||'';
get('sbUrl').value=config.url;get('sbKey').value=config.key;
function status(msg,problem=false){const el=get('cloudStatus');el.textContent=msg;el.style.background=problem?'#fff0e7':'#eef6ff';el.style.color=problem?'#9d471c':'#28588c'}
function view(){get('cloudAuth').classList.toggle('hide',!client||!!user);get('cloudSigned').classList.toggle('hide',!user);get('cloudEmail').textContent=user?.email||''}
function pending(v){localStorage.setItem(pendingKey,v?'1':'0')}
function isPending(){return localStorage.getItem(pendingKey)==='1'}
function baseline(){try{return JSON.parse(localStorage.getItem(baseKey)||'null')}catch{return null}}
function putBase(v){localStorage.setItem(baseKey,JSON.stringify(v))}
const same=(a,b)=>{try{return window.englishDailyComparable(a)===window.englishDailyComparable(b)}catch(e){return false}};
async function loadSdk(){if(window.supabase?.createClient)return;await new Promise((resolve,reject)=>{let s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';s.onload=resolve;s.onerror=()=>reject(Error('無法載入 Supabase SDK，請確認網路連線'));document.head.appendChild(s)});if(!window.supabase?.createClient)throw Error('Supabase SDK 未載入')}
async function readCloud(){const {data,error}=await client.from('learning_state').select('state,version').eq('user_id',user.id).maybeSingle();if(error)throw error;return data}
async function writeCloud(payload,expected){const {data,error}=await client.rpc('save_learning_state',{p_state:payload,p_expected_version:expected});if(error)throw error;return data}
function setReady(remoteVersion){version=remoteVersion;ready=true;putBase({userId:user.id,version});pending(false);status(`已連線 · ${user.email} · 雲端版本 ${version} · 自動同步啟用`)}
async function resolveInitial(){if(!user)return;ready=false;status('正在確認雲端資料…');const remote=await readCloud();const local=window.englishDailyExport();const prev=baseline();
 if(!remote){status('雲端目前沒有資料，準備儲存本機紀錄…');version=0;ready=true;pending(true);await flush();return}
 const localNeedsUpload=isPending()&&prev?.userId===user.id;
 if(localNeedsUpload && prev.version===remote.version){version=remote.version;ready=true;await flush();return}
 if(localNeedsUpload && prev.version!==remote.version){status('兩台裝置的紀錄有衝突：請在下方選擇「下載雲端紀錄」或「上傳本機紀錄」。',true);return}
 if(same(remote.state,local)){setReady(remote.version);return}
 // Intentionally leave app unsynced until user explicitly chooses; initial import must not overwrite.
 version=remote.version;ready=false;
 status('雲端和本機紀錄不同。先匯出備份，再選「下載雲端紀錄」或「上傳本機紀錄」；目前暫停自動同步。',true);
}
async function flush(){if(!user||!ready||!isPending()||busy)return;busy=true;
 try{while(isPending()&&user&&ready){const before=JSON.stringify(window.englishDailyExport());const result=await writeCloud(JSON.parse(before),version);
  if(!result?.ok){ready=false;status('雲端版本衝突：請先備份，然後手動選擇保留哪一份。自動同步已暫停。',true);break}
  version=result.version;putBase({userId:user.id,version});
  if(before===JSON.stringify(window.englishDailyExport()))pending(false);
  else pending(true);
  status(`已同步至雲端 · ${new Date().toLocaleTimeString('zh-TW')} · 版本 ${version}`);
 }}catch(e){status('尚未成功同步（本機資料保留）：'+e.message,true)}finally{busy=false}}
let syncTimer=null;
function schedule(){if(syncTimer)clearTimeout(syncTimer);syncTimer=setTimeout(()=>{syncTimer=null;flush()},650)}
window.addEventListener('english-daily-changed',()=>{pending(true);if(user&&ready){status('本機已儲存 · 正在同步…');schedule()}else if(user)status('本機已儲存；首次同步尚待選擇或網路恢復。',true)});
window.addEventListener('online',()=>{if(user){if(ready)flush();else resolveInitial().catch(e=>status(e.message,true))}});
window.addEventListener('focus',()=>{if(user&&ready&&!isPending())checkRemote().catch(()=>{})});
async function checkRemote(){if(busy||!user||!ready)return;const remote=await readCloud();if(remote&&remote.version!==version){ready=false;status('偵測到另一裝置的新紀錄。請選擇下載雲端或上傳本機紀錄。',true)}}
async function connect(){if(connecting)return;connecting=true;ready=false;user=null;view();try{
 const u=get('sbUrl').value.trim().replace(/\/+$/,'');const k=get('sbKey').value.trim();if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(u)||!k.startsWith('sb_publishable_'))throw Error('請填入正確的 Project URL 與 sb_publishable_ 開頭的 Publishable key');
 config={url:u,key:k};localStorage.setItem(cfgKey,JSON.stringify(config));status('正在連線到 Supabase…');await loadSdk();
 client=window.supabase.createClient(u,k,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 client.auth.onAuthStateChange((event,session)=>{const old=user?.id;user=session?.user||null;view();if(!user){ready=false;status('已連線 Supabase，請註冊或登入。')}else if(old!==user.id||!ready){setTimeout(()=>resolveInitial().catch(e=>status('無法讀取雲端：'+e.message,true)),0)}});
 const {data,error}=await client.auth.getSession();if(error)throw error;user=data.session?.user||null;view();if(user)await resolveInitial();else status('連線成功，請登入或註冊。');
 }catch(e){status('連線設定失敗：'+e.message,true)}finally{connecting=false}}
get('cloudConnect').onclick=connect;
async function auth(which){try{if(!client)throw Error('請先完成連線設定');let email=get('sbEmail').value.trim();let password=get('sbPassword').value;if(!email||password.length<6)throw Error('請輸入 Email 及至少 6 字元密碼');status('正在處理登入…');let response=which==='signup'?await client.auth.signUp({email,password}):await client.auth.signInWithPassword({email,password});if(response.error)throw response.error;if(which==='signup'&&!response.data.session)status('註冊成功，請到信箱開啟驗證信後再登入。');else status('登入成功，準備確認雲端紀錄…');get('sbPassword').value=''}catch(e){status('登入／註冊失敗：'+e.message,true)}}
get('cloudLogin').onclick=()=>auth('login');get('cloudSignup').onclick=()=>auth('signup');
get('cloudLogout').onclick=async()=>{try{if(!client)return;await client.auth.signOut();user=null;ready=false;view();status('已登出；本機紀錄仍保留。')}catch(e){status(e.message,true)}};
get('cloudPull').onclick=async()=>{if(!user)return;try{const remote=await readCloud();if(!remote){status('雲端尚無紀錄，請選「上傳本機紀錄」。',true);return}if(!confirm('下載雲端紀錄將覆蓋本機目前的學習紀錄。請先在「備份、還原」匯出 JSON；確定繼續？'))return;window.englishDailyReplace(remote.state);setReady(remote.version)}catch(e){status('下載失敗：'+e.message,true)}};
get('cloudPush').onclick=async()=>{if(!user)return;if(!confirm('上傳本機紀錄將覆蓋雲端的學習紀錄。建議先匯出本機 JSON 備份，並確認其他裝置沒有未上傳的修改。要繼續嗎？'))return;try{
 const remote=await readCloud();const expected=remote?.version||0;const snapshot=window.englishDailyExport();const result=await writeCloud(snapshot,expected);if(!result?.ok){status('上傳時雲端被其他裝置更新；請再確認後重試。',true);return}setReady(result.version)
 }catch(e){status('上傳失敗（本機保留）：'+e.message,true)}};
if(config.url&&config.key)connect();else status('尚未設定 Supabase；目前只儲存在本機。');
})();
