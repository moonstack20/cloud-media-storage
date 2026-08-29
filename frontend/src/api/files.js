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

export const toggleStar = (fileId, starred) =>
  client.patch(`/files/${fileId}/star`, { starred })
