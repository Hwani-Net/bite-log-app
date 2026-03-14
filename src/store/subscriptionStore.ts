import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PaywallFeature = 'chatbot' | 'secret_point' | 'none';

interface SubscriptionState {
  isPro: boolean;
  chatbotCredits: number;
  lastCreditResetDate: string;
  isPaywallOpen: boolean;
  paywallFeature: PaywallFeature;

  setIsPro: (val: boolean) => void;
  decreaseChatbotCredit: () => boolean; // returns true if successful, false if empty
  resetCreditsIfNeeded: () => void;
  openPaywall: (feature: PaywallFeature) => void;
  closePaywall: () => void;
}

const DAILY_MAX_CREDITS = 3;

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      isPro: true,
      chatbotCredits: DAILY_MAX_CREDITS,
      lastCreditResetDate: new Date().toISOString().split('T')[0],
      isPaywallOpen: false,
      paywallFeature: 'none',

      setIsPro: (val) => set({ isPro: val }),

      decreaseChatbotCredit: () => {
        get().resetCreditsIfNeeded();
        const { isPro, chatbotCredits } = get();
        if (isPro) return true; // Pro users have unlimited credits
        if (chatbotCredits > 0) {
          set({ chatbotCredits: chatbotCredits - 1 });
          return true;
        }
        return false;
      },

      resetCreditsIfNeeded: () => {
        const today = new Date().toISOString().split('T')[0];
        if (get().lastCreditResetDate !== today) {
          set({
            chatbotCredits: DAILY_MAX_CREDITS,
            lastCreditResetDate: today,
          });
        }
      },

      openPaywall: (feature: PaywallFeature) => {
        set({ isPaywallOpen: true, paywallFeature: feature });
      },

      closePaywall: () => {
        set({ isPaywallOpen: false, paywallFeature: 'none' });
      },
    }),
    {
      name: 'fishlog-subscription-v2',
      partialize: (state) => ({ 
        isPro: state.isPro, 
        chatbotCredits: state.chatbotCredits, 
        lastCreditResetDate: state.lastCreditResetDate 
      }), // only persist these fields
    }
  )
);
