import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  Briefcase, GraduationCap, Camera, ShieldCheck, Calculator, 
  ArrowRight, MapPin, Building2, BookOpen, CheckCircle2, 
  Play, X, ArrowUpRight, Clock, Award, Users, ChevronRight
} from 'lucide-react';

export default function LandingPage() {
  const { switchRole, setIsKioskOpen, setIsErpSandboxOpen } = useApp();
  const navigate = useNavigate();
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  const featuredJobs = [
    {
      id: 'job-1',
      title: 'PACS Chief Accountant',
      org: 'Jharkhand Rajya Sahakari Bank',
      loc: 'Ranchi, Jharkhand',
      salary: '₹3.5 - 4.5 LPA',
      type: 'Full Time',
      badge: 'Urgent Hiring',
      skills: ['PACS Accounting', 'Day Book', 'KCC Loans']
    },
    {
      id: 'job-2',
      title: 'Cooperative Field Officer',
      org: 'District Cooperative Office',
      loc: 'Dumka, Jharkhand',
      salary: '₹4.0 - 6.0 LPA',
      type: 'Full Time',
      badge: 'Verified Vacancy',
      skills: ['Field Operations', 'Member Mobilization', 'By-laws']
    },
    {
      id: 'job-3',
      title: 'Rural Banking Executive',
      org: 'Primary Agricultural Credit Society',
      loc: 'Godda, Jharkhand',
      salary: '₹2.5 - 3.5 LPA',
      type: 'Full Time',
      badge: 'Entry Level',
      skills: ['Digital Tools', 'Cash Balancing', 'MIS Reports']
    }
  ];

  const featuredCourses = [
    {
      id: 'course-1',
      title: 'PACS Operations and Accounting',
      duration: '40 Hours',
      level: 'Accredited',
      image: '/assets/course_coop_mgmt.jpg',
      category: 'Accounting'
    },
    {
      id: 'course-2',
      title: 'KCC Loan Appraisal & NABARD Compliance',
      duration: '30 Hours',
      level: 'Practical Lab',
      image: '/assets/popular_c1.jpg',
      category: 'Rural Credit'
    },
    {
      id: 'course-3',
      title: 'Model Byelaws 2023 & Cooperative Governance',
      duration: '24 Hours',
      level: 'Statutory',
      image: '/assets/popular_c2.jpg',
      category: 'Governance'
    }
  ];

  return (
    <div className="bg-[#F8FAFC] min-h-screen text-slate-800">

      {/* 
        ==================================================
        1. CLEAN TWO-COLUMN HERO SECTION
        Direct, human headline, 2-sentence description,
        instant CTAs to Jobs & Courses, and a 4-feature quick-access hub
        ==================================================
      */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-16 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Direct Value Proposition */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Clean Institutional Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs text-slate-700 font-medium shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span className="font-semibold text-slate-900">Ministry of Cooperation, Government of India</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">SIH #26087</span>
            </div>

            {/* Clear, Human Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
              Cooperative Skill Training & Direct Job Placement
            </h1>

            {/* Straightforward 2-Sentence Description */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              Learn computerized PACS operations, earn tamper-proof credentials, and apply directly to open positions at cooperative banks and societies across India.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/jobs"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-xs transition flex items-center gap-2 text-sm cursor-pointer"
              >
                <Briefcase size={17} />
                <span>Explore Job Openings</span>
                <ArrowRight size={16} />
              </Link>

              <Link
                to="/learning"
                className="bg-white hover:bg-slate-50 text-slate-800 font-semibold px-5 py-3 rounded-xl border border-slate-300 shadow-2xs transition flex items-center gap-2 text-sm cursor-pointer"
              >
                <BookOpen size={17} className="text-blue-600" />
                <span>Browse Courses</span>
              </Link>

              <button
                onClick={() => setIsKioskOpen(true)}
                className="px-4 py-3 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition flex items-center gap-2 text-sm font-semibold cursor-pointer"
              >
                <Camera size={17} className="text-amber-600" />
                <span>Doorway Kiosk</span>
              </button>

              <button
                onClick={() => setIsErpSandboxOpen(true)}
                className="px-4 py-3 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition flex items-center gap-2 text-sm font-semibold cursor-pointer"
              >
                <Calculator size={17} className="text-blue-600" />
                <span>ERP Sandbox</span>
              </button>
            </div>

            {/* Direct Trust Highlights */}
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 border-t border-slate-200/80">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-blue-600 shrink-0" />
                <span>120+ Active Cooperative Jobs</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-blue-600 shrink-0" />
                <span>NCCT Accredited Certifications</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-blue-600 shrink-0" />
                <span>Instant QR Public Verification</span>
              </div>
            </div>

          </div>

          {/* Right Column: "Quick Access" Feature Hub */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-4">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">What would you like to do?</h2>
                  <p className="text-xs text-slate-500">Direct 1-click access to all platform tools</p>
                </div>
                <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Quick Access
                </span>
              </div>

              {/* 4 Large Clickable Action Tiles */}
              <div className="space-y-2.5">
                
                {/* Tile 1: Jobs */}
                <Link
                  to="/jobs"
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                      <Briefcase size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">
                        Find Cooperative Jobs
                      </h3>
                      <p className="text-xs text-slate-500">
                        PACS Accountants, Field Officers & Managers
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition shrink-0" />
                </Link>

                {/* Tile 2: Courses */}
                <Link
                  to="/learning"
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                      <GraduationCap size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">
                        Browse Training Courses
                      </h3>
                      <p className="text-xs text-slate-500">
                        PACS ERP, day-book balancing & loan appraisal
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition shrink-0" />
                </Link>

                {/* Tile 3: Kiosk */}
                <button
                  onClick={() => setIsKioskOpen(true)}
                  className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/30 transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                      <Camera size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition">
                        Doorway Attendance Kiosk
                      </h3>
                      <p className="text-xs text-slate-500">
                        Test offline biometric face check-in
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 group-hover:text-amber-700 group-hover:translate-x-0.5 transition shrink-0" />
                </button>

                {/* Tile 4: Verifier */}
                <Link
                  to="/verify"
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/30 transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition">
                        Verify a Certificate
                      </h3>
                      <p className="text-xs text-slate-500">
                        Zero-login public cryptographic check
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 group-hover:text-purple-700 group-hover:translate-x-0.5 transition shrink-0" />
                </Link>

                {/* Tile 5: PACS ERP Sandbox */}
                <button
                  onClick={() => setIsErpSandboxOpen(true)}
                  className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                      <Calculator size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition">
                        Interactive PACS ERP Sandbox
                      </h3>
                      <p className="text-xs text-slate-500">
                        Practice 5-step day-book closing & KCC loans
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition shrink-0" />
                </button>

              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 
        ==================================================
        2. FEATURED COOPERATIVE VACANCIES
        Users who want jobs see actual opportunities right away
        ==================================================
      */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-10 max-w-7xl mx-auto border-t border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Latest Cooperative Job Vacancies
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Verified openings from District Cooperative Banks and village credit societies
            </p>
          </div>
          <Link
            to="/jobs"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>View All 120+ Jobs</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {featuredJobs.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-blue-500 hover:shadow-xs transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    {job.badge}
                  </span>
                  <span className="text-xs font-bold text-slate-900">{job.salary}</span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">{job.title}</h3>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">{job.org}</p>
                </div>

                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <MapPin size={13} className="text-slate-400 shrink-0" />
                  <span>{job.loc}</span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {job.skills.map((s, idx) => (
                    <span key={idx} className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">{job.type}</span>
                <Link
                  to="/jobs"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
                >
                  Apply Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 
        ==================================================
        3. POPULAR ACCREDITED TRAINING MODULES
        ==================================================
      */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-10 max-w-7xl mx-auto border-t border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Popular NCCT Training Courses
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Standardized practical curriculum for 79,630 computerized primary societies
            </p>
          </div>
          <Link
            to="/learning"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>View All Courses</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {featuredCourses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:border-blue-400 hover:shadow-xs transition flex flex-col justify-between"
            >
              <div>
                <div className="h-36 w-full bg-slate-100 overflow-hidden">
                  <img
                    src={course.image}
                    alt={course.title}
                    className="w-full h-full object-cover hover:scale-105 transition duration-300"
                  />
                </div>
                <div className="p-5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {course.category}
                    </span>
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock size={12} />
                      {course.duration}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {course.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Accredited certification with practical ERP accounting labs.
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0">
                <Link
                  to="/learning"
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
                >
                  <span>Start Course</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 
        ==================================================
        4. HOW THE PLATFORM WORKS (3 CLEAN STEPS)
        ==================================================
      */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-12 max-w-7xl mx-auto border-t border-slate-200">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            How Sahakar-Link Works
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            A simple three-step journey from rural classroom training to verified employment
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm">
              1
            </div>
            <h3 className="text-base font-bold text-slate-900">Practical PACS Training</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Enroll in 22 interactive modules covering computerized double-entry accounting, day-book balancing, and KCC loan disbursements.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm">
              2
            </div>
            <h3 className="text-base font-bold text-slate-900">Tamper-Proof Certification</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Pass your practical assessment to earn an Ed25519 digitally signed credential verifiable offline via 2D QR with zero gas cost.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 font-bold flex items-center justify-center text-sm">
              3
            </div>
            <h3 className="text-base font-bold text-slate-900">Direct Cadre Recruitment</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              District Central Cooperative Banks (DCCBs) and village societies discover and hire certified talent through transparent match ranking.
            </p>
          </div>

        </div>
      </section>

      {/* 
        ==================================================
        5. INSTITUTIONAL FOOTER
        ==================================================
      */}
      <footer className="w-full bg-white border-t border-slate-200 py-10 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <img src="/assets/emblem.png" alt="Government Emblem" className="h-9 w-auto" />
              <div>
                <h4 className="text-sm font-bold text-slate-900">Sahakar-Link</h4>
                <p className="text-xs text-slate-500">Ministry of Cooperation, Government of India</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-600">
              <Link to="/jobs" className="hover:text-blue-600 transition">Job Opportunities</Link>
              <Link to="/learning" className="hover:text-blue-600 transition">Training Courses</Link>
              <button onClick={() => setIsKioskOpen(true)} className="hover:text-blue-600 transition cursor-pointer">Doorway Kiosk</button>
              <Link to="/verify" className="hover:text-blue-600 transition">Verify Certificate</Link>
              <Link to="/admin" className="hover:text-blue-600 transition">Admin Dashboard</Link>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <p>Smart India Hackathon 2026 • Problem Statement ID: 26087</p>
            <p>Compliant with W3C Verifiable Credentials & DPDP Act 2023</p>
          </div>
        </div>
      </footer>

      {/* Video Modal */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-xl w-full overflow-hidden shadow-xl border border-slate-700">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between text-white">
              <span className="text-sm font-bold">Sahakar-Link Overview</span>
              <button onClick={() => setVideoModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center relative">
              <img src="/assets/lesson_video.jpg" alt="Video preview" className="w-full h-full object-cover opacity-80" />
            </div>
            <div className="p-4 bg-slate-950 flex justify-end">
              <button
                onClick={() => setVideoModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
