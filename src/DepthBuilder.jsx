import { useState } from "react";

const DISCIPLINES = [
  { key:"CWT",   label:"CWT",   color:"#1a2fa3", bg:"#e8f0ff", border:"#6a7ef4" },
  { key:"CWTB",  label:"Bi-Fins",color:"#005fa3", bg:"#e6f4ff", border:"#6ab0f4" },
  { key:"CNF",   label:"CNF",   color:"#2d7a2d", bg:"#edf6e6", border:"#7ec87e" },
  { key:"FIM",   label:"FIM",   color:"#7a6200", bg:"#fffbe6", border:"#e8cc4d" },
  { key:"MONO",  label:"Monofin",color:"#8b1f7a",bg:"#fdf0fb", border:"#d97ec8" },
  { key:"DRILL", label:"Drill", color:"#555",    bg:"#f5f4f0", border:"#ccc"    },
];

const LUNG_VOLUMES = ["Full", "FRC", "RV"];

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function makeDive() {
  return {
    id: uid(),
    discipline: "CWT",
    lungVolume: "Full",
    targetDepth: "",
    openLine: false,
    openLineMax: "",
    drillNotes: "",
    coachNotes: "",
    hang: "",          // hang duration in seconds
    // athlete log
    log: {
      status: null,        // "completed" | "early-turn" | "missed"
      actualDepth: "",
      turnDepth: "",
      diveTime: "",
      reason: "",
    },
  };
}

function getDiscipline(key) {
  return DISCIPLINES.find(d => d.key === key) || DISCIPLINES[0];
}

// ── Energy scale ──────────────────────────────────────────────────────────────
function EnergyScale({ value, onChange, label, isClient }) {
  const levels = [
    { n:1, label:"Very tired",    emoji:"😴" },
    { n:2, label:"Tired",         emoji:"😪" },
    { n:3, label:"Ok",            emoji:"😐" },
    { n:4, label:"Good",          emoji:"🙂" },
    { n:5, label:"Fully charged", emoji:"⚡" },
  ];
  return (
    <div style={{ background:"#f8f8f6", borderRadius:10, padding:"14px 16px" }}>
      <div style={{ fontSize:11, fontWeight:700, color:"#bbb", letterSpacing:".07em", textTransform:"uppercase", marginBottom:10 }}>{label}</div>
      <div style={{ display:"flex", gap:8 }}>
        {levels.map(l => {
          const sel = value === l.n;
          return (
            <button key={l.n} onClick={() => { if (!isClient) return; onChange(l.n); }}
              title={l.label}
              style={{ flex:1, padding:"10px 4px", borderRadius:9, border:"2px solid " + (sel ? "#1a1a1a" : "#e0e0e0"), background: sel ? "#1a1a1a" : "#fff", cursor: isClient ? "pointer" : "default", fontFamily:"inherit", display:"flex", flexDirection:"column", alignItems:"center", gap:4, transition:"all .15s" }}>
              <span style={{ fontSize:20 }}>{l.emoji}</span>
              <span style={{ fontSize:10, fontWeight:700, color: sel ? "#fff" : "#aaa" }}>{l.n}</span>
            </button>
          );
        })}
      </div>
      {value && <div style={{ fontSize:12, color:"#555", marginTop:8, textAlign:"center", fontWeight:500 }}>{levels.find(l => l.n === value)?.label}</div>}
    </div>
  );
}

