import * as commentService from "../services/commentService.js";

export async function list(req, res) {
  const { items, meta } = await commentService.listComments(req.validated.params.id, req.validated.query);
  res.json({ data: items, meta });
}

export async function create(req, res) {
  const comment = await commentService.createComment(req.user.id, req.validated.params.id, req.validated.body);
  res.status(201).json({ data: comment });
}

export async function remove(req, res) {
  await commentService.deleteComment(req.user, req.validated.params.id);
  res.status(204).end();
}
