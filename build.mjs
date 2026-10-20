import { readdir, readFile, writeFile, mkdir, cp, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const out = path.join(root, 'dist');
await mkdir(out, { recursive: true });
async function walk(dir) {
 const result = [];
 for (const entry of await readdir(dir, { withFileTypes: true })) {
  if (entry.name.startsWith('.') || ['dist','node_modules'].includes(entry.name)) continue;
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) result.push(...await walk(full)); else result.push(full);
 }
 return result;
}
const sourceFiles = await walk(root);
const publishFiles = sourceFiles.filter(p => {
 const rel = path.relative(root,p).split(path.sep).join('/');
 return rel.startsWith('assets/') || /\.(html|css|js|xml|txt)$/.test(rel);
});
for (const file of publishFiles) {
 const dest = path.join(out,path.relative(root,file));
 await mkdir(path.dirname(dest), { recursive:true });
 await cp(file,dest);
}
await sharp(path.join(root,'assets/vertical_mix_sgc.png')).resize(148,148,{fit:'contain',background:'#f4f1e9'}).extend({top:16,bottom:16,left:16,right:16,background:'#f4f1e9'}).png().toFile(path.join(out,'apple-touch-icon.png'));

const pages = new Map();
for (const file of publishFiles.filter(p=>p.endsWith('.html'))) pages.set(file,await readFile(file,'utf8'));
const sources = new Set();
for (const html of pages.values()) {
 for (const m of html.matchAll(/<(?:img|video|link)\b[^>]*>/g)) {
  const tag=m[0];
  if(tag.startsWith('<link')&&!tag.includes('as="image"'))continue;
  const src=tag.match(/\b(?:src|poster|href)="([^"]+)"/)?.[1];
  if(src && /\.(?:png|jpe?g|webp)(?:\?|$)/i.test(src))sources.add(src.replaceAll('&amp;','&'));
 }
 for(const m of html.matchAll(/(?:href|content)="((?:https:\/\/www\.steadfastgc\.com)?\/assets\/[^"]+\.(?:png|jpe?g|webp))"/g))sources.add(m[1].replace('https://www.steadfastgc.com',''));
}
for(const p of sourceFiles.filter(p=>/[/\\]assets[/\\]tesla-.*\.(png|jpg|webp)$/i.test(p))) sources.add('/'+path.relative(root,p).split(path.sep).join('/'));

