import { databaseService } from '../database/DatabaseService';
import { mobileHooks, MOBILE_EVENTS } from '../hooks/mobileHooks';


/**
 * ID Mapping Service (Phase 5)
 *
 * Manages mapping between temporary local IDs and server-assigned IDs.
 * Handles bidirectional lookup and foreign key resolution.
 */
export class IDMappingService {
  // In-memory cache for fast lookups
  private tempToServerMap: Map<string, number> = new Map();
  private serverToTempMap: Map<number, string> = new Map();
  private initialized = false;

  /**
   * Initialize the service by loading existing mappings from database
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const mappings = await databaseService.getAllAsync<{
        temp_id: string;
        server_id: number;
      }>('SELECT temp_id, server_id FROM id_mappings');

      for (const mapping of mappings) {
        this.tempToServerMap.set(mapping.temp_id, mapping.server_id);
        this.serverToTempMap.set(mapping.server_id, mapping.temp_id);
      }

      this.initialized = true;
      console.log(`Loaded ${mappings.length} ID mappings from database`);
    } catch (error) {
      console.error('Failed to initialize ID mapping service:', error);
      // Continue anyway - table might not exist yet
      this.initialized = true;
    }
  }

  /**
   * Register a mapping between temp ID and server ID
   */
  async registerTempId(
    tempId: string,
    serverId: number,
    resourceType: string = 'book'
  ): Promise<void> {
    await this.initialize();

    // Emit ID mapping start event
    await mobileHooks.emit(MOBILE_EVENTS.SYNC.ID_MAPPING.START, {
      tempId,
      serverId,
      resourceType,
      operation: 'register',
      timestamp: new Date().toISOString()
    });

    // Update in-memory cache
    this.tempToServerMap.set(tempId, serverId);
    this.serverToTempMap.set(serverId, tempId);

    // Persist to database
    try {
      const now = new Date().toISOString();
      await databaseService.executeQuery(
        `INSERT OR REPLACE INTO id_mappings (temp_id, server_id, resource_type, created_at)
         VALUES (?, ?, ?, ?)`,
        [tempId, serverId, resourceType, now]
      );

      console.log(`Registered ID mapping: ${tempId} → ${serverId} (${resourceType})`);
      
      // Emit ID mapping complete event
      await mobileHooks.emit(MOBILE_EVENTS.SYNC.ID_MAPPING.COMPLETE, {
        tempId,
        serverId,
        resourceType,
        operation: 'register',
        success: true,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to persist ID mapping:', error);
      
      // Emit ID mapping failed event  
      await mobileHooks.emit(MOBILE_EVENTS.SYNC.FAILED, {
        stage: 'id_mapping',
        operation: 'register',
        tempId,
        serverId,
        resourceType,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  /**
   * Get server ID for a temp ID
   */
  async getServerId(tempId: string): Promise<number | null> {
    await this.initialize();
    return this.tempToServerMap.get(tempId) ?? null;
  }

  /**
   * Get temp ID for a server ID (reverse lookup)
   */
  async getTempId(serverId: number): Promise<string | null> {
    await this.initialize();
    return this.serverToTempMap.get(serverId) ?? null;
  }

  /**
   * Resolve foreign keys in data payload before sending to server
   * Converts any temp IDs found in the data to their server IDs
   */
  async resolveForeignKeys<T>(data: T): Promise<T> {
    await this.initialize();

    // Emit ID mapping start event for resolution
    await mobileHooks.emit(MOBILE_EVENTS.SYNC.ID_MAPPING.START, {
      operation: 'resolve_foreign_keys',
      dataType: typeof data,
      timestamp: new Date().toISOString()
    });

    if (!data || typeof data !== 'object') {
      return data;
    }

    // Handle arrays
    if (Array.isArray(data)) {
      return Promise.all(data.map((item) => this.resolveForeignKeys(item))) as Promise<T>;
    }

    // Handle objects
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      // Check if this looks like a temp ID field
      if (
        typeof value === 'string' &&
        value.startsWith('temp-') &&
        (key === 'id' || key.endsWith('Id') || key.endsWith('_id'))
      ) {
        const serverId = await this.getServerId(value);
        if (serverId !== null) {
          // Replace temp ID with server ID
          resolved[key] = serverId;
          console.log(`Resolved foreign key: ${key}: ${value} → ${serverId}`);
          
          // Emit successful resolution event
          await mobileHooks.emit(MOBILE_EVENTS.SYNC.ID_MAPPING.COMPLETE, {
            operation: 'resolve_foreign_key',
            field: key,
            tempId: value,
            serverId: serverId,
            success: true,
            timestamp: new Date().toISOString()
          });
        } else {
          // Keep temp ID if no mapping exists yet
          resolved[key] = value;
          
          // Emit unresolved ID event (not necessarily an error)
          await mobileHooks.emit(MOBILE_EVENTS.SYNC.ID_MAPPING.COMPLETE, {
            operation: 'resolve_foreign_key',
            field: key,
            tempId: value,
            serverId: null,
            success: false,
            reason: 'mapping_not_found',
            timestamp: new Date().toISOString()
          });
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively resolve nested objects
        resolved[key] = await this.resolveForeignKeys(value);
      } else {
        resolved[key] = value;
      }
    }

    // Final emit for completion of full resolution process
    await mobileHooks.emit(MOBILE_EVENTS.SYNC.ID_MAPPING.COMPLETE, {
      operation: 'resolve_foreign_keys',
      dataType: typeof data,
      resolvedKeys: Object.keys(resolved).length,
      timestamp: new Date().toISOString()
    });
    
    return resolved as T;
  }

  /**
   * Clear all mappings (useful for testing)
   */
  async clearAll(): Promise<void> {
    this.tempToServerMap.clear();
    this.serverToTempMap.clear();

    try {
      await databaseService.executeQuery('DELETE FROM id_mappings');
      console.log('Cleared all ID mappings');
    } catch (error) {
      console.error('Failed to clear ID mappings:', error);
    }
  }

  /**
   * Get all mappings for debugging
   */
  async getAllMappings(): Promise<{ tempId: string; serverId: number }[]> {
    await this.initialize();

    const mappings: { tempId: string; serverId: number }[] = [];
    this.tempToServerMap.forEach((serverId, tempId) => {
      mappings.push({ tempId, serverId });
    });

    return mappings;
  }
}

// Singleton instance
export const idMappingService = new IDMappingService();
