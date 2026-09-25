/**
 * PranaFit - Holistic Lifestyle & Health Assistant
 * Interconnecting Emotion-based fitness, AI micro-goals, Indori cultural food,
 * Male & Female physiology routines, Preventive alerts, Gamification & Wearables.
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TodayHealthFilter } from './components/TodayHealthFilter';
import { GenderSpecificSection } from './components/GenderSpecificSection';
import { EmotionFitnessSection } from './components/EmotionFitnessSection';
import { MicroGoalsSection } from './components/MicroGoalsSection';
import { CulturalFoodSection } from './components/CulturalFoodSection';
import { GreenPointsStore } from './components/GreenPointsStore';
import { PreventiveAlertsSection } from './components/PreventiveAlertsSection';
import { CommunitySection } from './components/CommunitySection';
import { WearablesAndSleepSection } from './components/WearablesAndSleepSection';
import { ProgressDashboard } from './components/ProgressDashboard';
import { EmergencySOSModal } from './components/EmergencySOSModal';
import {
  UserProfile,
  TodayHealthState,
  GenderType
} from './types';
import {
  initialUserProfile,
  defaultTodayHealthState
} from './data/mockData';
import { audioService } from './utils/audioUtils';
import {
  Activity,
  Heart,
  Sparkles,
  Flame,
  Award,
  AlertTriangle,
  Users,
  Watch,
  ChevronRight
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('today');
  const [selectedGender, setSelectedGender] = useState<GenderType>('female');
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('pranafit_user_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return initialUserProfile;
      }
    }
    return initialUserProfile;
  });

  const [todayHealth, setTodayHealth] = useState<TodayHealthState>(() => {
    const saved = localStorage.getItem('pranafit_today_health');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return defaultTodayHealthState;
      }
    }
    return defaultTodayHealthState;
  });

  const [isSOSOpen, setIsSOSOpen] = useState<boolean>(false);
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem('pranafit_user_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('pranafit_today_health', JSON.stringify(todayHealth));
  }, [todayHealth]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRewardPoints = (pts: number) => {
    setUserProfile((prev) => ({
      ...prev,
      greenPoints: prev.greenPoints + pts
    }));
    showToast(`+${pts} Green Points earned! 🌱`);
  };

  const handleDeductPoints = (pts: number) => {
    setUserProfile((prev) => ({
      ...prev,
      greenPoints: Math.max(0, prev.greenPoints - pts)
    }));
    showToast(`Redeemed voucher (-${pts} Pts) 🎉`);
  };

  const handleToggleVoice = () => {
    if (isVoiceActive) {
      audioService.stopSpeaking();
      setIsVoiceActive(false);
      showToast('Voice coach muted');
    } else {
      setIsVoiceActive(true);
      audioService.speakRoutine('Voice coach is now enabled. Ready to guide your wellness journey.', 'en');
      showToast('Voice coach enabled 🔊');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header & Nav */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedGender={selectedGender}
        setSelectedGender={setSelectedGender}
        greenPoints={userProfile.greenPoints}
        dailyStreak={userProfile.dailyStreak}
        onOpenSOS={() => setIsSOSOpen(true)}
        isVoiceActive={isVoiceActive}
        onToggleVoice={handleToggleVoice}
      />

      {/* Floating Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg border border-emerald-500/40 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'today' && (
          <TodayHealthFilter
            gender={selectedGender}
            healthState={todayHealth}
            setHealthState={setTodayHealth}
            onCompleteAction={handleRewardPoints}
            isVoiceActive={isVoiceActive}
          />
        )}

        {activeTab === 'gender' && (
          <GenderSpecificSection
            currentGender={selectedGender}
            onGenderChange={setSelectedGender}
            onRewardPoints={handleRewardPoints}
          />
        )}

        {activeTab === 'emotion' && (
          <EmotionFitnessSection onRewardPoints={handleRewardPoints} />
        )}

        {activeTab === 'microgoals' && (
          <MicroGoalsSection onRewardPoints={handleRewardPoints} />
        )}

        {activeTab === 'nutrition' && (
          <CulturalFoodSection onRewardPoints={handleRewardPoints} />
        )}

        {activeTab === 'gamification' && (
          <GreenPointsStore
            greenPoints={userProfile.greenPoints}
            onDeductPoints={handleDeductPoints}
          />
        )}

        {activeTab === 'preventive' && (
          <PreventiveAlertsSection onRewardPoints={handleRewardPoints} />
        )}

        {activeTab === 'community' && (
          <CommunitySection onRewardPoints={handleRewardPoints} />
        )}

        {activeTab === 'wearables_sleep' && (
          <WearablesAndSleepSection />
        )}

        {activeTab === 'dashboard' && (
          <ProgressDashboard
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            greenPoints={userProfile.greenPoints}
            dailyStreak={userProfile.dailyStreak}
          />
        )}
      </main>

      {/* Modals */}
      <EmergencySOSModal
        isOpen={isSOSOpen}
        onClose={() => setIsSOSOpen(false)}
      />
    </div>
  );
}
