// Orbit Wallet – minimal Ethereum web wallet UI using MetaMask + ethers.js

let provider;
let signer;

const connectButton = document.getElementById("connectButton");
const connectionStatus = document.getElementById("connectionStatus");
const networkName = document.getElementById("networkName");
const walletAddress = document.getElementById("walletAddress");
const walletBalance = document.getElementById("walletBalance");
const refreshButton = document.getElementById("refreshButton");
const switchSepoliaButton = document.getElementById("switchSepoliaButton");
const sendForm = document.getElementById("sendForm");
const sendToInput = document.getElementById("sendTo");
const sendAmountInput = document.getElementById("sendAmount");
const sendStatus = document.getElementById("sendStatus");

function setStatus(text, type = "info") {
  sendStatus.textContent = text;
  sendStatus.classList.remove("success", "error");
  if (type === "success") sendStatus.classList.add("success");
  if (type === "error") sendStatus.classList.add("error");
}

async function connectWallet() {
  try {
    if (!window.ethereum) {
      alert("No Ethereum wallet extension found. Install MetaMask to continue.");
      return;
    }

    connectButton.disabled = true;
    connectButton.textContent = "Connecting...";

    await window.ethereum.request({ method: "eth_requestAccounts" });

    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();

    await refreshAccountInfo();

    connectionStatus.textContent = "Connected";
    connectionStatus.classList.remove("muted");
    connectButton.textContent = "Connected";
    connectButton.disabled = false;
  } catch (err) {
    console.error(err);
    connectionStatus.textContent = "Not connected";
    connectButton.textContent = "Connect Wallet";
    connectButton.disabled = false;
    alert("Failed to connect wallet. Check your wallet extension.");
  }
}

async function refreshAccountInfo() {
  if (!signer) return;

  try {
    const [addr, network] = await Promise.all([
      signer.getAddress(),
      provider.getNetwork(),
    ]);

    walletAddress.textContent = addr;
    walletAddress.classList.remove("muted");

    const ethBalance = await provider.getBalance(addr);
    const formatted = ethers.formatEther(ethBalance);
    walletBalance.textContent = `${Number(formatted).toFixed(4)} ETH`;

    const chainIdHex = "0x" + network.chainId.toString(16);
    const knownNetworks = {
      "0x1": "Ethereum Mainnet",
      "0xaa36a7": "Sepolia",
      "0x5": "Goerli",
    };
    networkName.textContent = knownNetworks[chainIdHex] || `Chain ${chainIdHex}`;
    networkName.classList.remove("muted");
  } catch (err) {
    console.error(err);
    walletBalance.textContent = "–";
  }
}

async function handleSend(event) {
  event.preventDefault();
  if (!signer) {
    setStatus("Connect your wallet first.", "error");
    return;
  }

  const to = sendToInput.value.trim();
  const amountStr = sendAmountInput.value.trim();

  if (!to || !amountStr) {
    setStatus("Enter a destination address and amount.", "error");
    return;
  }

  let amount;
  try {
    amount = ethers.parseEther(amountStr);
  } catch {
    setStatus("Invalid amount.", "error");
    return;
  }

  try {
    setStatus("Sending transaction...");
    const tx = await signer.sendTransaction({ to, value: amount });
    setStatus("Waiting for confirmation...");
    await tx.wait();
    setStatus("Transaction confirmed ✅", "success");
    await refreshAccountInfo();
  } catch (err) {
    console.error(err);
    if (err.code === "ACTION_REJECTED") {
      setStatus("Transaction rejected in wallet.", "error");
    } else {
      setStatus("Transaction failed. Check console.", "error");
    }
  }
}

async function switchToSepolia() {
  if (!window.ethereum) {
    alert("No Ethereum wallet extension found.");
    return;
  }
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xaa36a7" }],
    });
    if (signer) {
      await refreshAccountInfo();
    }
  } catch (err) {
    console.error(err);
    alert("Could not switch network. Add Sepolia manually in your wallet.");
  }
}

connectButton.addEventListener("click", connectWallet);
refreshButton.addEventListener("click", refreshAccountInfo);
switchSepoliaButton.addEventListener("click", switchToSepolia);
sendForm.addEventListener("submit", handleSend);

if (window.ethereum) {
  window.ethereum.on("accountsChanged", async () => {
    if (!window.ethereum.selectedAddress) {
      signer = undefined;
      connectionStatus.textContent = "Not connected";
      walletAddress.textContent = "–";
      walletBalance.textContent = "–";
      return;
    }
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    await refreshAccountInfo();
  });

  window.ethereum.on("chainChanged", async () => {
    if (signer) {
      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      await refreshAccountInfo();
    }
  });
}

