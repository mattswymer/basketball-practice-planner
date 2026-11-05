import {state,activePlan,blockMinutes,timeWindow,remember,save,uid,fitStationLanes,stationRounds} from "../core/store.js";
export {fitStationLanes};
export function ensureStationFits(plan=activePlan()){
 if(plan)refreshLive(plan,false);
}
export function fitPractice(plan=activePlan()){
 if(!plan||!plan.blocks.length)return {ok:false,reason:"empty"};
 const target=timeWindow(plan),blocks=plan.blocks;
 if(target<=0)return {ok:false,reason:"invalid-window"};
 const minimums=blocks.map(block=>block.kind==="station"?Math.max(1,block.stations?.length||0):1),minimumTotal=minimums.reduce((a,b)=>a+b,0);
 if(target<minimumTotal)return {ok:false,reason:"too-many-blocks"};
 const weights=blocks.map(b=>Math.max(1,blockMinutes(b))),sum=weights.reduce((a,b)=>a+b,0),raw=weights.map(w=>(target-minimumTotal)*w/sum),values=raw.map((v,i)=>minimums[i]+Math.floor(v));
 let rem=target-values.reduce((a,b)=>a+b,0);const order=raw.map((v,i)=>({i,f:v-Math.floor(v)})).sort((a,b)=>b.f-a.f);for(let i=0;rem>0;i++,rem--)values[order[i%order.length].i]++;
 remember();blocks.forEach((b,i)=>b.kind==="station"?fitStationLanes(b,values[i]):b.minutes=values[i]);refreshLive(plan,false);save();return {ok:true,total:target,target};
}
function eventsForStation(block){
 let minuteOffset=0;
 const rounds=stationRounds(block);
 return rounds.map((minutes,index)=>{
  const activeDrillIds=(block.stations||[]).flatMap(station=>station.drills||[]).map(drill=>drill.id);
  const event={blockId:block.id,minuteOffset,activeDrillIds,round:index+1,rounds:rounds.length,roundMinutes:minutes};
  minuteOffset+=minutes;
  return event;
 }).filter(event=>event.activeDrillIds.length);
}
export function liveEvents(plan=activePlan()){
 const events=[];for(const block of plan?.blocks||[]){if(block.kind==="station")events.push(...eventsForStation(block));else events.push({blockId:block.id,minuteOffset:0,activeDrillIds:[block.id]});}return events;
}
function applyLiveEvent(event,index,total){state.live.currentBlockId=event.blockId;state.live.currentMinute=event.minuteOffset;state.live.currentDrillIds=event.activeDrillIds.slice();state.live.currentEventIndex=index;state.live.totalEvents=total;state.live.currentRound=event.round||1;state.live.currentRounds=event.rounds||1;state.live.currentRoundMinutes=event.roundMinutes||0;}
export function refreshLive(plan=activePlan(),persist=true){
 if(!state.live.active||!plan||state.live.planId!==plan.id)return false;
 const events=liveEvents(plan);if(!events.length){stopLive();return false;}
 let index=events.findIndex(e=>e.blockId===state.live.currentBlockId&&e.minuteOffset===state.live.currentMinute);
 if(index<0){const sameBlock=events.map((e,i)=>({e,i})).filter(x=>x.e.blockId===state.live.currentBlockId&&x.e.minuteOffset<=Number(state.live.currentMinute||0));if(sameBlock.length)index=sameBlock[sameBlock.length-1].i;else index=Math.min(Math.max(0,state.live.currentEventIndex||0),events.length-1);}
 applyLiveEvent(events[index],index,events.length);if(persist)save();return true;
}
export function startLive(plan=activePlan()){
 const events=liveEvents(plan);if(!events.length)return {ok:false,reason:"empty"};
 state.live={active:true,planId:plan.id,currentBlockId:null,currentMinute:0,currentDrillIds:[],currentEventIndex:0,totalEvents:events.length};applyLiveEvent(events[0],0,events.length);save();return {ok:true,index:0,drillIds:events[0].activeDrillIds};
}
export function liveIndex(plan=activePlan()){return plan&&state.live.active?state.live.currentEventIndex:-1;}
export function moveLive(direction,plan=activePlan()){
 if(!plan||!state.live.active)return false;refreshLive(plan,false);const events=liveEvents(plan),nextIndex=liveIndex(plan)+direction;if(nextIndex<0||nextIndex>=events.length)return false;applyLiveEvent(events[nextIndex],nextIndex,events.length);save();return true;
}
export function advanceLive(plan=activePlan()){
 if(!plan||!state.live.active)return {ok:false};refreshLive(plan,false);const events=liveEvents(plan),nextIndex=liveIndex(plan)+1;if(nextIndex>=events.length){stopLive();return {ok:true,finished:true};}
 const next=events[nextIndex];applyLiveEvent(next,nextIndex,events.length);save();return {ok:true,finished:false,next};
}
export function stopLive(){state.live={active:false,currentBlockId:null,currentMinute:0,currentDrillIds:[],currentEventIndex:0,totalEvents:0,planId:null};save();}
export function addScheduledDrill(drill,plan=activePlan(),stationId=null,beforeId=null){
 if(!drill||!plan)return false;const station=stationId?plan.blocks.filter(b=>b.kind==="station").flatMap(b=>b.stations||[]).find(s=>s.id===stationId):null;if(stationId&&!station)return false;
 remember();const list=station?station.drills:plan.blocks,index=beforeId?list.findIndex(item=>item.id===beforeId):-1;list.splice(index<0?list.length:index,0,drill);
 refreshLive(plan,false);save();return true;
}
export function removeScheduledDrill(id,plan=activePlan()){
 if(!plan)return false;for(const block of plan.blocks){if(block.kind==="drill"&&block.id===id){remember();plan.blocks=plan.blocks.filter(b=>b.id!==id);refreshLive(plan,false);save();return true;}
  if(block.kind==="station")for(const station of block.stations||[]){const i=station.drills.findIndex(d=>d.id===id);if(i>=0){remember();station.drills.splice(i,1);refreshLive(plan,false);save();return true;}}
 }return false;
}
export function removeScheduledBlock(id,plan=activePlan()){
 if(!plan)return false;const block=plan.blocks.find(b=>b.id===id);if(!block)return false;remember();plan.blocks=plan.blocks.filter(b=>b.id!==id);refreshLive(plan,false);save();return true;
}
export function moveScheduledDrill(id,targetStationId=null,beforeId=null,plan=activePlan()){
 if(!plan)return false;let source=null;for(const block of plan.blocks){if(block.kind==="drill"&&block.id===id)source={list:plan.blocks,drill:block,rotation:null};if(block.kind==="station")for(const station of block.stations||[])if(station.drills.some(d=>d.id===id))source={list:station.drills,drill:station.drills.find(d=>d.id===id),rotation:block};}
 if(!source)return false;const targetStation=targetStationId?plan.blocks.filter(b=>b.kind==="station").flatMap(b=>b.stations||[]).find(s=>s.id===targetStationId):null;if(targetStationId&&!targetStation)return false;const target=targetStation?targetStation.drills:plan.blocks,old=source.list.findIndex(d=>d.id===id),before=beforeId?target.findIndex(d=>d.id===beforeId):-1;if(source.list===target&&(before===old||before===old+1))return false;
 remember();source.list.splice(old,1);const at=beforeId?target.findIndex(d=>d.id===beforeId):-1;target.splice(at<0?target.length:at,0,source.drill);refreshLive(plan,false);save();return true;
}
export function reorderScheduledBlock(id,beforeId=null,plan=activePlan()){if(!plan||id===beforeId)return false;const from=plan.blocks.findIndex(b=>b.id===id);if(from<0)return false;const to=beforeId?plan.blocks.findIndex(b=>b.id===beforeId):-1;if(to===from||to===from+1)return false;remember();const [block]=plan.blocks.splice(from,1),dest=beforeId?plan.blocks.findIndex(b=>b.id===beforeId):-1;plan.blocks.splice(dest<0?plan.blocks.length:dest,0,block);refreshLive(plan,false);save();return true;}
export function moveStationToSchedule(rotationId,stationId,beforeBlockId=null,plan=activePlan()){
 const rotationIndex=plan?.blocks.findIndex(b=>b.id===rotationId&&b.kind==="station");if(rotationIndex===undefined||rotationIndex<0)return false;
 const rotation=plan.blocks[rotationIndex],stationIndex=rotation.stations.findIndex(s=>s.id===stationId);if(stationIndex<0)return false;const station=rotation.stations[stationIndex];if(!station.drills.length)return false;
 remember();const drills=station.drills.slice();rotation.stations.splice(stationIndex,1);let insertAt=beforeBlockId&&beforeBlockId!==rotationId?plan.blocks.findIndex(b=>b.id===beforeBlockId):-1;
 if(!rotation.stations.length){plan.blocks.splice(rotationIndex,1);if(insertAt<0)insertAt=rotationIndex;else if(insertAt>rotationIndex)insertAt--;}else if(insertAt<0)insertAt=rotationIndex+1;
 plan.blocks.splice(insertAt,0,...drills);refreshLive(plan,false);save();return true;
}
export function reorderStation(rotationId,stationId,beforeId=null,plan=activePlan()){
 const rotation=plan?.blocks.find(b=>b.id===rotationId&&b.kind==="station");if(!rotation||stationId===beforeId)return false;const from=rotation.stations.findIndex(s=>s.id===stationId),to=beforeId?rotation.stations.findIndex(s=>s.id===beforeId):-1;if(from<0||to===from||to===from+1)return false;remember();const [station]=rotation.stations.splice(from,1),dest=beforeId?rotation.stations.findIndex(s=>s.id===beforeId):-1;rotation.stations.splice(dest<0?rotation.stations.length:dest,0,station);refreshLive(plan,false);save();return true;
}
export function createStation(name="Station rotation",minutes=15){return {kind:"station",id:uid("rotation"),name,minutes:Math.max(2,Math.round(Number(minutes)||15)),rotationModel:"cyclic-v1",stations:[{id:uid("station"),name:"Station 1",drills:[]},{id:uid("station"),name:"Station 2",drills:[]}]};}
