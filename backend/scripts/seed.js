// scripts/seed.js
// Usage:
//   node scripts/seed.js            -> upsert demo data (no destructive ops)
//   node scripts/seed.js --reset    -> drop Apps/Comments/Users (DANGER) then seed fresh
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import App from '../models/App.js';
import Comment from '../models/Comment.js';
import User from '../models/User.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mern_dashboard';

async function main() {
  const reset = process.argv.includes('--reset');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to Mongo');

  if (reset) {
    console.log('⚠️  Resetting collections...');
    await Promise.all([
      App.deleteMany({}),
      Comment.deleteMany({}),
      User.deleteMany({})
    ]);
  }

  // --- upsert super admin ---
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const adminPass = process.env.SEED_ADMIN_PASS  || 'Admin@123';
  const adminUsername = process.env.SEED_ADMIN_USERNAME || 'superadmin';

  let superAdmin = await User.findOne({ email: adminEmail });
  if (!superAdmin) {
    const hash = await bcrypt.hash(adminPass, 10);
    superAdmin = await User.create({
      name: 'Karthik Admin',
      username: adminUsername,
      email: adminEmail,
      password: hash,
      role: 'admin',
      isSuperAdmin: true,
      verified: true,
      interests: ['games','tools','technology'],
      darkMode: true,
    });
    console.log('👑 Super admin created:', adminEmail, '(password:', adminPass, ')');
  } else {
    console.log('👑 Super admin already exists:', adminEmail);
  }

  // --- demo apps ---
  const demoApps = [
    { name: 'Task Manager', description: 'Manage tasks and projects.', icon: '✅', image: '', url: 'https://example.com/task', category: 'tools' },
    { name: 'Photo Editor', description: 'Edit photos.', icon: '🖼️', image: '', url: 'https://example.com/photo', category: 'technology' },
    { name: 'Tic‑Tac‑Toe', description: 'A quick game.', icon: '🎮', image: '', url: 'https://example.com/tictactoe', category: 'games' },
  ];

  const createdApps = [];
  for (const a of demoApps) {
    let exist = await App.findOne({ name: a.name });
    if (!exist) {
      exist = await App.create(a);
      console.log('📦 App created:', a.name);
    } else {
      console.log('📦 App exists:', a.name);
    }
    createdApps.push(exist);
  }

  // simulate some clicks / likes
  await App.updateOne({ _id: createdApps[0]._id }, { $inc: { clicks: 5 }, $addToSet: { likedBy: [superAdmin._id] } });
  await App.updateOne({ _id: createdApps[1]._id }, { $inc: { clicks: 2 } });

  // --- comments (global + per‑app) ---
  const globalC = await Comment.create({
    text: 'Welcome to your new dashboard!',
    user: superAdmin.username,
    userId: superAdmin._id
  });
  const appC = await Comment.create({
    appId: createdApps[0]._id,
    text: 'This Task Manager is 🔥',
    user: superAdmin.username,
    userId: superAdmin._id
  });
  console.log('💬 Comments added:', globalC._id.toString(), appC._id.toString());

  console.log('\n✅ Seeding complete.');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
