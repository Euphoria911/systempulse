import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSnapshot } from "./hooks/useSnapshot";
import { Card } from "./components/Card";
import { Bar } from "./components/Bar";
import { Sparkline } from "./components/Sparkline";
import { StatRow } from "./components/StatRow";
import { SettingsModal } from "./components/SettingsModal";
import {
  formatBytes,
  formatClock,
  formatDate,
  formatMhz,
  formatPercent,
  formatRate,
  formatUptime,
  severityForPercent,
} from "./lib/format";
import type { ProcessSnapshot } from "./lib/types";
import clsx from "clsx";

const STORAGE_KEY = "systempulse.prefs.v1";

interface Prefs {
  intervalMs: number;
  alwaysOnTop: boolean;
}

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        intervalMs: Number(parsed.intervalMs) || 1000,
        alwaysOnTop: Boolean(parsed.alwaysOnTop),
      };
    }
  } catch { /* ignore */ }
  return { intervalMs: 1000, alwaysOnTop: false };
}

function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch { /* ignore */ }
}

export default function App() {
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [procTab, setProcTab] = useState<"cpu" | "memory">("cpu");
  const [now, setNow] = useState(() => new Date());

  const { snapshot, staticInfo, error, history } = useSnapshot(prefs.intervalMs);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    invoke("set_always_on_top", { always: prefs.alwaysOnTop }).catch(() => {});
  }, [prefs.alwaysOnTop]);

  const applyPrefs = (intervalMs: number, alwaysOnTop: boolean) => {
    const next = { intervalMs, alwaysOnTop };
    setPrefs(next);
    savePrefs(next);
  };

  const cpuSeverity = snapshot ? severityForPercent(snapshot.cpu.usagePercent) : "ok";
  const memSeverity = snapshot ? severityForPercent(snapshot.memory.percent) : "ok";

  const totalRx = useMemo(
    () => snapshot?.networks.reduce((a, n) => a + n.rxBytesPerSec, 0) ?? 0,
    [snapshot]
  );
  const totalTx = useMemo(
    () => snapshot?.networks.reduce((a, n) => a + n.txBytesPerSec, 0) ?? 0,
    [snapshot]
  );

  return (
    <div className="sp-shell">
      <header className="sp-header">
        <div className="sp-header__brand">
          <span className="sp-header__logo">SYSTEMPULSE</span>
          <span className="sp-header__tag">v0.1 · LIVE</span>
        </div>
        <div className="sp-header__right">
          <span className="sp-header__dot" />
          <span>{formatDate(now)}</span>
          <span>{formatClock(now)}</span>
          <button className="sp-btn" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
        </div>
      </header>

      {error && (
        <div className="sp-card" style={{ borderColor: "var(--crit)" }}>
          <span className="sp-value" style={{ color: "var(--crit)" }}>
            Error: {error}
          </span>
        </div>
      )}

      {/* OVERVIEW */}
      <div className="sp-grid sp-grid--overview">
        <OverviewTile
          label="CPU"
          value={snapshot ? formatPercent(snapshot.cpu.usagePercent) : "—"}
          percent={snapshot?.cpu.usagePercent ?? 0}
          severity={cpuSeverity}
        />
        <OverviewTile
          label="MEMORY"
          value={snapshot ? formatPercent(snapshot.memory.percent) : "—"}
          percent={snapshot?.memory.percent ?? 0}
          severity={memSeverity}
        />
        <OverviewTile
          label="NET DOWN"
          value={snapshot ? formatRate(totalRx) : "—"}
          raw
        />
        <OverviewTile
          label="NET UP"
          value={snapshot ? formatRate(totalTx) : "—"}
          raw
        />
        <OverviewTile
          label="UPTIME"
          value={snapshot ? formatUptime(snapshot.uptimeSeconds) : "—"}
          raw
        />
      </div>

      {/* CPU + MEMORY */}
      <div className="sp-grid">
        <div className="sp-col-8">
          <Card
            title="CPU"
            meta={staticInfo ? `${staticInfo.cpuBrand}` : "..."}
            action={
              snapshot?.cpu.temperatureC != null ? (
                <span
                  className={clsx(
                    "sp-chip",
                    snapshot.cpu.temperatureC >= 85
                      ? "sp-chip--crit"
                      : snapshot.cpu.temperatureC >= 70
                      ? "sp-chip--warn"
                      : "sp-chip--ok"
                  )}
                >
                  {snapshot.cpu.temperatureC.toFixed(1)} °C
                </span>
              ) : null
            }
          >
            <div className="sp-row" style={{ gap: 20, alignItems: "flex-end" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span className="sp-label">OVERALL</span>
                <span className="sp-stat sp-stat--xl">
                  {snapshot ? formatPercent(snapshot.cpu.usagePercent, 0) : "—"}
                </span>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <Sparkline values={history.cpu} max={100} />
                <div className="sp-row sp-row--between">
                  <span className="sp-card__meta">
                    cores: {staticInfo?.cpuCores ?? "?"} phys · {staticInfo?.cpuLogical ?? "?"} log
                  </span>
                  <span className="sp-card__meta">
                    freq: {snapshot ? formatMhz(snapshot.cpu.frequencyMhz) : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="sp-cores">
              {snapshot?.cpu.perCore.map((v, i) => (
                <div className="sp-core" key={i}>
                  <div className="sp-core__label">
                    <span>C{i}</span>
                    <span>{v.toFixed(0)}%</span>
                  </div>
                  <Bar percent={v} variant="severity" thin />
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="sp-col-4">
          <Card
            title="MEMORY"
            meta={staticInfo ? formatBytes(staticInfo.totalMemoryBytes) : "..."}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span className="sp-stat sp-stat--xl">
                {snapshot ? formatPercent(snapshot.memory.percent, 0) : "—"}
              </span>
              <Bar percent={snapshot?.memory.percent ?? 0} variant="severity" />
              <Sparkline values={history.memory} max={100} />
              <StatRow
                label="USED"
                value={snapshot ? formatBytes(snapshot.memory.usedBytes) : "—"}
              />
              <StatRow
                label="FREE"
                value={snapshot ? formatBytes(snapshot.memory.freeBytes) : "—"}
              />
              <StatRow
                label="SWAP"
                value={
                  snapshot && snapshot.memory.swapTotalBytes > 0
                    ? `${formatBytes(snapshot.memory.swapUsedBytes)} / ${formatBytes(
                        snapshot.memory.swapTotalBytes
                      )}`
                    : "—"
                }
              />
            </div>
          </Card>
        </div>
      </div>

      {/* STORAGE + NETWORK + GPU */}
      <div className="sp-grid">
        <div className="sp-col-6">
          <Card title="STORAGE" meta={`${snapshot?.disks.length ?? 0} volumes`}>
            {snapshot?.disks.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {snapshot.disks.map((d) => (
                  <div key={d.mountPoint} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div className="sp-row sp-row--between">
                      <span className="sp-value">
                        {d.mountPoint} <span style={{ color: "var(--muted)" }}>· {d.fileSystem}</span>
                      </span>
                      <span className="sp-value">
                        {formatBytes(d.usedBytes)} / {formatBytes(d.totalBytes)}
                      </span>
                    </div>
                    <Bar percent={d.percent} variant="severity" />
                    <div className="sp-row sp-row--between">
                      <span className="sp-card__meta">{d.kind}</span>
                      <span className="sp-card__meta">{formatPercent(d.percent, 1)} used</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <span className="sp-value" style={{ color: "var(--muted)" }}>
                No disks detected.
              </span>
            )}
          </Card>
        </div>

        <div className="sp-col-3">
          <Card
            title="NETWORK"
            meta={snapshot?.networks[0]?.interface ?? "—"}
          >
            <div className="sp-stat sp-stat--lg">↓ {formatRate(totalRx)}</div>
            <Sparkline values={history.netRx} />
            <div className="sp-stat sp-stat--lg">↑ {formatRate(totalTx)}</div>
            <Sparkline values={history.netTx} />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <StatRow
                label="TOTAL RX"
                value={
                  snapshot
                    ? formatBytes(
                        snapshot.networks.reduce((a, n) => a + n.rxTotalBytes, 0)
                      )
                    : "—"
                }
              />
              <StatRow
                label="TOTAL TX"
                value={
                  snapshot
                    ? formatBytes(
                        snapshot.networks.reduce((a, n) => a + n.txTotalBytes, 0)
                      )
                    : "—"
                }
              />
              <StatRow
                label="IFACES"
                value={String(snapshot?.networks.length ?? 0)}
              />
            </div>
          </Card>
        </div>

        <div className="sp-col-3">
          <Card title="GPU" meta="telemetry">
            <div className="sp-notavail">
              <span className="sp-notavail__title">NOT AVAILABLE</span>
              <span className="sp-notavail__body">
                GPU usage, VRAM, and temperatures require vendor-specific SDKs
                (NVML for NVIDIA, ADL for AMD, Metal Performance Shaders for
                macOS). Not shipped in v0.1 — real numbers only, never faked.
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* PROCESSES + SYSTEM INFO */}
      <div className="sp-grid">
        <div className="sp-col-8">
          <Card
            title="PROCESSES"
            meta={`top 10 by ${procTab === "cpu" ? "CPU" : "memory"}`}
            action={
              <div className="sp-tabs">
                <button
                  className={clsx("sp-tab", procTab === "cpu" && "sp-tab--active")}
                  onClick={() => setProcTab("cpu")}
                >
                  CPU
                </button>
                <button
                  className={clsx("sp-tab", procTab === "memory" && "sp-tab--active")}
                  onClick={() => setProcTab("memory")}
                >
                  Memory
                </button>
              </div>
            }
          >
            <ProcessTable
              mode={procTab}
              rows={
                procTab === "cpu"
                  ? snapshot?.topCpuProcesses ?? []
                  : snapshot?.topMemoryProcesses ?? []
              }
            />
          </Card>
        </div>

        <div className="sp-col-4">
          <Card title="SYSTEM" meta="static">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <StatRow label="HOST" value={staticInfo?.hostName ?? "—"} />
              <StatRow label="OS" value={staticInfo ? `${staticInfo.osName} ${staticInfo.osVersion}` : "—"} />
              <StatRow label="KERNEL" value={staticInfo?.kernelVersion ?? "—"} />
              <StatRow label="CPU" value={staticInfo?.cpuBrand ?? "—"} />
              <StatRow
                label="CORES"
                value={staticInfo ? `${staticInfo.cpuCores} / ${staticInfo.cpuLogical}` : "—"}
              />
              <StatRow
                label="MEMORY"
                value={staticInfo ? formatBytes(staticInfo.totalMemoryBytes) : "—"}
              />
            </div>
          </Card>
        </div>
      </div>

      <footer className="sp-footer">
        <span>SystemPulse · built with Tauri + Rust + React</span>
        <span>refresh {prefs.intervalMs} ms{prefs.alwaysOnTop ? " · pinned" : ""}</span>
      </footer>

      <SettingsModal
        open={settingsOpen}
        intervalMs={prefs.intervalMs}
        alwaysOnTop={prefs.alwaysOnTop}
        onClose={() => setSettingsOpen(false)}
        onApply={applyPrefs}
      />
    </div>
  );
}

function OverviewTile({
  label,
  value,
  percent,
  severity,
  raw,
}: {
  label: string;
  value: string;
  percent?: number;
  severity?: "ok" | "warn" | "crit";
  raw?: boolean;
}) {
  return (
    <div className="sp-card sp-card--compact">
      <span className="sp-label">{label}</span>
      <span className="sp-stat sp-stat--lg">{value}</span>
      {!raw && percent != null ? (
        <Bar percent={percent} variant={severity ?? "severity"} thin />
      ) : (
        <div className="sp-bar sp-bar--thin" style={{ visibility: "hidden" }} />
      )}
    </div>
  );
}

function ProcessTable({ mode, rows }: { mode: "cpu" | "memory"; rows: ProcessSnapshot[] }) {
  if (!rows.length) {
    return (
      <span className="sp-value" style={{ color: "var(--muted)" }}>
        Collecting process data…
      </span>
    );
  }
  return (
    <table className="sp-ptable">
      <thead>
        <tr>
          <th style={{ width: 68 }}>PID</th>
          <th>Name</th>
          <th className="num" style={{ width: 90 }}>
            CPU
          </th>
          <th className="num" style={{ width: 110 }}>
            Memory
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => (
          <tr key={`${mode}-${p.pid}`}>
            <td>{p.pid}</td>
            <td>{p.name}</td>
            <td className="num">{p.cpuPercent.toFixed(1)}%</td>
            <td className="num">{formatBytes(p.memoryBytes)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
