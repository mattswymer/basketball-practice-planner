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
  const entries=[];
  const clock=(start,offset)=>{
    const [h,m]=(start||"18:00").split(":").map(Number);
    const n=h*60+m+offset,hour=Math.floor(n/60)%24,minute=n%60;
    return (hour%12||12)+":"+String(minute).padStart(2,"0")+(hour>=12?"p":"a")+(Math.floor(n/1440)?" +"+Math.floor(n/1440)+"d":"");
  };
  let elapsed=0,sequence=0;
  for(const block of plan.blocks||[]){
    const minutes=Math.max(1,Math.round(Number(block.minutes)||1));
    const blockStart=clock(plan.start,elapsed);
    if(block.kind==="station"){
      for(const [laneIndex,lane] of (block.lanes||[]).entries()){
        entries.push({type:"station",name:block.name||"Station",lane:lane.name||"Lane "+(laneIndex+1),start:blockStart,end:clock(plan.start,elapsed+minutes),minutes:block.minutes||minutes});
        let laneOffset=0;
        for(const drill of lane.drills||[]){
          const duration=Math.max(1,Math.round(Number(drill.minutes)||1));
          entries.push({type:"drill",drill,number:++sequence,lane:lane.name||"Lane "+(laneIndex+1),station:block.name||"Station",start:clock(plan.start,elapsed+laneOffset),end:clock(plan.start,elapsed+laneOffset+duration)});
          laneOffset+=duration;
        }
      }
    }else{
      entries.push({type:"drill",drill:block,number:++sequence,lane:"",station:"",start:blockStart,end:clock(plan.start,elapsed+minutes)});
    }
    elapsed+=minutes;
  }
  const rosterCount=Math.max(1,team?.players?.length||0);
  const equipment=equipmentTotals(plan).map(x=>x.name+" × "+x.quantity).join("   ·   ");
  const safeName=value=>String(value||"").normalize("NFKD").replace(/[^a-z0-9_-]+/gi,"_").replace(/^_+|_+$/g,"");
  function build(format){
    const doc=new PDF({orientation:"landscape",unit:"mm",format,compress:true});
    const width=doc.internal.pageSize.getWidth(),height=doc.internal.pageSize.getHeight();
    const margin=8,gap=5,colWidth=(width-margin*2-gap)/2,top=35,bottom=height-10,available=bottom-top;
    const fonts=format==="a4"?{title:7.8,body:6.4,small:5.5,station:9}:{title:8.6,body:7.0,small:6.0,station:10};
    function layout(atom){
      if(atom.type==="station"){
        doc.setFont("helvetica","bold");doc.setFontSize(fonts.station);
        const title=doc.splitTextToSize(atom.name+" · "+atom.lane,colWidth-10);
        doc.setFont("helvetica","normal");doc.setFontSize(fonts.small);
        const sub=doc.splitTextToSize(atom.start+"–"+atom.end+" · "+atom.minutes+" min",colWidth-10);
        return {...atom,title,sub,h:3+title.length*(fonts.station*.43)+1+sub.length*(fonts.small*.46)+3};
      }
      const drill=atom.drill;
      const meta=String(atom.number).padStart(2,"0")+"  ·  "+atom.start+"–"+atom.end+"  ·  "+(drill.minutes||1)+" MIN";
      const skills=(drill.tags||[]).join(" / ");
      const title=(atom.station?atom.station+" / "+atom.lane+" · ":atom.lane?atom.lane+" · ":"")+drill.name;
      doc.setFont("helvetica","bold");doc.setFontSize(fonts.title);
      const titleLines=doc.splitTextToSize(title,colWidth-10);
      doc.setFont("helvetica","normal");doc.setFontSize(fonts.small);
      const skillLines=skills?doc.splitTextToSize("SKILLS  "+skills.toUpperCase(),colWidth-10):[];
      const gear=(drill.equipment||[]).map(x=>x.name+" × "+(x.quantity*(x.perPlayer?rosterCount:1))).join(", ");
      const gearLines=gear?doc.splitTextToSize("GEAR  "+gear,colWidth-10):[];
      doc.setFont("helvetica","normal");doc.setFontSize(fonts.body);
      const steps=(drill.steps||[]).map((step,i)=>doc.splitTextToSize((i+1)+". "+step,colWidth-12));
      const h=3+2+skillLines.length*(fonts.small*.46)+titleLines.length*(fonts.title*.44)+gearLines.length*(fonts.small*.46)+steps.reduce((sum,lines)=>sum+lines.length*(fonts.body*.48)+.7,0)+3;
      return {...atom,meta,skillLines,titleLines,gearLines,steps,h};
    }
    const atoms=entries.map(layout);
    const pages=[];
    let page={columns:[[],[]],ys:[top,top],column:0};
    const newPage=()=>{pages.push(page);page={columns:[[],[]],ys:[top,top],column:0};};
    for(const atom of atoms){
      let col=page.column;
      if(page.ys[col]+atom.h>bottom){
        if(col===0){col=1;page.column=1;}
        if(page.ys[col]+atom.h>bottom){newPage();col=0;}
      }
      const x=margin+col*(colWidth+gap),y=page.ys[col];
      page.columns[col].push({atom,x,y,w:colWidth});page.ys[col]+=atom.h+2;
    }
    if(page.columns.some(col=>col.length))pages.push(page);
    const pageGear=doc.splitTextToSize("EQUIPMENT  "+(equipment||"—"),width-margin*2);
    pages.forEach((pg,pageIndex)=>{
      if(pageIndex)doc.addPage();
      doc.setFillColor(16,43,63);doc.rect(0,0,width,31,"F");
      doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");doc.setFontSize(15);doc.text(team?.name||"Basketball",margin,9);
      doc.setFont("helvetica","normal");doc.setFontSize(9);doc.text(plan.name||"Practice plan",margin,16);
      doc.setFontSize(7.5);doc.text((plan.date||"No date")+"  ·  "+(plan.start||"")+"–"+(plan.end||"")+"  ·  "+durationLabel(totalPracticeMinutes(plan))+" court time",margin,21);
      doc.setFontSize(6);doc.text(doc.splitTextToSize(pageGear.join(" "),width-margin*2),margin,27);
      if(pageIndex) {doc.setFontSize(6);doc.text("CONTINUED",width-margin,8,{align:"right"});}
      pg.columns.forEach((items,col)=>{
        items.forEach(({atom,x,y,w})=>{
          if(atom.type==="station"){
            doc.setFillColor(225,237,242);doc.setDrawColor(186,207,216);doc.roundedRect(x,y,w,atom.h-1,2,2,"FD");
            doc.setTextColor(28,77,99);doc.setFont("helvetica","bold");doc.setFontSize(fonts.station);doc.text(atom.title,x+3,y+3+fonts.station*.32);
            doc.setTextColor(80,103,113);doc.setFont("helvetica","normal");doc.setFontSize(fonts.small);doc.text(atom.sub,x+3,y+3+atom.title.length*(fonts.station*.43)+fonts.small*.72);
            return;
          }
          doc.setFillColor(249,251,252);doc.setDrawColor(219,228,232);doc.roundedRect(x,y,w,atom.h-1,1.7,1.7,"FD");
          const colors=[...new Set(atom.drill.tags||[])].map(skillColor);
          const segments=colors.length?colors:["#8a9da6"];
          segments.forEach((color,i)=>{const c=color.replace("#","");doc.setFillColor(parseInt(c.slice(0,2),16),parseInt(c.slice(2,4),16),parseInt(c.slice(4,6),16));doc.rect(x+1+i*(w-2)/segments.length,y+1.1,(w-2)/segments.length+.2,1.4,"F");});
          let cursor=y+4.2;
          doc.setTextColor(91,111,120);doc.setFont("helvetica","bold");doc.setFontSize(fonts.small);doc.text(atom.meta,x+3,cursor);cursor+=fonts.small*.65+1.2;
          if(atom.skillLines.length){doc.setFont("helvetica","normal");doc.setFontSize(fonts.small);doc.text(atom.skillLines,x+3,cursor);cursor+=atom.skillLines.length*(fonts.small*.46)+.8;}
          doc.setTextColor(28,50,64);doc.setFont("helvetica","bold");doc.setFontSize(fonts.title);doc.text(atom.titleLines,x+3,cursor);cursor+=atom.titleLines.length*(fonts.title*.44)+.8;
          if(atom.gearLines.length){doc.setTextColor(80,99,110);doc.setFont("helvetica","normal");doc.setFontSize(fonts.small);doc.text(atom.gearLines,x+3,cursor);cursor+=atom.gearLines.length*(fonts.small*.46)+.8;}
          doc.setTextColor(40,55,66);doc.setFont("helvetica","normal");doc.setFontSize(fonts.body);
          atom.steps.forEach(lines=>{doc.text(lines,x+3,cursor);cursor+=lines.length*(fonts.body*.48)+.7;});
        });
      });
      doc.setTextColor(110,124,132);doc.setFont("helvetica","normal");doc.setFontSize(6);
      doc.text((pageIndex+1)+" / "+pages.length,width-margin,height-4,{align:"right"});
    });
    return {doc,pages:pages.length,format};
  }
  let output=build("a4");
  if(output.pages>1)output=build("a3");
  output.doc.save((safeName(team?.name)||"Team")+"_"+(safeName(plan.date)||"No-Date")+".pdf");
  return {ok:true,format:output.format,pages:output.pages,entries:sequence};
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
