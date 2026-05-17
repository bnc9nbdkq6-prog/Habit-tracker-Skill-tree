'use client'
import { useState, useRef, useEffect, useCallback } from "react"
import { supabase } from './lib/supabase'

const F="'JetBrains Mono',monospace", BG='#0f0f0f', SRF='#131313', SRF2='#1a1a1a'
const BR='#212121', TX='#efefef', TX2='#464646', AC='#4f8ef7', DG='#e05555', WN='#e0a855', OK='#55a86e'

const Lbl=({c})=><div style={{fontSize:'9px',color:'#464646',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'3px'}}>{c}</div>



// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App(){
  const [userId,setUserId]=useState(null)
  const [screen,setScreen]=useState('home') // 'home' | 'skilltree' | 'habittracker'

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      setUserId(session?.user?.id||null)
    })
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{
      setUserId(session?.user?.id||null)
    })
    return()=>subscription.unsubscribe()
  },[])

  if(screen==='skilltree')return <SkillTree onBack={()=>setScreen('home')} userId={userId}/>
  if(screen==='habittracker')return <HabitTracker onBack={()=>setScreen('home')} userId={userId}/>

  // ── Home screen ─────────────────────────────────────────────────────────────
  return(
    <div style={{background:BG,minHeight:'100vh',fontFamily:F,color:TX,display:'flex',flexDirection:'column'}}>
      {/* Header */}
      <div style={{padding:'20px 20px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{fontSize:'9px',color:TX2,letterSpacing:'.2em',textTransform:'uppercase'}}>Mijn Systeem</div>
        <button onClick={()=>supabase.auth.signOut()} style={{background:'none',border:'none',color:TX2,fontFamily:F,fontSize:'9px',cursor:'pointer',letterSpacing:'.1em',textTransform:'uppercase'}}>
          uitloggen
        </button>
      </div>

      {/* Nav cards */}
      <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',gap:'12px',padding:'0 20px',maxWidth:'480px',width:'100%',margin:'0 auto'}}>
        <NavCard
          title="Skill Tree"
          sub="Vaardigheden & voortgang"
          color={OK}
          onClick={()=>setScreen('skilltree')}
        />
        <NavCard
          title="Habit Tracker"
          sub="Dagelijkse gewoonten"
          color={AC}
          onClick={()=>setScreen('habittracker')}
        />
      </div>
    </div>
  )
}

function NavCard({title,sub,color,onClick}){
  const [hov,setHov]=useState(false)
  return(
    <div
      onClick={onClick}
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{
        background:hov?SRF2:SRF,border:`1px solid ${hov?color:BR}`,borderRadius:'4px',
        padding:'20px',cursor:'pointer',transition:'border-color .15s, background .15s'
      }}>
      <div style={{fontSize:'11px',color:color,letterSpacing:'.12em',textTransform:'uppercase',marginBottom:'5px'}}>{title}</div>
      <div style={{fontSize:'11px',color:TX2,letterSpacing:'.05em'}}>{sub}</div>
    </div>
  )
}

function adjColor(hex,amt){
  try{
    let r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16)
    const r1=r/255,g1=g/255,b1=b/255
    const mx=Math.max(r1,g1,b1),mn=Math.min(r1,g1,b1)
    let h,s,l=(mx+mn)/2
    if(mx===mn){h=s=0}else{const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);switch(mx){case r1:h=(g1-b1)/d+(g1<b1?6:0);break;case g1:h=(b1-r1)/d+2;break;default:h=(r1-g1)/d+4};h/=6}
    l=Math.max(0,Math.min(1,l+amt))
    const h2r=(p,q,t)=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p}
    let r2,g2,b2
    if(s===0){r2=g2=b2=l}else{const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;r2=h2r(p,q,h+1/3);g2=h2r(p,q,h);b2=h2r(p,q,h-1/3)}
    const th=x=>Math.round(x*255).toString(16).padStart(2,'0')
    return `#${th(r2)}${th(g2)}${th(b2)}`
  }catch(e){return hex}
}

const ST_DOMAIN_PAL=['#55a86e','#4f8ef7','#e0a855','#e05555','#a855e0','#55c8e0','#e07855','#c0a060']

const INIT_STD=[
  {id:'sd1',name:'Gezondheid',color:'#55a86e'},
  {id:'sd2',name:'Carrière',color:'#4f8ef7'},
  {id:'sd3',name:'Mindset',color:'#e0a855'},
]
const INIT_STP=[
  {id:'sp1',domainId:'sd1',name:'Hardlopen',color:'#6bcf85',description:'Uithoudings-vermogen opbouwen'},
  {id:'sp2',domainId:'sd2',name:'Bedrijf bouwen',color:'#6aa8ff',description:'Ondernemerschap ontwikkelen'},
  {id:'sp3',domainId:'sd3',name:'Dagelijkse meditatie',color:'#f0c060',description:'Mentale discipline trainen'},
]
const mkSTN=(id,pid,title,desc,status,parentId,x,y)=>({
  id,projectId:pid,title,description:desc,achieveDesc:'Omschrijf wanneer dit bereikt is...',
  status,parentId,x,y,isRoot:false,
  dTarget:null,dHard:null,refl:{wellDone:'',obstacles:''}
})
const INIT_STN=[
  {id:'root',projectId:null,title:'Mijn Leven',description:'Startpunt van mijn persoonlijke ontwikkeling',achieveDesc:'Altijd bereikt',status:'completed',parentId:null,x:0,y:0,isRoot:true,dTarget:null,dHard:null,refl:{wellDone:'',obstacles:''}},
  mkSTN('f1','sp1','5km lopen','5km afleggen zonder te stoppen','completed','root',-277,-160),
  mkSTN('f2','sp1','10km lopen','10km in één sessie voltooien','available','f1',-476,-275),
  mkSTN('f3','sp1','Halve marathon','21.1km finishen in officieel event','locked','f2',-675,-390),
  mkSTN('f4','sp1','Marathon','42.2km voltooien','locked','f3',-875,-505),
  mkSTN('b1','sp2','Eerste klant','Eerste betalende klant binnenhalen','available','root',277,-160),
  mkSTN('b2','sp2','€1.000 MRR','Maandelijks €1000 terugkerende omzet','locked','b1',476,-275),
  mkSTN('b3','sp2','€5.000 MRR','Maandelijks €5000 omzet','locked','b2',675,-390),
  mkSTN('b4','sp2','€10.000 MRR','Maandelijks €10k omzet','locked','b3',875,-505),
  mkSTN('m1','sp3','7 dagen streak','7 aaneengesloten meditatiesessies','completed','root',0,-320),
  mkSTN('m2','sp3','30 dagen streak','30 dagen ononderbroken','available','m1',0,-550),
  mkSTN('m3','sp3','100 dagen streak','100 dagen mentale discipline','locked','m2',0,-780),
  mkSTN('m4','sp3','365 dagen streak','Een volledig jaar consistentie','locked','m3',0,-1010),
]

const stDaysDiff=d=>{if(!d)return null;return Math.ceil((new Date(d)-new Date())/86400000)}

// ─── Node Detail Modal ──────────────────────────────────────────────────────
function STNodeModal({node,stProjs,stDomains,onClose,onStartComplete,onUpdate,onDelete}){
  const [tab,setTab]=useState('info')
  const [refl,setRefl]=useState(node.refl||{wellDone:'',obstacles:''})
  const [dTarget,setDTarget]=useState(node.dTarget||'')
  const [dHard,setDHard]=useState(node.dHard||'')
  const [nodeTitle,setNodeTitle]=useState(node.title||'')
  const [nodeProjId,setNodeProjId]=useState(node.projectId||'')
  const [desc,setDesc]=useState(node.description||'')
  const [achieveDesc,setAchieveDesc]=useState(node.achieveDesc||'')
  const proj=stProjs.find(p=>p.id===nodeProjId)||stProjs.find(p=>p.id===node.projectId)
  const color=proj?.color||'#888'
  const tDays=stDaysDiff(dTarget||null)
  const hDays=stDaysDiff(dHard||null)
  const iSt={background:'none',border:'none',borderBottom:`1px solid ${BR}`,color:TX,fontFamily:F,fontSize:'12px',padding:'4px 0',outline:'none',width:'100%',resize:'vertical'}

  const save=()=>{
    onUpdate(node.id,{title:nodeTitle||node.title,projectId:nodeProjId||node.projectId,refl,dTarget:dTarget||null,dHard:dHard||null,description:desc,achieveDesc})
    onClose()
  }

  const statLabel=node.status==='completed'?'BEREIKT':node.status==='available'?'BESCHIKBAAR':'VERGRENDELD'
  const statColor=node.status==='completed'?color:node.status==='available'?'#5a5a5a':'#2a2a2a'

  return(
    <div style={{position:'fixed',inset:0,zIndex:500,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(0,0,0,.88)'}}/>
      <div style={{position:'relative',background:'#0c0c0c',width:'100%',maxWidth:'540px',maxHeight:'82vh',borderRadius:'6px 6px 0 0',display:'flex',flexDirection:'column',border:`1px solid #1c1c1c`,boxShadow:`0 0 60px ${color}18,0 -2px 0 ${color}66`}}>
        {/* Header */}
        <div style={{padding:'18px 20px 0',flexShrink:0}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}}>
            <div style={{flex:1,minWidth:0,paddingRight:'12px'}}>
              <select value={nodeProjId} onChange={e=>setNodeProjId(e.target.value)}
                style={{background:'none',border:'none',color:color,fontFamily:F,fontSize:'8px',letterSpacing:'.12em',textTransform:'uppercase',cursor:'pointer',outline:'none',marginBottom:'6px',padding:'0'}}>
                {stProjs.map(p=><option key={p.id} value={p.id} style={{background:'#111',color:TX}}>{p.name}</option>)}
              </select>
              <input value={nodeTitle} onChange={e=>setNodeTitle(e.target.value)}
                style={{display:'block',width:'100%',background:'none',border:'none',borderBottom:`1px solid ${BR}`,color:TX,fontFamily:F,fontSize:'17px',lineHeight:'1.3',outline:'none',padding:'2px 0'}}/>
            </div>
            <div style={{display:'flex',gap:'8px',alignItems:'center',flexShrink:0}}>
              <div style={{fontSize:'8px',padding:'3px 8px',borderRadius:'2px',border:`1px solid ${statColor}`,color:statColor,letterSpacing:'.08em'}}>{statLabel}</div>
              <button onClick={onClose} style={{background:'none',border:'none',color:TX2,cursor:'pointer',fontSize:'16px',fontFamily:F}}>✕</button>
            </div>
          </div>
          <div style={{display:'flex'}}>
            {[['info','Info'],['reflect','Reflectie'],['deadlines','Deadlines']].map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:'9px 4px',background:'none',border:'none',borderBottom:`2px solid ${tab===k?color:BR}`,color:tab===k?color:TX2,fontFamily:F,fontSize:'9px',cursor:'pointer',letterSpacing:'.08em',textTransform:'uppercase',transition:'color .15s'}}>{l}</button>
            ))}
          </div>
        </div>
        {/* Content */}
        <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>
          {tab==='info'&&(
            <div>
              {proj?.why&&<div style={{fontSize:'10px',color:TX2,letterSpacing:'.04em',fontStyle:'italic',marginBottom:'14px',padding:'8px 12px',borderLeft:`2px solid ${color}55`,background:`${color}08`,borderRadius:'0 3px 3px 0'}}>❝ {proj.why}</div>}
              <div style={{marginBottom:'14px'}}><Lbl c="Beschrijving"/><textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={3} style={iSt}/></div>
              <div style={{marginBottom:'16px'}}><Lbl c="Wanneer is dit bereikt?"/><textarea value={achieveDesc} onChange={e=>setAchieveDesc(e.target.value)} rows={2} style={iSt} placeholder="Omschrijf de definitie van succes..."/></div>
              {node.status==='available'&&(
                <div style={{padding:'14px',background:'#080808',borderRadius:'3px',border:`1px solid ${color}33`,marginTop:'8px'}}>
                  <div style={{fontSize:'9px',color:TX2,letterSpacing:'.06em',marginBottom:'10px'}}>Houd 8 seconden ingedrukt om dit doel als bereikt te markeren</div>
                  <button
                    onMouseDown={e=>{e.stopPropagation();onStartComplete(node.id)}}
                    onMouseUp={e=>{e.stopPropagation()}}
                    onTouchStart={e=>{e.stopPropagation();onStartComplete(node.id)}}
                    onTouchEnd={e=>{e.stopPropagation()}}
                    style={{padding:'9px 20px',background:`${color}15`,border:`1px solid ${color}`,borderRadius:'2px',color:color,fontFamily:F,fontSize:'10px',cursor:'pointer',letterSpacing:'.1em',textTransform:'uppercase'}}>
                    ◉ Ingedrukt houden = bereikt
                  </button>
                </div>
              )}
              {node.status==='locked'&&<div style={{fontSize:'10px',color:'#333',padding:'12px 0'}}>Voltooi het vorige doel om dit te ontgrendelen.</div>}
            </div>
          )}
          {tab==='reflect'&&(
            <div>
              <div style={{marginBottom:'14px'}}><Lbl c="Wat ging goed?"/><textarea value={refl.wellDone} onChange={e=>setRefl(r=>({...r,wellDone:e.target.value}))} rows={5} style={iSt} placeholder="Beschrijf wat goed verliep..."/></div>
              <div><Lbl c="Obstakels & uitdagingen"/><textarea value={refl.obstacles} onChange={e=>setRefl(r=>({...r,obstacles:e.target.value}))} rows={5} style={iSt} placeholder="Wat was moeilijk of onverwacht?"/></div>
            </div>
          )}
          {tab==='deadlines'&&(
            <div>
              <div style={{marginBottom:'18px'}}>
                <Lbl c="Streefdatum — 50/50 kans"/>
                <input type="date" value={dTarget} onChange={e=>setDTarget(e.target.value)} style={{...iSt,colorScheme:'dark',resize:'none'}}/>
                {tDays!==null&&<div style={{fontSize:'9px',color:tDays<0?WN:TX2,marginTop:'5px',letterSpacing:'.04em'}}>{tDays<0?`${-tDays} dagen te laat`:`Nog ${tDays} dagen`}</div>}
              </div>
              <div>
                <Lbl c="Harde deadline"/>
                <input type="date" value={dHard} onChange={e=>setDHard(e.target.value)} style={{...iSt,colorScheme:'dark',resize:'none'}}/>
                {hDays!==null&&<div style={{fontSize:'9px',color:hDays<0?DG:hDays<7?WN:TX2,marginTop:'5px',letterSpacing:'.04em'}}>{hDays<0?`+${-hDays} dagen over tijd`:`Nog ${hDays} dagen`}</div>}
              </div>
            </div>
          )}
        </div>
        <div style={{padding:'12px 20px',borderTop:`1px solid ${BR}`,flexShrink:0,display:'flex',gap:'10px',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',gap:'8px'}}>
            <button onClick={save} style={{padding:'7px 20px',background:color,border:'none',borderRadius:'2px',color:'#000',fontFamily:F,fontSize:'10px',cursor:'pointer',letterSpacing:'.06em',fontWeight:'500'}}>Opslaan</button>
            <button onClick={onClose} style={{padding:'7px 12px',background:'none',border:`1px solid ${BR}`,borderRadius:'2px',color:TX2,fontFamily:F,fontSize:'10px',cursor:'pointer'}}>Annuleer</button>
          </div>
          {!node.isRoot&&onDelete&&<button onClick={()=>{onDelete(node.id);onClose()}}
            style={{padding:'7px 14px',background:'none',border:`1px solid ${DG}33`,borderRadius:'2px',color:DG,fontFamily:F,fontSize:'9px',cursor:'pointer',opacity:.7,letterSpacing:'.06em'}}>
            ✕ Verwijder + subtak
          </button>}
        </div>
      </div>
    </div>
  )
}

