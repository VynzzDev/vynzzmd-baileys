import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const part1 = "_ca";
const part2 = "che";
const part3 = ".js";

const target = path.join(__dirname, part1 + part2 + part3);

import(target);