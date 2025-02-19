import fs from "fs";
import { Worker, isMainThread, parentPort } from "worker_threads";
import os from "os";


const target = process.argv[2] || "192.168.1.0/24";
const ports = [22, 80, 443, 3306];
const maxWorkers = os.cpus().length; 
const activeHosts = [];
const openPorts = [];
let completedWorkers = 0;


function handleWorkerMessage(message) {
    if (message.type === "host") {
        activeHosts.push(message.host);
        console.log(`[+] Aktiv Host: ${message.host}`);
    } else if (message.type === "port") {
        openPorts.push({ host: message.host, port: message.port });
        console.log(`[*] ${message.host} - Port Açıq: ${message.port}`);
    }
}


function handleWorkerExit() {
    completedWorkers++;
    if (completedWorkers === maxWorkers) {
        console.log("✅ Skan tamamlandı!");
        fs.writeFileSync("scan_results.json", JSON.stringify({ activeHosts, openPorts }, null, 2));
    }
}


function distributeScan() {
    console.log("🔍 Multi-threaded skan başlayır...");

    const baseIP = target.replace(/\.\d+\/\d+$/, "");
    const ips = Array.from({ length: 254 }, (_, i) => `${baseIP}.${i + 1}`);

    const chunkSize = Math.ceil(ips.length / maxWorkers);
    const ipChunks = Array.from({ length: maxWorkers }, (_, i) => ips.slice(i * chunkSize, (i + 1) * chunkSize));

    ipChunks.forEach((ipList) => {
        const worker = new Worker("./worker.js", { workerData: { ipList, ports } });
        worker.on("message", handleWorkerMessage);
        worker.on("exit", handleWorkerExit);
    });
}

distributeScan();
