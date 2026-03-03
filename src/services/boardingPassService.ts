export interface BoardingPassProfile {
  name: string;
  birthDate: string; // YYYY-MM-DD
  gender: 'M' | 'F';
  emergencyContact: string; // 010-XXXX-XXXX
}

export const getBoardingPassProfile = (): BoardingPassProfile | null => {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem('boardingPassProfile');
  return data ? JSON.parse(data) : null;
};

export const saveBoardingPassProfile = (profile: BoardingPassProfile) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('boardingPassProfile', JSON.stringify(profile));
  }
};
