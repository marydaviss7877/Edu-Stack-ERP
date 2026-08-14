/**
 * Assign stable internet-hosted portrait photos to every user in the organization
 * owned by subhan@gmail.com. Student user photos are mirrored to
 * students.profile.photoUrl so every frontend/mobile surface sees the same image.
 *
 * Source: Random User's public portrait set, intended for application testing.
 * Docs: https://randomuser.me/documentation
 *
 * Preview: node scripts/populateMphssProfilePhotos.js
 * Apply:   node scripts/populateMphssProfilePhotos.js --apply
 */

require('dotenv/config');
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI;
const TARGET_EMAIL = 'subhan@gmail.com';
const APPLY = process.argv.includes('--apply');

if (!MONGO_URI) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

const FEMALE_FIRST_NAMES = new Set([
  'Ayesha', 'Fatima', 'Zainab', 'Sana', 'Amna', 'Hira', 'Mahnoor', 'Sadia',
  'Kiran', 'Rabia', 'Nida', 'Sobia', 'Mariam', 'Iqra', 'Laiba', 'Anum',
  'Bushra', 'Farah', 'Sidra', 'Uzma', 'Aiman', 'Noor', 'Rimsha', 'Warda',
  'Komal', 'Saba', 'Shazia', 'Tehmina', 'Zoya', 'Areeba', 'Mehak', 'Alishba',
  'Hafsa', 'Javeria', 'Khadija', 'Maryam', 'Nazia', 'Rukhsar', 'Sundas',
  'Wajiha',
]);

function firstName(name = '') {
  return name.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Miss)\s+/i, '').trim().split(/\s+/)[0];
}

function portraitUrl(gender, index) {
  const folder = gender === 'female' ? 'women' : 'men';
  return `https://randomuser.me/api/portraits/${folder}/${index % 100}.jpg`;
}

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();

  try {
    const db = client.db();
    const owner = await db.collection('users').findOne({
      email: TARGET_EMAIL,
      role: 'group_admin',
    });

    if (!owner?.orgId) throw new Error(`Group admin ${TARGET_EMAIL} was not found`);

    const [users, students] = await Promise.all([
      db.collection('users').find({ orgId: owner.orgId }).sort({ _id: 1 }).toArray(),
      db.collection('students').find({ orgId: owner.orgId }).sort({ _id: 1 }).toArray(),
    ]);

    const studentByUserId = new Map(students.map((student) => [student.userId.toString(), student]));
    const nextIndex = { male: 0, female: 0 };
    const userPhotoById = new Map();
    const counts = { male: 0, female: 0, users: users.length, students: students.length };

    for (const user of users) {
      const student = studentByUserId.get(user._id.toString());
      const gender = student?.profile?.gender === 'female' ||
        (!student && FEMALE_FIRST_NAMES.has(firstName(user.name)))
        ? 'female'
        : 'male';
      const url = portraitUrl(gender, nextIndex[gender]++);
      userPhotoById.set(user._id.toString(), url);
      counts[gender] += 1;
    }

    console.log(`Organization: ${owner.orgId}`);
    console.log(`Users: ${counts.users} (${counts.male} male, ${counts.female} female)`);
    console.log(`Student profiles: ${counts.students}`);

    if (!APPLY) {
      console.log('Preview only; run with --apply to write changes.');
      return;
    }

    const userResult = await db.collection('users').bulkWrite(
      users.map((user) => ({
        updateOne: {
          filter: { _id: user._id, orgId: owner.orgId },
          update: {
            $set: {
              photoUrl: userPhotoById.get(user._id.toString()),
              updatedAt: new Date(),
            },
            $unset: { profilePhotoUrl: '' },
          },
        },
      })),
      { ordered: false }
    );

    const studentResult = await db.collection('students').bulkWrite(
      students.map((student) => ({
        updateOne: {
          filter: { _id: student._id, orgId: owner.orgId },
          update: {
            $set: {
              'profile.photoUrl': userPhotoById.get(student.userId.toString()),
              updatedAt: new Date(),
            },
          },
        },
      })),
      { ordered: false }
    );

    console.log(`Updated user photos: ${userResult.modifiedCount}`);
    console.log(`Updated student photos: ${studentResult.modifiedCount}`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
