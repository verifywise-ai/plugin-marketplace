import { default as React } from 'react';

interface SlackConfigurationProps {
    pluginKey?: string;
    slackClientId?: string;
    slackOAuthUrl?: string;
    onToast?: (toast: {
        variant: string;
        body: string;
    }) => void;
    apiServices?: {
        get: (url: string, options?: any) => Promise<any>;
        post: (url: string, data?: any) => Promise<any>;
        patch: (url: string, data?: any) => Promise<any>;
        delete: (url: string) => Promise<any>;
    };
}
export declare const SlackConfiguration: React.FC<SlackConfigurationProps>;
export default SlackConfiguration;
