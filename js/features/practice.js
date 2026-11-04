import {state,activePlan,flattenDrills,blockMinutes,timeWindow,remember,save,uid,fitStationLanes} from "../core/store.js";
export {fitStationLanes};
export function ensureStationFits(plan=activePlan()){if(!plan)return;for(const block of plan.blocks||[])if(block.kind==="station"){const longest=Math.max(1,...(block.stations||[]).map(s=>(s.drills||[]).reduce((n,d)=>n+Math.max(1,Number(d.minutes)||1),0)));if(longest>block.minutes)fitStationLanes(block,longest);}}
export function fitPractice(plan=activePlan()){if(!plan||!plan.blocks.length)return {ok:false,reason:"empty"};const target=timeWindow(plan),blocks=plan.blocks,minimums=blocks.map(b=>b.kind==="station"?Math.max(1,...(b.stations||[]).map(s=>s.drills?.length||0)):1),minimumTotal=minimums.reduce((a,b)=>a+b,0);if(target<minimumTotal)return {ok:false,reason:"too-many-blocks"};const weights=blocks.map(b=>Math.max(1,blockMinutes(b))),sum=weights.reduce((a,b)=>a+b,0),raw=weights.map(w=>(target-minimumTotal)*w/sum),values=raw.map((v,i)=>minimums[i]+Math.floor(v));let rem=target-values.reduce((a,b)=>a+b,0);const order=raw.map((v,i)=>({i,f:v-Math.floor(v)})).sort((a,b)=>b.f-a.f);for(let i=0;rem>0;i++,rem--)values[order[i%order.length].i]++;remember();blocks.forEach((b,i)=>b.kind==="station"?fitStationLanes(b,values[i]):b.minutes=values[i]);save();return {ok:true,total:target,target};}
export function startLive(plan=activePlan()){const drills=flattenDrills(plan);if(!drills.length)return {ok:false,reason:"empty"};state.live={active:true,planId:plan.id,currentBlockId:drills[0].id};save();return {ok:true,index:0};}
export function liveIndex(plan=activePlan()){return plan?flattenDrills(plan).findIndex(d=>d.id===state.live.currentBlockId):-1;}
export function moveLive(dir,plan=activePlan()){if(!plan||!state.live.active)return false;const next=flattenDrills(plan)[liveIndex(plan)+dir];if(!next)return false;state.live.currentBlockId=next.id;save();return true;}
export function advanceLive(plan=activePlan()){if(!plan||!state.live.active)return {ok:false};const drills=flattenDrills(plan),i=liveIndex(plan);if(i<0)return {ok:false};const next=drills[i+1];if(next){state.live.currentBlockId=next.id;save();return {ok:true,finished:false,next};}stopLive();return {ok:true,finished:true};}
export function stopLive(){state.live={active:false,currentBlockId:null,planId:null};save();}
function rotationForStation(plan,id){return plan.blocks.find(b=>b.kind==="station"&&(b.stations||[]).some(s=>s.id===id));}
export function addScheduledDrill(drill,plan=activePlan(),stationId=null,beforeId=null){
 if(!drill||!plan)return false;const station=stationId?plan.blocks.filter(b=>b.kind==="station").flatMap(b=>b.stations||[]).find(s=>s.id===stationId):null;if(stationId&&!station)return false;
 remember();const list=station?station.drills:plan.blocks,index=beforeId?list.findIndex(item=>item.id===beforeId):-1;list.splice(index<0?list.length:index,0,drill);
 if(station){const rotation=rotationForStation(plan,stationId);fitStationLanes(rotation,rotation.minutes);}save();return true;
}
export function reorderScheduledBlock(id,beforeId=null,plan=activePlan()){if(!plan||id===beforeId)return false;const from=plan.blocks.findIndex(b=>b.id===id);if(from<0)return false;const to=beforeId?plan.blocks.findIndex(b=>b.id===beforeId):-1;if(to===from||to===from+1)return false;remember();const [block]=plan.blocks.splice(from,1),dest=beforeId?plan.blocks.findIndex(b=>b.id===beforeId):-1;plan.blocks.splice(dest<0?plan.blocks.length:dest,0,block);save();return true;}
export function moveStationToSchedule(rotationId,stationId,beforeBlockId=null,plan=activePlan()){
 const rotationIndex=plan?.blocks.findIndex(b=>b.id===rotationId&&b.kind==="station");if(rotationIndex===undefined||rotationIndex<0)return false;
 const rotation=plan.blocks[rotationIndex],stationIndex=rotation.stations.findIndex(s=>s.id===stationId);if(stationIndex<0)return false;
 const station=rotation.stations[stationIndex];if(!station.drills.length)return false;remember();const drills=station.drills.slice();rotation.stations.splice(stationIndex,1);
 let insertAt=beforeBlockId&&beforeBlockId!==rotationId?plan.blocks.findIndex(b=>b.id===beforeBlockId):-1;
 if(!rotation.stations.length){plan.blocks.splice(rotationIndex,1);if(insertAt<0)insertAt=rotationIndex;else if(insertAt>rotationIndex)insertAt--;}
 else if(insertAt<0)insertAt=rotationIndex+1;
 plan.blocks.splice(insertAt,0,...drills);save();return true;
}
export function reorderStation(rotationId,stationId,beforeId=null,plan=activePlan()){const rotation=plan?.blocks.find(b=>b.id===rotationId&&b.kind==="station");if(!rotation||stationId===beforeId)return false;const from=rotation.stations.findIndex(s=>s.id===stationId),to=beforeId?rotation.stations.findIndex(s=>s.id===beforeId):-1;if(from<0||to===from||to===from+1)return false;remember();const [station]=rotation.stations.splice(from,1),dest=beforeId?rotation.stations.findIndex(s=>s.id===beforeId):-1;rotation.stations.splice(dest<0?rotation.stations.length:dest,0,station);save();return true;}
export function createStation(name="Station rotation",minutes=15){return {kind:"station",id:uid("rotation"),name,minutes:Math.max(1,Math.round(Number(minutes)||15)),stations:[{id:uid("station"),name:"Station 1",drills:[]},{id:uid("station"),name:"Station 2",drills:[]}]};}
