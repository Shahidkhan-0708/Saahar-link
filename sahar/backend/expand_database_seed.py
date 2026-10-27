import json
import datetime
from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine, Base
from backend.models import (
    User, UserRole, Institute, Programme, Batch, Enrollment, Timetable,
    Course, Module, Lesson, LessonProgress, Quiz, QuizQuestion, QuizAttempt,
    Certificate, Skill, TraineeSkill, Job, JobApplication, Device, AttendanceRecord
)
from backend.auth import hash_password
from backend.crypto import sign_credential, get_public_key_pem
from backend.matcher import ExplainableCandidateMatcher

def expand_seed():
    db: Session = SessionLocal()
    try:
        print("Expanding Sahakar-Link database with 6 comprehensive courses, trainees, skills, and jobs...")

        # 1. Fetch institute and programme
        inst1 = db.query(Institute).filter(Institute.code == "PTC-RAMPUR-01").first()
        prog = db.query(Programme).filter(Programme.code == "NCCT-PDCM-2026").first()
        batch = db.query(Batch).filter(Batch.name.like("%2026-A1%")).first()

        if not inst1 or not prog:
            print("Error: Base institute or programme not found.")
            return

        # 2. Add New Skills
        new_skill_names = [
            ("Cooperative Operations", "Operations"),
            ("Cooperative Accounting", "Accounting"),
            ("Digital Tools", "Technology"),
            ("Rural Banking", "Banking"),
            ("Day Book", "Operations"),
            ("Cooperative Governance", "Governance"),
            ("MS Office", "Technology"),
            ("Financial Literacy", "Finance"),
            ("By-laws Compliance", "Legal"),
            ("Credit Analysis", "Credit"),
            ("Data Entry", "Technology"),
            ("Loan Recovery", "Operations"),
            ("MIS & Reporting", "Analytics"),
            ("Data Analysis", "Analytics"),
            ("ERP Integration", "Technology"),
            ("Warehouse Inventory", "Logistics"),
            ("e-NWR Receipts", "Logistics"),
            ("Member KYC Verification", "Compliance")
        ]
        
        skills_map = {}
        for s in db.query(Skill).all():
            skills_map[s.name] = s

        for name, cat in new_skill_names:
            if name not in skills_map:
                sk = Skill(name=name, category=cat)
                db.add(sk)
                db.flush()
                skills_map[name] = sk

        # 3. Add Courses 2 through 6
        courses_spec = [
            {
                "code": "CRS-PACS-102",
                "title": "PACS Accounting & Bookkeeping",
                "category": "Accounting",
                "desc": "Master the complete double-entry bookkeeping cycle, daily day-book balancing, trial balance, and DCCB statutory audit compliance.",
                "thumbnail": "/assets/assessment_calc_hands.jpg",
                "modules": [
                    {
                        "title": "Module 1: Principles of Double-Entry Bookkeeping in Primary Cooperatives",
                        "lessons": [
                            {
                                "title": "Classification of Accounts & Journal Entries in PACS",
                                "duration": 25,
                                "content": "In a Primary Agricultural Credit Society (PACS), accounting follows strict double-entry principles aligned with NABARD and DCCB guidelines. Transactions are classified under Personal, Real, and Nominal accounts. Every credit given to a farmer member or cash disbursed from the vault requires immediate dual-entry debit and credit vouchers.",
                                "summary_hi": "पैक्स में लेखांकन दोहरी प्रविष्टि प्रणाली पर आधारित होता है। व्यक्तिगत, वास्तविक और नाममात्र खातों के आधार पर वाउचर तैयार किए जाते हैं।"
                            },
                            {
                                "title": "Day-Book Maintenance & Cash Balance Verification",
                                "duration": 30,
                                "content": "The Day-Book is the daily register of original entry. All cash transactions must be recorded chronologically. At day close, the closing cash in vault must physically reconcile with the computed cash balance. Any variance triggers immediate audit lock.",
                                "summary_hi": "दैनिक डे-बुक में सभी नकद लेन-देन दर्ज होते हैं। तिजोरी की नकदी और डे-बुक शेष का पूर्ण मिलान आवश्यक है।"
                            }
                        ]
                    },
                    {
                        "title": "Module 2: Financial Statements & Statutory Audit Prep",
                        "lessons": [
                            {
                                "title": "Preparation of Monthly Receipts and Disbursements (R&D) Statement",
                                "duration": 25,
                                "content": "The Receipts and Disbursements statement gives a high-level summary of capital and revenue cash flows across the cooperative month. It forms the base for submission to the District Central Cooperative Bank (DCCB).",
                                "summary_hi": "मासिक प्राप्ति एवं भुगतान विवरण जिला केंद्रीय सहकारी बैंक को प्रेषित किया जाता है।"
                            },
                            {
                                "title": "Annual Trial Balance & Godown Stock Valuation",
                                "duration": 30,
                                "content": "Before closing the cooperative financial year on March 31st, a comprehensive Trial Balance must be drawn. Godown inventory, including fertilizers and seeds, must be physically inventoried and valued at cost or net realizable value, whichever is lower.",
                                "summary_hi": "31 मार्च को वित्तीय वर्ष बंद करने से पहले ट्रायल बैलेंस और गोदाम इन्वेंटरी का सत्यापन किया जाता है।"
                            }
                        ]
                    }
                ],
                "quiz": {
                    "title": "PACS Accounting & Bookkeeping Assessment 2026",
                    "questions": [
                        {
                            "text": "Under PACS accounting rules, physical vault cash must reconcile daily with which register?",
                            "options": ["Day-Book Cash Balance", "Share Capital Ledger", "Fixed Deposit Register", "NABARD Refinance Scroll"],
                            "correct": 0,
                            "explanation": "Day-Book cash balance is verified daily against actual physical currency notes in vault."
                        },
                        {
                            "text": "Which financial statement summarizes all cash receipts and disbursements for DCCB reporting?",
                            "options": ["Balance Sheet", "Receipts and Disbursements (R&D) Statement", "Trading Account", "Loss Provisioning Register"],
                            "correct": 1,
                            "explanation": "The monthly Receipts & Disbursements (R&D) schedule is the primary cash reconciliation return."
                        }
                    ]
                }
            },
            {
                "code": "CRS-MSCS-201",
                "title": "Cooperative Society Management & Governance",
                "category": "Management",
                "desc": "In-depth understanding of the Multi-State Co-operative Societies (MSCS) Amendment Act 2023, Model Byelaws, and democratic member control.",
                "thumbnail": "/assets/course_coop_mgmt.jpg",
                "modules": [
                    {
                        "title": "Module 1: Legal Architecture & Model Byelaws 2023",
                        "lessons": [
                            {
                                "title": "Structure and Objectives of Model Byelaws for Multipurpose PACS",
                                "duration": 25,
                                "content": "Under the revolutionary Model Byelaws 2023 promoted by the Ministry of Cooperation, PACS are empowered to undertake over 25 diversified business activities, including functioning as Common Service Centres (CSCs), setting up custom hiring centres, retail petrol outlets, and Jan Aushadhi Kendras.",
                                "summary_hi": "मॉडल उप-नियम 2023 के तहत पैक्स 25 से अधिक व्यावसायिक गतिविधियां जैसे सीएससी, जन औषधि केंद्र आदि संचालित कर सकते हैं।"
                            },
                            {
                                "title": "Election Rules, Electoral College & Member Rights",
                                "duration": 20,
                                "content": "Democratic control is guaranteed through annual General Body meetings and fair Board elections. Active members who transact with the society for minimum threshold values have voting rights under the Cooperative Societies Act.",
                                "summary_hi": "सहकारी समितियों में लोकतांत्रिक नियंत्रण सुनिश्चित करने के लिए वार्षिक आम सभा और पारदर्शी चुनाव अनिवार्य हैं।"
                            }
                        ]
                    },
                    {
                        "title": "Module 2: Statutory Committees & Compliance",
                        "lessons": [
                            {
                                "title": "Cooperative Audit Committee & Grievance Redressal Mechanism",
                                "duration": 25,
                                "content": "Every cooperative society must constitute an Audit Committee and a Member Grievance Redressal Committee to hear and resolve member complaints within 30 days.",
                                "summary_hi": "सदस्यों की शिकायतों के 30 दिनों में निवारण के लिए शिकायत निवारण समिति का गठन आवश्यक है।"
                            }
                        ]
                    }
                ],
                "quiz": {
                    "title": "Cooperative Governance & Byelaws Assessment 2026",
                    "questions": [
                        {
                            "text": "How many diversified business activities are permitted under Model Byelaws 2023?",
                            "options": ["Up to 5 activities", "Over 25 business activities", "Only credit disbursal", "Maximum 10 activities"],
                            "correct": 1,
                            "explanation": "Model Byelaws 2023 allow over 25 diversified lines of rural commerce."
                        },
                        {
                            "text": "Member grievances must be formally resolved within how many days by the statutory committee?",
                            "options": ["15 days", "30 days", "60 days", "90 days"],
                            "correct": 1,
                            "explanation": "Statutory grievance redressal rules require disposal within 30 calendar days."
                        }
                    ]
                }
            },
            {
                "code": "CRS-RBNK-202",
                "title": "Rural Banking & Credit Operations",
                "category": "Banking",
                "desc": "Master Kisan Credit Card (KCC) limit calculation, NABARD Scale of Finance, Modified Interest Subvention Scheme (MISS), and prompt repayment incentives.",
                "thumbnail": "/assets/popular_c2.jpg",
                "modules": [
                    {
                        "title": "Module 1: KCC Limits & Scale of Finance (SoF)",
                        "lessons": [
                            {
                                "title": "District Level Technical Committee (DLTC) Scale of Finance Calculation",
                                "duration": 30,
                                "content": "The Scale of Finance is determined district-wise by the DLTC for each crop. KCC credit limits are calculated as: (Crop acreage * Scale of Finance) + 10% post-harvest/household expenses + 20% maintenance of farm assets.",
                                "summary_hi": "डीएलटीसी द्वारा प्रत्येक फसल के लिए वित्तीय पैमाना तय किया जाता है, जिसके आधार पर केसीसी सीमा निर्धारित होती है।"
                            },
                            {
                                "title": "Modified Interest Subvention Scheme (MISS) Claims Protocol",
                                "duration": 25,
                                "content": "Short-term crop loans up to ₹3,00,000 carry a benchmark interest of 7% p.a. The Government provides a 1.5% subvention to lending institutions. When the beneficiary farmer repays on or before the due date, an additional 3% Prompt Repayment Incentive (PRI) is credited, lowering net interest to 4.0% p.a.",
                                "summary_hi": "केसीसी ऋणों पर समय पर भुगतान करने वाले किसानों को 3% अतिरिक्त प्रोत्साहन मिलता है, जिससे प्रभावी ब्याज केवल 4% रह जाता है।"
                            }
                        ]
                    },
                    {
                        "title": "Module 2: Credit Appraisal & Recovery Management",
                        "lessons": [
                            {
                                "title": "Member Land Record (RoR) Verification & Collateral Assessment",
                                "duration": 25,
                                "content": "Verification of digital land records (Record of Rights / Bhulekh) is essential before sanctioning crop loans. Mortgages or charges on land must be recorded on the state land revenue portal.",
                                "summary_hi": "ऋण स्वीकृत करने से पूर्व डिजिटल भूलेख और खतौनी का सत्यापन अनिवार्य है।"
                            }
                        ]
                    }
                ],
                "quiz": {
                    "title": "NABARD MISS & Rural Banking Assessment 2026",
                    "questions": [
                        {
                            "text": "What is the effective annual interest rate for farmers who repay KCC crop loans promptly within 365 days?",
                            "options": ["7.0% p.a.", "4.0% p.a.", "3.0% p.a.", "5.5% p.a."],
                            "correct": 1,
                            "explanation": "Benchmark 7% minus 3% prompt repayment incentive results in 4.0% net rate."
                        },
                        {
                            "text": "What percentage component is added for post-harvest/household consumption when computing KCC limit?",
                            "options": ["5%", "10%", "20%", "25%"],
                            "correct": 1,
                            "explanation": "10% is added for post-harvest household consumption under RBI/NABARD master circular."
                        }
                    ]
                }
            },
            {
                "code": "CRS-DIGI-103",
                "title": "Digital Tools for PACS",
                "category": "Digital Technology",
                "desc": "Deploy and operate rugged edge biometric kiosks, offline-first attendance gateways, MobileFaceNet INT8 neural inference, and tamper-proof SHA-256 local queues.",
                "thumbnail": "/assets/course_digital_tools.jpg",
                "modules": [
                    {
                        "title": "Module 1: Edge Hardware & Offline-First Architecture",
                        "lessons": [
                            {
                                "title": "Biometric Doorway Kiosks & Smart Attendance Devices",
                                "duration": 25,
                                "content": "Sahakar-Link edge kiosks feature INT8 quantized MobileFaceNet neural inference capable of face verification in under 80 milliseconds on ARM tablets without active internet connectivity. Multi-modal fallbacks include NFC and dynamic QR code scanning.",
                                "summary_hi": "सहकार-लिंक एज कियोस्क बिना इंटरनेट के 80 मिलीसेकंड में फेस रिकग्निशन और उपस्थिति दर्ज करते हैं।"
                            },
                            {
                                "title": "Cryptographic Offline Queue & NVRAM Block Chaining",
                                "duration": 25,
                                "content": "When rural network connectivity drops, attendance transactions are signed and appended to a local SHA-256 hash-chained SQLite journal. When connectivity resumes, events batch-sync to the central server with zero duplicate entries.",
                                "summary_hi": "ऑफलाइन उपस्थिति रिकॉर्ड को एसएचए-256 हैश-चेन से सुरक्षित किया जाता है और नेटवर्क आने पर सर्वर से सिंक किया जाता है।"
                            }
                        ]
                    },
                    {
                        "title": "Module 2: National PACS ERP & Common Software Interface",
                        "lessons": [
                            {
                                "title": "Cloud Ledger Synchronization and DCCB Core Banking System Integration",
                                "duration": 20,
                                "content": "The National PACS Software connects rural societies directly with DCCB Core Banking Solution (CBS). Daily Day-Book closings push end-of-day balances to DCCB via secure ISO-8583 and REST APIs.",
                                "summary_hi": "राष्ट्रीय पैक्स सॉफ्टवेयर जिला सहकारी बैंक के कोर बैंकिंग सिस्टम से सीधा जुड़ा होता है।"
                            }
                        ]
                    }
                ],
                "quiz": {
                    "title": "Digital Tools & Edge Biometrics Assessment 2026",
                    "questions": [
                        {
                            "text": "What is the edge neural inference latency target for offline facial authentication in Sahakar-Link kiosks?",
                            "options": ["Under 80 milliseconds", "Over 5 seconds", "1500 milliseconds", "10 seconds"],
                            "correct": 0,
                            "explanation": "MobileFaceNet INT8 quantized models execute inference in <80ms on edge hardware."
                        },
                        {
                            "text": "How are offline attendance events cryptographically secured before network synchronization?",
                            "options": ["Plain text files", "SHA-256 hash-chained encrypted block queue", "Unsorted memory buffer", "Unsigned CSV records"],
                            "correct": 1,
                            "explanation": "Each offline event contains a SHA-256 hash of the preceding event, preventing tampering."
                        }
                    ]
                }
            },
            {
                "code": "CRS-AGRI-204",
                "title": "Cooperative Warehouse & Value Chain",
                "category": "Logistics & Warehousing",
                "desc": "Standards for WDRA-accredited cooperative warehouses, electronic Negotiable Warehouse Receipts (e-NWR), cold storage management, and fertilizer supply chains.",
                "thumbnail": "/assets/popular_c3.jpg",
                "modules": [
                    {
                        "title": "Module 1: WDRA Warehousing Standards & Electronic Receipts",
                        "lessons": [
                            {
                                "title": "Warehousing Development and Regulatory Authority (WDRA) Accreditation Criteria",
                                "duration": 30,
                                "content": "To qualify as an accredited warehouse, PACS godowns must satisfy WDRA norms regarding structure, ventilation, fire safety, insurance, and moisture measurement. WDRA accreditation enables farmers to store produce and avoid distress sales during harvest glut.",
                                "summary_hi": "डब्ल्यूडीआरए मान्यता प्राप्त पैक्स गोदामों में किसान अपनी फसल सुरक्षित रख सकते हैं और संकटकालीन बिक्री से बच सकते हैं।"
                            },
                            {
                                "title": "Issuing e-NWR & Pledging for DCCB Working Capital Loans",
                                "duration": 25,
                                "content": "Electronic Negotiable Warehouse Receipts (e-NWR) are registered in the electronic repositories (NERL/CCRL). Farmers can pledge e-NWRs to obtain pledge finance up to 75% of produce value from DCCBs without moving the commodity.",
                                "summary_hi": "ई-एनडब्ल्यूआर रसीद के आधार पर किसान बैंक से 75% तक ऋण प्राप्त कर सकते हैं।"
                            }
                        ]
                    },
                    {
                        "title": "Module 2: Supply Chain Operations & Direct Procurement",
                        "lessons": [
                            {
                                "title": "Fertilizer Direct Benefit Transfer (DBT) POS Operations & Bulk Procurement",
                                "duration": 25,
                                "content": "PACS manage fertilizer distribution through Aadhaar-enabled Point of Sale (PoS) machines under DBT. Bulk procurement from IFFCO and KRIBHCO ensures timely supply of urea and DAP to smallholders.",
                                "summary_hi": "पैक्स पीओएस मशीनों के माध्यम से आधार प्रमाणित उर्वरक वितरण और पारदर्शी आपूर्ति सुनिश्चित करते हैं।"
                            }
                        ]
                    }
                ],
                "quiz": {
                    "title": "Warehouse Management & e-NWR Assessment 2026",
                    "questions": [
                        {
                            "text": "What financial instrument enables farmers to obtain pledge financing against stored produce in WDRA warehouses?",
                            "options": ["Paper slip", "Electronic Negotiable Warehouse Receipt (e-NWR)", "Post-dated cheque", "Handwritten bill"],
                            "correct": 1,
                            "explanation": "e-NWR registered in central repository serves as recognized legal pledge collateral."
                        },
                        {
                            "text": "What percentage of stored commodity value can typically be sanctioned as pledge finance?",
                            "options": ["Up to 75%", "Only 25%", "100%", "50% max"],
                            "correct": 0,
                            "explanation": "Banks sanction up to 75% of market value against accredited e-NWRs."
                        }
                    ]
                }
            }
        ]

        created_courses = {}
        for cspec in courses_spec:
            existing_c = db.query(Course).filter(Course.code == cspec["code"]).first()
            if not existing_c:
                c = Course(
                    programme_id=prog.id,
                    title=cspec["title"],
                    code=cspec["code"],
                    description=cspec["desc"],
                    thumbnail=cspec["thumbnail"],
                    total_lessons=sum(len(m["lessons"]) for m in cspec["modules"]),
                    category=cspec["category"]
                )
                db.add(c)
                db.flush()
                print(f"Added Course: {c.title} ({c.code})")

                for m_idx, mspec in enumerate(cspec["modules"], 1):
                    mod = Module(course_id=c.id, title=mspec["title"], order=m_idx)
                    db.add(mod)
                    db.flush()

                    for l_idx, lspec in enumerate(mspec["lessons"], 1):
                        les = Lesson(
                            module_id=mod.id,
                            title=lspec["title"],
                            order=l_idx,
                            duration_minutes=lspec["duration"],
                            content_text=lspec["content"],
                            summary_hi=lspec["summary_hi"],
                            audio_url="https://actions.google.com/sounds/v1/ambiences/office_working.ogg"
                        )
                        db.add(les)
                        db.flush()

                # Add Quiz
                qspec = cspec["quiz"]
                qz = Quiz(course_id=c.id, title=qspec["title"], passing_score=70)
                db.add(qz)
                db.flush()

                for qitem in qspec["questions"]:
                    qq = QuizQuestion(
                        quiz_id=qz.id,
                        question_text=qitem["text"],
                        options_json=json.dumps(qitem["options"]),
                        correct_answer_index=qitem["correct"],
                        explanation=qitem["explanation"]
                    )
                    db.add(qq)
                db.flush()
                created_courses[cspec["code"]] = c
            else:
                created_courses[cspec["code"]] = existing_c

        # 4. Add Additional Candidates / Trainees (Rohit, Priya, Amit, Neha)
        candidates_to_add = [
            {
                "email": "rohit.kumar@sahakarlink.gov.in",
                "name": "Rohit Kumar",
                "phone": "+91 98351 44820",
                "location": "Ranchi, Jharkhand",
                "pacs": "Ranchi Primary Agricultural Cooperative",
                "avatar": "/assets/rohit_kumar.jpg",
                "completed_courses": ["CRS-PACS-102", "CRS-DIGI-103"],
                "cert_course": "CRS-PACS-102",
                "skills": ["Cooperative Operations", "Cooperative Accounting", "Digital Tools", "Rural Banking", "Day Book"],
                "score": 92.0
            },
            {
                "email": "priya.kumari@sahakarlink.gov.in",
                "name": "Priya Kumari",
                "phone": "+91 94311 88392",
                "location": "Ranchi, Jharkhand",
                "pacs": "Ranchi District Cooperative Union",
                "avatar": "/assets/priya_kumari.jpg",
                "completed_courses": ["CRS-MSCS-201"],
                "cert_course": "CRS-MSCS-201",
                "skills": ["Cooperative Governance", "MS Office", "Financial Literacy", "By-laws Compliance"],
                "score": 88.0
            },
            {
                "email": "amit.verma@sahakarlink.gov.in",
                "name": "Amit Verma",
                "phone": "+91 98350 12948",
                "location": "Patna, Bihar",
                "pacs": "Patna Cooperative Credit Society",
                "avatar": "/assets/amit_verma.jpg",
                "completed_courses": ["CRS-RBNK-202"],
                "cert_course": "CRS-RBNK-202",
                "skills": ["Credit Analysis", "Digital Tools", "Data Entry", "Loan Recovery"],
                "score": 84.0
            },
            {
                "email": "neha.singh@sahakarlink.gov.in",
                "name": "Neha Singh",
                "phone": "+91 97210 55431",
                "location": "Lucknow, Uttar Pradesh",
                "pacs": "Lucknow Apex Cooperative Bank",
                "avatar": "/assets/neha_singh.jpg",
                "completed_courses": ["CRS-DIGI-103"],
                "cert_course": "CRS-DIGI-103",
                "skills": ["MIS & Reporting", "Data Analysis", "ERP Integration", "Day Book"],
                "score": 90.0
            }
        ]

        pub_pem = get_public_key_pem()

        for cand in candidates_to_add:
            user = db.query(User).filter(User.email == cand["email"]).first()
            if not user:
                user = User(
                    email=cand["email"],
                    hashed_password=hash_password("password123"),
                    full_name=cand["name"],
                    role=UserRole.TRAINEE,
                    phone=cand["phone"],
                    location=cand["location"],
                    institute_id=inst1.id,
                    pacs_name=cand["pacs"],
                    avatar_url=cand["avatar"]
                )
                db.add(user)
                db.flush()
                print(f"Added Trainee: {user.full_name} ({user.email})")

                # Enrollment
                enroll = Enrollment(
                    trainee_id=user.id,
                    batch_id=batch.id,
                    status="ACTIVE",
                    enrolled_at=datetime.datetime.utcnow() - datetime.timedelta(days=20)
                )
                db.add(enroll)

                # Mark completed courses lessons
                for ccode in cand["completed_courses"]:
                    c_obj = db.query(Course).filter(Course.code == ccode).first()
                    if c_obj:
                        for mod in c_obj.modules:
                            for les in mod.lessons:
                                lp = LessonProgress(
                                    trainee_id=user.id,
                                    lesson_id=les.id,
                                    completed=True,
                                    completed_at=datetime.datetime.utcnow() - datetime.timedelta(days=3)
                                )
                                db.add(lp)

                # Add Certificate
                cert_c = db.query(Course).filter(Course.code == cand["cert_course"]).first()
                if cert_c:
                    cert_code = f"CERT-NCCT-2026-{user.full_name[:3].upper()}{user.id:03d}"
                    cert_payload = {
                        "cert_id": cert_code,
                        "trainee_name": user.full_name,
                        "trainee_id": user.id,
                        "course_title": cert_c.title,
                        "institute": "PACS Training Centre – Rampur",
                        "grade": "Distinction" if cand["score"] >= 90 else "First Class",
                        "score": cand["score"],
                        "issued_by": "National Council for Cooperative Training (NCCT)",
                        "issue_date": (datetime.datetime.utcnow() - datetime.timedelta(days=2)).strftime("%Y-%m-%d")
                    }
                    sig = sign_credential(cert_payload)
                    c_rec = Certificate(
                        certificate_id=cert_code,
                        trainee_id=user.id,
                        course_id=cert_c.id,
                        issue_date=datetime.datetime.utcnow() - datetime.timedelta(days=2),
                        issuer_name="National Council for Cooperative Training (NCCT)",
                        grade="Distinction" if cand["score"] >= 90 else "First Class",
                        score=cand["score"],
                        ed25519_signature=sig,
                        public_key_pem=pub_pem,
                        verification_url=f"http://localhost:8000/api/certificates/verify/{cert_code}",
                        metadata_json=json.dumps(cert_payload)
                    )
                    db.add(c_rec)
                    db.flush()

                    # Skills
                    for sk_name in cand["skills"]:
                        sk_obj = skills_map.get(sk_name)
                        if sk_obj:
                            ts = TraineeSkill(
                                trainee_id=user.id,
                                skill_id=sk_obj.id,
                                proficiency_level=5 if cand["score"] >= 90 else 4,
                                verified=True,
                                verified_by_cert_id=cert_code
                            )
                            db.add(ts)

        # Seed legacy SS2025 certificates with authentic Ed25519 signatures
        legacy_certs = [
            {
                "id": "SS2025PAC500873",
                "title": "PACS Operations and Management",
                "grade": "Distinction",
                "score": 90.0,
                "course_code": "CRS-PACS-101",
                "date": "2025-09-15"
            },
            {
                "id": "SS2025GOV388219",
                "title": "Cooperative Governance",
                "grade": "First Class",
                "score": 87.0,
                "course_code": "CRS-MSCS-201",
                "date": "2025-08-22"
            },
            {
                "id": "SS2025DIG109283",
                "title": "Digital Tools for Cooperatives",
                "grade": "First Class",
                "score": 85.0,
                "course_code": "CRS-DIGI-103",
                "date": "2025-08-10"
            },
            {
                "id": "SS2025BNK771204",
                "title": "Rural Banking & Credit Operations",
                "grade": "Distinction",
                "score": 92.0,
                "course_code": "CRS-RBNK-202",
                "date": "2025-07-28"
            }
        ]
        ramesh = db.query(User).filter(User.email == "ramesh.kumar@sahakarlink.gov.in").first()
        rohit = db.query(User).filter(User.email == "rohit.kumar@sahakarlink.gov.in").first()
        target_trainee = rohit if rohit else ramesh

        if target_trainee:
            for lcert in legacy_certs:
                if not db.query(Certificate).filter(Certificate.certificate_id == lcert["id"]).first():
                    c_crs = db.query(Course).filter(Course.code == lcert["course_code"]).first()
                    crs_id = c_crs.id if c_crs else 1
                    cert_payload = {
                        "cert_id": lcert["id"],
                        "trainee_name": target_trainee.full_name,
                        "trainee_id": target_trainee.id,
                        "course_title": lcert["title"],
                        "institute": "PACS Training Centre - Rampur",
                        "grade": lcert["grade"],
                        "score": lcert["score"],
                        "issued_by": "National Council for Cooperative Training (NCCT)",
                        "issue_date": lcert["date"]
                    }
                    sig = sign_credential(cert_payload)
                    db_cert = Certificate(
                        certificate_id=lcert["id"],
                        trainee_id=target_trainee.id,
                        course_id=crs_id,
                        issue_date=datetime.datetime.strptime(lcert["date"], "%Y-%m-%d"),
                        issuer_name="National Council for Cooperative Training (NCCT)",
                        grade=lcert["grade"],
                        score=lcert["score"],
                        ed25519_signature=sig,
                        public_key_pem=pub_pem,
                        verification_url=f"http://localhost:8000/api/certificates/verify/{lcert['id']}",
                        metadata_json=json.dumps(cert_payload)
                    )
                    db.add(db_cert)
                    print(f"Added legacy cert: {lcert['id']} for {target_trainee.full_name}")

        # 5. Add 3 Additional Job Postings matching JobOpportunitiesPage
        recruiter = db.query(User).filter(User.role == UserRole.RECRUITER).first()
        if recruiter:
            jobs_to_seed = [
                {
                    "title": "PACS Operations & Accounting Manager",
                    "pacs_name": "Jharkhand Rajya Sahakari Bank",
                    "location": "Ranchi, Jharkhand",
                    "salary_range": "₹30,000 - ₹42,000 / month",
                    "description": "Lead day-to-day PACS double-entry accounting, DCCB core banking integration, day-book cash reconciliation, and cooperative byelaw compliance.",
                    "skills": ["Cooperative Operations", "Cooperative Accounting", "Digital Tools", "Day Book"],
                    "min_exp": 1.0
                },
                {
                    "title": "Rural Banking & Credit Executive",
                    "pacs_name": "NABARD Partner DCCB",
                    "location": "Hazaribagh, Jharkhand",
                    "salary_range": "₹28,000 - ₹38,000 / month",
                    "description": "Appraise Kisan Credit Card (KCC) limits, calculate prompt repayment subventions, and verify agricultural land records for member farmers.",
                    "skills": ["Rural Banking", "Credit Analysis", "Loan Recovery", "Member KYC Verification"],
                    "min_exp": 0.5
                },
                {
                    "title": "Data Entry & ERP Operator",
                    "pacs_name": "Primary Agricultural Credit Society (PACS)",
                    "location": "Godda, Jharkhand",
                    "salary_range": "₹18,000 - ₹25,000 / month",
                    "description": "Operate the National PACS computerized software, digitize daily member passbooks, and synchronize offline biometric attendance queues.",
                    "skills": ["Digital Tools", "Data Entry", "Day Book", "MIS & Reporting"],
                    "min_exp": 0.0
                }
            ]

            for jspec in jobs_to_seed:
                existing_j = db.query(Job).filter(Job.title == jspec["title"], Job.location == jspec["location"]).first()
                if not existing_j:
                    new_job = Job(
                        employer_id=recruiter.id,
                        pacs_name=jspec["pacs_name"],
                        title=jspec["title"],
                        location=jspec["location"],
                        salary_range=jspec["salary_range"],
                        description=jspec["description"],
                        required_skills_json=json.dumps(jspec["skills"]),
                        min_experience_years=jspec["min_exp"],
                        status="OPEN"
                    )
                    db.add(new_job)
                    db.flush()
                    print(f"Added Job: {new_job.title} at {new_job.pacs_name}")

        db.commit()
        print("Expansion successfully committed to SQLite database!")
    except Exception as e:
        db.rollback()
        print(f"Error during expand_seed: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    expand_seed()
