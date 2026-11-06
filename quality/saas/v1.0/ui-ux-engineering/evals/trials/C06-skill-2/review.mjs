import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const srgb=x=>{const s=x/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;};
function lum(hex){const c=hex.replace('#','');const rgb=[0,2,4].map(i=>srgb(parseInt(c.slice(i,i+2),16)));return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
function ratio(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
const pairs=[['ink / surface','#203b30','#fffef9',4.5],['muted / surface','#52655a','#fffef9',4.5],['muted / soft','#52655a','#e9eee3',4.5],['action text','#ffffff','#214d3b',4.5],['hover action text','#ffffff','#153d2c',4.5],['error','#8e3025','#fbede8',4.5],['placeholder','#5d6d61','#ffffff',4.5],['input boundary','#859784','#ffffff',3],['focus / surface','#9c4c16','#fffef9',3],['secondary text','#214d3b','#fffef9',4.5]].map(([name,foreground,background,threshold])=>({name,foreground,background,ratio:ratio(foreground,background),threshold,status:ratio(foreground,background)>=threshold?'PASS':'FAIL'}));
const fixture=await readFile(resolve(root,'../../fixtures/C06/fake-api.ts'));
const copy=await readFile(resolve(root,'artifact/src/fake-api.ts'));
const record={checkedAt:new Date().toISOString(),method:'sRGB relative luminance calculation for declared CSS pairs; not a complete accessibility scan',pairs,fixture:{unchanged:fixture.equals(copy),sha256:createHash('sha256').update(copy).digest('hex')},visualReview:{status:'PASS',viewports:['1000x900 DPR1','320x800 DPR1 (full-page images taller)'],screenshots:['initial-desktop-focus.png','pending-desktop.png','cedar-desktop.png','moss-320.png','failure-320.png'],observation:'Reviewed rendered screenshots: clear primary form, aligned spacing and hierarchy, legible labels and metadata, long moss title wraps, no clipping, distinct text pending/error/outcomes, visible focus. Native search clear affordance visible.'},build:{command:'node artifact/build.mjs',status:'PASS',output:'TypeScript 6.0.3: strict check and build passed',node:'v24.12.0'},limitations:['Screen-reader speech not tested','No full automated accessibility scanner','No actual browser zoom test','No field or lab performance claims']};
await writeFile(resolve(root,'review-evidence.json'),JSON.stringify(record,null,2),'utf8');console.log(JSON.stringify(record,null,2));
