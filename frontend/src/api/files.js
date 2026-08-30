import client from './client'

export const listFiles = () => client.get('/files')

export const searchFiles = (params) => client.get('/files/search/query', { params })

export const uploadFile = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return client.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const downloadFile = (fileId) => client.get(`/files/download/${fileId}`)

export const deleteFile = (fileId) => client.delete(`/files/${fileId}`)

export const renameFile = (fileId, newName) =>
  client.patch(`/files/${fileId}/rename`, { new_name: newName })

export const moveFile = (fileId, folderId) => client.patch(`/files/${fileId}/move`, { folder_id: folderId })

export const toggleStar = (fileId, starred) =>
  client.patch(`/files/${fileId}/star`, { starred })

export const listTrash = () => client.get('/files/trash')

export const restoreFile = (fileId) => client.patch(`/files/${fileId}/restore`)

export const permanentDelete = (fileId) => client.delete(`/files/${fileId}/permanent`)

export const uploadNewVersion = (fileId, file) => {
  const formData = new FormData()
  formData.append('file', file)
  return client.post(`/files/${fileId}/versions`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const listVersions = (fileId) => client.get(`/files/${fileId}/versions`)

export const restoreVersion = (fileId, versionId) =>
  client.post(`/files/${fileId}/versions/${versionId}/restore`)

export const downloadVersion = (fileId, versionId) =>
  client.get(`/files/${fileId}/versions/${versionId}/download`)
