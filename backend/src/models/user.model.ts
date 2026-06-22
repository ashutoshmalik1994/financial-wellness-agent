import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  employeeId: string;
  name: string;
  email: string;
  passwordHash: string;
  department: string;
  designation: string;
  panNumber: string; // stored masked in responses
  role: 'employee' | 'admin' | 'payroll_team';
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    employeeId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    department: { type: String, default: 'Engineering' },
    designation: { type: String, default: 'Software Engineer' },
    panNumber: { type: String, default: 'XXXXX0000X' },
    role: { type: String, enum: ['employee', 'admin', 'payroll_team'], default: 'employee' },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

// Never return passwordHash or full PAN in JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  if (obj.panNumber) {
    obj.panNumber = obj.panNumber.replace(/^.{6}/, 'XXXXXX');
  }
  return obj;
};

export const User = model<IUser>('User', userSchema);
