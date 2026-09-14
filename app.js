const KEY="gambling-log-v3";
let entries=JSON.parse(localStorage.getItem(KEY)||"[]");
let viewDate=new Date();
let reportDate=new Date();
let editingId=null;
let selectedMachine="";

// 2026/09/11時点のP-WORLD機種情報をベースにした初期リスト。
// 既存データは機種名文字列のまま保持するため、過去データとの互換性があります。
const MACHINE_DATA={
  "パチスロ":[
    "スマスロ 快盗天使ツインエンジェル2","L魔法少女にあこがれて","L アカマター","スマスロ ゼーガペインETR","スマート沖スロ ハイハイシオサイRe","L転生王女と天才令嬢の魔法革命","スマスロ ラグナドール","Lパチスロ 彼女、お借りします","LBトリプルクラウンX-300","L聖闘士星矢 黄金十二宮","L ソードアート・オンライン オルタナティブ ガンゲイル・オンライン","スマスロ ストリートファイター6","Lパチスロ 喰霊-零-Re","L青春ブタ野郎はバニーガール先輩の夢を見ない","モグモグ風林火山 大海戦の巻","スマスロ 獣王","スマスロパリピ孔明","スロット ワールドダイスター","スマスロ とある魔術の禁書目録2","L ULTRAMAN 最終決戦","スマスロ タコスロ","ヤバチバ","スマスロ リコリス・リコイル","パチスロ見える子ちゃん","L邪神ちゃんドロップキック","Lすーぱぁびん娘","スマスロ とんでもスキルで異世界放浪メシ","ローティス","スマスロ やじきた道中記参る！","L南国育ち SPECIAL","Lパチスロ からくりサーカス2","スロット ソードアート・オンラインII","スマスロ ケロット5BT","LBスロットGALFY","L戦国乙女5 業火を穿つ宿焔の双刃","戦国コレクション6","Lパチスロ 機動戦士ガンダムユニコーン 覚醒DRIVE","スマート沖スロ ダークハイビ","Lタクトオーパス デスティニー","スマスロ BIRDIE WING -Golf Girls' Story-","LBトリプルクラウンセブン","スマスロスーパーリオエース2","真打 吉宗","スマスロ ビッグドリーム THE GOLDEN PUSHER","スマスロ バイオハザード RE:3","L虚構推理","スマスロヨルムンガンド","アニマルスロットドッチ","A-SLOT+ 異世界かるてっとBT","スマスロ ミリオンゴッド-神々の軌跡-","マイジャグラーV","ネオアイムジャグラーEX","L東京喰種","スマスロ 甲鉄城のカバネリ 海門決戦","ゴーゴージャグラー3","スマスロ 北斗の拳","スマスロ モンキーターンV","スマスロ ゴッドイーター リザレクション","Lパチスロ 炎炎ノ消防隊2","スマスロ モンスターハンターライズ","スマスロ 東京リベンジャーズ","スマスロ 攻殻機動隊","スマスロ バジリスク～甲賀忍法帖～絆2 天膳 BLACK EDITION","スマスロ 鬼武者3","スマスロ かぐや様は告らせたい","L ToLOVEるダークネス","スマスロ ゴールデンカムイ"
  ],
  "パチンコ":[
    "PA大海物語Withアグネス・ラム Premium Edition","PHはねもの ハネ釈迦","e アサルトリリィ","eタクトオーパス デスティニー","e 甲鉄城のカバネリ2 輪廻の果報119ver.","e魔女と野獣","eF炎炎ノ消防隊2 99ver.","e ソードアート・オンライン アリシゼーション 夜空","eF機動戦士ガンダムSEED クライマックス","PA愛の不時着 99スイート ver.","e 東京喰種","新世紀エヴァンゲリオン～未来への咆哮～","PA大海物語5 Withアグネス・ラム","P大海物語5","e 新世紀エヴァンゲリオン～はじまりの記憶～","e シン・ウルトラマン 79ver.","Pうしおととら～神のせSPEC～100ver.","e リコリス・リコイル","P Re:ゼロから始める異世界生活 鬼がかり2","e Re:ゼロから始める異世界生活 鬼がかり2","e ソードアート・オンライン","e 東京リベンジャーズ"
  ]
};

const MACHINE_DATA_KEY="gambling-machine-data-v3";
const MACHINE_CUSTOM_KEY="gambling-machine-custom-v1";
const MACHINE_UPDATED_KEY="gambling-machine-updated-at";
const MACHINE_VERSION_KEY="gambling-machine-data-version";
const MACHINE_REMOTE_URL="machine-data.json";
const MACHINE_UPDATE_SESSION_KEY="gambling-machine-update-session-v1";
const APP_VERSION="8.19";

