import { LanguageCode } from '../types/game';

export const TRANSLATIONS: Record<
  LanguageCode,
  Record<string, string>
> = {
  en: {
    play: 'Quick Play',
    career: 'Career',
    quickRace: 'Race Setup',
    garage: 'Garage',
    carShop: 'Car Dealership',
    dailyRewards: 'Daily Rewards',
    premiumShop: 'Cosmetics & Pass',
    settings: 'Settings',
    profile: 'Driver Profile',
    startRace: 'Launch Race',
    resume: 'Resume Race',
    restart: 'Restart Race',
    quitToMenu: 'Exit to Main Menu',
    lap: 'Lap',
    position: 'Pos',
    speed: 'KM/H',
    nitro: 'NITRO',
    drift: 'DRIFT',
    brake: 'BRAKE',
    gas: 'GAS',
    resetCar: 'Reset Car',
    camera: 'Camera',
    pause: 'Pause',
  },
  hi: {
    play: 'तुरंत खेलें',
    career: 'करियर मिशन',
    quickRace: 'रेस सेटअप',
    garage: 'गैराज और अपग्रेड',
    carShop: 'कार शोरूम',
    dailyRewards: 'दैनिक इनाम',
    premiumShop: 'कॉस्मेटिक्स शॉप',
    settings: 'सेटिंग्स',
    profile: 'प्रोफ़ाइल',
    startRace: 'रेस शुरू करें',
    resume: 'रेस जारी रखें',
    restart: 'पुनः आरंभ करें',
    quitToMenu: 'मुख्य मेनू पर लौटें',
    lap: 'लैप',
    position: 'स्थान',
    speed: 'किमी/घंटा',
    nitro: 'नाइट्रो',
    drift: 'ड्रिफ्ट',
    brake: 'ब्रेक',
    gas: 'रेस',
    resetCar: 'कार रीसेट',
    camera: 'कैमरा',
    pause: 'रोकें',
  },
};

export function t(lang: LanguageCode, key: string): string {
  return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;
}
