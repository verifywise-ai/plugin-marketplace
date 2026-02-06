/**
 * NYC Local Law 144 - Automated Employment Decision Tools Plugin
 *
 * Auto-generated from template.json - do not edit directly.
 * To modify, update template.json and rebuild.
 */

import { createFrameworkPlugin } from "../../packages/custom-framework-base";
import template from "./template.json";

const plugin = createFrameworkPlugin({
  key: "nyc-local-law-144",
  name: "NYC Local Law 144 - Automated Employment Decision Tools",
  description: "New York City Local Law 144 compliance framework for automated employment decision tools (AEDTs) requiring bias audits and candidate notifications.",
  version: "1.0.0",
  author: "VerifyWise",
  template: (template as any).framework,
  autoImport: true,
});

export const { metadata, install, uninstall, validateConfig, router } = plugin;
