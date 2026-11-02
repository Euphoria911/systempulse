# SystemPulse

A retro-styled real-time PC performance monitor. Live CPU / RAM / disk / network / process stats in a clean monochrome pixel UI.

![SystemPulse](docs/screenshot.png)

## Features

- **CPU** — overall + per-core usage, model name, frequency
- **Memory** — total / used / free with live bar
- **Storage** — all mounted disks with used / free / percent
- **Network** — download / upload speed, totals, interface name
- **GPU** — reported when the OS exposes it, graceful "Not available" otherwise
- **Processes** — top 10 by CPU and top 10 by RAM, switchable
- **Live refresh** — 1 Hz default, configurable from the Settings dialog
- **History sparklines** — 60-second rolling trace for CPU and RAM

## Stack

- Tauri 2 (Rust) desktop shell
- React 19 + TypeScript + Vite 6 frontend
- Tailwind CSS v4 for styling
- [`sysinfo`](https://docs.rs/sysinfo) for cross-platform metrics
- Pixel-art aesthetic: Press Start 2P headings, Inter body, grid-paper background, offset shadows

## Platform support

| Metric | Windows | macOS | Linux |
|---|---|---|---|
| CPU usage / per-core | ✅ | ✅ | ✅ |
| CPU model / frequency | ✅ | ✅ | ✅ |
| CPU temperature | ⚠️ driver dependent | ✅ | ✅ |
| RAM | ✅ | ✅ | ✅ |
| Disks | ✅ | ✅ | ✅ |
| Network | ✅ | ✅ | ✅ |
| GPU | ❌ | ❌ | ❌ |
| Processes | ✅ | ✅ | ✅ |

GPU telemetry needs vendor-specific SDKs (NVML, ADL, Metal Performance Shaders) and is intentionally out of scope for v0.1 — the panel shows a clear "Not available on this system" state rather than fake numbers.

## Running locally

```sh
npm install
npm run tauri dev
```

To build an installer:

```sh
npm run tauri build
```

## License

MIT © Euphoria911
