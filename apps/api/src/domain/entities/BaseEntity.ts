// ================================================================
// domain/entities/BaseEntity.ts
// Shared base interface for domain entities
// ================================================================

export interface BaseEntity<ID = number | string> {
  id: ID;
}
