import mongoose, { Model } from 'mongoose';
import crypto from 'node:crypto';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => crypto.randomUUID(),
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
  },
  {
    timestamps: true,
    _id: false,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  }
);

export const UserModel: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', userSchema);
