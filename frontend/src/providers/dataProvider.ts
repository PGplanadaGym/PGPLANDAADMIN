import type { DataProvider } from '@refinedev/core'
import { API_URL, axiosInstance } from '../lib/axios'

export const dataProvider: DataProvider = {
  getApiUrl: () => API_URL,

  getList: async ({ resource }) => {
    const { data } = await axiosInstance.get(`/${resource}`)
    return { data, total: data.length }
  },

  getOne: async ({ resource, id }) => {
    const { data } = await axiosInstance.get(`/${resource}/${id}`)
    return { data }
  },

  create: async ({ resource, variables }) => {
    const { data } = await axiosInstance.post(`/${resource}`, variables)
    return { data }
  },

  update: async ({ resource, id, variables }) => {
    const { data } = await axiosInstance.patch(
      `/${resource}/${id}`,
      variables,
    )
    return { data }
  },

  deleteOne: async ({ resource, id }) => {
    const { data } = await axiosInstance.delete(`/${resource}/${id}`)
    return { data }
  },
}
