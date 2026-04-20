import { useState } from "react";

const DISCIPLINES = [
  { key:"DNF",  label:"DNF",  color:"#005fa3", bg:"#e6f4ff", border:"#6ab0f4" },
  { key:"DYN",  label:"DYN",  color:"#2d7a2d", bg:"#edf6e6", border:"#7ec87e" },
  { key:"DYNB", label:"DYNB", color:"#7a6200", bg:"#fffbe6", border:"#e8cc4d" },
  { key:"STA",  label:"STA",  color:"#8b1f7a", bg:"#fdf0fb", border:"#d97ec8" },
  { key:"MIX",  label:"Mixed",color:"#555",    bg:"#f5f4f0", border:"#ccc"    },
];

const EQUIPMENT_OPTIONS = [
  { key:"short-fins",    label:"Short Fins",    emoji:"🦈" },
  { key:"long-fins",     label:"Long Fins",     emoji:"🏊" },
  { key:"monofin",       label:"Monofin",       emoji:"🐬" },
  { key:"snorkel",       label:"Snorkel",       emoji:"🤿" },
  { key:"front-snorkel", label:"Front Snorkel", emoji:"🫧" },
  { key:"goggles",       label:"Goggles",       emoji:"👓" },
  { key:"mask",          label:"Mask",          emoji:"🥽" },
  { key:"noseclip",      label:"Noseclip",      emoji:"🤏" },
  { key:"weight-belt",   label:"Weight Belt",   emoji:"⚖️" },
  { key:"no-weight-belt",label:"No Weight Belt",emoji:"🚫" },
  { key:"wetsuit",       label:"Wetsuit",       emoji:"🧥" },
  { key:"no-wetsuit",    label:"No Wetsuit",    emoji:"👙" },
  { key:"pullbuoy",      label:"Pull Buoy",     emoji:"🟠" },
  { key:"band",          label:"Band",          emoji:"🔗" },
  { key:"kickboard",     label:"Kickboard",     emoji:"🏄" },
  { key:"other",         label:"Other",         emoji:"➕" },
];

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function makeExercise() {
  return {
    id: uid(),
    discipline: "DNF",
    meters: "",
    reps: "",
    description: "",
    videoUrl: "",
    log: { done:false, feeling:"", observations:"" },
  };
}

function getVideoEmbed(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return { type:"youtube", embed:"https://www.youtube.com/embed/" + yt[1] };
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return { type:"vimeo", embed:"https://player.vimeo.com/video/" + vm[1] };
  return { type:"link", url };
}

