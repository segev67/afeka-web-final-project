/**
 * ===========================================
 * USER MODEL - MONGOOSE SCHEMA
 * ===========================================
 * 
 * This file defines the User schema for MongoDB using Mongoose.
 * 
 * DEFENSE NOTES:
 * - Mongoose is an ODM (Object Document Mapper) for MongoDB
 * - Schemas define the structure and validation rules for documents
 * - The password is NEVER stored in plain text - always hashed with bcrypt + salt
 * 
 * SCHEMA FIELDS:
 * - username: User's display name
 * - email: Unique identifier for login
 * - password: bcrypt hashed password (with salt)
 * - createdAt/updatedAt: Automatic timestamps
 */

import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

// ===========================================
// TYPESCRIPT INTERFACE
// ===========================================

/**
 * IUser Interface
 * 
 * Defines the TypeScript type for User documents.
 * Extends Document to include Mongoose document methods.
 */
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  // Instance method to compare passwords
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// ===========================================
// MONGOOSE SCHEMA DEFINITION
// ===========================================

/**
 * User Schema
 * 
 * DEFENSE EXPLANATION:
 * - Schema defines the "shape" of documents in the Users collection
 * - Each field can have type, validation rules, and options
 * - required: true means the field must be provided
 * - unique: true creates a unique index in MongoDB
 */
const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true, // Remove whitespace from both ends
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true, // Creates unique index - no duplicate emails allowed
      trim: true,
      lowercase: true, // Store email in lowercase for consistency
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      // Note: We don't set maxlength on password because hashed passwords are always 60 chars
    },
  },
  {
    /**
     * Schema Options
     * 
     * timestamps: true automatically adds createdAt and updatedAt fields
     * These are managed by Mongoose and update automatically
     */
    timestamps: true,
  }
);

// ===========================================
// PRE-SAVE MIDDLEWARE (PASSWORD HASHING)
// ===========================================

/**
 * Pre-Save Hook - Password Hashing with bcrypt + Salt
 * 
 * DEFENSE EXPLANATION (CRITICAL - LIKELY TO BE ASKED):
 * 
 * 1. WHAT IS HASHING?
 *    - One-way transformation of password into fixed-length string
 *    - Cannot be reversed (unlike encryption)
 *    - Same input always produces same output
 * 
 * 2. WHAT IS SALT?
 *    - Random data added to password BEFORE hashing
 *    - Makes each hash unique even for identical passwords
 *    - Protects against rainbow table attacks
 *    - bcrypt generates salt automatically with genSalt()
 * 
 * 3. WHY SALT_ROUNDS = 10?
 *    - Salt rounds (cost factor) determines hashing complexity
 *    - 10 rounds = 2^10 = 1024 iterations
 *    - Higher = more secure but slower
 *    - 10 is recommended balance between security and performance
 * 
 * 4. WHAT HAPPENS IF THIS IS REMOVED?
 *    - Passwords stored in plain text in database
 *    - If database is breached, all passwords are exposed
 *    - Major security vulnerability
 * 
 * 5. WHY CHECK isModified('password')?
 *    - Only hash if password field was changed
 *    - Prevents re-hashing already hashed passwords on user updates
 */
userSchema.pre('save', async function () {
  /**
   * DEFENSE NOTE (Mongoose 8+ / 9+):
   * - In newer Mongoose versions, async pre hooks don't use next()
   * - Simply return to continue, or throw to abort
   * - This is cleaner and more intuitive than callback pattern
   */
  
  // Only hash password if it's new or modified
  if (!this.isModified('password')) {
    return; // Continue without hashing
  }

  // Generate salt with cost factor of 10
  // DEFENSE: Salt is random bytes that make the hash unique
  const SALT_ROUNDS = 10;
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  
  // Hash password with the generated salt
  // DEFENSE: bcrypt.hash() combines password + salt and hashes them
  this.password = await bcrypt.hash(this.password, salt);
  
  // No need to call next() - async function completion signals success
  // If an error is thrown, Mongoose will catch it and abort the save
});

// ===========================================
// INSTANCE METHODS
// ===========================================

/**
 * Compare Password Method
 * 
 * DEFENSE EXPLANATION:
 * - Used during login to verify user's password
 * - bcrypt.compare() hashes the input and compares with stored hash
 * - Returns true if passwords match, false otherwise
 * 
 * WHY NOT JUST COMPARE STRINGS?
 * - We never store the original password
 * - Must hash the input the same way and compare hashes
 * - bcrypt.compare() handles salt extraction automatically
 */
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  // bcrypt.compare() extracts salt from stored hash and uses it to hash candidatePassword
  // Then compares the two hashes
  return bcrypt.compare(candidatePassword, this.password);
};

// ===========================================
// MODEL EXPORT
// ===========================================

/**
 * Create and export User model
 * 
 * DEFENSE EXPLANATION:
 * - mongoose.model() creates a model from the schema
 * - First argument 'User' is the model name (MongoDB collection will be 'users')
 * - Model provides methods like find(), create(), findById(), etc.
 */
const User = mongoose.model<IUser>('User', userSchema);

export default User;
