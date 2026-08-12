import bcrypt from 'bcryptjs';
import readline from 'readline';
import { db, initDb } from '../config/db.js';
import { env, assertCriticalEnv } from '../config/env.js';
import { generateId } from '../utils/tokens.js';

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  assertCriticalEnv();
  await initDb();

  console.log('--- Create Admin Account ---');
  console.log('Press Enter to accept the bracketed default from your .env file.\n');

  const name = (await ask(`Name [${env.firstAdmin.name}]: `)) || env.firstAdmin.name;
  const email = ((await ask(`Email [${env.firstAdmin.email}]: `)) || env.firstAdmin.email).toLowerCase();
  const password =
    (await ask(`Password [${env.firstAdmin.password ? '(from .env)' : 'required'}]: `)) || env.firstAdmin.password;

  if (!email || !password || password.length < 10) {
    console.error('\nEmail and a password of at least 10 characters are required.');
    process.exit(1);
  }

  const { rows } = await db.query('SELECT id FROM admins WHERE email = $1', [email]);
  if (rows[0]) {
    console.error(`\nAn admin with email ${email} already exists.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.query(`INSERT INTO admins (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, 'admin')`, [
    generateId('adm'),
    name,
    email,
    passwordHash,
  ]);

  console.log(`\nAdmin account created for ${email}. You can now log in from the admin login page.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
