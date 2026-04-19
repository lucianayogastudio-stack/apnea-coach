import { useState } from "react";

// ── Exercise Library ──────────────────────────────────────────────────────────
const DEFAULT_EXERCISES = [
  { id:"bench-press",       name:"Bench Press",           category:"Upper Body",   type:"strength" },
  { id:"incline-press",     name:"Incline DB Press",      category:"Upper Body",   type:"strength" },
  { id:"overhead-press",    name:"Overhead Press",        category:"Upper Body",   type:"strength" },
  { id:"pull-ups",          name:"Pull-ups",              category:"Upper Body",   type:"reps" },
  { id:"chin-ups",          name:"Chin-ups",              category:"Upper Body",   type:"reps" },
  { id:"barbell-row",       name:"Barbell Row",           category:"Upper Body",   type:"strength" },
  { id:"db-row",            name:"Dumbbell Row",          category:"Upper Body",   type:"strength" },
  { id:"lat-pulldown",      name:"Lat Pulldown",          category:"Upper Body",   type:"strength" },
  { id:"face-pulls",        name:"Face Pulls",            category:"Upper Body",   type:"strength" },
  { id:"bicep-curl",        name:"Bicep Curl",            category:"Upper Body",   type:"strength" },
  { id:"tricep-ext",        name:"Tricep Extension",      category:"Upper Body",   type:"strength" },
  { id:"push-ups",          name:"Push-ups",              category:"Upper Body",   type:"reps" },
  { id:"dips",              name:"Dips",                  category:"Upper Body",   type:"reps" },
  { id:"squat",             name:"Back Squat",            category:"Lower Body",   type:"strength" },
  { id:"front-squat",       name:"Front Squat",           category:"Lower Body",   type:"strength" },
  { id:"deadlift",          name:"Deadlift",              category:"Lower Body",   type:"strength" },
  { id:"rdl",               name:"Romanian Deadlift",     category:"Lower Body",   type:"strength" },
  { id:"leg-press",         name:"Leg Press",             category:"Lower Body",   type:"strength" },
  { id:"lunges",            name:"Lunges",                category:"Lower Body",   type:"strength" },
  { id:"bulgarian-split",   name:"Bulgarian Split Squat", category:"Lower Body",   type:"strength" },
  { id:"leg-curl",          name:"Leg Curl",              category:"Lower Body",   type:"strength" },
  { id:"calf-raises",       name:"Calf Raises",           category:"Lower Body",   type:"strength" },
  { id:"plank",             name:"Plank",                 category:"Core",         type:"duration" },
  { id:"side-plank",        name:"Side Plank",            category:"Core",         type:"duration" },
  { id:"dead-bug",          name:"Dead Bug",              category:"Core",         type:"reps" },
  { id:"pallof-press",      name:"Pallof Press",          category:"Core",         type:"strength" },
  { id:"ab-wheel",          name:"Ab Wheel Rollout",      category:"Core",         type:"reps" },
  { id:"hanging-knee",      name:"Hanging Knee Raise",    category:"Core",         type:"reps" },
  { id:"russian-twist",     name:"Russian Twist",         category:"Core",         type:"reps" },
  { id:"box-jumps",         name:"Box Jumps",             category:"Conditioning", type:"reps" },
  { id:"kettlebell-swing",  name:"Kettlebell Swing",      category:"Conditioning", type:"strength" },
  { id:"battle-ropes",      name:"Battle Ropes",          category:"Conditioning", type:"duration" },
  { id:"burpees",           name:"Burpees",               category:"Conditioning", type:"reps" },
  { id:"mountain-climbers", name:"Mountain Climbers",     category:"Conditioning", type:"duration" },
  { id:"co2-table",         name:"CO₂ Breathing Table",   category:"Breathwork",   type:"duration" },
  { id:"o2-table",          name:"O₂ Breathing Table",    category:"Breathwork",   type:"duration" },
  { id:"diaphragm-stretch", name:"Diaphragm Stretch",     category:"Breathwork",   type:"duration" },
  { id:"yoga-flow",         name:"Yoga Flow",             category:"Breathwork",   type:"duration" },
];

const CATEGORIES = ["All", "Upper Body", "Lower Body", "Core", "Conditioning", "Breathwork"];
const SET_TYPES = [
  { key:"normal",  label:"Normal" },
  { key:"warmup",  label:"Warm-up",   color:"#ff9800" },
  { key:"dropset", label:"Drop Set",  color:"#9c27b0" },
  { key:"failure", label:"Failure",   color:"#ef5350" },
];
const TRACK_TYPES = [
  { key:"strength", label:"Sets × Reps × Weight" },
  { key:"reps",     label:"Sets × Reps" },
  { key:"duration", label:"Sets × Duration" },
];

