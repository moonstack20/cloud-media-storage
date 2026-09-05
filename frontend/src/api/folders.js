import client from './client'

export const listFolders = (parentId = null) =>
  client.get('/folders', { params: parentId ? { parent_id: parentId } : {} })

export const createFolder = (name, parentId = null) =>
  client.post('/folders', { name, parent_id: parentId })

export const getFolder = (folderId) => client.get(`/folders/${folderId}`)

export const renameFolder = (folderId, newName) =>
  client.patch(`/folders/${folderId}/rename`, { new_name: newName })

export const deleteFolder = (folderId) => client.delete(`/folders/${folderId}`)

export const getBreadcrumbs = (folderId) => client.get(`/folders/${folderId}/breadcrumbs`)

export const listFolderTrash = () => client.get('/folders/trash')

export const restoreFolder = (folderId) => client.patch(`/folders/${folderId}/restore`)

export const permanentDeleteFolder = (folderId) => client.delete(`/folders/${folderId}/permanent`)
