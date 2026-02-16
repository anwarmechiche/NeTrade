'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

/**
 * Type Client local (compatible Supabase)
 * Défini ici pour éviter l'erreur d'import Netlify
 */
type Client = {
  id?: string
  name: string
  client_id: string
  email?: string
  phone?: string
  address?: string
  city?: string
  wilaya?: string
  payment_mode?: string
  credit_limit?: number
  fiscal_number?: string
  notes?: string
  active: boolean
  show_price: boolean
  show_quantity: boolean
  merchant_id: string
}

interface ClientFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (clientData: Partial<Client>) => Promise<void>
  client: Client | null
  merchantId: string
}

export default function ClientForm({
  isOpen,
  onClose,
  onSubmit,
  client,
  merchantId,
}: ClientFormProps) {
  const [formData, setFormData] = useState<Partial<Client>>({
    name: '',
    client_id: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    wilaya: '',
    payment_mode: '',
    credit_limit: 0,
    fiscal_number: '',
    notes: '',
    active: true,
    show_price: true,
    show_quantity: true,
    merchant_id: merchantId,
  })

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        client_id: client.client_id,
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        city: client.city || '',
        wilaya: client.wilaya || '',
        payment_mode: client.payment_mode || '',
        credit_limit: client.credit_limit || 0,
        fiscal_number: client.fiscal_number || '',
        notes: client.notes || '',
        active: client.active,
        show_price: client.show_price,
        show_quantity: client.show_quantity,
        merchant_id: client.merchant_id,
      })
    } else {
      setFormData({
        name: '',
        client_id: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        wilaya: '',
        payment_mode: '',
        credit_limit: 0,
        fiscal_number: '',
        notes: '',
        active: true,
        show_price: true,
        show_quantity: true,
        merchant_id: merchantId,
      })
    }
  }, [client, merchantId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={client ? '✏️ Modifier le client' : '➕ Ajouter un client'}
      icon={client ? '✏️' : '➕'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nom complet *</label>
            <input
              type="text"
              required
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-input w-full"
              placeholder="Nom du client"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">ID Client *</label>
            <input
              type="text"
              required
              value={formData.client_id || ''}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              className="form-input w-full"
              placeholder="ID unique du client"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="form-input w-full"
              placeholder="email@exemple.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Téléphone</label>
            <input
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="form-input w-full"
              placeholder="+213 XXX XX XX XX"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ville</label>
            <input
              type="text"
              value={formData.city || ''}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="form-input w-full"
              placeholder="Ville"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Wilaya</label>
            <input
              type="text"
              value={formData.wilaya || ''}
              onChange={(e) => setFormData({ ...formData, wilaya: e.target.value })}
              className="form-input w-full"
              placeholder="Wilaya"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mode de paiement</label>
            <select
              value={formData.payment_mode || ''}
              onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
              className="form-select w-full"
            >
              <option value="">Sélectionner</option>
              <option value="cash">Espèces</option>
              <option value="check">Chèque</option>
              <option value="transfer">Virement</option>
              <option value="credit">Crédit</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Limite de crédit (DZD)</label>
            <input
              type="number"
              value={formData.credit_limit || 0}
              onChange={(e) => setFormData({ ...formData, credit_limit: Number(e.target.value) })}
              className="form-input w-full"
              placeholder="0"
              min="0"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Adresse</label>
          <textarea
            value={formData.address || ''}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="form-textarea w-full"
            rows={2}
            placeholder="Adresse complète"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Numéro fiscal</label>
            <input
              type="text"
              value={formData.fiscal_number || ''}
              onChange={(e) => setFormData({ ...formData, fiscal_number: e.target.value })}
              className="form-input w-full"
              placeholder="Numéro fiscal"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="form-textarea w-full"
              rows={2}
              placeholder="Notes supplémentaires"
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="text-sm font-medium mb-3">Paramètres</div>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={formData.active || false}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="form-checkbox text-primary"
              />
              <span className="ml-2">Client actif</span>
            </label>

            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={formData.show_price || false}
                onChange={(e) => setFormData({ ...formData, show_price: e.target.checked })}
                className="form-checkbox text-primary"
              />
              <span className="ml-2">Afficher les prix</span>
            </label>

            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={formData.show_quantity || false}
                onChange={(e) => setFormData({ ...formData, show_quantity: e.target.checked })}
                className="form-checkbox text-primary"
              />
              <span className="ml-2">Afficher les quantités</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={loading}>
            {client ? 'Mettre à jour' : 'Créer le client'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
