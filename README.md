# 🚀 CP Helper - Competitive Programming Automation

[![Version](https://img.shields.io/visual-studio-marketplace/v/cpautomation.cp-helper-pro)](https://marketplace.visualstudio.com/items?itemName=cpautomation.cp-helper-pro)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/cpautomation.cp-helper-pro)](https://marketplace.visualstudio.com/items?itemName=cpautomation.cp-helper-pro)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/cpautomation.cp-helper-pro)](https://marketplace.visualstudio.com/items?itemName=cpautomation.cp-helper-pro)

**One-click solution to create C++ files for Codeforces and AtCoder problems**

## ✨ Features

- 🎯 **One Click** - Create problem files instantly
- 📝 **Auto Template** - Pre-configured C++ template with fast I/O
- 🧪 **Sample Tests** - Automatically fetches sample test cases
- 📁 **Organized** - Creates `problems/` folder structure
- ⚡ **Fast Workflow** - Copy URL → Click button → Start coding!

## 🎮 How to Use

### Method 1: Toolbar Button (Easiest)
1. Copy problem URL from browser (`Ctrl+C`)
2. Click **CP Helper** button in VS Code top toolbar
3. Done! File is created and opened

### Method 2: Keyboard Shortcut
1. Copy problem URL
2. Press `Ctrl+Shift+P` → Type "CP Helper"
3. File auto-creates

### Method 3: Command Palette
1. `Ctrl+Shift+P`
2. Type "CP Helper: Create Problem"
3. Paste URL → Enter

## 📂 Generated Structure


your-workspace/
└── problems/
├── 2218-A.cpp (Codeforces)
└── abc400_a.cpp (AtCoder)



## 📝 Generated File Example

```cpp
// Problem: https://codeforces.com/problemset/problem/2218/A
// Platform: Codeforces
// Created: 2024-01-15

#include <bits/stdc++.h>
using namespace std;

#define fastio ios::sync_with_stdio(false); cin.tie(nullptr);
#define endl '\n'

int main() {
    fastio;
    
    // Your solution here
    
    return 0;
}

/* Sample test cases included automatically */