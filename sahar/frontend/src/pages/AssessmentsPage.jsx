import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import ProgressRing from '../components/common/ProgressRing';
import { 
  ClipboardCheck, Calendar, Clock, Award, CheckCircle2, 
  AlertCircle, ArrowRight, ArrowLeft, Lightbulb, Play, Eye, FileText, 
  Lock, X, Check, HelpCircle, BarChart2, Search, RotateCcw,
  BookOpen, ChevronRight, ShieldCheck, Download, Sparkles, AlertTriangle
} from 'lucide-react';

export default function AssessmentsPage() {
  const { showToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { assessmentId } = useParams();

  const isResultPage = location.pathname.endsWith('/result');
  const isTakingTest = Boolean(assessmentId && !isResultPage);

  // Filter & Search State
  const [activeFilter, setActiveFilter] = useState('all'); // all, upcoming, inprogress, completed
  const [searchQuery, setSearchQuery] = useState('');
  const [syllabusModal, setSyllabusModal] = useState(null);

  // Test Taking State
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState({ 0: 1, 1: 2 }); // pre-filled for in-progress feeling
  const [markedForReview, setMarkedForReview] = useState({});
  const [timeLeft, setTimeLeft] = useState(32 * 60); // 32 minutes
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showAnswerReview, setShowAnswerReview] = useState(false);

  // Real Timer Countdown
  useEffect(() => {
    if (!isTakingTest) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isTakingTest]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cooperative Questions Bank for Test
  const testQuestions = [
    {
      id: 1,
      question: 'What is the primary statutory objective of a Primary Agricultural Credit Society (PACS)?',
      options: [
        'Providing commercial speculative real estate loans in metropolitan areas',
        'Disbursing short-term crop loans and medium-term agricultural credit to rural farmers',
        'Acting as a private equity investment trust for non-resident entities',
        'Underwriting foreign exchange securities and derivative contracts'
      ],
      correct: 1,
      explanation: 'PACS form the base tier of the short-term cooperative credit structure (STCCS), primarily advancing production credit to farmer members.'
    },
    {
      id: 2,
      question: 'Under standard PACS Accounting By-laws, what minimum percentage of annual net profit must be compulsorily allocated to the Statutory Reserve Fund?',
      options: [
        '5%',
        '10%',
        '25%',
        '50%'
      ],
      correct: 2,
      explanation: 'Under the Model Cooperative Societies Act and State By-laws, at least 25% of net profit must be transferred to the Statutory Reserve Fund before any dividend distribution.'
    },
    {
      id: 3,
      question: 'In double-entry cooperative bookkeeping, which book of prime entry records all day-to-day cash receipts and cash payments?',
      options: [
        'Day Book / Cash Book',
        'General Ledger',
        'Stock Transfer Register',
        'Fixed Assets Register'
      ],
      correct: 0,
      explanation: 'The Day Book serves as the chronological cash journal for recording all daily monetary transactions of a PACS.'
    },
    {
      id: 4,
      question: 'Which apex financial institution provides national refinancing and technical assistance for the computerization and modernization of PACS?',
      options: [
        'SEBI',
        'NABARD (National Bank for Agriculture and Rural Development)',
        'IRDAI',
        'Pension Fund Regulatory Authority'
      ],
      correct: 1,
      explanation: 'NABARD serves as the central nodal agency for implementing the National PACS Computerization Project under the Ministry of Cooperation.'
    },
    {
      id: 5,
      question: 'Which of the following documents is prepared at the end of an accounting period to verify the arithmetical accuracy of ledger postings?',
      options: [
        'Trial Balance',
        'Promissory Note',
        'Share Certificate',
        'Quorum Attendance Register'
      ],
      correct: 0,
      explanation: 'The Trial Balance compiles debit and credit ledger balances to ensure that total debits equal total credits prior to finalizing the Balance Sheet.'
    },
    {
      id: 6,
      question: 'What constitutes the supreme governing authority in a Primary Agricultural Credit Society?',
      options: [
        'The General Body of all voting members',
        'The Secretary alone',
        'The District Central Cooperative Bank Manager',
        'The External Auditor'
      ],
      correct: 0,
      explanation: 'The General Body of members represents the democratic foundation and ultimate decision-making authority of a cooperative society.'
    }
  ];

  // Syllabus definitions for "View Syllabus"
  const syllabuses = {
    accounting: {
      title: 'PACS Accounting Basics : Official NCCT Syllabus',
      module: 'Module 3 • 40 Marks',
      topics: [
        'Fundamentals of Double-Entry Bookkeeping in Cooperatives',
        'Maintenance of Day Book, Cash Book, and Petty Cash Vouchers',
        'General Ledger Accounts: Members Credit, Fertilizer Inventory, Share Capital',
        'Preparation of Trial Balance and Monthly Financial Statements',
        'Statutory Reserve Fund allocations and Cooperative Audit compliance'
      ]
    },
    governance: {
      title: 'Cooperative Governance : Official NCCT Syllabus',
      module: 'Module 2 • 30 Marks',
      topics: [
        'Democratic Member Control and 1-Member 1-Vote Principle',
        'Powers and Duties of the Board of Directors & Managing Committee',
        'General Body Meetings: Notice, Quorum, and Resolutions',
        'State Cooperative Societies Act & Model By-laws Provisions',
        'Transparency, Disclosure, and Vigilance Mechanisms'
      ]
    }
  };

  // Completed Assessments Table Data
  const completedAssessments = [
    {
      id: 'intro-cooperatives',
      title: 'Introduction to Cooperatives',
      module: 'Module 1',
      marks: '38 / 40',
      percentage: '95%',
      result: 'Pass (95%)',
      completedOn: '15 Aug 2025'
    },
    {
      id: 'pacs-governance',
      title: 'PACS Governance Structure',
      module: 'Module 2',
      marks: '26 / 30',
      percentage: '87%',
      result: 'Pass (87%)',
      completedOn: '22 Aug 2025'
    },
    {
      id: 'rural-credit',
      title: 'Rural Credit Operations',
      module: 'Module 4',
      marks: '32 / 40',
      percentage: '80%',
      result: 'Pass (80%)',
      completedOn: '05 Sep 2025'
    },
    {
      id: 'coop-rural-dev',
      title: 'Cooperatives and Rural Development',
      module: 'Module 1',
      marks: '36 / 40',
      percentage: '90%',
      result: 'Pass (90%)',
      completedOn: '12 Sep 2025'
    }
  ];

  // Filter completed assessments by search
  const filteredCompleted = completedAssessments.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.title.toLowerCase().includes(q) || item.module.toLowerCase().includes(q);
  });

  // Handle Question Answer
  const handleSelectAnswer = (optionIdx) => {
    setAnswers({
      ...answers,
      [currentQIndex]: optionIdx
    });
  };

  const handleToggleReview = (idx) => {
    setMarkedForReview({
      ...markedForReview,
      [idx]: !markedForReview[idx]
    });
  };

  const handleSubmitTest = () => {
    setShowSubmitConfirm(false);
    showToast('Assessment submitted successfully to NCCT Examination Portal!', 'success');
    navigate(`/assessments/${assessmentId || 'pacs-accounting'}/result`);
  };

  // ==============================================================
  // VIEW 1: ASSESSMENT RESULT SCREEN (/assessments/:id/result)
  // ==============================================================
  if (isResultPage) {
    return (
      <div className="space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/assessments')}
            className="flex items-center gap-2 text-xs font-bold text-[#2563EB] hover:text-[#1E40AF] transition cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Back to Assessments</span>
          </button>
          <span className="text-xs font-medium text-slate-500 font-mono">
            Exam ID: NCCT-PACS-2025-0982
          </span>
        </div>

        {/* Master Result Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-6 sm:p-8">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-gray-100">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#2563EB] border border-blue-200 mb-3">
                <CheckCircle2 size={14} />
                <span>Passed • Grade: Distinction</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                PACS Accounting Basics : Examination Result
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                National Council for Cooperative Training (NCCT) Accredited Assessment
              </p>
            </div>

            {/* Score Ring / Pill */}
            <div className="bg-gradient-to-br from-blue-50/90 via-slate-50/60 to-indigo-50/50 border border-blue-200/90 rounded-2xl py-4 px-6 sm:px-8 flex items-center gap-6 sm:gap-7 shrink-0 shadow-xs">
              <div className="text-right flex flex-col justify-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Total Score</span>
                <div className="flex items-baseline justify-end gap-1.5">
                  <span className="text-3xl sm:text-4xl font-black text-[#2563EB] tracking-tight">36</span>
                  <span className="text-base font-bold text-slate-400">/ 40</span>
                </div>
                <span className="text-xs font-semibold text-emerald-700 mt-1 flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                  Distinction Grade
                </span>
              </div>

              {/* Vertical subtle divider for clean separation */}
              <div className="h-14 w-px bg-blue-200/80"></div>

              <div className="flex flex-col items-center justify-center">
                <ProgressRing
                  percentage={90}
                  size={72}
                  strokeWidth={6.5}
                  color="#2563EB"
                  textSize="text-sm font-black"
                />
              </div>
            </div>
          </div>

          {/* Performance Breakdown Table */}
          <div className="py-6 border-b border-gray-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
              Module Performance Breakdown
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800">Double-Entry Principles & Day Book</span>
                  <span className="font-bold text-blue-700">100%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#2563EB] rounded-full" style={{ width: '100%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800">Trial Balance & Ledger Reconciliation</span>
                  <span className="font-bold text-blue-700">90%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#2563EB] rounded-full" style={{ width: '90%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800">Statutory Reserve Fund & Audit Provisions</span>
                  <span className="font-bold text-blue-700">80%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#2563EB] rounded-full" style={{ width: '80%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Toggle Detailed Answers Section */}
          <div className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                onClick={() => setShowAnswerReview(!showAnswerReview)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-2xl border border-gray-200 hover:bg-slate-50 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Eye size={15} />
                <span>{showAnswerReview ? 'Hide Detailed Answers' : 'View Question-by-Question Review'}</span>
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => navigate('/certificates')}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-blue-50 hover:bg-blue-100 text-[#2563EB] border border-blue-200 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Award size={15} />
                  <span>View Certificate</span>
                </button>
                <button
                  onClick={() => navigate('/learning')}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-[#2563EB] hover:bg-[#1E40AF] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.03)] cursor-pointer"
                >
                  <span>Continue Learning</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>

            {/* Answer Breakdown Panel */}
            {showAnswerReview && (
              <div className="mt-6 space-y-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Question Review & Official Answer Keys
                </h4>
                {testQuestions.map((q, idx) => {
                  const userAns = answers[idx];
                  const isCorrect = userAns === q.correct;
                  return (
                    <div key={q.id} className="p-4 rounded-2xl bg-slate-50 border border-gray-200/90 text-xs">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="font-bold text-slate-900 leading-snug">
                          {idx + 1}. {q.question}
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          isCorrect ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-800'
                        }`}>
                          {isCorrect ? 'Correct (+6.6 Marks)' : 'Incorrect (0 Marks)'}
                        </span>
                      </div>
                      <div className="text-slate-600 mt-2 space-y-1">
                        <div>
                          <span className="font-semibold text-slate-700">Your Answer: </span>
                          <span className={isCorrect ? 'text-blue-600 font-bold' : 'text-red-700 font-bold'}>
                            {userAns !== undefined ? q.options[userAns] : 'Not Answered'}
                          </span>
                        </div>
                        {!isCorrect && (
                          <div>
                            <span className="font-semibold text-slate-700">Correct Answer: </span>
                            <span className="text-blue-600 font-bold">{q.options[q.correct]}</span>
                          </div>
                        )}
                        <p className="text-[11px] text-slate-500 mt-1 italic">
                          Official Note: {q.explanation}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>
      </div>
    );
  }

  // ==============================================================
  // VIEW 2: TEST TAKING INTERFACE (/assessments/:assessmentId)
  // ==============================================================
  if (isTakingTest) {
    const q = testQuestions[currentQIndex];
    const totalQuestions = testQuestions.length;
    const answeredCount = Object.keys(answers).length;

    return (
      <div className="space-y-5">
        
        {/* Top Header / Timer Bar */}
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/assessments')}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                PACS Accounting Basics
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Module 3 • 40 Maximum Marks • Passing Score: 75% (30 Marks)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {/* Live Timer Pill */}
            <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1.5">
              <Clock size={14} className="text-amber-600 animate-pulse" />
              <span>Time Left: {formatTimer(timeLeft)}</span>
            </div>

            {/* Submit Early Button */}
            <button
              onClick={() => setShowSubmitConfirm(true)}
              className="py-1.5 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1E40AF] text-white text-xs font-bold transition shadow-[0_1px_3px_rgba(0,0,0,0.03)] cursor-pointer"
            >
              Submit Assessment
            </button>
          </div>
        </div>

        {/* Question Area & Navigator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Main Question Card (Col 8) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-6 flex flex-col justify-between min-h-[440px]">
            <div>
              
              {/* Question Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                <span className="text-xs font-bold text-[#2563EB] uppercase tracking-wider">
                  Question {currentQIndex + 1} of {totalQuestions}
                </span>
                <button
                  onClick={() => handleToggleReview(currentQIndex)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                    markedForReview[currentQIndex]
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : 'bg-slate-50 text-slate-600 border-gray-200 hover:bg-slate-100'
                  }`}
                >
                  {markedForReview[currentQIndex] ? '★ Marked for Review' : '☆ Mark for Review'}
                </button>
              </div>

              {/* Question Text */}
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug mb-5">
                {q.question}
              </h3>

              {/* Options List */}
              <div className="space-y-3">
                {q.options.map((opt, oIdx) => {
                  const isSelected = answers[currentQIndex] === oIdx;
                  return (
                    <button
                      key={oIdx}
                      onClick={() => handleSelectAnswer(oIdx)}
                      className={`w-full text-left p-3.5 sm:p-4 rounded-xl border text-xs sm:text-sm transition flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/70 border-[#2563EB] text-[#2563EB] font-semibold ring-1 ring-[#2563EB]'
                          : 'bg-white border-gray-200/90 text-slate-700 hover:border-gray-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border shrink-0 mt-0.5 flex items-center justify-center text-[10px] font-bold ${
                        isSelected 
                          ? 'border-[#2563EB] bg-[#2563EB] text-white' 
                          : 'border-gray-300 text-slate-500'
                      }`}>
                        {String.fromCharCode(65 + oIdx)}
                      </div>
                      <span className="leading-snug">{opt}</span>
                    </button>
                  );
                })}
              </div>

            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-100 mt-6">
              <button
                disabled={currentQIndex === 0}
                onClick={() => setCurrentQIndex(prev => prev - 1)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Previous</span>
              </button>

              {currentQIndex === totalQuestions - 1 ? (
                <button
                  onClick={() => setShowSubmitConfirm(true)}
                  className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1E40AF] text-white text-xs font-bold transition shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Submit Exam</span>
                  <CheckCircle2 size={14} />
                </button>
              ) : (
                <button
                  onClick={() => setCurrentQIndex(prev => prev + 1)}
                  className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1E40AF] text-white text-xs font-bold transition shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Next Question</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>

          </div>

          {/* Question Navigator (Col 4) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Question Navigator
            </h4>

            {/* Status counts */}
            <div className="grid grid-cols-3 gap-2 text-center text-[11px] pb-3 border-b border-gray-100">
              <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
                <div className="font-bold text-[#2563EB]">{answeredCount}</div>
                <div className="text-slate-500 text-[10px]">Answered</div>
              </div>
              <div className="p-2 bg-amber-50 rounded-lg border border-amber-100">
                <div className="font-bold text-amber-700">{Object.values(markedForReview).filter(Boolean).length}</div>
                <div className="text-slate-500 text-[10px]">Review</div>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-gray-200">
                <div className="font-bold text-slate-700">{totalQuestions - answeredCount}</div>
                <div className="text-slate-500 text-[10px]">Remaining</div>
              </div>
            </div>

            {/* Question Badges */}
            <div className="grid grid-cols-5 gap-2">
              {testQuestions.map((_, idx) => {
                const isCurrent = idx === currentQIndex;
                const isAnswered = answers[idx] !== undefined;
                const isReview = markedForReview[idx];

                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentQIndex(idx)}
                    className={`h-9 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                      isCurrent
                        ? 'ring-2 ring-[#2563EB] ring-offset-1 bg-slate-900 text-white'
                        : isReview
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : isAnswered
                        ? 'bg-[#2563EB] text-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Instructions box */}
            <div className="pt-3 border-t border-gray-100 text-[11px] text-slate-500 space-y-1.5 leading-relaxed">
              <p>• Single attempt allowed for certification credit.</p>
              <p>• Your progress is auto-saved locally every 10 seconds.</p>
              <p>• Ensure stable connectivity before final submission.</p>
            </div>
          </div>

        </div>

        {/* Submit Confirmation Modal */}
        {showSubmitConfirm && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center mb-4 border border-blue-100">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Submit Assessment?
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                You have answered <span className="font-bold text-slate-900">{answeredCount} of {totalQuestions} questions</span>. Once submitted, your answers will be graded by the NCCT examination server.
              </p>
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowSubmitConfirm(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Continue Test
                </button>
                <button
                  onClick={handleSubmitTest}
                  className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1E40AF] text-white text-xs font-bold transition shadow-[0_1px_3px_rgba(0,0,0,0.03)] cursor-pointer"
                >
                  Yes, Submit
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // ==============================================================
  // VIEW 3: MAIN ASSESSMENT DASHBOARD (Repositioned Civic Layout)
  // ==============================================================
  return (
    <div className="space-y-6">
      
      {/* 
        ========================================================================
        1. REPOSITIONED ACADEMIC EVALUATION COMMAND STRIP
        ========================================================================
      */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-linear-to-l from-blue-50/60 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-xs">
              <ClipboardCheck size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  NCCT National Examination Framework
                </span>
                <span className="text-[11px] font-semibold text-slate-500 font-mono">
                  Passing Threshold: 75%
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
                Examination & Competency Evaluation Center
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-medium">
                Validate your expertise in PACS administration, cooperative accounting, and credit underwriting. 
                Passing official NCCT exams automatically unlocks tamper-proof Ed25519 digital credentials.
              </p>
            </div>
          </div>

          {/* Assessment Stats Cluster */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
            <div className="px-4 py-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 text-center min-w-[90px]">
              <div className="text-lg font-black text-blue-600">4</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Passed</div>
            </div>
            <div className="px-4 py-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 text-center min-w-[90px]">
              <div className="text-lg font-black text-blue-700">1</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active</div>
            </div>
            <div className="px-4 py-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 text-center min-w-[90px]">
              <div className="text-lg font-black text-amber-700">2</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Upcoming</div>
            </div>
            <div className="px-4 py-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 text-center min-w-[90px]">
              <div className="text-lg font-black text-[#2563EB]">91%</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Avg Grade</div>
            </div>
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        2. ACTIVE TEST RESUME BANNER (If in progress)
        ========================================================================
      */}
      <div className="bg-white rounded-2xl border-2 border-blue-600/30 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-14 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-gray-200">
            <img 
              src="/assets/assessment_calc_hands.jpg" 
              alt="Digital Tools for PACS" 
              className="w-full h-full object-cover"
              onError={(e) => { e.target.src = '/assets/course_digital_tools.jpg'; }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                Active Assessment
              </span>
              <span className="text-xs text-slate-400 font-mono">Module 5 • 25 Marks</span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
              Digital Tools for PACS
            </h2>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="w-36 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#2563EB] h-full rounded-full" style={{ width: '60%' }} />
              </div>
              <span className="text-xs font-bold text-[#2563EB]">60% (32 mins remaining)</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/assessments/digital-tools')}
          className="px-5 py-3 bg-[#2563EB] hover:bg-[#1E40AF] text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-[0_1px_3px_rgba(0,0,0,0.03)] cursor-pointer shrink-0"
        >
          <Play size={14} fill="currentColor" />
          <span>Resume Assessment</span>
        </button>
      </div>

      {/* 
        ========================================================================
        3. ASYMMETRIC EVALUATION WORKSPACE
        LEFT (Col 4.5): Progress Donut, Search & Filters, Integrity Protocols
        RIGHT (Col 7.5): Upcoming Exams Cards & Completed History Ledger
        ========================================================================
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (Col 4.5): Overall Progress Ring, Filters & Regulations */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Progress Ring Console */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Overall Competency Progress
              </h3>
              <span className="text-[11px] font-bold text-[#2563EB]">
                4 of 6 Completed
              </span>
            </div>

            <div className="flex items-center gap-5 my-2">
              <ProgressRing
                percentage={75}
                size={95}
                strokeWidth={9}
                color="#2563EB"
              />

              <div className="space-y-2 text-xs flex-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    Passed Exams
                  </span>
                  <span className="font-bold text-slate-900">4 / 6</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    In Progress
                  </span>
                  <span className="font-bold text-slate-900">1</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    Upcoming
                  </span>
                  <span className="font-bold text-slate-900">2</span>
                </div>
              </div>
            </div>
          </div>

          {/* Vertical Filter & Search */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 space-y-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assessments..."
                className="w-full bg-slate-50/70 border border-slate-200/80 rounded-2xl pl-9 pr-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              />
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            </div>

            <div className="space-y-1.5">
              {[
                { id: 'all', label: 'All Assessments', count: 7 },
                { id: 'upcoming', label: 'Upcoming', count: 2 },
                { id: 'inprogress', label: 'In Progress', count: 1 },
                { id: 'completed', label: 'Completed History', count: 4 }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
                    activeFilter === f.id
                      ? 'bg-[#2563EB] text-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
                      : 'bg-slate-50/70 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    activeFilter === f.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Exam Rules & Integrity Shield */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-[#2563EB] font-bold text-xs uppercase tracking-wider">
              <ShieldCheck size={16} />
              <span>Examination Integrity Protocols</span>
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              <p>• Mandatory 75% score required for NCCT certificate issuance.</p>
              <p>• INT8 camera liveness checks verify candidate authenticity.</p>
              <p>• Single official attempt allowed per credential cycle.</p>
              <p>• Auto-graded by central cooperative examination engine.</p>
            </div>
          </div>

        </div>

        {/* Right Column (Col 7.5): Upcoming Exam Cards & Completed Ledger */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Upcoming Assessments */}
          {(activeFilter === 'all' || activeFilter === 'upcoming') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Upcoming Examinations
                </h3>
                <span className="text-xs font-semibold text-slate-400">2 Scheduled</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Upcoming Card 1: PACS Accounting Basics */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between hover:border-[#2563EB]/40 transition">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-100">
                        <FileText size={20} />
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#2563EB] border border-blue-200">
                        Scheduled
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">
                      PACS Accounting Basics
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                      Module 3 • 40 Marks
                    </p>

                    <div className="mt-3 py-2 border-y border-gray-100 space-y-1 text-xs text-slate-600 font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar size={13} className="text-slate-400" />
                        <span>28 Sep 2025</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={13} className="text-slate-400" />
                        <span>10:00 AM - 11:00 AM (60 Mins)</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 mt-2.5 line-clamp-2">
                      Test your understanding of PACS accounting concepts and double-entry bookkeeping.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-5">
                    <button
                      onClick={() => navigate('/assessments/pacs-accounting')}
                      className="py-2 px-3 rounded-xl bg-[#2563EB] hover:bg-[#1E40AF] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] cursor-pointer"
                    >
                      <Play size={12} fill="white" />
                      <span>Start Exam</span>
                    </button>
                    <button
                      onClick={() => setSyllabusModal(syllabuses.accounting)}
                      className="py-2 px-3 rounded-xl border border-gray-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition text-center cursor-pointer"
                    >
                      Syllabus
                    </button>
                  </div>
                </div>

                {/* Upcoming Card 2: Cooperative Governance */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
                        <BarChart2 size={20} />
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Opens Soon
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">
                      Cooperative Governance
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                      Module 2 • 30 Marks
                    </p>

                    <div className="mt-3 py-2 border-y border-gray-100 space-y-1 text-xs text-slate-600 font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar size={13} className="text-slate-400" />
                        <span>02 Oct 2025</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={13} className="text-slate-400" />
                        <span>2:00 PM - 3:00 PM (45 Mins)</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 mt-2.5 line-clamp-2">
                      Assessment on governance structure, by-laws and democratic management.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-5">
                    <button
                      disabled
                      className="py-2 px-3 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold flex items-center justify-center gap-1.5 cursor-not-allowed"
                    >
                      <Lock size={12} />
                      <span>In 5 Days</span>
                    </button>
                    <button
                      onClick={() => setSyllabusModal(syllabuses.governance)}
                      className="py-2 px-3 rounded-xl border border-gray-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition text-center cursor-pointer"
                    >
                      Syllabus
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Completed Assessments Table */}
          {(activeFilter === 'all' || activeFilter === 'completed') && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 sm:p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">
                  Completed Examination Records
                </h3>
                <span className="text-xs text-slate-400 font-medium">{filteredCompleted.length} Records</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 border-b border-gray-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-3">Title</th>
                      <th className="py-3 px-3">Module</th>
                      <th className="py-3 px-3">Marks</th>
                      <th className="py-3 px-3">Result</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-slate-700">
                    {filteredCompleted.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 font-bold text-slate-900">{item.title}</td>
                        <td className="py-3 px-3 text-slate-500">{item.module}</td>
                        <td className="py-3 px-3 font-mono font-medium">{item.marks}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#2563EB] border border-blue-100">
                            {item.result}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => navigate(`/assessments/${item.id}/result`)}
                              className="text-slate-600 hover:text-[#2563EB] font-bold text-xs transition cursor-pointer"
                            >
                              Result
                            </button>
                            <Link 
                              to="/certificates" 
                              className="text-[#2563EB] font-bold hover:underline flex items-center gap-0.5"
                            >
                              <Award size={13} />
                              <span>Cert</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Syllabus Modal */}
      {syllabusModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">{syllabusModal.title}</h3>
                <span className="text-[11px] text-[#2563EB] font-bold">{syllabusModal.module}</span>
              </div>
              <button onClick={() => setSyllabusModal(null)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="py-4 space-y-2.5 text-xs text-slate-700">
              <div className="font-semibold text-slate-900">Key Syllabus Units Covered:</div>
              {syllabusModal.topics.map((t, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] mt-1.5 shrink-0" />
                  <span className="leading-relaxed">{t}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                onClick={() => setSyllabusModal(null)}
                className="px-4 py-2 bg-[#2563EB] hover:bg-[#1E40AF] text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close Syllabus
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
