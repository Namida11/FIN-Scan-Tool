import fs from 'fs';
import ping from 'ping';
import net from 'net';


const target = process.argv[2] || "165.22.88.98"; 
const ports = [22, 80, 443, 3306]; 

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


async function discoverHosts(subnet) {
    const activeHosts = [];
    const baseIP = subnet.replace(/\.\d+\/\d+$/, "");

    for (let i = 1; i < 255; i++) {
        const ip = `${baseIP}.${i}`;
        try {
            const res = await Promise.race([
                ping.promise.probe(ip, { timeout: 3 }),
                delay(4000).then(() => ({ alive: false })) // 4 saniyə sonra timeout et
            ]);

            if (res.alive) {
                console.log(`[+] Aktiv Host: ${ip}`);
                activeHosts.push(ip);
            }
        } catch (err) {
            console.error(`[-] Ping xətası: ${ip}`, err);
        }

        await delay(100); 
    }

    return activeHosts;
}



async function scanPorts(host) {
    const openPorts = [];
    const randomizedPorts = ports.sort(() => Math.random() - 0.5); 

    for (const port of randomizedPorts) {
        await new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(3000); 

            socket.connect(port, host, () => {
                console.log(`[*] ${host} - Port Açıq: ${port}`);
                openPorts.push(port);
                socket.destroy();
                resolve();
            });

            socket.on("error", () => {
                socket.destroy();
                resolve();
            });

            socket.on("timeout", () => {
                console.warn(`[-] ${host}:${port} timeout oldu`);
                socket.destroy();
                resolve();
            });
        });

        await delay(200); 
    }

    return { host, openPorts };
}


// Əsas funksiyanı işə salır
async function startScan() {
    console.log("Skan başlanır...");

    let hosts = [];

    if (target.includes("/")) {
        console.log(" Subnet aşkarlandı, host discovery başlayır...");
        hosts = await discoverHosts(target);
    } else {
        console.log(" Birbaşa port scanning başlayır...");
        hosts = [target];
    }

    const scanResults = [];

    for (const host of hosts) {
        scanResults.push(await scanPorts(host));
        await delay(500); 
    }

    
    fs.writeFileSync("scan_results.json", JSON.stringify(scanResults, null, 2));
    console.log(" Skan tamamlandı! Nəticələr `scan_results.json` faylına yazıldı.");
}

startScan();
