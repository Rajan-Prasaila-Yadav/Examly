const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const testId = 'cmwif3f8l0007w8av2oubk2r7';

const questionsData = [
  {
    contentHtml: 'The dimensional formula of electric permittivity of free space (ε₀) is:',
    marksPositive: 1,
    marksNegative: 0.25,
    sortOrder: 1,
    options: [
      { optionLabel: 'A', contentHtml: '[M⁻¹ L⁻³ T⁴ A²]', isCorrect: true },
      { optionLabel: 'B', contentHtml: '[M¹ L³ T⁻⁴ A⁻²]', isCorrect: false },
      { optionLabel: 'C', contentHtml: '[M⁻¹ L³ T⁻² A¹]', isCorrect: false },
      { optionLabel: 'D', contentHtml: '[M¹ L² T⁻¹ A⁻¹]', isCorrect: false }
    ],
    hint: 'Use Coulomb\'s law: F = (1 / 4πε₀) * (q₁q₂ / r²)',
    solution: 'From Coulomb\'s law, ε₀ = q² / (4π F r²). Substituting dimensions [A T]² / ([M L T⁻²] [L]²) yields [M⁻¹ L⁻³ T⁴ A²].'
  },
  {
    contentHtml: 'A neutral conducting sphere is placed near a positively charged rod without touching it. The net charge on the sphere is:',
    marksPositive: 1,
    marksNegative: 0.25,
    sortOrder: 2,
    options: [
      { optionLabel: 'A', contentHtml: 'Positive', isCorrect: false },
      { optionLabel: 'B', contentHtml: 'Negative', isCorrect: false },
      { optionLabel: 'C', contentHtml: 'Zero', isCorrect: true },
      { optionLabel: 'D', contentHtml: 'Depends on the radius', isCorrect: false }
    ],
    hint: 'Electrostatic induction redistributes charges within an isolated conductor.',
    solution: 'By conservation of charge, an isolated conductor polarized by induction retains a net charge of zero.'
  },
  {
    contentHtml: 'Two charges +q and -q are separated by distance 2a. The electric field at the midpoint between the two charges is:',
    marksPositive: 1,
    marksNegative: 0.25,
    sortOrder: 3,
    options: [
      { optionLabel: 'A', contentHtml: 'Zero', isCorrect: false },
      { optionLabel: 'B', contentHtml: 'q / (2πε₀a²) directed toward -q', isCorrect: true },
      { optionLabel: 'C', contentHtml: 'q / (4πε₀a²) directed toward +q', isCorrect: false },
      { optionLabel: 'D', contentHtml: 'q / (πε₀a²) directed toward +q', isCorrect: false }
    ],
    hint: 'Electric fields due to +q and -q at midpoint point in the same direction.',
    solution: 'E_total = E_+q + E_-q = q/(4πε₀a²) + q/(4πε₀a²) = 2q/(4πε₀a²) = q / (2πε₀a²) pointing toward -q.'
  },
  {
    contentHtml: 'An electric dipole placed in a uniform electric field experiences:',
    marksPositive: 1,
    marksNegative: 0.25,
    sortOrder: 4,
    options: [
      { optionLabel: 'A', contentHtml: 'A net force only', isCorrect: false },
      { optionLabel: 'B', contentHtml: 'A torque only', isCorrect: true },
      { optionLabel: 'C', contentHtml: 'Both a net force and torque', isCorrect: false },
      { optionLabel: 'D', contentHtml: 'Neither force nor torque', isCorrect: false }
    ],
    hint: 'Forces on opposite charges cancel out in a uniform field.',
    solution: 'In a uniform field, F_net = +qE - qE = 0. However, the equal and opposite forces form a couple with torque τ = p × E.'
  },
  {
    contentHtml: 'Gauss\'s law is valid for:',
    marksPositive: 1,
    marksNegative: 0.25,
    sortOrder: 5,
    options: [
      { optionLabel: 'A', contentHtml: 'Only symmetrical closed surfaces', isCorrect: false },
      { optionLabel: 'B', contentHtml: 'Only spherical closed surfaces', isCorrect: false },
      { optionLabel: 'C', contentHtml: 'Any closed surface of any arbitrary shape', isCorrect: true },
      { optionLabel: 'D', contentHtml: 'Open flat surfaces only', isCorrect: false }
    ],
    hint: 'The flux integral ∮ E · dA = q_enclosed / ε₀ holds universally for any closed boundary.',
    solution: 'Gauss\'s law applies to any arbitrary closed surface enclosing charge, though calculation is easiest with high symmetry.'
  },
  {
    contentHtml: 'The electric field just outside the surface of a charged conductor with surface charge density σ in vacuum is:',
    marksPositive: 1,
    marksNegative: 0.25,
    sortOrder: 6,
    options: [
      { optionLabel: 'A', contentHtml: 'σ / ε₀ normal to surface', isCorrect: true },
      { optionLabel: 'B', contentHtml: 'σ / (2ε₀) normal to surface', isCorrect: false },
      { optionLabel: 'C', contentHtml: '2σ / ε₀ tangential to surface', isCorrect: false },
      { optionLabel: 'D', contentHtml: 'Zero', isCorrect: false }
    ],
    hint: 'Construct a small pillbox Gaussian surface partly inside the conductor.',
    solution: 'Since field inside conductor is zero, flux emerges only from outer endcap: E · A = (σ · A) / ε₀ => E = σ / ε₀.'
  },
  // Note: Question 7 already exists in DB! (Two point charges exert a force F on each other...)
  {
    contentHtml: 'A point charge q is placed at the center of a cube of edge L. The electric flux through one face of the cube is:',
    marksPositive: 1,
    marksNegative: 0.25,
    sortOrder: 8,
    options: [
      { optionLabel: 'A', contentHtml: 'q / ε₀', isCorrect: false },
      { optionLabel: 'B', contentHtml: 'q / (6ε₀)', isCorrect: true },
      { optionLabel: 'C', contentHtml: 'q / (8ε₀)', isCorrect: false },
      { optionLabel: 'D', contentHtml: 'q / (24ε₀)', isCorrect: false }
    ],
    hint: 'A cube has 6 identical faces enclosing the centered charge.',
    solution: 'By symmetry, the total flux q / ε₀ divides equally across all 6 faces: Φ_face = q / (6ε₀).'
  },
  {
    contentHtml: 'When a dielectric slab of dielectric constant K is placed between the plates of an isolated charged capacitor, the electric field between plates:',
    marksPositive: 1,
    marksNegative: 0.25,
    sortOrder: 9,
    options: [
      { optionLabel: 'A', contentHtml: 'Increases by factor K', isCorrect: false },
      { optionLabel: 'B', contentHtml: 'Decreases by factor K', isCorrect: true },
      { optionLabel: 'C', contentHtml: 'Remains unchanged', isCorrect: false },
      { optionLabel: 'D', contentHtml: 'Becomes zero', isCorrect: false }
    ],
    hint: 'Bound charges create an opposing induced field inside the dielectric.',
    solution: 'The internal field is reduced due to polarization: E = E₀ / K.'
  },
  {
    contentHtml: 'The work done in rotating an electric dipole of moment p in a uniform electric field E from angle θ₁ = 0° to θ₂ = 180° is:',
    marksPositive: 1,
    marksNegative: 0.25,
    sortOrder: 10,
    options: [
      { optionLabel: 'A', contentHtml: 'Zero', isCorrect: false },
      { optionLabel: 'B', contentHtml: 'pE', isCorrect: false },
      { optionLabel: 'C', contentHtml: '2pE', isCorrect: true },
      { optionLabel: 'D', contentHtml: '-2pE', isCorrect: false }
    ],
    hint: 'W = -pE (cos θ₂ - cos θ₁)',
    solution: 'W = -pE [cos(180°) - cos(0°)] = -pE [-1 - 1] = 2pE.'
  },
  {
    contentHtml: 'If the electric potential throughout a region is constant (V = constant), the electric field in that region is:',
    marksPositive: 1,
    marksNegative: 0.25,
    sortOrder: 11,
    options: [
      { optionLabel: 'A', contentHtml: 'Uniform and non-zero', isCorrect: false },
      { optionLabel: 'B', contentHtml: 'Zero everywhere', isCorrect: true },
      { optionLabel: 'C', contentHtml: 'Linearly increasing', isCorrect: false },
      { optionLabel: 'D', contentHtml: 'Infinite', isCorrect: false }
    ],
    hint: 'E = -dV / dr.',
    solution: 'Since E = -dV/dr and V is constant, dV/dr = 0, so E = 0 everywhere in that region.'
  },
  {
    contentHtml: 'An electron and a proton are released from rest in a uniform electric field. The ratio of their accelerations (a_e / a_p) is:',
    marksPositive: 1,
    marksNegative: 0.25,
    sortOrder: 12,
    options: [
      { optionLabel: 'A', contentHtml: '1', isCorrect: false },
      { optionLabel: 'B', contentHtml: 'm_p / m_e', isCorrect: true },
      { optionLabel: 'C', contentHtml: 'm_e / m_p', isCorrect: false },
      { optionLabel: 'D', contentHtml: '√(m_p / m_e)', isCorrect: false }
    ],
    hint: 'a = F / m = qE / m. Both have equal elementary charge e.',
    solution: 'a_e = eE / m_e and a_p = eE / m_p. Therefore a_e / a_p = m_p / m_e.'
  },
  {
    contentHtml: 'Electric field lines never cross each other because:',
    marksPositive: 1,
    marksNegative: 0.25,
    sortOrder: 13,
    options: [
      { optionLabel: 'A', contentHtml: 'They carry the same charge', isCorrect: false },
      { optionLabel: 'B', contentHtml: 'At the point of intersection, there would be two directions of net electric field', isCorrect: true },
      { optionLabel: 'C', contentHtml: 'They repel each other continuously', isCorrect: false },
      { optionLabel: 'D', contentHtml: 'They are always parallel to each other', isCorrect: false }
    ],
    hint: 'The tangent to a field line gives the unique direction of the force vector.',
    solution: 'If two lines crossed, a tangent at the intersection would yield two different directions for the electric field at one point, which is physically impossible.'
  },
  {
    contentHtml: 'The electrostatic potential energy of two point charges q₁ and q₂ separated by distance r in vacuum is given by:',
    marksPositive: 1,
    marksNegative: 0.25,
    sortOrder: 14,
    options: [
      { optionLabel: 'A', contentHtml: 'q₁q₂ / (4πε₀r)', isCorrect: true },
      { optionLabel: 'B', contentHtml: 'q₁q₂ / (4πε₀r²)', isCorrect: false },
      { optionLabel: 'C', contentHtml: 'q₁q₂ / (2πε₀r)', isCorrect: false },
      { optionLabel: 'D', contentHtml: 'q₁q₂ · r / (4πε₀)', isCorrect: false }
    ],
    hint: 'U = ∫ F · dr from infinity to r.',
    solution: 'U = q₁q₂ / (4πε₀r).'
  },
  {
    contentHtml: 'A hollow metallic sphere of radius R is given a positive charge Q. The electric potential at distance r (r < R) from the center is:',
    marksPositive: 1,
    marksNegative: 0.25,
    sortOrder: 15,
    options: [
      { optionLabel: 'A', contentHtml: 'Zero', isCorrect: false },
      { optionLabel: 'B', contentHtml: 'Q / (4πε₀R)', isCorrect: true },
      { optionLabel: 'C', contentHtml: 'Q / (4πε₀r)', isCorrect: false },
      { optionLabel: 'D', contentHtml: 'Q / (4πε₀(R - r))', isCorrect: false }
    ],
    hint: 'Inside a hollow conductor, electric field is zero, so potential is uniform and equal to surface potential.',
    solution: 'V(r) = V(R) = Q / (4πε₀R) for all r ≤ R.'
  },
  {
    contentHtml: 'If the radius of a Gaussian sphere enclosing an isolated charge is tripled, the total electric flux through the sphere:',
    marksPositive: 1,
    marksNegative: 0.25,
    sortOrder: 16,
    options: [
      { optionLabel: 'A', contentHtml: 'Triples', isCorrect: false },
      { optionLabel: 'B', contentHtml: 'Increases by 9 times', isCorrect: false },
      { optionLabel: 'C', contentHtml: 'Remains unchanged', isCorrect: true },
      { optionLabel: 'D', contentHtml: 'Reduces to one-third', isCorrect: false }
    ],
    hint: 'Total flux depends only on enclosed charge q_in / ε₀.',
    solution: 'By Gauss\'s law, Φ = q / ε₀, which is independent of the Gaussian surface radius.'
  },
  {
    contentHtml: 'The torque acting on an electric dipole p in an electric field E is maximum when the angle between p and E is:',
    marksPositive: 1,
    marksNegative: 0.25,
    sortOrder: 17,
    options: [
      { optionLabel: 'A', contentHtml: '0°', isCorrect: false },
      { optionLabel: 'B', contentHtml: '45°', isCorrect: false },
      { optionLabel: 'C', contentHtml: '90°', isCorrect: true },
      { optionLabel: 'D', contentHtml: '180°', isCorrect: false }
    ],
    hint: 'τ = |p × E| = p E sin θ.',
    solution: 'τ is maximum when sin θ = 1, which occurs at θ = 90°.'
  },
  {
    contentHtml: 'Two identical small conducting spheres having charges +40 μC and -20 μC are brought into contact and then separated to original distance. The ratio of initial to final force is:',
    marksPositive: 1,
    marksNegative: 0.25,
    sortOrder: 18,
    options: [
      { optionLabel: 'A', contentHtml: '8 : 1 (attractive to repulsive)', isCorrect: true },
      { optionLabel: 'B', contentHtml: '4 : 1', isCorrect: false },
      { optionLabel: 'C', contentHtml: '2 : 1', isCorrect: false },
      { optionLabel: 'D', contentHtml: '1 : 1', isCorrect: false }
    ],
    hint: 'Upon contact, charges redistribute equally: q_each = (+40 - 20) / 2 = +10 μC.',
    solution: 'F_initial ∝ |(40)(-20)| = 800 (attractive). F_final ∝ (10)(10) = 100 (repulsive). Ratio = 800 / 100 = 8 : 1.'
  },
  {
    contentHtml: 'An electric dipole consists of charges ±2 μC separated by 4 mm. The dipole moment is:',
    marksPositive: 1,
    marksNegative: 0.25,
    sortOrder: 19,
    options: [
      { optionLabel: 'A', contentHtml: '8 × 10⁻⁹ C·m', isCorrect: true },
      { optionLabel: 'B', contentHtml: '8 × 10⁻⁶ C·m', isCorrect: false },
      { optionLabel: 'C', contentHtml: '4 × 10⁻⁹ C·m', isCorrect: false },
      { optionLabel: 'D', contentHtml: '2 × 10⁻⁹ C·m', isCorrect: false }
    ],
    hint: 'p = q × 2a = (2 × 10⁻⁶ C) × (4 × 10⁻³ m).',
    solution: 'p = 2 × 10⁻⁶ × 4 × 10⁻³ = 8 × 10⁻⁹ C·m.'
  },
  {
    contentHtml: 'A soap bubble is given a negative electric charge. Its radius will:',
    marksPositive: 1,
    marksNegative: 0.25,
    sortOrder: 20,
    options: [
      { optionLabel: 'A', contentHtml: 'Decrease', isCorrect: false },
      { optionLabel: 'B', contentHtml: 'Increase', isCorrect: true },
      { optionLabel: 'C', contentHtml: 'Remain unchanged', isCorrect: false },
      { optionLabel: 'D', contentHtml: 'Collapse immediately', isCorrect: false }
    ],
    hint: 'Like charges on the surface repel each other outward.',
    solution: 'Electrostatic repulsion among negative surface charges exerts an outward pressure (electrostatic stress), causing the bubble to expand.'
  }
];