function ExerciseCard({ exercise, index, onChange, onRemove, isClient }) {
  const [showLog,    setShowLog]    = useState(false);
  const [showVideo,  setShowVideo]  = useState(false);
  const [editVideo,  setEditVideo]  = useState(false);
  const [videoInput, setVideoInput] = useState(exercise.videoUrl || "");

  const disc = DISCIPLINES.find(d => d.key === exercise.discipline) || DISCIPLINES[0];
  const videoInfo = getVideoEmbed(exercise.videoUrl);

  function upd(field, val) { onChange({ ...exercise, [field]: val }); }
  function updLog(field, val) { onChange({ ...exercise, log: { ...exercise.log, [field]: val } }); }

  const distLabel = exercise.reps
    ? exercise.reps + " x " + (exercise.meters || "?") + "m"
    : exercise.meters ? exercise.meters + "m" : "";

  const inp = {
    padding:"8px 10px", border:"1.5px solid #e0e0e0", borderRadius:7,
    fontSize:13, fontFamily:"inherit", outline:"none", color:"#1a1a1a", width:"100%"
  };
  const inpGreen = { ...inp, border:"1.5px solid #a5d6a7", background:"#f1f8f1", color:"#2e7d32" };

  return (
    <div style={{ background:"#fff", borderRadius:12, border:"1.5px solid " + (exercise.log && exercise.log.done ? "#a5d6a7" : "#ebebeb"), marginBottom:12, overflow:"hidden" }}>
      {/* Header */}
      <div style={{ padding:"12px 16px", borderBottom:"1px solid #f5f5f5", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
        <span style={{ fontSize:13, fontWeight:700, color:"#bbb", flexShrink:0 }}>{index}.</span>

        {isClient ? (
          <div style={{ display:"inline-flex", alignItems:"center", padding:"4px 10px", borderRadius:8, fontSize:12, fontWeight:700, background:disc.bg, color:disc.color, border:"1.5px solid " + disc.border, flexShrink:0 }}>
            {disc.label}
          </div>
        ) : (
          <select value={exercise.discipline} onChange={e => upd("discipline", e.target.value)}
            style={{ padding:"5px 8px", border:"1.5px solid " + disc.border, borderRadius:8, fontSize:12, fontWeight:700, fontFamily:"inherit", outline:"none", background:disc.bg, color:disc.color, cursor:"pointer", flexShrink:0 }}>
            {DISCIPLINES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
        )}

        {isClient ? (
          <span style={{ fontWeight:700, fontSize:15, color:"#1a1a1a" }}>{distLabel}</span>
        ) : (
          <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
            <input type="number" placeholder="Reps" value={exercise.reps} onChange={e => upd("reps", e.target.value)}
              style={{ width:52, padding:"5px 7px", border:"1.5px solid #e0e0e0", borderRadius:7, fontSize:13, fontFamily:"inherit", outline:"none", color:"#1a1a1a", textAlign:"center" }} />
            <span style={{ color:"#bbb", fontSize:13 }}>x</span>
            <input type="number" placeholder="Meters" value={exercise.meters} onChange={e => upd("meters", e.target.value)}
              style={{ width:72, padding:"5px 7px", border:"1.5px solid #e0e0e0", borderRadius:7, fontSize:13, fontFamily:"inherit", outline:"none", color:"#1a1a1a", textAlign:"center" }} />
            <span style={{ color:"#aaa", fontSize:12 }}>m</span>
          </div>
        )}

        <div style={{ flex:1 }} />

        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          {isClient && (
            <button onClick={() => { updLog("done", !exercise.log.done); setShowLog(true); }}
              style={{ width:30, height:30, borderRadius:"50%", border:"2px solid " + (exercise.log && exercise.log.done ? "#4caf50" : "#e0e0e0"), background: exercise.log && exercise.log.done ? "#4caf50" : "transparent", color: exercise.log && exercise.log.done ? "#fff" : "#ccc", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s" }}>
              ✓
            </button>
          )}
          {isClient && (
            <button onClick={() => setShowLog(v => !v)}
              style={{ padding:"5px 10px", borderRadius:7, border:"1.5px solid #e0e0e0", background: showLog ? "#f0f0ec" : "transparent", fontSize:11, fontWeight:600, color:"#666", cursor:"pointer", fontFamily:"inherit" }}>
              {showLog ? "Hide" : "Log"}
            </button>
          )}
          <button onClick={() => { if (isClient && videoInfo) { setShowVideo(v => !v); } else if (!isClient) { setEditVideo(v => !v); } }}
            style={{ padding:"5px 9px", borderRadius:7, border:"1.5px solid " + (exercise.videoUrl ? "#f4a96a" : "#e0e0e0"), background: (showVideo || editVideo) ? "#fff0e0" : "transparent", fontSize:11, fontWeight:600, color: exercise.videoUrl ? "#b85c00" : "#888", cursor:"pointer", fontFamily:"inherit" }}>
            Video
          </button>
          {!isClient && (
            <button onClick={onRemove} style={{ padding:"5px 9px", borderRadius:7, border:"1.5px solid #e8c5c5", background:"transparent", fontSize:11, cursor:"pointer", color:"#c0392b", fontFamily:"inherit" }}>x</button>
          )}
        </div>
      </div>

      {/* Description */}
      <div style={{ padding:"10px 16px", borderBottom:"1px solid #f9f9f9" }}>
        {isClient ? (
          exercise.description
            ? <div style={{ fontSize:14, color:"#333", lineHeight:1.7, whiteSpace:"pre-wrap" }}>{exercise.description}</div>
            : <div style={{ fontSize:13, color:"#ccc", fontStyle:"italic" }}>No description</div>
        ) : (
          <textarea value={exercise.description} onChange={e => upd("description", e.target.value)}
            placeholder={"Describe the exercise — technique cues, focus points...\ne.g. Keep the shoulders raised, core short and legs long. Rock back and forth."}
            style={{ width:"100%", padding:"8px 0", border:"none", outline:"none", fontSize:14, fontFamily:"inherit", resize:"vertical", minHeight:72, color:"#333", background:"transparent", lineHeight:1.7 }} />
        )}
      </div>

      {/* Video edit (coach) */}
      {!isClient && editVideo && (
        <div style={{ padding:"10px 16px", borderBottom:"1px solid #f5f5f5", background:"#fffaf5" }}>
          <div style={{ fontSize:11, fontWeight:600, color:"#888", marginBottom:5 }}>YouTube or Vimeo URL</div>
          <div style={{ display:"flex", gap:8 }}>
            <input value={videoInput} onChange={e => setVideoInput(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              style={{ flex:1, padding:"7px 10px", border:"1.5px solid #f4a96a", borderRadius:7, fontSize:12, fontFamily:"inherit", outline:"none", color:"#1a1a1a" }} />
            <button onClick={() => { upd("videoUrl", videoInput); setEditVideo(false); }}
              style={{ background:"#f4803a", color:"#fff", border:"none", borderRadius:7, padding:"7px 14px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Save</button>
            {exercise.videoUrl && (
              <button onClick={() => { setVideoInput(""); upd("videoUrl", ""); setEditVideo(false); }}
                style={{ background:"transparent", border:"1.5px solid #e8c5c5", borderRadius:7, padding:"7px 10px", fontSize:12, cursor:"pointer", color:"#c0392b", fontFamily:"inherit" }}>Remove</button>
            )}
          </div>
          {videoInput && getVideoEmbed(videoInput) && getVideoEmbed(videoInput).type === "youtube" && <div style={{ marginTop:5, fontSize:11, color:"#4caf50" }}>YouTube detected</div>}
          {videoInput && getVideoEmbed(videoInput) && getVideoEmbed(videoInput).type === "vimeo"   && <div style={{ marginTop:5, fontSize:11, color:"#4caf50" }}>Vimeo detected</div>}
        </div>
      )}

      {/* Video view (client, expanded) */}
      {isClient && exercise.videoUrl && showVideo && (
        <div style={{ padding:"10px 16px", borderBottom:"1px solid #f5f5f5" }}>
          {(videoInfo && (videoInfo.type === "youtube" || videoInfo.type === "vimeo")) && (
            <div style={{ borderRadius:9, overflow:"hidden", aspectRatio:"16/9" }}>
              <iframe src={videoInfo.embed} style={{ width:"100%", height:"100%", border:"none" }} allowFullScreen title="Technique video" />
            </div>
          )}
          {videoInfo && videoInfo.type === "link" && (
            <a href={videoInfo.url} target="_blank" rel="noopener noreferrer"
              style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 14px", background:"#f0f0ec", borderRadius:8, fontSize:13, color:"#1a1a1a", textDecoration:"none", fontWeight:500 }}>
              Watch technique video
            </a>
          )}
        </div>
      )}

      {/* Video hint (client, collapsed) */}
      {isClient && exercise.videoUrl && !showVideo && (
        <div style={{ padding:"6px 16px", borderBottom:"1px solid #f5f5f5" }}>
          <button onClick={() => setShowVideo(true)}
            style={{ background:"#fff5ee", border:"1px solid #f4a96a", borderRadius:7, padding:"5px 12px", fontSize:11, fontWeight:600, color:"#b85c00", cursor:"pointer", fontFamily:"inherit" }}>
            Watch technique video
          </button>
        </div>
      )}

      {/* Client log */}
      {isClient && showLog && (
        <div style={{ padding:"12px 16px", background:"#fafaf8" }}>
          <div style={{ fontSize:10, fontWeight:800, letterSpacing:".07em", textTransform:"uppercase", color:"#aaa", marginBottom:10 }}>Your Log</div>
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:12, fontWeight:600, color:"#555", marginBottom:5 }}>How did it feel?</div>
            <input value={exercise.log.feeling || ""} onChange={e => updLog("feeling", e.target.value)}
              placeholder="Relaxed / tense / struggled with timing..." style={inpGreen} />
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:"#555", marginBottom:5 }}>Observations / what were you struggling with?</div>
            <textarea value={exercise.log.observations || ""} onChange={e => updLog("observations", e.target.value)}
              placeholder="e.g. Legs kept bending, lost rhythm after 50m..."
              style={{ ...inpGreen, resize:"vertical", minHeight:60 }} />
          </div>
        </div>
      )}
    </div>
  );
}

function EquipmentSelector({ selected, onChange, isClient }) {
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:700, color:"#bbb", letterSpacing:".07em", textTransform:"uppercase", marginBottom:10 }}>
        {isClient ? "Equipment needed" : "Equipment required"}
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
        {EQUIPMENT_OPTIONS.map(eq => {
          const sel = selected.includes(eq.key);
          return (
            <button key={eq.key}
              onClick={() => { if (isClient) return; onChange(sel ? selected.filter(k => k !== eq.key) : [...selected, eq.key]); }}
              style={{ padding:"6px 12px", borderRadius:20, border:"1.5px solid " + (sel ? "#1a1a1a" : "#e0e0e0"), background: sel ? "#1a1a1a" : "#fff", color: sel ? "#fff" : "#666", fontSize:12, fontWeight: sel ? 600 : 400, cursor: isClient ? "default" : "pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:5, transition:"all .12s" }}>
              <span>{eq.emoji}</span>
              <span>{eq.label}</span>
            </button>
          );
        })}
      </div>
      {isClient && selected.length === 0 && (
        <div style={{ fontSize:12, color:"#bbb", fontStyle:"italic", marginTop:4 }}>No specific equipment listed</div>
      )}
    </div>
  );
}

export default function PoolTechniqueBuilder({ initialData, onSave, isClient }) {
  const [sessionName, setSessionName] = useState((initialData && initialData.sessionName) || "");
  const [discipline,  setDiscipline]  = useState((initialData && initialData.discipline)  || "DNF");
  const [equipment,   setEquipment]   = useState((initialData && initialData.equipment)   || []);
  const [coachNotes,  setCoachNotes]  = useState((initialData && initialData.coachNotes)  || "");
  const [exercises,   setExercises]   = useState((initialData && initialData.exercises)   || []);
  const [clientNotes, setClientNotes] = useState((initialData && initialData.clientNotes) || "");
  const [rating,      setRating]      = useState((initialData && initialData.rating)      || null);
  const [saving,      setSaving]      = useState(false);

  function updateExercise(id, updated) { setExercises(prev => prev.map(e => e.id === id ? updated : e)); }
  function removeExercise(id)          { setExercises(prev => prev.filter(e => e.id !== id)); }
  function addExercise()               { setExercises(prev => [...prev, makeExercise()]); }

  const doneCount  = exercises.filter(e => e.log && e.log.done).length;
  const totalCount = exercises.length;
  const progress   = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const totalM     = exercises.reduce((sum, ex) => sum + (Number(ex.reps) || 1) * (Number(ex.meters) || 0), 0);

  const mainDisc = DISCIPLINES.find(d => d.key === discipline) || DISCIPLINES[0];

  async function handleSave() {
    setSaving(true);
    await onSave({ sessionName, discipline, totalMeters: totalM, equipment, coachNotes, exercises, clientNotes, rating });
    setSaving(false);
  }

  return (
    <div style={{ fontFamily:"'DM Sans','Helvetica Neue',sans-serif", color:"#1a1a1a" }}>

      {/* Discipline */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#bbb", letterSpacing:".07em", textTransform:"uppercase", marginBottom:8 }}>Discipline</div>
        {isClient ? (
          <div style={{ display:"inline-flex", alignItems:"center", padding:"8px 16px", borderRadius:10, fontSize:14, fontWeight:700, background:mainDisc.bg, color:mainDisc.color, border:"2px solid " + mainDisc.border }}>
            {mainDisc.label}
          </div>
        ) : (
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {DISCIPLINES.map(d => {
              const sel = discipline === d.key;
              return (
                <button key={d.key} onClick={() => setDiscipline(d.key)}
                  style={{ padding:"8px 16px", borderRadius:10, border:"2px solid " + (sel ? d.border : "#e0e0e0"), background: sel ? d.bg : "#fff", color: sel ? d.color : "#aaa", fontWeight: sel ? 700 : 500, fontSize:13, cursor:"pointer", fontFamily:"inherit", transition:"all .12s" }}>
                  {d.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Session name */}
      <div style={{ marginBottom:14 }}>
        {isClient ? (
          <div style={{ fontWeight:700, fontSize:17 }}>{sessionName || "Pool Technique Session"}</div>
        ) : (
          <input value={sessionName} onChange={e => setSessionName(e.target.value)}
            style={{ fontWeight:700, fontSize:17, border:"none", borderBottom:"2px solid #f0f0f0", outline:"none", fontFamily:"inherit", color:"#1a1a1a", background:"transparent", width:"100%", paddingBottom:6 }}
            placeholder="Session name (e.g. DNF Technique — Dolphin Kick Focus)..." />
        )}
        <div style={{ fontSize:12, color:"#aaa", marginTop:5, display:"flex", gap:16 }}>
          <span>{totalCount} exercise{totalCount !== 1 ? "s" : ""}</span>
          {totalM > 0 && <span style={{ fontWeight:600, color:"#555" }}>{totalM}m total</span>}
          {isClient && totalCount > 0 && <span style={{ color:"#4caf50", fontWeight:600 }}>{doneCount}/{totalCount} done</span>}
        </div>
      </div>

      {/* Progress bar */}
      {isClient && totalCount > 0 && (
        <div style={{ height:5, background:"#f0f0f0", borderRadius:3, marginBottom:16, overflow:"hidden" }}>
          <div style={{ height:"100%", width:progress + "%", background:"#4caf50", borderRadius:3, transition:"width .3s" }} />
        </div>
      )}

      {/* Equipment */}
      <div style={{ background:"#f8f8f6", borderRadius:10, padding:"14px 16px", marginBottom:16 }}>
        <EquipmentSelector selected={equipment} onChange={setEquipment} isClient={isClient} />
      </div>

      {/* Coach notes */}
      {isClient && coachNotes && (
        <div style={{ background:"#fffbe6", border:"1px solid #ffe082", borderRadius:10, padding:"12px 14px", marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:800, letterSpacing:".08em", textTransform:"uppercase", color:"#a07a00", marginBottom:4 }}>Coach Notes</div>
          <div style={{ fontSize:13, color:"#5a4800", lineHeight:1.7 }}>{coachNotes}</div>
        </div>
      )}
      {!isClient && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#bbb", letterSpacing:".07em", textTransform:"uppercase", marginBottom:6 }}>Session Notes (visible to client)</div>
          <textarea value={coachNotes} onChange={e => setCoachNotes(e.target.value)}
            placeholder="Overall session focus, safety notes, mental cues..."
            style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #e0e0e0", borderRadius:8, fontSize:13, fontFamily:"inherit", outline:"none", resize:"vertical", minHeight:56, color:"#1a1a1a" }} />
        </div>
      )}

      {/* Empty state */}
      {exercises.length === 0 && !isClient && (
        <div style={{ background:"#fafaf8", border:"1.5px dashed #ddd", borderRadius:12, padding:"24px", textAlign:"center", color:"#bbb", fontSize:13, marginBottom:14 }}>
          No exercises yet — click "+ Add Exercise" to build the session
        </div>
      )}
      {exercises.length === 0 && isClient && (
        <div style={{ background:"#fafaf8", borderRadius:12, padding:"24px", textAlign:"center", color:"#bbb", fontSize:13, marginBottom:14 }}>
          No exercises planned yet.
        </div>
      )}

      {/* Exercise list */}
      {exercises.map((ex, i) => (
        <ExerciseCard key={ex.id} exercise={ex} index={i + 1} isClient={isClient}
          onChange={updated => updateExercise(ex.id, updated)}
          onRemove={() => removeExercise(ex.id)} />
      ))}

      {/* Add exercise button */}
      {!isClient && (
        <button onClick={addExercise}
          style={{ background:"#f0f0ec", border:"none", borderRadius:10, padding:"11px", fontSize:13, fontWeight:600, color:"#555", cursor:"pointer", fontFamily:"inherit", width:"100%", marginBottom:14, transition:"all .15s" }}
          onMouseEnter={e => e.currentTarget.style.background = "#e8e8e4"}
          onMouseLeave={e => e.currentTarget.style.background = "#f0f0ec"}>
          + Add Exercise
        </button>
      )}

      {/* Client rating */}
      {isClient && (
        <>
          <div style={{ background:"#f8f8f6", borderRadius:10, padding:"14px", marginTop:8, textAlign:"center" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#aaa", letterSpacing:".06em", textTransform:"uppercase", marginBottom:10 }}>Rate this session</div>
            <div style={{ display:"flex", justifyContent:"center", gap:8 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setRating(n)}
                  style={{ fontSize:22, background:"none", border:"none", cursor:"pointer", opacity: rating && rating < n ? 0.25 : 1, transition:"all .15s" }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.2)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                  ⭐
                </button>
              ))}
            </div>
            {rating && <div style={{ fontSize:11, color:"#888", marginTop:6 }}>{rating}/5 stars</div>}
          </div>
          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:12, fontWeight:600, color:"#555", marginBottom:5 }}>General notes for your coach</div>
            <textarea value={clientNotes} onChange={e => setClientNotes(e.target.value)}
              placeholder="Overall session feeling, what worked, what didn't..."
              style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #e0e0e0", borderRadius:8, fontSize:13, fontFamily:"inherit", outline:"none", resize:"vertical", minHeight:64, color:"#1a1a1a" }} />
          </div>
        </>
      )}

      <button onClick={handleSave} disabled={saving}
        style={{ background:"#1a1a1a", color:"#fff", border:"none", padding:"12px 24px", borderRadius:9, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit", width:"100%", marginTop:14, opacity: saving ? 0.6 : 1 }}>
        {saving ? "Saving..." : isClient ? "Save Session Log" : "Save Session Plan"}
      </button>
    </div>
  );
}
