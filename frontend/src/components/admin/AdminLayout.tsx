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
        <div className="dark flex min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-orange-500/30 overflow-hidden">
            {/* Sidebar - Fixed width */}
            <AdminSidebar activeTab={activeTab} onTabChange={onTabChange} />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 h-screen relative overflow-hidden">
                {/* Background Decorations */}
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 scrollbar-hide z-10">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                        className="w-full max-w-[1600px] mx-auto pb-12"
                    >
                        {children}
                    </motion.div>
                </div>
            </main>
        </div>
    );
};
