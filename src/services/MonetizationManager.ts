export interface StoreProduct {
  id: string;
  title: string;
  subtitle: string;
  category: 'ad_free' | 'skin' | 'garage_theme' | 'coin_pack';
  priceDisplay: string;
  coinPrice?: number;
  coinsGranted?: number;
  cosmeticId?: string;
  garageThemeId?: 'cyber_bay' | 'obsidian_vault' | 'solar_hangar';
}

export interface PaymentResult {
  status: 'sandbox_approved' | 'cancelled' | 'unavailable';
  transactionId: string | null;
  environment: 'development_sandbox' | 'production';
  disclosure: string;
}

export interface RewardedAdResult {
  status: 'sandbox_completed' | 'cancelled' | 'unavailable';
  rewardCoins: number;
  environment: 'development_sandbox' | 'production';
  disclosure: string;
}

export interface PaymentProvider {
  readonly providerName: string;
  readonly isSandbox: boolean;
  requestPurchase(product: StoreProduct): Promise<PaymentResult>;
}

export interface RewardedAdProvider {
  readonly providerName: string;
  readonly isSandbox: boolean;
  showRewardedAd(placementId: string, rewardCoins: number): Promise<RewardedAdResult>;
}

export const PREMIUM_CATALOG: StoreProduct[] = [
  {
    id: 'ad_free_pass',
    title: 'Street Legend Ad-Free Pass',
    subtitle: 'Removes optional intermission prompts and unlocks permanent VIP badge.',
    category: 'ad_free',
    priceDisplay: 'Sandbox Test ($2.99)',
  },
  {
    id: 'skin_cyber_prism',
    title: 'Cyber Prism Livery Pack',
    subtitle: 'Unlocks iridescent teal-magenta metallic clearcoat finish for all cars.',
    category: 'skin',
    priceDisplay: '2,500 Coins',
    coinPrice: 2500,
    cosmeticId: 'cyber_prism',
  },
  {
    id: 'skin_carbon_stealth',
    title: 'Forged Carbon Stealth Kit',
    subtitle: 'Unlocks matte exposed carbon-weave bodywork finish with gold trim.',
    category: 'skin',
    priceDisplay: '3,500 Coins',
    coinPrice: 3500,
    cosmeticId: 'carbon_stealth',
  },
  {
    id: 'garage_obsidian_vault',
    title: 'Obsidian Vault Showroom',
    subtitle: 'Dark architectural concrete & warm tungsten studio lighting bay.',
    category: 'garage_theme',
    priceDisplay: '2,000 Coins',
    coinPrice: 2000,
    garageThemeId: 'obsidian_vault',
  },
  {
    id: 'garage_solar_hangar',
    title: 'Solar Hangar Showroom',
    subtitle: 'High-contrast amber sunset reflections and illuminated floor grid.',
    category: 'garage_theme',
    priceDisplay: '2,000 Coins',
    coinPrice: 2000,
    garageThemeId: 'solar_hangar',
  },
];

/**
 * Development Sandbox Payment Provider.
 * Does NOT simulate or claim real financial transactions occurred.
 */
class DevelopmentSandboxPaymentProvider implements PaymentProvider {
  public readonly providerName = 'Sandbox Mock Payment Provider (Dev Only)';
  public readonly isSandbox = true;

  async requestPurchase(_product: StoreProduct): Promise<PaymentResult> {
    return {
      status: 'sandbox_approved',
      transactionId: `sandbox_tx_${Date.now()}`,
      environment: 'development_sandbox',
      disclosure:
        'Development Sandbox Mode: No real payment gateway is connected and no money was charged. In production, entitlements must be verified via secure backend webhook validation.',
    };
  }
}

/**
 * Development Sandbox Rewarded Ad Provider.
 * Does NOT pretend a real ad network video was served.
 */
class DevelopmentSandboxRewardedAdProvider implements RewardedAdProvider {
  public readonly providerName = 'Sandbox Mock Ad Provider (Dev Only)';
  public readonly isSandbox = true;

  async showRewardedAd(_placementId: string, rewardCoins: number): Promise<RewardedAdResult> {
    return {
      status: 'sandbox_completed',
      rewardCoins,
      environment: 'development_sandbox',
      disclosure:
        'Development Sandbox Mode: No live ad network is connected. Production deployments require server-side SSV callback verification before granting currency.',
    };
  }
}

export const paymentProvider: PaymentProvider = new DevelopmentSandboxPaymentProvider();
export const rewardedAdProvider: RewardedAdProvider = new DevelopmentSandboxRewardedAdProvider();
