/**
 * GoHighLevel Reporting/Analytics Tools
 * Tools for accessing reports and analytics
 */

import { GHLApiClient } from '../clients/ghl-api-client.js';

export class ReportingTools {
  constructor(private ghlClient: GHLApiClient) {}

  getToolDefinitions() {
    return [
      // Attribution Reports
      {
        name: 'get_attribution_report',
        description: 'Get attribution/source tracking report showing where leads came from',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Location ID' },
            startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          },
          required: ['startDate', 'endDate']
        },
        _meta: {
          labels: {
            category: "analytics",
            access: "read",
            complexity: "simple"
          }
        }
      },

      // Call Reports
      {
        name: 'get_call_reports',
        description: 'Get call activity reports including call duration, outcomes, etc.',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Location ID' },
            startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
            userId: { type: 'string', description: 'Filter by user ID' },
            type: { type: 'string', enum: ['inbound', 'outbound', 'all'], description: 'Call type filter' },
          },
          required: ['startDate', 'endDate']
        },
        _meta: {
          labels: {
            category: "analytics",
            access: "read",
            complexity: "batch"
          }
        }
      },

      // Appointment Reports
      {
        name: 'get_appointment_reports',
        description: 'Get appointment activity reports',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Location ID' },
            startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
            calendarId: { type: 'string', description: 'Filter by calendar ID' },
            status: { type: 'string', enum: ['booked', 'confirmed', 'showed', 'noshow', 'cancelled'], description: 'Appointment status filter' },
          },
          required: ['startDate', 'endDate']
        },
        _meta: {
          labels: {
            category: "analytics",
            access: "read",
            complexity: "simple"
          }
        }
      },

      // Pipeline/Opportunity Reports
      {
        name: 'get_pipeline_reports',
        description: 'Get pipeline/opportunity performance reports',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Location ID' },
            pipelineId: { type: 'string', description: 'Filter by pipeline ID' },
            startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
            userId: { type: 'string', description: 'Filter by assigned user' },
          },
          required: ['startDate', 'endDate']
        },
        _meta: {
          labels: {
            category: "analytics",
            access: "read",
            complexity: "simple"
          }
        }
      },

      // Email/SMS Reports
      {
        name: 'get_email_reports',
        description: 'Get email performance reports (deliverability, opens, clicks)',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Location ID' },
            startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          },
          required: ['startDate', 'endDate']
        },
        _meta: {
          labels: {
            category: "analytics",
            access: "read",
            complexity: "simple"
          }
        }
      },
      {
        name: 'get_sms_reports',
        description: 'Get SMS performance reports',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Location ID' },
            startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          },
          required: ['startDate', 'endDate']
        },
        _meta: {
          labels: {
            category: "analytics",
            access: "read",
            complexity: "simple"
          }
        }
      },

      // Funnel Reports
      {
        name: 'get_funnel_reports',
        description: 'Get website funnel performance reports: page views, visits, opt-ins and conversion rates (cómo convierten mis funnels / visitas y conversiones).',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Location ID' },
            funnelId: { type: 'string', description: 'Filter by funnel ID' },
            startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          },
          required: ['startDate', 'endDate']
        },
        _meta: {
          labels: {
            category: "analytics",
            access: "read",
            complexity: "simple"
          }
        }
      },

      // Google/Facebook Ad Reports
      {
        name: 'get_ad_reports',
        description: 'Get advertising performance reports (Google/Facebook ads)',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Location ID' },
            platform: { type: 'string', enum: ['google', 'facebook', 'all'], description: 'Ad platform' },
            startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          },
          required: ['startDate', 'endDate']
        },
        _meta: {
          labels: {
            category: "analytics",
            access: "read",
            complexity: "simple"
          }
        }
      },

      // Agent Performance
      {
        name: 'get_agent_reports',
        description: 'Get agent/user performance reports',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Location ID' },
            userId: { type: 'string', description: 'Filter by user ID' },
            startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          },
          required: ['startDate', 'endDate']
        },
        _meta: {
          labels: {
            category: "analytics",
            access: "read",
            complexity: "simple"
          }
        }
      },

      // Dashboard Stats
      {
        name: 'get_dashboard_stats',
        description: 'Get main dashboard statistics overview',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Location ID' },
            dateRange: { type: 'string', enum: ['today', 'yesterday', 'last7days', 'last30days', 'thisMonth', 'lastMonth', 'custom'], description: 'Date range preset' },
            startDate: { type: 'string', description: 'Start date for custom range' },
            endDate: { type: 'string', description: 'End date for custom range' }
          }
        },
        _meta: {
          labels: {
            category: "analytics",
            access: "read",
            complexity: "simple"
          }
        }
      },

      // Conversion Reports
      {
        name: 'get_conversion_reports',
        description: 'Get conversion tracking reports',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Location ID' },
            startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
            source: { type: 'string', description: 'Filter by source' },
          },
          required: ['startDate', 'endDate']
        },
        _meta: {
          labels: {
            category: "analytics",
            access: "read",
            complexity: "simple"
          }
        }
      },

      // Revenue Reports
      {
        name: 'get_revenue_reports',
        description: 'Get revenue/payment reports',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: { type: 'string', description: 'Location ID' },
            startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
            groupBy: { type: 'string', enum: ['day', 'week', 'month'], description: 'Group results by' },
          },
          required: ['startDate', 'endDate']
        },
        _meta: {
          labels: {
            category: "analytics",
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
      case 'get_attribution_report': {
        const params = new URLSearchParams();
        params.append('locationId', locationId);
        params.append('startDate', String(args.startDate));
        params.append('endDate', String(args.endDate));
        return this.ghlClient.makeRequest('GET', `/reporting/attribution?${params.toString()}`);
      }
      case 'get_call_reports': {
        const params = new URLSearchParams();
        params.append('locationId', locationId);
        params.append('startDate', String(args.startDate));
        params.append('endDate', String(args.endDate));
        if (args.userId) params.append('userId', String(args.userId));
        if (args.type) params.append('type', String(args.type));
        return this.ghlClient.makeRequest('GET', `/reporting/calls?${params.toString()}`);
      }
      case 'get_appointment_reports': {
        const params = new URLSearchParams();
        params.append('locationId', locationId);
        params.append('startDate', String(args.startDate));
        params.append('endDate', String(args.endDate));
        if (args.calendarId) params.append('calendarId', String(args.calendarId));
        if (args.status) params.append('status', String(args.status));
        return this.ghlClient.makeRequest('GET', `/reporting/appointments?${params.toString()}`);
      }
      case 'get_pipeline_reports': {
        const params = new URLSearchParams();
        params.append('locationId', locationId);
        params.append('startDate', String(args.startDate));
        params.append('endDate', String(args.endDate));
        if (args.pipelineId) params.append('pipelineId', String(args.pipelineId));
        if (args.userId) params.append('userId', String(args.userId));
        return this.ghlClient.makeRequest('GET', `/reporting/pipelines?${params.toString()}`);
      }
      case 'get_email_reports': {
        const params = new URLSearchParams();
        params.append('locationId', locationId);
        params.append('startDate', String(args.startDate));
        params.append('endDate', String(args.endDate));
        return this.ghlClient.makeRequest('GET', `/reporting/emails?${params.toString()}`);
      }
      case 'get_sms_reports': {
        const params = new URLSearchParams();
        params.append('locationId', locationId);
        params.append('startDate', String(args.startDate));
        params.append('endDate', String(args.endDate));
        return this.ghlClient.makeRequest('GET', `/reporting/sms?${params.toString()}`);
      }
      case 'get_funnel_reports': {
        const params = new URLSearchParams();
        params.append('locationId', locationId);
        params.append('startDate', String(args.startDate));
        params.append('endDate', String(args.endDate));
        if (args.funnelId) params.append('funnelId', String(args.funnelId));
        return this.ghlClient.makeRequest('GET', `/reporting/funnels?${params.toString()}`);
      }
      case 'get_ad_reports': {
        const params = new URLSearchParams();
        params.append('locationId', locationId);
        params.append('startDate', String(args.startDate));
        params.append('endDate', String(args.endDate));
        if (args.platform) params.append('platform', String(args.platform));
        return this.ghlClient.makeRequest('GET', `/reporting/ads?${params.toString()}`);
      }
      case 'get_agent_reports': {
        const params = new URLSearchParams();
        params.append('locationId', locationId);
        params.append('startDate', String(args.startDate));
        params.append('endDate', String(args.endDate));
        if (args.userId) params.append('userId', String(args.userId));
        return this.ghlClient.makeRequest('GET', `/reporting/agents?${params.toString()}`);
      }
      case 'get_dashboard_stats': {
        const params = new URLSearchParams();
        params.append('locationId', locationId);
        if (args.dateRange) params.append('dateRange', String(args.dateRange));
        if (args.startDate) params.append('startDate', String(args.startDate));
        if (args.endDate) params.append('endDate', String(args.endDate));
        return this.ghlClient.makeRequest('GET', `/reporting/dashboard?${params.toString()}`);
      }
      case 'get_conversion_reports': {
        const params = new URLSearchParams();
        params.append('locationId', locationId);
        params.append('startDate', String(args.startDate));
        params.append('endDate', String(args.endDate));
        if (args.source) params.append('source', String(args.source));
        return this.ghlClient.makeRequest('GET', `/reporting/conversions?${params.toString()}`);
      }
      case 'get_revenue_reports': {
        const params = new URLSearchParams();
        params.append('locationId', locationId);
        params.append('startDate', String(args.startDate));
        params.append('endDate', String(args.endDate));
        if (args.groupBy) params.append('groupBy', String(args.groupBy));
        return this.ghlClient.makeRequest('GET', `/reporting/revenue?${params.toString()}`);
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}
