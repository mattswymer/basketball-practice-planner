import { state, activeTeam, activePlan, flattenDrills, skillColor, durationLabel, totalPracticeMinutes, equipmentTotals, clockLabel, blockMinutes } from "../core/store.js";
function colorHex(hex) {
  const value=String(hex||"#52758a").replace("#","");
  return [0,2,4].map(i=>parseInt(value.slice(i,i+2),16)||80);
}
function pale(hex,amount=.88) {
  const c=colorHex(hex);return c.map(v=>Math.round(v+(255-v)*amount));
}
function colorForTags(tags=[]) {
  const colors=[...new Set(tags)].map(skillColor).map(value=>value.replace("#","")).filter(value=>/^[0-9a-f]{6}$/i.test(value));
  if(!colors.length)return "#52758a";
  return "#"+[0,2,4].map(i=>Math.round(colors.reduce((sum,value)=>sum+parseInt(value.slice(i,i+2),16),0)/colors.length).toString(16).padStart(2,"0")).join("");
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
  if(!plan)return {ok:false,message:"Open a practice plan first."};
  const PDF=window.jspdf?.jsPDF;
  if(!PDF)return {ok:false,message:"The PDF library did not load. Reopen the app while online once."};

  // Preserve the practice's sequence. Stations remain grouped by station and lane.
  const items=[];
  let elapsed=0,sequence=0;
  for(const block of plan.blocks||[]){
    const duration=blockMinutes(block),start=clockLabel(plan.start,elapsed),end=clockLabel(plan.start,elapsed+duration);
    if(block.kind==="station"){
      items.push({kind:"station",station:block.name||"Station",start,end,duration:duration,stationContext:block.name||"Station"});
      for(const lane of block.lanes||[]){
        items.push({kind:"lane",lane:lane.name||"Lane",stationContext:block.name||"Station"});
        let laneElapsed=elapsed;
        for(const drill of lane.drills||[]){
          const drillStart=clockLabel(plan.start,laneElapsed);
          laneElapsed+=Math.max(1,Number(drill.minutes)||1);
          items.push({kind:"drill",number:++sequence,drill,start:drillStart,end:clockLabel(plan.start,laneElapsed),stationContext:block.name||"Station",laneContext:lane.name||"Lane"});
        }
      }
    } else {
      items.push({kind:"drill",number:++sequence,drill:block,start,end,stationContext:"",laneContext:""});
    }
    elapsed+=duration;
  }

  const rosterCount=Math.max(1,team?.players?.length||0);
  const gearSummary=equipmentTotals(plan).map(item=>item.name+" × "+item.quantity).join("   ·   ");
  const margin=8,gap=5,bodyTop=35,minFont=7.2,titleFont=10.2;
  let format="a4";
  function createDoc(fmt){return new PDF({orientation:"landscape",unit:"mm",format:fmt,compress:true});}
  let doc=createDoc("a4");
  let width=doc.internal.pageSize.getWidth(),height=doc.internal.pageSize.getHeight();
  let colWidth=(width-margin*2-gap)/2,bodyBottom=height-8,available=bodyBottom-bodyTop;

  function layoutItem(item,w){
    if(item.kind==="station")return {item,h:10};
    if(item.kind==="lane")return {item,h:7};
    const drill=item.drill;
    doc.setFont("helvetica","bold");doc.setFontSize(7.1);
    const meta="#"+String(item.number).padStart(2,"0")+"  "+item.start+"–"+item.end+"  ·  "+drill.minutes+" MIN  ·  "+((drill.tags||[]).join(" / ")||"NO SKILL").toUpperCase();
    const metaLines=doc.splitTextToSize(meta,w-8);
    doc.setFont("helvetica","bold");doc.setFontSize(titleFont);
    const titleLines=doc.splitTextToSize(drill.name||"Untitled drill",w-8);
    doc.setFont("helvetica","normal");doc.setFontSize(7.1);
    const gear=(drill.equipment||[]).map(x=>x.name+" × "+(x.quantity*(x.perPlayer?rosterCount:1))).join(", ");
    const gearLines=gear?doc.splitTextToSize("Gear: "+gear,w-8):[];
    const steps=(drill.steps||[]).map((step,index)=>doc.splitTextToSize((index+1)+". "+step,w-9));
    const metaH=metaLines.length*3.1,titleH=titleLines.length*4.1,gearH=gearLines.length*3.1;
    const stepsH=steps.reduce((sum,lines)=>sum+lines.length*3.15+.5,0);
    const h=2.8+metaH+1.1+titleH+(gearLines.length?gearH+1:0)+stepsH+2.8;
    return {item,h,metaLines,titleLines,gearLines,steps};
  }

  function planPages(w,bodyEnd){
    const colW=(width-margin*2-gap)/2,pages=[];
    let page={columns:[[],[]],ys:[bodyTop,bodyTop]},col=0,y=bodyTop;
    const maxH=bodyEnd-bodyTop;
    function nextColumn(){
      if(col===0){col=1;y=bodyTop;}
      else{pages.push(page);page={columns:[[],[]],ys:[bodyTop,bodyTop]};col=0;y=bodyTop;}
    }
    function add(item,context=false){
      const measured=layoutItem(item,colW);
      if(measured.h>maxH)return false;
      if(y+measured.h>bodyEnd)nextColumn();
      const x=margin+col*(colW+gap);
      page.columns[col].push({...measured,x,y,w:colW});
      y+=measured.h+2.2;
      page.ys[col]=y;
      return true;
    }
    for(const item of items){
      if(!add(item)){
        // A single unusually long drill is retained at the minimum readable font and flagged.
        const measured=layoutItem(item,colW);
        nextColumn();
        const x=margin+col*(colW+gap);
        page.columns[col].push({...measured,x,y,w:colW,overflow:true});
        y+=measured.h+2.2;page.ys[col]=y;
      }
    }
    if(page.columns[0].length||page.columns[1].length)pages.push(page);
    return pages.length?pages:[{columns:[[],[]],ys:[bodyTop,bodyTop]}];
  }

  // Prefer A3 before reducing legibility. Pages are added only when A3 is still dense.
  let pages=planPages(colWidth,bodyBottom);
  const a4Capacity=2*(bodyBottom-bodyTop);
  const totalHeight=items.reduce((sum,item)=>sum+layoutItem(item,(297-margin*2-gap)/2).h+2.2,0);
  if(totalHeight>a4Capacity*0.82){
    format="a3";doc=createDoc("a3");
    width=doc.internal.pageSize.getWidth();height=doc.internal.pageSize.getHeight();
    colWidth=(width-margin*2-gap)/2;bodyBottom=height-8;available=bodyBottom-bodyTop;
    pages=planPages(colWidth,bodyBottom);
  }

  function header(pageIndex){
    doc.setFillColor(16,43,63);doc.rect(0,0,width,31,"F");
    doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");doc.setFontSize(16);
    doc.text(team?.name||"Basketball",margin,9.5);
    doc.setFont("helvetica","normal");doc.setFontSize(10);
    doc.text(plan.name||"Practice plan",margin,16.2);
    doc.setFontSize(8);
    doc.text((plan.date||"No date")+"  ·  "+(plan.start||"")+"–"+(plan.end||""),margin,21.1);
    doc.setFont("helvetica","bold");doc.setFontSize(9);
    doc.text(durationLabel(totalPracticeMinutes(plan))+" court time  ·  "+sequence+" drills",width-margin,10,{align:"right"});
    doc.setFont("helvetica","normal");doc.setFontSize(6.8);
    const gearLines=gearSummary?doc.splitTextToSize("EQUIPMENT: "+gearSummary,width-margin*2):["EQUIPMENT: —"];
    doc.text(gearLines.slice(0,2),margin,27);
    doc.setFontSize(7);doc.text("PAGE "+(pageIndex+1)+" / "+pages.length,width-margin,21,{align:"right"});
  }
  function drawItem(layout){
    const item=layout.item,x=layout.x,y=layout.y,w=layout.w;
    if(item.kind==="station"){
      doc.setFillColor(216,230,235);doc.roundedRect(x,y,w,layout.h,1.6,1.6,"F");
      doc.setTextColor(26,66,84);doc.setFont("helvetica","bold");doc.setFontSize(8.5);
      doc.text("STATION ROTATION  ·  "+String(item.station).toUpperCase(),x+3,y+4);
      doc.setFont("helvetica","normal");doc.setFontSize(7);
      doc.text(item.start+"–"+item.end+"  ·  "+item.duration+" MIN",x+3,y+7.6);
      return;
    }
    if(item.kind==="lane"){
      doc.setFillColor(239,243,245);doc.roundedRect(x,y,w,layout.h,1.2,1.2,"F");
      doc.setTextColor(52,83,98);doc.setFont("helvetica","bold");doc.setFontSize(7.2);
      doc.text(String(item.lane).toUpperCase(),x+3,y+4.7);
      return;
    }
    const drill=item.drill,tags=[...new Set(drill.tags||[])],colors=tags.map(skillColor);
    const first=colors[0]||"#52758a",rgb=first.replace("#","");
    const color=[0,2,4].map(index=>parseInt(rgb.slice(index,index+2),16)||82);
    doc.setFillColor(249,251,252);doc.roundedRect(x,y,w,layout.h,1.5,1.5,"F");
    // One segment per skill; no averaged colors.
    const stripeWidth=w/Math.max(1,colors.length);
    (colors.length?colors:["#52758a"]).forEach((value,index)=>{
      const rgbValue=value.replace("#","");
      const rgbColor=[0,2,4].map(pos=>parseInt(rgbValue.slice(pos,pos+2),16)||82);
      doc.setFillColor(...rgbColor);doc.rect(x+index*stripeWidth,y,stripeWidth+.08,1.8,"F");
    });
    let yy=y+4.3;
    doc.setTextColor(76,91,101);doc.setFont("helvetica","bold");doc.setFontSize(7.1);
    doc.text(layout.metaLines,x+3,yy);yy+=layout.metaLines.length*3.1+1.1;
    doc.setTextColor(28,50,64);doc.setFont("helvetica","bold");doc.setFontSize(titleFont);
    doc.text(layout.titleLines,x+3,yy);yy+=layout.titleLines.length*4.1+1;
    doc.setTextColor(80,99,110);doc.setFont("helvetica","normal");doc.setFontSize(7.1);
    if(layout.gearLines.length){doc.text(layout.gearLines,x+3,yy);yy+=layout.gearLines.length*3.1+1;}
    doc.setTextColor(40,55,66);
    layout.steps.forEach(lines=>{
      doc.text(lines,x+3,yy);yy+=lines.length*3.15+.5;
    });
  }

  pages.forEach((page,index)=>{
    if(index)doc.addPage(format,"landscape");
    header(index);
    page.columns.forEach(column=>column.forEach(drawItem));
  });
  const safeName=value=>String(value||"").normalize("NFKD").replace(/[^a-z0-9_-]+/gi,"_").replace(/^_+|_+$/g,"");
  doc.save((safeName(team?.name)||"Team")+"_"+(safeName(plan.date)||"No-Date")+".pdf");
  return {ok:true,scale:1,compact:false,overflow:pages.some(page=>page.columns.some(column=>column.some(item=>item.overflow))),pages:pages.length,format};
}
export function exportBackup() {
  const data={app:"basketball-practice-planner",version:2,exportedAt:new Date().toISOString(),teams:state.teams,activeTeamId:state.activeTeamId,drillBank:state.drillBank,plansByTeam:state.plansByTeam,activePlanIds:state.activePlanIds,skills:state.skills,skillColors:state.skillColors};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
  const a=document.createElement("a");a.href=url;a.download="basketball-practice-backup.json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
export async function importBackup(file) {
  if(!file||file.size>8000000) throw new Error("Backup file is too large or missing.");
  const data=JSON.parse(await file.text());
  if(data.app==="basketball-practice-planner"&&Array.isArray(data.teams)&&data.plansByTeam) {
    localStorage.setItem("bbp_app_v2",JSON.stringify(data));
    return;
  }
  // Accept backups produced by the previous planner format and pass them through its migration path.
  if(Array.isArray(data.schedule) || data.schedulesByTeam) {
    const teams=Array.isArray(data.teams)&&data.teams.length?data.teams:(data.team?[data.team]:[]);
    if(!teams.length) throw new Error("Legacy backup is missing its team.");
    localStorage.removeItem("bbp_app_v2");localStorage.removeItem("bbp_app_v1");
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
