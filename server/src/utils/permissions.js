import { AppError } from "./AppError.js";

// Authorization rule shared by blogs and comments: the owner or an admin may modify.
export function assertOwnerOrAdmin(user, ownerId) {
  const isOwner = String(ownerId) === String(user.id);
  if (!isOwner && user.role !== "ADMIN") {
    throw AppError.forbidden("You can only modify your own content");
  }
}
