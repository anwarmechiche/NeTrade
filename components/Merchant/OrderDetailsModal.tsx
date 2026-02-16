'use client'

import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { 
  Package, 
  Building2, 
  Phone, 
  MapPinned, 
  Mail,
  Calendar,
  CheckCircle2,
  Truck,
  Printer,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  Layers
} from 'lucide-react'

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

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGroup: OrderGroup | null;
  products: any[];
  formatCurrency: (amount: number) => string;
  onUpdateStatus: (groupId: string, newStatus: string) => Promise<void>;
  onPrintDeliveryNote: (group: OrderGroup) => void;
  statusUpdateLoading: boolean;
}

export default function OrderDetailsModal({
  isOpen,
  onClose,
  selectedGroup,
  products,
  formatCurrency,
  onUpdateStatus,
  onPrintDeliveryNote,
  statusUpdateLoading
}: OrderDetailsModalProps) {
  
  if (!isOpen || !selectedGroup) return null;

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'delivered': 
        return { 
          color: 'bg-emerald-100 text-emerald-700 border-emerald-200', 
          icon: CheckCircle, 
          label: 'Livrée' 
        }
      case 'processing': 
        return { 
          color: 'bg-blue-100 text-blue-700 border-blue-200', 
          icon: Clock, 
          label: 'En cours' 
        }
      case 'cancelled': 
        return { 
          color: 'bg-red-100 text-red-700 border-red-200', 
          icon: X, 
          label: 'Annulée' 
        }
      default: 
        return { 
          color: 'bg-amber-100 text-amber-700 border-amber-200', 
          icon: AlertCircle, 
          label: 'En attente' 
        }
    }
  }

  const status = getStatusBadge(selectedGroup.status)
  const StatusIcon = status.icon

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`📦 Commande ${selectedGroup.order_group_id.slice(-8)}`}
      icon="📦"
      size="lg"
    >
      <div className="space-y-6">
        
        {/* EN-TÊTE AVEC STATUT */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-full flex items-center justify-center text-white text-2xl shadow-md">
              📦
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">
                Commande #{selectedGroup.order_group_id.slice(-8)}
              </div>
              <div className="text-sm text-gray-500 mt-1 font-mono">
                {selectedGroup.order_group_id}
              </div>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border ${status.color}`}>
            <StatusIcon className="w-4 h-4" />
            {status.label}
          </span>
        </div>

        {/* DATE DE COMMANDE */}
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span>Passée le {new Date(selectedGroup.created_at).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</span>
        </div>

        {/* INFORMATIONS CLIENT */}
        <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-600 rounded-lg shadow-md">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
                CLIENT
              </p>
              <p className="text-lg font-bold text-gray-900 mb-2">
                {selectedGroup.client?.name || 'Client'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {selectedGroup.client?.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-sm">{selectedGroup.client.phone}</span>
                  </div>
                )}
                {selectedGroup.client?.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-sm">{selectedGroup.client.email}</span>
                  </div>
                )}
                {selectedGroup.client?.city && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPinned className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-sm">
                      {selectedGroup.client.city}
                      {selectedGroup.client.wilaya && `, ${selectedGroup.client.wilaya}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RÉCAPITULATIF COMMANDE */}
        <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3">
                RÉCAPITULATIF
              </p>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 rounded-lg">
                    <Package className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Articles</p>
                    <p className="text-xl font-bold text-gray-900">
                      {selectedGroup.total_items}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 rounded-lg">
                    <Layers className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Quantité</p>
                    <p className="text-xl font-bold text-gray-900">
                      {selectedGroup.total_quantity}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-emerald-100 min-w-[180px]">
              <p className="text-xs text-gray-500 mb-1">Total TTC</p>
              <p className="text-2xl font-black text-emerald-600">
                {formatCurrency(selectedGroup.total_amount)}
              </p>
            </div>
          </div>
        </div>

        {/* LISTE DES PRODUITS */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-white px-4 py-3 border-b border-gray-200">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <Package className="w-3.5 h-3.5" />
              ARTICLES ({selectedGroup.orders.length})
            </p>
          </div>
          <div className="divide-y divide-gray-200 max-h-[300px] overflow-y-auto">
            {selectedGroup.orders.map((order, idx) => {
              const product = products.find(p => String(p.id) === String(order.product_id))
              return (
                <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center border border-gray-200">
                        {product?.image_data ? (
                          <img 
                            src={product.image_data} 
                            alt={product.name} 
                            className="w-full h-full rounded-lg object-cover" 
                          />
                        ) : (
                          <Package className="w-6 h-6 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {product?.name || 'Produit'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full text-xs">
                            <span className="text-gray-500">x</span>
                            <span className="font-bold text-gray-900">
                              {order.quantity || 1}
                            </span>
                          </span>
                          <span className="text-xs text-gray-600">
                            {formatCurrency(product?.price || 0)} 
                            <span className="text-gray-400"> /u</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right md:border-l md:border-gray-200 md:pl-4">
                      <p className="text-base font-bold text-emerald-600">
                        {formatCurrency((product?.price || 0) * (order.quantity || 1))}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* DATES */}
        <div className="border-t pt-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>Créée: {new Date(selectedGroup.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>Mise à jour: {new Date(selectedGroup.updated_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</span>
          </div>
        </div>

        {/* BOUTONS D'ACTION */}
        <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
          
          {selectedGroup.status === 'pending' && (
            <Button
              variant="primary"
              icon={<CheckCircle2 className="w-4 h-4" />}
              onClick={() => {
                onUpdateStatus(selectedGroup.order_group_id, 'processing')
                onClose()
              }}
              disabled={statusUpdateLoading}
            >
              {statusUpdateLoading ? 'Mise à jour...' : 'Marquer comme préparée'}
            </Button>
          )}
          
          {selectedGroup.status === 'processing' && (
            <Button
              variant="success"
              icon={<Truck className="w-4 h-4" />}
              onClick={() => {
                onUpdateStatus(selectedGroup.order_group_id, 'delivered')
                onClose()
              }}
              disabled={statusUpdateLoading}
            >
              {statusUpdateLoading ? 'Mise à jour...' : 'Marquer comme livrée'}
            </Button>
          )}
          
          <Button
            variant="info"
            icon={<Printer className="w-4 h-4" />}
            onClick={() => onPrintDeliveryNote(selectedGroup)}
          >
            Bon de livraison
          </Button>
          
          {selectedGroup.status !== 'cancelled' && 
           selectedGroup.status !== 'delivered' && (
            <Button
              variant="danger"
              icon={<X className="w-4 h-4" />}
              onClick={() => {
                onUpdateStatus(selectedGroup.order_group_id, 'cancelled')
                onClose()
              }}
              disabled={statusUpdateLoading}
            >
              Annuler
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={onClose}
          >
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  )
}