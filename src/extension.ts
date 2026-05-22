import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';

export function activate(context: vscode.ExtensionContext) {
    console.log('CP Helper Activated - Multi Platform Support');

    // Top toolbar button
    const toolbarButton = vscode.commands.registerCommand('cp-helper.toolbar', () => {
        createProblem();
    });

    // Command palette
    const commandPalette = vscode.commands.registerCommand('cp-helper.create', () => {
        createProblem();
    });

    // Status bar button
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBar.text = "$(rocket) CP Helper";
    statusBar.tooltip = "Create problem from clipboard URL";
    statusBar.command = "cp-helper.toolbar";
    statusBar.show();

    context.subscriptions.push(toolbarButton, commandPalette, statusBar);
}

// 🎯 URL Parser - সব প্ল্যাটফর্মের জন্য
function parseURL(url: string): { fileName: string; platform: string; success: boolean } {

    // 1. Codeforces
    let match = url.match(/codeforces\.com\/problemset\/problem\/(\d+)\/([A-Za-z0-9]+)/);
    if (match) {
        return {
            fileName: `${match[1]}-${match[2]}.cpp`,
            platform: 'Codeforces',
            success: true
        };
    }

    // 2. LightOJ
    match = url.match(/lightoj\.com\/problem\/([a-zA-Z0-9\-]+)/);
    if (match) {
        let problemId = match[1].toUpperCase();
        return {
            fileName: `LOJ-${problemId}.cpp`,
            platform: 'LightOJ',
            success: true
        };
    }

    // 3. LeetCode
    match = url.match(/leetcode\.com\/problems\/([a-zA-Z0-9\-]+)/);
    if (match) {
        let problemName = match[1].replace(/-/g, '_');
        return {
            fileName: `LeetCode-${problemName}.cpp`,
            platform: 'LeetCode',
            success: true
        };
    }

    // 4. HackerRank
    match = url.match(/hackerrank\.com\/contests\/([^\/]+)\/challenges\/([^\/]+)/);
    if (match) {
        let contest = match[1];
        let challenge = match[2];
        return {
            fileName: `HackerRank-${contest}-${challenge}.cpp`,
            platform: 'HackerRank',
            success: true
        };
    }

    // 5. Virtual Judge (Contest)
    match = url.match(/vjudge\.net\/contest\/(\d+)#problem\/([A-Z])/);
    if (match) {
        let contestId = match[1];
        let problemLetter = match[2];
        return {
            fileName: `VJudge-${contestId}-${problemLetter}.cpp`,
            platform: 'Virtual Judge',
            success: true
        };
    }

    // 6. Virtual Judge (Direct Problem)
    match = url.match(/vjudge\.net\/problem\/([A-Za-z0-9\-]+)/);
    if (match) {
        let problemId = match[1];
        return {
            fileName: `VJudge-${problemId}.cpp`,
            platform: 'Virtual Judge',
            success: true
        };
    }

    // 7. AtCoder
    match = url.match(/atcoder\.jp\/contests\/([^\/]+)\/tasks\/([^\/]+)/);
    if (match) {
        return {
            fileName: `${match[2]}.cpp`,
            platform: 'AtCoder',
            success: true
        };
    }

    // 8. Universal/Demo Pattern (sitename-problemId)
    match = url.match(/:\/\/([^\/]+)\/.*?\/([a-zA-Z0-9\-_]+)/);
    if (match) {
        let sitename = match[1].replace(/\./g, '-');
        let problemId = match[2];
        return {
            fileName: `${sitename}-${problemId}.cpp`,
            platform: sitename.toUpperCase(),
            success: true
        };
    }

    return { fileName: '', platform: '', success: false };
}

// 🎨 Platform-specific template generator
function getPlatformTemplate(platform: string, url: string): string {
    let baseTemplate = `#include <bits/stdc++.h>
using namespace std;

#define fastio ios::sync_with_stdio(false); cin.tie(nullptr);
#define endl '\\n'

int main() {
    fastio;
    
    // Your solution here
    
    return 0;
}
`;

    // Platform-specific hints
    let hint = '';
    switch (platform) {
        case 'LeetCode':
            hint = `
// LeetCode Note:
// The function signature may vary. Adjust accordingly.
// Example: vector<int> twoSum(vector<int>& nums, int target)
`;
            break;
        case 'LightOJ':
            hint = `
// LightOJ Note:
// Input: T test cases
// Output: Case X: result
`;
            break;
        case 'HackerRank':
            hint = `
// HackerRank Note:
// Read from stdin, write to stdout
`;
            break;
        case 'Virtual Judge':
            hint = `
// Virtual Judge Note:
// Standard I/O. Pay attention to time limits.
`;
            break;
    }

    return hint + baseTemplate;
}

async function createProblem() {
    try {
        // Get URL from clipboard
        const clipboard = await vscode.env.clipboard.readText();

        if (!clipboard.startsWith('http')) {
            vscode.window.showErrorMessage('❌ Copy a problem URL first (Ctrl+C)');
            return;
        }

        // Parse URL
        const parsed = parseURL(clipboard);
        if (!parsed.success) {
            vscode.window.showErrorMessage(`❌ Unsupported platform: ${clipboard}\n\nSupported: Codeforces, AtCoder, LightOJ, LeetCode, HackerRank, VJudge`);
            return;
        }

        // Show progress
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Creating ${parsed.fileName}...`,
            cancellable: false
        }, async (progress) => {

            // Get workspace
            const folders = vscode.workspace.workspaceFolders;
            if (!folders) {
                vscode.window.showErrorMessage('❌ Please open a folder first (File → Open Folder)');
                return;
            }

            progress.report({ message: "Creating directory..." });
            const problemsDir = path.join(folders[0].uri.fsPath, 'problems');
            if (!fs.existsSync(problemsDir)) {
                fs.mkdirSync(problemsDir);
            }

            const filePath = path.join(problemsDir, parsed.fileName);

            // Check if exists
            if (fs.existsSync(filePath)) {
                const doc = await vscode.workspace.openTextDocument(filePath);
                await vscode.window.showTextDocument(doc);
                vscode.window.showInformationMessage(`📂 ${parsed.fileName} already open`);
                return;
            }

            progress.report({ message: "Fetching problem info..." });

            // Try to fetch samples (only for supported platforms)
            let samples = '';
            if (parsed.platform === 'Codeforces' || parsed.platform === 'AtCoder') {
                try {
                    samples = await fetchSamples(clipboard, parsed.platform);
                } catch (error) {
                    samples = '\n/* Could not fetch samples */\n';
                }
            } else {
                samples = '\n/* Manual testing required */\n';
            }

            progress.report({ message: "Generating file..." });

            const template = getPlatformTemplate(parsed.platform, clipboard);

            const content = `// Problem: ${clipboard}
// Platform: ${parsed.platform}
// Created: ${new Date().toLocaleString()}

${template}
${samples}
`;

            fs.writeFileSync(filePath, content);

            progress.report({ message: "Opening file..." });
            const doc = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(doc);

            vscode.window.showInformationMessage(`✅ Created ${parsed.fileName} on ${parsed.platform}`);
        });

    } catch (error: any) {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
    }
}

async function fetchSamples(url: string, platform: string): Promise<string> {
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
        });
        const $ = cheerio.load(response.data);

        let samples = '\n/*\n📋 Sample Test Cases\n';
        let count = 0;

        if (platform === 'Codeforces') {
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
        }

        if (count === 0) {
            return '\n/* No sample test cases found */\n';
        }

        samples += `\n*/\n`;
        return samples;

    } catch (error) {
        return '\n/* Could not fetch samples */\n';
    }
}

export function deactivate() { }