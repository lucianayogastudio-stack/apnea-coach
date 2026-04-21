import { useState } from "react";

// ── Constants ─────────────────────────────────────────────────────────────────
const DISCIPLINES = [
  { key:"DYN",        label:"DYN",        color:"#2d7a2d", bg:"#edf6e6", border:"#7ec87e" },
  { key:"DYNB",       label:"DYNB",       color:"#7a6200", bg:"#fffbe6", border:"#e8cc4d" },
  { key:"DNF",        label:"DNF",        color:"#005fa3", bg:"#e6f4ff", border:"#6ab0f4" },
  { key:"freestyle",  label:"Freestyle",  color:"#1a2fa3", bg:"#eef0ff", border:"#9aa5f4" },
  { key:"breaststroke",label:"Breaststroke",color:"#6a1b9a",bg:"#f3e5f5",border:"#ce93d8" },
  { key:"MIX",        label:"Mixed",      color:"#555",    bg:"#f5f4f0", border:"#ccc"    },
];

const POOL_LENGTHS = ["25m","50m","33m","20m"];

const EQUIPMENT_OPTIONS = [
  { key:"short-fins",    label:"Short Fins",  emoji:"🦈" },
  { key:"long-fins",     label:"Long Fins",   emoji:"🏊" },
  { key:"monofin",       label:"Monofin",     emoji:"🐬" },
  { key:"snorkel",       label:"Snorkel",     emoji:"🤿" },
  { key:"front-snorkel", label:"Front Snorkel",emoji:"🫧" },
  { key:"goggles",       label:"Goggles",     emoji:"👓" },
  { key:"mask",          label:"Mask",        emoji:"🥽" },
  { key:"noseclip",      label:"Noseclip",    emoji:"🤏" },
  { key:"weight-belt",   label:"Weight Belt", emoji:"⚖️" },
  { key:"no-weight-belt",label:"No Weight Belt",emoji:"🚫" },
  { key:"wetsuit",       label:"Wetsuit",     emoji:"🧥" },
  { key:"no-wetsuit",    label:"No Wetsuit",  emoji:"👙" },
  { key:"pullbuoy",      label:"Pull Buoy",   emoji:"🟠" },
  { key:"kickboard",     label:"Kickboard",   emoji:"🏄" },
  { key:"band",          label:"Band",        emoji:"🔗" },
  { key:"other",         label:"Other",       emoji:"➕" },
];

// Exercise block types
const BLOCK_TYPES = [
  { key:"distance",   label:"Distance",   desc:"Simple set — X reps × Y meters" },
  { key:"interval",   label:"Interval",   desc:"Starts / timed intervals with recovery" },
  { key:"overunder",  label:"Over/Under", desc:"Alternating surface + underwater lengths" },
  { key:"compound",   label:"Compound",   desc:"Complex multi-part set — write freely" },
];

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function makeBlock(type) {
  return {
    id: uid(), type,
    lungVolume: "Full",
    discipline: "DYN",
    // distance fields
    reps: "", meters: "",
    // interval fields — e.g. "4x60s, 4x55s, 6x50s" starts
    intervalSets: [{ id:uid(), reps:"", interval:"", rest:"" }],
    intervalMeters: "",
    // compound field
    compoundText: "",
    // shared
    equipment: [],
    description: "",
    videoUrl: "",
    log: { done:false, feeling:"", observations:"" },
  };
}

function makeSection(name) {
  return { id:uid(), name, blocks:[] };
}

function getVideoEmbed(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return { type:"youtube", embed:"https://www.youtube.com/embed/" + yt[1] };
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return { type:"vimeo", embed:"https://player.vimeo.com/video/" + vm[1] };
  return { type:"link", url };
}

