import {state,activePlan,flattenDrills,drillsInBlock,blockMinutes,timeWindow,remember,save,uid,fitStationLanes} from "../core/store.js";
export {fitStationLanes};
export function ensureStationFits(plan=activePlan()){
  if(!plan)return;
  for(const block of plan.blocks||[])if(block.kind==="station"){
    const longest=Math.max(1,...(block.lanes||[]).flatMap(station=>(station.groups||[]).map(group=>group.drills.reduce((sum,drill)=>sum+Math.max(1,Number(drill.minutes)||1),0))));
    if(longest>block.minutes)block.minutes=longest;
  }
}
export function fitPractice(plan=activePlan()){
  if(!plan||!plan.blocks.length)return {ok:false,reason:"empty"};
  const target=timeWindow(plan),blocks=plan.blocks;
  const minimums=blocks.map(block=>block.kind==="station"?Math.max(1,...(block.lanes||[]).flatMap(station=>(station.groups||[]).map(group=>group.drills?.length||0))):1);
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
  const drills=flattenDrills(plan);if(!drills.length)return {ok:false,reason:"empty"};
  state.live={active:true,planId:plan.id,currentBlockId:drills[0].id};return {ok:true,index:0};
}
export function liveIndex(plan=activePlan()){
  return plan?flattenDrills(plan).findIndex(drill=>drill.id===state.live.currentBlockId):-1;
}
export function moveLive(direction,plan=activePlan()){
  if(!plan||!state.live.active)return false;
  const drills=flattenDrills(plan),next=drills[liveIndex(plan)+direction];if(!next)return false;
  state.live.currentBlockId=next.id;save();return true;
}
export function advanceLive(plan=activePlan()){
  if(!plan||!state.live.active)return {ok:false};
  const drills=flattenDrills(plan),index=liveIndex(plan);if(index<0)return {ok:false};
  const next=drills[index+1];if(next){state.live.currentBlockId=next.id;save();return {ok:true,finished:false,next};}
  state.live={active:false,currentBlockId:null,planId:null};save();return {ok:true,finished:true};
}
export function stopLive(){state.live={active:false,currentBlockId:null,planId:null};save();}
export function addScheduledDrill(drill,plan=activePlan(),groupId=null){
  if(!drill||!plan)return false;
  let target=null,station=null;
  if(groupId)for(const block of plan.blocks)if(block.kind==="station")for(const item of block.lanes)for(const group of item.groups||[])if(group.id===groupId){target=group;station=block;}
  if(groupId&&!target)return false;
  remember();if(target){target.drills.push(drill);fitStationLanes(station,station.minutes);}else plan.blocks.push(drill);
  save();return true;
}
export function removeScheduledDrill(drillId,plan=activePlan()){
  if(!plan)return false;
  for(const block of plan.blocks){
    if(block.kind==="drill"&&block.id===drillId){
      remember();plan.blocks=plan.blocks.filter(item=>item.id!==drillId);
      save();return true;
    }
    if(block.kind==="station")for(const station of block.lanes)for(const group of station.groups||[]){
      const index=group.drills.findIndex(item=>item.id===drillId);
      if(index>=0){remember();group.drills.splice(index,1);fitStationLanes(block,block.minutes);save();return true;}
    }
  }
  return false;
}
export function removeScheduledBlock(blockId,plan=activePlan()){
  if(!plan)return false;
  const block=plan.blocks.find(item=>item.id===blockId);if(!block)return false;
  remember();plan.blocks=plan.blocks.filter(item=>item.id!==blockId);
  if(state.live.active&&state.live.currentBlockId===blockId){
    const next=plan.blocks[0];if(next)state.live.currentBlockId=next.id;else stopLive();
  }
  save();return true;
}
export function moveScheduledDrill(drillId,targetGroupId=null,beforeDrillId=null,plan=activePlan()){
  if(!plan)return false;
  let source=null;
  for(const block of plan.blocks){
    if(block.kind==="drill"&&block.id===drillId)source={list:plan.blocks,drill:block,block:null};
    if(block.kind==="station")for(const station of block.lanes)for(const group of station.groups||[])if(group.drills.some(d=>d.id===drillId))source={list:group.drills,drill:group.drills.find(d=>d.id===drillId),block};
  }
  if(!source)return false;
  const targetStation=targetGroupId?plan.blocks.find(b=>b.kind==="station"&&b.lanes.some(station=>(station.groups||[]).some(g=>g.id===targetGroupId))):null;
  const target=targetGroupId?targetStation?.lanes.flatMap(station=>station.groups||[]).find(g=>g.id===targetGroupId)?.drills:plan.blocks;
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
    lanes:[{id:uid("station"),name:"Station 1",groups:[{id:uid("group"),name:"Group 1",drills:[]}]},{id:uid("station"),name:"Station 2",groups:[{id:uid("group"),name:"Group 1",drills:[]}]}]};
}
