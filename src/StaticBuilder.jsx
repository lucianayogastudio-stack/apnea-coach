import { useState } from "react";

// ── Exercise Library ──────────────────────────────────────────────────────────
const EXERCISE_TEMPLATES = [
  {
    key: "co2-table",
    label: "CO₂ Table",
    emoji: "💨",
    color: "#2d7a2d",
    bg: "#edf6e6",
    border: "#7ec87e",
    description: "Decreasing rest times to build CO₂ tolerance",
    fields: ["rounds", "holdTime", "breathTime", "notes"],
    defaults: { rounds: 8, holdTime: "1:00", breathTime: "2:00", notes: "" },
  },
  {
    key: "o2-table",
    label: "O₂ Table",
    emoji: "🫁",
    color: "#005fa3",
    bg: "#e6f4ff",
    border: "#6ab0f4",
    description: "Increasing hold times to build O₂ efficiency",
    fields: ["rounds", "holdTime", "breathTime", "notes"],
    defaults: { rounds: 8, holdTime: "1:00", breathTime: "2:00", notes: "" },
  },
  {
    key: "ratio-breathing",
    label: "Ratio Breathing",
    emoji: "🔄",
    color: "#7a6200",
    bg: "#fffbe6",
    border: "#e8cc4d",
    description: "Inhale : Hold : Exhale : Hold pattern",
    fields: ["duration", "inhale", "holdIn", "exhale", "holdEx", "notes"],
    defaults: { duration: "5:00", inhale: "5", holdIn: "5", exhale: "5", holdEx: "5", notes: "" },
  },
  {
    key: "box-breathing",
    label: "Box Breathing",
    emoji: "⬜",
    color: "#5a4800",
    bg: "#fffde7",
    border: "#ffe57f",
    description: "Equal inhale : hold : exhale : hold",
    fields: ["duration", "ratio", "notes"],
    defaults: { duration: "5:00", ratio: "5", notes: "" },
  },
  {
    key: "hold-first-contraction",
    label: "Hold to 1st Contraction",
    emoji: "🎯",
    color: "#1a2fa3",
    bg: "#e8f0ff",
    border: "#6a7ef4",
    description: "Hold until first diaphragm contraction, then release",
    fields: ["lungVolume", "rounds", "restBetween", "notes"],
    defaults: { lungVolume: "FRC", rounds: 3, restBetween: "2:00", notes: "" },
  },
  {
    key: "hold-contraction-plus",
    label: "1st Contraction + X seconds",
    emoji: "⏱️",
    color: "#8b1f7a",
    bg: "#fdf0fb",
    border: "#d97ec8",
    description: "Hold until first contraction, then continue for X more seconds",
    fields: ["lungVolume", "extraSeconds", "rounds", "restBetween", "notes"],
    defaults: { lungVolume: "FRC", extraSeconds: "10", rounds: 3, restBetween: "2:00", notes: "" },
  },
  {
    key: "1-breath-per-min",
    label: "1 Breath per Minute",
    emoji: "🕐",
    color: "#b85c00",
    bg: "#fff0e6",
    border: "#f4a96a",
    description: "One breath cycle every 60 seconds",
    fields: ["duration", "notes"],
    defaults: { duration: "5:00", notes: "" },
  },
  {
    key: "max-effort",
    label: "Max Effort",
    emoji: "💪",
    color: "#c62828",
    bg: "#fce4ec",
    border: "#ef9a9a",
    description: "Maximum breath hold, go until limit",
    fields: ["lungVolume", "rounds", "restBetween", "notes"],
    defaults: { lungVolume: "Full", rounds: 1, restBetween: "5:00", notes: "" },
  },
  {
    key: "rv-holds",
    label: "RV Holds",
    emoji: "🫧",
    color: "#1a2fa3",
    bg: "#e8f0ff",
    border: "#6a7ef4",
    description: "Holds at Residual Volume",
    fields: ["rounds", "holdTime", "restBetween", "notes"],
    defaults: { rounds: 3, holdTime: "1:00", restBetween: "2:00", notes: "" },
  },
  {
    key: "frc-holds",
    label: "FRC Holds",
    emoji: "🌬️",
    color: "#005fa3",
    bg: "#e6f4ff",
    border: "#6ab0f4",
    description: "Holds at Functional Residual Capacity",
    fields: ["rounds", "holdTime", "restBetween", "notes"],
    defaults: { rounds: 3, holdTime: "1:00", restBetween: "2:00", notes: "" },
  },
  {
    key: "custom",
    label: "Custom Exercise",
    emoji: "✏️",
    color: "#555",
    bg: "#f5f4f0",
    border: "#ccc",
    description: "Write your own exercise",
    fields: ["customText", "notes"],
    defaults: { customText: "", notes: "" },
  },
];

