use warp::Filter;
use reqwest::Client;
use serde::Deserialize;
use std::time::Duration;
use std::sync::Arc;
use tokio::time;
use thiserror::Error;
use ethers::{
    prelude::*,
    providers::{Provider, Http},
    signers::{LocalWallet, Signer},
};
use std::sync::Mutex;
use dotenv::dotenv;
use std::env;
use std::path::Path;

#[derive(Error, Debug)]
pub enum ApiError {
    #[error("Request failed: {0}")]
    ReqwestError(#[from] reqwest::Error),
    
    #[error("Deserialization failed: {0}")]
    JsonError(#[from] serde_json::Error),

    #[error("Ethers provider error: {0}")]
    ProviderError(#[from] ProviderError),

    #[error("Ethers contract error: {0}")]
    ContractError(Box<dyn std::error::Error + Send + Sync>),

    #[error("Environment variable not found: {0}")]
    EnvVarError(#[from] env::VarError),
}

#[derive(Deserialize, Debug)]
struct LidoAPRResponse {
    data: LidoData,
    meta: LidoMeta,
}

#[derive(Deserialize, Debug)]
struct LidoData {
    apr: f64,
}

#[derive(Deserialize, Debug)]
struct LidoMeta {
    symbol: String,
    address: String,
    chainId: u32,
}

#[derive(Deserialize, Debug)]
struct LidoSMAResponse {
    data: LidoSMAData,
    meta: LidoMeta,
}

#[derive(Deserialize, Debug)]
struct LidoSMAData {
    smaApr: f64,
    aprs: Vec<LidoData>,
}

abigen!(
    LidoAPYPerpetual,
    r#"[
        function updateAPY(uint256 _newAPY) external
    ]"#,
);

async fn fetch_current_apy() -> Result<f64, ApiError> {
    let client = Client::new();
    let lido_api_url = "https://eth-api.lido.fi/v1/protocol/steth/apr/last";
   
    let response = client.get(lido_api_url).send().await?;
    
    if !response.status().is_success() {
        println!("Failed to fetch current APR, status code: {}", response.status());
    }

    let body = response.text().await?;
    println!("Current APR Response: {}", body);

    let apy_response: LidoAPRResponse = serde_json::from_str(&body)?;
    Ok(apy_response.data.apr)
}

async fn fetch_sma_apy() -> Result<f64, ApiError> {
    let client = Client::new();
    let lido_api_url = "https://eth-api.lido.fi/v1/protocol/steth/apr/sma";
   
    let response = client.get(lido_api_url).send().await?;

    if !response.status().is_success() {
        println!("Failed to fetch SMA APR, status code: {}", response.status());
    }

    let body = response.text().await?;
    println!("SMA APR Response: {}", body);

    let apy_response: LidoSMAResponse = serde_json::from_str(&body)?;
    Ok(apy_response.data.smaApr)
}

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

async fn update_contract_apy(new_apy: f64, contract: &LidoAPYPerpetual<SignerMiddleware<Provider<Http>, LocalWallet>>) -> Result<(), ApiError> {
    let new_apy_scaled = (new_apy * 1e18) as u128;
    
    // Create a legacy (non EIP-1559) transaction
    let tx = contract.update_apy(new_apy_scaled.into())
        .legacy();
    
    // Send the transaction
    let pending_tx = tx.send().await.map_err(|e| ApiError::ContractError(Box::new(e)))?;
    
    // Wait for the transaction receipt
    let receipt = pending_tx.await.map_err(|e| ApiError::ContractError(Box::new(e)))?;
    
    println!("Transaction successful: {:?}", receipt);
    Ok(())
}

async fn heartbeat(contract: Arc<LidoAPYPerpetual<SignerMiddleware<Provider<Http>, LocalWallet>>>, last_apy: Arc<Mutex<f64>>) {
    let mut interval = time::interval(Duration::from_secs(5));

    loop {
        interval.tick().await;
        let current_apr = fetch_current_apy().await;

        match current_apr {
            Ok(current) => {
                println!("Heartbeat: Current APR: {:.9}%", current);
                
                let should_update = {
                    let last = last_apy.lock().unwrap();
                    (current - *last).abs() > 1e-9
                };

                if should_update {
                    println!("APY changed. Updating contract...");
                    if let Err(e) = update_contract_apy(current, &contract).await {
                        println!("Failed to update contract APY: {:?}", e);
                    } else {
                        let mut last = last_apy.lock().unwrap();
                        *last = current;
                        println!("Contract APY updated successfully.");
                    }
                } else {
                    println!("No significant APY change. Skipping contract update.");
                }
            },
            Err(e) => println!("\nHeartbeat: Failed to fetch current APR: {:?}", e),
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::from_path(Path::new(".env")).ok();
    
    let apy_route = warp::path!("apy")
        .and(warp::get())
        .and_then(apy_handler);

    let rpc_url = env::var("ROOTSTOCK_TESTNET_RPC_URL")
        .map_err(|_| "ROOTSTOCK_TESTNET_RPC_URL not set in .env file")?;
    println!("RPC URL: {}", rpc_url);

    let provider = Provider::<Http>::try_from(rpc_url)?;

    let private_key = env::var("ROOTSTOCK_TESTNET_PRIVATE_KEY")
        .map_err(|_| "PRIVATE_KEY not set in .env file")?;
    println!("Private key loaded");

    let chain_id: u64 = env::var("CHAIN_ID")
        .map_err(|_| "CHAIN_ID not set in .env file")?
        .parse()
        .map_err(|_| "Invalid CHAIN_ID in .env file")?;
    println!("Chain ID: {}", chain_id);

    let wallet: LocalWallet = private_key.parse::<LocalWallet>()?.with_chain_id(chain_id);

    let client = SignerMiddleware::new(provider, wallet);

    let contract_address = env::var("CONTRACT_ADDRESS")
        .map_err(|_| "CONTRACT_ADDRESS not set in .env file")?
        .parse::<Address>()
        .map_err(|_| "Invalid CONTRACT_ADDRESS in .env file")?;
    println!("Contract address: {:?}", contract_address);

    let contract = LidoAPYPerpetual::new(contract_address, Arc::new(client));

    let last_apy = Arc::new(Mutex::new(0.0));

    let contract_clone = Arc::new(contract);
    let last_apy_clone = Arc::clone(&last_apy);
    tokio::spawn(async move {
        heartbeat(contract_clone, last_apy_clone).await;
    });

    println!("Starting server on http://127.0.0.1:3030");
    warp::serve(apy_route)
        .run(([127, 0, 0, 1], 3030))
        .await;

    Ok(())
}