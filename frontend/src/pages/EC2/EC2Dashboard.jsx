import React, { useState } from 'react';
// Import all the pages you just created
import { InstancesPage } from './InstanceList';
import { LoadBalancerPage } from './LBList';
import { AutoScalingPage } from './ASGList';
import { VolumesPage } from './VolumeList';
import { SnapshotsPage } from './SnapshotList';
import { SecurityGroupsPage } from './SecurityGroupList';
import { AMIPage } from './AmiList';
import { ENIPage } from './EniList';

const TABS = [
  { id: 'instances', label: 'Instances', icon: '💻' },
  { id: 'lbs', label: 'Load Balancers', icon: '⚖️' },
  { id: 'asg', label: 'Auto Scaling', icon: '🚀' },
  { id: 'volumes', label: 'Volumes', icon: '💾' },
  { id: 'snapshots', label: 'Snapshots', icon: '📸' },
  { id: 'sgs', label: 'Security Groups', icon: '🛡️' },
  { id: 'amis', label: 'AMIs', icon: '💿' },
  { id: 'enis', label: 'Network IPs', icon: '🌐' },
];

export default function EC2DashboardHub() {
  const [activeTab, setActiveTab] = useState('instances');

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'instances': return <InstancesPage />;
      case 'lbs':       return <LoadBalancerPage />;
      case 'asg':       return <AutoScalingPage />;
      case 'volumes':   return <VolumesPage />;
      case 'snapshots': return <SnapshotsPage />;
      case 'sgs':       return <SecurityGroupsPage />;
      case 'amis':      return <AMIPage />;
      case 'enis':      return <ENIPage />;
      default:          return <InstancesPage />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* FIXED GLASSMORPHISM HEADER 
          pt-16 ensures this doesn't sit under your Main Navbar 
      */}
      <div className="fixed top-16 left-0 right-0 z-30 bg-white/70 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
        <div className="px-4 py-3">
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
            EC2 HUB
          </h1>
        </div>

        {/* Horizontal Scrollable Tabs */}
        <div className="flex overflow-x-auto no-scrollbar px-3 pb-3 gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap text-xs font-bold transition-all border ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200 scale-95'
                  : 'bg-white/50 text-gray-500 border-gray-200 hover:bg-white'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT AREA 
          mt-40 provides space for both Navbars (Main Nav + EC2 Hub Nav)
      */}
      <main className="flex-1 mt-40 pb-24">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {renderActiveComponent()}
        </div>
      </main>

      {/* Bottom Peek (also Glassmorphism) */}
      <div className="fixed bottom-0 w-full bg-white/60 backdrop-blur-lg border-t border-gray-200/50 p-3 flex justify-around items-center md:hidden z-30">
         <div className="text-center">
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Viewing</div>
            <div className="text-xs font-black text-blue-600 uppercase italic">{activeTab}</div>
         </div>
         <div className="h-6 w-[1px] bg-gray-300/50"></div>
         <p className="text-[10px] text-gray-500 font-medium">
            Swipe tabs above to switch
         </p>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}