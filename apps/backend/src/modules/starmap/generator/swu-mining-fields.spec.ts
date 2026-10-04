import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { SWU_PLANET_ARCHETYPES } from './swu-planet-archetypes.generator';
import { getArchetypeGeneratorBundle } from './swu-archetype-registry';
const root='/Users/martsch/core/';
const cats:any=yaml.load(fs.readFileSync(root+'game-data/data/buildings/swu-field-build-categories.yaml','utf8'));
const tileCats=new Map<string,string[]>();
for(const c of cats.fieldBuildCategories) for(const t of c.tiles){tileCats.set(t,[...(tileCats.get(t)??[]),c.id]);}
const res:any=yaml.load(fs.readFileSync(root+'game-data/data/colony-classes/swu-letter-resources.yaml','utf8'));
const letter=new Map<string,any[]>(res.letterResources.map((r:any)=>[r.letter,r.resources]));
const consts=fs.readFileSync(root+'apps/frontend/src/pages/colonies/constants.ts','utf8');
const rockNames=new Set<string>([...consts.matchAll(/^\s+([A-Z]\d[0-9A-Z]{2}): '[^']*Felsplatte'/gm)].map(m=>m[1]));
['B610','J610','K610'].forEach(t=>rockNames.add(t));
function Q(l:string,f=1){const m=new Map<number,number>();for(const e of letter.get(l)??[])m.set(e.commodityId,Math.round(e.planet*f));return m;}
/**
 * Erzquellen Q = Phrik + Kyber + Sondererz der Zonen-Buchstaben (swu-letter-resources.yaml).
 * Mining-Felder X/Y/Z: X = Oberflaeche direkt bergbaubar, Y = Oberflaeche geoengineerbar
 * (bewachsene/bedeckte Felsplatte), Z = Wasser-/Untergrundfeld. Regel: X+Y+Z >= Q und X >= Q/3.
 * Ausnahmen (kein passendes Tile bzw. keine Startplaneten): rein polare A-Zonen, H, Ozean, Archipel.
 */
const EXEMPT_X = (typeId: number, letter: string) =>
  ['H'].includes(letter) || [2, 11].includes(typeId) || ([9, 10].includes(typeId) && letter === 'A');
const EXEMPT_SUM = (letter: string) => letter === 'H';
it('mining fields cover ore sources (X+Y+Z >= Q, X >= Q/3) and seed tiles stay',()=>{
  const out:string[]=[];
  const warn=console.warn;let warns=0;console.warn=()=>{warns++};
  for(const a of SWU_PLANET_ARCHETYPES){
    const b=getArchetypeGeneratorBundle(a.typeId,a.variant);if(!b)continue;
    for(const slot of [1,2,3] as const){
      if(b.seedQuality[slot]==='GAP')continue;
      const l=b.getZoneLetter(slot,'rotating' as any,'x','base');
      const am=Q(l);
      if(b.undergroundMixin){for(const [k,v] of Q(b.undergroundMixin.letter,b.undergroundMixin.factor))am.set(k,(am.get(k)??0)+v);}
      const base=[1511,1508,1505];
      const sp=[...am.entries()].filter(([id])=>!base.includes(id)).sort((x,y)=>y[1]-x[1])[0]?.[1]??0;
      const q=(am.get(1511)??0)+(am.get(1508)??0)+sp;
      const rows:number[][]=[];
      for(let i=0;i<30;i++){
        const seed=`s${i}-zone${slot}`;
        const s=b.generateColonySurface(slot,'rotating' as any,seed,'base').flat();
        const u=b.generateUntergrund(slot,'rotating' as any,seed,'base').flat();
        const has=(t:string,p:string)=>(tileCats.get(t)??[]).some(c=>c===p);
        const x=s.filter(t=>has(t,'bergbau')||has(t,'bergbau_spezial')).length;
        const y=s.filter(t=>rockNames.has(t)&&!(has(t,'bergbau')||has(t,'bergbau_spezial'))).length;
        const z=s.filter(t=>has(t,'bergbau_tiefsee')).length+u.filter(t=>has(t,'bergbau_untergrund')||has(t,'bergbau_tiefsee')).length;
        rows.push([x,y,z]);
      }
      const avg=(k:number)=>(rows.reduce((a,r)=>a+r[k],0)/rows.length).toFixed(1);
      const mn=(k:number)=>Math.min(...rows.map(r=>r[k]));
      const okTot=Math.min(...rows.map(r=>r[0]+r[1]+r[2]));
      const okX=Math.min(...rows.map(r=>r[0]));
      const need=Math.ceil(q/3);
      if(!EXEMPT_SUM(l)) expect({z:`${a.typeName} z${slot}`,sum:okTot>=q}).toEqual({z:`${a.typeName} z${slot}`,sum:true});
      if(!EXEMPT_X(a.typeId,l)) expect({z:`${a.typeName} z${slot}`,x:okX>=need}).toEqual({z:`${a.typeName} z${slot}`,x:true});
      out.push(`${String(a.typeId)+(a.variant??'')} ${a.typeName} z${slot} [${l}] Q=${q} | avg X/Y/Z=${avg(0)}/${avg(1)}/${avg(2)} | min X=${mn(0)} Y=${mn(1)} Z=${mn(2)} sum=${okTot} | ${okTot>=q?'sumOK':'SUM<Q'} ${okX>=Math.ceil(q/3)?'XOK':'X<Q/3('+Math.ceil(q/3)+')'}`);
    }
  }
  console.warn=warn;
  expect(warns).toBe(0); // Seed-Garantie darf nie fehlschlagen
});
