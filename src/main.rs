use warp::Filter;
use reqwest::Client;
use serde::Deserialize;
use std::time::Duration;
use tokio::time;

// Struct to deserialize the response from the Lido API
#[derive(Deserialize, Debug)]
struct LidoAPYResponse {
    apr: f64,  // APR value from the Lido Finance API
}

// Fetch Lido APY from the specified endpoint
async fn fetch_lido_apy() -> Result<f64, reqwest::Error> {
    let client = Client::new();
    let lido_api_url = "https://eth-api-holesky.testnet.fi/v1/protocol/steth/apr/last";
    
    // Send request to the API
    let response = client.get(lido_api_url).send().await?;
    
    // Deserialize the response into the LidoAPYResponse struct
    let apy_response: LidoAPYResponse = response.json().await?;
    
    Ok(apy_response.apr)
}

// API handler to fetch the APY and return it as a JSON response
async fn apy_handler() -> Result<impl warp::Reply, warp::Rejection> {
    match fetch_lido_apy().await {
        Ok(apy) => Ok(warp::reply::json(&serde_json::json!({ "apy": apy }))),
        Err(_) => Ok(warp::reply::json(&serde_json::json!({ "error": "Failed to fetch Lido APY" }))),
    }
}

// Heartbeat function to fetch and print the APY periodically
async fn heartbeat() {
    let mut interval = time::interval(Duration::from_secs(60)); // 60 seconds interval
    
    loop {
        interval.tick().await;
        match fetch_lido_apy().await {
            Ok(apy) => println!("Heartbeat: Latest Lido APY: {:.2}%", apy),
            Err(err) => println!("Heartbeat: Failed to fetch Lido APY: {}", err),
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