// ─── Add Node Form ──────────────────────────────────────────────────────────
function STAddNodeForm({parentId,nodes,stProjs,onAdd,onClose}){
  const [title,setTitle]=useState('')
  const [desc,setDesc]=useState('')
  const par=nodes.find(n=>n.id===parentId)
  const [projId,setProjId]=useState(par?.projectId||stProjs[0]?.id||'')
  const proj=stProjs.find(p=>p.id===projId)
  const color=proj?.color||AC
  const iSt={background:'none',border:'none',borderBottom:`1px solid ${BR}`,color:TX,fontFamily:F,fontSize:'13px',padding:'4px 0',outline:'none',width:'100%'}
  const ss={background:SRF2,border:`1px solid ${BR}`,color:TX,fontFamily:F,fontSize:'11px',padding:'4px 6px',borderRadius:'2px',outline:'none',width:'100%'}

  const submit=()=>{
    if(!title.trim())return
    const siblings=nodes.filter(n=>n.parentId===parentId)
    const spread=Math.max(1,siblings.length)
    const baseAngle=-90+(siblings.length-Math.floor(spread/2))*45
    const rad=baseAngle*Math.PI/180
    const dist=230
    const nx=(par?.x||0)+Math.cos(rad)*dist
    const ny=(par?.y||0)+Math.sin(rad)*dist
    const isParComp=par?.status==='completed'
    onAdd({
      id:'sn'+Date.now(),projectId:projId,title:title.trim(),description:desc,
      achieveDesc:'Omschrijf wanneer dit bereikt is...',
      status:isParComp?'available':'locked',parentId,
      x:nx,y:ny,isRoot:false,dTarget:null,dHard:null,refl:{wellDone:'',obstacles:''}
    })
    onClose()
  }

  return(
    <div style={{position:'fixed',inset:0,zIndex:500,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(0,0,0,.88)'}}/>
      <div style={{position:'relative',background:'#0c0c0c',width:'100%',maxWidth:'540px',borderRadius:'6px 6px 0 0',padding:'20px',border:`1px solid #1c1c1c`,boxShadow:`0 0 50px ${color}14,0 -2px 0 ${color}44`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'18px'}}>
          <span style={{fontSize:'9px',color:TX2,letterSpacing:'.14em',textTransform:'uppercase'}}>Nieuw knooppunt</span>
          <button onClick={onClose} style={{background:'none',border:'none',color:TX2,cursor:'pointer',fontFamily:F,fontSize:'16px'}}>✕</button>
        </div>
        <div style={{marginBottom:'12px'}}><Lbl c="Titel"/><input value={title} onChange={e=>setTitle(e.target.value)} autoFocus onKeyDown={e=>e.key==='Enter'&&submit()} style={iSt} placeholder="Naam van het doel..."/></div>
        <div style={{marginBottom:'12px'}}><Lbl c="Beschrijving"/><input value={desc} onChange={e=>setDesc(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} style={iSt}/></div>
        <div style={{marginBottom:'18px'}}><Lbl c="Project"/>
          <select value={projId} onChange={e=>setProjId(e.target.value)} style={ss}>
            {stProjs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div style={{display:'flex',gap:'10px'}}>
          <button onClick={submit} style={{padding:'8px 22px',background:color,border:'none',borderRadius:'2px',color:'#000',fontFamily:F,fontSize:'10px',cursor:'pointer',letterSpacing:'.06em',fontWeight:'500'}}>+ Toevoegen</button>
          <button onClick={onClose} style={{padding:'8px 14px',background:'none',border:`1px solid ${BR}`,borderRadius:'2px',color:TX2,fontFamily:F,fontSize:'10px',cursor:'pointer'}}>Annuleer</button>
        </div>
      </div>
    </div>
  )
}

// ─── Domain Manager ─────────────────────────────────────────────────────────
// ── Helpers for auto-positioning new nodes ─────────────────────────────────
const calcDomAngle=(domIdx,totalDoms)=>{
  const ARC_START=-210,ARC_END=30
  const t=totalDoms===1?0.5:domIdx/(totalDoms-1)
  return(ARC_START+(ARC_END-ARC_START)*t)*Math.PI/180
}
const calcProjAngle=(domAngle,projIdx,totalProjs)=>{
  const SECTOR=(Math.min(totalProjs-1,3)*18)*Math.PI/180
  const t=totalProjs===1?0.5:projIdx/(totalProjs-1)
  return domAngle-SECTOR/2+SECTOR*t
}

function STDomainManager({domains,stProjs,stNodes,setDomains,setStProjs,setStNodes,onClose,onArchive}){
  const [newDName,setNewDName]=useState('')
  const [newDColor,setNewDColor]=useState('#55a86e')
  const [addProjFor,setAddProjFor]=useState(null)
  const [newPName,setNewPName]=useState('')
  const [newPColor,setNewPColor]=useState('#6bcf85')
  const [newPWhy,setNewPWhy]=useState('')
  const iSt={background:'none',border:'none',borderBottom:`1px solid ${BR}`,color:TX,fontFamily:F,fontSize:'12px',padding:'3px 0',outline:'none',width:'100%'}

  const addDomain=()=>{
    if(!newDName.trim()||domains.length>=6)return
    const ts=Date.now()
    const newDid='dom_'+ts
    const newPid='proj_'+ts
    const newNid='node_'+ts
    // 8 fixed positions clearly spread around root — no two overlap.
    // Derive slot from stNodes so it's always fresh (no stale closure risk).
    // 6 evenly-spaced slots at 60° intervals; first 3 used by initial domains (-150°,-90°,-30°)
    // New domains use slots 3-5: 30°, 90°, 150° — bottom half
    const POSITIONS=[
      {x:277, y:160},   // slot 3: 30° lower-right
      {x:0, y:320},   // slot 4: 90° bottom
      {x:-277, y:160},   // slot 5: 150° lower-left
      {x:275, y:-476},   // slot 6: -60° (fallback)
      {x:550, y:0},   // slot 7: 0° (fallback)
      {x:275, y:476},   // slot 8: 60° (fallback)
    ]
    const rootChildren=(stNodes||[]).filter(n=>n.parentId==='root').length
    const usedSlot=Math.max(0,rootChildren-3) // offset past the 3 initial domains
    const pos_=POSITIONS[Math.min(usedSlot,POSITIONS.length-1)]
    const pos=pos_
    const newD={id:newDid,name:newDName.trim(),color:newDColor}
    const newP={id:newPid,domainId:newDid,name:newDName.trim(),color:newDColor,description:''}
    const newN={
      id:newNid,projectId:newPid,
      title:newDName.trim()+' — Start',
      description:'Eerste stap voor '+newDName.trim(),
      achieveDesc:'Omschrijf wanneer dit bereikt is...',
      status:'available',parentId:'root',
      x:pos.x,y:pos.y,isRoot:false,
      dTarget:null,dHard:null,refl:{wellDone:'',obstacles:''}
    }
    setDomains(ds=>[...ds,newD])
    setStProjs(ps=>[...ps,newP])
    setStNodes(ns=>[...ns,newN])
    setNewDName('')
  }

  const addProject=(d)=>{
    if(!newPName.trim())return
    const pid='sp'+Date.now()
    const newP={id:pid,domainId:d.id,name:newPName.trim(),color:newPColor,description:'',why:newPWhy.trim(),startedAt:new Date().toISOString()}
    setStProjs(ps=>[...ps,newP])
    // Auto-create first node for this project
    const allDomsAfter=[...domains]
    const domIdx=allDomsAfter.findIndex(x=>x.id===d.id)
    const totalDoms=allDomsAfter.length
    const domAngle=calcDomAngle(domIdx,totalDoms)
    // Count projects already in this domain (before adding new one)
    const existingProjs=stProjs.filter(p=>p.domainId===d.id)
    const totalProjs=existingProjs.length+1
    const projAngle=calcProjAngle(domAngle,existingProjs.length,totalProjs)
    const DIST=280
    const nx=Math.cos(projAngle)*DIST
    const ny=Math.sin(projAngle)*DIST
    const firstNode={
      id:'sn'+Date.now(),
      projectId:pid,
      title:newPName.trim()+' — Start',
      description:'Eerste stap voor '+newPName.trim(),
      achieveDesc:'Omschrijf het eerste bereikbare doel...',
      status:'available',
      parentId:'root',
      x:nx,y:ny,isRoot:false,
      dTarget:null,dHard:null,refl:{wellDone:'',obstacles:''}
    }
    setStNodes(ns=>[...ns,firstNode])
    setNewPName('');setNewPWhy('')
    setAddProjFor(null)
  }

  return(
    <div style={{position:'fixed',inset:0,zIndex:500}}>
      <div onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(0,0,0,.88)'}}/>
      <div style={{position:'absolute',top:0,right:0,bottom:0,width:'270px',background:'#090909',display:'flex',flexDirection:'column',border:`1px solid ${BR}`,borderRight:'none'}}>
        <div style={{padding:'16px',borderBottom:`1px solid ${BR}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <span style={{fontSize:'9px',color:TX2,letterSpacing:'.14em',textTransform:'uppercase'}}>Domeinen & Projecten</span>
          <button onClick={onClose} style={{background:'none',border:'none',color:TX2,cursor:'pointer',fontFamily:F,fontSize:'16px'}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'14px 16px'}}>
          {domains.map(d=>(
            <div key={d.id} style={{marginBottom:'20px',paddingBottom:'16px',borderBottom:`1px solid ${BR}`}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'10px'}}>
                <div style={{width:'8px',height:'8px',borderRadius:'50%',background:d.color,boxShadow:`0 0 6px ${d.color}88`}}/>
                <span style={{fontSize:'13px',color:TX,flex:1}}>{d.name}</span>
                <button onClick={()=>{
                  const projIds=stProjs.filter(p=>p.domainId===d.id).map(p=>p.id)
                  setDomains(ds=>ds.filter(x=>x.id!==d.id))
                  setStProjs(ps=>ps.filter(p=>p.domainId!==d.id))
                  setStNodes(ns=>ns.filter(n=>!projIds.includes(n.projectId)))
                }} style={{background:'none',border:'none',color:DG,cursor:'pointer',fontFamily:F,fontSize:'13px',opacity:.7}} title="Verwijder domein">✕</button>
              </div>
              {stProjs.filter(p=>p.domainId===d.id).map(p=>(
                <div key={p.id} style={{display:'flex',alignItems:'center',gap:'7px',padding:'5px 0 5px 14px'}}>
                  <div style={{width:'5px',height:'5px',borderRadius:'50%',background:p.color}}/>
                  <span style={{fontSize:'11px',color:TX2,flex:1}}>{p.name}</span>
{(()=>{
                    const pNodes=stNodes.filter(n=>n.projectId===p.id)
                    const allDone=pNodes.length>0&&pNodes.every(n=>n.status==='completed')
                    return allDone?(
                      <button onClick={()=>{
                        onArchive&&onArchive(p,pNodes)
                        setStProjs(ps=>ps.filter(x=>x.id!==p.id))
                        setStNodes(ns=>ns.filter(n=>n.projectId!==p.id))
                      }} style={{background:'none',border:`1px solid #c9a84c55`,borderRadius:'2px',color:'#c9a84c',cursor:'pointer',fontFamily:F,fontSize:'8px',padding:'1px 5px',whiteSpace:'nowrap'}} title="Project afgerond — archiveer in trofeeënkast">🏆</button>
                    ):(
                      <button onClick={()=>{setStProjs(ps=>ps.filter(x=>x.id!==p.id));setStNodes(ns=>ns.filter(n=>n.projectId!==p.id))}} style={{background:'none',border:'none',color:TX2,cursor:'pointer',fontFamily:F,fontSize:'10px',opacity:.35}}>✕</button>
                    )
                  })()}
                </div>
              ))}
              {addProjFor===d.id?(
                <div style={{padding:'8px 0 0 14px'}}>
                  <div style={{display:'flex',gap:'6px',alignItems:'center',marginBottom:'7px'}}>
                    <input value={newPName} onChange={e=>setNewPName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addProject(d)} placeholder="Project naam..." style={{...iSt,flex:1,fontSize:'11px'}} autoFocus/>
                    <input type="color" value={newPColor} onChange={e=>setNewPColor(e.target.value)} style={{width:'24px',height:'20px',padding:0,border:`1px solid ${BR}`,background:'none',cursor:'pointer',borderRadius:'2px'}}/>
                  </div>
                  <input value={newPWhy} onChange={e=>setNewPWhy(e.target.value)} placeholder="Waarom is dit project belangrijk? (verschijnt bij elke node)" style={{...iSt,fontSize:'10px',marginBottom:'7px',color:TX2}}/>
                  <div style={{display:'flex',gap:'6px'}}>
                    <button onClick={()=>addProject(d)} style={{padding:'3px 10px',background:newPColor,border:'none',borderRadius:'2px',color:'#000',fontFamily:F,fontSize:'9px',cursor:'pointer'}}>+ OK</button>
                    <button onClick={()=>{setAddProjFor(null);setNewPName('');setNewPWhy('')}} style={{padding:'3px 8px',background:'none',border:`1px solid ${BR}`,borderRadius:'2px',color:TX2,fontFamily:F,fontSize:'9px',cursor:'pointer'}}>✕</button>
                  </div>
                </div>
              ):(
                <button onClick={()=>{setAddProjFor(d.id);setNewPColor(adjColor(d.color,0.18))}} style={{marginLeft:'14px',marginTop:'6px',background:'none',border:`1px solid ${BR}`,borderRadius:'2px',color:TX2,fontFamily:F,fontSize:'8px',padding:'2px 9px',cursor:'pointer',letterSpacing:'.08em'}}>+ Project</button>
              )}
            </div>
          ))}
          <div style={{paddingTop:'4px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
              <div style={{fontSize:'9px',color:TX2,letterSpacing:'.1em',textTransform:'uppercase'}}>Nieuw Levensdomein</div>
              <div style={{fontSize:'8px',color:domains.length>=6?DG:TX2}}>{domains.length}/6</div>
            </div>
            {domains.length>=6&&<div style={{fontSize:'9px',color:DG,marginBottom:'8px',letterSpacing:'.04em'}}>Maximum bereikt</div>}
            <div style={{display:'flex',gap:'8px',alignItems:'center',marginBottom:'8px'}}>
              <input value={newDName} onChange={e=>setNewDName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addDomain()} placeholder="Naam..." style={{...iSt,flex:1}}/>
              <input type="color" value={newDColor} onChange={e=>setNewDColor(e.target.value)} style={{width:'26px',height:'22px',padding:0,border:`1px solid ${BR}`,background:'none',cursor:'pointer',borderRadius:'2px'}}/>
            </div>
            <button onClick={addDomain} style={{padding:'6px 16px',background:newDColor,border:'none',borderRadius:'2px',color:'#000',fontFamily:F,fontSize:'10px',cursor:'pointer',letterSpacing:'.06em'}}>+ Toevoegen</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Skill Tree ─────────────────────────────────────────────────────────
function SkillTree({onBack,userId}){
  // ── State (init uit localStorage voor directe weergave) ──────────────────
  const [stDomains,setStDomains]=useState(()=>{try{const s=localStorage.getItem('st_domains_'+userId);return s?JSON.parse(s):INIT_STD}catch{return INIT_STD}})
  const [stProjs,setStProjs]=useState(()=>{try{const s=localStorage.getItem('st_projs_'+userId);return s?JSON.parse(s):INIT_STP}catch{return INIT_STP}})
  const [stNodes,setStNodes]=useState(()=>{try{const s=localStorage.getItem('st_nodes_'+userId);return s?JSON.parse(s):INIT_STN}catch{return INIT_STN}})
  const [labelPos,setLabelPos_]=useState(()=>{try{const s=localStorage.getItem('st_label_pos_'+userId);return s?JSON.parse(s):{}}catch{return{}}})
  const [stLoaded,setStLoaded]=useState(false)
  const stSaveRef=useRef(null)
  const stPending=useRef(false)
  const [showTrophies,setShowTrophies]=useState(false)
  const [trophyNotes,setTrophyNotes]=useState(()=>{try{const s=localStorage.getItem('st_trophy_notes');return s?JSON.parse(s):{}}catch{return{}}})
  const [archivedProjs,setArchivedProjs]=useState(()=>{try{const s=localStorage.getItem('st_archived_projs');return s?JSON.parse(s):[]}catch{return[]}})
  const [achieveModal,setAchieveModal]=useState(null) // {nodeId, nodeTitle, reflText}

  // ── Load: zelfde patroon als taken ───────────────────────────────────────
  useEffect(()=>{
    if(!userId)return
    const load=async()=>{
      try{
        const[{data:doms},{data:projs},{data:nodes},{data:lpos}]=await Promise.all([
          supabase.from('st_domains').select('*').eq('user_id',userId).order('sort_order'),
          supabase.from('st_projects').select('*').eq('user_id',userId),
          supabase.from('st_nodes').select('*').eq('user_id',userId),
          supabase.from('st_label_positions').select('positions').eq('user_id',userId).maybeSingle(),
        ])
        if(!stPending.current){
          if(doms?.length){const m=doms.map(r=>({id:r.id,name:r.name,color:r.color,sort_order:r.sort_order}));setStDomains(m);try{localStorage.setItem('st_domains_'+userId,JSON.stringify(m))}catch{}}
          if(projs?.length){const m=projs.map(r=>({id:r.id,domainId:r.domain_id,name:r.name,color:r.color,description:r.description||'',why:r.why||'',startedAt:r.started_at||null}));setStProjs(m);try{localStorage.setItem('st_projs_'+userId,JSON.stringify(m))}catch{}}
          if(nodes?.length){const m=nodes.map(r=>({id:r.id,projectId:r.project_id,title:r.title,description:r.description||'',achieveDesc:r.achieve_desc||'',status:r.status||'locked',parentId:r.parent_id||null,x:r.x||0,y:r.y||0,isRoot:r.is_root||false,dTarget:r.d_target||null,dHard:r.d_hard||null,refl:r.refl||{wellDone:'',obstacles:''}}));setStNodes(m);try{localStorage.setItem('st_nodes_'+userId,JSON.stringify(m))}catch{}}
          if(lpos?.positions){setLabelPos_(lpos.positions);try{localStorage.setItem('st_label_pos_'+userId,JSON.stringify(lpos.positions))}catch{}}
        }
      }catch(e){console.error('[ST load]',e)
      }finally{setStLoaded(true)}
    }
    load()
    const ch=supabase.channel('st-'+userId)
      .on('postgres_changes',{event:'*',schema:'public',table:'st_nodes',filter:`user_id=eq.${userId}`},()=>load())
      .on('postgres_changes',{event:'*',schema:'public',table:'st_domains',filter:`user_id=eq.${userId}`},()=>load())
      .on('postgres_changes',{event:'*',schema:'public',table:'st_projects',filter:`user_id=eq.${userId}`},()=>load())
      .subscribe()
    const onVisible=()=>{if(document.visibilityState==='visible')load()}
    document.addEventListener('visibilitychange',onVisible)
    return()=>{supabase.removeChannel(ch);document.removeEventListener('visibilitychange',onVisible)}
  },[userId])

  // ── Save: localStorage direct, Supabase na 800ms (zelfde patroon als taken) ─
  useEffect(()=>{
    if(!userId||!stLoaded)return
    try{localStorage.setItem('st_domains_'+userId,JSON.stringify(stDomains))}catch{}
    try{localStorage.setItem('st_projs_'+userId,JSON.stringify(stProjs))}catch{}
    try{localStorage.setItem('st_nodes_'+userId,JSON.stringify(stNodes))}catch{}
    try{localStorage.setItem('st_label_pos_'+userId,JSON.stringify(labelPos))}catch{}
    clearTimeout(stSaveRef.current)
    stPending.current=true
    stSaveRef.current=setTimeout(async()=>{
      try{
        if(stDomains.length){
          await supabase.from('st_domains').upsert(stDomains.map((d,i)=>({id:d.id,user_id:userId,name:d.name,color:d.color,sort_order:i})),{onConflict:'id'})
          const dIds=stDomains.map(d=>d.id)
          await supabase.from('st_domains').delete().eq('user_id',userId).not('id','in',`(${dIds.map(id=>`'${id}'`).join(',')})`)
        }
        if(stProjs.length){
          await supabase.from('st_projects').upsert(stProjs.map(p=>({id:p.id,user_id:userId,domain_id:p.domainId,name:p.name,color:p.color,description:p.description||'',why:p.why||'',started_at:p.startedAt||null})),{onConflict:'id'})
          const pIds=stProjs.map(p=>p.id)
          await supabase.from('st_projects').delete().eq('user_id',userId).not('id','in',`(${pIds.map(id=>`'${id}'`).join(',')})`)
        }
        if(stNodes.length){
          const rows=stNodes.map(n=>({id:n.id,user_id:userId,project_id:n.projectId||null,title:n.title||'',description:n.description||'',achieve_desc:n.achieveDesc||'',status:n.status||'locked',parent_id:n.parentId||null,x:n.x||0,y:n.y||0,is_root:n.isRoot||false,d_target:n.dTarget||null,d_hard:n.dHard||null,refl:n.refl||{wellDone:'',obstacles:''}}))
          await supabase.from('st_nodes').upsert(rows,{onConflict:'id'})
          const ids=stNodes.map(n=>n.id)
          await supabase.from('st_nodes').delete().eq('user_id',userId).not('id','in',`(${ids.map(id=>`'${id}'`).join(',')})`)
        }
        await supabase.from('st_label_positions').upsert({user_id:userId,positions:labelPos},{onConflict:'user_id'})
      }catch(e){console.error('[ST save]',e)
      }finally{stPending.current=false}
    },800)
  },[stDomains,stProjs,stNodes,labelPos,userId,stLoaded])
  useEffect(()=>{try{localStorage.setItem('st_trophy_notes',JSON.stringify(trophyNotes))}catch{}},[trophyNotes])
  const [tf,setTf]=useState({x:0,y:0,scale:0.48})
  const [editMode,setEditMode]=useState(false)
  const labelDragRef=useRef({active:false,did:null,ox:0,oy:0})
  const [selNode,setSelNode]=useState(null)
  const [holdP,setHoldP]=useState({id:null,prog:0})
  const [flash,setFlash]=useState(0)
  const [shakeMag,setShakeMag]=useState(0)
  const [showDomains,setShowDomains]=useState(false)
  const [addFor,setAddFor]=useState(null)
  const [inited,setInited]=useState(false)
  const [tooltip,setTooltip]=useState(null)

  const svgRef=useRef(null)
  const holdRef=useRef({id:null,prog:0,phase:null,raf:null,audioCtx:null,droneOsc:null,droneGain:null,lastHBTime:0})
  const panRef=useRef({active:false,sx:0,sy:0,tx0:0,ty0:0})
  const pinchRef=useRef({active:false,dist0:0,scale0:1,mx:0,my:0})
  const dragRef=useRef({active:false,nid:null,ox:0,oy:0})
  const tfRef=useRef(tf)
  useEffect(()=>{tfRef.current=tf},[tf])

  // Center tree on mount
  useEffect(()=>{
    if(inited||!svgRef.current)return
    const r=svgRef.current.getBoundingClientRect()
    setTf({x:r.width/2,y:r.height*0.78,scale:0.44})
    setInited(true)
  })

  const getColor=n=>{
    if(!n.projectId)return '#999'
    return stProjs.find(p=>p.id===n.projectId)?.color||'#777'
  }

  // ── Audio helpers ───────────────────────────────────────────────────────
  const playHB=useCallback((ctx,prog)=>{
    try{
      const now=ctx.currentTime,vol=0.18+prog*0.32
      const pp=(f,t,v)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=f;o.type='sine';g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.04);g.gain.exponentialRampToValueAtTime(0.001,t+0.25);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+0.25)}
      pp(115,now,vol);pp(85,now+0.19,vol*0.75)
    }catch(e){}
  },[])

  // ── Hold ────────────────────────────────────────────────────────────────
  const startHold=useCallback((nid)=>{
    const node=stNodes.find(n=>n.id===nid)
    if(!node||node.status!=='available')return
    const hr=holdRef.current
    hr.id=nid
    if(hr.phase!=='receding')hr.prog=0
    hr.phase='filling'
    hr.lastHBTime=0
    // Audio
    try{
      if(hr.audioCtx&&hr.audioCtx.state!=='closed'){try{hr.droneOsc?.stop()}catch(e){}}
      hr.audioCtx=new(window.AudioContext||window.webkitAudioContext)()
      hr.droneOsc=hr.audioCtx.createOscillator()
      hr.droneGain=hr.audioCtx.createGain()
      hr.droneOsc.frequency.value=48;hr.droneOsc.type='sine'
      hr.droneGain.gain.value=0
      hr.droneOsc.connect(hr.droneGain);hr.droneGain.connect(hr.audioCtx.destination)
      hr.droneOsc.start()
    }catch(e){}
    if(hr.raf)cancelAnimationFrame(hr.raf)
    let last=null
    const tick=t=>{
      if(!last)last=t
      const dt=t-last;last=t
      const hr=holdRef.current;if(!hr.id)return
      if(hr.phase==='filling') hr.prog=Math.min(1,hr.prog+dt/8000)
      else if(hr.phase==='receding'){
        hr.prog=Math.max(0,hr.prog-dt/8000)
        if(hr.prog<=0){hr.phase=null;hr.id=null;setHoldP({id:null,prog:0});setShakeMag(0);return}
      }
      // Audio update
      try{
        if(hr.droneGain)hr.droneGain.gain.value=hr.prog*0.6
        if(hr.droneOsc)hr.droneOsc.frequency.value=48+hr.prog*28
        const bpm=55+hr.prog*130,hbInt=60000/bpm
        if(t-hr.lastHBTime>hbInt){playHB(hr.audioCtx,hr.prog);hr.lastHBTime=t}
      }catch(e){}
      // Haptic - escalating
      if(hr.prog>0&&navigator.vibrate){
        const p=hr.prog
        if(p>0.75&&Math.random()<p*0.25)navigator.vibrate(Math.floor(p*p*120))
        else if(p>0.4&&Math.random()<p*0.08)navigator.vibrate(Math.floor(p*60))
        else if(Math.random()<p*0.03)navigator.vibrate(Math.floor(p*30))
      }
      setHoldP({id:hr.id,prog:hr.prog})
      setShakeMag(hr.phase==='filling'?hr.prog*hr.prog*14:0)
      if(hr.prog>=1){completeNode(hr.id);hr.id=null;hr.phase=null;return}
      hr.raf=requestAnimationFrame(tick)
    }
    hr.raf=requestAnimationFrame(tick)
  },[stNodes,playHB])

  const stopHold=useCallback(()=>{
    const hr=holdRef.current
    if(!hr.id||hr.phase!=='filling')return
    hr.phase='receding'
    try{if(hr.droneGain&&hr.audioCtx)hr.droneGain.gain.setTargetAtTime(0,hr.audioCtx.currentTime,0.4)}catch(e){}
  },[])

  const completeNode=useCallback((nid)=>{
    // Stop drone — fade out over 2.5s matching the flash
    try{
      const hr=holdRef.current
      if(hr.droneGain&&hr.audioCtx&&hr.audioCtx.state!=='closed'){
        hr.droneGain.gain.cancelScheduledValues(hr.audioCtx.currentTime)
        hr.droneGain.gain.setValueAtTime(hr.droneGain.gain.value,hr.audioCtx.currentTime)
        hr.droneGain.gain.linearRampToValueAtTime(0,hr.audioCtx.currentTime+2.5)
        hr.droneOsc&&setTimeout(()=>{try{hr.droneOsc.stop()}catch(e){}},2600)
      }
      hr.droneOsc=null;hr.droneGain=null
    }catch(e){}
    setFlash(1)
    navigator.vibrate&&navigator.vibrate([40,20,80,30,120,40,200,60,400])
    // Completion boom
    try{
      const ctx=new(window.AudioContext||window.webkitAudioContext)()
      const o=ctx.createOscillator(),g=ctx.createGain()
      o.frequency.value=62;o.type='sine'
      g.gain.setValueAtTime(1,ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+3)
      o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+3)
    }catch(e){}
    let f=1
    const fade=()=>{f-=0.01;if(f>0){setFlash(f);requestAnimationFrame(fade)}else setFlash(0)}
    setTimeout(()=>requestAnimationFrame(fade),350)
    setStNodes(prev=>{
      const updated=prev.map(n=>{
        if(n.id===nid)return{...n,status:'completed'}
        if(n.parentId===nid&&n.status==='locked')return{...n,status:'available'}
        return n
      })
      const completedNode=updated.find(n=>n.id===nid)
      setTimeout(()=>setAchieveModal({nodeId:nid,nodeTitle:completedNode?.title||'Doel',reflText:''}),800)
      return updated
    })
    setHoldP({id:null,prog:0});setShakeMag(0);setSelNode(null)
  },[])

  // ── Pan/Zoom ────────────────────────────────────────────────────────────
  const onWheel=useCallback(e=>{
    e.preventDefault()
    const f=e.deltaY>0?0.91:1.1
    const r=svgRef.current?.getBoundingClientRect();if(!r)return
    const cx=e.clientX-r.left,cy=e.clientY-r.top
    setTf(t=>{const ns=Math.max(0.1,Math.min(5,t.scale*f));return{x:cx-(cx-t.x)*(ns/t.scale),y:cy-(cy-t.y)*(ns/t.scale),scale:ns}})
  },[])
  useEffect(()=>{const el=svgRef.current;if(!el)return;el.addEventListener('wheel',onWheel,{passive:false});return()=>el.removeEventListener('wheel',onWheel)},[onWheel])

  const toWorld=(cx,cy,t)=>({wx:(cx-t.x)/t.scale,wy:(cy-t.y)/t.scale})

  const onSvgMD=e=>{
    if(e.button!==0)return
    if(e.target.closest('[data-node]')||e.target.closest('[data-add]'))return
    if(labelDragRef.current.active)return // label drag takes priority
    panRef.current={active:true,sx:e.clientX,sy:e.clientY,tx0:tf.x,ty0:tf.y}
  }
  const onSvgMM=useCallback(e=>{
    if(labelDragRef.current.active&&editMode){
      const r=svgRef.current?.getBoundingClientRect();if(!r)return
      const{wx,wy}=toWorld(e.clientX-r.left,e.clientY-r.top,tf)
      const did=labelDragRef.current.did
      setLabelPos_(p=>({...p,[did]:{x:wx+labelDragRef.current.ox,y:wy+labelDragRef.current.oy}}))
      return
    }
    if(panRef.current.active)setTf(t=>({...t,x:panRef.current.tx0+(e.clientX-panRef.current.sx),y:panRef.current.ty0+(e.clientY-panRef.current.sy)}))
    if(dragRef.current.active&&editMode){
      const r=svgRef.current?.getBoundingClientRect();if(!r)return
      const{wx,wy}=toWorld(e.clientX-r.left,e.clientY-r.top,tf)
      setStNodes(prev=>prev.map(n=>n.id===dragRef.current.nid?{...n,x:wx+dragRef.current.ox,y:wy+dragRef.current.oy}:n))
    }
  },[editMode,tf])
  const onSvgMU=()=>{panRef.current.active=false;dragRef.current.active=false;labelDragRef.current.active=false}

  const onTSD=e=>{
    if(e.touches.length===1){
      if(labelDragRef.current.active)return
      const t=e.touches[0];panRef.current={active:true,sx:t.clientX,sy:t.clientY,tx0:tf.x,ty0:tf.y}
    }
    if(e.touches.length===2){
      panRef.current.active=false
      const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY
      const mx=(e.touches[0].clientX+e.touches[1].clientX)/2,my=(e.touches[0].clientY+e.touches[1].clientY)/2
      const r=svgRef.current?.getBoundingClientRect()||{left:0,top:0}
      pinchRef.current={active:true,dist0:Math.hypot(dx,dy),scale0:tf.scale,mx:mx-r.left,my:my-r.top}
    }
  }
  const onTSM=useCallback(e=>{
    e.preventDefault()
    if(e.touches.length===1&&labelDragRef.current.active&&editMode){
      const r=svgRef.current?.getBoundingClientRect();if(!r)return
      const t=e.touches[0];const{wx,wy}=toWorld(t.clientX-r.left,t.clientY-r.top,tf)
      const did=labelDragRef.current.did
      setLabelPos_(p=>({...p,[did]:{x:wx+labelDragRef.current.ox,y:wy+labelDragRef.current.oy}}))
      return
    }
    if(e.touches.length===1&&panRef.current.active){const t=e.touches[0];setTf(tf=>({...tf,x:panRef.current.tx0+(t.clientX-panRef.current.sx),y:panRef.current.ty0+(t.clientY-panRef.current.sy)}))}
    if(e.touches.length===2&&pinchRef.current.active){
      const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY
      const dist=Math.hypot(dx,dy),{dist0,scale0,mx,my}=pinchRef.current
      setTf(t=>{const ns=Math.max(0.1,Math.min(5,scale0*(dist/dist0)));return{x:mx-(mx-t.x)*(ns/t.scale),y:my-(my-t.y)*(ns/t.scale),scale:ns}})
    }
  },[editMode,tf])
  const onTSE=()=>{panRef.current.active=false;pinchRef.current.active=false;labelDragRef.current.active=false}
  useEffect(()=>{const el=svgRef.current;if(!el)return;el.addEventListener('touchmove',onTSM,{passive:false});return()=>el.removeEventListener('touchmove',onTSM)},[onTSM])

  // ── Render ──────────────────────────────────────────────────────────────
  const NR=26,RR=38
  const sx=shakeMag>0?(Math.random()-0.5)*shakeMag*2.5:0
  const sy=shakeMag>0?(Math.random()-0.5)*shakeMag*2.5:0

  // ── Compute domain layout: each domain gets a radial arm from root ──
  // Domains are evenly spaced in a 240° arc (bottom 120° reserved for root label)
  const N_DOM=Math.min(6,stDomains.length)
  const ARC_START=-210, ARC_END=30 // degrees, clockwise from top
  const DOM_R=320 // distance from root to domain hub node
  const PROJ_STEP=240 // distance along arm per project branch
  const NODE_STEP=210 // distance per node along a project arm

  const domainLayout=stDomains.slice(0,6).map((d,i)=>{
    const t=N_DOM===1?0.5:(i/(N_DOM-1))
    const angleDeg=ARC_START+(ARC_END-ARC_START)*t
    const rad=angleDeg*Math.PI/180
    return{...d,angle:rad,hubX:Math.cos(rad)*DOM_R,hubY:Math.sin(rad)*DOM_R}
  })

  // Build layout-computed positions for "auto" nodes (those tied to domains/projects)
  // We don't move manually-placed nodes (stNodes already have x,y).
  // Domain labels only — rendered as SVG text, not nodes

  const lines=stNodes.filter(n=>n.parentId).map(n=>{
    const par=stNodes.find(p=>p.id===n.parentId);if(!par)return null
    const color=getColor(n)
    const isComp=n.status==='completed'
    const isHold=holdP.id===n.id
    const len=Math.hypot(n.x-par.x,n.y-par.y)
    const filled=isComp?len:isHold?len*holdP.prog:0
    return(
      <g key={`ln-${n.id}`}>
        <line x1={par.x} y1={par.y} x2={n.x} y2={n.y} stroke="#151515" strokeWidth={2.5} opacity={n.status==='locked'?0.4:0.8}/>
        {filled>0&&(
          <line x1={par.x} y1={par.y} x2={n.x} y2={n.y}
            stroke={color} strokeWidth={isComp?3:3.5}
            strokeDasharray={`${filled} ${len}`} strokeLinecap="round"
            style={{filter:`drop-shadow(0 0 6px ${color}) drop-shadow(0 0 16px ${color}bb) drop-shadow(0 0 32px ${color}55)`,transition:isComp?'none':''}}/>
        )}
      </g>
    )
  })

  // Domain label elements — big text in domain color above each domain's hub area
  const domainLabels=domainLayout.map(d=>{
    const projIds=stProjs.filter(p=>p.domainId===d.id).map(p=>p.id)
    const domNodes=stNodes.filter(n=>projIds.includes(n.projectId))
    if(!domNodes.length)return null
    // Default: perpendicular to arm, 220px from centroid
    const farthest=domNodes.reduce((best,n)=>Math.hypot(n.x,n.y)>Math.hypot(best.x,best.y)?n:best,domNodes[0])
    const armAngle=Math.atan2(farthest.y,farthest.x)
    const perpAngle=armAngle+Math.PI/2
    const cx=domNodes.reduce((s,n)=>s+n.x,0)/domNodes.length
    const cy=domNodes.reduce((s,n)=>s+n.y,0)/domNodes.length
    const defLx=cx+Math.cos(perpAngle)*220, defLy=cy+Math.sin(perpAngle)*220
    // User-overridden position takes priority
    const lx=labelPos[d.id]?.x??defLx
    const ly=labelPos[d.id]?.y??defLy
    const isDragging=editMode
    const startLabelDrag=(clientX,clientY)=>{
      const rect=svgRef.current?.getBoundingClientRect()||{left:0,top:0}
      const{wx,wy}=toWorld(clientX-rect.left,clientY-rect.top,tf)
      labelDragRef.current={active:true,did:d.id,ox:lx-wx,oy:ly-wy}
    }
    return(
      <g key={`dlbl-${d.id}`}>
        {/* Big transparent hitbox — catches events even when text has pointerEvents:none */}
        {isDragging&&<rect
          x={lx-220} y={ly-44} width={440} height={88} rx={4}
          fill="transparent"
          stroke={d.color} strokeWidth={1} strokeDasharray="5 4" opacity={0.5}
          style={{cursor:'grab'}}
          onMouseDown={e=>{e.stopPropagation();startLabelDrag(e.clientX,e.clientY)}}
          onTouchStart={e=>{e.preventDefault();const t=e.touches[0];startLabelDrag(t.clientX,t.clientY)}}
        />}
        <text x={lx} y={ly}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={52} fontFamily="'JetBrains Mono',monospace" fontWeight="500"
          fill={d.color} opacity={0.82} letterSpacing="4"
          style={{userSelect:'none',pointerEvents:'none',
            filter:`drop-shadow(0 0 20px ${d.color}99) drop-shadow(0 0 45px ${d.color}44)`}}>
          {d.name.toUpperCase()}
        </text>
        {isDragging&&<text x={lx} y={ly+50}
          textAnchor="middle" fontSize={8} fontFamily="'JetBrains Mono',monospace"
          fill={d.color} opacity={0.45} style={{userSelect:'none',pointerEvents:'none'}}>
          sleep om te verplaatsen
        </text>}
      </g>
    )
  }).filter(Boolean)

  const nodeEls=stNodes.map(n=>{
    const r=n.isRoot?RR:NR
    const color=getColor(n)
    const hp=holdP.id===n.id?holdP.prog:0
    const circ=2*Math.PI*r,filledDash=circ*hp

    let fill='#0c0c0c',stroke='#1e1e1e',strokeW=1.5,flt='',opacity=1
    if(n.status==='completed'){fill=`${color}22`;stroke=color;strokeW=3;flt=`drop-shadow(0 0 10px ${color}) drop-shadow(0 0 24px ${color}88) drop-shadow(0 0 48px ${color}33)`}
    else if(n.status==='available'){fill='#0f0f0f';stroke='#3f3f3f';strokeW=2}
    else{fill='#111111';stroke='#2c2c2c';strokeW=1.5;opacity=0.78}

    const hDays=stDaysDiff(n.dHard)
    const tDays=stDaysDiff(n.dTarget)
    const deadlineColor=hDays!==null&&hDays<0?DG:tDays!==null&&tDays<0?WN:null
    const deadlineTxt=hDays!==null&&hDays<0?`+${-hDays}d`:tDays!==null&&tDays<0?`+${-tDays}d`:null

    const onNMD=e=>{
      e.stopPropagation()
      if(editMode){
        const rect=svgRef.current?.getBoundingClientRect()||{left:0,top:0}
        const{wx,wy}=toWorld(e.clientX-rect.left,e.clientY-rect.top,tf)
        dragRef.current={active:true,nid:n.id,ox:n.x-wx,oy:n.y-wy}
      } else startHold(n.id)
    }

    return(
      <g key={n.id} data-node="1" transform={`translate(${n.x},${n.y})`} opacity={opacity} style={{filter:flt}}>
        {n.status==='completed'&&<>
          <circle r={r+14} fill="none" stroke={color} strokeWidth={0.6} opacity={0.1}/>
          <circle r={r+8} fill="none" stroke={color} strokeWidth={1.5} opacity={0.32}/>
        </>}
        <circle r={r} fill={fill} stroke={stroke} strokeWidth={strokeW}/>
        {hp>0&&(
          <circle r={r} fill="none" stroke={color} strokeWidth={4.5}
            strokeDasharray={`${filledDash} ${circ}`} strokeLinecap="round"
            transform="rotate(-90)"
            style={{filter:`drop-shadow(0 0 10px ${color})`}}/>
        )}
        {n.status==='locked'&&<>
          <text textAnchor="middle" dominantBaseline="middle" fontSize={r*0.55} fill="#3a3a3a" style={{userSelect:'none',pointerEvents:'none'}}>⚿</text>
          <text y={r*0.52} textAnchor="middle" dominantBaseline="middle" fontSize={6.5} fill="#2e2e2e" fontFamily="'JetBrains Mono',monospace" style={{userSelect:'none',pointerEvents:'none'}}>{n.title.length>10?n.title.slice(0,9)+'…':n.title}</text>
        </>}
        {n.status!=='locked'&&(
          <text textAnchor="middle" dominantBaseline="middle"
            fontSize={n.isRoot?10:8}
            fill={n.status==='completed'?color:'#666'}
            fontFamily="'JetBrains Mono',monospace"
            style={{userSelect:'none',pointerEvents:'none'}}>
            {n.title.length>12?n.title.slice(0,11)+'…':n.title}
          </text>
        )}
        {deadlineTxt&&n.status!=='completed'&&(
          <text y={r+14} textAnchor="middle" fontSize={7} fill={deadlineColor} fontFamily="'JetBrains Mono',monospace" style={{userSelect:'none',pointerEvents:'none'}}>{deadlineTxt}</text>
        )}
        {/* Interaction layer */}
        <circle r={r+5} fill="transparent"
          style={{cursor:editMode?'grab':n.status==='available'?'pointer':n.status==='completed'?'pointer':'not-allowed'}}
          onMouseDown={onNMD}
          onMouseUp={e=>{e.stopPropagation();stopHold();dragRef.current.active=false}}
          onMouseLeave={()=>stopHold()}
          onMouseEnter={()=>setTooltip({id:n.id,title:n.title,desc:n.achieveDesc||n.description,color:getColor(n)})}
          onClick={e=>{e.stopPropagation();if(!editMode)setSelNode(stNodes.find(x=>x.id===n.id))}}
          onTouchStart={e=>{
            e.stopPropagation()
            if(editMode){
              e.preventDefault()
              const t=e.touches[0]
              const rect=svgRef.current?.getBoundingClientRect()||{left:0,top:0}
              const{wx,wy}=toWorld(t.clientX-rect.left,t.clientY-rect.top,tfRef.current)
              dragRef.current={active:true,nid:n.id,ox:n.x-wx,oy:n.y-wy}
              // Document-level handlers voor iOS drag
              const onDocMove=ev=>{
                if(!dragRef.current.active)return
                ev.preventDefault()
                const touch=ev.touches[0]
                const r=svgRef.current?.getBoundingClientRect()
                if(!r)return
                const{wx:nx,wy:ny}=toWorld(touch.clientX-r.left,touch.clientY-r.top,tfRef.current)
                setStNodes(prev=>prev.map(nd=>nd.id===dragRef.current.nid?{...nd,x:nx+dragRef.current.ox,y:ny+dragRef.current.oy}:nd))
              }
              const onDocEnd=()=>{
                dragRef.current.active=false
                document.removeEventListener('touchmove',onDocMove)
                document.removeEventListener('touchend',onDocEnd)
              }
              document.addEventListener('touchmove',onDocMove,{passive:false})
              document.addEventListener('touchend',onDocEnd)
            }else startHold(n.id)
          }}
          onTouchEnd={e=>{e.stopPropagation();stopHold()}}
        />
        {/* Edit: + child */}
        {editMode&&(
          <g data-add="1" transform={`translate(${r+2},${-(r+2)})`} onClick={e=>{e.stopPropagation();setAddFor(n.id)}} style={{cursor:'pointer'}}>
            <circle r={11} fill={AC} opacity={0.9}/>
            <text textAnchor="middle" dominantBaseline="middle" fontSize={16} fill="#fff" fontFamily="sans-serif" style={{userSelect:'none'}}>+</text>
          </g>
        )}
        {/* Edit: delete node (non-root only) */}
        {editMode&&!n.isRoot&&(
          <g transform={`translate(${-(r+2)},${-(r+2)})`} style={{cursor:'pointer'}}
            onClick={e=>{
              e.stopPropagation()
              const collect=(nid,all)=>{const ch=all.filter(x=>x.parentId===nid);return[nid,...ch.flatMap(c=>collect(c.id,all))]}
              setStNodes(prev=>{const toRemove=new Set(collect(n.id,prev));return prev.filter(x=>!toRemove.has(x.id))})
            }}
            onTouchEnd={e=>{
              e.stopPropagation();e.preventDefault()
              const collect=(nid,all)=>{const ch=all.filter(x=>x.parentId===nid);return[nid,...ch.flatMap(c=>collect(c.id,all))]}
              setStNodes(prev=>{const toRemove=new Set(collect(n.id,prev));return prev.filter(x=>!toRemove.has(x.id))})
            }}>
            <circle r={11} fill={DG} opacity={0.9}/>
            <text textAnchor="middle" dominantBaseline="middle" fontSize={14} fill="#fff" fontFamily="sans-serif" style={{userSelect:'none'}}>✕</text>
          </g>
        )}
      </g>
    )
  })

  const resetView=()=>{
    const r=svgRef.current?.getBoundingClientRect()
    if(r)setTf({x:r.width/2,y:r.height*0.78,scale:0.44})
  }

  return(
    <div style={{position:'fixed',inset:0,background:'#050505',fontFamily:F,overflow:'hidden',userSelect:'none'}}>
      {/* Flash */}
      {flash>0&&<div style={{position:'fixed',inset:0,zIndex:900,background:'#ffffff',opacity:flash,pointerEvents:'none'}}/>}

      {/* Header */}
      <div style={{position:'absolute',top:0,left:0,right:0,zIndex:100,display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 18px',background:'linear-gradient(to bottom,rgba(5,5,5,.95),transparent)'}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:TX2,cursor:'pointer',fontFamily:F,fontSize:'9px',letterSpacing:'.14em',textTransform:'uppercase',display:'flex',alignItems:'center',gap:'6px'}}>← Terug</button>
        <span style={{fontSize:'8px',color:'#333',letterSpacing:'.25em',textTransform:'uppercase'}}>Skill Tree</span>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          <button onClick={()=>setShowTrophies(true)} style={{background:'none',border:`1px solid ${BR}`,borderRadius:'2px',color:'#c9a84c',cursor:'pointer',fontFamily:F,fontSize:'8px',padding:'3px 9px',letterSpacing:'.08em'}} title="Trofeeënkast">🏆</button>
          <button onClick={()=>setShowDomains(true)} style={{background:'none',border:`1px solid ${BR}`,borderRadius:'2px',color:TX2,cursor:'pointer',fontFamily:F,fontSize:'8px',padding:'3px 9px',letterSpacing:'.08em'}}>⬡ Domeinen</button>
          <button onClick={()=>setEditMode(e=>!e)} style={{background:editMode?`${AC}22`:'none',border:`1px solid ${editMode?AC:BR}`,borderRadius:'2px',color:editMode?AC:TX2,cursor:'pointer',fontFamily:F,fontSize:'12px',padding:'3px 9px',transition:'all .15s'}} title="Bewerkmodus">✎</button>
        </div>
      </div>

      {/* Zoom buttons */}
      <div style={{position:'absolute',bottom:'28px',right:'18px',zIndex:100,display:'flex',flexDirection:'column',gap:'6px'}}>
        {[['＋',1.3],['－',0.77]].map(([l,f])=>(
          <button key={l} onClick={()=>setTf(t=>({...t,scale:Math.max(0.1,Math.min(5,t.scale*f))}))}
            style={{width:'38px',height:'38px',background:'#0a0a0a',border:`1px solid ${BR}`,borderRadius:'3px',color:TX2,cursor:'pointer',fontFamily:F,fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center'}}>{l}</button>
        ))}
        <button onClick={resetView} style={{width:'38px',height:'38px',background:'#0a0a0a',border:`1px solid ${BR}`,borderRadius:'3px',color:TX2,cursor:'pointer',fontFamily:F,fontSize:'7px',letterSpacing:'.04em',textTransform:'uppercase'}}>FIT</button>
      </div>

      {/* Legend */}
      <div style={{position:'absolute',bottom:'28px',left:'18px',zIndex:100,display:'flex',flexDirection:'column',gap:'7px'}}>
        {[['#3a3a3a','Bereikt','comp'],['#2e2e2e','Beschikbaar','avail'],['#1a1a1a','Vergrendeld','lock']].map(([c,l,k])=>(
          <div key={k} style={{display:'flex',alignItems:'center',gap:'8px'}}>
            <div style={{width:'9px',height:'9px',borderRadius:'50%',background:k==='comp'?AC:k==='avail'?'#3a3a3a':'#181818',border:`1px solid ${k==='comp'?AC:k==='avail'?'#4a4a4a':'#252525'}`,boxShadow:k==='comp'?`0 0 5px ${AC}`:'none'}}/>
            <span style={{fontSize:'8px',color:'#333',letterSpacing:'.06em'}}>{l}</span>
          </div>
        ))}
        {editMode&&<div style={{fontSize:'8px',color:AC,letterSpacing:'.1em',marginTop:'2px'}}>BEWERKMODUS</div>}
      </div>

      {/* Hold progress indicator */}
      {holdP.id&&(
        <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',zIndex:90,pointerEvents:'none',textAlign:'center'}}>
          <div style={{fontSize:'11px',color:'#444',letterSpacing:'.12em',marginBottom:'8px',fontFamily:F}}>INGEDRUKT HOUDEN</div>
          <div style={{width:'200px',height:'2px',background:'#111',borderRadius:'1px',overflow:'hidden'}}>
            <div style={{height:'100%',width:`${holdP.prog*100}%`,background:getColor(stNodes.find(n=>n.id===holdP.id)||{projectId:null}),boxShadow:`0 0 8px ${getColor(stNodes.find(n=>n.id===holdP.id)||{projectId:null})}`,transition:'none'}}/>
          </div>
          <div style={{fontSize:'9px',color:'#333',marginTop:'6px',fontFamily:F}}>{Math.round(holdP.prog*8)}/8s</div>
        </div>
      )}

      {/* SVG */}
      <svg ref={svgRef} width="100%" height="100%"
        style={{display:'block',transform:shakeMag>0?`translate(${sx}px,${sy}px)`:'none',cursor:'grab'}}
        onMouseDown={onSvgMD} onMouseMove={onSvgMM} onMouseUp={onSvgMU} onMouseLeave={()=>{onSvgMU();setTooltip(null)}}
        onTouchStart={onTSD} onTouchEnd={onTSE}
        onClick={()=>setTooltip(null)}>
        <defs>
          <radialGradient id="stBg" cx="50%" cy="60%" r="60%">
            <stop offset="0%" stopColor="#08080f"/>
            <stop offset="100%" stopColor="#030303"/>
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#stBg)"/>
        <g transform={`translate(${tf.x},${tf.y}) scale(${tf.scale})`}>
          {lines}
          {domainLabels}
          {nodeEls}
        </g>
      </svg>

      {/* Tooltip on hover */}
      {tooltip&&!selNode&&(
        <div style={{position:'fixed',bottom:'80px',left:'50%',transform:'translateX(-50%)',zIndex:200,background:'#0a0a0a',border:`1px solid ${tooltip.color}44`,borderRadius:'3px',padding:'10px 16px',maxWidth:'280px',pointerEvents:'none',boxShadow:`0 0 20px ${tooltip.color}22`}}>
          <div style={{fontSize:'9px',color:tooltip.color,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'4px'}}>{tooltip.title}</div>
          <div style={{fontSize:'11px',color:TX2,lineHeight:'1.5'}}>{tooltip.desc}</div>
        </div>
      )}

      {/* Modals */}
      {selNode&&<STNodeModal
        node={selNode} stProjs={stProjs} stDomains={stDomains}
        onClose={()=>setSelNode(null)}
        onStartComplete={nid=>{setSelNode(null);startHold(nid)}}
        onUpdate={(id,u)=>{setStNodes(prev=>prev.map(n=>n.id===id?{...n,...u}:n));setSelNode(prev=>prev?.id===id?{...prev,...u}:prev)}}
        onDelete={id=>{
          // Delete node and entire subtree recursively
          const collect=(nid,all)=>{const ch=all.filter(n=>n.parentId===nid);return[nid,...ch.flatMap(c=>collect(c.id,all))]}
          setStNodes(prev=>{const toRemove=new Set(collect(id,prev));return prev.filter(n=>!toRemove.has(n.id))})
        }}/>}

      {/* ── Trofeeënkast ────────────────────────────────────────────────── */}
      {showTrophies&&(
        <div style={{position:'fixed',inset:0,zIndex:600,display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:40}}>
          <div onClick={()=>setShowTrophies(false)} style={{position:'absolute',inset:0,background:'rgba(0,0,0,.92)'}}/>
          <div style={{position:'relative',background:'#0c0c0c',width:'100%',maxWidth:'640px',maxHeight:'80vh',borderRadius:'6px',border:`1px solid ${BR}`,display:'flex',flexDirection:'column',margin:'0 12px'}}>
            <div style={{padding:'16px 20px',borderBottom:`1px solid ${BR}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
              <div style={{fontSize:'12px',color:TX,letterSpacing:'.08em'}}>🏆 Trofeeënkast</div>
              <button onClick={()=>setShowTrophies(false)} style={{background:'none',border:'none',color:TX2,cursor:'pointer',fontFamily:F,fontSize:'16px'}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>
              {(()=>{
                const activeCompleted=stProjs.filter(p=>{const pn=stNodes.filter(n=>n.projectId===p.id);return pn.length>0&&pn.every(n=>n.status==='completed')})
                if(activeCompleted.length===0&&archivedProjs.length===0)return(
                  <div style={{color:TX2,fontSize:'11px',textAlign:'center',padding:'40px 0',letterSpacing:'.06em'}}>
                    Nog geen afgeronde projecten.<br/>Een project verschijnt hier als alle nodes bereikt zijn.
                  </div>
                )
              })()}
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
                {[...stProjs.filter(p=>{
                  const pNodes=stNodes.filter(n=>n.projectId===p.id)
                  return pNodes.length>0&&pNodes.every(n=>n.status==='completed')
                }).map(p=>({...p,pNodes:stNodes.filter(n=>n.projectId===p.id),archived:false})),
                ...archivedProjs.map(p=>({...p,pNodes:p.archivedNodes||[],archived:true}))
                ].map(p=>{
                  const pNodes=p.pNodes
                  const rootNode=pNodes.find(n=>n.parentId==='root')||pNodes[0]
                  return(
                    <tr key={p.id} style={{borderBottom:`1px solid ${BR}`}}>
                      <td style={{padding:'12px 8px 12px 0',verticalAlign:'top',width:'25%'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}>
                          <div style={{width:'6px',height:'6px',borderRadius:'50%',background:p.color,flexShrink:0}}/>
                          <span style={{color:TX,fontWeight:500}}>{p.name}</span>
                          {p.archived&&<span style={{fontSize:'8px',color:'#c9a84c',border:'1px solid #c9a84c44',borderRadius:'2px',padding:'0 4px'}}>gearchiveerd</span>}
                        </div>
                        {p.why&&<div style={{color:TX2,fontSize:'9px',fontStyle:'italic',marginTop:'3px',paddingLeft:'12px'}}>{p.why}</div>}
                      </td>
                      <td style={{padding:'12px 8px',verticalAlign:'top',width:'20%',color:TX2}}>
                        {pNodes.length} subdoel{pNodes.length!==1?'en':''}
                      </td>
                      <td style={{padding:'12px 8px',verticalAlign:'top',width:'18%',color:TX2,fontSize:'10px',lineHeight:1.6}}>
                        {p.startedAt&&<div>▸ {new Date(p.startedAt).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'})}</div>}
                        {p.archivedAt&&<div style={{color:OK}}>✓ {new Date(p.archivedAt).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'})}</div>}
                        {!p.startedAt&&!p.archivedAt&&<span style={{opacity:.3}}>—</span>}
                      </td>
                      <td style={{padding:'12px 8px',verticalAlign:'top',width:'25%',color:TX2,fontSize:'10px'}}>
                        {rootNode?.achieveDesc||'—'}
                      </td>
                      <td style={{padding:'12px 0 12px 8px',verticalAlign:'top',width:'30%'}}>
                        <textarea
                          value={trophyNotes[p.id]||''}
                          onChange={e=>setTrophyNotes(prev=>({...prev,[p.id]:e.target.value}))}
                          placeholder="Eigen notities..."
                          rows={2}
                          style={{width:'100%',background:'none',border:`1px solid ${BR}`,borderRadius:'2px',color:TX2,fontFamily:F,fontSize:'10px',padding:'4px 6px',outline:'none',resize:'vertical'}}
                        />
                      </td>
                    </tr>
                  )
                })}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Achievement modal ───────────────────────────────────────────── */}
      {achieveModal&&(
        <div style={{position:'fixed',inset:0,zIndex:700,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 16px'}}>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.94)'}}/>
          <div style={{position:'relative',background:'#090909',width:'100%',maxWidth:'480px',borderRadius:'8px',border:`1px solid #2a2a2a`,padding:'28px 24px'}}>
            <div style={{fontSize:'9px',color:TX2,letterSpacing:'.2em',textTransform:'uppercase',marginBottom:'6px'}}>Bereikt ✦</div>
            <div style={{fontSize:'18px',color:TX,marginBottom:'20px',lineHeight:1.4}}>{achieveModal.nodeTitle}</div>
            <div style={{display:'flex',flexDirection:'column',gap:'14px',marginBottom:'22px'}}>
              {[
                '1. Richt de aandacht op de positieve gevoelens die je voelt. Neem de tijd om ze te voelen.',
                '2. Vertel wat je hebt behaald, waarom dat belangrijk is en waar je trots op bent.',
                '3. Deel met anderen wat je hebt behaald.'
              ].map((p,i)=>(
                <div key={i} style={{fontSize:'12px',color:'rgba(255,255,255,0.55)',lineHeight:1.6,paddingLeft:'12px',borderLeft:`2px solid ${AC}44`}}>{p}</div>
              ))}
            </div>
            <textarea
              value={achieveModal.reflText}
              onChange={e=>setAchieveModal(prev=>({...prev,reflText:e.target.value}))}
              placeholder="Schrijf hier je gedachten... (wordt opgeslagen bij het doel)"
              rows={3}
              style={{width:'100%',background:'#0f0f0f',border:`1px solid ${BR}`,borderRadius:'3px',color:TX,fontFamily:F,fontSize:'12px',padding:'10px',outline:'none',resize:'vertical',marginBottom:'16px'}}
            />
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={()=>{
                if(achieveModal.reflText.trim()){
                  setStNodes(prev=>prev.map(n=>n.id===achieveModal.nodeId?{...n,refl:{...n.refl,wellDone:achieveModal.reflText}}:n))
                }
                setAchieveModal(null)
              }} style={{flex:1,padding:'10px',background:AC,border:'none',borderRadius:'3px',color:'#fff',fontFamily:F,fontSize:'10px',cursor:'pointer',letterSpacing:'.08em'}}>
                Opslaan & sluiten
              </button>
              <button onClick={()=>setAchieveModal(null)} style={{padding:'10px 16px',background:'none',border:`1px solid ${BR}`,borderRadius:'3px',color:TX2,fontFamily:F,fontSize:'10px',cursor:'pointer'}}>
                Overslaan
              </button>
            </div>
          </div>
        </div>
      )}

      {addFor!==null&&<STAddNodeForm
        parentId={addFor} nodes={stNodes} stProjs={stProjs}
        onAdd={n=>setStNodes(prev=>[...prev,n])}
        onClose={()=>setAddFor(null)}/>}

      {showDomains&&<STDomainManager
        domains={stDomains} stProjs={stProjs} stNodes={stNodes}
        setDomains={setStDomains} setStProjs={setStProjs}
        setStNodes={setStNodes}
        onClose={()=>setShowDomains(false)}
        onArchive={(p,nodes)=>setArchivedProjs(prev=>[...prev.filter(a=>a.id!==p.id),{...p,archivedNodes:nodes,archivedAt:new Date().toISOString()}])}/>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── HABIT TRACKER MODULE ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════


// ─── XP MODEL ────────────────────────────────────────────────────────────────
const XP_MAX = 10000;
const LEVEL_THRESHOLDS = [
  0, 300, 700, 1200, 1800, 2500, 3300, 4100, 5000, 5900,
  6700, 7400, 8000, 8500, 8900, 9200, 9450, 9650, 9800, 9920, 10000
];

function xpToLevel(xp) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i;
  }
  return 0;
}
function xpGain(level) {
  return Math.max(10, Math.round(220 / (1 + Math.log(level + 1) * 0.7)));
}
function xpLoss(level) {
  const tier = Math.floor(level / 4);
  return Math.round(40 * Math.pow(1.7, tier));
}
function toRoman(n) {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ["M","CM","D","CD","C","XC","L","XL","X","IX","V","IV","I"];
  let r = "";
  for (let i = 0; i < vals.length; i++) while (n >= vals[i]) { r += syms[i]; n -= vals[i]; }
  return r;
}

// ─── ENVIRONMENTS ─────────────────────────────────────────────────────────────
const ENVIRONMENTS = [
  {
    level: 0, name: "Street", skyTop: "#b0bec5", skyBot: "#78909c",
    groundColor: "#546e7a", groundDark: "#37474f",
    sun: null, moon: true,
    elements: ["lamppost", "trashcan"],
    bgAccent: "#607d8b",
  },
  {
    level: 5, name: "Small Room", skyTop: "#ffe0b2", skyBot: "#ffcc80",
    groundColor: "#8d6e63", groundDark: "#6d4c41",
    sun: "#ffb300", moon: false,
    elements: ["window", "plant"],
    bgAccent: "#ff8f00",
  },
  {
    level: 10, name: "Apartment", skyTop: "#90caf9", skyBot: "#42a5f5",
    groundColor: "#66bb6a", groundDark: "#388e3c",
    sun: "#fdd835", moon: false,
    elements: ["tree", "cloud"],
    bgAccent: "#1e88e5",
  },
  {
    level: 15, name: "House", skyTop: "#ce93d8", skyBot: "#ab47bc",
    groundColor: "#4caf50", groundDark: "#2e7d32",
    sun: "#ff8f00", moon: false,
    elements: ["tree", "cloud", "bird"],
    bgAccent: "#9c27b0",
  },
  {
    level: 20, name: "Heaven", skyTop: "#fff9c4", skyBot: "#fff176",
    groundColor: "#a5d6a7", groundDark: "#66bb6a",
    sun: "#ffee58", moon: false,
    elements: ["cloud", "cloud", "star"],
    bgAccent: "#ffd600",
  },
];

function getEnvironment(level) {
  let env = ENVIRONMENTS[0];
  for (const e of ENVIRONMENTS) { if (level >= e.level) env = e; }
  return env;
}

// ─── CHIBI GAME CHARACTER AVATAR ─────────────────────────────────────────────
// Style: thick outlines, chibi proportions (big head ~60% of height),
// flat colors with subtle shadow shapes, expressive face, stage-based outfits
function AvatarSVG({ level, kneeling = false }) {
  const isGod    = level >= 20;
  const isElite  = level >= 15;
  const isStrong = level >= 10;
  const isRising = level >= 5;
  const stage = Math.min(Math.floor(level / 5), 4);

  // Body builds per stage — skinny to muscular
  const bodyW   = [72, 84, 96, 108, 116][stage];  // torso width
  const armW    = [14, 18, 22, 26, 30][stage];     // arm thickness
  const neckW   = [20, 24, 28, 32, 36][stage];     // neck width
  const shoulderExtra = [0, 4, 10, 16, 22][stage]; // shoulder overhang

  // Skin — slightly desaturated/darker at low levels, warmer at high
  const SKINS   = ["#b87840","#c4844a","#d49058","#e0a068","#e8b078"];
  const SKIN    = SKINS[stage];
  const SKIN_S  = ["#885420","#9a6028","#aa7030","#b87838","#c08840"][stage];
  const SKIN_H  = ["#d09858","#daa868","#e8bc78","#f0cc88","#f8dc98"][stage];

  // Hair — muted/dark tones
  const HAIR_C  = ["#181008","#2a1808","#181830","#083038","#a86808"][stage];
  const HAIR_S  = ["#0a0804","#180e04","#0e0e20","#041e24","#785004"][stage];

  // Shirt — muted, fits environment mood
  const SHIRT_C = ["#3a5828","#803020","#185888","#4a1880","#c07808"][stage];
  const SHIRT_S = ["#283c18","#581808","#0e3860","#301058","#886004"][stage];
  const SHIRT_H = ["#587840","#a85040","#3080b0","#7038b0","#e0a020"][stage];

  // Pants — always very dark
  const PANT_C  = "#221810";
  const PANT_S  = "#120c08";
  const BOOT_C  = "#181008";
  const BOOT_H  = "#302018";

  // Eye color — duller at low, more vivid at high
  const EYE_C   = ["#283848","#602010","#0a3860","#380868","#884000"][stage];

  if (kneeling) {
    return (
      <svg width="80" height="66" viewBox="0 0 160 132" style={{overflow:"visible"}}>
        <ellipse cx="80" cy="128" rx="50" ry="8" fill="#00000030"/>
        <rect x="46" y="66" width="68" height="44" rx="10" fill={SHIRT_C}/>
        <rect x="46" y="90" width="68" height="20" rx="0" fill={SHIRT_S}/>
        <rect x="68" y="56" width="24" height="14" rx="6" fill={SKIN}/>
        <rect x="32" y="14" width="96" height="48" rx="16" fill={SKIN}/>
        <rect x="32" y="38" width="96" height="24" fill={SKIN_S} opacity="0.25"/>
        <rect x="32" y="10" width="96" height="24" rx="14" fill={HAIR_C}/>
        <rect x="32" y="22" width="96" height="12" fill={HAIR_C}/>
        <rect x="48" y="26" width="22" height="10" rx="4" fill="#ffffff"/>
        <rect x="90" y="26" width="22" height="10" rx="4" fill="#ffffff"/>
        <rect x="54" y="28" width="8" height="7" rx="2" fill={EYE_C}/>
        <rect x="96" y="28" width="8" height="7" rx="2" fill={EYE_C}/>
        <rect x="46" y="22" width="26" height="6" rx="3" fill={HAIR_C} transform="rotate(8,59,25)"/>
        <rect x="88" y="22" width="26" height="6" rx="3" fill={HAIR_C} transform="rotate(-8,101,25)"/>
        <rect x="58" y="44" width="44" height="10" rx="5" fill="#ffffff"/>
        <rect x="58" y="44" width="44" height="5" rx="2" fill={SKIN_S} opacity="0.3"/>
        <rect x="30" y="104" width="36" height="16" rx="8" fill={PANT_C} transform="rotate(20,48,112)"/>
        <rect x="94" y="104" width="36" height="16" rx="8" fill={PANT_C} transform="rotate(-20,112,112)"/>
        <rect x="20" y="120" width="32" height="10" rx="4" fill={BOOT_C}/>
        <rect x="108" y="120" width="32" height="10" rx="4" fill={BOOT_C}/>
      </svg>
    );
  }

  const cx = 80; // center x

  return (
    <svg width="80" height="130" viewBox="0 0 160 260"
      style={{
        overflow:"visible",
        filter: isGod
          ? "drop-shadow(0 0 8px #c07808aa)"
          : isElite ? "drop-shadow(0 0 6px #4a188088)"
          : "none",
      }}>

      <ellipse cx="80" cy="256" rx="46" ry="8" fill="#00000045"/>

      {/* GOD halo */}
      {isGod && <>
        <ellipse cx={cx} cy="14" rx="50" ry="10" fill="none" stroke="#c07808" strokeWidth="4" opacity="0.8"/>
        {[-24,-12,0,12,24].map((dx,i)=>(
          <rect key={i} x={cx+dx-3} y={4} width={7} height={12} rx="2" fill="#e09010"/>
        ))}
      </>}

      {/* ── BOOTS ── */}
      <rect x={cx-50} y="232" width="44" height="24" rx="7" fill={BOOT_C}/>
      <rect x={cx-58} y="242" width="28" height="14" rx="5" fill={BOOT_C}/>
      <rect x={cx-56} y="242" width="26" height="7" rx="3" fill={BOOT_H}/>
      <rect x={cx+6}  y="232" width="44" height="24" rx="7" fill={BOOT_C}/>
      <rect x={cx+30} y="242" width="28" height="14" rx="5" fill={BOOT_C}/>
      <rect x={cx+30} y="242" width="26" height="7" rx="3" fill={BOOT_H}/>

      {/* ── PANTS ── */}
      <rect x={cx-50} y="184" width="40" height="56" rx="9" fill={PANT_C}/>
      <rect x={cx-44} y="194" width="12" height="36" rx="4" fill={PANT_S} opacity="0.5"/>
      <rect x={cx+10} y="184" width="40" height="56" rx="9" fill={PANT_C}/>
      <rect x={cx+32} y="194" width="12" height="36" rx="4" fill={PANT_S} opacity="0.5"/>
      {/* crotch */}
      <rect x={cx-50} y="180" width="100" height="18" rx="7" fill={PANT_C}/>
      <rect x={cx-6}  y="180" width="12"  height="18" fill={PANT_S}/>

      {/* ── BELT ── */}
      <rect x={cx-52} y="170" width="104" height="14" rx="6" fill="#100a04"/>
      <rect x={cx-12} y="171" width="24"  height="12" rx="4" fill="#604808"/>
      <rect x={cx-7}  y="174" width="14"  height="6"  rx="2" fill="#c09010"/>

      {/* ── TORSO / SHIRT ── */}
      {/* shoulder bar */}
      <rect x={cx - bodyW/2 - shoulderExtra} y="112"
            width={bodyW + shoulderExtra*2} height="26" rx="16" fill={SHIRT_C}/>
      {/* main body */}
      <rect x={cx - bodyW/2} y="126" width={bodyW} height="52" rx="12" fill={SHIRT_C}/>
      {/* shadow */}
      <rect x={cx - bodyW/2} y="156" width={bodyW} height="22" rx="0" fill={SHIRT_S}/>
      <rect x={cx - bodyW/2} y="165" width={bodyW} height="13" rx="0" fill={SHIRT_S} opacity="0.6"/>
      {/* highlight */}
      <rect x={cx - bodyW/2 + 14} y="116" width={bodyW - 28} height="16" rx="6" fill={SHIRT_H} opacity="0.25"/>
      {/* V neck */}
      <polygon points={`${cx-14},112 ${cx+14},112 ${cx},130`} fill={SKIN}/>
      {/* chest badge */}
      {isGod    && <><rect x={cx-12} y="138" width="24" height="18" rx="5" fill="#c07808"/><text x={cx} y="151" textAnchor="middle" fontSize="11" fill="#100a04">★</text></>}
      {isElite  && <rect x={cx-10} y="138" width="20" height="18" rx="5" fill="#6020a0" opacity="0.9"/>}
      {isStrong && <rect x={cx-10} y="140" width="20" height="14" rx="4" fill="#206050" opacity="0.9"/>}
      {isRising && <rect x={cx-8}  y="140" width="16" height="12" rx="3" fill="#802010" opacity="0.9"/>}

      {/* ── ARMS ── */}
      {/* left upper arm */}
      <rect x={cx - bodyW/2 - shoulderExtra - armW + 2} y="116"
            width={armW} height={isStrong||isElite||isGod ? 52 : 44} rx={armW/2} fill={SKIN}/>
      <rect x={cx - bodyW/2 - shoulderExtra - armW + 2} y={isStrong||isElite||isGod ? 144 : 138}
            width={armW} height="20" rx={armW/2} fill={SKIN_S} opacity="0.3"/>
      {/* left forearm */}
      <rect x={cx - bodyW/2 - shoulderExtra - armW + 4} y={isStrong||isElite||isGod ? 162 : 154}
            width={armW - 2} height="32" rx={(armW-2)/2} fill={SKIN}/>
      {/* left fist */}
      <rect x={cx - bodyW/2 - shoulderExtra - armW + 2} y={isStrong||isElite||isGod ? 190 : 182}
            width={armW + 2} height="20" rx="8" fill={SKIN}/>
      <rect x={cx - bodyW/2 - shoulderExtra - armW + 4} y={isStrong||isElite||isGod ? 196 : 188}
            width={armW - 2} height="10" rx="4" fill={SKIN_S} opacity="0.35"/>

      {/* right upper arm */}
      <rect x={cx + bodyW/2 + shoulderExtra - 2} y="116"
            width={armW} height={isStrong||isElite||isGod ? 52 : 44} rx={armW/2} fill={SKIN}/>
      <rect x={cx + bodyW/2 + shoulderExtra - 2} y={isStrong||isElite||isGod ? 144 : 138}
            width={armW} height="20" rx={armW/2} fill={SKIN_S} opacity="0.3"/>
      {/* right forearm */}
      <rect x={cx + bodyW/2 + shoulderExtra - 2} y={isStrong||isElite||isGod ? 162 : 154}
            width={armW - 2} height="32" rx={(armW-2)/2} fill={SKIN}/>
      {/* right fist */}
      <rect x={cx + bodyW/2 + shoulderExtra - 4} y={isStrong||isElite||isGod ? 190 : 182}
            width={armW + 2} height="20" rx="8" fill={SKIN}/>
      <rect x={cx + bodyW/2 + shoulderExtra - 2} y={isStrong||isElite||isGod ? 196 : 188}
            width={armW - 2} height="10" rx="4" fill={SKIN_S} opacity="0.35"/>

      {/* ── NECK ── */}
      <rect x={cx - neckW/2} y="100" width={neckW} height="18" rx="7" fill={SKIN}/>
      <rect x={cx - neckW/2} y="110" width={neckW} height="8" rx="0" fill={SKIN_S} opacity="0.28"/>

      {/* ── HEAD — narrower than before ── */}
      {/* width scales slightly with stage but stays slim */}
      <rect x={cx - 36 - stage*2} y="38" width={72 + stage*4} height="66" rx="18" fill={SKIN}/>
      {/* jaw shadow */}
      <rect x={cx - 36 - stage*2} y="82" width={72 + stage*4} height="22" rx="0" fill={SKIN_S} opacity="0.2"/>
      {/* head highlight */}
      <ellipse cx={cx} cy="56" rx={26 + stage*2} ry="14" fill={SKIN_H} opacity="0.2"/>

      {/* ── HAIR ── */}
      <rect x={cx - 36 - stage*2} y="32" width={72 + stage*4} height="24" rx="16" fill={HAIR_C}/>
      <rect x={cx - 36 - stage*2} y="46" width={72 + stage*4} height="12" rx="0" fill={HAIR_C}/>
      {/* quiff */}
      <ellipse cx={cx + 12} cy="34" rx="18" ry="10" fill={HAIR_C}/>
      <ellipse cx={cx + 12} cy="30" rx="14" ry="8" fill={HAIR_C}/>
      {/* hair shadow */}
      <rect x={cx - 24 - stage} y="34" width={48 + stage*2} height="8" rx="4" fill={HAIR_S} opacity="0.45"/>

      {/* ── EARS ── */}
      <ellipse cx={cx - 36 - stage*2} cy="70" rx="8" ry="10" fill={SKIN}/>
      <ellipse cx={cx - 36 - stage*2} cy="70" rx="4" ry="6" fill={SKIN_S} opacity="0.3"/>
      <ellipse cx={cx + 36 + stage*2} cy="70" rx="8" ry="10" fill={SKIN}/>
      <ellipse cx={cx + 36 + stage*2} cy="70" rx="4" ry="6" fill={SKIN_S} opacity="0.3"/>

      {/* ── EYEBROWS — thick angled ── */}
      <rect x={cx-34} y="54" width="28" height="7" rx="3" fill={HAIR_C} transform={`rotate(${isStrong||isElite||isGod?8:5},${cx-20},57)`}/>
      <rect x={cx+6}  y="54" width="28" height="7" rx="3" fill={HAIR_C} transform={`rotate(${isStrong||isElite||isGod?-8:-5},${cx+20},57)`}/>

      {/* ── EYES ── */}
      <rect x={cx-34} y="63" width="28" height="16" rx="5" fill="#ffffff"/>
      <rect x={cx-34} y="63" width="28" height="7"  rx="4" fill={SKIN} opacity="0.4"/>
      <rect x={cx-28} y="65" width="13" height="12" rx="4" fill={EYE_C}/>
      <rect x={cx-26} y="67" width="8"  height="8"  rx="3" fill="#080604"/>
      <rect x={cx-25} y="68" width="3"  height="3"  fill="#ffffff"/>

      <rect x={cx+6}  y="63" width="28" height="16" rx="5" fill="#ffffff"/>
      <rect x={cx+6}  y="63" width="28" height="7"  rx="4" fill={SKIN} opacity="0.4"/>
      <rect x={cx+15} y="65" width="13" height="12" rx="4" fill={EYE_C}/>
      <rect x={cx+17} y="67" width="8"  height="8"  rx="3" fill="#080604"/>
      <rect x={cx+18} y="68" width="3"  height="3"  fill="#ffffff"/>

      {/* ── NOSE ── */}
      <ellipse cx={cx} cy="86" rx="9" ry="6" fill={SKIN_S} opacity="0.3"/>
      <rect x={cx-7} y="86" width="14" height="4" rx="3" fill={SKIN_S} opacity="0.35"/>

      {/* ── MOUTH — narrower grin ── */}
      <rect x={cx-16} y="94" width="32" height="11" rx="5" fill="#100a04"/>
      <rect x={cx-14} y="95" width="28" height="7"  rx="3" fill="#ffffff"/>
      <rect x={cx-14} y="95" width="28" height="3"  rx="2" fill={SKIN_S} opacity="0.2"/>
      {[cx-8, cx-2, cx+4].map((x,i)=>(
        <rect key={i} x={x} y={95} width={1.5} height={7} fill="#b0a898" opacity="0.5"/>
      ))}

      {/* ── LEVEL BADGE ── */}
      {level > 0 && (
        <g>
          <rect x="124" y="10" width="32" height="24" rx="7" fill={isGod?"#c07808":"#100a04"} opacity="0.9"/>
          <text x="140" y="27" textAnchor="middle" fontSize="14" fontWeight="900"
            fill={isGod?"#100a04":"#e8d8b0"} fontFamily="Arial Black, sans-serif">{level}</text>
        </g>
      )}
    </svg>
  );
}
// ─── ENVIRONMENT BACKGROUND SVG ───────────────────────────────────────────────
function EnvironmentBG({ env, level }) {
  const isGod = level >= 20;
  const isElite = level >= 15;
  const isStrong = level >= 10;
  const isRoom = level >= 5 && level < 10;

  // Street (dark city night)
  if (level < 5) return (
    <svg width="100%" height="100%" viewBox="0 0 400 560" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="sky0" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a237e" />
          <stop offset="100%" stopColor="#283593" />
        </linearGradient>
      </defs>
      <rect width="400" height="560" fill="url(#sky0)" />
      {/* Stars */}
      {[30,70,120,180,250,310,360,50,150,220,290,340].map((x,i) => (
        <circle key={i} cx={x} cy={20 + (i * 23) % 120} r="1.5" fill="white" opacity="0.7" />
      ))}
      {/* Moon */}
      <circle cx="320" cy="70" r="28" fill="#fff9c4" />
      <circle cx="334" cy="60" r="22" fill="#283593" />
      {/* Buildings */}
      <rect x="0" y="220" width="60" height="200" fill="#0d1b2a" />
      <rect x="55" y="260" width="50" height="160" fill="#0a1628" />
      <rect x="100" y="190" width="70" height="230" fill="#0d1b2a" />
      <rect x="280" y="200" width="55" height="220" fill="#0d1b2a" />
      <rect x="330" y="240" width="70" height="180" fill="#0a1628" />
      {/* Windows */}
      {[15,30,45].map(x => [240,260,280,300,320,340,360,380].map((y,i) =>
        <rect key={`${x}-${y}`} x={x} y={y} width="8" height="10" fill={i%3===0 ? "#ffd740" : "#1a237e"} opacity="0.8" />
      ))}
      {[110,125,140,155].map(x => [210,230,250,270,290,310,330].map((y,i) =>
        <rect key={`${x}-${y}`} x={x} y={y} width="8" height="10" fill={i%2===0 ? "#ffd740" : "#283593"} opacity="0.7" />
      ))}
      {/* Street */}
      <rect x="0" y="430" width="400" height="130" fill="#263238" />
      <rect x="0" y="430" width="400" height="12" fill="#37474f" />
      {/* Road lines */}
      {[40,100,160,220,280,340].map((x,i) => <rect key={i} x={x} y="490" width="40" height="6" rx="3" fill="#546e7a" />)}
      {/* Lamppost */}
      <rect x="80" y="370" width="6" height="64" fill="#546e7a" />
      <ellipse cx="83" cy="370" rx="20" ry="5" fill="#546e7a" />
      <ellipse cx="83" cy="368" rx="8" ry="4" fill="#ffd740" opacity="0.9" />
      <rect x="300" y="380" width="6" height="54" fill="#546e7a" />
      <ellipse cx="303" cy="380" rx="20" ry="5" fill="#546e7a" />
      <ellipse cx="303" cy="378" rx="8" ry="4" fill="#ffd740" opacity="0.9" />
      {/* Ground gradient overlay */}
      <rect x="0" y="420" width="400" height="20" fill="#1a237e" opacity="0.15" />
    </svg>
  );

  // Small Room (cozy interior)
  if (level < 10) return (
    <svg width="100%" height="100%" viewBox="0 0 400 560" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe0b2" />
          <stop offset="100%" stopColor="#ffcc80" />
        </linearGradient>
      </defs>
      <rect width="400" height="560" fill="url(#wall)" />
      {/* Floor */}
      <rect x="0" y="430" width="400" height="130" fill="#8d6e63" />
      {/* Floor planks */}
      {[0,80,160,240,320].map((x,i) => <rect key={i} x={x} y="430" width="79" height="130" fill="none" stroke="#6d4c41" strokeWidth="1.5" />)}
      {[0,80,160,240,320].map((x,i) => <rect key={i} x={x} y="495" width="79" height="1" fill="#6d4c41" opacity="0.4" />)}
      {/* Wall border */}
      <rect x="0" y="428" width="400" height="6" fill="#795548" />
      {/* Window */}
      <rect x="260" y="80" width="110" height="140" rx="6" fill="#b3e5fc" stroke="#795548" strokeWidth="6" />
      <rect x="260" y="148" width="110" height="5" fill="#795548" />
      <rect x="313" y="80" width="5" height="140" fill="#795548" />
      {/* Sunlight through window */}
      <polygon points="370,220 400,200 400,340 370,320" fill="#fff9c4" opacity="0.3" />
      {/* Curtains */}
      <rect x="248" y="72" width="24" height="156" rx="6" fill="#ef9a9a" />
      <rect x="358" y="72" width="24" height="156" rx="6" fill="#ef9a9a" />
      {/* Desk */}
      <rect x="10" y="340" width="150" height="18" rx="4" fill="#795548" />
      <rect x="20" y="356" width="10" height="76" rx="3" fill="#6d4c41" />
      <rect x="140" y="356" width="10" height="76" rx="3" fill="#6d4c41" />
      {/* Lamp on desk */}
      <rect x="50" y="300" width="5" height="42" fill="#9e9e9e" />
      <ellipse cx="52" cy="300" rx="22" ry="8" fill="#fff9c4" stroke="#bdbdbd" strokeWidth="2" />
      <ellipse cx="52" cy="300" rx="12" ry="5" fill="#ffd740" opacity="0.8" />
      {/* Plant */}
      <rect x="340" y="370" width="20" height="30" rx="4" fill="#795548" />
      <circle cx="350" cy="355" r="22" fill="#388e3c" />
      <circle cx="335" cy="365" r="15" fill="#43a047" />
      <circle cx="365" cy="363" r="16" fill="#2e7d32" />
      {/* Bookshelf */}
      <rect x="0" y="150" width="30" height="220" fill="#795548" />
      {["#e53935","#1e88e5","#43a047","#fb8c00","#8e24aa","#00897b"].map((c,i)=>
        <rect key={i} x="4" y={160 + i * 30} width="22" height="25" rx="2" fill={c} />
      )}
    </svg>
  );

  // Apartment (bright day city)
  if (level < 15) return (
    <svg width="100%" height="100%" viewBox="0 0 400 560" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#90caf9" />
          <stop offset="100%" stopColor="#e3f2fd" />
        </linearGradient>
      </defs>
      <rect width="400" height="560" fill="url(#sky2)" />
      {/* Sun */}
      <circle cx="320" cy="80" r="48" fill="#fdd835" opacity="0.9" />
      <circle cx="320" cy="80" r="38" fill="#ffee58" />
      {/* Clouds */}
      <ellipse cx="80" cy="100" rx="50" ry="22" fill="white" opacity="0.9" />
      <ellipse cx="60" cy="106" rx="35" ry="18" fill="white" opacity="0.9" />
      <ellipse cx="100" cy="108" rx="30" ry="16" fill="white" opacity="0.9" />
      <ellipse cx="220" cy="70" rx="40" ry="18" fill="white" opacity="0.85" />
      <ellipse cx="200" cy="76" rx="28" ry="14" fill="white" opacity="0.85" />
      {/* Mountains */}
      <polygon points="0,350 100,180 200,350" fill="#66bb6a" />
      <polygon points="80,350 200,160 320,350" fill="#4caf50" />
      <polygon points="200,350 330,190 400,280 400,350" fill="#388e3c" />
      {/* Ground */}
      <rect x="0" y="348" width="400" height="212" fill="#66bb6a" />
      <rect x="0" y="348" width="400" height="20" fill="#4caf50" />
      {/* Dirt bottom */}
      <rect x="0" y="480" width="400" height="80" fill="#795548" />
      {/* Grass bumps */}
      {[0,30,60,90,120,150,180,210,240,270,300,330,360].map((x,i) =>
        <ellipse key={i} cx={x + 15} cy="480" rx="22" ry="10" fill="#388e3c" />
      )}
      {/* Trees */}
      <rect x="48" y="340" width="12" height="60" rx="4" fill="#5d4037" />
      <circle cx="54" cy="320" r="34" fill="#43a047" />
      <circle cx="40" cy="335" r="22" fill="#388e3c" />
      <circle cx="70" cy="332" r="24" fill="#2e7d32" />
      <rect x="310" y="345" width="12" height="55" rx="4" fill="#5d4037" />
      <circle cx="316" cy="326" r="32" fill="#43a047" />
      <circle cx="300" cy="340" r="22" fill="#388e3c" />
      <circle cx="332" cy="338" r="20" fill="#2e7d32" />
      {/* Birds */}
      <path d="M140,130 Q145,124 150,130" stroke="#546e7a" strokeWidth="2" fill="none" />
      <path d="M160,118 Q165,112 170,118" stroke="#546e7a" strokeWidth="2" fill="none" />
      <path d="M175,140 Q180,134 185,140" stroke="#546e7a" strokeWidth="2" fill="none" />
    </svg>
  );

  // House (magical sunset)
  if (level < 20) return (
    <svg width="100%" height="100%" viewBox="0 0 400 560" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="sky3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ce93d8" />
          <stop offset="50%" stopColor="#f48fb1" />
          <stop offset="100%" stopColor="#ffcc80" />
        </linearGradient>
      </defs>
      <rect width="400" height="560" fill="url(#sky3)" />
      {/* Large sun */}
      <circle cx="200" cy="300" r="100" fill="#ff8f00" opacity="0.25" />
      <circle cx="200" cy="300" r="70" fill="#ffa000" opacity="0.35" />
      <circle cx="200" cy="300" r="45" fill="#ffb300" opacity="0.5" />
      {/* Clouds purple-tinted */}
      <ellipse cx="60" cy="120" rx="55" ry="24" fill="#f3e5f5" opacity="0.8" />
      <ellipse cx="40" cy="128" rx="38" ry="18" fill="#e1bee7" opacity="0.8" />
      <ellipse cx="340" cy="90" rx="48" ry="22" fill="#f3e5f5" opacity="0.7" />
      {/* Rolling hills */}
      <ellipse cx="100" cy="420" rx="160" ry="80" fill="#4caf50" />
      <ellipse cx="300" cy="440" rx="160" ry="80" fill="#388e3c" />
      <rect x="0" y="430" width="400" height="130" fill="#4caf50" />
      <rect x="0" y="500" width="400" height="60" fill="#795548" />
      {/* Grass bumps */}
      {[0,30,60,90,120,150,180,210,240,270,300,330,360].map((x,i) =>
        <ellipse key={i} cx={x + 15} cy="500" rx="22" ry="10" fill="#2e7d32" />
      )}
      {/* Trees with magical tint */}
      <rect x="30" y="360" width="14" height="72" rx="5" fill="#4e342e" />
      <circle cx="37" cy="335" r="36" fill="#6a1b9a" opacity="0.8" />
      <circle cx="20" cy="350" r="24" fill="#7b1fa2" opacity="0.7" />
      <circle cx="55" cy="347" r="26" fill="#4a148c" opacity="0.8" />
      <rect x="350" y="362" width="14" height="68" rx="5" fill="#4e342e" />
      <circle cx="357" cy="338" r="34" fill="#6a1b9a" opacity="0.8" />
      <circle cx="340" cy="353" r="22" fill="#7b1fa2" opacity="0.7" />
      {/* Fireflies / stars */}
      {[80,140,200,270,330,60,180,310].map((x,i) =>
        <circle key={i} cx={x} cy={80 + (i * 40) % 200} r="2.5" fill="#ffd740" opacity="0.8" />
      )}
      {/* House in distance */}
      <rect x="160" y="380" width="80" height="60" fill="#e8eaf6" />
      <polygon points="140,380 200,340 260,380" fill="#e53935" />
      <rect x="185" y="410" width="30" height="30" fill="#5c6bc0" />
      <rect x="165" y="385" width="22" height="22" fill="#b3e5fc" stroke="#90caf9" strokeWidth="2" />
      <rect x="213" y="385" width="22" height="22" fill="#b3e5fc" stroke="#90caf9" strokeWidth="2" />
    </svg>
  );

  // Heaven
  return (
    <svg width="100%" height="100%" viewBox="0 0 400 560" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="sky4" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff9c4" />
          <stop offset="100%" stopColor="#fffde7" />
        </linearGradient>
        <radialGradient id="glow4" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#ffd700" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#fff9c4" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="560" fill="url(#sky4)" />
      <rect width="400" height="560" fill="url(#glow4)" />
      {/* Big sun */}
      <circle cx="200" cy="120" r="90" fill="#fff176" opacity="0.5" />
      <circle cx="200" cy="120" r="60" fill="#ffee58" opacity="0.7" />
      <circle cx="200" cy="120" r="36" fill="#fdd835" />
      {/* Rays */}
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg,i) => (
        <line key={i} x1="200" y1="120"
          x2={200 + Math.cos(deg * Math.PI / 180) * 120}
          y2={120 + Math.sin(deg * Math.PI / 180) * 120}
          stroke="#fdd835" strokeWidth="2" opacity="0.4"
        />
      ))}
      {/* Clouds — fluffy white */}
      {[[60,200],[200,160],[340,190],[100,280],[300,250]].map(([cx,cy],i) => (
        <g key={i}>
          <ellipse cx={cx} cy={cy} rx="60" ry="28" fill="white" opacity="0.95" />
          <ellipse cx={cx - 25} cy={cy + 8} rx="38" ry="22" fill="white" opacity="0.95" />
          <ellipse cx={cx + 25} cy={cy + 6} rx="40" ry="22" fill="white" opacity="0.95" />
        </g>
      ))}
      {/* Ground clouds */}
      <rect x="0" y="440" width="400" height="120" fill="white" opacity="0.85" />
      <ellipse cx="200" cy="440" rx="200" ry="30" fill="white" opacity="0.9" />
      {[0,50,100,150,200,250,300,350].map((x,i) =>
        <ellipse key={i} cx={x + 25} cy="440" rx="35" ry="18" fill="#fff9c4" opacity="0.7" />
      )}
      {/* Stars / sparkles */}
      {[50,120,200,280,360,80,170,250,330].map((x,i) =>
        <text key={i} x={x} y={50 + (i * 45) % 350} fontSize="14" textAnchor="middle" opacity="0.7">✦</text>
      )}
    </svg>
  );
}

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
function ProgressBar({ xp, level }) {
  const isGod = level >= 20;
  if (isGod) return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 10, color: "#ffd700", fontFamily: "monospace", letterSpacing: 2, marginBottom: 4, textAlign: "center" }}>
        MAX LEVEL ★
      </div>
      <div style={{ height: 8, borderRadius: 4, background: "linear-gradient(90deg,#ffd700,#ff8f00,#ffd700)", backgroundSize: "200%", animation: "shimmer 2s linear infinite" }} />
    </div>
  );
  const lo = LEVEL_THRESHOLDS[level];
  const hi = LEVEL_THRESHOLDS[level + 1];
  const pct = Math.max(0, Math.min(1, (xp - lo) / (hi - lo)));
  const barColor = level >= 15 ? "linear-gradient(90deg,#ce93d8,#9c27b0)"
    : level >= 10 ? "linear-gradient(90deg,#90caf9,#1e88e5)"
    : level >= 5 ? "linear-gradient(90deg,#a5d6a7,#388e3c)"
    : "linear-gradient(90deg,#546e7a,#90a4ae)";
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.6)", fontFamily: "monospace", marginBottom: 4 }}>
        <span>Lvl {level}</span><span>Lvl {level + 1}</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: "rgba(0,0,0,0.25)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct * 100}%`, borderRadius: 4, background: barColor, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
      </div>
    </div>
  );
}

