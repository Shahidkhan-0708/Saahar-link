/**
 * Deterministic demo seed (blueprint §10) — one command, fixed IDs.
 *
 *   pnpm --filter @sahakar/api db:seed
 *
 * Idempotent: exits early if the demo institution already exists.
 * All demo accounts share the password below.
 */
import { eq } from "drizzle-orm";
import { createDb } from "./index.js";
import { hashPassword } from "../lib/password.js";
import * as t from "./schema.js";

export const DEMO_PASSWORD = "Sahakar@123";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export async function seed(): Promise<{ skipped: boolean }> {
  const { db, driver } = await createDb();
  console.log(`seed: driver=${driver}`);

  const [existing] = await db
    .select({ id: t.institutions.id })
    .from(t.institutions)
    .where(eq(t.institutions.code, "VAMNICOM-PUNE"))
    .limit(1);
  if (existing) {
    console.log("seed: already seeded, nothing to do");
    return { skipped: true };
  }

  // ---------------------------------------------------------------- identity
  const [institution] = await db
    .insert(t.institutions)
    .values({
      id: id(1),
      name: "VAMNICOM-Pune (Demo)",
      code: "VAMNICOM-PUNE",
      type: "VAMNICOM",
      config: { demo: true },
    })
    .returning();
  void institution;

  const password = hashPassword(DEMO_PASSWORD);
  const userSpecs: [number, string, string, string, string | null][] = [
    [10, "ncct@demo.in", "NCCT Admin", "ncct_admin", null],
    [11, "admin@demo.in", "Institution Admin", "institution_admin", id(1)],
    [12, "trainer1@demo.in", "Meera Kulkarni", "trainer", id(1)],
    [13, "trainer2@demo.in", "Rajesh Patil", "trainer", id(1)],
    [14, "trainer3@demo.in", "Sunita Jadhav", "trainer", id(1)],
    [15, "auditor@demo.in", "External Auditor", "auditor", null],
    [16, "employer1@demo.in", "Anand Pattern Dairy", "employer", null],
    [17, "employer2@demo.in", "Sahyadri FPO Services", "employer", null],
  ];
  // 12 trainees — 3 marked low-connectivity personas (blueprint §10)
  const traineeNames = [
    "Aarti Deshmukh",
    "Vikram Pawar",
    "Sneha Bhosale",
    "Ravi Shinde",
    "Pooja Gaikwad",
    "Amit Chavan",
    "Kavita More",
    "Sandeep Wagh",
    "Neha Salunkhe",
    "Prakash Thorat",
    "Rupali Mane",
    "Ganesh Kale",
  ];
  traineeNames.forEach((name, i) => {
    userSpecs.push([
      20 + i,
      `trainee${i + 1}@demo.in`,
      name,
      "trainee",
      id(1),
    ]);
  });

  for (const [n, email, name, role, inst] of userSpecs) {
    await db
      .insert(t.users)
      .values({
        id: id(n),
        email,
        passwordHash: password,
        displayName: name,
        role,
        institutionId: inst,
      })
      .onConflictDoNothing();
  }

  // -------------------------------------------------------------- programmes
  await db
    .insert(t.programmes)
    .values([
      {
        id: id(100),
        institutionId: id(1),
        title: "Cooperative Accounting & Compliance",
        category: "accounting",
        capacity: 12,
        eligibility: { min_age: 18, education: "12th" },
        nominationOpens: new Date(Date.now() - 7 * 86400_000),
        nominationCloses: new Date(Date.now() + 30 * 86400_000),
        status: "OPEN",
        createdBy: id(11),
      },
      {
        id: id(101),
        institutionId: id(1),
        title: "Dairy Farm Management",
        category: "dairy",
        capacity: 10,
        eligibility: { min_age: 18 },
        nominationOpens: new Date(Date.now() - 7 * 86400_000),
        nominationCloses: new Date(Date.now() + 30 * 86400_000),
        status: "OPEN",
        createdBy: id(11),
      },
    ])
    .onConflictDoNothing();

  // 8 approved nominations on programme 1 → batch of 8
  for (let i = 0; i < 8; i += 1) {
    await db
      .insert(t.nominations)
      .values({
        id: id(200 + i),
        programmeId: id(100),
        traineeUserId: id(20 + i),
        status: "APPROVED",
        decidedBy: id(11),
        decidedAt: new Date(),
      })
      .onConflictDoNothing();
  }
  // 4 pending on programme 2 (for the nomination-review demo)
  for (let i = 8; i < 12; i += 1) {
    await db
      .insert(t.nominations)
      .values({
        id: id(200 + i),
        programmeId: id(101),
        traineeUserId: id(20 + i),
        status: "SUBMITTED",
      })
      .onConflictDoNothing();
  }

  await db
    .insert(t.batches)
    .values({
      id: id(300),
      programmeId: id(100),
      name: "Batch A — Oct 2026",
      startDate: "2026-10-12",
      endDate: "2026-11-12",
      status: "ACTIVE",
    })
    .onConflictDoNothing();
  for (let i = 0; i < 8; i += 1) {
    await db
      .insert(t.batchTrainees)
      .values({ batchId: id(300), traineeUserId: id(20 + i) })
      .onConflictDoNothing();
  }

  await db
    .insert(t.resources)
    .values([
      { id: id(400), institutionId: id(1), kind: "ROOM", name: "Hall 1" },
      { id: id(401), institutionId: id(1), kind: "LAB", name: "Computer Lab" },
    ])
    .onConflictDoNothing();

  // A week of timetable sessions
  for (let d = 0; d < 5; d += 1) {
    const day = new Date(Date.UTC(2026, 9, 12 + d, 9, 0, 0));
    await db
      .insert(t.timetableSessions)
      .values({
        id: id(500 + d),
        batchId: id(300),
        trainerUserId: id(12),
        resourceId: d % 2 === 0 ? id(400) : id(401),
        startsAt: day,
        endsAt: new Date(day.getTime() + 2 * 3600_000),
        status: "SCHEDULED",
      })
      .onConflictDoNothing();
  }

  // ------------------------------------------------- skills taxonomy (15)
  const skillCodes = [
    "bookkeeping",
    "gst-filing",
    "coop-governance",
    "dairy-qa",
    "cold-chain",
    "fpo-governance",
    "member-outreach",
    "loan-processing",
    "inventory-control",
    "food-safety",
    "farm-machinery",
    "record-keeping",
    "ms-office",
    "customer-service",
    "quality-audit",
  ];
  skillCodes.forEach((code, i) => {
    void db
      .insert(t.skills)
      .values({ id: id(600 + i), code, name: code.replace(/-/g, " ") })
      .onConflictDoNothing();
  });

  // ------------------------------------------------------------- LMS content
  await db
    .insert(t.courses)
    .values({
      id: id(700),
      programmeId: id(100),
      title: "Cooperative Accounting Basics",
      language: "en",
      status: "PUBLISHED",
    })
    .onConflictDoNothing();
  await db
    .insert(t.courseVersions)
    .values({
      id: id(701),
      courseId: id(700),
      version: 1,
      publishedAt: new Date(),
    })
    .onConflictDoNothing();

  const lessonBodies: Record<string, string[]> = {
    en: [
      "# Lesson 1: The cooperative principles\n\nA cooperative is owned and run by its members. Seven international principles govern elections, distribution and education.",
      "# Lesson 2: Double-entry bookkeeping\n\nEvery transaction has a debit and a credit. Assets increase on the debit side; liabilities and equity increase on the credit side.",
      "# Lesson 3: GST for cooperatives\n\nCooperative societies file GST when turnover crosses the threshold. Input credit rules differ for agricultural marketing societies.",
    ],
    hi: [
      "# पाठ 1: सहकारी सिद्धांत\n\nसहकारी समिति अपने सदस्यों द्वारा चलाई जाती है। सात अंतरराष्ट्रीय सिद्धांत चुनाव, वितरण और शिक्षा को नियंत्रित करते हैं।",
      "# पाठ 2: दोहरी-प्रविष्टि लेखांकन\n\nहर लेनदेन में नामांकित और जमा होता है। संपत्ति बाईं ओर बढ़ती है; देनदारी दाईं ओर।",
      "# पाठ 3: सहकारियों के लिए जीएसटी\n\nसहकारी समितियाँ सीमा पार करने पर जीएसटी दाखिल करती हैं।",
    ],
    mr: [
      "# धडा 1: सहकारी तत्त्वे\n\nसहकारी संस्था सदस्यांद्वारे चालवली जाते. सात आंतरराष्ट्रीय तत्त्वे नियंत्रित करतात.",
      "# धडा 2: दोहरी-नोंद लेखापद्धती\n\nप्रत्येक व्यवहाराची नोंद आणि जमा असते.",
      "# धडा 3: सहकार्यांसाठी जीएसटी\n\nसहकारी संस्था मर्यादा ओलांडल्यावर जीएसटी दाखल करतात.",
    ],
  };
  let lessonNo = 0;
  for (const [lang, bodies] of Object.entries(lessonBodies)) {
    bodies.forEach((bodyMd, ord) => {
      lessonNo += 1;
      void db
        .insert(t.lessons)
        .values({
          id: id(800 + lessonNo),
          courseVersionId: id(701),
          ord: ord + 1,
          title: bodyMd.split("\n")[0]!.replace(/^#\s*/, ""),
          bodyMd,
          lang,
          durationMin: 20,
        })
        .onConflictDoNothing();
    });
  }

  // ---------------------------------------------------------------- quiz (5Q)
  await db
    .insert(t.assessments)
    .values({
      id: id(900),
      courseVersionId: id(701),
      title: "Cooperative Accounting — Quiz 1",
      kind: "QUIZ",
      status: "PUBLISHED",
    })
    .onConflictDoNothing();
  const questions: [string, string[], number, string[]][] = [
    ["Which body manages a cooperative day-to-day?", ["Members", "The board", "Auditors", "Government"], 1, ["coop-governance"]],
    ["A debit increases…", ["Liabilities", "Assets", "Income", "Capital"], 1, ["bookkeeping"]],
    ["GST return frequency for most filers?", ["Weekly", "Monthly", "Quarterly", "Yearly"], 2, ["gst-filing"]],
    ["Cold chain means…", ["Cold storage only", "Unbroken temperature control", "Refrigerated trucks", "Ice packs"], 1, ["cold-chain"]],
    ["FPO stands for…", ["Farmer Producer Organisation", "Financial Planning Officer", "Food Processing Outlet", "Farm Power Operation"], 0, ["fpo-governance"]],
  ];
  questions.forEach(([prompt, options, correct, skills], i) => {
    void db
      .insert(t.assessmentQuestions)
      .values({
        id: id(910 + i),
        assessmentId: id(900),
        ord: i + 1,
        prompt,
        options,
        correctIndex: correct,
        skills,
      })
      .onConflictDoNothing();
  });

  // --------------------------------------------------- employers + jobs + matches
  await db
    .insert(t.employers)
    .values([
      { id: id(1000), name: "Anand Pattern Dairy Co-op", gstNo: "27AAAAA0000A1Z5", verified: true, verifiedBy: id(11), createdBy: id(16) },
      { id: id(1001), name: "Sahyadri FPO Services", gstNo: "27BBBBB0000B1Z6", verified: true, verifiedBy: id(11), createdBy: id(17) },
    ])
    .onConflictDoNothing();

  await db
    .insert(t.jobs)
    .values([
      { id: id(1100), employerId: id(1000), title: "Accounts Assistant", location: "Pune", experienceMinMonths: 0, status: "OPEN" },
      { id: id(1101), employerId: id(1001), title: "Field Coordinator", location: "Nashik", experienceMinMonths: 6, status: "OPEN" },
    ])
    .onConflictDoNothing();
  const job1Reqs: [string, "REQUIRED" | "OPTIONAL"][] = [
    ["bookkeeping", "REQUIRED"],
    ["gst-filing", "REQUIRED"],
    ["ms-office", "OPTIONAL"],
  ];
  job1Reqs.forEach(([code, kind], i) => {
    void db
      .insert(t.jobRequirements)
      .values({
        id: id(1110 + i),
        jobId: id(1100),
        skillId: id(600 + skillCodes.indexOf(code)),
        kind,
      })
      .onConflictDoNothing();
  });
  const job2Reqs: [string, "REQUIRED" | "OPTIONAL"][] = [
    ["member-outreach", "REQUIRED"],
    ["farm-machinery", "OPTIONAL"],
  ];
  job2Reqs.forEach(([code, kind], i) => {
    void db
      .insert(t.jobRequirements)
      .values({
        id: id(1120 + i),
        jobId: id(1101),
        skillId: id(600 + skillCodes.indexOf(code)),
        kind,
        credentialGate: i === 0 ? id(100) : null,
      })
      .onConflictDoNothing();
  });

  // Trainee 1 matches Job 1 cleanly (evidence for both required skills);
  // the other trainees show MISSING rows for the explainable-match demo.
  const evidence: [number, string][] = [
    [600 + skillCodes.indexOf("bookkeeping"), "ASSESSMENT"],
    [600 + skillCodes.indexOf("gst-filing"), "CREDENTIAL"],
    [600 + skillCodes.indexOf("ms-office"), "COURSE"],
  ];
  evidence.forEach(([skillNum, sourceType], i) => {
    void db
      .insert(t.skillEvidence)
      .values({
        id: id(1200 + i),
        traineeUserId: id(20),
        skillId: id(skillNum),
        sourceType,
        sourceId: id(900),
        proficiency: "INTERMEDIATE",
      })
      .onConflictDoNothing();
  });

  // ---------------------------------------------------------------- outcomes
  await db
    .insert(t.applications)
    .values({
      id: id(1300),
      jobId: id(1100),
      traineeUserId: id(20),
      state: "APPLIED",
    })
    .onConflictDoNothing();

  // One historical ACTIVE credential for the verify-page demo (signed with the
  // dev key so /verify works out of the box).
  const { credentialPayloadSchema, keyPairFromSeed, signCredential } = await import(
    "@sahakar/credentials"
  );
  const key = keyPairFromSeed(
    Buffer.from("sahakar-link-dev-signing-key-32b").toString("base64"),
  );
  const payload = credentialPayloadSchema.parse({
    credential_id: id(1400),
    issuer_id: id(1),
    subject_id: id(20),
    programme_id: id(100),
    subject_display_name: traineeNames[0],
    programme_title: "Cooperative Accounting & Compliance",
    skills: ["bookkeeping", "gst-filing"],
    assessment_summary: { score: 87, grade: "A" },
    issued_at: "2026-09-28T09:00:00Z",
    expires_at: null,
    status: "ACTIVE",
    key_id: "key-dev",
  });
  const { signature, canonical_hash } = signCredential(payload, key.privateKey);
  await db
    .insert(t.credentials)
    .values({
      id: id(1400),
      issuerId: id(1),
      subjectId: id(20),
      programmeId: id(100),
      subjectName: traineeNames[0]!,
      programmeTitle: "Cooperative Accounting & Compliance",
      skills: payload.skills,
      assessmentSummary: payload.assessment_summary,
      issuedAt: new Date("2026-09-28T09:00:00Z"),
      keyId: "key-dev",
      signature,
      canonicalHash: canonical_hash,
    })
    .onConflictDoNothing();
  await db
    .insert(t.credentialEvents)
    .values({ credentialId: id(1400), action: "ISSUED", actorId: id(12) })
    .onConflictDoNothing();

  // ------------------------------------------------------- knowledge for copilot
  const chunks: [string, string, string][] = [
    ["FAQ", "en", "Cooperative governance: members elect the board at the AGM; one member, one vote."],
    ["FAQ", "en", "Certificates are signed digitally — scan the QR on any credential to verify it."],
    ["FAQ", "hi", "सहकारी प्रमाणपत्र डिजिटल रूप से हस्ताक्षरित हैं — सत्यापन के लिए QR स्कैन करें।"],
    ["FAQ", "mr", "सहकारी प्रमाणपत्रे डिजिटल स्वाक्षरित आहेत — पडताळणीसाठी QR स्कैन करा."],
  ];
  chunks.forEach(([sourceType, lang, content], i) => {
    void db
      .insert(t.knowledgeChunks)
      .values({
        id: id(1500 + i),
        sourceType,
        sourceId: id(1500),
        lang,
        content,
      })
      .onConflictDoNothing();
  });

  // ---------------------------------------------------------------- audit rows
  const audits: [string, string, string][] = [
    ["PROGRAMME_CREATED", "programme", id(100)],
    ["NOMINATION_APPROVED", "nomination", id(200)],
    ["CREDENTIAL_ISSUED", "credential", id(1400)],
    ["EMPLOYER_VERIFIED", "employer", id(1000)],
  ];
  for (const [action, entityType, entityId] of audits) {
    await db.insert(t.auditLogs).values({
      actorId: id(11),
      action,
      entityType,
      entityId,
      after: { seeded: true },
    });
  }

  console.log(
    `seed: done — ${userSpecs.length} users, 2 programmes, 8 nominations approved, batch A, 9 lessons, 1 quiz (5Q), 15 skills, 2 jobs, 1 credential`,
  );
  return { skipped: false };
}

const isDirectRun = process.argv[1]?.includes("seed");
if (isDirectRun) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
