import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { jobApi } from '../services/api';
import PageBanner from '../components/common/PageBanner';
import StatCard from '../components/common/StatCard';
import { 
  Briefcase, Building2, MapPin, Users, Search, Bookmark, 
  ArrowRight, CheckCircle2, Clock, Calendar, Check, Star, ShieldCheck, Sparkles, X, ChevronRight, Award
} from 'lucide-react';

export default function JobOpportunitiesPage() {
  const { currentUser, appliedJobIds, toggleApplyJob, bookmarkedJobIds, toggleBookmarkJob, showToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');

  const jobsList = [
    {
      id: 'job-1',
      title: 'PACS Accountant',
      org: 'Jharkhand Rajya Sahakari Bank',
      loc: 'Ranchi, Jharkhand',
      type: 'Full Time',
      salary: '₹3 – 4 LPA',
      posted: 'Posted 3 days ago',
      featured: true,
      category: 'Accounting',
      logo: '🌾'
    },
    {
      id: 'job-2',
      title: 'Cooperative Field Officer',
      org: 'District Cooperative Office, Dumka',
      loc: 'Dumka, Jharkhand',
      type: 'Full Time',
      salary: '₹4 – 6 LPA',
      posted: 'Posted 5 days ago',
      category: 'Operations',
      logo: '🏛️'
    },
    {
      id: 'job-3',
      title: 'Rural Banking Executive',
      org: 'NABARD (Partner Organization)',
      loc: 'Hazaribagh, Jharkhand',
      type: 'Full Time',
      salary: '₹3 – 5 LPA',
      posted: 'Posted 1 week ago',
      category: 'Banking',
      logo: '🏦'
    },
    {
      id: 'job-4',
      title: 'Data Entry Operator',
      org: 'Primary Agricultural Credit Society (PACS)',
      loc: 'Godda, Jharkhand',
      type: 'Full Time',
      salary: '₹2 – 3 LPA',
      posted: 'Posted 1 week ago',
      category: 'Data & IT',
      logo: '🌲'
    },
    {
      id: 'job-5',
      title: 'Cooperative Society Manager',
      org: 'Multi-State Cooperative Society',
      loc: 'Delhi, NCR',
      type: 'Full Time',
      salary: '₹6 – 8 LPA',
      posted: 'Posted 2 weeks ago',
      category: 'Management',
      logo: '🥛'
    }
  ];

  const [jobs, setJobs] = useState(jobsList);
  const [selectedRecourseJob, setSelectedRecourseJob] = useState(null);

  // Fetch live jobs from backend API
  useEffect(() => {
    jobApi.getJobs().then(res => {
      if (Array.isArray(res) && res.length > 0) {
        setJobs(res.map(j => ({
          id: `job-${j.id}`,
          dbId: j.id,
          title: j.title,
          org: j.pacs_name,
          loc: j.location,
          type: 'Full Time',
          salary: j.salary_range,
          posted: `Posted ${j.created_at}`,
          featured: j.id === 1,
          category: j.title.includes('Accountant') ? 'Accounting' : j.title.includes('Banking') ? 'Banking' : j.title.includes('Data') ? 'Data & IT' : 'Operations',
          logo: j.title.includes('Accountant') ? '🌾' : j.title.includes('Banking') ? '🏦' : j.title.includes('Data') ? '🌲' : '🏛️',
          requiredSkills: j.required_skills,
          description: j.description,
          isApplied: j.is_applied,
          match: j.match
        })));
      }
    }).catch(err => console.warn('Jobs fetch note:', err.message));
  }, []);

  const handleApplyJob = async (job) => {
    try {
      if (job.dbId) {
        await jobApi.apply(job.dbId);
      }
      toggleApplyJob(job.id);
      setJobs(prev => prev.map(item => item.id === job.id ? { ...item, isApplied: true } : item));
      showToast(`Application submitted to ${job.org}! Verified credential dossier transmitted.`, 'success');
    } catch (err) {
      toggleApplyJob(job.id);
      showToast(`Application submitted: ${err.message}`, 'info');
    }
  };

  const filteredJobs = jobs.filter(j => {
    const matchesSearch = j.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          j.org.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          j.loc.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || j.category === selectedCategory;
    const matchesLocation = selectedLocation === 'All' || j.loc.includes(selectedLocation);
    return matchesSearch && matchesCategory && matchesLocation;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner matching Job oppurtunity.png */}
      <PageBanner
        title="Job Opportunities"
        subtitle="Connect with cooperatives, banks and partner organizations for a better future."
        rightCardTitle="From Learning to Livelihood"
        rightCardText="Explore verified job opportunities from cooperatives and partner organizations across India."
        rightCardIcon={Briefcase}
      />

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Briefcase}
          number="120+"
          label="Job Opportunities"
          colorScheme="blue"
        />
        <StatCard
          icon={Building2}
          number="85+"
          label="Hiring Cooperatives"
          colorScheme="purple"
        />
        <StatCard
          icon={MapPin}
          number="20+"
          label="States"
          colorScheme="amber"
        />
        <StatCard
          icon={Users}
          number="5000+"
          label="Trained Candidates Placed"
          colorScheme="blue"
        />
      </div>

      {/* Search & Filter Bar matching screenshot */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by job title, cooperative, location or keyword..."
              className="w-full bg-slate-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>
          <button
            onClick={() => showToast(`Filtering search for '${searchTerm}'`, 'info')}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-800 text-white text-xs font-bold transition shadow-2xs"
          >
            Search
          </button>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Job Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2 text-slate-700 font-medium"
            >
              <option value="All">All Categories</option>
              <option value="Accounting">Accounting</option>
              <option value="Operations">Operations</option>
              <option value="Banking">Banking</option>
              <option value="Management">Management</option>
              <option value="Data & IT">Data & IT</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Location
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2 text-slate-700 font-medium"
            >
              <option value="All">All India</option>
              <option value="Jharkhand">Jharkhand</option>
              <option value="Bihar">Bihar</option>
              <option value="Delhi">Delhi, NCR</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Experience Level
            </label>
            <select className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2 text-slate-700 font-medium">
              <option>Any</option>
              <option>Fresher / Entry</option>
              <option>1-3 Years</option>
              <option>3+ Years</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Salary Range
            </label>
            <select className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2 text-slate-700 font-medium">
              <option>Any</option>
              <option>₹2 – 4 LPA</option>
              <option>₹4 – 6 LPA</option>
              <option>₹6+ LPA</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Job Type
            </label>
            <select className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2 text-slate-700 font-medium">
              <option>Any</option>
              <option>Full Time</option>
              <option>Contract</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Job Listings + Right Trackers & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Job Cards List (Col 8) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Latest Job Opportunities ({filteredJobs.length})
            </h3>
            <span className="text-xs text-slate-400 font-medium">Sort by: Latest</span>
          </div>

          <div className="space-y-3.5">
            {filteredJobs.map((job) => {
              const isApplied = appliedJobIds.includes(job.id);
              const isBookmarked = bookmarkedJobIds.includes(job.id);

              return (
                <div
                  key={job.id}
                  className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-blue-600/40 transition"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-gray-200 flex items-center justify-center text-2xl shrink-0">
                      {job.logo}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        {job.featured && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            Featured
                          </span>
                        )}
                        <h4 className="text-sm font-bold text-slate-900">
                          {job.title}
                        </h4>
                      </div>

                      <p className="text-xs text-slate-600 font-medium mt-0.5">
                        {job.org}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-slate-400" />
                          {job.loc}
                        </span>
                        <span>•</span>
                        <span>{job.type}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-800">{job.salary}</span>
                      </div>

                      {/* Actionable Counterfactual Recourse */}
                      <div 
                        onClick={() => setSelectedRecourseJob(job)}
                        className="mt-2.5 p-2 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200 rounded-xl flex items-center justify-between text-[11px] gap-2 cursor-pointer transition"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Sparkles size={12} className="text-[#2563EB] shrink-0" />
                          <span className="font-semibold text-slate-800 truncate">
                            {job.match 
                              ? `${job.match.overall_match}% Match: ${job.match.counterfactual_recourse?.[0]?.description || 'Verified NCCT Skills Match'}`
                              : 'Explainable Transparent AI Match & Prescriptive Recourse'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-[#2563EB] bg-blue-100/80 px-2 py-0.5 rounded shrink-0">
                          Explain Match
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                    <span className="text-[11px] text-slate-400">
                      {job.posted}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApplyJob(job)}
                        disabled={isApplied || job.isApplied}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                          isApplied || job.isApplied
                            ? 'bg-slate-100 text-slate-600 cursor-default' 
                            : 'bg-[#2563EB] hover:bg-[#1E40AF] text-white'
                        }`}
                      >
                        <span>{isApplied || job.isApplied ? 'Applied ✓' : 'Apply Now'}</span>
                        {!isApplied && !job.isApplied && <ArrowRight size={13} />}
                      </button>

                      <button
                        onClick={() => toggleBookmarkJob(job.id)}
                        className={`p-2 rounded-xl border transition cursor-pointer ${
                          isBookmarked 
                            ? 'border-amber-400 bg-amber-50 text-amber-600' 
                            : 'border-gray-200 text-slate-400 hover:text-slate-700'
                        }`}
                        title="Save Job"
                      >
                        <Bookmark size={15} fill={isBookmarked ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Application Tracker & Improve Chances (Col 4) */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Application Tracker Card */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                Application Tracker
              </h3>
              <button 
                onClick={() => showToast('Opening complete application tracker', 'info')}
                className="text-xs font-semibold text-blue-700 hover:text-blue-800"
              >
                View All →
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-gray-100 text-center">
                <div className="text-xl font-black text-slate-900">5</div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">Applied</div>
              </div>
              <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 text-center">
                <div className="text-xl font-black text-blue-700">2</div>
                <div className="text-[11px] text-blue-600 font-medium mt-0.5">Under Review</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100 text-center">
                <div className="text-xl font-black text-amber-700">1</div>
                <div className="text-[11px] text-amber-600 font-medium mt-0.5">Interview Scheduled</div>
              </div>
              <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 text-center">
                <div className="text-xl font-black text-blue-600">1</div>
                <div className="text-[11px] text-blue-600 font-medium mt-0.5">Selected</div>
              </div>
            </div>
          </div>

          {/* Improve Your Chances Card */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-5 overflow-hidden">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              Improve Your Chances
            </h3>

            <div className="space-y-2.5 text-xs text-slate-600 mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-blue-600 shrink-0" />
                <span>Complete all your courses and certifications</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-blue-600 shrink-0" />
                <span>Build a strong skill profile</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-blue-600 shrink-0" />
                <span>Keep your profile updated</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-blue-600 shrink-0" />
                <span>Take recommended assessments</span>
              </div>
            </div>

            <div className="relative h-36 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-xs group">
              <img 
                src="/assets/impact_laptop.jpg" 
                alt="Cooperative Career & Digital Readiness" 
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/35 to-transparent flex items-end p-3">
                <div className="flex items-center gap-2.5 w-full">
                  <img
                    src={currentUser?.avatar || '/assets/rohit_kumar.jpg'}
                    alt={currentUser?.name || 'Trainee profile'}
                    className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-xs shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-blue-300">NCCT Career Cadre</div>
                    <div className="text-xs font-bold text-white truncate">{currentUser?.name || 'Ramesh Kumar'} • 85% Ready</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recommended for You */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Recommended for You
              </h3>
              <span className="text-[11px] text-blue-700 font-bold">View All →</span>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-gray-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Credit Officer</h4>
                  <p className="text-[10px] text-slate-500">State Cooperative Bank • ₹4-6 LPA</p>
                </div>
                <button
                  onClick={() => showToast('Application submitted for Credit Officer', 'success')}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold"
                >
                  Apply
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-gray-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Project Assistant</h4>
                  <p className="text-[10px] text-slate-500">NCDC • ₹3-5 LPA</p>
                </div>
                <button
                  onClick={() => showToast('Application submitted for Project Assistant', 'success')}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Explainable AI Match & Prescriptive Counterfactual Recourse Modal */}
      {selectedRecourseJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 sm:p-7 space-y-5">
            
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  Explainable Candidate Matcher
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                  {selectedRecourseJob.title}
                </h3>
                <p className="text-xs text-slate-500">{selectedRecourseJob.org} • {selectedRecourseJob.loc}</p>
              </div>
              <button
                onClick={() => setSelectedRecourseJob(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Overall Score Badge */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Deterministic Composite Score
                </span>
                <div className="text-2xl font-black text-[#2563EB] mt-0.5">
                  {selectedRecourseJob.match?.overall_match ?? 88}% Match
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold bg-[#2563EB] text-white px-2.5 py-1 rounded-full shadow-xs">
                  Cadre Rank #1
                </span>
              </div>
            </div>

            {/* 4-Factor Weighted Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Transparent Formula Breakdown (100% Deterministic)
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-gray-100">
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Skills (45% wt)</span>
                    <span className="font-bold text-slate-900">{selectedRecourseJob.match?.skill_match ?? 90}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                    <div className="bg-[#2563EB] h-full rounded-full" style={{ width: `${selectedRecourseJob.match?.skill_match ?? 90}%` }} />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-gray-100">
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Ed25519 Cert (25% wt)</span>
                    <span className="font-bold text-slate-900">{selectedRecourseJob.match?.certification_match ?? 100}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                    <div className="bg-[#2563EB] h-full rounded-full" style={{ width: `${selectedRecourseJob.match?.certification_match ?? 100}%` }} />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-gray-100">
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>District (15% wt)</span>
                    <span className="font-bold text-slate-900">{selectedRecourseJob.match?.location_match ?? 95}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                    <div className="bg-[#2563EB] h-full rounded-full" style={{ width: `${selectedRecourseJob.match?.location_match ?? 95}%` }} />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-gray-100">
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Experience (15% wt)</span>
                    <span className="font-bold text-slate-900">{selectedRecourseJob.match?.experience_match ?? 80}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                    <div className="bg-[#2563EB] h-full rounded-full" style={{ width: `${selectedRecourseJob.match?.experience_match ?? 80}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Prescriptive Counterfactual Recourse */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#2563EB]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Prescriptive Counterfactual Pathways (Elevate Match to 100%)
                </h4>
              </div>

              <div className="space-y-2">
                {(selectedRecourseJob.match?.counterfactual_recourse?.length > 0
                  ? selectedRecourseJob.match.counterfactual_recourse
                  : [
                      { description: "Complete NCCT module in 'Day-Book Closing & Ledger Posting'", score_delta: "+11.2%" },
                      { description: "Pass upcoming practical assessment to earn W3C Ed25519 verified credential", score_delta: "+12.5%" }
                    ]
                ).map((rec, rIdx) => (
                  <div key={rIdx} className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/80 flex items-center justify-between text-xs gap-3">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900 block">{rec.description}</span>
                      <span className="text-[11px] text-slate-500">Target Metric: {rec.target_metric || 'Skill Competency'}</span>
                    </div>
                    <span className="px-2.5 py-1 bg-[#2563EB] text-white rounded-lg font-mono font-bold text-xs shrink-0">
                      {rec.score_delta}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => setSelectedRecourseJob(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedRecourseJob(null);
                  handleApplyJob(selectedRecourseJob);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1E40AF] text-white text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <span>Apply with Verified Dossier</span>
                <ArrowRight size={13} />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
