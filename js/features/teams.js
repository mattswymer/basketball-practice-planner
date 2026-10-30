import {state,uid,remember,save} from "../core/store.js";
export function addTeam(name) {
  const value=String(name||"").trim();
  if(!value||state.teams.some(team=>team.name.toLowerCase()===value.toLowerCase()))return false;
  remember();
  const team={id:uid("team"),name:value,players:[]};
  state.teams.push(team);state.plansByTeam[team.id]=[];state.activePlanIds[team.id]=null;
  state.activeTeamId=team.id;state.selectedTeamId=team.id;save();return true;
}
export function renameTeam(id,name) {
  const team=state.teams.find(item=>item.id===id),value=String(name||"").trim();
  if(!team||!value||state.teams.some(item=>item.id!==id&&item.name.toLowerCase()===value.toLowerCase()))return false;
  remember();team.name=value;save();return true;
}
export function deleteTeam(id) {
  const team=state.teams.find(item=>item.id===id);
  if(!team||state.teams.length<=1)return false;
  remember();state.teams=state.teams.filter(item=>item.id!==id);
  delete state.plansByTeam[id];delete state.activePlanIds[id];
  if(state.activeTeamId===id) {
    state.activeTeamId=state.teams[0].id;
    const plans=state.plansByTeam[state.activeTeamId]||[];
    state.activePlanId=state.activePlanIds[state.activeTeamId]||plans[0]?.id||null;
  }
  if(state.selectedTeamId===id)state.selectedTeamId=state.activeTeamId;
  save();return true;
}
export function addPlayer(teamId,name) {
  const team=state.teams.find(item=>item.id===teamId),value=String(name||"").trim();
  if(!team||!value)return null;
  if(team.players.some(p=>p.name.toLowerCase()===value.toLowerCase()))return null;
  remember();const player={id:uid("player"),name:value};team.players.push(player);save();return player;
}
export function renamePlayer(teamId,playerId,name) {
  const team=state.teams.find(item=>item.id===teamId),player=team?.players.find(p=>p.id===playerId);
  if(!player)return false;
  const value=String(name||"").trim();if(!value)return false;
  player.name=value;save();return true;
}
export function deletePlayer(teamId,playerId) {
  const team=state.teams.find(item=>item.id===teamId);if(!team||!team.players.some(p=>p.id===playerId))return false;
  remember();team.players=team.players.filter(p=>p.id!==playerId);
  for(const list of Object.values(state.plansByTeam))for(const plan of list)for(const block of plan.blocks) {
    const drills=block.kind==="station"?block.lanes.flatMap(l=>l.drills):[block];
    for(const drill of drills)for(const group of drill.grouping?.groups||[])group.playerIds=group.playerIds.filter(id=>id!==playerId);
  }
  save();return true;
}
