'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import { useAppStore } from '@/store/appStore';
import { BoardingPassProfile, getBoardingPassProfile, saveBoardingPassProfile } from '@/services/boardingPassService';

export default function BoardingPassPage() {
  const locale = useAppStore((s) => s.locale);
  const [profile, setProfile] = useState<BoardingPassProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // 편집 상태
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [emergency, setEmergency] = useState('');

  useEffect(() => {
    const p = getBoardingPassProfile();
    if (p) {
      setProfile(p);
      setName(p.name);
      setBirthDate(p.birthDate);
      setGender(p.gender);
      setEmergency(p.emergencyContact);
    } else {
      setIsEditing(true);
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newProfile: BoardingPassProfile = {
      name, birthDate, gender, emergencyContact: emergency
    };
    saveBoardingPassProfile(newProfile);
    setProfile(newProfile);
    setIsEditing(false);
  };

  const qrData = profile ? JSON.stringify(profile) : '';

  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col pt-safe px-4 pb-24">
      <header className="flex items-center gap-3 pt-6 pb-4">
        <Link href="/" className="size-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-600 hover:text-primary active:scale-95 transition-all">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </Link>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">
          {locale === 'ko' ? '전자승선명부 발급' : 'Boarding Pass'}
        </h1>
      </header>

      {/* 안내 문구 */}
      <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 mb-6">
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined text-sky-500 text-lg mt-0.5">info</span>
          <div>
            <h2 className="text-sm font-bold text-sky-900 mb-1">
              승선 시 QR 코드를 보여주세요
            </h2>
            <p className="text-xs text-sky-700 leading-relaxed">
              입력하신 정보는 오프라인에서 QR 생성용으로만 사용되며 기기에 안전하게 보관됩니다. 해경 승선객 확인 시 즉시 사용 가능합니다.
            </p>
          </div>
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-5">승선자 정보 입력</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">이름 (본명)</label>
              <input 
                type="text" 
                required 
                value={name} 
                onChange={e => setName(e.target.value)}
                placeholder="홍길동"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">생년월일</label>
              <input 
                type="date" 
                required 
                value={birthDate} 
                onChange={e => setBirthDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">성별</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setGender('M')}
                  className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${gender === 'M' ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                >
                  남성
                </button>
                <button
                  type="button"
                  onClick={() => setGender('F')}
                  className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${gender === 'F' ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                >
                  여성
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">비상연락처 (가족/지인)</label>
              <input 
                type="tel" 
                required 
                value={emergency} 
                onChange={e => setEmergency(e.target.value)}
                pattern="[0-9]{3}-[0-9]{3,4}-[0-9]{4}"
                placeholder="010-0000-0000"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full mt-6 bg-slate-900 text-white font-bold py-3.5 rounded-xl active:scale-95 transition-transform"
          >
            저장 및 QR 발급
          </button>
          
          {profile && (
            <button 
              type="button"
              onClick={() => setIsEditing(false)}
              className="w-full mt-2 bg-transparent text-slate-500 font-bold py-3.5 rounded-xl active:bg-slate-50 transition-colors"
            >
              취소
            </button>
          )}
        </form>
      ) : (
        <div className="flex flex-col items-center">
          {/* QR Ticket Card */}
          <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-100 relative">
            {/* 상단 파도 장식 */}
            <div className="h-16 bg-gradient-to-r from-primary to-cyan-500 relative flex items-center px-6">
              <span className="text-white font-black tracking-widest text-lg">BOARDING PASS</span>
              <div className="absolute -bottom-3 left-0 right-0 h-6 bg-white rounded-t-[50%]" />
            </div>
            
            <div className="p-8 flex flex-col items-center">
              <div className="bg-white p-3 rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.05)] border border-slate-50">
                <QRCode 
                  value={qrData} 
                  size={200}
                  level="M"
                  fgColor="#0f172a" 
                  bgColor="#ffffff"
                />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-6 mb-1">
                Passenger
              </p>
              <h3 className="text-2xl font-black text-slate-900">{profile?.name}</h3>
              
              <div className="w-full h-px bg-slate-100 my-6 flex items-center justify-between">
                <div className="size-4 rounded-full bg-slate-50 -ml-2 border-r border-slate-100" />
                <div className="border-t-2 border-dashed border-slate-200 flex-1" />
                <div className="size-4 rounded-full bg-slate-50 -mr-2 border-l border-slate-100" />
              </div>

              <div className="w-full grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">DOB</p>
                  <p className="text-sm font-bold text-slate-800">{profile?.birthDate.replace(/-/g, '.')}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Gender</p>
                  <p className="text-sm font-bold text-slate-800">{profile?.gender === 'M' ? 'Male' : 'Female'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Emergency Contact</p>
                  <p className="text-sm font-bold text-slate-800">{profile?.emergencyContact}</p>
                </div>
              </div>
            </div>
            
            {/* 하단 수정 버튼 영역 */}
            <button 
              onClick={() => setIsEditing(true)}
              className="w-full bg-slate-50 py-4 text-sm font-bold text-slate-500 hover:text-primary transition-colors flex items-center justify-center gap-2 border-t border-slate-100"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              정보 수정하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
