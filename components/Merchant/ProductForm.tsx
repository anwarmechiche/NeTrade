'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { Product } from '@/utils/supabase/types'

interface ProductFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (productData: Partial<Product>) => Promise<void>
  product?: Product | null
}

export default function ProductForm({ isOpen, onClose, onSubmit, product }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    active: true
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        price: product.price?.toString() || '',
        description: product.description || '',
        active: product.active !== false
      })
      if (product.image_data) {
        setPreviewUrl(product.image_data)
      }
    } else {
      resetForm()
    }
  }, [product])

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      description: '',
      active: true
    })
    setImageFile(null)
    setPreviewUrl('')
    setError('')
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 1024 * 1024) { // 1MB limit
      setError('L\'image doit faire moins de 1 Mo')
      return
    }

    setImageFile(file)
    setError('')

    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const productData: any = {
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        description: formData.description.trim() || undefined,
        active: formData.active
      }

      if (imageFile) {
        const reader = new FileReader()
        reader.readAsDataURL(imageFile)
        reader.onloadend = () => {
          productData.image_data = reader.result as string
        }
      } else if (previewUrl && product?.image_data) {
        productData.image_data = product.image_data
      }

      await onSubmit(productData)
      resetForm()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? '✏️ Modifier le produit' : '➕ Nouveau produit'}
      icon={product ? '✏️' : '➕'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900">Nom du produit</label>
          <input
  type="text"
  value={formData.name}
  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
  className="form-input text-gray-900 placeholder-gray-500"
  placeholder="Ex: Smartphone Samsung Galaxy"
  required
/>

<input
  type="number"
  value={formData.price}
  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
  className="form-input text-gray-900 placeholder-gray-500"
  placeholder="Ex: 25000"
  min="0.01"
  step="0.01"
  required
/>

<textarea
  value={formData.description}
  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
  className="form-input text-gray-900 placeholder-gray-500 min-h-[100px] resize-none"
  placeholder="Décrivez les caractéristiques du produit..."
  rows={3}
/>

        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900">Prix (DA)</label>
          <input
            type="number"
            value={formData.price}
            onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
            className="form-input placeholder-gray-500"
            placeholder="Ex: 25000"
            min="0.01"
            step="0.01"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="form-input min-h-[100px] resize-none placeholder-gray-500"
            placeholder="Décrivez les caractéristiques du produit..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900">Image du produit</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="form-input placeholder-gray-500"
          />
          <p className="text-gray-600 text-xs mt-1">PNG/JPG recommandé, taille max: 1 Mo</p>
          
          {previewUrl && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-900 mb-2">Aperçu</label>
              <img
                src={previewUrl}
                alt="Aperçu du produit"
                className="w-32 h-32 object-cover rounded-lg border border-gray-200 shadow-sm"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            id="active"
            checked={formData.active}
            onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
            className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <label htmlFor="active" className="text-sm font-medium text-gray-900 cursor-pointer select-none">
            Produit actif
          </label>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              resetForm()
              onClose()
            }}
            disabled={loading}
            
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            
            icon={loading ? <span className="animate-spin">⟳</span> : <span>💾</span>}
          >
            {loading ? 'Enregistrement...' : 'Enregistrer le produit'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
