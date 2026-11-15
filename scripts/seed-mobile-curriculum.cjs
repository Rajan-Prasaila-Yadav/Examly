const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Mobile Real Curriculum into Database...');

  const instituteId = 'inst-apex-medical';
  const student = await prisma.user.findFirst({
    where: { email: 'developerajan@gmail.com' }
  });

  if (!student) {
    console.error('Student developerajan@gmail.com not found!');
    return;
  }

  // 1. Create or update CEE Preparation 2027 Batch
  let ceeBatch = await prisma.batch.findFirst({
    where: { name: 'CEE Preparation 2027', instituteId }
  });

  if (!ceeBatch) {
    ceeBatch = await prisma.batch.create({
      data: {
        instituteId,
        name: 'CEE Preparation 2027',
        code: 'CEE-2027',
        description: 'Comprehensive medical entrance preparation for CEE aspirants.',
        status: 'ACTIVE',
        priceNpr: 15000,
      }
    });
    console.log('Created batch:', ceeBatch.name);
  }

  // Create IOE Foundation 2027 Batch
  let ioeBatch = await prisma.batch.findFirst({
    where: { name: 'IOE Foundation 2027', instituteId }
  });

  if (!ioeBatch) {
    ioeBatch = await prisma.batch.create({
      data: {
        instituteId,
        name: 'IOE Foundation 2027',
        code: 'IOE-2027',
        description: 'Engineering entrance foundation batch for IOE Pulchowk & affiliated campuses.',
        status: 'ACTIVE',
        priceNpr: 14000,
      }
    });
    console.log('Created batch:', ioeBatch.name);
  }

  // Enroll student into CEE Preparation 2027
  await prisma.studentProfile.upsert({
    where: { userId: student.id },
    create: {
      userId: student.id,
      batchId: ceeBatch.id,
      rollNumber: '01',
    },
    update: {
      batchId: ceeBatch.id,
    }
  });
  console.log('Enrolled student into:', ceeBatch.name);

  // 2. Subjects for CEE Preparation 2027
  const subjectDefs = [
    { name: 'Physics', code: 'PHY-CEE', sortOrder: 1 },
    { name: 'Chemistry', code: 'CHM-CEE', sortOrder: 2 },
    { name: 'Botany', code: 'BOT-CEE', sortOrder: 3 },
    { name: 'Zoology', code: 'ZOO-CEE', sortOrder: 4 },
  ];

  const subjects = {};
  for (const s of subjectDefs) {
    let sub = await prisma.subject.findFirst({
      where: { batchId: ceeBatch.id, name: s.name }
    });
    if (!sub) {
      sub = await prisma.subject.create({
        data: {
          batchId: ceeBatch.id,
          name: s.name,
          code: s.code,
          sortOrder: s.sortOrder,
          status: 'ACTIVE'
        }
      });
    }
    subjects[s.name] = sub;
  }
  console.log('Subjects verified:', Object.keys(subjects));

  // 3. Lessons for Physics
  const physicsLessons = [
    { name: '01 Units & Measurements', sortOrder: 1 },
    { name: '02 Vectors & Motion', sortOrder: 2 },
    { name: '03 Laws of Motion', sortOrder: 3 },
    { name: '04 Work, Energy & Power', sortOrder: 4 },
    { name: '05 Electric Charges & Fields', sortOrder: 5, description: 'Charge, force and electric field concepts.' },
  ];

  const lessons = {};
  for (const l of physicsLessons) {
    let les = await prisma.lesson.findFirst({
      where: { subjectId: subjects['Physics'].id, name: l.name }
    });
    if (!les) {
      les = await prisma.lesson.create({
        data: {
          subjectId: subjects['Physics'].id,
          name: l.name,
          description: l.description || '',
          sortOrder: l.sortOrder,
          status: 'ACTIVE'
        }
      });
    }
    lessons[l.name] = les;
  }
  console.log('Physics lessons verified:', Object.keys(lessons));

  const electroLesson = lessons['05 Electric Charges & Fields'];

  // 4. Videos under Electric Charges & Fields
  const videoDefs = [
    { title: 'Electric Charge Basics', duration: 1440, sortOrder: 1, videoUrl: 'https://www.youtube.com/watch?v=TF8b_92w7wI' },
    { title: "Coulomb's Law", duration: 1800, sortOrder: 2, videoUrl: 'https://www.youtube.com/watch?v=0kG7P7k_H1s' },
    { title: 'Electric Field & Field Lines', duration: 1680, sortOrder: 3, videoUrl: 'https://www.youtube.com/watch?v=mdNL_2H7Eaw' },
    { title: 'Electric Dipole', duration: 1560, sortOrder: 4, videoUrl: 'https://www.youtube.com/watch?v=7XG3vj_D9G0' },
  ];

  const videos = {};
  for (const v of videoDefs) {
    let vid = await prisma.video.findFirst({
      where: { lessonId: electroLesson.id, title: v.title }
    });
    if (!vid) {
      vid = await prisma.video.create({
        data: {
          lessonId: electroLesson.id,
          title: v.title,
          description: `Detailed concept lecture on ${v.title}.`,
          durationSeconds: v.duration,
          videoUrl: v.videoUrl,
          sortOrder: v.sortOrder,
          status: 'ACTIVE'
        }
      });
    }
    videos[v.title] = vid;
  }
  console.log('Videos created:', Object.keys(videos));

  // Video watch progress for student on Coulomb's Law (12 min watched of 30 min)
  const coulombsVideo = videos["Coulomb's Law"];
  await prisma.videoWatchProgress.upsert({
    where: {
      userId_videoId: {
        userId: student.id,
        videoId: coulombsVideo.id,
      }
    },
    create: {
      userId: student.id,
      videoId: coulombsVideo.id,
      progressSeconds: 720,
      durationSeconds: 1800,
      isCompleted: false,
    },
    update: {
      progressSeconds: 720,
      durationSeconds: 1800,
      isCompleted: false,
    }
  });

  // Mark first video completed
  const chargeBasics = videos['Electric Charge Basics'];
  await prisma.videoWatchProgress.upsert({
    where: {
      userId_videoId: {
        userId: student.id,
        videoId: chargeBasics.id,
      }
    },
    create: {
      userId: student.id,
      videoId: chargeBasics.id,
      progressSeconds: 1440,
      durationSeconds: 1440,
      isCompleted: true,
    },
    update: {
      progressSeconds: 1440,
      durationSeconds: 1440,
      isCompleted: true,
    }
  });

  // 5. Notes under Electric Charges & Fields
  let note1 = await prisma.note.findFirst({
    where: { lessonId: electroLesson.id, title: "Coulomb's Law — Notes" }
  });
  if (!note1) {
    note1 = await prisma.note.create({
      data: {
        lessonId: electroLesson.id,
        title: "Coulomb's Law — Notes",
        description: 'Comprehensive study notes with KaTeX equations, worked examples, and key relationships.',
        fileUrl: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf',
        fileSizeBytes: 1024 * 350,
        sortOrder: 1,
        status: 'ACTIVE',
      }
    });
  }

  // 6. Real Practice Test & Mock Test
  let practiceTest = await prisma.test.findFirst({
    where: { lessonId: electroLesson.id, title: 'Electric Charges & Fields — Practice Test' }
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(7, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(10, 0, 0, 0);

  if (!practiceTest) {
    practiceTest = await prisma.test.create({
      data: {
        instituteId,
        batchId: ceeBatch.id,
        subjectId: subjects['Physics'].id,
        lessonId: electroLesson.id,
        title: 'Electric Charges & Fields — Practice Test',
        description: 'Standard practice test covering electrostatic force, Coulomb law, field intensity, and flux.',
        testType: 'BATCH_LEVEL',
        startDateTime: new Date(Date.now() - 7 * 86400000),
        endDateTime: new Date(Date.now() + 30 * 86400000),
        durationMinutes: 30,
        totalMarks: 20,
        passMarks: 8,
        negativeMarkRate: 0.25,
        isPublished: true,
        testStatus: 'LIVE',
        status: 'ACTIVE',
      }
    });

    // Create Section & Question
    const section = await prisma.section.create({
      data: {
        testId: practiceTest.id,
        name: 'Physics Practice',
        sortOrder: 1,
      }
    });

    // Question 7 from screenshot:
    const q7 = await prisma.question.create({
      data: {
        sectionId: section.id,
        questionType: 'SINGLE_CORRECT',
        contentHtml: 'Two point charges exert a force F on each other. If their separation is doubled while the charges remain unchanged, the new force is:',
        marksPositive: 1.0,
        marksNegative: 0.25,
        sortOrder: 7,
      }
    });

    await prisma.questionOption.createMany({
      data: [
        { questionId: q7.id, optionLabel: 'A', contentHtml: '2F', isCorrect: false, sortOrder: 1 },
        { questionId: q7.id, optionLabel: 'B', contentHtml: 'F / 4', isCorrect: true, sortOrder: 2 },
        { questionId: q7.id, optionLabel: 'C', contentHtml: 'F / 2', isCorrect: false, sortOrder: 3 },
        { questionId: q7.id, optionLabel: 'D', contentHtml: '4F', isCorrect: false, sortOrder: 4 },
      ]
    });
  }

  // Create Upcoming Full Mock Test
  let mockTest = await prisma.test.findFirst({
    where: { batchId: ceeBatch.id, title: 'CEE Full Mock Test 06' }
  });
  if (!mockTest) {
    mockTest = await prisma.test.create({
      data: {
        instituteId,
        batchId: ceeBatch.id,
        title: 'CEE Full Mock Test 06',
        description: 'All-Nepal CEE Grand Mock Test covering Physics, Chemistry, Botany, Zoology, and MAT.',
        testType: 'BATCH_LEVEL',
        startDateTime: tomorrow,
        endDateTime: tomorrowEnd,
        durationMinutes: 180,
        totalMarks: 200,
        passMarks: 100,
        negativeMarkRate: 0.25,
        isPublished: true,
        testStatus: 'SCHEDULED',
        status: 'ACTIVE',
      }
    });
  }

  // 7. Test Attempt & Result for student (Score: 11 / 20)
  const existingAttempt = await prisma.testAttempt.findFirst({
    where: { testId: practiceTest.id, studentId: student.id }
  });

  if (!existingAttempt) {
    const attempt = await prisma.testAttempt.create({
      data: {
        testId: practiceTest.id,
        studentId: student.id,
        attemptNumber: 1,
        startedAt: new Date(Date.now() - 3600000),
        submittedAt: new Date(Date.now() - 2000000),
        durationSeconds: 1542, // 25m 42s
      }
    });

    await prisma.testResult.create({
      data: {
        attemptId: attempt.id,
        totalScore: 11.0,
        totalCorrect: 12,
        totalWrong: 4,
        totalUnanswered: 4,
        percentage: 55.0,
        isPassed: true,
        rank: 3,
        publishedAt: new Date(),
      }
    });
  }

  // 8. Create batch updates / announcements
  const existingNotice = await prisma.batchClass.findFirst({
    where: { batchId: ceeBatch.id, topic: 'Physics Doubt Clearing & Numerical Session' }
  });
  if (!existingNotice) {
    const teacher = await prisma.user.findFirst({ where: { role: { code: 'TEACHER' } } });
    await prisma.batchClass.create({
      data: {
        batchId: ceeBatch.id,
        subjectId: subjects['Physics'].id,
        teacherId: teacher ? teacher.id : student.id,
        topic: 'Physics Doubt Clearing & Numerical Session',
        date: tomorrow.toISOString().split('T')[0],
        startTime: '08:00',
        endTime: '09:30',
        status: 'SCHEDULED',
      }
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
