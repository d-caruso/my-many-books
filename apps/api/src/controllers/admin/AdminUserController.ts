// ================================================================
// src/controllers/admin/AdminUserController.ts
// Admin user management controller
// ================================================================

import Joi from 'joi';
import { Op, Sequelize, WhereOptions } from 'sequelize';
import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { User } from '../../models/User';
import { UserAttributes } from '../../models/interfaces/ModelInterfaces';

/**
 * Validation schemas
 */
interface UpdateUserData {
  name?: string;
  surname?: string;
  email?: string;
  isActive?: boolean;
  role?: 'user' | 'admin';
}

const updateUserSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  surname: Joi.string().min(1).max(100).optional(),
  email: Joi.string().email().max(255).optional(),
  isActive: Joi.boolean().optional(),
  role: Joi.string().valid('user', 'admin').optional(),
});

/**
 * Controller for admin user management.
 * All endpoints require admin authentication (enforced by adminRoutes middleware).
 */
export class AdminUserController extends BaseController {
  /**
   * Get paginated list of all users
   * GET /api/v1/admin/users
   * Query params: page, limit, search (email/name)
   */
  async getAllUsers(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    try {
      const { page, limit, offset } = this.getPaginationParams(request);
      const search = this.getQueryParameter(request, 'search');

      // Build where clause for search
<<<<<<< Updated upstream
      const whereClause: WhereOptions<UserAttributes> = {};
=======
<<<<<<< Updated upstream
      const whereClause: any = {};
=======
      let whereClause: WhereOptions<UserAttributes> = {};
>>>>>>> Stashed changes
>>>>>>> Stashed changes
      if (search) {
        whereClause = {
          [Op.or]: [
            { email: { [Op.like]: `%${search}%` } },
            { name: { [Op.like]: `%${search}%` } },
            { surname: { [Op.like]: `%${search}%` } },
            Sequelize.where(
              Sequelize.fn('concat', Sequelize.col('name'), ' ', Sequelize.col('surname')),
              {
                [Op.like]: `%${search}%`,
              }
            ),
          ],
        };
      }

      const { count, rows: users } = await User.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['creationDate', 'DESC']],
        attributes: [
          'id',
          'email',
          'name',
          'surname',
          'isActive',
          'role',
          'creationDate',
          'updateDate',
        ],
      });

      const userData = users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        fullName: user.getFullName(),
        isActive: user.isActive,
        role: user.role,
        createdAt: user.creationDate,
        updatedAt: user.updateDate,
      }));

      return this.createSuccessResponse(
        { users: userData },
        undefined,
        this.createPaginationMeta(page, limit, count)
      );
    } catch (error) {
      console.error('Get all users error:', error);
      return this.createErrorResponseI18n('errors:internal_server_error', 500);
    }
  }

  /**
   * Get single user by ID
   * GET /api/v1/admin/users/:id
   */
  async getUserById(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    try {
      const userId = this.getPathParameter(request, 'id');
      if (!userId) {
        return this.createErrorResponseI18n('errors:user_id_required', 400);
      }

      const user = await User.findByPk(parseInt(userId, 10), {
        attributes: [
          'id',
          'email',
          'name',
          'surname',
          'isActive',
          'role',
          'creationDate',
          'updateDate',
        ],
      });

      if (!user) {
        return this.createErrorResponseI18n('errors:user_not_found', 404);
      }

      return this.createSuccessResponse({
        id: user.id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        fullName: user.getFullName(),
        isActive: user.isActive,
        role: user.role,
        createdAt: user.creationDate,
        updatedAt: user.updateDate,
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      return this.createErrorResponseI18n('errors:internal_server_error', 500);
    }
  }

  /**
   * Update user details
   * PUT /api/v1/admin/users/:id
   * Body: { name?, surname?, email?, isActive?, role? }
   */
  async updateUser(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    try {
      const userId = this.getPathParameter(request, 'id');
      if (!userId) {
        return this.createErrorResponseI18n('errors:user_id_required', 400);
      }

      const body = this.parseBody(request);
      if (!body) {
        return this.createErrorResponseI18n('errors:invalid_request_body', 400);
      }

      // Validate request body
      const validation = this.validateRequest(body, updateUserSchema);
      if (!validation.isValid) {
        return this.createErrorResponse(
          this.t('errors:validation_failed'),
          400,
          validation.errors ? { errors: validation.errors } : undefined
        );
      }

      const user = await User.findByPk(parseInt(userId, 10));
      if (!user) {
        return this.createErrorResponseI18n('errors:user_not_found', 404);
      }

      const updateData = validation.value as UpdateUserData;

      // Check if email is being changed and if it's already in use
      if (updateData?.email && updateData.email !== user.email) {
        const existingUser = await User.findOne({
          where: { email: updateData.email },
        });
        if (existingUser) {
          return this.createErrorResponseI18n('errors:email_already_exists', 400);
        }
      }

      // Update user
      await user.update(updateData);

      return this.createSuccessResponse({
        id: user.id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        fullName: user.getFullName(),
        isActive: user.isActive,
        role: user.role,
        createdAt: user.creationDate,
        updatedAt: user.updateDate,
      });
    } catch (error) {
      console.error('Update user error:', error);
      return this.createErrorResponseI18n('errors:internal_server_error', 500);
    }
  }

  /**
   * Delete user
   * DELETE /api/v1/admin/users/:id
   */
  async deleteUser(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    try {
      const userId = this.getPathParameter(request, 'id');
      if (!userId) {
        return this.createErrorResponseI18n('errors:user_id_required', 400);
      }

      const user = await User.findByPk(parseInt(userId, 10));
      if (!user) {
        return this.createErrorResponseI18n('errors:user_not_found', 404);
      }

      // Prevent deletion of the last admin
      if (user.isAdmin()) {
        const adminCount = await User.count({ where: { role: 'admin' } });
        if (adminCount <= 1) {
          return this.createErrorResponse(this.t('errors:cannot_delete_last_admin'), 400);
        }
      }

      // Delete user (books will have userId set to NULL due to foreign key constraint)
      await user.destroy();

      return this.createSuccessResponse(
        { message: this.t('success:user_deleted') },
        undefined,
        undefined,
        200
      );
    } catch (error) {
      console.error('Delete user error:', error);
      return this.createErrorResponseI18n('errors:internal_server_error', 500);
    }
  }
}

export const adminUserController = new AdminUserController();