// ── Single Dive Row (coach plan) ──────────────────────────────────────────────
function DivePlanRow({ dive, index, onChange, onRemove }) {
  const disc = getDiscipline(dive.discipline);
  const isDrill = dive.discipline === "DRILL";

  function upd(f, v) { onChange({ ...dive, [f]: v }); }

  return (
    <div style={{ background:"#fff", borderRadius:11, border:"1.5px solid #ebebeb", marginBottom:10, overflow:"hidden" }}>
      <div style={{ padding:"12px 16px", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
        {/* Index */}
        <span style={{ fontSize:13, fontWeight:700, color:"#bbb", flexShrink:0 }}>#{index}</span>

        {/* Discipline */}
        <select value={dive.discipline} onChange={e => upd("discipline", e.target.value)}
          style={{ padding:"5px 8px", border:"1.5px solid " + disc.border, borderRadius:8, fontSize:12, fontWeight:700, fontFamily:"inherit", outline:"none", background:disc.bg, color:disc.color, cursor:"pointer" }}>
          {DISCIPLINES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
        </select>

        {/* Lung volume */}
        <select value={dive.lungVolume} onChange={e => upd("lungVolume", e.target.value)}
          style={{ padding:"5px 8px", border:"1.5px solid #e0e0e0", borderRadius:8, fontSize:12, fontWeight:600, fontFamily:"inherit", outline:"none", background:"#f8f8f6", color:"#555", cursor:"pointer" }}>
          {LUNG_VOLUMES.map(v => <option key={v} value={v}>{v}</option>)}
        </select>

        {/* Open line toggle */}
        <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:12, fontWeight:500, color:"#555", flexShrink:0 }}>
          <input type="checkbox" checked={dive.openLine} onChange={e => upd("openLine", e.target.checked)}
            style={{ width:15, height:15, accentColor:"#3a4df4", cursor:"pointer" }} />
          Open line
        </label>

        {/* Target depth or open line max */}
        {(
          dive.openLine ? (
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:11, color:"#bbb", fontWeight:700 }}>MAX</span>
              <input type="number" placeholder="e.g. 40" value={dive.openLineMax} onChange={e => upd("openLineMax", e.target.value)}
                style={{ width:60, padding:"5px 7px", border:"1.5px solid #6a7ef4", borderRadius:7, fontSize:13, fontFamily:"inherit", outline:"none", color:"#1a1a1a", textAlign:"center", background:"#fff" }} />
              <span style={{ fontSize:11, color:"#aaa" }}>m</span>
            </div>
          ) : (
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:11, color:"#bbb", fontWeight:700 }}>TARGET</span>
              <input type="number" placeholder="e.g. 60" value={dive.targetDepth} onChange={e => upd("targetDepth", e.target.value)}
                style={{ width:64, padding:"5px 7px", border:"1.5px solid #e0e0e0", borderRadius:7, fontSize:13, fontFamily:"inherit", outline:"none", color:"#1a1a1a", textAlign:"center", background:"#fff" }} />
              <span style={{ fontSize:11, color:"#aaa" }}>m</span>
            </div>
          )
        )}

        {/* Hang */}
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:11, color:"#bbb", fontWeight:700 }}>HANG</span>
          <input type="number" placeholder="—" value={dive.hang || ""} onChange={e => upd("hang", e.target.value)}
            style={{ width:48, padding:"5px 7px", border:"1.5px solid #e8cc4d", borderRadius:7, fontSize:13, fontFamily:"inherit", outline:"none", color:"#7a6200", textAlign:"center", background:"#fffbe6" }} />
          <span style={{ fontSize:11, color:"#aaa" }}>s</span>
        </div>

        <div style={{ flex:1 }} />
        <button onClick={onRemove} style={{ padding:"5px 9px", borderRadius:7, border:"1.5px solid #e8c5c5", background:"transparent", fontSize:11, cursor:"pointer", color:"#c0392b", fontFamily:"inherit" }}>x</button>
      </div>

      {/* Drill notes */}
      {isDrill && (
        <div style={{ padding:"0 16px 12px" }}>
          <textarea value={dive.drillNotes} onChange={e => upd("drillNotes", e.target.value)}
            placeholder="Describe the drill — what to focus on, technique cues, depth range..."
            style={{ width:"100%", padding:"8px 10px", border:"1.5px solid #e0e0e0", borderRadius:7, fontSize:13, fontFamily:"inherit", outline:"none", resize:"vertical", minHeight:60, color:"#1a1a1a", background:"#fff" }} />
        </div>
      )}

      {/* Coach notes per dive */}
      <div style={{ padding:"0 16px 12px" }}>
        <textarea value={dive.coachNotes} onChange={e => upd("coachNotes", e.target.value)}
          placeholder="Coach notes for this dive (mental cues, equalization reminders, safety...)..."
          style={{ width:"100%", padding:"7px 10px", border:"none", borderTop:"1px solid #f5f5f5", outline:"none", fontSize:12, fontFamily:"inherit", resize:"vertical", minHeight:44, color:"#555", background:"transparent" }} />
      </div>
    </div>
  );
}

