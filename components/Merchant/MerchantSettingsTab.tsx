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
  MapPin, 
  Package, 
  User, 
  Filter,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  CheckCircle2,
  Truck,
  BellRing,
  FileText,
  AlertCircle,
  Clock
} from 'lucide-react'

interface OrdersPageProps {
  merchantId: string;
  products: any[];
  formatCurrency: (amount: number) => string;
  merchantInfo?: any;
}

export default function OrdersPage({ 
  merchantId, 
  products = [], 
  formatCurrency,
  merchantInfo = {}
}: OrdersPageProps) {
  const [orderGroups, setOrderGroups] = useState<any[]>([])
  const [selectedGroup, setSelectedGroup] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [newOrderAlert, setNewOrderAlert] = useState(false)
  
  const ITEMS_PER_PAGE = 8

  const statusOptions = [
    { value: 'all', label: 'Toutes' },
    { value: 'pending', label: 'En attente' },
    { value: 'processing', label: 'En cours' },
    { value: 'delivered', label: 'Livré' },
    { value: 'cancelled', label: 'Annulé' }
  ]

  // 🔥 CHARGER LES COMMANDES GROUPÉES
  const fetchOrderGroups = async () => {
    setLoading(true)
    try {
      // Récupérer toutes les commandes du marchand
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      // Récupérer tous les clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .eq('merchant_id', merchantId)

      // Grouper par order_group_id
      const groupsMap = new Map()
      
      ordersData?.forEach(order => {
        // Si pas de order_group_id, utiliser timestamp + client_id
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
        
        const group = groupsMap.get(groupId)
        group.orders.push(order)
        group.total_items += 1
        group.total_quantity += order.quantity || 1
        
        // Calculer le total
        const product = products.find(p => String(p.id) === String(order.product_id))
        group.total_amount += (product?.price || 0) * (order.quantity || 1)
        
        // Mettre à jour le statut du groupe
        if (order.status === 'cancelled') {
          group.status = 'cancelled'
        } else if (order.status === 'delivered' && group.status !== 'cancelled') {
          group.status = 'delivered'
        } else if (order.status === 'processing' && group.status === 'pending') {
          group.status = 'processing'
        }
      })

      setOrderGroups(Array.from(groupsMap.values()))
    } catch (err) {
      console.error('Erreur:', err)
      setError('Erreur lors du chargement des commandes')
    } finally {
      setLoading(false)
    }
  }

  // 🔥 METTRE À JOUR LE STATUT (Fournisseur -> Client instantané)
  const handleUpdateGroupStatus = async (groupId: string, newStatus: string) => {
    if (!selectedGroup) return
    
    setStatusUpdateLoading(true)
    try {
      // 1. Mettre à jour TOUTES les commandes du groupe dans Supabase
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: newStatus, 
          updated_at: new Date().toISOString() 
        })
        .eq('order_group_id', groupId)

      if (updateError) throw updateError

      // 2. Mettre à jour l'état local (UI fournisseur)
      setOrderGroups(prev => prev.map(group => 
        group.order_group_id === groupId 
          ? { 
              ...group, 
              status: newStatus,
              orders: group.orders.map(o => ({ ...o, status: newStatus }))
            }
          : group
      ))
      
      // 3. Mettre à jour le groupe sélectionné
      setSelectedGroup(prev => prev?.order_group_id === groupId 
        ? { 
            ...prev, 
            status: newStatus,
            orders: prev.orders.map(o => ({ ...o, status: newStatus }))
          }
        : prev
      )

      // 4. ✅ NOTIFICATION CLIENT (optionnelle mais recommandée)
      if (selectedGroup.client?.id) {
        try {
          const statusLabels = {
            pending: 'en attente',
            processing: 'en cours de préparation',
            delivered: 'livrée',
            cancelled: 'annulée'
          }
          
          await supabase
            .from('notifications')
            .insert({
              client_id: selectedGroup.client.id,
              merchant_id: merchantId,
              title: '📦 Mise à jour commande',
              message: `Votre commande ${groupId} est maintenant ${statusLabels[newStatus as keyof typeof statusLabels] || newStatus}`,
              created_at: new Date().toISOString(),
              read: false
            })
        } catch (notifErr) {
          console.error('Erreur notification:', notifErr)
        }
      }

    } catch (err) {
      console.error('Erreur update status:', err)
      alert('Erreur lors de la mise à jour du statut')
    } finally {
      setStatusUpdateLoading(false)
    }
  }

  // 🔥 REALTIME - Écouter les changements
  useEffect(() => {
    if (!merchantId) return

    fetchOrderGroups()

    // Canal pour les NOUVELLES commandes
    const insertChannel = supabase
      .channel('orders-insert')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `merchant_id=eq.${merchantId}`
        },
        () => {
          fetchOrderGroups()
          setNewOrderAlert(true)
          setTimeout(() => setNewOrderAlert(false), 5000)
        }
      )
      .subscribe()

    // Canal pour les MISES À JOUR de commandes
    const updateChannel = supabase
      .channel('orders-update')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `merchant_id=eq.${merchantId}`
        },
        () => {
          // Rafraîchir instantanément
          fetchOrderGroups()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(insertChannel)
      supabase.removeChannel(updateChannel)
    }
  }, [merchantId])

  // Filtrer et paginer
  const filteredGroups = orderGroups.filter(g => statusFilter === 'all' || g.status === statusFilter)
  const paginatedGroups = filteredGroups.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
  const totalPages = Math.ceil(filteredGroups.length / ITEMS_PER_PAGE)

  // Statut badge
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'delivered':
        return { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2, label: 'Livrée' }
      case 'processing':
        return { color: 'bg-blue-100 text-blue-700', icon: Clock, label: 'En cours' }
      case 'cancelled':
        return { color: 'bg-red-100 text-red-700', icon: X, label: 'Annulée' }
      default:
        return { color: 'bg-amber-100 text-amber-700', icon: AlertCircle, label: 'En attente' }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Commandes</h1>
        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-lg px-4 py-2"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={fetchOrderGroups}
            className="p-2 border rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Nouvelle commande alerte */}
      {newOrderAlert && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BellRing className="w-5 h-5 text-blue-600" />
            <span className="text-blue-800">Nouvelle commande reçue !</span>
          </div>
          <button onClick={() => setNewOrderAlert(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Liste des commandes */}
      <div className="space-y-4">
        {paginatedGroups.map(group => {
          const status = getStatusBadge(group.status)
          const StatusIcon = status.icon
          
          return (
            <div
              key={group.order_group_id}
              onClick={() => setSelectedGroup(group)}
              className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer bg-white"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm bg-gray-100 px-3 py-1 rounded-full">
                      {group.order_group_id}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${status.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {group.client?.name || `Client #${String(group.client_id).slice(-4)}`}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(group.created_at).toLocaleDateString('fr-FR')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      {group.total_items} article{group.total_items > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {group.orders.slice(0, 3).map((order: any, idx: number) => {
                      const product = products.find(p => String(p.id) === String(order.product_id))
                      return (
                        <span key={idx} className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {product?.name || 'Produit'} x{order.quantity || 1}
                        </span>
                      )
                    })}
                    {group.orders.length > 3 && (
                      <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                        +{group.orders.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm text-gray-500 mb-1">Total</div>
                  <div className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(group.total_amount)}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-4 py-2">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal détails commande */}
      {selectedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold">Détails de la commande</h2>
                <p className="text-sm font-mono text-gray-500">{selectedGroup.order_group_id}</p>
              </div>
              <button onClick={() => setSelectedGroup(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Client info */}
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Client
              </h3>
              <p className="font-medium">{selectedGroup.client?.name || 'Client'}</p>
              <p className="text-sm text-gray-600">{selectedGroup.client?.phone}</p>
              <p className="text-sm text-gray-600">{selectedGroup.client?.city}</p>
            </div>

            {/* Produits */}
            <div className="space-y-3 mb-6">
              <h3 className="font-semibold flex items-center gap-2">
                <Package className="w-4 h-4" />
                Articles ({selectedGroup.orders.length})
              </h3>
              {selectedGroup.orders.map((order: any, idx: number) => {
                const product = products.find(p => String(p.id) === String(order.product_id))
                return (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{product?.name || 'Produit'}</p>
                      <p className="text-sm text-gray-500">Quantité: {order.quantity || 1}</p>
                    </div>
                    <p className="font-bold">
                      {formatCurrency((product?.price || 0) * (order.quantity || 1))}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Total */}
            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total</span>
                <span className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(selectedGroup.total_amount)}
                </span>
              </div>
            </div>

            {/* Actions statut */}
            <div className="space-y-3">
              {selectedGroup.status === 'pending' && (
                <button
                  onClick={() => handleUpdateGroupStatus(selectedGroup.order_group_id, 'processing')}
                  disabled={statusUpdateLoading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {statusUpdateLoading ? 'Mise à jour...' : '✅ Marquer comme préparée'}
                </button>
              )}
              
              {selectedGroup.status === 'processing' && (
                <button
                  onClick={() => handleUpdateGroupStatus(selectedGroup.order_group_id, 'delivered')}
                  disabled={statusUpdateLoading}
                  className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {statusUpdateLoading ? 'Mise à jour...' : '📦 Marquer comme livrée'}
                </button>
              )}
              
              <button
                onClick={() => {/* Fonction impression */}}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Bon de livraison
              </button>
              
              {selectedGroup.status !== 'delivered' && selectedGroup.status !== 'cancelled' && (
                <button
                  onClick={() => handleUpdateGroupStatus(selectedGroup.order_group_id, 'cancelled')}
                  disabled={statusUpdateLoading}
                  className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  ❌ Annuler la commande
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}