import argon2 from 'argon2';

const password = process.argv[2];

if (!password) {
	console.error('Usage: npx tsx scripts/hash-password.ts "dein-passwort"');
	process.exit(1);
}

// Base64-encoded so the '$'-delimited argon2 hash can't be mangled by
// dotenv's variable-expansion when read from .env.
const hash = await argon2.hash(password);
console.log(Buffer.from(hash, 'utf8').toString('base64'));
