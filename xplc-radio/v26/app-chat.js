/* v26 lightweight listener room — isolated from audio playback */
const CHAT_API='https://aunqmysckjuucmvzqxjp.supabase.co/functions/v1/explic-radio-chat';
const CHAT_NICK='xplc_radio_chat_nickname_v1';
const CHAT_EMOJI=['😂','❤️','🔥','🤣','😭','🫡','👀','💀','🤯','🙌','🥶','😎','🖤','🎶','🍻','👏','🤌','😈','🫶'];
let chatOpen=false,chatBusy=false,chatMessages=[],chatUnread=0,chatChannel=null,chatPoll=null,chatNickname=localStorage.getItem(CHAT_NICK)||'';
const chatCopy=()=>prefs.ui==='si'?{button:'CHAT',room:'XPLC කාමරය',around:'දෙනෙක් මෙතන',empty:'තාම කවුරුත් කතා කරලා නැහැ. පළවෙනියා වෙන්න.',placeholder:'පණිවිඩයක්…',send:'යවන්න',join:'කාමරයට එන්න',name:'ඔබට කියන්න ඕන නම?',nameHint:'නමක් දාන්න',enter:'ඇතුල් වෙන්න',change:'නම වෙනස් කරන්න',now:'දැන් වාදනය වෙන්නේ',loading:'පණිවිඩ ගන්නවා…',failed:'Chat එක connect වුණේ නැහැ. නැවත උත්සාහ කරන්න.'}:{button:'CHAT',room:'XPLC ROOM',around:'people around',empty:'Quiet in here. Say the first thing.',placeholder:'Message the room…',send:'SEND',join:'ENTER THE ROOM',name:'What should we call you?',nameHint:'Your nickname',enter:'ENTER',change:'Change nickname',now:'NOW PLAYING',loading:'Loading the room…',failed:'Chat could not connect. Try again.'};

function chatTime(value){const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
function chatNormalize(row){return{id:String(row?.id||''),listenerKey:String(row?.listenerKey||row?.listener_key||''),nickname:String(row?.nickname||'Listener'),message:String(row?.message||''),createdAt:String(row?.createdAt||row?.created_at||new Date().toISOString())}}
function chatToast(message){if(typeof toast==='function')toast(message)}
async function chatApi(action,payload={}){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);try{const r=await fetch(CHAT_API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,listenerKey,...payload}),signal:controller.signal});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'Chat unavailable');return j}finally{clearTimeout(timer)}}

function mountChatSurface(){
  if($('#chatPanel'))return;
  document.body.insertAdjacentHTML('beforeend',`<div class="chatShade" id="chatShade" aria-hidden="true"></div><aside class="chatPanel" id="chatPanel" aria-hidden="true" aria-label="XPLC listener chat"><header class="chatHead"><div><small>LIVE · <span id="chatAround">—</span></small><h2 id="chatRoomTitle">XPLC ROOM</h2></div><div class="chatHeadActions"><button id="chatNameBtn" class="chatNameBtn" type="button"></button><button id="chatClose" class="chatClose" type="button" aria-label="Close chat">×</button></div></header><div class="chatNow" id="chatNow"></div><div class="chatMessages" id="chatMessages" role="log" aria-live="polite" aria-relevant="additions"><div class="chatState" id="chatState"></div></div><form class="chatComposer" id="chatComposer"><div class="chatEmojiTray" id="chatEmojiTray" hidden>${CHAT_EMOJI.map(x=>`<button type="button" data-chat-emoji="${x}">${x}</button>`).join('')}</div><button class="chatEmojiBtn" id="chatEmojiBtn" type="button" aria-label="Emoji">☺</button><input id="chatInput" maxlength="200" autocomplete="off" enterkeyhint="send"><button class="chatSend" id="chatSend" type="submit">SEND</button></form><div class="chatNameGate" id="chatNameGate" hidden><form id="chatNameForm"><small id="chatJoinEy">ENTER THE ROOM</small><h3 id="chatNameTitle">What should we call you?</h3><input id="chatNameInput" maxlength="24" autocomplete="nickname" placeholder="Your nickname"><button id="chatNameSave" type="submit">ENTER →</button></form></div></aside>`);
  $('#chatClose').onclick=closeChat;
  $('#chatShade').onclick=closeChat;
  $('#chatNameBtn').onclick=()=>showChatName(true);
  $('#chatEmojiBtn').onclick=()=>{const tray=$('#chatEmojiTray');tray.hidden=!tray.hidden;if(!tray.hidden)$('#chatInput').focus()};
  $$('[data-chat-emoji]').forEach(b=>b.onclick=()=>{const input=$('#chatInput');input.value=(input.value+b.dataset.chatEmoji).slice(0,200);input.focus()});
  $('#chatComposer').onsubmit=sendChat;
  $('#chatNameForm').onsubmit=saveChatName;
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&chatOpen)closeChat()});
  paintChatCopy();
}