// ─── HISTORY TIMELINE ─────────────────────────────────────────────────────────
function HistoryTimeline({ history }) {
  const last30 = history.slice(-30);
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {last30.map((h, i) => (
        <div key={i} title={`${h.date} — ${h.pct}% (${h.result})`} style={{
          width: 16, height: 16, borderRadius: 4,
          background: h.result === "perfect" ? "#66bb6a" : h.result === "neutral" ? "#ffa726" : "#ef5350",
          boxShadow: h.result === "perfect" ? "0 0 4px #66bb6a88" : "none",
        }} />
      ))}
      {last30.length === 0 && <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>Nog geen dagen gelogd.</span>}
    </div>
  );
}

// ─── CHECKLIST ────────────────────────────────────────────────────────────────
function CheckList({ checks, values, onChange, submitted }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {checks.map((c, i) => {
        const check = typeof c === "object" ? c : { name: c, target: 1 };
        const val = values[i] || { count: 0, na: false };
        const target = check.target || 1;
        const count = val.na ? 0 : val.count;
        const isComplete = !val.na && count >= target;
        const pct = target > 1 ? Math.min(1, count / target) : (isComplete ? 1 : 0);

        return (
          <div key={i} style={{
            borderRadius: 14, overflow: "hidden",
            border: `1.5px solid ${isComplete ? "#66bb6a55" : val.na ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.1)"}`,
            transition: "all 0.2s", position: "relative",
          }}>
            {/* Progress fill background */}
            {target > 1 && !val.na && (
              <div style={{
                position: "absolute", inset: 0, borderRadius: 12,
                background: "#66bb6a22",
                width: `${pct * 100}%`,
                transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)",
                pointerEvents: "none",
              }}/>
            )}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px",
              background: isComplete ? "rgba(102,187,106,0.10)" : val.na ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)",
            }}>
              {/* Tap to increment / complete */}
              <button disabled={submitted || val.na} onClick={() => {
                if (submitted || val.na) return;
                const newCount = count >= target ? 0 : count + 1;
                if (newCount > 0 && newCount <= target) playTickSound();
                onChange(i, { ...val, count: newCount });
              }} style={{
                width: target > 1 ? 44 : 26,
                height: 26, borderRadius: 7, flexShrink: 0,
                border: `2px solid ${isComplete ? "#66bb6a" : count > 0 ? "#66bb6a88" : "rgba(255,255,255,0.2)"}`,
                background: isComplete ? "#66bb6a" : count > 0 ? "rgba(102,187,106,0.2)" : "transparent",
                cursor: submitted || val.na ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s", gap: 3,
              }}>
                {isComplete ? (
                  <span style={{ color: "white", fontSize: 13, fontWeight: "bold" }}>✓</span>
                ) : target > 1 ? (
                  <span style={{ color: count > 0 ? "#66bb6a" : "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 800 }}>
                    {count}/{target}
                  </span>
                ) : null}
              </button>

              {/* N/A button */}
              <button disabled={submitted} onClick={() => !submitted && onChange(i, { count: 0, na: !val.na })} style={{
                padding: "2px 7px", borderRadius: 6,
                border: `1.5px solid ${val.na ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.1)"}`,
                background: "transparent",
                cursor: submitted ? "not-allowed" : "pointer",
                fontSize: 9, color: val.na ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)",
                fontFamily: "monospace", letterSpacing: 1, flexShrink: 0,
              }}>N/A</button>

              {/* Label + Why */}
              <div style={{flex:1,display:'flex',flexDirection:'column',gap:2}}>
                <span style={{
                  color: val.na ? "rgba(255,255,255,0.25)" : isComplete ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.75)",
                  fontSize: 14,
                  textDecoration: val.na ? "line-through" : "none",
                }}>{check.name}</span>
                {check.why&&<span style={{fontSize:10,color:'rgba(255,255,255,0.3)',fontStyle:'italic',lineHeight:1.3}}>{check.why}</span>}
              </div>

              {/* Target indicator for multi-tap goals */}
              {target > 1 && !val.na && (
                <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                  {Array.from({ length: target }).map((_, t) => (
                    <div key={t} style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: t < count ? "#66bb6a" : "rgba(255,255,255,0.15)",
                      transition: "background 0.2s",
                    }}/>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// expose playTickSound globally so CheckList can call it
function playTickSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.14);
    const click = ctx.createOscillator();
    const cg = ctx.createGain();
    click.type = "square"; click.frequency.value = 2400;
    cg.gain.setValueAtTime(0.08, ctx.currentTime);
    cg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    click.connect(cg); cg.connect(ctx.destination);
    click.start(ctx.currentTime); click.stop(ctx.currentTime + 0.05);
  } catch(e) {}
}

// ─── COLLAPSE OVERLAY ─────────────────────────────────────────────────────────
function CollapseOverlay({ visible, onDone }) {
  useEffect(() => {
    if (visible) { const t = setTimeout(onDone, 4000); return () => clearTimeout(t); }
  }, [visible]);
  if (!visible) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 1000,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.5s ease",
    }}>
      <div style={{ marginBottom: 24 }}>
        <AvatarSVG level={0} kneeling={true} />
      </div>
      <div style={{ fontFamily: "monospace", fontSize: 22, color: "#ef5350", letterSpacing: 3, marginBottom: 12, textTransform: "uppercase" }}>
        SYSTEM COLLAPSED
      </div>
      <div style={{ fontFamily: "monospace", fontSize: 13, color: "rgba(255,255,255,0.4)", letterSpacing: 1, textAlign: "center" }}>
        Your system collapsed.<br />Adjust your approach.
      </div>
    </div>
  );
}

