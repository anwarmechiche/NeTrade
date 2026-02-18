'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ProductForm from '@/components/Merchant/ProductForm'
import ClientForm from '@/components/Merchant/ClientForm'
import OrdersPage from './OrdersPage'; 
// Ou le chemin exact : import OrdersPage from '@/components/Merchant/OrdersPage';
import { db } from '@/utils/supabase/client'
import MerchantSettingsTab from '@/components/Merchant/MerchantSettingsTab'
import { Product, Client, Order } from '@/utils/supabase/types'
interface MerchantDashboardProps {
  merchantId: string
  user: any
}

export default function MerchantDashboard({ merchantId, user }: MerchantDashboardProps) {
  const [activeTab, setActiveTab] = useState('products')
  const [products, setProducts] = useState<Product[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    products: 0,
    clients: 0,
    orders: 0,
    revenue: 0
  })

  // États pour les modales
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [viewProductModalOpen, setViewProductModalOpen] = useState(false)
  const [clientModalOpen, setClientModalOpen] = useState(false)
  const [viewClientModalOpen, setViewClientModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  useEffect(() => {
    if (merchantId) {
      loadData()
    }
  }, [merchantId])

  const loadData = async () => {
    setLoading(true)
    try {
      console.log('Chargement des données pour merchantId:', merchantId)
      
      const [productsData, clientsData, ordersData] = await Promise.all([
        db.getProducts(merchantId),
        db.getClients(merchantId),
        db.getOrders(merchantId)
      ])

      console.log('Données récupérées:', {
        produits: productsData.length,
        clients: clientsData.length,
        commandes: ordersData.length
      })

      setProducts(productsData)
      setClients(clientsData)
      setOrders(ordersData)

      // Calculate stats
      const revenue = ordersData.reduce((total, order) => {
        const product = productsData.find(p => p.id === order.product_id)
        return total + (order.quantity * (product?.price || 0))
      }, 0)

      setStats({
        products: productsData.length,
        clients: clientsData.length,
        orders: ordersData.length,
        revenue
      })
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0
    }).format(value)
  }

  // Fonctions pour les produits
  const handleViewProduct = async (productId: string) => {
    try {
      console.log('Visualisation produit ID:', productId)
      const product = await db.getProductById(productId)
      if (product) {
        setSelectedProduct(product)
        setViewProductModalOpen(true)
      } else {
        alert('Produit non trouvé')
      }
    } catch (error) {
      console.error('Error viewing product:', error)
      alert('Erreur lors du chargement du produit')
    }
  }

  const handleEditProduct = async (productId: string) => {
    try {
      console.log('Édition produit ID:', productId)
      const product = await db.getProductById(productId)
      if (product) {
        setSelectedProduct(product)
        setProductModalOpen(true)
      } else {
        alert('Produit non trouvé')
      }
    } catch (error) {
      console.error('Error editing product:', error)
      alert('Erreur lors du chargement du produit')
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      try {
        const success = await db.deleteProduct(productId)
        if (success) {
          alert('Produit supprimé avec succès')
          await loadData() // Recharger les données
        } else {
          alert('Erreur lors de la suppression du produit')
        }
      } catch (error) {
        console.error('Error deleting product:', error)
        alert('Erreur lors de la suppression du produit')
      }
    }
  }

  const handleProductSubmit = async (productData: any) => {
  // 1. Vérifier si on a bien un marchand chargé (on utilise merchantId ou l'objet merchant)
  if (!merchantId) {
    alert("Erreur : Aucun marchand identifié. Veuillez vous reconnecter.");
    return;
  }

  console.log("1. Début soumission pour le fournisseur ID:", merchantId);
  
  try {
    const payload = {
      name: productData.name,
      price: parseFloat(productData.price) || 0,
      description: productData.description || "",
      active: productData.active ?? true,
      image: productData.image, 
      // ✅ Correction ici : on utilise la variable dynamique merchantId
      merchant_id: merchantId 
    };

    console.log("2. Payload envoyé à Supabase:", payload);

    const result = await db.createProduct(payload);

    if (result) {
      console.log("3. ✅ Succès stockage dans la BDD:", result);
      setProductModalOpen(false);
      // On réinitialise le produit sélectionné au cas où c'était une édition
      setSelectedProduct?.(null); 
      await loadData(); 
    } else {
      console.error("3. ❌ Le résultat est vide.");
    }
  } catch (error: any) {
    console.error("3. ❌ ERREUR CRITIQUE:", error);
    alert(`Erreur de stockage: ${error.message}`);
  }
};
  // Fonctions pour les clients
  const handleViewClient = async (clientId: string) => {
    try {
      console.log('Visualisation client ID:', clientId)
      const client = await db.getClientById(clientId)
      if (client) {
        setSelectedClient(client)
        setViewClientModalOpen(true)
      } else {
        alert('Client non trouvé')
      }
    } catch (error) {
      console.error('Error viewing client:', error)
      alert('Erreur lors du chargement du client')
    }
  }

  const handleEditClient = async (clientId: string) => {
    try {
      console.log('Édition client ID:', clientId)
      const client = await db.getClientById(clientId)
      if (client) {
        setSelectedClient(client)
        setClientModalOpen(true)
      } else {
        alert('Client non trouvé')
      }
    } catch (error) {
      console.error('Error editing client:', error)
      alert('Erreur lors du chargement du client')
    }
  }

  const handleDeleteClient = async (clientId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      try {
        // Créez cette fonction dans votre db si elle n'existe pas
        // const success = await db.deleteClient(clientId)
        // Pour l'instant, on va juste simuler
        alert('Fonction de suppression à implémenter')
        await loadData() // Recharger les données
      } catch (error) {
        console.error('Error deleting client:', error)
        alert('Erreur lors de la suppression du client')
      }
    }
  }

  const handleClientSubmit = async (clientData: Partial<Client>) => {
    try {
      if (selectedClient) {
        // Mise à jour
        const result = await db.updateClient(selectedClient.id, clientData)
        if (result) {
          alert('Client mis à jour avec succès')
          setClientModalOpen(false)
          setSelectedClient(null)
          await loadData() // Recharger les données
        }
      } else {
        // Création - vous devrez implémenter createClient dans db
        alert('Fonction de création de client à implémenter')
      }
    } catch (error) {
      console.error('Error saving client:', error)
      alert('Erreur lors de l\'enregistrement du client')
      throw error
    }
  }

  if (loading) {
    return (
      <Card className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <p className="text-gray-600">Chargement des données...</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-8">
        <div className="flex items-center gap-6 mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white text-4xl shadow-lg">
            🏢
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Administrateur des ventes
            </div>
            <div className="text-3xl font-bold text-dark font-poppins mb-2">
              {user?.name || 'Société'}
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold border border-white/30">
              <span>🆔</span> ID: {user?.merchant_id}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span>👤</span> {user?.name}
          </div>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(user?.merchant_id)
              alert('ID copié dans le presse-papier')
            }}
            
            icon={<span>📋</span>}
          >
            Copier ID
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center text-white text-2xl shadow-md">
              📦
            </div>
            <div className="px-2 py-1 bg-green-50 text-green-600 text-xs font-semibold rounded-full">
              ↑ 12%
            </div>
          </div>
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
            Produits
          </div>
          <div className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent font-poppins">
            {stats.products}
          </div>
        </Card>

        <Card className="p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-success to-success-light rounded-lg flex items-center justify-center text-white text-2xl shadow-md">
              👥
            </div>
            <div className="px-2 py-1 bg-green-50 text-green-600 text-xs font-semibold rounded-full">
              ↑ 8%
            </div>
          </div>
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
            Clients
          </div>
          <div className="text-3xl font-bold bg-gradient-to-r from-success to-success-light bg-clip-text text-transparent font-poppins">
            {stats.clients}
          </div>
        </Card>

        <Card className="p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-warning to-yellow-500 rounded-lg flex items-center justify-center text-white text-2xl shadow-md">
              🛒
            </div>
            <div className="px-2 py-1 bg-green-50 text-green-600 text-xs font-semibold rounded-full">
              ↑ 24%
            </div>
          </div>
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
            Commandes
          </div>
          <div className="text-3xl font-bold bg-gradient-to-r from-warning to-yellow-500 bg-clip-text text-transparent font-poppins">
            {stats.orders}
          </div>
        </Card>

        <Card className="p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-accent to-pink-500 rounded-lg flex items-center justify-center text-white text-2xl shadow-md">
              💰
            </div>
            <div className="px-2 py-1 bg-green-50 text-green-600 text-xs font-semibold rounded-full">
              ↑ 18%
            </div>
          </div>
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
            Revenu Total
          </div>
          <div className="text-3xl font-bold bg-gradient-to-r from-accent to-pink-500 bg-clip-text text-transparent font-poppins">
            {formatCurrency(stats.revenue)}
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Card className="p-6">
        <div className="flex flex-wrap gap-2 mb-6 bg-gray-50 p-1 rounded-lg">
          {['products', 'clients', 'orders', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-primary to-secondary text-white shadow'
                  : 'text-gray-600 hover:text-primary hover:bg-white'
              }`}
            >
              {tab === 'products' && '📦'}
              {tab === 'clients' && '👥'}
              {tab === 'orders' && '🛒'}
              {tab === 'settings' && '⚙️'}
              {tab === 'products' && 'Produits'}
              {tab === 'clients' && 'Clients'}
              {tab === 'orders' && 'Commandes'}
              {tab === 'settings' && 'Paramètres'}
            </button>
          ))}
        </div>

        {/* Products Tab */}
{activeTab === 'products' && (
  <div>
    <div className="flex flex-wrap gap-3 items-center mb-4">
      <Button 
        icon={<span>➕</span>}
        onClick={() => {
          setSelectedProduct(null)
          setProductModalOpen(true)
        }}
      >
        Ajouter un produit
      </Button>
      <div className="flex-1 flex gap-2 ml-auto">
        <input
          type="text"
          placeholder="Nom ou ID produit"
          className="form-input flex-1 max-w-xs"
        />
        <Button variant="success" size="sm" icon={<span>🔍</span>}>
          Consulter
        </Button>
      </div>
    </div>

    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full font-sans">
        <thead className="bg-gray-100">
          <tr>
            <th className="text-left p-4 text-xs font-bold text-gray-900 uppercase tracking-wider">
              Nom
            </th>
            <th className="text-left p-4 text-xs font-bold text-gray-900 uppercase tracking-wider">
              Prix
            </th>
            <th className="text-left p-4 text-xs font-bold text-gray-900 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="p-4 font-medium text-gray-900">{product.name}</td>
              <td className="p-4 font-semibold text-gray-900">{formatCurrency(product.price)}</td>
              <td className="p-4">
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="success" 
                    icon={<span>👁️</span>}
                    onClick={() => handleViewProduct(product.id)}
                  >
                    Voir
                  </Button>
                  <Button 
                    size="sm" 
                    variant="primary" 
                    icon={<span>✏️</span>}
                    onClick={() => handleEditProduct(product.id)}
                  >
                    Éditer
                  </Button>
                  <Button 
                    size="sm" 
                    variant="danger" 
                    icon={<span>🗑️</span>}
                    onClick={() => handleDeleteProduct(product.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}

{activeTab === 'settings' && (
  <MerchantSettingsTab 
    merchantId={merchantId} 
    user={user} 
  />
)}

        {/* Clients Tab */}
{activeTab === 'clients' && (
  <div>
    <div className="flex flex-wrap gap-3 items-center mb-4">
      <Button 
        icon={<span>➕</span>}
        onClick={() => {
          setSelectedClient(null)
          setClientModalOpen(true)
        }}
      >
        Ajouter un client
      </Button>
      <div className="flex-1 flex gap-2 ml-auto">
        <input
          type="text"
          placeholder="ID client"
          className="form-input flex-1 max-w-xs"
        />
        <Button variant="success" size="sm" icon={<span>🔍</span>}>
          Consulter
        </Button>
      </div>
    </div>

    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full font-sans">
        <thead className="bg-gray-100">
          <tr>
            <th className="text-left p-4 text-xs font-bold text-gray-900 uppercase tracking-wider">
              Nom
            </th>
            <th className="text-left p-4 text-xs font-bold text-gray-900 uppercase tracking-wider">
              ID
            </th>
            <th className="text-left p-4 text-xs font-bold text-gray-900 uppercase tracking-wider">
              Téléphone
            </th>
            <th className="text-left p-4 text-xs font-bold text-gray-900 uppercase tracking-wider">
              Ville
            </th>
            <th className="text-left p-4 text-xs font-bold text-gray-900 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="p-4 font-medium text-gray-900">{client.name}</td>
              <td className="p-4">
                <code className="bg-gray-200 px-2 py-1 rounded text-sm font-mono text-gray-800">
                  {client.client_id}
                </code>
              </td>
              <td className="p-4 text-gray-900">{client.phone || '-'}</td>
              <td className="p-4 text-gray-900">{client.city || '-'}</td>
              <td className="p-4">
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="success" 
                    icon={<span>👁️</span>}
                    onClick={() => handleViewClient(client.id)}
                  >
                    Voir
                  </Button>
                  <Button 
                    size="sm" 
                    variant="primary" 
                    icon={<span>✏️</span>}
                    onClick={() => handleEditClient(client.id)}
                  >
                    Éditer
                  </Button>
                  <Button 
                    size="sm" 
                    variant="danger" 
                    icon={<span>🗑️</span>}
                    onClick={() => handleDeleteClient(client.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}

{activeTab === 'orders' && (
  <OrdersPage 
    merchantId={merchantId} 
    products={products} 
    formatCurrency={formatCurrency} 
  />
)}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div>
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-4">⚙️</div>
              <h3 className="text-xl font-semibold mb-2">Paramètres</h3>
              <p>Cette section est en cours de développement</p>
            </div>
          </div>
        )}
      </Card>

      {/* Modale pour voir un produit */}
      <Modal
        isOpen={viewProductModalOpen}
        onClose={() => setViewProductModalOpen(false)}
        title="📦 Détails du produit"
        icon="📦"
        size="lg"
      >
        {selectedProduct && (
          <div className="space-y-6">
            {/* En-tête */}
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white text-2xl shadow-md">
                📦
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-dark font-poppins">
                  {selectedProduct.name}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  ID: <code className="bg-gray-100 px-2 py-1 rounded">{selectedProduct.id}</code>
                </div>
              </div>
            </div>

            {/* Prix */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Prix
              </div>
              <div className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {formatCurrency(selectedProduct.price)}
              </div>
            </div>

            {/* Description */}
            {selectedProduct.description && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Description
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  {selectedProduct.description}
                </div>
              </div>
            )}

            {/* Statut et informations */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Statut
                </div>
                <div className={`px-3 py-2 rounded-lg text-center font-semibold ${
                  selectedProduct.active 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {selectedProduct.active ? '✅ Actif' : '❌ Inactif'}
                </div>
              </div>
              
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  ID Marchand
                </div>
                <div className="p-2 bg-gray-100 rounded text-sm font-mono">
                  {selectedProduct.merchant_id}
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="border-t pt-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Informations
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Créé le: {new Date(selectedProduct.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</div>
                <div>Mis à jour: {new Date(selectedProduct.updated_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</div>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="primary"
                icon={<span>✏️</span>}
                onClick={() => {
                  setViewProductModalOpen(false)
                  handleEditProduct(selectedProduct.id)
                }}
              >
                Éditer ce produit
              </Button>
              <Button
                variant="outline"
                onClick={() => setViewProductModalOpen(false)}
              >
                Fermer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modale pour voir un client */}
      <Modal
        isOpen={viewClientModalOpen}
        onClose={() => setViewClientModalOpen(false)}
        title="👥 Détails du client"
        icon="👥"
        size="lg"
      >
        {selectedClient && (
          <div className="space-y-6">
            {/* En-tête */}
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg">
              <div className="w-16 h-16 bg-gradient-to-br from-success to-success-light rounded-full flex items-center justify-center text-white text-2xl shadow-md">
                👤
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-dark font-poppins">
                  {selectedClient.name}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  ID Client: <code className="bg-gray-100 px-2 py-1 rounded">{selectedClient.client_id}</code>
                </div>
              </div>
            </div>

            {/* Informations de contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Contact
                </div>
                <div className="space-y-2">
                  {selectedClient.email && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">📧</span>
                      <span className="text-sm">{selectedClient.email}</span>
                    </div>
                  )}
                  {selectedClient.phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">📱</span>
                      <span className="text-sm">{selectedClient.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Localisation
                </div>
                <div className="space-y-2">
                  {selectedClient.city && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">📍</span>
                      <span className="text-sm">{selectedClient.city}</span>
                    </div>
                  )}
                  {selectedClient.address && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">🏠</span>
                      <span className="text-sm">{selectedClient.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Informations commerciales */}
            <div className="border-t pt-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Informations commerciales
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-xs text-gray-500">Mode paiement</div>
                  <div className="font-semibold">{selectedClient.payment_mode || 'Non défini'}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-xs text-gray-500">Limite crédit</div>
                  <div className="font-semibold">
                    {selectedClient.credit_limit 
                      ? formatCurrency(selectedClient.credit_limit)
                      : 'Aucune'}
                  </div>
                </div>
              </div>
            </div>

            {/* Paramètres */}
            <div className="border-t pt-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Paramètres
              </div>
              <div className="flex flex-wrap gap-3">
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  selectedClient.show_price 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {selectedClient.show_price ? 'Prix visible' : 'Prix caché'}
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  selectedClient.show_quantity 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {selectedClient.show_quantity ? 'Quantité visible' : 'Quantité cachée'}
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  selectedClient.active 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {selectedClient.active ? 'Compte actif' : 'Compte inactif'}
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="border-t pt-4 text-sm text-gray-600">
              <div>Créé le: {new Date(selectedClient.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}</div>
              <div>Mis à jour: {new Date(selectedClient.updated_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}</div>
            </div>

            {/* Boutons d'action */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="primary"
                icon={<span>✏️</span>}
                onClick={() => {
                  setViewClientModalOpen(false)
                  handleEditClient(selectedClient.id)
                }}
              >
                Éditer ce client
              </Button>
              <Button
                variant="outline"
                onClick={() => setViewClientModalOpen(false)}
              >
                Fermer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modale pour ajouter/éditer un produit */}
      <ProductForm
        isOpen={productModalOpen}
        onClose={() => {
          setProductModalOpen(false)
          setSelectedProduct(null)
        }}
        onSubmit={handleProductSubmit}
        product={selectedProduct}
      />

      {/* Modale pour ajouter/éditer un client */}
      <ClientForm
        isOpen={clientModalOpen}
        onClose={() => {
          setClientModalOpen(false)
          setSelectedClient(null)
        }}
        onSubmit={handleClientSubmit}
        client={selectedClient}
        merchantId={merchantId}
      />
    </div>
  )
}
