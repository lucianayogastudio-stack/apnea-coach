import { useState } from "react";

const TECHNIQUES = [
  { key:"mouthfill",        label:"Mouthfill",         emoji:"💧", color:"#005fa3", bg:"#e6f4ff", border:"#6ab0f4" },
  { key:"constant-pressure",label:"Constant Pressure", emoji:"🔄", color:"#2d7a2d", bg:"#edf6e6", border:"#7ec87e" },
  { key:"reverse-packing",  label:"Reverse Packing",   emoji:"⬆️", color:"#7a6200", bg:"#fffbe6", border:"#e8cc4d" },
  { key:"glottis",          label:"Glottis Control",   emoji:"🎭", color:"#8b1f7a", bg:"#fdf0fb", border:"#d97ec8" },
  { key:"soft-palate",      label:"Soft Palate",       emoji:"🌊", color:"#1a2fa3", bg:"#eef0ff", border:"#9aa5f4" },
  { key:"cheeks",           label:"Cheeks",            emoji:"😶", color:"#b85c00", bg:"#fff0e6", border:"#f4a96a" },
  { key:"other",            label:"Other",             emoji:"✏️", color:"#555",    bg:"#f5f4f0", border:"#ccc"    },
];

const EQUIPMENT_OPTIONS = [
  { key:"eq-tool",      label:"Eq Tool",          emoji:"🔧" },
  { key:"eq-tool-tube", label:"Eq Tool + Tube",   emoji:"🔧🫧" },
  { key:"mirror",       label:"Mirror",           emoji:"🪞" },
  { key:"balloon",      label:"Balloon",          emoji:"🎈" },
  { key:"none",         label:"No Equipment",     emoji:"🤲" },
];

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function getTechnique(key) {
  return TECHNIQUES.find(t => t.key === key) || TECHNIQUES[TECHNIQUES.length - 1];
}

function getVideoEmbed(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return { type:"youtube", embed:"https://www.youtube.com/embed/" + yt[1] };
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return { type:"vimeo", embed:"https://player.vimeo.com/video/" + vm[1] };
  return { type:"link", url };
}

function makeDrill() {
  return {
    id: uid(),
    technique: "mouthfill",
    name: "",
    description: "",
    duration: "",
    reps: "",
    videoUrl: "",
    log: {
      done: false,
      selfAssessment: null,
      notes: "",
    },
  };
}

