import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  Sparkles, Briefcase, BookOpen, Star, Bot, ArrowRight, 
  Send, ChevronRight, CheckCircle2, AlertCircle, FileText, 
  Video, UserCheck, Search, Building2, MapPin, Check,
  Mic, MicOff, Volume2, ShieldCheck, TrendingUp, Compass,
  Layers, ExternalLink
} from 'lucide-react';
import { apiRequest } from '../api';
import { voiceSynthesizer } from '../services/voiceSynthesizer';

export default function AiCareerGuidancePage() {
  const { showToast, appliedJobIds, toggleApplyJob } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'ai',
      text: 'Namaste Rohit! 👋 I am your Sahakar-Link AI Career Advisory Officer. Based on your completed PACS Operations certification and 85% attendance, I can recommend targeted cooperative banking and rural leadership roles. How can I assist you today?'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const initialPromptProcessed = useRef(false);
  const chatEndRef = useRef(null);

  const careerPaths = [
    {
      id: 'cp-1',
      title: 'Cooperative Manager',
      desc: 'Supervise primary society operations, member services, and statutory audits.',
      match: 92,
      badge: 'Best Match',
      image: '/assets/career_coop_manager.jpg',
      salary: '₹3.6 - 5.5 LPA',
      demand: 'High'
    },
    {
      id: 'cp-2',
      title: 'Rural Finance Officer',
      desc: 'Facilitate priority sector lending, Kisan Credit Cards, and SHG financing.',
      match: 85,
      image: '/assets/career_rural_finance.jpg',
      salary: '₹3.2 - 4.8 LPA',
      demand: 'High'
    },
    {
      id: 'cp-3',
      title: 'Community Development Executive',
      desc: 'Lead grassroots outreach, farmer producer mobilization, and governance.',
      match: 78,
      image: '/assets/career_community_dev.jpg',
      salary: '₹2.8 - 4.0 LPA',
      demand: 'Moderate'
    },
    {
      id: 'cp-4',
      title: 'MIS & PACS Data Analyst',
      desc: 'Manage daily National Cooperative Database synchronization and ledger auditing.',
      match: 72,
      image: '/assets/career_mis_analyst.jpg',
      salary: '₹3.0 - 4.5 LPA',
      demand: 'High'
    },
    {
      id: 'cp-5',
      title: 'Agricultural Extension Officer',
      desc: 'Provide input logistics, cooperative warehousing, and soil health advisory.',
      match: 68,
      image: '/assets/career_agri_extension.jpg',
      salary: '₹2.6 - 3.8 LPA',
      demand: 'Moderate'
    }
  ];

  const jobs = [
    {
      id: 'job-1',
      title: 'PACS Junior Accounts Assistant',
      org: 'Jharkhand State Cooperative Bank',
      loc: 'Ranchi, Jharkhand',
      type: 'Full Time',
      exp: 'Entry Level',
      matchScore: '92%'
    },
    {
      id: 'job-2',
      title: 'PACS Computerization Operator',
      org: 'Dhanbad Primary Credit Society',
      loc: 'Dhanbad, Jharkhand',
      type: 'Full Time',
      exp: '0-2 Years',
      matchScore: '88%'
    },
    {
      id: 'job-3',
      title: 'Field Credit Coordinator',
      org: 'Rural Development Cooperative Union',
      loc: 'Hazaribagh, Jharkhand',
      type: 'Full Time',
      exp: '1-3 Years',
      matchScore: '81%'
    },
    {
      id: 'job-4',
      title: 'MIS Reporting Officer',
      org: 'Bihar & Jharkhand Cooperative Milk Federation',
      loc: 'Patna, Bihar',
      type: 'Full Time',
      exp: '1-3 Years',
      matchScore: '79%'
    }
  ];

  const handleSendMessage = async (msgText) => {
    const text = msgText || chatInput;
    if (!text.trim()) return;

    const userMsg = { sender: 'user', text };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setLoadingAi(true);

    try {
      // Connect to genuine backend grounded RAG endpoint /ai/ask
      const res = await apiRequest('/ai/ask', {
        method: 'POST',
        body: JSON.stringify({ question: text })
      }).catch(() => null);

      setTimeout(() => {
        if (res && res.answer) {
          setChatMessages(prev => [...prev, {
            sender: 'ai',
            text: res.answer,
            sources: res.sources,
            isGrounded: res.is_grounded,
            guardrailStatus: res.guardrail_status
          }]);
        } else {
          // Fallback intelligent simulated career coach response
          let reply = "Based on NCCT cooperative competency frameworks, strengthening your 'Advanced Excel & MIS' and 'PACS Statutory Accounting' skills will accelerate your qualification for Managerial roles.";
          if (text.toLowerCase().includes('job')) {
            reply = "I found 3 open positions in Jharkhand PACS that value your certified 'PACS Operations' credential. You meet 92% of the prerequisite criteria!";
          } else if (text.toLowerCase().includes('course') || text.toLowerCase().includes('learn')) {
            reply = "I recommend enrolling in 'Digital Tools for PACS' (Module 5). Completing it will close your digital tools skill gap from 60% to 85%.";
          } else if (text.toLowerCase().includes('lacking') || text.toLowerCase().includes('lack')) {
            reply = "Based on your current profile, you are lacking in 'Digital Tools' (60%) and 'Leadership' (65%). To become fully job-ready for a Cooperative Manager role, I recommend completing the 'Digital Tools for PACS' and 'Cooperative Leadership' modules. This will boost your overall readiness by 15%.";
          }
          setChatMessages(prev => [...prev, { sender: 'ai', text: reply }]);
        }
        setLoadingAi(false);
      }, 400);
      
    } catch (e) {
      setTimeout(() => {
        setChatMessages(prev => [...prev, { 
          sender: 'ai', 
          text: 'To qualify for the District Central Cooperative Bank clerical exam, ensure your attendance remains above 75% and finish the credit underwriting module.' 
        }]);
        setLoadingAi(false);
      }, 400);
    }
  };

  // Voice Speech Recognition Trigger (Browser Native Web Speech API)
  const toggleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      showToast('Speech recognition not supported in this browser. Please use keyboard.', 'error');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        showToast('Listening... Speak now', 'info');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setChatInput(transcript);
        setIsListening(false);
        handleSendMessage(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
        showToast('Voice input cancelled or unavailable', 'error');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      setIsListening(false);
    }
  };

  useEffect(() => {
    if (location.state?.initialPrompt && !initialPromptProcessed.current) {
      initialPromptProcessed.current = true;
      handleSendMessage(location.state.initialPrompt);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, loadingAi]);

  return (
    <div className="space-y-6">
      
      {/* 
        ========================================================================
        1. REPOSITIONED AI READINESS COCKPIT
        ========================================================================
      */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-linear-to-l from-blue-50/60 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Bot size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  Adaptive RAG Engine • NCCT Taxonomy
                </span>
                <span className="text-[11px] font-semibold text-slate-500 font-mono">
                  Model: NCCT-Llama3-Grounded
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
                AI Career Advisory & Opportunity Navigator
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-medium">
                Personalized career progression maps aligned with the National Cooperative Capacity Framework. 
                Ask natural language questions about exams, salary scales, cooperative vacancies, or specific skill gaps.
              </p>
            </div>
          </div>

          {/* Quick Metrics Cluster */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
            <div className="px-4 py-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 text-center min-w-[95px]">
              <div className="text-lg font-black text-[#2563EB]">78%</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Readiness</div>
            </div>
            <div className="px-4 py-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 text-center min-w-[95px]">
              <div className="text-lg font-black text-slate-900">5</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Matched Roles</div>
            </div>
            <div className="px-4 py-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 text-center min-w-[95px]">
              <div className="text-lg font-black text-amber-700">3</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Skill Gaps</div>
            </div>
            <button
              onClick={() => navigate('/jobs')}
              className="px-4 py-3 bg-[#2563EB] hover:bg-[#1E40AF] text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 transition shadow-[0_1px_3px_rgba(0,0,0,0.03)] cursor-pointer"
            >
              <Briefcase size={14} />
              <span>Explore Jobs</span>
            </button>
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        2. DUAL-ENGINE ASYMMETRIC WORKSPACE
        LEFT (Col 5): Primary AI Conversational Coach & Preparation Tools
        RIGHT (Col 7): Radar Chart, Skill Gap Breakdown & Recommended Pathways
        ========================================================================
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (Col 5): Live Interactive AI Career Officer */}
        <div className="lg:col-span-5 space-y-5">
          
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-5 sm:p-6 flex flex-col h-[620px]">
            {/* Coach Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center border border-blue-100">
                  <Bot size={18} />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Interactive Career Advisor
                  </h2>
                  <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Online • Grounded RAG
                  </span>
                </div>
              </div>

              {/* Voice button */}
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  isListening 
                    ? 'bg-red-50 text-red-600 border-red-300 animate-pulse' 
                    : 'bg-slate-50/70 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                }`}
                title="Voice Input (Speech-to-Text)"
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            </div>

            {/* Quick Query Suggestions */}
            <div className="py-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-gray-100">
              <button
                onClick={() => handleSendMessage('Explain KCC 4% net interest rate and prompt repayment incentive rules')}
                className="text-[11px] font-medium bg-slate-50/70 hover:bg-blue-50 text-slate-700 hover:text-[#2563EB] px-3 py-1.5 rounded-xl border border-slate-200/80 whitespace-nowrap transition cursor-pointer"
              >
                KCC 4% Subvention
              </button>
              <button
                onClick={() => handleSendMessage('What are the 25 diversified business activities under Model Byelaws 2023?')}
                className="text-[11px] font-medium bg-slate-50/70 hover:bg-blue-50 text-slate-700 hover:text-[#2563EB] px-3 py-1.5 rounded-xl border border-slate-200/80 whitespace-nowrap transition cursor-pointer"
              >
                Model Byelaws 2023
              </button>
              <button
                onClick={() => handleSendMessage('What is the mandatory 5-step protocol for daily Day-Book closing in computerized PACS?')}
                className="text-[11px] font-medium bg-slate-50/70 hover:bg-blue-50 text-slate-700 hover:text-[#2563EB] px-3 py-1.5 rounded-xl border border-slate-200/80 whitespace-nowrap transition cursor-pointer"
              >
                Day-Book 5-Step Protocol
              </button>
              <button
                onClick={() => handleSendMessage('What governance reforms does the Multi-State Cooperative Societies Act 2023 mandate?')}
                className="text-[11px] font-medium bg-slate-50/70 hover:bg-blue-50 text-slate-700 hover:text-[#2563EB] px-3 py-1.5 rounded-xl border border-slate-200/80 whitespace-nowrap transition cursor-pointer"
              >
                MSCS Act 2023
              </button>
              <button
                onClick={() => handleSendMessage('Which skills should I improve for Cooperative Manager?')}
                className="text-[11px] font-medium bg-slate-50/70 hover:bg-blue-50 text-slate-700 hover:text-[#2563EB] px-3 py-1.5 rounded-xl border border-slate-200/80 whitespace-nowrap transition cursor-pointer"
              >
                Skill Gap
              </button>
            </div>

            {/* Conversational Stream */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 text-xs pr-1">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] p-3.5 rounded-2xl leading-relaxed text-xs ${
                      msg.sender === 'user' 
                        ? 'bg-[#2563EB] text-white rounded-br-xs shadow-[0_1px_3px_rgba(0,0,0,0.03)]' 
                        : 'bg-slate-50/70 text-slate-800 rounded-bl-xs border border-slate-200/80'
                    }`}
                  >
                    <div className="whitespace-pre-line">{msg.text}</div>
                    {msg.sender === 'ai' && (
                      <div className="mt-2 pt-1.5 flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            if (speakingIdx === idx) {
                              voiceSynthesizer.stop();
                              setSpeakingIdx(null);
                            } else {
                              setSpeakingIdx(idx);
                              voiceSynthesizer.speak(msg.text, {
                                lang: 'hi-IN',
                                onEnd: () => setSpeakingIdx(null),
                                onError: () => setSpeakingIdx(null)
                              });
                            }
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                            speakingIdx === idx
                              ? 'bg-[#2563EB] text-white animate-pulse'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Volume2 size={11} className={speakingIdx === idx ? 'animate-bounce' : ''} />
                          <span>{speakingIdx === idx ? 'Stop Audio' : 'Listen in Hindi'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (speakingIdx === `en-${idx}`) {
                              voiceSynthesizer.stop();
                              setSpeakingIdx(null);
                            } else {
                              setSpeakingIdx(`en-${idx}`);
                              voiceSynthesizer.speak(msg.text, {
                                lang: 'en-IN',
                                onEnd: () => setSpeakingIdx(null),
                                onError: () => setSpeakingIdx(null)
                              });
                            }
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                            speakingIdx === `en-${idx}`
                              ? 'bg-[#2563EB] text-white animate-pulse'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Volume2 size={11} className={speakingIdx === `en-${idx}` ? 'animate-bounce' : ''} />
                          <span>{speakingIdx === `en-${idx}` ? 'Stop Audio' : 'Listen in English'}</span>
                        </button>
                      </div>
                    )}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/80 space-y-1">
                        <div className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider flex items-center gap-1">
                          <ShieldCheck size={11} /> Grounded Statutory Citations ({msg.sources.length})
                        </div>
                        <div className="space-y-1">
                          {msg.sources.map((src, sIdx) => {
                            const isObj = typeof src === 'object' && src !== null;
                            const title = isObj ? (src.title || src.citation_id) : src;
                            const authority = isObj ? src.source : 'Ministry of Cooperation';
                            const cid = isObj ? src.citation_id : null;
                            return (
                              <div key={sIdx} className="p-1.5 rounded-lg bg-blue-50/70 border border-blue-200/80 text-[10px] font-mono text-slate-700">
                                <div className="font-bold text-slate-900 truncate">
                                  {cid ? `[${cid}] ` : ''}{title}
                                </div>
                                <div className="text-[9px] text-slate-500 font-sans truncate">
                                  Authority: {authority}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loadingAi && (
                <div className="flex items-center gap-2 text-slate-400 text-xs italic p-2">
                  <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-bounce delay-100" />
                  <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-bounce delay-200" />
                  <span>Synthesizing NCCT policy and job frameworks...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Console */}
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="pt-2.5 border-t border-gray-100 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about cooperative jobs, salaries, or courses..."
                className="flex-1 bg-slate-50/70 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              />
              <button
                type="submit"
                disabled={loadingAi}
                className="w-10 h-10 rounded-2xl bg-[#2563EB] hover:bg-[#1E40AF] text-white flex items-center justify-center shrink-0 transition shadow-[0_1px_3px_rgba(0,0,0,0.03)] cursor-pointer disabled:opacity-50"
              >
                <Send size={15} />
              </button>
            </form>
          </div>

          {/* Quick Career Acceleration Drawer */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#2563EB]" />
              <span>Career Acceleration Utilities</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div 
                onClick={() => showToast('Generating NCCT-certified Cooperative Bio-data PDF', 'info')}
                className="p-3 bg-slate-50/70 hover:bg-blue-50/50 rounded-2xl border border-slate-200/80 cursor-pointer transition"
              >
                <FileText size={16} className="text-[#2563EB] mb-1.5" />
                <div className="font-bold text-slate-900">Co-op Resume</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Auto-embeds Ed25519 QR</div>
              </div>

              <div 
                onClick={() => showToast('Launching AI Mock Interview for PACS Manager', 'info')}
                className="p-3 bg-slate-50/70 hover:bg-blue-50/50 rounded-2xl border border-slate-200/80 cursor-pointer transition"
              >
                <UserCheck size={16} className="text-blue-700 mb-1.5" />
                <div className="font-bold text-slate-900">Mock Interview</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Practice with voice feedback</div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column (Col 7): Radar Chart, Skill Gap Breakdown & Career Paths */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Radar Chart & Skill Gap Analysis Side-by-Side */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Comprehensive Trainee Skill Pentagon
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Benchmarked against 10,000+ certified cooperative personnel in India
                </p>
              </div>
              <button 
                onClick={() => navigate('/profile')}
                className="text-xs font-bold text-[#2563EB] hover:text-[#1E40AF] flex items-center gap-1 cursor-pointer"
              >
                <span>Edit Profile</span>
                <ChevronRight size={13} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              
              {/* Radar Chart */}
              <div className="md:col-span-6 flex flex-col items-center justify-center p-2 bg-slate-50/70 rounded-2xl border border-slate-200/80">
                <svg width="200" height="190" viewBox="0 0 220 220" className="overflow-visible">
                  {/* Grid Rings */}
                  <polygon points="110,20 188,65 188,155 110,200 32,155 32,65" fill="none" stroke="#E2E8F0" strokeWidth="1.5" />
                  <polygon points="110,50 162,80 162,140 110,170 58,140 58,80" fill="none" stroke="#E2E8F0" strokeWidth="1" />
                  <polygon points="110,80 136,95 136,125 110,140 84,125 84,95" fill="none" stroke="#E2E8F0" strokeWidth="1" />

                  {/* Benchmark Polygon */}
                  <polygon points="110,40 165,85 155,135 110,165 65,135 70,85" fill="rgba(217, 119, 6, 0.1)" stroke="#D97706" strokeWidth="1.5" strokeDasharray="3 3" />

                  {/* Candidate Skill Polygon */}
                  <polygon points="110,30 178,75 160,145 110,158 60,138 72,72" fill="rgba(13, 92, 88, 0.25)" stroke="#2563EB" strokeWidth="2.5" />

                  {/* Vertices */}
                  <circle cx="110" cy="30" r="4" fill="#2563EB" />
                  <circle cx="178" cy="75" r="4" fill="#2563EB" />
                  <circle cx="160" cy="145" r="4" fill="#2563EB" />
                  <circle cx="110" cy="158" r="4" fill="#2563EB" />
                  <circle cx="60" cy="138" r="4" fill="#2563EB" />
                  <circle cx="72" cy="72" r="4" fill="#2563EB" />
                </svg>

                <div className="flex items-center gap-4 text-[10px] text-slate-500 font-semibold mt-2">
                  <span className="flex items-center gap-1 text-[#2563EB]">
                    <span className="w-2 h-2 rounded-full bg-[#2563EB]" /> Rohit Kumar (You)
                  </span>
                  <span className="flex items-center gap-1 text-amber-700">
                    <span className="w-2 h-2 rounded-full bg-amber-600" /> National Average
                  </span>
                </div>
              </div>

              {/* Skill Scores Grid */}
              <div className="md:col-span-6 space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 bg-slate-50/70 rounded-xl border border-slate-200/80">
                  <span className="text-slate-600 font-medium">Cooperative Operations</span>
                  <span className="font-bold text-[#2563EB]">85%</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50/70 rounded-xl border border-slate-200/80">
                  <span className="text-slate-600 font-medium">Financial Literacy & Audit</span>
                  <span className="font-bold text-slate-900">70%</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50/70 rounded-xl border border-slate-200/80">
                  <span className="text-slate-600 font-medium">Digital Tools (MIS)</span>
                  <span className="font-bold text-red-600">60% (Gap)</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50/70 rounded-xl border border-slate-200/80">
                  <span className="text-slate-600 font-medium">Leadership & By-laws</span>
                  <span className="font-bold text-amber-700">65% (Gap)</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50/70 rounded-xl border border-slate-200/80">
                  <span className="text-slate-600 font-medium">Communication</span>
                  <span className="font-bold text-slate-900">78%</span>
                </div>
              </div>

            </div>
          </div>

          {/* Recommended Career Pathways */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Recommended Career Pathways
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Ranked by compatibility with your current certificates and attendance
                </p>
              </div>
              <span className="text-[11px] font-bold text-[#2563EB] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                5 Pathways
              </span>
            </div>

            <div className="space-y-3">
              {careerPaths.slice(0, 3).map((cp) => (
                <div
                  key={cp.id}
                  className="p-4 rounded-2xl border border-gray-200 hover:border-[#2563EB]/50 transition bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                      <img src={cp.image} alt={cp.title} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">{cp.title}</h4>
                        {cp.badge && (
                          <span className="text-[9px] font-bold bg-[#2563EB] text-white px-2 py-0.2 rounded-full">
                            {cp.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{cp.desc}</p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1 font-medium">
                        <span>Salary: <strong className="text-slate-700">{cp.salary}</strong></span>
                        <span>•</span>
                        <span>Demand: <strong className="text-blue-600">{cp.demand}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 justify-end">
                    <div className="text-right">
                      <div className="text-xs font-black text-[#2563EB]">{cp.match}% Match</div>
                      <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                        <div className="bg-[#2563EB] h-full rounded-full" style={{ width: `${cp.match}%` }} />
                      </div>
                    </div>
                    <button
                      onClick={() => showToast(`Opening pathway syllabus and qualification criteria for ${cp.title}`, 'info')}
                      className="px-3 py-1.5 rounded-xl border border-[#2563EB] text-[#2563EB] hover:bg-blue-50 text-xs font-bold transition cursor-pointer"
                    >
                      Explore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Job Opportunities Strip */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Direct Cooperative Society Vacancies
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Verified openings requiring your exact credentials
                </p>
              </div>
              <Link to="/jobs" className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1">
                <span>View All Openings</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {jobs.map((job) => {
                const isApplied = appliedJobIds.includes(job.id);
                return (
                  <div key={job.id} className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          {job.matchScore} Fit
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{job.type}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 mt-2">{job.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">{job.org}</p>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                        <MapPin size={10} />
                        <span>{job.loc}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleApplyJob(job.id)}
                      className={`w-full mt-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        isApplied 
                          ? 'bg-slate-200 text-slate-700 cursor-default' 
                          : 'bg-[#2563EB] hover:bg-[#1E40AF] text-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
                      }`}
                    >
                      {isApplied ? 'Applied ✓' : 'Instant Apply'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
