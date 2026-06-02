import { jsPDF } from "jspdf";

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  navy:    [10,  22,  40],
  ocean:   [55,  138, 221],
  teal:    [29,  158, 117],
  purple:  [127, 119, 221],
  amber:   [239, 159, 39],
  coral:   [216, 90,  48],
  muted:   [140, 140, 140],
  light:   [245, 247, 250],
  border:  [230, 232, 235],
  white:   [255, 255, 255],
  green:   [76,  175, 80],
  text:    [26,  26,  26],
  sub:     [100, 100, 100],
};

const W  = 210; // A4 width mm
const ML = 18;  // margin left
const MR = 18;  // margin right
const CW = W - ML - MR; // content width

// ── Helpers ───────────────────────────────────────────────────────────────────
function rgb(doc, color) { doc.setTextColor(...color); }
function fill(doc, color) { doc.setFillColor(...color); }
function stroke(doc, color) { doc.setDrawColor(...color); }

function label(doc, text, x, y) {
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  rgb(doc, C.muted);
  doc.text(text.toUpperCase(), x, y, { charSpace: 0.5 });
}

function sectionTitle(doc, text, y) {
  label(doc, text, ML, y);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(ML, y + 1.5, W - MR, y + 1.5);
}

function badge(doc, text, x, y, color) {
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  const tw = doc.getTextWidth(text);
  fill(doc, color);
  doc.roundedRect(x, y - 3.5, tw + 6, 5, 1, 1, "F");
  rgb(doc, C.white);
  doc.text(text, x + 3, y, { baseline: "middle" });
}

function miniChart(doc, points, x, y, w, h, color) {
  if (!points || points.length < 2) return;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);

  // grid line
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.line(x, y + h, x + w, y + h);

  // line
  doc.setDrawColor(...color);
  doc.setLineWidth(1);
  for (let i = 0; i < points.length - 1; i++) {
    const x1 = x + i * step;
    const y1 = y + h - ((points[i] - min) / range) * h;
    const x2 = x + (i + 1) * step;
    const y2 = y + h - ((points[i + 1] - min) / range) * h;
    doc.line(x1, y1, x2, y2);
  }

  // dots
  points.forEach((p, i) => {
    const px = x + i * step;
    const py = y + h - ((p - min) / range) * h;
    fill(doc, i === points.length - 1 ? C.teal : color);
    doc.circle(px, py, 1, "F");
  });

  // PB label on last point
  const lastX = x + (points.length - 1) * step;
  const lastY = y + h - ((points[points.length - 1] - min) / range) * h;
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  rgb(doc, C.teal);
  doc.text(String(points[points.length - 1]), lastX + 2, lastY - 1);
}

function statCard(doc, label_text, value, sub, x, y, w) {
  fill(doc, C.light);
  stroke(doc, C.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, 18, 2, 2, "FD");

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  rgb(doc, C.sub);
  doc.text(label_text, x + 4, y + 5);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  rgb(doc, C.text);
  doc.text(String(value), x + 4, y + 12);

  if (sub) {
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    rgb(doc, C.teal);
    doc.text(sub, x + 4, y + 16.5);
  }
}

function barRow(doc, label_text, count, total, x, y, w, color) {
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  rgb(doc, C.sub);
  doc.text(label_text, x, y + 1);

  const barX = x + 30;
  const barW = w - 50;
  fill(doc, C.border);
  doc.roundedRect(barX, y - 2.5, barW, 4, 1, 1, "F");
  if (total > 0) {
    fill(doc, color);
    doc.roundedRect(barX, y - 2.5, Math.max(4, (count / total) * barW), 4, 1, 1, "F");
  }

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  rgb(doc, C.text);
  doc.text(count + " sessions", x + w - 18, y + 1, { align: "right" });
}

// ── Session data helpers ──────────────────────────────────────────────────────
function parseMmSs(str) {
  if (!str) return 0;
  if (str.includes(":")) {
    const [m, s] = str.split(":").map(Number);
    return (m || 0) * 60 + (s || 0);
  }
  return parseFloat(str) || 0;
}

