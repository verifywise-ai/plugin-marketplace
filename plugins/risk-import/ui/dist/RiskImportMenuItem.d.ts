import { default as React } from 'react';

interface RiskImportMenuItemProps {
    onTriggerModal?: (componentName: string) => void;
    onMenuClose?: () => void;
}
export declare const RiskImportMenuItem: React.FC<RiskImportMenuItemProps>;
export default RiskImportMenuItem;