async function seed() {
  const section = await prisma.section.findFirst({
    where: { testId },
    orderBy: { sortOrder: 'asc' }
  });
  if (!section) {
    console.error('Section not found for test', testId);
    return;
  }
  console.log('Target section:', section.id);

  for (const q of questionsData) {
    const existing = await prisma.question.findFirst({
      where: { sectionId: section.id, sortOrder: q.sortOrder }
    });
    if (existing) {
      console.log('Skipping existing question at sortOrder', q.sortOrder);
      continue;
    }
    const created = await prisma.question.create({
      data: {
        sectionId: section.id,
        questionType: 'SINGLE_CORRECT',
        contentHtml: q.contentHtml,
        marksPositive: q.marksPositive,
        marksNegative: q.marksNegative,
        sortOrder: q.sortOrder,
        options: {
          create: q.options.map((opt, idx) => ({
            optionLabel: opt.optionLabel,
            contentHtml: opt.contentHtml,
            isCorrect: opt.isCorrect,
            sortOrder: idx + 1
          }))
        },
        solution: {
          create: {
            hintHtml: q.hint,
            shortExplanation: q.solution,
            stepByStepHtml: q.solution
          }
        }
      }
    });
    console.log('Created question at sortOrder', q.sortOrder, 'id:', created.id);
  }

  // Update test question count & total marks
  const totalCount = await prisma.question.count({ where: { sectionId: section.id } });
  await prisma.test.update({
    where: { id: testId },
    data: {
      totalMarks: 20,
      passMarks: 8
    }
  });
  console.log('Total questions in test now:', totalCount);
}

seed().catch(console.error).finally(() => prisma.$disconnect());
