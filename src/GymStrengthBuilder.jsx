import { useState } from "react";

// ── Exercise Library ──────────────────────────────────────────────────────────
const DEFAULT_EXERCISES = [
  // Strength - Upper
  { id:"bench-press",       name:"Bench Press",          category:"Upper Body",  type:"strength" },
  { id:"incline-press",     name:"Incline DB Press",     category:"Upper Body",  type:"strength" },
  { id:"overhead-press",    name:"Overhead Press",       category:"Upper Body",  type:"strength" },
  { id:"pull-ups",          name:"Pull-ups",             category:"Upper Body",  type:"reps" },
  { id:"chin-ups",          name:"Chin-ups",             category:"Upper Body",  type:"reps" },
  { id:"barbell-row",       name:"Barbell Row",          category:"Upper Body",  type:"strength" },
  { id:"db-row",            name:"Dumbbell Row",         category:"Upper Body",  type:"strength" },
  { id:"lat-pulldown",      name:"Lat Pulldown",         category:"Upper Body",  type:"strength" },
  { id:"face-pulls",        name:"Face Pulls",           category:"Upper Body",  type:"strength" },
  { id:"bicep-curl",        name:"Bicep Curl",           category:"Upper Body",  type:"strength" },
  { id:"tricep-ext",        name:"Tricep Extension",     category:"Upper Body",  type:"strength" },
  // Strength - Lower
  { id:"squat",             name:"Back Squat",           category:"Lower Body",  type:"strength" },
  { id:"front-squat",       name:"Front Squat",          category:"Lower Body",  type:"strength" },
  { id:"deadlift",          name:"Deadlift",             category:"Lower Body",  type:"strength" },
  { id:"rdl",               name:"Romanian Deadlift",    category:"Lower Body",  type:"strength" },
  { id:"leg-press",         name:"Leg Press",            category:"Lower Body",  type:"strength" },
  { id:"lunges",            name:"Lunges",               category:"Lower Body",  type:"strength" },
  { id:"bulgarian-split",   name:"Bulgarian Split Squat",category:"Lower Body",  type:"strength" },
  { id:"leg-curl",          name:"Leg Curl",             category:"Lower Body",  type:"strength" },
  { id:"calf-raises",       name:"Calf Raises",          category:"Lower Body",  type:"strength" },
  // Core
  { id:"plank",             name:"Plank",                category:"Core",        type:"duration" },
  { id:"side-plank",        name:"Side Plank",           category:"Core",        type:"duration" },
  { id:"dead-bug",          name:"Dead Bug",             category:"Core",        type:"reps" },
  { id:"pallof-press",      name:"Pallof Press",         category:"Core",        type:"strength" },
  { id:"ab-wheel",          name:"Ab Wheel Rollout",     category:"Core",        type:"reps" },
  { id:"hanging-knee",      name:"Hanging Knee Raise",   category:"Core",        type:"reps" },
  { id:"russian-twist",     name:"Russian Twist",        category:"Core",        type:"reps" },
  // Cardio / Conditioning
  { id:"box-jumps",         name:"Box Jumps",            category:"Conditioning",type:"reps" },
  { id:"kettlebell-swing",  name:"Kettlebell Swing",     category:"Conditioning",type:"strength" },
  { id:"battle-ropes",      name:"Battle Ropes",         category:"Conditioning",type:"duration" },
  { id:"burpees",           name:"Burpees",              category:"Conditioning",type:"reps" },
  { id:"mountain-climbers", name:"Mountain Climbers",    category:"Conditioning",type:"duration" },
  // Breathwork / Freediving specific
  { id:"co2-table",         name:"CO₂ Breathing Table",  category:"Breathwork",  type:"duration" },
  { id:"o2-table",          name:"O₂ Breathing Table",   category:"Breathwork",  type:"duration" },
  { id:"diaphragm-stretch", name:"Diaphragm Stretch",    category:"Breathwork",  type:"duration" },
  { id:"yoga-flow",         name:"Yoga Flow",            category:"Breathwork",  type:"duration" },
];

const CATEGORIES = ["All", "Upper Body", "Lower Body", "Core", "Conditioning", "Breathwork"];

const SET_TYPES = [
  { key:"normal",   label:"Normal" },
  { key:"warmup",   label:"Warm-up",  color:"#ff9800" },
  { key:"dropset",  label:"Drop Set", color:"#9c27b0" },
  { key:"failure",  label:"To Failure",color:"#ef5350" },
];

