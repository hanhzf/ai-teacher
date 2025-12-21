import { qwenModel } from './model';
import * as dotenv from 'dotenv';
import path from 'path';

// 加载 .env 文件
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testConnection() {
  console.log('--- Qwen Connection Test Start ---');
  
  const testPrompt = [
    { role: 'user', content: [{ type: 'text', text: '你好，请介绍一下你自己。' }] }
  ];

  try {
    console.log('Testing doGenerate...');
    const result = await qwenModel.doGenerate({
      inputFormat: 'messages',
      mode: { type: 'regular' },
      prompt: testPrompt as any,
    } as any);
    
    console.log('\n--- doGenerate Result ---');
    console.log('Response Text:', result.text);
    console.log('Finish Reason:', result.finishReason);
    console.log('Usage:', JSON.stringify(result.usage, null, 2));
    console.log('---------------------------\n');

  } catch (error) {
    console.error('\n--- doGenerate Failed ---');
    console.error(error);
    console.log('---------------------------\n');
  }

  try {
    console.log('Testing doStream...');
    const streamResult = await qwenModel.doStream({
      inputFormat: 'messages',
      mode: { type: 'regular' },
      prompt: testPrompt as any,
    } as any);

    console.log('\n--- doStream Started ---');
    const reader = streamResult.stream.getReader();
    let fullText = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      if (value.type === 'text-delta') {
        process.stdout.write(value.textDelta);
        fullText += value.textDelta;
      }
    }
    
    console.log('\n\n--- doStream Finished ---');
    console.log('Full Text Length:', fullText.length);
    console.log('---------------------------\n');

  } catch (error) {
    console.error('\n--- doStream Failed ---');
    console.error(error);
    console.log('---------------------------\n');
  }

  console.log('--- Qwen Connection Test End ---');
}

testConnection().catch(console.error);
