import { workerData, parentPort } from "worker_threads";
import ping from "ping";
import net from "net";


function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkHosts(ipList) {
    for (const ip of ipList) {
        try {
            const res = await ping.promise.probe(ip, { timeout: 3 });
            if (res.alive) {
                parentPort.postMessage({ type: "host", host: ip });
                await scanPorts(ip);
            }
        } catch (err) {
            console.error(`[-] Ping xətası: ${ip}`, err);
        }

        await delay(50);
    }
}


async function scanPorts(host) {
    for (const port of workerData.ports) {
        await new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(3000);

            socket.connect(port, host, () => {
                parentPort.postMessage({ type: "port", host, port });
                socket.destroy();
                resolve();
            });

            socket.on("error", () => {
                socket.destroy();
                resolve();
            });

            socket.on("timeout", () => {
                socket.destroy();
                resolve();
            });
        });

        await delay(100);
    }
}


checkHosts(workerData.ipList);