function mountChatTrigger(){
  mountChatSurface();
  const line=$('.liveLine');
  if(line&&!$('#chatBtn'))line.insertAdjacentHTML('beforeend',`<button id="chatBtn" class="chatTrigger" type="button" aria-label="Open listener chat" aria-controls="chatPanel" aria-expanded="false">💬<span>${chatCopy().button}</span><em id="chatUnread" hidden></em></button>`);
  if($('#chatBtn'))$('#chatBtn').onclick=openChat;
  paintChatBadge();paintChatCopy();paintChatNow();
}

function paintChatCopy(){
  const c=chatCopy();
  if($('#chatRoomTitle'))$('#chatRoomTitle').textContent=c.room;
  if($('#chatInput'))$('#chatInput').placeholder=c.placeholder;
  if($('#chatSend'))$('#chatSend').textContent=c.send;
  if($('#chatJoinEy'))$('#chatJoinEy').textContent=c.join;
  if($('#chatNameTitle'))$('#chatNameTitle').textContent=c.name;
  if($('#chatNameInput'))$('#chatNameInput').placeholder=c.nameHint;
  if($('#chatNameSave'))$('#chatNameSave').textContent=c.enter+' →';
  if($('#chatNameBtn')){$('#chatNameBtn').textContent=chatNickname||c.change;$('#chatNameBtn').title=c.change}
  if($('#chatBtn')){$('#chatBtn span').textContent=c.button;$('#chatBtn').setAttribute('aria-label',c.room)}
  paintChatAround();
}
function paintChatAround(){if($('#chatAround'))$('#chatAround').textContent=`${Math.max(0,Number(listenerCount)||0)} ${chatCopy().around}`}
function paintChatBadge(){const badge=$('#chatUnread');if(!badge)return;badge.hidden=!chatUnread;badge.textContent=chatUnread>9?'9+':String(chatUnread)}
function paintChatNow(){const box=$('#chatNow'),info=typeof scheduleInfo==='function'?scheduleInfo():lastInfo;if(!box)return;const title=info?.track?.title||'';box.innerHTML=title?`<small>${esc(chatCopy().now)}</small><b class="${/[\u0D80-\u0DFF]/.test(title)?'siTitle':''}">${esc(title)}</b>`:''}