function loadMachineData(){
  try{
    const cached=JSON.parse(localStorage.getItem(MACHINE_DATA_KEY)||"null");
    if(cached&&Array.isArray(cached.パチスロ)&&Array.isArray(cached.パチンコ)){
      MACHINE_DATA.パチスロ=cached.パチスロ;
      MACHINE_DATA.パチンコ=cached.パチンコ;
    }
  }catch(e){}
  mergeCustomMachines();
}
function getCustomMachines(){try{const x=JSON.parse(localStorage.getItem(MACHINE_CUSTOM_KEY)||"{}" );return {パチスロ:Array.isArray(x.パチスロ)?x.パチスロ:[],パチンコ:Array.isArray(x.パチンコ)?x.パチンコ:[]};}catch(e){return {パチスロ:[],パチンコ:[]}}}
function mergeCustomMachines(){const c=getCustomMachines();for(const g of ["パチスロ","パチンコ"]){const set=new Set(MACHINE_DATA[g]||[]);for(const m of c[g])if(m&&!set.has(m)){MACHINE_DATA[g].push(m);set.add(m)}}}
function rememberCustomMachine(genre,name){if(!["パチスロ","パチンコ"].includes(genre)||!name)return;const c=getCustomMachines();if(!c[genre].includes(name))c[genre].push(name);localStorage.setItem(MACHINE_CUSTOM_KEY,JSON.stringify(c));mergeCustomMachines();updateCustomMachineCount()}
function updateCustomMachineCount(){const el=$("#customMachineCount");if(!el)return;const c=getCustomMachines();el.textContent=`ユーザー追加：${c.パチスロ.length+c.パチンコ.length}機種`;}
function setMachineStatus(text,cls="neutral"){const el=$("#machineSyncStatus"); if(el){el.textContent=text;el.className="smallText "+cls}}
function machineUpdatedText(){const v=localStorage.getItem(MACHINE_UPDATED_KEY);return v?new Date(v).toLocaleString("ja-JP")+"（v"+(localStorage.getItem(MACHINE_VERSION_KEY)||"?")+"）":"未更新"}
function updateMachineUpdatedUI(){const el=$("#machineUpdatedAt");if(el)el.textContent=machineUpdatedText()}
function validMachineData(data){return data&&Array.isArray(data.パチスロ)&&Array.isArray(data.パチンコ)}
async function updateMachineData(silent=false){
  if(!navigator.onLine){if(!silent)setMachineStatus("オフライン：保存済みデータを使用","neutral");return false}
  if(!silent)setMachineStatus("最新の機種データを確認中…","syncing");
  try{
    const res=await fetch(MACHINE_REMOTE_URL+"?v="+Date.now(),{cache:"no-store",headers:{"Cache-Control":"no-cache"}});
    if(!res.ok)throw new Error("HTTP "+res.status);
    const data=await res.json();
    if(!validMachineData(data))throw new Error("機種データ形式が不正です");
    const version=String(data.version||data.updatedAt||new Date().toISOString());
    const oldVersion=localStorage.getItem(MACHINE_VERSION_KEY)||"";
    MACHINE_DATA.パチスロ=[...new Set(data.パチスロ.filter(Boolean))];
    MACHINE_DATA.パチンコ=[...new Set(data.パチンコ.filter(Boolean))];
    mergeCustomMachines();
    // 保存するのはリモートの純粋なマスター。ユーザー追加分は別キーで保持。
    localStorage.setItem(MACHINE_DATA_KEY,JSON.stringify({version,updatedAt:data.updatedAt||new Date().toISOString(),source:data.source||"remote",パチスロ:data.パチスロ,パチンコ:data.パチンコ}));
    localStorage.setItem(MACHINE_UPDATED_KEY,data.updatedAt||new Date().toISOString());
    localStorage.setItem(MACHINE_VERSION_KEY,version);
    updateMachineUpdatedUI();
    if(!silent){
      const changed=oldVersion!==version;
      setMachineStatus(changed?"機種データを更新しました":"最新データです","ok");
      populateMachines($("#machineSearch")?.value||"");
    }
    return true;
  }catch(e){
    console.warn("機種データ更新失敗",e);
    if(!silent)setMachineStatus("更新できません：保存済みデータを使用","error");
    return false
  }
}
function autoMachineUpdate(){
  updateMachineUpdatedUI();
  // 起動ごとに1回だけオンライン確認。Service Workerはmachine-data.jsonをネット優先にするため、
  // 24時間キャッシュで新台を取りこぼす問題を避けます。
  if(navigator.onLine&&!sessionStorage.getItem(MACHINE_UPDATE_SESSION_KEY)){
    sessionStorage.setItem(MACHINE_UPDATE_SESSION_KEY,"1");
    updateMachineData(true);
  }
}

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const THEME_KEY="gambling-theme-v1";
function applyTheme(theme){
  const light=theme==='light';
  document.body.classList.toggle('lightTheme',light);
  const meta=$('#themeColorMeta'); if(meta)meta.setAttribute('content',light?'#f4f6fb':'#0b1020');
  const label=$('#themeLabel'); if(label)label.textContent=light?'ライト':'ダーク';
  const dark=$('#themeDark'), lite=$('#themeLight');
  if(dark)dark.classList.toggle('active',!light);
  if(lite)lite.classList.toggle('active',light);
  localStorage.setItem(THEME_KEY,light?'light':'dark');
}
function loadTheme(){applyTheme(localStorage.getItem(THEME_KEY)==='light'?'light':'dark')}
const yen=n=>"¥"+Math.round(n||0).toLocaleString("ja-JP");
const RATE_OPTIONS={"パチスロ":[20,10,5],"パチンコ":[4,2,1,0.5]};
function unitFor(genre){return genre==='パチスロ'?'枚':genre==='パチンコ'?'玉':'円'}
function rateFor(e){return Number(e.rate)||((e.genre==='パチスロ')?20:(e.genre==='パチンコ'?4:1))}
function yenValue(type,amount,genre,rate){return type==='hold'?Number(amount||0)*Number(rate||1):Number(amount||0)}
// 現金入力は「千円単位」で簡略入力（1=1,000円 / 11.5=11,500円）。内部保存は従来どおり円。
function cashInputValue(yen){return Number(yen||0)/1000}
function inputValueToYen(type,value){return type==='cash'?Number(value||0)*1000:Number(value||0)}
function inputStep(type){return type==='cash'?'0.1':'1'}
function inputPlaceholder(type){return type==='cash'?'例：1 = 1,000円':'金額を入力'}
function invYen(e){return yenValue(e.investType||'cash',e.invest||0,e.genre,e.rate)}
function retYen(e){return yenValue(e.returnType||'cash',e.return||0,e.genre,e.rate)}
const net=e=>retYen(e)-invYen(e);
function displayMoneyOrUnit(type,amount,genre,rate){return type==='hold'?`${Number(amount||0).toLocaleString()}${unitFor(genre)}`:yen(Number(amount||0))}
function save(){localStorage.setItem(KEY,JSON.stringify(entries));renderAll()}
function newId(){return (typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function')?crypto.randomUUID():`e-${Date.now()}-${Math.random().toString(36).slice(2)}`} 
function dateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function parseDate(s){const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)}
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function formatDateJP(s){return s.replace(/-/g,"/")}
function renderAll(){renderCalendar();renderReport();renderStats()}
function renderCalendar(){
 const y=viewDate.getFullYear(),m=viewDate.getMonth(); $("#monthTitle").textContent=`${y}年${m+1}月`;
 const first=new Date(y,m,1).getDay(),last=new Date(y,m+1,0).getDate(),map={}; entries.forEach(e=>(map[e.date]??=[]).push(e));
 let html="";for(let i=0;i<first;i++)html+='<div class="empty"></div>';
 let total=0,inv=0,wins=0,loss=0;
 for(let d=1;d<=last;d++){
  let k=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`,arr=map[k]||[],n=arr.reduce((a,e)=>a+net(e),0);
  total+=n;inv+=arr.reduce((a,e)=>a+invYen(e),0);if(n>0)wins++;if(n<0)loss++;
  let cls=n>0?"win":n<0?"lose":"zero",today=k===dateKey(new Date())?" today":"";
  html+=`<button class="day ${cls}${today}" data-date="${k}"><span class="date">${d}</span><span class="daynet ${n>0?"pos":n<0?"neg":"neutral"}">${arr.length?yen(n):"—"}</span></button>`;
 }
 $("#calendar").innerHTML=html;$("#monthNet").textContent=yen(total);$("#monthNet").className=total>0?"pos":total<0?"neg":"neutral";$("#winDays").textContent=wins;$("#loseDays").textContent=loss;$("#monthInvest").textContent=yen(inv);
 $$("#calendar .day").forEach(b=>b.onclick=()=>{reportDate=parseDate(b.dataset.date);switchPage("report");renderReport()});
 drawChart($("#calendarChart"),dailySeries(y,m));
}
function dailySeries(y,m){let last=new Date(y,m+1,0).getDate(),map={};entries.forEach(e=>{if(e.date.startsWith(`${y}-${String(m+1).padStart(2,"0")}`))map[e.date]=(map[e.date]||0)+net(e)});let cum=0,a=[];for(let d=1;d<=last;d++){let k=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;cum+=map[k]||0;a.push({label:d,value:cum})}return a}
function renderReport(){
 const key=dateKey(reportDate),es=entries.filter(e=>e.date===key),n=es.reduce((a,e)=>a+net(e),0),inv=es.reduce((a,e)=>a+invYen(e),0),ret=es.reduce((a,e)=>a+retYen(e),0);
 $("#reportDate").textContent=formatDateJP(key);$("#reportNet").textContent=yen(n);$("#reportNet").className=n>0?"pos":n<0?"neg":"neutral";$("#reportInvest").textContent=yen(inv);$("#reportReturn").textContent=yen(ret);$("#reportWins").textContent=es.filter(e=>net(e)>0).length;$("#reportLosses").textContent=es.filter(e=>net(e)<0).length;$("#reportCount").textContent=es.length+"件";
 const groups={};es.forEach(e=>(groups[e.machine]??=[]).push(e));
 const machineArr=Object.entries(groups).sort((a,b)=>b[1].reduce((x,e)=>x+net(e),0)-a[1].reduce((x,e)=>x+net(e),0));
 $("#reportMachines").innerHTML=machineArr.length?machineArr.map(([machine,list])=>{let total=list.reduce((a,e)=>a+net(e),0);return `<button class="reportMachine" data-machine="${escapeHtml(machine)}"><div><b>${escapeHtml(machine)}</b><small>${escapeHtml(list[0].genre)} ・ ${list[0].rate?list[0].rate+"円":""} ・ ${list.length}件</small></div><strong class="${total>=0?"pos":"neg"}">${yen(total)}</strong></button>`}).join(""):"<div class='emptyState'>この日の記録はありません。<br>右上の「＋ 記録」から追加できます。</div>";
 $$(".reportMachine").forEach(b=>b.onclick=()=>{const m=b.dataset.machine;const first=es.find(e=>e.machine===m);if(first)openForm(key,first.id)});
 $("#reportEntries").innerHTML=es.length?es.map(e=>`<div class="entryCard"><div class="entryTop"><div><b>${escapeHtml(e.machine)}</b><small>${escapeHtml(e.genre)} ・ ${e.rate?e.rate+"円":""} / 投資 ${displayMoneyOrUnit(e.investType,e.invest,e.genre,e.rate)} / 回収 ${displayMoneyOrUnit(e.returnType,e.return,e.genre,e.rate)}</small></div><strong class="${net(e)>=0?"pos":"neg"}">${yen(net(e))}</strong></div>${e.memo?`<p class="memo">${escapeHtml(e.memo)}</p>`:""}<div class="entryActions"><button onclick="editEntry('${e.id}')">編集</button><button class="danger" onclick="deleteById('${e.id}')">削除</button></div></div>`).join(""):"<div class='emptyState'>記録なし</div>";
}
function periodRange(type){
 const now=new Date();
 if(type==="month"){
  const v=$("#periodMonth").value || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const [y,m]=v.split("-").map(Number);
  return [dateKey(new Date(y,m-1,1)),dateKey(new Date(y,m,0))];
 }
 if(type==="year"){
  const y=Number($("#periodYear").value)||now.getFullYear();
  return [dateKey(new Date(y,0,1)),dateKey(new Date(y,11,31))];
 }
 if(!entries.length)return ["9999-01-01","9999-01-01"];
  const dates=entries.map(e=>e.date).filter(Boolean).sort();
  return [dates[0],dates[dates.length-1]];
}
function setupPeriodSelectors(){
 const now=new Date(),month=$("#periodMonth"),year=$("#periodYear");
 if(month&&!month.value)month.value=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
 if(year){
  const years=new Set([now.getFullYear(),...entries.map(e=>Number(e.date.slice(0,4))).filter(Boolean)]);
  year.innerHTML=[...years].sort((a,b)=>b-a).map(y=>`<option value="${y}">${y}年</option>`).join("");
  year.value=String(now.getFullYear());
 }
 updatePeriodControls();
}
function updatePeriodControls(){
 const type=$("#period").value;
 $("#periodMonth").classList.toggle("hiddenField",type!=="month");
 $("#periodYear").classList.toggle("hiddenField",type!=="year");
}

function inPeriod(e,r){return e.date>=r[0]&&e.date<=r[1]}
function renderStats(){let r=periodRange($("#period").value),es=entries.filter(e=>inPeriod(e,r)),total=es.reduce((a,e)=>a+net(e),0),inv=es.reduce((a,e)=>a+invYen(e),0),ret=es.reduce((a,e)=>a+retYen(e),0),win=es.filter(e=>net(e)>0).length;$("#statNet").textContent=yen(total);$("#statNet").className=total>0?"pos":total<0?"neg":"neutral";$("#statInvest").textContent=yen(inv);$("#statReturn").textContent=yen(ret);$("#statWinRate").textContent=(es.length?(win/es.length*100):0).toFixed(1)+"%";
 const group=$("#group").value;
 updateAnalysisTargetOptions(es,group);
 const selectedTarget=$("#analysisTarget")?.value||"";
 let targetEntries=es;
 if(group==="machine"||group==="genre") targetEntries=selectedTarget?es.filter(e=>(group==="machine"?e.machine:e.genre)===selectedTarget):[];
 $("#detailStats").innerHTML=group==="machine"&&selectedTarget?machineCard(selectedTarget,targetEntries):group==="genre"&&selectedTarget?machineCard(selectedTarget,targetEntries):"";
 renderStatsList(targetEntries);
 drawChart($("#statsChart"),periodSeries(targetEntries,r,$("#period").value));
}
function renderStatsList(es){
 const sort=$("#detailSort")?.value||"dateDesc";
 const list=es.slice().sort((a,b)=>{
   if(sort==="dateAsc")return a.date.localeCompare(b.date);
   if(sort==="netDesc")return net(b)-net(a)||b.date.localeCompare(a.date);
   if(sort==="netAsc")return net(a)-net(b)||b.date.localeCompare(a.date);
   if(sort==="investDesc")return invYen(b)-invYen(a)||b.date.localeCompare(a.date);
   if(sort==="investAsc")return invYen(a)-invYen(b)||b.date.localeCompare(a.date);
   if(sort==="returnDesc")return retYen(b)-retYen(a)||b.date.localeCompare(a.date);
   if(sort==="returnAsc")return retYen(a)-retYen(b)||b.date.localeCompare(a.date);
   return b.date.localeCompare(a.date);
 });
 $("#statsList").innerHTML=list.length?list.map(e=>`<div class="entryCard"><div class="entryTop"><div><b>${escapeHtml(e.machine)}</b><small>${formatDateJP(e.date)} ・ ${escapeHtml(e.genre)} ・ ${e.rate?e.rate+"円":""}</small></div><strong class="${net(e)>=0?"pos":"neg"}">${yen(net(e))}</strong></div><div class="smallText">投資 ${displayMoneyOrUnit(e.investType,e.invest,e.genre,e.rate)} / 回収 ${displayMoneyOrUnit(e.returnType,e.return,e.genre,e.rate)}</div>${e.memo?`<p class="memo">${escapeHtml(e.memo)}</p>`:""}<div class="entryActions"><button onclick="editEntry('${e.id}')">編集</button><button class="danger" onclick="deleteById('${e.id}')">削除</button></div></div>`).join(""):"<p class='neutral'>データがありません</p>";
}
function updateAnalysisTargetOptions(es,group){const sel=$("#analysisTarget");if(!sel)return;const needs=group==="machine"||group==="genre";sel.classList.toggle("hiddenField",!needs);if(!needs){sel.innerHTML='<option value="">対象を選択</option>';return;}const key=group==="machine"?"machine":"genre";const vals=[...new Set(es.map(e=>e[key]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ja"));const prev=sel.value;sel.innerHTML='<option value="">対象を選択してください</option>'+vals.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");if(vals.includes(prev))sel.value=prev;else if(vals.length===1)sel.value=vals[0];}
function machineCard(key,es){let n=es.map(net),wins=n.filter(x=>x>0).length,invest=es.reduce((a,e)=>a+invYen(e),0),ret=es.reduce((a,e)=>a+retYen(e),0),sum=n.reduce((a,x)=>a+x,0);let avg=es.length?sum/es.length:0,max=Math.max(...n,0),min=Math.min(...n,0);return `<div class="machineCard"><h3>${escapeHtml(key)}</h3><div class="statsGrid"><div><span>最高勝ち額</span><b class="pos">${yen(max)}</b></div><div><span>総投資</span><b>${yen(invest)}</b></div><div><span>平均収支</span><b class="${avg>=0?"pos":"neg"}">${yen(avg)}</b></div><div><span>最高負け額</span><b class="neg">${yen(min)}</b></div><div><span>総回収</span><b>${yen(ret)}</b></div><div><span>勝率</span><b>${es.length?(wins/es.length*100).toFixed(1):0}%</b></div></div></div>`}
function periodSeries(es,r,type){
 // 表示単位（横軸ラベル）とデータ粒度を分離。すべての期間で収支データは日ごとに保持する。
 if(!r||!r[0]||!r[1]||!es.length)return [];
 const map={};es.forEach(e=>map[e.date]=(map[e.date]||0)+net(e));
 const start=parseDate(r[0]),end=parseDate(r[1]);
 let cum=0,a=[];
 for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1)){
   const k=dateKey(d);cum+=map[k]||0;
   let label=`${d.getDate()}日`;
   if(type==="year") label=d.getDate()===1?`${d.getMonth()+1}月`:"";
   if(type==="all") label=d.getDate()===1&&d.getMonth()===0?`${d.getFullYear()}年`:"";
   a.push({label,value:cum,date:k,tickUnit:type});
 }
 return a;
}
function chartScale(values){
 const maxValue=Math.max(0,...values),minValue=Math.min(0,...values);
 const rawRange=maxValue-minValue;
 const steps=[10000,20000,50000,100000,200000,500000,1000000];
 const step=steps.find(x=>rawRange<=x*8)||1000000;
 let min=Math.floor(minValue/step)*step,max=Math.ceil(maxValue/step)*step;
 if(min===max){min-=step;max+=step;}
 // 上端・下端の値がぴったり境界に来る場合は1段分余白を作り、線や文字が見切れないようにする。
 if(max===maxValue)max+=step;
 if(min===minValue)min-=step;
 return {min,max,step};
}
function drawChart(canvas,data){
 if(!canvas)return;
 const dpr=2,cssW=Math.max(canvas.clientWidth||600,280),h=250;
 canvas.width=cssW*dpr;canvas.height=h*dpr;
 const ctx=canvas.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cssW,h);
 if(!data.length){ctx.fillStyle="#8793aa";ctx.font="12px system-ui";ctx.fillText("データがありません",12,28);return;}
 const padL=66,padR=14,padT=16,padB=30,w=cssW;
 const vals=data.map(x=>x.value),scale=chartScale(vals),min=scale.min,max=scale.max,step=scale.step;
 const plotW=w-padL-padR,plotH=h-padT-padB;
 const x=i=>padL+plotW*(data.length===1?0.5:i/(data.length-1));
 const y=v=>padT+plotH*(max-v)/(max-min);
 // 1万円/2万円刻みの水平ライン
 ctx.font="10px system-ui";ctx.textAlign="right";
 for(let v=min;v<=max;v+=step){
   const yy=y(v);
   ctx.beginPath();ctx.moveTo(padL,yy);ctx.lineTo(w-padR,yy);
   if(v===0){
     ctx.setLineDash([]);ctx.strokeStyle="#66738c";ctx.lineWidth=1.4;
   }else{
     ctx.setLineDash([2,4]);ctx.strokeStyle="#445066";ctx.lineWidth=1;
   }
   ctx.stroke();
   ctx.fillStyle="#8793aa";ctx.fillText(yen(v),padL-7,yy+3);
 }
 // 推移線
 ctx.setLineDash([]);
 ctx.beginPath();data.forEach((p,i)=>i?ctx.lineTo(x(i),y(p.value)):ctx.moveTo(x(i),y(p.value)));
 ctx.strokeStyle="#8b7cf6";ctx.lineWidth=2;ctx.stroke();
 // データ点は常に日ごと。横軸ラベルだけ期間の指定単位に合わせる。
 ctx.textAlign="center";ctx.fillStyle="#8793aa";
 const labeled=data.map((p,i)=>({p,i})).filter(o=>o.p.label);
 if(labeled.length<=10){labeled.forEach(({p,i})=>ctx.fillText(p.label,x(i),h-8));}
 else{
  const every=Math.max(1,Math.ceil(labeled.length/8));
  const candidates=labeled.filter((o,j)=>j===0||j===labeled.length-1||j%every===0);
  const minLabelGap=Math.max(42,Math.min(70,plotW/7));
  const placed=[];
  candidates.forEach((o)=>{
    if(!placed.length || x(o.i)-x(placed[placed.length-1].i)>=minLabelGap) placed.push(o);
    else if(o===candidates[candidates.length-1]){
      placed.pop();
      if(!placed.length || x(o.i)-x(placed[placed.length-1].i)>=minLabelGap) placed.push(o);
    }
  });
  placed.forEach(({p,i})=>ctx.fillText(p.label,x(i),h-8));
}
}

function exportBackup(){
  const payload={version:1,exportedAt:new Date().toISOString(),entries,machineData:MACHINE_DATA};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`収支管理バックアップ_${dateKey(new Date())}.json`;a.click();URL.revokeObjectURL(a.href);
}
function importBackup(file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{try{const data=JSON.parse(reader.result);if(!Array.isArray(data.entries))throw new Error("収支データがありません");if(!confirm("現在の収支データをバックアップ内容で置き換えますか？"))return;entries=data.entries;localStorage.setItem(KEY,JSON.stringify(entries));if(data.machineData?.パチスロ&&data.machineData?.パチンコ){MACHINE_DATA.パチスロ=data.machineData.パチスロ;MACHINE_DATA.パチンコ=data.machineData.パチンコ;localStorage.setItem(MACHINE_DATA_KEY,JSON.stringify(MACHINE_DATA));}renderAll();alert("バックアップを復元しました");}catch(e){alert("バックアップの読み込みに失敗しました");}};reader.readAsText(file);
}

function recentMachines(){return [...new Set(entries.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(e=>e.machine).filter(Boolean))].slice(0,6)}
function machineOptions(genre,filter=""){const q=filter.trim().toLowerCase();return [...new Set((MACHINE_DATA[genre]||[]).filter(x=>x.toLowerCase().includes(q)))]}
function rowMachinePickerHtml(i){return `<div class="machinePicker"><div class="machineSearchRow"><input class="rowSearch" data-row="${i}" placeholder="機種名を検索…" autocomplete="off"><button type="button" class="clearRowSearch" data-row="${i}">×</button></div><select class="rowMachine" data-row="${i}"><option value="">機種を選択してください</option></select><div class="recentLabel">最近使った機種</div><div class="rowRecent recentMachines" data-row="${i}"></div><button type="button" class="ghost full customRowBtn" data-row="${i}">機種リストにない場合は手入力</button><input class="rowCustom hiddenField" data-row="${i}" placeholder="機種名を入力"></div>`}
function rateOptionsHtml(genre,current){const rates=RATE_OPTIONS[genre]||[];return rates.map(r=>`<option value="${r}" ${Number(current)===r?'selected':''}>${r}円</option>`).join('')}
function addEntryRow(data={}){
 const wrap=$("#entryRows"),i=Date.now()+Math.floor(Math.random()*1000);
 const div=document.createElement("div");div.className="entryRow card";div.dataset.row=i;
 const genre0=data.genre||'パチスロ', rate0=Number(data.rate)||RATE_OPTIONS[genre0]?.[0]||1;
 const investType0=data.investType||'cash', returnType0=data.returnType||'cash';
 const investInput0=investType0==='cash'?cashInputValue(data.invest):Number(data.invest||0), returnInput0=returnType0==='cash'?cashInputValue(data.return):Number(data.return||0);
 div.innerHTML=`<div class="rowHead"><h3>機種 ${wrap.children.length+1}</h3><button type="button" class="removeRow danger" data-row="${i}">削除</button></div><label>ジャンル<select class="rowGenre" data-row="${i}"><option>パチスロ</option><option>パチンコ</option><option>競馬</option><option>競艇</option><option>その他</option></select></label><label>レート<select class="rowRate" data-row="${i}">${rateOptionsHtml(genre0,rate0)}</select></label><label>機種・対象</label>${rowMachinePickerHtml(i)}<div class="two"><label>投資<select class="rowInvestType"><option value="cash">現金（千円）</option><option value="hold">持ち玉（${unitFor(genre0)}）</option></select><input class="rowInvest" data-row="${i}" type="number" min="0" step="${inputStep(investType0)}" placeholder="${inputPlaceholder(investType0)}" value="${investInput0}" required></label><label>回収<select class="rowReturnType"><option value="cash">現金（千円）</option><option value="hold">持ち玉（${unitFor(genre0)}）</option></select><input class="rowReturn" data-row="${i}" type="number" min="0" step="${inputStep(returnType0)}" placeholder="${inputPlaceholder(returnType0)}" value="${returnInput0}" required></label></div><button type="button" class="ghost full carryBtn">← 前の機種の持ち玉を引き継ぐ</button><label>メモ<textarea class="rowMemo" data-row="${i}" rows="2">${escapeHtml(data.memo||"")}</textarea><div class="netPreview">収支（円換算） <strong class="rowNet" data-row="${i}">¥0</strong><small class="rowUnitPreview"></small></div>`;
 wrap.appendChild(div);
 const genre=div.querySelector('.rowGenre'),rate=div.querySelector('.rowRate'),investType=div.querySelector('.rowInvestType'),returnType=div.querySelector('.rowReturnType');genre.value=genre0;investType.value=data.investType||'cash';returnType.value=data.returnType||'cash';
 const search=div.querySelector('.rowSearch'),select=div.querySelector('.rowMachine'),custom=div.querySelector('.rowCustom');
 function refreshRate(){const old=rate.value;rate.innerHTML=rateOptionsHtml(genre.value,old);if(!rate.value)rate.value=RATE_OPTIONS[genre.value]?.[0]||1;const u=unitFor(genre.value);div.querySelector('.rowInvestType option[value="cash"]').textContent='現金（千円）';div.querySelector('.rowReturnType option[value="cash"]').textContent='現金（千円）';div.querySelector('.rowInvestType option[value="hold"]').textContent=`持ち玉（${u}）`;div.querySelector('.rowReturnType option[value="hold"]').textContent=`持ち玉（${u}）`;const inv=div.querySelector('.rowInvest'),ret=div.querySelector('.rowReturn');inv.step=inputStep(investType.value);ret.step=inputStep(returnType.value);inv.placeholder=inputPlaceholder(investType.value);ret.placeholder=inputPlaceholder(returnType.value);}
 function populate(){const list=machineOptions(genre.value,search.value);const current=div.dataset.machine||data.machine||select.value;select.innerHTML='<option value="">機種を選択してください</option>'+list.map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join("");if(list.includes(current)){select.value=current;custom.classList.add('hiddenField');div.dataset.machine=current}else if(current){custom.classList.remove('hiddenField');custom.value=current;select.value='';div.dataset.machine=current}renderRowRecent(div);updateRowPreview(div)}
 genre.onchange=()=>{div.dataset.machine='';custom.value='';custom.classList.add('hiddenField');refreshRate();populate()};rate.onchange=()=>{updateRowPreview(div);updateBatchTotal()};search.oninput=populate;div.querySelector('.clearRowSearch').onclick=()=>{search.value='';populate()};select.onchange=()=>{div.dataset.machine=select.value;custom.value='';custom.classList.add('hiddenField');updateRowPreview(div)};
 div.querySelector('.customRowBtn').onclick=()=>{custom.classList.toggle('hiddenField');if(!custom.classList.contains('hiddenField')){select.value='';div.dataset.machine='';custom.focus()}else{custom.value='';updateRowPreview(div)}};custom.oninput=()=>{div.dataset.machine=custom.value.trim();updateRowPreview(div)};
 div.querySelector('.carryBtn').onclick=()=>{const prev=div.previousElementSibling;if(!prev)return alert('前の機種がありません');const pType=prev.querySelector('.rowReturnType').value,pVal=Number(prev.querySelector('.rowReturn').value||0),pGenre=prev.querySelector('.rowGenre').value,pRate=Number(prev.querySelector('.rowRate').value||1);if(pType!=='hold')return alert('前の機種の回収が持ち玉になっていません');if(pGenre!==genre.value){genre.value=pGenre;refreshRate();populate()}rate.value=pRate;investType.value='hold';const input=div.querySelector('.rowInvest');input.value=pVal;input.dataset.lastType='hold';input.step='1';updateRowPreview(div);updateBatchTotal()};
 div.querySelector('.removeRow').onclick=()=>{if(wrap.children.length<=1){alert('少なくとも1台は入力してください');return}div.remove();renumberRows();updateBatchTotal()};
 [investType,returnType].forEach(sel=>sel.oninput=sel.onchange=()=>{const input=sel===investType?div.querySelector('.rowInvest'):div.querySelector('.rowReturn');input.step=inputStep(sel.value);input.placeholder=inputPlaceholder(sel.value);const current=Number(input.value||0);if(sel.value==='cash' && input.dataset.lastType==='hold'){input.value=cashInputValue(current*Number(div.querySelector('.rowRate').value||1));}else if(sel.value==='hold' && input.dataset.lastType==='cash'){input.value=current*1000;}input.dataset.lastType=sel.value;updateRowPreview(div);updateBatchTotal()});
 div.querySelectorAll('.rowInvest,.rowReturn').forEach(x=>x.oninput=x.onchange=()=>{updateRowPreview(div);updateBatchTotal()});
 refreshRate();investType.querySelector('option[value="cash"]').textContent='現金（千円）';returnType.querySelector('option[value="cash"]').textContent='現金（千円）';div.querySelector('.rowInvest').dataset.lastType=investType.value;div.querySelector('.rowReturn').dataset.lastType=returnType.value;populate();
 if(data.machine){div.dataset.machine=data.machine;if(!machineOptions(genre.value).includes(data.machine)){custom.classList.remove('hiddenField');custom.value=data.machine;select.value=''}else{select.value=data.machine;custom.classList.add('hiddenField')}}
 updateRowPreview(div);updateBatchTotal();
}
function renderRowRecent(div){const wrap=div.querySelector('.rowRecent'),rs=recentMachines();wrap.innerHTML=rs.length?rs.map(x=>`<button type="button" class="recentMachine" data-machine="${escapeHtml(x)}">${escapeHtml(x)}</button>`).join(""):'<span class="neutral">まだありません</span>';wrap.querySelectorAll('.recentMachine').forEach(b=>b.onclick=()=>{div.dataset.machine=b.dataset.machine;const s=div.querySelector('.rowMachine'),c=div.querySelector('.rowCustom');s.value=b.dataset.machine;c.value='';c.classList.add('hiddenField');updateRowPreview(div)})}
function updateRowPreview(div){const genre=div.querySelector('.rowGenre').value,rate=Number(div.querySelector('.rowRate').value||1),it=div.querySelector('.rowInvestType').value,rt=div.querySelector('.rowReturnType').value,inv=inputValueToYen(it,div.querySelector('.rowInvest').value),ret=inputValueToYen(rt,div.querySelector('.rowReturn').value),n=ret-inv;const el=div.querySelector('.rowNet');el.textContent=yen(n);el.className='rowNet '+(n>0?'pos':n<0?'neg':'neutral');div.querySelector('.rowUnitPreview').textContent=`投資 ${displayMoneyOrUnit(it,inv,genre,rate)} ／ 回収 ${displayMoneyOrUnit(rt,ret,genre,rate)}`}
function updateBatchTotal(){let inv=0,ret=0;$$('#entryRows .entryRow').forEach(d=>{const it=d.querySelector('.rowInvestType').value,rt=d.querySelector('.rowReturnType').value;inv+=inputValueToYen(it,d.querySelector('.rowInvest').value);ret+=inputValueToYen(rt,d.querySelector('.rowReturn').value)});const n=ret-inv;$("#batchInvest").textContent=yen(inv);$("#batchReturn").textContent=yen(ret);$("#batchNet").textContent=yen(n);$("#batchNet").className=n>0?'pos':n<0?'neg':'neutral'}
function renumberRows(){$$('#entryRows .entryRow').forEach((d,i)=>d.querySelector('.rowHead h3').textContent=`機種 ${i+1}`)}
function collectRow(div){const custom=div.querySelector('.rowCustom'),select=div.querySelector('.rowMachine');const machine=custom.classList.contains('hiddenField')?select.value:custom.value.trim();const it=div.querySelector('.rowInvestType').value,rt=div.querySelector('.rowReturnType').value;return {date:$("#entryDate").value,genre:div.querySelector('.rowGenre').value,rate:Number(div.querySelector('.rowRate').value||1),machine,investType:it,returnType:rt,invest:inputValueToYen(it,div.querySelector('.rowInvest').value),return:inputValueToYen(rt,div.querySelector('.rowReturn').value),memo:div.querySelector('.rowMemo').value.trim()}}
function openForm(date=dateKey(new Date()),id=null){
 const dialog=$("#entryDialog");
 if(!dialog){alert("入力画面の読み込みに失敗しました。ページを再読み込みしてください。");return;}
 editingId=id;
 const form=$("#entryForm");
 if(form)form.reset();
 $("#entryId").value=id||'';
 $("#entryDate").value=date||dateKey(new Date());
 $("#dialogTitle").textContent=id?'収支を編集':'収支をまとめて入力';
 $("#deleteEntry").style.display=id?'block':'none';
 $("#entryRows").innerHTML='';
 if(id){const e=entries.find(x=>x.id===id);if(e){$("#entryDate").value=e.date;addEntryRow(e)}}else addEntryRow({date:$("#entryDate").value});
 $("#addEntryRow").style.display=id?'none':'block';
 updateBatchTotal();
 try{ if(typeof dialog.showModal==='function') dialog.showModal(); else dialog.setAttribute('open',''); }catch(err){ dialog.setAttribute('open',''); }
}
function editEntry(id){openForm('',id)}
function deleteById(id){if(confirm('この記録を削除しますか？')){entries=entries.filter(e=>e.id!==id);save();renderReport()}}
function switchPage(name){$$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.page===name));$$('.page').forEach(x=>x.classList.toggle('active',x.id===name+'Page'));window.scrollTo({top:0,behavior:'smooth'})}

$("#entryForm").onsubmit=e=>{
 e.preventDefault();
 const rows=$$('#entryRows .entryRow');
 if(!rows.length){alert('記録する機種がありません');return}
 const objs=rows.map(collectRow);
 if(objs.some(x=>!x.date)){alert('日付を入力してください');return}
 if(objs.some(x=>!x.machine)){alert('機種・対象を選択または入力してください');return}
 if(objs.some(x=>!Number.isFinite(x.invest)||!Number.isFinite(x.return)||x.invest<0||x.return<0)){alert('投資・回収は0以上の数値を入力してください');return}
 if(editingId){
   const obj={...objs[0],id:editingId};
   entries=entries.map(x=>x.id===editingId?obj:x);
   rememberCustomMachine(obj.genre,obj.machine);
 }else{
   objs.forEach(x=>{entries.push({...x,id:newId()}); rememberCustomMachine(x.genre,x.machine)});
 }
 localStorage.setItem(KEY,JSON.stringify(entries));
 const d=objs[0].date;
 $("#entryDialog").close();
 reportDate=parseDate(d);viewDate=parseDate(d);
 renderAll();switchPage('report');
};
$("#deleteEntry").onclick=()=>{if(editingId&&confirm('この記録を削除しますか？')){entries=entries.filter(e=>e.id!==editingId);$("#entryDialog").close();save()}};
$("#cancelDialog").onclick=$("#closeDialog").onclick=()=>$("#entryDialog").close();
$("#prevMonth").onclick=()=>{viewDate.setMonth(viewDate.getMonth()-1);renderCalendar()};$("#nextMonth").onclick=()=>{viewDate.setMonth(viewDate.getMonth()+1);renderCalendar()};$("#todayBtn").onclick=()=>{viewDate=new Date();renderCalendar()};
$("#reportPrev").onclick=()=>{reportDate.setDate(reportDate.getDate()-1);renderReport()};$("#reportNext").onclick=()=>{reportDate.setDate(reportDate.getDate()+1);renderReport()};
$("#period").onchange=()=>{updatePeriodControls();renderStats()};$("#periodMonth").onchange=renderStats;$("#periodYear").onchange=renderStats;$("#group").onchange=()=>{renderStats();};$("#analysisTarget").onchange=renderStats;$("#detailSort").onchange=renderStats;
$$('.tab').forEach(b=>b.onclick=()=>{switchPage(b.dataset.page);renderAll();if(b.dataset.page==='settings')updateMachineUpdatedUI()});
$("#updateMachines").onclick=()=>updateMachineData(false);$("#exportData").onclick=exportBackup;$("#importData").onchange=e=>importBackup(e.target.files[0]);
$("#themeDark").onclick=()=>applyTheme('dark');$("#themeLight").onclick=()=>applyTheme('light');
window.addEventListener('online',()=>setMachineStatus('オンライン','ok'));window.addEventListener('offline',()=>setMachineStatus('オフライン：保存済みデータを使用','neutral'));
// 8.2: 初期描画より先にイベントを登録。初期描画中に別処理が失敗しても「＋ 記録」が無反応にならないようにします。
loadTheme();
loadMachineData();
updateCustomMachineCount();
setupPeriodSelectors();
$("#reportAdd").onclick=()=>openForm(dateKey(reportDate));
$("#reportAdd2").onclick=()=>openForm(dateKey(reportDate));
$("#addFromStats").onclick=()=>openForm();
$("#addEntryRow").onclick=()=>addEntryRow();
updateMachineUpdatedUI();
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js");
try{renderAll();}catch(err){console.error("初期描画エラー:",err);}
autoMachineUpdate();
