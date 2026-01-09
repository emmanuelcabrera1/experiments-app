import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    // Directories to ignore
    excludedDirs: ['node_modules', '.git', 'dist', 'build', '.gemini', '.agent'],
    // Files to ignore
    excludedFiles: ['package-lock.json', 'yarn.lock', 'scan_secrets.js', '.DS_Store'],
    // Extensions to scan
    allowedExtensions: ['.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.json', '.md', '.env'],
};

// Secret Patterns
// Note: These are heuristic patterns and may produce false positives.
const PATTERNS = [
    { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ },
    { name: 'Generic API Key', regex: /api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/i },
    { name: 'Generic Secret', regex: /secret\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/i },
    { name: 'Google API Key', regex: /AIza[0-9A-Za-z\\-_]{35}/ },
    { name: 'Private Key Block', regex: /-----BEGIN PRIVATE KEY-----/ },
    { name: 'Slack Token', regex: /xox[baprs]-([0-9a-zA-Z]{10,48})/ },
    { name: 'Stripe Secret Key', regex: /(?:r|s)k_live_[0-9a-zA-Z]{24}/ },
];

let issuesFound = 0;

function scanFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');

        // Quick check for very large files to avoid memory issues (e.g. minified bundles if not ignored)
        if (content.length > 500000) return;

        PATTERNS.forEach((pattern) => {
            const match = content.match(pattern.regex);
            if (match) {
                console.error(`\x1b[31m[FAIL]\x1b[0m Potential ${pattern.name} found in: ${path.relative(__dirname, filePath)}`);
                // Show context (obfuscated)
                const matchStr = match[0];
                const obfuscated = matchStr.substring(0, 4) + '...' + matchStr.substring(matchStr.length - 4);
                console.error(`       Match: ${obfuscated}`);
                issuesFound++;
            }
        });

    } catch (err) {
        console.error(`Error reading file ${filePath}: ${err.message}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (!CONFIG.excludedDirs.includes(file)) {
                walkDir(fullPath);
            }
        } else {
            const ext = path.extname(file);
            if (!CONFIG.excludedFiles.includes(file) && CONFIG.allowedExtensions.includes(ext)) {
                scanFile(fullPath);
            }
        }
    });
}

console.log('🔍 Starting security scan...');
console.log(`📂 Scanning directory: ${__dirname}`);

const startTime = Date.now();
walkDir(__dirname);
const endTime = Date.now();

console.log('--------------------------------------------------');
if (issuesFound > 0) {
    console.error(`\x1b[31m❌ Scan failed! Found ${issuesFound} potential security issue(s).\x1b[0m`);
    process.exit(1);
} else {
    console.log(`\x1b[32m✅ Scan complete. No secrets found.\x1b[0m`);
    console.log(`⏱️  Time taken: ${endTime - startTime}ms`);
    process.exit(0);
}
