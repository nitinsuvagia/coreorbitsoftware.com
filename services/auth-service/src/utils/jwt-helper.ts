/**
 * JWT Helper - Handles JWT signing with proper typing
 */

import jwt, { SignOptions, Secret } from 'jsonwebtoken';

/**
 * Sign a JWT token with proper type handling for expiresIn
 */
export function signToken(
  payload: object,
  secret: string,
  options: {
    expiresIn?: string | number;
    issuer?: string;
    audience?: string;
    subject?: string;
  }
): string {
  const signOptions: SignOptions = {
    expiresIn: options.expiresIn as SignOptions['expiresIn'],
  };
  
  // Only add optional fields if they have values
  if (options.issuer) signOptions.issuer = options.issuer;
  if (options.audience) signOptions.audience = options.audience;
  if (options.subject) signOptions.subject = options.subject;
  
  return jwt.sign(payload, secret as Secret, signOptions);
}
