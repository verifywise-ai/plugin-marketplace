/**
 * Data Governance Framework Plugin
 *
 * Provides Data Governance compliance framework.
 */

import { createFrameworkPlugin } from "../../packages/custom-framework-base";
import template from "./template.json";

const plugin = createFrameworkPlugin({
  key: "data-governance",
  name: "Data Governance",
  description: "Data Governance framework for enterprise data management and quality",
  version: "1.0.0",
  author: "VerifyWise",
  template: template as any,
  autoImport: true,
});

export const { metadata, install, uninstall, validateConfig, router } = plugin;
