// 图片路径只依赖编号，人物资料与美术组件共用，避免相互循环引用。
export function portraitFile(id, role = 'mobile', format = 'webp') {
 const revised = ['N01', 'N02'].includes(id);
 const stem = `char_${id}_${revised ? 'qing' : 'base'}`;
 const lossless = !revised && role === 'thumb' && format === 'webp' && id.startsWith('C') && Number(id.slice(1)) <= 36;
 return `assets/exports/s11-v1/${stem}-${role}${lossless ? '-lossless' : ''}.${format}`;
}
export const portrait = id => portraitFile(id);
export const thumb = id => portraitFile(id, 'thumb', 'png');
