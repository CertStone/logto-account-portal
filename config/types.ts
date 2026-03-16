export interface FeatureConfig {
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface SocialConnectorConfig {
  target: string;
  connectorId?: string;
  enabled: boolean;
  displayName?: string;
  icon?: string;
  description?: string;
}

export interface FeaturesConfig {
  emailChange: FeatureConfig;
  phoneChange: FeatureConfig;
  usernameChange: FeatureConfig;
  mfa: {
    totp: FeatureConfig;
    backupCodes: FeatureConfig;
    webAuthn: FeatureConfig;
  };
  passkey: FeatureConfig;
  socialIdentities: FeatureConfig & {
    config?: {
      connectors?: SocialConnectorConfig[];
    };
  };
  sessions: FeatureConfig;
  accountDeletion: FeatureConfig;
}

export interface ProfileFieldConfig {
  enabled: boolean;
  label: string;
  description: string;
  placeholder?: string;
  inputType?: "text" | "date" | "url";
  required?: boolean;
}

export interface ProfileFieldsConfig {
  avatar: ProfileFieldConfig;
  name: ProfileFieldConfig;
  birthdate: ProfileFieldConfig;
  zoneinfo: ProfileFieldConfig;
  locale: ProfileFieldConfig;
  website: ProfileFieldConfig;
}

export interface ServiceCategory {
  id: string;
  name: string;
  iconName?: string;
  description: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  icon: string;
  href: string;
  ping?: string;
  category: string;
  isNew?: boolean;
  isPopular?: boolean;
}

export interface PortalContentConfig {
  subtitle?: string;
  footerTitle?: string;
  footerDescription?: string;
  footerContent?: string;
  noI18n?: boolean;
}

export interface PublicRuntimeConfig {
  logtoEndpoint: string | null;
  features: FeaturesConfig;
  profileFields: ProfileFieldsConfig;
  serviceCategories: ServiceCategory[];
  services: Service[];
  portalContent?: PortalContentConfig;
  configHash: string;
}
