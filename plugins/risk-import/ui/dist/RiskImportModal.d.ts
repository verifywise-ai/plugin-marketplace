import { default as React } from 'react';

interface RiskImportModalProps {
    open: boolean;
    onClose: () => void;
    onImportComplete?: () => void;
    apiServices?: {
        get: (url: string, options?: any) => Promise<any>;
        post: (url: string, data?: any) => Promise<any>;
    };
}
export declare const RiskImportModal: React.FC<RiskImportModalProps>;
export default RiskImportModal;
