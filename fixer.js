import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverFile = path.join(__dirname, "server.ts");
let content = fs.readFileSync(serverFile, "utf-8");

content = content.replace(/if\s*\{\n/g, "if (isOpenRouter || provider === \"openai\" || provider === \"custom\") {\n");
content = content.replace(/if \(isOpenRouter \|\| provider === "openai"\)/g, "if (isOpenRouter || provider === \"openai\" || provider === \"custom\")");


fs.writeFileSync(serverFile, content);
console.log("Done");
