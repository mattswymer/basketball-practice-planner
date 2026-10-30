import { state, activeTeam, activePlan, flattenDrills, skillColor, durationLabel, totalPracticeMinutes, equipmentTotals } from "./store.js";
function colorHex(hex) {
  const value=String(hex||"#52758a").replace("#","");
  return [0,2,4].map(i=>parseInt(value.slice(i,i+2),16)||80);
}
function pale(hex,amount=.88) {
  const c=colorHex(hex);return c.map(v=>Math.round(v+(255-v)*amount));
}
function collectEntries(plan) {
  const entries=[];
  for(const block of plan.blocks) {
    if(block.kind==="drill") entries.push({drill:block,lane:""});
    else if(block.kind==="station") {
      for(const lane of block.lanes) for(const drill of lane.drills) entries.push({drill,lane:lane.name,station:block.name});
    }
  }
  return entries;
}
export function exportPracticePDF() {
  const plan=activePlan(),team=activeTeam();
  if(!plan){return {ok:false,message:"Open a practice plan first."};}
  const PDF=window.jspdf?.jsPDF;
  if(!PDF) return {ok:false,message:"The PDF library did not load. Reopen the app while online once."};
  const doc=new PDF({orientation:"landscape",unit:"mm",format:"a4",compress:true});
  const width=doc.internal.pageSize.getWidth(),height=doc.internal.pageSize.getHeight();
  const margin=8,gap=5,colWidth=(width-margin*2-gap)/2,bodyTop=31,bodyBottom=height-9,available=bodyBottom-bodyTop;
  const entries=collectEntries(plan);
  const rosterCount=Math.max(1,team?.players?.length||0);
  const equipment=equipmentTotals(plan).map(x=>x.name+" × "+x.quantity).join("   ·   ");
  function measure(scale) {
    const cols=[[],[]],ys=[bodyTop,bodyTop];
    const layouts=[];
    for(const item of entries) {
      const drill=item.drill,col=ys[0]<=ys[1]?0:1,x=margin+col*(colWidth+gap),pad=3;
      const title=(item.lane?item.lane+" · ":"")+drill.name;
      const titleSize=9*scale,bodySize=7.1*scale,smallSize=6.2*scale;
      doc.setFont("helvetica","bold");doc.setFontSize(titleSize);
      const titleLines=doc.splitTextToSize(title,colWidth-pad*2-21);
      const titleH=titleLines.length*(titleSize*.42);
      doc.setFont("helvetica","normal");doc.setFontSize(smallSize);
      const gear=(drill.equipment||[]).map(x=>x.name+" × "+(x.quantity*(x.perPlayer?rosterCount:1))).join(", ");
      const gearLines=gear?doc.splitTextToSize("Gear: "+gear,colWidth-pad*2):[];
      const gearH=gearLines.length*(smallSize*.48);
      doc.setFontSize(bodySize);
      const steps=[];
      (drill.steps||[]).forEach((s,i)=>{
        const wrapped=doc.splitTextToSize((i+1)+". "+s,colWidth-pad*2-2);
        steps.push({text:wrapped,number:i+1});
      });
      const stepsH=steps.reduce((n,x)=>n+x.text.length*(bodySize*.47)+.5*scale,0);
      const h=pad+Math.max(6,titleH+1)+ (gearLines.length?gearH+1:0)+stepsH+pad+1.5*scale;
      const y=ys[col];ys[col]+=h;
      layouts.push({x,y,w:colWidth,h,drill,title,titleLines,titleSize,bodySize,smallSize,gearLines,steps,col});
    }
    return {layouts,ys,max:Math.max(...ys)-bodyTop};
  }
  let scale=1,layout=measure(scale);
  while(layout.max>available && scale>.12){scale*=.92;layout=measure(scale);}
  const compact=scale<.55;
  doc.setFillColor(16,43,63);doc.roundedRect(0,0,width,25,0,0,"F");
  doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");doc.setFontSize(16);
  doc.text(team?.name||"Basketball",margin,9.4);
  doc.setFontSize(10);doc.setFont("helvetica","normal");
  doc.text(plan.name||"Practice plan",margin,16);
  doc.setFontSize(8);doc.text((plan.date||"No date")+"  ·  "+(plan.start||"")+"–"+(plan.end||""),margin,21);
  doc.setFont("helvetica","bold");doc.setFontSize(9);
  doc.text(durationLabel(totalPracticeMinutes(plan))+" court time  ·  "+entries.length+" drills",width-margin,11,{align:"right"});
  if(layout.max>available) {
    doc.setFontSize(6);doc.text("Condensed to one page",width-margin,19,{align:"right"});
  }
  layout.layouts.forEach(item=>{
    const c=colorHex(skillColor(item.drill.primarySkill)),bg=pale(skillColor(item.drill.primarySkill),.88);
    doc.setFillColor(...bg);doc.roundedRect(item.x,item.y,item.w,item.h,2,2,"F");
    doc.setFillColor(...c);doc.roundedRect(item.x,item.y,1.5,item.h,.6,.6,"F");
    let y=item.y+2.8;
    doc.setTextColor(...c);doc.setFont("helvetica","bold");doc.setFontSize(6.1*scale);
    doc.text(String(item.drill.primarySkill||"").toUpperCase(),item.x+4,y);y+=3.1*scale;
    doc.setTextColor(28,50,64);doc.setFont("helvetica","bold");doc.setFontSize(item.titleSize);
    doc.text(item.titleLines,item.x+4,y);y+=item.titleLines.length*(item.titleSize*.42)+.8*scale;
    doc.setFont("helvetica","normal");doc.setFontSize(item.smallSize);doc.setTextColor(80,99,110);
    if(item.gearLines.length){doc.text(item.gearLines,item.x+4,y);y+=item.gearLines.length*(item.smallSize*.48)+.8*scale;}
    doc.setFont("helvetica","normal");doc.setFontSize(item.bodySize);doc.setTextColor(40,55,66);
    item.steps.forEach(step=>{
      doc.text(step.text,item.x+4,y);
      y+=step.text.length*(item.bodySize*.47)+.5*scale;
    });
  });
  const safeName=(plan.name||"Basketball-Practice").replace(/[^a-z0-9_-]+/gi,"_");
  doc.save(safeName+"_"+(plan.date||"practice")+".pdf");
  return {ok:true,scale,compact,overflow:layout.max>available};
}
export function exportBackup() {
  const data={app:"basketball-practice-planner",version:1,exportedAt:new Date().toISOString(),teams:state.teams,activeTeamId:state.activeTeamId,drillBank:state.drillBank,plansByTeam:state.plansByTeam,activePlanIds:state.activePlanIds};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
  const a=document.createElement("a");a.href=url;a.download="basketball-practice-backup.json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
export async function importBackup(file) {
  if(!file||file.size>8000000) throw new Error("Backup file is too large or missing.");
  const data=JSON.parse(await file.text());
  if(data.app==="basketball-practice-planner"&&Array.isArray(data.teams)&&data.plansByTeam) {
    localStorage.setItem("bbp_app_v1",JSON.stringify(data));
    return;
  }
  // Accept backups produced by the previous planner format and pass them through its migration path.
  if(Array.isArray(data.schedule) || data.schedulesByTeam) {
    const teams=Array.isArray(data.teams)&&data.teams.length?data.teams:(data.team?[data.team]:[]);
    if(!teams.length) throw new Error("Legacy backup is missing its team.");
    localStorage.removeItem("bbp_app_v1");
    localStorage.setItem("cyb_teams_v1",JSON.stringify(teams));
    localStorage.setItem("cyb_active_team_v1",data.activeTeamId||teams[0].id||"");
    if(Array.isArray(data.drillBank)) localStorage.setItem("cyb_drill_bank_v2",JSON.stringify(data.drillBank));
    if(Array.isArray(data.equipmentCatalog)) localStorage.setItem("cyb_equipment_catalog_v1",JSON.stringify(data.equipmentCatalog));
    if(data.schedulesByTeam) localStorage.setItem("cyb_team_schedules_v2",JSON.stringify(data.schedulesByTeam));
    else if(Array.isArray(data.schedule)) localStorage.setItem("cyb_active_schedule_v1",JSON.stringify(data.schedule));
    const meta=data.practice||{};
    localStorage.setItem("cyb_practice_meta_v2",JSON.stringify({date:meta.date||data.date,start:meta.start||data.startTime,end:meta.end||data.endTime}));
    return;
  }
  throw new Error("That file is not a planner backup.");
}
