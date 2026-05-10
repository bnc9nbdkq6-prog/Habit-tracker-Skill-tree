'use client'
import { useState, useRef, useEffect, useCallback } from "react"
import { supabase } from './lib/supabase'

const F="'JetBrains Mono',monospace", BG='#0f0f0f', SRF='#131313', SRF2='#1a1a1a'
const BR='#212121', TX='#efefef', TX2='#464646', AC='#4f8ef7', DG='#e05555', WN='#e0a855', OK='#55a86e'
const HOUR_H = 64

const localDateStr = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
const todayStr = () => localDateStr(new Date())
const offDay = n => { const d=new Date(); d.setDate(d.getDate()+n); return localDateStr(d) }
const fmtShort = s => s ? new Date(s+'T00:00').toLocaleDateString('nl-NL',{day:'numeric',month:'short'}) : ''
const fmtHdr = s => s ? `${new Date(s+'T00:00').toLocaleDateString('nl-NL',{day:'numeric',month:'short'})} · ${new Date(s+'T00:00').toLocaleDateString('nl-NL',{weekday:'long'})}` : ''
const lc = l => l==='hoog'?DG:l==='midden'?WN:TX2

const INIT_PROJS=[
  {id:'inbox',name:'Inbox',color:'#525252',description:'',goal:''},
  {id:'werk',name:'Werk',color:'#4f8ef7',description:'',goal:''},
  {id:'pers',name:'Persoonlijk',color:'#55a86e',description:'',goal:''},
  {id:'stud',name:'Studie',color:'#e0a855',description:'',goal:''},
]
// Module-level ref so pc/pn work in all components without prop drilling
const _projsRef={current:INIT_PROJS}
const pc = id => _projsRef.current.find(p=>p.id===id)?.color||'#555'
const pn = id => _projsRef.current.find(p=>p.id===id)?.name||''

const parseDur = s => {
  if (!s) return 60
  const h=s.toLowerCase().match(/(\d+\.?\d*)\s*uur/)
  const m=s.toLowerCase().match(/(\d+)\s*min/)
  return (h?parseFloat(h[1])*60:0)+(m?parseInt(m[1]):0)||60
}

const parseNlDate = val => {
  const v=(val||'').toLowerCase().trim(); if(!v)return null
  const d=new Date()
  if(v==='vandaag')return localDateStr(d)
  if(v==='morgen'){d.setDate(d.getDate()+1);return localDateStr(d)}
  const days=['zo','ma','di','wo','do','vr','za'], di=days.indexOf(v)
  if(di!==-1){let diff=di-d.getDay();if(diff<=0)diff+=7;d.setDate(d.getDate()+diff);return localDateStr(d)}
  if(v==='wk'){let diff=8-d.getDay();if(diff>=8)diff-=7;d.setDate(d.getDate()+diff);return localDateStr(d)}
  const dm=v.match(/^(\d{1,2})-(\d{1,2})$/)
  if(dm){const nd=new Date();nd.setMonth(parseInt(dm[2])-1);nd.setDate(parseInt(dm[1]));return localDateStr(nd)}
  return val
}

// Fix 3: correct next-date calculation, always based on TODAY for daily
const getNextDate = task => {
  const r=task.recurrence; if(!r)return null
  const base=task.scheduledDate||task.deadline||todayStr()
  const d=new Date(base+'T00:00')
  switch(r.type){
    case 'daily':   d.setDate(d.getDate()+1); break
    case 'weekly':  d.setDate(d.getDate()+7); break
    case 'monthly': d.setMonth(d.getMonth()+1); break
    case 'yearly':  d.setFullYear(d.getFullYear()+1); break
    case 'every_x': d.setDate(d.getDate()+(r.x||1)); break
    case 'specific_days': {
      const ds=r.days||[]; if(!ds.length)return null
      let nx=new Date(d); nx.setDate(nx.getDate()+1)
      for(let i=0;i<7;i++){if(ds.includes(nx.getDay()))break;nx.setDate(nx.getDate()+1)}
      return localDateStr(nx)
    }
    default: return null
  }
  return localDateStr(d)
}

const TODAY=todayStr()
const INIT=[
  {id:'t1',title:'E-mails beantwoorden',projectId:'werk',description:'Openstaande klant-e-mails',scheduledDate:TODAY,deadline:TODAY,urgency:'hoog',importance:'hoog',duration:'30 min',completed:false,subtasks:[{id:'s1',title:'Jan Bakker',completed:false},{id:'s2',title:'Sarah de Vries',completed:true}],scheduledTime:9,recurrence:null},
  {id:'t2',title:'Rapport Q3 schrijven',projectId:'werk',description:'',scheduledDate:TODAY,deadline:TODAY,urgency:'hoog',importance:'hoog',duration:'2 uur',completed:false,subtasks:[],scheduledTime:10,recurrence:null},
  {id:'t3',title:'Presentatie voorbereiden',projectId:'werk',description:'Slides kwartaalmeeting',scheduledDate:TODAY,deadline:TODAY,urgency:'midden',importance:'hoog',duration:'1.5 uur',completed:false,subtasks:[],scheduledTime:null,recurrence:null},
  {id:'t4',title:'Boodschappen doen',projectId:'pers',description:'',scheduledDate:TODAY,deadline:TODAY,urgency:'laag',importance:'laag',duration:'45 min',completed:false,subtasks:[],scheduledTime:null,recurrence:null},
  {id:'t5',title:'Hardlopen',projectId:'pers',description:'5km rondje park',scheduledDate:TODAY,deadline:TODAY,urgency:'midden',importance:'hoog',duration:'45 min',completed:false,subtasks:[],scheduledTime:null,recurrence:{type:'daily'}},
  {id:'t6',title:'Dagboek schrijven',projectId:'pers',description:'',scheduledDate:TODAY,deadline:TODAY,urgency:'laag',importance:'midden',duration:'15 min',completed:false,subtasks:[],scheduledTime:null,recurrence:{type:'daily'}},
  {id:'t7',title:'Wekelijkse review',projectId:'werk',description:'',scheduledDate:offDay(1),deadline:offDay(1),urgency:'midden',importance:'hoog',duration:'30 min',completed:false,subtasks:[],scheduledTime:null,recurrence:{type:'weekly'}},
  {id:'t8',title:'Hoofdstuk 3 lezen',projectId:'stud',description:'',scheduledDate:offDay(2),deadline:offDay(2),urgency:'midden',importance:'hoog',duration:'1 uur',completed:false,subtasks:[],scheduledTime:null,recurrence:null},
  {id:'t9',title:'Samenvatting maken',projectId:'stud',description:'',scheduledDate:offDay(3),deadline:offDay(4),urgency:'laag',importance:'midden',duration:'30 min',completed:false,subtasks:[],scheduledTime:null,recurrence:null},
  {id:'t10',title:'Belastingaangifte',projectId:'inbox',description:'',scheduledDate:null,deadline:null,urgency:null,importance:null,duration:null,completed:false,subtasks:[],scheduledTime:null,recurrence:null},
  {id:'t11',title:'Agenda bijwerken',projectId:'inbox',description:'',scheduledDate:offDay(5),deadline:offDay(6),urgency:null,importance:null,duration:null,completed:false,subtasks:[],scheduledTime:null,recurrence:null},
]

