import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const METHODS = [
  { key:"gym-strength",   label:"Gym Strength",   emoji:"🏋️", bg:"#fff0e6", border:"#f4a96a", text:"#b85c00", dot:"#f4803a" },
  { key:"pool-technique", label:"Pool Technique", emoji:"🏊",  bg:"#e6f4ff", border:"#6ab0f4", text:"#005fa3", dot:"#3a8ef4" },
  { key:"pool-co2",       label:"Pool CO₂",       emoji:"💨", bg:"#edf6e6", border:"#7ec87e", text:"#2d7a2d", dot:"#4db84d" },
  { key:"gym-cardio",     label:"Gym Cardio",     emoji:"🏃",  bg:"#fdf0fb", border:"#d97ec8", text:"#8b1f7a", dot:"#c94db8" },
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
function toISO(d) { return d.toISOString().slice(0,10); }
function fmtShort(d) { return d.toLocaleDateString("en-US", { month:"short", day:"numeric" }); }
function fmtFull(iso) {
  if (!iso) return "";
  const [y,mo,day] = iso.split("-");
  return new Date(Number(y),Number(mo)-1,Number(day)).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
}

function dbToSession(row) {
  return {
    id: row.id, clientId: row.client_id, date: row.date, method: row.method,
    plan: {
      warmup: row.plan_warmup||"", mainSet: row.plan_mainset||"", cooldown: row.plan_cooldown||"",
      targetDepth: row.plan_target_depth||null, openLine: row.plan_open_line||false, coachNotes: row.plan_coach_notes||"",
    },
    feedback: row.feedback ? {
      status: row.feedback.status||null, actualDepth: row.feedback.actual_depth||"",
      earlyTurn: row.feedback.early_turn||false, earlyTurnDepth: row.feedback.early_turn_depth||"",
      feeling: row.feedback.feeling||"", limitingFactor: row.feedback.limiting_factor||"",
      clientNotes: row.feedback.client_notes||"", coachComment: row.feedback.coach_comment||"",
    } : { status:null, actualDepth:"", earlyTurn:false, earlyTurnDepth:"", feeling:"", limitingFactor:"", clientNotes:"", coachComment:"" },
  };
}

function dbToClient(row) {
  return { id:row.id, name:row.name, age:row.age, level:row.level, goal:row.goal, pb:{CWT:row.pb_cwt, STA:row.pb_sta, DYN:row.pb_dyn} };
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
    <div style={{minHeight:"100vh",background:"#f5f4f0",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans','Helvetica Neue',sans-serif"}}>
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
  if (!s) return <span style={{display:"inline-flex",alignItems:"center",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:"#f5f4f0",border:"1px solid #e8e8e8",color:"#bbb"}}>— Pending</span>;
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
function DayModal({ session, role, onClose, onSave }) {
  const m = gm(session.method);
  const isDepth = session.method==="depth";
  const isClient = role==="client";
  const [fb, setFb] = useState({...session.feedback});
  const [saving, setSaving] = useState(false);

  async function handleSave() { setSaving(true); await onSave(fb); setSaving(false); }

  return (
    <Modal onClose={onClose} wide>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
        <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:700,background:m.bg,color:m.text,border:`1px solid ${m.border}`}}>{m.emoji} {m.label}</span>
        <span style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:".06em",textTransform:"uppercase"}}>{isClient?"Athlete View":"Coach View"}</span>
      </div>
      <div style={{fontWeight:700,fontSize:19,letterSpacing:"-.02em",marginBottom:14}}>{fmtFull(session.date)}</div>
      {isDepth&&session.plan?.targetDepth&&(
        <div style={{display:"flex",gap:10,marginBottom:16}}>
          <div style={{background:m.bg,border:`1px solid ${m.border}`,borderRadius:9,padding:"8px 16px",display:"inline-flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:11,fontWeight:700,color:m.text}}>🎯 TARGET</span>
            <span style={{fontFamily:"monospace",fontWeight:700,fontSize:18,color:m.text}}>{session.plan.targetDepth}m</span>
          </div>
          {session.plan.openLine&&<div style={{background:"#f5f4f0",borderRadius:9,padding:"8px 14px",fontSize:12,fontWeight:700,color:"#666",display:"inline-flex",alignItems:"center"}}>Open Line</div>}
        </div>
      )}
      {session.plan?.warmup&&<div style={{background:"#f8f8f6",borderRadius:10,padding:"13px 16px",marginBottom:10}}><div style={{fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"#bbb",marginBottom:6}}>Warm-up</div><div style={{fontSize:14,color:"#333",lineHeight:1.65}}>{session.plan.warmup}</div></div>}
      {session.plan?.mainSet&&<div style={{background:"#f8f8f6",borderRadius:10,padding:"13px 16px",marginBottom:10}}><div style={{fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"#bbb",marginBottom:6}}>Main Set</div><div style={{fontSize:14,color:"#333",lineHeight:1.65}}>{session.plan.mainSet}</div></div>}
      {session.plan?.cooldown&&<div style={{background:"#f8f8f6",borderRadius:10,padding:"13px 16px",marginBottom:10}}><div style={{fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"#bbb",marginBottom:6}}>Cool-down</div><div style={{fontSize:14,color:"#333",lineHeight:1.65}}>{session.plan.cooldown}</div></div>}
      {session.plan?.coachNotes&&<div style={{background:"#fffbe6",border:"1px solid #ffe082",borderRadius:10,padding:"13px 16px",marginBottom:14}}><div style={{fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"#a07a00",marginBottom:6}}>📌 Coach Notes</div><div style={{fontSize:14,color:"#5a4800",lineHeight:1.65}}>{session.plan.coachNotes}</div></div>}
      <div style={{borderTop:"2px solid #f0f0ec",paddingTop:20,marginTop:4}}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>{isClient?"Your Feedback":"Client Feedback"}</div>
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
        {!isClient&&<div style={{background:"#f8f8f6",borderRadius:10,padding:"13px 16px",marginBottom:14}}><div style={{fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"#aaa",marginBottom:8}}>Your reply to the athlete</div><textarea style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:14,background:"#fff",outline:"none",resize:"vertical",minHeight:68,fontFamily:"inherit",color:"#1a1a1a"}} placeholder="Leave feedback, encouragement or adjustments..." value={fb.coachComment} onChange={e=>setFb(p=>({...p,coachComment:e.target.value}))} /></div>}
        {isClient&&session.feedback?.coachComment&&<div style={{background:"#e8f5e9",border:"1px solid #a5d6a7",borderRadius:10,padding:"13px 16px",marginBottom:14}}><div style={{fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"#2e7d32",marginBottom:6}}>💬 Coach's Response</div><div style={{fontSize:14,color:"#1b5e20",lineHeight:1.65}}>{session.feedback.coachComment}</div></div>}
        <div style={{display:"flex",gap:10}}>
          <button onClick={handleSave} disabled={saving} style={{background:"#1a1a1a",color:"#fff",border:"none",padding:"11px 22px",borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:saving?0.6:1}}>{saving?"Saving...":"Save Feedback"}</button>
          <button onClick={onClose} style={{background:"transparent",border:"1.5px solid #ddd",color:"#444",padding:"10px 20px",borderRadius:8,fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Close</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Assign Modal ──────────────────────────────────────────────────────────────
function AssignModal({ date, clientName, onClose, onSave }) {
  const [method, setMethod] = useState("depth");
  const [plan, setPlan] = useState({warmup:"",mainSet:"",cooldown:"",targetDepth:"",openLine:false,coachNotes:""});
  const [saving, setSaving] = useState(false);
  const isDepth = method==="depth";

  async function handleSave() { setSaving(true); await onSave({method, plan:{...plan, targetDepth:plan.targetDepth?Number(plan.targetDepth):null}}); setSaving(false); }

  return (
    <Modal onClose={onClose} wide>
      <div style={{fontWeight:700,fontSize:18,marginBottom:4,letterSpacing:"-.02em"}}>Plan Session</div>
      <div style={{fontSize:13,color:"#999",marginBottom:20}}>{clientName} · {fmtFull(date)}</div>
      <div style={{fontSize:11,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",color:"#bbb",marginBottom:10}}>Training Method</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:20}}>
        {METHODS.map(m=>{const sel=method===m.key;return(
          <button key={m.key} onClick={()=>setMethod(m.key)} style={{borderRadius:10,padding:"10px 8px",border:`2px solid ${sel?m.dot:"#e8e8e8"}`,background:sel?m.bg:"#fff",color:sel?m.text:"#aaa",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:5,transition:"all .12s"}}>
            <span style={{fontSize:20}}>{m.emoji}</span><span style={{lineHeight:1.3,textAlign:"center"}}>{m.label}</span>
          </button>
        );})}
      </div>
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
        <button onClick={onClose} style={{background:"transparent",border:"1.5px solid #ddd",color:"#444",padding:"10px 20px",borderRadius:8,fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
      </div>
    </Modal>
  );
}

// ── Add Client Modal ──────────────────────────────────────────────────────────
function AddClientModal({ onClose, onSave }) {
  const [form, setForm] = useState({name:"",age:"",level:"Competitive",goal:"",email:"",password:"",pb:{CWT:"",STA:"",DYN:""}});
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.name||!form.email||!form.password) return;
    setSaving(true); await onSave(form); setSaving(false);
  }

  return (
    <Modal onClose={onClose}>
      <div style={{fontWeight:700,fontSize:18,marginBottom:20,letterSpacing:"-.02em"}}>New Client</div>
      <div style={{display:"flex",flexDirection:"column",gap:13}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><div style={{fontSize:12,fontWeight:600,color:"#666",marginBottom:6}}>Full Name</div><input style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:14,outline:"none",fontFamily:"inherit",color:"#1a1a1a"}} placeholder="Name" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} /></div>
          <div><div style={{fontSize:12,fontWeight:600,color:"#666",marginBottom:6}}>Age</div><input type="number" style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:14,outline:"none",fontFamily:"inherit",color:"#1a1a1a"}} placeholder="Age" value={form.age} onChange={e=>setForm(p=>({...p,age:e.target.value}))} /></div>
        </div>
        <div><div style={{fontSize:12,fontWeight:600,color:"#666",marginBottom:6}}>Level</div><select style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:14,outline:"none",fontFamily:"inherit",background:"#fff",color:"#1a1a1a"}} value={form.level} onChange={e=>setForm(p=>({...p,level:e.target.value}))}>{["Beginner","Intermediate","Advanced","Competitive"].map(l=><option key={l}>{l}</option>)}</select></div>
        <div><div style={{fontSize:12,fontWeight:600,color:"#666",marginBottom:6}}>Goal</div><input style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:14,outline:"none",fontFamily:"inherit",color:"#1a1a1a"}} placeholder="e.g. Break -80m CWT" value={form.goal} onChange={e=>setForm(p=>({...p,goal:e.target.value}))} /></div>
        <div style={{background:"#f0f7ff",border:"1px solid #c0d8f0",borderRadius:10,padding:"14px 16px"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#005fa3",letterSpacing:".06em",textTransform:"uppercase",marginBottom:12}}>🔐 Client Login Details</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div><div style={{fontSize:12,fontWeight:600,color:"#444",marginBottom:6}}>Email</div><input type="email" style={{width:"100%",padding:"10px 12px",border:"1.5px solid #c0d8f0",borderRadius:8,fontSize:14,outline:"none",fontFamily:"inherit",color:"#1a1a1a"}} placeholder="client@email.com" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} /></div>
            <div><div style={{fontSize:12,fontWeight:600,color:"#444",marginBottom:6}}>Password</div><input type="text" style={{width:"100%",padding:"10px 12px",border:"1.5px solid #c0d8f0",borderRadius:8,fontSize:14,outline:"none",fontFamily:"inherit",color:"#1a1a1a"}} placeholder="Set a password" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} /></div>
          </div>
          <div style={{fontSize:11,color:"#666",marginTop:8}}>Share these credentials with your client so they can log in.</div>
        </div>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",color:"#bbb",marginTop:4}}>Personal Bests</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          {[["CWT (m)","CWT","number"],["STA (m:ss)","STA","text"],["DYN (m)","DYN","number"]].map(([label,key,type])=>(
            <div key={key}><div style={{fontSize:12,fontWeight:600,color:"#666",marginBottom:6}}>{label}</div><input type={type} style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:14,outline:"none",fontFamily:"inherit",color:"#1a1a1a"}} placeholder="—" value={form.pb[key]} onChange={e=>setForm(p=>({...p,pb:{...p.pb,[key]:e.target.value}}))} /></div>
          ))}
        </div>
        <div style={{display:"flex",gap:10,paddingTop:4}}>
          <button onClick={handleSave} disabled={saving} style={{background:"#1a1a1a",color:"#fff",border:"none",padding:"11px 22px",borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:saving?0.6:1}}>{saving?"Creating...":"Add Client"}</button>
          <button onClick={onClose} style={{background:"transparent",border:"1.5px solid #ddd",color:"#444",padding:"10px 20px",borderRadius:8,fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
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
    setSaving(true); await onSave(form); setSaving(false);
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
          <button onClick={onClose} style={{background:"transparent",border:"1.5px solid #ddd",color:"#444",padding:"10px 20px",borderRadius:8,fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Week Grid ─────────────────────────────────────────────────────────────────
function WeekGrid({ weekDates, clientId, sessions, onClickSession, onClickAdd, isClient }) {
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:10,marginBottom:24}}>
      {weekDates.map((d,di)=>{
        const iso=toISO(d), isToday=iso===toISO(new Date());
        const daySessions=sessions.filter(s=>s.clientId===clientId&&s.date===iso);
        return (
          <div key={di}>
            <div style={{textAlign:"center",marginBottom:8}}>
              <div style={{fontSize:11,fontWeight:700,color:isToday?"#1a1a1a":"#aaa",letterSpacing:".06em",textTransform:"uppercase"}}>{DAYS[di]}</div>
              <div style={{width:28,height:28,borderRadius:"50%",display:"inline-flex",alignItems:"center",justifyContent:"center",marginTop:3,background:isToday?"#1a1a1a":"transparent",color:isToday?"#fff":"#555",fontWeight:isToday?700:500,fontSize:14}}>{d.getDate()}</div>
            </div>
            {daySessions.map(s=>{
              const m=gm(s.method), st=s.feedback?.status;
              const sc=st==="completed"?"#4caf50":st==="partial"?"#ff9800":st==="missed"?"#ef5350":null;
              return (
                <div key={s.id} onClick={()=>onClickSession(s)}
                  style={{borderRadius:10,border:`1.5px solid ${m.border}`,borderLeft:`3px solid ${m.dot}`,background:"#fff",marginBottom:8,cursor:"pointer",transition:"box-shadow .15s,transform .1s",overflow:"hidden"}}
                  onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 14px rgba(0,0,0,.1)";e.currentTarget.style.transform="translateY(-1px)";}}
                  onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="none";}}>
                  <div style={{padding:"9px 10px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                      <span style={{fontSize:16}}>{m.emoji}</span>
                      <div style={{display:"flex",alignItems:"center",gap:5}}>
                        {sc&&<div style={{width:8,height:8,borderRadius:"50%",background:sc}}/>}
                        {!isClient&&<button onClick={e=>{e.stopPropagation();onClickAdd&&onClickAdd(null,s.id,true);}} style={{background:"none",border:"none",fontSize:13,color:"#ddd",cursor:"pointer",padding:0,lineHeight:1}}>×</button>}
                      </div>
                    </div>
                    <div style={{fontSize:11,fontWeight:700,color:m.text,marginBottom:3}}>{m.label}</div>
                    {s.method==="depth"&&s.plan?.targetDepth&&<div style={{fontSize:10,color:"#999",fontWeight:600}}>🎯 {s.plan.targetDepth}m{s.plan.openLine?" (open)":""}</div>}
                    {s.plan?.mainSet&&<div style={{fontSize:10,color:"#aaa",marginTop:3,lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{s.plan.mainSet}</div>}
                  </div>
                </div>
              );
            })}
            {!isClient&&<div onClick={()=>onClickAdd&&onClickAdd(iso)} style={{border:"1.5px dashed #ddd",borderRadius:10,padding:"10px 6px",textAlign:"center",cursor:"pointer",color:"#ccc",fontSize:12,fontWeight:600,transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="#1a1a1a";e.currentTarget.style.color="#1a1a1a";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#ddd";e.currentTarget.style.color="#ccc";}}>+ Add</div>}
            {isClient&&daySessions.length===0&&<div style={{border:"1.5px solid #f0f0f0",borderRadius:10,padding:"18px 6px",textAlign:"center",color:"#e8e8e8",fontSize:18}}>○</div>}
          </div>
        );
      })}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
const ADMIN_EMAIL = "lucianafreediver@gmail.com"; // only this user can create coaches

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
  const [addClientModal, setAddClientModal] = useState(false);
  const [addCoachModal,  setAddCoachModal]  = useState(false);

  function flash(msg) { setToast(msg); setTimeout(()=>setToast(""),2400); }

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      setUser(session?.user||null);
      if (session?.user) loadProfile(session.user);
      else setLoading(false);
    });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_,session)=>{
      setUser(session?.user||null);
      if (session?.user) loadProfile(session.user);
      else { setProfile(null); setLoading(false); }
    });
    return ()=>subscription.unsubscribe();
  },[]);

  async function loadProfile(u) {
    const {data} = await supabase.from("profiles").select("*").eq("id",u.id).single();
    setProfile(data);
    await loadAll(data, u);
    setLoading(false);
  }

  async function loadAll(prof, u) {
    const p = prof||profile;
    const currentUser = u||user;
    if (!p||!currentUser) return;
    if (p.role==="coach") {
      // Load only THIS coach's clients
      const {data:cr} = await supabase.from("clients").select("*").eq("coach_id",currentUser.id).order("created_at");
      const clientIds = (cr||[]).map(c=>c.id);
      let sr = [];
      if (clientIds.length > 0) {
        const {data} = await supabase.from("sessions").select("*, feedback(*)").in("client_id", clientIds).order("date");
        sr = data||[];
      }
      setClients((cr||[]).map(dbToClient));
      setSessions(sr.map(dbToSession));
    } else {
      const {data:cr} = await supabase.from("clients").select("*").eq("id",p.client_id).single();
      const {data:sr} = await supabase.from("sessions").select("*, feedback(*)").eq("client_id",p.client_id).order("date");
      if (cr) { setClients([dbToClient(cr)]); setActiveClient(dbToClient(cr)); setView("clientWeek"); }
      setSessions((sr||[]).map(dbToSession));
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setClients([]); setSessions([]); setProfile(null); setActiveClient(null); setView("dashboard");
  }

  // ── Add Client ──
  async function handleAddClient(form) {
    const {data:authData} = await supabase.auth.signUp({email:form.email, password:form.password});
    const {data:clientData, error:clientError} = await supabase.from("clients").insert({
      name:form.name, age:form.age?Number(form.age):null, level:form.level, goal:form.goal,
      pb_cwt:form.pb.CWT?Number(form.pb.CWT):null, pb_sta:form.pb.STA||null, pb_dyn:form.pb.DYN?Number(form.pb.DYN):null,
      coach_id: user.id, // link to current coach!
    }).select().single();
    if (!clientError&&clientData) {
      if (authData?.user) {
        await supabase.from("profiles").insert({id:authData.user.id, email:form.email, role:"client", client_id:clientData.id});
      }
      setClients(prev=>[...prev, dbToClient(clientData)]);
      setAddClientModal(false);
      flash(`Client added! They can log in with ${form.email}`);
    }
  }

  // ── Add Coach (admin only) ──
  async function handleAddCoach(form) {
    const {data:authData, error} = await supabase.auth.signUp({email:form.email, password:form.password});
    if (!error&&authData?.user) {
      await supabase.from("profiles").insert({id:authData.user.id, email:form.email, role:"coach"});
      setAddCoachModal(false);
      flash(`Coach account created for ${form.email}!`);
    }
  }

  async function deleteClient(id) {
    await supabase.from("clients").delete().eq("id",id);
    setClients(prev=>prev.filter(c=>c.id!==id));
    setSessions(prev=>prev.filter(s=>s.clientId!==id));
    setActiveClient(null); setView("dashboard");
  }

  async function handleAssignSave({method,plan}) {
    const {data,error} = await supabase.from("sessions").insert({
      client_id:activeClient.id, date:assignModal, method,
      plan_warmup:plan.warmup||null, plan_mainset:plan.mainSet||null, plan_cooldown:plan.cooldown||null,
      plan_target_depth:plan.targetDepth||null, plan_open_line:plan.openLine||false, plan_coach_notes:plan.coachNotes||null,
    }).select().single();
    if (!error&&data) { setSessions(prev=>[...prev, dbToSession({...data,feedback:null})]); setAssignModal(null); flash("Session planned!"); }
  }

  async function removeSession(id) {
    await supabase.from("sessions").delete().eq("id",id);
    setSessions(prev=>prev.filter(s=>s.id!==id));
  }

  async function handleFeedbackSave(sessionId, fb) {
    const {error} = await supabase.from("feedback").upsert({
      session_id:sessionId, status:fb.status||null,
      actual_depth:fb.actualDepth?Number(fb.actualDepth):null,
      early_turn:fb.earlyTurn||false, early_turn_depth:fb.earlyTurnDepth?Number(fb.earlyTurnDepth):null,
      feeling:fb.feeling||null, limiting_factor:fb.limitingFactor||null,
      client_notes:fb.clientNotes||null, coach_comment:fb.coachComment||null,
    },{onConflict:"session_id"});
    if (!error) { setSessions(prev=>prev.map(s=>s.id===sessionId?{...s,feedback:fb}:s)); setDayModal(null); flash("Feedback saved!"); }
  }

  const weekDates = DAYS.map((_,i)=>addDays(weekStart,i));
  const isCoach = profile?.role==="coach";
  const isAdmin = user?.email===ADMIN_EMAIL;

  if (loading) return <Spinner />;
  if (!user)   return <LoginScreen />;

  return (
    <div style={{fontFamily:"'DM Sans','Helvetica Neue',sans-serif",background:"#f5f4f0",minHeight:"100vh",color:"#1a1a1a"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* Header */}
      <div style={{background:"#fff",borderBottom:"1px solid #ebebeb",padding:"0 24px"}}>
        <div style={{maxWidth:1040,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:56}}>
          <div style={{display:"flex",alignItems:"center",gap:20}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:20}}>🤿</span>
              <span style={{fontWeight:700,fontSize:16,letterSpacing:"-.02em"}}>ApneaCoach</span>
            </div>
            {isCoach&&(
              <div style={{display:"flex",gap:2}}>
                {[{key:"dashboard",label:"📋 Dashboard"},...(activeClient?[{key:"coachWeek",label:`📅 ${activeClient.name.split(" ")[0]}'s Week`},{key:"clientWeek",label:"🏊 Client View"}]:[])].map(t=>(
                  <button key={t.key} onClick={()=>setView(t.key)} style={{padding:"8px 15px",borderRadius:8,border:"none",fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all .15s",background:view===t.key?"#f0f0ec":"transparent",color:view===t.key?"#1a1a1a":"#888",fontWeight:view===t.key?600:500}}>{t.label}</button>
                ))}
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <div style={{fontSize:12,color:"#aaa",fontWeight:500}}>{user.email}</div>
            {isCoach&&activeClient&&view!=="dashboard"&&<button onClick={()=>{setActiveClient(null);setView("dashboard");}} style={{background:"transparent",border:"1.5px solid #ddd",color:"#666",padding:"8px 14px",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>← All Clients</button>}
            {isCoach&&<button onClick={()=>setAddClientModal(true)} style={{background:"#1a1a1a",color:"#fff",border:"none",padding:"10px 18px",borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Add Client</button>}
            {isAdmin&&<button onClick={()=>setAddCoachModal(true)} style={{background:"#3a8ef4",color:"#fff",border:"none",padding:"10px 18px",borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Add Coach</button>}
            <button onClick={handleSignOut} style={{background:"transparent",border:"1.5px solid #ddd",color:"#666",padding:"8px 14px",borderRadius:8,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Sign Out</button>
          </div>
        </div>
      </div>

      <div style={{maxWidth:1040,margin:"0 auto",padding:"28px 24px"}}>

        {/* DASHBOARD */}
        {view==="dashboard"&&isCoach&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:24}}>
              {[["My Clients",clients.length],["Sessions Planned",sessions.length],["Best Depth",Math.max(0,...sessions.map(s=>Number(s.feedback?.actualDepth)).filter(Boolean))||"—"]].map(([l,v])=>(
                <div key={l} style={{background:"#fff",borderRadius:12,border:"1px solid #ebebeb",padding:"20px 24px"}}>
                  <div style={{fontSize:28,fontWeight:700,fontFamily:"monospace"}}>{v}</div>
                  <div style={{fontSize:12,color:"#999",marginTop:4,fontWeight:500}}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #ebebeb",padding:"13px 20px",marginBottom:22,display:"flex",flexWrap:"wrap",gap:"8px 22px",alignItems:"center"}}>
              <span style={{fontSize:10,fontWeight:800,color:"#ccc",letterSpacing:".08em",textTransform:"uppercase"}}>Training Methods</span>
              {METHODS.map(m=><div key={m.key} style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:9,height:9,borderRadius:"50%",background:m.dot}}/><span style={{fontSize:12,fontWeight:500,color:"#555"}}>{m.emoji} {m.label}</span></div>)}
            </div>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",color:"#bbb",marginBottom:12}}>Your Clients</div>
            {clients.length===0&&<div style={{background:"#fff",borderRadius:12,border:"1px solid #ebebeb",padding:40,textAlign:"center",color:"#bbb",fontSize:14}}>No clients yet. Click "+ Add Client" to get started.</div>}
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {clients.map(c=>{
                const cs=sessions.filter(s=>s.clientId===c.id);
                const done=cs.filter(s=>s.feedback?.status==="completed").length;
                const pending=cs.filter(s=>!s.feedback?.status).length;
                return(
                  <div key={c.id} style={{background:"#fff",borderRadius:12,border:"1px solid #ebebeb",padding:"16px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",transition:"box-shadow .15s"}}
                    onClick={()=>{setActiveClient(c);setView("coachWeek");}}
                    onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,.07)"}
                    onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                    <div style={{display:"flex",alignItems:"center",gap:14}}>
                      <div style={{width:42,height:42,borderRadius:"50%",background:"#f0f0ec",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:17,color:"#555"}}>{c.name.charAt(0)}</div>
                      <div>
                        <div style={{fontWeight:600,fontSize:15}}>{c.name}</div>
                        <div style={{fontSize:12,color:"#999",marginTop:2}}>{c.level} · {c.goal}</div>
                        <div style={{display:"flex",gap:4,marginTop:6}}>{cs.slice(0,8).map(s=>{const m=gm(s.method);return<div key={s.id} title={m.label} style={{width:9,height:9,borderRadius:"50%",background:m.dot}}/>;})}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:24}}>
                      <div style={{textAlign:"center"}}><div style={{fontSize:11,color:"#bbb",fontWeight:600}}>DONE</div><div style={{fontWeight:700,fontFamily:"monospace",color:"#2e7d32",fontSize:18}}>{done}</div></div>
                      <div style={{textAlign:"center"}}><div style={{fontSize:11,color:"#bbb",fontWeight:600}}>PENDING</div><div style={{fontWeight:700,fontFamily:"monospace",color:"#aaa",fontSize:18}}>{pending}</div></div>
                      <span style={{color:"#ccc",fontSize:18}}>›</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* COACH WEEK */}
        {view==="coachWeek"&&activeClient&&isCoach&&(
          <div>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:22}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:".07em",textTransform:"uppercase",marginBottom:4}}>Coach View</div>
                <div style={{fontWeight:700,fontSize:20,letterSpacing:"-.02em"}}>{activeClient.name}</div>
                <div style={{fontSize:13,color:"#999",marginTop:3}}>{fmtShort(weekStart)} – {fmtShort(addDays(weekStart,6))}</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                {[["‹ Prev",()=>setWeekStart(addDays(weekStart,-7))],["Today",()=>setWeekStart(mondayOf(new Date()))],["Next ›",()=>setWeekStart(addDays(weekStart,7))]].map(([l,fn])=>(
                  <button key={l} onClick={fn} style={{background:"transparent",border:"1.5px solid #ddd",color:"#444",padding:"8px 13px",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
                ))}
                <button onClick={()=>deleteClient(activeClient.id)} style={{background:"transparent",border:"1.5px solid #e8c5c5",color:"#c0392b",padding:"8px 13px",borderRadius:8,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Remove</button>
              </div>
            </div>
            <WeekGrid weekDates={weekDates} clientId={activeClient.id} sessions={sessions} isClient={false}
              onClickSession={s=>setDayModal({session:s,role:"coach"})}
              onClickAdd={(iso,sid,del)=>{ if(del){removeSession(sid);}else{setAssignModal(iso);} }} />
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #ebebeb",padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div><div style={{fontWeight:600,fontSize:14}}>Switch to Client View</div><div style={{fontSize:12,color:"#999",marginTop:2}}>See what {activeClient.name.split(" ")[0]} sees</div></div>
              <button onClick={()=>setView("clientWeek")} style={{background:"#1a1a1a",color:"#fff",border:"none",padding:"10px 20px",borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Open Client View →</button>
            </div>
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
              </div>
              <div style={{display:"flex",gap:8}}>
                {[["‹ Prev",()=>setWeekStart(addDays(weekStart,-7))],["Today",()=>setWeekStart(mondayOf(new Date()))],["Next ›",()=>setWeekStart(addDays(weekStart,7))]].map(([l,fn])=>(
                  <button key={l} onClick={fn} style={{background:"transparent",border:"1.5px solid #ddd",color:"#444",padding:"8px 13px",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
                ))}
              </div>
            </div>
            <WeekGrid weekDates={weekDates} clientId={activeClient.id} sessions={sessions} isClient={true} onClickSession={s=>setDayModal({session:s,role:"client"})} />
            <div style={{fontSize:11,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",color:"#bbb",marginBottom:12}}>This Week's Sessions</div>
            {weekDates.flatMap(d=>sessions.filter(s=>s.clientId===activeClient.id&&s.date===toISO(d))).length===0&&<div style={{background:"#fff",borderRadius:12,border:"1px solid #ebebeb",padding:40,textAlign:"center",color:"#bbb",fontSize:14}}>No sessions planned this week.</div>}
            {weekDates.flatMap(d=>sessions.filter(s=>s.clientId===activeClient.id&&s.date===toISO(d))).map(s=>{
              const m=gm(s.method);
              return(
                <div key={s.id} style={{background:"#fff",borderRadius:12,border:"1px solid #ebebeb",borderLeft:`4px solid ${m.dot}`,marginBottom:12,cursor:"pointer",transition:"box-shadow .15s"}}
                  onClick={()=>setDayModal({session:s,role:"client"})}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,.07)"}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                  <div style={{padding:"16px 20px"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 11px",borderRadius:20,fontSize:12,fontWeight:700,background:m.bg,color:m.text,border:`1px solid ${m.border}`}}>{m.emoji} {m.label}</span>
                        <span style={{fontSize:13,color:"#aaa"}}>{fmtFull(s.date)}</span>
                      </div>
                      <StatusBadge status={s.feedback?.status}/>
                    </div>
                    {s.plan?.mainSet&&<div style={{fontSize:13,color:"#444",lineHeight:1.6}}>{s.plan.mainSet}</div>}
                    {s.method==="depth"&&s.plan?.targetDepth&&(
                      <div style={{marginTop:8,display:"flex",gap:16}}>
                        <div><span style={{fontSize:10,color:"#aaa",fontWeight:700,letterSpacing:".06em"}}>TARGET </span><span style={{fontFamily:"monospace",fontWeight:700}}>{s.plan.targetDepth}m</span></div>
                        {s.plan.openLine&&<div><span style={{fontSize:10,color:"#aaa",fontWeight:700,letterSpacing:".06em"}}>MODE </span><span style={{fontFamily:"monospace",fontWeight:700}}>Open Line</span></div>}
                        {s.feedback?.actualDepth&&<div><span style={{fontSize:10,color:"#aaa",fontWeight:700,letterSpacing:".06em"}}>ACTUAL </span><span style={{fontFamily:"monospace",fontWeight:700,color:"#2e7d32"}}>{s.feedback.actualDepth}m</span></div>}
                      </div>
                    )}
                    {s.feedback?.clientNotes&&<div style={{marginTop:10,fontSize:12,color:"#666",fontStyle:"italic",borderTop:"1px solid #f5f4f0",paddingTop:8}}>"{s.feedback.clientNotes}"</div>}
                    {s.feedback?.coachComment&&<div style={{marginTop:8,background:"#e8f5e9",border:"1px solid #c8e6c9",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#2e7d32"}}>💬 <strong>Coach:</strong> {s.feedback.coachComment}</div>}
                    <div style={{marginTop:8,fontSize:11,color:"#ccc"}}>Tap to open full session →</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {assignModal&&activeClient&&<AssignModal date={assignModal} clientName={activeClient.name} onClose={()=>setAssignModal(null)} onSave={handleAssignSave}/>}
      {dayModal&&<DayModal session={sessions.find(s=>s.id===dayModal.session.id)||dayModal.session} role={dayModal.role} onClose={()=>setDayModal(null)} onSave={fb=>handleFeedbackSave(dayModal.session.id,fb)}/>}
      {addClientModal&&<AddClientModal onClose={()=>setAddClientModal(false)} onSave={handleAddClient}/>}
      {addCoachModal&&<AddCoachModal onClose={()=>setAddCoachModal(false)} onSave={handleAddCoach}/>}
      {toast&&<div style={{position:"fixed",bottom:24,right:24,background:"#1a1a1a",color:"#fff",padding:"12px 20px",borderRadius:10,fontSize:13,fontWeight:500,zIndex:999,animation:"fi .2s"}}>✓ {toast}<style>{`@keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style></div>}
    </div>
  );
}
