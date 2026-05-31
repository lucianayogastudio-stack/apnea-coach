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
                const blockDesc = block.type==="distance" ? `${block.discipline||""} ${block.reps && block.reps!=="1" ? block.reps+"×" : ""}${block.meters||""}m`
                  : block.type==="interval" ? `${block.discipline||""} ${block.intervalSets?.reduce((a,s)=>a+(Number(s.reps)||0),0)||""}×${block.intervalMeters||""}m intervals`
                  : block.type==="overunder" ? `Over/Under: ${block.reps||"?"}×${block.meters||"?"}m`
                  : block.type==="maxeffort" ? `🔥 Max Effort${block.maxEffortReps && block.maxEffortReps!=="1" ? " ×"+block.maxEffortReps : ""}${block.maxEffortRest ? " · rest "+block.maxEffortRest : ""}`
                  : block.description||"";
                const statusMap = {
                  completed: { label:"✓ Completed", bg:"#e8f5e9", color:"#2e7d32", border:"#a5d6a7" },
                  partial:   { label:"~ Partial",   bg:"#fffbeb", color:"#b45309", border:"#fcd34d" },
                  skipped:   { label:"✗ Skipped",   bg:"#fff5f5", color:"#c62828", border:"#fca5a5" },
                };
                const logStatus = log.status || (log.done ? "completed" : null);
                const ss = statusMap[logStatus] || { label:"Not logged", bg:"#f5f4f0", color:"#aaa", border:"#ddd" };
                return (
                  <div key={block.id||bi} style={{background:"#fff",borderRadius:10,border:`1.5px solid ${logStatus?"#ebebeb":"#ebebeb"}`,marginBottom:8,overflow:"hidden"}}>
                    <div style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:10,borderBottom:logStatus?"1px solid #f0f0f0":"none"}}>
                      <span style={{flex:1,fontSize:13,fontWeight:600,color:block.type==="maxeffort"?"#b94a00":"#1a1a1a"}}>{blockDesc}</span>
                      <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:ss.bg,color:ss.color,border:`1px solid ${ss.border}`}}>{ss.label}</span>
                    </div>
                    {logStatus && (log.achievedMeters || log.feeling || log.observations || log.athleteVideoUrl) && (
                      <div style={{padding:"8px 14px",background: logStatus==="completed"?"#f8fdf8":logStatus==="partial"?"#fffbeb":"#fff5f5"}}>
                        {log.athleteVideoUrl && (
                          <div style={{marginBottom:8}}>
                            <div style={{fontSize:10,fontWeight:800,color:"#2e7d32",letterSpacing:".06em",textTransform:"uppercase",marginBottom:5}}>📹 Athlete Video</div>
                            <video src={log.athleteVideoUrl} controls style={{width:"100%",borderRadius:8,maxHeight:280}} />
                          </div>
                        )}
                        {log.achievedMeters && <div style={{fontSize:13,fontWeight:700,color:"#b94a00",marginBottom:4}}>🔥 {log.achievedMeters}m achieved</div>}
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
              const logStatus = log.status || (log.done ? "completed" : null);
              const ssMap = {
                completed:{label:"✓ Completed",bg:"#e8f5e9",color:"#2e7d32",border:"#a5d6a7",logBg:"#f8fdf8"},
                partial:  {label:"~ Partial",  bg:"#fffbeb",color:"#b45309",border:"#fcd34d",logBg:"#fffbeb"},
                skipped:  {label:"✗ Skipped",  bg:"#fff5f5",color:"#c62828",border:"#fca5a5",logBg:"#fff5f5"},
              };
              const ss = ssMap[logStatus] || {label:"Not logged",bg:"#f5f4f0",color:"#aaa",border:"#ddd",logBg:"#f8f8f6"};
              const isTable = ex.templateKey==="co2-table"||ex.templateKey==="o2-table";

              // Compute round table for CO2/O2
              function toSecs(t){if(!t)return 0;const p=String(t).trim().split(":");if(p.length===2)return parseInt(p[0],10)*60+parseInt(p[1],10);return parseInt(p[0],10)||0;}
              function fmtSecs(s){if(s<=0)return"0:00";const m=Math.floor(s/60),sec=s%60;return`${m}:${String(sec).padStart(2,"0")}`;}
              const tableRows = isTable ? (()=>{
                const rounds=Math.min(parseInt(ex.rounds)||8,20);
                const holdSecs=toSecs(ex.holdTime);
                const breathSecs=toSecs(ex.breathTime);
                const incrSecs=toSecs(ex.increment||"0:15");
                const isCo2=ex.templateKey==="co2-table";
                return Array.from({length:rounds},(_,idx)=>({
                  round:idx+1,
                  hold: isCo2?holdSecs:holdSecs+idx*incrSecs,
                  rest: isCo2?Math.max(breathSecs-idx*incrSecs,15):breathSecs,
                  actual: log.roundLogs?.[idx]||null,
                }));
              })() : null;

              return (
                <div key={ex.id||i} style={{background:"#fff",borderRadius:12,border:`1.5px solid ${logStatus?ss.border:"#ebebeb"}`,marginBottom:10,overflow:"hidden"}}>
                  <div style={{padding:"10px 14px",borderBottom:"1px solid #f5f5f5",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                    <span style={{fontWeight:700,fontSize:14,flex:1}}>{ex.label||ex.name}</span>
                    {ex.targetTime && <span style={{fontSize:12,color:"#888"}}>Target: {ex.targetTime}</span>}
                    <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:ss.bg,color:ss.color,border:`1px solid ${ss.border}`}}>{ss.label}</span>
                  </div>
                  {ex.description && <div style={{padding:"8px 14px",background:"#fffbe6",fontSize:13,color:"#5a4800",lineHeight:1.6}}>{ex.description}</div>}

                  {/* Table display for CO2/O2 */}
                  {isTable && tableRows && (
                    <div style={{padding:"10px 14px"}}>
                      <div style={{borderRadius:8,overflow:"hidden",border:"1px solid #ebebeb"}}>
                        <div style={{display:"grid",gridTemplateColumns:"36px 1fr 1fr"+(log.roundLogs?.some(Boolean)?" 1fr":""),background:"#f8f8f6",padding:"6px 12px",gap:8}}>
                          {["Rd","Hold","Rest",...(log.roundLogs?.some(Boolean)?["Actual"]:[])].map(h=>(
                            <div key={h} style={{fontSize:10,fontWeight:800,color:"#bbb",letterSpacing:".07em",textTransform:"uppercase"}}>{h}</div>
                          ))}
                        </div>
                        {tableRows.map((r,idx)=>(
                          <div key={idx} style={{display:"grid",gridTemplateColumns:"36px 1fr 1fr"+(log.roundLogs?.some(Boolean)?" 1fr":""),padding:"7px 12px",gap:8,borderTop:"1px solid #f0f0f0",background:idx%2===0?"#fff":"#fafaf8"}}>
                            <div style={{fontSize:12,color:"#bbb",fontWeight:700}}>{r.round}</div>
                            <div style={{fontSize:13,fontWeight:700,color:ex.templateKey==="o2-table"?"#005fa3":"#2d7a2d",fontFamily:"monospace"}}>{fmtSecs(r.hold)}</div>
                            <div style={{fontSize:13,color:"#555",fontFamily:"monospace"}}>{fmtSecs(r.rest)}</div>
                            {log.roundLogs?.some(Boolean) && (
                              <div style={{fontSize:13,fontWeight:700,color:r.actual?"#2e7d32":"#ddd",fontFamily:"monospace"}}>{r.actual||"—"}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {logStatus && !isTable && (log.actualTime||log.actualContraction||log.feeling||log.limitingFactor) && (
                    <div style={{padding:"8px 14px",background:ss.logBg}}>
                      <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:4}}>
                        {log.actualTime && <span style={{fontSize:13}}><span style={{color:"#aaa",fontSize:11}}>Time: </span><strong>{log.actualTime}</strong></span>}
                        {log.actualContraction && <span style={{fontSize:13}}><span style={{color:"#aaa",fontSize:11}}>First contraction: </span><strong>{log.actualContraction}</strong></span>}
                      </div>
                      {log.feeling && <div style={{fontSize:12,color:"#555",marginBottom:2}}><span style={{color:"#aaa"}}>{logStatus==="skipped"?"Reason: ":"Feeling: "}</span>{log.feeling}</div>}
                      {log.limitingFactor && <div style={{fontSize:12,color:"#555"}}><span style={{color:"#aaa"}}>Limiting factor: </span>{log.limitingFactor}</div>}
                    </div>
                  )}
                  {logStatus && isTable && (log.feeling||log.limitingFactor) && (
                    <div style={{padding:"8px 14px",background:ss.logBg}}>
                      {log.feeling && <div style={{fontSize:12,color:"#555",marginBottom:2}}><span style={{color:"#aaa"}}>{logStatus==="skipped"?"Reason: ":"Feeling: "}</span>{log.feeling}</div>}
                      {log.limitingFactor && <div style={{fontSize:12,color:"#555"}}><span style={{color:"#aaa"}}>Limiting factor: </span>{log.limitingFactor}</div>}
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

  // ── DEPTH ─────────────────────────────────────────────────────────────────
  if (method === "depth") {
    const DISC_COLORS = {
      CWT:{bg:"#e8f0ff",color:"#1a2fa3",border:"#6a7ef4"},
      CWTB:{bg:"#e6f4ff",color:"#005fa3",border:"#6ab0f4"},
      CNF:{bg:"#edf6e6",color:"#2d7a2d",border:"#7ec87e"},
      FIM:{bg:"#fffbe6",color:"#7a6200",border:"#e8cc4d"},
      MONO:{bg:"#fdf0fb",color:"#8b1f7a",border:"#d97ec8"},
      DRILL:{bg:"#f5f4f0",color:"#555",border:"#ccc"},
    };
    const dives = coachPlan?.dives || [];
    const loggedDives = clientLog?.dives || [];
    return (
      <div style={{fontFamily:"'DM Sans','Helvetica Neue',sans-serif"}}>
        <SessionHeader coachPlan={coachPlan} clientLog={clientLog} energyLabels={energyLabels} />
        <div style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:".07em",textTransform:"uppercase",marginBottom:10}}>Dives</div>
        {dives.map((dive, i) => {
          const disc = DISC_COLORS[dive.discipline] || DISC_COLORS.DRILL;
          const logged = loggedDives.find(l=>l.id===dive.id) || dive;
          const log = logged.log || {};
          const statusStyles = {
            completed:{label:"✓ Completed",bg:"#e8f5e9",color:"#2e7d32",border:"#a5d6a7"},
            "early-turn":{label:"↩ Early turn",bg:"#fff8e1",color:"#e65100",border:"#ffcc02"},
            missed:{label:"✗ Missed",bg:"#fff5f5",color:"#c62828",border:"#ef9a9a"},
          };
          const ss = statusStyles[log.status] || {label:"Not logged",bg:"#f5f4f0",color:"#aaa",border:"#ddd"};
          return (
            <div key={dive.id} style={{background:"#fff",borderRadius:12,border:"1.5px solid #ebebeb",marginBottom:10,overflow:"hidden"}}>
              <div style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",borderBottom:"1px solid #f5f5f5"}}>
                <span style={{fontSize:12,fontWeight:700,color:"#bbb"}}>#{i+1}</span>
                <span style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:disc.bg,color:disc.color,border:"1px solid "+disc.border}}>{dive.discipline}</span>
                <span style={{fontSize:11,color:"#888",background:"#f5f4f0",padding:"2px 8px",borderRadius:6,fontWeight:600}}>{dive.lungVolume}</span>
                <span style={{fontWeight:700,fontSize:15,color:"#1a2fa3"}}>{dive.openLine?"Open"+(dive.openLineMax?" (max "+dive.openLineMax+"m)":""):dive.targetDepth?dive.targetDepth+"m":"—"}</span>
                {dive.hang&&<span style={{padding:"2px 8px",borderRadius:6,fontSize:11,fontWeight:700,background:"#fffbe6",color:"#7a6200",border:"1px solid #e8cc4d"}}>⏱ {dive.hang}s hang</span>}
                <span style={{marginLeft:"auto",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:ss.bg,color:ss.color,border:"1px solid "+ss.border}}>{ss.label}</span>
              </div>
              {(dive.coachNotes||dive.drillNotes)&&(
                <div style={{padding:"10px 14px",background:"#fffbe6",borderBottom:"1px solid #f5f5f5"}}>
                  <div style={{fontSize:10,fontWeight:800,color:"#a07a00",letterSpacing:".06em",textTransform:"uppercase",marginBottom:4}}>📋 Coach Instructions</div>
                  <div style={{fontSize:13,color:"#5a4800",lineHeight:1.7}}>{dive.coachNotes||dive.drillNotes}</div>
                </div>
              )}
              {log.status&&(
                <div style={{padding:"10px 14px",background:"#f8fdf8"}}>
                  <div style={{fontSize:10,fontWeight:800,color:"#2e7d32",letterSpacing:".06em",textTransform:"uppercase",marginBottom:6}}>🌊 Athlete Execution</div>
                  <div style={{display:"flex",gap:14,flexWrap:"wrap",fontSize:13}}>
                    {log.actualDepth&&<span><span style={{color:"#aaa",fontSize:11}}>Depth: </span><strong>{log.actualDepth}m</strong></span>}
                    {log.turnDepth&&<span><span style={{color:"#aaa",fontSize:11}}>Turned at: </span><strong>{log.turnDepth}m</strong></span>}
                    {log.diveTime&&<span><span style={{color:"#aaa",fontSize:11}}>Time: </span><strong>{log.diveTime}</strong></span>}
                  </div>
                  {log.reason&&<div style={{fontSize:13,color:"#555",marginTop:6,lineHeight:1.6}}>{log.reason}</div>}
                </div>
              )}
            </div>
          );
        })}
        {clientLog?.incident&&typeof clientLog.incident==="object"&&clientLog.incident.types?.length>0&&(
          <div style={{background:"#fff5f5",border:"2px solid #ef5350",borderRadius:10,padding:"14px 16px",marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:800,color:"#c62828",letterSpacing:".06em",textTransform:"uppercase",marginBottom:8}}>🚨 Incident Report</div>
            {[{key:"lung_squeeze",label:"Lung Squeeze"},{key:"trachea_squeeze",label:"Trachea Squeeze"},{key:"samba",label:"Samba / LMC"},{key:"uw_blackout",label:"Underwater Blackout"},{key:"surface_blackout",label:"Surface Blackout"}]
              .filter(i=>clientLog.incident.types.includes(i.key)).map(i=>(
              <div key={i.key} style={{marginBottom:4}}>
                <div style={{fontSize:13,fontWeight:700,color:"#c62828"}}>• {i.label}</div>
                {i.key==="uw_blackout"&&clientLog.incident.details?.uw_depth&&<div style={{fontSize:12,color:"#555",marginLeft:14}}>Depth: {clientLog.incident.details.uw_depth}m · Unconscious: {clientLog.incident.details.uw_seconds||"?"}s</div>}
                {i.key==="surface_blackout"&&clientLog.incident.details?.surface_seconds&&<div style={{fontSize:12,color:"#555",marginLeft:14}}>Unconscious: {clientLog.incident.details.surface_seconds}s</div>}
              </div>
            ))}
            {clientLog.incident.notes&&<div style={{fontSize:13,color:"#555",marginTop:8,paddingTop:8,borderTop:"1px solid #ef9a9a",lineHeight:1.6}}>{clientLog.incident.notes}</div>}
          </div>
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
