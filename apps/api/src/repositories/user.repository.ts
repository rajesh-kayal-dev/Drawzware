import { UserModel, IUser } from '../models/user.model.js';

export async function createUserDoc(data: { name: string; email: string; password: string }): Promise<IUser> {
  return UserModel.create(data);
}

export async function findUserDocByEmail(email: string, includePassword = false): Promise<IUser | null> {
  const query = UserModel.findOne({ email });
  if (includePassword) {
    query.select('+password');
  }
  return query.exec();
}

export async function findUserDocById(id: string): Promise<IUser | null> {
  return UserModel.findById(id).exec();
}
