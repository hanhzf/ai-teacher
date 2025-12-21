#!/bin/bash

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../../.." && pwd )"

echo "Starting Qwen Connection Test..."
echo "Project Root: $PROJECT_ROOT"

# 切换到项目根目录执行，确保 tsx 能正确处理路径和配置
cd "$PROJECT_ROOT"

# 使用 npx tsx 执行测试脚本
npx tsx lib/ai/qwen-agent/test-connection.ts
