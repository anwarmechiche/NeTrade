'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

interface SidebarProps {
  user: any
  onLogout: () => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export default function Sidebar({ user, onLogout, isOpen, setIsOpen }: SidebarProps) {
  const [activeTab, setActiveTab] = useState('products')

  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: '📊' },
    { id: 'products', label: 'Produits', icon: '📦' },
    { id: 'clients', label: 'Clients', icon: '👥' },
    { id: 'orders', label: 'Commandes', icon: '🛒' },
    { id: 'settings', label: 'Paramètres', icon: '⚙️' },
  ]

  return (
    <>
      {/* BOUTON FLOTTANT (Visible quand la barre est fermée) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-6 left-6 z-[60] w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:scale-110 transition-transform border border-emerald-400/20"
        >
          <span className="text-white text-xl">☰</span>
        </button>
      )}

      {/* L'OVERLAY (Flou derrière en mobile) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* LA SIDEBAR */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out border-r border-[#1f1f1f] bg-[#050505] flex flex-col
        ${isOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full lg:w-20 lg:translate-x-0'}`}
      >
        {/* Header de la Sidebar */}
        <div className="p-6 flex items-center justify-between border-b border-[#1f1f1f]">
          <div className={`flex items-center gap-3 ${!isOpen && 'lg:hidden'}`}>
            <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center">
              <span className="text-lg">🏪</span>
            </div>
            <span className="font-bold text-white tracking-tight">Trade<span className="text-emerald-500 font-poppins">Pro</span></span>
          </div>
          
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#111] text-gray-500 transition-colors"
          >
            {isOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* Menu de navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center rounded-xl transition-all duration-200 group
                ${isOpen ? 'px-4 py-3 gap-3' : 'justify-center p-3'}
                ${activeTab === item.id 
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                  : 'text-gray-400 hover:bg-[#111] hover:text-white border border-transparent'}
              `}
              title={!isOpen ? item.label : ''}
            >
              <span className={`text-xl transition-transform ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </span>
              {isOpen && <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Footer avec Utilisateur */}
        <div className="p-4 border-t border-[#1f1f1f] space-y-4">
          {isOpen && (
            <div className="p-3 bg-[#0A0A0A] border border-[#1f1f1f] rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 text-xs font-bold">
                {user?.name?.charAt(0) || 'M'}
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Connecté</p>
                <p className="text-sm font-semibold text-gray-200 truncate">{user?.name || 'Société'}</p>
              </div>
            </div>
          )}

          <button
            onClick={onLogout}
            className={`w-full flex items-center justify-center transition-colors rounded-xl
              ${isOpen ? 'gap-2 px-4 py-3 text-red-400 border border-red-500/20 hover:bg-red-500/10 font-bold text-sm' : 'p-3 text-xl hover:bg-red-500/10 text-red-400'}
            `}
          >
            <span>🚪</span>
            {isOpen && <span>Quitter</span>}
          </button>
        </div>
      </aside>
    </>
  )
}