const variants=new Map();
let originalBytes=0, smallestBytes=0;
for(const source of sources) {
 let bytes;
 if(source.startsWith('/')) bytes=await readFile(path.join(root,source.slice(1)));
 else {
  const url=new URL(source);
  if(url.origin!=='https://framerusercontent.com')throw Error('Unapproved image origin: '+url.origin);
  const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('Image fetch failed: '+source+' '+response.status);
  bytes=Buffer.from(await response.arrayBuffer());
 }
 const metadata=await sharp(bytes).metadata();
 const rotated=[5,6,7,8].includes(metadata.orientation);
 const naturalWidth=rotated?metadata.height:metadata.width;
 const naturalHeight=rotated?metadata.width:metadata.height;
 if(!naturalWidth||!naturalHeight)throw Error('Missing dimensions: '+source);
 const key=createHash('sha256').update(bytes).digest('hex').slice(0,16);
 const widths=[...new Set([480,900,1440].map(w=>Math.min(w,naturalWidth)))];
 const entries=[];
 for(const width of widths) {
  let encoded;
  for(const quality of [78,70,62,54,46]) {
   encoded=await sharp(bytes).rotate().resize({width,withoutEnlargement:true}).webp({quality,effort:5}).toBuffer();
   if(encoded.length<=100000)break;
  }
  // Keep a readable full-size image if it needs more bytes at the quality floor.
  const url='/optimized/'+key+'-'+width+'.webp';
  await mkdir(path.join(out,'optimized'),{recursive:true});
  await writeFile(path.join(out,url.slice(1)),encoded);
  const info=await sharp(encoded).metadata();
  entries.push({url,width:info.width,height:info.height,bytes:encoded.length});
 }
 originalBytes+=bytes.length;
 smallestBytes+=entries[0].bytes;
 variants.set(source,{entries,width:naturalWidth,height:naturalHeight});
}
function getVariant(src){return variants.get(src?.replaceAll('&amp;','&').replace('https://www.steadfastgc.com',''));}
function fallback(v){return v.entries.find(e=>e.width>=900)||v.entries.at(-1);}
for(const [file,original] of pages) {
 let html=original;
 if(!html.includes('rel="apple-touch-icon"'))html=html.replace('</head>','<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"></head>');
 html=html.replace(/<img\b[^>]*>/g,tag=>{
  const src=tag.match(/\bsrc="([^"]+)"/)?.[1];
  if(!src && tag.includes('roof-viewer-image'))return tag; // populated only when a photo is opened
  const v=getVariant(src);
  if(!v)return tag;
  const selected=fallback(v);
  tag=tag.replace(/\bsrc="[^"]*"/,'src="'+selected.url+'"').replace(/\s(?:width|height|srcset|sizes)="[^"]*"/g,'');
  const card=html.includes('service-card-grid');
  const gallery=html.includes('roof-grid');
  const sizes=card||gallery?'(max-width: 600px) 92vw, (max-width: 1000px) 46vw, 440px':'(max-width: 760px) 92vw, 60vw';
  return tag.replace(/>$/,' width="'+v.width+'" height="'+v.height+'" srcset="'+v.entries.map(e=>e.url+' '+e.width+'w').join(', ')+'" sizes="'+sizes+'">');
 });
 html=html.replace(/\b(href|poster|content)="([^"]+)"/g,(match,attr,src)=>{
  const v=getVariant(src);if(!v)return match;
  const entry=attr==='poster'||match.includes('hero-poster')?v.entries.at(-1):v.entries.at(-1);
  const prefix=src.startsWith('https://www.steadfastgc.com')?'https://www.steadfastgc.com':'';
  return attr+'="'+prefix+entry.url+'"';
 });
 // The viewer starts with the first photo and adopts each selected photo's dimensions at runtime.
 html=html.replace(/<img\b[^>]*class="roof-viewer-image"[^>]*>/g,tag=>{
  const photo=html.match(/<a\b[^>]*class="roof-photo[^"]*"[^>]*>/)?.[0];
  const src=photo?.match(/href="([^"]+)"/)?.[1];
  const caption=photo?.match(/data-caption="([^"]+)"/)?.[1];
  if(!src||!caption)throw Error('Missing gallery viewer source: '+file);
  const v=[...variants.values()].find(v=>v.entries.some(e=>e.url===src));
  return '<img decoding="async" class="roof-viewer-image" src="'+src+'" alt="'+caption+'" width="'+v.width+'" height="'+v.height+'" loading="lazy">';
 });
 await writeFile(path.join(out,path.relative(root,file)),html);
}
for(const file of publishFiles.filter(p=>p.endsWith('.js')||p.endsWith('.css'))) {
 let code=await readFile(file,'utf8');
 for(const [source,v] of variants)code=code.split(source).join(fallback(v).url);
 await writeFile(path.join(out,path.relative(root,file)),code);
}
const files=await walk(out);
const available=new Set(files.map(p=>'/'+path.relative(out,p).split(path.sep).join('/')));
const titles=new Set(),descriptions=new Set();
let pageCount=0,imageCount=0;
for(const file of files.filter(p=>p.endsWith('.html'))) {
 const html=await readFile(file,'utf8');
 const is404=file.endsWith('404.html');
 const title=html.match(/<title>(.*?)<\/title>/)?.[1];
 const description=html.match(/name="description" content="([^"]+)"/)?.[1];
 if(!title||!description||titles.has(title)||descriptions.has(description))throw Error('Missing or duplicate metadata: '+file);
 if(description.replaceAll('&amp;','&').length>145)throw Error('Long description: '+file);
 titles.add(title);descriptions.add(description);
 if(!is404&&!html.includes('rel="canonical"'))throw Error('Missing canonical: '+file);
 if(!is404&&html.includes('noindex'))throw Error('Unexpected noindex: '+file);
 if((html.match(/<h1\b/g)||[]).length!==1)throw Error('Expected one h1: '+file);
 if(!is404&&!html.includes('<h2'))throw Error('Missing h2: '+file);
 for(const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))JSON.parse(match[1]);
 for(const match of html.matchAll(/<img\b[^>]*>/g)) {
  if(!/\balt="[^"]+"/.test(match[0]))throw Error('Missing image description: '+file);
  if(!/\bwidth="\d+"/.test(match[0])||!/\bheight="\d+"/.test(match[0]))throw Error('Missing image dimensions: '+file+' '+match[0]);
  imageCount++;
 }
 for(const match of html.matchAll(/\b(?:href|src|poster)="(\/[^"#?]*)[^"]*"/g)) {
  const url=match[1];if(url==='/'||available.has(url)||available.has(url+'.html'))continue;
  throw Error('Broken local reference '+url+' in '+file);
 }
 pageCount++;
}
const oversized=[...variants.values()].flatMap(v=>v.entries).filter(e=>e.bytes>100000);
console.log(JSON.stringify({pages:pageCount,imageElements:imageCount,optimizedImages:variants.size,originalBytes,smallestBytes,oversizedVariants:oversized}));
