export const DEFAULT_CHAT_MODEL: string = 'chat-model';

interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model',
    name: '聊天模型',
    description: '用于通用聊天的主要模型',
  },
  {
    id: 'chat-model-reasoning',
    name: '推理模型',
    description: '使用高级推理能力',
  },
  {
    id: 'doubao-model',
    name: '豆包模型',
    description: '豆包1.5 Pro 256K模型，用于高级聊天',
  },
  {
    id: 'qwen-model',
    name: '千问模型',
    description: '通义千问 Qwen-Plus 模型',
  },
];
