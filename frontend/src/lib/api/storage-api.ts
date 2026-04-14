// src/lib/api/storage-api.ts
import { api } from '@/lib/fetch';

export const storageApi = {
  async uploadFile(file: File, workspaceId: string): Promise<{
    id: string;
    name: string;
    url: string;
    mime_type: string;
    size: string;
    storage_path: string;
    uploaded_by: string;
    workspace_id: string;
    created_at: string;
  }> {
    const formData = new FormData();
    formData.append('file', file, file.name);  // Include filename explicitly
    formData.append('workspace_id', workspaceId);
    
    console.log('Uploading file:', file.name, 'size:', file.size, 'type:', file.type, 'to workspace:', workspaceId);
    
    // Check FormData contents
    for (const [key, value] of formData.entries()) {
      console.log('FormData entry:', key, value);
    }
    
    // Don't set Content-Type header - let browser set it with boundary
    try {
      const response = await api.post<{
        id: string;
        name: string;
        url: string;
        mime_type: string;
        size: string;
        storage_path: string;
        uploaded_by: string;
        workspace_id: string;
        created_at: string;
      }>('/storage/upload', formData);
      console.log('Upload response:', response);
      return response;
    } catch (error) {
      console.error('Upload error details:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
      throw error;
    }
  }
};