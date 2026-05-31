import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import CompletedSessionView from "./CompletedSessionView";
import GymStrengthBuilder from "./GymStrengthBuilder";
import StaticBuilder from "./StaticBuilder";
import PoolTechniqueBuilder from "./PoolTechniqueBuilder";
import PoolBuilder from "./PoolBuilder";
import DepthBuilder from "./DepthBuilder";
import DryEqBuilder from "./DryEqBuilder";
import ProgressCharts from "./ProgressCharts";
import MobilityBuilder from "./MobilityBuilder";

const METHODS = [
  { key:"gym-strength",   label:"Gym Strength",   emoji:"🏋️", bg:"#fff0e6", border:"#f4a96a", text:"#b85c00", dot:"#f4803a" },
  { key:"pool-technique", label:"Pool Technique", emoji:"🏊",  bg:"#e6f4ff", border:"#6ab0f4", text:"#005fa3", dot:"#3a8ef4" },
  { key:"pool-co2",       label:"Pool",           emoji:"💧", bg:"#edf6e6", border:"#7ec87e", text:"#2d7a2d", dot:"#4db84d" },
  { key:"gym-cardio",     label:"Gym Cardio",     emoji:"🏃",  bg:"#fdf0fb", border:"#d97ec8", text:"#8b1f7a", dot:"#c94db8" },
  { key:"dry-eq",         label:"Dry Eq",         emoji:"👂",  bg:"#e8f5e9", border:"#81c784", text:"#1b5e20", dot:"#43a047" },
  { key:"mobility",       label:"Mobility",       emoji:"🤸",  bg:"#fce4ec", border:"#f48fb1", text:"#880e4f", dot:"#e91e63" },
  { key:"static",         label:"Static",         emoji:"🧘",  bg:"#fffbe6", border:"#e8cc4d", text:"#7a6200", dot:"#d4aa00" },
  { key:"depth",          label:"Depth",          emoji:"🌊",  bg:"#e8f0ff", border:"#6a7ef4", text:"#1a2fa3", dot:"#3a4df4" },
];
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function gm(key) { return METHODS.find(m => m.key === key) || METHODS[0]; }
function mondayOf(date) {
  const d = new Date(date); const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); d.setHours(0,0,0,0); return d;
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function toISO(d) { const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0"); return `${y}-${m}-${day}`; }
function fmtShort(d) { return d.toLocaleDateString("en-US", { month:"short", day:"numeric" }); }
function fmtFull(iso) {
  if (!iso) return "";
  if (iso.length === 10) {
    // Pure date string like "2026-05-27" — parse as local to avoid UTC shift
    const [y,mo,day] = iso.split("-");
    return new Date(Number(y),Number(mo)-1,Number(day)).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
  }
  // Fallback for full datetime strings
  return new Date(iso).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
}

function dbToSession(row) {
  let gymData = null;
  if ((row.method==="gym-strength" || row.method==="static" || row.method==="pool-technique" || row.method==="pool-co2" || row.method==="depth" || row.method==="gym-cardio" || row.method==="dry-eq" || row.method==="mobility") && row.plan_mainset) {
    try { gymData = JSON.parse(row.plan_mainset); } catch(e) { gymData = null; }
  }
  let clientGymData = null;
  if ((row.method==="gym-strength" || row.method==="static" || row.method==="pool-technique" || row.method==="pool-co2" || row.method==="depth" || row.method==="gym-cardio" || row.method==="dry-eq" || row.method==="mobility") && row.feedback?.client_notes) {
    try { clientGymData = JSON.parse(row.feedback.client_notes); } catch(e) { clientGymData = null; }
  }
  return {
    id: row.id, clientId: row.client_id, date: row.date, method: row.method,
    plan: {
      warmup: row.plan_warmup||"", mainSet: gymData?null:row.plan_mainset||"", cooldown: row.plan_cooldown||"",
      targetDepth: row.plan_target_depth||null, openLine: row.plan_open_line||false, coachNotes: row.plan_coach_notes||"",
      gymData,
    },
    feedback: row.feedback ? {
      status: row.feedback.status||null, actualDepth: row.feedback.actual_depth||"",
      earlyTurn: row.feedback.early_turn||false, earlyTurnDepth: row.feedback.early_turn_depth||"",
      feeling: row.feedback.feeling||"", limitingFactor: row.feedback.limiting_factor||"",
      clientNotes: clientGymData?null:row.feedback.client_notes||"",
      clientGymData, coachComment: row.feedback.coach_comment||"",
    } : { status:null, actualDepth:"", earlyTurn:false, earlyTurnDepth:"", feeling:"", limitingFactor:"", clientNotes:"", coachComment:"" },
  };
}

function dbToClient(row) {
  return {
    id:row.id, name:row.name, age:row.age, level:row.level, goal:row.goal,
    pb:{CWT:row.pb_cwt, STA:row.pb_sta, DYN:row.pb_dyn},
    planType: row.plan_type||"weeks",
    planWeeks: row.plan_weeks||null,
    planStartDate: row.plan_start_date||null,
    competitionDate: row.competition_date||null,
    competitionName: row.competition_name||null,
    archived: row.archived||false,
    avatarUrl: row.avatar_url||null,
    email: row.email || (Array.isArray(row.profiles) ? row.profiles[0]?.email : row.profiles?.email) || null,
  };
}

// ── Timeline helpers ──────────────────────────────────────────────────────────
function getTimeline(client) {
  if (!client) return null;
  const today = new Date(); today.setHours(0,0,0,0);

  if (client.planType==="competition" && client.competitionDate) {
    const compDate = new Date(client.competitionDate);
    const daysLeft = Math.ceil((compDate - today) / (1000*60*60*24));
    const weeksLeft = Math.ceil(daysLeft / 7);
    const startDate = client.planStartDate ? new Date(client.planStartDate) : null;
    const totalDays = startDate ? Math.ceil((compDate - startDate) / (1000*60*60*24)) : null;
    const elapsed = startDate ? Math.ceil((today - startDate) / (1000*60*60*24)) : null;
    const progress = totalDays && elapsed ? Math.min(100, Math.round((elapsed/totalDays)*100)) : null;
    const currentWeek = startDate ? Math.ceil(elapsed/7) : null;
    const totalWeeks = totalDays ? Math.ceil(totalDays/7) : null;
    return { type:"competition", daysLeft, weeksLeft, progress, currentWeek, totalWeeks,
             label: client.competitionName||"Competition", date: client.competitionDate, isPast: daysLeft < 0 };
  }

  if (client.planType==="weeks" && client.planWeeks && client.planStartDate) {
    const startDate = new Date(client.planStartDate);
    const endDate = new Date(startDate); endDate.setDate(endDate.getDate() + client.planWeeks*7);
    const daysLeft = Math.ceil((endDate - today) / (1000*60*60*24));
    const weeksLeft = Math.max(0, Math.ceil(daysLeft / 7));
    const elapsed = Math.ceil((today - startDate) / (1000*60*60*24));
    const progress = Math.min(100, Math.max(0, Math.round((elapsed/(client.planWeeks*7))*100)));
    const currentWeek = Math.min(client.planWeeks, Math.max(1, Math.ceil(elapsed/7)));
    return { type:"weeks", daysLeft, weeksLeft, progress, currentWeek, totalWeeks:client.planWeeks,
             label:`${client.planWeeks}-Week Plan`, isPast: daysLeft < 0 };
  }
  return null;
}

// ── Login ─────────────────────────────────────────────────────────────────────
function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault(); setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  }

  return (
    <div style={{minHeight:"100vh",background:"#f5f4f0",color:"#1a1a1a",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans','Helvetica Neue',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{background:"#fff",borderRadius:16,padding:40,width:"100%",maxWidth:400,boxShadow:"0 8px 32px rgba(0,0,0,.08)"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:40,marginBottom:12}}>🤿</div>
          <div style={{fontWeight:700,fontSize:24,letterSpacing:"-.02em"}}>ApneaCoach</div>
          <div style={{fontSize:14,color:"#999",marginTop:6}}>Sign in to your account</div>
        </div>
        <form onSubmit={handleLogin}>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:600,color:"#666",marginBottom:6}}>Email</div>
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
              style={{width:"100%",padding:"11px 14px",border:"1.5px solid #e0e0e0",borderRadius:9,fontSize:14,outline:"none",fontFamily:"inherit",color:"#1a1a1a"}} placeholder="your@email.com" />
          </div>
          <div style={{marginBottom:24}}>
            <div style={{fontSize:12,fontWeight:600,color:"#666",marginBottom:6}}>Password</div>
            <input type="password" required value={password} onChange={e=>setPassword(e.target.value)}
              style={{width:"100%",padding:"11px 14px",border:"1.5px solid #e0e0e0",borderRadius:9,fontSize:14,outline:"none",fontFamily:"inherit",color:"#1a1a1a"}} placeholder="••••••••" />
          </div>
          {error && <div style={{background:"#fce4ec",border:"1px solid #ef9a9a",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#c62828",marginBottom:16}}>{error}</div>}
          <button type="submit" disabled={loading} style={{width:"100%",background:"#1a1a1a",color:"#fff",border:"none",padding:"13px",borderRadius:9,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:loading?0.6:1}}>
            {loading?"Signing in...":"Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Modal({ children, onClose, wide }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflowY:"auto"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:"#fff",borderRadius:16,padding:32,width:"100%",maxWidth:wide?700:480,maxHeight:"92vh",overflowY:"auto",position:"relative",boxShadow:"0 24px 64px rgba(0,0,0,.18)"}}>
        <button onClick={onClose} style={{position:"absolute",top:16,right:18,background:"none",border:"none",fontSize:22,color:"#bbb",cursor:"pointer",lineHeight:1}}>×</button>
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    completed:{bg:"#e8f5e9",border:"#a5d6a7",color:"#2e7d32",label:"✓ Completed"},
    partial:  {bg:"#fff8e1",border:"#ffe082",color:"#e65100",label:"~ Partial"},
    missed:   {bg:"#fce4ec",border:"#ef9a9a",color:"#c62828",label:"✗ Missed"},
  };
  const s = map[status];
  if (!s) return <span style={{display:"inline-flex",alignItems:"center",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:"#f5f4f0",color:"#1a1a1a",border:"1px solid #e8e8e8",color:"#bbb"}}>— Pending</span>;
  return <span style={{display:"inline-flex",alignItems:"center",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:s.bg,border:`1px solid ${s.border}`,color:s.color}}>{s.label}</span>;
}

function Spinner() {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"60vh"}}>
      <div style={{width:36,height:36,border:"3px solid #f0f0f0",borderTop:"3px solid #1a1a1a",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Day Modal ─────────────────────────────────────────────────────────────────
function DayModal({ session, role, onClose, onSave, onEdit }) {
  const m = gm(session.method);
  const isGym    = session.method==="gym-strength";
  const isStatic = session.method==="static";
  const isPool    = session.method==="pool-technique";
  const isPool2      = session.method==="pool-co2";
  const isDepthSess  = session.method==="depth";
  const isDryEq      = session.method==="dry-eq";
  const isMobility   = session.method==="mobility";
  const isDepth = session.method==="depth";
  const isClient = role==="client";
  const [fb, setFb] = useState({...session.feedback});
  const [saving, setSaving] = useState(false);

  async function handleSave() { setSaving(true); await onSave(fb); setSaving(false); }

  // Static sessions use the dedicated builder
  if (isStatic) {
    const isCompleted_static = session.feedback?.status==="completed";
    return (
      <Modal onClose={onClose} wide>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
          <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:700,background:m.bg,color:m.text,border:`1px solid ${m.border}`}}>{m.emoji} {m.label}</span>
          <span style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:".06em",textTransform:"uppercase"}}>{isClient ? (isCompleted_static?"Completed":"Athlete View") : (isCompleted_static?"Completed Session":"Coach View")}</span>
          {!isClient && isCompleted_static && fb.status && <button onClick={()=>setFb(p=>({...p,status:null}))} style={{marginLeft:"auto",background:"transparent",border:"1.5px solid #e0e0e0",color:"#888",padding:"5px 10px",borderRadius:7,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>↩ Reopen</button>}
          {!isClient && !isCompleted_static && onEdit && <button onClick={()=>{onClose();onEdit(session);}} style={{marginLeft:"auto",background:"transparent",border:"1.5px solid #ddd",color:"#555",padding:"5px 12px",borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Edit</button>}
        </div>
        <div style={{fontWeight:700,fontSize:19,letterSpacing:"-.02em",marginBottom:18}}>{fmtFull(session.date)}</div>
        {isCompleted_static ? (
          <>
            <CompletedSessionView
              method="static"
              coachPlan={session.plan?.gymData}
              clientLog={session.feedback?.clientGymData}
              coachComment={isClient ? undefined : fb.coachComment||""}
              onReply={isClient ? undefined : v=>setFb(p=>({...p,coachComment:v}))}
              saving={saving}
              onSave={isClient ? undefined : async()=>{setSaving(true);await onSave({...fb});setSaving(false);onClose();}}
            />
            {isClient && session.feedback?.coachComment && (
              <div style={{marginTop:16,background:"#e8f5e9",border:"1px solid #a5d6a7",borderRadius:10,padding:"14px 16px"}}>
                <div style={{fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"#2e7d32",marginBottom:6}}>💬 Coach's Feedback</div>
                <div style={{fontSize:14,color:"#1b5e20",lineHeight:1.65}}>{session.feedback.coachComment}</div>
              </div>
            )}
          </>
        ) : (
        <StaticBuilder
          isClient={isClient}
          initialData={(() => {
            const coachPlan = session.plan?.gymData || null;
            const clientLog = session.feedback?.clientGymData || null;
            if (isClient && coachPlan) {
              // Client sees coach plan merged with their own log
              if (clientLog && clientLog.exercises) {
                return {
                  ...coachPlan,
                  exercises: coachPlan.exercises.map(ex => {
                    const loggedEx = clientLog.exercises?.find(l => l.id === ex.id);
                    return loggedEx ? { ...ex, log: loggedEx.log } : ex;
                  }),
                  clientNotes: clientLog.clientNotes || "",
                  rating: clientLog.rating || null,
                };
              }
              return coachPlan;
            }
            // Coach sees their own plan for editing
            return coachPlan;
          })()}
          onSave={async (data) => {
            setSaving(true);
            if (isClient) {
              await onSave({ ...fb, gymData:data, status: fb.status||"completed" });
            } else {
              // Coach saving plan — store as gymData in feedback save flow
              await onSave({ ...fb, gymData:data });
            }
            setSaving(false);
            onClose();
          }}
        />
        )}
      </Modal>
    );
  }

  if (isMobility) {
    const isCompleted_mobility = session.feedback?.status==="completed";
    return (
      <Modal onClose={onClose} wide>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
          <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:700,background:m.bg,color:m.text,border:`1px solid ${m.border}`}}>{m.emoji} {m.label}</span>
          <span style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:".06em",textTransform:"uppercase"}}>{isClient?(isCompleted_mobility?"Completed":"Athlete View"):(isCompleted_mobility?"Completed Session":"Coach View")}</span>
          {!isClient && isCompleted_mobility && fb.status && <button onClick={()=>setFb(p=>({...p,status:null}))} style={{marginLeft:"auto",background:"transparent",border:"1.5px solid #e0e0e0",color:"#888",padding:"5px 10px",borderRadius:7,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>↩ Reopen</button>}
          {!isClient && !isCompleted_mobility && onEdit&&<button onClick={()=>{onClose();onEdit&&onEdit(session);}} style={{marginLeft:"auto",background:"transparent",border:"1.5px solid #ddd",color:"#555",padding:"5px 12px",borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Edit</button>}
        </div>
        <div style={{fontWeight:700,fontSize:19,letterSpacing:"-.02em",marginBottom:18}}>{fmtFull(session.date)}</div>
        {isCompleted_mobility ? (
          <>
            <CompletedSessionView
              method="mobility"
              coachPlan={session.plan?.gymData}
              clientLog={session.feedback?.clientGymData}
              coachComment={isClient ? undefined : fb.coachComment||""}
              onReply={isClient ? undefined : v=>setFb(p=>({...p,coachComment:v}))}
              saving={saving}
              onSave={isClient ? undefined : async()=>{setSaving(true);await onSave({...fb});setSaving(false);onClose();}}
            />
            {isClient && session.feedback?.coachComment && (
              <div style={{marginTop:16,background:"#e8f5e9",border:"1px solid #a5d6a7",borderRadius:10,padding:"14px 16px"}}>
                <div style={{fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"#2e7d32",marginBottom:6}}>💬 Coach's Feedback</div>
                <div style={{fontSize:14,color:"#1b5e20",lineHeight:1.65}}>{session.feedback.coachComment}</div>
              </div>
            )}
          </>
        ) : (
        <MobilityBuilder
          isClient={isClient}
          initialData={(() => {
            const cp = session.plan?.gymData || null;
            const cl = session.feedback?.clientGymData || null;
            if (isClient && cp && cl) {
              return { ...cp,
                sections: cp.sections?.map(sec => ({ ...sec,
                  blocks: sec.blocks?.map(blk => ({ ...blk,
                    exercises: blk.exercises?.map(ex => {
                      const logged = cl.sections?.flatMap(s=>s.blocks?.flatMap(b=>b.exercises||[])||[]).find(l=>l.id===ex.id);
                      return logged ? { ...ex, sets: logged.sets } : ex;
                    }) || [],
                  })) || [],
                })) || [],
                clientNotes: cl.clientNotes || "",
                rating: cl.rating || null,
              };
            }
            return cp;
          })()}
          onSave={async (data) => {
            setSaving(true);
            if (isClient) { await onSave({ ...fb, gymData:data, status: fb.status||"completed" }); }
            else { await onSave({ ...fb, gymData:data }); }
            setSaving(false); onClose();
          }}
        />
        )}
      </Modal>
    );
  }

  if (isDryEq) {
    const isCompleted_dry_eq = session.feedback?.status==="completed";
    return (
      <Modal onClose={onClose} wide>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
          <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:700,background:m.bg,color:m.text,border:`1px solid ${m.border}`}}>{m.emoji} {m.label}</span>
          <span style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:".06em",textTransform:"uppercase"}}>{isClient?(isCompleted_dry_eq?"Completed":"Athlete View"):(isCompleted_dry_eq?"Completed Session":"Coach View")}</span>
          {!isClient && isCompleted_dry_eq && fb.status && <button onClick={()=>setFb(p=>({...p,status:null}))} style={{marginLeft:"auto",background:"transparent",border:"1.5px solid #e0e0e0",color:"#888",padding:"5px 10px",borderRadius:7,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>↩ Reopen</button>}
          {!isClient && !isCompleted_dry_eq && onEdit&&<button onClick={()=>{onClose();onEdit&&onEdit(session);}} style={{marginLeft:"auto",background:"transparent",border:"1.5px solid #ddd",color:"#555",padding:"5px 12px",borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Edit</button>}
        </div>
        <div style={{fontWeight:700,fontSize:19,letterSpacing:"-.02em",marginBottom:18}}>{fmtFull(session.date)}</div>
        {isCompleted_dry_eq ? (
          <>
            <CompletedSessionView
              method="dry-eq"
              coachPlan={session.plan?.gymData}
              clientLog={session.feedback?.clientGymData}
              coachComment={isClient ? undefined : fb.coachComment||""}
              onReply={isClient ? undefined : v=>setFb(p=>({...p,coachComment:v}))}
              saving={saving}
              onSave={isClient ? undefined : async()=>{setSaving(true);await onSave({...fb});setSaving(false);onClose();}}
            />
            {isClient && session.feedback?.coachComment && (
              <div style={{marginTop:16,background:"#e8f5e9",border:"1px solid #a5d6a7",borderRadius:10,padding:"14px 16px"}}>
                <div style={{fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"#2e7d32",marginBottom:6}}>💬 Coach's Feedback</div>
                <div style={{fontSize:14,color:"#1b5e20",lineHeight:1.65}}>{session.feedback.coachComment}</div>
              </div>
            )}
          </>
        ) : (
        <DryEqBuilder
          isClient={isClient}
          initialData={(() => {
            const cp = session.plan?.gymData || null;
            const cl = session.feedback?.clientGymData || null;
            if (isClient && cp && cl) {
              return { ...cp,
                drills: cp.drills ? cp.drills.map(drill => {
                  const logged = cl.drills?.find(l => l.id === drill.id);
                  return logged ? { ...drill, log: logged.log } : drill;
                }) : [],
                clientNotes: cl.clientNotes || "",
                overallRating: cl.overallRating || null,
                focusAreas: cl.focusAreas || cp.focusAreas || [],
              };
            }
            return cp;
          })()}
          onSave={async (data) => {
            setSaving(true);
            if (isClient) { await onSave({ ...fb, gymData:data, status: fb.status||"completed" }); }
            else { await onSave({ ...fb, gymData:data }); }
            setSaving(false); onClose();
          }}
        />
        )}
      </Modal>
    );
  }

  if (isDepthSess) {
    const isCompleted = session.feedback?.status === "completed";
    const clientLog = session.feedback?.clientGymData || null;
    // Show completed view if status=completed (coach always, athlete always)
    const showCompletedView = isCompleted;

    return (
      <Modal onClose={onClose} wide>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
          <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:700,background:m.bg,color:m.text,border:`1px solid ${m.border}`}}>{m.emoji} {m.label}</span>
          <span style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:".06em",textTransform:"uppercase"}}>{isClient?"Athlete View": showCompletedView ? "Completed Session" : "Coach View"}</span>
          {!isClient && !showCompletedView && onEdit&&<button onClick={()=>{onClose();onEdit&&onEdit(session);}} style={{marginLeft:"auto",background:"transparent",border:"1.5px solid #ddd",color:"#555",padding:"5px 12px",borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Edit</button>}
          {!isClient && showCompletedView && (
            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:11,color:"#2e7d32",fontWeight:600,background:"#e8f5e9",padding:"4px 10px",borderRadius:20,border:"1px solid #a5d6a7"}}>✓ Athlete logged this session</span>
              {fb.status && <button onClick={()=>setFb(p=>({...p,status:null}))} style={{background:"transparent",border:"1.5px solid #e0e0e0",color:"#888",padding:"5px 10px",borderRadius:7,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>↩ Reopen</button>}
            </div>
          )}
        </div>
        <div style={{fontWeight:700,fontSize:19,letterSpacing:"-.02em",marginBottom:18}}>{fmtFull(session.date)}</div>

        {showCompletedView ? (
          <>
            <CompletedSessionView method="depth" coachPlan={session.plan?.gymData} clientLog={clientLog} onReply={v=>setFb(p=>({...p,coachComment:v}))} coachComment={fb.coachComment||""} saving={saving} onSave={async()=>{setSaving(true);await onSave({...fb});setSaving(false);onClose();}} />
            {/* Show coach reply to athlete */}
            {isClient && session.feedback?.coachComment && (
              <div style={{marginTop:16,background:"#e8f5e9",border:"1px solid #a5d6a7",borderRadius:10,padding:"14px 16px"}}>
                <div style={{fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"#2e7d32",marginBottom:6}}>💬 Coach's Feedback</div>
                <div style={{fontSize:14,color:"#1b5e20",lineHeight:1.65}}>{session.feedback.coachComment}</div>
              </div>
            )}

          </>
        ) : (
          <DepthBuilder
            isClient={isClient}
            initialData={(() => {
              const cp = session.plan?.gymData || null;
              const cl = session.feedback?.clientGymData || null;
              if (isClient && cp && cl) {
                return { ...cp,
                  dives: cp.dives ? cp.dives.map(dive => {
                    const logged = cl.dives?.find(l => l.id === dive.id);
                    return logged ? { ...dive, log: logged.log } : dive;
                  }) : [],
                  energyBefore: cl.energyBefore || null,
                  energyAfter: cl.energyAfter || null,
                  clientNotes: cl.clientNotes || "",
                  incident: cl.incident !== undefined ? cl.incident : null,
                };
              }
              return cp;
            })()}
            onSave={async (data) => {
              setSaving(true);
              if (isClient) { await onSave({ ...fb, gymData:data, status: fb.status||"completed" }); }
              else { await onSave({ ...fb, gymData:data }); }
              setSaving(false); onClose();
            }}
          />
        )}
      </Modal>
    );
  }

  if (isPool2) {
    const isCompleted_pool_co2 = session.feedback?.status==="completed";
    return (
      <Modal onClose={onClose} wide>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
          <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:700,background:m.bg,color:m.text,border:`1px solid ${m.border}`}}>{m.emoji} {m.label}</span>
          <span style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:".06em",textTransform:"uppercase"}}>{isClient?(isCompleted_pool_co2?"Completed":"Athlete View"):(isCompleted_pool_co2?"Completed Session":"Coach View")}</span>
          {!isClient && isCompleted_pool_co2 && fb.status && <button onClick={()=>setFb(p=>({...p,status:null}))} style={{marginLeft:"auto",background:"transparent",border:"1.5px solid #e0e0e0",color:"#888",padding:"5px 10px",borderRadius:7,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>↩ Reopen</button>}
          {!isClient && !isCompleted_pool_co2 && onEdit&&<button onClick={()=>{onClose();onEdit&&onEdit(session);}} style={{marginLeft:"auto",background:"transparent",border:"1.5px solid #ddd",color:"#555",padding:"5px 12px",borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Edit</button>}
        </div>
        <div style={{fontWeight:700,fontSize:19,letterSpacing:"-.02em",marginBottom:18}}>{fmtFull(session.date)}</div>
        {isCompleted_pool_co2 ? (
          <>
            <CompletedSessionView
              method="pool-co2"
              coachPlan={session.plan?.gymData}
              clientLog={session.feedback?.clientGymData}
              coachComment={isClient ? undefined : fb.coachComment||""}
              onReply={isClient ? undefined : v=>setFb(p=>({...p,coachComment:v}))}
              saving={saving}
              onSave={isClient ? undefined : async()=>{setSaving(true);await onSave({...fb});setSaving(false);onClose();}}
            />
            {isClient && session.feedback?.coachComment && (
              <div style={{marginTop:16,background:"#e8f5e9",border:"1px solid #a5d6a7",borderRadius:10,padding:"14px 16px"}}>
                <div style={{fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"#2e7d32",marginBottom:6}}>💬 Coach's Feedback</div>
                <div style={{fontSize:14,color:"#1b5e20",lineHeight:1.65}}>{session.feedback.coachComment}</div>
              </div>
            )}
          </>
        ) : (
        <PoolBuilder
          isClient={isClient}
          initialData={(() => {
            const cp = session.plan?.gymData || null;
            const cl = session.feedback?.clientGymData || null;
            if (isClient && cp && cl && cl.sections) {
              return { ...cp, sections: cp.sections.map(sec => ({ ...sec, blocks: sec.blocks.map(bl => {
                const logged = cl.sections?.flatMap(s => s.blocks || []).find(b => b.id === bl.id);
                return logged ? { ...bl, log: logged.log } : bl;
              })})), clientNotes: cl.clientNotes || "", rating: cl.rating || null };
            }
            return cp;
          })()}
          onSave={async (data) => {
            setSaving(true);
            if (isClient) { await onSave({ ...fb, gymData:data, status: fb.status||"completed" }); }
            else { await onSave({ ...fb, gymData:data }); }
            setSaving(false); onClose();
          }}
        />
        )}
      </Modal>
    );
  }

  if (isPool) {
    const isCompleted_pool_technique = session.feedback?.status==="completed";
    return (
      <Modal onClose={onClose} wide>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
          <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:700,background:m.bg,color:m.text,border:`1px solid ${m.border}`}}>{m.emoji} {m.label}</span>
          <span style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:".06em",textTransform:"uppercase"}}>{isClient?(isCompleted_pool_technique?"Completed":"Athlete View"):(isCompleted_pool_technique?"Completed Session":"Coach View")}</span>
          {!isClient && isCompleted_pool_technique && fb.status && <button onClick={()=>setFb(p=>({...p,status:null}))} style={{marginLeft:"auto",background:"transparent",border:"1.5px solid #e0e0e0",color:"#888",padding:"5px 10px",borderRadius:7,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>↩ Reopen</button>}
          {!isClient && !isCompleted_pool_technique && onEdit&&<button onClick={()=>{onClose();onEdit&&onEdit(session);}} style={{marginLeft:"auto",background:"transparent",border:"1.5px solid #ddd",color:"#555",padding:"5px 12px",borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>✏️ Edit</button>}
        </div>
        <div style={{fontWeight:700,fontSize:19,letterSpacing:"-.02em",marginBottom:18}}>{fmtFull(session.date)}</div>
        {isCompleted_pool_technique ? (
          <>
            <CompletedSessionView
              method="pool-technique"
              coachPlan={session.plan?.gymData}
              clientLog={session.feedback?.clientGymData}
              coachComment={isClient ? undefined : fb.coachComment||""}
              onReply={isClient ? undefined : v=>setFb(p=>({...p,coachComment:v}))}
              saving={saving}
              onSave={isClient ? undefined : async()=>{setSaving(true);await onSave({...fb});setSaving(false);onClose();}}
            />
            {isClient && session.feedback?.coachComment && (
              <div style={{marginTop:16,background:"#e8f5e9",border:"1px solid #a5d6a7",borderRadius:10,padding:"14px 16px"}}>
                <div style={{fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"#2e7d32",marginBottom:6}}>💬 Coach's Feedback</div>
                <div style={{fontSize:14,color:"#1b5e20",lineHeight:1.65}}>{session.feedback.coachComment}</div>
              </div>
            )}
          </>
        ) : (
        <PoolTechniqueBuilder
          isClient={isClient}
          initialData={(() => {
            const coachPlan = session.plan?.gymData || null;
            const clientLog = session.feedback?.clientGymData || null;
            if (isClient && coachPlan && clientLog && clientLog.exercises) {
              return { ...coachPlan, exercises: coachPlan.exercises.map(ex => {
                const logged = clientLog.exercises?.find(l => l.id === ex.id);
                return logged ? { ...ex, log: logged.log } : ex;
              }), clientNotes: clientLog.clientNotes || "", rating: clientLog.rating || null };
            }
            return coachPlan;
          })()}
          onSave={async (data) => {
            setSaving(true);
            if (isClient) { await onSave({ ...fb, gymData:data, status: fb.status||"completed" }); }
            else { await onSave({ ...fb, gymData:data }); }
            setSaving(false); onClose();
          }}
        />
        )}
      </Modal>
    );
  }

  // Gym strength sessions use the dedicated builder
  if (isGym) {
    const isCompleted_gym_strength = session.feedback?.status==="completed";
    return (
      <Modal onClose={onClose} wide>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
          <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:700,background:m.bg,color:m.text,border:`1px solid ${m.border}`}}>{m.emoji} {m.label}</span>
          <span style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:".06em",textTransform:"uppercase"}}>{isClient?(isCompleted_gym_strength?"Completed":"Athlete View"):(isCompleted_gym_strength?"Completed Session":"Coach View")}</span>
          {!isClient && isCompleted_gym_strength && fb.status && <button onClick={()=>setFb(p=>({...p,status:null}))} style={{marginLeft:"auto",background:"transparent",border:"1.5px solid #e0e0e0",color:"#888",padding:"5px 10px",borderRadius:7,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>↩ Reopen</button>}
          {!isClient && !isCompleted_gym_strength && onEdit && <button onClick={()=>{onClose();onEdit(session);}} style={{marginLeft:"auto",background:"transparent",border:"1.5px solid #ddd",color:"#555",padding:"5px 12px",borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Edit</button>}
        </div>
        <div style={{fontWeight:700,fontSize:19,letterSpacing:"-.02em",marginBottom:18}}>{fmtFull(session.date)}</div>
        {isCompleted_gym_strength ? (
          <>
            <CompletedSessionView
              method="gym-strength"
              coachPlan={session.plan?.gymData}
              clientLog={session.feedback?.clientGymData}
              coachComment={isClient ? undefined : fb.coachComment||""}
              onReply={isClient ? undefined : v=>setFb(p=>({...p,coachComment:v}))}
              saving={saving}
              onSave={isClient ? undefined : async()=>{setSaving(true);await onSave({...fb});setSaving(false);onClose();}}
            />
            {/* Show coach reply to athlete */}
            {isClient && session.feedback?.coachComment && (
              <div style={{marginTop:16,background:"#e8f5e9",border:"1px solid #a5d6a7",borderRadius:10,padding:"14px 16px"}}>
                <div style={{fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"#2e7d32",marginBottom:6}}>💬 Coach's Feedback</div>
                <div style={{fontSize:14,color:"#1b5e20",lineHeight:1.65}}>{session.feedback.coachComment}</div>
              </div>
            )}
          </>
        ) : (
        <GymStrengthBuilder
          isClient={isClient}
          initialData={(() => {
            const coachPlan = session.plan?.gymData || null;
            const clientLog = session.feedback?.clientGymData || null;
            if (isClient && coachPlan && clientLog) {
              return {
                ...coachPlan,
                sections: coachPlan.sections?.map(sec => ({
                  ...sec,
                  blocks: sec.blocks?.map(blk => ({
                    ...blk,
                    exercises: blk.exercises?.map(ex => {
                      const loggedEx = clientLog.sections?.flatMap(s=>s.blocks?.flatMap(b=>b.exercises||[])||[]).find(l=>l.id===ex.id);
                      return loggedEx ? { ...ex, sets: loggedEx.sets } : ex;
                    }) || [],
                  })) || [],
                })) || [],
                clientNotes: clientLog.clientNotes || "",
                rating: clientLog.rating || null,
              };
            }
            return coachPlan;
          })()}
          onSave={async (gymData) => {
            setSaving(true);
            if (isClient) {
              await onSave({ ...fb, gymData, status: fb.status||"completed" });
            } else {
              await onSave({ ...fb, gymData });
            }
            setSaving(false);
            onClose();
          }}
        />
        )}
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} wide>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
        <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:700,background:m.bg,color:m.text,border:`1px solid ${m.border}`}}>{m.emoji} {m.label}</span>
        <span style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:".06em",textTransform:"uppercase"}}>{isClient?"Athlete View":"Coach View"}</span>
        {!isClient&&onEdit&&(
          <button onClick={()=>{ onClose(); onEdit&&onEdit(session); }} style={{marginLeft:"auto",background:"transparent",color:"#1a1a1a",border:"1.5px solid #ddd",color:"#555",padding:"5px 12px",borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
            ✏️ Edit
          </button>
        )}
      </div>
      <div style={{fontWeight:700,fontSize:19,letterSpacing:"-.02em",marginBottom:14}}>{fmtFull(session.date)}</div>
      {isDepth&&session.plan?.targetDepth&&(
        <div style={{display:"flex",gap:10,marginBottom:16}}>
          <div style={{background:m.bg,border:`1px solid ${m.border}`,borderRadius:9,padding:"8px 16px",display:"inline-flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:11,fontWeight:700,color:m.text}}>🎯 TARGET</span>
            <span style={{fontFamily:"monospace",fontWeight:700,fontSize:18,color:m.text}}>{session.plan.targetDepth}m</span>
          </div>
          {session.plan.openLine&&<div style={{background:"#f5f4f0",color:"#1a1a1a",borderRadius:9,padding:"8px 14px",fontSize:12,fontWeight:700,color:"#666",display:"inline-flex",alignItems:"center"}}>Open Line</div>}
        </div>
      )}
      {session.plan?.warmup&&<div style={{background:"#f8f8f6",color:"#1a1a1a",borderRadius:10,padding:"13px 16px",marginBottom:10}}><div style={{fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"#bbb",marginBottom:6}}>Warm-up</div><div style={{fontSize:14,color:"#333",lineHeight:1.65}}>{session.plan.warmup}</div></div>}
      {session.plan?.mainSet&&<div style={{background:"#f8f8f6",color:"#1a1a1a",borderRadius:10,padding:"13px 16px",marginBottom:10}}><div style={{fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"#bbb",marginBottom:6}}>Main Set</div><div style={{fontSize:14,color:"#333",lineHeight:1.65}}>{session.plan.mainSet}</div></div>}
      {session.plan?.cooldown&&<div style={{background:"#f8f8f6",color:"#1a1a1a",borderRadius:10,padding:"13px 16px",marginBottom:10}}><div style={{fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"#bbb",marginBottom:6}}>Cool-down</div><div style={{fontSize:14,color:"#333",lineHeight:1.65}}>{session.plan.cooldown}</div></div>}
      {session.plan?.coachNotes&&<div style={{background:"#fffbe6",border:"1px solid #ffe082",borderRadius:10,padding:"13px 16px",marginBottom:14}}><div style={{fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"#a07a00",marginBottom:6}}>📌 Coach Notes</div><div style={{fontSize:14,color:"#5a4800",lineHeight:1.65}}>{session.plan.coachNotes}</div></div>}

      {/* Edit Plan button — coach can always edit plan */}
      {!isClient && (
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          <button onClick={()=>{ onClose(); }} style={{flex:1,background:"transparent",color:"#1a1a1a",border:"1.5px solid #ddd",color:"#666",padding:"10px",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Close</button>
          <button onClick={()=>{ onClose(); onEdit && onEdit(session); }}
            style={{flex:1,background:"#1a1a1a",color:"#fff",border:"none",padding:"10px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            ✏️ Edit Plan
          </button>
        </div>
      )}

      <div style={{borderTop:"2px solid #f0f0ec",paddingTop:20,marginTop:4}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:15}}>{isClient?"Your Feedback":"Client Feedback"}</div>
          {!isClient && fb.status && (
            <button onClick={()=>setFb(p=>({...p,status:null}))}
              style={{background:"transparent",border:"1.5px solid #e0e0e0",color:"#888",padding:"5px 12px",borderRadius:7,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
              ↩ Mark as incomplete
            </button>
          )}
        </div>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",color:"#bbb",marginBottom:9}}>Did you complete this session?</div>
        <div style={{display:"flex",gap:9,marginBottom:18}}>
          {[{key:"completed",label:"✓ Completed",bg:"#e8f5e9",bc:"#4caf50",tc:"#2e7d32"},{key:"partial",label:"~ Partial",bg:"#fff8e1",bc:"#ff9800",tc:"#e65100"},{key:"missed",label:"✗ Missed",bg:"#fce4ec",bc:"#ef5350",tc:"#c62828"}].map(opt=>{
            const sel=fb.status===opt.key;
            return <button key={opt.key} onClick={()=>setFb(p=>({...p,status:opt.key}))} style={{flex:1,padding:"10px",borderRadius:9,border:`2px solid ${sel?opt.bc:"#e0e0e0"}`,background:sel?opt.bg:"#fff",color:sel?opt.tc:"#aaa",fontWeight:sel?700:500,fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all .12s"}}>{opt.label}</button>;
          })}
        </div>
        {isDepth&&(
          <div style={{background:"#e8f0ff",border:"1px solid #b3c5f7",borderRadius:10,padding:"14px 16px",marginBottom:14}}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"#1a2fa3",marginBottom:12}}>🌊 Depth Details</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:10}}>
              <div><div style={{fontSize:12,fontWeight:600,color:"#444",marginBottom:6}}>Actual depth reached (m)</div><input style={{width:"100%",padding:"9px 12px",border:"1.5px solid #b3c5f7",borderRadius:8,fontSize:14,background:"#fff",outline:"none",fontFamily:"inherit",color:"#1a1a1a"}} type="number" placeholder={session.plan?.targetDepth?String(session.plan.targetDepth):"e.g. 65"} value={fb.actualDepth} onChange={e=>setFb(p=>({...p,actualDepth:e.target.value}))} /></div>
              <div style={{display:"flex",alignItems:"flex-end",paddingBottom:2}}><label style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer",fontSize:14,fontWeight:500,color:"#333"}}><input type="checkbox" checked={fb.earlyTurn} onChange={e=>setFb(p=>({...p,earlyTurn:e.target.checked}))} style={{width:17,height:17,accentColor:"#3a4df4",cursor:"pointer"}} />Early turn</label></div>
            </div>
            {fb.earlyTurn&&<div><div style={{fontSize:12,fontWeight:600,color:"#444",marginBottom:6}}>Where did you turn? (m)</div><input style={{width:"100%",padding:"9px 12px",border:"1.5px solid #b3c5f7",borderRadius:8,fontSize:14,background:"#fff",outline:"none",fontFamily:"inherit",color:"#1a1a1a"}} type="number" placeholder="e.g. 55" value={fb.earlyTurnDepth} onChange={e=>setFb(p=>({...p,earlyTurnDepth:e.target.value}))} /></div>}
          </div>
        )}
        <div style={{marginBottom:12}}><div style={{fontSize:12,fontWeight:600,color:"#444",marginBottom:6}}>How did you feel?</div><textarea style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:14,background:"#fff",outline:"none",resize:"vertical",minHeight:68,fontFamily:"inherit",color:"#1a1a1a"}} placeholder="Describe your physical and mental state..." value={fb.feeling} onChange={e=>setFb(p=>({...p,feeling:e.target.value}))} /></div>
        {(fb.status==="partial"||fb.status==="missed")&&<div style={{marginBottom:12}}><div style={{fontSize:12,fontWeight:600,color:"#c62828",marginBottom:6}}>What was the limiting factor?</div><textarea style={{width:"100%",padding:"10px 12px",border:"1.5px solid #ef9a9a",borderRadius:8,fontSize:14,background:"#fff",outline:"none",resize:"vertical",minHeight:68,fontFamily:"inherit",color:"#1a1a1a"}} placeholder="e.g. Early contractions, equalization, mental block..." value={fb.limitingFactor} onChange={e=>setFb(p=>({...p,limitingFactor:e.target.value}))} /></div>}
        <div style={{marginBottom:12}}><div style={{fontSize:12,fontWeight:600,color:"#444",marginBottom:6}}>Additional observations</div><textarea style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:14,background:"#fff",outline:"none",resize:"vertical",minHeight:68,fontFamily:"inherit",color:"#1a1a1a"}} placeholder="Anything else for your coach..." value={fb.clientNotes} onChange={e=>setFb(p=>({...p,clientNotes:e.target.value}))} /></div>
        {/* Incident report — shown to coach when athlete reported one */}
        {!isClient && session.feedback?.clientGymData?.incident && typeof session.feedback.clientGymData.incident === "object" && session.feedback.clientGymData.incident.types?.length > 0 && (
          <div style={{background:"#fff5f5",border:"2px solid #ef5350",borderRadius:10,padding:"14px 16px",marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:800,color:"#c62828",letterSpacing:".06em",textTransform:"uppercase",marginBottom:10}}>🚨 Incident Report from Athlete</div>
            {[
              {key:"lung_squeeze",label:"Lung Squeeze"},
              {key:"trachea_squeeze",label:"Trachea Squeeze"},
              {key:"samba",label:"Samba / Loss of Motor Control"},
              {key:"uw_blackout",label:"Underwater Blackout"},
              {key:"surface_blackout",label:"Surface Blackout"},
            ].filter(i=>session.feedback.clientGymData.incident.types.includes(i.key)).map(i=>(
              <div key={i.key} style={{marginBottom:6}}>
                <div style={{fontSize:13,fontWeight:700,color:"#c62828"}}>• {i.label}</div>
                {i.key==="uw_blackout"&&session.feedback.clientGymData.incident.details?.uw_depth&&(
                  <div style={{fontSize:12,color:"#555",marginLeft:14}}>Depth: {session.feedback.clientGymData.incident.details.uw_depth}m · Unconscious: {session.feedback.clientGymData.incident.details.uw_seconds||"?"}s</div>
                )}
                {i.key==="surface_blackout"&&session.feedback.clientGymData.incident.details?.surface_seconds&&(
                  <div style={{fontSize:12,color:"#555",marginLeft:14}}>Unconscious: {session.feedback.clientGymData.incident.details.surface_seconds}s</div>
                )}
              </div>
            ))}
            {session.feedback.clientGymData.incident.notes&&<div style={{fontSize:13,color:"#555",marginTop:8,paddingTop:8,borderTop:"1px solid #ef9a9a",lineHeight:1.6}}>{session.feedback.clientGymData.incident.notes}</div>}
          </div>
        )}
        {!isClient&&<div style={{background:"#f8f8f6",color:"#1a1a1a",borderRadius:10,padding:"13px 16px",marginBottom:14}}><div style={{fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"#aaa",marginBottom:8}}>Your reply to the athlete</div><textarea style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:14,background:"#fff",outline:"none",resize:"vertical",minHeight:68,fontFamily:"inherit",color:"#1a1a1a"}} placeholder="Leave feedback, encouragement or adjustments..." value={fb.coachComment} onChange={e=>setFb(p=>({...p,coachComment:e.target.value}))} /></div>}
        {isClient&&session.feedback?.coachComment&&<div style={{background:"#e8f5e9",border:"1px solid #a5d6a7",borderRadius:10,padding:"13px 16px",marginBottom:14}}><div style={{fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"#2e7d32",marginBottom:6}}>💬 Coach's Response</div><div style={{fontSize:14,color:"#1b5e20",lineHeight:1.65}}>{session.feedback.coachComment}</div></div>}
        <div style={{display:"flex",gap:10}}>
          <button onClick={handleSave} disabled={saving} style={{background:"#1a1a1a",color:"#fff",border:"none",padding:"11px 22px",borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:saving?0.6:1}}>{saving?"Saving...":"Save Feedback"}</button>
          <button onClick={onClose} style={{background:"transparent",color:"#1a1a1a",border:"1.5px solid #ddd",color:"#444",padding:"10px 20px",borderRadius:8,fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Close</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Assign Modal ──────────────────────────────────────────────────────────────
function AssignModal({ date, clientName, onClose, onSave, existingSessions }) {
  const [method, setMethod] = useState("depth");
  const [plan, setPlan] = useState({warmup:"",mainSet:"",cooldown:"",targetDepth:"",openLine:false,coachNotes:""});
  const [saving, setSaving] = useState(false);
  const [templateSession, setTemplateSession] = useState(null);
  const [templateConfirmed, setTemplateConfirmed] = useState(false);
  const isDepth = method==="depth";
  const isGym    = method==="gym-strength";
  const isStatic = method==="static";
  const isPool    = method==="pool-technique";
  const isPool2      = method==="pool-co2";
  const isDepthSess  = method==="depth";
  const isDryEq      = method==="dry-eq";
  const isMobility   = method==="mobility";
  const hasBuilder = isGym||isStatic||isPool||isPool2||isDepthSess||isDryEq||isMobility;
  const prevSessions = existingSessions ? existingSessions.filter(s=>s.method===method).slice(-5).reverse() : [];
  const needsTemplate = hasBuilder && prevSessions.length>0 && !templateConfirmed;

  async function handleSave() { setSaving(true); await onSave({method, plan:{...plan, targetDepth:plan.targetDepth?Number(plan.targetDepth):null}}); setSaving(false); }

  return (
    <Modal onClose={onClose} wide>
      <div style={{fontWeight:700,fontSize:18,marginBottom:4,letterSpacing:"-.02em"}}>Plan Session</div>
      <div style={{fontSize:13,color:"#999",marginBottom:20}}>{clientName} · {fmtFull(date)}</div>
      <div style={{fontSize:11,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",color:"#bbb",marginBottom:10}}>Training Method</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:20}}>
        {METHODS.map(m=>{const sel=method===m.key;return(
          <button key={m.key} onClick={()=>setMethod(m.key)} style={{borderRadius:10,padding:"10px 8px",border:`2px solid ${sel?m.dot:"#e8e8e8"}`,background:sel?m.bg:"#fff",color:sel?m.text:"#aaa",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:5,transition:"all .12s"}}>
            <span style={{fontSize:20}}>{m.emoji}</span><span style={{lineHeight:1.3,textAlign:"center"}}>{m.label}</span>
          </button>
        );})}
      </div>
      {/* Template suggester — shown when coach has previous sessions of same type */}
      {needsTemplate && (
        <div style={{background:"#f0f7ff",border:"1px solid #c0d8f0",borderLeft:"3px solid #3a8ef4",borderRadius:10,padding:"14px 16px",marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:700,color:"#005fa3",letterSpacing:".06em",textTransform:"uppercase",marginBottom:10}}>
            Use a previous session as template?
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:12}}>
            {prevSessions.map(s=>{
              const m=gm(s.method);
              const isSelected = templateSession?.id===s.id;
              const label = s.plan?.gymData?.sessionName || s.plan?.gymData?.name || s.plan?.mainSet?.slice(0,40) || fmtFull(s.date);
              const subLabel = s.method==="depth"
                ? (s.plan?.gymData?.dives?.length||0)+" dives"
                : s.method==="gym-strength"||s.method==="mobility"
                ? (s.plan?.gymData?.sections?.reduce((a,sec)=>a+sec.blocks?.reduce((b,bl)=>b+bl.exercises?.length||0,0),0)||0)+" exercises"
                : s.method==="pool-co2"
                ? (s.plan?.gymData?.totalMeters||"")+"m total"
                : s.plan?.gymData?.drills?.length
                ? (s.plan.gymData.drills.length)+" drills"
                : s.plan?.gymData?.exercises?.length
                ? (s.plan.gymData.exercises.length)+" exercises"
                : "";
              return (
                <div key={s.id} onClick={()=>setTemplateSession(isSelected?null:s)}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:8,border:`1.5px solid ${isSelected?"#3a8ef4":"#c0d8f0"}`,background:isSelected?"#dbeeff":"#fff",cursor:"pointer",transition:"all .12s"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:m.dot,flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:500,color:"#1a1a1a"}}>{fmtFull(s.date)}</div>
                    {label&&label!==fmtFull(s.date)&&<div style={{fontSize:11,color:"#555",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:320}}>{label}</div>}
                    {subLabel&&<div style={{fontSize:11,color:"#3a8ef4",fontWeight:600,marginTop:1}}>{subLabel}</div>}
                  </div>
                  {isSelected&&<span style={{fontSize:12,color:"#3a8ef4",fontWeight:700}}>Selected ✓</span>}
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{setTemplateSession(null);setTemplateConfirmed(true);}}
              style={{flex:1,padding:"9px",borderRadius:8,border:"1.5px solid #c0d8f0",background:"#fff",color:"#666",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
              Start from scratch
            </button>
            <button onClick={()=>{ if(templateSession) setTemplateConfirmed(true); }}
              disabled={!templateSession}
              style={{flex:1,padding:"9px",borderRadius:8,border:"none",background:templateSession?"#1a1a1a":"#ccc",color:"#fff",fontSize:13,fontWeight:600,cursor:templateSession?"pointer":"default",fontFamily:"inherit",transition:"all .15s"}}>
              Use this template →
            </button>
          </div>
        </div>
      )}

      {/* Mobility — full builder */}
      {!needsTemplate && isMobility && (
        <MobilityBuilder
          isClient={false}
          initialData={templateSession?.plan?.gymData || null}
          onSave={async (data) => {
            setSaving(true);
            await onSave({ method, plan:{ ...plan, gymData: data } });
            setSaving(false); onClose();
          }}
        />
      )}

      {/* Dry Eq — full builder */}
      {!needsTemplate && isDryEq && (
        <DryEqBuilder
          isClient={false}
          initialData={templateSession?.plan?.gymData || null}
          onSave={async (data) => {
            setSaving(true);
            await onSave({ method, plan:{ ...plan, gymData: data } });
            setSaving(false); onClose();
          }}
        />
      )}

      {/* Depth — full builder */}
      {!needsTemplate && isDepthSess && (
        <DepthBuilder
          isClient={false}
          initialData={templateSession?.plan?.gymData || null}
          onSave={async (data) => {
            setSaving(true);
            await onSave({ method, plan:{ ...plan, gymData: data } });
            setSaving(false); onClose();
          }}
        />
      )}

      {/* Pool — full builder */}
      {!needsTemplate && isPool2 && (
        <PoolBuilder
          isClient={false}
          initialData={templateSession?.plan?.gymData || null}
          onSave={async (data) => {
            setSaving(true);
            await onSave({ method, plan:{ ...plan, gymData: data } });
            setSaving(false); onClose();
          }}
        />
      )}

      {/* Pool Technique — full builder */}
      {!needsTemplate && isPool && (
        <PoolTechniqueBuilder
          isClient={false}
          initialData={templateSession?.plan?.gymData || null}
          onSave={async (data) => {
            setSaving(true);
            await onSave({ method, plan:{ ...plan, gymData: data } });
            setSaving(false); onClose();
          }}
        />
      )}

      {/* Static — full builder */}
      {!needsTemplate && isStatic && (
        <StaticBuilder
          isClient={false}
          initialData={templateSession?.plan?.gymData || null}
          onSave={async (data) => {
            setSaving(true);
            await onSave({ method, plan:{ ...plan, gymData: data } });
            setSaving(false);
            onClose();
          }}
        />
      )}

      {/* Gym strength — full builder */}
      {!needsTemplate && isGym && (
        <GymStrengthBuilder
          isClient={false}
          initialData={templateSession?.plan?.gymData || null}
          onSave={async (gymData) => {
            setSaving(true);
            await onSave({ method, plan:{ ...plan, gymData } });
            setSaving(false);
            onClose();
          }}
        />
      )}

      {/* All other methods — text fields */}
      {!needsTemplate && !isGym && !isStatic && !isPool && !isPool2 && !isDepthSess && !isDryEq && !isMobility && (<>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
          <div><div style={{fontSize:11,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",color:"#bbb",marginBottom:8}}>Warm-up</div><textarea style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:14,background:"#fff",outline:"none",resize:"vertical",minHeight:80,fontFamily:"inherit",color:"#1a1a1a"}} placeholder="e.g. 3×FRC to 20m..." value={plan.warmup} onChange={e=>setPlan(p=>({...p,warmup:e.target.value}))} /></div>
          <div><div style={{fontSize:11,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",color:"#bbb",marginBottom:8}}>Cool-down</div><textarea style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:14,background:"#fff",outline:"none",resize:"vertical",minHeight:80,fontFamily:"inherit",color:"#1a1a1a"}} placeholder="e.g. 2 easy hangs..." value={plan.cooldown} onChange={e=>setPlan(p=>({...p,cooldown:e.target.value}))} /></div>
        </div>
        <div style={{marginBottom:14}}><div style={{fontSize:11,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",color:"#bbb",marginBottom:8}}>Main Set</div><textarea style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:14,background:"#fff",outline:"none",resize:"vertical",minHeight:90,fontFamily:"inherit",color:"#1a1a1a"}} placeholder="Describe the main training block..." value={plan.mainSet} onChange={e=>setPlan(p=>({...p,mainSet:e.target.value}))} /></div>
        {isDepth&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
          <div><div style={{fontSize:11,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",color:"#bbb",marginBottom:8}}>Target Depth (m)</div><input type="number" placeholder="e.g. 68" style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:14,background:"#fff",outline:"none",fontFamily:"inherit",color:"#1a1a1a"}} value={plan.targetDepth} onChange={e=>setPlan(p=>({...p,targetDepth:e.target.value}))} /></div>
          <div style={{display:"flex",alignItems:"flex-end",paddingBottom:4}}><label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontSize:14,fontWeight:500,color:"#333"}}><input type="checkbox" checked={plan.openLine} onChange={e=>setPlan(p=>({...p,openLine:e.target.checked}))} style={{width:17,height:17,accentColor:"#3a4df4",cursor:"pointer"}} />Open line session</label></div>
        </div>}
        <div style={{marginBottom:20}}><div style={{fontSize:11,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",color:"#bbb",marginBottom:8}}>Coach Notes</div><textarea style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:14,background:"#fff",outline:"none",resize:"vertical",minHeight:72,fontFamily:"inherit",color:"#1a1a1a"}} placeholder="Tips, mental cues, safety reminders..." value={plan.coachNotes} onChange={e=>setPlan(p=>({...p,coachNotes:e.target.value}))} /></div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={handleSave} disabled={saving} style={{background:"#1a1a1a",color:"#fff",border:"none",padding:"11px 22px",borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:saving?0.6:1}}>{saving?"Saving...":"Save Session Plan"}</button>
          <button onClick={onClose} style={{background:"transparent",color:"#1a1a1a",border:"1.5px solid #ddd",color:"#444",padding:"10px 20px",borderRadius:8,fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
        </div>
      </>)}
    </Modal>
  );
}

// ── Add Client Modal ──────────────────────────────────────────────────────────
// Compress image to max 200x200px
function compressImage(file, callback) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const MAX = 200;
      const scale = Math.min(MAX/img.width, MAX/img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      callback(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function AddClientModal({ onClose, onSave, initialClient, isEditing }) {
  const [form, setForm] = useState(initialClient || {name:"",age:"",level:"Competitive",goal:"",email:"",password:"",pb:{CWT:"",STA:"",DYN:""},planType:"weeks",planWeeks:"",planStartDate:"",competitionDate:"",competitionName:"",avatarUrl:""});
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(initialClient?.avatarUrl || null);

  function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    compressImage(file, url => {
      setAvatarPreview(url);
      setForm(p => ({...p, avatarUrl: url}));
    });
  }

  async function handleSave() {
    if (!form.name) return;
    if (!isEditing && (!form.email||!form.password)) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch(e) {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div style={{fontWeight:700,fontSize:18,marginBottom:20,letterSpacing:"-.02em"}}>{isEditing?"Edit Client":"New Client"}</div>
      <div style={{display:"flex",flexDirection:"column",gap:13}}>

        {/* Avatar upload */}
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:64,height:64,borderRadius:"50%",background:"#f0f0ec",border:"2px solid #e0e0e0",overflow:"hidden",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {avatarPreview
              ? <img src={avatarPreview} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="avatar"/>
              : <span style={{fontSize:24,color:"#bbb"}}>👤</span>
            }
          </div>
          <div>
            <div style={{fontSize:12,fontWeight:600,color:"#666",marginBottom:5}}>Profile Photo</div>
            <label style={{display:"inline-block",padding:"7px 14px",background:"#f0f0ec",borderRadius:8,fontSize:12,fontWeight:600,color:"#555",cursor:"pointer"}}>
              Upload Photo
              <input type="file" accept="image/*" onChange={handleAvatarChange} style={{display:"none"}} />
            </label>
            {avatarPreview && <button onClick={()=>{setAvatarPreview(null);setForm(p=>({...p,avatarUrl:""}));}} style={{marginLeft:8,background:"none",border:"none",fontSize:12,color:"#c0392b",cursor:"pointer"}}>Remove</button>}
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><div style={{fontSize:12,fontWeight:600,color:"#666",marginBottom:6}}>Full Name</div><input style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:14,outline:"none",fontFamily:"inherit",color:"#1a1a1a"}} placeholder="Name" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} /></div>
          <div><div style={{fontSize:12,fontWeight:600,color:"#666",marginBottom:6}}>Age</div><input type="number" style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:14,outline:"none",fontFamily:"inherit",color:"#1a1a1a"}} placeholder="Age" value={form.age} onChange={e=>setForm(p=>({...p,age:e.target.value}))} /></div>
        </div>
        <div><div style={{fontSize:12,fontWeight:600,color:"#666",marginBottom:6}}>Level</div><select style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:14,outline:"none",fontFamily:"inherit",background:"#fff",color:"#1a1a1a"}} value={form.level} onChange={e=>setForm(p=>({...p,level:e.target.value}))}>{["Beginner","Intermediate","Advanced","Competitive"].map(l=><option key={l}>{l}</option>)}</select></div>
        <div><div style={{fontSize:12,fontWeight:600,color:"#666",marginBottom:6}}>Goal</div><input style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:14,outline:"none",fontFamily:"inherit",color:"#1a1a1a"}} placeholder="e.g. Break -80m CWT" value={form.goal} onChange={e=>setForm(p=>({...p,goal:e.target.value}))} /></div>

        {/* Login details — show email when editing, full form when creating */}
        {isEditing && initialClient?.email && (
          <div style={{background:"#f8f8f6",border:"1px solid #e0e0e0",borderRadius:10,padding:"12px 16px"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#888",letterSpacing:".06em",textTransform:"uppercase",marginBottom:6}}>Login Email</div>
            <div style={{fontSize:14,color:"#1a1a1a",fontWeight:500}}>{initialClient.email}</div>
            <div style={{fontSize:11,color:"#aaa",marginTop:4}}>Share this with your client if they forget their login details.</div>
          </div>
        )}
        {!isEditing&&(
          <div style={{background:"#f0f7ff",border:"1px solid #c0d8f0",borderRadius:10,padding:"14px 16px"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#005fa3",letterSpacing:".06em",textTransform:"uppercase",marginBottom:12}}>🔐 Client Login Details</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div><div style={{fontSize:12,fontWeight:600,color:"#444",marginBottom:6}}>Email</div><input type="email" style={{width:"100%",padding:"10px 12px",border:"1.5px solid #c0d8f0",borderRadius:8,fontSize:14,outline:"none",fontFamily:"inherit",color:"#1a1a1a"}} placeholder="client@email.com" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} /></div>
              <div><div style={{fontSize:12,fontWeight:600,color:"#444",marginBottom:6}}>Password</div><input type="text" style={{width:"100%",padding:"10px 12px",border:"1.5px solid #c0d8f0",borderRadius:8,fontSize:14,outline:"none",fontFamily:"inherit",color:"#1a1a1a"}} placeholder="Set a password" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} /></div>
            </div>
            <div style={{fontSize:11,color:"#666",marginTop:8}}>Share these credentials with your client so they can log in.</div>
          </div>
        )}
        <div style={{fontSize:11,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",color:"#bbb",marginTop:4}}>Personal Bests</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          {[["CWT (m)","CWT","number"],["STA (m:ss)","STA","text"],["DYN (m)","DYN","number"]].map(([label,key,type])=>(
            <div key={key}><div style={{fontSize:12,fontWeight:600,color:"#666",marginBottom:6}}>{label}</div><input type={type} style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:14,outline:"none",fontFamily:"inherit",color:"#1a1a1a"}} placeholder="—" value={form.pb[key]} onChange={e=>setForm(p=>({...p,pb:{...p.pb,[key]:e.target.value}}))} /></div>
          ))}
        </div>
        {/* Timeline */}
        <div style={{background:"#f0f7ff",border:"1px solid #c0d8f0",borderRadius:10,padding:"14px 16px"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#005fa3",letterSpacing:".06em",textTransform:"uppercase",marginBottom:12}}>📅 Training Timeline</div>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            {[["weeks","📆 X-Week Plan"],["competition","🏆 Competition Date"]].map(([k,l])=>(
              <button key={k} onClick={()=>setForm(p=>({...p,planType:k}))}
                style={{flex:1,padding:"8px",borderRadius:8,border:`2px solid ${form.planType===k?"#3a8ef4":"#c0d8f0"}`,background:form.planType===k?"#dbeeff":"#fff",color:form.planType===k?"#005fa3":"#888",fontWeight:form.planType===k?700:500,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                {l}
              </button>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:"#444",marginBottom:5}}>Start Date</div>
              <input type="date" style={{width:"100%",padding:"8px 10px",border:"1.5px solid #c0d8f0",borderRadius:7,fontSize:13,fontFamily:"inherit",outline:"none",color:"#1a1a1a"}}
                value={form.planStartDate} onChange={e=>setForm(p=>({...p,planStartDate:e.target.value}))} />
            </div>
            {form.planType==="weeks" ? (
              <div>
                <div style={{fontSize:11,fontWeight:600,color:"#444",marginBottom:5}}>Number of weeks</div>
                <input type="number" placeholder="e.g. 8" style={{width:"100%",padding:"8px 10px",border:"1.5px solid #c0d8f0",borderRadius:7,fontSize:13,fontFamily:"inherit",outline:"none",color:"#1a1a1a"}}
                  value={form.planWeeks} onChange={e=>setForm(p=>({...p,planWeeks:e.target.value}))} />
              </div>
            ) : (
              <div>
                <div style={{fontSize:11,fontWeight:600,color:"#444",marginBottom:5}}>Competition date</div>
                <input type="date" style={{width:"100%",padding:"8px 10px",border:"1.5px solid #c0d8f0",borderRadius:7,fontSize:13,fontFamily:"inherit",outline:"none",color:"#1a1a1a"}}
                  value={form.competitionDate} onChange={e=>setForm(p=>({...p,competitionDate:e.target.value}))} />
              </div>
            )}
          </div>
          {form.planType==="competition" && (
            <div style={{marginTop:10}}>
              <div style={{fontSize:11,fontWeight:600,color:"#444",marginBottom:5}}>Competition name</div>
              <input placeholder="e.g. AIDA World Cup 2026" style={{width:"100%",padding:"8px 10px",border:"1.5px solid #c0d8f0",borderRadius:7,fontSize:13,fontFamily:"inherit",outline:"none",color:"#1a1a1a"}}
                value={form.competitionName} onChange={e=>setForm(p=>({...p,competitionName:e.target.value}))} />
            </div>
          )}
        </div>

        <div style={{display:"flex",gap:10,paddingTop:4}}>
          <button onClick={handleSave} disabled={saving} style={{background:"#1a1a1a",color:"#fff",border:"none",padding:"11px 22px",borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:saving?0.6:1}}>{saving ? (isEditing?"Saving...":"Creating...") : (isEditing?"Save Changes":"Add Client")}</button>
          <button onClick={onClose} style={{background:"transparent",color:"#1a1a1a",border:"1.5px solid #ddd",color:"#444",padding:"10px 20px",borderRadius:8,fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Add Coach Modal ───────────────────────────────────────────────────────────
function AddCoachModal({ onClose, onSave }) {
  const [form, setForm] = useState({name:"",email:"",password:""});
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.email||!form.password) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose(); // close modal after successful save
    } catch(e) {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div style={{fontWeight:700,fontSize:18,marginBottom:6,letterSpacing:"-.02em"}}>Add New Coach</div>
      <div style={{fontSize:13,color:"#999",marginBottom:20}}>Create a coach account — they'll only see their own clients.</div>
      <div style={{display:"flex",flexDirection:"column",gap:13}}>
        <div><div style={{fontSize:12,fontWeight:600,color:"#666",marginBottom:6}}>Name</div><input style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:14,outline:"none",fontFamily:"inherit",color:"#1a1a1a"}} placeholder="Coach name" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} /></div>
        <div><div style={{fontSize:12,fontWeight:600,color:"#666",marginBottom:6}}>Email</div><input type="email" style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:14,outline:"none",fontFamily:"inherit",color:"#1a1a1a"}} placeholder="coach@email.com" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} /></div>
        <div><div style={{fontSize:12,fontWeight:600,color:"#666",marginBottom:6}}>Password</div><input type="text" style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:14,outline:"none",fontFamily:"inherit",color:"#1a1a1a"}} placeholder="Set a password" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} /></div>
        <div style={{display:"flex",gap:10,paddingTop:4}}>
          <button onClick={handleSave} disabled={saving} style={{background:"#1a1a1a",color:"#fff",border:"none",padding:"11px 22px",borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:saving?0.6:1}}>{saving?"Creating...":"Create Coach Account"}</button>
          <button onClick={onClose} style={{background:"transparent",color:"#1a1a1a",border:"1.5px solid #ddd",color:"#444",padding:"10px 20px",borderRadius:8,fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Timeline helper components ───────────────────────────────────────────────
function TimelineBadge({ client }) {
  const tl = getTimeline(client);
  if (!tl) return null;
  return (
    <div style={{fontSize:12,fontWeight:600,marginTop:4,color:tl.isPast?"#ef5350":tl.type==="competition"?"#3a8ef4":"#4caf50"}}>
      {tl.isPast ? `${tl.label} ended`
        : tl.type==="competition" ? `🏆 Week ${tl.currentWeek}${tl.totalWeeks?` of ${tl.totalWeeks}`:""} · ${tl.daysLeft}d to ${tl.label}`
        : `📆 Week ${tl.currentWeek} of ${tl.totalWeeks} · ${tl.weeksLeft} week${tl.weeksLeft!==1?"s":""} remaining`}
    </div>
  );
}

function TimelineBadgeClient({ client }) {
  const tl = getTimeline(client);
  if (!tl || tl.isPast) return null;
  return (
    <div style={{marginTop:6,display:"inline-flex",alignItems:"center",gap:8,background:tl.type==="competition"?"#e8f0ff":"#e8f5e9",borderRadius:8,padding:"5px 12px"}}>
      <span style={{fontSize:12,fontWeight:700,color:tl.type==="competition"?"#1a2fa3":"#2e7d32"}}>
        {tl.type==="competition" ? `🏆 ${tl.daysLeft} days to ${tl.label}` : `📆 Week ${tl.currentWeek} of ${tl.totalWeeks}`}
      </span>
    </div>
  );
}

function ClientCard({ client, done, pending, sessions, onClick }) {
  const tl = getTimeline(client);
  const needsReply = sessions.filter(s=>s.feedback?.status==="completed" && s.feedback?.clientGymData && !s.feedback?.coachComment).length;
  return (
    <div style={{background:"#fff",borderRadius:12,border:"1px solid #ebebeb",overflow:"hidden",cursor:"pointer",transition:"box-shadow .15s"}}
      onClick={onClick}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,.07)"}
      onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
      {tl && (
        <div style={{height:4,background:"#f0f0f0",color:"#1a1a1a",overflow:"hidden"}}>
          <div style={{height:"100%",width:`${tl.progress||0}%`,background:tl.isPast?"#ef5350":tl.type==="competition"?"#3a8ef4":"#4caf50",transition:"width .3s"}}/>
        </div>
      )}
      <div style={{padding:"16px 22px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:42,height:42,borderRadius:"50%",background:"#f0f0ec",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:17,color:"#555",overflow:"hidden",flexShrink:0}}>{client.avatarUrl ? <img src={client.avatarUrl} style={{width:"100%",height:"100%",objectFit:"cover"}} alt={client.name}/> : client.name.charAt(0)}</div>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{fontWeight:600,fontSize:15}}>{client.name}</div>
              {needsReply > 0 && <span style={{fontSize:11,fontWeight:700,background:"#fff8e1",color:"#e65100",border:"1px solid #ffcc02",borderRadius:20,padding:"2px 8px"}}>💬 {needsReply} to reply</span>}
            </div>
            <div style={{fontSize:12,color:"#999",marginTop:2}}>{client.level} · {client.goal}</div>
            {tl && (
              <div style={{fontSize:11,marginTop:4,fontWeight:600,color:tl.isPast?"#ef5350":tl.type==="competition"?"#3a8ef4":"#4caf50"}}>
                {tl.isPast ? `${tl.label} — ended`
                  : tl.type==="competition" ? `🏆 ${tl.label} · ${tl.daysLeft}d left (Week ${tl.currentWeek}${tl.totalWeeks?` of ${tl.totalWeeks}`:""})`
                  : `📆 Week ${tl.currentWeek} of ${tl.totalWeeks} · ${tl.weeksLeft}w left`}
              </div>
            )}
            <div style={{display:"flex",gap:4,marginTop:5}}>{sessions.slice(0,8).map(s=>{const m=gm(s.method);return<div key={s.id} title={m.label} style={{width:9,height:9,borderRadius:"50%",background:m.dot}}/>;})}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:24}}>
          <div style={{textAlign:"center"}}><div style={{fontSize:11,color:"#bbb",fontWeight:600}}>DONE</div><div style={{fontWeight:700,fontFamily:"monospace",color:"#2e7d32",fontSize:18}}>{done}</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:11,color:"#bbb",fontWeight:600}}>PENDING</div><div style={{fontWeight:700,fontFamily:"monospace",color:"#aaa",fontSize:18}}>{pending}</div></div>
          <span style={{color:"#ccc",fontSize:18}}>›</span>
        </div>
      </div>
    </div>
  );
}

// ── Edit Session Modal ───────────────────────────────────────────────────────
function EditSessionModal({ session, onClose, onSave, onSaveText }) {
  const m = gm(session.method);
  const isGymEdit    = session.method==="gym-strength";
  const isStaticEdit = session.method==="static";
  return (
    <Modal onClose={onClose} wide>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
        <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:700,background:m.bg,color:m.text,border:`1px solid ${m.border}`}}>{m.emoji} {m.label}</span>
        <span style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:".06em",textTransform:"uppercase"}}>Edit Plan</span>
      </div>
      <div style={{fontWeight:700,fontSize:18,letterSpacing:"-.02em",marginBottom:18}}>{fmtFull(session.date)}</div>
      {isStaticEdit && <StaticBuilder isClient={false} initialData={session.plan?.gymData||null} onSave={async data=>{ await onSave(session.id, data); onClose(); }} />}
      {session.method==="pool-technique" && <PoolTechniqueBuilder isClient={false} initialData={session.plan?.gymData||null} onSave={async data=>{ await onSave(session.id, data); onClose(); }} />}
      {session.method==="pool-co2" && <PoolBuilder isClient={false} initialData={session.plan?.gymData||null} onSave={async data=>{ await onSave(session.id, data); onClose(); }} />}
      {session.method==="depth" && <DepthBuilder isClient={false} initialData={session.plan?.gymData||null} onSave={async data=>{ await onSave(session.id, data); onClose(); }} />}
      {session.method==="dry-eq"   && <DryEqBuilder    isClient={false} initialData={session.plan?.gymData||null} onSave={async data=>{ await onSave(session.id, data); onClose(); }} />}
      {session.method==="mobility"  && <MobilityBuilder isClient={false} initialData={session.plan?.gymData||null} onSave={async data=>{ await onSave(session.id, data); onClose(); }} />}
      {isGymEdit    && <GymStrengthBuilder isClient={false} initialData={session.plan?.gymData||null} onSave={async data=>{ await onSave(session.id, data); onClose(); }} />}
      {!isStaticEdit && !isGymEdit && <EditPlanForm session={session} onSave={plan=>onSaveText(session,plan)} onClose={onClose} />}
    </Modal>
  );
}

// ── Edit Plan Form (for depth/pool/cardio text-based sessions) ───────────────
function EditPlanForm({ session, onSave, onClose }) {
  const isDepth = session.method==="depth";
  const [plan, setPlan] = useState({
    warmup: session.plan?.warmup||"",
    mainSet: session.plan?.mainSet||"",
    cooldown: session.plan?.cooldown||"",
    targetDepth: session.plan?.targetDepth||"",
    openLine: session.plan?.openLine||false,
    coachNotes: session.plan?.coachNotes||"",
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() { setSaving(true); await onSave(plan); setSaving(false); }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div><div style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:".06em",textTransform:"uppercase",marginBottom:7}}>Warm-up</div>
          <textarea value={plan.warmup} onChange={e=>setPlan(p=>({...p,warmup:e.target.value}))} style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none",resize:"vertical",minHeight:72,color:"#1a1a1a"}} placeholder="Warm-up..." /></div>
        <div><div style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:".06em",textTransform:"uppercase",marginBottom:7}}>Cool-down</div>
          <textarea value={plan.cooldown} onChange={e=>setPlan(p=>({...p,cooldown:e.target.value}))} style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none",resize:"vertical",minHeight:72,color:"#1a1a1a"}} placeholder="Cool-down..." /></div>
      </div>
      <div><div style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:".06em",textTransform:"uppercase",marginBottom:7}}>Main Set</div>
        <textarea value={plan.mainSet} onChange={e=>setPlan(p=>({...p,mainSet:e.target.value}))} style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none",resize:"vertical",minHeight:90,color:"#1a1a1a"}} placeholder="Main set..." /></div>
      {isDepth&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div><div style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:".06em",textTransform:"uppercase",marginBottom:7}}>Target Depth (m)</div>
            <input type="number" value={plan.targetDepth} onChange={e=>setPlan(p=>({...p,targetDepth:e.target.value}))} style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none",color:"#1a1a1a"}} placeholder="e.g. 68" /></div>
          <div style={{display:"flex",alignItems:"flex-end",paddingBottom:4}}><label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontSize:14,fontWeight:500,color:"#333"}}><input type="checkbox" checked={plan.openLine} onChange={e=>setPlan(p=>({...p,openLine:e.target.checked}))} style={{width:17,height:17,accentColor:"#3a4df4"}} />Open line</label></div>
        </div>
      )}
      <div><div style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:".06em",textTransform:"uppercase",marginBottom:7}}>Coach Notes</div>
        <textarea value={plan.coachNotes} onChange={e=>setPlan(p=>({...p,coachNotes:e.target.value}))} style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none",resize:"vertical",minHeight:60,color:"#1a1a1a"}} placeholder="Tips, cues, safety notes..." /></div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={handleSave} disabled={saving} style={{background:"#1a1a1a",color:"#fff",border:"none",padding:"11px 22px",borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:saving?0.6:1}}>{saving?"Saving...":"Save Changes"}</button>
        <button onClick={onClose} style={{background:"transparent",color:"#1a1a1a",border:"1.5px solid #ddd",color:"#444",padding:"10px 20px",borderRadius:8,fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
      </div>
    </div>
  );
}


