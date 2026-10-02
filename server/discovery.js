const dgram = require("dgram");
const os = require("os");

const DISCOVERY_PORT = 41234;
const peers = new Map();
const socket = dgram.createSocket("udp4");


//it is used so that the server can neglect my device from udp broadcast discovery. It retrieves the local IP address of the device running the server. This is important because when the server sends out a discovery request, it may receive its own response back. By knowing its own IP address, the server can ignore any responses that come from itself, ensuring that it only processes responses from other peers on the network.
function getLocalIP() {
    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {
        for (const network of interfaces[name]) {
            if (
                network.family === "IPv4" &&
                !network.internal
            ) {
                return network.address;
            }
        }
    }

    return null;
}

const localIP = getLocalIP();

console.log("My IP:", localIP);

//it is used to tranfer response after reciving udp packet from other peers in the network. It listens for incoming messages and responds accordingly. When it receives a discovery request, it sends back a response indicating that it is available as a peer.
socket.on("message", (message, remote) => {
    if (remote.address === localIP || remote.address === "127.0.0.1") return;

    const text = message.toString();

    if (text === "LAN_CACHE_DISCOVERY") {
        peers.set(remote.address, {
            ip: remote.address,
            httpPort: 5000,
            lastSeen: Date.now()
        });

        console.log(`Peer discovered: ${remote.address}`);

        const response = Buffer.from("LAN_CACHE_RESPONSE");

        socket.send(
            response,
            0,
            response.length,
            remote.port,
            remote.address
        );

        return;
    }

    if (text === "LAN_CACHE_RESPONSE") {

        peers.set(remote.address, {
            ip: remote.address,
            lastSeen: Date.now()
        });

        console.log(`Peer discovered: ${remote.address}`);
    }
});

socket.bind(DISCOVERY_PORT, () => {
    socket.setBroadcast(true);

    console.log(
        `UDP discovery listening on port ${DISCOVERY_PORT}`
    );
});

//it is used to send a discovery request to the network. It broadcasts a message to all devices on the local network, asking if any of them are available as peers. When other peers receive this message, they respond with their own information, allowing the sender to discover them.cd 
function getBroadcastAddresses() {
    const interfaces = os.networkInterfaces();
    const addrs = ["255.255.255.255"];
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
            if (net.family === "IPv4" && !net.internal) {
                const ipParts = net.address.split('.').map(Number);
                const maskParts = net.netmask.split('.').map(Number);
                const bc = ipParts.map((p, i) => (p | (~maskParts[i] & 255))).join('.');
                addrs.push(bc);
            }
        }
    }
    return [...new Set(addrs)];
}

function discoverPeers() {
    const message = Buffer.from("LAN_CACHE_DISCOVERY");
    const targets = getBroadcastAddresses();

    for (const target of targets) {
        socket.send(
            message,
            0,
            message.length,
            DISCOVERY_PORT,
            target
        );
    }

    console.log("Searching for LAN peers...");
}

module.exports = {
    discoverPeers,
    peers
};