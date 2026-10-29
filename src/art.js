// Read-only image selection and presentation. Never modifies game state or history.
import {ART_CATALOG} from './art-catalog.js';
export {ART_CATALOG};
const byId=new Map(ART_CATALOG.map(a=>[a.id,a]));
const nextGeneration=new Set(['C33','C34','C35','C36']);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const artAsset=id=>byId.get(id)||null;
export function portraitAsset(actor,{date,age,archive=false,formal=false,remote=false,identityMatches=true}={}){
 if(!actor||actor==='C23'||!identityMatches)return null;
 if(age!==undefined&&(!Number.isFinite(age)||age<0))return null;
 const year=Number(date?.year),knownAge=Number.isFinite(age)&&age>=0;
 if(!archive&&(remote||!Number.isInteger(year)||year<1))return null;
 let id=`char_${actor}_base`;
 if(actor==='C01')id=knownAge&&age>=65||!knownAge&&year>=27?'char_C01_elder':formal?'char_C01_formal':id;
 const a=artAsset(id);if(!a)return null;
 if(!archive&&formal&&actor==='C01'&&id==='char_C01_elder')return null;
 if(archive)return a;
 // Numeric ages must come from authoritative caller data, never image metadata.
 if(knownAge){const [min,max]=a.ageRange.split(/[–—-]/).map(Number);return age>=min&&age<=max?a:null;}
 // Current authored first two years use the established adult portraits. Children
 // require an explicit adult age. Later unknown ages use nameplates until S14.
 if(nextGeneration.has(actor))return null;
 return year<=2||actor==='C01'&&year>=27?a:null;
}
const locationArt={
 '养心殿御案':'art_bg_01','养心殿暖阁':'art_bg_01','御案文书':'art_bg_01',
 '景仁宫':'art_bg_02','翊坤宫':'art_bg_02','碎玉轩':'art_bg_02','长乐宫':'art_bg_02',
 '御花园':'art_bg_03','御园小径':'art_bg_03','宫门长廊':'art_bg_03','避风长廊':'art_bg_03','听竹馆外':'art_bg_03',
 '朝议':'art_bg_04','朝会':'art_bg_04','议政殿':'art_bg_04','正式奏报':'art_bg_04'
};
export function backgroundAsset(location,{date,season}={}){
 const id=locationArt[location];if(!id)return null;
 const month=Number(date?.month),winter=season==='冬'||month>=10&&month<=12;
 if(id==='art_bg_03'&&(winter||(!season&&!Number.isInteger(month))))return null;
 return artAsset(id);
}
export function illustrationAsset(record){return record?.eventId==='M01'?artAsset('cg_CG01'):record?.eventId==='M07'?artAsset('cg_CG15'):null;}
export function artExport(asset,role='display',format='WEBP'){
 if(!asset)return null;
 const target=role==='full'&&asset.category==='portrait'?'display':role;
 return asset.exports.find(e=>e.role===target&&(format==='fallback'?e.format!=='WEBP':e.format===format))||null;
}
export function renderArtwork(asset,{role='display',className='',caption='',open=false,decorative=false}={}){
 if(typeof asset==='string')asset=artAsset(asset);if(!asset)return '';
 const webp=artExport(asset,role),fallback=artExport(asset,role,'fallback');if(!webp||!fallback)return '';
 const portrait=asset.category==='portrait',mobile=role==='display'&&portrait?artExport(asset,'mobile'):null,mobileFallback=mobile?artExport(asset,'mobile','fallback'):null;
 const srcset=mobile?`${mobile.path} 384w, ${webp.path} 768w`:webp.path;
 const imgset=mobileFallback?` srcset="${mobileFallback.path} 384w, ${fallback.path} 768w" sizes="(max-width:600px) 45vw, 320px"`:'';
 return `<figure class="art-figure ${portrait?'art-portrait':'art-landscape'} ${esc(className)}" data-art-id="${asset.id}"><picture><source type="image/webp" srcset="${srcset}"${mobile?' sizes="(max-width:600px) 45vw, 320px"':''}><img src="${fallback.path}"${imgset} width="${fallback.dimensions[0]}" height="${fallback.dimensions[1]}" alt="${decorative?'':esc(asset.name)}" loading="lazy" decoding="async" data-art-image data-art-fallback="${fallback.path}"></picture><span class="art-nameplate" ${decorative?'aria-hidden="true"':''} hidden>${esc(asset.name.replace('基准立绘',''))}</span>${caption?`<figcaption>${esc(caption)}</figcaption>`:''}${open?`<button class="text-btn art-open" data-art-open="${asset.id}">完整查看 · ${esc(asset.name)}</button>`:''}</figure>`;
}
export function renderPortrait(actor,context={},options={}){
 const a=portraitAsset(actor,context),name=artAsset(`char_${actor}_base`)?.name.replace('基准立绘','')||'故人';
 if(!a)return `<span class="art-nameplate art-standalone" data-art-actor="${esc(actor)}">${esc(name)}${context.remote?' · 书信':''}</span>`;
 return renderArtwork(a,{...options,caption:options.caption||''});
}
export function renderArtStage(actor,title,location,{date,remote=false,age,formal=false}={}){
 const bg=backgroundAsset(location,{date});
 return `<section class="scene-stage art-stage">${bg?renderArtwork(bg,{className:'art-stage-background',decorative:true}):''}<div class="stage-wash"></div><div class="stage-caption"><span class="stage-chapter">江山与故人</span><h2>${esc(title)}</h2><p>${esc(location)}</p></div><div class="art-stage-person">${renderPortrait(actor,{date,remote,age,formal},{className:'art-stage-portrait'})}</div></section>`;
}
export function renderArtGallery(){return `<div class="art-gallery">${ART_CATALOG.filter(a=>a.category==='portrait').map(a=>renderArtwork(a,{role:'mobile',caption:`${a.name.replace('基准立绘','')} · ${a.outfit}`,open:true})).join('')}</div>`;}
const installed=new WeakSet();
export function installArtFallbacks(root){
 for(const img of root.querySelectorAll('[data-art-image]')){
  if(installed.has(img))continue;installed.add(img);
  const figure=img.closest('[data-art-id]'),picture=img.closest('picture'),plate=figure?.querySelector('.art-nameplate');let retried=false;
  img.onload=()=>{if(plate)plate.hidden=true;};
  img.onerror=()=>{if(!retried){retried=true;picture?.querySelectorAll('source').forEach(s=>s.remove());img.removeAttribute('srcset');img.src=img.dataset.artFallback;}else{if(picture)picture.hidden=true;if(plate)plate.hidden=false;figure?.classList.add('art-unavailable');}};
  if(img.complete&&img.naturalWidth===0)img.onerror();
 }
}
