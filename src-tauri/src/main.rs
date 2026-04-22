// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    Emitter, Manager,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
};

#[tauri::command]
fn open_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.show();
        let _ = win.set_focus();
    } else {
        let url = tauri::WebviewUrl::App("index.html?settings=1".into());
        tauri::WebviewWindowBuilder::new(&app, "settings", url)
            .title("tinker-desk Settings")
            .inner_size(820.0, 620.0)
            .resizable(true)
            .decorations(true)
            .transparent(false)
            .always_on_top(false)
            .build()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![open_settings_window])
        .setup(|app| {
            // ── Main window setup ──────────────────────────────────
            if let Some(window) = app.get_webview_window("main") {
                // Transparent, always on top, no decorations (set in tauri.conf.json)
                // DO NOT set_ignore_cursor_events — that kills ALL interaction!
                // The transparent areas are naturally click-through in Tauri v2.

                // Set a reasonable default size for the pet window
                let _ = window.set_size(tauri::LogicalSize::new(400.0, 400.0));

                // Position at bottom-right of screen
                if let Ok(monitor) = window.current_monitor() {
                    if let Some(monitor) = monitor {
                        let screen = monitor.size();
                        let scale = monitor.scale_factor();
                        let x = (screen.width as f64 / scale) - 420.0;
                        let y = (screen.height as f64 / scale) - 420.0;
                        let _ = window.set_position(tauri::LogicalPosition::new(x, y));
                    }
                }
            }

            // ── System tray ────────────────────────────────────────
            let show = MenuItem::with_id(app, "show", "Show Pet", true, None::<&str>)?;
            let find_buddy = MenuItem::with_id(app, "find_buddy", "🎲 Find Buddy", true, None::<&str>)?;
            let settings = MenuItem::with_id(app, "settings", "⚙️ Settings", true, None::<&str>)?;
            let separator = MenuItem::with_id(app, "sep", "────────", false, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&show, &find_buddy, &settings, &separator, &quit])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("tinker-desk — Your Desktop Companion")
                .on_menu_event(move |app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "find_buddy" => {
                            // Emit event to frontend
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.emit("tray-find-buddy", ());
                            }
                        }
                        "settings" => {
                            // If the settings window already exists, focus it
                            if let Some(win) = app.get_webview_window("settings") {
                                let _ = win.show();
                                let _ = win.set_focus();
                            } else {
                                // Create a new dedicated settings window
                                let url = tauri::WebviewUrl::App("index.html?settings=1".into());
                                let _ = tauri::WebviewWindowBuilder::new(
                                    app,
                                    "settings",
                                    url,
                                )
                                .title("tinker-desk Settings")
                                .inner_size(820.0, 620.0)
                                .resizable(true)
                                .decorations(true)
                                .transparent(false)
                                .always_on_top(false)
                                .build();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
