import React from 'react';
import { useMainStore } from '../stores/useMainStore';

const Footer: React.FC = () => {
    const selectedFile = useMainStore((state) => state.selectedFile);

    return (
        <footer className="flex items-center justify-between p-4 bg-gray-800 text-white">
            <span>File: {selectedFile}</span>
            <span>Last saved: 5 minutes ago</span>
        </footer>
    );
};

export default Footer;