function renderChatMessages(stick=true){
  const box=$('#chatMessages');if(!box)return;
  if(!chatMessages.length){box.innerHTML=`<div class="chatState">${esc(chatCopy().empty)}</div>`;return}
  box.innerHTML=chatMessages.map(m=>`<article class="chatMessage ${m.listenerKey===listenerKey?'mine':''}" data-chat-id="${esc(m.id)}"><div><b>${esc(m.nickname)}</b><time>${esc(chatTime(m.createdAt))}</time></div><p>${esc(m.message)}</p></article>`).join('');
  if(stick)requestAnimationFrame(()=>{box.scrollTop=box.scrollHeight});
}
function mergeChat(rows,notify=false){
  const known=new Set(chatMessages.map(x=>x.id)),fresh=[];
  for(const raw of rows||[]){const m=chatNormalize(raw);if(m.id&&!known.has(m.id)){known.add(m.id);fresh.push(m)}}
  if(!fresh.length)return;
  chatMessages=[...chatMessages,...fresh].sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)).slice(-40);
  if(notify&&!chatOpen){chatUnread=Math.min(99,chatUnread+fresh.filter(x=>x.listenerKey!==listenerKey).length);paintChatBadge()}
  renderChatMessages(chatOpen);
}
async function refreshChat(silent=false){
  if(!silent&&$('#chatMessages'))$('#chatMessages').innerHTML=`<div class="chatState">${esc(chatCopy().loading)}</div>`;
  try{const j=await chatApi('load');chatMessages=(j.messages||[]).map(chatNormalize).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)).slice(-40);renderChatMessages(true)}catch(e){if(!silent&&$('#chatMessages'))$('#chatMessages').innerHTML=`<button class="chatRetry" id="chatRetry">${esc(chatCopy().failed)}</button>`;if($('#chatRetry'))$('#chatRetry').onclick=()=>refreshChat(false)}
}
function startChatLive(){
  if(!chatChannel){chatChannel=db.channel('xplc-radio-room-v1').on('postgres_changes',{event:'INSERT',schema:'public',table:'explic_radio_chat_messages'},p=>mergeChat([p.new],true)).subscribe()}
  if(!chatPoll)chatPoll=setInterval(()=>{if(chatOpen)refreshChat(true)},15000);
}
function showChatName(change=false){const gate=$('#chatNameGate');if(!gate)return;gate.hidden=false;$('#chatNameInput').value=change?chatNickname:'';setTimeout(()=>$('#chatNameInput').focus(),60)}
function hideChatName(){if($('#chatNameGate'))$('#chatNameGate').hidden=true}
function saveChatName(e){e.preventDefault();const value=$('#chatNameInput').value.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g,'').trim().replace(/\s+/g,' ').slice(0,24);if(!value){$('#chatNameInput').focus();return}chatNickname=value;localStorage.setItem(CHAT_NICK,value);paintChatCopy();hideChatName();$('#chatInput').focus()}
async function sendChat(e){
  e.preventDefault();if(chatBusy)return;if(!chatNickname){showChatName(false);return}
  const input=$('#chatInput'),message=input.value.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g,' ').trim().replace(/\s+/g,' ').slice(0,200);if(!message)return;
  chatBusy=true;$('#chatSend').disabled=true;
  try{const j=await chatApi('send',{nickname:chatNickname,message});input.value='';mergeChat([j.message],false);$('#chatEmojiTray').hidden=true}catch(err){chatToast(err instanceof Error?err.message:chatCopy().failed)}finally{chatBusy=false;$('#chatSend').disabled=false;input.focus()}
}
function openChat(){
  mountChatSurface();chatOpen=true;chatUnread=0;paintChatBadge();paintChatCopy();paintChatNow();paintChatAround();
  $('#chatPanel').classList.add('open');$('#chatPanel').setAttribute('aria-hidden','false');$('#chatShade').classList.add('open');$('#chatShade').setAttribute('aria-hidden','false');if($('#chatBtn'))$('#chatBtn').setAttribute('aria-expanded','true');
  refreshChat(false);startChatLive();
  if(!chatNickname)showChatName(false);else setTimeout(()=>$('#chatInput').focus(),80);
}
function closeChat(){chatOpen=false;hideChatName();$('#chatEmojiTray')&&($('#chatEmojiTray').hidden=true);$('#chatPanel')?.classList.remove('open');$('#chatPanel')?.setAttribute('aria-hidden','true');$('#chatShade')?.classList.remove('open');$('#chatShade')?.setAttribute('aria-hidden','true');$('#chatBtn')?.setAttribute('aria-expanded','false')}

const chatRenderShellBase=renderShell,chatRenderTrackBase=renderTrack;
renderShell=function(){chatRenderShellBase();mountChatTrigger()};
renderTrack=function(info){chatRenderTrackBase(info);if(chatOpen)paintChatNow()};
setInterval(()=>{if(chatOpen)paintChatAround()},5000);
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js?v=27').catch(()=>{});
