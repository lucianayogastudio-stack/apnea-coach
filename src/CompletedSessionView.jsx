// ── Completed Session View ────────────────────────────────────────────────────
// Shows coach plan + athlete execution side by side, read-only

export default function CompletedSessionView({ method, coachPlan, clientLog, onReply, coachComment, saving, onSave }) {

  const energyLabels = ["","Very tired 😴","Tired 😪","Ok 😐","Good 🙂","Fully charged ⚡"];

  // ── GYM STRENGTH & MOBILITY ──────────────────────────────────────────────
  if (method === "gym-strength" || method === "mobility") {
    const sections = coachPlan?.sections || [];
    const clientSections = clientLog?.sections || sections;

    return (
      <div style={{fontFamily:"'DM Sans','Helvetica Neue',sans-serif"}}>
        <SessionHeader coachPlan={coachPlan} clientLog={clientLog} energyLabels={energyLabels} />

        {sections.map((sec, si) => {
          const clientSec = clientSections[si] || sec;
          return (
            <div key={sec.id||si} style={{marginBottom:20}}>
              {sec.name && <div style={{fontSize:11,fontWeight:800,letterSpacing:".07em",textTransform:"uppercase",color:"#bbb",marginBottom:10}}>{sec.name}</div>}
              {sec.blocks?.map((block, bi) => {
                const clientBlock = clientSec.blocks?.[bi] || block;
                return (
                  <div key={block.id||bi} style={{background:"#fff",borderRadius:12,border:"1.5px solid #ebebeb",marginBottom:10,overflow:"hidden"}}>
                    <div style={{padding:"10px 14px",borderBottom:"1px solid #f5f5f5",fontWeight:700,fontSize:14}}>{block.type === "superset" ? "Superset" : block.type === "circuit" ? "Circuit" : ""}</div>
                    {block.exercises?.map((ex, ei) => {
                      const clientEx = clientBlock.exercises?.find(e=>e.id===ex.id) || clientBlock.exercises?.[ei] || ex;
                      const allDone = clientEx.sets?.every(s=>s.done);
                      const someDone = clientEx.sets?.some(s=>s.done);
                      const status = allDone ? "completed" : someDone ? "modified" : "skipped";
                      const statusStyles = {
                        completed:{label:"✓ Completed",bg:"#e8f5e9",color:"#2e7d32",border:"#a5d6a7"},
                        modified: {label:"~ Modified", bg:"#fff8e1",color:"#e65100",border:"#ffcc02"},
                        skipped:  {label:"✗ Skipped",  bg:"#fff5f5",color:"#c62828",border:"#ef9a9a"},
                      };
                      const ss = statusStyles[status];
                      return (
                        <div key={ex.id||ei} style={{borderBottom:"1px solid #f9f9f9"}}>
                          {/* Exercise header */}
                          <div style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
                            <div style={{fontWeight:600,fontSize:14,flex:1}}>{ex.name}</div>
                            <span style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:ss.bg,color:ss.color,border:"1px solid "+ss.border}}>{ss.label}</span>
                          </div>
                          {/* Coach plan — yellow */}
                          <div style={{padding:"0 14px 10px"}}>
                            <div style={{fontSize:10,fontWeight:800,color:"#a07a00",letterSpacing:".06em",textTransform:"uppercase",marginBottom:5}}>📋 Coach Plan</div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                              {ex.sets?.map((set,si2)=>{
                                const p = [set.reps&&`${set.reps} reps`,set.weight&&`${set.weight}kg`,set.duration&&set.duration,set.distance&&`${set.distance}m`].filter(Boolean).join(" · ")||"—";
                                return <div key={si2} style={{background:"#fffbe6",border:"1px solid #ffe082",borderRadius:7,padding:"4px 10px",fontSize:12,color:"#5a4800"}}>Set {si2+1}: {p}</div>;
                              })}
                            </div>
                            {ex.coachNotes&&<div style={{marginTop:6,fontSize:12,color:"#5a4800",lineHeight:1.6,background:"#fffbe6",padding:"6px 10px",borderRadius:7}}>{ex.coachNotes}</div>}
                          </div>
                          {/* Athlete execution — green */}
                          {clientEx.sets?.some(s=>s.done!==undefined) && (
                            <div style={{padding:"0 14px 10px",background:"#f8fdf8"}}>
                              <div style={{fontSize:10,fontWeight:800,color:"#2e7d32",letterSpacing:".06em",textTransform:"uppercase",marginBottom:5}}>🏋️ Athlete Execution</div>
                              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                                {clientEx.sets?.map((s,si2)=>{
                                  const a = s.done ? [s.actualReps&&`${s.actualReps} reps`,s.actualWeight&&`${s.actualWeight}kg`,s.actualDuration&&s.actualDuration].filter(Boolean).join(" · ")||"Done ✓" : "Skipped";
                                  return <div key={si2} style={{background:s.done?"#e8f5e9":"#fff5f5",border:`1px solid ${s.done?"#a5d6a7":"#ef9a9a"}`,borderRadius:7,padding:"4px 10px",fontSize:12,color:s.done?"#2e7d32":"#c62828"}}>Set {si2+1}: {a}</div>;
                                })}
                              </div>
                              {clientEx.notes&&<div style={{marginTop:6,fontSize:12,color:"#555",padding:"6px 10px",background:"#e8f5e9",borderRadius:7}}>{clientEx.notes}</div>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}

        <AthleteNotes clientLog={clientLog} energyLabels={energyLabels} />
        <CoachReply coachComment={coachComment} onReply={onReply} saving={saving} onSave={onSave} />
      </div>
    );
  }

  // ── DRY EQ ───────────────────────────────────────────────────────────────
  if (method === "dry-eq") {
    const drills = coachPlan?.drills || [];
    const clientDrills = clientLog?.drills || drills;
    const selfLabels = ["","Didn't feel it 😕","Slight feeling 🤔","Getting it 😐","Felt good 🙂","Clicked! 🎯"];

    return (
      <div style={{fontFamily:"'DM Sans','Helvetica Neue',sans-serif"}}>
        <SessionHeader coachPlan={coachPlan} clientLog={clientLog} energyLabels={energyLabels} />

        <div style={{fontSize:11,fontWeight:800,letterSpacing:".07em",textTransform:"uppercase",color:"#bbb",marginBottom:10}}>Drills</div>
        {drills.map((drill, i) => {
          const clientDrill = clientDrills.find(d=>d.id===drill.id) || clientDrills[i] || drill;
          const log = clientDrill.log || {};
          return (
            <div key={drill.id||i} style={{background:"#fff",borderRadius:12,border:`1.5px solid ${log.done?"#a5d6a7":"#ebebeb"}`,marginBottom:10,overflow:"hidden"}}>
              <div style={{padding:"10px 14px",borderBottom:"1px solid #f5f5f5",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontWeight:700,fontSize:14,flex:1}}>{drill.name||drill.technique}</span>
                <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:log.done?"#e8f5e9":"#f5f4f0",color:log.done?"#2e7d32":"#aaa",border:`1px solid ${log.done?"#a5d6a7":"#ddd"}`}}>{log.done?"✓ Done":"Not done"}</span>
              </div>
              {drill.description && (
                <div style={{padding:"10px 14px",background:"#fffbe6",borderBottom:"1px solid #f5f5f5"}}>
                  <div style={{fontSize:10,fontWeight:800,color:"#a07a00",letterSpacing:".06em",textTransform:"uppercase",marginBottom:4}}>Coach Instructions</div>
                  <div style={{fontSize:13,color:"#5a4800",lineHeight:1.7}}>{drill.description}</div>
                </div>
              )}
              {log.done && (
                <div style={{padding:"10px 14px",background:"#f8fdf8"}}>
                  <div style={{fontSize:10,fontWeight:800,color:"#2e7d32",letterSpacing:".06em",textTransform:"uppercase",marginBottom:6}}>Athlete Log</div>
                  {log.selfAssessment && <div style={{fontSize:13,marginBottom:4}}><span style={{color:"#aaa",fontSize:11}}>Self assessment: </span><strong>{log.selfAssessment}/5 — {selfLabels[log.selfAssessment]}</strong></div>}
                  {log.notes && <div style={{fontSize:13,color:"#555",lineHeight:1.6}}>{log.notes}</div>}
                </div>
              )}
            </div>
          );
        })}

        <AthleteNotes clientLog={clientLog} energyLabels={energyLabels} />
        <CoachReply coachComment={coachComment} onReply={onReply} saving={saving} onSave={onSave} />
      </div>
    );
  }

  // ── POOL (pool-co2) ───────────────────────────────────────────────────────
  if (method === "pool-co2") {
    const sections = coachPlan?.sections || [];
    const clientSections = clientLog?.sections || sections;

    return (
      <div style={{fontFamily:"'DM Sans','Helvetica Neue',sans-serif"}}>
        <SessionHeader coachPlan={coachPlan} clientLog={clientLog} energyLabels={energyLabels} />

        {sections.map((sec, si) => {
          const clientSec = clientSections[si] || sec;
          return (
            <div key={sec.id||si} style={{marginBottom:16}}>
              {sec.name && <div style={{fontSize:11,fontWeight:800,letterSpacing:".07em",textTransform:"uppercase",color:"#bbb",marginBottom:8}}>{sec.name}</div>}
              {sec.blocks?.map((block, bi) => {
                const clientBlock = clientSec.blocks?.[bi] || block;
                const log = clientBlock.log || {};
                const blockDesc = block.type==="distance" ? `${block.discipline||""} ${block.meters||""}m`
                  : block.type==="interval" ? `${block.sets||""}×${block.intervalMeters||""}m @ ${block.rest||""}`
                  : block.type==="over-under" ? `Over/Under: ${block.description||""}`
                  : block.description||"";
                return (
                  <div key={block.id||bi} style={{background:"#fff",borderRadius:10,border:`1.5px solid ${log.done?"#a5d6a7":"#ebebeb"}`,marginBottom:8,overflow:"hidden"}}>
                    <div style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:10,borderBottom:log.done?"1px solid #f0f0f0":"none"}}>
                      <span style={{flex:1,fontSize:13,fontWeight:600,color:"#1a1a1a"}}>{blockDesc}</span>
                      <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:log.done?"#e8f5e9":"#f5f4f0",color:log.done?"#2e7d32":"#aaa"}}>{log.done?"✓ Done":"Not done"}</span>
                    </div>
                    {log.done && (log.feeling||log.observations) && (
                      <div style={{padding:"8px 14px",background:"#f8fdf8"}}>
                        {log.feeling && <div style={{fontSize:12,color:"#555",marginBottom:2}}><span style={{color:"#aaa"}}>Feeling: </span>{log.feeling}</div>}
                        {log.observations && <div style={{fontSize:12,color:"#555"}}>{log.observations}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {clientLog?.totalMeters && <div style={{fontSize:13,color:"#aaa",marginBottom:16}}>Total: <strong style={{color:"#1a1a1a"}}>{clientLog.totalMeters}m</strong></div>}
        <AthleteNotes clientLog={clientLog} energyLabels={energyLabels} />
        <CoachReply coachComment={coachComment} onReply={onReply} saving={saving} onSave={onSave} />
      </div>
    );
  }

  // ── POOL TECHNIQUE ────────────────────────────────────────────────────────
  if (method === "pool-technique") {
    const exercises = coachPlan?.exercises || [];
    const clientExercises = clientLog?.exercises || exercises;

    return (
      <div style={{fontFamily:"'DM Sans','Helvetica Neue',sans-serif"}}>
        <SessionHeader coachPlan={coachPlan} clientLog={clientLog} energyLabels={energyLabels} />

        <div style={{fontSize:11,fontWeight:800,letterSpacing:".07em",textTransform:"uppercase",color:"#bbb",marginBottom:10}}>Exercises</div>
        {exercises.map((ex, i) => {
          const clientEx = clientExercises.find(e=>e.id===ex.id) || clientExercises[i] || ex;
          const log = clientEx.log || {};
          return (
            <div key={ex.id||i} style={{background:"#fff",borderRadius:12,border:`1.5px solid ${log.done?"#a5d6a7":"#ebebeb"}`,marginBottom:10,overflow:"hidden"}}>
              <div style={{padding:"10px 14px",borderBottom:"1px solid #f5f5f5",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontWeight:700,fontSize:14,flex:1}}>{ex.name}</span>
                {ex.sets && <span style={{fontSize:12,color:"#888"}}>{ex.sets} sets</span>}
                {ex.distance && <span style={{fontSize:12,color:"#888"}}>{ex.distance}</span>}
                <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:log.done?"#e8f5e9":"#f5f4f0",color:log.done?"#2e7d32":"#aaa"}}>{log.done?"✓ Done":"Not done"}</span>
              </div>
              {ex.description && (
                <div style={{padding:"8px 14px",background:"#fffbe6",borderBottom:"1px solid #f5f5f5"}}>
                  <div style={{fontSize:13,color:"#5a4800",lineHeight:1.6}}>{ex.description}</div>
                </div>
              )}
              {log.done && (log.feeling||log.observations) && (
                <div style={{padding:"8px 14px",background:"#f8fdf8"}}>
                  {log.feeling && <div style={{fontSize:12,color:"#555",marginBottom:2}}><span style={{color:"#aaa"}}>Feeling: </span>{log.feeling}</div>}
                  {log.observations && <div style={{fontSize:12,color:"#555"}}>{log.observations}</div>}
                </div>
              )}
            </div>
          );
        })}

        <AthleteNotes clientLog={clientLog} energyLabels={energyLabels} />
        <CoachReply coachComment={coachComment} onReply={onReply} saving={saving} onSave={onSave} />
      </div>
    );
  }

  // ── STATIC ────────────────────────────────────────────────────────────────
  if (method === "static") {
    const exercises = coachPlan?.exercises || [];
    const clientExercises = clientLog?.exercises || exercises;

    return (
      <div style={{fontFamily:"'DM Sans','Helvetica Neue',sans-serif"}}>
        <SessionHeader coachPlan={coachPlan} clientLog={clientLog} energyLabels={energyLabels} />

        {coachPlan?.warmup && <InfoBox label="Warm-up" value={coachPlan.warmup} />}
        {coachPlan?.mainSet && <InfoBox label="Main Set" value={coachPlan.mainSet} />}

        {exercises.length > 0 && (
          <>
            <div style={{fontSize:11,fontWeight:800,letterSpacing:".07em",textTransform:"uppercase",color:"#bbb",marginBottom:10,marginTop:16}}>Exercises</div>
            {exercises.map((ex, i) => {
              const clientEx = clientExercises.find(e=>e.id===ex.id) || clientExercises[i] || ex;
              const log = clientEx.log || {};
              return (
                <div key={ex.id||i} style={{background:"#fff",borderRadius:12,border:`1.5px solid ${log.done?"#a5d6a7":"#ebebeb"}`,marginBottom:10,overflow:"hidden"}}>
                  <div style={{padding:"10px 14px",borderBottom:"1px solid #f5f5f5",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                    <span style={{fontWeight:700,fontSize:14,flex:1}}>{ex.name}</span>
                    {ex.targetTime && <span style={{fontSize:12,color:"#888"}}>Target: {ex.targetTime}</span>}
                    <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:log.done?"#e8f5e9":"#f5f4f0",color:log.done?"#2e7d32":"#aaa"}}>{log.done?"✓ Done":"Not done"}</span>
                  </div>
                  {ex.description && <div style={{padding:"8px 14px",background:"#fffbe6",fontSize:13,color:"#5a4800",lineHeight:1.6}}>{ex.description}</div>}
                  {log.done && (
                    <div style={{padding:"8px 14px",background:"#f8fdf8"}}>
                      <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:4}}>
                        {log.actualTime && <span style={{fontSize:13}}><span style={{color:"#aaa",fontSize:11}}>Time: </span><strong>{log.actualTime}</strong></span>}
                        {log.actualContraction && <span style={{fontSize:13}}><span style={{color:"#aaa",fontSize:11}}>First contraction: </span><strong>{log.actualContraction}</strong></span>}
                      </div>
                      {log.feeling && <div style={{fontSize:12,color:"#555",marginBottom:2}}><span style={{color:"#aaa"}}>Feeling: </span>{log.feeling}</div>}
                      {log.observations && <div style={{fontSize:12,color:"#555"}}>{log.observations}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        <AthleteNotes clientLog={clientLog} energyLabels={energyLabels} />
        <CoachReply coachComment={coachComment} onReply={onReply} saving={saving} onSave={onSave} />
      </div>
    );
  }

  return null;
}

// ── Shared sub-components ─────────────────────────────────────────────────────
function SessionHeader({ coachPlan, clientLog, energyLabels }) {
  return (
    <div style={{marginBottom:16}}>
      {coachPlan?.sessionName && <div style={{fontWeight:700,fontSize:17,marginBottom:4}}>{coachPlan.sessionName}</div>}
      {coachPlan?.location && <div style={{fontSize:12,color:"#aaa",marginBottom:8}}>📍 {coachPlan.location}</div>}
      {coachPlan?.coachNotes && (
        <div style={{background:"#fffbe6",border:"1px solid #ffe082",borderRadius:10,padding:"10px 14px",marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:800,color:"#a07a00",letterSpacing:".06em",textTransform:"uppercase",marginBottom:4}}>Coach Notes</div>
          <div style={{fontSize:13,color:"#5a4800",lineHeight:1.7}}>{coachPlan.coachNotes}</div>
        </div>
      )}
      {(clientLog?.energyBefore || clientLog?.energyAfter) && (
        <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap"}}>
          {clientLog.energyBefore && (
            <div style={{background:"#f8f8f6",borderRadius:10,padding:"8px 12px",flex:1,minWidth:120}}>
              <div style={{fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",marginBottom:2}}>Energy Before</div>
              <div style={{fontSize:13,fontWeight:700}}>{clientLog.energyBefore}/5 {energyLabels[clientLog.energyBefore]}</div>
            </div>
          )}
          {clientLog.energyAfter && (
            <div style={{background:"#f8f8f6",borderRadius:10,padding:"8px 12px",flex:1,minWidth:120}}>
              <div style={{fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",marginBottom:2}}>Energy After</div>
              <div style={{fontSize:13,fontWeight:700}}>{clientLog.energyAfter}/5 {energyLabels[clientLog.energyAfter]}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AthleteNotes({ clientLog, energyLabels }) {
  const notes = clientLog?.clientNotes || clientLog?.notes;
  const rating = clientLog?.overallRating || clientLog?.rating;
  if (!notes && !rating) return null;
  return (
    <div style={{background:"#f0f7ff",border:"1px solid #c0d8f0",borderRadius:10,padding:"12px 14px",marginBottom:14,marginTop:8}}>
      <div style={{fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"#005fa3",marginBottom:6}}>Athlete Notes</div>
      {rating && <div style={{fontSize:13,marginBottom:notes?6:0}}>{"⭐".repeat(rating)} {rating}/5</div>}
      {notes && <div style={{fontSize:13,color:"#1a1a1a",lineHeight:1.7}}>{notes}</div>}
    </div>
  );
}

function InfoBox({ label, value }) {
  if (!value) return null;
  return (
    <div style={{background:"#f8f8f6",borderRadius:10,padding:"10px 14px",marginBottom:10}}>
      <div style={{fontSize:10,fontWeight:800,color:"#bbb",letterSpacing:".06em",textTransform:"uppercase",marginBottom:4}}>{label}</div>
      <div style={{fontSize:13,color:"#1a1a1a",lineHeight:1.7}}>{value}</div>
    </div>
  );
}

function CoachReply({ coachComment, onReply, saving, onSave }) {
  return (
    <div style={{marginTop:16,borderTop:"1.5px solid #f0f0f0",paddingTop:16}}>
      <div style={{fontSize:12,fontWeight:600,color:"#555",marginBottom:6}}>Reply to athlete</div>
      <textarea value={coachComment||""} onChange={e=>onReply(e.target.value)}
        placeholder="Leave feedback, encouragement or adjustments for next session..."
        style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none",resize:"vertical",minHeight:80,color:"#1a1a1a",background:"#fff",marginBottom:10}}/>
      <button onClick={onSave} disabled={saving}
        style={{background:"#1a1a1a",color:"#fff",border:"none",padding:"10px 20px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:saving?0.6:1}}>
        {saving?"Saving...":"Save Reply"}
      </button>
    </div>
  );
}
