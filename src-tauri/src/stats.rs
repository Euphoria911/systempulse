use serde::Serialize;
use std::time::Instant;
use sysinfo::{
    Components, Disks, MemoryRefreshKind, Networks, Pid, ProcessRefreshKind, ProcessesToUpdate,
    RefreshKind, System,
};

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct StaticInfo {
    pub host_name: Option<String>,
    pub os_name: String,
    pub os_version: String,
    pub kernel_version: Option<String>,
    pub cpu_brand: String,
    pub cpu_cores: usize,
    pub cpu_logical: usize,
    pub total_memory_bytes: u64,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CpuSnapshot {
    pub usage_percent: f32,
    pub per_core: Vec<f32>,
    pub frequency_mhz: u64,
    pub temperature_c: Option<f32>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MemorySnapshot {
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub free_bytes: u64,
    pub percent: f32,
    pub swap_total_bytes: u64,
    pub swap_used_bytes: u64,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DiskSnapshot {
    pub name: String,
    pub mount_point: String,
    pub kind: String,
    pub file_system: String,
    pub total_bytes: u64,
    pub available_bytes: u64,
    pub used_bytes: u64,
    pub percent: f32,
    pub is_removable: bool,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NetworkSnapshot {
    pub interface: String,
    pub rx_bytes_per_sec: u64,
    pub tx_bytes_per_sec: u64,
    pub rx_total_bytes: u64,
    pub tx_total_bytes: u64,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProcessSnapshot {
    pub pid: u32,
    pub name: String,
    pub cpu_percent: f32,
    pub memory_bytes: u64,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct GpuSnapshot {
    pub available: bool,
    pub message: String,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub timestamp_ms: u128,
    pub uptime_seconds: u64,
    pub cpu: CpuSnapshot,
    pub memory: MemorySnapshot,
    pub disks: Vec<DiskSnapshot>,
    pub networks: Vec<NetworkSnapshot>,
    pub top_cpu_processes: Vec<ProcessSnapshot>,
    pub top_memory_processes: Vec<ProcessSnapshot>,
    pub gpu: GpuSnapshot,
}

pub struct StatsCollector {
    system: System,
    disks: Disks,
    networks: Networks,
    components: Components,
    last_tick: Instant,
    cpu_logical: usize,
}

impl StatsCollector {
    pub fn new() -> Self {
        let refresh = RefreshKind::new()
            .with_cpu(sysinfo::CpuRefreshKind::everything())
            .with_memory(MemoryRefreshKind::everything())
            .with_processes(ProcessRefreshKind::everything());
        let mut system = System::new_with_specifics(refresh);
        system.refresh_all();
        let cpu_logical = system.cpus().len();
        Self {
            system,
            disks: Disks::new_with_refreshed_list(),
            networks: Networks::new_with_refreshed_list(),
            components: Components::new_with_refreshed_list(),
            last_tick: Instant::now(),
            cpu_logical,
        }
    }

    pub fn static_info(&self) -> StaticInfo {
        StaticInfo {
            host_name: System::host_name(),
            os_name: System::name().unwrap_or_else(|| "Unknown OS".into()),
            os_version: System::os_version().unwrap_or_else(|| "unknown".into()),
            kernel_version: System::kernel_version(),
            cpu_brand: self
                .system
                .cpus()
                .first()
                .map(|c| c.brand().to_string())
                .unwrap_or_else(|| "Unknown CPU".into()),
            cpu_cores: self.system.physical_core_count().unwrap_or(self.cpu_logical),
            cpu_logical: self.cpu_logical,
            total_memory_bytes: self.system.total_memory(),
        }
    }

    pub fn snapshot(&mut self) -> Snapshot {
        self.system
            .refresh_cpu_specifics(sysinfo::CpuRefreshKind::everything());
        self.system
            .refresh_memory_specifics(MemoryRefreshKind::everything());
        self.system.refresh_processes_specifics(
            ProcessesToUpdate::All,
            true,
            ProcessRefreshKind::everything(),
        );
        self.disks.refresh();
        self.networks.refresh();
        self.components.refresh();

        let now = Instant::now();
        let elapsed = now.duration_since(self.last_tick).as_secs_f64().max(0.001);
        self.last_tick = now;

        let per_core: Vec<f32> = self.system.cpus().iter().map(|c| c.cpu_usage()).collect();
        let overall = if per_core.is_empty() {
            0.0
        } else {
            per_core.iter().sum::<f32>() / per_core.len() as f32
        };
        let frequency_mhz = self
            .system
            .cpus()
            .first()
            .map(|c| c.frequency())
            .unwrap_or(0);

        let temperature_c = self
            .components
            .iter()
            .filter_map(|c| {
                let label = c.label().to_lowercase();
                if label.contains("cpu")
                    || label.contains("core")
                    || label.contains("package")
                    || label.contains("tdie")
                    || label.contains("tctl")
                {
                    let t = c.temperature();
                    if t.is_finite() { Some(t) } else { None }
                } else {
                    None
                }
            })
            .fold(None::<f32>, |acc, t| match acc {
                Some(prev) if prev >= t => Some(prev),
                _ => Some(t),
            });

        let total_mem = self.system.total_memory();
        let used_mem = self.system.used_memory();
        let free_mem = self.system.available_memory();
        let mem_pct = if total_mem > 0 {
            (used_mem as f64 / total_mem as f64 * 100.0) as f32
        } else {
            0.0
        };

        let mut disks: Vec<DiskSnapshot> = self
            .disks
            .list()
            .iter()
            .map(|d| {
                let total = d.total_space();
                let avail = d.available_space();
                let used = total.saturating_sub(avail);
                let pct = if total > 0 {
                    (used as f64 / total as f64 * 100.0) as f32
                } else {
                    0.0
                };
                DiskSnapshot {
                    name: d.name().to_string_lossy().into_owned(),
                    mount_point: d.mount_point().to_string_lossy().into_owned(),
                    kind: format!("{:?}", d.kind()),
                    file_system: d.file_system().to_string_lossy().into_owned(),
                    total_bytes: total,
                    available_bytes: avail,
                    used_bytes: used,
                    percent: pct,
                    is_removable: d.is_removable(),
                }
            })
            .filter(|d| d.total_bytes > 0)
            .collect();
        disks.sort_by(|a, b| a.mount_point.cmp(&b.mount_point));
        disks.dedup_by(|a, b| a.mount_point == b.mount_point);

        let networks: Vec<NetworkSnapshot> = self
            .networks
            .iter()
            .filter_map(|(name, data)| {
                let rx_delta = data.received();
                let tx_delta = data.transmitted();
                if rx_delta == 0 && tx_delta == 0 && data.total_received() == 0 && data.total_transmitted() == 0 {
                    return None;
                }
                Some(NetworkSnapshot {
                    interface: name.clone(),
                    rx_bytes_per_sec: ((rx_delta as f64) / elapsed) as u64,
                    tx_bytes_per_sec: ((tx_delta as f64) / elapsed) as u64,
                    rx_total_bytes: data.total_received(),
                    tx_total_bytes: data.total_transmitted(),
                })
            })
            .collect();

        let cpu_divisor = self.cpu_logical.max(1) as f32;
        let mut proc_list: Vec<ProcessSnapshot> = self
            .system
            .processes()
            .iter()
            .filter_map(|(pid, p)| {
                let name = p.name().to_string_lossy().into_owned();
                if name.is_empty() {
                    return None;
                }
                Some(ProcessSnapshot {
                    pid: pid.as_u32(),
                    name,
                    cpu_percent: p.cpu_usage() / cpu_divisor,
                    memory_bytes: p.memory(),
                })
            })
            .collect();

        let mut top_cpu = proc_list.clone();
        top_cpu.sort_by(|a, b| b.cpu_percent.partial_cmp(&a.cpu_percent).unwrap_or(std::cmp::Ordering::Equal));
        top_cpu.truncate(10);

        proc_list.sort_by(|a, b| b.memory_bytes.cmp(&a.memory_bytes));
        proc_list.truncate(10);

        let timestamp_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0);

        Snapshot {
            timestamp_ms,
            uptime_seconds: System::uptime(),
            cpu: CpuSnapshot {
                usage_percent: overall,
                per_core,
                frequency_mhz,
                temperature_c,
            },
            memory: MemorySnapshot {
                total_bytes: total_mem,
                used_bytes: used_mem,
                free_bytes: free_mem,
                percent: mem_pct,
                swap_total_bytes: self.system.total_swap(),
                swap_used_bytes: self.system.used_swap(),
            },
            disks,
            networks,
            top_cpu_processes: top_cpu,
            top_memory_processes: proc_list,
            gpu: GpuSnapshot {
                available: false,
                message: "GPU telemetry requires vendor-specific SDKs (NVML / ADL / Metal). Not available in this build.".into(),
            },
        }
    }
}

// Silence unused warning on Pid in some sysinfo versions.
#[allow(dead_code)]
fn _pid_type_marker(_p: Pid) {}
