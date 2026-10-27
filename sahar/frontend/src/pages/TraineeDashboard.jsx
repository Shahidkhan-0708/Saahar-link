import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { lmsApi, attendanceApi, analyticsApi } from '../services/api';
import PageBanner from '../components/common/PageBanner';
import ProgressRing from '../components/common/ProgressRing';
import {
  Flame, Calendar, MapPin, CheckCircle2, Lock, ArrowRight, Calculator,
  Send, Bot, BookOpen, Clock, FileText, ChevronRight, Award, Edit3,
  Camera, ShieldCheck, Sparkles, User, ExternalLink
} from 'lucide-react';

export default function TraineeDashboard() {
  const { currentUser, showToast, setIsAiCoachOpen, setIsKioskOpen, setIsErpSandboxOpen } = useApp();
  const navigate = useNavigate();
  const [aiInput, setAiInput] = useState('');
  const [courses, setCourses] = useState([]);
  const [activeCourse, setActiveCourse] = useState(null);
  const [dashboardMetrics, setDashboardMetrics] = useState({
    streakDays: 14,
    attendanceRate: 92,
    presentDays: 23,
    totalDays: 25,
    completedModules: 6,
    totalModules: 10
  });

  useEffect(() => {
    // 1. Fetch live courses from LMS
    lmsApi.getCourses().then(res => {
      if (Array.isArray(res) && res.length > 0) {
        setCourses(res);
        const inProgress = res.find(c => c.progress_percentage > 0 && c.progress_percentage < 100);
        setActiveCourse(inProgress || res[0]);
      }
    }).catch(err => console.warn('LMS courses fetch note:', err.message));

    // 2. Fetch live attendance history
    attendanceApi.getMyHistory().then(history => {
      if (Array.isArray(history) && history.length > 0) {
        const verifiedCount = history.filter(h => h.verified || h.sync_status === 'SYNCED').length;
        setDashboardMetrics(prev => ({
          ...prev,
          presentDays: verifiedCount,
          totalDays: Math.max(verifiedCount + 2, 20),
          attendanceRate: Math.min(100, Math.round((verifiedCount / Math.max(verifiedCount + 2, 20)) * 100))
        }));
      }
    }).catch(err => console.warn('Attendance history fetch note:', err.message));
  }, []);

  const handleAiSend = (e) => {
    e?.preventDefault();
    if (!aiInput.trim()) return;
    navigate('/career', { state: { initialPrompt: aiInput } });
  };

  const handlePromptClick = (prompt) => {
    navigate('/career', { state: { initialPrompt: prompt } });
  };

  return (
    <div className="space-y-6 max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-2">

      {/* 
        ==================================================
        1. CONSOLIDATED TRAINEE COMMAND HEADER
        (Replaces separate profile card & streak card with unified bar)
        ==================================================
      */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Left: Trainee Identity Details */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative shrink-0">
              <img
                src={currentUser?.avatar || '/assets/rohit_kumar.jpg'}
                alt={currentUser?.name || 'Ramesh Kumar'}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[#2563EB]/30 shadow-xs"
                onError={(e) => {
                  e.target.src = '/assets/clean_hero_photo.jpg';
                }}
              />
              <button 
                onClick={() => navigate('/profile')}
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#2563EB] hover:bg-[#1E40AF] text-white rounded-full flex items-center justify-center shadow-xs transition cursor-pointer"
                title="Edit Profile"
              >
                <Edit3 size={11} />
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {currentUser?.name || 'Ramesh Kumar'}
                </h1>
                <span className="text-[10px] font-mono font-bold text-[#2563EB] bg-[#E8F5F3] px-2 py-0.5 rounded-md border border-[#2563EB]/20">
                  {currentUser?.traineeId || 'SL202604812'}
                </span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  ACTIVE ENROLLMENT
                </span>
              </div>

              <p className="text-xs font-semibold text-[#2563EB]">
                {currentUser?.programme || 'PACS Management Programme'}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-0.5">
                <span className="flex items-center gap-1">
                  <MapPin size={12} className="text-[#2563EB]" />
                  <span>{currentUser?.centre || 'PACS Training Centre, Ranchi, Jharkhand'}</span>
                </span>
                <span>•</span>
                <span>Enrolled: {currentUser?.enrolledOn || '12 Aug 2025'}</span>
                <span>•</span>
                <span>Ends: {currentUser?.courseEnds || '30 Nov 2025'}</span>
              </div>
            </div>
          </div>

          {/* Right: Quick Attendance & Streak Metric Cockpit */}
          <div className="flex flex-wrap items-center gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
            
            {/* Learning Streak Badge */}
            <div 
              onClick={() => showToast('12-day attendance & LMS module completion streak active!', 'success')}
              className="bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 px-3.5 py-2.5 rounded-2xl flex items-center gap-2.5 cursor-pointer transition"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                <Flame size={18} />
              </div>
              <div className="leading-tight">
                <span className="text-xs font-black text-amber-900 block font-mono">12 Days</span>
                <span className="text-[10px] text-amber-700 font-medium">Daily Streak</span>
              </div>
            </div>

            {/* Attendance Status Badge */}
            <div className="bg-[#E8F5F3] border border-[#2563EB]/20 px-3.5 py-2.5 rounded-2xl flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-bold">
                <CheckCircle2 size={18} />
              </div>
              <div className="leading-tight">
                <span className="text-xs font-black text-[#2563EB] block font-mono">{dashboardMetrics.attendanceRate}% Present</span>
                <span className="text-[10px] text-blue-800 font-medium">{dashboardMetrics.presentDays} of {dashboardMetrics.totalDays} Days</span>
              </div>
            </div>

            {/* Doorway Attendance Trigger Button */}
            <button
              onClick={() => setIsKioskOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-[#2563EB] hover:bg-[#1E40AF] active:scale-[0.98] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Camera size={15} />
              <span>Doorway Kiosk</span>
            </button>

          </div>

        </div>
      </div>

      {/* 
        ==================================================
        2. MAIN COCKPIT: ASYMMETRIC 8 / 4 GRID
        ==================================================
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT MAIN WORKSPACE (8 Cols) : Active Learning & Path */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Active Course Resume Banner (Moved to top of left column) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider block">
                  CONTINUE YOUR LESSON
                </span>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-0.5">
                  {activeCourse?.title || 'PACS Accounting & ERP Operations Masterclass'}
                </h2>
              </div>
              <Link 
                to="/learning" 
                className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1"
              >
                <span>Full Syllabus</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
              <div className="w-full sm:w-36 h-24 rounded-xl overflow-hidden shrink-0 bg-slate-100 border border-gray-200">
                <img
                  src={activeCourse?.thumbnail || '/assets/course_coop_mgmt.jpg'}
                  alt={activeCourse?.title || 'PACS Course'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = '/assets/course_coop_mgmt.jpg';
                  }}
                />
              </div>

              <div className="flex-1 w-full space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Course Code: {activeCourse?.code || 'CRS-PACS-101'}</span>
                  <span className="font-mono font-bold text-[#2563EB]">{activeCourse?.progress_percentage ?? 60}% Complete</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#2563EB] h-full rounded-full transition-all duration-500" style={{ width: `${activeCourse?.progress_percentage ?? 60}%` }}></div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                  <span>Category: {activeCourse?.category || 'PACS Operations'}</span>
                  <span>Total Modules: {activeCourse?.total_lessons || 4} Lessons</span>
                </div>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  onClick={() => setIsErpSandboxOpen(true)}
                  className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  title="Practice Computerized PACS ERP Day-Book Closing & KCC Disbursal"
                >
                  <Calculator size={14} />
                  <span>ERP Sandbox</span>
                </button>
                <button
                  onClick={() => navigate(`/learning/${activeCourse?.id || 'pacs-operations'}`)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1E40AF] active:scale-[0.98] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-[0_1px_3px_rgba(0,0,0,0.03)] cursor-pointer"
                >
                  <span>Resume</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* 6-Stage Interactive Pathway Stepper */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  STRUCTURED CURRICULUM
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight mt-0.5">
                  My Learning Path
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-mono">Stage 3 of 6 Active</span>
            </div>

            {/* Stepper with connecting line */}
            <div className="relative py-4">
              <div className="absolute top-7 left-[8%] right-[8%] h-0.5 bg-slate-200 z-0"></div>
              <div className="absolute top-7 left-[8%] w-[40%] h-0.5 bg-[#2563EB] z-0"></div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center relative z-10">
                
                {/* Step 1 */}
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white font-bold text-xs flex items-center justify-center mb-1.5 shadow-xs">
                    ✓
                  </div>
                  <p className="text-[11px] font-bold text-slate-800 leading-tight">Intro to Cooperatives</p>
                  <span className="text-[10px] text-[#2563EB] font-semibold mt-0.5">Passed</span>
                </div>

                {/* Step 2 */}
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white font-bold text-xs flex items-center justify-center mb-1.5 shadow-xs">
                    ✓
                  </div>
                  <p className="text-[11px] font-bold text-slate-800 leading-tight">Cooperative Governance</p>
                  <span className="text-[10px] text-[#2563EB] font-semibold mt-0.5">Passed</span>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center mb-1.5 shadow-xs ring-4 ring-blue-100 animate-pulse">
                    3
                  </div>
                  <p className="text-[11px] font-bold text-slate-900 leading-tight">PACS Operations</p>
                  <span className="text-[10px] text-blue-700 font-bold mt-0.5">In Progress</span>
                </div>

                {/* Step 4 */}
                <div className="flex flex-col items-center opacity-60">
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center mb-1.5">
                    4
                  </div>
                  <p className="text-[11px] font-medium text-slate-700 leading-tight">Accounting Basics</p>
                  <span className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-0.5">
                    <Lock size={10} /> Locked
                  </span>
                </div>

                {/* Step 5 */}
                <div className="flex flex-col items-center opacity-60">
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center mb-1.5">
                    5
                  </div>
                  <p className="text-[11px] font-medium text-slate-700 leading-tight">Digital Tools</p>
                  <span className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-0.5">
                    <Lock size={10} /> Locked
                  </span>
                </div>

                {/* Step 6 */}
                <div className="flex flex-col items-center opacity-60">
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center mb-1.5">
                    6
                  </div>
                  <p className="text-[11px] font-medium text-slate-700 leading-tight">Rural Credit</p>
                  <span className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-0.5">
                    <Lock size={10} /> Locked
                  </span>
                </div>

              </div>
            </div>
          </div>

          {/* Upcoming Examinations & Assessments (Moved into main column) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">
                  EVALUATION SCHEDULE
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight mt-0.5">
                  Upcoming Practical Examination
                </h3>
              </div>
              <Link to="/assessments" className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1">
                <span>All Exams</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-purple-50/50 border border-purple-100">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                  <FileText size={20} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    PACS Computerized Accounting & Trial Balance Exam
                  </h4>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar size={12} className="text-purple-600" /> 28 Sep 2025
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-medium">
                      <Clock size={12} className="text-purple-600" /> 10:00 AM - 11:00 AM
                    </span>
                    <span>•</span>
                    <span className="font-bold text-purple-700">Lab 02, PTC Rampur</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/assessments')}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition shadow-[0_1px_3px_rgba(0,0,0,0.03)] shrink-0 cursor-pointer"
              >
                View Exam Details
              </button>
            </div>
          </div>

          {/* Recommended Cooperative Electives */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider block">
                  CURATED ELECTIVES
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight mt-0.5">
                  Recommended for Your Career Pathway
                </h3>
              </div>
              <Link to="/learning" className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1">
                <span>View All</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <div 
                onClick={() => navigate('/learning')}
                className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-3.5 hover:shadow-sm hover:border-[#2563EB] transition cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    POPULAR
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">
                    Rural Banking & Credit Operations
                  </h4>
                  <p className="text-[11px] text-slate-500">Scale of finance and NABARD subsidy norms.</p>
                </div>
                <div className="pt-2 mt-2 border-t border-gray-200/60 flex items-center justify-between text-[10px] text-slate-400">
                  <span>5 Modules</span>
                  <span className="text-[#2563EB] font-bold">Enroll</span>
                </div>
              </div>

              <div 
                onClick={() => navigate('/learning')}
                className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-3.5 hover:shadow-sm hover:border-[#2563EB] transition cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    NEW
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">
                    Digital Tools for PACS
                  </h4>
                  <p className="text-[11px] text-slate-500">Biometric POS & farmer e-KYC management.</p>
                </div>
                <div className="pt-2 mt-2 border-t border-gray-200/60 flex items-center justify-between text-[10px] text-slate-400">
                  <span>4 Modules</span>
                  <span className="text-[#2563EB] font-bold">Enroll</span>
                </div>
              </div>

              <div 
                onClick={() => navigate('/learning')}
                className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-3.5 hover:shadow-sm hover:border-[#2563EB] transition cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    RECOMMENDED
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">
                    Cooperative Society Management
                  </h4>
                  <p className="text-[11px] text-slate-500">Board governance, AGM protocols, and audits.</p>
                </div>
                <div className="pt-2 mt-2 border-t border-gray-200/60 flex items-center justify-between text-[10px] text-slate-400">
                  <span>6 Modules</span>
                  <span className="text-[#2563EB] font-bold">Enroll</span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* RIGHT SIDEBAR (4 Cols) : Intelligence & Vault Cockpit */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Vernacular AI Career Assistant (Moved to top right for high engagement!) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
              <div className="w-8 h-8 rounded-xl bg-[#E8F5F3] text-[#2563EB] flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  AI Cooperative Copilot
                </h3>
                <p className="text-[10px] text-slate-400">Grounded in Model Byelaws 2023</p>
              </div>
            </div>

            {/* Prompt pills */}
            <div className="space-y-1.5 text-xs">
              <button
                onClick={() => handlePromptClick('What skills should I learn for PACS loan manager?')}
                className="w-full p-2.5 rounded-xl bg-slate-50/70 hover:bg-[#E8F5F3] hover:text-[#2563EB] text-slate-700 text-left border border-slate-200/80 flex items-center justify-between transition cursor-pointer"
              >
                <span>Skills for PACS Loan Manager?</span>
                <ChevronRight size={12} className="text-slate-400 shrink-0" />
              </button>

              <button
                onClick={() => handlePromptClick('Show me job opportunities in Rampur DCCB')}
                className="w-full p-2.5 rounded-xl bg-slate-50/70 hover:bg-[#E8F5F3] hover:text-[#2563EB] text-slate-700 text-left border border-slate-200/80 flex items-center justify-between transition cursor-pointer"
              >
                <span>Show jobs in Rampur DCCB</span>
                <ChevronRight size={12} className="text-slate-400 shrink-0" />
              </button>

              <button
                onClick={() => handlePromptClick('How does Ed25519 verification work?')}
                className="w-full p-2.5 rounded-xl bg-slate-50/70 hover:bg-[#E8F5F3] hover:text-[#2563EB] text-slate-700 text-left border border-slate-200/80 flex items-center justify-between transition cursor-pointer"
              >
                <span>How does Ed25519 work?</span>
                <ChevronRight size={12} className="text-slate-400 shrink-0" />
              </button>
            </div>

            {/* Chat Input */}
            <form onSubmit={handleAiSend} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Ask about PACS, exams or jobs..."
                className="flex-1 bg-slate-50/70 border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              />
              <button
                type="submit"
                className="w-8 h-8 rounded-xl bg-[#2563EB] hover:bg-[#1E40AF] text-white flex items-center justify-center shrink-0 transition cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
                title="Send"
              >
                <Send size={13} />
              </button>
            </form>
          </div>

          {/* Overall Progress Gauge (Moved from row 1 to right sidebar) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Overall Progress
              </h3>
              <span className="text-[10px] font-mono text-[#2563EB] font-bold">Batch 2025-26</span>
            </div>

            <div className="flex items-center gap-4 py-1">
              <ProgressRing
                percentage={currentUser?.completionRate || 68}
                size={84}
                strokeWidth={8}
                color="#2563EB"
              />

              <div className="space-y-1.5 text-xs flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Modules</span>
                  <span className="font-bold text-slate-900 font-mono">8 / 12</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Exams</span>
                  <span className="font-bold text-slate-900 font-mono">3 / 4</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Certificates</span>
                  <span className="font-bold text-amber-700 font-mono">1 Pending</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/learning')}
              className="w-full py-2 px-3 rounded-xl bg-[#2563EB] hover:bg-[#1E40AF] text-white text-xs font-bold transition text-center cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
            >
              Continue Learning
            </button>
          </div>

          {/* W3C Cryptographic Credential Vault (Moved from row 3 to right sidebar) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#2563EB]" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Credential Vault
                </h3>
              </div>
              <Link to="/certificates" className="text-[11px] font-bold text-[#2563EB] hover:underline">
                View All
              </Link>
            </div>

            <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80 text-center space-y-2">
              <div className="w-12 h-12 bg-white rounded-xl border border-gray-200 mx-auto flex items-center justify-center text-[#2563EB] shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                <Award size={24} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">PACS Operations Certificate</h4>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">W3C Ed25519 Ready</p>
              </div>
              <p className="text-[11px] text-slate-600 font-medium leading-snug border-l-2 border-[#2563EB] pl-2 text-left italic">
                "Pass your September 28 exam to unlock your tamper-proof Ed25519 credential."
              </p>
            </div>

            <button
              onClick={() => navigate('/certificates')}
              className="w-full py-2 rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-700 text-xs font-bold transition text-center cursor-pointer"
            >
              Inspect Certificates
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
