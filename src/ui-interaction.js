// Session-only drafts: never persisted with saves or sent before submission.
export function createReadingDrafts(){
 const drafts=new Map();
 const key=(game,actor,event)=>JSON.stringify([game,actor,event||null]);
 return {get:(...parts)=>drafts.get(key(...parts))||'',set:(game,actor,event,text)=>{const k=key(game,actor,event);if(text)drafts.set(k,text);else drafts.delete(k);},clear:(...parts)=>drafts.delete(key(...parts))};
}
export function readingViewport({layoutHeight,height,offsetTop=0,focused=false}){
 const h=Math.max(1,Number.isFinite(height)?height:layoutHeight),top=Math.max(0,Number.isFinite(offsetTop)?offsetTop:0);
 return {height:h,top,keyboardOpen:focused&&layoutHeight-h-top>120};
}
export function installReadingViewport(win,doc){
 const sync=()=>{const v=win.visualViewport,x=readingViewport({layoutHeight:win.innerHeight,height:v?.height||win.innerHeight,offsetTop:v?.offsetTop||0,focused:!!doc.activeElement?.matches('input,textarea,select')});doc.documentElement.style.setProperty('--reading-height',x.height+'px');doc.documentElement.style.setProperty('--reading-top',x.top+'px');doc.body.classList.toggle('keyboard-open',x.keyboardOpen);};
 win.visualViewport?.addEventListener('resize',sync);win.visualViewport?.addEventListener('scroll',sync);win.addEventListener('resize',sync);doc.addEventListener('focusin',sync);doc.addEventListener('focusout',()=>queueMicrotask(sync));sync();
}
