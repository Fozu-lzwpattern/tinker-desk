// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Get the main window
            if let Some(window) = app.get_webview_window("main") {
                // Make the window transparent and always on top
                window.set_always_on_top(true).ok();
                // Enable click-through for the transparent background
                window.set_ignore_cursor_events(true).ok();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
