import { Schema, model } from "mongoose";

const refreshTokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // All tokens descended from one login share a family, so a whole session can be revoked at once.
    family: { type: String, required: true, index: true },
    // Only the SHA-256 hash is stored, so a DB leak doesn't leak usable tokens.
    tokenHash: { type: String, required: true, unique: true },
    // Set when the token is exchanged for a new one. Used tokens are kept (until they expire) so a
    // replay of an old token can be recognised as theft instead of looking like an unknown token.
    usedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// MongoDB deletes the document automatically once expiresAt has passed.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = model("RefreshToken", refreshTokenSchema);
