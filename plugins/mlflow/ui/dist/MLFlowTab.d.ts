import { default as React } from 'react';

interface MLFlowTabProps {
    apiServices?: {
        get: (url: string, options?: any) => Promise<any>;
        post: (url: string, data?: any) => Promise<any>;
    };
}
export declare const MLFlowTab: React.FC<MLFlowTabProps>;
export default MLFlowTab;
