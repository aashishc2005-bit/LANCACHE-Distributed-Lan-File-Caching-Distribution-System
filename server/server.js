const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const {
    discoverPeers,
    peers
} = require("./discovery");

const app = express();

const filesDirectory = path.join(__dirname, "../files");

// Calculate SHA-256 hash of a file
function calculateFileHash(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash("sha256");
        const stream = fs.createReadStream(filePath);

        stream.on("data", (chunk) => {
            hash.update(chunk);
        });

        stream.on("end", () => {
            resolve(hash.digest("hex"));
        });

        stream.on("error", (error) => {
            reject(error);
        });
    });
}

// Serve actual files
app.use("/files", express.static(filesDirectory));

// Get file information
app.get("/api/files", async (req, res) => {
    try {
        const entries = await fs.promises.readdir(filesDirectory, {
            withFileTypes: true
        });

        const files = [];

        for (const entry of entries) {
            if (!entry.isFile()) {
                continue;
            }

            const filePath = path.join(filesDirectory, entry.name);

            const stats = await fs.promises.stat(filePath);

            const hash = await calculateFileHash(filePath);

            files.push({
                name: entry.name,
                size: stats.size,
                hash: hash
            });
        }

        res.json(files);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Unable to read file information"
        });
    }
});


//API to see discovered peers
app.get("/api/peers", (req, res) => {
    res.json([...peers.values()]);
});


app.listen(5000, "0.0.0.0", () => {
    console.log("LAN file server running on port 5000");

    discoverPeers();
});