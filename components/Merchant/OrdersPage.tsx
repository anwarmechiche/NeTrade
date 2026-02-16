'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  ShoppingBag, 
  RefreshCw, 
  ChevronRight, 
  X, 
  Printer, 
  Calendar, 
  Package, 
  User, 
  Filter,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  CheckCircle2,
  Truck,
  BellRing,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Building2,
  Phone,
  Mail,
  MapPinned,
  Tag,
  Layers,
  Receipt,
  Store,
  ArrowLeft
} from 'lucide-react'

interface OrdersPageProps {
  merchantId: string;
  products: any[];
  formatCurrency: (amount: number) => string;
  merchantInfo?: any;
}

interface OrderGroup {
  order_group_id: string;
  merchant_id: string;
  client_id: string;
  client?: any;
  orders: any[];
  created_at: string;
  updated_at: string;
  total_items: number;
  total_quantity: number;
  total_amount: number;
  status: 'pending' | 'processing' | 'delivered' | 'cancelled';
}

export default function OrdersPage({ 
  merchantId, 
  products = [], 
  formatCurrency,
  merchantInfo = {}
}: OrdersPageProps) {
  const [orderGroups, setOrderGroups] = useState<OrderGroup[]>([])
  const [selectedGroup, setSelectedGroup] = useState<OrderGroup | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list')
  const [loading, setLoading] = useState(true)
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [newOrderAlert, setNewOrderAlert] = useState(false)
  const [companyInfo, setCompanyInfo] = useState<any>(merchantInfo)
  
  const ITEMS_PER_PAGE = 8

  const statusOptions = [
    { value: 'all', label: 'Toutes' },
    { value: 'pending', label: 'En attente' },
    { value: 'processing', label: 'En cours' },
    { value: 'delivered', label: 'Livré' },
    { value: 'cancelled', label: 'Annulé' }
  ]

  useEffect(() => {
    if (!merchantInfo?.company_name && merchantId) {
      fetchCompanyInfo()
    }
  }, [merchantId])

  const fetchCompanyInfo = async () => {
    try {
      const { data: settingsData } = await supabase
        .from('merchant_settings')
        .select('*')
        .eq('merchant_id', merchantId)
        .maybeSingle()
      
      if (settingsData) {
        setCompanyInfo(settingsData)
        return
      }

      const { data } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', merchantId)
        .single()
      
      if (data) setCompanyInfo(data)
    } catch (err) {
      console.error('Erreur chargement infos entreprise:', err)
    }
  }

  const fetchOrderGroups = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError
      if (!ordersData?.length) { setOrderGroups([]); setLoading(false); return }

      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .eq('merchant_id', merchantId)

      const groupsMap = new Map<string, OrderGroup>()
      
      ordersData.forEach(order => {
        const groupId = order.order_group_id || 
                       `CMD-${new Date(order.created_at).getTime()}-${order.client_id}`
        
        if (!groupsMap.has(groupId)) {
          groupsMap.set(groupId, {
            order_group_id: groupId,
            merchant_id: order.merchant_id,
            client_id: order.client_id,
            client: clientsData?.find(c => String(c.id) === String(order.client_id)) || null,
            orders: [],
            created_at: order.created_at,
            updated_at: order.created_at,
            total_items: 0,
            total_quantity: 0,
            total_amount: 0,
            status: order.status
          })
        }
        
        const group = groupsMap.get(groupId)!
        group.orders.push(order)
        group.total_items += 1
        group.total_quantity += order.quantity || 1
        group.updated_at = new Date(
          Math.max(new Date(group.updated_at).getTime(), new Date(order.created_at).getTime())
        ).toISOString()
        
        if (order.status === 'cancelled') group.status = 'cancelled'
        else if (order.status === 'delivered' && group.status !== 'cancelled') group.status = 'delivered'
        else if (order.status === 'processing' && group.status === 'pending') group.status = 'processing'
      })

      groupsMap.forEach(group => {
        group.total_amount = group.orders.reduce((sum, order) => {
          const product = products.find(p => String(p.id) === String(order.product_id))
          return sum + (product?.price || 0) * (order.quantity || 1)
        }, 0)
      })

      setOrderGroups(Array.from(groupsMap.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      
    } catch (err: any) {
      console.error('Erreur fetchOrderGroups:', err)
      setError(err.message || 'Erreur lors du chargement des commandes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (merchantId) fetchOrderGroups()
  }, [merchantId, products])

  useEffect(() => {
    if (!merchantId) return

    const channel = supabase
      .channel(`orders-${merchantId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'orders', 
        filter: `merchant_id=eq.${merchantId}` 
      }, () => {
        fetchOrderGroups()
        setNewOrderAlert(true)
        setTimeout(() => setNewOrderAlert(false), 5000)
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders', 
        filter: `merchant_id=eq.${merchantId}` 
      }, () => {
        fetchOrderGroups()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel).catch(console.error) }
  }, [merchantId])

  const handleUpdateGroupStatus = async (groupId: string, newStatus: string) => {
    if (!selectedGroup) return
    setStatusUpdateLoading(true)
    try {
      const orderIds = selectedGroup.orders.map((order: any) => order.id)
      if (orderIds.length === 0) throw new Error('Aucune commande à mettre à jour')

      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .in('id', orderIds)

      if (updateError) throw updateError

      setOrderGroups(prev => prev.map(group => 
        group.order_group_id === groupId 
          ? { ...group, status: newStatus as any, orders: group.orders.map(o => ({ ...o, status: newStatus })) }
          : group
      ))
      
      setSelectedGroup(prev => prev?.order_group_id === groupId 
        ? { ...prev, status: newStatus as any, orders: prev.orders.map(o => ({ ...o, status: newStatus })) }
        : prev
      )

      if (selectedGroup.client?.id) {
        try {
          const statusLabels = { 
            pending: 'en attente', 
            processing: 'en cours de préparation', 
            delivered: 'livrée', 
            cancelled: 'annulée' 
          }
          await supabase.from('notifications').insert({
            client_id: selectedGroup.client.id,
            merchant_id: merchantId,
            title: '📦 Mise à jour commande',
            message: `Votre commande ${groupId} est maintenant ${statusLabels[newStatus as keyof typeof statusLabels] || newStatus}`,
            created_at: new Date().toISOString(),
            read: false
          })
        } catch (notifErr) { 
          console.error('❌ Erreur notification:', notifErr) 
        }
      }
    } catch (err: any) {
      console.error('❌ Erreur update status:', err)
      alert(`Erreur: ${err.message}`)
    } finally {
      setStatusUpdateLoading(false)
    }
  }

  const handlePrintDeliveryNote = (group: OrderGroup) => {
    const client = group.client
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (!printWindow) { alert('Veuillez autoriser les popups'); return }

    const today = new Date()
    const dateFormatted = today.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const shortId = String(group.order_group_id).slice(-8)
    const deliveryNoteNumber = `BL-${shortId}-${dateFormatted.replace(/\//g, '')}`

    const companyName = companyInfo?.Nom_de_l_entreprise || companyInfo?.company_name || 'TradePro'
    const companyPhone = companyInfo?.téléphone_de_l_entreprise || companyInfo?.company_phone || '0560277868'
    const companyAddress = companyInfo?.adresse_de_l_entreprise || companyInfo?.company_address || 'Alger, Algérie'
    const nif = companyInfo?.nif || companyInfo?.tax_id || '123465798987654'
    const rc = companyInfo?.rc || companyInfo?.trade_registry || 'RC-23-456-78'
    const currency = companyInfo?.devise || companyInfo?.currency || 'DZD'

    const htmlContent = `<!DOCTYPE html>
      <html><head><meta charset="UTF-8"><title>BL ${shortId}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box;}
      @page{size:A4;margin:1.5cm;}
      body{font-family:Arial,sans-serif;background:#fff;color:#000;font-size:12pt;}
      .header{display:flex;justify-content:space-between;margin-bottom:30px;border-bottom:2px solid #10b981;padding-bottom:20px;}
      .company-name{font-size:24pt;font-weight:bold;color:#0f172a;}
      .document-title h2{font-size:20pt;color:#10b981;text-transform:uppercase;}
      .fiscal-grid{display:grid;grid-template-columns:repeat(4,1fr);background:#f3f4f6;padding:15px;margin-bottom:25px;border-radius:8px;}
      .fiscal-grid div{color:#1f2937;}
      .parties{display:grid;grid-template-columns:1fr 1fr;gap:25px;margin-bottom:30px;}
      .party-box{border:1px solid #e5e7eb;padding:15px;border-radius:8px;background:white;}
      .party-box h3{color:#10b981;margin-bottom:10px;}
      .party-box p{color:#1f2937;}
      .products-table{width:100%;border-collapse:collapse;margin:20px 0;}
      .products-table th{background:#f3f4f6;color:#374151;padding:10px;text-align:left;}
      .products-table td{padding:10px;border-bottom:1px solid #e5e7eb;color:#1f2937;}
      .totals{text-align:right;margin-top:20px;padding-top:20px;border-top:2px solid #e5e7eb;}
      .grand-total{font-size:16pt;font-weight:bold;color:#10b981;}</style>
      </head><body>
      <div class="header">
        <div><div class="company-name">${companyName}</div><div style="color:#4b5563;">${companyAddress}<br>Tél: ${companyPhone}</div></div>
        <div class="document-title"><h2>BON DE LIVRAISON</h2><div style="color:#1f2937;">${deliveryNoteNumber}</div><div style="color:#6b7280;">Date: ${dateFormatted}</div></div>
      </div>
      <div class="fiscal-grid">
        <div><strong>NIF</strong><br>${nif}</div><div><strong>RC</strong><br>${rc}</div>
        <div><strong>AI</strong><br>${companyInfo?.ai || '000465'}</div><div><strong>NIS</strong><br>${companyInfo?.nis || '123456789012345'}</div>
      </div>
      <div class="parties">
        <div class="party-box"><h3>CLIENT</h3><p><strong>${client?.name || 'Client'}</strong></p><p>Tél: ${client?.phone || 'Non renseigné'}</p><p>Ville: ${client?.city || 'Non renseigné'}</p></div>
        <div class="party-box"><h3>LIVRAISON</h3><p>Date: ${dateFormatted}</p><p>Commande: ${group.order_group_id}</p><p>Articles: ${group.total_items}</p></div>
      </div>
      <table class="products-table"><thead><tr><th>Produit</th><th>Qté</th><th>Prix unit.</th><th>Total</th></tr></thead><tbody>
        ${group.orders.map(order => {
          const product = products.find(p => String(p.id) === String(order.product_id))
          return `<tr><td>${product?.name || 'Produit'}</td><td>${order.quantity || 1}</td><td>${formatCurrency(product?.price || 0)}</td><td><strong>${formatCurrency((product?.price || 0) * (order.quantity || 1))}</strong></td></tr>`
        }).join('')}
      </tbody></table>
      <div class="totals"><div style="font-size:14pt; color:#10b981;">Total TTC: <strong>${formatCurrency(group.total_amount)} ${currency}</strong></div></div>
      <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script>
      </body></html>`

    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  const filteredGroups = orderGroups.filter(group => statusFilter === 'all' || group.status === statusFilter)
  const paginatedGroups = filteredGroups.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
  const totalPages = Math.ceil(filteredGroups.length / ITEMS_PER_PAGE)

  useEffect(() => { setCurrentPage(1) }, [statusFilter])

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'delivered': return { color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle, label: 'Livrée' }
      case 'processing': return { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'En cours' }
      case 'cancelled': return { color: 'bg-red-100 text-red-800', icon: X, label: 'Annulée' }
      default: return { color: 'bg-amber-100 text-amber-800', icon: AlertCircle, label: 'En attente' }
    }
  }

  const handleBackToList = () => {
    setViewMode('list')
    setSelectedGroup(null)
  }

  const handleOpenOrderDetail = (group: OrderGroup) => {
    setSelectedGroup(group)
    setViewMode('detail')
  }

  if (loading && orderGroups.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-700 font-medium">Chargement des commandes...</p>
      </div>
    )
  }

  if (error && orderGroups.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md text-center border border-red-200">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <p className="text-xl font-bold text-gray-900 mb-2">Oups ! Erreur de chargement</p>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={fetchOrderGroups} 
            className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" /> Réessayer
          </button>
        </div>
      </div>
    )
  }

  // AFFICHAGE DU DÉTAIL COMMANDE EN GRAND ONGLET
  if (viewMode === 'detail' && selectedGroup) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header du détail */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="px-6 py-4 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBackToList}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-700" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <span>📦 Commande</span>
                    <span className="font-mono text-sm bg-gray-100 text-gray-800 px-3 py-1.5 rounded-full">
                      {String(selectedGroup.order_group_id).slice(-8)}
                    </span>
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Détails complets de la commande
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                  selectedGroup.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                  selectedGroup.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                  selectedGroup.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  {getStatusBadge(selectedGroup.status).label}
                </span>
                <button
                  onClick={() => handlePrintDeliveryNote(selectedGroup)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Bon de livraison
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Contenu du détail */}
        <div className="px-6 py-8 max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="space-y-8">
              
              {/* EN-TÊTE AVEC STATUT */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl flex items-center justify-center text-white text-3xl shadow-lg">
                    📦
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      Commande #{String(selectedGroup.order_group_id).slice(-8)}
                    </div>
                    <div className="text-sm text-gray-600 font-mono">
                      Référence complète: {selectedGroup.order_group_id}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600 mb-1">Date de commande</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {new Date(selectedGroup.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>

              {/* INFORMATIONS CLIENT */}
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-800" />
                  Informations client
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs text-blue-700 mb-1">Nom</p>
                    <p className="font-semibold text-gray-900 text-lg">
                      {selectedGroup.client?.name || 'Client'}
                    </p>
                  </div>
                  {selectedGroup.client?.phone && (
                    <div>
                      <p className="text-xs text-blue-700 mb-1">Téléphone</p>
                      <p className="text-gray-800">{selectedGroup.client.phone}</p>
                    </div>
                  )}
                  {selectedGroup.client?.email && (
                    <div>
                      <p className="text-xs text-blue-700 mb-1">Email</p>
                      <p className="text-gray-800">{selectedGroup.client.email}</p>
                    </div>
                  )}
                  {selectedGroup.client?.city && (
                    <div>
                      <p className="text-xs text-blue-700 mb-1">Ville</p>
                      <p className="text-gray-800">
                        {selectedGroup.client.city}
                        {selectedGroup.client.wilaya && `, ${selectedGroup.client.wilaya}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* RÉCAPITULATIF */}
              <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200">
                <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-800" />
                  Récapitulatif de la commande
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-600 mb-1">Nombre d'articles</p>
                    <p className="text-3xl font-bold text-gray-900">{selectedGroup.total_items}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-600 mb-1">Quantité totale</p>
                    <p className="text-3xl font-bold text-gray-900">{selectedGroup.total_quantity}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-600 mb-1">Statut</p>
                    <p className={`text-lg font-bold ${
                      selectedGroup.status === 'delivered' ? 'text-emerald-700' :
                      selectedGroup.status === 'processing' ? 'text-blue-700' :
                      selectedGroup.status === 'cancelled' ? 'text-red-700' :
                      'text-amber-700'
                    }`}>
                      {getStatusBadge(selectedGroup.status).label}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-4 rounded-lg shadow-lg">
                    <p className="text-xs text-white/90 mb-1">Total TTC</p>
                    <p className="text-3xl font-bold text-white">{formatCurrency(selectedGroup.total_amount)}</p>
                  </div>
                </div>
              </div>

              {/* LISTE DES PRODUITS */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  Articles commandés ({selectedGroup.orders.length})
                </h3>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Produit</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Référence</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Quantité</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Prix unitaire</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {selectedGroup.orders.map((order, idx) => {
                        const product = products.find(p => String(p.id) === String(order.product_id))
                        return (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                                  {product?.image_data ? (
                                    <img src={product.image_data} alt={product.name} className="w-full h-full rounded-lg object-cover" />
                                  ) : (
                                    <Package className="w-6 h-6 text-gray-500" />
                                  )}
                                </div>
                                <span className="font-medium text-gray-900">{product?.name || 'Produit'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-800">
                                {String(order.product_id || '').slice(-8) || 'N/A'}
                              </code>
                            </td>
                            <td className="px-6 py-4 text-center font-semibold text-gray-900">{order.quantity || 1}</td>
                            <td className="px-6 py-4 text-right text-gray-700">{formatCurrency(product?.price || 0)}</td>
                            <td className="px-6 py-4 text-right font-bold text-emerald-700">
                              {formatCurrency((product?.price || 0) * (order.quantity || 1))}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="bg-gray-100">
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-right font-bold text-gray-800">Total commande</td>
                        <td className="px-6 py-4 text-right font-bold text-2xl text-emerald-700">
                          {formatCurrency(selectedGroup.total_amount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* DATES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Date de création</p>
                  <p className="font-medium text-gray-900">
                    {new Date(selectedGroup.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Dernière mise à jour</p>
                  <p className="font-medium text-gray-900">
                    {new Date(selectedGroup.updated_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {/* BOUTONS D'ACTION */}
              <div className="flex flex-wrap justify-end gap-3 pt-6 border-t border-gray-200">
                {selectedGroup.status === 'pending' && (
                  <button
                    onClick={() => {
                      handleUpdateGroupStatus(selectedGroup.order_group_id, 'processing')
                    }}
                    disabled={statusUpdateLoading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    {statusUpdateLoading ? 'Mise à jour...' : 'Marquer comme préparée'}
                  </button>
                )}
                
                {selectedGroup.status === 'processing' && (
                  <button
                    onClick={() => {
                      handleUpdateGroupStatus(selectedGroup.order_group_id, 'delivered')
                    }}
                    disabled={statusUpdateLoading}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                  >
                    <Truck className="w-5 h-5" />
                    {statusUpdateLoading ? 'Mise à jour...' : 'Marquer comme livrée'}
                  </button>
                )}
                
                <button
                  onClick={() => handlePrintDeliveryNote(selectedGroup)}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Printer className="w-5 h-5" />
                  Bon de livraison
                </button>
                
                {selectedGroup.status !== 'cancelled' && selectedGroup.status !== 'delivered' && (
                  <button
                    onClick={() => {
                      handleUpdateGroupStatus(selectedGroup.order_group_id, 'cancelled')
                    }}
                    disabled={statusUpdateLoading}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                  >
                    <X className="w-5 h-5" />
                    Annuler la commande
                  </button>
                )}
                
                <button
                  onClick={handleBackToList}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center gap-2 shadow-sm border border-gray-300"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Retour à la liste
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // AFFICHAGE DE LA LISTE DES COMMANDES
  return (
    <>
      <div className="px-4 md:px-6 py-6 max-w-7xl mx-auto">
        
        {/* Notification nouvelle commande */}
        {newOrderAlert && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white shadow-lg rounded-lg px-4 py-3 flex items-center gap-3 border-l-4 border-emerald-500">
            <BellRing className="w-5 h-5 text-emerald-600" />
            <span className="font-medium text-gray-800">Nouvelle commande reçue !</span>
            <button onClick={() => setNewOrderAlert(false)} className="ml-4 text-gray-500 hover:text-gray-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Commandes</h1>
              <p className="text-sm text-gray-600">{filteredGroups.length} commande{filteredGroups.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="flex-1 sm:flex-none px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {statusOptions.map(opt => <option key={opt.value} value={opt.value} className="text-gray-800">{opt.label}</option>)}
            </select>
            <button
              onClick={fetchOrderGroups}
              disabled={loading}
              className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-gray-700"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-600 uppercase font-semibold">Total CA</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(orderGroups.reduce((a, g) => a + g.total_amount, 0))}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-600 uppercase font-semibold">En attente</p>
            <p className="text-xl font-bold text-amber-600">{orderGroups.filter(g => g.status === 'pending').length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-600 uppercase font-semibold">En cours</p>
            <p className="text-xl font-bold text-blue-600">{orderGroups.filter(g => g.status === 'processing').length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-600 uppercase font-semibold">Livrées</p>
            <p className="text-xl font-bold text-emerald-600">{orderGroups.filter(g => g.status === 'delivered').length}</p>
          </div>
        </div>

        {/* Liste des commandes */}
        {paginatedGroups.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
            <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">Aucune commande trouvée</p>
            <p className="text-sm text-gray-500 mt-1">
              {statusFilter !== 'all' ? 'Essayez de changer le filtre' : 'Les nouvelles commandes apparaîtront ici'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedGroups.map(group => {
              const status = getStatusBadge(group.status)
              const StatusIcon = status.icon
              const clientName = group.client?.name || `Client #${String(group.client_id).slice(-4)}`
              
              return (
                <div
                  key={group.order_group_id}
                  onClick={() => handleOpenOrderDetail(group)}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-mono bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          {String(group.order_group_id).slice(-12)}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-gray-700">
                          <User className="w-4 h-4 text-gray-500" /> {clientName}
                        </span>
                        <span className="flex items-center gap-1 text-gray-700">
                          <Calendar className="w-4 h-4 text-gray-500" /> 
                          {new Date(group.created_at).toLocaleDateString('fr-FR')}
                        </span>
                        <span className="flex items-center gap-1 text-gray-700">
                          <Package className="w-4 h-4 text-gray-500" /> {group.total_items} art.
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 md:border-l md:border-gray-200 md:pl-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Total</p>
                        <p className="text-xl font-bold text-emerald-700">{formatCurrency(group.total_amount)}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 text-gray-700"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-800">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 text-gray-700"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </>
  )
}