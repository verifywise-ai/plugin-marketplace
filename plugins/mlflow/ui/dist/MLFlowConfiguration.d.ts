import { default as React } from 'react';

interface MLFlowConfigurationProps {
    configData?: Record<string, string>;
    onConfigChange?: (key: string, value: string) => void;
    onSaveConfiguration?: () => void;
    onTestConnection?: () => void;
    isSavingConfig?: boolean;
    isTestingConnection?: boolean;
}
export declare const MLFlowConfiguration: React.FC<MLFlowConfigurationProps>;
export default MLFlowConfiguration;
