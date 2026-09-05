import client from './client'

export const createPublicLink = (resourceType, resourceId, options = {}) =>
  client.post('/public-links', {
    resource_type: resourceType,
    resource_id: resourceId,
    password: options.password || null,
    expires_in_hours: options.expiresInHours || null,
  })

export const listPublicLinks = (resourceType, resourceId) =>
  client.get(`/public-links/resource/${resourceType}/${resourceId}`)

export const revokePublicLink = (linkId) => client.delete(`/public-links/${linkId}`)