// ── Generate Week PDF ─────────────────────────────────────────────────────────
function generateWeekPDF(weekDates, sessions, clientName, coachName) {
  const METHODS = {
    "gym-strength":  { label:"Gym Strength",   emoji:"🏋️" },
    "pool-technique":{ label:"Pool Technique",  emoji:"🏊" },
    "pool-co2":      { label:"Pool",            emoji:"💧" },
    "gym-cardio":    { label:"Gym Cardio",      emoji:"🏃" },
    "dry-eq":        { label:"Dry Eq",          emoji:"👂" },
    "mobility":      { label:"Mobility",        emoji:"🤸" },
    "static":        { label:"Static",          emoji:"🧘" },
    "depth":         { label:"Depth",           emoji:"🌊" },
  };

  const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const weekLabel = weekDates[0].toLocaleDateString("en-US",{month:"long",day:"numeric"}) + " – " + weekDates[6].toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Training Week — ${clientName}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, 'Helvetica Neue', sans-serif; color:#1a1a1a; padding:40px; max-width:800px; margin:0 auto; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; padding-bottom:20px; border-bottom:2px solid #f0f0f0; }
    .logo { font-size:22px; font-weight:800; letter-spacing:-.03em; }
    .meta { text-align:right; }
    .meta .athlete { font-size:18px; font-weight:700; }
    .meta .week { font-size:13px; color:#888; margin-top:3px; }
    .meta .coach { font-size:12px; color:#aaa; margin-top:2px; }
    .day-block { margin-bottom:28px; }
    .day-header { font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:#bbb; margin-bottom:10px; padding-bottom:6px; border-bottom:1px solid #f0f0f0; }
    .rest-day { font-size:13px; color:#ddd; font-style:italic; padding:8px 0; }
    .session { background:#fafaf8; border-radius:10px; padding:16px; margin-bottom:10px; border-left:4px solid #1a1a1a; }
    .session-header { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
    .session-type { font-size:12px; font-weight:700; background:#1a1a1a; color:#fff; padding:3px 10px; border-radius:20px; }
    .session-name { font-size:15px; font-weight:700; }
    .session-notes { font-size:13px; color:#444; line-height:1.7; margin-bottom:10px; white-space:pre-wrap; }
    .section-label { font-size:10px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; color:#bbb; margin:10px 0 6px; }
    .dive { display:flex; align-items:flex-start; gap:10px; padding:8px 10px; background:#fff; border-radius:7px; margin-bottom:6px; border:1px solid #ebebeb; }
    .dive-num { font-size:11px; color:#bbb; font-weight:700; min-width:20px; margin-top:2px; }
    .dive-disc { font-size:11px; font-weight:700; background:#eef0ff; color:#1a2fa3; padding:2px 8px; border-radius:5px; white-space:nowrap; }
    .dive-lung { font-size:11px; color:#888; white-space:nowrap; }
    .dive-target { font-size:14px; font-weight:700; color:#1a2fa3; white-space:nowrap; }
    .dive-hang { font-size:11px; font-weight:700; background:#fffbe6; color:#7a6200; padding:2px 7px; border-radius:5px; }
    .dive-notes { font-size:12px; color:#555; line-height:1.6; margin-top:5px; white-space:pre-wrap; }
    .exercise { display:flex; align-items:center; gap:8px; padding:6px 10px; background:#fff; border-radius:7px; margin-bottom:4px; border:1px solid #ebebeb; font-size:13px; }
    .ex-name { font-weight:600; flex:1; }
    .ex-sets { color:#888; font-size:12px; }
    .drill { padding:8px 10px; background:#fff; border-radius:7px; margin-bottom:6px; border:1px solid #ebebeb; }
    .drill-name { font-size:13px; font-weight:600; margin-bottom:3px; }
    .drill-desc { font-size:12px; color:#555; line-height:1.6; white-space:pre-wrap; }
    .footer { margin-top:40px; padding-top:16px; border-top:1px solid #f0f0f0; font-size:11px; color:#bbb; text-align:center; }
    @media print { body { padding:20px; } }
  </style>
  </head><body>
  <div class="header">
    <div class="logo">🤿 ApneaCoach</div>
    <div class="meta">
      <div class="athlete">${clientName}</div>
      <div class="week">${weekLabel}</div>
      ${coachName ? `<div class="coach">Coach: ${coachName}</div>` : ""}
    </div>
  </div>`;

  weekDates.forEach((d, di) => {
    const iso = toISO(d);
    const daySessions = sessions.filter(s => s.date === iso);
    const dayLabel = DAYS[di] + " " + d.toLocaleDateString("en-US",{month:"short",day:"numeric"});

    html += `<div class="day-block"><div class="day-header">${dayLabel}</div>`;

    if (daySessions.length === 0) {
      html += `<div class="rest-day">Rest day</div>`;
    }

    daySessions.forEach(session => {
      const m = METHODS[session.method] || { label: session.method, emoji:"📋" };
      const gd = session.plan?.gymData;

      html += `<div class="session">
        <div class="session-header">
          <span class="session-type">${m.emoji} ${m.label}</span>
          ${gd?.sessionName ? `<span class="session-name">${gd.sessionName}</span>` : ""}
        </div>`;

      // Coach notes
      if (gd?.coachNotes) {
        html += `<div class="session-notes">${gd.coachNotes}</div>`;
      }
      if (session.plan?.coachNotes) {
        html += `<div class="session-notes">${session.plan.coachNotes}</div>`;
      }

      // DEPTH — dives
      if (session.method === "depth" && gd?.dives?.length > 0) {
        html += `<div class="section-label">Dives</div>`;
        gd.dives.forEach((dive, i) => {
          const target = dive.openLine
            ? "Open" + (dive.openLineMax ? " (max " + dive.openLineMax + "m)" : "")
            : dive.targetDepth ? dive.targetDepth + "m" : "—";
          html += `<div class="dive">
            <span class="dive-num">#${i+1}</span>
            <span class="dive-disc">${dive.discipline}</span>
            <span class="dive-lung">${dive.lungVolume}</span>
            <span class="dive-target">${target}</span>
            ${dive.hang ? `<span class="dive-hang">⏱ ${dive.hang}s hang</span>` : ""}
            <div style="flex:1">
              ${dive.coachNotes || dive.drillNotes ? `<div class="dive-notes">${dive.coachNotes || dive.drillNotes}</div>` : ""}
            </div>
          </div>`;
        });
      }

      // GYM / MOBILITY — exercises
      if ((session.method === "gym-strength" || session.method === "mobility") && gd?.sections?.length > 0) {
        gd.sections.forEach(sec => {
          if (sec.name) html += `<div class="section-label">${sec.name}</div>`;
          sec.blocks?.forEach(block => {
            block.exercises?.forEach(ex => {
              const sets = ex.sets?.map(s => s.reps ? s.weight ? `${s.reps}×${s.weight}kg` : `${s.reps} reps` : s.duration ? s.duration : "").filter(Boolean).join(", ");
              html += `<div class="exercise"><span class="ex-name">${ex.name}</span><span class="ex-sets">${sets || ""}</span></div>`;
            });
          });
        });
      }

      // DRY EQ — drills
      if (session.method === "dry-eq" && gd?.drills?.length > 0) {
        html += `<div class="section-label">Drills</div>`;
        gd.drills.forEach(drill => {
          html += `<div class="drill">
            <div class="drill-name">${drill.name || drill.technique}</div>
            ${drill.description ? `<div class="drill-desc">${drill.description}</div>` : ""}
          </div>`;
        });
      }

      // POOL — sections
      if (session.method === "pool-co2" && gd?.sections?.length > 0) {
        gd.sections.forEach(sec => {
          if (sec.name) html += `<div class="section-label">${sec.name}</div>`;
          sec.blocks?.forEach(block => {
            let blockDesc = "";
            if (block.type === "distance") blockDesc = `${block.discipline || ""} ${block.meters || ""}m`;
            else if (block.type === "interval") blockDesc = `${block.sets || ""}×${block.intervalMeters || ""}m @ ${block.rest || ""}`;
            else if (block.type === "over-under") blockDesc = `Over/Under: ${block.description || ""}`;
            if (blockDesc) html += `<div class="exercise"><span class="ex-name">${blockDesc}</span></div>`;
          });
        });
      }

      // STATIC
      if (session.method === "static" && gd) {
        if (gd.warmup) html += `<div class="section-label">Warm-up</div><div class="session-notes">${gd.warmup}</div>`;
        if (gd.mainSet) html += `<div class="section-label">Main Set</div><div class="session-notes">${gd.mainSet}</div>`;
        if (gd.cooldown) html += `<div class="section-label">Cool-down</div><div class="session-notes">${gd.cooldown}</div>`;
      }

      // Plain text sessions
      if (!gd && session.plan?.mainSet) {
        html += `<div class="session-notes">${session.plan.mainSet}</div>`;
      }

      html += `</div>`;
    });

    html += `</div>`;
  });

  html += `<div class="footer">Generated by ApneaCoach · ${new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</div>
  </body></html>`;

  // Open in new window and print/save as PDF
  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.print(); };
}


// ── Week Grid ─────────────────────────────────────────────────────────────────
function WeekGrid({ weekDates, clientId, sessions, onClickSession, onClickAdd, onCopySession, onPasteDay, isClient, hasClipboard, onMoveSession }) {
  const [dragOverDay, setDragOverDay] = useState(null);
  const [draggingId,  setDraggingId]  = useState(null);

  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:10,marginBottom:24}}>
      {weekDates.map((d,di)=>{
        const iso=toISO(d), isToday=iso===toISO(new Date());
        const daySessions=sessions.filter(s=>s.clientId===clientId&&s.date===iso);
        const isDragOver = dragOverDay===iso && draggingId && !daySessions.find(s=>s.id===draggingId);
        return (
          <div key={di}
            onDragOver={isClient ? e=>{e.preventDefault();setDragOverDay(iso);} : undefined}
            onDragLeave={isClient ? ()=>setDragOverDay(null) : undefined}
            onDrop={isClient ? e=>{
              e.preventDefault();
              const sid=e.dataTransfer.getData("sessionId");
              if(sid&&onMoveSession) onMoveSession(sid,iso);
              setDragOverDay(null);
              setDraggingId(null);
            } : undefined}
            style={{borderRadius:10,padding:isDragOver?"3px":"0",background:isDragOver?"#e8f5e9":"transparent",border:isDragOver?"2px dashed #4caf50":"2px solid transparent",transition:"all .15s"}}>
            <div style={{textAlign:"center",marginBottom:8}}>
              <div style={{fontSize:11,fontWeight:700,color:isToday?"#1a1a1a":"#aaa",letterSpacing:".06em",textTransform:"uppercase"}}>{DAYS[di]}</div>
              <div style={{width:28,height:28,borderRadius:"50%",display:"inline-flex",alignItems:"center",justifyContent:"center",marginTop:3,background:isToday?"#1a1a1a":"transparent",color:isToday?"#fff":"#555",fontWeight:isToday?700:500,fontSize:14}}>{d.getDate()}</div>
            </div>
            {daySessions.map(s=>{
              const m=gm(s.method), st=s.feedback?.status;
              const sc=st==="completed"?"#4caf50":st==="partial"?"#ff9800":st==="missed"?"#ef5350":null;
              const isCompleted = !!st;
              return (
                <div key={s.id} onClick={()=>onClickSession(s)}
                  draggable={isClient}
                  onDragStart={isClient ? e=>{e.dataTransfer.setData("sessionId",s.id);setDraggingId(s.id);} : undefined}
                  onDragEnd={isClient ? ()=>{setDraggingId(null);setDragOverDay(null);} : undefined}
                  style={{borderRadius:10,border:`1.5px solid ${m.border}`,borderLeft:`3px solid ${m.dot}`,background:"#fff",marginBottom:8,cursor:isClient?"grab":"pointer",transition:"box-shadow .15s,transform .1s",overflow:"hidden",opacity:draggingId===s.id?0.5:1}}
                  onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 14px rgba(0,0,0,.1)";e.currentTarget.style.transform="translateY(-1px)";}}
                  onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="none";}}>
                  <div style={{padding:"9px 10px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                      <span style={{fontSize:16}}>{m.emoji}</span>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        {isClient && s.feedback?.coachComment && s.feedback?.status==="completed" && (
                          <div title="Coach left feedback" style={{width:7,height:7,borderRadius:"50%",background:"#2e7d32",flexShrink:0}}/>
                        )}
                        {sc&&<div style={{width:8,height:8,borderRadius:"50%",background:sc}}/>}
                        {!isClient&&(
                          <button title="Copy session" onClick={e=>{e.stopPropagation();onCopySession&&onCopySession(s);}}
                            style={{background:"none",border:"none",fontSize:11,color:"#ccc",cursor:"pointer",padding:0,lineHeight:1}}>⧉</button>
                        )}
                        {!isClient&&<button title="Delete session" onClick={e=>{e.stopPropagation();onClickAdd&&onClickAdd(null,s.id,true);}} style={{background:"none",border:"none",fontSize:13,color:"#ddd",cursor:"pointer",padding:0,lineHeight:1}}>×</button>}
                      </div>
                    </div>
                    <div style={{fontSize:11,fontWeight:700,color:m.text,marginBottom:3}}>{m.label}</div>
                    {isCompleted&&<div style={{fontSize:9,color:"#bbb",fontWeight:600,letterSpacing:".04em"}}>COMPLETED</div>}
                    {s.method==="depth"&&s.plan?.targetDepth&&<div style={{fontSize:10,color:"#999",fontWeight:600}}>🎯 {s.plan.targetDepth}m{s.plan.openLine?" (open)":""}</div>}
                    {s.plan?.gymData?.sessionName&&<div style={{fontSize:10,color:"#aaa",marginTop:2,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.plan.gymData.sessionName}</div>}
                    {s.plan?.mainSet&&!s.plan?.gymData&&<div style={{fontSize:10,color:"#aaa",marginTop:3,lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{s.plan.mainSet}</div>}
                  </div>
                </div>
              );
            })}
            {!isClient&&(
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                <div onClick={()=>onClickAdd&&onClickAdd(iso)}
                  style={{border:"1.5px dashed #ddd",borderRadius:10,padding:"8px 6px",textAlign:"center",cursor:"pointer",color:"#ccc",fontSize:12,fontWeight:600,transition:"all .15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="#1a1a1a";e.currentTarget.style.color="#1a1a1a";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#ddd";e.currentTarget.style.color="#ccc";}}>
                  + Add
                </div>
                {hasClipboard&&(
                  <div onClick={()=>onPasteDay&&onPasteDay(iso, clientId)}
                    style={{border:"1.5px dashed #4caf50",borderRadius:10,padding:"6px 6px",textAlign:"center",cursor:"pointer",color:"#4caf50",fontSize:11,fontWeight:600,background:"#f1f8f1",transition:"all .15s"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#e8f5e9"}
                    onMouseLeave={e=>e.currentTarget.style.background="#f1f8f1"}>
                    📋 Paste
                  </div>
                )}
              </div>
            )}
            {isClient&&daySessions.length===0&&<div style={{border:"1.5px solid #f0f0f0",borderRadius:10,padding:"18px 6px",textAlign:"center",color:"#e8e8e8",fontSize:18}}>○</div>}
          </div>
        );
      })}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
const ADMIN_EMAIL = "lucianafreediver@gmail.com"; // only this user can create coaches
const DEFAULT_WELCOME = "Hi {{athlete_name}}, welcome to your training hub! I will plan your sessions here each week. You'll see your workouts on the calendar above — tap any session to open it, log your results, and leave notes for me. Your progress charts will build up over time. Any questions, I'm just a message away. Let's go!\n\n— {{coach_name}}";

export default function ApneaCoach() {
  const [user,     setUser]     = useState(null);
  const [profile,  setProfile]  = useState(null);
  const [clients,  setClients]  = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [view,     setView]     = useState("dashboard");
  const [activeClient, setActiveClient] = useState(null);
  const [weekStart, setWeekStart] = useState(()=>mondayOf(new Date()));
  const [toast, setToast] = useState("");

  const [assignModal,    setAssignModal]    = useState(null);
  const [dayModal,       setDayModal]       = useState(null);
  const [editModal,      setEditModal]      = useState(null); // session being edited
  const [addClientModal, setAddClientModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [addCoachModal,  setAddCoachModal]  = useState(false);
  const [clipboard,      setClipboard]      = useState(null); // copied session plan
  const [pasteModal,     setPasteModal]     = useState(null); // {date, clientId}
  const [adminData,      setAdminData]      = useState(null); // {coaches, allClients}
  const [editClientModal, setEditClientModal] = useState(null); // client being edited
  const [copyFromModal,  setCopyFromModal]  = useState(null); // clientId to copy from
  // Notifications — track when coach last checked, show badge for new completions since then
  const [lastSeenAt, setLastSeenAt] = useState(() => {
    try { return localStorage.getItem("apnea_lastSeen") || new Date(0).toISOString(); } catch { return new Date(0).toISOString(); }
  });
  const [welcomeMessage, setWelcomeMessage] = useState(""); // coach's global welcome message
  const [editingWelcome, setEditingWelcome] = useState(false);
  const [savingWelcome, setSavingWelcome] = useState(false);

  function markAllSeen() {
    const now = new Date().toISOString();
    setLastSeenAt(now);
    try { localStorage.setItem("apnea_lastSeen", now); } catch {}
  }

  function flash(msg) { setToast(msg); setTimeout(()=>setToast(""),2400); }

  // Flag to ignore auth changes during client creation
  const ignoringAuthChange = useRef(false);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      setUser(session?.user||null);
      if (session?.user) loadProfile(session.user);
      else setLoading(false);
    });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_,session)=>{
      // Ignore auth changes triggered by client creation
      if (ignoringAuthChange.current) return;
      setUser(session?.user||null);
      if (session?.user) loadProfile(session.user);
      else { setProfile(null); setLoading(false); }
    });
    return ()=>subscription.unsubscribe();
  },[]);

  // For athletes: ensure activeClient is always set when clients are loaded
  useEffect(()=>{
    if (profile?.role==="client" && clients.length>0 && !activeClient) {
      setActiveClient(clients[0]);
    }
  },[profile, clients, activeClient]);

  async function loadProfile(u) {
    const {data} = await supabase.from("profiles").select("*").eq("id",u.id).single();
    setProfile(data);
    if (data?.welcome_message) setWelcomeMessage(data.welcome_message);
    await loadAll(data, u);
    if (u.email === ADMIN_EMAIL) await loadAdminData();
    else if (data?.role === "coach") {
      // Log coach login
      await supabase.from("activity_log").insert({
        event_type: "coach_login",
        coach_email: u.email,
        coach_id: u.id,
        details: "Coach logged in",
      });
    }
    setLoading(false);
  }

  async function loadAll(prof, u) {
    const p = prof||profile;
    const currentUser = u||user;
    if (!p||!currentUser) return;
    if (p.role==="coach") {
      // Load only THIS coach's clients
      const {data:cr} = await supabase.from("clients").select("*, profiles(email)").eq("coach_id",currentUser.id).order("created_at");
      const clientIds = (cr||[]).map(c=>c.id);
      let sr = [];
      if (clientIds.length > 0) {
        const {data} = await supabase.from("sessions").select("*, feedback(*)").in("client_id", clientIds).order("date");
        sr = data||[];
      }
      setClients((cr||[]).map(dbToClient));
      setSessions(sr.map(dbToSession));
      // Load coach notes from client records
      const notesMap = {};
      (cr||[]).forEach(c=>{ if(c.coach_notes) notesMap[c.id]=c.coach_notes; });
      setCoachNotes(notesMap);
    } else {
      const {data:cr} = await supabase.from("clients").select("*").eq("id",p.client_id).single();
      const {data:sr} = await supabase.from("sessions").select("*, feedback(*)").eq("client_id",p.client_id).order("date");
      if (cr) { 
        const clientObj = dbToClient(cr);
        setClients([clientObj]); 
        setActiveClient(clientObj); 
        setView("clientWeek"); 
      }
      setSessions((sr||[]).map(dbToSession));
    }
  }

  // ── Welcome message ──
  function resolveWelcome(athleteName) {
    const coachName = (profile?.email||"").split("@")[0].replace(/[._]/g," ").replace(/\b\w/g,c=>c.toUpperCase());
    const msg = welcomeMessage || DEFAULT_WELCOME;
    return msg.replace(/\{\{athlete_name\}\}/g, athleteName?.split(" ")[0]||"").replace(/\{\{coach_name\}\}/g, coachName);
  }

  async function saveWelcomeMessage(msg) {
    setSavingWelcome(true);
    await supabase.from("profiles").update({welcome_message: msg||null}).eq("id", user.id);
    setWelcomeMessage(msg);
    setSavingWelcome(false);
    setEditingWelcome(false);
    flash("Welcome message saved!");
  }

  // ── Coach notes ──
  async function saveCoachNotes(clientId, notes) {
    setSavingNotes(true);
    await supabase.from("clients").update({coach_notes: notes||null}).eq("id", clientId);
    setCoachNotes(prev=>({...prev, [clientId]: notes}));
    setSavingNotes(false);
    flash("Notes saved!");
  }

  // ── Edit client profile ──
  async function handleEditClient(form) {
    const {error} = await supabase.from("clients").update({
      name:form.name, age:form.age?Number(form.age):null, level:form.level, goal:form.goal,
      pb_cwt:form.pb.CWT?Number(form.pb.CWT):null, pb_sta:form.pb.STA||null, pb_dyn:form.pb.DYN?Number(form.pb.DYN):null,
      plan_type:form.planType||"weeks", plan_weeks:form.planWeeks?Number(form.planWeeks):null,
      plan_start_date:form.planStartDate||null, competition_date:form.competitionDate||null, competition_name:form.competitionName||null,
      avatar_url: form.avatarUrl||null,
    }).eq("id", editClientModal.id);
    if (error) throw new Error(error.message);
    const updated = {...editClientModal, ...form, id:editClientModal.id,
      planType:form.planType, planWeeks:form.planWeeks?Number(form.planWeeks):null,
      planStartDate:form.planStartDate||null, competitionDate:form.competitionDate||null, competitionName:form.competitionName||null,
      pb:{CWT:form.pb.CWT, STA:form.pb.STA, DYN:form.pb.DYN},
      avatarUrl:form.avatarUrl||null};
    setClients(prev=>prev.map(c=>c.id===editClientModal.id?updated:c));
    if (activeClient?.id===editClientModal.id) setActiveClient(updated);
    flash("Client updated!");
    // Modal's onClose() will close via setEditClientModal(null)
  }

  // ── Admin: load all coaches + their clients ──
  async function loadAdminData() {
    const { data: profiles } = await supabase.from("profiles").select("*").eq("role","coach");
    const { data: allClients } = await supabase.from("clients").select("*").order("created_at");
    const { data: activityLog } = await supabase.from("activity_log").select("*").order("created_at", {ascending:false}).limit(100);
    setAdminData({ coaches: profiles||[], allClients: allClients||[], activityLog: activityLog||[] });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setClients([]); setSessions([]); setProfile(null); setActiveClient(null); setView("dashboard");
  }

  // ── Add Client ──
  async function handleAddClient(form) {
    // Use single server-side function that does everything without touching auth session
    const { data: result, error: rpcError } = await supabase.rpc("create_client_account", {
      user_email: form.email,
      user_password: form.password,
      client_name: form.name,
      coach_uuid: user.id,
      client_level: form.level || "Beginner",
      client_goal: form.goal || "",
      client_age: form.age ? Number(form.age) : null,
      pb_cwt: form.pb?.CWT ? Number(form.pb.CWT) : null,
      pb_sta: form.pb?.STA || null,
      pb_dyn: form.pb?.DYN ? Number(form.pb.DYN) : null,
      plan_type_val: form.planType || "weeks",
      plan_weeks_val: form.planWeeks ? Number(form.planWeeks) : null,
      plan_start: form.planStartDate || null,
      comp_date: form.competitionDate || null,
      comp_name: form.competitionName || null,
    });

    if (rpcError) { flash("Error: " + rpcError.message); throw new Error(rpcError.message); }

    // Optimistically update state with returned client row
    const clientRow = result?.client || (typeof result === 'object' && result?.id ? result : null);
    if (clientRow) {
      setClients(prev => [...prev, dbToClient(clientRow)]);
    } else {
      setTimeout(async () => {
        const { data: updatedClients } = await supabase.from("clients").select("*, profiles(email)").eq("coach_id", user.id).order("created_at");
        if (updatedClients) setClients(updatedClients.map(dbToClient));
      }, 500);
    }

    await supabase.from("activity_log").insert({
      event_type: "client_added", coach_email: user.email, coach_id: user.id,
      details: `Added client: ${form.name} (${form.email})`,
    }).catch(()=>{});

    flash(`Client added! They can log in with ${form.email}`);
  }

  // ── Add Coach (admin only) ──
  async function handleAddCoach(form) {
    const {data:authData, error:signUpError} = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });
    if (signUpError) { flash("Error: " + signUpError.message); return; }
    if (authData?.user) {
      await supabase.from("profiles").upsert({
        id: authData.user.id,
        email: form.email,
        role: "coach"
      }, { onConflict: "id" });
      setAddCoachModal(false);
      flash("Coach account created! They can log in immediately with " + form.email);
    }
  }

  async function deleteClient(id) {
    // Delete feedback, sessions, profile, then client
    const clientSessions = sessions.filter(s=>s.clientId===id);
    for (const s of clientSessions) {
      await supabase.from("feedback").delete().eq("session_id", s.id);
    }
    await supabase.from("sessions").delete().eq("client_id", id);
    await supabase.from("profiles").delete().eq("client_id", id);
    await supabase.from("clients").delete().eq("id", id);
    setClients(prev=>prev.filter(c=>c.id!==id));
    setSessions(prev=>prev.filter(s=>s.clientId!==id));
    setActiveClient(null); setView("dashboard");
  }

  async function archiveClient(id) {
    await supabase.from("clients").update({ archived: true }).eq("id", id);
    setClients(prev=>prev.map(c=>c.id===id ? {...c, archived:true} : c));
    setActiveClient(null); setView("dashboard");
  }

  async function unarchiveClient(id) {
    await supabase.from("clients").update({ archived: false }).eq("id", id);
    setClients(prev=>prev.map(c=>c.id===id ? {...c, archived:false} : c));
  }

  async function handleAssignSave({method,plan}) {
    // For gym-strength and static, store the full workout structure as JSON in plan_mainset
    const mainSetValue = (method==="gym-strength" || method==="static" || method==="pool-technique" || method==="pool-co2" || method==="depth" || method==="gym-cardio" || method==="dry-eq" || method==="mobility") && plan.gymData
      ? JSON.stringify(plan.gymData)
      : plan.mainSet||null;
    const {data,error} = await supabase.from("sessions").insert({
      client_id:activeClient.id, date:assignModal, method,
      plan_warmup:plan.warmup||null, plan_mainset:mainSetValue, plan_cooldown:plan.cooldown||null,
      plan_target_depth:plan.targetDepth||null, plan_open_line:plan.openLine||false, plan_coach_notes:plan.coachNotes||null,
    }).select().single();
    if (!error&&data) { setSessions(prev=>[...prev, dbToSession({...data,feedback:null})]); setAssignModal(null); flash("Session planned!"); }
  }

  async function removeSession(id) {
    await supabase.from("sessions").delete().eq("id",id);
    setSessions(prev=>prev.filter(s=>s.id!==id));
  }

  const [newPBModal, setNewPBModal] = useState(null); // {type, value, clientId, sessionId}
  const [coachNotes, setCoachNotes] = useState({}); // {clientId: "notes text"}
  const [savingNotes, setSavingNotes] = useState(false);

  async function handleFeedbackSave(sessionId, fb) {
    // Store gym/static workout log as JSON in client_notes field
    const clientNotesValue = fb.gymData
      ? JSON.stringify(fb.gymData)
      : fb.clientNotes||null;
    const {error} = await supabase.from("feedback").upsert({
      session_id:sessionId, status:fb.status||null,
      actual_depth:fb.actualDepth?Number(fb.actualDepth):null,
      early_turn:fb.earlyTurn||false, early_turn_depth:fb.earlyTurnDepth?Number(fb.earlyTurnDepth):null,
      feeling:fb.feeling||null, limiting_factor:fb.limitingFactor||null,
      client_notes:clientNotesValue, coach_comment:fb.coachComment||null,
    },{onConflict:"session_id"});
    if (!error) {
      setSessions(prev=>prev.map(s=>s.id===sessionId?{...s,feedback:{...fb, clientGymData: fb.gymData || s.feedback?.clientGymData, gymData: undefined}}:s));
      setDayModal(null); flash("Feedback saved!");

      // ── PB detection ──
      const session = sessions.find(s=>s.id===sessionId);
      const client = session ? clients.find(c=>c.id===session.clientId) : null;
      if (client && fb.status==="completed") {
        const pbs = [];
        // Depth PB — CWT (and other disciplines)
        if (fb.actualDepth && Number(fb.actualDepth) > 0) {
          const depth = Number(fb.actualDepth);
          const currentPB = Number(client.pb?.CWT)||0;
          if (depth > currentPB) pbs.push({type:"CWT",label:"Depth",unit:"m",value:depth,prev:currentPB||null,emoji:"🌊"});
        }
        // Static PB — best hold from roundLogs or actualTime
        if (session?.method==="static" && fb.gymData) {
          function toSecs(t){if(!t)return 0;const p=String(t).trim().split(":");if(p.length===2)return parseInt(p[0],10)*60+parseInt(p[1],10);return parseInt(p[0],10)||0;}
          function fmtSecs(s){if(!s)return null;const m=Math.floor(s/60),sec=s%60;return`${m}:${String(sec).padStart(2,"0")}`;}
          let bestSecs = 0;
          (fb.gymData.exercises||[]).forEach(ex=>{
            const logs = ex.log?.roundLogs?.map(toSecs).filter(Boolean) || [toSecs(ex.log?.actualTime)].filter(Boolean);
            logs.forEach(s=>{ if(s>bestSecs) bestSecs=s; });
          });
          if (bestSecs > 0) {
            const currentSTA = toSecs(client.pb?.STA)||0;
            if (bestSecs > currentSTA) pbs.push({type:"STA",label:"Static Hold",unit:"",value:fmtSecs(bestSecs),valueRaw:bestSecs,prev:fmtSecs(currentSTA)||null,emoji:"🧘"});
          }
        }
        if (pbs.length > 0) setNewPBModal({pbs, clientId:client.id, sessionId});
      }
    }
  }

  async function handleConfirmPB(pb, clientId) {
    const updates = {};
    if (pb.type==="CWT") updates.pb_cwt = pb.value;
    if (pb.type==="STA") updates.pb_sta = pb.value;
    if (pb.type==="DYN") updates.pb_dyn = pb.value;
    const {error} = await supabase.from("clients").update(updates).eq("id",clientId);
    if (!error) {
      setClients(prev=>prev.map(c=>{
        if (c.id!==clientId) return c;
        const newPb = {...(c.pb||{})};
        if (pb.type==="CWT") newPb.CWT = pb.value;
        if (pb.type==="STA") newPb.STA = pb.value;
        if (pb.type==="DYN") newPb.DYN = pb.value;
        return {...c, pb:newPb};
      }));
      if (activeClient?.id===clientId) setActiveClient(prev=>prev?{...prev,pb:{...prev.pb,[pb.type]:pb.value}}:prev);
    }
  }

  // ── Edit session ──
  async function handleEditSave(sessionId, updatedPlan) {
    const mainSetValue = JSON.stringify(updatedPlan);
    const { error } = await supabase.from("sessions").update({ plan_mainset: mainSetValue }).eq("id", sessionId);
    if (!error) {
      setSessions(prev => prev.map(s => s.id===sessionId ? {...s, plan:{...s.plan, gymData:updatedPlan}} : s));
      setEditModal(null);
      flash("Session updated!");
    }
  }

  // ── Copy session ──
  function handleCopySession(session) {
    setClipboard({ plan: session.plan, method: session.method });
    flash("Session copied! Now click a day to paste it.");
  }

  // ── Paste session ──
  async function handlePasteSession(date, clientId) {
    if (!clipboard) return;
    const mainSetValue = clipboard.plan.gymData ? JSON.stringify(clipboard.plan.gymData) : clipboard.plan.mainSet||null;
    const { data, error } = await supabase.from("sessions").insert({
      client_id: clientId, date, method: clipboard.method,
      plan_warmup: clipboard.plan.warmup||null,
      plan_mainset: mainSetValue,
      plan_cooldown: clipboard.plan.cooldown||null,
      plan_target_depth: clipboard.plan.targetDepth||null,
      plan_open_line: clipboard.plan.openLine||false,
      plan_coach_notes: clipboard.plan.coachNotes||null,
    }).select().single();
    if (!error && data) {
      setSessions(prev => [...prev, dbToSession({...data, feedback:null})]);
      setPasteModal(null);
      flash("Session pasted!");
    }
  }

  // ── Move session (client drag & drop) ──
  async function handleMoveSession(sessionId, newDate) {
    const session = sessions.find(s => s.id === sessionId);
    if (!session || session.date === newDate) return;
    const { error } = await supabase.from("sessions").update({ date: newDate }).eq("id", sessionId);
    if (!error) {
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, date: newDate } : s));
      flash("Session moved!");
    }
  }

  const weekDates = DAYS.map((_,i)=>addDays(weekStart,i));
  const isCoach = profile?.role==="coach";
  const isAdmin = user?.email===ADMIN_EMAIL;

  if (loading) return <Spinner />;
  if (!user)   return <LoginScreen />;

  return (
    <div style={{fontFamily:"'DM Sans','Helvetica Neue',sans-serif",background:"#f5f4f0",color:"#1a1a1a",minHeight:"100vh",color:"#1a1a1a"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* Header */}
      <div style={{background:"#fff",borderBottom:"1px solid #ebebeb",padding:"0 24px"}}>
        <div style={{maxWidth:1040,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:56}}>
          <div style={{display:"flex",alignItems:"center",gap:20}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:20}}>🤿</span>
              <span style={{fontWeight:700,fontSize:16,letterSpacing:"-.02em"}}>ApneaCoach</span>
            </div>
            <div style={{display:"flex",gap:2}}>
              {(()=>{
                // Count new completions since coach last visited dashboard
                const newCompletions = isCoach ? sessions.filter(s =>
                  s.feedback?.status === "completed" &&
                  s.feedback?.clientGymData &&
                  !s.feedback?.coachComment
                ).length : 0;

                return [
                  {key:"dashboard", label: profile?.role==="client" ? "📊 Dashboard" : "📋 Dashboard", badge: isCoach && newCompletions > 0 ? newCompletions : 0},
                  ...(isAdmin?[{key:"adminView",label:"👑 Admin",badge:0}]:[]),
                  ...(isCoach&&activeClient?[{key:"coachWeek",label:`📅 ${activeClient.name.split(" ")[0]}'s Week`,badge:0},{key:"clientWeek",label:"🏊 Client View",badge:0}]:[]),
                  ...(profile?.role==="client"?[{key:"clientWeek",label:"📅 My Week",badge:0}]:[])
                ].map(t=>(
                  <button key={t.key} onClick={()=>{
                    if(profile?.role==="client"&&!activeClient&&clients[0]) setActiveClient(clients[0]);
                    setView(t.key);
                    if(t.key==="dashboard"&&isCoach) markAllSeen();
                  }} style={{padding:"8px 15px",borderRadius:8,border:"none",fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all .15s",background:view===t.key?"#f0f0ec":"transparent",color:view===t.key?"#1a1a1a":"#888",fontWeight:view===t.key?600:500,position:"relative"}}>
                    {t.label}
                    {t.badge > 0 && (
                      <span style={{position:"absolute",top:3,right:3,background:"#ef5350",color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>
                        {t.badge > 9 ? "9+" : t.badge}
                      </span>
                    )}
                  </button>
                ));
              })()}
            </div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <div style={{fontSize:12,color:"#aaa",fontWeight:500}}>{user.email}</div>
            {isCoach&&activeClient&&view!=="dashboard"&&<button onClick={()=>{setActiveClient(null);setView("dashboard");}} style={{background:"transparent",color:"#1a1a1a",border:"1.5px solid #ddd",color:"#666",padding:"8px 14px",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>← All Clients</button>}
            {isCoach&&<button onClick={()=>setAddClientModal(true)} style={{background:"#1a1a1a",color:"#fff",border:"none",padding:"10px 18px",borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Add Client</button>}
            {isAdmin&&<button onClick={()=>setAddCoachModal(true)} style={{background:"#3a8ef4",color:"#fff",border:"none",padding:"10px 18px",borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Add Coach</button>}
            <button onClick={handleSignOut} style={{background:"transparent",color:"#1a1a1a",border:"1.5px solid #ddd",color:"#666",padding:"8px 14px",borderRadius:8,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Sign Out</button>
          </div>
        </div>
      </div>

      <div style={{maxWidth:1040,margin:"0 auto",padding:"28px 24px"}}>

        {/* DASHBOARD */}
        {view==="dashboard"&&(isCoach||isAdmin)&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:24}}>
              {(()=>{
                const needsReply = sessions.filter(s=>s.feedback?.status==="completed" && s.feedback?.clientGymData && !s.feedback?.coachComment).length;
                return [
                  ["My Clients", clients.filter(c=>!c.archived).length],
                  ["Sessions Planned", sessions.length],
                  ["Needs Reply", needsReply||"✓"],
                ].map(([l,v])=>(
                  <div key={l} style={{background:"#fff",borderRadius:12,border:"1px solid #ebebeb",padding:"20px 24px"}}>
                    <div style={{fontSize:28,fontWeight:700,fontFamily:"monospace",color:l==="Needs Reply"&&v!=="✓"?"#e65100":l==="Needs Reply"?"#2e7d32":"#1a1a1a"}}>{v}</div>
                    <div style={{fontSize:12,color:"#999",marginTop:4,fontWeight:500}}>{l}</div>
                  </div>
                ));
              })()}
            </div>
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #ebebeb",padding:"13px 20px",marginBottom:22,display:"flex",flexWrap:"wrap",gap:"8px 22px",alignItems:"center"}}>
              <span style={{fontSize:10,fontWeight:800,color:"#ccc",letterSpacing:".08em",textTransform:"uppercase"}}>Training Methods</span>
              {METHODS.map(m=><div key={m.key} style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:9,height:9,borderRadius:"50%",background:m.dot}}/><span style={{fontSize:12,fontWeight:500,color:"#555"}}>{m.emoji} {m.label}</span></div>)}
            </div>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",color:"#bbb",marginBottom:12}}>Your Clients</div>
            {clients.filter(c=>!c.archived).length===0&&<div style={{background:"#fff",borderRadius:12,border:"1px solid #ebebeb",padding:40,textAlign:"center",color:"#bbb",fontSize:14}}>No active clients yet. Click "+ Add Client" to get started.</div>}
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {clients.filter(c=>!c.archived).map(c=>{
                const cs=sessions.filter(s=>s.clientId===c.id);
                const done=cs.filter(s=>s.feedback?.status==="completed").length;
                const pending=cs.filter(s=>!s.feedback?.status).length;
                return(
                  <ClientCard key={c.id} client={c} done={done} pending={pending} sessions={cs} onClick={()=>{setActiveClient(c);setView("coachWeek");}} />
                );
              })}
            </div>

            {/* Archived / Past Clients */}
            {clients.filter(c=>c.archived).length > 0 && (
              <div style={{marginTop:32}}>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",color:"#bbb",marginBottom:12}}>📦 Past Clients</div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {clients.filter(c=>c.archived).map(c=>{
                    const cs=sessions.filter(s=>s.clientId===c.id);
                    const done=cs.filter(s=>s.feedback?.status==="completed").length;
                    return(
                      <div key={c.id} onClick={()=>{setActiveClient(c);setView("coachWeek");}}
                        style={{background:"#fafaf8",border:"1px solid #ebebeb",borderRadius:12,padding:"14px 18px",cursor:"pointer",opacity:0.65,display:"flex",alignItems:"center",justifyContent:"space-between",transition:"opacity .15s"}}
                        onMouseEnter={e=>e.currentTarget.style.opacity="1"}
                        onMouseLeave={e=>e.currentTarget.style.opacity="0.65"}>
                        <div>
                          <div style={{fontWeight:700,fontSize:15,color:"#555"}}>{c.name}</div>
                          <div style={{fontSize:12,color:"#aaa",marginTop:2}}>{c.level} · {done} sessions completed</div>
                        </div>
                        <button onClick={e=>{e.stopPropagation();unarchiveClient(c.id);}}
                          style={{background:"transparent",border:"1.5px solid #a5d6a7",color:"#2e7d32",padding:"5px 12px",borderRadius:7,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                          Reactivate
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Welcome message editor */}
            <div style={{marginTop:32}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"#1a1a1a"}}>💬 Welcome message to athletes</div>
                  <div style={{fontSize:11,color:"#aaa",marginTop:2}}>Shown at the bottom of every athlete's week view</div>
                </div>
                {!editingWelcome && (
                  <button onClick={()=>setEditingWelcome(true)}
                    style={{background:"transparent",border:"1.5px solid #ddd",color:"#555",padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                    ✏️ Edit
                  </button>
                )}
              </div>
              {!editingWelcome ? (
                <div style={{background:"#fff",borderRadius:12,border:"1px solid #ebebeb",borderLeft:"3px solid #3a8ef4",padding:"16px 18px"}}>
                  <div style={{fontSize:13,color:"#555",lineHeight:1.75,whiteSpace:"pre-wrap"}}>
                    {(welcomeMessage||DEFAULT_WELCOME)
                      .replace(/\{\{athlete_name\}\}/g,"[athlete name]")
                      .replace(/\{\{coach_name\}\}/g, (profile?.email||"").split("@")[0].replace(/[._]/g," ").replace(/\b\w/g,c=>c.toUpperCase()))}
                  </div>
                </div>
              ) : (
                <div style={{background:"#fff",borderRadius:12,border:"1.5px solid #3a8ef4",padding:"16px 18px"}}>
                  <div style={{background:"#f0f7ff",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:12,color:"#005fa3"}}>
                    <strong>Placeholders:</strong> use <code style={{background:"#dbeafe",padding:"1px 5px",borderRadius:4}}>{"{{athlete_name}}"}</code> and <code style={{background:"#dbeafe",padding:"1px 5px",borderRadius:4}}>{"{{coach_name}}"}</code> — they get replaced automatically for each athlete.
                  </div>
                  <textarea
                    value={welcomeMessage||DEFAULT_WELCOME}
                    onChange={e=>setWelcomeMessage(e.target.value)}
                    rows={7}
                    style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:9,fontSize:13,fontFamily:"inherit",outline:"none",resize:"vertical",color:"#1a1a1a",lineHeight:1.7,boxSizing:"border-box"}}
                  />
                  <div style={{display:"flex",gap:8,marginTop:10}}>
                    <button onClick={()=>saveWelcomeMessage(welcomeMessage)} disabled={savingWelcome}
                      style={{background:"#1a1a1a",color:"#fff",border:"none",padding:"8px 18px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:savingWelcome?0.6:1}}>
                      {savingWelcome?"Saving…":"Save message"}
                    </button>
                    <button onClick={()=>{setWelcomeMessage(DEFAULT_WELCOME);}}
                      style={{background:"transparent",color:"#888",border:"1.5px solid #e0e0e0",padding:"8px 14px",borderRadius:8,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                      Reset to default
                    </button>
                    <button onClick={()=>{setEditingWelcome(false); setWelcomeMessage(welcomeMessage);}}
                      style={{background:"transparent",color:"#aaa",border:"none",padding:"8px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {view==="adminView"&&isAdmin&&(
          <div>
            <div style={{marginBottom:24}}>
              <div style={{fontWeight:700,fontSize:20,letterSpacing:"-.02em",marginBottom:4}}>Admin Dashboard</div>
              <div style={{fontSize:13,color:"#999"}}>All coaches and their clients on the platform</div>
            </div>

            {/* Platform stats */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:28}}>
              {[
                ["Total Coaches", adminData?.coaches?.length||0],
                ["Total Clients", adminData?.allClients?.length||0],
                ["Platform Sessions", sessions.length],
              ].map(([l,v])=>(
                <div key={l} style={{background:"#fff",borderRadius:12,border:"1px solid #ebebeb",padding:"20px 24px"}}>
                  <div style={{fontSize:28,fontWeight:700,fontFamily:"monospace"}}>{v}</div>
                  <div style={{fontSize:12,color:"#999",marginTop:4,fontWeight:500}}>{l}</div>
                </div>
              ))}
            </div>

            {/* Coaches list */}
            <div style={{fontSize:11,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",color:"#bbb",marginBottom:12}}>Coaches</div>
            {!adminData&&<div style={{background:"#fff",borderRadius:12,border:"1px solid #ebebeb",padding:40,textAlign:"center",color:"#bbb",fontSize:14}}>Loading...</div>}
            {adminData&&adminData.coaches.length===0&&<div style={{background:"#fff",borderRadius:12,border:"1px solid #ebebeb",padding:40,textAlign:"center",color:"#bbb",fontSize:14}}>No coaches yet.</div>}
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {adminData&&adminData.coaches.map(coach=>{
                const coachClients = adminData.allClients.filter(c=>c.coach_id===coach.id);
                const isMe = coach.email===ADMIN_EMAIL;
                return (
                  <div key={coach.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${isMe?"#ddd":"#ebebeb"}`,overflow:"hidden"}}>
                    {/* Coach header */}
                    <div style={{padding:"16px 20px",display:"flex",alignItems:"center",gap:14,borderBottom:coachClients.length>0?"1px solid #f5f5f5":"none",background:isMe?"#f8f8f6":"#fff"}}>
                      <div style={{width:40,height:40,borderRadius:"50%",background:isMe?"#1a1a1a":"#f0f0ec",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:16,color:isMe?"#fff":"#555"}}>
                        {coach.email.charAt(0).toUpperCase()}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{fontWeight:600,fontSize:15,color:"#1a1a1a"}}>{coach.email}</div>
                          {isMe&&<span style={{background:"#1a1a1a",color:"#fff",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10,letterSpacing:".04em"}}>YOU</span>}
                        </div>
                        <div style={{fontSize:12,color:"#999",marginTop:2}}>
                          {coachClients.length} client{coachClients.length!==1?"s":""}
                          {adminData?.activityLog && (" · " + (adminData.activityLog.filter(e=>e.event_type==="coach_login"&&e.coach_email===coach.email).length) + " logins")}
                        </div>
                      </div>
                      <div style={{fontSize:11,color:"#bbb",fontWeight:600,textTransform:"uppercase",letterSpacing:".05em"}}>Coach</div>
                    </div>
                    {/* Coach's clients */}
                    {coachClients.length>0&&(
                      <div style={{padding:"8px 0"}}>
                        {coachClients.map(c=>(
                          <div key={c.id} style={{padding:"10px 20px 10px 60px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid #f9f9f9"}}>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <div style={{width:28,height:28,borderRadius:"50%",background:"#f0f0ec",color:"#1a1a1a",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,color:"#555"}}>{c.name.charAt(0)}</div>
                              <div>
                                <div style={{fontWeight:500,fontSize:13,color:"#1a1a1a"}}>{c.name}</div>
                                <div style={{fontSize:11,color:"#bbb"}}>{c.level} · {c.goal}</div>
                              </div>
                            </div>
                            <div style={{display:"flex",gap:16}}>
                              <div style={{textAlign:"right"}}>
                                <div style={{fontSize:10,color:"#ccc",fontWeight:600,textTransform:"uppercase"}}>Age</div>
                                <div style={{fontSize:13,fontWeight:600,color:"#555"}}>{c.age||"—"}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {coachClients.length===0&&(
                      <div style={{padding:"12px 20px 12px 60px",fontSize:12,color:"#ccc",fontStyle:"italic"}}>No clients yet</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Activity Feed */}
            <div style={{marginTop:28}}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",color:"#bbb",marginBottom:12}}>Recent Activity</div>
              {(!adminData?.activityLog || adminData.activityLog.length===0) && (
                <div style={{background:"#fff",borderRadius:12,border:"1px solid #ebebeb",padding:24,textAlign:"center",color:"#bbb",fontSize:13}}>No activity yet — coaches will appear here when they log in or add clients.</div>
              )}
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {(adminData?.activityLog||[]).map(event => {
                  const isLogin  = event.event_type==="coach_login";
                  const isClient = event.event_type==="client_added";
                  const date     = new Date(event.created_at);
                  const timeStr  = date.toLocaleDateString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
                  return (
                    <div key={event.id} style={{background:"#fff",borderRadius:10,border:"1px solid #ebebeb",padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
                      <div style={{width:36,height:36,borderRadius:"50%",background:isLogin?"#e8f5e9":isClient?"#e8f0ff":"#f5f4f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
                        {isLogin?"🔑":isClient?"👤":"📋"}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,fontSize:13,color:"#1a1a1a"}}>
                          {isLogin?"Coach logged in":isClient?"New client added":event.event_type}
                        </div>
                        <div style={{fontSize:12,color:"#999",marginTop:2}}>
                          {event.coach_email}{isClient&&event.details?" · "+event.details.replace("Added client: ",""):""}
                        </div>
                      </div>
                      <div style={{fontSize:11,color:"#bbb",flexShrink:0}}>{timeStr}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity Log */}
            <div style={{marginTop:28}}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",color:"#bbb",marginBottom:12}}>Recent Activity</div>
              {(!adminData?.activityLog || adminData.activityLog.length===0) && (
                <div style={{background:"#fff",borderRadius:12,border:"1px solid #ebebeb",padding:24,textAlign:"center",color:"#bbb",fontSize:13}}>No activity yet — coaches will appear here when they log in or add clients.</div>
              )}
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {adminData?.activityLog?.map(log=>{
                  const isLogin   = log.event_type==="coach_login";
                  const isAdded   = log.event_type==="client_added";
                  const timeAgo   = (() => {
                    const diff = Date.now() - new Date(log.created_at).getTime();
                    const mins = Math.floor(diff/60000);
                    const hrs  = Math.floor(mins/60);
                    const days = Math.floor(hrs/24);
                    if (days>0)  return days+"d ago";
                    if (hrs>0)   return hrs+"h ago";
                    if (mins>0)  return mins+"m ago";
                    return "just now";
                  })();
                  return (
                    <div key={log.id} style={{background:"#fff",borderRadius:10,border:"1px solid #ebebeb",padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
                      <div style={{width:34,height:34,borderRadius:"50%",background:isLogin?"#e8f0ff":isAdded?"#e8f5e9":"#f5f4f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
                        {isLogin?"🔑":isAdded?"👤":"📝"}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,fontSize:13,color:"#1a1a1a"}}>{log.details}</div>
                        <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{log.coach_email}</div>
                      </div>
                      <div style={{fontSize:11,color:"#bbb",fontWeight:500,flexShrink:0}}>{timeAgo}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Refresh button */}
            <div style={{marginTop:20,textAlign:"center"}}>
              <button onClick={loadAdminData} style={{background:"transparent",border:"1.5px solid #ddd",color:"#666",padding:"9px 20px",borderRadius:8,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                🔄 Refresh Data
              </button>
            </div>
          </div>
        )}

        {/* COACH WEEK */}
        {view==="coachWeek"&&activeClient&&(isCoach||isAdmin)&&(
          <div>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:22}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:".07em",textTransform:"uppercase",marginBottom:4}}>Coach View</div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  {activeClient.avatarUrl && <img src={activeClient.avatarUrl} style={{width:38,height:38,borderRadius:"50%",objectFit:"cover",border:"2px solid #ebebeb",flexShrink:0}} alt={activeClient.name}/>}
                  <div>
                    <div style={{fontWeight:700,fontSize:20,letterSpacing:"-.02em"}}>{activeClient.name}</div>
                    {activeClient.email && <div style={{fontSize:11,color:"#aaa",marginTop:1}}>📧 {activeClient.email}</div>}
                  </div>
                </div>
                <div style={{fontSize:13,color:"#999",marginTop:3}}>{fmtShort(weekStart)} – {fmtShort(addDays(weekStart,6))}</div>
                <TimelineBadge client={activeClient} />
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>generateWeekPDF(weekDates, sessions.filter(s=>s.clientId===activeClient.id), activeClient.name, "")}
                  style={{background:"#f0f0ec",border:"none",borderRadius:8,padding:"8px 13px",fontSize:12,fontWeight:600,color:"#555",cursor:"pointer",fontFamily:"inherit"}}>📄 PDF</button>
                {[["‹ Prev",()=>setWeekStart(addDays(weekStart,-7))],["Today",()=>setWeekStart(mondayOf(new Date()))],["Next ›",()=>setWeekStart(addDays(weekStart,7))]].map(([l,fn])=>(
                  <button key={l} onClick={fn} style={{background:"transparent",color:"#1a1a1a",border:"1.5px solid #ddd",color:"#444",padding:"8px 13px",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
                ))}
                <button onClick={()=>setEditClientModal({...activeClient, planType:activeClient.planType||"weeks", planWeeks:activeClient.planWeeks||"", planStartDate:activeClient.planStartDate||"", competitionDate:activeClient.competitionDate||"", competitionName:activeClient.competitionName||"", pb:{CWT:activeClient.pb?.CWT||"", STA:activeClient.pb?.STA||"", DYN:activeClient.pb?.DYN||""}, avatarUrl:activeClient.avatarUrl||"", email:activeClient.email||""})}
                  style={{background:"transparent",border:"1.5px solid #ddd",color:"#555",padding:"8px 13px",borderRadius:8,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>✏️ Edit</button>
                {activeClient.archived ? (
                  <button onClick={()=>unarchiveClient(activeClient.id)} style={{background:"transparent",border:"1.5px solid #a5d6a7",color:"#2e7d32",padding:"8px 13px",borderRadius:8,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Unarchive</button>
                ) : (
                  <button onClick={()=>archiveClient(activeClient.id)} style={{background:"transparent",border:"1.5px solid #ffe082",color:"#f57f17",padding:"8px 13px",borderRadius:8,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Archive</button>
                )}
                <button onClick={()=>setConfirmDeleteId(activeClient.id)} style={{background:"transparent",border:"1.5px solid #e8c5c5",color:"#c0392b",padding:"8px 13px",borderRadius:8,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Delete</button>
              </div>
            </div>
            <WeekGrid weekDates={weekDates} clientId={activeClient.id} sessions={sessions} isClient={false}
              hasClipboard={!!clipboard}
              onClickSession={s=>setDayModal({session:s,role:"coach"})}
              onCopySession={s=>handleCopySession(s)}
              onPasteDay={(iso,cid)=>handlePasteSession(iso,cid)}
              onClickAdd={(iso,sid,del)=>{ if(del){removeSession(sid);}else{setAssignModal(iso);} }} />

            {/* This week completed summary */}
            {(()=>{
              const weekSessions = weekDates.flatMap(d=>sessions.filter(s=>s.clientId===activeClient.id&&s.date===toISO(d)));
              const completedThisWeek = weekSessions.filter(s=>s.feedback?.status==="completed");
              const needsReplyThisWeek = completedThisWeek.filter(s=>!s.feedback?.coachComment);
              if (completedThisWeek.length===0) return null;
              return (
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:11,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",color:"#bbb",marginBottom:10}}>
                    This Week — Completed Sessions {needsReplyThisWeek.length>0&&<span style={{color:"#e65100",marginLeft:8}}>({needsReplyThisWeek.length} need reply)</span>}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {completedThisWeek.map(s=>{
                      const m=gm(s.method);
                      const hasReply=!!s.feedback?.coachComment;
                      return(
                        <div key={s.id} onClick={()=>setDayModal({session:s,role:"coach"})}
                          style={{background:"#fff",borderRadius:10,border:`1.5px solid ${hasReply?"#a5d6a7":"#ffe082"}`,padding:"12px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:12,transition:"box-shadow .15s"}}
                          onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 10px rgba(0,0,0,.07)"}
                          onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                          <span style={{fontSize:20,flexShrink:0}}>{m.emoji}</span>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                              <span style={{fontWeight:600,fontSize:13}}>{s.plan?.gymData?.sessionName||m.label}</span>
                              <span style={{fontSize:11,color:"#aaa"}}>{fmtFull(s.date)}</span>
                            </div>
                            {s.method==="depth"&&s.feedback?.actualDepth&&<div style={{fontSize:12,color:"#3a4df4",fontWeight:700,marginTop:2}}>↓ {s.feedback.actualDepth}m reached</div>}
                            {s.feedback?.clientNotes&&<div style={{fontSize:11,color:"#888",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>"{s.feedback.clientNotes}"</div>}
                          </div>
                          <div style={{flexShrink:0,textAlign:"right"}}>
                            {hasReply
                              ? <span style={{fontSize:11,fontWeight:700,color:"#2e7d32",background:"#e8f5e9",padding:"3px 8px",borderRadius:20,border:"1px solid #a5d6a7"}}>✓ Replied</span>
                              : <span style={{fontSize:11,fontWeight:700,color:"#e65100",background:"#fff8e1",padding:"3px 8px",borderRadius:20,border:"1px solid #ffe082"}}>Reply →</span>
                            }
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:0}}>
              <div style={{background:"#fff",borderRadius:12,border:"1px solid #ebebeb",padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div><div style={{fontWeight:600,fontSize:14}}>Switch to Client View</div><div style={{fontSize:12,color:"#999",marginTop:2}}>See what {activeClient.name.split(" ")[0]} sees</div></div>
                <button onClick={()=>setView("clientWeek")} style={{background:"#1a1a1a",color:"#fff",border:"none",padding:"10px 18px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Open →</button>
              </div>
              <div style={{background:"#fff",borderRadius:12,border:"1px solid #ebebeb",padding:"14px 20px"}}>
                <div style={{fontWeight:600,fontSize:14,marginBottom:4}}>Copy from another client</div>
                <div style={{fontSize:12,color:"#999",marginBottom:10}}>Pick a client then copy any of their sessions</div>
                <select onChange={e=>{
                  const cid=e.target.value;
                  if(!cid) return;
                  setCopyFromModal(cid);
                  e.target.value="";
                }} style={{width:"100%",padding:"7px 10px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none",background:"#fff",color:"#1a1a1a",cursor:"pointer"}}>
                  <option value="">Select client to copy from...</option>
                  {clients.filter(c=>c.id!==activeClient.id).map(c=>(
                    <option key={c.id} value={c.id}>{c.name} ({sessions.filter(s=>s.clientId===c.id).length} sessions)</option>
                  ))}
                </select>
                {clipboard&&<div style={{marginTop:8,fontSize:11,color:"#4caf50",fontWeight:600}}>✓ Session copied! Click Paste on any day.</div>}
              </div>
            </div>

            {/* Coach Notes */}
            {(()=>{
              return (
                <div style={{background:"#fff",borderRadius:14,border:"1px solid #ebebeb",padding:"18px 22px",marginTop:20,marginBottom:0}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#1a1a1a"}}>📝 Coach Notes</div>
                    <div style={{fontSize:11,color:"#aaa"}}>Private — only you see this</div>
                  </div>
                  <textarea
                    value={coachNotes[activeClient.id]||""}
                    onChange={e=>setCoachNotes(p=>({...p,[activeClient.id]:e.target.value}))}
                    placeholder={`Notes about ${activeClient.name.split(" ")[0]}… strengths, areas to work on, observations, next steps…`}
                    style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:9,fontSize:13,fontFamily:"inherit",outline:"none",resize:"vertical",minHeight:90,color:"#1a1a1a",lineHeight:1.65,boxSizing:"border-box"}}
                  />
                  <button onClick={()=>saveCoachNotes(activeClient.id, coachNotes[activeClient.id]||"")} disabled={savingNotes}
                    style={{marginTop:8,background:"#1a1a1a",color:"#fff",border:"none",padding:"8px 18px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:savingNotes?0.6:1}}>
                    {savingNotes?"Saving…":"Save Notes"}
                  </button>
                </div>
              );
            })()}

            {/* Progress Charts */}
            <div style={{marginTop:24}}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",color:"#bbb",marginBottom:14}}>Progress Charts</div>
              <ProgressCharts sessions={sessions.filter(s=>s.clientId===activeClient.id)} clientName={activeClient.name} />
            </div>
          </div>
        )}

        {/* ATHLETE DASHBOARD */}
        {view==="dashboard"&&profile?.role==="client"&&(
          <div>
            {/* Header */}
            {(()=>{
              const client = activeClient || clients[0];
              if (!client) return <div style={{textAlign:"center",color:"#bbb",padding:60,fontSize:15}}>Loading your dashboard…</div>;
              return (
                <div style={{marginBottom:28,display:"flex",alignItems:"center",gap:16}}>
                  <label style={{cursor:"pointer",flexShrink:0}}>
                    <div style={{width:72,height:72,borderRadius:"50%",background:"#f0f0ec",border:"2px dashed #ddd",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
                      {client.avatarUrl
                        ? <img src={client.avatarUrl} style={{width:"100%",height:"100%",objectFit:"cover"}} alt={client.name}/>
                        : <span style={{fontSize:28}}>👤</span>
                      }
                      <div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,0.4)",color:"#fff",fontSize:9,fontWeight:700,textAlign:"center",padding:"3px 0",letterSpacing:".05em"}}>PHOTO</div>
                    </div>
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{
                      const file = e.target.files[0];
                      if (!file) return;
                      compressImage(file, async url => {
                        await supabase.from("clients").update({avatar_url:url}).eq("id",client.id);
                        setClients(prev=>prev.map(c=>c.id===client.id?{...c,avatarUrl:url}:c));
                        setActiveClient(prev=>prev?{...prev,avatarUrl:url}:prev);
                      });
                    }}/>
                  </label>
                  <div>
                    <div style={{fontWeight:700,fontSize:26,letterSpacing:"-.03em"}}>{client.name}</div>
                    <div style={{fontSize:12,color:"#aaa",marginTop:3}}>Tap photo to update</div>
                  </div>
                </div>
              );
            })()}

            {/* Training timeline progress */}
            {(activeClient.planType==="competition"&&activeClient.competitionDate) || (activeClient.planType==="weeks"&&activeClient.planWeeks&&activeClient.planStartDate) ? (()=>{
              const today = new Date();
              let totalDays, elapsedDays, label, sublabel;
              if (activeClient.planType==="competition"&&activeClient.competitionDate) {
                const start = activeClient.planStartDate ? new Date(activeClient.planStartDate) : new Date(sessions.filter(s=>s.clientId===activeClient.id).sort((a,b)=>a.date.localeCompare(b.date))[0]?.date || today);
                const end = new Date(activeClient.competitionDate);
                totalDays = Math.max(1, Math.round((end-start)/(1000*60*60*24)));
                elapsedDays = Math.max(0, Math.round((today-start)/(1000*60*60*24)));
                const daysLeft = Math.max(0, Math.round((end-today)/(1000*60*60*24)));
                label = activeClient.competitionName || "Competition";
                sublabel = daysLeft > 0 ? daysLeft + " days to go" : "Competition day!";
              } else {
                const start = new Date(activeClient.planStartDate);
                totalDays = activeClient.planWeeks * 7;
                elapsedDays = Math.max(0, Math.round((today-start)/(1000*60*60*24)));
                const weeksLeft = Math.max(0, Math.ceil((totalDays-elapsedDays)/7));
                label = activeClient.planWeeks + "-Week Training Plan";
                sublabel = weeksLeft > 0 ? weeksLeft + " weeks remaining" : "Plan complete!";
              }
              const pct = Math.min(100, Math.round((elapsedDays/totalDays)*100));
              return (
                <div style={{background:"#fff",borderRadius:14,border:"1px solid #ebebeb",padding:"20px 24px",marginBottom:20}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:15}}>{label}</div>
                      <div style={{fontSize:13,color:"#888",marginTop:2}}>{sublabel}</div>
                    </div>
                    <div style={{fontSize:28,fontWeight:800,color:"#1a1a1a"}}>{pct}%</div>
                  </div>
                  <div style={{height:10,background:"#f0f0f0",borderRadius:5,overflow:"hidden"}}>
                    <div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,#3a4df4,#6a7ef4)",borderRadius:5,transition:"width .5s"}}/>
                  </div>
                  {activeClient.planType==="competition"&&activeClient.competitionDate&&(
                    <div style={{fontSize:11,color:"#aaa",marginTop:8,textAlign:"right"}}>
                      🏆 {activeClient.competitionName||"Competition"} · {new Date(activeClient.competitionDate).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}
                    </div>
                  )}
                </div>
              );
            })() : null}

            {/* PB stats */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
              {[
                {label:"CWT PB",value:activeClient.pb?.CWT?activeClient.pb.CWT+"m":"—",emoji:"🌊"},
                {label:"STA PB",value:activeClient.pb?.STA||"—",emoji:"🧘"},
                {label:"DYN PB",value:activeClient.pb?.DYN?activeClient.pb.DYN+"m":"—",emoji:"💧"},
              ].map((s,i)=>(
                <div key={i} style={{background:"#fff",borderRadius:12,border:"1px solid #ebebeb",padding:"18px 20px",textAlign:"center"}}>
                  <div style={{fontSize:24,marginBottom:4}}>{s.emoji}</div>
                  <div style={{fontSize:26,fontWeight:800,letterSpacing:"-.02em"}}>{s.value}</div>
                  <div style={{fontSize:11,color:"#aaa",marginTop:4,fontWeight:600,letterSpacing:".05em",textTransform:"uppercase"}}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Session stats */}
            {(()=>{
              const clientSessions = sessions.filter(s=>s.clientId===activeClient.id);
              const completed = clientSessions.filter(s=>s.feedback?.status==="completed").length;
              const total = clientSessions.length;
              const pct = total > 0 ? Math.round((completed/total)*100) : 0;
              return (
                <div style={{background:"#fff",borderRadius:14,border:"1px solid #ebebeb",padding:"20px 24px",marginBottom:20}}>
                  <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>Training Stats</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
                    {[
                      {label:"Sessions Planned",value:total},
                      {label:"Completed",value:completed,color:"#2e7d32"},
                      {label:"Completion Rate",value:pct+"%",color:pct>=80?"#2e7d32":pct>=50?"#f57f17":"#c62828"},
                    ].map((s,i)=>(
                      <div key={i} style={{textAlign:"center",padding:"12px",background:"#f8f8f6",borderRadius:10}}>
                        <div style={{fontSize:22,fontWeight:800,color:s.color||"#1a1a1a"}}>{s.value}</div>
                        <div style={{fontSize:11,color:"#aaa",marginTop:3,fontWeight:600,letterSpacing:".05em",textTransform:"uppercase"}}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Progress charts */}
            {sessions.filter(s=>s.clientId===activeClient.id).some(s=>s.method==="depth"||s.method==="pool-co2"||s.method==="static") && (
              <div style={{background:"#fff",borderRadius:14,border:"1px solid #ebebeb",padding:"20px 24px",marginBottom:20}}>
                <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>Progress Charts</div>
                <ProgressCharts sessions={sessions.filter(s=>s.clientId===activeClient.id)} clientName={activeClient.name} />
              </div>
            )}

            {/* Back to week button */}
            <button onClick={()=>{ if(!activeClient&&clients[0]) setActiveClient(clients[0]); setView("clientWeek"); }}
              style={{background:"#1a1a1a",color:"#fff",border:"none",padding:"13px",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",width:"100%"}}>
              → Go to My Training Week
            </button>
          </div>
        )}

        {/* CLIENT WEEK */}
        {view==="clientWeek"&&activeClient&&(
          <div>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:22}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"#3a8ef4",letterSpacing:".07em",textTransform:"uppercase",marginBottom:4}}>Athlete View</div>
                <div style={{fontWeight:700,fontSize:20,letterSpacing:"-.02em"}}>{activeClient.name}</div>
                <div style={{fontSize:13,color:"#999",marginTop:3}}>{fmtShort(weekStart)} – {fmtShort(addDays(weekStart,6))}</div>
                <TimelineBadgeClient client={activeClient} />
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <button onClick={()=>generateWeekPDF(weekDates, sessions.filter(s=>s.clientId===activeClient.id), activeClient.name, "")}
                  style={{background:"#f0f0ec",border:"none",borderRadius:8,padding:"8px 13px",fontSize:12,fontWeight:600,color:"#555",cursor:"pointer",fontFamily:"inherit"}}>
                  📄 PDF
                </button>
                {[["‹ Prev",()=>setWeekStart(addDays(weekStart,-7))],["Today",()=>setWeekStart(mondayOf(new Date()))],["Next ›",()=>setWeekStart(addDays(weekStart,7))]].map(([l,fn])=>(
                  <button key={l} onClick={fn} style={{background:"transparent",color:"#1a1a1a",border:"1.5px solid #ddd",color:"#444",padding:"8px 13px",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
                ))}
              </div>
            </div>
            {/* Drag hint for client */}
            <div style={{fontSize:11,color:"#bbb",textAlign:"center",marginBottom:8,fontWeight:500}}>
              Drag sessions between days to reschedule ↔
            </div>
            <WeekGrid weekDates={weekDates} clientId={activeClient.id} sessions={sessions} isClient={true}
              hasClipboard={false}
              onClickSession={s=>setDayModal({session:s,role:"client"})}
              onMoveSession={handleMoveSession} />
            {/* Week summary bar */}
            {(()=>{
              const weekSessions = weekDates.flatMap(d=>sessions.filter(s=>s.clientId===activeClient.id&&s.date===toISO(d)));
              const done = weekSessions.filter(s=>s.feedback?.status==="completed").length;
              const total = weekSessions.length;
              const hasNew = weekSessions.some(s=>s.feedback?.coachComment && s.feedback?.status==="completed");
              if (total===0) return null;
              return (
                <div style={{background:"#fff",border:"1px solid #ebebeb",borderRadius:12,padding:"14px 18px",marginBottom:16,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
                  <div style={{flex:1,minWidth:160}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:".06em",textTransform:"uppercase",marginBottom:6}}>Week Progress</div>
                    <div style={{background:"#f0f0ec",borderRadius:20,height:8,overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:20,background:"#4caf50",width:`${total>0?(done/total*100):0}%`,transition:"width .4s"}}/>
                    </div>
                    <div style={{fontSize:12,color:"#888",marginTop:5}}>{done} of {total} sessions completed</div>
                  </div>
                  {hasNew && <div style={{fontSize:12,fontWeight:700,color:"#2e7d32",background:"#e8f5e9",padding:"6px 12px",borderRadius:20,border:"1px solid #a5d6a7"}}>💬 New coach feedback</div>}
                </div>
              );
            })()}
            <div style={{fontSize:11,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",color:"#bbb",marginBottom:12}}>This Week's Sessions</div>
            {weekDates.flatMap(d=>sessions.filter(s=>s.clientId===activeClient.id&&s.date===toISO(d))).length===0&&<div style={{background:"#fff",borderRadius:12,border:"1px solid #ebebeb",padding:40,textAlign:"center",color:"#bbb",fontSize:14}}>No sessions planned this week.</div>}

            {weekDates.flatMap(d=>sessions.filter(s=>s.clientId===activeClient.id&&s.date===toISO(d))).map(s=>{
              const m=gm(s.method);
              const sessionName = s.plan?.gymData?.sessionName || s.plan?.gymData?.name || null;
              const hasCoachReply = s.feedback?.coachComment && s.feedback?.status==="completed";
              return(
                <div key={s.id} style={{background:"#fff",borderRadius:12,border:"1px solid #ebebeb",borderLeft:`4px solid ${m.dot}`,marginBottom:12,cursor:"pointer",transition:"box-shadow .15s"}}
                  onClick={()=>setDayModal({session:s,role:"client"})}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,.07)"}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                  <div style={{padding:"14px 18px"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 11px",borderRadius:20,fontSize:12,fontWeight:700,background:m.bg,color:m.text,border:`1px solid ${m.border}`}}>{m.emoji} {m.label}</span>
                        <span style={{fontSize:12,color:"#aaa"}}>{fmtFull(s.date)}</span>
                      </div>
                      <StatusBadge status={s.feedback?.status}/>
                    </div>
                    {sessionName && <div style={{fontSize:14,fontWeight:600,color:"#1a1a1a",marginBottom:4}}>{sessionName}</div>}
                    {s.plan?.mainSet&&!sessionName&&<div style={{fontSize:13,color:"#444",lineHeight:1.6,marginBottom:4}}>{s.plan.mainSet}</div>}
                    {s.method==="depth"&&s.plan?.gymData?.dives&&(
                      <div style={{fontSize:12,color:"#888",marginBottom:4}}>{s.plan.gymData.dives.length} dives planned{s.plan.gymData.location ? ` · 📍 ${s.plan.gymData.location}` : ""}</div>
                    )}
                    {s.method==="depth"&&s.plan?.targetDepth&&!s.plan?.gymData&&(
                      <div style={{display:"flex",gap:14,marginBottom:4}}>
                        <div><span style={{fontSize:10,color:"#aaa",fontWeight:700,letterSpacing:".06em"}}>TARGET </span><span style={{fontFamily:"monospace",fontWeight:700}}>{s.plan.targetDepth}m</span></div>
                        {s.plan.openLine&&<div><span style={{fontSize:10,color:"#aaa",fontWeight:700,letterSpacing:".06em"}}>MODE </span><span style={{fontFamily:"monospace",fontWeight:700}}>Open Line</span></div>}
                        {s.feedback?.actualDepth&&<div><span style={{fontSize:10,color:"#aaa",fontWeight:700,letterSpacing:".06em"}}>ACTUAL </span><span style={{fontFamily:"monospace",fontWeight:700,color:"#2e7d32"}}>{s.feedback.actualDepth}m</span></div>}
                      </div>
                    )}
                    {s.plan?.gymData?.sections&&<div style={{fontSize:12,color:"#888",marginBottom:4}}>{s.plan.gymData.sections?.reduce((a,sec)=>a+(sec.blocks?.reduce((b,bl)=>b+(bl.exercises?.length||0),0)||0),0)||""}{" exercises"}</div>}
                    {hasCoachReply && (
                      <div style={{marginTop:6,background:"#e8f5e9",border:"1px solid #c8e6c9",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#2e7d32"}}>
                        💬 <strong>Coach:</strong> {s.feedback.coachComment.length > 80 ? s.feedback.coachComment.slice(0,80)+"…" : s.feedback.coachComment}
                      </div>
                    )}
                    <div style={{marginTop:6,fontSize:11,color:"#ccc"}}>Tap to open →</div>
                  </div>
                </div>
              );
            })}

            {/* Progress Charts for athlete */}
            {sessions.filter(s=>s.clientId===activeClient.id).some(s=>s.method==="depth"||s.method==="pool-co2"||s.method==="static") && (
              <div style={{marginBottom:24,marginTop:8}}>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",color:"#bbb",marginBottom:14}}>Your Progress</div>
                <ProgressCharts sessions={sessions.filter(s=>s.clientId===activeClient.id)} clientName={activeClient.name} />
              </div>
            )}

            {/* Welcome message from coach — always visible at bottom */}
            {(()=>{
              const msg = resolveWelcome(activeClient.name);
              const lines = msg.split("\n").filter(l=>l.trim());
              const bodyLines = lines.slice(0,-1);
              const signatureLine = lines[lines.length-1];
              return (
                <div style={{background:"#fff",borderRadius:14,border:"1px solid #ebebeb",borderLeft:"3px solid #3a8ef4",padding:"18px 22px",marginTop:8,marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                    <div style={{width:36,height:36,borderRadius:"50%",background:"#e8f0ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🤿</div>
                    <div>
                      <div style={{fontWeight:600,fontSize:15,color:"#1a1a1a"}}>{lines[0]}</div>
                      <div style={{fontSize:11,color:"#aaa",marginTop:1}}>From your coach</div>
                    </div>
                  </div>
                  <div style={{fontSize:13,color:"#555",lineHeight:1.75}}>
                    {bodyLines.slice(1).map((l,i)=><p key={i} style={{margin:"0 0 6px"}}>{l}</p>)}
                  </div>
                  {signatureLine && <div style={{fontSize:13,fontWeight:500,color:"#1a1a1a",marginTop:10,fontStyle:"italic"}}>{signatureLine}</div>}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {assignModal&&activeClient&&<AssignModal date={assignModal} clientName={activeClient.name} onClose={()=>setAssignModal(null)} onSave={handleAssignSave} existingSessions={sessions.filter(s=>s.clientId===activeClient.id&&s.plan?.gymData)} />}
            {/* Clipboard banner */}
      {clipboard && view==="coachWeek" && (
        <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#1a1a1a",color:"#fff",padding:"12px 20px",borderRadius:12,fontSize:13,fontWeight:500,zIndex:400,display:"flex",alignItems:"center",gap:14,boxShadow:"0 8px 24px rgba(0,0,0,.2)"}}>
          <span>📋 {clipboard.method} session copied — click a day's <strong>Paste</strong> button</span>
          <button onClick={()=>setClipboard(null)} style={{background:"rgba(255,255,255,.2)",border:"none",color:"#fff",padding:"4px 10px",borderRadius:6,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Clear</button>
        </div>
      )}

      {dayModal&&<DayModal session={sessions.find(s=>s.id===dayModal.session.id)||dayModal.session} role={dayModal.role} onClose={()=>setDayModal(null)} onSave={fb=>handleFeedbackSave(dayModal.session.id,fb)} onEdit={s=>setEditModal(s)}/>}
      {editClientModal&&(
        <AddClientModal
          onClose={()=>setEditClientModal(null)}
          onSave={handleEditClient}
          initialClient={editClientModal}
          isEditing={true}
        />
      )}
      {editModal&&<EditSessionModal
        session={sessions.find(x=>x.id===editModal.id)||editModal}
        onClose={()=>setEditModal(null)}
        onSave={handleEditSave}
        onSaveText={async (s,plan)=>{
          const {error}=await supabase.from("sessions").update({
            plan_warmup:plan.warmup||null, plan_mainset:plan.mainSet||null, plan_cooldown:plan.cooldown||null,
            plan_target_depth:plan.targetDepth||null, plan_open_line:plan.openLine||false, plan_coach_notes:plan.coachNotes||null,
          }).eq("id",s.id);
          if(!error){setSessions(prev=>prev.map(x=>x.id===s.id?{...x,plan:{...x.plan,...plan}}:x));setEditModal(null);flash("Plan updated!");}
        }}
      />}
      {addClientModal&&<AddClientModal onClose={()=>setAddClientModal(false)} onSave={handleAddClient}/>}
      {addCoachModal&&<AddCoachModal onClose={()=>setAddCoachModal(false)} onSave={handleAddCoach}/>}
      {confirmDeleteId&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"#fff",borderRadius:16,padding:"28px 32px",maxWidth:380,width:"90%",textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
            <div style={{fontSize:32,marginBottom:12}}>⚠️</div>
            <div style={{fontWeight:700,fontSize:18,marginBottom:8}}>Delete Client?</div>
            <div style={{fontSize:14,color:"#666",marginBottom:24,lineHeight:1.6}}>
              This will permanently delete <strong>{clients.find(c=>c.id===confirmDeleteId)?.name}</strong> and all their sessions and data. This cannot be undone.
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setConfirmDeleteId(null)}
                style={{flex:1,padding:"11px",borderRadius:9,border:"1.5px solid #e0e0e0",background:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",color:"#555"}}>
                Cancel
              </button>
              <button onClick={()=>{ deleteClient(confirmDeleteId); setConfirmDeleteId(null); }}
                style={{flex:1,padding:"11px",borderRadius:9,border:"none",background:"#c0392b",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {copyFromModal&&(
        <CopyFromModal
          sessions={sessions.filter(s=>s.clientId===copyFromModal).sort((a,b)=>b.date.localeCompare(a.date))}
          clientName={clients.find(c=>c.id===copyFromModal)?.name||""}
          onClose={()=>setCopyFromModal(null)}
          onCopy={s=>{ handleCopySession(s); setCopyFromModal(null); flash("Session copied! Click Paste on any day."); }}
        />
      )}
      {newPBModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:20,padding:"32px 28px",maxWidth:400,width:"100%",textAlign:"center",boxShadow:"0 24px 64px rgba(0,0,0,.25)"}}>
            <div style={{fontSize:52,marginBottom:8}}>🏆</div>
            <div style={{fontWeight:800,fontSize:22,letterSpacing:"-.02em",marginBottom:6}}>New Personal Best!</div>
            <div style={{fontSize:14,color:"#888",marginBottom:24}}>Amazing performance — a new record has been set!</div>
            {newPBModal.pbs.map((pb,i)=>(
              <div key={i} style={{background:"#fffbe6",border:"2px solid #ffe082",borderRadius:14,padding:"16px 20px",marginBottom:12}}>
                <div style={{fontSize:28,marginBottom:4}}>{pb.emoji}</div>
                <div style={{fontWeight:700,fontSize:15,color:"#7a6200",marginBottom:2}}>{pb.label} PB</div>
                <div style={{fontWeight:800,fontSize:32,color:"#1a1a1a",fontFamily:"monospace",letterSpacing:"-.02em"}}>{pb.value}{pb.unit}</div>
                {pb.prev && <div style={{fontSize:12,color:"#aaa",marginTop:4}}>Previous: {pb.prev}{pb.unit}</div>}
              </div>
            ))}
            <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:8}}>
              <button onClick={async()=>{
                for (const pb of newPBModal.pbs) await handleConfirmPB(pb, newPBModal.clientId);
                setNewPBModal(null); flash("PB updated! 🏆");
              }} style={{background:"#1a1a1a",color:"#fff",border:"none",padding:"13px",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                ✓ Update PB record
              </button>
              <button onClick={()=>setNewPBModal(null)} style={{background:"transparent",color:"#aaa",border:"1.5px solid #e0e0e0",padding:"11px",borderRadius:10,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                Keep old PB
              </button>
            </div>
          </div>
        </div>
      )}
      {toast&&<div style={{position:"fixed",bottom:24,right:24,background:"#1a1a1a",color:"#fff",padding:"12px 20px",borderRadius:10,fontSize:13,fontWeight:500,zIndex:999,animation:"fi .2s"}}>✓ {toast}<style>{`@keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style></div>}
    </div>
  );
}

// ── Copy From Client Modal ────────────────────────────────────────────────────
function CopyFromModal({ sessions, clientName, onClose, onCopy }) {
  const [filter, setFilter] = useState("");
  const filtered = sessions.filter(s=>{
    if (!filter) return true;
    const name = s.plan?.gymData?.sessionName || s.plan?.mainSet || s.method;
    return name?.toLowerCase().includes(filter.toLowerCase()) || s.method.toLowerCase().includes(filter.toLowerCase());
  });
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#fff",borderRadius:16,padding:"24px",maxWidth:540,width:"100%",maxHeight:"80vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div>
            <div style={{fontWeight:700,fontSize:17}}>Copy from {clientName}</div>
            <div style={{fontSize:12,color:"#aaa",marginTop:2}}>{sessions.length} sessions — pick one to copy</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,color:"#aaa",cursor:"pointer",lineHeight:1}}>×</button>
        </div>
        <input
          placeholder="Search sessions…"
          value={filter} onChange={e=>setFilter(e.target.value)}
          style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e0e0e0",borderRadius:9,fontSize:13,fontFamily:"inherit",outline:"none",marginBottom:12,boxSizing:"border-box"}}
        />
        <div style={{overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:8}}>
          {filtered.length===0&&<div style={{textAlign:"center",color:"#bbb",padding:32,fontSize:14}}>No sessions found</div>}
          {filtered.map(s=>{
            const m=gm(s.method);
            const name=s.plan?.gymData?.sessionName||s.plan?.gymData?.name||null;
            const sub=s.plan?.mainSet||(s.method==="depth"&&s.plan?.gymData?.dives?`${s.plan.gymData.dives.length} dives`:null)||(s.plan?.gymData?.sections?`${s.plan.gymData.sections?.reduce((a,sec)=>a+(sec.blocks?.reduce((b,bl)=>b+(bl.exercises?.length||0),0)||0),0)} exercises`:null);
            return (
              <div key={s.id} onClick={()=>onCopy(s)}
                style={{background:"#fafaf8",borderRadius:10,border:"1.5px solid #ebebeb",borderLeft:`3px solid ${m.dot}`,padding:"12px 14px",cursor:"pointer",transition:"all .12s"}}
                onMouseEnter={e=>{e.currentTarget.style.background="#f0f0ec";e.currentTarget.style.borderColor=m.dot;}}
                onMouseLeave={e=>{e.currentTarget.style.background="#fafaf8";e.currentTarget.style.borderColor="#ebebeb";}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontSize:12,fontWeight:700,background:m.bg,color:m.text,border:`1px solid ${m.border}`,padding:"2px 8px",borderRadius:20}}>{m.emoji} {m.label}</span>
                  <span style={{fontSize:11,color:"#bbb"}}>{fmtFull(s.date)}</span>
                </div>
                {name&&<div style={{fontSize:13,fontWeight:600,color:"#1a1a1a"}}>{name}</div>}
                {sub&&<div style={{fontSize:12,color:"#888",marginTop:2,lineHeight:1.5}}>{sub}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
