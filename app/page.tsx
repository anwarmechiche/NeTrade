"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link"; // Importation pour la navigation
import { supabase } from "@/lib/supabase";
import { 
  MessageCircle, ShieldCheck, Search, X, Send, Bot, 
  CheckCircle2, Heart, Share2, MoreHorizontal, MapPin, 
  MessageSquare, Gavel, Filter, ListFilter, UserCircle 
} from "lucide-react";

// --- TYPES ---
type Product = { 
  id: string; name: string; description: string; price: number; 
  image_url: string | null; category: string | null; 
  location: string | null; merchant_id: string; 
};
type Vendor = { id: string; name: string; };
type Message = { content: string; sender_type: 'client' | 'bot' | 'vendor'; };

export default function AffarInstagramMarketplace() {
  const [products, setProducts] = useState<Product[]>([]);
  const [merchants, setMerchants] = useState<Vendor[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'all' | 'category' | 'merchant'>('all');
  const [selectedVal, setSelectedVal] = useState<string | null>(null);

  const [activeChat, setActiveChat] = useState<Product | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const categories = ["Construction", "Industrie", "Agriculture", "Matériaux", "Énergie"];

  useEffect(() => {
    const fetchData = async () => {
      const { data: vData } = await supabase.from("merchants").select("id, name");
      if (vData) setMerchants(vData as Vendor[]);
      const { data: pData } = await supabase.from("products").select("*");
      if (pData) { setProducts(pData as Product[]); setFilteredProducts(pData as Product[]); }
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    let result = products;
    if (searchQuery) result = result.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    if (activeTab === 'category' && selectedVal) result = result.filter(p => p.category === selectedVal);
    if (activeTab === 'merchant' && selectedVal) result = result.filter(p => p.merchant_id === selectedVal);
    setFilteredProducts(result);
  }, [searchQuery, activeTab, selectedVal, products]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    const userMsg: Message = { content: newMessage, sender_type: 'client' };
    setMessages(prev => [...prev, userMsg]);
    setNewMessage("");
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { content: "Votre demande de négociation a été transmise. Un agent vous contactera.", sender_type: 'bot' }]);
      setIsTyping(false);
    }, 1200);
  };

  const getMerchantName = (id: string) => merchants.find(m => m.id === id)?.name || "Fournisseur";

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      
      {/* HEADER AVEC BOUTON SE CONNECTER */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4">
        <div className="max-w-xl mx-auto h-16 flex justify-between items-center">
          <h1 className="text-2xl font-black italic tracking-tighter text-blue-600 cursor-pointer" 
              onClick={() => {setActiveTab('all'); setSelectedVal(null); setSearchQuery("");}}>
            Affar.
          </h1>
          
          <div className="flex gap-4 items-center">
            {/* BOUTON SE CONNECTER */}
            <Link 
              href="/login" 
              className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-blue-600 transition-colors shadow-md"
            >
              <UserCircle size={18} />
              Se connecter
            </Link>
          </div>
        </div>

        {/* SECTION FILTRE */}
        <div className="max-w-xl mx-auto pb-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher un produit, une usine..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 border-none rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto scrollbar-hide text-[13px] font-bold">
            <button onClick={() => {setActiveTab('all'); setSelectedVal(null);}} className={`px-5 py-2 rounded-full whitespace-nowrap ${activeTab === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>Tout</button>
            <button onClick={() => setActiveTab('category')} className={`px-5 py-2 rounded-full whitespace-nowrap flex items-center gap-2 ${activeTab === 'category' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}><ListFilter size={14} /> Catégories</button>
            <button onClick={() => setActiveTab('merchant')} className={`px-5 py-2 rounded-full whitespace-nowrap flex items-center gap-2 ${activeTab === 'merchant' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}><Filter size={14} /> Fournisseurs</button>
          </div>

          {activeTab !== 'all' && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pt-1 animate-in slide-in-from-top-2">
              {(activeTab === 'category' ? categories : merchants).map((item) => {
                const id = typeof item === 'string' ? item : item.id;
                const label = typeof item === 'string' ? item : item.name;
                return (
                  <button key={id} onClick={() => setSelectedVal(id)} className={`px-4 py-1.5 rounded-lg border text-xs whitespace-nowrap ${selectedVal === id ? 'border-blue-600 bg-blue-50 text-blue-600 font-bold' : 'border-slate-200 text-slate-500'}`}>{label}</button>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* FEED */}
      <main className="max-w-lg mx-auto py-2">
        {loading ? (
          <div className="flex justify-center py-20 animate-pulse text-slate-400 font-bold italic">Chargement du Marketplace...</div>
        ) : filteredProducts.map((product) => (
          <article key={product.id} className="mb-10 border-b border-slate-50 pb-4">
            <div className="flex items-center justify-between px-4 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center font-black text-blue-600 text-xs">{getMerchantName(product.merchant_id).substring(0,2).toUpperCase()}</div>
                <div>
                  <div className="text-sm font-bold flex items-center gap-1">{getMerchantName(product.merchant_id)} <ShieldCheck size={14} className="text-blue-500" /></div>
                  <div className="text-[10px] text-slate-400 font-medium">{product.location || "Algérie"}</div>
                </div>
              </div>
              <MoreHorizontal size={18} className="text-slate-400" />
            </div>

            <div className="relative group aspect-square bg-slate-100 cursor-pointer" onClick={() => {setActiveChat(product); setMessages([{ content: `Bonjour ! Parlons de : ${product.name}`, sender_type: 'bot' }]);}}>
              {product.image_url && <Image src={product.image_url} alt={product.name} fill className="object-cover transition-transform group-hover:scale-105" />}
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="bg-white px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-xl"><Gavel size={18} className="text-blue-600" /> Négocier</div>
              </div>
              <div className="absolute bottom-4 right-4 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-sm font-black">{product.price.toLocaleString()} DA</div>
            </div>

            <div className="px-4 py-4 flex gap-5">
              <MessageCircle size={28} onClick={() => {setActiveChat(product); setMessages([{ content: `Bonjour ! Parlons de : ${product.name}`, sender_type: 'bot' }]);}} className="cursor-pointer" />
              <Heart size={28} />
              <Share2 size={26} />
            </div>

            <div className="px-4">
              <p className="text-sm"><span className="font-bold mr-2">{getMerchantName(product.merchant_id)}</span>{product.name}</p>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2 italic">{product.description}</p>
            </div>
          </article>
        ))}
      </main>

      {/* MODAL CHATBOT (Opérationnel) */}
      {activeChat && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md h-[80vh] bg-white rounded-t-[2.5rem] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white"><Bot size={22} /></div>
                <div>
                  <h3 className="text-sm font-bold truncate max-w-[150px]">{activeChat.name}</h3>
                  <p className="text-[10px] text-green-500 font-bold">Assistant en ligne</p>
                </div>
              </div>
              <button onClick={() => {setActiveChat(null); setMessages([]);}} className="bg-slate-100 p-2 rounded-full"><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3.5 rounded-2xl text-[13px] ${msg.sender_type === 'client' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none shadow-sm'}`}>{msg.content}</div>
                </div>
              ))}
              {isTyping && <div className="text-[10px] text-slate-400 animate-pulse italic">L'usine écrit...</div>}
              <div ref={scrollRef} />
            </div>

            <div className="p-6 border-t bg-white">
              <div className="flex items-center gap-2 bg-slate-100 rounded-2xl px-4 py-3">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Posez votre question..."
                  className="flex-1 bg-transparent border-none outline-none text-sm"
                />
                <button onClick={handleSendMessage} className="text-blue-600 font-bold"><Send size={22} /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
