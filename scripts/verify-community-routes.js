// scripts/verify-community-routes.js
require('dotenv').config();
const { createFastifyApp } = require('../apps/api/dist/fastify/server');

async function testCommunity() {
  console.log('Testing Fastify Community routes...');
  const app = await createFastifyApp();
  await app.ready();

  // Test GET /api/v1/community/feed with auth
  // 1. Generate token
  const user = await app.prisma.user.findFirst({
    include: { role: true },
  });

  if (!user) {
    console.error('Superadmin user not found in DB');
    await app.close();
    return;
  }

  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    {
      sub: user.id,
      userId: user.id,
      instituteId: user.instituteId,
      roleCode: user.role.code,
    },
    process.env.JWT_ACCESS_SECRET || 'examly_ephemeral_dev_secret_key_must_be_overridden_in_prod_12345',
    { expiresIn: '1h' },
  );

  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/community/feed',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  console.log(`GET /api/v1/community/feed status: ${res.statusCode}`);
  const feed = JSON.parse(res.body);
  console.log(`Feed count: ${Array.isArray(feed) ? feed.length : 'Not array'}`);

  // Test POST /api/v1/community/posts
  const postRes = await app.inject({
    method: 'POST',
    url: '/api/v1/community/posts',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    payload: {
      title: '📢 Master Production Verification Announcement',
      contentHtml: 'Examly platform community feed and KaTeX rendering test: $E=mc^2$',
      isPinned: true,
      poll: {
        question: 'Which subject requires additional mock examinations?',
        options: ['Physics (Thermodynamics)', 'Zoology (Genetics)', 'Chemistry (Organic)'],
      },
    },
  });

  console.log(`POST /api/v1/community/posts status: ${postRes.statusCode}`);
  const createdPost = JSON.parse(postRes.body);
  console.log(`Created Post ID: ${createdPost.id}`);

  // Test POST /api/v1/community/posts/:id/react
  const reactRes = await app.inject({
    method: 'POST',
    url: `/api/v1/community/posts/${createdPost.id}/react`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    payload: {
      reactionType: 'LIKE',
    },
  });

  console.log(`POST /api/v1/community/posts/:id/react status: ${reactRes.statusCode}`);
  console.log(`React response: ${reactRes.body}`);

  // Clean up test post
  if (createdPost.id) {
    if (createdPost.poll?.id) {
      await app.prisma.pollOption.deleteMany({ where: { pollId: createdPost.poll.id } });
      await app.prisma.batchPoll.delete({ where: { id: createdPost.poll.id } });
    }
    await app.prisma.postReaction.deleteMany({ where: { postId: createdPost.id } });
    await app.prisma.communityPost.delete({ where: { id: createdPost.id } });
    console.log('Cleaned up verification post.');
  }

  await app.close();
  console.log('✅ All community routes verified successfully!');
}

testCommunity().catch(console.error);
