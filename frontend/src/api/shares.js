import client from './client'

export const shareResource = (resourceType, resourceId, email, permission = 'viewer') =>
  client.post('/shares', {
    resource_type: resourceType,
    resource_id: resourceId,
    shared_with_email: email,
    permission,
  })

export const listSharesForResource = (resourceType, resourceId) =>
  client.get(`/shares/resource/${resourceType}/${resourceId}`)

export const listSharedWithMe = () => client.get('/shares/shared-with-me')

export const updateSharePermission = (shareId, permission) =>
  client.patch(`/shares/${shareId}`, { permission })

export const revokeShare = (shareId) => client.delete(`/shares/${shareId}`)
