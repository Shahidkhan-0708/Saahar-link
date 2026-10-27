import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest, getOfflineQueue, flushOfflineQueue, addToOfflineQueue, getAuthToken, setAuthToken } from '../api';

const AppContext = createContext();

export const DEMO_USERS = {
  TRAINEE: {
    id: 1,
    name: 'Ramesh Kumar',
    email: 'ramesh@sahakarlink.gov.in',
    role: 'TRAINEE',
    traineeId: 'SL202604812',
    programme: 'PACS Digitalization & Cooperative Management',
    centre: 'PACS Training Centre, Rampur, Uttar Pradesh',
    enrolledOn: '12 Aug 2025',
    courseEnds: '30 Nov 2025',
    avatar: '/assets/ramesh_kumar.jpg',
    streakDays: 12,
    completionRate: 68,
    attendanceRate: 85,
    modulesCompleted: 8,
    totalModules: 12,
    assessmentsCompleted: 3,
    totalAssessments: 4,
    pendingCerts: 1
  },
  RECRUITER: {
    id: 2,
    name: 'Anjali Mehta',
    email: 'recruiter@rampurpacs.coop',
    role: 'RECRUITER',
    organization: 'Rampur PACS Cooperative Federation',
    avatar: '/assets/anjali_mehta.jpg'
  },
  ADMIN: {
    id: 3,
    name: 'NCCT Admin',
    email: 'admin@rampur.ncct.gov.in',
    role: 'ADMIN',
    department: 'Ministry of Cooperation, GoI',
    avatar: '/assets/ncct_admin.jpg'
  },
  CENTRE_OPERATOR: {
    id: 4,
    name: 'Sunita Kumari',
    email: 'sunita@ranchitraining.ncct.gov.in',
    role: 'CENTRE_OPERATOR',
    centreName: 'Ranchi Cooperative Training Centre',
    centreId: 'JH-2026-042',
    avatar: '/assets/sunita_kumari.jpg'
  }
};

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(DEMO_USERS.TRAINEE);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [toast, setToast] = useState(null);
  
  // Modals state
  const [isKioskOpen, setIsKioskOpen] = useState(false);
  const [isErpSandboxOpen, setIsErpSandboxOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isAiCoachOpen, setIsAiCoachOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [activeAssessment, setActiveAssessment] = useState(null);
  const [registerLearnerOpen, setRegisterLearnerOpen] = useState(false);
  const [enrolCourseOpen, setEnrolCourseOpen] = useState(false);
  const [issueCertOpen, setIssueCertOpen] = useState(false);

  // Shortlisted & Applied state
  const [shortlistedIds, setShortlistedIds] = useState(['cand-1', 'cand-3']);
  const [appliedJobIds, setAppliedJobIds] = useState(['job-1', 'job-4']);
  const [bookmarkedJobIds, setBookmarkedJobIds] = useState(['job-2']);

  // Notifications
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Upcoming Assessment', message: 'PACS Accounting Basics scheduled tomorrow at 10:00 AM', time: '10m ago', unread: true },
    { id: 2, title: 'Certificate Ready', message: 'Your PACS Operations certificate is available for verification', time: '2h ago', unread: true },
    { id: 3, title: 'Job Recommendation', message: 'New PACS Accountant opening matches 92% of your skill profile', time: '1d ago', unread: false }
  ]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const switchRole = async (roleKey) => {
    if (DEMO_USERS[roleKey]) {
      setCurrentUser(DEMO_USERS[roleKey]);
      showToast(`Switched active persona to ${DEMO_USERS[roleKey].name} (${DEMO_USERS[roleKey].role})`, 'info');
      
      // Auto-authenticate with backend to obtain real JWT
      try {
        const credentials = {
          TRAINEE: { email: 'ramesh@sahakarlink.gov.in', password: 'password123' },
          RECRUITER: { email: 'recruiter@rampurpacs.coop', password: 'password123' },
          ADMIN: { email: 'admin@rampur.ncct.gov.in', password: 'password123' },
          CENTRE_OPERATOR: { email: 'trainer@sahakarlink.gov.in', password: 'password123' }
        };
        const cred = credentials[roleKey] || credentials.TRAINEE;
        const res = await apiRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify(cred)
        });
        if (res.access_token) {
          setAuthToken(res.access_token);
        }
      } catch (err) {
        console.warn('Backend authentication sync (offline/standby mode):', err.message);
      }
    }
  };

  const toggleShortlist = (candId) => {
    setShortlistedIds(prev => {
      const exists = prev.includes(candId);
      const updated = exists ? prev.filter(id => id !== candId) : [...prev, candId];
      showToast(exists ? 'Candidate removed from shortlist' : 'Candidate added to shortlist', 'success');
      return updated;
    });
  };

  const toggleApplyJob = (jobId) => {
    setAppliedJobIds(prev => {
      if (prev.includes(jobId)) {
        showToast('Application already submitted for this position', 'info');
        return prev;
      }
      showToast('Application successfully submitted with verified credential dossier!', 'success');
      return [...prev, jobId];
    });
  };

  const toggleBookmarkJob = (jobId) => {
    setBookmarkedJobIds(prev => 
      prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]
    );
  };

  const refreshSyncCount = () => {
    const queue = getOfflineQueue();
    setPendingSyncCount(queue.length);
  };

  const handleSyncOffline = async () => {
    try {
      const queue = getOfflineQueue();
      if (queue.length === 0) {
        showToast('No pending offline records to sync.', 'info');
        return;
      }
      const res = await flushOfflineQueue();
      showToast(`✓ Offline Sync Complete: ${res.synced_count || queue.length} records pushed to national database.`, 'success');
      refreshSyncCount();
    } catch (e) {
      showToast(`Sync error: ${e.message}`, 'error');
    }
  };

  useEffect(() => {
    refreshSyncCount();
    const interval = setInterval(refreshSyncCount, 2500);

    // Initial JWT authentication for active trainee if not already authenticated
    if (!getAuthToken()) {
      apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'ramesh@sahakarlink.gov.in', password: 'password123' })
      }).then(res => {
        if (res.access_token) {
          setAuthToken(res.access_token);
        }
      }).catch(err => {
        console.warn('Initial session auth note:', err.message);
      });
    }

    return () => clearInterval(interval);
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        switchRole,
        isOffline,
        setIsOffline,
        pendingSyncCount,
        refreshSyncCount,
        handleSyncOffline,
        toast,
        showToast,
        setToast,
        // Modals
        isKioskOpen,
        setIsKioskOpen,
        isErpSandboxOpen,
        setIsErpSandboxOpen,
        isTourOpen,
        setIsTourOpen,
        isAiCoachOpen,
        setIsAiCoachOpen,
        selectedCandidate,
        setSelectedCandidate,
        activeAssessment,
        setActiveAssessment,
        registerLearnerOpen,
        setRegisterLearnerOpen,
        enrolCourseOpen,
        setEnrolCourseOpen,
        issueCertOpen,
        setIssueCertOpen,
        // Recruiter & Jobs
        shortlistedIds,
        toggleShortlist,
        appliedJobIds,
        toggleApplyJob,
        bookmarkedJobIds,
        toggleBookmarkJob,
        notifications,
        setNotifications
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
