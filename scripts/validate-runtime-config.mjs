import { load as parseYaml } from "js-yaml";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { z } from "zod";

const featureConfigSchema = z
  .object({
    enabled: z.boolean(),
    config: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const profileFieldSchema = z
  .object({
    enabled: z.boolean(),
    label: z.string().min(1),
    description: z.string().min(1),
    placeholder: z.string().min(1).optional(),
    inputType: z.enum(["text", "date", "url"]).optional(),
    required: z.boolean().optional(),
  })
  .strict();

const socialConnectorSchema = z
  .object({
    target: z.string().min(1),
    connectorId: z.string().min(1).optional(),
    enabled: z.boolean(),
    displayName: z.string().min(1).optional(),
    icon: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
  })
  .strict();

const featuresSchema = z
  .object({
    features: z
      .object({
        emailChange: featureConfigSchema,
        phoneChange: featureConfigSchema,
        usernameChange: featureConfigSchema,
        mfa: z
          .object({
            totp: featureConfigSchema,
            backupCodes: featureConfigSchema,
            webAuthn: featureConfigSchema,
          })
          .strict(),
        passkey: featureConfigSchema,
        socialIdentities: z
          .object({
            enabled: z.boolean(),
            config: z
              .object({
                connectors: z.array(socialConnectorSchema).optional(),
              })
              .passthrough()
              .optional(),
          })
          .strict(),
        sessions: featureConfigSchema,
        accountDeletion: featureConfigSchema,
      })
      .strict(),
    profileFields: z
      .object({
        avatar: profileFieldSchema,
        name: profileFieldSchema,
        birthdate: profileFieldSchema,
        zoneinfo: profileFieldSchema,
        locale: profileFieldSchema,
        website: profileFieldSchema,
      })
      .strict(),
  })
  .strict();

const servicesSchema = z
  .object({
    portalContent: z
      .object({
        subtitle: z.string().min(1).optional(),
        footerTitle: z.string().min(1).optional(),
        footerDescription: z.string().min(1).optional(),
        footerContent: z.string().min(1).optional(),
        noI18n: z.boolean().optional(),
      })
      .strict()
      .optional(),
    serviceCategories: z
      .array(
        z
          .object({
            id: z.string().min(1),
            name: z.string().min(1),
            iconName: z.string().min(1).optional(),
            description: z.string().min(1),
          })
          .strict()
      )
      .min(1),
    services: z
      .array(
        z
          .object({
            id: z.string().min(1),
            name: z.string().min(1),
            description: z.string().min(1),
            icon: z.string().min(1),
            href: z.string().url(),
            ping: z.string().url().optional(),
            category: z.string().min(1),
            isNew: z.boolean().optional(),
            isPopular: z.boolean().optional(),
          })
          .strict()
      )
      .min(1),
  })
  .strict();

function resolveConfigDir() {
  const dir = process.env.CONFIG_DIR ?? "deploy";
  return isAbsolute(dir) ? dir : resolve(process.cwd(), dir);
}

function parseYamlFile(filePath) {
  return parseYaml(readFileSync(filePath, "utf8"));
}

function validateCrossReferences(servicesConfig) {
  const categoryIds = new Set(servicesConfig.serviceCategories.map((item) => item.id));
  for (const service of servicesConfig.services) {
    if (!categoryIds.has(service.category)) {
      throw new Error(`Service '${service.id}' references missing category '${service.category}'`);
    }
  }
}

const configDir = resolveConfigDir();
const featuresPath = resolve(configDir, "features.yaml");
const servicesPath = resolve(configDir, "services.yaml");
const featuresExamplePath = resolve(configDir, "features.yaml.example");
const servicesExamplePath = resolve(configDir, "services.yaml.example");

const resolvedFeaturesPath = existsSync(featuresPath) ? featuresPath : featuresExamplePath;
const resolvedServicesPath = existsSync(servicesPath) ? servicesPath : servicesExamplePath;

if (!existsSync(resolvedFeaturesPath) || !existsSync(resolvedServicesPath)) {
  throw new Error(
    `Runtime config missing in '${configDir}'. Required files: features.yaml/services.yaml (or .example variants)`
  );
}

const parsedFeatures = featuresSchema.parse(parseYamlFile(resolvedFeaturesPath));
const parsedServices = servicesSchema.parse(parseYamlFile(resolvedServicesPath));

validateCrossReferences(parsedServices);

console.log(`[runtime-config] Validation successful. dir=${configDir}`);
console.log(`[runtime-config] services=${parsedServices.services.length}, categories=${parsedServices.serviceCategories.length}`);
console.log(`[runtime-config] profileFields=${Object.keys(parsedFeatures.profileFields).length}`);
