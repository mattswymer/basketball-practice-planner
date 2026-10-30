import {addSkill,renameSkill,deleteSkill} from "../core/store.js";
export const skills={
  add:(name,color)=>addSkill(name,color),
  rename:(oldName,newName,color)=>renameSkill(oldName,newName,color),
  remove:name=>deleteSkill(name)
};
