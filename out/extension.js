"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
function activate(context) {
    console.log('CP Helper Activated');
    // 1. Top Right Toolbar Button
    const toolbarButton = vscode.commands.registerCommand('cp-helper.toolbar', () => {
        createProblem();
    });
    // 2. Command Palette এ দেখাবে
    const commandPalette = vscode.commands.registerCommand('cp-helper.create', () => {
        createProblem();
    });
    // 3. Status bar button (optional - নিচে)
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBar.text = "$(rocket) CP Helper";
    statusBar.tooltip = "Create problem from clipboard URL";
    statusBar.command = "cp-helper.toolbar";
    statusBar.show();
    context.subscriptions.push(toolbarButton, commandPalette, statusBar);
}
async function createProblem() {
    try {
        // Get URL from clipboard
        const clipboard = await vscode.env.clipboard.readText();
        if (!clipboard.includes('codeforces.com') && !clipboard.includes('atcoder.jp')) {
            vscode.window.showErrorMessage('❌ Copy a Codeforces or AtCoder URL first');
            return;
        }
        // Show progress
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Creating problem file...",
            cancellable: false
        }, async (progress) => {
            progress.report({ message: "Parsing URL..." });
            // Parse URL
            let fileName = '';
            let platform = '';
            const cfMatch = clipboard.match(/codeforces\.com\/problemset\/problem\/(\d+)\/([A-Za-z0-9]+)/);
            if (cfMatch) {
                fileName = `${cfMatch[1]}-${cfMatch[2]}.cpp`;
                platform = 'Codeforces';
            }
            else {
                const atcMatch = clipboard.match(/atcoder\.jp\/contests\/([^\/]+)\/tasks\/([^\/]+)/);
                if (atcMatch) {
                    fileName = `${atcMatch[2]}.cpp`;
                    platform = 'AtCoder';
                }
            }
            if (!fileName) {
                vscode.window.showErrorMessage('❌ Invalid URL format');
                return;
            }
            progress.report({ message: "Checking workspace..." });
            // Get workspace
            const folders = vscode.workspace.workspaceFolders;
            if (!folders) {
                vscode.window.showErrorMessage('❌ Please open a folder first (File → Open Folder)');
                return;
            }
            progress.report({ message: "Creating directory..." });
            // Create problems folder
            const problemsDir = path.join(folders[0].uri.fsPath, 'problems');
            if (!fs.existsSync(problemsDir)) {
                fs.mkdirSync(problemsDir);
            }
            const filePath = path.join(problemsDir, fileName);
            // Check if exists
            if (fs.existsSync(filePath)) {
                const doc = await vscode.workspace.openTextDocument(filePath);
                await vscode.window.showTextDocument(doc);
                vscode.window.showInformationMessage(`📂 ${fileName} already open`);
                return;
            }
            progress.report({ message: "Fetching sample tests..." });
            // Fetch samples
            let samples = '';
            try {
                samples = await fetchSamples(clipboard);
            }
            catch (error) {
                samples = '\n/* Could not fetch samples */\n';
            }
            progress.report({ message: "Generating file..." });
            // Generate content
            const template = `#include <bits/stdc++.h>
using namespace std;

#define fastio ios::sync_with_stdio(false); cin.tie(nullptr);
#define endl '\\n'

int main() {
    fastio;
    
    // Your solution here
    
    return 0;
}
`;
            const content = `// Problem: ${clipboard}
// Platform: ${platform}
// Created: ${new Date().toLocaleString()}

${template}
${samples}
`;
            fs.writeFileSync(filePath, content);
            progress.report({ message: "Opening file..." });
            const doc = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(doc);
            vscode.window.showInformationMessage(`✅ Created ${fileName}`);
        });
    }
    catch (error) {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
    }
}
async function fetchSamples(url) {
    const response = await axios_1.default.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 10000
    });
    const $ = cheerio.load(response.data);
    let samples = '\n/*\n📋 Sample Test Cases\n';
    let count = 0;
    const inputs = $('.sample-test .input pre');
    const outputs = $('.sample-test .output pre');
    inputs.each((i, elem) => {
        if (i < outputs.length) {
            count++;
            const input = $(elem).text().trim();
            const output = $(outputs[i]).text().trim();
            samples += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
            samples += `Sample ${count}:\n`;
            samples += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
            samples += `Input:\n${input}\n\n`;
            samples += `Expected Output:\n${output}\n`;
        }
    });
    if (count === 0)
        return '\n/* No samples found */\n';
    samples += `\n*/\n`;
    return samples;
}
function deactivate() { }
//# sourceMappingURL=extension.js.map