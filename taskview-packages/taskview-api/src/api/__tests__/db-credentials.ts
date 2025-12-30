import fs from "fs";
import path from "path";

function readEnv(filePath: string) {
    const fullPath = path.resolve(__dirname, filePath);
    const content = fs.readFileSync(fullPath, "utf8");

    return Object.fromEntries(
        content
            .split("\n")
            .filter(Boolean)
            .filter(line => !line.startsWith("#"))
            .map(line => {
                const [key, ...rest] = line.split("=");
                return [key.trim(), rest.join("=").trim()];
            })
    );
}

export const DB_CREDENTIALS = readEnv(".env.for-test");