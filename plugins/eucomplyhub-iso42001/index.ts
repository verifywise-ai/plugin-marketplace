/**
 * eucomplyhub ISO/IEC 42001 AI Management System Plugin
 *
 * Maintained by eucomplyhub.com — EU AI Act + ISO 42001 audit specialist
 * for mid-market SaaS. Triple-framework methodology: EU AI Act + ISO 42001 + NIST AI RMF.
 *
 * Auto-generated from template.json - do not edit directly.
 * To modify, update template.json and rebuild.
 */

import { createFrameworkPlugin } from "../../packages/custom-framework-base";
import template from "./template.json";

const plugin = createFrameworkPlugin({
  key: "eucomplyhub-iso42001",
  name: "ISO/IEC 42001 AI Management System (eucomplyhub)",
  description: "ISO/IEC 42001:2023 AI Management System (AIMS) starter framework for mid-market SaaS. Operationalizes AI governance ahead of the August 2, 2026 EU AI Act Article 50 enforcement deadline.",
  version: "1.0.0",
  author: "eucomplyhub.com",
  template: (template as any).framework,
  autoImport: true,
});

export const { metadata, install, uninstall, validateConfig, router } = plugin;
