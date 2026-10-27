//! Inquiry-specific validation and an optional Cloudflare Wasm entry point.
//! No SMTP implementation, credential store or provider administration API.
pub mod config;
#[cfg(target_arch = "wasm32")]
mod delivery;
#[cfg(target_arch = "wasm32")]
mod edge;
#[cfg(target_arch = "wasm32")]
mod graph;
#[cfg(target_arch = "wasm32")]
mod graph_http;
#[cfg(target_arch = "wasm32")]
mod io;
pub mod network;
#[cfg(target_arch = "wasm32")]
mod receipts;
#[cfg(target_arch = "wasm32")]
mod receive;
pub mod submission;
#[cfg(target_arch = "wasm32")]
pub use receipts::ContactReceipts;
