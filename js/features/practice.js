import {state,activePlan,flattenDrills,drillsInBlock,blockMinutes,timeWindow,remember,save,uid,fitStationLanes} from "../core/store.js";
function uniqueIds(block){return drillsInBlock(block).map(drill=>drill.id);}
function setBlockStatus(plan,block,status){
  const ids=uniqueIds(block);
  plan.completedIds=plan.completedIds.filter(id=>!ids.includes(id));
  plan.skippedIds=plan.skippedIds.filter(id=>!ids.includes(id));
  if(status==="complete")plan.completedIds.push(...ids);
  if(status==="skip")plan.skippedIds.push(...ids);
}
export function fitPractice(plan=activePlan()){
  if(!plan||!plan.blocks.length)return {ok:false,reason:"empty"};
  const target=timeWindow(plan),blocks=plan.blocks;
  const minimums=blocks.map(block=>block.kind==="station"?Math.max(1,...(block.lanes||[]).map(l=>l.drills?.length||0)):1);
  const minimumTotal=minimums.reduce((a,b)=>a+b,0);
  if(target<minimumTotal)return {ok:false,reason:"too-many-blocks"};
  const weights=blocks.map(block=>Math.max(1,blockMinutes(block)));
  const weightTotal=weights.reduce((a,b)=>a+b,0),remaining=target-minimumTotal;
  const raw=weights.map(weight=>remaining*weight/weightTotal);
  const values=raw.map((value,index)=>minimums[index]+Math.floor(value));
  let difference=target-values.reduce((a,b)=>a+b,0);
  const fractions=raw.map((value,index)=>({index,fraction:value-Math.floor(value)})).sort((a,b)=>b.fraction-a.fraction);
  for(let i=0;difference>0;i++,difference--)values[fractions[i%fractions.length].index]++;
  remember();
  blocks.forEach((block,index)=>{
    if(block.kind==="station")fitStationLanes(block,values[index]);
    else block.minutes=values[index];
  });
  save();return {ok:true,total:values.reduce((a,b)=>a+b,0),target};
}
export function startLive(plan=activePlan()){
  if(!plan?.blocks.length)return {ok:false,reason:"empty"};
  let index=plan.blocks.findIndex(block=>!uniqueIds(block).every(id=>plan.completedIds.includes(id)||plan.skippedIds.includes(id)));
  if(index<0)index=0;
  state.live={active:true,planId:plan.id,currentBlockId:plan.blocks[index].id};
  return {ok:true,index};
}
export function liveIndex(plan=activePlan()){
  return plan?plan.blocks.findIndex(block=>block.id===state.live.currentBlockId):-1;
}
export function moveLive(direction,plan=activePlan()){
  if(!plan||!state.live.active)return false;
  const index=liveIndex(plan),next=plan.blocks[index+direction];
  if(!next)return false;
  state.live.currentBlockId=next.id;save();return true;
}
export function advanceLive(status="complete",plan=activePlan()){
  if(!plan||!state.live.active)return {ok:false};
  const index=liveIndex(plan),block=plan.blocks[index];if(!block)return {ok:false};
  remember();setBlockStatus(plan,block,status);
  const next=plan.blocks[index+1];
  if(next){state.live.currentBlockId=next.id;save();return {ok:true,finished:false,next};}
  state.live={active:false,currentBlockId:null,planId:null};save();return {ok:true,finished:true};
}
export function stopLive(){state.live={active:false,currentBlockId:null,planId:null};save();}
export function toggleDrillStatus(drillId,status,plan=activePlan()){
  if(!plan)return;
  const drill=flattenDrills(plan).find(item=>item.id===drillId);if(!drill)return;
  remember();
  plan.completedIds=plan.completedIds.filter(id=>id!==drillId);
  plan.skippedIds=plan.skippedIds.filter(id=>id!==drillId);
  if(status==="complete")plan.completedIds.push(drillId);
  if(status==="skip")plan.skippedIds.push(drillId);
  save();
}
export function addScheduledDrill(drill,plan=activePlan(),laneId=null){
  if(!drill||!plan)return false;
  remember();
  if(laneId){
    const station=plan.blocks.find(block=>block.kind==="station"&&block.lanes.some(lane=>lane.id===laneId));
    const lane=station?.lanes.find(item=>item.id===laneId);
    if(!lane)return false;
    lane.drills.push(drill);
    fitStationLanes(station,station.minutes);
  } else plan.blocks.push(drill);
  save();return true;
}
export function removeScheduledDrill(drillId,plan=activePlan()){
  if(!plan)return false;
  for(const block of plan.blocks){
    if(block.kind==="drill"&&block.id===drillId){
      remember();plan.blocks=plan.blocks.filter(item=>item.id!==drillId);
      plan.completedIds=plan.completedIds.filter(id=>id!==drillId);plan.skippedIds=plan.skippedIds.filter(id=>id!==drillId);
      save();return true;
    }
    if(block.kind==="station")for(const lane of block.lanes){
      const index=lane.drills.findIndex(item=>item.id===drillId);
      if(index>=0){
        remember();lane.drills.splice(index,1);fitStationLanes(block,block.minutes);
        plan.completedIds=plan.completedIds.filter(id=>id!==drillId);plan.skippedIds=plan.skippedIds.filter(id=>id!==drillId);
        save();return true;
      }
    }
  }
  return false;
}
export function removeScheduledBlock(blockId,plan=activePlan()){
  if(!plan)return false;
  const block=plan.blocks.find(item=>item.id===blockId);if(!block)return false;
  remember();plan.blocks=plan.blocks.filter(item=>item.id!==blockId);
  const ids=uniqueIds(block);plan.completedIds=plan.completedIds.filter(id=>!ids.includes(id));plan.skippedIds=plan.skippedIds.filter(id=>!ids.includes(id));
  if(state.live.active&&state.live.currentBlockId===blockId){
    const next=plan.blocks[0];if(next)state.live.currentBlockId=next.id;else stopLive();
  }
  save();return true;
}
export function moveScheduledDrill(drillId,targetLaneId=null,beforeDrillId=null,plan=activePlan()){
  if(!plan)return false;
  let source=null;
  for(const block of plan.blocks){
    if(block.kind==="drill"&&block.id===drillId)source={list:plan.blocks,drill:block,block:null};
    if(block.kind==="station")for(const lane of block.lanes)if(lane.drills.some(d=>d.id===drillId))source={list:lane.drills,drill:lane.drills.find(d=>d.id===drillId),block};
  }
  if(!source)return false;
  const targetStation=targetLaneId?plan.blocks.find(b=>b.kind==="station"&&b.lanes.some(l=>l.id===targetLaneId)):null;
  const target=targetLaneId?targetStation?.lanes.find(l=>l.id===targetLaneId)?.drills:plan.blocks;
  if(!target)return false;
  const oldIndex=source.list.findIndex(d=>d.id===drillId),beforeIndex=beforeDrillId?target.findIndex(d=>d.id===beforeDrillId):-1;
  if(source.list===target&&(beforeIndex===oldIndex||beforeIndex===oldIndex+1))return false;
  remember();source.list.splice(oldIndex,1);
  const index=beforeDrillId?target.findIndex(d=>d.id===beforeDrillId):-1;
  target.splice(index<0?target.length:index,0,source.drill);
  if(source.block)fitStationLanes(source.block,source.block.minutes);
  if(targetStation&&targetStation!==source.block)fitStationLanes(targetStation,targetStation.minutes);
  save();return true;
}
export function reorderScheduledBlock(blockId,beforeId=null,plan=activePlan()){
  if(!plan||blockId===beforeId)return false;
  const from=plan.blocks.findIndex(block=>block.id===blockId);if(from<0)return false;
  const [block]=plan.blocks.splice(from,1),to=beforeId?plan.blocks.findIndex(item=>item.id===beforeId):-1;
  if(to===from){plan.blocks.splice(from,0,block);return false;}
  plan.blocks.splice(to<0?plan.blocks.length:to,0,block);save();return true;
}
export function createStation(name="Station rotation",minutes=15){
  return {kind:"station",id:uid("station"),name,minutes:Math.max(1,Math.round(Number(minutes)||15)),
    lanes:[{id:uid("lane"),name:"Lane 1",drills:[]},{id:uid("lane"),name:"Lane 2",drills:[]}]};
}
