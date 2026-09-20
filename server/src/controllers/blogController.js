import * as blogService from "../services/blogService.js";

export async function list(req, res) {
  const { items, meta } = await blogService.listBlogs(req.validated.query);
  res.json({ data: items, meta });
}

export async function getOne(req, res) {
  const blog = await blogService.getBlog(req.validated.params.id);
  res.json({ data: blog });
}

export async function create(req, res) {
  const blog = await blogService.createBlog(req.user.id, req.validated.body, req.file);
  res.status(201).json({ data: blog });
}

export async function update(req, res) {
  const blog = await blogService.updateBlog(req.user, req.validated.params.id, req.validated.body, req.file);
  res.json({ data: blog });
}

export async function remove(req, res) {
  await blogService.deleteBlog(req.user, req.validated.params.id);
  res.status(204).end();
}
