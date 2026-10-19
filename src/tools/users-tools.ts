/**
 * GoHighLevel Users Tools
 * Tools for managing users and team members
 */

import type { GHLToolClient } from './ghl-tool-client.js';

export class UsersTools {
  constructor(private ghlClient: GHLToolClient) {}

  getToolDefinitions() {
    return [
      {
        name: 'get_users',
        description: 'Get all users/team members for a location. Returns team members with their roles and permissions.',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: {
              type: 'string',
              description: 'Location ID (uses default if not provided)'
            },
            companyId: {
              type: 'string',
              description: 'Company/Agency ID'
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of users to return (default: 25, max: 100)'
            },
            type: {
              type: 'string',
              description: 'Filter by user type'
            },
            role: {
              type: 'string',
              description: 'Filter by role (e.g., "admin", "user")'
            },
            ids: {
              type: 'string',
              description: 'Comma-separated list of user IDs to filter'
            },
            sort: {
              type: 'string',
              description: 'Sort field'
            },
            sortDirection: {
              type: 'string',
              enum: ['asc', 'desc'],
              description: 'Sort direction'
            },
            enabled2waySync: {
              type: 'boolean',
              description: 'Filter by two-way sync status'
            }
          }
        },
        _meta: {
          labels: {
            category: "users",
            access: "read",
            complexity: "simple"
          }
        }
      },
      {
        name: 'get_user',
        description: 'Get a specific user by their ID',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'The user ID to retrieve'
            },
            locationId: {
              type: 'string',
              description: 'Location ID (uses default if not provided)'
            },
          },
          required: ['userId']
        },
        _meta: {
          labels: {
            category: "users",
            access: "read",
            complexity: "simple"
          }
        }
      },
      {
        name: 'create_user',
        description: 'Create a new user/team member for a location',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: {
              type: 'string',
              description: 'Location ID (uses default if not provided)'
            },
            firstName: {
              type: 'string',
              description: 'User first name'
            },
            lastName: {
              type: 'string',
              description: 'User last name'
            },
            email: {
              type: 'string',
              description: 'User email address'
            },
            phone: {
              type: 'string',
              description: 'User phone number'
            },
            twilioPhone: {
              type: 'string',
              description: 'Twilio phone number assigned to the user'
            },
            password: {
              type: 'string',
              description: 'User password'
            },
            companyId: {
              type: 'string',
              description: 'Company/Agency ID'
            },
            locationIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Location IDs assigned to the user'
            },
            type: {
              type: 'string',
              description: 'User type (e.g., "account")'
            },
            role: {
              type: 'string',
              description: 'User role (e.g., "admin", "user")'
            },
            permissions: {
              type: 'object',
              description: 'User permissions object'
            },
            scopes: {
              type: 'array',
              items: { type: 'string' },
              description: 'OAuth scopes for the user'
            },
            scopesAssignedToOnly: {
              type: 'array',
              items: { type: 'string' },
              description: 'Scopes only assigned to this user'
            },
            profilePhoto: {
              type: 'string',
              description: 'Profile photo URL'
            },
            platformLanguage: {
              type: 'string',
              description: 'Platform language preference'
            },
          },
          required: ['firstName', 'lastName', 'email']
        },
        _meta: {
          labels: {
            category: "users",
            access: "write",
            complexity: "simple"
          }
        }
      },
      {
        name: 'update_user',
        description: 'Update an existing user/team member',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'The user ID to update'
            },
            locationId: {
              type: 'string',
              description: 'Location ID (uses default if not provided)'
            },
            firstName: {
              type: 'string',
              description: 'User first name'
            },
            lastName: {
              type: 'string',
              description: 'User last name'
            },
            email: {
              type: 'string',
              description: 'User email address'
            },
            phone: {
              type: 'string',
              description: 'User phone number'
            },
            twilioPhone: {
              type: 'string',
              description: 'Twilio phone number assigned to the user'
            },
            password: {
              type: 'string',
              description: 'User password'
            },
            companyId: {
              type: 'string',
              description: 'Company/Agency ID'
            },
            locationIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Location IDs assigned to the user'
            },
            type: {
              type: 'string',
              description: 'User type'
            },
            role: {
              type: 'string',
              description: 'User role'
            },
            permissions: {
              type: 'object',
              description: 'User permissions object'
            },
            scopes: {
              type: 'array',
              items: { type: 'string' },
              description: 'OAuth scopes for the user'
            },
            scopesAssignedToOnly: {
              type: 'array',
              items: { type: 'string' },
              description: 'Scopes only assigned to this user'
            },
            profilePhoto: {
              type: 'string',
              description: 'Profile photo URL'
            },
            platformLanguage: {
              type: 'string',
              description: 'Platform language preference'
            },
          },
          required: ['userId']
        },
        _meta: {
          labels: {
            category: "users",
            access: "write",
            complexity: "simple"
          }
        }
      },
      {
        name: 'delete_user',
        description: 'Delete a user/team member from a location',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'The user ID to delete'
            },
            locationId: {
              type: 'string',
              description: 'Location ID (uses default if not provided)'
            },
          },
          required: ['userId']
        },
        _meta: {
          labels: {
            category: "users",
            access: "delete",
            complexity: "simple"
          }
        }
      },
      {
        name: 'search_users',
        description: 'Search for users across a company/agency by email, name, or other criteria',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Company ID to search within'
            },
            query: {
              type: 'string',
              description: 'Search query string'
            },
            skip: {
              type: 'number',
              description: 'Records to skip'
            },
            limit: {
              type: 'number',
              description: 'Max records to return'
            }
          }
        }
      },
      {
        name: 'filter_users_by_email',
        description: 'Filter/look up users by email address within a location',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address to search for'
            },
            emails: {
              oneOf: [
                { type: 'array', items: { type: 'string' } },
                { type: 'string' }
              ],
              description: 'One or more email addresses. Comma-separated strings are accepted.'
            },
            companyId: {
              type: 'string',
              description: 'Company ID for the official user email filter endpoint'
            },
            deleted: {
              type: 'boolean',
              description: 'Whether to include deleted users'
            },
            locationId: {
              type: 'string',
              description: 'Location ID to filter within (uses default if not provided)'
            }
          },
          required: []
        },
        _meta: {
          labels: {
            category: "users",
            access: "read",
            complexity: "simple"
          }
        }
      }
    ];
  }

  async handleToolCall(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    const config = this.ghlClient.getConfig();
    const locationId = (args.locationId as string) || config.locationId;

    switch (toolName) {
      case 'get_users': {
        const params = new URLSearchParams();
        params.append('locationId', locationId);
        // Papyrus (19-oct): GHL exige companyId ("companyId should not be empty").
        let companyId = args.companyId ? String(args.companyId) : '';
        if (!companyId) {
          const loc: any = await this.ghlClient.makeRequest('GET', `/locations/${locationId}`);
          companyId = String(loc?.data?.location?.companyId || loc?.data?.companyId || '');
        }
        if (companyId) params.append('companyId', companyId);
        if (args.query) params.append('query', String(args.query));
        if (args.skip) params.append('skip', String(args.skip));
        if (args.limit) params.append('limit', String(args.limit));
        if (args.type) params.append('type', String(args.type));
        if (args.role) params.append('role', String(args.role));
        if (Array.isArray(args.ids)) {
          for (const id of args.ids) params.append('ids', String(id));
        } else if (args.ids) {
          params.append('ids', String(args.ids));
        }
        if (args.sort) params.append('sort', String(args.sort));
        if (args.sortDirection) params.append('sortDirection', String(args.sortDirection));
        if (args.enabled2waySync !== undefined) params.append('enabled2waySync', String(args.enabled2waySync));
        
        return this.ghlClient.makeRequest('GET', `/users/search?${params.toString()}`);
      }

      case 'get_user': {
        const userId = args.userId as string;
        return this.ghlClient.makeRequest('GET', `/users/${userId}`);
      }

      case 'create_user': {
        const body: Record<string, unknown> = {
          locationId,
          firstName: args.firstName,
          lastName: args.lastName,
          email: args.email
        };
        if (args.companyId) body.companyId = args.companyId;
        if (args.password) body.password = args.password;
        if (args.phone) body.phone = args.phone;
        if (args.twilioPhone) body.twilioPhone = args.twilioPhone;
        if (args.type) body.type = args.type;
        if (args.role) body.role = args.role;
        if (args.locationIds) body.locationIds = args.locationIds;
        if (args.permissions) body.permissions = args.permissions;
        if (args.scopes) body.scopes = args.scopes;
        if (args.scopesAssignedToOnly) body.scopesAssignedToOnly = args.scopesAssignedToOnly;
        if (args.profilePhoto) body.profilePhoto = args.profilePhoto;
        if (args.platformLanguage) body.platformLanguage = args.platformLanguage;
        
        return this.ghlClient.makeRequest('POST', `/users/`, body);
      }

      case 'update_user': {
        const userId = args.userId as string;
        const body: Record<string, unknown> = {};
        if (args.firstName) body.firstName = args.firstName;
        if (args.lastName) body.lastName = args.lastName;
        if (args.email) body.email = args.email;
        if (args.companyId) body.companyId = args.companyId;
        if (args.password) body.password = args.password;
        if (args.phone) body.phone = args.phone;
        if (args.twilioPhone) body.twilioPhone = args.twilioPhone;
        if (args.type) body.type = args.type;
        if (args.role) body.role = args.role;
        if (args.locationIds) body.locationIds = args.locationIds;
        if (args.permissions) body.permissions = args.permissions;
        if (args.scopes) body.scopes = args.scopes;
        if (args.scopesAssignedToOnly) body.scopesAssignedToOnly = args.scopesAssignedToOnly;
        if (args.profilePhoto) body.profilePhoto = args.profilePhoto;
        if (args.platformLanguage) body.platformLanguage = args.platformLanguage;
        
        return this.ghlClient.makeRequest('PUT', `/users/${userId}`, body);
      }

      case 'delete_user': {
        const userId = args.userId as string;
        return this.ghlClient.makeRequest('DELETE', `/users/${userId}`);
      }

      case 'search_users': {
        const params = new URLSearchParams();
        if (args.companyId) params.append('companyId', String(args.companyId));
        if (args.query) params.append('query', String(args.query));
        if (args.skip) params.append('skip', String(args.skip));
        if (args.limit) params.append('limit', String(args.limit));
        
        return this.ghlClient.makeRequest('GET', `/users/search?${params.toString()}`);
      }

      case 'filter_users_by_email': {
        const emails = Array.isArray(args.emails)
          ? args.emails.map(String)
          : args.emails
            ? String(args.emails).split(',').map((item) => item.trim()).filter(Boolean)
            : args.email
              ? [String(args.email)]
              : [];
        const body: Record<string, unknown> = {
          companyId: args.companyId,
          deleted: args.deleted ?? false,
          emails
        };
        if (!body.companyId) body.locationId = locationId;
        return this.ghlClient.makeRequest('POST', `/users/search/filter-by-email`, body);
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}
