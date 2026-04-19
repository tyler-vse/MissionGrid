export interface Volunteer {
  id: string
  organizationId: string
  displayName: string
  firstName?: string
  lastName?: string
  /** Optional contact for admins only */
  email?: string
  phone?: string
  isAdmin?: boolean
  createdAt: string
}
