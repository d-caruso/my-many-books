// ================================================================
// src/models/MobileAnalyticsEvent.ts
// Mobile analytics event storage model
// ================================================================

import { DataTypes, Model, Optional, Sequelize } from 'sequelize';
import {
  MOBILE_ANALYTICS_PROCESSING_STATUS,
  MOBILE_ANALYTICS_PROCESSING_STATUSES,
  type MobileAnalyticsProcessingStatus,
} from '@my-many-books/shared-types';
import { TABLE_NAMES, FIELD_NAMES } from '../utils/constants';

export interface MobileAnalyticsEventAttributes {
  id: number;
  eventId: string;
  eventType: string;
  userId?: string;
  timestamp: Date;
  data: object;
  appVersion?: string;
  deviceInfo?: object;
  processingStatus: MobileAnalyticsProcessingStatus;
  processingError?: string | null;
  creationDate: Date;
  updateDate: Date;
}

export type MobileAnalyticsEventCreationAttributes = Optional<
  MobileAnalyticsEventAttributes, 
  'id' | 'creationDate' | 'updateDate' | 'processingStatus'
>;

export class MobileAnalyticsEvent extends Model<
  MobileAnalyticsEventAttributes,
  MobileAnalyticsEventCreationAttributes
> implements MobileAnalyticsEventAttributes {
  public id!: number;
  public eventId!: string;
  public eventType!: string;
  public userId?: string;
  public timestamp!: Date;
  public data!: object;
  public appVersion?: string;
  public deviceInfo?: object;
  public processingStatus!: MobileAnalyticsProcessingStatus;
  public processingError?: string | null;
  public creationDate!: Date;
  public updateDate!: Date;

  public static initModel(sequelize: Sequelize): typeof MobileAnalyticsEvent {
    MobileAnalyticsEvent.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        eventId: {
          type: DataTypes.STRING(100),
          allowNull: false,
          unique: true,
          field: 'event_id',
        },
        eventType: {
          type: DataTypes.STRING(200),
          allowNull: false,
          field: 'event_type',
        },
        userId: {
          type: DataTypes.STRING(50),
          allowNull: true,
          field: 'user_id',
        },
        timestamp: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        data: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: {},
        },
        appVersion: {
          type: DataTypes.STRING(50),
          allowNull: true,
          field: 'app_version',
        },
        deviceInfo: {
          type: DataTypes.JSON,
          allowNull: true,
          field: 'device_info',
        },
        processingStatus: {
          type: DataTypes.ENUM(...MOBILE_ANALYTICS_PROCESSING_STATUSES),
          allowNull: false,
          defaultValue: MOBILE_ANALYTICS_PROCESSING_STATUS.PENDING,
          field: 'processing_status',
        },
        processingError: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: 'processing_error',
        },
        creationDate: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: FIELD_NAMES.CREATION_DATE,
        },
        updateDate: {
          type: DataTypes.DATE,
          allowNull: false,
          field: FIELD_NAMES.UPDATE_DATE,
        },
      },
      {
        sequelize,
        modelName: 'MobileAnalyticsEvent',
        tableName: TABLE_NAMES.MOBILE_ANALYTICS_EVENTS,
        timestamps: true,
        underscored: true,
        createdAt: FIELD_NAMES.CREATION_DATE,
        updatedAt: FIELD_NAMES.UPDATE_DATE,
        indexes: [
          {
            fields: ['event_type'],
          },
          {
            fields: ['user_id'],
          },
          {
            fields: ['timestamp'],
          },
          {
            fields: ['processing_status'],
          },
          {
            fields: [FIELD_NAMES.CREATION_DATE],
          },
        ],
      }
    );

    return MobileAnalyticsEvent;
  }
}

export default MobileAnalyticsEvent;