// ── Equipment mini-picker ─────────────────────────────────────────────────────
function EquipmentPicker({ selected, onChange, isClient, mini }) {
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
      {EQUIPMENT_OPTIONS.map(eq => {
        const sel = selected.includes(eq.key);
        if (isClient && !sel) return null;
        return (
          <button key={eq.key}
            onClick={() => { if (isClient) return; onChange(sel ? selected.filter(k => k !== eq.key) : [...selected, eq.key]); }}
            style={{ padding: mini ? "4px 9px" : "6px 12px", borderRadius:20, border:"1.5px solid " + (sel ? "#1a1a1a" : "#e0e0e0"), background: sel ? "#1a1a1a" : "#fff", color: sel ? "#fff" : "#666", fontSize: mini ? 11 : 12, fontWeight: sel ? 600 : 400, cursor: isClient ? "default" : "pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:4, transition:"all .12s" }}>
            <span>{eq.emoji}</span>
            <span>{eq.label}</span>
          </button>
        );
      })}
      {isClient && selected.length === 0 && <span style={{ fontSize:11, color:"#bbb", fontStyle:"italic" }}>Standard equipment</span>}
    </div>
  );
}

// ── Block Card ────────────────────────────────────────────────────────────────
function BlockCard({ block, index, onChange, onRemove, isClient, poolLength }) {
  const [showLog,    setShowLog]    = useState(false);
  const [showVideo,  setShowVideo]  = useState(false);
  const [editVideo,  setEditVideo]  = useState(false);
  const [videoInput, setVideoInput] = useState(block.videoUrl || "");

  const disc = DISCIPLINES.find(d => d.key === block.discipline) || DISCIPLINES[0];
  const videoInfo = getVideoEmbed(block.videoUrl);
  const poolM = parseInt(poolLength) || 25;

  function upd(f, v) { onChange({ ...block, [f]: v }); }
  function updLog(f, v) { onChange({ ...block, log: { ...block.log, [f]: v } }); }
  function updInterval(id, f, v) { onChange({ ...block, intervalSets: block.intervalSets.map(s => s.id === id ? { ...s, [f]: v } : s) }); }
  function addInterval() { onChange({ ...block, intervalSets: [...block.intervalSets, { id:uid(), reps:"", interval:"", rest:"" }] }); }
  function removeInterval(id) { if (block.intervalSets.length > 1) onChange({ ...block, intervalSets: block.intervalSets.filter(s => s.id !== id) }); }

  // Calculate total meters for display
  const calcMeters = () => {
    if (block.type === "distance") {
      return (Number(block.reps) || 1) * (Number(block.meters) || 0);
    }
    if (block.type === "interval") {
      const totalReps = block.intervalSets.reduce((a, s) => a + (Number(s.reps) || 0), 0);
      return totalReps * (Number(block.intervalMeters) || 0);
    }
    return 0;
  };
  const meters = calcMeters();
  const lengths = meters > 0 && poolM > 0 ? Math.round(meters / poolM) : 0;

  return (
    <div style={{ background:"#fff", borderRadius:11, border:"1.5px solid " + (block.log && block.log.done ? "#a5d6a7" : "#ebebeb"), marginBottom:10, overflow:"hidden" }}>
      {/* Header row */}
      <div style={{ padding:"10px 14px", borderBottom:"1px solid #f5f5f5", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
        <span style={{ fontSize:12, fontWeight:700, color:"#bbb" }}>{index}.</span>

        {/* Discipline */}
        {isClient ? (
          <span style={{ padding:"3px 9px", borderRadius:7, fontSize:11, fontWeight:700, background:disc.bg, color:disc.color, border:"1.5px solid " + disc.border }}>{disc.label}</span>
        ) : (
          <select value={block.discipline} onChange={e => upd("discipline", e.target.value)}
            style={{ padding:"4px 7px", border:"1.5px solid " + disc.border, borderRadius:7, fontSize:11, fontWeight:700, fontFamily:"inherit", outline:"none", background:disc.bg, color:disc.color, cursor:"pointer" }}>
            {DISCIPLINES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
        )}

        {/* Lung volume */}
        {isClient ? (
          block.lungVolume && block.lungVolume !== "Full" && (
            <span style={{ padding:"3px 9px", borderRadius:7, fontSize:11, fontWeight:700, background:"#e8f0ff", color:"#1a2fa3", border:"1.5px solid #6a7ef4" }}>{block.lungVolume}</span>
          )
        ) : (
          <select value={block.lungVolume || "Full"} onChange={e => upd("lungVolume", e.target.value)}
            style={{ padding:"4px 7px", border:"1.5px solid #e0e0e0", borderRadius:7, fontSize:11, fontWeight:600, fontFamily:"inherit", outline:"none", background:"#fff", color:"#555", cursor:"pointer" }}>
            {["Full","FRC","RV"].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        )}

        {/* Block type toggle (coach only) */}
        {!isClient && (
          <div style={{ display:"flex", gap:4 }}>
            {BLOCK_TYPES.map(bt => (
              <button key={bt.key} onClick={() => upd("type", bt.key)}
                style={{ padding:"3px 9px", borderRadius:6, border:"1.5px solid " + (block.type === bt.key ? "#1a1a1a" : "#e0e0e0"), background: block.type === bt.key ? "#1a1a1a" : "#fff", color: block.type === bt.key ? "#fff" : "#888", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                {bt.label}
              </button>
            ))}
          </div>
        )}

        {isClient && block.type !== "compound" && (
          <span style={{ fontSize:11, fontWeight:600, color:"#555", background:"#f0f0ec",color:"#1a1a1a", padding:"3px 8px", borderRadius:6 }}>
            {BLOCK_TYPES.find(b => b.key === block.type)?.label}
          </span>
        )}

        {meters > 0 && (
          <span style={{ fontSize:11, fontWeight:700, color:"#3a8ef4", marginLeft:4 }}>
            {meters}m {lengths > 0 ? "(" + lengths + " lengths)" : ""}
          </span>
        )}

        <div style={{ flex:1 }} />

        <div style={{ display:"flex", gap:5, alignItems:"center" }}>
          {isClient && (
            <button onClick={() => { updLog("done", !(block.log && block.log.done)); setShowLog(true); }}
              style={{ width:28, height:28, borderRadius:"50%", border:"2px solid " + (block.log && block.log.done ? "#4caf50" : "#e0e0e0"), background: block.log && block.log.done ? "#4caf50" : "transparent", color: block.log && block.log.done ? "#fff" : "#ccc", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s" }}>✓</button>
          )}
          {isClient && (
            <button onClick={() => setShowLog(v => !v)}
              style={{ padding:"4px 9px", borderRadius:6, border:"1.5px solid #e0e0e0", background: showLog ? "#f0f0ec" : "transparent", fontSize:11, fontWeight:600, color:"#666", cursor:"pointer", fontFamily:"inherit" }}>
              {showLog ? "Hide" : "Log"}
            </button>
          )}
          <button onClick={() => { if (isClient && videoInfo) { setShowVideo(v => !v); } else if (!isClient) { setEditVideo(v => !v); } }}
            style={{ padding:"4px 9px", borderRadius:6, border:"1.5px solid " + (block.videoUrl ? "#f4a96a" : "#e0e0e0"), background: (showVideo || editVideo) ? "#fff0e0" : "transparent", fontSize:11, color: block.videoUrl ? "#b85c00" : "#888", cursor:"pointer", fontFamily:"inherit" }}>Video</button>
          {!isClient && (
            <button onClick={onRemove} style={{ padding:"4px 9px", borderRadius:6, border:"1.5px solid #e8c5c5", fontSize:11, cursor:"pointer", color:"#c0392b", fontFamily:"inherit" }}>x</button>
          )}
        </div>
      </div>

      {/* Block body */}
      <div style={{ padding:"10px 14px" }}>

        {/* DISTANCE type */}
        {block.type === "distance" && (
          <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8 }}>
            {isClient ? (
              <span style={{ fontWeight:700, fontSize:15 }}>
                {block.reps && block.reps !== "1" ? block.reps + " x " : ""}{block.meters || "?"}m
              </span>
            ) : (
              <>
                <input type="number" placeholder="Reps" value={block.reps} onChange={e => upd("reps", e.target.value)}
                  style={{ width:54, padding:"5px 7px", border:"1.5px solid #e0e0e0", borderRadius:6, fontSize:13, fontFamily:"inherit", outline:"none", color:"#1a1a1a", textAlign:"center" }} />
                <span style={{ color:"#bbb" }}>x</span>
                <input type="number" placeholder="Meters" value={block.meters} onChange={e => upd("meters", e.target.value)}
                  style={{ width:74, padding:"5px 7px", border:"1.5px solid #e0e0e0", borderRadius:6, fontSize:13, fontFamily:"inherit", outline:"none", color:"#1a1a1a", textAlign:"center" }} />
                <span style={{ color:"#aaa", fontSize:12 }}>m</span>
              </>
            )}
          </div>
        )}

        {/* INTERVAL type */}
        {block.type === "interval" && (
          <div style={{ marginBottom:8 }}>
            <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#bbb", letterSpacing:".05em", textTransform:"uppercase" }}>Meters per rep</div>
              {isClient ? (
                <span style={{ fontWeight:700, fontSize:14 }}>{block.intervalMeters || "?"}m</span>
              ) : (
                <input type="number" placeholder="e.g. 25" value={block.intervalMeters} onChange={e => upd("intervalMeters", e.target.value)}
                  style={{ width:74, padding:"5px 7px", border:"1.5px solid #e0e0e0", borderRadius:6, fontSize:13, fontFamily:"inherit", outline:"none", color:"#1a1a1a", textAlign:"center" }} />
              )}
            </div>
            <div style={{ background:"#f8f8f6",color:"#1a1a1a", borderRadius:8, padding:"8px 10px" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#bbb", letterSpacing:".06em", textTransform:"uppercase", marginBottom:8 }}>Interval Sets</div>
              {/* Headers */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 28px", gap:6, marginBottom:6 }}>
                {["REPS","INTERVAL","REST",""].map((h,i) => (
                  <div key={i} style={{ fontSize:9, fontWeight:800, color:"#ccc", letterSpacing:".06em", textTransform:"uppercase", textAlign:"center" }}>{h}</div>
                ))}
              </div>
              {block.intervalSets.map((s, si) => (
                <div key={s.id} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 28px", gap:6, marginBottom:5 }}>
                  {isClient ? (
                    <>
                      <div style={{ textAlign:"center", fontWeight:600, fontSize:13 }}>{s.reps}</div>
                      <div style={{ textAlign:"center", fontWeight:600, fontSize:13 }}>{s.interval}</div>
                      <div style={{ textAlign:"center", fontWeight:600, fontSize:13 }}>{s.rest}</div>
                      <div />
                    </>
                  ) : (
                    <>
                      <input type="number" placeholder="4" value={s.reps} onChange={e => updInterval(s.id, "reps", e.target.value)}
                        style={{ padding:"4px 6px", border:"1.5px solid #e0e0e0", borderRadius:5, fontSize:12, fontFamily:"inherit", outline:"none", color:"#1a1a1a", textAlign:"center" }} />
                      <input placeholder="60s" value={s.interval} onChange={e => updInterval(s.id, "interval", e.target.value)}
                        style={{ padding:"4px 6px", border:"1.5px solid #e0e0e0", borderRadius:5, fontSize:12, fontFamily:"inherit", outline:"none", color:"#1a1a1a", textAlign:"center" }} />
                      <input placeholder="30s" value={s.rest} onChange={e => updInterval(s.id, "rest", e.target.value)}
                        style={{ padding:"4px 6px", border:"1.5px solid #e0e0e0", borderRadius:5, fontSize:12, fontFamily:"inherit", outline:"none", color:"#1a1a1a", textAlign:"center" }} />
                      <button onClick={() => removeInterval(s.id)}
                        style={{ background:"transparent",color:"#1a1a1a", border:"none", fontSize:14, color:"#ddd", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>x</button>
                    </>
                  )}
                </div>
              ))}
              {!isClient && (
                <button onClick={addInterval}
                  style={{ background:"transparent",color:"#1a1a1a", border:"1.5px dashed #ddd", borderRadius:6, padding:"4px", fontSize:11, color:"#aaa", cursor:"pointer", fontFamily:"inherit", width:"100%", marginTop:4 }}>
                  + Add interval set
                </button>
              )}
            </div>
            {isClient && block.intervalSets.length > 0 && (
              <div style={{ marginTop:6, fontSize:12, color:"#555", fontWeight:500 }}>
                {block.intervalSets.map((s, i) => s.reps ? s.reps + "x" + (block.intervalMeters || "?") + "m @ " + (s.interval || "?") + (s.rest ? " / " + s.rest + " rest" : "") : null).filter(Boolean).join("  ·  ")}
              </div>
            )}
          </div>
        )}

        {/* OVER/UNDER type */}
        {block.type === "overunder" && (
          <div style={{ marginBottom:8 }}>
            <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:10, flexWrap:"wrap" }}>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <span style={{ fontSize:11, color:"#bbb", fontWeight:700 }}>ROUNDS</span>
                {isClient ? <span style={{ fontWeight:700, fontSize:14 }}>{block.reps || "?"}</span>
                  : <input type="number" placeholder="4" value={block.reps} onChange={e => upd("reps", e.target.value)}
                      style={{ width:52, padding:"5px 7px", border:"1.5px solid #e0e0e0", borderRadius:6, fontSize:13, fontFamily:"inherit", outline:"none", color:"#1a1a1a", textAlign:"center" }} />}
              </div>
              <span style={{ color:"#bbb" }}>×</span>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <span style={{ fontSize:11, color:"#bbb", fontWeight:700 }}>METERS UNDER</span>
                {isClient ? <span style={{ fontWeight:700, fontSize:14 }}>{block.meters || "?"}m</span>
                  : <input type="number" placeholder="25" value={block.meters} onChange={e => upd("meters", e.target.value)}
                      style={{ width:64, padding:"5px 7px", border:"1.5px solid #e0e0e0", borderRadius:6, fontSize:13, fontFamily:"inherit", outline:"none", color:"#1a1a1a", textAlign:"center" }} />}
              </div>
            </div>
            <div style={{ background:"#e8f0ff", border:"1px solid #b3c5f7", borderRadius:8, padding:"10px 12px", fontSize:13, color:"#1a2fa3", lineHeight:1.5 }}>
              {isClient
                ? (block.reps && block.meters ? block.reps + " rounds: " + block.meters + "m underwater + " + block.meters + "m surface, alternating" : "Over/Under set")
                : <textarea value={block.compoundText} onChange={e => upd("compoundText", e.target.value)}
                    placeholder="Describe the over/under pattern... e.g. 25m freestyle surface, 25m DYNB underwater. Repeat x4."
                    style={{ width:"100%", padding:"0", border:"none", outline:"none", fontSize:13, fontFamily:"inherit", resize:"vertical", minHeight:52, color:"#1a2fa3", background:"transparent", lineHeight:1.6 }} />
              }
            </div>
          </div>
        )}

        {/* COMPOUND type */}
        {block.type === "compound" && (
          <div style={{ marginBottom:8 }}>
            {isClient ? (
              <div style={{ fontSize:14, color:"#333", lineHeight:1.7, whiteSpace:"pre-wrap" }}>{block.compoundText || "—"}</div>
            ) : (
              <textarea value={block.compoundText} onChange={e => upd("compoundText", e.target.value)}
                placeholder={"Write the full set description...\ne.g. 100m over/under: 25m freestyle breathing normally, 25m DYNB, repeat x2. Rest 2min between rounds."}
                style={{ width:"100%", padding:"8px 0", border:"none", outline:"none", fontSize:14, fontFamily:"inherit", resize:"vertical", minHeight:72, color:"#333", background:"transparent",color:"#1a1a1a", lineHeight:1.7 }} />
            )}
          </div>
        )}

        {/* Description / technique notes */}
        {(block.type === "distance" || block.type === "interval") && (
          <div style={{ marginBottom:8 }}>
            {isClient ? (
              block.description && <div style={{ fontSize:13, color:"#555", lineHeight:1.65, whiteSpace:"pre-wrap", borderTop:"1px solid #f5f5f5", paddingTop:6 }}>{block.description}</div>
            ) : (
              <textarea value={block.description} onChange={e => upd("description", e.target.value)}
                placeholder="Additional notes — technique cues, breathing pattern, intensity..."
                style={{ width:"100%", padding:"6px 0", border:"none", borderTop:"1px solid #f5f5f5", outline:"none", fontSize:13, fontFamily:"inherit", resize:"vertical", minHeight:48, color:"#555", background:"transparent",color:"#1a1a1a", lineHeight:1.6 }} />
            )}
          </div>
        )}

        {/* Per-block equipment override */}
        <div style={{ marginBottom:4 }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#ccc", letterSpacing:".06em", textTransform:"uppercase", marginBottom:5 }}>Equipment for this block</div>
          <EquipmentPicker selected={block.equipment} onChange={v => upd("equipment", v)} isClient={isClient} mini />
        </div>
      </div>

      {/* Video edit */}
      {!isClient && editVideo && (
        <div style={{ padding:"8px 14px", borderTop:"1px solid #f5f5f5", background:"#fffaf5" }}>
          <div style={{ display:"flex", gap:7 }}>
            <input value={videoInput} onChange={e => setVideoInput(e.target.value)}
              placeholder="YouTube or Vimeo URL..."
              style={{ flex:1, padding:"6px 10px", border:"1.5px solid #f4a96a", borderRadius:6, fontSize:12, fontFamily:"inherit", outline:"none", color:"#1a1a1a" }} />
            <button onClick={() => { upd("videoUrl", videoInput); setEditVideo(false); }}
              style={{ background:"#f4803a", color:"#fff", border:"none", borderRadius:6, padding:"6px 12px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Save</button>
            {block.videoUrl && <button onClick={() => { setVideoInput(""); upd("videoUrl", ""); setEditVideo(false); }}
              style={{ background:"transparent",color:"#1a1a1a", border:"1.5px solid #e8c5c5", borderRadius:6, padding:"6px 9px", fontSize:12, cursor:"pointer", color:"#c0392b", fontFamily:"inherit" }}>Remove</button>}
          </div>
        </div>
      )}

      {/* Video view */}
      {isClient && block.videoUrl && showVideo && (
        <div style={{ padding:"8px 14px", borderTop:"1px solid #f5f5f5" }}>
          {videoInfo && (videoInfo.type === "youtube" || videoInfo.type === "vimeo") && (
            <div style={{ borderRadius:8, overflow:"hidden", aspectRatio:"16/9" }}>
              <iframe src={videoInfo.embed} style={{ width:"100%", height:"100%", border:"none" }} allowFullScreen title="Video" />
            </div>
          )}
        </div>
      )}
      {isClient && block.videoUrl && !showVideo && (
        <div style={{ padding:"5px 14px", borderTop:"1px solid #f5f5f5" }}>
          <button onClick={() => setShowVideo(true)} style={{ background:"#fff5ee", border:"1px solid #f4a96a", borderRadius:6, padding:"4px 10px", fontSize:11, fontWeight:600, color:"#b85c00", cursor:"pointer", fontFamily:"inherit" }}>Watch video</button>
        </div>
      )}

      {/* Client log */}
      {isClient && showLog && (
        <div style={{ padding:"10px 14px", background:"#fafaf8",color:"#1a1a1a", borderTop:"1px solid #f5f5f5" }}>
          <div style={{ fontSize:10, fontWeight:800, letterSpacing:".07em", textTransform:"uppercase", color:"#aaa", marginBottom:8 }}>Your Log</div>
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:12, fontWeight:600, color:"#555", marginBottom:4 }}>How did it feel?</div>
            <input value={(block.log && block.log.feeling) || ""} onChange={e => updLog("feeling", e.target.value)}
              placeholder="Relaxed / hard / lost rhythm / felt strong..."
              style={{ width:"100%", padding:"7px 10px", border:"1.5px solid #a5d6a7", borderRadius:6, fontSize:13, fontFamily:"inherit", outline:"none", color:"#1a1a1a", background:"#f1f8f1" }} />
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:"#555", marginBottom:4 }}>Observations</div>
            <textarea value={(block.log && block.log.observations) || ""} onChange={e => updLog("observations", e.target.value)}
              placeholder="What were you struggling with? Any technique notes..."
              style={{ width:"100%", padding:"7px 10px", border:"1.5px solid #a5d6a7", borderRadius:6, fontSize:13, fontFamily:"inherit", outline:"none", resize:"vertical", minHeight:52, color:"#1a1a1a", background:"#f1f8f1" }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ section, onChange, onRemove, isClient, poolLength }) {
  function updateBlock(id, updated) { onChange({ ...section, blocks: section.blocks.map(b => b.id === id ? updated : b) }); }
  function removeBlock(id) { onChange({ ...section, blocks: section.blocks.filter(b => b.id !== id) }); }
  function addBlock(type) { onChange({ ...section, blocks: [...section.blocks, makeBlock(type)] }); }

  const doneCount  = section.blocks.filter(b => b.log && b.log.done).length;
  const totalCount = section.blocks.length;

  return (
    <div style={{ marginBottom:22 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
        {isClient ? (
          <div style={{ fontWeight:700, fontSize:12, color:"#888", letterSpacing:".06em", textTransform:"uppercase" }}>{section.name}</div>
        ) : (
          <input value={section.name} onChange={e => onChange({ ...section, name: e.target.value })}
            style={{ fontWeight:700, fontSize:12, color:"#888", letterSpacing:".06em", textTransform:"uppercase", border:"none", outline:"none", fontFamily:"inherit", background:"transparent",color:"#1a1a1a", flex:1 }}
            placeholder="Section name..." />
        )}
        {isClient && totalCount > 0 && <span style={{ fontSize:11, color:"#4caf50", fontWeight:600 }}>{doneCount}/{totalCount}</span>}
        <div style={{ flex:1, height:1, background:"#ebebeb" }} />
        {!isClient && <button onClick={onRemove} style={{ background:"none", border:"none", fontSize:11, color:"#ccc", cursor:"pointer" }}>Remove</button>}
      </div>

      {section.blocks.map((b, i) => (
        <BlockCard key={b.id} block={b} index={i + 1} isClient={isClient} poolLength={poolLength}
          onChange={updated => updateBlock(b.id, updated)}
          onRemove={() => removeBlock(b.id)} />
      ))}

      {section.blocks.length === 0 && !isClient && (
        <div style={{ background:"#fafaf8",color:"#1a1a1a", border:"1.5px dashed #e0e0e0", borderRadius:10, padding:"16px", textAlign:"center", color:"#ccc", fontSize:12, marginBottom:8 }}>
          No blocks yet
        </div>
      )}

      {!isClient && (
        <div style={{ display:"flex", gap:7, marginTop:6 }}>
          {BLOCK_TYPES.map(bt => (
            <button key={bt.key} onClick={() => addBlock(bt.key)}
              style={{ flex:1, padding:"8px", borderRadius:8, border:"1.5px dashed #ddd", background:"#fafaf8",color:"#1a1a1a", color:"#888", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#555"; e.currentTarget.style.color = "#555"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#ddd"; e.currentTarget.style.color = "#888"; }}>
              + {bt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Pool Builder ─────────────────────────────────────────────────────────
export default function PoolBuilder({ initialData, onSave, isClient }) {
  const [sessionName, setSessionName] = useState((initialData && initialData.sessionName) || "");
  const [discipline,  setDiscipline]  = useState((initialData && initialData.discipline)  || "DYN");
  const [poolLength,  setPoolLength]  = useState((initialData && initialData.poolLength)  || "25m");
  const [equipment,   setEquipment]   = useState((initialData && initialData.equipment)   || []);
  const [coachNotes,  setCoachNotes]  = useState((initialData && initialData.coachNotes)  || "");
  const [sections,    setSections]    = useState((initialData && initialData.sections) || [
    makeSection("Warm-up"),
    makeSection("Main Set"),
    makeSection("Cool-down"),
  ]);
  const [clientNotes, setClientNotes] = useState((initialData && initialData.clientNotes) || "");
  const [rating,      setRating]      = useState((initialData && initialData.rating)      || null);
  const [saving,      setSaving]      = useState(false);

  function updateSection(id, updated) { setSections(prev => prev.map(s => s.id === id ? updated : s)); }
  function removeSection(id) { setSections(prev => prev.filter(s => s.id !== id)); }
  function addSection() { setSections(prev => [...prev, makeSection("New Section")]); }

  const totalBlocks = sections.reduce((a, s) => a + s.blocks.length, 0);
  const doneBlocks  = sections.reduce((a, s) => a + s.blocks.filter(b => b.log && b.log.done).length, 0);
  const totalMeters = sections.reduce((a, s) => a + s.blocks.reduce((b, bl) => {
    if (bl.type === "distance") return b + (Number(bl.reps) || 1) * (Number(bl.meters) || 0);
    if (bl.type === "interval") return b + bl.intervalSets.reduce((c, is) => c + (Number(is.reps) || 0), 0) * (Number(bl.intervalMeters) || 0);
    return b;
  }, 0), 0);
  const progress = totalBlocks > 0 ? Math.round((doneBlocks / totalBlocks) * 100) : 0;
  const poolM = parseInt(poolLength) || 25;
  const totalLengths = totalMeters > 0 ? Math.round(totalMeters / poolM) : 0;

  const mainDisc = DISCIPLINES.find(d => d.key === discipline) || DISCIPLINES[0];

  async function handleSave() {
    setSaving(true);
    await onSave({ sessionName, discipline, poolLength, equipment, coachNotes, sections, clientNotes, rating, totalMeters });
    setSaving(false);
  }

  return (
    <div style={{ fontFamily:"'DM Sans','Helvetica Neue',sans-serif", color:"#1a1a1a" }}>

      {/* Discipline + pool length */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:12, marginBottom:14 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:"#bbb", letterSpacing:".07em", textTransform:"uppercase", marginBottom:8 }}>Discipline</div>
          {isClient ? (
            <div style={{ display:"inline-flex", alignItems:"center", padding:"7px 14px", borderRadius:9, fontSize:13, fontWeight:700, background:mainDisc.bg, color:mainDisc.color, border:"2px solid " + mainDisc.border }}>
              {mainDisc.label}
            </div>
          ) : (
            <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
              {DISCIPLINES.map(d => {
                const sel = discipline === d.key;
                return (
                  <button key={d.key} onClick={() => setDiscipline(d.key)}
                    style={{ padding:"7px 14px", borderRadius:9, border:"2px solid " + (sel ? d.border : "#e0e0e0"), background: sel ? d.bg : "#fff", color: sel ? d.color : "#aaa", fontWeight: sel ? 700 : 500, fontSize:13, cursor:"pointer", fontFamily:"inherit", transition:"all .12s" }}>
                    {d.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:"#bbb", letterSpacing:".07em", textTransform:"uppercase", marginBottom:8 }}>Pool</div>
          {isClient ? (
            <div style={{ fontWeight:700, fontSize:14, color:"#1a1a1a" }}>{poolLength}</div>
          ) : (
            <select value={poolLength} onChange={e => setPoolLength(e.target.value)}
              style={{ padding:"7px 10px", border:"1.5px solid #e0e0e0", borderRadius:9, fontSize:13, fontFamily:"inherit", outline:"none", background:"#fff", color:"#1a1a1a", cursor:"pointer" }}>
              {POOL_LENGTHS.map(l => <option key={l} value={l}>{l} pool</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Session name */}
      <div style={{ marginBottom:14 }}>
        {isClient ? (
          <div style={{ fontWeight:700, fontSize:17 }}>{sessionName || "Pool Training Session"}</div>
        ) : (
          <input value={sessionName} onChange={e => setSessionName(e.target.value)}
            style={{ fontWeight:700, fontSize:17, border:"none", borderBottom:"2px solid #f0f0f0", outline:"none", fontFamily:"inherit", color:"#1a1a1a", background:"transparent",color:"#1a1a1a", width:"100%", paddingBottom:6 }}
            placeholder="Session name (e.g. DYN Hypercapnic Block)..." />
        )}
        <div style={{ fontSize:12, color:"#aaa", marginTop:5, display:"flex", gap:16, flexWrap:"wrap" }}>
          <span>{totalBlocks} block{totalBlocks !== 1 ? "s" : ""}</span>
          {totalMeters > 0 && <span style={{ fontWeight:600, color:"#555" }}>{totalMeters}m · {totalLengths} lengths</span>}
          {isClient && totalBlocks > 0 && <span style={{ color:"#4caf50", fontWeight:600 }}>{doneBlocks}/{totalBlocks} done · {progress}%</span>}
        </div>
      </div>

      {/* Progress bar */}
      {isClient && totalBlocks > 0 && (
        <div style={{ height:5, background:"#f0f0f0",color:"#1a1a1a", borderRadius:3, marginBottom:16, overflow:"hidden" }}>
          <div style={{ height:"100%", width:progress + "%", background:"#4caf50", borderRadius:3, transition:"width .3s" }} />
        </div>
      )}

      {/* Session equipment */}
      <div style={{ background:"#f8f8f6",color:"#1a1a1a", borderRadius:10, padding:"12px 14px", marginBottom:14 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#bbb", letterSpacing:".07em", textTransform:"uppercase", marginBottom:8 }}>Session Equipment</div>
        <EquipmentPicker selected={equipment} onChange={setEquipment} isClient={isClient} />
      </div>

      {/* Coach notes */}
      {isClient && coachNotes && (
        <div style={{ background:"#fffbe6", border:"1px solid #ffe082", borderRadius:10, padding:"11px 14px", marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:800, letterSpacing:".08em", textTransform:"uppercase", color:"#a07a00", marginBottom:4 }}>Coach Notes</div>
          <div style={{ fontSize:13, color:"#5a4800", lineHeight:1.7 }}>{coachNotes}</div>
        </div>
      )}
      {!isClient && (
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#bbb", letterSpacing:".07em", textTransform:"uppercase", marginBottom:6 }}>Session Notes</div>
          <textarea value={coachNotes} onChange={e => setCoachNotes(e.target.value)}
            placeholder="Overall session goal, intensity notes, safety reminders..."
            style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #e0e0e0", borderRadius:8, fontSize:13, fontFamily:"inherit", outline:"none", resize:"vertical", minHeight:52, color:"#1a1a1a" }} />
        </div>
      )}

      {/* Sections */}
      {sections.map(s => (
        <Section key={s.id} section={s} isClient={isClient} poolLength={poolLength}
          onChange={updated => updateSection(s.id, updated)}
          onRemove={() => removeSection(s.id)} />
      ))}

      {!isClient && (
        <button onClick={addSection}
          style={{ background:"transparent",color:"#1a1a1a", border:"1.5px dashed #ddd", borderRadius:10, padding:"10px", fontSize:12, fontWeight:600, color:"#aaa", cursor:"pointer", fontFamily:"inherit", width:"100%", marginBottom:14 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#555"; e.currentTarget.style.color = "#555"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#ddd"; e.currentTarget.style.color = "#aaa"; }}>
          + Add Section
        </button>
      )}

      {/* Client rating */}
      {isClient && (
        <>
          <div style={{ background:"#f8f8f6",color:"#1a1a1a", borderRadius:10, padding:"14px", textAlign:"center" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#aaa", letterSpacing:".06em", textTransform:"uppercase", marginBottom:10 }}>Rate this session</div>
            <div style={{ display:"flex", justifyContent:"center", gap:8 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setRating(n)}
                  style={{ fontSize:22, background:"none", border:"none", cursor:"pointer", opacity: rating && rating < n ? 0.25 : 1, transition:"all .15s" }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.2)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>⭐</button>
              ))}
            </div>
            {rating && <div style={{ fontSize:11, color:"#888", marginTop:6 }}>{rating}/5 stars</div>}
          </div>
          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:12, fontWeight:600, color:"#555", marginBottom:5 }}>General notes for your coach</div>
            <textarea value={clientNotes} onChange={e => setClientNotes(e.target.value)}
              placeholder="How did the session go? Energy levels, breathing, technique..."
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
