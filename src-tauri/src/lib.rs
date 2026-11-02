mod stats;

use parking_lot::Mutex;
use stats::{Snapshot, StatsCollector};
use std::sync::Arc;
use tauri::{Manager, State};

pub struct AppState {
    collector: Arc<Mutex<StatsCollector>>,
}

#[tauri::command]
fn get_snapshot(state: State<'_, AppState>) -> Snapshot {
    state.collector.lock().snapshot()
}

#[tauri::command]
fn get_static_info(state: State<'_, AppState>) -> stats::StaticInfo {
    state.collector.lock().static_info()
}

#[tauri::command]
fn set_always_on_top(window: tauri::Window, always: bool) -> Result<(), String> {
    window.set_always_on_top(always).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let collector = Arc::new(Mutex::new(StatsCollector::new()));
            app.manage(AppState { collector });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_snapshot,
            get_static_info,
            set_always_on_top
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
