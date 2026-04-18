export interface Volunteer {
  id: string
  organizationId: string
  displayName: string
  /** Optional contact for admins only */
  email?: string
  phone?: string
  createdAt: string
}
