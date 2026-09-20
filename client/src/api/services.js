import { http } from "./http.js";

const unwrap = (promise) => promise.then((res) => res.data);

export const authApi = {
  register: (payload) => unwrap(http.post("/auth/register", payload)),
  login: (payload) => unwrap(http.post("/auth/login", payload)),
  logout: () => http.post("/auth/logout"),
};

export const blogApi = {
  list: (params) => unwrap(http.get("/blogs", { params })),
  get: (id) => unwrap(http.get(`/blogs/${id}`)),
  create: (formData) => unwrap(http.post("/blogs", formData)),
  update: (id, formData) => unwrap(http.patch(`/blogs/${id}`, formData)),
  remove: (id) => http.delete(`/blogs/${id}`),
};

export const commentApi = {
  list: (blogId, params) => unwrap(http.get(`/blogs/${blogId}/comments`, { params })),
  create: (blogId, payload) => unwrap(http.post(`/blogs/${blogId}/comments`, payload)),
  remove: (id) => http.delete(`/comments/${id}`),
};
