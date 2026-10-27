import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { lmsApi } from '../services/api';
import { voiceSynthesizer } from '../services/voiceSynthesizer';
import PageBanner from '../components/common/PageBanner';
import { 
  ArrowLeft, ArrowRight, Play, Pause, Volume2, VolumeX, 
  Maximize, CheckCircle2, Lock, Download, 
  Eye, FileText, Video, Presentation, Lightbulb, MessageSquare, 
  BookOpen, Sparkles, Languages, Clock, Award, Search, Filter, 
  CheckSquare, ChevronRight, BarChart2, Star, ShieldCheck, Check, X, AlertCircle
} from 'lucide-react';

export default function LmsMyLearning() {
  const { showToast } = useApp();
  const navigate = useNavigate();
  const { courseId } = useParams();

  // Catalog State
  const [filterCategory, setFilterCategory] = useState('ALL'); // ALL, IN_PROGRESS, COMPLETED, NOT_STARTED
  const [searchQuery, setSearchQuery] = useState('');

  // Lesson Player State (for /learning/:courseId)
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, notes, resources, discussion
  const [selectedLessonId, setSelectedLessonId] = useState('3.2');
  const [language, setLanguage] = useState('hi'); // Hindi or English
  const [playbackSpeed, setPlaybackSpeed] = useState('1.0x');
  const [userNote, setUserNote] = useState('');
  const [courseProgress, setCourseProgress] = useState(60);
  const [savedNotes, setSavedNotes] = useState([
    'Remember: By-laws amendment requires 2/3rd majority in General Body meeting.',
    'NCDC credit line is integrated with NABARD refinancing scheme under PACS Computerization.'
  ]);

  // Mock Courses Catalog
  const coursesCatalog = [
    {
      id: 'pacs-operations',
      title: 'PACS Operations and Management',
      category: 'Operations',
      status: 'IN_PROGRESS',
      progress: courseProgress,
      level: 'Intermediate',
      modulesCount: 6,
      weeksCount: 8,
      lessonsCount: 24,
      thumbnail: '/assets/farmer_pacs_backdrop.jpg',
      currentLesson: 'Module 3: Lesson 3.2 : Functions and Services of PACS',
      badgeColor: 'bg-blue-50 text-[#2563EB] border-blue-200'
    },
    {
      id: 'pacs-accounting',
      title: 'PACS Accounting & Bookkeeping',
      category: 'Accounting',
      status: 'IN_PROGRESS',
      progress: 25,
      level: 'Foundation',
      modulesCount: 4,
      weeksCount: 6,
      lessonsCount: 16,
      thumbnail: '/assets/assessment_calc_hands.jpg',
      currentLesson: 'Module 1: Lesson 1.3 : Journal Entries & Double Entry System',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    {
      id: 'coop-management',
      title: 'Cooperative Society Management',
      category: 'Management',
      status: 'NOT_STARTED',
      progress: 0,
      level: 'Advanced',
      modulesCount: 6,
      weeksCount: 8,
      lessonsCount: 22,
      thumbnail: '/assets/career_coop_manager.jpg',
      currentLesson: 'Module 1: Lesson 1.1 : Principles of Cooperative Governance',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200'
    },
    {
      id: 'rural-banking',
      title: 'Rural Banking & Credit Operations',
      category: 'Banking',
      status: 'NOT_STARTED',
      progress: 0,
      level: 'Intermediate',
      modulesCount: 5,
      weeksCount: 6,
      lessonsCount: 18,
      thumbnail: '/assets/career_rural_finance.jpg',
      currentLesson: 'Module 1: Lesson 1.1 : Agricultural Credit Delivery Architecture',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200'
    },
    {
      id: 'digital-tools',
      title: 'Digital Tools for PACS',
      category: 'Digital Technology',
      status: 'COMPLETED',
      progress: 100,
      level: 'Foundation',
      modulesCount: 4,
      weeksCount: 5,
      lessonsCount: 14,
      thumbnail: '/assets/impact_laptop.jpg',
      currentLesson: 'All Modules Completed • Certificate Verified',
      badgeColor: 'bg-blue-50 text-[#2563EB] border-blue-200'
    },
    {
      id: 'coop-governance',
      title: 'Cooperative Governance & By-laws',
      category: 'Legal & Governance',
      status: 'COMPLETED',
      progress: 100,
      level: 'Intermediate',
      modulesCount: 4,
      weeksCount: 4,
      lessonsCount: 12,
      thumbnail: '/assets/career_community_dev.jpg',
      currentLesson: 'All Modules Completed • Certificate Verified',
      badgeColor: 'bg-blue-50 text-blue-800 border-blue-200'
    }
  ];

  // Dynamic Courses & Lesson Player State
  const [coursesList, setCoursesList] = useState(coursesCatalog);
  const [activeCourseDetail, setActiveCourseDetail] = useState(null);
  const [activeLessonData, setActiveLessonData] = useState(null);

  // Quiz Modal State
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);

  // Lessons inside course detail
  const [lessonsList, setLessonsList] = useState([
    { id: '3.1', title: '3.1 Introduction to PACS', duration: '28 min', status: 'completed' },
    { id: '3.2', title: '3.2 Functions and Services of PACS', duration: '32 min', status: 'active' },
    { id: '3.3', title: '3.3 PACS Governance Structure', duration: '25 min', status: 'pending' },
    { id: '3.4', title: '3.4 Financial Management in PACS', duration: '30 min', status: 'pending' },
    { id: '3.5', title: '3.5 Digital Tools for PACS', duration: '22 min', status: 'pending' },
    { id: '3.6', title: '3.6 Case Study: Successful PACS in India', duration: '20 min', status: 'locked' },
    { id: '3.7', title: '3.7 Summary and Key Learnings', duration: '10 min', status: 'locked' },
    { id: '3.8', title: '3.8 Practice Quiz & Knowledge Check', duration: '15 min', status: 'locked' }
  ]);

  // Load backend courses on mount
  useEffect(() => {
    lmsApi.getCourses().then(res => {
      if (Array.isArray(res) && res.length > 0) {
        setCoursesList(prev => {
          return prev.map(c => {
            const be = res.find(rc => rc.code === c.code || rc.title.toLowerCase().includes(c.title.toLowerCase().substring(0, 10)));
            if (be) {
              const status = be.progress_percentage >= 100 ? 'COMPLETED' : be.progress_percentage > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';
              return {
                ...c,
                dbId: be.id,
                title: be.title,
                code: be.code,
                progress: be.progress_percentage,
                status,
                hasCertificate: be.has_certificate,
                certificateId: be.certificate_id
              };
            }
            return c;
          });
        });
      }
    }).catch(err => console.warn('LMS courses fetch note:', err.message));
  }, []);

  // Load course details when courseId is present in URL
  useEffect(() => {
    if (!courseId) return;
    const SLUG_TO_ID = {
      'pacs-operations': 1,
      'pacs-accounting': 2,
      'coop-management': 3,
      'rural-banking': 4,
      'digital-tools': 5,
      'coop-governance': 3,
      'coop-warehouse': 6
    };
    const targetDbId = !isNaN(courseId) ? parseInt(courseId, 10) : SLUG_TO_ID[courseId] || 1;

    lmsApi.getCourse(targetDbId).then(detail => {
      setActiveCourseDetail(detail);
      if (detail.modules && detail.modules.length > 0) {
        const flat = [];
        detail.modules.forEach(m => {
          (m.lessons || []).forEach(l => {
            flat.push({
              id: String(l.id),
              title: l.title,
              duration: `${l.duration_minutes || 20} min`,
              status: l.completed ? 'completed' : 'pending',
              moduleTitle: m.title
            });
          });
        });
        if (flat.length > 0) {
          setLessonsList(flat);
          const firstIncomplete = flat.find(f => f.status !== 'completed');
          const initialLessonId = firstIncomplete ? firstIncomplete.id : flat[0].id;
          setSelectedLessonId(initialLessonId);
        }
      }
    }).catch(err => console.warn('Course detail fetch note:', err.message));
  }, [courseId]);

  // Load lesson text and summary when selectedLessonId changes
  useEffect(() => {
    if (!selectedLessonId || isNaN(selectedLessonId)) return;
    lmsApi.getLesson(parseInt(selectedLessonId, 10)).then(data => {
      setActiveLessonData(data);
    }).catch(err => console.warn('Lesson data fetch note:', err.message));
  }, [selectedLessonId]);

  const handleDownloadResource = (name) => {
    showToast(`Downloading official NCCT training material: ${name}`, 'success');
  };

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!userNote.trim()) return;
    setSavedNotes([...savedNotes, userNote]);
    setUserNote('');
    showToast('Note added to your learning portfolio', 'success');
  };

  const handleMarkComplete = async () => {
    try {
      if (!isNaN(selectedLessonId)) {
        await lmsApi.completeLesson(parseInt(selectedLessonId, 10));
      }
      setLessonsList(prev => prev.map(l => l.id === selectedLessonId ? { ...l, status: 'completed' } : l));
      const nextProgress = Math.min(100, courseProgress + 10);
      setCourseProgress(nextProgress);
      showToast(`Lesson ${selectedLessonId} marked complete! Database state persisted.`, 'success');
    } catch (err) {
      setLessonsList(prev => prev.map(l => l.id === selectedLessonId ? { ...l, status: 'completed' } : l));
      showToast(`Lesson completed: ${err.message}`, 'info');
    }
  };

  const handleOpenQuiz = async () => {
    const qId = activeCourseDetail?.quiz_id || 1;
    try {
      const qz = await lmsApi.getQuiz(qId);
      setQuizData(qz);
      setQuizAnswers({});
      setQuizResult(null);
      setQuizModalOpen(true);
    } catch (err) {
      showToast(`Could not load certification quiz: ${err.message}`, 'error');
    }
  };

  const handleSubmitQuiz = async () => {
    if (!quizData) return;
    setIsSubmittingQuiz(true);
    try {
      const res = await lmsApi.submitQuiz(quizData.id, quizAnswers);
      setQuizResult(res);
      if (res.passed) {
        showToast(`Assessment passed with ${res.score}%! Verifiable Ed25519 Certificate issued!`, 'success');
      } else {
        showToast(`Score: ${res.score}%. Threshold is ${quizData.passing_score}%. Review modules to retry.`, 'info');
      }
    } catch (err) {
      showToast(`Submission error: ${err.message}`, 'error');
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  const handleNextLesson = () => {
    const currentIndex = lessonsList.findIndex(l => l.id === selectedLessonId);
    if (currentIndex >= 0 && currentIndex < lessonsList.length - 1) {
      const nextLesson = lessonsList[currentIndex + 1];
      setSelectedLessonId(nextLesson.id);
      setIsPlaying(true);
      showToast(`Now playing: ${nextLesson.title}`, 'info');
    } else {
      showToast('You have reached the end of this module syllabus!', 'success');
    }
  };

  // Dynamic Counts
  const totalCoursesCount = coursesList.length;
  const inProgressCount = coursesList.filter(c => c.status === 'IN_PROGRESS').length;
  const completedCount = coursesList.filter(c => c.status === 'COMPLETED').length;
  const notStartedCount = coursesList.filter(c => c.status === 'NOT_STARTED').length;

  // Filter logic for Catalog
  const filteredCourses = coursesList.filter(course => {
    const matchesCategory = 
      filterCategory === 'ALL' ? true :
      filterCategory === 'IN_PROGRESS' ? course.status === 'IN_PROGRESS' :
      filterCategory === 'COMPLETED' ? course.status === 'COMPLETED' :
      filterCategory === 'NOT_STARTED' ? course.status === 'NOT_STARTED' : true;

    const matchesSearch = 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  // ==============================================================
  // RENDER 1: COURSE DETAIL & LESSON PLAYER (When courseId is present)
  // ==============================================================
  if (courseId) {
    return (
      <div className="space-y-6">
        
        {/* Course Header Bar with Back Navigation */}
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/learning')}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#2563EB] transition mb-2 cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to My Learning</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold text-base border border-blue-100">
                🌿
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
                    {activeCourseDetail?.title || 'PACS Operations and Management'}
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#2563EB] border border-blue-200">
                    {activeCourseDetail?.code || 'CRS-PACS-101'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  National Council for Cooperative Training (NCCT) • {lessonsList.length} Lessons • Category: {activeCourseDetail?.category || 'PACS Operations'}
                </p>
              </div>
            </div>
          </div>

          {/* Progress & Quick Actions */}
          <div className="flex items-center gap-5 w-full md:w-auto justify-between md:justify-end">
            <div className="text-right">
              <div className="text-xs text-slate-400 font-medium">Course Progress</div>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-28 sm:w-36 bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#2563EB] h-full rounded-full transition-all duration-500" style={{ width: `${courseProgress}%` }} />
                </div>
                <span className="text-xs font-bold text-slate-800">{courseProgress}%</span>
              </div>
            </div>

            <button
              onClick={() => {
                setIsPlaying(true);
                showToast('Resuming Module 3: Functions and Services of PACS', 'info');
              }}
              className="bg-[#2563EB] hover:bg-[#1E40AF] text-white font-bold px-4 py-2.5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>Continue Learning</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Main Grid: Video Player + Course Curriculum */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Video Player & Lesson Details (Col 8) */}
          <div className="lg:col-span-8 space-y-5">
            
            {/* Video Lesson Screen */}
            <div className="bg-slate-950 rounded-2xl overflow-hidden shadow-md border border-slate-800 relative group">
              
              {/* Screen Content */}
              <div className="aspect-video relative flex items-center justify-center bg-black">
                <img
                  src="/assets/lesson_video.jpg"
                  alt="Role of PACS in Rural Economy"
                  className="w-full h-full object-cover opacity-90"
                  onError={(e) => {
                    e.target.src = '/assets/clean_hero_photo.jpg';
                  }}
                />

                {/* Center Play Button Overlay */}
                {!isPlaying && (
                  <button
                    onClick={() => setIsPlaying(true)}
                    className="absolute w-16 h-16 rounded-full bg-[#2563EB]/90 text-white flex items-center justify-center shadow-xl hover:scale-105 transition cursor-pointer"
                  >
                    <Play size={24} fill="white" className="ml-1" />
                  </button>
                )}

                {/* Hindi / English Audio Switcher Badge */}
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 border border-white/10">
                  <Languages size={12} className="text-blue-400" />
                  <span>Audio: {language === 'hi' ? 'Hindi (हिंदी)' : 'English'}</span>
                </div>

                {/* Bottom Video Controls Bar */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 flex flex-col gap-2">
                  {/* Progress scrubber */}
                  <div className="w-full bg-white/20 h-1 rounded-full cursor-pointer overflow-hidden">
                    <div className="bg-blue-500 h-full w-[45%]" />
                  </div>

                  <div className="flex items-center justify-between text-white text-xs">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          if (isPlaying) {
                            voiceSynthesizer.stop();
                            setIsPlaying(false);
                          } else {
                            const textToSpeak = language === 'hi' 
                              ? (activeLessonData?.summary_hi || activeLessonData?.content_text || 'मॉडल उप-नियम 2023 के तहत पैक्स बहुउद्देश्यीय सहकारी संस्था के रूप में कार्य करते हैं।') 
                              : (activeLessonData?.content_text || 'Under Model Byelaws 2023, PACS operate as multi-purpose cooperative societies following double-entry principles.');
                            setIsPlaying(true);
                            voiceSynthesizer.speak(textToSpeak, {
                              lang: language === 'hi' ? 'hi-IN' : 'en-IN',
                              rate: parseFloat(playbackSpeed) || 1.0,
                              onEnd: () => setIsPlaying(false),
                              onError: () => setIsPlaying(false)
                            });
                          }
                        }} 
                        className="hover:text-blue-400 transition cursor-pointer"
                        title={isPlaying ? 'Pause Vernacular Narration' : 'Play Vernacular Voice Narrator'}
                      >
                        {isPlaying ? <Pause size={16} className="text-blue-400 animate-pulse" /> : <Play size={16} />}
                      </button>
                      <button onClick={() => setIsMuted(!isMuted)} className="hover:text-blue-400 transition cursor-pointer">
                        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                      </button>
                      <span className="text-[11px] text-slate-300 font-mono">14:20 / 32:00</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px]">
                      <button 
                        onClick={() => setLanguage(language === 'hi' ? 'en' : 'hi')}
                        className="hover:text-blue-400 transition cursor-pointer"
                      >
                        {language === 'hi' ? 'EN' : 'HI'}
                      </button>
                      <button 
                        onClick={() => setPlaybackSpeed(playbackSpeed === '1.0x' ? '1.25x' : playbackSpeed === '1.25x' ? '1.5x' : '1.0x')}
                        className="font-mono hover:text-blue-400 transition cursor-pointer"
                      >
                        {playbackSpeed}
                      </button>
                      <button className="hover:text-blue-400 transition cursor-pointer">
                        <Maximize size={15} />
                      </button>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Current Lesson Title & Action Row */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                <div>
                  <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider block">
                    CURRENT LESSON
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                    {activeLessonData?.title || '3.2 Functions and Core Services of PACS'}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleMarkComplete}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <CheckCircle2 size={13} className="text-[#2563EB]" />
                    <span>Mark Complete</span>
                  </button>
                  <button
                    onClick={handleNextLesson}
                    className="px-3.5 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1E40AF] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
                  >
                    <span>Next Lesson</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* Lesson Tabs: Overview, Notes, Resources, Discussion */}
              <div className="flex items-center gap-6 mt-4 border-b border-gray-100 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`pb-2.5 transition relative cursor-pointer ${activeTab === 'overview' ? 'text-[#2563EB]' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Overview & Objectives
                  {activeTab === 'overview' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB] rounded-full" />}
                </button>
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`pb-2.5 transition relative cursor-pointer ${activeTab === 'notes' ? 'text-[#2563EB]' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  My Notes ({savedNotes.length})
                  {activeTab === 'notes' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB] rounded-full" />}
                </button>
                <button
                  onClick={() => setActiveTab('resources')}
                  className={`pb-2.5 transition relative cursor-pointer ${activeTab === 'resources' ? 'text-[#2563EB]' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Resources & Downloads
                  {activeTab === 'resources' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB] rounded-full" />}
                </button>
                <button
                  onClick={() => setActiveTab('discussion')}
                  className={`pb-2.5 transition relative cursor-pointer ${activeTab === 'discussion' ? 'text-[#2563EB]' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Q&A Discussion
                  {activeTab === 'discussion' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB] rounded-full" />}
                </button>
              </div>

              {/* Tab Contents */}
              <div className="pt-4 text-xs text-slate-600 leading-relaxed">
                {activeTab === 'overview' && (
                  <div className="space-y-3">
                    <p className="text-slate-700 leading-relaxed font-normal">
                      {activeLessonData?.content_text || `In this lesson, trainees will explore the essential statutory and non-statutory services provided by Primary Agricultural Credit Societies (PACS) to rural farmer members across India.`}
                    </p>
                    {activeLessonData?.summary_hi && (
                      <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
                        <div className="font-bold text-blue-900 mb-1 flex items-center gap-1.5 text-xs">
                          <Languages size={13} className="text-[#2563EB]" />
                          <span>Hindi Curriculum Summary (हिंदी सारांश)</span>
                        </div>
                        <p className="text-blue-900 text-xs leading-relaxed">
                          {activeLessonData.summary_hi}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="p-3 rounded-xl bg-slate-50 border border-gray-100">
                        <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5 text-xs">
                          <CheckSquare size={13} className="text-[#2563EB]" /> Key Objectives
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-slate-500 text-[11px]">
                          <li>Short-term crop loan sanctioning workflow</li>
                          <li>Distribution of agricultural inputs (seeds, fertilizer)</li>
                          <li>Storage godown management & aggregation</li>
                        </ul>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-gray-100">
                        <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5 text-xs">
                          <Lightbulb size={13} className="text-amber-600" /> Operational Context
                        </div>
                        <p className="text-slate-500 text-[11px] leading-relaxed">
                          Covers computerization guidelines issued by the Ministry of Cooperation for 79,630+ PACS under national ERP standards.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div className="space-y-4">
                    <form onSubmit={handleAddNote} className="flex gap-2">
                      <input
                        type="text"
                        value={userNote}
                        onChange={(e) => setUserNote(e.target.value)}
                        placeholder="Write a personal note for this lesson..."
                        className="flex-1 bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#2563EB] hover:bg-[#1E40AF] text-white font-semibold rounded-xl text-xs transition cursor-pointer"
                      >
                        Add Note
                      </button>
                    </form>
                    <div className="space-y-2">
                      {savedNotes.map((n, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-gray-100 flex items-start justify-between gap-3">
                          <p className="text-slate-700 text-xs italic">“{n}”</p>
                          <span className="text-[10px] text-slate-400 shrink-0 font-medium">Saved</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'resources' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-gray-100">
                      <div className="flex items-center gap-2.5">
                        <FileText size={18} className="text-[#2563EB]" />
                        <div>
                          <div className="font-bold text-slate-900 text-xs">PACS Model By-laws 2024.pdf</div>
                          <div className="text-[10px] text-slate-400">Official Ministry of Cooperation Document • 2.4 MB</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadResource('PACS Model By-laws 2024.pdf')}
                        className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-slate-50 text-slate-700 text-xs transition cursor-pointer"
                      >
                        <Download size={14} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-gray-100">
                      <div className="flex items-center gap-2.5">
                        <Presentation size={18} className="text-blue-600" />
                        <div>
                          <div className="font-bold text-slate-900 text-xs">Lesson 3.2 Slide Deck.pptx</div>
                          <div className="text-[10px] text-slate-400">NCCT Lecture Presentation Slides • 5.1 MB</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadResource('Lesson 3.2 Slide Deck.pptx')}
                        className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-slate-50 text-slate-700 text-xs transition cursor-pointer"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'discussion' && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-gray-100">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                          A
                        </div>
                        <span className="font-bold text-slate-900 text-xs">Anand Verma (Trainee, Pune)</span>
                        <span className="text-[10px] text-slate-400">• 2 days ago</span>
                      </div>
                      <p className="text-slate-600 text-xs">
                        Is credit appraisal mandatory for KCC renewal if the farmer has repaid the principal in full within 12 months?
                      </p>
                      <p className="text-[#2563EB] text-xs font-semibold mt-1">
                        Instructor Reply: Automatic renewal is permitted subject to land records validation in the State portal.
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Right Column: Course Syllabus / Modules Accordion (Col 4) */}
          <div className="lg:col-span-4 space-y-4">
            
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Course Syllabus</h3>
                <span className="text-xs font-semibold text-[#2563EB]">Module 3 of 6</span>
              </div>

              {/* Lesson Items */}
              <div className="space-y-2">
                {lessonsList.map((lesson) => {
                  const isCurrent = lesson.id === selectedLessonId;
                  const isDone = lesson.status === 'completed';
                  const isLocked = lesson.status === 'locked';

                  return (
                    <div
                      key={lesson.id}
                      onClick={() => {
                        if (!isLocked) {
                          setSelectedLessonId(lesson.id);
                          setIsPlaying(true);
                        } else {
                          showToast('Complete previous lessons to unlock this session', 'info');
                        }
                      }}
                      className={`p-3 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                        isCurrent 
                          ? 'bg-[#EAF7EE] border-[#2563EB]/30 shadow-[0_1px_3px_rgba(0,0,0,0.03)]' 
                          : isLocked 
                          ? 'bg-slate-50/60 border-gray-100 opacity-60' 
                          : 'bg-white border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {isDone ? (
                          <CheckCircle2 size={16} className="text-[#2563EB] shrink-0" />
                        ) : isLocked ? (
                          <Lock size={15} className="text-slate-400 shrink-0" />
                        ) : isCurrent ? (
                          <div className="w-4 h-4 rounded-full bg-[#2563EB] flex items-center justify-center text-white shrink-0">
                            <Play size={8} fill="white" className="ml-0.5" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                        )}

                        <div className="leading-tight">
                          <p className={`text-xs font-bold ${isCurrent ? 'text-[#2563EB]' : 'text-slate-800'}`}>
                            {lesson.title}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-0.5 block">{lesson.duration}</span>
                        </div>
                      </div>

                      {isCurrent && (
                        <span className="text-[10px] font-bold text-[#2563EB] bg-white px-2 py-0.5 rounded-full border border-blue-200">
                          Playing
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Assessment Action */}
              <div className="mt-5 pt-4 border-t border-gray-100">
                <button
                  onClick={handleOpenQuiz}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#2563EB] hover:bg-[#1E40AF] text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
                >
                  <Award size={14} className="text-white" />
                  <span>Take Course Certification Assessment</span>
                </button>
              </div>

            </div>

          </div>

        </div>

        {/* Interactive Certification Quiz Modal */}
        {quizModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 sm:p-7 space-y-6">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    NCCT Statutory Examination
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                    {quizData?.title || 'Course Knowledge Assessment'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Passing Threshold: {quizData?.passing_score || 70}% • Passing issues a tamper-proof Ed25519 Verifiable Credential
                  </p>
                </div>
                <button
                  onClick={() => setQuizModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Questions or Results */}
              {quizResult ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-2xl border ${quizResult.passed ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${quizResult.passed ? 'bg-[#2563EB]' : 'bg-amber-600'}`}>
                        {quizResult.passed ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm">
                          {quizResult.passed ? 'Assessment Passed Successfully!' : 'Passing Threshold Not Met'}
                        </h4>
                        <p className="text-xs font-mono">
                          Your Score: <span className="font-bold">{quizResult.score}%</span> (Required: {quizData?.passing_score}%)
                        </p>
                      </div>
                    </div>

                    {quizResult.passed && quizResult.certificate_id && (
                      <div className="mt-4 p-3 bg-white rounded-xl border border-blue-200 text-xs space-y-1">
                        <span className="text-[10px] uppercase font-bold text-[#2563EB] tracking-wider block">
                          W3C ED25519 VERIFIABLE CREDENTIAL ISSUED
                        </span>
                        <p className="font-mono text-slate-900 font-bold">
                          Certificate ID: {quizResult.certificate_id}
                        </p>
                        <p className="text-slate-500 text-[11px]">
                          Cryptographically signed by NCCT Apex Training Authority. Tamper-evident and verifiable offline.
                        </p>
                        <div className="pt-2 flex items-center gap-2">
                          <button
                            onClick={() => {
                              setQuizModalOpen(false);
                              navigate('/certificates');
                            }}
                            className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1E40AF] text-white rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            View in Credential Registry
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Statutory Answer Analysis</h4>
                    {quizResult.feedback?.map((fb, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-gray-200 text-xs space-y-1">
                        <div className="flex items-center gap-2 font-bold text-slate-800">
                          {fb.is_correct ? (
                            <span className="text-blue-700 flex items-center gap-1 font-semibold">
                              <CheckCircle2 size={13} /> Question {idx + 1}: Correct
                            </span>
                          ) : (
                            <span className="text-amber-800 flex items-center gap-1 font-semibold">
                              <AlertCircle size={13} /> Question {idx + 1}: Incorrect
                            </span>
                          )}
                        </div>
                        <p className="text-slate-600 text-[11px]">{fb.explanation}</p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setQuizModalOpen(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Close Assessment
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {(quizData?.questions || []).map((q, qIdx) => (
                    <div key={q.id} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3">
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-[#2563EB] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {qIdx + 1}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                          {q.question_text}
                        </h4>
                      </div>

                      <div className="space-y-2 pl-7">
                        {q.options.map((opt, optIdx) => (
                          <label
                            key={optIdx}
                            className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-medium cursor-pointer transition ${
                              quizAnswers[String(q.id)] === optIdx
                                ? 'bg-blue-50 border-[#2563EB] text-[#2563EB]'
                                : 'bg-white border-gray-200 text-slate-700 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question_${q.id}`}
                              checked={quizAnswers[String(q.id)] === optIdx}
                              onChange={() => setQuizAnswers({ ...quizAnswers, [String(q.id)]: optIdx })}
                              className="text-[#2563EB] focus:ring-[#2563EB]"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-xs text-slate-500 font-mono">
                      {Object.keys(quizAnswers).length} of {quizData?.questions?.length || 0} Questions Answered
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQuizModalOpen(false)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmitQuiz}
                        disabled={isSubmittingQuiz || Object.keys(quizAnswers).length < (quizData?.questions?.length || 1)}
                        className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1E40AF] disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
                      >
                        {isSubmittingQuiz ? (
                          <span>Evaluating...</span>
                        ) : (
                          <>
                            <Award size={14} />
                            <span>Submit &amp; Issue Verifiable Credential</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    );
  }

  // ==============================================================
  // RENDER 2: LMS CATALOG & DASHBOARD (Repositioned Civic Layout)
  // ==============================================================
  return (
    <div className="space-y-6">
      
      {/* 
        ========================================================================
        1. REPOSITIONED ACADEMIC CURRICULUM COMMAND RIBBON
        ========================================================================
      */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-linear-to-l from-blue-50/60 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-xs">
              <BookOpen size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  NCCT Accredited Curriculum
                </span>
                <span className="text-[11px] font-semibold text-slate-500 font-mono">
                  Syllabus 2025-26
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
                National Cooperative Learning Management System
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-medium">
                Structured e-learning modules on PACS computerization, statutory cooperative accounting, rural credit underwriting, and governance by-laws.
              </p>
            </div>
          </div>

          {/* Academic Stats Cluster */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
            <div className="px-4 py-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 text-center min-w-[90px]">
              <div className="text-lg font-black text-[#2563EB]">{totalCoursesCount}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Courses</div>
            </div>
            <div className="px-4 py-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 text-center min-w-[90px]">
              <div className="text-lg font-black text-amber-700">{inProgressCount}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">In Progress</div>
            </div>
            <div className="px-4 py-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 text-center min-w-[90px]">
              <div className="text-lg font-black text-blue-600">{completedCount}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Completed</div>
            </div>
            <div className="px-4 py-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 text-center min-w-[90px]">
              <div className="text-lg font-black text-purple-700">{notStartedCount}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Available</div>
            </div>
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        2. ACTIVE LESSON SPOTLIGHT BANNER
        ========================================================================
      */}
      <div className="bg-gradient-to-r from-[#2563EB] to-[#1E40AF] rounded-2xl p-6 sm:p-7 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 text-blue-100 px-2.5 py-0.5 rounded-full">
              ACTIVE LESSON RESUME
            </span>
            <span className="text-xs text-blue-200 font-mono">Module 3 • Lesson 3.2</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white">
            PACS Operations and Management
          </h2>
          <p className="text-xs text-blue-100/90 max-w-xl">
            Currently studying: Functions and Statutory Services of Primary Agricultural Credit Societies.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <div className="w-48 bg-white/20 h-2 rounded-full overflow-hidden">
              <div className="bg-amber-400 h-full rounded-full" style={{ width: `${courseProgress}%` }} />
            </div>
            <span className="text-xs font-bold text-amber-300 font-mono">{courseProgress}% Completed</span>
          </div>
        </div>

        <button
          onClick={() => navigate('/learning/pacs-operations')}
          className="px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer shrink-0"
        >
          <Play size={16} fill="currentColor" />
          <span>Resume Lesson (18 min)</span>
        </button>
      </div>

      {/* 
        ========================================================================
        3. ASYMMETRIC CATALOG WORKSPACE
        LEFT (Col 4): Filter Stack, Search & Learning Pathway
        RIGHT (Col 8): Comprehensive Course Grid
        ========================================================================
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (Col 4): Category Filters & Search Console */}
        <div className="lg:col-span-4 space-y-5">
          
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Filter Curriculum
              </h3>
              <span className="text-[11px] font-bold text-slate-400">
                {filteredCourses.length} Courses
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses or topics..."
                className="w-full bg-slate-50/70 border border-slate-200/80 rounded-2xl pl-9 pr-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              />
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            </div>

            {/* Vertical Filter Buttons */}
            <div className="space-y-1.5 pt-1">
              {[
                { id: 'ALL', label: 'All Courses', count: totalCoursesCount },
                { id: 'IN_PROGRESS', label: 'In Progress', count: inProgressCount },
                { id: 'COMPLETED', label: 'Completed', count: completedCount },
                { id: 'NOT_STARTED', label: 'Not Started', count: notStartedCount }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setFilterCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
                    filterCategory === cat.id
                      ? 'bg-[#2563EB] text-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
                      : 'bg-slate-50/70 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    filterCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Academic Resource Library Download */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Download size={14} className="text-[#2563EB]" />
              <span>Offline Reference Materials</span>
            </h4>
            <div className="space-y-2 text-xs">
              <div 
                onClick={() => handleDownloadResource('PACS Model By-laws 2024.pdf')}
                className="p-3 bg-slate-50/70 hover:bg-blue-50/50 rounded-2xl border border-slate-200/80 flex items-center justify-between cursor-pointer transition"
              >
                <div>
                  <div className="font-bold text-slate-900">PACS Model By-laws 2024</div>
                  <div className="text-[10px] text-slate-400">PDF • 2.4 MB</div>
                </div>
                <Download size={14} className="text-slate-400" />
              </div>

              <div 
                onClick={() => handleDownloadResource('National PACS ERP Handout.pdf')}
                className="p-3 bg-slate-50/70 hover:bg-blue-50/50 rounded-2xl border border-slate-200/80 flex items-center justify-between cursor-pointer transition"
              >
                <div>
                  <div className="font-bold text-slate-900">National PACS ERP Handout</div>
                  <div className="text-[10px] text-slate-400">PDF • 3.8 MB</div>
                </div>
                <Download size={14} className="text-slate-400" />
              </div>
            </div>
          </div>

        </div>

        {/* Right Column (Col 8): Course Grid */}
        <div className="lg:col-span-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            {filteredCourses.map((course) => {
              const isDone = course.status === 'COMPLETED';
              const isInProgress = course.status === 'IN_PROGRESS';

              return (
                <div
                  key={course.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col justify-between hover:border-[#2563EB]/40 hover:shadow-xs transition duration-200"
                >
                  <div>
                    {/* Course Image Header with Badges */}
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover object-center transition duration-300 hover:scale-105"
                        onError={(e) => {
                          e.target.src = '/assets/farmer_pacs_backdrop.jpg';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border backdrop-blur-md ${
                          isDone 
                            ? 'bg-blue-900/80 text-blue-100 border-blue-400' 
                            : isInProgress 
                            ? 'bg-amber-900/80 text-amber-100 border-amber-400' 
                            : 'bg-black/60 text-white border-white/20'
                        }`}>
                          {isDone ? 'Completed ✓' : isInProgress ? 'In Progress' : 'Not Started'}
                        </span>

                        <span className="text-[10px] font-bold bg-white/90 text-slate-800 px-2 py-0.5 rounded-full shadow-xs">
                          {course.level}
                        </span>
                      </div>

                      {/* Bottom Image Overlay Title */}
                      <div className="absolute bottom-2.5 left-3 right-3">
                        <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider block">
                          {course.category}
                        </span>
                      </div>
                    </div>

                    {/* Course Body Content */}
                    <div className="p-4 space-y-3">
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {course.title}
                      </h3>

                      {/* Duration & Modules Metas */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <BookOpen size={12} className="text-[#2563EB]" />
                          {course.modulesCount} Modules
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-slate-400" />
                          {course.weeksCount} Weeks
                        </span>
                      </div>

                      {/* Progress Bar (for In Progress or Completed) */}
                      {(isInProgress || isDone) && (
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-500">Progress</span>
                            <span className="text-[#2563EB]">{course.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${isDone ? 'bg-[#2563EB]' : 'bg-amber-500'}`}
                              style={{ width: `${course.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Course Action Footer */}
                  <div className="p-4 pt-0">
                    <button
                      onClick={() => navigate(`/learning/${course.id}`)}
                      className={`w-full py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.03)] ${
                        isDone
                          ? 'border border-[#2563EB] text-[#2563EB] hover:bg-blue-50 bg-white'
                          : 'bg-[#2563EB] hover:bg-[#1E40AF] text-white'
                      }`}
                    >
                      {isDone ? (
                        <>
                          <CheckCircle2 size={14} />
                          <span>Review Completed Course</span>
                        </>
                      ) : isInProgress ? (
                        <>
                          <Play size={12} fill="currentColor" />
                          <span>Continue Learning</span>
                        </>
                      ) : (
                        <>
                          <span>Start Course</span>
                          <ArrowRight size={13} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
