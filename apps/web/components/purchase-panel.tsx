"use client";

import { BrowserProvider, Contract, formatEther } from "ethers";
import { useState } from "react";

declare global {
  interface Window { ethereum?: { request(args: { method: string; params?: unknown[] }): Promise<unknown> } }
}

const ABI = [
  "function getVersion(bytes32 versionKey) view returns ((address seller, bytes32 datasetHash, bytes32 passportHash, bytes32 storageRoot, uint256 price, bool active))",
  "function purchase(bytes32 versionKey) payable"
] as const;

const GALILEO_NETWORK = {
  chainId: "0x40da",
  chainName: "0G Galileo Testnet",
  nativeCurrency: { name: "A0GI", symbol: "A0GI", decimals: 18 },
  rpcUrls: ["https://evmrpc-testnet.0g.ai"],
  blockExplorerUrls: ["https://chainscan-galileo.0g.ai"]
};

type Status = "idle" | "connecting" | "ready" | "purchasing" | "reconciling" | "signing" | "granted" | "error";

const accessMessage = (datasetVersionId: string, buyerAddress: string, timestamp: string) =>
  `AetheD dataset access\nVersion: ${datasetVersionId}\nBuyer: ${buyerAddress}\nTimestamp: ${timestamp}`;

export function PurchasePanel(props: { datasetVersionId: string; chainId: number; contractAddress: string; versionKey: string; versionLabel: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [account, setAccount] = useState("");
  const [priceWei, setPriceWei] = useState<bigint>();
  const [message, setMessage] = useState("Connect a wallet to load the live listing.");

  async function connect() {
    try {
      if (!window.ethereum) throw new Error("No injected EVM wallet was found");
      setStatus("connecting");
      const chainId = `0x${props.chainId.toString(16)}`;
      try {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
      } catch (error) {
        if (!(error instanceof Error) || !("code" in error) || error.code !== 4902 || props.chainId !== 16602) throw error;
        await window.ethereum.request({ method: "wallet_addEthereumChain", params: [GALILEO_NETWORK] });
      }
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const version = await new Contract(props.contractAddress, ABI, provider).getFunction("getVersion")(props.versionKey);
      if (!version.active) throw new Error("This listing is paused");
      setAccount(address); setPriceWei(version.price); setStatus("ready");
      setMessage(`Connected ${address.slice(0, 6)}…${address.slice(-4)}`);
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Wallet connection failed"); }
  }

  async function purchase() {
    try {
      if (!window.ethereum || priceWei === undefined) return;
      setStatus("purchasing"); setMessage("Confirm the exact-version purchase in your wallet.");
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const buyerAddress = await signer.getAddress();
      setAccount(buyerAddress);
      const transaction = await new Contract(props.contractAddress, ABI, signer).getFunction("purchase")(props.versionKey, { value: priceWei });
      setStatus("reconciling"); setMessage("Waiting for confirmation and access reconciliation…");
      await transaction.wait();
      const response = await fetch("/api/v1/purchases/reconcile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ datasetVersionId: props.datasetVersionId, buyerAddress, transactionHash: transaction.hash }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Purchase reconciliation failed");
      await requestAccess(provider, buyerAddress);
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Purchase failed"); }
  }

  async function requestAccess(provider?: BrowserProvider, knownAccount?: string) {
    try {
      if (!window.ethereum) throw new Error("Wallet disconnected");
      setStatus("signing"); setMessage("Sign the access proof to retrieve this version.");
      const walletProvider = provider ?? new BrowserProvider(window.ethereum);
      const signer = await walletProvider.getSigner();
      const buyerAddress = knownAccount ?? await signer.getAddress();
      const timestamp = new Date().toISOString();
      const signature = await signer.signMessage(accessMessage(props.datasetVersionId, buyerAddress, timestamp));
      const query = new URLSearchParams({ buyerAddress, timestamp, signature });
      const response = await fetch(`/api/v1/versions/${encodeURIComponent(props.datasetVersionId)}/content?${query}`);
      if (!response.ok) { const body = await response.json(); throw new Error(body.error?.message ?? "Access was not granted"); }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url; link.download = `aethed-${props.datasetVersionId}`; link.click();
      URL.revokeObjectURL(url);
      setStatus("granted"); setMessage("Exact-version artifact downloaded.");
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Access proof failed"); }
  }

  return <div className="purchasePanel">
    <span>VERSION {props.versionLabel}</span>
    <strong>{priceWei === undefined ? "Live price" : `${formatEther(priceWei)} A0GI`}</strong>
    {status === "idle" || status === "connecting" || status === "error"
      ? <button className="darkButton" disabled={status === "connecting"} onClick={connect}>{status === "connecting" ? "Connecting…" : account ? "Reconnect Wallet" : "Connect Wallet"}</button>
      : status === "ready" ? <button className="darkButton" onClick={purchase}>Buy Dataset</button>
      : status === "granted" ? <button className="darkButton" onClick={() => requestAccess()}>Refresh Access Proof</button>
      : <button className="darkButton" disabled>{status === "purchasing" ? "Confirming…" : status === "reconciling" ? "Reconciling…" : "Signing…"}</button>}
    <small>{message}</small>
  </div>;
}
