// ================================================================
// src/models/UserAuthIdentity.ts
// Stores external auth provider identities linked to local users
// ================================================================

import { Association, DataTypes, Sequelize } from 'sequelize';
import { IdBaseModel } from './base/IdBaseModel';
import { User } from './User';

export interface UserAuthIdentityAttributes {
  id: number;
  userId: number;
  provider: string;
  providerUserId: string;
  emailSnapshot?: string | null;
  creationDate: Date;
  updateDate?: Date;
}

export interface UserAuthIdentityCreationAttributes {
  userId: number;
  provider: string;
  providerUserId: string;
  emailSnapshot?: string | null;
}

export class UserAuthIdentity
  extends IdBaseModel<UserAuthIdentityAttributes, UserAuthIdentityCreationAttributes>
  implements UserAuthIdentityAttributes
{
  public userId!: number;
  public provider!: string;
  public providerUserId!: string;
  public emailSnapshot?: string | null;
  public override creationDate!: Date;
  public override updateDate?: Date;

  public user?: User;

  public static override associations: {
    user: Association<UserAuthIdentity, User>;
  };

  static override getTableName(): string {
    return 'user_auth_identities';
  }

  public static initModel(sequelize: Sequelize): typeof UserAuthIdentity {
    UserAuthIdentity.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          field: 'user_id',
          references: {
            model: 'users',
            key: 'id',
          },
        },
        provider: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            notEmpty: true,
          },
        },
        providerUserId: {
          type: DataTypes.STRING(255),
          allowNull: false,
          field: 'provider_user_id',
          validate: {
            notEmpty: true,
          },
        },
        emailSnapshot: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: 'email_snapshot',
        },
        creationDate: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'creation_date',
        },
        updateDate: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'update_date',
        },
      },
      {
        sequelize,
        modelName: 'UserAuthIdentity',
        tableName: 'user_auth_identities',
        timestamps: true,
        createdAt: 'creationDate',
        updatedAt: 'updateDate',
        indexes: [
          {
            fields: ['user_id'],
            name: 'idx_user_auth_identities_user_id',
          },
          {
            unique: true,
            fields: ['provider', 'provider_user_id'],
            name: 'idx_user_auth_identities_provider_subject_unique',
          },
          {
            unique: true,
            fields: ['user_id', 'provider'],
            name: 'idx_user_auth_identities_user_provider_unique',
          },
        ],
      }
    );

    return UserAuthIdentity;
  }
}
