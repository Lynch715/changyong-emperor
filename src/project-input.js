import {PROJECTS} from './project-content.js';
import {NAMES} from './content.js';
export function parseProjectClause(text,{state:s}){
 if(!s?.weekly||!/(?:暂缓|暂停|复办|亲核|补做|承办|核查材料)/.test(text))return null;
 const matches=Object.values(PROJECTS).filter(p=>text.includes(p.title)||text.includes(p.id));
 if(matches.length!==1)return {actions:[],clarifications:['想办理哪项差事？请写朝议上的完整项目名称。']};
 const project=matches[0],type=/(?:暂缓|暂停)/.test(text)?'project-pause':/复办/.test(text)?'project-resume':/补做/.test(text)?'project-repair':/亲核|核查材料/.test(text)?'project-inspect':'project-assign',a={type,projectId:project.id};
 if(type==='project-assign'){
  const officers=Object.entries(NAMES).filter(([,name])=>text.includes(name));
  if(officers.length!==1)return {actions:[],clarifications:['请写一位明确的承办人；可选名单见该项目的承办页面。']};
  a.officer=officers[0][0];
 }
 return {actions:[a],clarifications:[]};
}
