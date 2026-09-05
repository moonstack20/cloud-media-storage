import client from './client'

export const listTags = () => client.get('/tags')
export const createTag = (name, color) => client.post('/tags', { name, color })
export const deleteTag = (tagId) => client.delete(`/tags/${tagId}`)
export const attachTag = (fileId, tagId) => client.post(`/tags/files/${fileId}/attach`, { tag_id: tagId })
export const detachTag = (fileId, tagId) => client.delete(`/tags/files/${fileId}/detach/${tagId}`)
export const getFileTags = (fileId) => client.get(`/tags/files/${fileId}`)
export const getFilesByTag = (tagId) => client.get(`/tags/${tagId}/files`)

export const getQuota = () => client.get('/files/quota/usage')
export const getPreview = (fileId) => client.get(`/files/${fileId}/preview`)