// ── Self assessment stars ─────────────────────────────────────────────────────
function SelfAssessment({ value, onChange, isClient }) {
  const levels = [
    { n:1, label:"Didn't feel it",  emoji:"😕" },
    { n:2, label:"Slight feeling",  emoji:"🤔" },
    { n:3, label:"Getting it",      emoji:"😐" },
    { n:4, label:"Felt good",       emoji:"🙂" },
    { n:5, label:"Clicked!",        emoji:"🎯" },
  ];
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:700, color:"#bbb", letterSpacing:".06em", textTransform:"uppercase", marginBottom:7 }}>How well did this feel?</div>
      <div style={{ display:"flex", gap:6 }}>
        {levels.map(l => {
          const sel = value === l.n;
          return (
            <button key={l.n} onClick={() => isClient && onChange(l.n)} title={l.label}
              style={{ flex:1, padding:"8px 4px", borderRadius:8, border:"2px solid " + (sel ? "#1a1a1a" : "#e0e0e0"), background: sel ? "#1a1a1a" : "#fff", cursor: isClient ? "pointer" : "default", fontFamily:"inherit", display:"flex", flexDirection:"column", alignItems:"center", gap:3, transition:"all .15s" }}>
              <span style={{ fontSize:18 }}>{l.emoji}</span>
              <span style={{ fontSize:9, fontWeight:700, color: sel ? "#fff" : "#bbb", textAlign:"center", lineHeight:1.2 }}>{l.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Drill Card ────────────────────────────────────────────────────────────────
function DrillCard({ drill, index, onChange, onRemove, isClient }) {
  const [showLog,    setShowLog]    = useState(!!drill.log?.notes || !!drill.log?.selfAssessment);
  const [editVideo,  setEditVideo]  = useState(false);
  const [showVideo,  setShowVideo]  = useState(false);
  const [videoInput, setVideoInput] = useState(drill.videoUrl || "");

  const tech = getTechnique(drill.technique);
  const videoInfo = getVideoEmbed(drill.videoUrl);

  function upd(f, v) { onChange({ ...drill, [f]: v }); }
  function updLog(f, v) { onChange({ ...drill, log: { ...drill.log, [f]: v } }); }

  const isDone = drill.log && drill.log.done;

  return (
    <div style={{ background:"#fff", borderRadius:12, border:"1.5px solid " + (isDone ? "#a5d6a7" : "#ebebeb"), marginBottom:12, overflow:"hidden", transition:"border-color .2s" }}>
      {/* Header */}
      <div style={{ padding:"12px 16px", borderBottom:"1px solid #f5f5f5", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
        <span style={{ fontSize:13, fontWeight:700, color:"#bbb", flexShrink:0 }}>{index}.</span>

        {/* Technique badge */}
        {isClient ? (
          <div style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:8, fontSize:12, fontWeight:700, background:tech.bg, color:tech.color, border:"1.5px solid " + tech.border, flexShrink:0 }}>
            <span>{tech.emoji}</span><span>{tech.label}</span>
          </div>
        ) : (
          <select value={drill.technique} onChange={e => upd("technique", e.target.value)}
            style={{ padding:"5px 8px", border:"1.5px solid " + tech.border, borderRadius:8, fontSize:12, fontWeight:700, fontFamily:"inherit", outline:"none", background:tech.bg, color:tech.color, cursor:"pointer" }}>
            {TECHNIQUES.map(t => <option key={t.key} value={t.key}>{t.emoji} {t.label}</option>)}
          </select>
        )}

        {/* Drill name */}
        {isClient ? (
          drill.name && <span style={{ fontWeight:600, fontSize:14, color:"#1a1a1a" }}>{drill.name}</span>
        ) : (
          <input value={drill.name} onChange={e => upd("name", e.target.value)}
            placeholder="Drill name (e.g. Mouthfill hold at FRC)..."
            style={{ flex:1, minWidth:120, padding:"5px 8px", border:"1.5px solid #e0e0e0", borderRadius:7, fontSize:13, fontFamily:"inherit", outline:"none", color:"#1a1a1a", background:"#fff" }} />
        )}

        <div style={{ flex:1 }} />

        {/* Duration / reps */}
        {isClient ? (
          <div style={{ display:"flex", gap:8, fontSize:12, color:"#888" }}>
            {drill.reps && <span style={{ fontWeight:600 }}>{drill.reps} reps</span>}
            {drill.duration && <span style={{ fontWeight:600 }}>{drill.duration}</span>}
          </div>
        ) : (
          <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
            <input type="number" placeholder="Reps" value={drill.reps} onChange={e => upd("reps", e.target.value)}
              style={{ width:52, padding:"4px 6px", border:"1.5px solid #e0e0e0", borderRadius:6, fontSize:12, fontFamily:"inherit", outline:"none", color:"#1a1a1a", textAlign:"center", background:"#fff" }} />
            <input placeholder="Duration" value={drill.duration} onChange={e => upd("duration", e.target.value)}
              style={{ width:72, padding:"4px 6px", border:"1.5px solid #e0e0e0", borderRadius:6, fontSize:12, fontFamily:"inherit", outline:"none", color:"#1a1a1a", textAlign:"center", background:"#fff" }} />
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display:"flex", gap:5 }}>
          {isClient && (
            <button onClick={() => { updLog("done", !isDone); setShowLog(true); }}
              style={{ width:30, height:30, borderRadius:"50%", border:"2px solid " + (isDone ? "#4caf50" : "#e0e0e0"), background: isDone ? "#4caf50" : "transparent", color: isDone ? "#fff" : "#ccc", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s" }}>✓</button>
          )}
          {isClient && (
            <button onClick={() => setShowLog(v => !v)}
              style={{ padding:"5px 9px", borderRadius:7, border:"1.5px solid #e0e0e0", background: showLog ? "#f0f0ec" : "transparent", fontSize:11, fontWeight:600, color:"#666", cursor:"pointer", fontFamily:"inherit" }}>
              {showLog ? "Hide" : "Log"}
            </button>
          )}
          <button onClick={() => { if (isClient && videoInfo) { setShowVideo(v => !v); } else if (!isClient) { setEditVideo(v => !v); } }}
            style={{ padding:"5px 9px", borderRadius:7, border:"1.5px solid " + (drill.videoUrl ? "#f4a96a" : "#e0e0e0"), background: (showVideo || editVideo) ? "#fff0e0" : "transparent", fontSize:11, color: drill.videoUrl ? "#b85c00" : "#888", cursor:"pointer", fontFamily:"inherit" }}>
            Video
          </button>
          {!isClient && (
            <button onClick={onRemove} style={{ padding:"5px 9px", borderRadius:7, border:"1.5px solid #e8c5c5", fontSize:11, cursor:"pointer", color:"#c0392b", fontFamily:"inherit" }}>x</button>
          )}
        </div>
      </div>

      {/* Description */}
      <div style={{ padding:"10px 16px", borderBottom:"1px solid #f9f9f9" }}>
        {isClient ? (
          drill.description
            ? <div style={{ fontSize:14, color:"#333", lineHeight:1.75, whiteSpace:"pre-wrap" }}>{drill.description}</div>
            : <div style={{ fontSize:13, color:"#ccc", fontStyle:"italic" }}>No description</div>
        ) : (
          <textarea value={drill.description} onChange={e => upd("description", e.target.value)}
            placeholder={"Describe the drill in detail — what to do, how to do it, what to feel...\ne.g. Fill your mouth completely, close the glottis, then try to move air from cheeks to inner ear without using your throat..."}
            style={{ width:"100%", padding:"6px 0", border:"none", outline:"none", fontSize:14, fontFamily:"inherit", resize:"vertical", minHeight:80, color:"#1a1a1a", background:"transparent", lineHeight:1.75 }} />
        )}
      </div>

      {/* Video edit (coach) */}
      {!isClient && editVideo && (
        <div style={{ padding:"8px 16px", borderBottom:"1px solid #f5f5f5", background:"#fffaf5" }}>
          <div style={{ display:"flex", gap:7 }}>
            <input value={videoInput} onChange={e => setVideoInput(e.target.value)}
              placeholder="YouTube or Vimeo URL..."
              style={{ flex:1, padding:"6px 10px", border:"1.5px solid #f4a96a", borderRadius:6, fontSize:12, fontFamily:"inherit", outline:"none", color:"#1a1a1a", background:"#fff" }} />
            <button onClick={() => { upd("videoUrl", videoInput); setEditVideo(false); }}
              style={{ background:"#f4803a", color:"#fff", border:"none", borderRadius:6, padding:"6px 14px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Save</button>
            {drill.videoUrl && (
              <button onClick={() => { setVideoInput(""); upd("videoUrl", ""); setEditVideo(false); }}
                style={{ background:"transparent", border:"1.5px solid #e8c5c5", borderRadius:6, padding:"6px 9px", fontSize:12, cursor:"pointer", color:"#c0392b", fontFamily:"inherit" }}>Remove</button>
            )}
          </div>
          {videoInput && getVideoEmbed(videoInput) && getVideoEmbed(videoInput).type !== "link" && (
            <div style={{ marginTop:5, fontSize:11, color:"#4caf50" }}>Video detected!</div>
          )}
        </div>
      )}

      {/* Video view (client) */}
      {isClient && drill.videoUrl && showVideo && (
        <div style={{ padding:"8px 16px", borderBottom:"1px solid #f5f5f5" }}>
          {videoInfo && (videoInfo.type === "youtube" || videoInfo.type === "vimeo") && (
            <div style={{ borderRadius:9, overflow:"hidden", aspectRatio:"16/9" }}>
              <iframe src={videoInfo.embed} style={{ width:"100%", height:"100%", border:"none" }} allowFullScreen title="Drill video" />
            </div>
          )}
          {videoInfo && videoInfo.type === "link" && (
            <a href={videoInfo.url} target="_blank" rel="noopener noreferrer"
              style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 14px", background:"#f0f0ec", borderRadius:8, fontSize:13, color:"#1a1a1a", textDecoration:"none", fontWeight:500 }}>
              Watch drill video
            </a>
          )}
        </div>
      )}
      {isClient && drill.videoUrl && !showVideo && (
        <div style={{ padding:"5px 16px", borderBottom:"1px solid #f5f5f5" }}>
          <button onClick={() => setShowVideo(true)}
            style={{ background:"#fff5ee", border:"1px solid #f4a96a", borderRadius:7, padding:"4px 12px", fontSize:11, fontWeight:600, color:"#b85c00", cursor:"pointer", fontFamily:"inherit" }}>
            Watch drill video
          </button>
        </div>
      )}

      {/* Client log */}
      {isClient && showLog && (
        <div style={{ padding:"12px 16px", background:"#fafaf8" }}>
          <div style={{ marginBottom:14 }}>
            <SelfAssessment value={drill.log?.selfAssessment} onChange={v => updLog("selfAssessment", v)} isClient={isClient} />
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:"#555", marginBottom:5 }}>What did you feel? What was hard?</div>
            <textarea value={drill.log?.notes || ""} onChange={e => updLog("notes", e.target.value)}
              placeholder="e.g. Could feel the soft palate moving but struggled to hold pressure. Cheeks kept relaxing after 5 seconds..."
              style={{ width:"100%", padding:"8px 10px", border:"1.5px solid #a5d6a7", borderRadius:7, fontSize:13, fontFamily:"inherit", outline:"none", resize:"vertical", minHeight:72, color:"#1a1a1a", background:"#f1f8f1" }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Dry Eq Builder ───────────────────────────────────────────────────────
export default function DryEqBuilder({ initialData, onSave, isClient }) {
  const [sessionName,  setSessionName]  = useState((initialData && initialData.sessionName)  || "");
  const [focusAreas,   setFocusAreas]   = useState((initialData && initialData.focusAreas)   || []);
  const [equipment,    setEquipment]    = useState((initialData && initialData.equipment)     || []);
  const [sessionType,  setSessionType]  = useState((initialData && initialData.sessionType)   || "guided");
  const [coachNotes,   setCoachNotes]   = useState((initialData && initialData.coachNotes)    || "");
  const [drills,       setDrills]       = useState((initialData && initialData.drills)        || []);
  const [clientNotes,  setClientNotes]  = useState((initialData && initialData.clientNotes)   || "");
  const [overallRating,setOverallRating]= useState((initialData && initialData.overallRating) || null);
  const [saving,       setSaving]       = useState(false);

  function updateDrill(id, updated) { setDrills(prev => prev.map(d => d.id === id ? updated : d)); }
  function removeDrill(id)          { setDrills(prev => prev.filter(d => d.id !== id)); }
  function addDrill()               { setDrills(prev => [...prev, makeDrill()]); }

  const doneCount  = drills.filter(d => d.log && d.log.done).length;
  const totalCount = drills.length;
  const progress   = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  function toggleFocus(key) {
    setFocusAreas(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }
  function toggleEquip(key) {
    setEquipment(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  async function handleSave() {
    setSaving(true);
    await onSave({ sessionName, focusAreas, equipment, sessionType, coachNotes, drills, clientNotes, overallRating });
    setSaving(false);
  }

  return (
    <div style={{ fontFamily:"'DM Sans','Helvetica Neue',sans-serif", color:"#1a1a1a" }}>

      {/* Session type toggle */}
      {!isClient && (
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          {[["guided","📋 Guided Session"],["free","🔓 Free Practice"]].map(([k,l]) => (
            <button key={k} onClick={() => setSessionType(k)}
              style={{ flex:1, padding:"10px", borderRadius:10, border:"2px solid " + (sessionType === k ? "#1a1a1a" : "#e0e0e0"), background: sessionType === k ? "#1a1a1a" : "#fff", color: sessionType === k ? "#fff" : "#888", fontWeight: sessionType === k ? 700 : 500, fontSize:13, cursor:"pointer", fontFamily:"inherit", transition:"all .15s" }}>
              {l}
            </button>
          ))}
        </div>
      )}

      {/* Session name */}
      <div style={{ marginBottom:14 }}>
        {isClient ? (
          <div>
            <div style={{ fontWeight:700, fontSize:17 }}>{sessionName || "Dry Equalization Session"}</div>
            <div style={{ fontSize:12, color:"#aaa", marginTop:3 }}>
              {sessionType === "free" ? "Free Practice" : "Guided Session"}
              {totalCount > 0 && " · " + totalCount + " drill" + (totalCount !== 1 ? "s" : "")}
            </div>
          </div>
        ) : (
          <input value={sessionName} onChange={e => setSessionName(e.target.value)}
            style={{ fontWeight:700, fontSize:17, border:"none", borderBottom:"2px solid #f0f0f0", outline:"none", fontFamily:"inherit", color:"#1a1a1a", background:"transparent", width:"100%", paddingBottom:6 }}
            placeholder="Session name (e.g. Mouthfill Fundamentals)..." />
        )}
      </div>

      {/* Progress bar */}
      {isClient && totalCount > 0 && (
        <div style={{ height:5, background:"#f0f0f0", borderRadius:3, marginBottom:16, overflow:"hidden" }}>
          <div style={{ height:"100%", width:progress + "%", background:"#4caf50", borderRadius:3, transition:"width .3s" }} />
        </div>
      )}

      {/* Focus areas */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#bbb", letterSpacing:".07em", textTransform:"uppercase", marginBottom:8 }}>
          {isClient ? "Technique Focus" : "Focus Areas (select all that apply)"}
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
          {TECHNIQUES.map(t => {
            const sel = focusAreas.includes(t.key);
            if (isClient && !sel) return null;
            return (
              <button key={t.key}
                onClick={() => { if (!isClient) toggleFocus(t.key); }}
                style={{ padding:"6px 12px", borderRadius:20, border:"1.5px solid " + (sel ? t.border : "#e0e0e0"), background: sel ? t.bg : "#fff", color: sel ? t.color : "#888", fontSize:12, fontWeight: sel ? 700 : 400, cursor: isClient ? "default" : "pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:5, transition:"all .12s" }}>
                <span>{t.emoji}</span><span>{t.label}</span>
              </button>
            );
          })}
          {isClient && focusAreas.length === 0 && <span style={{ fontSize:12, color:"#bbb", fontStyle:"italic" }}>No specific focus set</span>}
        </div>
      </div>

      {/* Equipment */}
      <div style={{ background:"#f8f8f6", borderRadius:10, padding:"12px 14px", marginBottom:14 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#bbb", letterSpacing:".07em", textTransform:"uppercase", marginBottom:8 }}>Equipment</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
          {EQUIPMENT_OPTIONS.map(eq => {
            const sel = equipment.includes(eq.key);
            if (isClient && !sel) return null;
            return (
              <button key={eq.key}
                onClick={() => { if (!isClient) toggleEquip(eq.key); }}
                style={{ padding:"6px 12px", borderRadius:20, border:"1.5px solid " + (sel ? "#1a1a1a" : "#e0e0e0"), background: sel ? "#1a1a1a" : "#fff", color: sel ? "#fff" : "#666", fontSize:12, fontWeight: sel ? 600 : 400, cursor: isClient ? "default" : "pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:5, transition:"all .12s" }}>
                <span>{eq.emoji}</span><span>{eq.label}</span>
              </button>
            );
          })}
          {isClient && equipment.length === 0 && <span style={{ fontSize:12, color:"#bbb", fontStyle:"italic" }}>No equipment needed</span>}
        </div>
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
          <div style={{ fontSize:11, fontWeight:700, color:"#bbb", letterSpacing:".07em", textTransform:"uppercase", marginBottom:6 }}>Session Notes (visible to athlete)</div>
          <textarea value={coachNotes} onChange={e => setCoachNotes(e.target.value)}
            placeholder="Session goals, progression notes, what to focus on today..."
            style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #e0e0e0", borderRadius:8, fontSize:13, fontFamily:"inherit", outline:"none", resize:"vertical", minHeight:56, color:"#1a1a1a", background:"#fff" }} />
        </div>
      )}

      {/* Free practice — simple log */}
      {sessionType === "free" && isClient && (
        <div style={{ background:"#f0f7ff", border:"1px solid #c0d8f0", borderRadius:10, padding:"14px 16px", marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#005fa3", marginBottom:8 }}>What did you work on today?</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:10 }}>
            {TECHNIQUES.map(t => {
              const sel = focusAreas.includes(t.key);
              return (
                <button key={t.key} onClick={() => toggleFocus(t.key)}
                  style={{ padding:"5px 11px", borderRadius:20, border:"1.5px solid " + (sel ? t.border : "#c0d8f0"), background: sel ? t.bg : "#fff", color: sel ? t.color : "#888", fontSize:12, fontWeight: sel ? 700 : 400, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:4 }}>
                  <span>{t.emoji}</span><span>{t.label}</span>
                </button>
              );
            })}
          </div>
          <textarea value={clientNotes} onChange={e => setClientNotes(e.target.value)}
            placeholder="Notes about your free practice session — what worked, what didn't, what you discovered..."
            style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #c0d8f0", borderRadius:8, fontSize:13, fontFamily:"inherit", outline:"none", resize:"vertical", minHeight:80, color:"#1a1a1a", background:"#fff" }} />
        </div>
      )}

      {/* Drills */}
      {sessionType === "guided" && (
        <>
          {drills.length === 0 && !isClient && (
            <div style={{ background:"#fafaf8", border:"1.5px dashed #ddd", borderRadius:12, padding:"24px", textAlign:"center", color:"#bbb", fontSize:13, marginBottom:14 }}>
              No drills yet — click "+ Add Drill" to build the session
            </div>
          )}
          {drills.length === 0 && isClient && (
            <div style={{ background:"#fafaf8", borderRadius:12, padding:"24px", textAlign:"center", color:"#bbb", fontSize:13, marginBottom:14 }}>
              No drills planned for this session.
            </div>
          )}
          {drills.map((drill, i) => (
            <DrillCard key={drill.id} drill={drill} index={i + 1} isClient={isClient}
              onChange={updated => updateDrill(drill.id, updated)}
              onRemove={() => removeDrill(drill.id)} />
          ))}
          {!isClient && (
            <button onClick={addDrill}
              style={{ background:"#f0f0ec", border:"none", borderRadius:10, padding:"11px", fontSize:13, fontWeight:600, color:"#555", cursor:"pointer", fontFamily:"inherit", width:"100%", marginBottom:14, transition:"all .15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "#e8e8e4"}
              onMouseLeave={e => e.currentTarget.style.background = "#f0f0ec"}>
              + Add Drill
            </button>
          )}
        </>
      )}

      {/* Client overall rating */}
      {isClient && (
        <>
          <div style={{ background:"#f8f8f6", borderRadius:10, padding:"14px", marginTop:8, textAlign:"center" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#aaa", letterSpacing:".06em", textTransform:"uppercase", marginBottom:10 }}>Overall session rating</div>
            <div style={{ display:"flex", justifyContent:"center", gap:8 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setOverallRating(n)}
                  style={{ fontSize:22, background:"none", border:"none", cursor:"pointer", opacity: overallRating && overallRating < n ? 0.25 : 1, transition:"all .15s" }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.2)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>⭐</button>
              ))}
            </div>
            {overallRating && <div style={{ fontSize:11, color:"#888", marginTop:6 }}>{overallRating}/5 stars</div>}
          </div>
          {sessionType !== "free" && (
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:12, fontWeight:600, color:"#555", marginBottom:5 }}>General notes for your coach</div>
              <textarea value={clientNotes} onChange={e => setClientNotes(e.target.value)}
                placeholder="Overall session feeling, breakthroughs, frustrations, questions for your coach..."
                style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #e0e0e0", borderRadius:8, fontSize:13, fontFamily:"inherit", outline:"none", resize:"vertical", minHeight:72, color:"#1a1a1a", background:"#fff" }} />
            </div>
          )}
        </>
      )}

      <button onClick={handleSave} disabled={saving}
        style={{ background:"#1a1a1a", color:"#fff", border:"none", padding:"12px 24px", borderRadius:9, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit", width:"100%", marginTop:14, opacity: saving ? 0.6 : 1 }}>
        {saving ? "Saving..." : isClient ? "Save Session Log" : "Save Session Plan"}
      </button>
    </div>
  );
}
