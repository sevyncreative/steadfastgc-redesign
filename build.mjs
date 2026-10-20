import { readdir, readFile, writeFile, mkdir, cp, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root=process.cwd();
const out=path.join(root,'dist');
await mkdir(out,{recursive:true});
const skip=new Set(['dist','node_modules','.git','.vercel','.openai']);
async function walk(dir){
 const result=[];
 for(const entry of await readdir(dir,{withFileTypes:true})){
  if(entry.name.startsWith('.')||skip.has(entry.name))continue;
  const full=path.join(dir,entry.name);
  if(entry.isDirectory())result.push(...await walk(full));else result.push(full);
 }
 return result;
}
const sourceFiles=await walk(root);
const publishFiles=sourceFiles.filter(p=>{
 const rel=path.relative(root,p).split(path.sep).join('/');
 return rel.startsWith('assets/')||/\.(html|css|js|xml|txt)$/.test(rel);
});
for(const file of publishFiles){
 const dest=path.join(out,path.relative(root,file));
 await mkdir(path.dirname(dest),{recursive:true});
 await cp(file,dest);
}
const candidates=sourceFiles.filter(p=>/[/\\]assets[/\\](roofing|kitchen)[/\\]/.test(p)||/[/\\]assets[/\\]tesla-(solar\.jpg|wall-connector\.jpg|powerwall-product\.png)$/.test(p));
const variants=new Map();
let originalBytes=0,smallBytes=0;
for(const file of candidates){
 const source='/'+path.relative(root,file).split(path.sep).join('/');
 const metadata=await sharp(file).metadata();
 const rotated=[5,6,7,8].includes(metadata.orientation);
 const naturalWidth=rotated?metadata.height:metadata.width;
 const naturalHeight=rotated?metadata.width:metadata.height;
 const widths=[...new Set([480,900,1440].map(w=>Math.min(w,naturalWidth)))];
 const entries=[];
 for(const width of widths){
  const url='/optimized/'+source.slice('/assets/'.length).replace(/\.[^.]+$/,'')+'-'+width+'.webp';
  const dest=path.join(out,url.slice(1));
  await mkdir(path.dirname(dest),{recursive:true});
  const info=await sharp(file).rotate().resize({width,withoutEnlargement:true}).webp({quality:78,effort:4}).toFile(dest);
  entries.push({url,width:info.width,bytes:info.size});
 }
 originalBytes+=(await stat(file)).size;
 smallBytes+=entries[0].bytes;
 variants.set(source,{entries,width:naturalWidth,height:naturalHeight});
}
for(const file of publishFiles.filter(p=>p.endsWith('.html'))){
 const dest=path.join(out,path.relative(root,file));
 let html=await readFile(dest,'utf8');
 html=html.replace(/<img\b[^>]*>/g,tag=>{
  const src=tag.match(/\bsrc="([^"]+)"/)?.[1];
  const variant=variants.get(src);
  if(!variant)return tag;
  const fallback=variant.entries.find(x=>x.width>=900)||variant.entries.at(-1);
  tag=tag.replace(/\bsrc="[^"]*"/,'src="'+fallback.url+'"');
  tag=tag.replace(/\s(?:width|height|srcset|sizes)="[^"]*"/g,'');
  const gallery=/class="[^"]*roof-grid/.test(html) && src.includes('/roofing/');
  const sizes=gallery?'(max-width: 600px) 92vw, (max-width: 1000px) 46vw, 440px':'(max-width: 760px) 92vw, 60vw';
  return tag.replace(/>$/,' width="'+variant.width+'" height="'+variant.height+'" srcset="'+variant.entries.map(x=>x.url+' '+x.width+'w').join(', ')+'" sizes="'+sizes+'">');
 });
 await writeFile(dest,html);
}
const files=await walk(out);
const available=new Set(files.map(p=>'/'+path.relative(out,p).split(path.sep).join('/')));
const titles=new Set(),descriptions=new Set();
let pages=0;
for(const file of files.filter(p=>p.endsWith('.html'))){
 const html=await readFile(file,'utf8');
 const is404=file.endsWith('404.html');
 const title=html.match(/<title>(.*?)<\/title>/)?.[1];
 const description=html.match(/name="description" content="([^"]+)"/)?.[1];
 if(!title||!description||titles.has(title)||descriptions.has(description))throw Error('Missing or duplicate metadata: '+file);
 titles.add(title);descriptions.add(description);
 if(!is404 && !html.includes('rel="canonical"'))throw Error('Missing canonical: '+file);
 if(!is404 && html.includes('noindex'))throw Error('Unexpected noindex: '+file);
 if((html.match(/<h1\b/g)||[]).length!==1)throw Error('Expected one h1: '+file);
 for(const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))JSON.parse(match[1]);
 for(const match of html.matchAll(/\b(?:href|src|poster)="(\/[^"#?]*)[^"]*"/g)){
  const url=match[1];if(url==='/'||available.has(url)||available.has(url+'.html'))continue;
  throw Error('Broken local reference '+url+' in '+file);
 }
 pages++;
}
console.log(JSON.stringify({pages,optimizedImages:variants.size,originalImageBytes:originalBytes,smallVariantBytes:smallBytes,smallVariantReductionPercent:Math.round((1-smallBytes/originalBytes)*100)}));
