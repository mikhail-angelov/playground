import React, { useState } from 'react';
import LeftPanel from './LeftPanel';
import EditorPanel from './EditorPanel';
import PreviewPanel from './PreviewPanel';

const Main: React.FC = () => {
    const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
    const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(false);

    return (
        <main className="flex-grow p-2 bg-gray-900 flex">
            <LeftPanel
                isCollapsed={isLeftPanelCollapsed}
                toggleCollapse={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
            />
            <EditorPanel />
            <PreviewPanel
                isCollapsed={isPreviewCollapsed}
                toggleCollapse={() => setIsPreviewCollapsed(!isPreviewCollapsed)}
            />
        </main>
    );
};

export default Main;