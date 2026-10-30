import {state,activePlan,activeTeam,flattenDrills,remember,save,uid} from "../store.js";
export function currentGroupedDrill() {
  const plan=activePlan();
  return flattenDrills(plan).find(drill=>drill.id===state.groupingDrillId)||null;
}
export function openDrillGroups(drillId) {
  const drill=flattenDrills(activePlan()).find(item=>item.id===drillId);
  if(!drill)return false;
  drill.grouping??={groups:[]};
  state.groupingDrillId=drillId;return true;
}
export function addDrillGroup() {
  const drill=currentGroupedDrill();if(!drill)return;
  remember();
  const groups=drill.grouping.groups;
  groups.push({id:uid("group"),name:"Group "+(groups.length+1),playerIds:[]});
  save();
}
export function renameDrillGroup(groupId,name) {
  const group=currentGroupedDrill()?.grouping.groups.find(item=>item.id===groupId);
  if(!group)return false;
  const value=String(name||"").trim();if(!value)return false;
  group.name=value;save();return true;
}
export function deleteDrillGroup(groupId) {
  const drill=currentGroupedDrill();if(!drill)return;
  const group=drill.grouping.groups.find(item=>item.id===groupId);if(!group)return;
  remember();drill.grouping.groups=drill.grouping.groups.filter(item=>item.id!==groupId);
  save();
}
export function assignPlayer(drillId,playerId,groupId,targetPlayerId=null) {
  const drill=flattenDrills(activePlan()).find(item=>item.id===drillId);
  const team=activeTeam();if(!drill||!team?.players.some(player=>player.id===playerId))return;
  drill.grouping??={groups:[]};
  const groups=drill.grouping.groups;
  const source=groups.find(group=>group.playerIds.includes(playerId));
  const target=groups.find(group=>group.id===groupId);
  const previousTarget=targetPlayerId?groups.find(group=>group.playerIds.includes(targetPlayerId)):null;
  if(targetPlayerId&&previousTarget&&previousTarget.id!==(source?.id||"")) {
    remember();
    groups.forEach(group=>{group.playerIds=group.playerIds.filter(id=>id!==playerId&&id!==targetPlayerId);});
    if(previousTarget)previousTarget.playerIds.push(playerId);
    if(source)source.playerIds.push(targetPlayerId);
  } else {
    remember();
    groups.forEach(group=>{group.playerIds=group.playerIds.filter(id=>id!==playerId);});
    if(target)target.playerIds.push(playerId);
  }
  save();
}
export function randomizeDrillGroups() {
  const drill=currentGroupedDrill(),team=activeTeam();
  if(!drill||!team?.players.length||!drill.grouping.groups.length)return false;
  remember();
  const players=team.players.slice();
  for(let i=players.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[players[i],players[j]]=[players[j],players[i]];}
  drill.grouping.groups.forEach(group=>group.playerIds=[]);
  players.forEach((player,index)=>drill.grouping.groups[index%drill.grouping.groups.length].playerIds.push(player.id));
  save();return true;
}
