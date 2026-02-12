import React from 'react';
import { AdminSidebar } from './AdminSidebar';
import { motion } from 'framer-motion';

interface AdminLayoutProps {
    children: React.ReactNode;
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, activeTab, onTabChange }) => {
    return (
        <div className="dark flex min-h-screen bg-[#141414] text-white font-sans selection:bg-orange-500/30">
            {/* Sidebar - Fixed width */}
            <AdminSidebar activeTab={activeTab} onTabChange={onTabChange} />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 scrollbar-hide">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="w-full max-w-[1600px] mx-auto space-y-8"
                    >
                        {children}
                    </motion.div>
                </div>
            </main>
        </div>
    );
};