// Block types: "single" | "superset" | "circuit"
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function makeSet() {
  return { id:uid(), type:"normal", reps:"", weight:"", duration:"", rest:"", done:false, actualReps:"", actualWeight:"", actualDuration:"" };
}

function makeExercise(ex, customName) {
  const trackType = ex?.type || "strength";
  return { id:uid(), name:customName||ex?.name||"", trackType, sets:[makeSet()], notes:"", videoUrl:"" };
}

function getVideoEmbed(url) {
  if (!url) return null;
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return { thumb:`https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`, embed:`https://www.youtube.com/embed/${ytMatch[1]}`, id:ytMatch[1], type:"youtube" };
  // Vimeo
  const vmMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vmMatch) return { embed:`https://player.vimeo.com/video/${vmMatch[1]}`, id:vmMatch[1], type:"vimeo" };
  return { type:"link", url };
}

function makeBlock(type) {
  return { id:uid(), type, rounds: type==="circuit"?3:1, exercises:[], restBetweenRounds:"90s" };
}

// ── Exercise Picker Modal ─────────────────────────────────────────────────────
function ExercisePicker({ onAdd, onClose }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [tab, setTab] = useState("library");
  const [customName, setCustomName] = useState("");
  const [customType, setCustomType] = useState("strength");

  const filtered = DEFAULT_EXERCISES.filter(e =>
    (category==="All" || e.category===category) &&
    e.name.toLowerCase().includes(search.toLowerCase())
  );
  const grouped = CATEGORIES.filter(c=>c!=="All").reduce((acc,cat)=>{
    const items=filtered.filter(e=>e.category===cat);
    if(items.length) acc[cat]=items;
    return acc;
  },{});

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:500,maxHeight:"82vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 24px 64px rgba(0,0,0,.2)"}}>
        <div style={{padding:"18px 20px 12px",borderBottom:"1px solid #f0f0f0"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:15}}>Add Exercise</div>
            <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,color:"#bbb",cursor:"pointer"}}>×</button>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:12}}>
            {[["library","Library"],["custom","Custom"]].map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)} style={{padding:"6px 14px",borderRadius:7,border:"none",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:tab===k?"#1a1a1a":"#f0f0ec",color:tab===k?"#fff":"#666"}}>{l}</button>
            ))}
          </div>
          {tab==="library"&&<input autoFocus value={search} onChange={e=>setSearch(e.target.value)} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:13,outline:"none",fontFamily:"inherit",color:"#1a1a1a"}} placeholder="Search exercises..." />}
        </div>

        {tab==="library"&&(<>
          <div style={{padding:"8px 14px",borderBottom:"1px solid #f5f5f5",display:"flex",gap:5,overflowX:"auto"}}>
            {CATEGORIES.map(c=>(
              <button key={c} onClick={()=>setCategory(c)} style={{padding:"4px 10px",borderRadius:20,border:"1.5px solid",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",flexShrink:0,borderColor:category===c?"#1a1a1a":"#e0e0e0",background:category===c?"#1a1a1a":"#fff",color:category===c?"#fff":"#666"}}>{c}</button>
            ))}
          </div>
          <div style={{overflowY:"auto",flex:1}}>
            {Object.entries(grouped).map(([cat,exercises])=>(
              <div key={cat}>
                <div style={{padding:"8px 20px 4px",fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"#ccc"}}>{cat}</div>
                {exercises.map(ex=>(
                  <div key={ex.id} onClick={()=>{onAdd(makeExercise(ex));onClose();}}
                    style={{padding:"10px 20px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#f8f8f6"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div>
                      <div style={{fontWeight:500,fontSize:13,color:"#1a1a1a"}}>{ex.name}</div>
                      <div style={{fontSize:11,color:"#aaa",marginTop:1}}>{TRACK_TYPES.find(t=>t.key===ex.type)?.label}</div>
                    </div>
                    <span style={{fontSize:16,color:"#ddd"}}>+</span>
                  </div>
                ))}
              </div>
            ))}
            {Object.keys(grouped).length===0&&<div style={{padding:24,textAlign:"center",color:"#bbb",fontSize:13}}>No exercises found</div>}
          </div>
        </>)}

        {tab==="custom"&&(
          <div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
            <div><div style={{fontSize:12,fontWeight:600,color:"#555",marginBottom:5}}>Exercise Name</div>
              <input autoFocus value={customName} onChange={e=>setCustomName(e.target.value)} style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:13,outline:"none",fontFamily:"inherit",color:"#1a1a1a"}} placeholder="e.g. Band Pull-Apart" />
            </div>
            <div><div style={{fontSize:12,fontWeight:600,color:"#555",marginBottom:8}}>Tracking Type</div>
              {TRACK_TYPES.map(t=>(
                <label key={t.key} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:"#333",marginBottom:6}}>
                  <input type="radio" name="ct" checked={customType===t.key} onChange={()=>setCustomType(t.key)} style={{accentColor:"#1a1a1a"}} />{t.label}
                </label>
              ))}
            </div>
            <button onClick={()=>{if(customName.trim()){onAdd({...makeExercise(null,customName.trim()),trackType:customType});onClose();}}}
              style={{background:"#1a1a1a",color:"#fff",border:"none",padding:"10px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
              Add Exercise
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Single Exercise Row ───────────────────────────────────────────────────────
function ExerciseRow({ exercise, onChange, onRemove, isClient, showLabel }) {
  const [showNotes,  setShowNotes]  = useState(!!exercise.notes);
  const [showVideo,  setShowVideo]  = useState(false);
  const [editVideo,  setEditVideo]  = useState(false);
  const [videoInput, setVideoInput] = useState(exercise.videoUrl||"");
  const isStrength = exercise.trackType==="strength";
  const isDuration = exercise.trackType==="duration";
  const videoInfo = getVideoEmbed(exercise.videoUrl);

  function updateSet(sid, field, val) { onChange({...exercise,sets:exercise.sets.map(s=>s.id===sid?{...s,[field]:val}:s)}); }
  function addSet() { onChange({...exercise,sets:[...exercise.sets,makeSet()]}); }
  function removeSet(sid) { if(exercise.sets.length>1) onChange({...exercise,sets:exercise.sets.filter(s=>s.id!==sid)}); }
  function toggleDone(sid) { onChange({...exercise,sets:exercise.sets.map(s=>s.id===sid?{...s,done:!s.done}:s)}); }

  const doneSets = exercise.sets.filter(s=>s.done).length;

  return (
    <div style={{background:"#fafaf8",borderRadius:10,border:"1px solid #f0f0ec",marginBottom:8,overflow:"hidden"}}>
      {/* Exercise header */}
      <div style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid #f0f0ec"}}>
        <div style={{flex:1}}>
          {isClient ? (
            <div style={{fontWeight:600,fontSize:14,color:"#1a1a1a"}}>{exercise.name}</div>
          ) : (
            <input value={exercise.name} onChange={e=>onChange({...exercise,name:e.target.value})}
              style={{fontWeight:600,fontSize:14,border:"none",outline:"none",fontFamily:"inherit",color:"#1a1a1a",background:"transparent",width:"100%"}}
              placeholder="Exercise name..." />
          )}
          <div style={{fontSize:10,color:"#bbb",marginTop:1}}>
            {TRACK_TYPES.find(t=>t.key===exercise.trackType)?.label}
            {isClient&&` · ${doneSets}/${exercise.sets.length} sets`}
          </div>
        </div>
        <div style={{display:"flex",gap:6}}>
          {!isClient&&(
            <select value={exercise.trackType} onChange={e=>onChange({...exercise,trackType:e.target.value})}
              style={{padding:"4px 7px",border:"1.5px solid #e0e0e0",borderRadius:6,fontSize:11,fontFamily:"inherit",outline:"none",background:"#fff",color:"#555",cursor:"pointer"}}>
              {TRACK_TYPES.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          )}
          <button onClick={()=>setShowNotes(v=>!v)} style={{background:showNotes?"#f0f0ec":"transparent",border:"1.5px solid #e0e0e0",borderRadius:6,padding:"4px 8px",fontSize:11,cursor:"pointer",color:"#888"}}>📝</button>
          <button onClick={()=>{ if(isClient&&videoInfo){setShowVideo(v=>!v);}else if(!isClient){setEditVideo(v=>!v);} }}
            style={{background:(showVideo||editVideo)?"#fff0e0":"transparent",border:`1.5px solid ${exercise.videoUrl?"#f4a96a":"#e0e0e0"}`,borderRadius:6,padding:"4px 8px",fontSize:11,cursor:"pointer",color:exercise.videoUrl?"#b85c00":"#888"}}>
            🎥
          </button>
          {!isClient&&<button onClick={onRemove} style={{background:"transparent",border:"1.5px solid #e8c5c5",borderRadius:6,padding:"4px 8px",fontSize:11,cursor:"pointer",color:"#c0392b"}}>✕</button>}
        </div>
      </div>

      {/* Sets */}
      <div style={{padding:"0 14px"}}>
        {/* Headers */}
        <div style={{display:"grid",gridTemplateColumns:`28px 56px ${isStrength?"1fr 1fr":isDuration?"1fr":"1fr"} 52px 36px`,gap:6,padding:"8px 0 4px",borderBottom:"1px solid #f0f0ec"}}>
          {["SET","TYPE",isStrength?"REPS":isDuration?"TIME":"REPS",isStrength?"KG":"","REST",""].map((h,i)=>(
            <div key={i} style={{fontSize:9,fontWeight:800,color:"#ccc",letterSpacing:".06em",textTransform:"uppercase",textAlign:"center"}}>{h}</div>
          ))}
        </div>

        {exercise.sets.map((s,si)=>{
          const st=SET_TYPES.find(t=>t.key===s.type);
          return (
            <div key={s.id} style={{display:"grid",gridTemplateColumns:`28px 56px ${isStrength?"1fr 1fr":isDuration?"1fr":"1fr"} 52px 36px`,gap:6,padding:"6px 0",borderBottom:"1px solid #f9f9f9",alignItems:"center",opacity:s.done?0.55:1}}>
              <div style={{fontWeight:700,fontSize:12,color:st?.color||"#555",textAlign:"center"}}>
                {s.type==="warmup"?"W":s.type==="dropset"?"D":s.type==="failure"?"F":si+1}
              </div>
              {isClient ? (
                <div style={{fontSize:10,color:st?.color||"#aaa",fontWeight:600,textAlign:"center"}}>{st?.label}</div>
              ) : (
                <select value={s.type} onChange={e=>updateSet(s.id,"type",e.target.value)}
                  style={{padding:"3px 4px",border:"1.5px solid #e0e0e0",borderRadius:5,fontSize:10,fontFamily:"inherit",outline:"none",background:"#fff",color:st?.color||"#555",cursor:"pointer"}}>
                  {SET_TYPES.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              )}

              {/* Reps or Duration */}
              {!isDuration&&(
                <div>
                  <input type="number" placeholder="—" value={s.reps} onChange={e=>updateSet(s.id,"reps",e.target.value)}
                    style={{width:"100%",padding:"4px 6px",border:"1.5px solid #e0e0e0",borderRadius:6,fontSize:12,fontFamily:"inherit",outline:"none",color:"#1a1a1a",textAlign:"center",background:isClient?"#f5f4f0":"#fff"}} />
                  {isClient&&s.done&&<input type="number" placeholder="✓" value={s.actualReps} onChange={e=>updateSet(s.id,"actualReps",e.target.value)}
                    style={{width:"100%",padding:"3px 6px",border:"1.5px solid #4caf50",borderRadius:6,fontSize:11,fontFamily:"inherit",outline:"none",color:"#2e7d32",textAlign:"center",background:"#f1f8f1",marginTop:2}} />}
                </div>
              )}
              {isDuration&&(
                <div>
                  <input placeholder="0:30" value={s.duration} onChange={e=>updateSet(s.id,"duration",e.target.value)}
                    style={{width:"100%",padding:"4px 6px",border:"1.5px solid #e0e0e0",borderRadius:6,fontSize:12,fontFamily:"inherit",outline:"none",color:"#1a1a1a",textAlign:"center",background:isClient?"#f5f4f0":"#fff"}} />
                  {isClient&&s.done&&<input placeholder="✓" value={s.actualDuration} onChange={e=>updateSet(s.id,"actualDuration",e.target.value)}
                    style={{width:"100%",padding:"3px 6px",border:"1.5px solid #4caf50",borderRadius:6,fontSize:11,fontFamily:"inherit",outline:"none",color:"#2e7d32",textAlign:"center",background:"#f1f8f1",marginTop:2}} />}
                </div>
              )}

              {/* Weight */}
              {isStrength&&(
                <div>
                  <input type="number" placeholder="—" value={s.weight} onChange={e=>updateSet(s.id,"weight",e.target.value)}
                    style={{width:"100%",padding:"4px 6px",border:"1.5px solid #e0e0e0",borderRadius:6,fontSize:12,fontFamily:"inherit",outline:"none",color:"#1a1a1a",textAlign:"center",background:isClient?"#f5f4f0":"#fff"}} />
                  {isClient&&s.done&&<input type="number" placeholder="✓" value={s.actualWeight} onChange={e=>updateSet(s.id,"actualWeight",e.target.value)}
                    style={{width:"100%",padding:"3px 6px",border:"1.5px solid #4caf50",borderRadius:6,fontSize:11,fontFamily:"inherit",outline:"none",color:"#2e7d32",textAlign:"center",background:"#f1f8f1",marginTop:2}} />}
                </div>
              )}
              {!isStrength&&<div/>}

              {/* Rest */}
              <input placeholder="60s" value={s.rest} onChange={e=>updateSet(s.id,"rest",e.target.value)}
                style={{width:"100%",padding:"4px 6px",border:"1.5px solid #e0e0e0",borderRadius:6,fontSize:12,fontFamily:"inherit",outline:"none",color:"#1a1a1a",textAlign:"center",background:isClient?"#f5f4f0":"#fff"}} />

              {/* Done / Remove */}
              {isClient ? (
                <button onClick={()=>toggleDone(s.id)}
                  style={{width:28,height:28,borderRadius:"50%",border:`2px solid ${s.done?"#4caf50":"#e0e0e0"}`,background:s.done?"#4caf50":"transparent",color:s.done?"#fff":"#ccc",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s",margin:"0 auto"}}>
                  ✓
                </button>
              ) : (
                <button onClick={()=>removeSet(s.id)}
                  style={{width:28,height:28,borderRadius:"50%",border:"1.5px solid #f0f0f0",background:"transparent",color:"#ddd",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto"}}>
                  ×
                </button>
              )}
            </div>
          );
        })}

        {!isClient&&(
          <button onClick={addSet} style={{background:"transparent",border:"1.5px dashed #ddd",borderRadius:7,padding:"6px",fontSize:11,fontWeight:600,color:"#aaa",cursor:"pointer",fontFamily:"inherit",width:"100%",margin:"8px 0",transition:"all .15s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="#1a1a1a";e.currentTarget.style.color="#1a1a1a";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="#ddd";e.currentTarget.style.color="#aaa";}}>
            + Add Set
          </button>
        )}
      </div>

      {showNotes&&(
        <div style={{padding:"0 14px 12px"}}>
          <textarea value={exercise.notes} onChange={e=>onChange({...exercise,notes:e.target.value})}
            placeholder="Notes (e.g. slow eccentric, keep core tight...)"
            style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e0e0e0",borderRadius:7,fontSize:12,fontFamily:"inherit",outline:"none",resize:"vertical",minHeight:50,color:"#555",background:"#fafaf8"}} />
        </div>
      )}

      {/* Video — coach edit */}
      {!isClient&&editVideo&&(
        <div style={{padding:"0 14px 12px"}}>
          <div style={{fontSize:11,fontWeight:600,color:"#888",marginBottom:5}}>YouTube or Vimeo URL</div>
          <div style={{display:"flex",gap:8}}>
            <input value={videoInput} onChange={e=>setVideoInput(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              style={{flex:1,padding:"8px 10px",border:"1.5px solid #f4a96a",borderRadius:7,fontSize:12,fontFamily:"inherit",outline:"none",color:"#1a1a1a"}} />
            <button onClick={()=>{ onChange({...exercise,videoUrl:videoInput}); setEditVideo(false); }}
              style={{background:"#f4803a",color:"#fff",border:"none",borderRadius:7,padding:"8px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
              Save
            </button>
            {exercise.videoUrl&&<button onClick={()=>{ setVideoInput(""); onChange({...exercise,videoUrl:""}); setEditVideo(false); }}
              style={{background:"transparent",border:"1.5px solid #e8c5c5",borderRadius:7,padding:"8px 10px",fontSize:12,cursor:"pointer",color:"#c0392b",fontFamily:"inherit"}}>
              Remove
            </button>}
          </div>
          {videoInput&&getVideoEmbed(videoInput)?.type==="youtube"&&(
            <div style={{marginTop:8,fontSize:11,color:"#4caf50"}}>✓ YouTube video detected</div>
          )}
          {videoInput&&getVideoEmbed(videoInput)?.type==="vimeo"&&(
            <div style={{marginTop:8,fontSize:11,color:"#4caf50"}}>✓ Vimeo video detected</div>
          )}
        </div>
      )}

      {/* Video — client view */}
      {isClient&&exercise.videoUrl&&showVideo&&(
        <div style={{padding:"0 14px 14px"}}>
          {videoInfo?.type==="youtube"&&(
            <div style={{borderRadius:9,overflow:"hidden",aspectRatio:"16/9"}}>
              <iframe src={videoInfo.embed} style={{width:"100%",height:"100%",border:"none"}} allowFullScreen title={exercise.name} />
            </div>
          )}
          {videoInfo?.type==="vimeo"&&(
            <div style={{borderRadius:9,overflow:"hidden",aspectRatio:"16/9"}}>
              <iframe src={videoInfo.embed} style={{width:"100%",height:"100%",border:"none"}} allowFullScreen title={exercise.name} />
            </div>
          )}
          {videoInfo?.type==="link"&&(
            <a href={videoInfo.url} target="_blank" rel="noopener noreferrer"
              style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",background:"#f0f0ec",borderRadius:8,fontSize:13,color:"#1a1a1a",textDecoration:"none",fontWeight:500}}>
              🎥 Watch exercise video ↗
            </a>
          )}
        </div>
      )}

      {/* Video thumbnail hint for client (when not expanded) */}
      {isClient&&exercise.videoUrl&&!showVideo&&(
        <div style={{padding:"0 14px 10px"}}>
          <button onClick={()=>setShowVideo(true)}
            style={{display:"flex",alignItems:"center",gap:8,background:"#fff5ee",border:"1px solid #f4a96a",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:600,color:"#b85c00",cursor:"pointer",fontFamily:"inherit"}}>
            🎥 Watch how-to video
          </button>
        </div>
      )}
    </div>
  );
}

// ── Block ─────────────────────────────────────────────────────────────────────
function Block({ block, onChange, onRemove, isClient }) {
  const [showPicker, setShowPicker] = useState(false);
  const isSingle   = block.type==="single";
  const isSuperset = block.type==="superset";
  const isCircuit  = block.type==="circuit";

  function updateEx(id, updated) { onChange({...block,exercises:block.exercises.map(e=>e.id===id?updated:e)}); }
  function removeEx(id) { onChange({...block,exercises:block.exercises.filter(e=>e.id!==id)}); }
  function addEx(ex) { onChange({...block,exercises:[...block.exercises,ex]}); }

  const maxExercises = isSingle?1:isSuperset?2:10;
  const canAddMore = block.exercises.length < maxExercises;

  // Color coding per block type
  const blockColor = isSingle?"#1a1a1a":isSuperset?"#9c27b0":"#e65100";
  const blockBg    = isSingle?"#f8f8f6":isSuperset?"#f9f0ff":"#fff5f0";
  const blockLabel = isSingle?"Single":isSuperset?"Superset":"Circuit";

  return (
    <div style={{marginBottom:16,borderRadius:12,border:`1.5px solid ${isSingle?"#ebebeb":isSuperset?"#e1c4f7":"#ffd0b5"}`,background:blockBg,overflow:"hidden"}}>
      {/* Block header */}
      <div style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${isSingle?"#f0f0f0":isSuperset?"#e8d5f8":"#ffd8c0"}`}}>
        <span style={{background:blockColor,color:"#fff",borderRadius:6,padding:"2px 9px",fontSize:11,fontWeight:700,letterSpacing:".04em"}}>{blockLabel}</span>
        {isCircuit&&(
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#666"}}>
            <span>Rounds:</span>
            {isClient ? (
              <strong>{block.rounds}</strong>
            ) : (
              <input type="number" value={block.rounds} onChange={e=>onChange({...block,rounds:Number(e.target.value)})}
                style={{width:44,padding:"2px 6px",border:"1.5px solid #ddd",borderRadius:5,fontSize:12,fontFamily:"inherit",outline:"none",color:"#1a1a1a",textAlign:"center"}} />
            )}
          </div>
        )}
        {isCircuit&&(
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#666"}}>
            <span>Rest between rounds:</span>
            {isClient ? (
              <strong>{block.restBetweenRounds}</strong>
            ) : (
              <input value={block.restBetweenRounds} onChange={e=>onChange({...block,restBetweenRounds:e.target.value})}
                style={{width:54,padding:"2px 6px",border:"1.5px solid #ddd",borderRadius:5,fontSize:12,fontFamily:"inherit",outline:"none",color:"#1a1a1a",textAlign:"center"}} placeholder="90s" />
            )}
          </div>
        )}
        <div style={{flex:1}}/>
        {!isClient&&<button onClick={onRemove} style={{background:"none",border:"none",fontSize:12,color:"#ccc",cursor:"pointer",fontFamily:"inherit"}}>Remove block</button>}
      </div>

      {/* Exercises */}
      <div style={{padding:"10px 12px"}}>
        {block.exercises.length===0&&!isClient&&(
          <div style={{textAlign:"center",color:"#ccc",fontSize:12,padding:"12px 0"}}>Click "+ Add Exercise" to build this {blockLabel.toLowerCase()}</div>
        )}
        {block.exercises.map((ex,i)=>(
          <div key={ex.id}>
            {(isSuperset||isCircuit)&&block.exercises.length>1&&(
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                <div style={{width:18,height:18,borderRadius:"50%",background:blockColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",flexShrink:0}}>
                  {String.fromCharCode(65+i)}
                </div>
                <div style={{flex:1,height:1,background:isSuperset?"#e1c4f7":"#ffd0b5"}}/>
              </div>
            )}
            <ExerciseRow exercise={ex} isClient={isClient}
              onChange={updated=>updateEx(ex.id,updated)}
              onRemove={()=>removeEx(ex.id)} />
          </div>
        ))}

        {!isClient&&canAddMore&&(
          <button onClick={()=>setShowPicker(true)}
            style={{background:"transparent",border:`1.5px dashed ${isSingle?"#ddd":isSuperset?"#c9a0e8":"#ffb380"}`,borderRadius:8,padding:"8px",fontSize:12,fontWeight:600,color:isSingle?"#aaa":isSuperset?"#9c27b0":"#e65100",cursor:"pointer",fontFamily:"inherit",width:"100%",transition:"all .15s"}}
            onMouseEnter={e=>e.currentTarget.style.opacity="0.7"}
            onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
            + Add Exercise {isSuperset&&block.exercises.length===0?"A":isSuperset&&block.exercises.length===1?"B":""}
          </button>
        )}
        {!isClient&&!canAddMore&&isSuperset&&(
          <div style={{fontSize:11,color:"#aaa",textAlign:"center",padding:"4px 0"}}>Superset is full (A+B). Use Circuit for 3+ exercises.</div>
        )}
      </div>

      {showPicker&&<ExercisePicker onAdd={addEx} onClose={()=>setShowPicker(false)} />}
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ section, onChange, onRemove, isClient }) {
  function updateBlock(id, updated) { onChange({...section,blocks:section.blocks.map(b=>b.id===id?updated:b)}); }
  function removeBlock(id) { onChange({...section,blocks:section.blocks.filter(b=>b.id!==id)}); }
  function addBlock(type) { onChange({...section,blocks:[...section.blocks,makeBlock(type)]}); }

  const totalSets = section.blocks.reduce((a,b)=>a+b.exercises.reduce((c,e)=>c+e.sets.length,0),0);
  const doneSets  = section.blocks.reduce((a,b)=>a+b.exercises.reduce((c,e)=>c+e.sets.filter(s=>s.done).length,0),0);

  return (
    <div style={{marginBottom:24}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
        {isClient ? (
          <div style={{fontWeight:700,fontSize:12,color:"#888",letterSpacing:".06em",textTransform:"uppercase"}}>{section.name}</div>
        ) : (
          <input value={section.name} onChange={e=>onChange({...section,name:e.target.value})}
            style={{fontWeight:700,fontSize:12,color:"#888",letterSpacing:".06em",textTransform:"uppercase",border:"none",outline:"none",fontFamily:"inherit",background:"transparent",flex:1}}
            placeholder="Section name..." />
        )}
        {isClient&&totalSets>0&&<span style={{fontSize:11,color:"#4caf50",fontWeight:600}}>{doneSets}/{totalSets} sets</span>}
        <div style={{flex:1,height:1,background:"#ebebeb"}}/>
        {!isClient&&<button onClick={onRemove} style={{background:"none",border:"none",fontSize:11,color:"#ccc",cursor:"pointer"}}>Remove</button>}
      </div>

      {section.blocks.map(b=>(
        <Block key={b.id} block={b} isClient={isClient}
          onChange={updated=>updateBlock(b.id,updated)}
          onRemove={()=>removeBlock(b.id)} />
      ))}

      {!isClient&&(
        <div style={{display:"flex",gap:8,marginTop:4}}>
          {[
            {type:"single",   label:"+ Single",   color:"#555",   bg:"#f0f0ec"},
            {type:"superset", label:"+ Superset",  color:"#7b1fa2",bg:"#f3e5f5"},
            {type:"circuit",  label:"+ Circuit",   color:"#bf360c",bg:"#fbe9e7"},
          ].map(opt=>(
            <button key={opt.type} onClick={()=>addBlock(opt.type)}
              style={{flex:1,padding:"8px",borderRadius:8,border:`1.5px solid ${opt.bg}`,background:opt.bg,color:opt.color,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.75"}
              onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function GymStrengthBuilder({ initialData, onSave, isClient }) {
  const defaultSections = [
    { id:uid(), name:"Warm-up",  blocks:[] },
    { id:uid(), name:"Main Set", blocks:[] },
    { id:uid(), name:"Cool-down",blocks:[] },
  ];

  const [sections,     setSections]     = useState(()=>{
    if (initialData?.sections) return initialData.sections;
    return defaultSections;
  });
  const [workoutName,  setWorkoutName]  = useState(initialData?.name||"");
  const [coachNotes,   setCoachNotes]   = useState(initialData?.coachNotes||"");
  const [rating,       setRating]       = useState(initialData?.rating||null);
  const [clientNotes,  setClientNotes]  = useState(initialData?.clientNotes||"");
  const [saving,       setSaving]       = useState(false);

  function updateSection(id, updated) { setSections(prev=>prev.map(s=>s.id===id?updated:s)); }
  function removeSection(id) { setSections(prev=>prev.filter(s=>s.id!==id)); }
  function addSection() { setSections(prev=>[...prev,{id:uid(),name:"New Section",blocks:[]}]); }

  const totalSets = sections.reduce((a,s)=>a+s.blocks.reduce((b,bl)=>b+bl.exercises.reduce((c,e)=>c+e.sets.length,0),0),0);
  const doneSets  = sections.reduce((a,s)=>a+s.blocks.reduce((b,bl)=>b+bl.exercises.reduce((c,e)=>c+e.sets.filter(s=>s.done).length,0),0),0);
  const totalExercises = sections.reduce((a,s)=>a+s.blocks.reduce((b,bl)=>b+bl.exercises.length,0),0);
  const progress = totalSets>0?Math.round((doneSets/totalSets)*100):0;

  async function handleSave() {
    setSaving(true);
    await onSave({ sections, name:workoutName, coachNotes, rating, clientNotes });
    setSaving(false);
  }

  return (
    <div style={{fontFamily:"'DM Sans','Helvetica Neue',sans-serif",color:"#1a1a1a"}}>
      {/* Workout name */}
      <div style={{marginBottom:16}}>
        {isClient ? (
          <div style={{fontWeight:700,fontSize:17}}>{workoutName||"Gym Strength Session"}</div>
        ) : (
          <input value={workoutName} onChange={e=>setWorkoutName(e.target.value)}
            style={{fontWeight:700,fontSize:17,border:"none",borderBottom:"2px solid #f0f0f0",outline:"none",fontFamily:"inherit",color:"#1a1a1a",background:"transparent",width:"100%",paddingBottom:6}}
            placeholder="Workout name (e.g. Upper Body Strength A)..." />
        )}
        <div style={{display:"flex",gap:14,marginTop:6,fontSize:12,color:"#aaa"}}>
          <span>{totalExercises} exercise{totalExercises!==1?"s":""}</span>
          <span>{totalSets} set{totalSets!==1?"s":""}</span>
          {isClient&&totalSets>0&&<span style={{color:"#4caf50",fontWeight:600}}>{progress}% complete</span>}
        </div>
      </div>

      {/* Progress bar */}
      {isClient&&totalSets>0&&(
        <div style={{height:5,background:"#f0f0f0",borderRadius:3,marginBottom:16,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${progress}%`,background:"#4caf50",borderRadius:3,transition:"width .3s"}}/>
        </div>
      )}

      {/* Coach notes */}
      {coachNotes&&<div style={{background:"#fffbe6",border:"1px solid #ffe082",borderRadius:10,padding:"12px 14px",marginBottom:14}}><div style={{fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"#a07a00",marginBottom:4}}>📌 Coach Notes</div><div style={{fontSize:13,color:"#5a4800",lineHeight:1.6}}>{coachNotes}</div></div>}
      {!isClient&&(
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:".06em",textTransform:"uppercase",marginBottom:5}}>Coach Notes (visible to client)</div>
          <textarea value={coachNotes} onChange={e=>setCoachNotes(e.target.value)}
            placeholder="General instructions, focus points, safety notes..."
            style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none",resize:"vertical",minHeight:56,color:"#1a1a1a"}} />
        </div>
      )}

      {/* Sections */}
      {sections.map(s=>(
        <Section key={s.id} section={s} isClient={isClient}
          onChange={updated=>updateSection(s.id,updated)}
          onRemove={()=>removeSection(s.id)} />
      ))}

      {!isClient&&(
        <button onClick={addSection}
          style={{background:"transparent",border:"1.5px dashed #ddd",borderRadius:10,padding:"10px",fontSize:12,fontWeight:600,color:"#aaa",cursor:"pointer",fontFamily:"inherit",width:"100%",marginBottom:16,transition:"all .15s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#555";e.currentTarget.style.color="#555";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="#ddd";e.currentTarget.style.color="#aaa";}}>
          + Add Section
        </button>
      )}

      {/* Client rating + notes */}
      {isClient&&(
        <>
          <div style={{background:"#f8f8f6",borderRadius:10,padding:"14px",marginTop:8,textAlign:"center"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#aaa",letterSpacing:".06em",textTransform:"uppercase",marginBottom:10}}>Rate this workout</div>
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
            <div style={{fontSize:12,fontWeight:600,color:"#555",marginBottom:5}}>Notes for your coach</div>
            <textarea value={clientNotes} onChange={e=>setClientNotes(e.target.value)}
              placeholder="How did it go? Anything too easy or too hard?"
              style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none",resize:"vertical",minHeight:64,color:"#1a1a1a"}} />
          </div>
        </>
      )}

      <button onClick={handleSave} disabled={saving}
        style={{background:"#1a1a1a",color:"#fff",border:"none",padding:"12px 24px",borderRadius:9,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",width:"100%",marginTop:14,opacity:saving?0.6:1}}>
        {saving?"Saving...":isClient?"Save Workout Log":"Save Session Plan"}
      </button>
    </div>
  );
}
