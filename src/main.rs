use warp::Filter;
use reqwest::Client;
use serde::Deserialize;
use std::time::Duration;
use tokio::time;
use thiserror::Error;

// Define a custom error type to handle both reqwest and serde_json errors
#[derive(Error, Debug)]
pub enum ApiError {
    #[error("Request failed: {0}")]
    ReqwestError(#[from] reqwest::Error),
    
    #[error("Deserialization failed: {0}")]
    JsonError(#[from] serde_json::Error),
}

// Struct to deserialize the response from the Lido API for current APR
#[derive(Deserialize, Debug)]
struct LidoAPRResponse {
    data: LidoData,  // For the Last APR data
    meta: LidoMeta,  // Metadata (symbol, chainId, etc.)
}

#[derive(Deserialize, Debug)]
struct LidoData {
    apr: f64,  // APR value from the Lido Finance API
}

#[derive(Deserialize, Debug)]
struct LidoMeta {
    symbol: String,
    address: String,
    chainId: u32,
}

// Struct to deserialize the response for SMA APR
#[derive(Deserialize, Debug)]
struct LidoSMAResponse {
    data: LidoSMAData,  // For SMA data
    meta: LidoMeta,     // Metadata
}

#[derive(Deserialize, Debug)]
struct LidoSMAData {
    smaApr: f64,  // Simple Moving Average APR (7 days)
    aprs: Vec<LidoData>,  // List of daily APRs
}

// Fetch Lido's Last (Current) APR on mainnet
async fn fetch_current_apy() -> Result<f64, ApiError> {
    let client = Client::new();
    let lido_api_url = "https://eth-api.lido.fi/v1/protocol/steth/apr/last";  // Mainnet Current APR
   
    // Send request to the API
    let response = client.get(lido_api_url).send().await?;
    
    // Check the status code and log the response
    if !response.status().is_success() {
        println!("Failed to fetch current APR, status code: {}", response.status());
    }

    // Log the full response for debugging
    let body = response.text().await?;
    println!("Current APR Response: {}", body);

    // Deserialize based on the actual response structure
    let apy_response: LidoAPRResponse = serde_json::from_str(&body)?;
    Ok(apy_response.data.apr)  // Access the APR value within `data`
}

// Fetch Lido's 7-Day SMA APR on mainnet
async fn fetch_sma_apy() -> Result<f64, ApiError> {
    let client = Client::new();
    let lido_api_url = "https://eth-api.lido.fi/v1/protocol/steth/apr/sma";  // Mainnet SMA APR
   
    // Send request to the API
    let response = client.get(lido_api_url).send().await?;

    // Check the status code and log the response
    if !response.status().is_success() {
        println!("Failed to fetch SMA APR, status code: {}", response.status());
    }

    // Log the full response for debugging
    let body = response.text().await?;
    println!("SMA APR Response: {}", body);

    // Deserialize based on the actual response structure
    let apy_response: LidoSMAResponse = serde_json::from_str(&body)?;
    Ok(apy_response.data.smaApr)  // Access the SMA APR value within `data`
}

// API handler to fetch both SMA and Current APR and return them as a JSON response
async fn apy_handler() -> Result<impl warp::Reply, warp::Rejection> {
    let current_apr = fetch_current_apy().await;
    let sma_apr = fetch_sma_apy().await;

    match (current_apr, sma_apr) {
        (Ok(current), Ok(sma)) => Ok(warp::reply::json(&serde_json::json!({
            "current_apr": current,
            "sma_apr": sma,
        }))),
        (Err(current_err), Err(sma_err)) => {
            println!("Failed to fetch both APR values. Current APR error: {:?}, SMA APR error: {:?}", current_err, sma_err);
            Ok(warp::reply::json(&serde_json::json!({ "error": "Failed to fetch both APR values." })))
        },
        (Err(current_err), Ok(sma)) => {
            println!("Failed to fetch current APR. Error: {:?}, SMA APR fetched: {:.9}%", current_err, sma);
            Ok(warp::reply::json(&serde_json::json!({
                "sma_apr": sma,
                "error": "Failed to fetch current APR."
            })))
        },
        (Ok(current), Err(sma_err)) => {
            println!("Failed to fetch SMA APR. Error: {:?}, Current APR fetched: {:.9}%", sma_err, current);
            Ok(warp::reply::json(&serde_json::json!({
                "current_apr": current,
                "error": "Failed to fetch SMA APR."
            })))
        },
    }
}

// Heartbeat function to fetch and print both the SMA and Current APR periodically
async fn heartbeat() {
    let mut interval = time::interval(Duration::from_secs(5)); // 5 seconds interval

    loop {
        interval.tick().await;
        let current_apr = fetch_current_apy().await;
        let sma_apr = fetch_sma_apy().await;

        match (current_apr, sma_apr) {
            (Ok(current), Ok(sma)) => println!("Heartbeat: Current APR: {:.9}%, SMA APR: {:.9}%", current, sma),
            _ => println!("/nHeartbeat: Failed to fetch one or both APR values."),
        }
    }
}

#[tokio::main]
async fn main() {
    dotenv::dotenv().ok(); // Load .env variables if needed
    
    // Define the API route
    let apy_route = warp::path!("apy")
        .and(warp::get())
        .and_then(apy_handler);

    // Spawn the heartbeat task in the background
    tokio::spawn(async {
        heartbeat().await;
    });

    // Start the server on port 3030
    warp::serve(apy_route)
        .run(([127, 0, 0, 1], 3030))
        .await;
}
