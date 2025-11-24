import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { navigationConfig } from '../utils/navigationConfig';

const isGroupActive = (groupItems: any[], currentPath: string) => {
  return groupItems.some(item => currentPath.startsWith(item.href));
};

const Sidebar: React.FC = () => {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    navigationConfig.forEach(group => {
      if (isGroupActive(group.items, location.pathname)) {
        initialState[group.group] = true;
      }
    });
    return initialState;
  });

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  return (
    <div className="flex flex-col w-64 bg-slate-900 text-white h-full border-r border-slate-800 overflow-y-auto">
      <div className="flex items-center justify-center h-16 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center space-x-2">
           <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">T</div>
           <span className="text-xl font-bold">TreePro AI</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-2">
        {navigationConfig.map((group) => {
          const isOpen = openGroups[group.group] || false;
          const hasActiveChild = isGroupActive(group.items, location.pathname);

          return (
            <div key={group.group} className="mb-2">
              <button
                onClick={() => toggleGroup(group.group)}
                className={`flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-md transition-colors 
                  ${hasActiveChild ? 'text-white bg-slate-800/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                <span className="font-semibold tracking-wide text-xs uppercase text-slate-500">{group.group}</span>
                <span className="text-sm">{isOpen ? '▼' : '▶'}</span>
              </button>

              <div className={`mt-1 space-y-1 overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
                {group.items.map((item) => {
                  const isActive = location.pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-md relative
                        ${isActive ? 'bg-green-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                    >
                      <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;
