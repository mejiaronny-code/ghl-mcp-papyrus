import { GHLApiClient } from '../clients/ghl-api-client.js';
import {
  MCPGetMediaFilesParams,
  MCPUploadMediaFileParams,
  MCPDeleteMediaParams,
  GHLGetMediaFilesRequest,
  GHLUploadMediaFileRequest,
  GHLDeleteMediaRequest
} from '../types/ghl-types.js';

export interface Tool {
  name: string;
  description: string;
  _meta?: Record<string, any>;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

/**
 * MediaTools class for GoHighLevel Media Library API endpoints
 * Handles file management operations including listing, uploading, and deleting files/folders
 */
export class MediaTools {
  constructor(private ghlClient: GHLApiClient) {}

  /**
   * Get all available Media Library tool definitions
   */
  getToolDefinitions(): Tool[] {
    return [
      {
        name: 'get_media_files',
        description: 'Get list of files and folders from the media library with filtering and search capabilities',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { 
              type: 'number', 
              description: 'Number of files to skip in listing',
              minimum: 0
            },
            limit: { 
              type: 'number', 
              description: 'Number of files to show in the listing (max 100)',
              minimum: 1,
              maximum: 100
            },
            sortBy: { 
              type: 'string', 
              description: 'Field to sort the file listing by (e.g., createdAt, name, size)',
              default: 'createdAt'
            },
            sortOrder: { 
              type: 'string', 
              description: 'Direction to sort files (asc or desc)',
              enum: ['asc', 'desc'],
              default: 'desc'
            },
            type: { 
              type: 'string', 
              description: 'Filter by type (file or folder)',
              enum: ['file', 'folder']
            },
            query: { 
              type: 'string', 
              description: 'Search query text to filter files by name'
            },
            altType: { 
              type: 'string', 
              description: 'Context type (location or agency)',
              enum: ['location', 'agency'],
              default: 'location'
            },
            altId: { 
              type: 'string', 
              description: 'Location or Agency ID (uses default location if not provided)'
            },
            parentId: { 
              type: 'string', 
              description: 'Parent folder ID to list files within a specific folder'
            },
          },
          required: []
        },
        _meta: {
          labels: {
            category: "media",
            access: "read",
            complexity: "simple"
          }
        }
      },
      {
        name: 'upload_media_file',
        description: 'Upload a file to the media library or add a hosted file URL (max 25MB for direct uploads)',
        inputSchema: {
          type: 'object',
          properties: {
            file: { 
              type: 'string', 
              description: 'File data (binary) for direct upload'
            },
            hosted: { 
              type: 'boolean', 
              description: 'Set to true if providing a fileUrl instead of direct file upload',
              default: false
            },
            fileUrl: { 
              type: 'string', 
              description: 'URL of hosted file (required if hosted=true)'
            },
            name: { 
              type: 'string', 
              description: 'Custom name for the uploaded file'
            },
            parentId: { 
              type: 'string', 
              description: 'Parent folder ID to upload file into'
            },
            altType: { 
              type: 'string', 
              description: 'Context type (location or agency)',
              enum: ['location', 'agency'],
              default: 'location'
            },
            altId: { 
              type: 'string', 
              description: 'Location or Agency ID (uses default location if not provided)'
            },
          },
          required: []
        },
        _meta: {
          labels: {
            category: "media",
            access: "write",
            complexity: "simple"
          }
        }
      },
      {
        name: 'delete_media_file',
        description: 'Delete a specific file or folder from the media library',
        inputSchema: {
          type: 'object',
          properties: {
            id: { 
              type: 'string', 
              description: 'ID of the file or folder to delete'
            },
            altType: { 
              type: 'string', 
              description: 'Context type (location or agency)',
              enum: ['location', 'agency'],
              default: 'location'
            },
            altId: { 
              type: 'string', 
              description: 'Location or Agency ID (uses default location if not provided)'
            },
          },
          required: ['id']
        },
        _meta: {
          labels: {
            category: "media",
            access: "delete",
            complexity: "simple"
          }
        }
      },
      {
        name: 'create_media_folder',
        description: 'Create a new folder in the media library',
        _meta: {
          labels: { category: 'media', access: 'write', complexity: 'simple' }
        },
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the folder to create'
            },
            altType: {
              type: 'string',
              description: 'Context type (location or agency)',
              enum: ['location', 'agency'],
              default: 'location'
            },
            altId: {
              type: 'string',
              description: 'Location or Agency ID (uses default location if not provided)'
            },
            parentId: {
              type: 'string',
              description: 'Parent folder ID to create the folder inside'
            }
          },
          required: ['name']
        }
      },
      {
        name: 'bulk_update_media_files',
        description: 'Move multiple media files to a different folder in bulk',
        _meta: {
          labels: { category: 'media', access: 'write', complexity: 'moderate' }
        },
        inputSchema: {
          type: 'object',
          properties: {
            fileIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of file IDs to move'
            },
            altType: {
              type: 'string',
              description: 'Context type (location or agency)',
              enum: ['location', 'agency'],
              default: 'location'
            },
            altId: {
              type: 'string',
              description: 'Location or Agency ID (uses default location if not provided)'
            },
            parentId: {
              type: 'string',
              description: 'Destination parent folder ID'
            }
          },
          required: ['fileIds']
        }
      },
      {
        name: 'bulk_delete_media_files',
        description: 'Delete multiple media files in bulk',
        _meta: {
          labels: { category: 'media', access: 'delete', complexity: 'moderate' }
        },
        inputSchema: {
          type: 'object',
          properties: {
            fileIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of file IDs to delete'
            },
            altType: {
              type: 'string',
              description: 'Context type (location or agency)',
              enum: ['location', 'agency'],
              default: 'location'
            },
            altId: {
              type: 'string',
              description: 'Location or Agency ID (uses default location if not provided)'
            }
          },
          required: ['fileIds']
        }
      },
      {
        name: 'update_media_file',
        description: 'Update metadata (name, parent folder) of an existing media file',
        _meta: {
          labels: { category: 'media', access: 'write', complexity: 'simple' }
        },
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'ID of the file to update'
            },
            altType: {
              type: 'string',
              description: 'Context type (location or agency)',
              enum: ['location', 'agency'],
              default: 'location'
            },
            altId: {
              type: 'string',
              description: 'Location or Agency ID (uses default location if not provided)'
            },
            name: {
              type: 'string',
              description: 'New name for the file'
            },
            parentId: {
              type: 'string',
              description: 'New parent folder ID to move the file into'
            }
          },
          required: ['id']
        }
      }
    ];
  }

  /**
   * Execute a media tool by name with given arguments
   */
  async executeTool(name: string, args: any): Promise<any> {
    switch (name) {
      case 'get_media_files':
        return this.getMediaFiles(args as MCPGetMediaFilesParams);
      
      case 'upload_media_file':
        return this.uploadMediaFile(args as MCPUploadMediaFileParams);
      
      case 'delete_media_file':
        return this.deleteMediaFile(args as MCPDeleteMediaParams);
      
      case 'create_media_folder':
        return this.createMediaFolder(args);
      
      case 'bulk_update_media_files':
        return this.bulkUpdateMediaFiles(args);
      
      case 'bulk_delete_media_files':
        return this.bulkDeleteMediaFiles(args);
      
      case 'update_media_file':
        return this.updateMediaFile(args);
      
      default:
        throw new Error(`Unknown media tool: ${name}`);
    }
  }

  /**
   * GET MEDIA FILES
   */
  private async getMediaFiles(params: MCPGetMediaFilesParams = {}): Promise<{ success: boolean; files: any[]; total?: number; message: string }> {
    try {
      const requestParams: GHLGetMediaFilesRequest = {
        sortBy: params.sortBy || 'createdAt',
        sortOrder: params.sortOrder || 'desc',
        altType: params.altType || 'location',
        altId: params.altId || this.ghlClient.getConfig().locationId,
        ...(params.offset !== undefined && { offset: params.offset }),
        ...(params.limit !== undefined && { limit: params.limit }),
        type: params.type || 'file', // Papyrus (19-oct): GHL exige type
        ...(params.query && { query: params.query }),
        ...(params.parentId && { parentId: params.parentId })
      };

      const response = await this.ghlClient.getMediaFiles(requestParams);
      
      if (!response.success || !response.data) {
        const errorMsg = response.error?.message || 'Unknown API error';
        throw new Error(`API request failed: ${errorMsg}`);
      }

      const files = Array.isArray(response.data.files) ? response.data.files : [];
      
      return {
        success: true,
        files,
        total: response.data.total,
        message: `Retrieved ${files.length} media files/folders`
      };
    } catch (error) {
      throw new Error(`Failed to get media files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * UPLOAD MEDIA FILE
   */
  private async uploadMediaFile(params: MCPUploadMediaFileParams): Promise<{ success: boolean; fileId: string; url?: string; message: string }> {
    try {
      // Validate upload parameters
      if (params.hosted && !params.fileUrl) {
        throw new Error('fileUrl is required when hosted=true');
      }
      if (!params.hosted && !params.file) {
        throw new Error('file is required when hosted=false or not specified');
      }

      const uploadData: GHLUploadMediaFileRequest = {
        altType: params.altType || 'location',
        altId: params.altId || this.ghlClient.getConfig().locationId,
        ...(params.hosted !== undefined && { hosted: params.hosted }),
        ...(params.fileUrl && { fileUrl: params.fileUrl }),
        ...(params.file && { file: params.file }),
        ...(params.name && { name: params.name }),
        ...(params.parentId && { parentId: params.parentId })
      };

      const response = await this.ghlClient.uploadMediaFile(uploadData);
      
      if (!response.success || !response.data) {
        const errorMsg = response.error?.message || 'Unknown API error';
        throw new Error(`API request failed: ${errorMsg}`);
      }
      
      return {
        success: true,
        fileId: response.data.fileId,
        url: response.data.url,
        message: `File uploaded successfully with ID: ${response.data.fileId}`
      };
    } catch (error) {
      throw new Error(`Failed to upload media file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * DELETE MEDIA FILE
   */
  private async deleteMediaFile(params: MCPDeleteMediaParams): Promise<{ success: boolean; message: string }> {
    try {
      const deleteParams: GHLDeleteMediaRequest = {
        id: params.id,
        altType: params.altType || 'location',
        altId: params.altId || this.ghlClient.getConfig().locationId
      };

      const response = await this.ghlClient.deleteMediaFile(deleteParams);
      
      if (!response.success) {
        const errorMsg = response.error?.message || 'Unknown API error';
        throw new Error(`API request failed: ${errorMsg}`);
      }
      
      return {
        success: true,
        message: `Media file/folder deleted successfully`
      };
    } catch (error) {
      throw new Error(`Failed to delete media file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * CREATE MEDIA FOLDER
   */
  private async createMediaFolder(params: { name: string; altType?: string; altId?: string; parentId?: string }): Promise<{ success: boolean; folder: any; message: string }> {
    try {
      const body: Record<string, unknown> = {
        name: params.name,
        altType: params.altType || 'location',
        altId: params.altId || this.ghlClient.getConfig().locationId
      };
      if (params.parentId) body.parentId = params.parentId;

      const response = await this.ghlClient.makeRequest('POST', '/medias/folder', body);

      if (!response.success || !response.data) {
        const errorMsg = response.error?.message || 'Unknown API error';
        throw new Error(`API request failed: ${errorMsg}`);
      }

      return {
        success: true,
        folder: response.data,
        message: `Folder "${params.name}" created successfully`
      };
    } catch (error) {
      throw new Error(`Failed to create media folder: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * BULK UPDATE MEDIA FILES
   */
  private async bulkUpdateMediaFiles(params: { fileIds: string[]; altType?: string; altId?: string; parentId?: string }): Promise<{ success: boolean; message: string }> {
    try {
      const body: Record<string, unknown> = {
        fileIds: params.fileIds,
        altType: params.altType || 'location',
        altId: params.altId || this.ghlClient.getConfig().locationId
      };
      if (params.parentId) body.parentId = params.parentId;

      const response = await this.ghlClient.makeRequest('PUT', '/medias/update-files', body);

      if (!response.success) {
        const errorMsg = response.error?.message || 'Unknown API error';
        throw new Error(`API request failed: ${errorMsg}`);
      }

      return {
        success: true,
        message: `${params.fileIds.length} media file(s) updated successfully`
      };
    } catch (error) {
      throw new Error(`Failed to bulk update media files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * BULK DELETE MEDIA FILES
   */
  private async bulkDeleteMediaFiles(params: { fileIds: string[]; altType?: string; altId?: string }): Promise<{ success: boolean; message: string }> {
    try {
      const body: Record<string, unknown> = {
        fileIds: params.fileIds,
        altType: params.altType || 'location',
        altId: params.altId || this.ghlClient.getConfig().locationId
      };

      const response = await this.ghlClient.makeRequest('PUT', '/medias/delete-files', body);

      if (!response.success) {
        const errorMsg = response.error?.message || 'Unknown API error';
        throw new Error(`API request failed: ${errorMsg}`);
      }

      return {
        success: true,
        message: `${params.fileIds.length} media file(s) deleted successfully`
      };
    } catch (error) {
      throw new Error(`Failed to bulk delete media files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * UPDATE MEDIA FILE
   */
  private async updateMediaFile(params: { id: string; altType?: string; altId?: string; name?: string; parentId?: string }): Promise<{ success: boolean; file: any; message: string }> {
    try {
      const body: Record<string, unknown> = {
        altType: params.altType || 'location',
        altId: params.altId || this.ghlClient.getConfig().locationId
      };
      if (params.name) body.name = params.name;
      if (params.parentId) body.parentId = params.parentId;

      const response = await this.ghlClient.makeRequest('POST', `/medias/${params.id}`, body);

      if (!response.success || !response.data) {
        const errorMsg = response.error?.message || 'Unknown API error';
        throw new Error(`API request failed: ${errorMsg}`);
      }

      return {
        success: true,
        file: response.data,
        message: `Media file ${params.id} updated successfully`
      };
    } catch (error) {
      throw new Error(`Failed to update media file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 