// ─── DEFAULT STATE ─────────────────────────────────────────────────────────────
const DEFAULT_STATE = {
  xp: 0, level: 0, streak: 0, collapseCounter: 0, badges: [],
  history: [],
  checks: [
    { name: "Vroeg opstaan", target: 1 },
    { name: "Sporten", target: 1 },
    { name: "Geen junkfood", target: 1 },
    { name: "Gefocust werken 2u", target: 1 },
    { name: "Lezen 30min", target: 1 },
  ],
  todaySubmitted: false,
  todayDate: new Date().toDateString(),
  lastDayResult: null,
};

function loadState() {
  try {
    const s = localStorage.getItem("discipline-engine-v2");
    if (s) {
      const parsed = JSON.parse(s);
      const today = new Date().toDateString();
      // New day — reset submission so user can log today
      if (parsed.todayDate !== today) {
        localStorage.removeItem("discipline-engine-checks");
        return { ...DEFAULT_STATE, ...parsed, todaySubmitted: false, todayDate: today, lastDayResult: null };
      }
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch {}
  return { ...DEFAULT_STATE };
}
function saveState(s) {
  try { localStorage.setItem("discipline-engine-v2", JSON.stringify(s)); } catch {}
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function HabitTracker({onBack,userId}) {
  const [state, setState] = useState(() => loadState());
  const [checkValues, setCheckValues] = useState(() => {
    try {
      const saved = localStorage.getItem("discipline-engine-checks");
      if (saved) return JSON.parse(saved);
    } catch {}
    return Array(loadState().checks.length).fill(null).map(() => ({ count: 0, na: false }));
  });
  const [page, setPage] = useState("world"); // "world" | "goals"
  const [newCheck, setNewCheck] = useState("");
  const [collapseVisible, setCollapseVisible] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [flashResult, setFlashResult] = useState(null);
  const [showManage, setShowManage] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [declareModal, setDeclareModal] = useState(false);
  const [declareChecked, setDeclareChecked] = useState(false);
  const [avatarAnim, setAvatarAnim] = useState(null); // 'jump'|'cheer'|'sink'
  const pendingAnimRef = useRef(null);
  const musicRef = useRef(null);

  function playNeutralSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Bittersweet suspended chord
      [261.6, 329.6, 392, 466.2].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.4);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.06);
        osc.stop(ctx.currentTime + 1.4);
      });
    } catch(e) {}
  }

  function playBadSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Descending dramatic notes
      const notes = [311.1, 277.2, 246.9, 220];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 600;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.18);
        gain.gain.setValueAtTime(0.22, ctx.currentTime + i * 0.18);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.18 + 0.35);
        osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.18);
        osc.stop(ctx.currentTime + i * 0.18 + 0.4);
      });
    } catch(e) {}
  }

  function startMusic(level) {
    if (musicRef.current) stopMusic();
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const master = ctx.createGain();
      master.gain.value = 0.07;
      master.connect(ctx.destination);

      // Pick music style based on environment level
      const envLevel = level !== undefined ? level : state.level;

      // --- LO-FI (Street, level 0-4) ---
      // Slow jazzy chords, muffled, heavy low-pass
      const LOFI_CHORDS = [
        [146.8, 185, 220, 277.2],   // Dm7
        [130.8, 164.8, 196, 246.9], // Cmaj7
        [110, 138.6, 164.8, 207.7], // Am7
        [123.5, 155.6, 185, 233.1], // Bm7b5
      ];

      // --- ROOM/APARTMENT (level 5-9, 10-14) ---
      // Upbeat simple pop chords
      const POP_CHORDS = [
        [261.6, 329.6, 392],  // C
        [220, 277.2, 329.6],  // Am
        [174.6, 220, 261.6],  // F
        [196, 246.9, 293.7],  // G
      ];

      // --- HOUSE/VILLA (level 15-19) ---
      // Cinematic minor, building tension
      const EPIC_CHORDS = [
        [110, 138.6, 164.8, 220],   // Am
        [98, 123.5, 146.8, 196],    // Gm
        [116.5, 146.8, 174.6, 233.1], // Bb
        [130.8, 164.8, 196, 261.6], // C
      ];

      // --- HEAVEN (level 20) ---
      // Bright major, soaring, triumphant
      const HEAVEN_CHORDS = [
        [261.6, 329.6, 392, 523.3],   // Cmaj
        [293.7, 370, 440, 587.3],     // Dmaj
        [329.6, 415.3, 493.9, 659.3], // Emaj
        [349.2, 440, 523.3, 698.5],   // Fmaj
      ];

      let chords, BPM, oscType, filterFreq, melodyNotes, melodyOscType;
      if (envLevel >= 20) {
        // Heaven — bright, fast, triumphant
        chords = HEAVEN_CHORDS; BPM = 96;
        oscType = "sine"; filterFreq = 8000;
        melodyNotes = [523.3, 587.3, 659.3, 698.5, 783.9, 698.5, 659.3, 587.3, 523.3, 493.9, 523.3, 659.3];
        melodyOscType = "triangle";
      } else if (envLevel >= 15) {
        // Epic cinematic
        chords = EPIC_CHORDS; BPM = 72;
        oscType = "sawtooth"; filterFreq = 800;
        melodyNotes = [220, 246.9, 261.6, 220, 196, 174.6, 196, 220, 246.9, 220, 196, 220];
        melodyOscType = "sawtooth";
      } else if (envLevel >= 5) {
        // Pop / upbeat
        chords = POP_CHORDS; BPM = 84;
        oscType = "sine"; filterFreq = 4000;
        melodyNotes = [392, 440, 392, 349.2, 329.6, 349.2, 392, 329.6, 293.7, 329.6, 349.2, 392];
        melodyOscType = "triangle";
      } else {
        // Lo-fi
        chords = LOFI_CHORDS; BPM = 68;
        oscType = "triangle"; filterFreq = 900;
        melodyNotes = [220, 196, 174.6, 164.8, 174.6, 196, 220, 196, 174.6, 164.8, 185, 196];
        melodyOscType = "triangle";
      }

      const BEAT = 60 / BPM;
      const CHORD_DUR = BEAT * 4;
      const LOOP_DUR = CHORD_DUR * chords.length;

      function playChord(frequencies, startTime, duration) {
        frequencies.forEach(freq => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.value = filterFreq;
          osc.type = oscType;
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.9, startTime + 0.6);
          gain.gain.setValueAtTime(0.9, startTime + duration - 0.6);
          gain.gain.linearRampToValueAtTime(0, startTime + duration);
          osc.connect(filter); filter.connect(gain); gain.connect(master);
          osc.start(startTime); osc.stop(startTime + duration);
          // warm sub
          const sub = ctx.createOscillator();
          const subG = ctx.createGain();
          sub.type = "sine"; sub.frequency.value = freq / 2;
          subG.gain.setValueAtTime(0, startTime);
          subG.gain.linearRampToValueAtTime(0.35, startTime + 0.8);
          subG.gain.setValueAtTime(0.35, startTime + duration - 0.6);
          subG.gain.linearRampToValueAtTime(0, startTime + duration);
          sub.connect(subG); subG.connect(master);
          sub.start(startTime); sub.stop(startTime + duration);
        });
      }

      const melodyGain = ctx.createGain();
      melodyGain.gain.value = envLevel >= 20 ? 0.5 : envLevel >= 15 ? 0.3 : 0.35;
      melodyGain.connect(master);

      function playMelodyNote(freq, startTime) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = filterFreq * 1.5;
        osc.type = melodyOscType;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.7, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + BEAT * 0.8);
        osc.connect(filter); filter.connect(gain); gain.connect(melodyGain);
        osc.start(startTime); osc.stop(startTime + BEAT);
      }

      function scheduleLoop(startTime) {
        chords.forEach((chord, i) => playChord(chord, startTime + i * CHORD_DUR, CHORD_DUR + 0.15));
        melodyNotes.forEach((note, i) => playMelodyNote(note, startTime + i * BEAT));
      }

      for (let i = 0; i < 8; i++) scheduleLoop(ctx.currentTime + 0.1 + i * LOOP_DUR);

      musicRef.current = { ctx, master };
      setMusicOn(true);
    } catch(e) {}
  }

  function stopMusic() {
    if (!musicRef.current) return;
    try {
      const { ctx, master } = musicRef.current;
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
      setTimeout(() => { try { ctx.close(); } catch(e){} }, 900);
    } catch(e) {}
    musicRef.current = null;
    setMusicOn(false);
  }

  function toggleMusic() {
    if (musicOn) stopMusic(); else startMusic(state.level);
  }

  // Trumpet fanfare via Web Audio API
  function playWinSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();

      function playNote(freq, startTime, duration, volume = 0.3) {
        // Sawtooth + square blend = brassy trumpet timbre
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const osc3 = ctx.createOscillator(); // octave harmonic
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc1.type = "sawtooth";
        osc2.type = "square";
        osc3.type = "sawtooth";
        osc1.frequency.value = freq;
        osc2.frequency.value = freq;
        osc3.frequency.value = freq * 2; // octave up — adds brightness

        // Mix oscillators
        const g1 = ctx.createGain(); g1.gain.value = 0.6;
        const g2 = ctx.createGain(); g2.gain.value = 0.25;
        const g3 = ctx.createGain(); g3.gain.value = 0.15;
        osc1.connect(g1); osc2.connect(g2); osc3.connect(g3);
        g1.connect(filter); g2.connect(filter); g3.connect(filter);

        // Bandpass filter — gives that nasal trumpet character
        filter.type = "bandpass";
        filter.frequency.value = freq * 3;
        filter.Q.value = 0.8;
        filter.connect(gain);
        gain.connect(ctx.destination);

        // Trumpet envelope: fast attack, slight decay, sustain, quick release
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
        gain.gain.linearRampToValueAtTime(volume * 0.75, startTime + 0.06);
        gain.gain.setValueAtTime(volume * 0.75, startTime + duration - 0.04);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);

        osc1.start(startTime); osc1.stop(startTime + duration);
        osc2.start(startTime); osc2.stop(startTime + duration);
        osc3.start(startTime); osc3.stop(startTime + duration);
      }

      const t = ctx.currentTime;
      // Classic "ta-ta-ta-TAAA" military fanfare
      playNote(392, t + 0.00, 0.12, 0.28); // G4
      playNote(392, t + 0.13, 0.12, 0.28); // G4
      playNote(392, t + 0.26, 0.12, 0.28); // G4
      playNote(523, t + 0.39, 0.18, 0.32); // C5
      playNote(392, t + 0.58, 0.10, 0.26); // G4
      playNote(523, t + 0.69, 0.38, 0.36); // C5 long

      // Second phrase — rising
      playNote(523, t + 1.15, 0.10, 0.28); // C5
      playNote(587, t + 1.26, 0.10, 0.28); // D5
      playNote(659, t + 1.37, 0.10, 0.28); // E5
      playNote(784, t + 1.48, 0.48, 0.38); // G5 — triumphant final
    } catch(e) {}
  }

  const env = getEnvironment(state.level);
  const isGod = state.level >= 20;

  const [htLoaded,setHtLoaded]=useState(false)
  const htSaveRef=useRef(null)
  const htPendingRef=useRef(false)
  // ── Load: zelfde patroon als taken
  // ── Load: zelfde patroon als taken ───────────────────────────────────────
  useEffect(()=>{
    if(!userId)return
    const htPending=htPendingRef.current
    const load=async()=>{
      try{
        const[{data:s},{data:cv}]=await Promise.all([
          supabase.from('user_data').select('value').eq('user_id',userId).eq('key','habit_state').maybeSingle(),
          supabase.from('user_data').select('value').eq('user_id',userId).eq('key','habit_checks').maybeSingle(),
        ])
        if(!htPendingRef.current){
          if(s?.value){
            const today=new Date().toDateString()
            setState(prev=>({...DEFAULT_STATE,...s.value,todayDate:s.value.todayDate===today?s.value.todayDate:today,todaySubmitted:s.value.todayDate===today?s.value.todaySubmitted:false}))
            try{localStorage.setItem('ht_state_'+userId,JSON.stringify(s.value))}catch{}
          }
          if(cv?.value&&Array.isArray(cv.value)){
            setCheckValues(cv.value)
            try{localStorage.setItem('ht_checks_'+userId,JSON.stringify(cv.value))}catch{}
          }
        }
      }catch(e){console.error('[HT load]',e)
      }finally{setHtLoaded(true)}
    }
    load()
    const ch=supabase.channel('ht-'+userId)
      .on('postgres_changes',{event:'*',schema:'public',table:'user_data',filter:`user_id=eq.${userId}`},()=>load())
      .subscribe()
    const onVisible=()=>{if(document.visibilityState==='visible')load()}
    document.addEventListener('visibilitychange',onVisible)
    return()=>{supabase.removeChannel(ch);document.removeEventListener('visibilitychange',onVisible)}
  },[userId])

  // ── Save: localStorage direct, Supabase na 800ms (zelfde patroon als taken) ─
  useEffect(()=>{
    saveState(state)
    if(!userId||!htLoaded)return
    try{localStorage.setItem('ht_state_'+userId,JSON.stringify(state))}catch{}
    clearTimeout(htSaveRef.current)
    htPendingRef.current=true
    htSaveRef.current=setTimeout(async()=>{
      try{
        await supabase.from('user_data').upsert({user_id:userId,key:'habit_state',value:state,updated_at:new Date().toISOString()},{onConflict:'user_id,key'})
        await supabase.from('user_data').upsert({user_id:userId,key:'habit_checks',value:checkValues,updated_at:new Date().toISOString()},{onConflict:'user_id,key'})
      }catch(e){console.error('[HT save]',e)
      }finally{htPendingRef.current=false}
    },800)
  },[state,checkValues,userId,htLoaded]);
  useEffect(()=>{
    try{localStorage.setItem('ht_checks_'+userId,JSON.stringify(checkValues))}catch{}
  },[checkValues,userId]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("discipline-engine-checks");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only use saved if length matches current checks
        if (parsed.length === state.checks.length) {
          setCheckValues(parsed);
          return;
        }
      }
    } catch {}
    setCheckValues(Array(state.checks.length).fill(null).map(() => ({ count: 0, na: false })));
  }, [state.checks.length]);

  // Restart music when environment changes (every 5 levels)
  const envTier = Math.floor(state.level / 5);
  useEffect(() => {
    if (musicOn) startMusic(state.level);
  }, [envTier]);

  function handleCheckChange(i, val) {
    setCheckValues(prev => { const n = [...prev]; n[i] = val; return n; });
  }

  function playTickSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Short satisfying "pop" — high sine blip + soft click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.14);
      // Soft click layered on top
      const click = ctx.createOscillator();
      const clickGain = ctx.createGain();
      click.type = "square";
      click.frequency.value = 2400;
      clickGain.gain.setValueAtTime(0.08, ctx.currentTime);
      clickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      click.connect(clickGain); clickGain.connect(ctx.destination);
      click.start(ctx.currentTime);
      click.stop(ctx.currentTime + 0.05);
    } catch(e) {}
  }

  function submitDay() {
    const active = checkValues.filter((v, i) => !(v && v.na));
    const achieved = checkValues.filter((v, i) => {
      if (!v || v.na) return false;
      const check = state.checks[i];
      const target = (typeof check === "object" ? check.target : 1) || 1;
      return v.count >= target;
    });
    if (active.length === 0) return;
    const pct = Math.round((achieved.length / active.length) * 100);
    let result, newXp, newStreak, newCollapse;
    if (pct === 100) {
      result = "perfect"; newXp = Math.min(XP_MAX, state.xp + xpGain(state.level));
      newStreak = state.streak + 1; newCollapse = 0;
    } else if (pct >= 80) {
      result = "neutral"; newXp = state.xp; newStreak = 0; newCollapse = state.collapseCounter;
    } else {
      result = "bad"; newXp = Math.max(0, state.xp - xpLoss(state.level));
      newStreak = 0; newCollapse = state.collapseCounter + 1;
    }
    const newLevel = xpToLevel(newXp);
    const histEntry = { date: new Date().toDateString(), result, pct };
    let newBadges = [...state.badges];
    if (newLevel >= 20 && state.level < 20) newBadges.push(`Badge ${toRoman(newBadges.length + 1)}`);
    const didCollapse = newCollapse >= 5;
    if (didCollapse) {
      setCollapseVisible(true);
      setState(prev => ({ ...prev, xp: 0, level: 0, streak: 0, collapseCounter: 0, history: [], badges: newBadges, todaySubmitted: true, todayDate: new Date().toDateString(), lastDayResult: "bad" }));
    } else {
      setState(prev => ({ ...prev, xp: newXp, level: newLevel, streak: newStreak, collapseCounter: newCollapse, badges: newBadges, history: [...prev.history, histEntry], todaySubmitted: true, todayDate: new Date().toDateString(), lastDayResult: result }));
    }
    setFlashResult(result);
    if (result === "perfect") {
      setShowConfetti(true);
      playWinSound();
      setTimeout(() => setShowConfetti(false), 3500);
      pendingAnimRef.current = "cheer";
    } else if (result === "neutral") {
      playNeutralSound();
      pendingAnimRef.current = "jump";
    } else {
      playBadSound();
      pendingAnimRef.current = "sink";
    }
  }

  function voluntaryReset() {
    setState(prev => ({ ...prev, xp: 0, level: 0, streak: 0, collapseCounter: 0, history: [], todaySubmitted: false, lastDayResult: null }));
    setCheckValues(Array(state.checks.length).fill(null).map(() => ({ count: 0, na: false })));
    try { localStorage.removeItem("discipline-engine-checks"); } catch {}
    setShowReset(false); setFlashResult(null);
  }

  const [newCheckTarget, setNewCheckTarget] = useState(1);
  const [newCheckWhy, setNewCheckWhy] = useState("");

  function addCheck() {
    if (!newCheck.trim()) return;
    setState(prev => ({ ...prev, checks: [...prev.checks, { name: newCheck.trim(), target: newCheckTarget, why: newCheckWhy.trim() }] }));
    setNewCheck(""); setNewCheckTarget(1); setNewCheckWhy("");
  }

  function removeCheck(i) {
    setState(prev => ({ ...prev, checks: prev.checks.filter((_, j) => j !== i) }));
  }

  // Env-based overlay color
  const overlayColor = isGod
    ? "rgba(255,214,0,0.18)"
    : state.level >= 15 ? "rgba(156,39,176,0.18)"
    : state.level >= 10 ? "rgba(30,136,229,0.18)"
    : state.level >= 5 ? "rgba(255,143,0,0.18)"
    : "rgba(26,35,126,0.22)";

  const textColor = (state.level >= 5 && state.level < 10) ? "#3e2723" : "white";
  const textColorSub = (state.level >= 5 && state.level < 10) ? "rgba(62,39,35,0.6)" : "rgba(255,255,255,0.6)";

  return (
    <div style={{ width: "100%", maxWidth: 430, margin: "0 auto", minHeight: "100vh", position: "relative", overflow: "hidden", fontFamily: "'Nunito', 'Segoe UI', sans-serif" }}>
      {/* Back button */}
      <div style={{position:"absolute",top:12,left:12,zIndex:999}}>
        <button onClick={()=>{if(musicOn)stopMusic();onBack()}} style={{background:"rgba(0,0,0,0.45)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:6,color:"rgba(255,255,255,0.7)",padding:"5px 12px",cursor:"pointer",fontSize:11,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.1em"}}>← Terug</button>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:0%} 100%{background-position:200%} }
        @keyframes bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes godPulse { 0%,100%{filter:drop-shadow(0 0 10px #ffd700)} 50%{filter:drop-shadow(0 0 28px #ffd700)} }
        @keyframes confettiFall { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:0} }
        @keyframes confettiSway { 0%,100%{margin-left:0px} 50%{margin-left:30px} }
        @keyframes avatarCheer { 0%{transform:translateY(0) scale(1)} 20%{transform:translateY(-18px) scale(1.08)} 40%{transform:translateY(0) scale(1)} 60%{transform:translateY(-10px) scale(1.04)} 80%{transform:translateY(0) scale(1)} 100%{transform:translateY(0) scale(1)} }
        @keyframes avatarJump { 0%{transform:translateY(0)} 40%{transform:translateY(-10px)} 100%{transform:translateY(0)} }
        @keyframes avatarSink { 0%{transform:translateY(0) rotate(0deg)} 30%{transform:translateY(4px) rotate(-4deg)} 60%{transform:translateY(8px) rotate(2deg)} 100%{transform:translateY(6px) rotate(-2deg)} }
        * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
        button { border:none; outline:none; }
      `}</style>

      <CollapseOverlay visible={collapseVisible} onDone={() => setCollapseVisible(false)} />

      {/* ── CONFETTI OVERLAY ── */}
      {showConfetti && (
        <div style={{ position:"fixed", inset:0, zIndex:999, pointerEvents:"none", overflow:"hidden" }}>
          {Array.from({length: 60}).map((_, i) => {
            const colors = ["#66bb6a","#fbbf24","#f87171","#60a5fa","#a78bfa","#f472b6","#34d399","#fb923c"];
            const color  = colors[i % colors.length];
            const left   = Math.random() * 100;
            const delay  = Math.random() * 1.2;
            const dur    = 2.2 + Math.random() * 1.2;
            const size   = 7 + Math.random() * 8;
            const isRect = i % 3 !== 0;
            return (
              <div key={i} style={{
                position:"absolute",
                left: `${left}%`,
                top: -20,
                width:  isRect ? size : size * 0.7,
                height: isRect ? size * 0.5 : size * 0.7,
                borderRadius: isRect ? 2 : "50%",
                background: color,
                animation: `confettiFall ${dur}s ${delay}s ease-in forwards, confettiSway ${dur * 0.6}s ${delay}s ease-in-out infinite`,
                opacity: 1,
              }}/>
            );
          })}
        </div>
      )}

      {/* ─── PAGE: WORLD ─── */}
      {page === "world" && (
        <div style={{ width: "100%", height: "100vh", position: "relative", display: "flex", flexDirection: "column" }}>

          {/* Background */}
          <div style={{ position: "absolute", inset: 0 }}>
            <EnvironmentBG env={env} level={state.level} />
            {/* Subtle overlay for readability */}
            <div style={{ position: "absolute", inset: 0, background: overlayColor, pointerEvents: "none" }} />
          </div>

          {/* Top HUD */}
          <div style={{
            position: "relative", zIndex: 10,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 18px 0",
          }}>
            <div style={{
              background: "rgba(0,0,0,0.28)", backdropFilter: "blur(8px)",
              borderRadius: 16, padding: "8px 16px",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: isGod ? "#ffd700" : textColor, lineHeight: 1 }}>
                {state.level}
              </span>
              <span style={{ fontSize: 11, color: textColorSub, fontWeight: 600 }}>/ 20</span>
              <span style={{ fontSize: 12, color: state.streak > 0 ? "#ffa726" : textColorSub }}>🔥 {state.streak}</span>
              <span style={{ fontSize: 12, color: state.collapseCounter >= 3 ? "#ef5350" : textColorSub }}>💀 {state.collapseCounter}/5</span>
            </div>

            <div style={{
              background: "rgba(0,0,0,0.28)", backdropFilter: "blur(8px)",
              borderRadius: 16, padding: "8px 14px",
              fontSize: 11, color: textColor, fontWeight: 700, letterSpacing: 1,
            }}>
              {env.name.toUpperCase()}
            </div>
          </div>

          {/* Avatar — centered in world */}
          <div style={{
            position: "relative", zIndex: 10,
            flex: 1,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "flex-end",
            paddingBottom: 40,
          }}>
            <div style={{
              animation: avatarAnim === "cheer" ? "avatarCheer 1.8s ease"
                : avatarAnim === "jump" ? "avatarJump 0.9s ease"
                : avatarAnim === "sink" ? "avatarSink 1.2s ease forwards"
                : isGod ? "godPulse 2s infinite" : "bob 3s ease-in-out infinite",
              transformOrigin: "bottom center",
            }}>
              <AvatarSVG level={state.level} />
            </div>
            {/* Stage label */}
            <div style={{
              marginTop: 8,
              background: "rgba(0,0,0,0.3)", backdropFilter: "blur(6px)",
              borderRadius: 20, padding: "4px 18px",
              fontSize: 11, fontWeight: 800, letterSpacing: 3,
              color: isGod ? "#ffd700" : "white",
            }}>
              {["BEGINNER","RISING","STRONG","ELITE","GOD"][Math.min(Math.floor(state.level / 5), 4)]}
            </div>
          </div>

          {/* Bottom panel */}
          <div style={{
            position: "relative", zIndex: 10,
            background: "rgba(0,0,0,0.42)", backdropFilter: "blur(16px)",
            borderRadius: "24px 24px 0 0",
            padding: "18px 20px 28px",
          }}>
            {/* XP Bar */}
            <div style={{ marginBottom: 14 }}>
              <ProgressBar xp={state.xp} level={state.level} />
            </div>

            {/* Day result flash */}
            {flashResult && (
              <div style={{
                marginBottom: 12, padding: "10px 14px", borderRadius: 12,
                background: flashResult === "perfect" ? "rgba(102,187,106,0.18)" : flashResult === "neutral" ? "rgba(255,167,38,0.18)" : "rgba(239,83,80,0.18)",
                border: `1.5px solid ${flashResult === "perfect" ? "#66bb6a55" : flashResult === "neutral" ? "#ffa72655" : "#ef535055"}`,
                display: "flex", alignItems: "center", gap: 10,
                animation: "slideUp 0.4s ease",
              }}>
                <span style={{ fontSize: 20 }}>{flashResult === "perfect" ? "⭐" : flashResult === "neutral" ? "➡️" : "💔"}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: flashResult === "perfect" ? "#a5d6a7" : flashResult === "neutral" ? "#ffcc80" : "#ef9a9a", letterSpacing: 1 }}>
                    {flashResult === "perfect" ? "PERFECTE DAG" : flashResult === "neutral" ? "NEUTRALE DAG" : "SLECHTE DAG"}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                    {flashResult === "perfect" ? "XP gewonnen. Streak +1." : flashResult === "neutral" ? "Geen verandering. Streak gebroken." : "XP verloren. Streak gebroken."}
                  </div>
                </div>
              </div>
            )}

            {/* History */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: 2, marginBottom: 8, fontWeight: 700 }}>LAATSTE 30 DAGEN</div>
              <HistoryTimeline history={state.history} />
            </div>

            {/* Badges */}
            {state.badges.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                {state.badges.map((b, i) => (
                  <div key={i} style={{
                    padding: "3px 10px", borderRadius: 20,
                    border: "1px solid #ffd70055", background: "rgba(255,215,0,0.08)",
                    fontSize: 10, color: "#ffd700", fontWeight: 700, letterSpacing: 1,
                  }}>✦ {b}</div>
                ))}
              </div>
            )}

            {/* Nav buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setPage("goals")} style={{
                flex: 1, padding: "13px", borderRadius: 14,
                background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.18)",
                color: "white", fontSize: 13, fontWeight: 800, cursor: "pointer",
                letterSpacing: 1,
              }}>
                📋 DOELEN
              </button>
              <button onClick={toggleMusic} style={{
                padding: "13px 16px", borderRadius: 14,
                background: musicOn ? "rgba(255,255,255,0.15)" : "transparent",
                border: `1.5px solid ${musicOn ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)"}`,
                color: musicOn ? "white" : "rgba(255,255,255,0.35)", fontSize: 16, cursor: "pointer",
              }}>{musicOn ? "🔊" : "🔇"}</button>
              {!showReset ? (
                <button onClick={() => setShowReset(true)} style={{
                  padding: "13px 16px", borderRadius: 14,
                  background: "transparent", border: "1.5px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.35)", fontSize: 11, cursor: "pointer",
                }}>↺</button>
              ) : (
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={voluntaryReset} style={{
                    padding: "13px 12px", borderRadius: 14,
                    background: "rgba(239,83,80,0.2)", border: "1.5px solid #ef535055",
                    color: "#ef5350", fontSize: 11, cursor: "pointer", fontWeight: 700,
                  }}>Reset</button>
                  <button onClick={() => setShowReset(false)} style={{
                    padding: "13px 12px", borderRadius: 14,
                    background: "transparent", border: "1.5px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer",
                  }}>✕</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── PAGE: GOALS ─── */}
      {page === "goals" && (
        <div style={{
          minHeight: "100vh",
          background: "#0f1117",
          display: "flex", flexDirection: "column",
        }}>
          {/* Header */}
          <div style={{
            padding: "18px 20px 0",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            paddingBottom: 16,
          }}>
            <button onClick={() => {
              setPage("world");
              if (pendingAnimRef.current) {
                const anim = pendingAnimRef.current;
                pendingAnimRef.current = null;
                const dur = anim === "cheer" ? 1800 : anim === "jump" ? 900 : 1200;
                setTimeout(() => setAvatarAnim(anim), 80);
                setTimeout(() => setAvatarAnim(null), 80 + dur);
              }
            }} style={{
              background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.1)",
              borderRadius: 12, padding: "8px 14px",
              color: "white", fontSize: 13, cursor: "pointer", fontWeight: 700,
            }}>← Wereld</button>
            <div style={{ fontSize: 14, fontWeight: 800, color: "white", letterSpacing: 2 }}>DOELEN</div>
            <button onClick={() => setShowManage(!showManage)} style={{
              background: showManage ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.07)",
              border: "1.5px solid rgba(255,255,255,0.1)",
              borderRadius: 12, padding: "8px 14px",
              color: "white", fontSize: 13, cursor: "pointer", fontWeight: 700,
            }}>⚙️</button>
          </div>

          <div style={{ flex: 1, padding: "20px", overflowY: "auto" }}>
            {/* Date + status */}
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 16, letterSpacing: 1, fontWeight: 600 }}>
              {new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
              {state.todaySubmitted && <span style={{ marginLeft: 10, color: "#66bb6a", fontSize: 10 }}>✓ INGEDIEND</span>}
            </div>

            {/* Manage panel */}
            {showManage && (
              <div style={{
                marginBottom: 20, padding: 16, borderRadius: 16,
                background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.08)",
                animation: "slideUp 0.3s ease",
              }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: 2, marginBottom: 12, fontWeight: 700 }}>DOEL TOEVOEGEN</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input
                    value={newCheck}
                    onChange={e => setNewCheck(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addCheck()}
                    placeholder="Nieuw doel..."
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: 10,
                      border: "1.5px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.07)",
                      color: "white", fontSize: 13, outline: "none",
                    }}
                  />
                  <button onClick={addCheck} style={{
                    padding: "10px 16px", borderRadius: 10,
                    background: "rgba(102,187,106,0.2)", border: "1.5px solid #66bb6a55",
                    color: "#a5d6a7", fontSize: 18, cursor: "pointer",
                  }}>+</button>
                </div>
                <input value={newCheckWhy} onChange={e=>setNewCheckWhy(e.target.value)} placeholder="Waarom is deze gewoonte belangrijk? (optioneel)" style={{width:'100%',background:'none',border:'none',borderBottom:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.5)',fontFamily:F,fontSize:10,padding:'4px 0',outline:'none',marginBottom:12,fontStyle:'italic'}}/>
                {/* Target selector */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", flex: 1 }}>Aantal keer per dag</span>
                  <button onClick={() => setNewCheckTarget(t => Math.max(1, t - 1))} style={{
                    width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 16, cursor: "pointer",
                  }}>−</button>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "white", minWidth: 20, textAlign: "center" }}>{newCheckTarget}</span>
                  <button onClick={() => setNewCheckTarget(t => Math.min(20, t + 1))} style={{
                    width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 16, cursor: "pointer",
                  }}>+</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {state.checks.map((c, i) => (
                    <div key={i}
                      draggable
                      onDragStart={() => setDragIndex(i)}
                      onDragOver={e => { e.preventDefault(); setDragOver(i); }}
                      onDrop={() => {
                        if (dragIndex === null || dragIndex === i) return;
                        const newChecks = [...state.checks];
                        const [moved] = newChecks.splice(dragIndex, 1);
                        newChecks.splice(i, 0, moved);
                        setState(prev => ({ ...prev, checks: newChecks }));
                        setDragIndex(null); setDragOver(null);
                      }}
                      onDragEnd={() => { setDragIndex(null); setDragOver(null); }}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "8px 12px", borderRadius: 8,
                        background: dragOver === i ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${dragOver === i ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"}`,
                        opacity: dragIndex === i ? 0.4 : 1,
                        cursor: "grab", transition: "all 0.15s",
                      }}>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginRight: 8, userSelect: "none" }}>☰</span>
                      <div style={{flex:1,display:'flex',flexDirection:'column',gap:2}}>
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{typeof c === "object" ? c.name : c}</span>
                        {typeof c === "object" && c.why && <span style={{fontSize:10,color:'rgba(255,255,255,0.35)',fontStyle:'italic'}}>{c.why}</span>}
                      </div>
                      {typeof c === "object" && c.target > 1 && (
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginRight: 8 }}>×{c.target}</span>
                      )}
                      <button onClick={() => removeCheck(i)} style={{
                        background: "transparent", color: "rgba(255,255,255,0.25)",
                        fontSize: 16, cursor: "pointer", padding: "0 4px",
                      }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Checklist */}
            {state.checks.length === 0 ? (
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", padding: 40, fontSize: 13 }}>
                Geen doelen. Voeg er toe via ⚙️
              </div>
            ) : (
              <CheckList checks={state.checks} values={checkValues} onChange={handleCheckChange} submitted={state.todaySubmitted} />
            )}

            {/* Progress today */}
            {!state.todaySubmitted && state.checks.length > 0 && (
              <div style={{ marginTop: 16 }}>
                {(() => {
                  const active = checkValues.filter((v) => !(v && v.na)).length;
                  const done = checkValues.filter((v, i) => {
                    if (!v || v.na) return false;
                    const check = state.checks[i];
                    const target = (typeof check === "object" ? check.target : 1) || 1;
                    return v.count >= target;
                  }).length;
                  const pct = active > 0 ? Math.round(done / active * 100) : 0;
                  const barColor = pct === 100 ? "#66bb6a" : pct >= 80 ? "#ffa726" : "#ef5350";
                  return (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6, fontWeight: 600 }}>
                        <span>VOORTGANG VANDAAG</span>
                        <span style={{ color: barColor }}>{done}/{active} · {pct}%</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: barColor, transition: "width 0.4s ease" }} />
                      </div>
                      <div style={{ marginTop: 6, fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
                        {pct === 100 ? "⭐ Perfecte dag mogelijk!" : pct >= 80 ? "➡️ Neutrale dag (geen XP verandering)" : "⚠️ Slechte dag als je nu indient"}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Submit */}
            {!state.todaySubmitted && state.checks.length > 0 && (
              <button onClick={()=>{setDeclareChecked(false);setDeclareModal(true)}} style={{
                width: "100%", padding: "15px", borderRadius: 16,
                background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.15)",
                color: "white", fontSize: 14, fontWeight: 800, cursor: "pointer",
                letterSpacing: 2, marginTop: 4,
                transition: "background 0.2s",
              }}
                onTouchStart={e => e.currentTarget.style.background = "rgba(255,255,255,0.18)"}
                onTouchEnd={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
              >
                DAG INDIENEN
              </button>
            )}
            {/* Declaration modal */}
            {declareModal && (
              <div style={{position:"fixed",inset:0,zIndex:900,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}>
                <div style={{background:"#0c0c0c",border:"1px solid rgba(255,255,255,0.1)",borderRadius:16,padding:"28px 24px",maxWidth:360,width:"100%"}}>
                  <div style={{fontSize:13,color:"rgba(255,255,255,0.85)",fontWeight:700,marginBottom:10,letterSpacing:1}}>VERKLARING</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",lineHeight:1.7,marginBottom:20}}>
                    Verklaar je bij deze dat je alle gegevens naar absolute waarheid hebt ingevuld?
                  </div>
                  <label style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer",marginBottom:24}}>
                    <div onClick={()=>setDeclareChecked(v=>!v)}
                      style={{width:20,height:20,borderRadius:4,border:"1.5px solid rgba(255,255,255,0.25)",background:declareChecked?"rgba(255,255,255,0.9)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background 0.15s"}}>
                      {declareChecked && <span style={{color:"#000",fontSize:13,fontWeight:900}}>✓</span>}
                    </div>
                    <span style={{fontSize:12,color:"rgba(255,255,255,0.6)"}}>Ik verklaar dat</span>
                  </label>
                  <div style={{display:"flex",gap:10}}>
                    <button onClick={()=>{if(!declareChecked)return;setDeclareModal(false);submitDay()}}
                      style={{flex:1,padding:"12px",borderRadius:10,background:declareChecked?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.1)",border:"none",color:declareChecked?"#000":"rgba(255,255,255,0.25)",fontSize:12,fontWeight:800,cursor:declareChecked?"pointer":"not-allowed",letterSpacing:1,transition:"background 0.2s"}}>
                      BEVESTIGEN
                    </button>
                    <button onClick={()=>setDeclareModal(false)}
                      style={{padding:"12px 18px",borderRadius:10,background:"transparent",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.4)",fontSize:12,cursor:"pointer"}}>
                      Annuleer
                    </button>
                  </div>
                </div>
              </div>
            )}

            {state.todaySubmitted && (
              <div style={{
                marginTop: 16, padding: "14px", borderRadius: 16, textAlign: "center",
                background: "rgba(102,187,106,0.1)", border: "1.5px solid rgba(102,187,106,0.2)",
              }}>
                <div style={{ fontSize: 13, color: "#a5d6a7", fontWeight: 700 }}>Dag ingediend ✓</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>Ga terug naar je wereld om je voortgang te zien.</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
