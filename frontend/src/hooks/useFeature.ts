import { useTenantStore } from '@/store/tenantStore';

export function useFeature() {
  const activeBusiness = useTenantStore((state) => state.activeBusiness);

  const hasFeature = (featureKey: string): boolean => {
    if (!activeBusiness) return false;

    // Check custom_features override first (true/false)
    const customFeatures = activeBusiness.custom_features || {};
    if (customFeatures[featureKey] !== undefined) {
      return customFeatures[featureKey] === true;
    }

    // Fallback to plan features object
    const planFeatures = activeBusiness.plan?.features;
    if (planFeatures && typeof planFeatures === 'object' && !Array.isArray(planFeatures)) {
      return Boolean((planFeatures as Record<string, any>)[featureKey]);
    }

    return false;
  };

  const isFeatureHidden = (featureKey: string): boolean => {
    if (!activeBusiness) return false;
    const customFeatures = activeBusiness.custom_features || {};
    return customFeatures[featureKey] === 'hidden';
  };

  const getFeatureLimit = (featureKey: string, defaultValue: number = 1): number => {
    if (!activeBusiness) return defaultValue;
    const planFeatures = activeBusiness.plan?.features;
    if (planFeatures && typeof planFeatures === 'object' && !Array.isArray(planFeatures)) {
      return Number((planFeatures as Record<string, any>)[featureKey]) || defaultValue;
    }
    return defaultValue;
  };

  return { hasFeature, isFeatureHidden, getFeatureLimit };
}