function fmtMmSs(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return m + ":" + String(s).padStart(2, "0");
}

function sessionsByMethod(sessions, method) {
  return sessions.filter(s => s.method === method && s.feedback?.status === "completed");
}

function depthPoints(sessions) {
  return sessionsByMethod(sessions, "depth").map(s => {
    const dives = s.feedback?.gymData?.dives || s.plan?.gymData?.dives || [];
    const depths = dives.map(d => parseFloat(d.log?.actualDepth || d.log?.depth || 0)).filter(Boolean);
    return depths.length ? Math.max(...depths) : 0;
  }).filter(Boolean);
}

function staticPoints(sessions) {
  return sessionsByMethod(sessions, "static").map(s => {
    const exercises = s.feedback?.gymData?.exercises || s.plan?.gymData?.exercises || [];
    const times = exercises.flatMap(e => {
      if (e.roundLogs) return e.roundLogs.map(r => parseMmSs(r));
      return [parseMmSs(e.log?.actualTime || e.log?.time || 0)];
    }).filter(Boolean);
    return times.length ? Math.max(...times) : 0;
  }).filter(Boolean);
}

function poolPoints(sessions) {
  return sessionsByMethod(sessions, "pool-co2").map(s => {
    const sections = s.feedback?.gymData?.sections || s.plan?.gymData?.sections || [];
    const meters = sections.flatMap(sec => (sec.blocks || []).map(b => parseFloat(b.log?.actualMeters || b.meters || 0))).filter(Boolean);
    return meters.length ? Math.max(...meters) : 0;
  }).filter(Boolean);
}