// ─── Small shared ──────────────────────────────────────────────────────────
const Lbl=({c})=><div style={{fontSize:'9px',color:TX2,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'3px'}}>{c}</div>
const Check=({done,size=15,onToggle})=>(
  <div onClick={e=>{e.stopPropagation();onToggle()}} style={{width:size,height:size,borderRadius:'50%',border:`1.5px solid ${done?AC:'#2a2a2a'}`,background:done?AC:'transparent',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .12s'}}>
    {done&&<svg width={size*.55} height={size*.55} viewBox="0 0 10 8"><polyline points="1,4 4,7 9,1" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>}
  </div>
)
const DropLine=()=><div style={{height:'2px',background:AC,margin:'0 16px',borderRadius:'1px',opacity:.9}}/>

// ─── Recurrence picker ─────────────────────────────────────────────────────
const DAYS_NL=['Zo','Ma','Di','Wo','Do','Vr','Za']
const REC_OPTS=[{v:'',l:'Geen'},{v:'daily',l:'Elke dag'},{v:'weekly',l:'Elke week'},{v:'specific_days',l:'Specifieke dagen'},{v:'monthly',l:'Elke maand'},{v:'every_x',l:'Elke x dagen'},{v:'yearly',l:'Elk jaar'}]
function RecPicker({value,onChange,onSubmit}){
  const type=value?.type||''
  const ss={background:SRF2,border:`1px solid ${BR}`,color:TX,fontFamily:F,fontSize:'11px',padding:'3px 5px',borderRadius:'2px',outline:'none'}
  const hk=e=>{if(e.key==='Enter'){e.preventDefault();onSubmit&&onSubmit()}}
  return <div>
    <select value={type} onChange={e=>onChange(e.target.value?{type:e.target.value,days:[],x:1}:null)}
      onKeyDown={hk} style={{...ss,width:'100%',marginBottom:type?'6px':'0'}}>
      {REC_OPTS.map(r=><option key={r.v} value={r.v}>{r.l}</option>)}
    </select>
    {type==='specific_days'&&<div style={{display:'flex',gap:'4px',flexWrap:'wrap',marginTop:'2px'}}>
      {DAYS_NL.map((d,i)=>{const on=value?.days?.includes(i);return <div key={i} onClick={()=>onChange({...value,days:on?value.days.filter(x=>x!==i):[...(value.days||[]),i]})} style={{width:'28px',height:'24px',borderRadius:'2px',background:on?AC:SRF2,border:`1px solid ${on?AC:BR}`,color:on?'#fff':TX2,fontFamily:F,fontSize:'9px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>{d}</div>})}
    </div>}
    {type==='every_x'&&<div style={{display:'flex',alignItems:'center',gap:'6px',marginTop:'4px'}}>
      <span style={{fontSize:'10px',color:TX2}}>Elke</span>
      <input type="number" min="1" value={value?.x||1}
        onChange={e=>onChange({...value,x:parseInt(e.target.value)||1})}
        onKeyDown={hk} style={{width:'44px',...ss}}/>
      <span style={{fontSize:'10px',color:TX2}}>dagen</span>
    </div>}
  </div>
}

// ─── Detail panel (shared between list & calendar) ─────────────────────────
function DetailPanel({task,onUpdate,onAddSubtask,onClose}){
  const [newSub,setNewSub]=useState('')
  const sorted=[...task.subtasks.filter(s=>!s.completed),...task.subtasks.filter(s=>s.completed)]
  const iSt={width:'100%',background:'none',border:'none',borderBottom:`1px solid ${BR}`,color:TX,fontFamily:F,fontSize:'12px',padding:'3px 0',outline:'none'}
  const ss={width:'100%',background:SRF2,border:`1px solid ${BR}`,color:TX,fontFamily:F,fontSize:'11px',padding:'3px 5px',borderRadius:'2px',outline:'none'}
  return(
    <div style={{padding:'12px 16px 16px',background:SRF,borderTop:`1px solid ${BR}`}}>
      {onClose&&<div style={{display:'flex',justifyContent:'flex-end',marginBottom:'6px'}}>
        <button onClick={onClose} style={{background:'none',border:'none',color:TX2,cursor:'pointer',fontFamily:F,fontSize:'13px'}}>✕</button>
      </div>}
      <div style={{marginBottom:'10px'}}><Lbl c="Beschrijving"/><input value={task.description||''} onChange={e=>onUpdate({description:e.target.value})} placeholder="—" style={iSt}/></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 14px',marginBottom:'10px'}}>
        {[['importance','Belang'],['urgency','Urgentie']].map(([k,l])=>(
          <div key={k}><Lbl c={l}/><select value={task[k]||''} onChange={e=>onUpdate({[k]:e.target.value})} style={ss}><option value="">—</option><option value="laag">Laag</option><option value="midden">Midden</option><option value="hoog">Hoog</option></select></div>
        ))}
        <div><Lbl c="Inplannen op"/><input type="date" value={task.scheduledDate||''} onChange={e=>onUpdate({scheduledDate:e.target.value})} style={{...iSt,colorScheme:'dark'}}/></div>
        <div><Lbl c="Tijd"/><input type="time" value={task.scheduledTime!=null?`${String(Math.floor(task.scheduledTime)).padStart(2,'0')}:${String(Math.round((task.scheduledTime-Math.floor(task.scheduledTime))*60)).padStart(2,'0')}`:''} onChange={e=>{if(!e.target.value){onUpdate({scheduledTime:null});return};const[h,m]=e.target.value.split(':');onUpdate({scheduledTime:parseInt(h)+parseInt(m)/60})}} style={{...iSt,colorScheme:'dark'}}/></div>
        <div><Lbl c="Deadline"/><input type="date" value={task.deadline||''} onChange={e=>onUpdate({deadline:e.target.value})} style={{...iSt,colorScheme:'dark'}}/></div>
        <div><Lbl c="Duur"/><input value={task.duration||''} onChange={e=>onUpdate({duration:e.target.value})} placeholder="30 min" style={iSt}/></div>
        <div><Lbl c="Project"/><select value={task.projectId} onChange={e=>onUpdate({projectId:e.target.value})} style={ss}>{_projsRef.current.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      </div>
      <div style={{marginBottom:'12px'}}><Lbl c="Herhaling"/><RecPicker value={task.recurrence} onChange={r=>onUpdate({recurrence:r})}/></div>
      <div><Lbl c="Subtaken"/>
        {sorted.map(st=>(
          <div key={st.id} style={{display:'flex',alignItems:'center',gap:'8px',padding:'5px 0',borderBottom:`1px solid ${BR}`}}>
            <Check done={st.completed} size={12} onToggle={()=>{
              const upd=task.subtasks.map(s=>s.id===st.id?{...s,completed:!s.completed}:s)
              onUpdate({subtasks:[...upd.filter(s=>!s.completed),...upd.filter(s=>s.completed)]})
            }}/>
            <span style={{fontSize:'12px',color:st.completed?TX2:TX,textDecoration:st.completed?'line-through':'none',flex:1}}>{st.title}</span>
          </div>
        ))}
        <div style={{display:'flex',alignItems:'center',gap:'8px',paddingTop:'7px'}}>
          <div style={{width:'12px',height:'12px',borderRadius:'50%',border:`1px dashed ${BR}`,flexShrink:0}}/>
          <input value={newSub} onChange={e=>setNewSub(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&newSub.trim()){onAddSubtask(newSub.trim());setNewSub('')}}}
            placeholder="Subtaak toevoegen..." style={{...iSt,flex:1}}/>
        </div>
      </div>
    </div>
  )
}

// ─── Task item (list view) ─────────────────────────────────────────────────
function TaskItem({task,expanded,onToggle,onComplete,onUpdate,onFocus,onAddSubtask,showProject,dragOver,onDragStart,onDragOver,onDragEnd,onDrop,onTouchStart,onTouchMove,onTouchEnd}){
  const sorted=[...task.subtasks.filter(s=>!s.completed),...task.subtasks.filter(s=>s.completed)]
  return(
    <div>
      {dragOver==='before'&&<DropLine/>}
      <div draggable data-taskid={task.id} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDrop={onDrop} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{borderBottom:`1px solid ${BR}`,touchAction:'pan-y',userSelect:'none'}}>
        <div style={{display:'flex',alignItems:'flex-start',padding:'10px 16px',gap:'10px'}}>
          <div style={{paddingTop:'1px'}}><Check done={task.completed} onToggle={onComplete}/></div>
          <div onClick={onToggle} style={{flex:1,cursor:'pointer',minWidth:0}}>
            <div style={{fontSize:'13px',color:task.completed?TX2:TX,textDecoration:task.completed?'line-through':'none',lineHeight:'1.35'}}>{task.title}</div>
            <div style={{display:'flex',gap:'8px',marginTop:'3px',flexWrap:'wrap',alignItems:'center'}}>
              {showProject&&<span style={{fontSize:'10px',color:pc(task.projectId),display:'flex',alignItems:'center',gap:'3px'}}><span style={{width:'4px',height:'4px',borderRadius:'50%',background:pc(task.projectId),display:'inline-block'}}/>{pn(task.projectId)}</span>}
              {task.urgency&&<span style={{fontSize:'10px',color:lc(task.urgency)}}>↑{task.urgency}</span>}
              {task.scheduledTime!=null&&<span style={{fontSize:'10px',color:TX2}}>{`${String(Math.floor(task.scheduledTime)).padStart(2,'0')}:${String(Math.round((task.scheduledTime-Math.floor(task.scheduledTime))*60)).padStart(2,'0')}`}</span>}
              {task.dAmbitious&&task.dAmbitious!==TODAY&&<span style={{fontSize:'10px',color:'#7ab8f5',display:'flex',alignItems:'center',gap:'2px'}} title="Ambitieuze deadline">⚡{fmtShort(task.dAmbitious)}</span>}
              {task.deadline&&task.deadline!==TODAY&&<span style={{fontSize:'10px',color:TX2}}>{fmtShort(task.deadline)}</span>}
              {task.scheduledDate&&task.scheduledDate!==TODAY&&task.scheduledDate!==task.deadline&&<span style={{fontSize:'10px',color:AC+'bb'}}>📅 {fmtShort(task.scheduledDate)}</span>}
              {task.duration&&<span style={{fontSize:'10px',color:TX2}}>⏱ {task.duration}</span>}
              {task.recurrence&&<span style={{fontSize:'10px',color:TX2}}>↻</span>}
            </div>
            {!expanded&&sorted.length>0&&<div style={{marginTop:'6px'}}>
              {sorted.slice(0,3).map(st=><div key={st.id} style={{display:'flex',alignItems:'center',gap:'6px',padding:'2px 0'}}>
                <Check done={st.completed} size={10} onToggle={()=>{}}/>
                <span style={{fontSize:'10px',color:TX2,textDecoration:st.completed?'line-through':'none'}}>{st.title}</span>
              </div>)}
            </div>}
          </div>
          <button onClick={e=>{e.stopPropagation();onFocus()}} style={{background:'none',border:'none',color:TX2,cursor:'pointer',fontSize:'13px',padding:0,opacity:.18,transition:'opacity .1s',flexShrink:0}} onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity='.18'}>◎</button>
        </div>
        {expanded&&<DetailPanel task={task} onUpdate={onUpdate} onAddSubtask={t=>onAddSubtask(task.id,t)}/>}
      </div>
      {dragOver==='after'&&<DropLine/>}
    </div>
  )
}

// ─── Add form ──────────────────────────────────────────────────────────────
function AddForm({defaultPid,defaultDate,onAdd,onCancel}){
  const FDS=[
    {k:'title',l:'Titel',t:'text',ph:'Taaknaam...'},
    {k:'description',l:'Beschrijving',t:'text',ph:''},
    {k:'projectId',l:'Project',t:'proj'},
    {k:'importance',l:'Belang',t:'sel'},
    {k:'urgency',l:'Urgentie',t:'sel'},
    {k:'scheduledDate',l:'Inplannen op',t:'text',ph:'vandaag, ma, 15-06...'},
    {k:'scheduledTime',l:'Tijd',t:'time',ph:''},
    {k:'dAmbitious',l:'Ambitieuze deadline',t:'text',ph:''},
    {k:'deadline',l:'Harde deadline',t:'text',ph:''},
    {k:'duration',l:'Duur',t:'text',ph:''},
    {k:'recurrence',l:'Herhaling',t:'rec'},
  ]
  const [form,setForm]=useState({title:'',description:'',projectId:defaultPid||'inbox',importance:'',urgency:'',scheduledDate:defaultDate||'',scheduledTime:'',dAmbitious:'',deadline:'',duration:'',recurrence:null})
  const [fi,setFi]=useState(0),refs=useRef([])
  const go=idx=>{if(idx>=0&&idx<FDS.length){setFi(idx);setTimeout(()=>refs.current[idx]?.focus(),0)}}
  const submit=()=>{
    if(!form.title.trim()){go(0);return}
    const sd=form.scheduledDate?parseNlDate(form.scheduledDate):null
    const dl=form.deadline?parseNlDate(form.deadline):sd
    const st=form.scheduledTime?((t=>{const[h,m]=t.split(':');return parseInt(h)+parseInt(m)/60})(form.scheduledTime)):null
    onAdd({id:'n'+Date.now(),...form,scheduledDate:sd,deadline:dl||sd,scheduledTime:st,completed:false,subtasks:[]})
  }
  const hk=(e,idx)=>{
    if(e.key==='Enter'){e.preventDefault();idx<FDS.length-1?go(idx+1):submit()}
    if(e.key==='Tab'){e.preventDefault();go(idx-1)}
    if(e.key==='Escape')onCancel()
  }
  const act=idx=>({flex:1,background:'none',border:'none',borderBottom:`1px solid ${fi===idx?AC:BR}`,color:TX,fontFamily:F,fontSize:idx===0?'13px':'12px',padding:'3px 0',outline:'none'})
  return(
    <div style={{padding:'12px 16px 16px',background:SRF,borderTop:`1px solid ${BR}`}}>
      <div style={{fontSize:'9px',color:AC,letterSpacing:'.12em',textTransform:'uppercase',marginBottom:'11px'}}>Nieuwe taak</div>
      {FDS.map((f,idx)=>(
        <div key={f.k} style={{display:'flex',alignItems:'baseline',gap:'10px',marginBottom:'7px'}}>
          <span style={{fontSize:'9px',color:fi===idx?TX:TX2,width:'76px',flexShrink:0,letterSpacing:'.04em',textTransform:'uppercase'}}>{f.l}</span>
          {f.t==='proj'?<select ref={el=>refs.current[idx]=el} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} onKeyDown={e=>hk(e,idx)} onFocus={()=>setFi(idx)} style={act(idx)}>{_projsRef.current.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
          :f.t==='sel'?<select ref={el=>refs.current[idx]=el} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} onKeyDown={e=>hk(e,idx)} onFocus={()=>setFi(idx)} style={act(idx)}><option value="">—</option><option value="laag">Laag</option><option value="midden">Midden</option><option value="hoog">Hoog</option></select>
          :f.t==='rec'?<div style={{flex:1}}><RecPicker value={form.recurrence} onChange={r=>setForm(p=>({...p,recurrence:r}))} onSubmit={submit}/></div>
          :f.t==='time'?<input ref={el=>refs.current[idx]=el} type="time" value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} onKeyDown={e=>hk(e,idx)} onFocus={()=>setFi(idx)} style={{...act(idx),colorScheme:'dark'}}/>
          :<input ref={el=>refs.current[idx]=el} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} onKeyDown={e=>hk(e,idx)} onFocus={()=>setFi(idx)} placeholder={f.ph||''} autoFocus={idx===0} style={act(idx)}/>}
        </div>
      ))}
      <div style={{fontSize:'9px',color:TX2,margin:'4px 0 10px'}}>Enter → volgende · Tab → vorige · Esc → annuleer</div>
      <div style={{display:'flex',gap:'8px'}}>
        <button onClick={submit} style={{padding:'5px 14px',background:AC,border:'none',borderRadius:'2px',color:'#fff',fontFamily:F,fontSize:'11px',cursor:'pointer'}}>+ Toevoegen</button>
        <button onClick={onCancel} style={{padding:'5px 10px',background:'none',border:`1px solid ${BR}`,borderRadius:'2px',color:TX2,fontFamily:F,fontSize:'11px',cursor:'pointer'}}>Annuleer</button>
      </div>
    </div>
  )
}

// ─── Project Editor ────────────────────────────────────────────────────────
const PALETTE=['#4f8ef7','#e05555','#55a86e','#e0a855','#a855e0','#e07855','#55c8e0','#e055a8','#8ea0b0','#525252','#c0a060','#6080ff']

function ProjectEditor({proj,onSave,onDelete,onClose}){
  const isNew=!proj.id||proj.id==='__new__'
  const isInbox=proj.id==='inbox'
  const [form,setForm]=useState({
    name:proj.name||'',
    description:proj.description||'',
    goal:proj.goal||'',
    color:proj.color||'#4f8ef7',
  })
  const iSt={width:'100%',background:'none',border:'none',borderBottom:`1px solid ${BR}`,color:TX,fontFamily:F,fontSize:'13px',padding:'4px 0',outline:'none',resize:'none'}
  const submit=()=>{if(!form.name.trim())return;onSave({...proj,...form,id:proj.id||('p'+Date.now())})}

  return(
    <div style={{position:'fixed',inset:0,zIndex:300}}>
      <div onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(0,0,0,.75)'}}/>
      <div style={{position:'absolute',bottom:0,left:0,right:0,maxHeight:'90vh',background:SRF,borderRadius:'6px 6px 0 0',display:'flex',flexDirection:'column',overflowY:'auto'}}>
        {/* Header */}
        <div style={{padding:'16px 20px',borderBottom:`1px solid ${BR}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <span style={{fontSize:'10px',color:TX2,letterSpacing:'.12em',textTransform:'uppercase'}}>{isNew?'Nieuw project':'Project bewerken'}</span>
          <button onClick={onClose} style={{background:'none',border:'none',color:TX2,cursor:'pointer',fontFamily:F,fontSize:'15px'}}>✕</button>
        </div>

        <div style={{padding:'20px',flex:1,overflowY:'auto'}}>
          {/* Color dot preview + name on same line */}
          <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px'}}>
            <div style={{width:'12px',height:'12px',borderRadius:'50%',background:form.color,flexShrink:0}}/>
            <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}
              placeholder="Projectnaam..." disabled={isInbox}
              style={{...iSt,fontSize:'16px',flex:1,borderBottom:`1px solid ${form.name?BR:AC}`}}
              autoFocus/>
          </div>

          {/* Description */}
          <div style={{marginBottom:'18px'}}>
            <div style={{fontSize:'9px',color:TX2,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'5px'}}>Omschrijving</div>
            <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}
              placeholder="Waar gaat dit project over?" rows={2}
              style={{...iSt,fontFamily:F,fontSize:'12px',lineHeight:'1.6'}}/>
          </div>

          {/* Goal */}
          <div style={{marginBottom:'24px'}}>
            <div style={{fontSize:'9px',color:TX2,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'5px'}}>Doel</div>
            <textarea value={form.goal} onChange={e=>setForm(p=>({...p,goal:e.target.value}))}
              placeholder="Wat wil je bereiken?" rows={2}
              style={{...iSt,fontFamily:F,fontSize:'12px',lineHeight:'1.6'}}/>
          </div>

          {/* Color palette */}
          {!isInbox&&(
            <div style={{marginBottom:'24px'}}>
              <div style={{fontSize:'9px',color:TX2,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'10px'}}>Kleur</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:'8px',marginBottom:'10px'}}>
                {PALETTE.map(c=>(
                  <div key={c} onClick={()=>setForm(p=>({...p,color:c}))}
                    style={{width:'24px',height:'24px',borderRadius:'50%',background:c,cursor:'pointer',border:`2px solid ${form.color===c?TX:'transparent'}`,boxSizing:'border-box',transition:'border .1s'}}/>
                ))}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <span style={{fontSize:'9px',color:TX2}}>Eigen kleur</span>
                <input type="color" value={form.color} onChange={e=>setForm(p=>({...p,color:e.target.value}))}
                  style={{width:'28px',height:'22px',padding:0,border:`1px solid ${BR}`,background:'none',cursor:'pointer',borderRadius:'2px'}}/>
                <span style={{fontSize:'10px',color:TX2,fontFamily:F}}>{form.color}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <button onClick={submit} disabled={!form.name.trim()}
              style={{padding:'8px 20px',background:form.name.trim()?AC:'#222',border:'none',borderRadius:'2px',color:form.name.trim()?'#fff':TX2,fontFamily:F,fontSize:'12px',cursor:form.name.trim()?'pointer':'default'}}>
              {isNew?'+ Aanmaken':'Opslaan'}
            </button>
            {!isNew&&!isInbox&&(
              <button onClick={()=>onDelete(proj.id)}
                style={{padding:'8px 14px',background:'none',border:`1px solid ${BR}`,borderRadius:'2px',color:DG,fontFamily:F,fontSize:'11px',cursor:'pointer'}}>
                Verwijderen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


// ─── Calendar ──────────────────────────────────────────────────────────────
function KalView({tasks,projs,onUpdate,onAddSubtask,onToggle}){
  // Keep ref in sync so pc/pn return correct colors for new projects
  if(projs)_projsRef.current=projs
  const HOURS=Array.from({length:24},(_,i)=>i) // Fix 3: 0-23
  const [calDrag,setCalDrag]=useState(null)
  const [ghostY,setGhostY]=useState(null)
  const [selectedId,setSelectedId]=useState(null)
  const [localTasks,setLocalTasks]=useState(tasks)
  const gridRef=useRef(null)
  const calTouchRef=useRef({active:false,id:null,startY:0,timer:null})
  useEffect(()=>setLocalTasks(tasks),[tasks])

  const active=localTasks.filter(t=>t&&t.id&&!t.completed)
  const scheduled=active.filter(t=>t.scheduledTime!=null)
  const unscheduled=active.filter(t=>t.scheduledTime==null)
  const now=new Date().getHours()+new Date().getMinutes()/60

  // Fix 4: snap to 15-min grid for drag, full precision for display
  const snapHour=y=>Math.max(0,Math.min(23.75,Math.round((y/HOUR_H)*4)/4))
  const fmtT=h=>{const hh=Math.floor(h),mm=Math.round((h-hh)*60);return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`}

  // Fix 2: compute overlap columns
  const computeCols=list=>{
    const sorted=[...list].sort((a,b)=>a.scheduledTime-b.scheduledTime)
    const cols=[] // array of arrays of task ids
    sorted.forEach(t=>{
      const dur=parseDur(t.duration)/60
      const end=t.scheduledTime+dur
      let placed=false
      for(let c=0;c<cols.length;c++){
        const lastId=cols[c][cols[c].length-1]
        const last=sorted.find(x=>x.id===lastId)
        const lastEnd=last.scheduledTime+parseDur(last.duration)/60
        if(lastEnd<=t.scheduledTime){cols[c].push(t.id);placed=true;break}
      }
      if(!placed)cols.push([t.id])
    })
    // map task id -> {col, total}
    const map={}
    cols.forEach((col,ci)=>{
      col.forEach(id=>{
        // find how many cols overlap with this task
        const t=sorted.find(x=>x.id===id)
        const dur=parseDur(t.duration)/60
        const end=t.scheduledTime+dur
        let total=1
        for(let c2=0;c2<cols.length;c2++){
          if(c2===ci)continue
          const overlaps=cols[c2].some(id2=>{
            const t2=sorted.find(x=>x.id===id2)
            const e2=t2.scheduledTime+parseDur(t2.duration)/60
            return t2.scheduledTime<end&&e2>t.scheduledTime
          })
          if(overlaps)total++
        }
        map[id]={col:ci,total}
      })
    })
    return map
  }
  const colMap=computeCols(scheduled)

  const commitDrop=(id,clientY)=>{
    if(!gridRef.current)return
    const rect=gridRef.current.getBoundingClientRect()
    const relY=clientY-rect.top+gridRef.current.scrollTop-20
    const hour=snapHour(relY)
    setLocalTasks(p=>p.map(t=>t.id===id?{...t,scheduledTime:hour}:t))
    onUpdate(id,{scheduledTime:hour})
    setCalDrag(null);setGhostY(null)
  }

  const onGDO=e=>{
    e.preventDefault()
    if(!gridRef.current)return
    const rect=gridRef.current.getBoundingClientRect()
    setGhostY(e.clientY-rect.top+gridRef.current.scrollTop-20)
  }
  const onGDrop=e=>{e.preventDefault();if(!calDrag)return;commitDrop(calDrag,e.clientY)}

  const mkSidebarTouch=id=>({
    onTouchStart:e=>{
      calTouchRef.current.timer=setTimeout(()=>{calTouchRef.current={...calTouchRef.current,active:true,id};setCalDrag(id);navigator.vibrate&&navigator.vibrate(30)},350)
      calTouchRef.current.startY=e.touches[0].clientY
    },
    onTouchMove:e=>{
      if(!calTouchRef.current.active){if(Math.abs(e.touches[0].clientY-calTouchRef.current.startY)>8)clearTimeout(calTouchRef.current.timer);return}
      e.preventDefault()
      if(!gridRef.current)return
      const rect=gridRef.current.getBoundingClientRect()
      setGhostY(e.touches[0].clientY-rect.top+gridRef.current.scrollTop-20)
    },
    onTouchEnd:e=>{
      clearTimeout(calTouchRef.current.timer)
      if(!calTouchRef.current.active){calTouchRef.current.active=false;return}
      commitDrop(calTouchRef.current.id,e.changedTouches[0].clientY)
      calTouchRef.current={active:false,id:null,startY:0,timer:null}
    },
  })

  const mkBlockTouch=id=>({
    onTouchStart:e=>{
      calTouchRef.current.timer=setTimeout(()=>{calTouchRef.current={...calTouchRef.current,active:true,id};setCalDrag(id);setSelectedId(null);navigator.vibrate&&navigator.vibrate(30)},350)
      calTouchRef.current.startY=e.touches[0].clientY
    },
    onTouchMove:e=>{
      if(!calTouchRef.current.active){if(Math.abs(e.touches[0].clientY-calTouchRef.current.startY)>8)clearTimeout(calTouchRef.current.timer);return}
      e.preventDefault()
      if(!gridRef.current)return
      const rect=gridRef.current.getBoundingClientRect()
      setGhostY(e.touches[0].clientY-rect.top+gridRef.current.scrollTop-20)
    },
    onTouchEnd:e=>{
      clearTimeout(calTouchRef.current.timer)
      if(!calTouchRef.current.active){calTouchRef.current.active=false;return}
      commitDrop(calTouchRef.current.id,e.changedTouches[0].clientY)
      calTouchRef.current={active:false,id:null,startY:0,timer:null}
    },
  })

  const selectedTask=selectedId?localTasks.find(t=>t.id===selectedId):null
  const GRID_H=HOUR_H*24

  return(
    <div style={{display:'flex',height:'100%',overflow:'hidden'}}>
      {/* Sidebar */}
      <div style={{width:'148px',flexShrink:0,borderRight:`1px solid ${BR}`,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:'10px 12px 6px',fontSize:'9px',color:TX2,letterSpacing:'.1em',textTransform:'uppercase',flexShrink:0}}>Niet ingepland</div>
        <div style={{flex:1,overflowY:'auto'}}>
          {unscheduled.map(t=>{const th=mkSidebarTouch(t.id);return(
            <div key={t.id} draggable onDragStart={()=>setCalDrag(t.id)} onClick={()=>setSelectedId(selectedId===t.id?null:t.id)} {...th}
              style={{padding:'7px 12px',borderBottom:`1px solid ${BR}`,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',background:selectedId===t.id?SRF2:'transparent',userSelect:'none',touchAction:'none'}}>
              <div style={{width:'4px',height:'4px',borderRadius:'50%',background:pc(t.projectId),flexShrink:0}}/>
              <span style={{fontSize:'11px',color:TX,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.title}</span>
            </div>
          )})}
          {!unscheduled.length&&<div style={{padding:'14px 12px',fontSize:'10px',color:TX2}}>Alles ingepland.</div>}
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        {selectedTask&&(
          <div style={{flexShrink:0,borderBottom:`1px solid ${BR}`,maxHeight:'55%',overflowY:'auto'}}>
            <div style={{padding:'10px 16px 6px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <Check done={selectedTask.completed} size={14} onToggle={()=>{onToggle(selectedTask.id);setSelectedId(null)}}/>
                <span style={{fontSize:'13px',color:TX}}>{selectedTask.title}</span>
                {selectedTask.recurrence&&<span style={{fontSize:'10px',color:TX2}}>↻</span>}
              </div>
              <button onClick={()=>setSelectedId(null)} style={{background:'none',border:'none',color:TX2,cursor:'pointer',fontFamily:F,fontSize:'13px'}}>✕</button>
            </div>
            <DetailPanel task={selectedTask}
              onUpdate={u=>{onUpdate(selectedTask.id,u);setLocalTasks(p=>p.map(t=>t.id===selectedTask.id?{...t,...u}:t))}}
              onAddSubtask={title=>onAddSubtask(selectedTask.id,title)}/>
          </div>
        )}
        <div ref={gridRef} style={{flex:1,overflowY:'auto',position:'relative'}}
          onDragOver={onGDO} onDrop={onGDrop} onDragLeave={()=>setGhostY(null)}>
          <div style={{padding:'4px 12px 2px',fontSize:'9px',color:TX2,position:'sticky',top:0,background:BG,zIndex:10}}>
            {new Date().toLocaleDateString('nl-NL',{weekday:'long',day:'numeric',month:'long'})}
          </div>
          <div style={{position:'relative',height:`${GRID_H}px`}}>
            {HOURS.map(h=>{const cur=Math.floor(now)===h;return(
              <div key={h} style={{position:'absolute',top:`${h*HOUR_H}px`,left:0,right:0,display:'flex',height:`${HOUR_H}px`}}>
                <div style={{width:'38px',padding:'4px 6px 0',fontSize:'9px',color:cur?AC:TX2,flexShrink:0,textAlign:'right'}}>{String(h).padStart(2,'0')}</div>
                <div style={{flex:1,borderTop:`1px solid ${cur?AC+'55':BR}`}}/>
              </div>
            )})}
            {/* Half-hour lines */}
            {HOURS.map(h=>(
              <div key={'h'+h} style={{position:'absolute',top:`${h*HOUR_H+HOUR_H/2}px`,left:'38px',right:0,height:'1px',background:BR+'88',pointerEvents:'none'}}/>
            ))}
            {/* Now line */}
            <div style={{position:'absolute',left:0,right:0,top:`${now*HOUR_H}px`,zIndex:3,display:'flex',alignItems:'center',pointerEvents:'none'}}>
              <div style={{width:'6px',height:'6px',borderRadius:'50%',background:DG,marginLeft:'32px',flexShrink:0}}/>
              <div style={{flex:1,height:'1px',background:DG,opacity:.6}}/>
            </div>
            {/* Ghost */}
            {calDrag&&ghostY!=null&&<div style={{position:'absolute',left:'42px',right:'12px',top:`${ghostY}px`,height:'2px',background:AC,borderRadius:'1px',zIndex:8,pointerEvents:'none'}}/>}
            {/* Fix 2+4: scheduled blocks with overlap columns and precise positioning */}
            {scheduled.map(t=>{
              const dur=parseDur(t.duration)
              const topPx=t.scheduledTime*HOUR_H
              const hPx=Math.max(22,(dur/60)*HOUR_H)
              const endH=t.scheduledTime+dur/60
              const sel=selectedId===t.id
              const {col=0,total=1}=colMap[t.id]||{}
              const LEFT=42, RIGHT=12
              const availW=`calc(100% - ${LEFT+RIGHT}px)`
              const colW=`calc((100% - ${LEFT+RIGHT}px) / ${total})`
              const colL=`calc(${LEFT}px + (100% - ${LEFT+RIGHT}px) / ${total} * ${col})`
              const bth=mkBlockTouch(t.id)
              return(
                <div key={t.id} draggable
                  onDragStart={()=>{setCalDrag(t.id);setSelectedId(null)}}
                  onClick={()=>setSelectedId(sel?null:t.id)}
                  {...bth}
                  style={{position:'absolute',left:colL,width:colW,top:`${topPx}px`,height:`${hPx}px`,background:sel?'#1f1f1f':SRF2,border:`1px solid ${sel?AC:BR}`,borderLeft:`2px solid ${pc(t.projectId)}`,borderRadius:'2px',padding:'3px 6px',cursor:'pointer',overflow:'hidden',zIndex:sel?5:4,boxSizing:'border-box',transition:'border-color .1s',userSelect:'none',touchAction:'none'}}>
                  <div style={{fontSize:'11px',color:TX,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.title}</div>
                  {hPx>30&&<div style={{fontSize:'8px',color:TX2,marginTop:'1px'}}>{fmtT(t.scheduledTime)}–{fmtT(endH)}</div>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}


// ─── Focus mode ────────────────────────────────────────────────────────────
function FocusMode({task,onClose,onComplete,onUpdate}){
  const totalSec=parseDur(task.duration)*60
  const [secsLeft,setSecsLeft]=useState(totalSec||25*60)
  const [running,setRunning]=useState(true)
  const [done,setDone]=useState(false)
  const timerRef=useRef(null)
  const audioRef=useRef(null)

  // Soft alarm: 3 ascending sine tones
  const playAlarm=()=>{
    try{
      const ctx=new(window.AudioContext||window.webkitAudioContext)()
      const play=(freq,start,dur)=>{
        const o=ctx.createOscillator(),g=ctx.createGain()
        o.connect(g);g.connect(ctx.destination)
        o.frequency.value=freq;o.type='sine'
        g.gain.setValueAtTime(0,ctx.currentTime+start)
        g.gain.linearRampToValueAtTime(0.18,ctx.currentTime+start+0.08)
        g.gain.linearRampToValueAtTime(0,ctx.currentTime+start+dur)
        o.start(ctx.currentTime+start);o.stop(ctx.currentTime+start+dur)
      }
      play(523,0,0.5);play(659,0.55,0.5);play(784,1.1,0.8)
    }catch(e){}
  }

  useEffect(()=>{
    if(running&&!done){
      timerRef.current=setInterval(()=>{
        setSecsLeft(s=>{
          if(s<=1){clearInterval(timerRef.current);setDone(true);playAlarm();return 0}
          return s-1
        })
      },1000)
    } else clearInterval(timerRef.current)
    return()=>clearInterval(timerRef.current)
  },[running,done])

  const total=totalSec||25*60
  const pct=secsLeft/total
  const R=88, CX=100, CY=100
  const circ=2*Math.PI*R
  const dash=circ*pct
  const mm=String(Math.floor(secsLeft/60)).padStart(2,'0')
  const ss=String(secsLeft%60).padStart(2,'0')

  const finish=()=>{onComplete();onClose()}

  return(
    <div style={{position:'fixed',inset:0,zIndex:400,background:BG,display:'flex',flexDirection:'column',fontFamily:F,color:TX,overflowY:'auto'}}>
      {/* Header */}
      <div style={{padding:'14px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
        <span style={{fontSize:'9px',color:TX2,letterSpacing:'.14em',textTransform:'uppercase'}}>Focus</span>
        <button onClick={onClose} style={{background:'none',border:'none',color:TX2,cursor:'pointer',fontSize:'16px',fontFamily:F}}>✕</button>
      </div>

      {/* Title */}
      <div style={{padding:'0 28px 0',textAlign:'center'}}>
        <div style={{fontSize:'9px',color:pc(task.projectId),letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'8px'}}>{pn(task.projectId)}</div>
        <div style={{fontSize:'20px',lineHeight:'1.3',marginBottom:'28px'}}>{task.title}</div>
      </div>

      {/* Timer circle */}
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginBottom:'28px'}}>
        <svg width="200" height="200" viewBox="0 0 200 200">
          {/* Track */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke={BR} strokeWidth="6"/>
          {/* Progress — counter-clockwise drain */}
          <circle cx={CX} cy={CY} r={R} fill="none"
            stroke={done?OK:AC} strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${CX} ${CY})`}
            style={{transition:'stroke-dasharray 0.9s linear,stroke 0.3s'}}/>
          {/* Time text */}
          <text x={CX} y={CY-8} textAnchor="middle" fill={TX} fontSize="28" fontFamily={F} fontWeight="300">{mm}:{ss}</text>
          {done
            ? <text x={CX} y={CY+20} textAnchor="middle" fill={OK} fontSize="10" fontFamily={F} letterSpacing="2">KLAAR</text>
            : <text x={CX} y={CY+20} textAnchor="middle" fill={TX2} fontSize="9" fontFamily={F} letterSpacing="1">{running?'ACTIEF':'GEPAUZEERD'}</text>
          }
        </svg>

        {/* Controls */}
        <div style={{display:'flex',gap:'14px',alignItems:'center',marginTop:'4px'}}>
          {!done&&(
            <button onClick={()=>setRunning(r=>!r)}
              style={{width:'52px',height:'52px',borderRadius:'50%',border:`1.5px solid ${BR}`,background:SRF2,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:TX,fontSize:'18px'}}>
              {running?'⏸':'▶'}
            </button>
          )}
          <button onClick={finish}
            style={{padding:'10px 22px',borderRadius:'2px',border:`1px solid ${BR}`,background:done?AC:'transparent',cursor:'pointer',color:done?'#fff':TX2,fontFamily:F,fontSize:'11px',letterSpacing:'.06em'}}>
            {done?'✓ Afronden':'Eerder afronden'}
          </button>
        </div>
      </div>

      {/* Subtasks */}
      {task.subtasks?.length>0&&(
        <div style={{padding:'0 20px 32px',maxWidth:'480px',width:'100%',margin:'0 auto',boxSizing:'border-box'}}>
          <div style={{fontSize:'9px',color:TX2,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'8px'}}>Subtaken</div>
          {[...task.subtasks.filter(s=>!s.completed),...task.subtasks.filter(s=>s.completed)].map(st=>(
            <div key={st.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 0',borderBottom:`1px solid ${BR}`}}>
              <Check done={st.completed} size={14} onToggle={()=>onUpdate({subtasks:task.subtasks.map(s=>s.id===st.id?{...s,completed:!s.completed}:s)})}/>
              <span style={{fontSize:'13px',color:st.completed?TX2:TX,textDecoration:st.completed?'line-through':'none'}}>{st.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Done section ──────────────────────────────────────────────────────────
function DoneSection({list,id,open,setOpen,renderTask}){
  if(!list.length)return null
  return <>
    <button onClick={()=>setOpen(p=>({...p,[id]:!p[id]}))}
      style={{width:'100%',padding:'10px 16px',background:'none',border:'none',borderTop:`1px solid ${BR}`,color:TX2,fontFamily:F,fontSize:'9px',cursor:'pointer',textAlign:'left',display:'flex',gap:'6px',alignItems:'center',letterSpacing:'.08em',textTransform:'uppercase'}}>
      <span style={{display:'inline-block',transform:open?'rotate(90deg)':'none',transition:'transform .15s'}}>›</span>
      Voltooid ({list.length})
    </button>
    {open&&list.map(t=>renderTask(t,list))}
  </>
}

// ─── Main App ──────────────────────────────────────────────────────────────
export default function App(){
  const [screen,setScreen]=useState('projects')
  const [activePid,setApid]=useState('werk')
  const [tasks,setTasks]=useState(INIT)
  const [projs,setProjs]=useState(INIT_PROJS)
  const [editProj,setEditProj]=useState(null) // null | 'new' | project object
  // Keep module-level ref in sync so pc/pn work in all sub-components
  _projsRef.current=projs
  const [xid,setXid]=useState(null)
  const [fid,setFid]=useState(null)
  const [menu,setMenu]=useState(false)
  const [doneOpen,setDoneOpen]=useState({})
  const [adding,setAdding]=useState(null)
  const [searchQ,setSearchQ]=useState('')
  const [searchOpen,setSearchOpen]=useState(false)
  const [userId,setUserId]=useState(null)
  const [syncing,setSyncing]=useState(false)
  const [dbLoaded,setDbLoaded]=useState(false)
  const [syncStatus,setSyncStatus]=useState(null) // null | 'ok' | string(error)

  // ── Supabase Auth + Sync ───────────────────────────────────────────────────
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session)setUserId(session.user.id)
    })
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{
      setUserId(session?.user?.id||null)
    })
    return()=>subscription.unsubscribe()
  },[])

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!userId)return

    // Stap 1: laad direct uit localStorage zodat taken meteen zichtbaar zijn
    try{
      const lsTasks=localStorage.getItem('tasks_'+userId)
      const lsProjs=localStorage.getItem('projs_'+userId)
      if(lsTasks){const p=JSON.parse(lsTasks);if(p?.length)setTasks(p)}
      if(lsProjs){const p=JSON.parse(lsProjs);if(p?.length)setProjs(p)}
    }catch{}

    // Stap 2: laad ook uit Supabase (overschrijft localStorage als er nieuwere data is)
    const load=async()=>{
      setSyncing(true)
      try{
        const[{data:tRows,error:tErr},{data:pRows}]=await Promise.all([
          supabase.from('tasks').select('*').eq('user_id',userId).order('sort_order'),
          supabase.from('projects').select('*').eq('user_id',userId).order('sort_order'),
        ])
        if(!tErr&&tRows?.length&&!pendingSave.current){
          const mapped=tRows.map(r=>({
            id:r.id,title:r.title,description:r.description,
            projectId:r.project_id,importance:r.importance,urgency:r.urgency,
            scheduledDate:r.scheduled_date,scheduledTime:r.scheduled_time,
            deadline:r.deadline,dAmbitious:r.d_ambitious,duration:r.duration,
            completed:r.completed,subtasks:r.subtasks||[],recurrence:r.recurrence
          }))
          setTasks(mapped)
          try{localStorage.setItem('tasks_'+userId,JSON.stringify(mapped))}catch{}
        }
        if(pRows?.length){
          const mapped=pRows.map(r=>({id:r.id,name:r.name,color:r.color,description:r.description,goal:r.goal}))
          setProjs(mapped)
          try{localStorage.setItem('projs_'+userId,JSON.stringify(mapped))}catch{}
        }
      }catch(e){console.error('[Supabase load error]',e)
      }finally{setSyncing(false);setDbLoaded(true)}
    }
    load()

    // Realtime: sync wijzigingen van andere apparaten
    const ch=supabase.channel('tasks-'+userId)
      .on('postgres_changes',{event:'*',schema:'public',table:'tasks',filter:`user_id=eq.${userId}`},()=>load())
      .on('postgres_changes',{event:'*',schema:'public',table:'projects',filter:`user_id=eq.${userId}`},()=>load())
      .subscribe()

    // Fallback: herlaad vanuit Supabase als app zichtbaar wordt (bijv. wisselen van tab of app)
    const onVisible=()=>{if(document.visibilityState==='visible')load()}
    document.addEventListener('visibilitychange',onVisible)

    return()=>{supabase.removeChannel(ch);document.removeEventListener('visibilitychange',onVisible)}
  },[userId])

  // ── Save tasks ─────────────────────────────────────────────────────────────
  const saveRef=useRef(null)
  const pendingSave=useRef(false)
  useEffect(()=>{
    if(!userId||!dbLoaded)return
    // Altijd direct naar localStorage (overleeft app-sluiten)
    try{localStorage.setItem('tasks_'+userId,JSON.stringify(tasks))}catch{}
    // Naar Supabase na 1200ms (voor sync tussen apparaten)
    clearTimeout(saveRef.current)
    pendingSave.current=true
    saveRef.current=setTimeout(async()=>{
      if(!tasks.length){pendingSave.current=false;return}
      try{
        const rows=tasks.map((t,i)=>({
          id:t.id,user_id:userId,title:t.title,description:t.description||'',
          project_id:t.projectId||'inbox',importance:t.importance||null,
          urgency:t.urgency||null,scheduled_date:t.scheduledDate||null,
          scheduled_time:t.scheduledTime??null,deadline:t.deadline||null,
          d_ambitious:t.dAmbitious||null,duration:t.duration||null,
          completed:t.completed||false,subtasks:t.subtasks||[],
          recurrence:t.recurrence||null,sort_order:i
        }))
        const{error}=await supabase.from('tasks').upsert(rows,{onConflict:'id'})
        if(error){
          console.error('[Supabase save error]',error)
          setSyncStatus(error.message||error.code||'Supabase fout')
        }else{
          // Verwijder taken die niet meer bestaan
          const ids=tasks.map(t=>t.id)
          await supabase.from('tasks').delete().eq('user_id',userId).not('id','in',`(${ids.map(id=>`'${id}'`).join(',')})`)
          setSyncStatus('ok')
        }
      }catch(e){
        console.error('[Supabase save exception]',e)
        setSyncStatus(e.message||'Verbindingsfout')
      }finally{pendingSave.current=false}
    },1200)
  },[tasks,userId,dbLoaded])

  // ── Save projects ──────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!userId||!dbLoaded)return
    try{localStorage.setItem('projs_'+userId,JSON.stringify(projs))}catch{}
    const rows=projs.map((p,i)=>({
      id:p.id,user_id:userId,name:p.name,color:p.color,
      description:p.description||'',goal:p.goal||'',sort_order:i
    }))
    supabase.from('projects').upsert(rows,{onConflict:'id'}).then(({error})=>{
      if(error)console.error('[Projects save error]',error)
    })
  },[projs,userId,dbLoaded])
  const [dragId,setDragId]=useState(null)
  const [dragOver,setDragOver]=useState(null)

  useEffect(()=>{
    const l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&display=swap';document.head.appendChild(l)
    const s=document.createElement('style');s.textContent=`*{box-sizing:border-box;margin:0;padding:0}body{background:#0f0f0f;overflow:hidden}select option{background:#1a1a1a}::-webkit-scrollbar{width:2px}::-webkit-scrollbar-thumb{background:#252525}input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.4)}.dragging-touch{opacity:0.4;background:#1e1e1e}`;document.head.appendChild(s)
  },[])

  const upd=(id,u)=>setTasks(p=>p.map(t=>t.id===id?{...t,...u}:t))
  const addSub=(tid,title)=>setTasks(p=>p.map(t=>t.id===tid?{...t,subtasks:[...t.subtasks,{id:'s'+Date.now(),title,completed:false}]}:t))

  const toggle=id=>{
    const task=tasks.find(t=>t.id===id); if(!task)return
    if(!task.completed&&task.recurrence){
      // Stap 1: toon vinkje
      setTasks(prev=>prev.map(t=>t.id===id?{...t,completed:true}:t))
      // Stap 2: na 600ms herplannen naar volgende datum
      setTimeout(()=>{
        const nd=getNextDate(task)
        if(nd){
          setTasks(prev=>prev.map(t=>t.id===id?{
            ...t,
            completed:false,
            scheduledDate:nd,
            deadline:nd,
            subtasks:t.subtasks.map(s=>({...s,completed:false})),
            // scheduledTime preserved intentionally
          }:t))
        }
      },600)
    } else {
      setTasks(prev=>prev.map(t=>t.id===id?{...t,completed:!t.completed}:t))
    }
  }

  const handleDrop=(fromId,toId,list)=>{
    if(!fromId||fromId===toId){setDragId(null);setDragOver(null);return}
    const ids=list.map(t=>t.id),fi=ids.indexOf(fromId),ti=ids.indexOf(toId)
    if(fi===-1||ti===-1)return
    const arr=[...list];const [moved]=arr.splice(fi,1)
    const ins=dragOver?.pos==='after'?(fi<ti?ti:ti+1):(fi<ti?ti-1:ti)
    arr.splice(Math.max(0,Math.min(arr.length,ins)),0,moved)
    setTasks(prev=>{const rest=prev.filter(t=>!ids.includes(t.id));return [...rest,...arr]})
    setDragId(null);setDragOver(null)
  }

  const touchState=useRef({active:false,id:null,list:null,scrollY:0})

  const mkDrag=(task,list)=>({
    // Desktop drag
    onDragStart:e=>{e.stopPropagation();setDragId(task.id)},
    onDragOver:e=>{e.preventDefault();const r=e.currentTarget.getBoundingClientRect();setDragOver({id:task.id,pos:e.clientY<r.top+r.height/2?'before':'after'})},
    onDragEnd:()=>{setDragId(null);setDragOver(null)},
    onDrop:e=>{e.preventDefault();e.stopPropagation();handleDrop(dragId,task.id,list)},
    // Mobile touch
    onTouchStart:e=>{
      // Long press 350ms to start drag
      touchState.current.timer=setTimeout(()=>{
        e.target.closest('[data-taskid]')?.classList.add('dragging-touch')
        touchState.current={...touchState.current,active:true,id:task.id,list}
        setDragId(task.id)
        // Light haptic if available
        navigator.vibrate&&navigator.vibrate(30)
      },350)
      touchState.current.startY=e.touches[0].clientY
    },
    onTouchMove:e=>{
      // Cancel long press if finger moved >8px
      if(!touchState.current.active){
        if(Math.abs(e.touches[0].clientY-touchState.current.startY)>8){
          clearTimeout(touchState.current.timer)
        }
        return
      }
      e.preventDefault()
      const touch=e.touches[0]
      const el=document.elementFromPoint(touch.clientX,touch.clientY)
      const row=el?.closest('[data-taskid]')
      if(row){
        const tid=row.getAttribute('data-taskid')
        const r=row.getBoundingClientRect()
        setDragOver({id:tid,pos:touch.clientY<r.top+r.height/2?'before':'after'})
      }
    },
    onTouchEnd:e=>{
      clearTimeout(touchState.current.timer)
      if(!touchState.current.active){touchState.current.active=false;return}
      e.target.closest('[data-taskid]')?.classList.remove('dragging-touch')
      if(dragOver){handleDrop(touchState.current.id,dragOver.id,touchState.current.list)}
      touchState.current={active:false,id:null,list:null}
      setDragId(null);setDragOver(null)
    },
  })

  const activeProj=projs.find(p=>p.id===activePid)
  const activePidx=projs.findIndex(p=>p.id===activePid)
  const navProj=dir=>setApid(projs[(activePidx+dir+projs.length)%projs.length].id)
  const focusTask=fid?tasks.find(t=>t.id===fid):null

  // Fix 2: vandaag = all tasks today, flat (no project grouping), user-ordered
  const todayActive=tasks.filter(t=>t&&t.id&&t.scheduledDate===TODAY&&!t.completed)
  const todayDone=tasks.filter(t=>t&&t.id&&t.scheduledDate===TODAY&&t.completed)
  const projActive=tasks.filter(t=>t&&t.id&&t.projectId===activePid&&t.scheduledDate===TODAY&&!t.completed)
  const projDone=tasks.filter(t=>t&&t.id&&t.projectId===activePid&&t.completed)
  const futureTasks=tasks.filter(t=>t&&t.id&&t.scheduledDate&&t.scheduledDate>TODAY&&!t.completed)
  const byDate={}; futureTasks.filter(t=>t&&t.id).forEach(t=>{if(!byDate[t.scheduledDate])byDate[t.scheduledDate]=[];byDate[t.scheduledDate].push(t)})
  const futureDates=Object.keys(byDate).sort()
  const weekDays=Array.from({length:7},(_,i)=>offDay(i))

  const TI=(task,list,showProject=false)=>{
    const dh=mkDrag(task,list)
    return <TaskItem key={task.id} task={task} expanded={xid===task.id}
      onToggle={()=>setXid(xid===task.id?null:task.id)}
      onComplete={()=>{toggle(task.id);if(xid===task.id)setXid(null)}}
      onUpdate={u=>upd(task.id,u)} onFocus={()=>setFid(task.id)}
      onAddSubtask={addSub} showProject={showProject}
      dragOver={dragOver?.id===task.id?dragOver.pos:null} {...dh}/>  }

  const Hdr=()=>(
    <div style={{padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:`1px solid ${BR}`,flexShrink:0}}>
      <button onClick={()=>setMenu(true)} style={{background:'none',border:'none',cursor:'pointer',padding:'4px',display:'flex',flexDirection:'column',gap:'4px'}}>
        <div style={{width:'16px',height:'1px',background:TX2}}/><div style={{width:'16px',height:'1px',background:TX2}}/><div style={{width:'10px',height:'1px',background:TX2}}/>
      </button>
      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
        {screen==='project'&&<div style={{width:'6px',height:'6px',borderRadius:'50%',background:pc(activePid)}}/>}
        <span style={{fontSize:'13px'}}>{screen==='vandaag'?'Vandaag':screen==='komend'?'Komend':screen==='kalender'?'Kalender':activeProj?.name}</span>
      </div>
      {screen==='project'
        ?<div style={{display:'flex'}}>
          <button onClick={()=>navProj(-1)} style={{background:'none',border:'none',color:TX2,cursor:'pointer',fontSize:'20px',padding:'0 5px',fontFamily:F,lineHeight:1}}>‹</button>
          <button onClick={()=>navProj(1)} style={{background:'none',border:'none',color:TX2,cursor:'pointer',fontSize:'20px',padding:'0 5px',fontFamily:F,lineHeight:1}}>›</button>
        </div>
        :<div style={{display:'flex',alignItems:'center',gap:'6px'}}>
          <button onClick={()=>setSearchOpen(true)} style={{background:'none',border:'none',color:TX2,cursor:'pointer',fontFamily:F,fontSize:'15px',padding:'0 4px'}}>⌕</button>
          <div style={{width:'28px',display:'flex',justifyContent:'center'}}>
            {syncing&&<div style={{width:'5px',height:'5px',borderRadius:'50%',background:'#4f8ef7',animation:'pulse 1s infinite'}}/>}
            {!syncing&&syncStatus==='ok'&&<div style={{width:'5px',height:'5px',borderRadius:'50%',background:'#55a86e'}}/>}
            {!syncing&&syncStatus&&syncStatus!=='ok'&&<div style={{width:'5px',height:'5px',borderRadius:'50%',background:'#e05555',cursor:'help'}} title={syncStatus}/>}
          </div>
        </div>}
    </div>
  )

  if(screen==='skilltree')return <SkillTree onBack={()=>setScreen('projects')} userId={userId}/>
  if(screen==='habittracker')return <HabitTracker onBack={()=>setScreen('projects')} userId={userId}/>
  return(
    <div style={{background:BG,height:'100vh',fontFamily:F,color:TX,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      {searchOpen&&<SearchOverlay
        tasks={tasks} projs={projs}
        onClose={()=>setSearchOpen(false)}
        onSelect={t=>{
          setSearchOpen(false)
          // Navigate to the task's project view and expand it
          setActivePid(t.projectId||'inbox')
          setScreen('project')
          setXid(t.id)
        }}/>}
      {editProj&&<ProjectEditor
        proj={editProj==='new'?{id:'__new__',name:'',color:'#4f8ef7',description:'',goal:''}:editProj}
        onSave={p=>{
          if(p.id==='__new__') setProjs(ps=>[...ps,{...p,id:'p'+Date.now()}])
          else setProjs(ps=>ps.map(x=>x.id===p.id?p:x))
          setEditProj(null)
        }}
        onDelete={id=>{
          setTasks(ts=>ts.map(t=>t.projectId===id?{...t,projectId:'inbox'}:t))
          setProjs(ps=>ps.filter(p=>p.id!==id))
          if(activePid===id)setApid('inbox')
          setEditProj(null)
        }}
        onClose={()=>setEditProj(null)}/>}
      {focusTask&&<FocusMode task={focusTask} onClose={()=>setFid(null)} onComplete={()=>toggle(focusTask.id)} onUpdate={u=>upd(focusTask.id,u)}/>}

      {menu&&(
        <div style={{position:'fixed',inset:0,zIndex:200}}>
          <div onClick={()=>setMenu(false)} style={{position:'absolute',inset:0,background:'rgba(0,0,0,.8)'}}/>
          <div style={{position:'absolute',top:0,left:0,bottom:0,width:'215px',background:SRF,display:'flex',flexDirection:'column',overflowY:'auto'}}>
            <div style={{padding:'18px 16px 14px',borderBottom:`1px solid ${BR}`}}>
              <div style={{fontSize:'9px',color:TX2,letterSpacing:'.12em',textTransform:'uppercase',marginBottom:'12px'}}>Weergaven</div>
              {[{l:'Vandaag',s:'vandaag',cnt:todayActive.length},{l:'Komend',s:'komend',cnt:futureTasks.length},{l:'Kalender',s:'kalender'},{l:'Skill Tree',s:'skilltree',color:'#8844cc'},{l:'Habit Tracker',s:'habittracker',color:'#e07855'}].map(({l,s,cnt,color})=>(
                <div key={s} onClick={()=>{setScreen(s);setMenu(false)}} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',cursor:'pointer',color:screen===s?(color||AC):TX2,fontSize:'13px'}} onMouseEnter={e=>e.currentTarget.style.color=TX} onMouseLeave={e=>e.currentTarget.style.color=screen===s?AC:TX2}>
                  <span>{l}</span>{cnt>0&&<span>{cnt}</span>}
                </div>
              ))}
            </div>
            <div style={{padding:'14px 16px',borderBottom:`1px solid ${BR}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                <div style={{fontSize:'9px',color:TX2,letterSpacing:'.12em',textTransform:'uppercase'}}>Projecten</div>
                <button onClick={()=>{setEditProj('new');setMenu(false)}}
                  style={{background:'none',border:`1px solid ${BR}`,borderRadius:'2px',color:TX2,fontFamily:F,fontSize:'9px',padding:'2px 7px',cursor:'pointer',letterSpacing:'.06em'}}>+ Nieuw</button>
              </div>
              {projs.map(p=>{
                const cnt=tasks.filter(t=>t.projectId===p.id&&!t.completed).length
                return <div key={p.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0',cursor:'pointer'}}
                  onMouseEnter={e=>e.currentTarget.style.opacity='.7'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                  <div onClick={()=>{setApid(p.id);setScreen('project');setMenu(false)}} style={{display:'flex',alignItems:'center',gap:'9px',flex:1,minWidth:0}}>
                    <div style={{width:'6px',height:'6px',borderRadius:'50%',background:p.color,flexShrink:0}}/>
                    <span style={{fontSize:'13px',color:activePid===p.id&&screen==='project'?AC:TX,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',flexShrink:0}}>
                    {cnt>0&&<span style={{fontSize:'11px',color:TX2}}>{cnt}</span>}
                    <button onClick={e=>{e.stopPropagation();setEditProj(p);setMenu(false)}}
                      style={{background:'none',border:'none',color:TX2,cursor:'pointer',fontFamily:F,fontSize:'11px',padding:'0 2px',opacity:.5,transition:'opacity .1s'}}
                      onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity='.5'}>✎</button>
                  </div>
                </div>
              })}
            </div>
            <div style={{padding:'14px 16px'}}>
              <div onClick={()=>{const t=todayActive[0];if(t){setFid(t.id);setMenu(false)}}} style={{fontSize:'12px',color:TX2,padding:'7px 0',cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.color=AC} onMouseLeave={e=>e.currentTarget.style.color=TX2}>◎ Focus mode</div>
              <div onClick={()=>{setScreen('projects');setMenu(false)}} style={{fontSize:'12px',color:TX2,padding:'7px 0',cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.color=TX} onMouseLeave={e=>e.currentTarget.style.color=TX2}>← Startscherm</div>
            </div>
          </div>
        </div>
      )}

      {screen==='projects'&&(
        <div style={{flex:1,overflowY:'auto',padding:'36px 24px 0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'36px'}}>
            <div style={{fontSize:'9px',color:TX2,letterSpacing:'.16em',textTransform:'uppercase'}}>Mijn taken</div>
            <button onClick={()=>setSearchOpen(true)} style={{background:'none',border:`1px solid ${BR}`,borderRadius:'2px',color:TX2,fontFamily:F,fontSize:'9px',padding:'4px 11px',cursor:'pointer',letterSpacing:'.08em',display:'flex',alignItems:'center',gap:'5px'}}>
              <span style={{fontSize:'12px'}}>⌕</span> Zoeken
            </button>
          </div>
          {[{label:'Vandaag',s:'vandaag',color:AC,cnt:todayActive.length},{label:'Komend',s:'komend',color:TX2,cnt:futureTasks.length},{label:'Kalender',s:'kalender',color:TX2,cnt:0},{label:'Skill Tree',s:'skilltree',color:'#8844cc',cnt:0},{label:'Habit Tracker',s:'habittracker',color:'#e07855',cnt:0}].map(({label,s,color,cnt})=>(
            <div key={s} onClick={()=>setScreen(s)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'17px 0',borderBottom:`1px solid ${BR}`,cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.opacity='.6'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
              <div style={{display:'flex',alignItems:'center',gap:'13px'}}>
                <div style={{width:'7px',height:'7px',borderRadius:'2px',background:color}}/>
                <span style={{fontSize:'14px'}}>{label}</span>
              </div>
              {cnt>0&&<span style={{fontSize:'12px',color:TX2}}>{cnt}</span>}
            </div>
          ))}
          <div style={{marginTop:'28px',marginBottom:'12px',fontSize:'9px',color:TX2,letterSpacing:'.1em',textTransform:'uppercase'}}>Projecten</div>
          {projs.map(p=>{
            const cnt=tasks.filter(t=>t.projectId===p.id&&!t.completed).length
            return <div key={p.id} onClick={()=>{setApid(p.id);setScreen('project')}} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'17px 0',borderBottom:`1px solid ${BR}`,cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.opacity='.6'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
              <div style={{display:'flex',alignItems:'center',gap:'13px'}}>
                <div style={{width:'7px',height:'7px',borderRadius:'50%',background:p.color}}/>
                <span style={{fontSize:'14px'}}>{p.name}</span>
              </div>
              {cnt>0&&<span style={{fontSize:'12px',color:TX2}}>{cnt}</span>}
            </div>
          })}
        </div>
      )}

      {screen!=='projects'&&(
        <>
          <Hdr/>
          <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>

            {screen==='vandaag'&&(
              <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
                <div style={{flex:1,overflowY:'auto'}}>
                  <div style={{padding:'10px 16px 4px',fontSize:'10px',color:TX2}}>{new Date().toLocaleDateString('nl-NL',{weekday:'long',day:'numeric',month:'long'})}</div>
                  {todayActive.map(t=>TI(t,todayActive,true))}
                  {!todayActive.length&&<div style={{padding:'40px 16px',color:TX2,fontSize:'12px'}}>Geen taken voor vandaag.</div>}
                  <DoneSection list={todayDone} id="vandaag" open={doneOpen['vandaag']} setOpen={setDoneOpen} renderTask={(t,l)=>TI(t,l,true)}/>
                </div>
                <div style={{flexShrink:0,borderTop:adding==='vandaag'?'none':`1px solid ${BR}`}}>
                  {adding==='vandaag'?<AddForm defaultPid="inbox" defaultDate={TODAY} onAdd={t=>{setTasks(p=>[...p,t]);setAdding(null)}} onCancel={()=>setAdding(null)}/>
                  :<button onClick={()=>setAdding('vandaag')} style={{width:'100%',padding:'14px 16px',background:'none',border:'none',color:TX2,fontFamily:F,fontSize:'12px',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:'8px'}}><span style={{fontSize:'16px',lineHeight:1}}>+</span> Taak toevoegen</button>}
                </div>
              </div>
            )}

            {screen==='komend'&&(
              <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
                <div style={{display:'flex',borderBottom:`1px solid ${BR}`,flexShrink:0}}>
                  {weekDays.map(d=>{const date=new Date(d+'T00:00'),isT=d===TODAY,has=(byDate[d]?.length||0)>0;return <div key={d} style={{flex:1,padding:'9px 4px',textAlign:'center',borderRight:`1px solid ${BR}`,background:isT?SRF2:'transparent'}}><div style={{fontSize:'9px',color:TX2,textTransform:'uppercase',letterSpacing:'.04em'}}>{date.toLocaleDateString('nl-NL',{weekday:'short'})}</div><div style={{fontSize:'14px',color:isT?AC:TX,marginTop:'3px'}}>{date.getDate()}</div>{has&&<div style={{width:'3px',height:'3px',borderRadius:'50%',background:isT?AC:TX2,margin:'3px auto 0'}}/>}</div>})}
                </div>
                <div style={{flex:1,overflowY:'auto'}}>
                  {futureDates.map(date=><div key={date}><div style={{padding:'14px 16px 6px',fontSize:'11px',color:TX2,borderBottom:`1px solid ${BR}`}}>{fmtHdr(date)}</div>{byDate[date].map(t=>TI(t,byDate[date],true))}</div>)}
                  {!futureDates.length&&<div style={{padding:'36px 16px',color:TX2,fontSize:'12px'}}>Geen komende taken.</div>}
                </div>
                <div style={{flexShrink:0,borderTop:adding==='komend'?'none':`1px solid ${BR}`}}>
                  {adding==='komend'?<AddForm defaultPid="inbox" defaultDate={offDay(1)} onAdd={t=>{setTasks(p=>[...p,t]);setAdding(null)}} onCancel={()=>setAdding(null)}/>
                  :<button onClick={()=>setAdding('komend')} style={{width:'100%',padding:'14px 16px',background:'none',border:'none',color:TX2,fontFamily:F,fontSize:'12px',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:'8px'}}><span style={{fontSize:'16px',lineHeight:1}}>+</span> Taak toevoegen</button>}
                </div>
              </div>
            )}

            {screen==='project'&&(
              <>
                <div style={{flex:1,overflowY:'auto'}}>
                  <div style={{padding:'10px 16px 4px',fontSize:'10px',color:TX2}}>{new Date().toLocaleDateString('nl-NL',{weekday:'long',day:'numeric',month:'long'})}</div>
                  {projActive.map(t=>TI(t,projActive,false))}
                  <DoneSection list={projDone} id={`p_${activePid}`} open={doneOpen[`p_${activePid}`]} setOpen={setDoneOpen} renderTask={(t,l)=>TI(t,l,false)}/>
                </div>
                <div style={{flexShrink:0,borderTop:adding==='project'?'none':`1px solid ${BR}`}}>
                  {adding==='project'?<AddForm defaultPid={activePid} defaultDate={TODAY} onAdd={t=>{setTasks(p=>[...p,t]);setAdding(null)}} onCancel={()=>setAdding(null)}/>
                  :<button onClick={()=>setAdding('project')} style={{width:'100%',padding:'14px 16px',background:'none',border:'none',color:TX2,fontFamily:F,fontSize:'12px',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:'8px'}}><span style={{fontSize:'16px',lineHeight:1}}>+</span> Taak toevoegen</button>}
                </div>
              </>
            )}

            {/* Fix 1: calendar passes upd and addSub so detail panel works */}
            {screen==='kalender'&&<div style={{flex:1,overflow:'hidden'}}>
              <KalView tasks={tasks} projs={projs} onUpdate={upd} onAddSubtask={addSub} onToggle={toggle}/>
            </div>}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Search Overlay ──────────────────────────────────────────────────────────
function SearchOverlay({tasks,projs,onClose,onSelect}){
  const [q,setQ]=useState('')
  const inp=useRef(null)
  useEffect(()=>{setTimeout(()=>inp.current?.focus(),60)},[])

  const words=q.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const validTasks=tasks.filter(t=>t&&t.id&&typeof t.title==='string')
  const scored=validTasks.map(t=>{
    const hay=t.title.toLowerCase()
    if(!words.length)return{task:t,score:0,match:false}
    let score=0,match=false
    words.forEach(w=>{
      if(hay.startsWith(w)){score+=100;match=true}
      else if(hay.includes(w)){score+=50;match=true}
      else{
        const parts=hay.split(' ')
        parts.forEach(p=>{if(p.startsWith(w)){score+=30;match=true}})
      }
    })
    return{task:t,score,match}
  }).filter(r=>r.match||!q.trim()).sort((a,b)=>b.score-a.score)

  const results=q.trim()?scored.slice(0,8):validTasks.filter(t=>!t.completed).slice(0,8).map(t=>({task:t,score:0,match:true})).map(t=>({task:t,score:0,match:false}))
  const proj=id=>projs.find(p=>p.id===id)

  // Highlight matching chars
  const highlight=(text,query)=>{
    if(!query.trim())return text
    const words=query.trim().toLowerCase().split(/\s+/)
    let result=text,offset=0
    // Simple: bold first match
    const lc=text.toLowerCase()
    for(const w of words){
      const idx=lc.indexOf(w)
      if(idx!==-1){
        return <>{text.slice(0,idx)}<span style={{color:'#fff',fontWeight:'500'}}>{text.slice(idx,idx+w.length)}</span>{text.slice(idx+w.length)}</>
      }
    }
    return text
  }

  return(
    <div style={{position:'fixed',inset:0,zIndex:600,display:'flex',flexDirection:'column',background:'rgba(0,0,0,0.92)'}}>
      <div style={{padding:'14px 16px',borderBottom:`1px solid #1a1a1a`,display:'flex',alignItems:'center',gap:'10px'}}>
        <span style={{fontSize:'14px',color:'#444'}}>⌕</span>
        <input ref={inp} value={q} onChange={e=>setQ(e.target.value)}
          placeholder="Zoek taken..."
          onKeyDown={e=>{if(e.key==='Escape')onClose();if(e.key==='Enter'&&results[0])onSelect(results[0].task)}}
          style={{flex:1,background:'none',border:'none',color:'#efefef',fontFamily:"'JetBrains Mono',monospace",fontSize:'15px',outline:'none'}}/>
        <button onClick={onClose} style={{background:'none',border:'none',color:'#444',cursor:'pointer',fontFamily:"'JetBrains Mono',monospace",fontSize:'16px'}}>✕</button>
      </div>
      <div style={{flex:1,overflowY:'auto'}}>
        {results.length===0&&q.trim()&&(
          <div style={{padding:'32px 20px',color:'#333',fontSize:'12px',fontFamily:"'JetBrains Mono',monospace"}}>Geen taken gevonden voor "{q}"</div>
        )}
        {results.map(({task:t})=>{
          const p=proj(t.projectId)
          const pColor=p?.color||'#444'
          return(
            <div key={t.id} onClick={()=>onSelect(t)}
              style={{padding:'12px 16px',borderBottom:'1px solid #111',cursor:'pointer',display:'flex',alignItems:'center',gap:'12px'}}
              onMouseEnter={e=>e.currentTarget.style.background='#0f0f0f'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{width:'7px',height:'7px',borderRadius:'50%',background:pColor,flexShrink:0,boxShadow:`0 0 5px ${pColor}66`}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'13px',color:t.completed?'#444':'#efefef',textDecoration:t.completed?'line-through':'none',fontFamily:"'JetBrains Mono',monospace"}}>
                  {highlight(t.title,q)}
                </div>
                <div style={{fontSize:'9px',color:'#3a3a3a',marginTop:'3px',fontFamily:"'JetBrains Mono',monospace",letterSpacing:'.06em'}}>
                  {p?.name}{t.deadline?` · ${new Date(t.deadline+'T00:00').toLocaleDateString('nl-NL',{day:'numeric',month:'short'})}`:''}{t.completed?' · voltooid':''}
                </div>
              </div>
              <span style={{fontSize:'10px',color:'#2a2a2a',fontFamily:"'JetBrains Mono',monospace"}}>→</span>
            </div>
          )
        })}
        {!q.trim()&&<div style={{padding:'10px 16px 4px',fontSize:'8px',color:'#2a2a2a',letterSpacing:'.1em',textTransform:'uppercase',fontFamily:"'JetBrains Mono',monospace"}}>Recente taken</div>}
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// ─── SKILL TREE MODULE ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

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
  const [projId,setProjId]=useState(stProjs[0]?.id||'')
  const proj=stProjs.find(p=>p.id===projId)
  const color=proj?.color||AC
  const par=nodes.find(n=>n.id===parentId)
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

function STDomainManager({domains,stProjs,stNodes,setDomains,setStProjs,setStNodes,onClose}){
  const [newDName,setNewDName]=useState('')
  const [newDColor,setNewDColor]=useState('#55a86e')
  const [addProjFor,setAddProjFor]=useState(null)
  const [newPName,setNewPName]=useState('')
  const [newPColor,setNewPColor]=useState('#6bcf85')
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
    const newP={id:pid,domainId:d.id,name:newPName.trim(),color:newPColor,description:''}
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
    setNewPName('')
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
                  <button onClick={()=>{setStProjs(ps=>ps.filter(x=>x.id!==p.id));setStNodes(ns=>ns.filter(n=>n.projectId!==p.id))}} style={{background:'none',border:'none',color:TX2,cursor:'pointer',fontFamily:F,fontSize:'10px',opacity:.35}}>✕</button>
                </div>
              ))}
              {addProjFor===d.id?(
                <div style={{padding:'8px 0 0 14px'}}>
                  <div style={{display:'flex',gap:'6px',alignItems:'center',marginBottom:'7px'}}>
                    <input value={newPName} onChange={e=>setNewPName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addProject(d)} placeholder="Project naam..." style={{...iSt,flex:1,fontSize:'11px'}} autoFocus/>
                    <input type="color" value={newPColor} onChange={e=>setNewPColor(e.target.value)} style={{width:'24px',height:'20px',padding:0,border:`1px solid ${BR}`,background:'none',cursor:'pointer',borderRadius:'2px'}}/>
                  </div>
                  <div style={{display:'flex',gap:'6px'}}>
                    <button onClick={()=>addProject(d)} style={{padding:'3px 10px',background:newPColor,border:'none',borderRadius:'2px',color:'#000',fontFamily:F,fontSize:'9px',cursor:'pointer'}}>+ OK</button>
                    <button onClick={()=>{setAddProjFor(null);setNewPName('')}} style={{padding:'3px 8px',background:'none',border:`1px solid ${BR}`,borderRadius:'2px',color:TX2,fontFamily:F,fontSize:'9px',cursor:'pointer'}}>✕</button>
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
          if(projs?.length){const m=projs.map(r=>({id:r.id,domainId:r.domain_id,name:r.name,color:r.color,description:r.description||''}));setStProjs(m);try{localStorage.setItem('st_projs_'+userId,JSON.stringify(m))}catch{}}
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
        if(stDomains.length){await supabase.from('st_domains').upsert(stDomains.map((d,i)=>({id:d.id,user_id:userId,name:d.name,color:d.color,sort_order:i})),{onConflict:'id'})}
        if(stProjs.length){await supabase.from('st_projects').upsert(stProjs.map(p=>({id:p.id,user_id:userId,domain_id:p.domainId,name:p.name,color:p.color,description:p.description||''})),{onConflict:'id'})}
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
    setStNodes(prev=>prev.map(n=>{
      if(n.id===nid)return{...n,status:'completed'}
      if(n.parentId===nid&&n.status==='locked')return{...n,status:'available'}
      return n
    }))
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
          onTouchStart={e=>{e.stopPropagation();if(!editMode)startHold(n.id)}}
          onTouchEnd={e=>{e.stopPropagation();stopHold()}}
        />
        {/* Edit: + child */}
        {editMode&&(
          <g data-add="1" transform={`translate(${r+2},${-(r+2)})`} onClick={e=>{e.stopPropagation();setAddFor(n.id)}} style={{cursor:'pointer'}}>
            <circle r={11} fill={AC} opacity={0.9}/>
            <text textAnchor="middle" dominantBaseline="middle" fontSize={16} fill="#fff" fontFamily="sans-serif" style={{userSelect:'none'}}>+</text>
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

      {addFor!==null&&<STAddNodeForm
        parentId={addFor} nodes={stNodes} stProjs={stProjs}
        onAdd={n=>setStNodes(prev=>[...prev,n])}
        onClose={()=>setAddFor(null)}/>}

      {showDomains&&<STDomainManager
        domains={stDomains} stProjs={stProjs} stNodes={stNodes}
        setDomains={setStDomains} setStProjs={setStProjs}
        setStNodes={setStNodes}
        onClose={()=>setShowDomains(false)}/>}
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

              {/* Label */}
              <span style={{
                color: val.na ? "rgba(255,255,255,0.25)" : isComplete ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.75)",
                fontSize: 14, flex: 1,
                textDecoration: val.na ? "line-through" : "none",
              }}>{check.name}</span>

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

  function addCheck() {
    if (!newCheck.trim()) return;
    setState(prev => ({ ...prev, checks: [...prev.checks, { name: newCheck.trim(), target: newCheckTarget }] }));
    setNewCheck(""); setNewCheckTarget(1);
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
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", flex: 1 }}>{typeof c === "object" ? c.name : c}</span>
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