function getTemplate(key) { return EXERCISE_TEMPLATES.find(t => t.key === key) || EXERCISE_TEMPLATES[EXERCISE_TEMPLATES.length - 1]; }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function makeExercise(templateKey) {
  const tmpl = getTemplate(templateKey);
  return {
    id: uid(),
    templateKey,
    label: tmpl.label,
    ...tmpl.defaults,
    // Client log fields
    log: { done: false, actualTime: "", actualContraction: "", feeling: "", limitingFactor: "", observations: "" },
  };
}

// ── Exercise Picker ───────────────────────────────────────────────────────────
function ExercisePicker({ onAdd, onClose }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:520,maxHeight:"85vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 24px 64px rgba(0,0,0,.2)"}}>
        <div style={{padding:"18px 20px",borderBottom:"1px solid #f0f0f0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontWeight:700,fontSize:15}}>Add Static Exercise</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,color:"#bbb",cursor:"pointer"}}>×</button>
        </div>
        <div style={{overflowY:"auto",flex:1,padding:"8px 0"}}>
          {EXERCISE_TEMPLATES.map(t=>(
            <div key={t.key} onClick={()=>{onAdd(makeExercise(t.key));onClose();}}
              style={{padding:"12px 20px",cursor:"pointer",display:"flex",alignItems:"center",gap:14,transition:"background .1s"}}
              onMouseEnter={e=>e.currentTarget.style.background="#f8f8f6"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{width:40,height:40,borderRadius:10,background:t.bg,border:`1.5px solid ${t.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{t.emoji}</div>
              <div>
                <div style={{fontWeight:600,fontSize:14,color:"#1a1a1a"}}>{t.label}</div>
                <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{t.description}</div>
              </div>
              <span style={{marginLeft:"auto",fontSize:18,color:"#ddd"}}>+</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Field helpers ─────────────────────────────────────────────────────────────
function Field({ label, children, half }) {
  return (
    <div style={{flex:half?"0 0 calc(50% - 6px)":"1"}}>
      <div style={{fontSize:10,fontWeight:700,color:"#bbb",letterSpacing:".06em",textTransform:"uppercase",marginBottom:5}}>{label}</div>
      {children}
    </div>
  );
}

const inp = {
  padding:"7px 10px",border:"1.5px solid #e0e0e0",borderRadius:7,fontSize:13,
  fontFamily:"inherit",outline:"none",color:"#1a1a1a",background:"#fff",width:"100%",
};
const inpGreen = {
  ...inp, border:"1.5px solid #a5d6a7", background:"#f1f8f1", color:"#2e7d32",
};

// ── Exercise Card ─────────────────────────────────────────────────────────────
function ExerciseCard({ exercise, index, onChange, onRemove, isClient }) {
  const tmpl = getTemplate(exercise.templateKey);
  const [showLog, setShowLog] = useState(false);
  const hasFields = tmpl.fields.length > 0;

  function upd(field, val) { onChange({...exercise, [field]:val}); }
  function updLog(field, val) { onChange({...exercise, log:{...exercise.log, [field]:val}}); }

  const isContraction = exercise.templateKey==="hold-first-contraction" || exercise.templateKey==="hold-contraction-plus";
  const isTable = exercise.templateKey==="co2-table" || exercise.templateKey==="o2-table";
  const isRatio = exercise.templateKey==="ratio-breathing";
  const isBox   = exercise.templateKey==="box-breathing";
  const isHold  = ["rv-holds","frc-holds","max-effort","1-breath-per-min"].includes(exercise.templateKey);
  const isCustom = exercise.templateKey==="custom";

  return (
    <div style={{background:"#fff",borderRadius:12,border:`1.5px solid ${exercise.log?.done?"#a5d6a7":"#ebebeb"}`,marginBottom:12,overflow:"hidden",transition:"border-color .2s"}}>
      {/* Header */}
      <div style={{padding:"12px 16px",borderBottom:"1px solid #f5f5f5",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:34,height:34,borderRadius:9,background:tmpl.bg,border:`1.5px solid ${tmpl.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{tmpl.emoji}</div>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:11,fontWeight:700,color:"#bbb"}}>{index}.</span>
            {isClient ? (
              <span style={{fontWeight:700,fontSize:14,color:"#1a1a1a"}}>{exercise.label||tmpl.label}</span>
            ) : (
              <input value={exercise.label||tmpl.label} onChange={e=>upd("label",e.target.value)}
                style={{fontWeight:700,fontSize:14,border:"none",outline:"none",fontFamily:"inherit",color:"#1a1a1a",background:"transparent",flex:1}} />
            )}
          </div>
          <div style={{fontSize:11,color:tmpl.color,fontWeight:600,marginTop:1}}>{tmpl.label !== exercise.label ? tmpl.label : tmpl.description}</div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {isClient && (
            <button onClick={()=>{ updLog("done",!exercise.log?.done); setShowLog(true); }}
              style={{width:30,height:30,borderRadius:"50%",border:`2px solid ${exercise.log?.done?"#4caf50":"#e0e0e0"}`,background:exercise.log?.done?"#4caf50":"transparent",color:exercise.log?.done?"#fff":"#ccc",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
              ✓
            </button>
          )}
          {isClient && (
            <button onClick={()=>setShowLog(v=>!v)}
              style={{padding:"5px 10px",borderRadius:7,border:"1.5px solid #e0e0e0",background:showLog?"#f0f0ec":"transparent",fontSize:11,fontWeight:600,color:"#666",cursor:"pointer",fontFamily:"inherit"}}>
              {showLog?"Hide log":"Log"}
            </button>
          )}
          {!isClient && (
            <button onClick={onRemove} style={{background:"transparent",border:"1.5px solid #e8c5c5",borderRadius:7,padding:"5px 9px",fontSize:11,cursor:"pointer",color:"#c0392b"}}>✕</button>
          )}
        </div>
      </div>

      {/* Coach plan fields */}
      <div style={{padding:"12px 16px"}}>
        {isCustom && (
          <div>
            {isClient ? (
              <div style={{fontSize:14,color:"#333",lineHeight:1.65,whiteSpace:"pre-wrap"}}>{exercise.customText||"—"}</div>
            ) : (
              <textarea value={exercise.customText||""} onChange={e=>upd("customText",e.target.value)}
                placeholder="Describe the exercise in detail — protocol, timing, cues..."
                style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none",resize:"vertical",minHeight:80,color:"#1a1a1a"}} />
            )}
          </div>
        )}

        {isTable && (
          <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
            <Field label="Rounds" half>
              {isClient ? <div style={{fontSize:14,fontWeight:600}}>{exercise.rounds}</div>
                : <input type="number" value={exercise.rounds} onChange={e=>upd("rounds",e.target.value)} style={inp} />}
            </Field>
            <Field label="Hold time (m:ss)" half>
              {isClient ? <div style={{fontSize:14,fontWeight:600}}>{exercise.holdTime}</div>
                : <input value={exercise.holdTime} onChange={e=>upd("holdTime",e.target.value)} style={inp} placeholder="1:00" />}
            </Field>
            <Field label={exercise.templateKey==="co2-table"?"Breath time (m:ss) — decreasing":"Breath time (m:ss) — fixed"} >
              {isClient ? <div style={{fontSize:14,fontWeight:600}}>{exercise.breathTime}</div>
                : <input value={exercise.breathTime} onChange={e=>upd("breathTime",e.target.value)} style={inp} placeholder="2:00" />}
            </Field>
            {isClient && (
              <div style={{width:"100%",background:"#f0f8ff",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#005fa3"}}>
                {exercise.templateKey==="co2-table"
                  ? `Protocol: ${exercise.rounds} rounds · Hold ${exercise.holdTime} · Breathe starts at ${exercise.breathTime} and decreases each round`
                  : `Protocol: ${exercise.rounds} rounds · Hold ${exercise.holdTime} · Breathe ${exercise.breathTime} (fixed) — hold time increases each round`}
              </div>
            )}
          </div>
        )}

        {isRatio && (
          <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
            <Field label="Total duration" half>
              {isClient ? <div style={{fontSize:14,fontWeight:600}}>{exercise.duration}</div>
                : <input value={exercise.duration} onChange={e=>upd("duration",e.target.value)} style={inp} placeholder="5:00" />}
            </Field>
            <Field label="" half><div/></Field>
            {[["Inhale (s)","inhale"],["Hold in (s)","holdIn"],["Exhale (s)","exhale"],["Hold out (s)","holdEx"]].map(([l,f])=>(
              <Field key={f} label={l} half>
                {isClient ? <div style={{fontSize:14,fontWeight:600}}>{exercise[f]}</div>
                  : <input type="number" value={exercise[f]} onChange={e=>upd(f,e.target.value)} style={inp} placeholder="5" />}
              </Field>
            ))}
            {isClient && (
              <div style={{width:"100%",background:"#fffbe6",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#7a6200"}}>
                Ratio: {exercise.inhale}s in · {exercise.holdIn}s hold · {exercise.exhale}s out · {exercise.holdEx}s hold · for {exercise.duration}
              </div>
            )}
          </div>
        )}

        {isBox && (
          <div style={{display:"flex",gap:10}}>
            <Field label="Duration" half>
              {isClient ? <div style={{fontSize:14,fontWeight:600}}>{exercise.duration}</div>
                : <input value={exercise.duration} onChange={e=>upd("duration",e.target.value)} style={inp} placeholder="5:00" />}
            </Field>
            <Field label="Box ratio (s each side)" half>
              {isClient ? <div style={{fontSize:14,fontWeight:600}}>{exercise.ratio}s × 4</div>
                : <input type="number" value={exercise.ratio} onChange={e=>upd("ratio",e.target.value)} style={inp} placeholder="5" />}
            </Field>
            {isClient && (
              <div style={{width:"100%",background:"#fffde7",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#5a4800"}}>
                Box: {exercise.ratio}s in · {exercise.ratio}s hold · {exercise.ratio}s out · {exercise.ratio}s hold · for {exercise.duration}
              </div>
            )}
          </div>
        )}

        {isContraction && (
          <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
            <Field label="Lung volume" half>
              {isClient ? <div style={{fontSize:14,fontWeight:600}}>{exercise.lungVolume}</div>
                : <select value={exercise.lungVolume} onChange={e=>upd("lungVolume",e.target.value)}
                    style={{...inp,cursor:"pointer"}}>
                    {["Full","FRC","RV"].map(v=><option key={v}>{v}</option>)}
                  </select>}
            </Field>
            {exercise.templateKey==="hold-contraction-plus" && (
              <Field label="Extra seconds after contraction" half>
                {isClient ? <div style={{fontSize:14,fontWeight:600}}>+{exercise.extraSeconds}s</div>
                  : <input type="number" value={exercise.extraSeconds} onChange={e=>upd("extraSeconds",e.target.value)} style={inp} placeholder="10" />}
              </Field>
            )}
            <Field label="Rounds" half>
              {isClient ? <div style={{fontSize:14,fontWeight:600}}>{exercise.rounds}</div>
                : <input type="number" value={exercise.rounds} onChange={e=>upd("rounds",e.target.value)} style={inp} placeholder="3" />}
            </Field>
            <Field label="Rest between (m:ss)" half>
              {isClient ? <div style={{fontSize:14,fontWeight:600}}>{exercise.restBetween}</div>
                : <input value={exercise.restBetween} onChange={e=>upd("restBetween",e.target.value)} style={inp} placeholder="2:00" />}
            </Field>
          </div>
        )}

        {isHold && (
          <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
            {exercise.templateKey!=="1-breath-per-min" && (
              <Field label="Lung volume" half>
                {isClient ? <div style={{fontSize:14,fontWeight:600}}>{exercise.lungVolume}</div>
                  : <select value={exercise.lungVolume||"Full"} onChange={e=>upd("lungVolume",e.target.value)} style={{...inp,cursor:"pointer"}}>
                      {["Full","FRC","RV"].map(v=><option key={v}>{v}</option>)}
                    </select>}
              </Field>
            )}
            {exercise.rounds && (
              <Field label="Rounds" half>
                {isClient ? <div style={{fontSize:14,fontWeight:600}}>{exercise.rounds}</div>
                  : <input type="number" value={exercise.rounds} onChange={e=>upd("rounds",e.target.value)} style={inp} />}
              </Field>
            )}
            {exercise.holdTime && (
              <Field label="Target hold (m:ss)" half>
                {isClient ? <div style={{fontSize:14,fontWeight:600}}>{exercise.holdTime}</div>
                  : <input value={exercise.holdTime} onChange={e=>upd("holdTime",e.target.value)} style={inp} placeholder="1:00" />}
              </Field>
            )}
            {exercise.duration && (
              <Field label="Duration" half>
                {isClient ? <div style={{fontSize:14,fontWeight:600}}>{exercise.duration}</div>
                  : <input value={exercise.duration} onChange={e=>upd("duration",e.target.value)} style={inp} placeholder="5:00" />}
              </Field>
            )}
            {exercise.restBetween && (
              <Field label="Rest between (m:ss)" half>
                {isClient ? <div style={{fontSize:14,fontWeight:600}}>{exercise.restBetween}</div>
                  : <input value={exercise.restBetween} onChange={e=>upd("restBetween",e.target.value)} style={inp} placeholder="2:00" />}
              </Field>
            )}
          </div>
        )}

        {/* Coach notes per exercise */}
        {!isClient && (
          <div style={{marginTop:10}}>
            <textarea value={exercise.notes||""} onChange={e=>upd("notes",e.target.value)}
              placeholder="Coach notes for this exercise (cues, focus points, safety reminders...)"
              style={{width:"100%",padding:"8px 10px",border:"1.5px solid #f0f0f0",borderRadius:7,fontSize:12,fontFamily:"inherit",outline:"none",resize:"vertical",minHeight:44,color:"#555",background:"#fafaf8"}} />
          </div>
        )}

        {/* Client coach notes display */}
        {isClient && exercise.notes && (
          <div style={{marginTop:8,background:"#fffbe6",border:"1px solid #ffe082",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#5a4800"}}>
            📌 {exercise.notes}
          </div>
        )}
      </div>

      {/* Client log */}
      {isClient && showLog && (
        <div style={{padding:"0 16px 14px",borderTop:"1px solid #f5f5f5"}}>
          <div style={{fontSize:10,fontWeight:800,letterSpacing:".07em",textTransform:"uppercase",color:"#aaa",margin:"12px 0 10px"}}>Your Log</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:10}}>
            {(isContraction||isHold||isTable||exercise.templateKey==="max-effort") && (
              <Field label="Actual hold time" half>
                <input value={exercise.log?.actualTime||""} onChange={e=>updLog("actualTime",e.target.value)}
                  style={inpGreen} placeholder="e.g. 2:15" />
              </Field>
            )}
            {isContraction && (
              <Field label="First contraction at" half>
                <input value={exercise.log?.actualContraction||""} onChange={e=>updLog("actualContraction",e.target.value)}
                  style={inpGreen} placeholder="e.g. 1:45" />
              </Field>
            )}
            <Field label="How did you feel?">
              <input value={exercise.log?.feeling||""} onChange={e=>updLog("feeling",e.target.value)}
                style={inpGreen} placeholder="Relaxed / tense / anxious / strong..." />
            </Field>
            <Field label="Observations / limiting factor">
              <input value={exercise.log?.limitingFactor||""} onChange={e=>updLog("limitingFactor",e.target.value)}
                style={inpGreen} placeholder="What stopped you or made it hard?" />
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Static Builder ───────────────────────────────────────────────────────
export default function StaticBuilder({ initialData, onSave, isClient }) {
  const [environment, setEnvironment] = useState(initialData?.environment||"pool");
  const [sessionName, setSessionName] = useState(initialData?.sessionName||"");
  const [coachNotes,  setCoachNotes]  = useState(initialData?.coachNotes||"");
  const [exercises,   setExercises]   = useState(initialData?.exercises||[]);
  const [showPicker,  setShowPicker]  = useState(false);
  const [clientNotes, setClientNotes] = useState(initialData?.clientNotes||"");
  const [rating,      setRating]      = useState(initialData?.rating||null);
  const [saving,      setSaving]      = useState(false);

  function updateExercise(id, updated) { setExercises(prev=>prev.map(e=>e.id===id?updated:e)); }
  function removeExercise(id) { setExercises(prev=>prev.filter(e=>e.id!==id)); }
  function addExercise(ex) { setExercises(prev=>[...prev, ex]); }

  const doneCount  = exercises.filter(e=>e.log?.done).length;
  const totalCount = exercises.length;
  const progress   = totalCount>0?Math.round((doneCount/totalCount)*100):0;

  async function handleSave() {
    setSaving(true);
    await onSave({ environment, sessionName, coachNotes, exercises, clientNotes, rating });
    setSaving(false);
  }

  return (
    <div style={{fontFamily:"'DM Sans','Helvetica Neue',sans-serif",color:"#1a1a1a"}}>

      {/* Environment — coach toggles, client sees read-only badge */}
      {isClient ? (
        <div style={{marginBottom:18}}>
          {environment==="pool" ? (
            <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"9px 18px",borderRadius:10,background:"#e6f4ff",border:"1.5px solid #6ab0f4",color:"#005fa3",fontWeight:700,fontSize:14}}>
              🏊 Pool Session
            </div>
          ) : (
            <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"9px 18px",borderRadius:10,background:"#fffbe6",border:"1.5px solid #e8cc4d",color:"#7a6200",fontWeight:700,fontSize:14}}>
              🏠 Dry Session
            </div>
          )}
        </div>
      ) : (
        <div style={{display:"flex",gap:8,marginBottom:18}}>
          {[
            { key:"pool", label:"🏊 Pool", color:"#005fa3", bg:"#e6f4ff", border:"#6ab0f4" },
            { key:"dry",  label:"🏠 Dry",  color:"#7a6200", bg:"#fffbe6", border:"#e8cc4d" },
          ].map(opt=>{
            const sel = environment===opt.key;
            return (
              <button key={opt.key} onClick={()=>setEnvironment(opt.key)}
                style={{flex:1,padding:"11px",borderRadius:10,border:`2px solid ${sel?opt.border:"#e0e0e0"}`,background:sel?opt.bg:"#fff",color:sel?opt.color:"#aaa",fontWeight:sel?700:500,fontSize:14,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Session name */}
      <div style={{marginBottom:14}}>
        {isClient ? (
          <div style={{fontWeight:700,fontSize:17}}>{sessionName||"Static Training Session"}</div>
        ) : (
          <input value={sessionName} onChange={e=>setSessionName(e.target.value)}
            style={{fontWeight:700,fontSize:17,border:"none",borderBottom:"2px solid #f0f0f0",outline:"none",fontFamily:"inherit",color:"#1a1a1a",background:"transparent",width:"100%",paddingBottom:6}}
            placeholder="Session name (e.g. CO₂ Tolerance Block A)..." />
        )}
        <div style={{fontSize:12,color:"#aaa",marginTop:5,display:"flex",gap:14}}>
          <span>{totalCount} exercise{totalCount!==1?"s":""}</span>
          {isClient&&totalCount>0&&<span style={{color:"#4caf50",fontWeight:600}}>{doneCount}/{totalCount} done · {progress}%</span>}
        </div>
      </div>

      {/* Progress bar */}
      {isClient&&totalCount>0&&(
        <div style={{height:5,background:"#f0f0f0",borderRadius:3,marginBottom:16,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${progress}%`,background:"#4caf50",borderRadius:3,transition:"width .3s"}}/>
        </div>
      )}

      {/* Coach notes */}
      {isClient&&coachNotes&&(
        <div style={{background:"#fffbe6",border:"1px solid #ffe082",borderRadius:10,padding:"12px 14px",marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"#a07a00",marginBottom:4}}>📌 Coach Notes</div>
          <div style={{fontSize:13,color:"#5a4800",lineHeight:1.65}}>{coachNotes}</div>
        </div>
      )}
      {!isClient&&(
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:".06em",textTransform:"uppercase",marginBottom:5}}>Session Notes (visible to client)</div>
          <textarea value={coachNotes} onChange={e=>setCoachNotes(e.target.value)}
            placeholder="Overall session goals, safety reminders, mental focus..."
            style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none",resize:"vertical",minHeight:56,color:"#1a1a1a"}} />
        </div>
      )}

      {/* Exercise list */}
      {exercises.length===0&&!isClient&&(
        <div style={{background:"#fafaf8",border:"1.5px dashed #ddd",borderRadius:12,padding:"28px",textAlign:"center",color:"#bbb",fontSize:13,marginBottom:16}}>
          No exercises yet — click "+ Add Exercise" to build the session
        </div>
      )}
      {exercises.length===0&&isClient&&(
        <div style={{background:"#fafaf8",borderRadius:12,padding:"28px",textAlign:"center",color:"#bbb",fontSize:13,marginBottom:16}}>
          No exercises planned for this session yet.
        </div>
      )}

      {exercises.map((ex,i)=>(
        <ExerciseCard key={ex.id} exercise={ex} index={i+1} isClient={isClient}
          onChange={updated=>updateExercise(ex.id,updated)}
          onRemove={()=>removeExercise(ex.id)} />
      ))}

      {/* Add exercise */}
      {!isClient&&(
        <button onClick={()=>setShowPicker(true)}
          style={{background:"#f0f0ec",border:"none",borderRadius:10,padding:"11px",fontSize:13,fontWeight:600,color:"#555",cursor:"pointer",fontFamily:"inherit",width:"100%",marginBottom:16,transition:"all .15s"}}
          onMouseEnter={e=>e.currentTarget.style.background="#e8e8e4"}
          onMouseLeave={e=>e.currentTarget.style.background="#f0f0ec"}>
          + Add Exercise
        </button>
      )}

      {/* Client rating + notes */}
      {isClient&&(
        <>
          <div style={{background:"#f8f8f6",borderRadius:10,padding:"14px",marginTop:8,textAlign:"center"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#aaa",letterSpacing:".06em",textTransform:"uppercase",marginBottom:10}}>Rate this session</div>
            <div style={{display:"flex",justifyContent:"center",gap:8}}>
              {[1,2,3,4,5].map(n=>(
                <button key={n} onClick={()=>setRating(n)} style={{fontSize:22,background:"none",border:"none",cursor:"pointer",opacity:rating&&rating<n?0.25:1,transition:"all .15s"}}
                  onMouseEnter={e=>e.currentTarget.style.transform="scale(1.2)"}
                  onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>⭐</button>
              ))}
            </div>
            {rating&&<div style={{fontSize:11,color:"#888",marginTop:6}}>{rating}/5 stars</div>}
          </div>
          <div style={{marginTop:12}}>
            <div style={{fontSize:12,fontWeight:600,color:"#555",marginBottom:5}}>General notes for your coach</div>
            <textarea value={clientNotes} onChange={e=>setClientNotes(e.target.value)}
              placeholder="Overall session feeling, anything you want your coach to know..."
              style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none",resize:"vertical",minHeight:64,color:"#1a1a1a"}} />
          </div>
        </>
      )}

      <button onClick={handleSave} disabled={saving}
        style={{background:"#1a1a1a",color:"#fff",border:"none",padding:"12px 24px",borderRadius:9,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",width:"100%",marginTop:14,opacity:saving?0.6:1}}>
        {saving?"Saving...":isClient?"Save Session Log":"Save Session Plan"}
      </button>

      {showPicker&&<ExercisePicker onAdd={addExercise} onClose={()=>setShowPicker(false)} />}
    </div>
  );
}
