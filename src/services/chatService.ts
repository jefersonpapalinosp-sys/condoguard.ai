import { notifyApiFallback, setModuleDataSource } from './apiStatus';
import { requestJson } from './http';
import { getChatData, sendChatMessage, type ChatData, type ChatMessage } from './mockApi';

const MODULE_NAME = 'chat';

export async function fetchChatBootstrap(): Promise<ChatData> {
  try {
    const response = await requestJson<ChatData>('/api/chat/bootstrap');
    setModuleDataSource(MODULE_NAME, 'api');
    return response;
  } catch {
    setModuleDataSource(MODULE_NAME, 'mock');
    notifyApiFallback({ module: 'Chat', message: 'API indisponivel' });
    return getChatData();
  }
}

export async function postChatMessage(message: string): Promise<ChatMessage> {
  try {
    const response = await requestJson<ChatMessage>('/api/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
    setModuleDataSource(MODULE_NAME, 'api');
    return response;
  } catch {
    setModuleDataSource(MODULE_NAME, 'mock');
    notifyApiFallback({ module: 'Chat', message: 'API indisponivel' });
    return sendChatMessage(message);
  }
}