// ── Athlete Table View ────────────────────────────────────────────────────────
function AthleteTable({ dives, onChange }) {
  function updLog(id, f, v) {
    onChange(dives.map(d => d.id === id ? { ...d, log: { ...d.log, [f]: v } } : d));
  }

  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
        <thead>
          <tr style={{ borderBottom:"2px solid #f0f0f0" }}>
            {["#","Disc","Lung","Target","Status","Depth","Turn","Time",""].map((h,i) => (
              <th key={i} style={{ padding:"8px 10px", textAlign:"left", fontSize:10, fontWeight:800, color:"#bbb", letterSpacing:".07em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dives.map((dive, i) => {
            const disc = getDiscipline(dive.discipline);
            const log = dive.log || {};
            const isCompleted = log.status === "completed";
            const isEarlyTurn = log.status === "early-turn";
            const isMissed    = log.status === "missed";

            return (
              <tr key={dive.id} style={{ borderBottom:"1px solid #f5f5f5", background: isCompleted ? "#f8fdf8" : isMissed ? "#fff8f8" : "transparent" }}>
                {/* Index */}
                <td style={{ padding:"10px 10px", fontWeight:700, color:"#aaa", fontSize:12 }}>#{i+1}</td>

                {/* Discipline */}
                <td style={{ padding:"10px 6px" }}>
                  <span style={{ display:"inline-flex", alignItems:"center", padding:"3px 8px", borderRadius:6, fontSize:11, fontWeight:700, background:disc.bg, color:disc.color, border:"1px solid " + disc.border, whiteSpace:"nowrap" }}>
                    {disc.label}
                  </span>
                  {dive.lungVolume !== "Full" && (
                    <div style={{ fontSize:10, color:"#aaa", fontWeight:600, marginTop:2 }}>{dive.lungVolume}</div>
                  )}
                </td>

                {/* Lung */}
                <td style={{ padding:"10px 6px", fontSize:12, color:"#555", fontWeight:500 }}>{dive.lungVolume}</td>

                {/* Target */}
                <td style={{ padding:"10px 6px", fontWeight:700, fontSize:13, color:"#1a2fa3", whiteSpace:"nowrap" }}>
                  {dive.openLine
                    ? <span style={{ fontSize:11, color:"#888" }}>Open {dive.openLineMax ? "(max " + dive.openLineMax + "m)" : ""}</span>
                    : dive.targetDepth ? dive.targetDepth + "m" : <span style={{ color:"#ddd" }}>—</span>}
                </td>

                {/* Status buttons */}
                <td style={{ padding:"10px 6px" }}>
                  <div style={{ display:"flex", gap:4 }}>
                    <button onClick={() => updLog(dive.id, "status", log.status === "completed" ? null : "completed")}
                      title="Completed" style={{ width:26, height:26, borderRadius:"50%", border:"2px solid " + (isCompleted ? "#4caf50" : "#e0e0e0"), background: isCompleted ? "#4caf50" : "transparent", color: isCompleted ? "#fff" : "#ccc", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s" }}>✓</button>
                    <button onClick={() => updLog(dive.id, "status", log.status === "early-turn" ? null : "early-turn")}
                      title="Early turn" style={{ width:26, height:26, borderRadius:"50%", border:"2px solid " + (isEarlyTurn ? "#ff9800" : "#e0e0e0"), background: isEarlyTurn ? "#ff9800" : "transparent", color: isEarlyTurn ? "#fff" : "#ccc", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, transition:"all .15s" }}>↩</button>
                    <button onClick={() => updLog(dive.id, "status", log.status === "missed" ? null : "missed")}
                      title="Missed / DNF" style={{ width:26, height:26, borderRadius:"50%", border:"2px solid " + (isMissed ? "#ef5350" : "#e0e0e0"), background: isMissed ? "#ef5350" : "transparent", color: isMissed ? "#fff" : "#ccc", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s" }}>✗</button>
                  </div>
                </td>

                {/* Actual depth (for completed or early turn) */}
                <td style={{ padding:"10px 6px" }}>
                  {(isCompleted || isEarlyTurn) && (
                    <input type="number" placeholder={dive.targetDepth || "m"} value={log.actualDepth || ""}
                      onChange={e => updLog(dive.id, "actualDepth", e.target.value)}
                      style={{ width:56, padding:"4px 6px", border:"1.5px solid #a5d6a7", borderRadius:6, fontSize:12, fontFamily:"inherit", outline:"none", color:"#2e7d32", textAlign:"center", background:"#f1f8f1" }} />
                  )}
                  {isMissed && <span style={{ color:"#ddd", fontSize:12 }}>—</span>}
                  {!log.status && <span style={{ color:"#ddd", fontSize:12 }}>—</span>}
                </td>

                {/* Turn depth (for early turn) */}
                <td style={{ padding:"10px 6px" }}>
                  {isEarlyTurn && (
                    <input type="number" placeholder="m" value={log.turnDepth || ""}
                      onChange={e => updLog(dive.id, "turnDepth", e.target.value)}
                      style={{ width:52, padding:"4px 6px", border:"1.5px solid #ffe082", borderRadius:6, fontSize:12, fontFamily:"inherit", outline:"none", color:"#e65100", textAlign:"center", background:"#fff8e1" }} />
                  )}
                  {!isEarlyTurn && <span style={{ color:"#ddd", fontSize:12 }}>—</span>}
                </td>

                {/* Dive time */}
                <td style={{ padding:"10px 6px" }}>
                  {log.status && (
                    <input placeholder="m:ss" value={log.diveTime || ""}
                      onChange={e => updLog(dive.id, "diveTime", e.target.value)}
                      style={{ width:56, padding:"4px 6px", border:"1.5px solid #b3c5f7", borderRadius:6, fontSize:12, fontFamily:"inherit", outline:"none", color:"#1a2fa3", textAlign:"center", background:"#e8f0ff" }} />
                  )}
                  {!log.status && <span style={{ color:"#ddd", fontSize:12 }}>—</span>}
                </td>

                {/* Reason for missed / early turn */}
                <td style={{ padding:"10px 6px", minWidth:120 }}>
                  {(isMissed || isEarlyTurn) && (
                    <input placeholder="Reason / notes" value={log.reason || ""}
                      onChange={e => updLog(dive.id, "reason", e.target.value)}
                      style={{ width:"100%", minWidth:110, padding:"4px 8px", border:"1.5px solid #e0e0e0", borderRadius:6, fontSize:12, fontFamily:"inherit", outline:"none", color:"#1a1a1a", background:"#fff" }} />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Depth Builder ────────────────────────────────────────────────────────
export default function DepthBuilder({ initialData, onSave, isClient }) {
  const [sessionName,   setSessionName]   = useState((initialData && initialData.sessionName) || "");
  const [location,      setLocation]      = useState((initialData && initialData.location)     || "");
  const [coachNotes,    setCoachNotes]    = useState((initialData && initialData.coachNotes)   || "");
  const [dives,         setDives]         = useState((initialData && initialData.dives)        || []);
  // client log
  const [energyBefore,  setEnergyBefore]  = useState((initialData && initialData.energyBefore) || null);
  const [energyAfter,   setEnergyAfter]   = useState((initialData && initialData.energyAfter)  || null);
  const [clientNotes,   setClientNotes]   = useState((initialData && initialData.clientNotes)  || "");
  const [saving,        setSaving]        = useState(false);
  const [logMode,       setLogMode]       = useState(false);

  function addDive()           { setDives(prev => [...prev, makeDive()]); }
  function removeDive(id)      { setDives(prev => prev.filter(d => d.id !== id)); }
  function updateDive(id, upd) { setDives(prev => prev.map(d => d.id === id ? upd : d)); }

  const completedCount = dives.filter(d => d.log && d.log.status === "completed").length;
  const totalDives     = dives.length;

  async function handleSave() {
    setSaving(true);
    await onSave({ sessionName, location, coachNotes, dives, energyBefore, energyAfter, clientNotes });
    setSaving(false);
  }

  // ── COACH VIEW ──
  if (!isClient) {
    return (
      <div style={{ fontFamily:"'DM Sans','Helvetica Neue',sans-serif", color:"#1a1a1a" }}>
        {/* Session name */}
        <div style={{ marginBottom:14 }}>
          <input value={sessionName} onChange={e => setSessionName(e.target.value)}
            style={{ fontWeight:700, fontSize:17, border:"none", borderBottom:"2px solid #f0f0f0", outline:"none", fontFamily:"inherit", color:"#1a1a1a", background:"transparent", width:"100%", paddingBottom:6 }}
            placeholder="Session name (e.g. CWT Open Water — Depth Block)..." />
          <div style={{ fontSize:12, color:"#aaa", marginTop:5 }}>{totalDives} dive{totalDives !== 1 ? "s" : ""} planned</div>
        </div>

        {/* Location */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#bbb", letterSpacing:".07em", textTransform:"uppercase", marginBottom:6 }}>Location / Site</div>
          <input value={location} onChange={e => setLocation(e.target.value)}
            placeholder="e.g. Blue Hole Dahab, Dean's Blue Hole, local pool..."
            style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #e0e0e0", borderRadius:8, fontSize:13, fontFamily:"inherit", outline:"none", color:"#1a1a1a", background:"#fff" }} />
        </div>

        {/* Coach notes */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#bbb", letterSpacing:".07em", textTransform:"uppercase", marginBottom:6 }}>Session Notes (visible to athlete)</div>
          <textarea value={coachNotes} onChange={e => setCoachNotes(e.target.value)}
            placeholder="Overall session goals, warm-up protocol, safety reminders, mental focus..."
            style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #e0e0e0", borderRadius:8, fontSize:13, fontFamily:"inherit", outline:"none", resize:"vertical", minHeight:60, color:"#1a1a1a", background:"#fff" }} />
        </div>

        {/* Dive list */}
        {dives.length === 0 && (
          <div style={{ background:"#fafaf8", border:"1.5px dashed #ddd", borderRadius:12, padding:"24px", textAlign:"center", color:"#bbb", fontSize:13, marginBottom:14 }}>
            No dives planned yet — click "+ Add Dive" to build the session
          </div>
        )}
        {dives.map((dive, i) => (
          <DivePlanRow key={dive.id} dive={dive} index={i + 1}
            onChange={upd => updateDive(dive.id, upd)}
            onRemove={() => removeDive(dive.id)} />
        ))}

        <button onClick={addDive}
          style={{ background:"#f0f0ec", border:"none", borderRadius:10, padding:"11px", fontSize:13, fontWeight:600, color:"#555", cursor:"pointer", fontFamily:"inherit", width:"100%", marginBottom:14, transition:"all .15s" }}
          onMouseEnter={e => e.currentTarget.style.background = "#e8e8e4"}
          onMouseLeave={e => e.currentTarget.style.background = "#f0f0ec"}>
          + Add Dive
        </button>

        <button onClick={handleSave} disabled={saving}
          style={{ background:"#1a1a1a", color:"#fff", border:"none", padding:"12px 24px", borderRadius:9, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit", width:"100%", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Saving..." : "Save Session Plan"}
        </button>
      </div>
    );
  }

  // ── CLIENT VIEW ──
  return (
    <div style={{ fontFamily:"'DM Sans','Helvetica Neue',sans-serif", color:"#1a1a1a" }}>
      {/* Session header */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontWeight:700, fontSize:17 }}>{sessionName || "Depth Session"}</div>
        {location && <div style={{ fontSize:12, color:"#aaa", marginTop:3 }}>📍 {location}</div>}
        <div style={{ fontSize:12, color:"#aaa", marginTop:4 }}>
          {totalDives} dives · {completedCount} completed
        </div>
      </div>

      {/* Coach notes */}
      {coachNotes && (
        <div style={{ background:"#fffbe6", border:"1px solid #ffe082", borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
          <div style={{ fontSize:10, fontWeight:800, letterSpacing:".08em", textTransform:"uppercase", color:"#a07a00", marginBottom:4 }}>Coach Notes</div>
          <div style={{ fontSize:13, color:"#5a4800", lineHeight:1.7 }}>{coachNotes}</div>
        </div>
      )}

      {/* Energy before */}
      <div style={{ marginBottom:16 }}>
        <EnergyScale value={energyBefore} onChange={setEnergyBefore} isClient={true}
          label="How rested do you feel BEFORE diving? (1 = very tired, 5 = fully charged)" />
      </div>

      {/* Coach plan summary — read only cards */}
      {!logMode && dives.length > 0 && (
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#bbb", letterSpacing:".07em", textTransform:"uppercase", marginBottom:10 }}>Today's Dives</div>
          <div style={{ background:"#fff", borderRadius:12, border:"1px solid #ebebeb", overflow:"hidden" }}>
            {dives.map((dive, i) => {
              const disc = getDiscipline(dive.discipline);
              return (
                <div key={dive.id} style={{ borderBottom: i < dives.length - 1 ? "1px solid #f0f0f0" : "none", overflow:"hidden" }}>
                  {/* Dive header row */}
                  <div style={{ padding:"12px 16px", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                    <span style={{ fontSize:12, fontWeight:700, color:"#bbb", flexShrink:0 }}>#{i+1}</span>
                    <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:disc.bg, color:disc.color, border:"1px solid " + disc.border, flexShrink:0 }}>{disc.label}</span>
                    <span style={{ fontSize:11, color:"#888", fontWeight:600, background:"#f5f4f0", padding:"2px 8px", borderRadius:6, flexShrink:0 }}>{dive.lungVolume}</span>
                    <span style={{ fontWeight:700, fontSize:16, color:"#1a2fa3", marginLeft:4 }}>
                      {dive.openLine
                        ? <span>Open <span style={{ fontSize:12, fontWeight:500, color:"#888" }}>{dive.openLineMax ? "(max " + dive.openLineMax + "m)" : ""}</span></span>
                        : dive.targetDepth ? dive.targetDepth + "m" : "—"}
                    </span>
                    {dive.hang && <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:"#fffbe6", color:"#7a6200", border:"1px solid #e8cc4d", flexShrink:0 }}>⏱ {dive.hang}s hang</span>}
                  </div>
                  {/* Full coach notes */}
                  {(dive.coachNotes || (dive.discipline === "DRILL" && dive.drillNotes)) && (
                    <div style={{ padding:"0 16px 14px", background:"#f8f8f6" }}>
                      <div style={{ fontSize:13, color:"#333", lineHeight:1.75, whiteSpace:"pre-wrap" }}>
                        {dive.coachNotes || dive.drillNotes}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button onClick={() => setLogMode(true)}
            style={{ background:"#1a1a1a", color:"#fff", border:"none", padding:"11px", borderRadius:9, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", width:"100%", marginTop:12 }}>
            Start logging dives →
          </button>
        </div>
      )}

      {/* Dive log table */}
      {(logMode || dives.some(d => d.log && d.log.status)) && dives.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#bbb", letterSpacing:".07em", textTransform:"uppercase", marginBottom:10 }}>Dive Log</div>
          <div style={{ background:"#fff", borderRadius:12, border:"1px solid #ebebeb", overflow:"hidden" }}>
            <AthleteTable dives={dives} onChange={setDives} />
          </div>
          {/* Legend */}
          <div style={{ display:"flex", gap:16, marginTop:8, fontSize:11, color:"#aaa" }}>
            <span>✓ Completed</span>
            <span>↩ Early turn</span>
            <span>✗ Missed / No dive</span>
          </div>
        </div>
      )}

      {/* Energy after */}
      <div style={{ marginBottom:16 }}>
        <EnergyScale value={energyAfter} onChange={setEnergyAfter} isClient={true}
          label="How do you feel AFTER the session? (1 = very tired, 5 = fully charged)" />
      </div>

      {/* Client notes */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:600, color:"#555", marginBottom:5 }}>Notes for your coach</div>
        <textarea value={clientNotes} onChange={e => setClientNotes(e.target.value)}
          placeholder="How did the session go? Water conditions, how you felt during dives, any concerns..."
          style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #e0e0e0", borderRadius:8, fontSize:13, fontFamily:"inherit", outline:"none", resize:"vertical", minHeight:72, color:"#1a1a1a", background:"#fff" }} />
      </div>

      <button onClick={handleSave} disabled={saving}
        style={{ background:"#1a1a1a", color:"#fff", border:"none", padding:"12px 24px", borderRadius:9, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit", width:"100%", opacity: saving ? 0.6 : 1 }}>
        {saving ? "Saving..." : "Save Dive Log"}
      </button>
    </div>
  );
}
