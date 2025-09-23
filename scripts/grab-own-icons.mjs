// scripts/grab-owm-icons.mjs
import fs from "node:fs/promises";
import path from "node:path";
import https from "node:https";

const codes = ["01", "02", "03", "04", "09", "10", "11", "13", "50"];
const variants = ["d", "n"];

const outDir = path.resolve("assets/owm");
await fs.mkdir(outDir, { recursive: true });

function fetchFile(url, dest) {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            const file = fs.open(dest, "w").then(f => {
                res.on("data", chunk => f.writeFile(chunk, { flag: "a" }));
                res.on("end", async () => { await f.close(); resolve(); });
            });
        }).on("error", reject);
    });
}

for (const c of codes) {
    for (const v of variants) {
        const name = `${c}${v}.png`;
        const url = `https://openweathermap.org/img/wn/${name}`;
        const dest = path.join(outDir, name);
        console.log("→", name);
        await fetchFile(url, dest);
    }
}
console.log("Done.");
