import { useState } from "react";

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseDate(iso) {
  const [y, m, d] = iso.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d));
}

function fmtDate(iso) {
  const d = parseDate(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDateShort(iso) {
  const d = parseDate(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year:"2-digit" });
}

// ── Mini SVG Line Chart ───────────────────────────────────────────────────────
function LineChart({ data, color, yLabel, height, showDots, formatY, referenceLines }) {
  if (!data || data.length < 2) return null;

  const W = 600, H = height || 180;
  const PAD = { top: 20, right: 20, bottom: 40, left: 48 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const yVals = data.map(d => d.y);
  const yMin  = Math.min(...yVals);
  const yMax  = Math.max(...yVals);
  const yRange = yMax - yMin || 1;
  const yPad  = yRange * 0.15;

  const yLo = Math.max(0, yMin - yPad);
  const yHi = yMax + yPad;

  function xPos(i)   { return PAD.left + (i / (data.length - 1)) * chartW; }
  function yPos(val) { return PAD.top + chartH - ((val - yLo) / (yHi - yLo)) * chartH; }

  const points = data.map((d, i) => `${xPos(i)},${yPos(d.y)}`).join(" ");
  const areaPoints = `${xPos(0)},${PAD.top + chartH} ${points} ${xPos(data.length - 1)},${PAD.top + chartH}`;

  // Y axis ticks
  const yTicks = 4;
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) => yLo + ((yHi - yLo) * i) / yTicks);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:"auto", display:"block" }}>
      {/* Area fill */}
      <defs>
        <linearGradient id={"grad-" + color.replace("#","")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={"url(#grad-" + color.replace("#","") + ")"} />

      {/* Reference lines (e.g. PB line) */}
      {referenceLines && referenceLines.map((rl, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={yPos(rl.value)} x2={PAD.left + chartW} y2={yPos(rl.value)}
            stroke={rl.color || "#aaa"} strokeWidth="1.5" strokeDasharray="5,4" opacity="0.6" />
          <text x={PAD.left + chartW - 4} y={yPos(rl.value) - 5} textAnchor="end" fontSize="10" fill={rl.color || "#aaa"} fontWeight="700">{rl.label}</text>
        </g>
      ))}

      {/* Y grid lines */}
      {yTickVals.map((v, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={yPos(v)} x2={PAD.left + chartW} y2={yPos(v)} stroke="#f0f0f0" strokeWidth="1" />
          <text x={PAD.left - 6} y={yPos(v) + 4} textAnchor="end" fontSize="10" fill="#bbb">
            {formatY ? formatY(v) : Math.round(v)}
          </text>
        </g>
      ))}

      {/* Y axis label */}
      {yLabel && (
        <text transform={`translate(12, ${PAD.top + chartH / 2}) rotate(-90)`} textAnchor="middle" fontSize="10" fill="#bbb">{yLabel}</text>
      )}

      {/* Line */}
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {/* Dots */}
      {showDots && data.map((d, i) => (
        <circle key={i} cx={xPos(i)} cy={yPos(d.y)} r="4" fill="#fff" stroke={color} strokeWidth="2.5" />
      ))}

      {/* X axis labels — show every Nth */}
      {data.map((d, i) => {
        const step = Math.max(1, Math.floor(data.length / 6));
        if (i % step !== 0 && i !== data.length - 1) return null;
        return (
          <text key={i} x={xPos(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#bbb">{fmtDate(d.x)}</text>
        );
      })}
    </svg>
  );
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────
function BarChart({ data, color, yLabel, height, formatY }) {
  if (!data || data.length < 1) return null;

  const W = 600, H = height || 180;
  const PAD = { top: 20, right: 20, bottom: 40, left: 52 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const yMax  = Math.max(...data.map(d => d.y));
  const yHi   = yMax * 1.15 || 1;

  const barW  = Math.max(4, (chartW / data.length) * 0.6);
  const barGap = chartW / data.length;

  function xPos(i)   { return PAD.left + i * barGap + barGap / 2; }
  function yPos(val) { return PAD.top + chartH - (val / yHi) * chartH; }
  function barH(val) { return (val / yHi) * chartH; }

  const yTicks = 4;
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) => (yHi * i) / yTicks);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:"auto", display:"block" }}>
      {/* Y grid */}
      {yTickVals.map((v, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={yPos(v)} x2={PAD.left + chartW} y2={yPos(v)} stroke="#f0f0f0" strokeWidth="1" />
          <text x={PAD.left - 6} y={yPos(v) + 4} textAnchor="end" fontSize="10" fill="#bbb">
            {formatY ? formatY(v) : Math.round(v)}
          </text>
        </g>
      ))}

      {yLabel && (
        <text transform={`translate(12, ${PAD.top + chartH / 2}) rotate(-90)`} textAnchor="middle" fontSize="10" fill="#bbb">{yLabel}</text>
      )}

      {/* Bars */}
      {data.map((d, i) => (
        <g key={i}>
          <rect x={xPos(i) - barW / 2} y={yPos(d.y)} width={barW} height={barH(d.y)}
            fill={color} rx="3" opacity="0.85" />
          {data.length <= 12 && (
            <text x={xPos(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#bbb">{fmtDate(d.x)}</text>
          )}
        </g>
      ))}

      {/* X labels for large datasets */}
      {data.length > 12 && data.map((d, i) => {
        const step = Math.floor(data.length / 6);
        if (i % step !== 0) return null;
        return <text key={i} x={xPos(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#bbb">{fmtDate(d.x)}</text>;
      })}
    </svg>
  );
}

// ── Chart Card ────────────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children, isEmpty, emptyMsg }) {
  return (
    <div style={{ background:"#fff", borderRadius:12, border:"1px solid #ebebeb", padding:"18px 20px", marginBottom:16 }}>
      <div style={{ marginBottom:12 }}>
        <div style={{ fontWeight:700, fontSize:15, color:"#1a1a1a" }}>{title}</div>
        {subtitle && <div style={{ fontSize:12, color:"#aaa", marginTop:3 }}>{subtitle}</div>}
      </div>
      {isEmpty ? (
        <div style={{ padding:"24px 0", textAlign:"center", color:"#ccc", fontSize:13 }}>{emptyMsg || "Not enough data yet"}</div>
      ) : children}
    </div>
  );
}

// ── Stat Pills ────────────────────────────────────────────────────────────────
function StatRow({ stats }) {
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:16 }}>
      {stats.map((s, i) => (
        <div key={i} style={{ background:"#f8f8f6", borderRadius:10, padding:"12px 16px", flex:"1", minWidth:100, textAlign:"center" }}>
          <div style={{ fontSize:22, fontWeight:700, fontFamily:"monospace", color: s.color || "#1a1a1a" }}>{s.value}</div>
          <div style={{ fontSize:11, color:"#aaa", marginTop:3, fontWeight:500 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main ProgressCharts Component ─────────────────────────────────────────────
export default function ProgressCharts({ sessions, clientName }) {
  const [activeTab, setActiveTab] = useState("depth");

  // ── Parse depth sessions ──
  const depthSessions = sessions
    .filter(s => s.method === "depth" && s.plan?.gymData?.dives)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Per-session: deepest completed dive
  const depthOverTime = depthSessions.map(s => {
    const dives = s.plan.gymData.dives || [];
    const completed = dives.filter(d => d.log && d.log.status === "completed" && d.log.actualDepth);
    const maxDepth = completed.length > 0 ? Math.max(...completed.map(d => Number(d.log.actualDepth))) : null;
    return maxDepth ? { x: s.date, y: maxDepth, label: fmtDateShort(s.date) } : null;
  }).filter(Boolean);

  // PB over time — running maximum
  let runningPB = 0;
  const pbOverTime = depthOverTime.map(d => {
    if (d.y > runningPB) runningPB = d.y;
    return { x: d.x, y: runningPB };
  });

  const currentPB   = pbOverTime.length > 0 ? pbOverTime[pbOverTime.length - 1].y : null;
  const latestDepth = depthOverTime.length > 0 ? depthOverTime[depthOverTime.length - 1].y : null;
  const totalDepthSessions = depthSessions.length;
  const totalDives = depthSessions.reduce((a, s) => a + (s.plan?.gymData?.dives?.length || 0), 0);
  const completedDives = depthSessions.reduce((a, s) => {
    const dives = s.plan?.gymData?.dives || [];
    return a + dives.filter(d => d.log && d.log.status === "completed").length;
  }, 0);

  // ── Parse pool sessions ──
  const DYNAMIC_DISCIPLINES = ["DYN","DYNB","DNF"];

  const poolSessions = sessions
    .filter(s => s.method === "pool-co2" && s.plan?.gymData?.sections)
    .sort((a, b) => a.date.localeCompare(b.date));

  const poolMetersOverTime = poolSessions.map(s => {
    const meters = s.plan.gymData.totalMeters || 0;
    return meters > 0 ? { x: s.date, y: meters } : null;
  }).filter(Boolean);

  // Longest dynamic dive per pool session (DYN, DYNB, DNF only)
  const longestDynOverTime = poolSessions.map(s => {
    const sections = s.plan.gymData.sections || [];
    let longestM = 0;
    sections.forEach(sec => {
      (sec.blocks || []).forEach(bl => {
        if (!DYNAMIC_DISCIPLINES.includes(bl.discipline)) return;
        if (bl.type === "distance") {
          const m = Number(bl.meters) || 0;
          if (m > longestM) longestM = m;
        }
        if (bl.type === "interval") {
          const m = Number(bl.intervalMeters) || 0;
          if (m > longestM) longestM = m;
        }
      });
    });
    return longestM > 0 ? { x: s.date, y: longestM } : null;
  }).filter(Boolean);

  const totalPoolSessions  = poolSessions.length;
  const avgMeters = poolMetersOverTime.length > 0
    ? Math.round(poolMetersOverTime.reduce((a, d) => a + d.y, 0) / poolMetersOverTime.length)
    : null;
  const maxMeters = poolMetersOverTime.length > 0
    ? Math.max(...poolMetersOverTime.map(d => d.y))
    : null;
  const longestDyn = longestDynOverTime.length > 0
    ? Math.max(...longestDynOverTime.map(d => d.y))
    : null;

  const tabs = [
    { key:"depth", label:"🌊 Depth", show: depthSessions.length > 0 },
    { key:"pool",  label:"💧 Pool",  show: poolSessions.length > 0 },
  ].filter(t => t.show);

  if (tabs.length === 0) {
    return (
      <div style={{ background:"#fafaf8", borderRadius:12, border:"1.5px dashed #e0e0e0", padding:"32px", textAlign:"center", color:"#bbb", fontSize:14 }}>
        No depth or pool training data yet. Charts will appear here once sessions are logged.
      </div>
    );
  }

  return (
    <div style={{ fontFamily:"'DM Sans','Helvetica Neue',sans-serif" }}>
      {/* Tab switcher */}
      {tabs.length > 1 && (
        <div style={{ display:"flex", gap:8, marginBottom:18 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ padding:"8px 18px", borderRadius:9, border:"none", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", background: activeTab === t.key ? "#1a1a1a" : "#f0f0ec", color: activeTab === t.key ? "#fff" : "#666", transition:"all .15s" }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* DEPTH CHARTS */}
      {activeTab === "depth" && (
        <div>
          {/* Stats */}
          <StatRow stats={[
            { label:"Depth Sessions",    value: totalDepthSessions, color:"#1a2fa3" },
            { label:"Total Dives",       value: totalDives },
            { label:"Dives Completed",   value: completedDives, color:"#2e7d32" },
            { label:"Current PB",        value: currentPB ? currentPB + "m" : "—", color:"#c0392b" },
            { label:"Latest Session",    value: latestDepth ? latestDepth + "m" : "—", color:"#555" },
          ]} />

          {/* Depth over time */}
          <ChartCard
            title="Depth Over Time"
            subtitle="Deepest completed dive per session"
            isEmpty={depthOverTime.length < 2}
            emptyMsg="Need at least 2 logged depth sessions to show this chart">
            <LineChart
              data={depthOverTime}
              color="#3a4df4"
              yLabel="Depth (m)"
              height={200}
              showDots={true}
              referenceLines={currentPB ? [{ value: currentPB, color:"#ef5350", label:"PB " + currentPB + "m" }] : null}
            />
          </ChartCard>

          {/* PB progression */}
          <ChartCard
            title="Personal Best Progression"
            subtitle="How your best depth has improved over time"
            isEmpty={pbOverTime.length < 2}
            emptyMsg="Need at least 2 logged depth sessions to show this chart">
            <LineChart
              data={pbOverTime}
              color="#ef5350"
              yLabel="PB (m)"
              height={180}
              showDots={false}
            />
          </ChartCard>
        </div>
      )}

      {/* POOL CHARTS */}
      {activeTab === "pool" && (
        <div>
          {/* Stats */}
          <StatRow stats={[
            { label:"Pool Sessions",     value: totalPoolSessions, color:"#2d7a2d" },
            { label:"Avg Meters/Session",value: avgMeters ? avgMeters + "m" : "—" },
            { label:"Most Meters",       value: maxMeters ? maxMeters + "m" : "—", color:"#005fa3" },
            { label:"Longest Dyn Dive",  value: longestDyn ? longestDyn + "m" : "—", color:"#c0392b" },
          ]} />

          {/* Total meters per session */}
          <ChartCard
            title="Training Volume"
            subtitle="Total meters swum per pool session"
            isEmpty={poolMetersOverTime.length < 2}
            emptyMsg="Need at least 2 logged pool sessions to show this chart">
            <BarChart
              data={poolMetersOverTime}
              color="#4db84d"
              yLabel="Meters"
              height={200}
              formatY={v => Math.round(v) + "m"}
            />
          </ChartCard>

          {/* Longest dynamic dive per session */}
          <ChartCard
            title="Longest Dynamic Dive"
            subtitle="Longest DYN / DYNB / DNF set per session (excludes freestyle and breaststroke)"
            isEmpty={longestDynOverTime.length < 2}
            emptyMsg="Need dynamic disciplines (DYN, DYNB, DNF) logged in at least 2 sessions">
            <LineChart
              data={longestDynOverTime}
              color="#3a8ef4"
              yLabel="Meters"
              height={180}
              showDots={true}
              referenceLines={longestDyn ? [{ value: longestDyn, color:"#ef5350", label:"Best " + longestDyn + "m" }] : null}
            />
          </ChartCard>
        </div>
      )}
    </div>
  );
}