const TRACK_TYPES = [
  { key:"strength", label:"Sets × Reps × Weight" },
  { key:"reps",     label:"Sets × Reps" },
  { key:"duration", label:"Sets × Duration" },
];

function newSet(trackType) {
  return {
    id: Date.now() + Math.random(),
    type: "normal",
    reps: "",
    weight: "",
    duration: "",
    rpe: "",
    rest: "",
    done: false,
    actualReps: "",
    actualWeight: "",
    actualDuration: "",
  };
}

function newExercise(ex, customName) {
  const trackType = ex?.type || "strength";
  return {
    id: Date.now() + Math.random(),
    exerciseId: ex?.id || "custom",
    name: customName || ex?.name || "",
    trackType,
    sets: [newSet(trackType)],
    notes: "",
  };
}

// ── Exercise Search Modal ─────────────────────────────────────────────────────
function ExercisePickerModal({ library, onAdd, onClose }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [customName, setCustomName] = useState("");
  const [tab, setTab] = useState("library"); // library | custom

  const filtered = library.filter(e =>
    (category === "All" || e.category === category) &&
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = CATEGORIES.filter(c => c !== "All").reduce((acc, cat) => {
    const items = filtered.filter(e => e.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:520,maxHeight:"85vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 24px 64px rgba(0,0,0,.2)"}}>
        {/* Header */}
        <div style={{padding:"20px 24px",borderBottom:"1px solid #f0f0f0"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div style={{fontWeight:700,fontSize:16}}>Add Exercise</div>
            <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,color:"#bbb",cursor:"pointer"}}>×</button>
          </div>
          {/* Tabs */}
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            {[["library","Library"],["custom","Custom"]].map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)} style={{padding:"7px 16px",borderRadius:8,border:"none",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:tab===k?"#1a1a1a":"#f0f0ec",color:tab===k?"#fff":"#666"}}>{l}</button>
            ))}
          </div>
          {tab==="library" && (
            <input autoFocus value={search} onChange={e=>setSearch(e.target.value)}
              style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:14,outline:"none",fontFamily:"inherit",color:"#1a1a1a"}}
              placeholder="Search exercises..." />
          )}
        </div>

        {tab==="library" && (
          <>
            {/* Category filter */}
            <div style={{padding:"10px 16px",borderBottom:"1px solid #f5f5f5",display:"flex",gap:6,overflowX:"auto"}}>
              {CATEGORIES.map(c=>(
                <button key={c} onClick={()=>setCategory(c)} style={{padding:"5px 12px",borderRadius:20,border:"1.5px solid",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",flexShrink:0,borderColor:category===c?"#1a1a1a":"#e0e0e0",background:category===c?"#1a1a1a":"#fff",color:category===c?"#fff":"#666"}}>{c}</button>
              ))}
            </div>
            {/* Exercise list */}
            <div style={{overflowY:"auto",flex:1,padding:"8px 0"}}>
              {Object.keys(grouped).length===0 && (
                <div style={{padding:32,textAlign:"center",color:"#bbb",fontSize:14}}>No exercises found</div>
              )}
              {Object.entries(grouped).map(([cat, exercises])=>(
                <div key={cat}>
                  <div style={{padding:"8px 24px 4px",fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"#ccc"}}>{cat}</div>
                  {exercises.map(ex=>(
                    <div key={ex.id} onClick={()=>{ onAdd(newExercise(ex)); onClose(); }}
                      style={{padding:"12px 24px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",transition:"background .1s"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#f8f8f6"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div>
                        <div style={{fontWeight:500,fontSize:14,color:"#1a1a1a"}}>{ex.name}</div>
                        <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{TRACK_TYPES.find(t=>t.key===ex.type)?.label}</div>
                      </div>
                      <span style={{fontSize:18,color:"#ddd"}}>+</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {tab==="custom" && (
          <div style={{padding:24,display:"flex",flexDirection:"column",gap:14}}>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"#666",marginBottom:6}}>Exercise Name</div>
              <input autoFocus value={customName} onChange={e=>setCustomName(e.target.value)}
                style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:14,outline:"none",fontFamily:"inherit",color:"#1a1a1a"}}
                placeholder="e.g. Band Pull-Apart" />
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"#666",marginBottom:8}}>Tracking Type</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {TRACK_TYPES.map(t=>(
                  <label key={t.key} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontSize:14,color:"#333"}}>
                    <input type="radio" name="tracktype" defaultChecked={t.key==="strength"} style={{accentColor:"#1a1a1a"}}
                      onChange={()=>{ }} />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>
            <button onClick={()=>{ if(customName.trim()){ onAdd(newExercise(null, customName.trim())); onClose(); }}}
              style={{background:"#1a1a1a",color:"#fff",border:"none",padding:"11px",borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",marginTop:4}}>
              Add Exercise
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Single Exercise Card ──────────────────────────────────────────────────────
function ExerciseCard({ exercise, onChange, onRemove, isClient }) {
  const [showNotes, setShowNotes] = useState(!!exercise.notes);

  function updateSet(setId, field, value) {
    onChange({ ...exercise, sets: exercise.sets.map(s => s.id===setId ? {...s, [field]:value} : s) });
  }

  function addSet() {
    onChange({ ...exercise, sets: [...exercise.sets, newSet(exercise.trackType)] });
  }

  function removeSet(setId) {
    if (exercise.sets.length <= 1) return;
    onChange({ ...exercise, sets: exercise.sets.filter(s => s.id !== setId) });
  }

  function toggleDone(setId) {
    onChange({ ...exercise, sets: exercise.sets.map(s => s.id===setId ? {...s, done:!s.done} : s) });
  }

  const isStrength = exercise.trackType === "strength";
  const isDuration = exercise.trackType === "duration";
  const completedSets = exercise.sets.filter(s => s.done).length;

  return (
    <div style={{background:"#fff",borderRadius:12,border:"1px solid #ebebeb",marginBottom:12,overflow:"hidden"}}>
      {/* Exercise header */}
      <div style={{padding:"14px 16px",borderBottom:"1px solid #f5f5f5",display:"flex",alignItems:"center",gap:12}}>
        <div style={{flex:1}}>
          {isClient ? (
            <div style={{fontWeight:700,fontSize:15,color:"#1a1a1a"}}>{exercise.name}</div>
          ) : (
            <input value={exercise.name} onChange={e=>onChange({...exercise,name:e.target.value})}
              style={{fontWeight:700,fontSize:15,border:"none",outline:"none",fontFamily:"inherit",color:"#1a1a1a",background:"transparent",width:"100%"}}
              placeholder="Exercise name..." />
          )}
          <div style={{fontSize:11,color:"#aaa",marginTop:2}}>
            {TRACK_TYPES.find(t=>t.key===exercise.trackType)?.label}
            {isClient && ` · ${completedSets}/${exercise.sets.length} sets done`}
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {!isClient && (
            <select value={exercise.trackType}
              onChange={e=>onChange({...exercise, trackType:e.target.value, sets:exercise.sets.map(s=>({...s,reps:"",weight:"",duration:""})) })}
              style={{padding:"5px 8px",border:"1.5px solid #e0e0e0",borderRadius:7,fontSize:12,fontFamily:"inherit",outline:"none",background:"#fff",color:"#555",cursor:"pointer"}}>
              {TRACK_TYPES.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          )}
          <button onClick={()=>setShowNotes(v=>!v)}
            style={{background:showNotes?"#f0f0ec":"transparent",border:"1.5px solid #e0e0e0",borderRadius:7,padding:"5px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit",color:"#666"}}>
            📝
          </button>
          {!isClient && (
            <button onClick={onRemove}
              style={{background:"transparent",border:"1.5px solid #e8c5c5",borderRadius:7,padding:"5px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit",color:"#c0392b"}}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Sets table */}
      <div style={{padding:"0 16px"}}>
        {/* Column headers */}
        <div style={{display:"grid",gridTemplateColumns:`32px 60px ${isStrength?"1fr 1fr":isDuration?"1fr":"1fr"} 60px 40px`,gap:8,padding:"10px 0 6px",borderBottom:"1px solid #f5f5f5"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#ccc",letterSpacing:".06em",textTransform:"uppercase"}}>SET</div>
          <div style={{fontSize:10,fontWeight:700,color:"#ccc",letterSpacing:".06em",textTransform:"uppercase"}}>TYPE</div>
          {isStrength && <div style={{fontSize:10,fontWeight:700,color:"#ccc",letterSpacing:".06em",textTransform:"uppercase"}}>REPS</div>}
          {isStrength && <div style={{fontSize:10,fontWeight:700,color:"#ccc",letterSpacing:".06em",textTransform:"uppercase"}}>KG</div>}
          {isDuration && <div style={{fontSize:10,fontWeight:700,color:"#ccc",letterSpacing:".06em",textTransform:"uppercase"}}>TIME</div>}
          {!isStrength && !isDuration && <div style={{fontSize:10,fontWeight:700,color:"#ccc",letterSpacing:".06em",textTransform:"uppercase"}}>REPS</div>}
          <div style={{fontSize:10,fontWeight:700,color:"#ccc",letterSpacing:".06em",textTransform:"uppercase"}}>REST</div>
          <div></div>
        </div>

        {/* Set rows */}
        {exercise.sets.map((s, si) => {
          const setType = SET_TYPES.find(t=>t.key===s.type);
          return (
            <div key={s.id} style={{display:"grid",gridTemplateColumns:`32px 60px ${isStrength?"1fr 1fr":isDuration?"1fr":"1fr"} 60px 40px`,gap:8,padding:"8px 0",borderBottom:"1px solid #f9f9f9",alignItems:"center",
              opacity:s.done?0.6:1,transition:"opacity .15s"}}>
              {/* Set number */}
              <div style={{fontWeight:700,fontSize:13,color:setType?.color||"#555",textAlign:"center"}}>
                {s.type==="warmup"?"W":s.type==="dropset"?"D":s.type==="failure"?"F":si+1}
              </div>

              {/* Set type */}
              {isClient ? (
                <div style={{fontSize:11,color:setType?.color||"#aaa",fontWeight:600}}>{setType?.label||"Normal"}</div>
              ) : (
                <select value={s.type} onChange={e=>updateSet(s.id,"type",e.target.value)}
                  style={{padding:"4px 6px",border:"1.5px solid #e0e0e0",borderRadius:6,fontSize:11,fontFamily:"inherit",outline:"none",background:"#fff",color:setType?.color||"#555",cursor:"pointer"}}>
                  {SET_TYPES.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              )}

              {/* Reps (strength or reps only) */}
              {!isDuration && (
                <div style={{display:"flex",flexDirection:"column",gap:2}}>
                  <input type="number" placeholder="—" value={s.reps}
                    onChange={e=>updateSet(s.id,"reps",e.target.value)}
                    readOnly={isClient&&!s.done===false}
                    style={{width:"100%",padding:"5px 8px",border:"1.5px solid #e0e0e0",borderRadius:7,fontSize:13,fontFamily:"inherit",outline:"none",color:"#1a1a1a",textAlign:"center",background:isClient?"#f8f8f6":"#fff"}} />
                  {isClient && s.done && (
                    <input type="number" placeholder="actual" value={s.actualReps}
                      onChange={e=>updateSet(s.id,"actualReps",e.target.value)}
                      style={{width:"100%",padding:"4px 8px",border:"1.5px solid #4caf50",borderRadius:7,fontSize:11,fontFamily:"inherit",outline:"none",color:"#2e7d32",textAlign:"center",background:"#f1f8f1"}} />
                  )}
                </div>
              )}

              {/* Weight (strength only) */}
              {isStrength && (
                <div style={{display:"flex",flexDirection:"column",gap:2}}>
                  <input type="number" placeholder="—" value={s.weight}
                    onChange={e=>updateSet(s.id,"weight",e.target.value)}
                    style={{width:"100%",padding:"5px 8px",border:"1.5px solid #e0e0e0",borderRadius:7,fontSize:13,fontFamily:"inherit",outline:"none",color:"#1a1a1a",textAlign:"center",background:isClient?"#f8f8f6":"#fff"}} />
                  {isClient && s.done && (
                    <input type="number" placeholder="actual" value={s.actualWeight}
                      onChange={e=>updateSet(s.id,"actualWeight",e.target.value)}
                      style={{width:"100%",padding:"4px 8px",border:"1.5px solid #4caf50",borderRadius:7,fontSize:11,fontFamily:"inherit",outline:"none",color:"#2e7d32",textAlign:"center",background:"#f1f8f1"}} />
                  )}
                </div>
              )}

              {/* Duration */}
              {isDuration && (
                <div style={{display:"flex",flexDirection:"column",gap:2}}>
                  <input placeholder="0:30" value={s.duration}
                    onChange={e=>updateSet(s.id,"duration",e.target.value)}
                    style={{width:"100%",padding:"5px 8px",border:"1.5px solid #e0e0e0",borderRadius:7,fontSize:13,fontFamily:"inherit",outline:"none",color:"#1a1a1a",textAlign:"center",background:isClient?"#f8f8f6":"#fff"}} />
                  {isClient && s.done && (
                    <input placeholder="actual" value={s.actualDuration}
                      onChange={e=>updateSet(s.id,"actualDuration",e.target.value)}
                      style={{width:"100%",padding:"4px 8px",border:"1.5px solid #4caf50",borderRadius:7,fontSize:11,fontFamily:"inherit",outline:"none",color:"#2e7d32",textAlign:"center",background:"#f1f8f1"}} />
                  )}
                </div>
              )}

              {/* Rest */}
              <input placeholder="60s" value={s.rest}
                onChange={e=>updateSet(s.id,"rest",e.target.value)}
                style={{width:"100%",padding:"5px 8px",border:"1.5px solid #e0e0e0",borderRadius:7,fontSize:13,fontFamily:"inherit",outline:"none",color:"#1a1a1a",textAlign:"center",background:isClient?"#f8f8f6":"#fff"}} />

              {/* Done / Remove */}
              <div style={{display:"flex",justifyContent:"center"}}>
                {isClient ? (
                  <button onClick={()=>toggleDone(s.id)}
                    style={{width:28,height:28,borderRadius:"50%",border:`2px solid ${s.done?"#4caf50":"#e0e0e0"}`,background:s.done?"#4caf50":"transparent",color:s.done?"#fff":"#ccc",fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
                    ✓
                  </button>
                ) : (
                  <button onClick={()=>removeSet(s.id)}
                    style={{width:28,height:28,borderRadius:"50%",border:"1.5px solid #f0f0f0",background:"transparent",color:"#ccc",fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    ×
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Add set */}
        {!isClient && (
          <div style={{padding:"10px 0"}}>
            <button onClick={addSet}
              style={{background:"#f8f8f6",border:"1.5px dashed #ddd",borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:600,color:"#888",cursor:"pointer",fontFamily:"inherit",width:"100%",transition:"all .15s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#1a1a1a";e.currentTarget.style.color="#1a1a1a";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#ddd";e.currentTarget.style.color="#888";}}>
              + Add Set
            </button>
          </div>
        )}
      </div>

      {/* Notes */}
      {showNotes && (
        <div style={{padding:"0 16px 14px"}}>
          <textarea value={exercise.notes} onChange={e=>onChange({...exercise,notes:e.target.value})}
            placeholder="Notes for this exercise (e.g. keep core tight, slow eccentric...)"
            style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none",resize:"vertical",minHeight:60,color:"#555",background:"#fafaf8"}} />
        </div>
      )}
    </div>
  );
}

// ── Section Block ─────────────────────────────────────────────────────────────
function SectionBlock({ section, onChange, onRemove, onAddExercise, isClient, library }) {
  const [showPicker, setShowPicker] = useState(false);

  function updateExercise(exId, updated) {
    onChange({ ...section, exercises: section.exercises.map(e => e.id===exId ? updated : e) });
  }

  function removeExercise(exId) {
    onChange({ ...section, exercises: section.exercises.filter(e => e.id!==exId) });
  }

  function addExercise(ex) {
    onChange({ ...section, exercises: [...section.exercises, ex] });
  }

  const completedCount = section.exercises.reduce((a,ex)=>a+ex.sets.filter(s=>s.done).length,0);
  const totalCount = section.exercises.reduce((a,ex)=>a+ex.sets.length,0);

  return (
    <div style={{marginBottom:20}}>
      {/* Section header */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
        {isClient ? (
          <div style={{fontWeight:700,fontSize:13,color:"#555",letterSpacing:".04em",textTransform:"uppercase"}}>{section.name}</div>
        ) : (
          <input value={section.name} onChange={e=>onChange({...section,name:e.target.value})}
            style={{fontWeight:700,fontSize:13,color:"#555",letterSpacing:".04em",textTransform:"uppercase",border:"none",outline:"none",fontFamily:"inherit",background:"transparent",flex:1}}
            placeholder="Section name..." />
        )}
        {isClient && totalCount>0 && (
          <span style={{fontSize:11,color:"#4caf50",fontWeight:600}}>{completedCount}/{totalCount} sets</span>
        )}
        <div style={{flex:1,height:1,background:"#f0f0f0"}}/>
        {!isClient && (
          <button onClick={onRemove} style={{background:"none",border:"none",fontSize:12,color:"#ddd",cursor:"pointer",fontFamily:"inherit"}}>Remove section</button>
        )}
      </div>

      {/* Exercises */}
      {section.exercises.map(ex=>(
        <ExerciseCard key={ex.id} exercise={ex} isClient={isClient}
          onChange={updated=>updateExercise(ex.id, updated)}
          onRemove={()=>removeExercise(ex.id)} />
      ))}

      {section.exercises.length===0 && !isClient && (
        <div style={{background:"#fafaf8",border:"1.5px dashed #e0e0e0",borderRadius:10,padding:"20px",textAlign:"center",color:"#bbb",fontSize:13,marginBottom:12}}>
          No exercises yet — add one below
        </div>
      )}

      {/* Add exercise */}
      {!isClient && (
        <button onClick={()=>setShowPicker(true)}
          style={{background:"#f0f0ec",border:"none",borderRadius:9,padding:"10px 16px",fontSize:13,fontWeight:600,color:"#555",cursor:"pointer",fontFamily:"inherit",width:"100%",transition:"all .15s"}}
          onMouseEnter={e=>{e.currentTarget.style.background="#e8e8e4";}}
          onMouseLeave={e=>{e.currentTarget.style.background="#f0f0ec";}}>
          + Add Exercise
        </button>
      )}

      {showPicker && <ExercisePickerModal library={library} onAdd={addExercise} onClose={()=>setShowPicker(false)} />}
    </div>
  );
}

// ── Workout Rating (client) ───────────────────────────────────────────────────
function WorkoutRating({ rating, onRate }) {
  return (
    <div style={{background:"#f8f8f6",borderRadius:10,padding:"16px",marginTop:16,textAlign:"center"}}>
      <div style={{fontSize:12,fontWeight:700,color:"#aaa",letterSpacing:".06em",textTransform:"uppercase",marginBottom:10}}>Rate this workout</div>
      <div style={{display:"flex",justifyContent:"center",gap:8}}>
        {[1,2,3,4,5].map(n=>(
          <button key={n} onClick={()=>onRate(n)}
            style={{fontSize:24,background:"none",border:"none",cursor:"pointer",opacity:rating&&rating<n?0.3:1,transition:"opacity .15s,transform .1s"}}
            onMouseEnter={e=>e.currentTarget.style.transform="scale(1.2)"}
            onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
            ⭐
          </button>
        ))}
      </div>
      {rating && <div style={{fontSize:12,color:"#888",marginTop:8}}>You rated this {rating}/5</div>}
    </div>
  );
}

// ── Main Gym Strength Builder ─────────────────────────────────────────────────
export default function GymStrengthBuilder({ initialData, onSave, isClient, readOnly }) {
  const defaultSections = [
    { id:"warmup-"+Date.now(),  name:"Warm-up",  exercises:[] },
    { id:"main-"+Date.now(),    name:"Main Set",  exercises:[] },
    { id:"cooldown-"+Date.now(),name:"Cool-down", exercises:[] },
  ];

  const [sections, setSections] = useState(initialData?.sections || defaultSections);
  const [workoutName, setWorkoutName] = useState(initialData?.name || "");
  const [coachNotes, setCoachNotes] = useState(initialData?.coachNotes || "");
  const [rating, setRating] = useState(initialData?.rating || null);
  const [clientNotes, setClientNotes] = useState(initialData?.clientNotes || "");
  const [library] = useState(DEFAULT_EXERCISES);
  const [saving, setSaving] = useState(false);

  function updateSection(id, updated) { setSections(prev=>prev.map(s=>s.id===id?updated:s)); }
  function removeSection(id) { setSections(prev=>prev.filter(s=>s.id!==id)); }
  function addSection() {
    setSections(prev=>[...prev,{id:"section-"+Date.now(),name:"New Section",exercises:[]}]);
  }

  const totalExercises = sections.reduce((a,s)=>a+s.exercises.length,0);
  const totalSets = sections.reduce((a,s)=>a+s.exercises.reduce((b,e)=>b+e.sets.length,0),0);
  const doneSets = sections.reduce((a,s)=>a+s.exercises.reduce((b,e)=>b+e.sets.filter(s=>s.done).length,0),0);
  const progress = totalSets>0 ? Math.round((doneSets/totalSets)*100) : 0;

  async function handleSave() {
    setSaving(true);
    await onSave({ sections, name:workoutName, coachNotes, rating, clientNotes });
    setSaving(false);
  }

  return (
    <div style={{fontFamily:"'DM Sans','Helvetica Neue',sans-serif",color:"#1a1a1a"}}>

      {/* Workout title */}
      <div style={{marginBottom:16}}>
        {isClient ? (
          <div style={{fontWeight:700,fontSize:18}}>{workoutName||"Gym Strength Session"}</div>
        ) : (
          <input value={workoutName} onChange={e=>setWorkoutName(e.target.value)}
            style={{fontWeight:700,fontSize:18,border:"none",outline:"none",fontFamily:"inherit",color:"#1a1a1a",background:"transparent",width:"100%"}}
            placeholder="Workout name (e.g. Upper Body Strength A)..." />
        )}
        <div style={{display:"flex",gap:16,marginTop:6,fontSize:12,color:"#aaa"}}>
          <span>{totalExercises} exercise{totalExercises!==1?"s":""}</span>
          <span>{totalSets} set{totalSets!==1?"s":""}</span>
          {isClient && totalSets>0 && <span style={{color:"#4caf50",fontWeight:600}}>{progress}% complete</span>}
        </div>
      </div>

      {/* Progress bar (client) */}
      {isClient && totalSets>0 && (
        <div style={{height:6,background:"#f0f0f0",borderRadius:3,marginBottom:18,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${progress}%`,background:"#4caf50",borderRadius:3,transition:"width .3s"}}/>
        </div>
      )}

      {/* Coach notes */}
      {coachNotes && (
        <div style={{background:"#fffbe6",border:"1px solid #ffe082",borderRadius:10,padding:"12px 16px",marginBottom:16}}>
          <div style={{fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"#a07a00",marginBottom:5}}>📌 Coach Notes</div>
          <div style={{fontSize:14,color:"#5a4800",lineHeight:1.65}}>{coachNotes}</div>
        </div>
      )}
      {!isClient && (
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:".06em",textTransform:"uppercase",marginBottom:6}}>Coach Notes (visible to client)</div>
          <textarea value={coachNotes} onChange={e=>setCoachNotes(e.target.value)}
            placeholder="General instructions, focus points, safety reminders..."
            style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:14,fontFamily:"inherit",outline:"none",resize:"vertical",minHeight:60,color:"#1a1a1a"}} />
        </div>
      )}

      {/* Sections */}
      {sections.map(section=>(
        <SectionBlock key={section.id} section={section} isClient={isClient} library={library}
          onChange={updated=>updateSection(section.id, updated)}
          onRemove={()=>removeSection(section.id)} />
      ))}

      {/* Add section */}
      {!isClient && (
        <button onClick={addSection}
          style={{background:"transparent",border:"1.5px dashed #ddd",borderRadius:10,padding:"12px",fontSize:13,fontWeight:600,color:"#aaa",cursor:"pointer",fontFamily:"inherit",width:"100%",marginBottom:16,transition:"all .15s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#1a1a1a";e.currentTarget.style.color="#1a1a1a";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="#ddd";e.currentTarget.style.color="#aaa";}}>
          + Add Section
        </button>
      )}

      {/* Client feedback */}
      {isClient && (
        <>
          <WorkoutRating rating={rating} onRate={setRating} />
          <div style={{marginTop:14}}>
            <div style={{fontSize:12,fontWeight:600,color:"#666",marginBottom:6}}>Notes for your coach</div>
            <textarea value={clientNotes} onChange={e=>setClientNotes(e.target.value)}
              placeholder="How did it go? Any exercises that felt too easy or too hard?"
              style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:14,fontFamily:"inherit",outline:"none",resize:"vertical",minHeight:72,color:"#1a1a1a"}} />
          </div>
        </>
      )}

      {/* Save button */}
      {!readOnly && (
        <button onClick={handleSave} disabled={saving}
          style={{background:"#1a1a1a",color:"#fff",border:"none",padding:"13px 24px",borderRadius:9,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",width:"100%",marginTop:8,opacity:saving?0.6:1}}>
          {saving ? "Saving..." : isClient ? "Save Workout Log" : "Save Session Plan"}
        </button>
      )}
    </div>
  );
}