// ── Main export ───────────────────────────────────────────────────────────────
export function generateAthleteReport({ client, sessions, coachName }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const completedSessions = sessions.filter(s => s.feedback?.status === "completed");
  const totalSessions = sessions.length;
  const completionRate = totalSessions > 0 ? Math.round((completedSessions.length / totalSessions) * 100) : 0;

  // Per-method counts
  const methodCounts = {};
  const METHODS = ["depth","pool-co2","pool-technique","static","gym-strength","mobility","dry-eq"];
  METHODS.forEach(m => { methodCounts[m] = sessionsByMethod(sessions, m).length; });

  // Charts data
  const dPts   = depthPoints(sessions);
  const stPts  = staticPoints(sessions);
  const poolPts = poolPoints(sessions);

  // Volume stats
  let totalDives = 0, totalDepthM = 0, totalPoolLaps = 0, totalPoolM = 0;
  let maxHolds = 0, pbDives = 0;

  completedSessions.forEach(s => {
    if (s.method === "depth") {
      const dives = s.feedback?.gymData?.dives || s.plan?.gymData?.dives || [];
      dives.forEach(d => {
        if (d.type !== "co2table" && d.log?.actualDepth) {
          totalDives++;
          totalDepthM += parseFloat(d.log.actualDepth) * 2; // down + up
        }
      });
    }
    if (s.method === "pool-co2" || s.method === "pool-technique") {
      const sections = s.feedback?.gymData?.sections || s.plan?.gymData?.sections || [];
      sections.forEach(sec => (sec.blocks || []).forEach(b => {
        const laps = parseFloat(b.log?.reps || b.reps || 0);
        const m = parseFloat(b.log?.actualMeters || b.meters || 0);
        if (laps) totalPoolLaps += laps;
        if (m) totalPoolM += m * laps;
      }));
      // exercises for pool-technique
      const exercises = s.feedback?.gymData?.exercises || s.plan?.gymData?.exercises || [];
      exercises.forEach(e => {
        totalPoolLaps += parseFloat(e.reps || 0);
        totalPoolM += parseFloat(e.reps || 0) * parseFloat(e.meters || 0);
      });
    }
    if (s.method === "static") {
      const exercises = s.feedback?.gymData?.exercises || s.plan?.gymData?.exercises || [];
      exercises.forEach(e => {
        if (e.roundLogs) maxHolds += e.roundLogs.filter(Boolean).length;
        else if (e.log?.actualTime) maxHolds++;
      });
    }
  });

  // PB events from localStorage
  try {
    const notifs = JSON.parse(localStorage.getItem("apnea_coachPBNotifs") || "[]");
    pbDives = notifs.filter(n => n.athleteName === client.name).length;
  } catch {}

  // ── PAGE 1 ────────────────────────────────────────────────────────────────
  let y = 0;

  // Header bar
  fill(doc, C.navy);
  doc.rect(0, 0, W, 32, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  rgb(doc, [100, 130, 170]);
  doc.text("ATHLETE PROGRESS REPORT", ML, 10, { charSpace: 0.8 });

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  rgb(doc, C.white);
  doc.text(client.name || "Athlete", ML, 22);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  rgb(doc, [100, 140, 190]);
  const subtitle = `Coached by ${coachName || "Coach"} · ${client.level || ""} · Generated ${new Date().toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" })}`;
  doc.text(subtitle, ML, 28);

  // Watermark logo top right
  doc.setFontSize(22);
  rgb(doc, [20, 40, 70]);
  doc.text("🌊", W - MR - 12, 20);
  doc.setFontSize(7);
  rgb(doc, [60, 90, 130]);
  doc.text("ApneaCoach", W - MR - 14, 27);

  y = 40;

  // PBs
  sectionTitle(doc, "Personal Bests", y); y += 6;
  const pbW = (CW - 8) / 3;
  const pbItems = [
    { label: "CWT Depth",    val: client.pb_cwt ? client.pb_cwt + "m" : "—", color: C.ocean },
    { label: "Static Apnea", val: client.pb_sta || "—",                        color: C.purple },
    { label: "Dynamic",      val: client.pb_dyn ? client.pb_dyn + "m" : "—", color: C.teal },
  ];
  pbItems.forEach((pb, i) => {
    const x = ML + i * (pbW + 4);
    fill(doc, C.light);
    stroke(doc, C.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, pbW, 20, 2, 2, "FD");
    // color bar top
    fill(doc, pb.color);
    doc.roundedRect(x, y, pbW, 3, 2, 2, "F");
    doc.rect(x, y + 1.5, pbW, 1.5, "F");
    doc.setFontSize(7); doc.setFont("helvetica","normal"); rgb(doc, C.sub);
    doc.text(pb.label, x + 4, y + 8);
    doc.setFontSize(16); doc.setFont("helvetica","bold"); rgb(doc, C.text);
    doc.text(pb.val, x + 4, y + 17);
  });
  y += 26;

  // Charts — depth
  if (dPts.length >= 2) {
    sectionTitle(doc, "Depth Progression (CWT) — best dive per session", y); y += 5;
    miniChart(doc, dPts, ML, y, CW, 22, C.ocean);
    y += 27;
  }

  // Charts — static
  if (stPts.length >= 2) {
    sectionTitle(doc, "Static Apnea Progression — best hold per session (seconds)", y); y += 5;
    miniChart(doc, stPts, ML, y, CW, 22, C.purple);
    // y-axis labels in mm:ss
    doc.setFontSize(6); doc.setFont("helvetica","normal"); rgb(doc, C.muted);
    doc.text(fmtMmSs(Math.max(...stPts)), ML - 1, y + 2, { align:"right" });
    doc.text(fmtMmSs(Math.min(...stPts)), ML - 1, y + 22, { align:"right" });
    y += 27;
  }

  // Charts — pool
  if (poolPts.length >= 2) {
    sectionTitle(doc, "Pool Progression — best effort per session (meters)", y); y += 5;
    miniChart(doc, poolPts, ML, y, CW, 22, C.teal);
    y += 27;
  }

  // Training volume
  sectionTitle(doc, "Training Volume", y); y += 6;
  const volW = (CW - 10) / 3;
  const vol1 = [
    { label:"Total depth dives", val: totalDives || "—", sub: "completed dives" },
    { label:"Total depth meters", val: totalDepthM > 0 ? Math.round(totalDepthM) + "m" : "—", sub: "cumulative descent" },
    { label:"Pool laps (apnea)", val: totalPoolLaps > 0 ? Math.round(totalPoolLaps) : "—", sub: totalPoolM > 0 ? `≈ ${Math.round(totalPoolM)}m total` : "" },
  ];
  vol1.forEach((v, i) => {
    statCard(doc, v.label, v.val, v.sub, ML + i * (volW + 5), y, volW);
  });
  y += 22;
  const vol2 = [
    { label:"Max breath holds", val: maxHolds || "—", sub: "static & FRC holds" },
    { label:"PB events logged", val: pbDives || "—", sub: "new records set" },
    { label:"Sessions completed", val: completedSessions.length, sub: `${completionRate}% completion rate` },
  ];
  vol2.forEach((v, i) => {
    statCard(doc, v.label, v.val, v.sub, ML + i * (volW + 5), y, volW);
  });
  y += 24;

  // Session breakdown
  sectionTitle(doc, "Session Breakdown", y); y += 6;
  const totalComp = completedSessions.length || 1;
  const breakdown = [
    { label:"Depth",         count:methodCounts["depth"],          color:C.ocean },
    { label:"Pool CO2/O2",   count:methodCounts["pool-co2"],       color:C.teal },
    { label:"Pool Technique",count:methodCounts["pool-technique"],  color:[99,153,34] },
    { label:"Static Apnea",  count:methodCounts["static"],         color:C.purple },
    { label:"Gym Strength",  count:methodCounts["gym-strength"],   color:C.amber },
    { label:"Mobility",      count:methodCounts["mobility"],       color:C.coral },
    { label:"Dry Eq",        count:methodCounts["dry-eq"],         color:[168,139,250] },
  ].filter(b => b.count > 0);

  breakdown.forEach(b => {
    barRow(doc, b.label, b.count, totalComp, ML, y, CW, b.color);
    y += 7;
  });
  y += 4;

  // Coach notes
  if (client.coach_notes) {
    if (y > 240) { doc.addPage(); y = 20; }
    sectionTitle(doc, "Coach Notes", y); y += 6;
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    rgb(doc, C.text);
    // Left accent bar
    fill(doc, C.ocean);
    doc.rect(ML, y, 1, 0, "F"); // will be sized after text
    const lines = doc.splitTextToSize(client.coach_notes, CW - 6);
    doc.text(lines, ML + 5, y + 3);
    fill(doc, C.ocean);
    doc.rect(ML, y, 1, lines.length * 4 + 2, "F");
    y += lines.length * 4 + 8;
  }

  // Footer page 1
  fill(doc, C.navy);
  doc.rect(0, 287, W, 10, "F");
  doc.setFontSize(7); doc.setFont("helvetica","normal"); rgb(doc, [100,130,170]);
  doc.text("ApneaCoach · apnea-coach-pi.vercel.app", ML, 293);
  doc.text("Page 1 · Confidential", W - MR, 293, { align:"right" });

  // ── PAGE 2 — Session History ───────────────────────────────────────────────
  doc.addPage();
  y = 0;

  // Header bar
  fill(doc, C.navy);
  doc.rect(0, 0, W, 20, "F");
  doc.setFontSize(14); doc.setFont("helvetica","bold"); rgb(doc, C.white);
  doc.text(client.name || "Athlete", ML, 13);
  doc.setFontSize(8); doc.setFont("helvetica","normal"); rgb(doc, [100,140,190]);
  doc.text("Session History", W - MR, 13, { align:"right" });

  y = 28;
  sectionTitle(doc, "All Completed Sessions", y); y += 8;

  const METHOD_COLORS = {
    "depth":          C.ocean,
    "pool-co2":       C.teal,
    "pool-technique": [99,153,34],
    "static":         C.purple,
    "gym-strength":   C.amber,
    "mobility":       C.coral,
    "dry-eq":         [168,139,250],
  };
  const METHOD_LABELS = {
    "depth":"Depth","pool-co2":"Pool CO2","pool-technique":"Pool Technique",
    "static":"Static","gym-strength":"Gym Strength","mobility":"Mobility","dry-eq":"Dry Eq",
  };

  const sorted = [...completedSessions].sort((a, b) => new Date(b.date) - new Date(a.date));

  sorted.forEach((s, idx) => {
    if (y > 270) { doc.addPage(); y = 20; }

    const rowH = 13;
    fill(doc, idx % 2 === 0 ? C.white : C.light);
    doc.rect(ML, y, CW, rowH, "F");

    // Color dot
    const mColor = METHOD_COLORS[s.method] || C.muted;
    fill(doc, mColor);
    doc.circle(ML + 3, y + rowH / 2, 2, "F");

    // Date
    const d = new Date(s.date + "T12:00:00");
    const dateStr = d.toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" });
    doc.setFontSize(8); doc.setFont("helvetica","normal"); rgb(doc, C.sub);
    doc.text(dateStr, ML + 8, y + 5);

    // Method label
    doc.setFontSize(8.5); doc.setFont("helvetica","bold"); rgb(doc, C.text);
    doc.text(METHOD_LABELS[s.method] || s.method, ML + 8, y + 10);

    // Key result
    let result = "";
    if (s.method === "depth") {
      const dives = s.feedback?.gymData?.dives || [];
      const depths = dives.map(d => parseFloat(d.log?.actualDepth || 0)).filter(Boolean);
      if (depths.length) result = `Best: ${Math.max(...depths)}m · ${dives.length} dives`;
    } else if (s.method === "static") {
      const exercises = s.feedback?.gymData?.exercises || [];
      const times = exercises.flatMap(e => e.roundLogs || [parseMmSs(e.log?.actualTime)]).filter(Boolean);
      if (times.length) result = `Best: ${fmtMmSs(Math.max(...times))}`;
    } else if (s.method === "pool-co2") {
      const sections = s.feedback?.gymData?.sections || [];
      const m = sections.flatMap(sec => (sec.blocks||[]).map(b => parseFloat(b.log?.actualMeters || 0))).filter(Boolean);
      if (m.length) result = `Best: ${Math.max(...m)}m`;
    } else if (s.feedback?.gymData?.sessionName) {
      result = s.feedback.gymData.sessionName;
    }

    if (result) {
      doc.setFontSize(7.5); doc.setFont("helvetica","normal"); rgb(doc, C.sub);
      doc.text(result, ML + 70, y + 8);
    }

    // Completed badge
    badge(doc, "✓ Completed", W - MR - 22, y + rowH / 2, C.teal);

    // Coach reply indicator
    if (s.feedback?.coachComment) {
      doc.setFontSize(6.5); rgb(doc, C.ocean);
      doc.text("💬 Coach replied", W - MR - 48, y + 10);
    }

    y += rowH;
  });

  if (sorted.length === 0) {
    doc.setFontSize(10); doc.setFont("helvetica","normal"); rgb(doc, C.muted);
    doc.text("No completed sessions yet.", ML, y + 10);
  }

  // Footer page 2
  fill(doc, C.navy);
  doc.rect(0, 287, W, 10, "F");
  doc.setFontSize(7); doc.setFont("helvetica","normal"); rgb(doc, [100,130,170]);
  doc.text("ApneaCoach · apnea-coach-pi.vercel.app", ML, 293);
  doc.text("Page 2 · Confidential", W - MR, 293, { align:"right" });

  // Save
  const filename = `ApneaCoach_${(client.name || "athlete").replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(filename);
}
