import client from './client'

export const getActivity = (limit = 50) => client.get('/activity', { params: { limit } })
